-- PROPOSAL ONLY. Do not apply to Supabase before explicit approval.
-- SUPERSEDED: do not execute this file. The final booking RPC and transaction guard
-- are defined by multi-addon-booking-integrity-proposal.sql after the role proposal.
-- The older bodies below are retained for review only; they are scalar-add-on and
-- do not bind customer_id to the verified JWT. This transaction abort prevents a
-- full-file execution from replacing the final RPCs or trigger function.
-- Apply after all existing migrations and seed scripts; do not rerun business-flow-hardening.sql afterward.
-- This replaces the existing guard function and preserves its trigger and all legacy rows/grants.
-- INSERTs must run with the owner role of one of the existing SECURITY DEFINER transaction RPCs.

begin;
do $$ begin raise exception 'Superseded proposal: use the role proposal followed by multi-addon-booking-integrity-proposal.sql.'; end $$;

create or replace function public.record_service_transaction(p_transaction jsonb, p_addon_id text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  service public.services_products%rowtype;
  addon public.services_products%rowtype;
  customer public.customers%rowtype;
  vehicle public.vehicles%rowtype;
  saved public.transactions%rowtype;
  transaction_kind text;
  duration integer;
  service_duration integer;
  amount_value integer;
  bay integer;
  starts_at timestamptz;
  ends_at timestamptz;
begin
  if p_transaction is null or jsonb_typeof(p_transaction) <> 'object' then
    raise exception 'Payload transaksi tidak valid.';
  end if;

  -- Only fields explicitly read below are used; client amount, item_name, status,
  -- and all other unrecognized fields are ignored and never persisted.
  if exists (
    select 1
    from jsonb_object_keys(p_transaction) as payload_field(key)
    where lower(payload_field.key) ~ '(pickup|drop[[:space:]_-]*off|antar[[:space:]_-]*jemput)'
  ) then
    raise exception 'Field pickup/drop-off tidak lagi didukung.';
  end if;

  if p_transaction ? 'addon_id'
    and nullif(trim(p_transaction ->> 'addon_id'), '') is distinct from nullif(trim(p_addon_id), '') then
    raise exception 'Add-on pada payload tidak sesuai parameter RPC.';
  end if;

  if p_addon_id in ('addon-pickup', 'addon-pickup-moto') then
    raise exception 'Add-on pickup tidak lagi tersedia.';
  end if;

  select * into service
  from public.services_products
  where id = p_transaction ->> 'item_id'
    and item_type = 'SERVICE'
    and active = true;
  if not found then raise exception 'Layanan tidak ditemukan atau tidak aktif.'; end if;
    if upper(coalesce(service.category, '')) = 'PICKUP'
      or concat_ws(' ', service.name, service.category, service.description) ~* '(antar[[:space:]_-]?jemput|pick[[:space:]_-]?up|drop[[:space:]_-]?off)' then
    raise exception 'Layanan pickup tidak lagi tersedia.';
  end if;

  select * into customer
  from public.customers
  where id = p_transaction ->> 'customer_id';
  if not found then raise exception 'Pelanggan tidak ditemukan.'; end if;

  select * into vehicle
  from public.vehicles
  where id = p_transaction ->> 'vehicle_id'
    and customer_id = customer.id;
  if not found or vehicle.type <> service.type then
    raise exception 'Kendaraan tidak sesuai dengan pelanggan/layanan.';
  end if;

  if p_addon_id is not null then
    select * into addon
    from public.services_products
    where id = p_addon_id
      and item_type = 'ADD_ON'
      and active = true;
    if not found then raise exception 'Add-on tidak ditemukan atau tidak aktif.'; end if;
    if upper(coalesce(addon.category, '')) = 'PICKUP'
      or concat_ws(' ', addon.name, addon.category, addon.description) ~* '(antar[[:space:]-]?jemput|pick[[:space:]-]?up|drop[[:space:]-]?off)' then
      raise exception 'Add-on pickup tidak lagi tersedia.';
    end if;
  end if;

  duration := (p_transaction ->> 'duration_minutes')::integer;
  if duration is null or duration < 1 then raise exception 'Durasi layanan tidak valid.'; end if;
  service_duration := duration - coalesce(addon.duration, 0);
  if service_duration < 1 then raise exception 'Durasi layanan tidak valid.'; end if;

  transaction_kind := p_transaction ->> 'transaction_type';
  if transaction_kind is null or transaction_kind not in ('BOOKING', 'WALK_IN') then
    raise exception 'Jenis transaksi tidak valid.';
  end if;
  if service.category = 'SELF_SERVICE' and transaction_kind <> 'BOOKING' then
    raise exception 'Self-Service harus berupa Booking.';
  end if;

  if p_transaction ->> 'payment_method' is null
    or p_transaction ->> 'payment_method' not in ('CASH', 'QRIS', 'E_WALLET', 'CARD') then
    raise exception 'Metode pembayaran tidak valid.';
  end if;
  if transaction_kind = 'BOOKING' and p_transaction ->> 'payment_method' = 'CASH' then
    raise exception 'Booking harus dibayar di muka dengan metode cashless.';
  end if;

  starts_at := (((p_transaction ->> 'booking_date')::date + (p_transaction ->> 'booking_time')::time) at time zone 'Asia/Jakarta');
  if transaction_kind = 'BOOKING' and starts_at <= clock_timestamp() then
    raise exception 'Pilih waktu booking yang belum dimulai.';
  end if;

  bay := nullif(p_transaction ->> 'bay_number', '')::integer;
  if service.category = 'SELF_SERVICE' then
    if bay is null or bay not between 1 and 4 then raise exception 'Pilih salah satu dari empat bay.'; end if;
    ends_at := starts_at + make_interval(mins => duration);
    perform pg_advisory_xact_lock(78131, bay);
    if exists (
      select 1
      from public.transactions t
      join public.services_products item on item.id = t.item_id
      where t.bay_number = bay
        and item.category = 'SELF_SERVICE'
        and t.payment_status = 'PAID'
        and t.transaction_status in ('BOOKED', 'ACTIVE')
        and starts_at < ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') + make_interval(mins => t.duration_minutes)
        and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') < ends_at
    ) then
      raise exception 'Bay sudah dipesan pada jadwal ini.';
    end if;
  else
    bay := null;
  end if;

  -- Client amount, item_name, and status fields are ignored; catalog data is authoritative.
  amount_value := service.price + coalesce(addon.price, 0);
  insert into public.transactions (
    id, code, customer_id, vehicle_id, item_id, addon_id, pickup_distance_km,
    item_type, item_name, quantity, amount, payment_method, payment_status,
    refund_status, transaction_type, transaction_status, queue_status,
    booking_date, booking_time, duration_minutes, bay_number, created_at
  ) values (
    p_transaction ->> 'id', p_transaction ->> 'code', customer.id, vehicle.id,
    service.id, addon.id, null, 'SERVICE',
    service.name || case when addon.id is not null then ' + ' || addon.name else '' end,
    1, amount_value, p_transaction ->> 'payment_method', 'PENDING', 'NONE',
    transaction_kind, 'PENDING', 'WAITING',
    (p_transaction ->> 'booking_date')::date, (p_transaction ->> 'booking_time')::time,
    duration, bay, now()
  ) returning * into saved;
  return to_jsonb(saved);
end;
$$;

-- Serialize Self-Service payment confirmations with the same per-bay lock used when booking.
create or replace function public.confirm_booking_payment(p_transaction_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  tx public.transactions%rowtype;
  service_category text;
  starts_at timestamptz;
  ends_at timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Pembayaran Booking hanya dapat dikonfirmasi dari webhook pembayaran terverifikasi.';
  end if;

  select * into tx
  from public.transactions
  where id = p_transaction_id
  for update;
  if not found or tx.transaction_type <> 'BOOKING'
    or tx.payment_status <> 'PENDING' or tx.transaction_status <> 'PENDING' then
    raise exception 'Booking bukan pembayaran tertunda.';
  end if;

  starts_at := (tx.booking_date + tx.booking_time) at time zone 'Asia/Jakarta';
  if starts_at <= clock_timestamp() then
    raise exception 'Pembayaran Booking diterima setelah waktu mulai.';
  end if;

  if tx.item_type = 'SERVICE' then
    select category into service_category
    from public.services_products
    where id = tx.item_id and item_type = 'SERVICE';

    if service_category = 'SELF_SERVICE' then
      if tx.bay_number is null or tx.bay_number not between 1 and 4 then
        raise exception 'Booking Self-Service tidak memiliki bay yang valid.';
      end if;

      perform pg_advisory_xact_lock(78131, tx.bay_number);
      if starts_at <= clock_timestamp() then
        raise exception 'Pembayaran Booking diterima setelah waktu mulai.';
      end if;
      ends_at := starts_at + make_interval(mins => tx.duration_minutes);

      if exists (
        select 1
        from public.transactions other_tx
        join public.services_products service on service.id = other_tx.item_id
        where other_tx.id <> tx.id
          and other_tx.transaction_type = 'BOOKING'
          and other_tx.item_type = 'SERVICE'
          and service.category = 'SELF_SERVICE'
          and other_tx.bay_number = tx.bay_number
          and other_tx.payment_status = 'PAID'
          and other_tx.transaction_status in ('BOOKED', 'ACTIVE')
          and starts_at < ((other_tx.booking_date + other_tx.booking_time) at time zone 'Asia/Jakarta')
            + make_interval(mins => other_tx.duration_minutes)
          and ((other_tx.booking_date + other_tx.booking_time) at time zone 'Asia/Jakarta') < ends_at
      ) then
        raise exception 'Bay sudah dipesan pada jadwal ini.';
      end if;
    end if;
  end if;

  perform set_config('rinse.payment_update', 'on', true);
  update public.transactions
  set payment_status = 'PAID', transaction_status = 'BOOKED', queue_status = 'WAITING'
  where id = tx.id
  returning * into tx;
  return to_jsonb(tx);
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_proc
    where oid = 'public.record_service_transaction(jsonb, text)'::regprocedure
      and prosecdef
  ) or not exists (
    select 1 from pg_proc
    where oid = 'public.record_product_sale(jsonb)'::regprocedure
      and prosecdef
  ) then
    raise exception 'Validated SECURITY DEFINER transaction RPCs must exist before pickup hardening.';
  end if;
  if exists (
    select 1 from pg_proc
    where oid in (
      'public.record_service_transaction(jsonb, text)'::regprocedure,
      'public.record_product_sale(jsonb)'::regprocedure
    )
      and pg_get_userbyid(proowner) in ('anon', 'authenticated')
  ) then
    raise exception 'Transaction RPCs must be owned by a trusted non-client role.';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.transactions'::regclass
      and tgname = 'transactions_integrity_guard'
      and tgfoid = 'public.guard_transaction_integrity()'::regprocedure
      and not tgisinternal
      and tgenabled in ('O', 'A')
  ) then
    raise exception 'transactions_integrity_guard must be active before pickup hardening.';
  end if;
end;
$$;

create or replace function public.guard_transaction_integrity()
returns trigger language plpgsql set search_path = public, pg_temp
as $$
declare
  owner_id text;
  vehicle_type text;
  catalog_type text;
  catalog_price integer;
  catalog_duration integer;
  catalog_category text;
  catalog_vehicle_type text;
  catalog_name text;
  catalog_description text;
  addon_price integer := 0;
  addon_duration integer := 0;
  addon_category text;
  addon_name text;
  addon_description text;
  expected_item_name text;
  expected_amount integer;
begin
  if new.vehicle_id is not null then
    select customer_id, type into owner_id, vehicle_type from public.vehicles where id = new.vehicle_id;
    if not found or owner_id <> new.customer_id then raise exception 'Kendaraan tidak sesuai dengan pelanggan transaksi.'; end if;
  elsif new.item_type = 'SERVICE' then
    raise exception 'Transaksi layanan wajib memiliki kendaraan.';
  end if;
  select item_type, price, duration, category, type, name, description
    into catalog_type, catalog_price, catalog_duration, catalog_category, catalog_vehicle_type, catalog_name, catalog_description
  from public.services_products where id = new.item_id;
  if not found or catalog_type <> new.item_type then raise exception 'Item transaksi tidak ditemukan atau jenisnya tidak sesuai.'; end if;
  if new.item_type = 'SERVICE' and vehicle_type <> catalog_vehicle_type then raise exception 'Jenis kendaraan tidak sesuai dengan layanan.'; end if;

  if tg_op = 'INSERT' then
    if (current_user)::text not in (
      select pg_get_userbyid(rpc.proowner)::text
      from pg_proc rpc
      where rpc.oid in (
        'public.record_service_transaction(jsonb, text)'::regprocedure,
        'public.record_product_sale(jsonb)'::regprocedure
      )
        and rpc.prosecdef
    ) then
      raise exception 'Transaksi baru harus dibuat melalui RPC transaksi yang tervalidasi.';
    end if;
    if new.payment_status <> 'PENDING'
      or new.transaction_status <> 'PENDING'
      or new.queue_status <> 'WAITING'
      or new.refund_status <> 'NONE' then
      raise exception 'Transaksi baru harus menunggu pembayaran dan konfirmasi.';
    end if;
    if new.pickup_distance_km is not null then raise exception 'Transaksi baru tidak menerima data pickup.'; end if;
    if new.item_type = 'PRODUCT' then
      if new.addon_id is not null or new.amount <> catalog_price * new.quantity then raise exception 'Nominal produk tidak sesuai katalog.'; end if;
      if new.item_name is distinct from catalog_name then raise exception 'Nama produk tidak sesuai katalog.'; end if;
    else
      if upper(coalesce(catalog_category, '')) = 'PICKUP'
        or concat_ws(' ', catalog_name, catalog_category, catalog_description) ~* '(antar[[:space:]_-]?jemput|pick[[:space:]_-]?up|drop[[:space:]_-]?off)' then
        raise exception 'Layanan pickup tidak lagi tersedia.';
      end if;
      if new.addon_id in ('addon-pickup', 'addon-pickup-moto') then
        raise exception 'Add-on pickup tidak lagi tersedia.';
      end if;
      if new.addon_id is not null then
        select price, duration, category, name, description
          into addon_price, addon_duration, addon_category, addon_name, addon_description
        from public.services_products
        where id = new.addon_id and item_type = 'ADD_ON' and active;
        if not found then raise exception 'Add-on tidak ditemukan atau tidak aktif.'; end if;
        if upper(coalesce(addon_category, '')) = 'PICKUP'
          or concat_ws(' ', addon_name, addon_category, addon_description) ~* '(antar[[:space:]_-]?jemput|pick[[:space:]_-]?up|drop[[:space:]_-]?off)' then
          raise exception 'Add-on pickup tidak lagi tersedia.';
        end if;
      end if;
      if new.duration_minutes <= addon_duration then raise exception 'Durasi layanan tidak valid.'; end if;
      if catalog_category = 'SELF_SERVICE' then
        expected_amount := catalog_price;
      else
        expected_amount := catalog_price;
      end if;
      if new.amount <> expected_amount + addon_price then raise exception 'Nominal transaksi tidak sesuai katalog.'; end if;
      expected_item_name := catalog_name || case when addon_name is not null then ' + ' || addon_name else '' end;
      if new.item_name is distinct from expected_item_name then raise exception 'Nama layanan tidak sesuai katalog.'; end if;
    end if;
  end if;

  if new.transaction_status in ('ACTIVE', 'COMPLETED', 'BOOKED') and new.payment_status <> 'PAID' then
    raise exception 'Transaksi harus lunas sebelum diproses.';
  end if;
  if tg_op = 'UPDATE' then
    if old.transaction_status = 'CANCELLED' and new.transaction_status <> 'CANCELLED' then raise exception 'Transaksi dibatalkan tidak dapat diaktifkan kembali.'; end if;
    if old.transaction_status <> 'CANCELLED' and new.transaction_status = 'CANCELLED'
      and current_setting('rinse.cancellation_update', true) is distinct from 'on' then raise exception 'Gunakan proses pembatalan booking.'; end if;
    if old.payment_status is distinct from new.payment_status
      and current_setting('rinse.payment_update', true) is distinct from 'on'
      and current_setting('rinse.refund_update', true) is distinct from 'on' then raise exception 'Gunakan proses pembayaran/refund.'; end if;
    if old.refund_status is distinct from new.refund_status
      and current_setting('rinse.refund_update', true) is distinct from 'on'
      and current_setting('rinse.cancellation_update', true) is distinct from 'on' then raise exception 'Gunakan proses refund.'; end if;
    if old.customer_id is distinct from new.customer_id or old.vehicle_id is distinct from new.vehicle_id
      or old.item_id is distinct from new.item_id or old.addon_id is distinct from new.addon_id
      or old.pickup_distance_km is distinct from new.pickup_distance_km or old.item_type is distinct from new.item_type
      or old.item_name is distinct from new.item_name or old.quantity is distinct from new.quantity
      or old.amount is distinct from new.amount or old.payment_method is distinct from new.payment_method
      or old.booking_date is distinct from new.booking_date or old.booking_time is distinct from new.booking_time
      or old.duration_minutes is distinct from new.duration_minutes or old.bay_number is distinct from new.bay_number then
      raise exception 'Data pokok transaksi tidak dapat diubah setelah dibuat.';
    end if;
  end if;
  if new.transaction_status = 'ACTIVE' and new.transaction_type = 'BOOKING'
    and ((new.booking_date + new.booking_time) at time zone 'Asia/Jakarta') > clock_timestamp() then raise exception 'Booking belum mencapai waktu mulai.'; end if;
  if new.transaction_status = 'COMPLETED' and new.item_type = 'SERVICE'
    and ((new.booking_date + new.booking_time) at time zone 'Asia/Jakarta') + make_interval(mins => new.duration_minutes) > clock_timestamp() then raise exception 'Durasi layanan belum selesai.'; end if;
  if new.refund_status = 'PENDING' and (new.transaction_status <> 'CANCELLED' or new.payment_status <> 'PAID') then raise exception 'Status refund pending tidak sesuai.'; end if;
  if new.refund_status = 'COMPLETED' and (new.transaction_status <> 'CANCELLED' or new.payment_status <> 'REFUNDED') then raise exception 'Status refund selesai tidak sesuai.'; end if;
  if new.payment_status = 'REFUNDED' and new.refund_status <> 'COMPLETED' then raise exception 'Dana hanya dapat ditandai kembali setelah refund terkonfirmasi.'; end if;
  return new;
end;
$$;
-- EXECUTE grants and the existing transactions_integrity_guard trigger are unchanged.
-- Run this after all legacy migrations and seeds. Re-running business-flow-hardening.sql
-- afterward replaces this guard function with the legacy implementation; reapply this
-- proposal last instead of editing or replaying historical migration files.
notify pgrst, 'reload schema';

commit;
