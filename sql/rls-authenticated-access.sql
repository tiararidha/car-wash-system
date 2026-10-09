begin;

alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.services_products enable row level security;
alter table public.transactions enable row level security;

grant usage on schema public to anon, authenticated;
revoke all on public.customers, public.vehicles, public.services_products, public.transactions from public, anon;
grant select on public.services_products to anon;
grant insert on public.customers, public.vehicles to anon;
grant select, insert, update, delete on public.customers, public.vehicles, public.services_products, public.transactions to authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('customers', 'vehicles', 'services_products', 'transactions')
  loop
    execute format('drop policy %I on public.%I', existing_policy.policyname, existing_policy.tablename);
  end loop;
end;
$$;

create policy "Customer registration" on public.customers
  for insert to anon with check (length(trim(full_name)) > 1);
create policy "Vehicle registration" on public.vehicles
  for insert to anon with check (type in ('CAR', 'MOTOR'));
create policy "Public catalog read" on public.services_products
  for select to anon using (active = true);
create policy "Authenticated admin access" on public.customers
  for all to authenticated using (true) with check (true);
create policy "Authenticated admin access" on public.vehicles
  for all to authenticated using (true) with check (true);
create policy "Authenticated admin access" on public.services_products
  for all to authenticated using (true) with check (true);
create policy "Authenticated admin access" on public.transactions
  for all to authenticated using (true) with check (true);

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
              then greatest(0, active.duration_minutes - floor(extract(epoch from (now() - ((active.booking_date + active.booking_time) at time zone 'Asia/Jakarta'))) / 60)::integer)
              else 0 end,
         active.booking_time
  from generate_series(1, 4) as bays(bay_number)
  left join lateral (
    select t.* from public.transactions t
    where t.bay_number = bays.bay_number
      and (
        (t.transaction_status = 'ACTIVE'
          and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') <= now()
          and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') + make_interval(mins => t.duration_minutes) > now())
        or (t.transaction_status = 'BOOKED'
          and t.booking_date = (now() at time zone 'Asia/Jakarta')::date
          and t.booking_time >= (now() at time zone 'Asia/Jakarta')::time)
      )
    order by case when t.transaction_status = 'ACTIVE' then 0 else 1 end,
      ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') asc limit 1
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
  expected_payment_status := 'PENDING';
  if p_transaction ->> 'payment_status' <> expected_payment_status then raise exception 'Status pembayaran tidak sesuai metode.'; end if;
  update public.services_products set stock = stock - sale_quantity, updated_at = now()
  where id = p_transaction ->> 'item_id' returning stock into new_stock;
  insert into public.transactions (id, code, customer_id, vehicle_id, item_id, item_type, item_name, quantity, amount,
    payment_method, payment_status, transaction_type, transaction_status, queue_status, booking_date, booking_time,
    duration_minutes, bay_number, created_at)
  values (p_transaction ->> 'id', p_transaction ->> 'code', p_transaction ->> 'customer_id', null,
    p_transaction ->> 'item_id', 'PRODUCT', product_name, sale_quantity,
    product_price * sale_quantity, p_transaction ->> 'payment_method', expected_payment_status,
    'SHOP', 'PENDING', 'WAITING', (p_transaction ->> 'booking_date')::date,
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
  requested_start timestamptz;
  requested_end timestamptz;
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
  base_price := wash_service.price;
  final_amount := base_price + coalesce(addon.price, 0);

  transaction_kind := p_transaction ->> 'transaction_type';
  if transaction_kind not in ('BOOKING', 'WALK_IN') then raise exception 'Jenis transaksi layanan tidak valid.'; end if;
  if wash_service.category = 'SELF_SERVICE' and transaction_kind <> 'BOOKING' then
    raise exception 'Self-Service harus dibuat sebagai booking.';
  end if;
  payment_method_value := p_transaction ->> 'payment_method';
  if transaction_kind = 'BOOKING' and payment_method_value = 'CASH' then
    raise exception 'Booking harus dibayar di muka dengan metode cashless.';
  end if;
  payment_status_value := 'PENDING';
  transaction_status_value := 'PENDING';
  bay := nullif(p_transaction ->> 'bay_number', '')::integer;

  if wash_service.category = 'SELF_SERVICE' then
    if bay is null or bay not between 1 and 4 then raise exception 'Pilih salah satu dari empat self-service bay.'; end if;
    requested_start := (((p_transaction ->> 'booking_date')::date + (p_transaction ->> 'booking_time')::time) at time zone 'Asia/Jakarta');
    requested_end := requested_start + make_interval(mins => total_duration);
    perform pg_advisory_xact_lock(78131, bay);
    if exists (
      select 1 from public.transactions t
      where t.bay_number = bay
        and t.transaction_status in ('ACTIVE', 'BOOKED')
        and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') < requested_end
        and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') + make_interval(mins => t.duration_minutes) > requested_start
    ) then
      raise exception 'Bay tersebut sudah digunakan atau dipesan pada slot waktu ini.';
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

notify pgrst, 'reload schema';

commit;
