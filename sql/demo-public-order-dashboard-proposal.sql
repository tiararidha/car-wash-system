-- DEMO ONLY. Review before applying. Never apply to a project containing real
-- customer records: the public order RPC writes submitted contact/vehicle data.
-- The public Admin snapshot includes only orders registered by this RPC and masks
-- customer names, phones, addresses, vehicle plates, and models.
-- SUPERSEDED historical proposal. Do not execute this file.
-- The reviewed, versioned implementation is
-- supabase/migrations/20261012000000_secure_demo_service_orders.sql.

begin;

do $$
begin
  raise exception 'Superseded proposal. Apply the versioned migration in supabase/migrations instead.';
end;
$$;

do $$
declare
  required_columns text[] := array[
    'customers.id', 'customers.full_name', 'customers.phone', 'customers.address', 'customers.created_at',
    'vehicles.id', 'vehicles.customer_id', 'vehicles.type', 'vehicles.plate', 'vehicles.model', 'vehicles.created_at',
    'services_products.id', 'services_products.item_type', 'services_products.name', 'services_products.category',
    'services_products.type', 'services_products.description', 'services_products.price', 'services_products.duration',
    'services_products.stock', 'services_products.min_stock', 'services_products.active', 'services_products.image',
    'services_products.created_at', 'services_products.updated_at',
    'transactions.id', 'transactions.code', 'transactions.customer_id', 'transactions.vehicle_id',
    'transactions.item_id', 'transactions.item_type', 'transactions.item_name', 'transactions.quantity',
    'transactions.amount', 'transactions.payment_method', 'transactions.payment_status',
    'transactions.transaction_type', 'transactions.transaction_status', 'transactions.queue_status',
    'transactions.booking_date', 'transactions.booking_time', 'transactions.duration_minutes',
    'transactions.bay_number', 'transactions.addon_id', 'transactions.pickup_distance_km',
    'transactions.completed_at', 'transactions.refund_status', 'transactions.created_at'
  ];
  required_column text;
  table_name_value text;
  column_name_value text;
  actual_type text;
  rpc_result_type text;
  transaction_id_attnum smallint;
  transaction_guard_oid oid;
  expected_guard_oid oid;
  trigger_definition text;
begin
  if to_regclass('public.customers') is null
    or to_regclass('public.vehicles') is null
    or to_regclass('public.services_products') is null
    or to_regclass('public.transactions') is null then
    raise exception 'Demo order preflight failed: one or more required public tables are missing.';
  end if;

  if to_regprocedure('public.record_service_transaction(jsonb,text)') is null
    or not has_function_privilege('anon', 'public.record_service_transaction(jsonb,text)', 'EXECUTE') then
    raise exception 'Demo order preflight failed: the active record_service_transaction(jsonb,text) RPC is missing or not executable by anon.';
  end if;
  select pg_get_function_result('public.record_service_transaction(jsonb,text)'::regprocedure)
  into rpc_result_type;
  if rpc_result_type is distinct from 'jsonb' then
    raise exception 'Demo order preflight failed: record_service_transaction must return jsonb, found %.', coalesce(rpc_result_type, 'unknown');
  end if;
  select attnum into transaction_id_attnum
  from pg_attribute
  where attrelid = 'public.transactions'::regclass
    and attname = 'id'
    and not attisdropped;
  if transaction_id_attnum is null or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.transactions'::regclass
      and contype in ('p', 'u')
      and conkey = array[transaction_id_attnum]::smallint[]
  ) then
    raise exception 'Demo order preflight failed: transactions.id needs a primary-key or unique constraint for the private demo registry.';
  end if;

  if to_regclass('private.demo_transaction_registry') is not null and (
    not exists (
      select 1 from information_schema.columns
      where table_schema = 'private' and table_name = 'demo_transaction_registry'
        and column_name = 'transaction_id' and data_type = 'text'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema = 'private' and table_name = 'demo_transaction_registry'
        and column_name = 'created_at' and data_type = 'timestamp with time zone'
    )
  ) then
    raise exception 'Demo order preflight failed: existing private demo registry has an incompatible shape.';
  end if;

  foreach required_column in array required_columns loop
    table_name_value := split_part(required_column, '.', 1);
    column_name_value := split_part(required_column, '.', 2);
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public'
        and table_name = table_name_value
        and column_name = column_name_value
    ) then
      raise exception 'Demo order preflight failed: missing column public.%.%.', table_name_value, column_name_value;
    end if;
  end loop;

  foreach required_column in array array[
    'customers.id:text', 'customers.full_name:text', 'customers.phone:text',
    'vehicles.id:text', 'vehicles.customer_id:text', 'vehicles.type:text',
    'vehicles.plate:text', 'vehicles.model:text',
    'services_products.id:text', 'services_products.item_type:text',
    'services_products.name:text', 'services_products.category:text', 'services_products.type:text',
    'services_products.price:integer', 'services_products.duration:integer',
    'transactions.id:text', 'transactions.code:text', 'transactions.customer_id:text',
    'transactions.vehicle_id:text', 'transactions.item_id:text', 'transactions.item_type:text',
    'transactions.amount:integer', 'transactions.payment_method:text', 'transactions.payment_status:text',
    'transactions.transaction_type:text', 'transactions.transaction_status:text', 'transactions.queue_status:text',
    'transactions.booking_date:date', 'transactions.booking_time:time without time zone',
    'transactions.duration_minutes:integer', 'transactions.bay_number:integer',
    'transactions.addon_id:text', 'transactions.refund_status:text'
  ] loop
    table_name_value := split_part(split_part(required_column, ':', 1), '.', 1);
    column_name_value := split_part(split_part(required_column, ':', 1), '.', 2);
    actual_type := null;
    select data_type into actual_type from information_schema.columns
    where table_schema = 'public'
      and table_name = table_name_value
      and column_name = column_name_value;
    if actual_type is distinct from split_part(required_column, ':', 2) then
      raise exception 'Demo order preflight failed: expected type % for public.%, found %.',
        split_part(required_column, ':', 2), split_part(required_column, ':', 1), coalesce(actual_type, 'missing');
    end if;
  end loop;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.vehicles'::regclass and contype = 'f'
      and pg_get_constraintdef(oid) like '%customer_id%customers(id)%'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.transactions'::regclass and contype = 'f'
      and pg_get_constraintdef(oid) like '%customer_id%customers(id)%'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.transactions'::regclass and contype = 'f'
      and pg_get_constraintdef(oid) like '%vehicle_id%vehicles(id)%'
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.transactions'::regclass and contype = 'f'
      and pg_get_constraintdef(oid) like '%item_id%services_products(id)%'
  ) then
    raise exception 'Demo order preflight failed: required customer/vehicle/item foreign keys are missing.';
  end if;

  select trigger_row.tgfoid, pg_get_triggerdef(trigger_row.oid, true)
  into transaction_guard_oid, trigger_definition
  from pg_trigger trigger_row
  join pg_class table_row on table_row.oid = trigger_row.tgrelid
  join pg_namespace table_schema on table_schema.oid = table_row.relnamespace
  where table_schema.nspname = 'public'
    and table_row.relname = 'transactions'
    and trigger_row.tgname = 'transactions_integrity_guard'
    and trigger_row.tgenabled <> 'D'
    and not trigger_row.tgisinternal;

  expected_guard_oid := to_regprocedure('public.guard_transaction_integrity()');
  if transaction_guard_oid is null
    or expected_guard_oid is null
    or transaction_guard_oid is distinct from expected_guard_oid
    or upper(trigger_definition) not like '%BEFORE INSERT%'
    or upper(trigger_definition) not like '%UPDATE%' then
    raise exception 'Demo order preflight failed: enabled transactions_integrity_guard using public.guard_transaction_integrity() is missing.';
  end if;
end;
$$;

create schema if not exists private;

create table if not exists private.demo_transaction_registry (
  transaction_id text primary key references public.transactions(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on table private.demo_transaction_registry from public, anon, authenticated;

create or replace function public.create_demo_service_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare
  service_row public.services_products%rowtype;
  customer_id_value text := gen_random_uuid()::text;
  vehicle_id_value text := gen_random_uuid()::text;
  transaction_id_value text := gen_random_uuid()::text;
  transaction_code_value text;
  normalized_phone text;
  customer_name_value text;
  vehicle_plate_value text;
  vehicle_model_value text;
  existing_customer_name text;
  existing_customer_id text;
  existing_vehicle_id text;
  existing_vehicle_customer_id text;
  payment_method_value text;
  transaction_type_value text;
  duration_value integer;
  local_start timestamp without time zone;
  requested_start timestamptz;
  requested_end timestamptz;
  selected_bay integer;
  candidate_bay integer;
  transaction_payload jsonb;
  saved_transaction jsonb;
begin
  if coalesce(auth.role(), '') <> 'anon' then
    raise exception 'Demo order endpoint accepts anonymous demo requests only.';
  end if;
  if p_order is null or jsonb_typeof(p_order) <> 'object' then
    raise exception 'Data order tidak valid.';
  end if;

  customer_name_value := trim(coalesce(p_order ->> 'customer_name', ''));
  normalized_phone := regexp_replace(coalesce(p_order ->> 'customer_phone', ''), '[^0-9]', '', 'g');
  if normalized_phone like '0%' and length(normalized_phone) between 10 and 14 then
    normalized_phone := '62' || substr(normalized_phone, 2);
  end if;
  vehicle_plate_value := upper(trim(coalesce(p_order ->> 'vehicle_plate', '')));
  vehicle_model_value := trim(coalesce(p_order ->> 'vehicle_model', ''));
  payment_method_value := upper(trim(coalesce(p_order ->> 'payment_method', '')));

  if length(customer_name_value) < 2 then raise exception 'Masukkan nama lengkap.'; end if;
  if normalized_phone !~ '^62[0-9]{8,13}$' then raise exception 'Gunakan nomor HP Indonesia yang valid.'; end if;
  if length(vehicle_plate_value) < 4 then raise exception 'Masukkan nomor polisi yang valid.'; end if;
  if payment_method_value not in ('CASH', 'QRIS', 'E_WALLET', 'CARD') then raise exception 'Metode pembayaran tidak valid.'; end if;

  select * into service_row
  from public.services_products
  where id = p_order ->> 'item_id'
    and item_type = 'SERVICE'
    and active = true;
  if not found or service_row.type is null or service_row.type not in ('CAR', 'MOTOR') then
    raise exception 'Layanan tidak ditemukan atau tidak aktif.';
  end if;
  if service_row.category = 'SELF_SERVICE' and payment_method_value = 'CASH' then
    raise exception 'Self-Service harus menggunakan metode pembayaran cashless.';
  end if;

  duration_value := service_row.duration;
  if duration_value is null or duration_value < 1 or duration_value > 780 then raise exception 'Durasi layanan tidak valid.'; end if;
  transaction_type_value := case when service_row.category = 'SELF_SERVICE' then 'BOOKING' else 'WALK_IN' end;

  local_start := date_trunc('minute', timezone('Asia/Jakarta', clock_timestamp())) + interval '10 minutes';
  if local_start::time < time '08:00' then
    local_start := local_start::date + time '08:10';
  end if;
  if local_start::time + make_interval(mins => duration_value) > time '21:00' then
    local_start := (local_start::date + 1) + time '08:10';
  end if;
  if time '08:10' + make_interval(mins => duration_value) > time '21:00' then
    raise exception 'Durasi katalog tidak dapat dijadwalkan pada jam operasional.';
  end if;

  if service_row.category = 'SELF_SERVICE' then
    requested_start := local_start at time zone 'Asia/Jakarta';
    requested_end := requested_start + make_interval(mins => duration_value);
    for candidate_bay in 1..4 loop
      perform pg_advisory_xact_lock(78131, candidate_bay);
      if not exists (
        select 1 from public.transactions existing
        join public.services_products existing_service on existing_service.id = existing.item_id
        where existing.bay_number = candidate_bay
          and existing_service.category = 'SELF_SERVICE'
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
    if selected_bay is null then raise exception 'Semua bay Self-Service sedang digunakan. Coba lagi.'; end if;
  end if;

  transaction_code_value := 'RS-' || to_char(local_start, 'YYMMDD') || '-'
    || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

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

  select id, customer_id into existing_vehicle_id, existing_vehicle_customer_id
  from public.vehicles
  where regexp_replace(upper(plate), '[^A-Z0-9]', '', 'g')
    = regexp_replace(vehicle_plate_value, '[^A-Z0-9]', '', 'g')
  limit 1
  for update;

  if found then
    vehicle_id_value := existing_vehicle_id;
    if existing_vehicle_customer_id <> customer_id_value then
      raise exception 'Nomor polisi sudah terdaftar pada profil lain.';
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

  transaction_payload := jsonb_build_object(
    'id', transaction_id_value,
    'code', transaction_code_value,
    'customer_id', customer_id_value,
    'vehicle_id', vehicle_id_value,
    'item_id', service_row.id,
    'transaction_type', transaction_type_value,
    'payment_method', payment_method_value,
    'booking_date', local_start::date,
    'booking_time', local_start::time,
    'duration_minutes', duration_value,
    'bay_number', selected_bay
  );
  saved_transaction := public.record_service_transaction(transaction_payload, null::text);
  if saved_transaction is null
    or saved_transaction ->> 'id' is distinct from transaction_id_value
    or saved_transaction ->> 'customer_id' is distinct from customer_id_value
    or saved_transaction ->> 'vehicle_id' is distinct from vehicle_id_value
    or saved_transaction ->> 'item_id' is distinct from service_row.id
    or saved_transaction ->> 'payment_status' is distinct from 'PENDING'
    or saved_transaction ->> 'transaction_status' is distinct from 'PENDING' then
    raise exception 'Database tidak mengonfirmasi penyimpanan order demo.';
  end if;

  insert into private.demo_transaction_registry(transaction_id)
  values (transaction_id_value);
  return saved_transaction;
exception
  when unique_violation then
    raise exception 'Nomor pelanggan atau kendaraan sudah terdaftar. Gunakan data demo unik.';
end;
$$;

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
  )
  select jsonb_build_object(
    'customers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', customer_row.id,
        'full_name', 'Pelanggan demo ' || left(customer_row.id, 6),
        'phone', 'disamarkan',
        'address', '',
        'created_at', customer_row.created_at
      ) order by customer_row.created_at desc)
      from public.customers customer_row
      where exists (select 1 from demo_transactions row_tx where row_tx.customer_id = customer_row.id)
    ), '[]'::jsonb),
    'vehicles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', vehicle_row.id,
        'customer_id', vehicle_row.customer_id,
        'type', vehicle_row.type,
        'plate', 'DEMO-' || left(vehicle_row.id, 6),
        'model', 'Kendaraan demo',
        'created_at', vehicle_row.created_at
      ) order by vehicle_row.created_at desc)
      from public.vehicles vehicle_row
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
      select jsonb_agg(to_jsonb(transaction_row) order by transaction_row.created_at desc)
      from demo_transactions transaction_row
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.create_demo_service_order(jsonb) from public, anon, authenticated;
revoke all on function public.get_demo_admin_snapshot() from public, anon, authenticated;
grant execute on function public.create_demo_service_order(jsonb) to anon;
grant execute on function public.get_demo_admin_snapshot() to anon;

commit;
