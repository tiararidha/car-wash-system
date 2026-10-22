begin;

do $$
begin
  if to_regclass('private.demo_transaction_registry') is null
    or to_regprocedure('public.create_demo_service_order_pending(jsonb)') is null
    or to_regprocedure('private.simulate_demo_payment(text,uuid)') is null then
    raise exception 'Demo cleanup migration preflight failed: demo order registry and RPC functions are required.';
  end if;
end;
$$;

create temporary table demo_cleanup_rows on commit drop as
select transaction_row.id, transaction_row.customer_id, transaction_row.vehicle_id
from public.transactions transaction_row
left join private.demo_transaction_registry registry
  on registry.transaction_id = transaction_row.id
where registry.transaction_id is not null
  or transaction_row.id ilike '%demo%'
  or transaction_row.code ilike '%demo%'
  or transaction_row.item_name ilike '%demo%'
  or exists (
    select 1 from public.customers customer_row
    where customer_row.id = transaction_row.customer_id
      and (customer_row.id ilike '%demo%'
        or customer_row.full_name ilike '%demo%'
        or customer_row.phone ilike '%demo%'
        or customer_row.address ilike '%demo%')
  )
  or exists (
    select 1 from public.vehicles vehicle_row
    where vehicle_row.id = transaction_row.vehicle_id
      and (vehicle_row.id ilike '%demo%'
        or vehicle_row.plate ilike '%demo%'
        or vehicle_row.model ilike '%demo%')
  );

delete from public.transactions transaction_row
using demo_cleanup_rows cleanup_row
where transaction_row.id = cleanup_row.id;

delete from public.vehicles vehicle_row
where (
  vehicle_row.id ilike '%demo%'
  or vehicle_row.plate ilike '%demo%'
  or vehicle_row.model ilike '%demo%'
  or exists (
    select 1 from demo_cleanup_rows cleanup_row
    where cleanup_row.vehicle_id = vehicle_row.id
  )
  or exists (
    select 1 from public.customers customer_row
    where customer_row.id = vehicle_row.customer_id
      and (customer_row.id ilike '%demo%'
        or customer_row.full_name ilike '%demo%'
        or customer_row.phone ilike '%demo%'
        or customer_row.address ilike '%demo%')
  )
)
and not exists (
  select 1 from public.transactions transaction_row
  where transaction_row.vehicle_id = vehicle_row.id
);

delete from public.customers customer_row
where (
  customer_row.id ilike '%demo%'
  or customer_row.full_name ilike '%demo%'
  or customer_row.phone ilike '%demo%'
  or customer_row.address ilike '%demo%'
  or exists (
    select 1 from demo_cleanup_rows cleanup_row
    where cleanup_row.customer_id = customer_row.id
  )
)
and not exists (
  select 1 from public.transactions transaction_row
  where transaction_row.customer_id = customer_row.id
);

insert into public.customers (id, full_name, phone, address) values
  ('seed-customer-budi', 'Budi Santoso', '081298765432', ''),
  ('seed-customer-rina', 'Rina Wijaya', '081233445566', ''),
  ('seed-customer-hendra', 'Hendra Gunawan', '081277889900', '')
on conflict (phone) do update
set full_name = excluded.full_name;

do $$
begin
  if not exists (
    select 1 from public.customers
    where full_name = 'Budi Santoso' and phone = '081298765432'
  ) or not exists (
    select 1 from public.customers
    where full_name = 'Rina Wijaya' and phone = '081233445566'
  ) or not exists (
    select 1 from public.customers
    where full_name = 'Hendra Gunawan' and phone = '081277889900'
  ) then
    raise exception 'Demo seed preflight failed: a seed customer ID or phone conflicts with existing data.';
  end if;
end;
$$;

insert into public.vehicles (id, customer_id, type, plate, model)
select seed.vehicle_id, customer_row.id, seed.type, seed.plate, seed.model
from (values
  ('seed-vehicle-budi', '081298765432', 'CAR', 'H 8821 AB', 'Honda Brio'),
  ('seed-vehicle-rina', '081233445566', 'CAR', 'B 1234 XYZ', 'Toyota Avanza'),
  ('seed-vehicle-hendra', '081277889900', 'CAR', 'D 4582 HG', 'Honda HR-V')
) as seed(vehicle_id, phone, type, plate, model)
join public.customers customer_row on customer_row.phone = seed.phone
on conflict (id) do nothing;

do $$
begin
  if not exists (
    select 1 from public.vehicles
    where id = 'seed-vehicle-budi'
      and plate = 'H 8821 AB'
      and customer_id = (select id from public.customers where phone = '081298765432')
  ) or not exists (
    select 1 from public.vehicles
    where id = 'seed-vehicle-rina'
      and plate = 'B 1234 XYZ'
      and customer_id = (select id from public.customers where phone = '081233445566')
  ) or not exists (
    select 1 from public.vehicles
    where id = 'seed-vehicle-hendra'
      and plate = 'D 4582 HG'
      and customer_id = (select id from public.customers where phone = '081277889900')
  ) then
    raise exception 'Demo seed preflight failed: a seed vehicle ID or plate conflicts with existing data.';
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from public.services_products
    where id = 'svc-car' and item_type = 'SERVICE' and category = 'REGULAR'
      and type = 'CAR' and active
  ) or not exists (
    select 1 from public.services_products
    where id = 'svc-self-car' and item_type = 'SERVICE' and category = 'SELF_SERVICE'
      and type = 'CAR' and active
  ) then
    raise exception 'Demo transaction seed preflight failed: required car wash services are unavailable.';
  end if;
end;
$$;

insert into public.transactions (
  id, code, customer_id, vehicle_id, item_id, item_type, item_name, quantity, amount,
  payment_method, payment_status, refund_status, transaction_type, transaction_status,
  queue_status, booking_date, booking_time, duration_minutes, bay_number
)
select seed.id, seed.code, customer_row.id, vehicle_row.id, service.id, 'SERVICE', service.name, 1,
  service.price, seed.payment_method, seed.payment_status, 'NONE', seed.transaction_type,
  seed.transaction_status, seed.queue_status, seed.booking_date, seed.booking_time,
  service.duration, bay.bay_number
from (values
  ('seed-tx-budi-wash', 'RS-SEED-SAMPLE-BUDI-01', '081298765432', 'H 8821 AB', 'svc-car',
    'CASH', 'PAID', 'WALK_IN', 'COMPLETED', 'COMPLETED', (now() at time zone 'Asia/Jakarta')::date - 1, time '09:00'),
  ('seed-tx-rina-self-service', 'RS-SEED-SAMPLE-RINA-01', '081233445566', 'B 1234 XYZ', 'svc-self-car',
    'QRIS', 'PAID', 'BOOKING', 'BOOKED', 'WAITING', (now() at time zone 'Asia/Jakarta')::date, time '13:00'),
  ('seed-tx-hendra-wash', 'RS-SEED-SAMPLE-HENDRA-01', '081277889900', 'D 4582 HG', 'svc-car',
    'CASH', 'PENDING', 'WALK_IN', 'PENDING', 'WAITING', (now() at time zone 'Asia/Jakarta')::date - 1, time '11:00')
) as seed(id, code, phone, plate, item_id, payment_method, payment_status,
  transaction_type, transaction_status, queue_status, booking_date, booking_time)
join public.customers customer_row on customer_row.phone = seed.phone
join public.vehicles vehicle_row on vehicle_row.plate = seed.plate
  and vehicle_row.customer_id = customer_row.id
join public.services_products service on service.id = seed.item_id
  and service.item_type = 'SERVICE' and service.active
left join lateral (
  select bay_candidate.bay_number
  from generate_series(1, 4) as bay_candidate(bay_number)
  where seed.item_id = 'svc-self-car'
    and not exists (
      select 1 from public.transactions existing
      join public.services_products existing_service on existing_service.id = existing.item_id
      where existing.bay_number = bay_candidate.bay_number
        and existing_service.category = 'SELF_SERVICE'
        and existing.payment_status in ('PENDING', 'PAID')
        and existing.transaction_status in ('PENDING', 'BOOKED', 'ACTIVE')
        and (seed.booking_date + seed.booking_time) < (existing.booking_date + existing.booking_time)
          + make_interval(mins => existing.duration_minutes)
        and (existing.booking_date + existing.booking_time) < (seed.booking_date + seed.booking_time)
          + make_interval(mins => service.duration)
    )
  order by bay_candidate.bay_number
  limit 1
) bay on true
on conflict do nothing;

do $$
begin
  if not exists (
    select 1 from public.transactions
    where id = 'seed-tx-budi-wash' and payment_status = 'PAID'
      and transaction_status = 'COMPLETED' and payment_method = 'CASH'
  ) or not exists (
    select 1 from public.transactions
    where id = 'seed-tx-rina-self-service' and payment_status = 'PAID'
      and transaction_status = 'BOOKED' and payment_method = 'QRIS'
      and bay_number between 1 and 4
  ) or not exists (
    select 1 from public.transactions
    where id = 'seed-tx-hendra-wash' and payment_status = 'PENDING'
      and transaction_status = 'PENDING' and payment_method = 'CASH'
  ) then
    raise exception 'Demo transaction seed failed: expected sample transactions were not created.';
  end if;
end;
$$;

insert into private.demo_transaction_registry (transaction_id)
select transaction_row.id
from public.transactions transaction_row
where transaction_row.id in (
  'seed-tx-budi-wash', 'seed-tx-rina-self-service', 'seed-tx-hendra-wash'
)
on conflict (transaction_id) do nothing;

create or replace function private.demo_realistic_name(p_key text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select (array[
    'Budi Santoso', 'Rina Wijaya', 'Agus Pratama', 'Siti Rahmawati',
    'Dimas Saputra', 'Nadia Putri', 'Andi Setiawan', 'Maya Lestari'
  ]::text[])[
    (mod(hashtextextended(coalesce(p_key, ''), 82027) & 9223372036854775807, 8) + 1)::integer
  ];
$$;

create or replace function private.demo_realistic_plate(p_key text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  with suffix_seed as (
    select mod(
      hashtextextended(coalesce(p_key, '') || ':suffix', 82033) & 9223372036854775807,
      17576
    )::integer as suffix_value
  )
  select
    (array['H', 'B', 'D', 'F', 'AB', 'AD', 'L']::text[])[
      (mod(hashtextextended(coalesce(p_key, '') || ':region', 82029) & 9223372036854775807, 7) + 1)::integer
    ]
    || ' ' || lpad((1000 + mod(hashtextextended(coalesce(p_key, '') || ':number', 82031) & 9223372036854775807, 9000))::text, 4, '0')
    || ' ' || chr(65 + suffix_seed.suffix_value / 676)
    || chr(65 + (suffix_seed.suffix_value % 676) / 26)
    || chr(65 + suffix_seed.suffix_value % 26)
  from suffix_seed;
$$;

create or replace function private.demo_realistic_model(p_key text, p_type text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case when p_type = 'MOTOR' then
    (array['Honda Vario', 'Yamaha NMAX', 'Honda Beat', 'Yamaha Aerox']::text[])[
      (mod(hashtextextended(coalesce(p_key, ''), 82037) & 9223372036854775807, 4) + 1)::integer
    ]
  else
    (array['Honda Brio', 'Toyota Avanza', 'Honda HR-V', 'Mitsubishi Xpander']::text[])[
      (mod(hashtextextended(coalesce(p_key, ''), 82039) & 9223372036854775807, 4) + 1)::integer
    ]
  end;
$$;

revoke all on function private.demo_realistic_name(text) from public, anon, authenticated;
revoke all on function private.demo_realistic_plate(text) from public, anon, authenticated;
revoke all on function private.demo_realistic_model(text,text) from public, anon, authenticated;

create or replace function public.create_demo_service_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare
  saved_transaction jsonb;
  request_id_value uuid;
  normalized_phone text;
  customer_name_value text;
  existing_customer_name text;
  existing_order_plate text;
  vehicle_plate_value text;
  candidate_number integer;
  plate_available boolean := false;
begin
  if coalesce(auth.role(), '') <> 'anon' then
    raise exception 'Demo order endpoint accepts anonymous demo requests only.';
  end if;
  if p_order is null or jsonb_typeof(p_order) <> 'object'
    or coalesce(p_order ->> 'request_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Kunci permintaan order tidak valid.';
  end if;
  request_id_value := (p_order ->> 'request_id')::uuid;

  customer_name_value := nullif(trim(coalesce(p_order ->> 'customer_name', '')), '');
  if customer_name_value is null then
    customer_name_value := private.demo_realistic_name(request_id_value::text);
  end if;
  p_order := jsonb_set(p_order, '{customer_name}', to_jsonb(customer_name_value), true);

  vehicle_plate_value := upper(trim(coalesce(p_order ->> 'vehicle_plate', '')));
  if vehicle_plate_value = '' then
    select vehicle_row.plate into existing_order_plate
    from private.demo_transaction_registry registry
    join public.transactions transaction_row on transaction_row.id = registry.transaction_id
    join public.vehicles vehicle_row on vehicle_row.id = transaction_row.vehicle_id
    where registry.request_id = request_id_value;
    if found then
      vehicle_plate_value := existing_order_plate;
      plate_available := true;
    else
      for candidate_number in 0..99 loop
        vehicle_plate_value := private.demo_realistic_plate(request_id_value::text || ':' || candidate_number::text);
        if not exists (
          select 1 from public.vehicles vehicle_row
          where regexp_replace(upper(vehicle_row.plate), '[^A-Z0-9]', '', 'g')
            = regexp_replace(vehicle_plate_value, '[^A-Z0-9]', '', 'g')
        ) then
          plate_available := true;
          exit;
        end if;
      end loop;
    end if;
    if not plate_available then
      raise exception 'Nomor polisi otomatis tidak tersedia. Silakan kirim ulang order.';
    end if;
  end if;
  p_order := jsonb_set(p_order, '{vehicle_plate}', to_jsonb(vehicle_plate_value), true);

  normalized_phone := regexp_replace(coalesce(p_order ->> 'customer_phone', ''), '[^0-9]', '', 'g');
  if normalized_phone like '0%' and length(normalized_phone) between 10 and 14 then
    normalized_phone := '62' || substr(normalized_phone, 2);
  end if;
  select full_name into existing_customer_name
  from public.customers
  where regexp_replace(phone, '[^0-9]', '', 'g') in (
    normalized_phone,
    '0' || substr(normalized_phone, 3)
  )
  order by created_at
  limit 1
  for update;
  if found then
    p_order := jsonb_set(p_order, '{customer_name}', to_jsonb(existing_customer_name), true);
  end if;

  saved_transaction := public.create_demo_service_order_pending(p_order);
  return private.simulate_demo_payment(saved_transaction ->> 'id', request_id_value);
end;
$$;

revoke all on function public.create_demo_service_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_demo_service_order(jsonb) to anon;

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
        'full_name', private.demo_realistic_name(customer_row.id),
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
        'plate', private.demo_realistic_plate(vehicle_row.id),
        'model', private.demo_realistic_model(vehicle_row.id, vehicle_row.type),
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

revoke all on function public.get_demo_admin_snapshot() from public, anon, authenticated;
grant execute on function public.get_demo_admin_snapshot() to anon;

notify pgrst, 'reload schema';
commit;