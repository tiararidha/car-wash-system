-- REVIEW PROPOSAL; do not apply before validating on an isolated database copy.
-- Staging order from a reviewed reset baseline: schema.sql -> rls-authenticated-access.sql
-- -> self-service-bay-live-migration.sql -> business-flow-hardening.sql -> catalog-revision.sql
-- -> optional fixture-only t-20-seed-reconciliation.sql and booking-seed-payment-reconciliation.sql
-- -> admin-role-authorization-proposal.sql -> this proposal -> customer-capability-booking-migration.sql.
-- This proposal is the final transaction-integrity/service RPC definition; capability
-- migration is the final customer/RPC/permission definition. Keep app traffic disabled
-- through both final migrations. Seed files mutate fixture transactions.
-- Do not run business-flow-hardening.sql, catalog-revision.sql, or either seed after this
-- proposal. The superseded pickup-rpc-hardening-proposal.sql must never be run.
-- Do not enable app traffic
-- until this transaction commits and staging checks pass.
-- Requires transactions_integrity_guard and record_service_transaction(jsonb, text).
-- The app sends addon_ids inside p_transaction and keeps p_addon_id as the legacy first item.
-- Deploy this database change before releasing the multi-select frontend: old clients
-- continue through p_addon_id fallback; new clients require this RPC for exact totals.
-- Preassign/refresh verified admin app_metadata claims and validate the role proposal
-- before this coordinated rollout; do not leave a broad authenticated-write window.
-- Existing rows are backfilled from addon_id; status, amount, and ownership are not rewritten.
-- Rollback: restore prior RPC/trigger definitions before multi-addon rows are committed.
-- Afterward, do not drop addon_ids or return to scalar-only writes until every array and amount
-- is exported/reconciled. This is intentionally not a destructive down migration.
-- Negative staging tests: direct PAID insert, forged amount/duration/type/owner, early EXPIRED,
-- inactive/deleted addon references, closed/past slots, and concurrent same-bay booking fail.
-- Verify the SECURITY DEFINER RPC/reconciler owners in pg_proc before relying on current_user
-- checks below; expected trusted owners are postgres (or a specifically reviewed service role).
begin;
alter table public.transactions
  add column if not exists addon_ids text[] not null default '{}';

update public.transactions
set addon_ids = array[addon_id]
where addon_id is not null and cardinality(addon_ids) = 0;

create or replace function public.guard_referenced_addon_catalog_item()
returns trigger language plpgsql set search_path = pg_catalog, public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.item_type = 'ADD_ON' and exists (
      select 1 from public.transactions t
      where t.addon_id = old.id or t.addon_ids @> array[old.id]
    ) then
      raise exception 'Add-on yang dipakai transaksi tidak dapat dihapus.';
    end if;
    return old;
  end if;
  if old.item_type = 'ADD_ON'
    and (new.id is distinct from old.id or new.item_type is distinct from old.item_type
      or new.category is distinct from old.category)
    and exists (
      select 1 from public.transactions t
      where t.addon_id = old.id or t.addon_ids @> array[old.id]
    ) then
    raise exception 'Identitas/kategori add-on historis tidak dapat diubah.';
  end if;
  return new;
end;
$$;

drop trigger if exists services_products_addon_reference_guard on public.services_products;
create trigger services_products_addon_reference_guard
before delete or update of id, item_type, category on public.services_products
for each row execute function public.guard_referenced_addon_catalog_item();

create or replace function public.guard_transaction_integrity()
returns trigger language plpgsql set search_path = pg_catalog, public, pg_temp
as $$
declare
  owner_id text;
  vehicle_type text;
  catalog_type text;
  catalog_price integer;
  catalog_duration integer;
  catalog_category text;
  catalog_vehicle_type text;
  addon_price integer := 0;
  addon_duration integer := 0;
  addon_count integer := 0;
  selected_addon_ids text[] := '{}';
  service_duration integer;
  expected_amount integer;
  starts_at timestamptz;
  closes_at timestamptz;
begin
  if new.vehicle_id is not null then
    select customer_id, type into owner_id, vehicle_type
    from public.vehicles where id = new.vehicle_id;
    if not found or owner_id <> new.customer_id then
      raise exception 'Kendaraan tidak sesuai dengan pelanggan transaksi.';
    end if;
  elsif new.item_type = 'SERVICE' then
    raise exception 'Transaksi layanan wajib memiliki kendaraan.';
  end if;

  select item_type, price, duration, category, type
    into catalog_type, catalog_price, catalog_duration, catalog_category, catalog_vehicle_type
  from public.services_products where id = new.item_id;
  if not found or catalog_type <> new.item_type then
    raise exception 'Item transaksi tidak ditemukan atau jenisnya tidak sesuai.';
  end if;
  if new.item_type = 'SERVICE' and vehicle_type <> catalog_vehicle_type then
    raise exception 'Jenis kendaraan tidak sesuai dengan layanan.';
  end if;

  if tg_op = 'INSERT' then
    if new.payment_method is null or new.payment_method not in ('CASH', 'QRIS', 'E_WALLET', 'CARD') then
      raise exception 'Metode pembayaran tidak valid.';
    end if;
    if new.payment_status <> 'PENDING' then
      raise exception 'Pembayaran harus dikonfirmasi melalui proses pembayaran.';
    end if;
    if new.transaction_status = 'EXPIRED' then
      raise exception 'Transaksi baru tidak dapat dibuat kedaluwarsa.';
    end if;
    if new.transaction_status <> 'PENDING' or new.refund_status <> 'NONE' or new.queue_status <> 'WAITING' then
      raise exception 'Transaksi baru harus menunggu pembayaran dan proses.';
    end if;
    if new.transaction_type = 'BOOKING' and new.payment_method = 'CASH' then
      raise exception 'Booking harus dibayar dengan metode cashless.';
    end if;

    if new.item_type = 'PRODUCT' then
      if new.transaction_type <> 'SHOP' then
        raise exception 'Transaksi produk harus melalui jalur penjualan.';
      end if;
      if new.vehicle_id is not null or new.bay_number is not null or new.duration_minutes <> 0
        or new.addon_id is not null or cardinality(new.addon_ids) <> 0
        or new.amount <> catalog_price * new.quantity or new.quantity < 1 then
        raise exception 'Nominal produk tidak sesuai katalog.';
      end if;
    else
      if new.transaction_type not in ('BOOKING', 'WALK_IN') then
        raise exception 'Jenis transaksi layanan tidak valid.';
      end if;
      if new.quantity <> 1 then
        raise exception 'Jumlah layanan harus satu.';
      end if;
      if catalog_category = 'SELF_SERVICE' and new.transaction_type <> 'BOOKING' then
        raise exception 'Self-Service harus berupa Booking.';
      end if;
      selected_addon_ids := coalesce(new.addon_ids, '{}');
      if cardinality(selected_addon_ids) = 0 and new.addon_id is not null then
        selected_addon_ids := array[new.addon_id];
      end if;
      if cardinality(selected_addon_ids) <> (
        select count(distinct addon_id) from unnest(selected_addon_ids) as addons(addon_id)
      ) then
        raise exception 'Add-on tidak boleh kosong atau duplikat.';
      end if;
      if new.addon_id is not null and new.addon_id <> selected_addon_ids[1] then
        raise exception 'Add-on legacy tidak sesuai dengan daftar add-on.';
      end if;
      if cardinality(selected_addon_ids) > 0 then
        select count(*)::integer, coalesce(sum(price), 0)::integer, coalesce(sum(duration), 0)::integer
          into addon_count, addon_price, addon_duration
        from public.services_products
        where id = any(selected_addon_ids) and item_type = 'ADD_ON' and active;
        if addon_count <> cardinality(selected_addon_ids) then
          raise exception 'Satu atau lebih add-on tidak tersedia.';
        end if;
        if exists (
          select 1 from public.services_products
          where id = any(selected_addon_ids) and category = 'PICKUP'
        ) then
          raise exception 'Add-on antar-jemput tidak tersedia.';
        end if;
      end if;
      new.addon_ids := selected_addon_ids;
      new.addon_id := selected_addon_ids[1];
      if new.pickup_distance_km is not null then
        raise exception 'Jarak antar-jemput tidak lagi didukung.';
      end if;
      service_duration := new.duration_minutes - addon_duration;
      if service_duration <= 0 then
        raise exception 'Durasi layanan tidak valid.';
      end if;
      if catalog_category = 'SELF_SERVICE' and service_duration not in (20, 25, 30, 45, 60) then
        raise exception 'Durasi Self-Service tidak tersedia.';
      elsif catalog_category <> 'SELF_SERVICE' and service_duration <> catalog_duration then
        raise exception 'Durasi tidak sesuai katalog layanan.';
      end if;
      expected_amount := catalog_price + addon_price;
      if new.amount <> expected_amount then
        raise exception 'Nominal transaksi tidak sesuai katalog.';
      end if;
      starts_at := ((new.booking_date + new.booking_time) at time zone 'Asia/Jakarta');
      closes_at := ((new.booking_date + time '21:00') at time zone 'Asia/Jakarta');
      if starts_at < ((new.booking_date + time '08:00') at time zone 'Asia/Jakarta')
        or starts_at + make_interval(mins => new.duration_minutes) > closes_at then
        raise exception 'Slot layanan harus selesai dalam jam operasional 08:00-21:00.';
      end if;
      if starts_at <= clock_timestamp() then
        raise exception 'Pilih waktu layanan yang belum dimulai.';
      end if;
      if catalog_category = 'SELF_SERVICE' then
        if new.bay_number is null or new.bay_number not between 1 and 4 then
          raise exception 'Pilih salah satu dari empat bay Self-Service.';
        end if;
        perform pg_advisory_xact_lock(78131, new.bay_number);
        if exists (
          select 1 from public.transactions t
          join public.services_products service on service.id = t.item_id
          where t.bay_number = new.bay_number and service.category = 'SELF_SERVICE'
            and t.payment_status in ('PENDING', 'PAID')
            and t.transaction_status in ('PENDING', 'BOOKED', 'ACTIVE')
            and starts_at < ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') + make_interval(mins => t.duration_minutes)
            and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') < starts_at + make_interval(mins => new.duration_minutes)
        ) then
          raise exception 'Bay sudah dipesan pada jadwal ini.';
        end if;
      elsif new.bay_number is not null then
        raise exception 'Bay hanya berlaku untuk layanan Self-Service.';
      end if;
    end if;
  end if;

  if new.transaction_status in ('ACTIVE', 'COMPLETED', 'BOOKED') and new.payment_status <> 'PAID' then
    raise exception 'Transaksi harus lunas sebelum diproses.';
  end if;
  if tg_op = 'UPDATE' then
    if old.transaction_status = 'CANCELLED' and new.transaction_status <> 'CANCELLED' then
      raise exception 'Transaksi dibatalkan tidak dapat diaktifkan kembali.';
    end if;
    if old.transaction_status in ('COMPLETED', 'EXPIRED')
      and new.transaction_status is distinct from old.transaction_status then
      raise exception 'Transaksi selesai/kedaluwarsa tidak dapat diaktifkan kembali.';
    end if;
    if new.transaction_status = 'EXPIRED'
      and (current_user not in ('postgres', 'service_role')
        or current_setting('rinse.reconciliation_update', true) is distinct from 'on') then
      raise exception 'Status EXPIRED hanya dapat ditetapkan oleh rekonsiliasi.';
    end if;
    if old.transaction_status <> 'CANCELLED' and new.transaction_status = 'CANCELLED'
      and (current_user not in ('postgres', 'service_role')
        or current_setting('rinse.cancellation_update', true) is distinct from 'on') then
      raise exception 'Gunakan proses pembatalan booking.';
    end if;
    if old.payment_status is distinct from new.payment_status
      and (current_user not in ('postgres', 'service_role')
        or (current_setting('rinse.payment_update', true) is distinct from 'on'
          and current_setting('rinse.refund_update', true) is distinct from 'on')) then
      raise exception 'Gunakan proses pembayaran/refund.';
    end if;
    if old.refund_status is distinct from new.refund_status
      and (current_user not in ('postgres', 'service_role')
        or (current_setting('rinse.refund_update', true) is distinct from 'on'
          and current_setting('rinse.cancellation_update', true) is distinct from 'on')) then
      raise exception 'Gunakan proses refund.';
    end if;
    if old.id is distinct from new.id or old.code is distinct from new.code
      or old.customer_id is distinct from new.customer_id or old.vehicle_id is distinct from new.vehicle_id
      or old.item_id is distinct from new.item_id or old.addon_id is distinct from new.addon_id
      or old.addon_ids is distinct from new.addon_ids
      or old.pickup_distance_km is distinct from new.pickup_distance_km or old.item_type is distinct from new.item_type
      or old.transaction_type is distinct from new.transaction_type
      or old.item_name is distinct from new.item_name or old.quantity is distinct from new.quantity
      or old.amount is distinct from new.amount or old.payment_method is distinct from new.payment_method
      or old.booking_date is distinct from new.booking_date or old.booking_time is distinct from new.booking_time
      or old.duration_minutes is distinct from new.duration_minutes or old.bay_number is distinct from new.bay_number
      or old.created_at is distinct from new.created_at then
      raise exception 'Data pokok transaksi tidak dapat diubah setelah dibuat.';
    end if;
    if old.completed_at is distinct from new.completed_at
      and (current_user not in ('postgres', 'service_role')
        or current_setting('rinse.reconciliation_update', true) is distinct from 'on') then
      raise exception 'Waktu selesai hanya dapat dicatat oleh rekonsiliasi.';
    end if;
  end if;
  if new.transaction_status = 'ACTIVE' and new.transaction_type = 'BOOKING'
    and ((new.booking_date + new.booking_time) at time zone 'Asia/Jakarta') > clock_timestamp() then
    raise exception 'Booking belum mencapai waktu mulai.';
  end if;
  if new.transaction_status = 'COMPLETED' and new.item_type = 'SERVICE'
    and ((new.booking_date + new.booking_time) at time zone 'Asia/Jakarta') + make_interval(mins => new.duration_minutes) > clock_timestamp() then
    raise exception 'Durasi layanan belum selesai.';
  end if;
  if new.refund_status = 'PENDING' and (new.transaction_status <> 'CANCELLED' or new.payment_status <> 'PAID') then
    raise exception 'Status refund pending tidak sesuai.';
  end if;
  if new.refund_status = 'COMPLETED' and (new.transaction_status <> 'CANCELLED' or new.payment_status <> 'REFUNDED') then
    raise exception 'Status refund selesai tidak sesuai.';
  end if;
  if new.payment_status = 'REFUNDED' and new.refund_status <> 'COMPLETED' then
    raise exception 'Dana hanya dapat ditandai kembali setelah refund terkonfirmasi.';
  end if;
  return new;
end;
$$;

create or replace function public.record_service_transaction(p_transaction jsonb, p_addon_id text default null)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp
as $$
declare
  service public.services_products%rowtype;
  customer public.customers%rowtype;
  vehicle public.vehicles%rowtype;
  saved public.transactions%rowtype;
  verified_customer_id text;
  selected_addons text[] := coalesce(
    array(select jsonb_array_elements_text(coalesce(p_transaction -> 'addon_ids', '[]'::jsonb))),
    '{}'
  );
  addon_count integer := 0;
  addon_price integer := 0;
  addon_duration integer := 0;
  total_duration integer;
  service_duration integer;
  total_amount integer;
  bay integer;
  starts_at timestamptz;
  ends_at timestamptz;
  opens_at timestamptz;
  closes_at timestamptz;
  transaction_kind text;
  payment_method_value text;
begin
  if cardinality(selected_addons) = 0 and p_addon_id is not null then
    selected_addons := array[p_addon_id];
  end if;
  if p_addon_id is not null and cardinality(selected_addons) > 0 and p_addon_id <> selected_addons[1] then
    raise exception 'Add-on legacy tidak sesuai dengan daftar add-on.';
  end if;
  select * into service from public.services_products
  where id = p_transaction ->> 'item_id' and item_type = 'SERVICE' and active;
  if not found then raise exception 'Layanan tidak ditemukan atau tidak aktif.'; end if;

  select * into customer from public.customers where id = p_transaction ->> 'customer_id';
  if not found then raise exception 'Pelanggan tidak ditemukan.'; end if;
  if coalesce(auth.jwt() -> 'app_metadata' ->> 'rinse_role', '') <> 'admin' then
    verified_customer_id := public.current_verified_customer_id();
    if customer.id is distinct from verified_customer_id then
      raise exception 'Booking hanya dapat dibuat untuk nomor HP yang terverifikasi.';
    end if;
  end if;
  select * into vehicle from public.vehicles
  where id = p_transaction ->> 'vehicle_id' and customer_id = customer.id;
  if not found or vehicle.type <> service.type then
    raise exception 'Kendaraan tidak sesuai dengan pelanggan/layanan.';
  end if;

  if cardinality(selected_addons) <> (
    select count(distinct addon_id) from unnest(selected_addons) as addons(addon_id)
  ) then
    raise exception 'Add-on tidak boleh kosong atau duplikat.';
  end if;
  if cardinality(selected_addons) > 0 then
    select count(*)::integer, coalesce(sum(price), 0)::integer, coalesce(sum(duration), 0)::integer
      into addon_count, addon_price, addon_duration
    from public.services_products
    where id = any(selected_addons) and item_type = 'ADD_ON' and active;
    if addon_count <> cardinality(selected_addons) then
      raise exception 'Satu atau lebih add-on tidak tersedia.';
    end if;
    if exists (
      select 1 from public.services_products
      where id = any(selected_addons) and category = 'PICKUP'
    ) then
      raise exception 'Add-on antar-jemput tidak tersedia.';
    end if;
  end if;

  transaction_kind := p_transaction ->> 'transaction_type';
  if transaction_kind is null or transaction_kind not in ('BOOKING', 'WALK_IN') then raise exception 'Jenis transaksi tidak valid.'; end if;
  if service.category = 'SELF_SERVICE' and transaction_kind <> 'BOOKING' then
    raise exception 'Self-Service harus berupa Booking.';
  end if;
  payment_method_value := p_transaction ->> 'payment_method';
  if payment_method_value is null or payment_method_value not in ('CASH', 'QRIS', 'E_WALLET', 'CARD') then
    raise exception 'Metode pembayaran tidak valid.';
  end if;
  if transaction_kind = 'BOOKING' and payment_method_value = 'CASH' then
    raise exception 'Booking harus dibayar di muka dengan metode cashless.';
  end if;

  total_duration := (p_transaction ->> 'duration_minutes')::integer;
  if total_duration is null or total_duration < 1 then raise exception 'Durasi layanan tidak valid.'; end if;
  service_duration := total_duration - addon_duration;
  if service.category = 'SELF_SERVICE' then
    if service_duration not in (20, 25, 30, 45, 60) then raise exception 'Durasi Self-Service tidak tersedia.'; end if;
  elsif service_duration <> service.duration then
    raise exception 'Durasi tidak sesuai dengan katalog layanan.';
  end if;
  total_amount := service.price + addon_price;

  if p_transaction ->> 'booking_date' is null or p_transaction ->> 'booking_time' is null then
    raise exception 'Tanggal dan waktu layanan wajib diisi.';
  end if;
  starts_at := (((p_transaction ->> 'booking_date')::date + (p_transaction ->> 'booking_time')::time) at time zone 'Asia/Jakarta');
  ends_at := starts_at + make_interval(mins => total_duration);
  opens_at := (((p_transaction ->> 'booking_date')::date + time '08:00') at time zone 'Asia/Jakarta');
  closes_at := (((p_transaction ->> 'booking_date')::date + time '21:00') at time zone 'Asia/Jakarta');
  if starts_at < opens_at or ends_at > closes_at then
    raise exception 'Slot layanan harus selesai dalam jam operasional 08:00-21:00.';
  end if;
  if transaction_kind = 'BOOKING' and starts_at <= clock_timestamp() then
    raise exception 'Pilih waktu booking yang belum dimulai.';
  end if;

  bay := nullif(p_transaction ->> 'bay_number', '')::integer;
  if service.category = 'SELF_SERVICE' then
    if bay is null or bay not between 1 and 4 then raise exception 'Pilih salah satu dari empat bay.'; end if;
    perform pg_advisory_xact_lock(78131, bay);
    if exists (
      select 1 from public.transactions t
      join public.services_products item on item.id = t.item_id
      where t.bay_number = bay and item.category = 'SELF_SERVICE'
        and t.payment_status in ('PENDING', 'PAID')
        and t.transaction_status in ('PENDING', 'BOOKED', 'ACTIVE')
        and starts_at < ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') + make_interval(mins => t.duration_minutes)
        and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') < ends_at
    ) then
      raise exception 'Bay sudah dipesan pada jadwal ini.';
    end if;
  else
    bay := null;
  end if;

  insert into public.transactions (
    id, code, customer_id, vehicle_id, item_id, addon_id, addon_ids, item_type, item_name,
    quantity, amount, payment_method, payment_status, refund_status, transaction_type,
    transaction_status, queue_status, booking_date, booking_time, duration_minutes, bay_number, created_at
  ) values (
    p_transaction ->> 'id', p_transaction ->> 'code', customer.id, vehicle.id, service.id,
    selected_addons[1], selected_addons, 'SERVICE',
    service.name || coalesce((select string_agg(' + ' || item.name, '' order by array_position(selected_addons, item.id))
      from public.services_products item where item.id = any(selected_addons)), ''),
    1, total_amount, payment_method_value, 'PENDING', 'NONE', transaction_kind,
    'PENDING', 'WAITING', (p_transaction ->> 'booking_date')::date,
    (p_transaction ->> 'booking_time')::time, total_duration, bay, now()
  ) returning * into saved;
  return to_jsonb(saved);
end;
$$;

create or replace function public.reconcile_self_service_transactions()
returns integer language plpgsql security definer set search_path = pg_catalog, public, pg_temp
as $$
declare
  now_at timestamptz := clock_timestamp();
  completed_count integer := 0;
  activated_count integer := 0;
  expired_count integer := 0;
  expired_rows integer := 0;
begin
  perform set_config('rinse.reconciliation_update', 'on', true);
  update public.transactions t set transaction_status = 'COMPLETED', queue_status = 'COMPLETED',
    completed_at = coalesce(t.completed_at, ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta')
      + make_interval(mins => t.duration_minutes))
  from public.services_products service
  where service.id = t.item_id and t.item_type = 'SERVICE' and t.payment_status = 'PAID'
    and t.transaction_status = 'ACTIVE' and t.queue_status in ('WASHING', 'FINISHING', 'COMPLETED')
    and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta')
      + make_interval(mins => t.duration_minutes) <= now_at;
  get diagnostics completed_count = row_count;

  update public.transactions t set transaction_status = 'EXPIRED', queue_status = 'COMPLETED'
  where t.item_type = 'SERVICE' and t.transaction_type = 'BOOKING'
    and t.payment_status = 'PAID' and t.transaction_status = 'BOOKED'
    and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta')
      + make_interval(mins => t.duration_minutes) <= now_at;
  get diagnostics expired_rows = row_count;
  expired_count := expired_count + expired_rows;

  update public.transactions t set transaction_status = 'EXPIRED', queue_status = 'COMPLETED'
  where t.item_type = 'SERVICE' and t.transaction_type = 'BOOKING'
    and t.payment_status in ('PENDING', 'FAILED') and t.transaction_status = 'PENDING'
    and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') <= now_at;
  get diagnostics expired_rows = row_count;
  expired_count := expired_count + expired_rows;

  update public.transactions t set transaction_status = 'ACTIVE'
  where t.item_type = 'SERVICE' and t.payment_status = 'PAID' and t.transaction_status = 'BOOKED'
    and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') <= now_at
    and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta')
      + make_interval(mins => t.duration_minutes) > now_at;
  get diagnostics activated_count = row_count;

  update public.transactions t set transaction_status = 'EXPIRED', queue_status = 'COMPLETED'
  where t.item_type = 'SERVICE' and t.transaction_type = 'BOOKING'
    and t.payment_status = 'PAID' and t.transaction_status = 'ACTIVE' and t.queue_status = 'WAITING'
    and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta')
      + make_interval(mins => t.duration_minutes) <= now_at;
  get diagnostics expired_rows = row_count;
  expired_count := expired_count + expired_rows;
  perform set_config('rinse.reconciliation_update', 'off', true);
  return completed_count + activated_count + expired_count;
end;
$$;

create or replace function public.get_public_bay_status()
returns table(bay_number integer, bay_status text, vehicle_type text, duration_minutes integer, minutes_remaining integer, booking_time time)
language sql stable security definer set search_path = pg_catalog, public, pg_temp
as $$
  select bays.bay_number,
         case when active.transaction_status = 'ACTIVE'
                    or ((active.booking_date + active.booking_time) at time zone 'Asia/Jakarta') <= now() then 'OCCUPIED'
              when active.transaction_status in ('PENDING', 'BOOKED') then 'RESERVED' else 'AVAILABLE' end,
         vehicle.type, coalesce(active.duration_minutes, 0),
         case when active.transaction_status in ('ACTIVE', 'PENDING', 'BOOKED')
              then greatest(0, active.duration_minutes - floor(extract(epoch from (
                now() - ((active.booking_date + active.booking_time) at time zone 'Asia/Jakarta')
              )) / 60)::integer) else 0 end,
         active.booking_time
  from generate_series(1, 4) as bays(bay_number)
  left join lateral (
    select t.* from public.transactions t
    join public.services_products service on service.id = t.item_id
    where t.bay_number = bays.bay_number and service.category = 'SELF_SERVICE'
      and t.item_type = 'SERVICE' and t.payment_status in ('PENDING', 'PAID')
      and t.transaction_status in ('PENDING', 'BOOKED', 'ACTIVE')
      and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta')
        + make_interval(mins => t.duration_minutes) > now()
    order by ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') asc limit 1
  ) active on true
  left join public.vehicles vehicle on vehicle.id = active.vehicle_id
  order by bays.bay_number;
$$;

do $$
begin
  if not exists (
    select 1 from pg_trigger
    where tgrelid = 'public.transactions'::regclass
      and tgname = 'transactions_integrity_guard'
      and tgfoid = 'public.guard_transaction_integrity()'::regprocedure
      and not tgisinternal
      and tgenabled in ('O', 'A')
  ) then
    raise exception 'The active transactions_integrity_guard must use the final guard function.';
  end if;

  if exists (
    select 1 from pg_proc proc
    join pg_namespace namespace on namespace.oid = proc.pronamespace
    where namespace.nspname = 'public'
      and proc.prosecdef
      and pg_get_userbyid(proc.proowner) in ('anon', 'authenticated')
  ) then
    raise exception 'SECURITY DEFINER functions must be owned by a trusted non-client role.';
  end if;

  if exists (
    select 1 from pg_proc proc
    where proc.oid in (
      'public.record_service_transaction(jsonb, text)'::regprocedure,
      'public.record_product_sale(jsonb)'::regprocedure,
      'public.reconcile_self_service_transactions()'::regprocedure
    ) and not proc.prosecdef
  ) then
    raise exception 'Booking, product-sale, and reconciliation RPCs must remain SECURITY DEFINER.';
  end if;

  if exists (
    select 1 from pg_proc proc
    where proc.oid in (
      'public.record_service_transaction(jsonb, text)'::regprocedure,
      'public.record_product_sale(jsonb)'::regprocedure,
      'public.cancel_transaction(text, text)'::regprocedure,
      'public.confirm_transaction_payment(text)'::regprocedure,
      'public.confirm_booking_payment(text)'::regprocedure,
      'public.complete_transaction_refund(text)'::regprocedure,
      'public.reconcile_self_service_transactions()'::regprocedure
    ) and pg_get_userbyid(proc.proowner) not in ('postgres', 'service_role')
  ) then
    raise exception 'State-transition RPC owners must be postgres or service_role for the integrity guard.';
  end if;
end;
$$;

revoke all on function public.record_service_transaction(jsonb, text) from public, anon, authenticated;
grant execute on function public.record_service_transaction(jsonb, text) to authenticated;
revoke insert, delete on public.transactions from public, anon, authenticated;
revoke all on function public.reconcile_self_service_transactions() from public, anon, authenticated;
grant execute on function public.reconcile_self_service_transactions() to service_role;
notify pgrst, 'reload schema';
commit;
