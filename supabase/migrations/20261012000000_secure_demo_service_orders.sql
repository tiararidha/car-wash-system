begin;

do $$
declare
  required_column text;
  table_name_value text;
  column_name_value text;
  trigger_oid oid;
  trigger_definition text;
begin
  foreach required_column in array array[
    'customers.id', 'customers.full_name', 'customers.phone', 'customers.address', 'customers.created_at',
    'vehicles.id', 'vehicles.customer_id', 'vehicles.type', 'vehicles.plate', 'vehicles.model',
    'services_products.id', 'services_products.item_type', 'services_products.name',
    'services_products.category', 'services_products.type', 'services_products.price',
    'services_products.duration', 'services_products.active',
    'transactions.id', 'transactions.code', 'transactions.customer_id', 'transactions.vehicle_id',
    'transactions.item_id', 'transactions.item_type', 'transactions.item_name', 'transactions.quantity',
    'transactions.amount', 'transactions.payment_method', 'transactions.payment_status',
    'transactions.refund_status', 'transactions.transaction_type', 'transactions.transaction_status',
    'transactions.queue_status', 'transactions.booking_date', 'transactions.booking_time',
    'transactions.duration_minutes', 'transactions.bay_number', 'transactions.created_at'
  ] loop
    table_name_value := split_part(required_column, '.', 1);
    column_name_value := split_part(required_column, '.', 2);
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = table_name_value and column_name = column_name_value
    ) then
      raise exception 'Demo order migration preflight failed: missing public.%.%.', table_name_value, column_name_value;
    end if;
  end loop;

  if to_regprocedure('public.record_service_transaction(jsonb,text)') is null
    or not has_function_privilege('authenticated', 'public.record_service_transaction(jsonb,text)', 'EXECUTE') then
    raise exception 'Demo order migration preflight failed: authenticated record_service_transaction access is required and must be preserved.';
  end if;
  if to_regprocedure('extensions.digest(bytea,text)') is null then
    raise exception 'Demo order migration preflight failed: pgcrypto digest(bytea,text) is unavailable.';
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.transactions'::regclass and contype in ('p','u')
      and conkey = array[(select attnum from pg_attribute where attrelid = 'public.transactions'::regclass and attname = 'id' and not attisdropped)]::smallint[]
  ) then
    raise exception 'Demo order migration preflight failed: transactions.id must be unique.';
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.customers'::regclass and contype in ('p','u')
      and conkey = array[(select attnum from pg_attribute where attrelid = 'public.customers'::regclass and attname = 'phone' and not attisdropped)]::smallint[]
  ) or not exists (
    select 1 from pg_constraint
    where conrelid = 'public.vehicles'::regclass and contype in ('p','u')
      and conkey = array[(select attnum from pg_attribute where attrelid = 'public.vehicles'::regclass and attname = 'plate' and not attisdropped)]::smallint[]
  ) then
    raise exception 'Demo order migration preflight failed: unique phone and plate constraints are required.';
  end if;
  if not exists (
    select 1 from pg_trigger t
    where t.tgrelid = 'public.transactions'::regclass
      and t.tgname = 'transactions_integrity_guard' and t.tgenabled <> 'D' and not t.tgisinternal
  ) then
    raise exception 'Demo order migration preflight failed: enabled transaction integrity trigger is required.';
  end if;
  select t.tgfoid, pg_get_triggerdef(t.oid, true)
    into trigger_oid, trigger_definition
  from pg_trigger t
  where t.tgrelid = 'public.transactions'::regclass
    and t.tgname = 'transactions_integrity_guard' and t.tgenabled <> 'D' and not t.tgisinternal;
  if trigger_oid is distinct from to_regprocedure('public.guard_transaction_integrity()')
    or upper(trigger_definition) not like '%BEFORE INSERT%' then
    raise exception 'Demo order migration preflight failed: transaction integrity trigger definition is incompatible.';
  end if;
  if exists (
    select 1 from public.customers
    group by regexp_replace(phone, '[^0-9]', '', 'g') having count(*) > 1
  ) or exists (
    select 1 from public.vehicles
    group by regexp_replace(upper(plate), '[^A-Z0-9]', '', 'g') having count(*) > 1
  ) then
    raise exception 'Demo order migration preflight failed: normalized customer phone or vehicle plate duplicates need review.';
  end if;
  if to_regclass('private.demo_transaction_registry') is not null and (
    not exists (
      select 1 from information_schema.columns
      where table_schema = 'private' and table_name = 'demo_transaction_registry'
        and column_name = 'transaction_id' and data_type = 'text'
    ) or not exists (
      select 1 from information_schema.columns
      where table_schema = 'private' and table_name = 'demo_transaction_registry'
        and column_name = 'created_at' and data_type = 'timestamp with time zone'
    )
  ) then
    raise exception 'Demo order migration preflight failed: existing registry shape is incompatible.';
  end if;
end;
$$;

create schema if not exists private;
create table if not exists private.demo_transaction_registry (
  transaction_id text primary key references public.transactions(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table private.demo_transaction_registry
  add column if not exists request_id uuid,
  add column if not exists request_fingerprint text;
create unique index if not exists demo_transaction_registry_request_id_uidx
  on private.demo_transaction_registry(request_id) where request_id is not null;
revoke all on table private.demo_transaction_registry from public, anon, authenticated;

create or replace function public.create_demo_service_order(p_order jsonb)
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

revoke all on function public.create_demo_service_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_demo_service_order(jsonb) to anon;
revoke all on function public.record_service_transaction(jsonb, text) from public, anon;
grant execute on function public.record_service_transaction(jsonb, text) to authenticated, service_role;

commit;
