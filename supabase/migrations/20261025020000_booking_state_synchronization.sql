begin;

alter table public.transactions
  add column if not exists start_time timestamptz generated always as (
    (booking_date + booking_time) at time zone 'Asia/Jakarta'
  ) stored,
  add column if not exists finished_at timestamptz generated always as (
    ((booking_date + booking_time) at time zone 'Asia/Jakarta')
      + make_interval(mins => coalesce(duration_minutes, 0))
  ) stored;

create or replace function public.create_demo_service_order_pending(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare
  service_row public.services_products%rowtype;
  saved_transaction public.transactions%rowtype;
  customer_id_value text := gen_random_uuid()::text;
  vehicle_id_value text := gen_random_uuid()::text;
  transaction_id_value text := gen_random_uuid()::text;
  transaction_code_value text;
  normalized_phone text;
  normalized_plate text;
  customer_name_value text;
  vehicle_plate_value text;
  vehicle_model_value text;
  existing_customer_name text;
  existing_customer_id text;
  existing_vehicle_id text;
  existing_vehicle_customer_id text;
  existing_vehicle_type text;
  payment_method_value text;
  transaction_type_value text;
  duration_value integer;
  local_start timestamp without time zone;
  requested_start timestamptz;
  requested_end timestamptz;
  selected_bay integer;
  candidate_bay integer;
  request_id_value uuid;
  request_fingerprint_value text;
  existing_fingerprint text;
  existing_transaction jsonb;
begin
  if coalesce(auth.role(), '') <> 'anon' then
    raise exception 'Demo order endpoint accepts anonymous demo requests only.';
  end if;
  if p_order is null or jsonb_typeof(p_order) <> 'object' then
    raise exception 'Data order tidak valid.';
  end if;
  if coalesce(p_order ->> 'request_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Kunci permintaan order tidak valid. Muat ulang form lalu coba lagi.';
  end if;
  request_id_value := (p_order ->> 'request_id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended(request_id_value::text, 78131));

  customer_name_value := trim(coalesce(p_order ->> 'customer_name', ''));
  normalized_phone := regexp_replace(coalesce(p_order ->> 'customer_phone', ''), '[^0-9]', '', 'g');
  if normalized_phone like '0%' and length(normalized_phone) between 10 and 14 then
    normalized_phone := '62' || substr(normalized_phone, 2);
  end if;
  vehicle_plate_value := upper(trim(coalesce(p_order ->> 'vehicle_plate', '')));
  normalized_plate := regexp_replace(vehicle_plate_value, '[^A-Z0-9]', '', 'g');
  vehicle_model_value := trim(coalesce(p_order ->> 'vehicle_model', ''));
  payment_method_value := upper(trim(coalesce(p_order ->> 'payment_method', '')));

  if length(customer_name_value) < 2 then raise exception 'Masukkan nama lengkap.'; end if;
  if normalized_phone !~ '^62[0-9]{8,13}$' then raise exception 'Gunakan nomor HP Indonesia yang valid.'; end if;
  if normalized_plate !~ '^[A-Z]{1,2}[0-9]{1,4}[A-Z]{1,3}$' then
    raise exception 'Masukkan nomor polisi Indonesia yang valid, contoh H 1234 NP.';
  end if;
  if payment_method_value not in ('CASH', 'QRIS', 'E_WALLET', 'CARD') then raise exception 'Metode pembayaran tidak valid.'; end if;

  select * into service_row
  from public.services_products
  where id = p_order ->> 'item_id'
    and item_type = 'SERVICE'
    and active = true
    and category in ('REGULAR', 'SELF_SERVICE');
  if not found or service_row.type is null or service_row.type not in ('CAR', 'MOTOR') then
    raise exception 'Layanan tidak ditemukan atau tidak aktif.';
  end if;
  if service_row.category = 'SELF_SERVICE' and payment_method_value = 'CASH' then
    raise exception 'Self-Service harus menggunakan metode pembayaran cashless.';
  end if;

  request_fingerprint_value := encode(extensions.digest(convert_to(
    lower(customer_name_value) || chr(31) || normalized_phone || chr(31) || normalized_plate || chr(31)
      || lower(vehicle_model_value) || chr(31) || service_row.id || chr(31) || payment_method_value,
    'UTF8'), 'sha256'), 'hex');
  select r.request_fingerprint, to_jsonb(t)
    into existing_fingerprint, existing_transaction
  from private.demo_transaction_registry r
  join public.transactions t on t.id = r.transaction_id
  where r.request_id = request_id_value
  for update of r;
  if found then
    if existing_fingerprint is distinct from request_fingerprint_value then
      raise exception 'Kunci order sudah digunakan untuk data berbeda. Ubah data lalu kirim ulang.';
    end if;
    return existing_transaction;
  end if;

  duration_value := service_row.duration;
  if duration_value is null or duration_value < 1 or duration_value > 780 then raise exception 'Durasi layanan tidak valid.'; end if;
  transaction_type_value := case when service_row.category = 'SELF_SERVICE' then 'BOOKING' else 'WALK_IN' end;
  local_start := timezone('Asia/Jakarta', clock_timestamp());
  if local_start::time < time '08:00' or local_start::time > time '21:00' then
    raise exception 'Transaksi baru hanya dapat dibuat pada 08.00–21.00 WIB.';
  end if;
  if local_start + make_interval(mins => duration_value) > local_start::date + time '21:00' then
    raise exception 'Durasi layanan harus selesai paling lambat pukul 21.00 WIB.';
  end if;

  requested_start := local_start at time zone 'Asia/Jakarta';
  requested_end := requested_start + make_interval(mins => duration_value);
  for candidate_bay in 1..4 loop
    perform pg_advisory_xact_lock(78131, candidate_bay);
    if not exists (
      select 1 from public.transactions existing
      where existing.bay_number = candidate_bay
        and existing.item_type = 'SERVICE'
        and existing.payment_status in ('PENDING', 'PAID')
        and existing.transaction_status in ('PENDING', 'BOOKED', 'ACTIVE')
        and requested_start < ((existing.booking_date + existing.booking_time) at time zone 'Asia/Jakarta')
          + make_interval(mins => existing.duration_minutes)
        and ((existing.booking_date + existing.booking_time) at time zone 'Asia/Jakarta') < requested_end
    ) then
      selected_bay := candidate_bay;
      exit;
    end if;
  end loop;
  if selected_bay is null then raise exception 'Semua bay sedang digunakan. Coba lagi.'; end if;

  select id, full_name into existing_customer_id, existing_customer_name
  from public.customers
  where regexp_replace(phone, '[^0-9]', '', 'g') in (
    normalized_phone,
    '0' || substr(normalized_phone, 3)
  )
  order by created_at
  limit 1
  for update;
  if found then
    customer_id_value := existing_customer_id;
    if lower(trim(existing_customer_name)) <> lower(customer_name_value) then
      raise exception 'Nomor pelanggan sudah terdaftar dengan nama berbeda. Hubungi studio.';
    end if;
  else
    insert into public.customers(id, full_name, phone, address)
    values (customer_id_value, customer_name_value, '+' || normalized_phone, '');
  end if;

  select id, customer_id, type into existing_vehicle_id, existing_vehicle_customer_id, existing_vehicle_type
  from public.vehicles
  where regexp_replace(upper(plate), '[^A-Z0-9]', '', 'g') = normalized_plate
  limit 1
  for update;
  if found then
    vehicle_id_value := existing_vehicle_id;
    if existing_vehicle_customer_id <> customer_id_value then
      raise exception 'Nomor polisi sudah terdaftar pada profil lain.';
    end if;
    if existing_vehicle_type <> service_row.type then
      raise exception 'Jenis kendaraan tidak sesuai dengan layanan yang dipilih.';
    end if;
  else
    insert into public.vehicles(id, customer_id, type, plate, model)
    values (
      vehicle_id_value,
      customer_id_value,
      service_row.type,
      vehicle_plate_value,
      coalesce(nullif(vehicle_model_value, ''), 'Kendaraan')
    );
  end if;

  transaction_code_value := 'RS-' || to_char(local_start, 'YYMMDD') || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.transactions (
    id, code, customer_id, vehicle_id, item_id, item_type, item_name, quantity, amount,
    payment_method, payment_status, refund_status, transaction_type, transaction_status,
    queue_status, booking_date, booking_time, duration_minutes, bay_number
  ) values (
    transaction_id_value, transaction_code_value, customer_id_value, vehicle_id_value,
    service_row.id, 'SERVICE', service_row.name, 1, service_row.price,
    payment_method_value, 'PENDING', 'NONE', transaction_type_value, 'PENDING', 'WAITING',
    local_start::date, local_start::time, duration_value, selected_bay
  ) returning * into saved_transaction;

  insert into private.demo_transaction_registry(transaction_id, request_id, request_fingerprint)
  values (transaction_id_value, request_id_value, request_fingerprint_value);
  return to_jsonb(saved_transaction);
exception
  when unique_violation then
    raise exception using errcode = '23505',
      message = 'Nomor HP atau nomor polisi sudah terdaftar. Periksa data pelanggan dan kendaraan lalu coba lagi.';
end;
$$;

revoke all on function public.create_demo_service_order_pending(jsonb) from public, anon, authenticated;
grant execute on function public.create_demo_service_order_pending(jsonb) to anon;

create or replace function public.create_demo_service_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare
  saved_transaction jsonb;
  request_id_value uuid;
begin
  if coalesce(auth.role(), '') <> 'anon' then
    raise exception 'Demo order endpoint accepts anonymous demo requests only.';
  end if;
  if p_order is null or coalesce(p_order ->> 'request_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Kunci permintaan order tidak valid.';
  end if;
  if length(trim(coalesce(p_order ->> 'customer_name', ''))) < 2
    or length(trim(coalesce(p_order ->> 'vehicle_plate', ''))) < 2 then
    raise exception 'Nama pelanggan dan nomor polisi wajib diisi.';
  end if;
  request_id_value := (p_order ->> 'request_id')::uuid;
  saved_transaction := public.create_demo_service_order_pending(p_order);
  return private.simulate_demo_payment(saved_transaction ->> 'id', request_id_value);
end;
$$;

revoke all on function public.create_demo_service_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_demo_service_order(jsonb) to anon;

create or replace function public.get_public_bay_status()
returns table(
  bay_number integer,
  bay_status text,
  vehicle_type text,
  duration_minutes integer,
  minutes_remaining integer,
  booking_time time
)
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select bays.bay_number,
        case when active.id is null then 'AVAILABLE'
          when ((active.booking_date + active.booking_time) at time zone 'Asia/Jakarta') <= now()
          then 'OCCUPIED' else 'RESERVED' end,
         vehicle.type,
         coalesce(active.duration_minutes, 0),
         case when active.id is null then 0
              when ((active.booking_date + active.booking_time) at time zone 'Asia/Jakarta') <= now()
              then greatest(0, active.duration_minutes - floor(extract(epoch from (
                now() - ((active.booking_date + active.booking_time) at time zone 'Asia/Jakarta')
              )) / 60)::integer)
              else active.duration_minutes end,
         active.booking_time
  from generate_series(1, 4) as bays(bay_number)
  left join lateral (
    select transaction_row.*
    from public.transactions transaction_row
    where transaction_row.bay_number = bays.bay_number
      and transaction_row.item_type = 'SERVICE'
      and transaction_row.payment_status = 'PAID'
      and transaction_row.transaction_status in ('PENDING', 'BOOKED', 'ACTIVE')
      and ((transaction_row.booking_date + transaction_row.booking_time) at time zone 'Asia/Jakarta')
        + make_interval(mins => transaction_row.duration_minutes) > now()
    order by ((transaction_row.booking_date + transaction_row.booking_time) at time zone 'Asia/Jakarta')
    limit 1
  ) active on true
  left join public.vehicles vehicle on vehicle.id = active.vehicle_id
  order by bays.bay_number;
$$;

revoke all on function public.get_public_bay_status() from public;
grant execute on function public.get_public_bay_status() to anon, authenticated;

create or replace function public.broadcast_transaction_change()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, realtime, pg_temp
as $$
begin
  perform realtime.send(
    jsonb_build_object('table', 'transactions', 'changed', true),
    'transaction_changed',
    'public:transactions',
    false
  );
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

revoke all on function public.broadcast_transaction_change() from public, anon, authenticated;
drop trigger if exists transactions_broadcast_change on public.transactions;
create trigger transactions_broadcast_change
after insert or update or delete on public.transactions
for each row execute function public.broadcast_transaction_change();

create or replace function public.get_demo_admin_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
  with demo_transactions as materialized (
    select transaction_row.*
    from private.demo_transaction_registry registry
    join public.transactions transaction_row on transaction_row.id = registry.transaction_id
    order by transaction_row.created_at desc
    limit 500
  ),
  admin_view as (
    select coalesce(auth.jwt() -> 'app_metadata' ->> 'rinse_role', '') = 'admin' as enabled
  )
  select jsonb_build_object(
    'customers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', customer_row.id,
        'full_name', case when admin_view.enabled then customer_row.full_name else private.demo_realistic_name(customer_row.id) end,
        'phone', case when admin_view.enabled then customer_row.phone else 'disamarkan' end,
        'address', case when admin_view.enabled then customer_row.address else '' end,
        'created_at', customer_row.created_at
      ) order by customer_row.created_at desc)
      from public.customers customer_row
      cross join admin_view
      where exists (select 1 from demo_transactions row_tx where row_tx.customer_id = customer_row.id)
    ), '[]'::jsonb),
    'vehicles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', vehicle_row.id,
        'customer_id', vehicle_row.customer_id,
        'type', vehicle_row.type,
        'plate', case when admin_view.enabled then vehicle_row.plate else private.demo_realistic_plate(vehicle_row.id) end,
        'model', case when admin_view.enabled then vehicle_row.model else private.demo_realistic_model(vehicle_row.id, vehicle_row.type) end,
        'created_at', vehicle_row.created_at
      ) order by vehicle_row.created_at desc)
      from public.vehicles vehicle_row
      cross join admin_view
      where exists (select 1 from demo_transactions row_tx where row_tx.vehicle_id = vehicle_row.id)
    ), '[]'::jsonb),
    'services_products', coalesce((
      select jsonb_agg(to_jsonb(item_row) order by item_row.name)
      from (
        select id, item_type, name, category, type, description, price, duration,
          stock, min_stock, active, image, created_at, updated_at
        from public.services_products catalog_item
        where catalog_item.active = true
          or exists (select 1 from demo_transactions row_tx where row_tx.item_id = catalog_item.id)
      ) item_row
    ), '[]'::jsonb),
    'transactions', coalesce((
      select jsonb_agg(
        to_jsonb(transaction_row) || jsonb_build_object(
          'customer_name', case when admin_view.enabled then customer_row.full_name else private.demo_realistic_name(customer_row.id) end
        ) order by transaction_row.created_at desc
      )
      from demo_transactions transaction_row
      join public.customers customer_row on customer_row.id = transaction_row.customer_id
      cross join admin_view
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_demo_admin_snapshot() from public, anon, authenticated;
grant execute on function public.get_demo_admin_snapshot() to anon, authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'transactions'
    ) then
    alter publication supabase_realtime add table public.transactions;
  end if;
end;
$$;

notify pgrst, 'reload schema';
commit;
