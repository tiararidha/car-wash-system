create extension if not exists pgcrypto;

create table if not exists public.customers (
  id text primary key,
  full_name text not null check (length(trim(full_name)) > 1),
  phone text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.vehicles (
  id text primary key,
  customer_id text not null references public.customers(id) on delete cascade,
  type text not null check (type in ('CAR', 'MOTOR')),
  plate text not null unique,
  model text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.services_products (
  id text primary key,
  item_type text not null check (item_type in ('SERVICE', 'PRODUCT', 'ADD_ON')),
  name text not null,
  category text not null default '',
  type text check (type is null or type in ('CAR', 'MOTOR')),
  description text not null default '',
  price integer not null check (price >= 0),
  duration integer not null default 0 check (duration >= 0),
  stock integer not null default 0 check (stock >= 0),
  min_stock integer not null default 0 check (min_stock >= 0),
  active boolean not null default true,
  image text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id text primary key,
  code text not null unique,
  customer_id text not null references public.customers(id) on delete restrict,
  vehicle_id text references public.vehicles(id) on delete set null,
  item_id text not null references public.services_products(id) on delete restrict,
  item_type text not null check (item_type in ('SERVICE', 'PRODUCT')),
  item_name text not null,
  quantity integer not null default 1 check (quantity > 0),
  amount integer not null check (amount >= 0),
  payment_method text not null check (payment_method in ('CASH', 'QRIS', 'E_WALLET', 'CARD')),
  payment_status text not null default 'PENDING' check (payment_status in ('PENDING', 'PAID', 'FAILED', 'REFUNDED')),
  transaction_type text not null check (transaction_type in ('BOOKING', 'WALK_IN', 'SHOP')),
  transaction_status text not null default 'ACTIVE' check (transaction_status in ('PENDING', 'BOOKED', 'ACTIVE', 'COMPLETED', 'CANCELLED')),
  queue_status text not null default 'WAITING' check (queue_status in ('WAITING', 'WASHING', 'FINISHING', 'COMPLETED')),
  booking_date date not null default current_date,
  booking_time time not null default localtime,
  duration_minutes integer not null default 0 check (duration_minutes >= 0),
  bay_number integer check (bay_number between 1 and 4),
  created_at timestamptz not null default now()
);

create index if not exists vehicles_customer_idx on public.vehicles(customer_id);
create index if not exists transactions_customer_idx on public.transactions(customer_id);
create index if not exists transactions_vehicle_idx on public.transactions(vehicle_id);
create index if not exists transactions_item_idx on public.transactions(item_id);
create index if not exists transactions_date_idx on public.transactions(booking_date desc);
create index if not exists transactions_queue_idx on public.transactions(queue_status, transaction_status);
create index if not exists services_products_type_active_idx on public.services_products(item_type, active);

alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.services_products enable row level security;
alter table public.transactions enable row level security;

grant usage on schema public to anon;
grant usage on schema public to authenticated;
revoke all on public.customers, public.vehicles, public.services_products, public.transactions from anon;
grant select on public.services_products to anon;
grant insert on public.customers, public.vehicles to anon;
grant select, insert, update, delete on public.customers, public.vehicles, public.services_products, public.transactions to authenticated;

drop policy if exists "Public demo access: customers" on public.customers;
drop policy if exists "Public demo access: vehicles" on public.vehicles;
drop policy if exists "Public demo access: catalog" on public.services_products;
drop policy if exists "Public demo access: transactions" on public.transactions;
drop policy if exists "Customer registration" on public.customers;
drop policy if exists "Vehicle registration" on public.vehicles;
drop policy if exists "Public catalog read" on public.services_products;
drop policy if exists "Admin customers" on public.customers;
drop policy if exists "Admin vehicles" on public.vehicles;
drop policy if exists "Admin catalog" on public.services_products;
drop policy if exists "Admin transactions" on public.transactions;

create policy "Customer registration" on public.customers for insert to anon with check (length(trim(full_name)) > 1);
create policy "Vehicle registration" on public.vehicles for insert to anon with check (type in ('CAR', 'MOTOR'));
create policy "Public catalog read" on public.services_products for select to anon using (active = true);
create policy "Admin customers" on public.customers for all to authenticated
  using (true)
  with check (true);
create policy "Admin vehicles" on public.vehicles for all to authenticated
  using (true)
  with check (true);
create policy "Admin catalog" on public.services_products for all to authenticated
  using (true)
  with check (true);
create policy "Admin transactions" on public.transactions for all to authenticated
  using (true)
  with check (true);

create or replace function public.lookup_customer_by_phone(p_phone text)
returns table(customer_id text, full_name text, phone text, vehicle_id text, vehicle_type text, vehicle_plate text, vehicle_model text)
language sql stable security definer set search_path = public
as $$
  select c.id, c.full_name, c.phone, v.id, v.type, v.plate, v.model
  from public.customers c
  left join public.vehicles v on v.customer_id = c.id
  where regexp_replace(c.phone, '[^0-9]', '', 'g') = regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')
    and length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) >= 7;
$$;

create or replace function public.lookup_transaction_history(p_search text)
returns table(transaction_id text, code text, item_name text, item_type text, amount integer, payment_method text, payment_status text, transaction_type text, transaction_status text, booking_date date, booking_time time, duration_minutes integer, customer_name text, vehicle_type text, vehicle_plate text, vehicle_model text)
language sql stable security definer set search_path = public
as $$
  select t.id, t.code, t.item_name, t.item_type, t.amount, t.payment_method, t.payment_status,
         t.transaction_type, t.transaction_status, t.booking_date, t.booking_time, t.duration_minutes,
         c.full_name, v.type, v.plate, v.model
  from public.transactions t
  join public.customers c on c.id = t.customer_id
  left join public.vehicles v on v.id = t.vehicle_id
  where lower(t.code) = lower(trim(coalesce(p_search, '')))
     or (length(regexp_replace(coalesce(p_search, ''), '[^0-9]', '', 'g')) >= 7
         and regexp_replace(c.phone, '[^0-9]', '', 'g') = regexp_replace(p_search, '[^0-9]', '', 'g'))
    or lower(regexp_replace(coalesce(v.plate, ''), '[[:space:]]', '', 'g')) = lower(regexp_replace(trim(coalesce(p_search, '')), '[[:space:]]', '', 'g'));
$$;

create or replace function public.get_public_today_wash_count()
returns integer language sql stable security definer set search_path = public
as $$ select count(*)::integer from public.transactions where booking_date = current_date and item_type = 'SERVICE'; $$;

create or replace function public.get_public_bay_status()
returns table(bay_number integer, bay_status text, vehicle_type text, duration_minutes integer, minutes_remaining integer, booking_time time)
language sql stable security definer set search_path = public
as $$
  select bays.bay_number,
         case when active.transaction_status = 'ACTIVE' then 'OCCUPIED'
              when active.transaction_status = 'BOOKED' then 'RESERVED' else 'AVAILABLE' end,
         vehicle.type,
         coalesce(active.duration_minutes, 0),
         case when active.transaction_status = 'ACTIVE'
              then greatest(0, active.duration_minutes - floor(extract(epoch from (now() - active.created_at)) / 60)::integer)
              else 0 end,
         active.booking_time
  from generate_series(1, 4) as bays(bay_number)
  left join lateral (
    select t.* from public.transactions t
    where t.bay_number = bays.bay_number and t.transaction_status in ('ACTIVE', 'BOOKED')
    order by case when t.transaction_status = 'ACTIVE' then 0 else 1 end, t.created_at desc limit 1
  ) active on true
  left join public.vehicles vehicle on vehicle.id = active.vehicle_id
  order by bays.bay_number;
$$;

create or replace function public.record_product_sale(p_transaction jsonb)
returns integer language plpgsql security definer set search_path = public
as $$
declare
  product_stock integer;
  sale_quantity integer;
  new_stock integer;
  product_price integer;
  product_name text;
  expected_payment_status text;
begin
  sale_quantity := greatest(1, coalesce((p_transaction ->> 'quantity')::integer, 1));
  select stock, price, name into product_stock, product_price, product_name from public.services_products
  where id = p_transaction ->> 'item_id' and item_type = 'PRODUCT' and active = true for update;
  if not found then raise exception 'Produk tidak ditemukan atau tidak aktif.'; end if;
  if product_stock < sale_quantity then raise exception 'Stok produk tidak mencukupi.'; end if;
  expected_payment_status := case when p_transaction ->> 'payment_method' = 'CASH' then 'PAID' else 'PENDING' end;
  if p_transaction ->> 'payment_status' <> expected_payment_status then raise exception 'Status pembayaran tidak sesuai metode.'; end if;
  update public.services_products set stock = stock - sale_quantity, updated_at = now()
  where id = p_transaction ->> 'item_id' returning stock into new_stock;
  insert into public.transactions (id, code, customer_id, vehicle_id, item_id, item_type, item_name, quantity, amount,
    payment_method, payment_status, transaction_type, transaction_status, queue_status, booking_date, booking_time,
    duration_minutes, bay_number, created_at)
  values (p_transaction ->> 'id', p_transaction ->> 'code', p_transaction ->> 'customer_id', null,
    p_transaction ->> 'item_id', 'PRODUCT', product_name, sale_quantity,
    product_price * sale_quantity, p_transaction ->> 'payment_method', expected_payment_status,
    'SHOP', 'COMPLETED', 'COMPLETED', (p_transaction ->> 'booking_date')::date,
    (p_transaction ->> 'booking_time')::time, 0, null, coalesce((p_transaction ->> 'created_at')::timestamptz, now()));
  return new_stock;
end;
$$;

create or replace function public.record_service_transaction(p_transaction jsonb, p_addon_id text default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  wash_service public.services_products%rowtype;
  addon public.services_products%rowtype;
  saved_transaction public.transactions%rowtype;
  selected_vehicle public.vehicles%rowtype;
  transaction_kind text;
  service_duration integer;
  total_duration integer;
  base_price integer;
  final_amount integer;
  bay integer;
  payment_method_value text;
  payment_status_value text;
  transaction_status_value text;
begin
  select * into wash_service from public.services_products
  where id = p_transaction ->> 'item_id' and item_type = 'SERVICE' and active = true;
  if not found then raise exception 'Layanan tidak ditemukan atau tidak aktif.'; end if;

  select * into selected_vehicle from public.vehicles
  where id = p_transaction ->> 'vehicle_id' and customer_id = p_transaction ->> 'customer_id';
  if not found or selected_vehicle.type <> wash_service.type then raise exception 'Kendaraan tidak sesuai dengan layanan.'; end if;

  if p_addon_id is not null then
    select * into addon from public.services_products where id = p_addon_id and item_type = 'ADD_ON' and active = true;
    if not found then raise exception 'Add-on tidak ditemukan atau tidak aktif.'; end if;
  end if;

  total_duration := (p_transaction ->> 'duration_minutes')::integer;
  service_duration := total_duration - coalesce(addon.duration, 0);
  if service_duration < 1 then raise exception 'Durasi layanan tidak valid.'; end if;
  if wash_service.category = 'SELF_SERVICE' then
    base_price := round(wash_service.price::numeric * service_duration / greatest(wash_service.duration, 1));
  else
    base_price := wash_service.price;
  end if;
  final_amount := base_price + coalesce(addon.price, 0);

  transaction_kind := p_transaction ->> 'transaction_type';
  if transaction_kind not in ('BOOKING', 'WALK_IN') then raise exception 'Jenis transaksi layanan tidak valid.'; end if;
  payment_method_value := p_transaction ->> 'payment_method';
  payment_status_value := case when transaction_kind = 'WALK_IN' and payment_method_value = 'CASH' then 'PAID' else 'PENDING' end;
  transaction_status_value := case when transaction_kind = 'BOOKING' then 'BOOKED' else 'ACTIVE' end;
  bay := nullif(p_transaction ->> 'bay_number', '')::integer;

  if wash_service.category = 'SELF_SERVICE' then
    if bay is null then raise exception 'Tidak ada self-service bay yang tersedia.'; end if;
    perform pg_advisory_xact_lock(78131, bay);
    if exists (select 1 from public.transactions where bay_number = bay and transaction_status in ('ACTIVE', 'BOOKED')) then
      raise exception 'Bay tersebut baru saja digunakan atau dipesan.';
    end if;
  else
    bay := null;
  end if;

  insert into public.transactions (id, code, customer_id, vehicle_id, item_id, item_type, item_name, quantity, amount,
    payment_method, payment_status, transaction_type, transaction_status, queue_status, booking_date, booking_time,
    duration_minutes, bay_number, created_at)
  values (p_transaction ->> 'id', p_transaction ->> 'code', p_transaction ->> 'customer_id', selected_vehicle.id,
    wash_service.id, 'SERVICE', wash_service.name || case when addon.id is not null then ' + ' || addon.name else '' end,
    1, final_amount, payment_method_value, payment_status_value, transaction_kind, transaction_status_value, 'WAITING',
    (p_transaction ->> 'booking_date')::date, (p_transaction ->> 'booking_time')::time, total_duration, bay, now())
  returning * into saved_transaction;
  return to_jsonb(saved_transaction);
end;
$$;

revoke all on function public.lookup_customer_by_phone(text) from public;
revoke all on function public.lookup_transaction_history(text) from public;
revoke all on function public.get_public_today_wash_count() from public;
revoke all on function public.get_public_bay_status() from public;
revoke all on function public.record_product_sale(jsonb) from public;
revoke all on function public.record_service_transaction(jsonb, text) from public;
grant execute on function public.lookup_customer_by_phone(text) to anon, authenticated;
grant execute on function public.lookup_transaction_history(text) to anon, authenticated;
grant execute on function public.get_public_today_wash_count() to anon, authenticated;
grant execute on function public.get_public_bay_status() to anon, authenticated;
grant execute on function public.record_product_sale(jsonb) to anon, authenticated;
grant execute on function public.record_service_transaction(jsonb, text) to anon, authenticated;

insert into public.customers (id, full_name, phone) values
  ('c-1', 'Nadia Prameswari', '081234567890'),
  ('c-2', 'Rafi Mahendra', '081298765432'),
  ('c-3', 'Dimas Wicaksono', '082145670001')
on conflict (id) do update set full_name = excluded.full_name, phone = excluded.phone;

insert into public.vehicles (id, customer_id, type, plate, model) values
  ('v-1', 'c-1', 'CAR', 'H 1234 NP', 'Honda HR-V'),
  ('v-2', 'c-2', 'MOTOR', 'H 4567 RM', 'Vespa Sprint'),
  ('v-3', 'c-3', 'CAR', 'K 8821 DW', 'Toyota Yaris')
on conflict (id) do update set customer_id = excluded.customer_id, type = excluded.type, plate = excluded.plate, model = excluded.model;

update public.services_products set stock = greatest(0, stock - 2), updated_at = now()
where id = 'prd-shampoo' and exists (select 1 from public.services_products p where p.id = 'prd-shampoo')
  and not exists (select 1 from public.transactions t where t.id = 't-5');
update public.services_products set stock = greatest(0, stock - 1), updated_at = now()
where id = 'prd-cloth' and exists (select 1 from public.services_products p where p.id = 'prd-cloth')
  and not exists (select 1 from public.transactions t where t.id = 't-9');

insert into public.services_products (id, item_type, name, category, type, description, price, duration, stock, min_stock, active, image) values
  ('svc-car', 'SERVICE', 'Regular Car Wash', 'REGULAR', 'CAR', 'Cuci busa menyeluruh, bilas tekanan tinggi, dan pengeringan rapi untuk mobil harian Anda.', 80000, 50, 0, 0, true, 'https://images.pexels.com/photos/6873176/pexels-photo-6873176.jpeg?auto=compress&cs=tinysrgb&w=1000'),
  ('svc-moto', 'SERVICE', 'Regular Motorcycle Wash', 'REGULAR', 'MOTOR', 'Pembersihan bodi, velg, sela mesin, dan bagian motor yang sulit dijangkau.', 35000, 35, 0, 0, true, 'https://images.pexels.com/photos/36709685/pexels-photo-36709685.jpeg?auto=compress&cs=tinysrgb&w=1000'),
  ('svc-self-car', 'SERVICE', 'Self-Service Car Bay', 'SELF_SERVICE', 'CAR', 'Cuci mobil mandiri dengan foam, semprotan tekanan tinggi, dan ruang kerja pribadi.', 30000, 30, 0, 0, true, 'https://images.pexels.com/photos/14023348/pexels-photo-14023348.jpeg?auto=compress&cs=tinysrgb&w=1000'),
  ('svc-self-moto', 'SERVICE', 'Self-Service Motorcycle Bay', 'SELF_SERVICE', 'MOTOR', 'Cuci motor mandiri di bay khusus dengan peralatan yang siap digunakan.', 20000, 25, 0, 0, true, 'https://images.pexels.com/photos/20515049/pexels-photo-20515049.jpeg?auto=compress&cs=tinysrgb&w=1000'),
  ('addon-vacuum', 'ADD_ON', 'Vacuum interior', 'ADD_ON', null, 'Pembersihan debu pada karpet, jok, dan sela interior.', 20000, 15, 0, 0, true, 'https://images.pexels.com/photos/17029947/pexels-photo-17029947.jpeg?auto=compress&cs=tinysrgb&w=700'),
  ('addon-wax', 'ADD_ON', 'Lapisan spray wax', 'ADD_ON', null, 'Lapisan wax cepat untuk kilap dan perlindungan tambahan.', 25000, 10, 0, 0, true, 'https://images.pexels.com/photos/20042050/pexels-photo-20042050.jpeg?auto=compress&cs=tinysrgb&w=700'),
  ('addon-tire', 'ADD_ON', 'Tire dressing', 'ADD_ON', null, 'Finishing satin agar ban tampak hitam bersih.', 15000, 8, 0, 0, true, 'https://images.pexels.com/photos/7154623/pexels-photo-7154623.jpeg?auto=compress&cs=tinysrgb&w=700'),
  ('prd-shampoo', 'PRODUCT', 'Sampo Cuci Mobil pH Netral', 'WASH & CARE', null, 'Sampo khusus kendaraan, aman untuk lapisan wax · 500 ml.', 45000, 0, 22, 6, true, 'https://images.pexels.com/photos/4674366/pexels-photo-4674366.jpeg?auto=compress&cs=tinysrgb&w=700'),
  ('prd-cloth', 'PRODUCT', 'Kain Premium Microfiber', 'TOOLS', null, 'Serat lembut dan tebal untuk mengeringkan bodi tanpa goresan · 40 × 40 cm.', 40000, 0, 13, 5, true, 'https://images.pexels.com/photos/11370616/pexels-photo-11370616.jpeg?auto=compress&cs=tinysrgb&w=700'),
  ('prd-tire', 'PRODUCT', 'Semir Ban Satin', 'PROTECTION', null, 'Perawatan ban dengan hasil hitam satin, bukan licin berminyak · 250 ml.', 60000, 0, 9, 4, true, 'https://images.pexels.com/photos/7154623/pexels-photo-7154623.jpeg?auto=compress&cs=tinysrgb&w=700'),
  ('prd-wax', 'PRODUCT', 'Liquid Wax Kilap Dalam', 'PROTECTION', null, 'Wax cair untuk kilap dan perlindungan cat · 250 ml.', 115000, 0, 8, 4, true, 'https://images.pexels.com/photos/20042050/pexels-photo-20042050.jpeg?auto=compress&cs=tinysrgb&w=700'),
  ('prd-interior', 'PRODUCT', 'Pembersih Interior', 'INTERIOR CARE', null, 'Pembersih jok dan trim interior untuk perawatan rutin · 300 ml.', 50000, 0, 11, 4, true, 'https://images.pexels.com/photos/17029947/pexels-photo-17029947.jpeg?auto=compress&cs=tinysrgb&w=700'),
  ('prd-glass', 'PRODUCT', 'Pembersih Kaca Otomotif', 'GLASS CARE', null, 'Pembersih kaca untuk hasil bening tanpa bekas lap · 300 ml.', 40000, 0, 10, 4, true, 'https://images.pexels.com/photos/9462100/pexels-photo-9462100.jpeg?auto=compress&cs=tinysrgb&w=700')
on conflict (id) do update set item_type = excluded.item_type, name = excluded.name, category = excluded.category,
  type = excluded.type, description = excluded.description, price = excluded.price, duration = excluded.duration,
  min_stock = excluded.min_stock, active = excluded.active, image = excluded.image, updated_at = now();

insert into public.transactions (id, code, customer_id, vehicle_id, item_id, item_type, item_name, quantity, amount, payment_method, payment_status, transaction_type, transaction_status, queue_status, booking_date, booking_time, duration_minutes, bay_number, created_at) values
  ('t-1', 'RS-260929-1042', 'c-1', 'v-1', 'svc-car', 'SERVICE', 'Regular Car Wash', 1, 80000, 'QRIS', 'PAID', 'WALK_IN', 'COMPLETED', 'COMPLETED', current_date - 1, '09:20', 50, null, now() - interval '1 day'),
  ('t-2', 'RS-260930-1088', 'c-2', 'v-2', 'svc-self-moto', 'SERVICE', 'Self-Service Motorcycle Bay', 1, 20000, 'CASH', 'PAID', 'WALK_IN', 'ACTIVE', 'WASHING', current_date, localtime - interval '8 minutes', 25, 2, now() - interval '8 minutes'),
  ('t-3', 'RS-261001-0107', 'c-3', 'v-3', 'svc-self-car', 'SERVICE', 'Self-Service Car Bay', 1, 30000, 'E_WALLET', 'PENDING', 'BOOKING', 'BOOKED', 'WAITING', current_date + 1, '14:30', 30, 1, now()),
  ('t-4', 'RS-260929-0781', 'c-2', 'v-2', 'svc-moto', 'SERVICE', 'Regular Motorcycle Wash', 1, 35000, 'CASH', 'PAID', 'WALK_IN', 'COMPLETED', 'COMPLETED', current_date - 1, '16:40', 35, null, now() - interval '1 day'),
  ('t-5', 'RS-260928-0551', 'c-1', null, 'prd-shampoo', 'PRODUCT', 'Sampo Cuci Mobil pH Netral', 2, 90000, 'CASH', 'PAID', 'SHOP', 'COMPLETED', 'COMPLETED', current_date - 2, '11:10', 0, null, now() - interval '2 days'),
  ('t-6', 'RS-260927-0332', 'c-3', 'v-3', 'svc-car', 'SERVICE', 'Regular Car Wash', 1, 80000, 'QRIS', 'PAID', 'WALK_IN', 'COMPLETED', 'COMPLETED', current_date - 3, '15:25', 50, null, now() - interval '3 days'),
  ('t-7', 'RS-261002-0216', 'c-2', 'v-2', 'svc-moto', 'SERVICE', 'Regular Motorcycle Wash', 1, 35000, 'CARD', 'PENDING', 'BOOKING', 'BOOKED', 'WAITING', current_date + 2, '10:30', 35, null, now()),
  ('t-8', 'RS-260930-1134', 'c-3', 'v-3', 'svc-car', 'SERVICE', 'Regular Car Wash', 1, 80000, 'CASH', 'PAID', 'WALK_IN', 'ACTIVE', 'WAITING', current_date, localtime - interval '3 minutes', 50, null, now() - interval '3 minutes'),
  ('t-9', 'RS-260926-0972', 'c-1', null, 'prd-cloth', 'PRODUCT', 'Kain Premium Microfiber', 1, 40000, 'QRIS', 'PAID', 'SHOP', 'COMPLETED', 'COMPLETED', current_date - 4, '12:05', 0, null, now() - interval '4 days'),
  ('t-10', 'RS-260925-0821', 'c-3', 'v-3', 'svc-self-car', 'SERVICE', 'Self-Service Car Bay', 1, 30000, 'E_WALLET', 'PAID', 'WALK_IN', 'COMPLETED', 'COMPLETED', current_date - 5, '17:15', 30, null, now() - interval '5 days')
on conflict (id) do update set code = excluded.code, customer_id = excluded.customer_id, vehicle_id = excluded.vehicle_id,
  item_id = excluded.item_id, item_type = excluded.item_type, item_name = excluded.item_name, quantity = excluded.quantity,
  amount = excluded.amount, payment_method = excluded.payment_method, payment_status = excluded.payment_status,
  transaction_type = excluded.transaction_type, transaction_status = excluded.transaction_status,
  queue_status = excluded.queue_status, booking_date = excluded.booking_date, booking_time = excluded.booking_time,
  duration_minutes = excluded.duration_minutes, bay_number = excluded.bay_number, created_at = excluded.created_at;