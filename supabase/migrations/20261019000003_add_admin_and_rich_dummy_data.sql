begin;

create schema if not exists private;
create table if not exists private.demo_transaction_registry (
  transaction_id text primary key references public.transactions(id) on delete cascade,
  created_at timestamptz not null default now(),
  request_id uuid,
  request_fingerprint text
);
create unique index if not exists demo_transaction_registry_request_id_uidx
  on private.demo_transaction_registry(request_id) where request_id is not null;
revoke all on table private.demo_transaction_registry from public, anon, authenticated;

do $$
begin
  if not exists (
    select 1 from auth.users
    where lower(email) = 'admin@rinse.id'
      and coalesce(raw_app_meta_data ->> 'rinse_role', '') = 'admin'
  ) then
    raise notice 'Admin account is not provisioned yet. Create admin@rinse.id through Supabase Auth Admin API/Dashboard and set trusted app_metadata.rinse_role=admin.';
  end if;
end;
$$;

create temporary table dimas_customer_ids on commit drop as
select id
from public.customers
where lower(trim(full_name)) = 'dimas saputra';

create temporary table dimas_vehicle_ids on commit drop as
select id
from public.vehicles
where customer_id in (select id from dimas_customer_ids);

delete from public.transactions transaction_row
where transaction_row.customer_id in (select id from dimas_customer_ids)
   or transaction_row.vehicle_id in (select id from dimas_vehicle_ids);

delete from public.vehicles vehicle_row
where vehicle_row.id in (select id from dimas_vehicle_ids)
  and not exists (
    select 1 from public.transactions transaction_row
    where transaction_row.vehicle_id = vehicle_row.id
  );

delete from public.customers customer_row
where customer_row.id in (select id from dimas_customer_ids)
  and not exists (
    select 1 from public.transactions transaction_row
    where transaction_row.customer_id = customer_row.id
  )
  and not exists (
    select 1 from public.vehicles vehicle_row
    where vehicle_row.customer_id = customer_row.id
  );

delete from public.transactions transaction_row
where transaction_row.id in ('seed-tx-budi-wash', 'seed-tx-rina-self-service', 'seed-tx-hendra-wash')
   or transaction_row.vehicle_id in (
     select id from public.vehicles
     where id in ('seed-vehicle-budi', 'seed-vehicle-rina', 'seed-vehicle-hendra')
       and exists (
         select 1 from private.demo_transaction_registry registry
         where registry.transaction_id = transaction_row.id
       )
   );

delete from public.vehicles vehicle_row
where vehicle_row.id in ('seed-vehicle-budi', 'seed-vehicle-rina', 'seed-vehicle-hendra')
  and not exists (
    select 1 from public.transactions transaction_row
    where transaction_row.vehicle_id = vehicle_row.id
  );

delete from public.customers customer_row
where customer_row.id in ('seed-customer-rina', 'seed-customer-hendra')
  and not exists (
    select 1 from public.transactions transaction_row
    where transaction_row.customer_id = customer_row.id
  )
  and not exists (
    select 1 from public.vehicles vehicle_row
    where vehicle_row.customer_id = customer_row.id
  );

delete from public.transactions
where id like 'rich-tx-%';

delete from public.vehicles vehicle_row
where vehicle_row.id like 'rich-vehicle-%'
  and not exists (
    select 1 from public.transactions transaction_row
    where transaction_row.vehicle_id = vehicle_row.id
  );

delete from public.customers customer_row
where customer_row.id like 'rich-customer-%'
  and not exists (
    select 1 from public.transactions transaction_row
    where transaction_row.customer_id = customer_row.id
  )
  and not exists (
    select 1 from public.vehicles vehicle_row
    where vehicle_row.customer_id = customer_row.id
  );

create temporary table rich_dummy_people on commit drop as
select * from (values
  (1, 'rich-customer-bambang', 'Bambang Pamungkas', '081229384756', 'rich-vehicle-bambang', 'CAR', 'H 8821 AB', 'Toyota Fortuner'),
  (2, 'rich-customer-rina', 'Rina Wijaya', '085740123890', 'rich-vehicle-rina', 'MOTOR', 'H 4512 BZ', 'Yamaha NMAX'),
  (3, 'rich-customer-hendra', 'Hendra Gunawan', '081390112233', 'rich-vehicle-hendra', 'CAR', 'H 1928 CD', 'Honda HR-V'),
  (4, 'rich-customer-siti', 'Siti Nurhaliza', '082134567890', 'rich-vehicle-siti', 'MOTOR', 'H 6734 A', 'Honda Vario 160'),
  (5, 'rich-customer-eko', 'Eko Prasetyo', '081288776655', 'rich-vehicle-eko', 'CAR', 'H 9012 EF', 'Mitsubishi Pajero Sport'),
  (6, 'rich-customer-dewi', 'Dewi Lestari', '085699887711', 'rich-vehicle-dewi', 'MOTOR', 'H 2341 XY', 'Honda PCX 160'),
  (7, 'rich-customer-rizky', 'Rizky Febrian', '081322114455', 'rich-vehicle-rizky', 'CAR', 'H 5678 GH', 'Honda Brio'),
  (8, 'rich-customer-anisa', 'Anisa Rahma', '082210987654', 'rich-vehicle-anisa', 'MOTOR', 'H 3102 Z', 'Vespa Sprint'),
  (9, 'rich-customer-fajar', 'Fajar Nugraha', '081277665544', 'rich-vehicle-fajar', 'CAR', 'H 7788 IJ', 'Toyota Innova Zenix'),
  (10, 'rich-customer-maya', 'Maya Indah', '085811223344', 'rich-vehicle-maya', 'MOTOR', 'H 8910 C', 'Yamaha Aerox'),
  (11, 'rich-customer-doni', 'Doni Tata', '081355443322', 'rich-vehicle-doni', 'CAR', 'K 4321 KL', 'Honda CR-V'),
  (12, 'rich-customer-agus', 'Agus Setiawan', '082188990011', 'rich-vehicle-agus', 'MOTOR', 'AA 5566 MN', 'Honda Beat'),
  (13, 'rich-customer-siska', 'Siska Amelia', '085712349081', 'rich-vehicle-siska', 'MOTOR', 'H 7123 KP', 'Yamaha Fazzio'),
  (14, 'rich-customer-budi', 'Budi Santoso', '081298765432', 'rich-vehicle-budi', 'CAR', 'B 1234 XYZ', 'Toyota Avanza')
) as people(ordinal, customer_id, full_name, phone, vehicle_id, vehicle_type, plate, model);

insert into public.customers (id, full_name, phone, address)
select customer_id, full_name, phone, ''
from rich_dummy_people
on conflict (phone) do update
set full_name = excluded.full_name;

insert into public.vehicles (id, customer_id, type, plate, model)
select people.vehicle_id, customer_row.id, people.vehicle_type, people.plate, people.model
from rich_dummy_people people
join public.customers customer_row on customer_row.phone = people.phone
on conflict (id) do nothing;

do $$
begin
  if (select count(*) from rich_dummy_people) <> 14
    or exists (
      select 1 from rich_dummy_people people
      left join public.customers customer_row on customer_row.phone = people.phone
        and customer_row.full_name = people.full_name
      left join public.vehicles vehicle_row on vehicle_row.id = people.vehicle_id
        and vehicle_row.customer_id = customer_row.id
        and vehicle_row.plate = people.plate
        and vehicle_row.type = people.vehicle_type
        and vehicle_row.model = people.model
      where customer_row.id is null or vehicle_row.id is null
    ) then
    raise exception 'Rich dummy seed failed: a requested customer or vehicle conflicts with existing data.';
  end if;
  if exists (
    select 1 from public.customers customer_row
    where lower(trim(customer_row.full_name)) = 'dimas saputra'
  ) then
    raise exception 'Dimas cleanup failed: a matching customer still exists.';
  end if;
end;
$$;

do $$
begin
  if not exists (select 1 from public.services_products where id = 'svc-car' and active and item_type = 'SERVICE' and type = 'CAR')
    or not exists (select 1 from public.services_products where id = 'svc-moto' and active and item_type = 'SERVICE' and type = 'MOTOR')
    or not exists (select 1 from public.services_products where id = 'svc-self-car' and active and item_type = 'SERVICE' and type = 'CAR')
    or not exists (select 1 from public.services_products where id = 'svc-self-moto' and active and item_type = 'SERVICE' and type = 'MOTOR') then
    raise exception 'Rich transaction seed failed: all four car/motor service catalog items must be active.';
  end if;
end;
$$;

create temporary table rich_dummy_transactions on commit drop as
with local_day as (
  select least((now() at time zone 'Asia/Jakarta')::date, date '2026-10-19') as today
), numbered as (
  select sequence.n,
    ((sequence.n - 1) % 14) + 1 as person_ordinal,
    (sequence.n - 1) % 4 as status_group,
    floor((sequence.n - 1) * 90.0 / 27)::integer as age_days
  from generate_series(1, 28) as sequence(n)
), selected as (
  select numbered.*, people.phone as customer_phone, people.vehicle_type, people.plate as vehicle_plate,
    case
      when numbered.status_group = 1 and people.vehicle_type = 'CAR' then 'svc-self-car'
      when numbered.status_group = 1 then 'svc-self-moto'
      when people.vehicle_type = 'CAR' then 'svc-car'
      else 'svc-moto'
    end as item_id,
    case numbered.status_group
      when 0 then 'CASH'
      when 1 then 'QRIS'
      when 2 then 'E_WALLET'
      else 'CARD'
    end as payment_method,
    case numbered.status_group
      when 0 then 'WALK_IN'
      when 1 then 'BOOKING'
      else 'WALK_IN'
    end as transaction_type,
    case numbered.status_group
      when 0 then local_day.today - greatest(numbered.age_days, 1)
      when 1 then local_day.today
      when 2 then local_day.today
      else local_day.today - 1
    end as booking_date,
    case numbered.status_group
      when 0 then time '09:00'
      when 1 then time '13:00'
      when 2 then time '11:00'
      else time '15:00'
    end as booking_time,
    ((local_day.today - numbered.age_days) + time '10:00') at time zone 'Asia/Jakarta' as created_at
  from numbered
  join rich_dummy_people people on people.ordinal = numbered.person_ordinal
  cross join local_day
)
select selected.n,
  'rich-tx-' || lpad(selected.n::text, 2, '0') as transaction_id,
  'RS-RICH-' || to_char(selected.booking_date, 'YYMMDD') || '-' || lpad(selected.n::text, 3, '0') as transaction_code,
  selected.customer_phone, selected.vehicle_type, selected.vehicle_plate,
  service.id as item_id, service.name as item_name,
  service.price as amount, service.duration as duration_minutes,
  selected.payment_method,
  case selected.status_group when 3 then 'PENDING' else 'PAID' end as payment_status,
  case selected.status_group when 0 then 'COMPLETED' when 1 then 'BOOKED' else 'PENDING' end as transaction_status,
  case selected.status_group when 0 then 'COMPLETED' else 'WAITING' end as queue_status,
  selected.status_group, selected.transaction_type, selected.booking_date,
  selected.booking_time,
  case when selected.transaction_type = 'BOOKING' then bay.bay_number else null end as bay_number,
  selected.created_at
from (
  select selected.* from selected
) selected
join public.services_products service on service.id = selected.item_id
left join lateral (
  select candidate.bay_number
  from generate_series(1, 4) as candidate(bay_number)
  where selected.transaction_type = 'BOOKING'
    and not exists (
      select 1 from public.transactions existing
      join public.services_products existing_service on existing_service.id = existing.item_id
      where existing.bay_number = candidate.bay_number
        and existing_service.category = 'SELF_SERVICE'
        and existing.payment_status in ('PENDING', 'PAID')
        and existing.transaction_status in ('PENDING', 'BOOKED', 'ACTIVE')
        and (selected.booking_date + selected.booking_time) < (existing.booking_date + existing.booking_time)
          + make_interval(mins => existing.duration_minutes)
        and (existing.booking_date + existing.booking_time) < (selected.booking_date + selected.booking_time)
          + make_interval(mins => service.duration)
    )
  order by candidate.bay_number
  limit 1
) bay on true;

insert into public.transactions (
  id, code, customer_id, vehicle_id, item_id, item_type, item_name, quantity, amount,
  payment_method, payment_status, refund_status, transaction_type, transaction_status,
  queue_status, booking_date, booking_time, duration_minutes, bay_number, created_at
)
select seed.transaction_id, seed.transaction_code, customer_row.id, vehicle_row.id,
  seed.item_id, 'SERVICE', seed.item_name,
  1, seed.amount, seed.payment_method, seed.payment_status, 'NONE', seed.transaction_type,
  seed.transaction_status, seed.queue_status, seed.booking_date, seed.booking_time,
  seed.duration_minutes, seed.bay_number, seed.created_at
from rich_dummy_transactions seed
join public.customers customer_row on customer_row.phone = seed.customer_phone
join public.vehicles vehicle_row on vehicle_row.customer_id = customer_row.id
  and vehicle_row.type = seed.vehicle_type
  and vehicle_row.plate = seed.vehicle_plate
join public.services_products service on service.id = seed.item_id
on conflict do nothing;

insert into private.demo_transaction_registry (transaction_id)
select transaction_row.id
from public.transactions transaction_row
join rich_dummy_transactions seed on seed.transaction_id = transaction_row.id
on conflict (transaction_id) do nothing;

do $$
begin
  if (select count(*) from public.transactions where id like 'rich-tx-%') <> 28
    or (select count(*) from private.demo_transaction_registry registry
        join public.transactions transaction_row on transaction_row.id = registry.transaction_id
        where transaction_row.id like 'rich-tx-%') <> 28
    or (select count(*) from public.transactions where id like 'rich-tx-%' and payment_method = 'CASH') <> 7
    or (select count(*) from public.transactions where id like 'rich-tx-%' and payment_method = 'QRIS') <> 7
    or (select count(*) from public.transactions where id like 'rich-tx-%' and payment_method = 'E_WALLET') <> 7
    or (select count(*) from public.transactions where id like 'rich-tx-%' and payment_method = 'CARD') <> 7
    or (select count(*) from public.transactions where id like 'rich-tx-%' and transaction_status = 'COMPLETED') <> 7
    or (select count(*) from public.transactions where id like 'rich-tx-%' and transaction_status = 'BOOKED') <> 7
    or (select count(*) from public.transactions where id like 'rich-tx-%' and payment_status = 'PENDING') <> 7 then
    raise exception 'Rich transaction seed failed: transaction count, registry, payment mix, or status mix is incomplete.';
  end if;
end;
$$;

create or replace function private.demo_realistic_name(p_key text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select (array[
    'Bambang Pamungkas', 'Rina Wijaya', 'Hendra Gunawan', 'Siti Nurhaliza',
    'Eko Prasetyo', 'Dewi Lestari', 'Rizky Febrian', 'Anisa Rahma',
    'Fajar Nugraha', 'Maya Indah', 'Doni Tata', 'Agus Setiawan', 'Siska Amelia'
  ]::text[])[
    (mod(hashtextextended(coalesce(p_key, ''), 82027) & 9223372036854775807, 13) + 1)::integer
  ];
$$;

notify pgrst, 'reload schema';
commit;