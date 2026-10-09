begin;

create extension if not exists pg_cron with schema pg_catalog;

alter table public.customers
  add column if not exists address text not null default '';

alter table public.transactions
  add column if not exists addon_id text references public.services_products(id) on delete restrict,
  add column if not exists pickup_distance_km numeric(4, 2),
  add column if not exists completed_at timestamptz,
  add column if not exists refund_status text not null default 'NONE'
    check (refund_status in ('NONE', 'PENDING', 'COMPLETED'));

alter table public.transactions drop constraint if exists transactions_transaction_status_check;
alter table public.transactions add constraint transactions_transaction_status_check
  check (transaction_status in ('PENDING', 'BOOKED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'));

drop trigger if exists transactions_integrity_guard on public.transactions;

update public.transactions
set booking_date = (now() at time zone 'Asia/Jakarta')::date + case id
      when 't-1' then -1 when 't-2' then 0 when 't-3' then 1 when 't-4' then -1
      when 't-5' then -2 when 't-6' then -3 when 't-7' then 2 when 't-8' then 0
      when 't-9' then -4 when 't-10' then -5 else 0 end,
    booking_time = case id
      when 't-1' then time '09:20'
      when 't-2' then ((now() at time zone 'Asia/Jakarta')::time - interval '8 minutes')::time
      when 't-3' then time '14:30'
      when 't-4' then time '16:40'
      when 't-5' then time '11:10'
      when 't-6' then time '15:25'
      when 't-7' then time '10:30'
      when 't-8' then ((now() at time zone 'Asia/Jakarta')::time - interval '3 minutes')::time
      when 't-9' then time '12:05'
      when 't-10' then time '17:15'
      else booking_time end
where id in ('t-1','t-2','t-3','t-4','t-5','t-6','t-7','t-8','t-9','t-10');

update public.customers
set address = case id
  when 'c-1' then 'Jl. Pahlawan 12, Semarang'
  when 'c-2' then 'Jl. Gajah Mada 45, Semarang'
  when 'c-3' then 'Jl. Imam Bonjol 67, Semarang'
  else address
end
where id in ('c-1', 'c-2', 'c-3')
  and coalesce(address, '') = ''
  and full_name in ('Nadia Prameswari', 'Rafi Mahendra', 'Dimas Wicaksono');

insert into public.customers (id, full_name, phone, address) values
  ('rs-c-04', 'Siti Rahma', '081200000004', 'Jl. Sudirman 88, Semarang'),
  ('rs-c-05', 'Dimas Adi', '081200000005', 'Jl. Diponegoro 19, Semarang'),
  ('rs-c-06', 'Arif Wijaya', '081200000006', 'Jl. Sriwijaya 23, Semarang'),
  ('rs-c-07', 'Melya Sari', '081200000007', 'Jl. Merdeka 31, Semarang'),
  ('rs-c-08', 'Bayu Saputra', '081200000008', 'Jl. Taman Siswa 15, Semarang'),
  ('rs-c-09', 'Aulia Rahman', '081200000009', 'Jl. Kenanga 9, Semarang'),
  ('rs-c-10', 'Kezia Lestari', '081200000010', 'Jl. Beringin 54, Semarang'),
  ('rs-c-11', 'Farhan Nugroho', '081200000011', 'Jl. Cendrawasih 17, Semarang'),
  ('rs-c-12', 'Indah Permata', '081200000012', 'Jl. Setiabudi 76, Semarang')
on conflict (id) do nothing;

insert into public.vehicles (id, customer_id, type, plate, model) values
  ('rs-v-04', 'rs-c-04', 'CAR', 'AB 9154 HP', 'Toyota Avanza'),
  ('rs-v-05', 'rs-c-04', 'MOTOR', 'B 4611 XA', 'Honda Vario'),
  ('rs-v-06', 'rs-c-05', 'CAR', 'AB 3098 RT', 'Daihatsu Sigra'),
  ('rs-v-07', 'rs-c-06', 'MOTOR', 'B 1902 SZ', 'Yamaha NMAX'),
  ('rs-v-08', 'rs-c-07', 'CAR', 'AB 7440 OR', 'Mitsubishi Xpander'),
  ('rs-v-09', 'rs-c-08', 'CAR', 'AB 5026 TM', 'Suzuki Ertiga'),
  ('rs-v-10', 'rs-c-08', 'MOTOR', 'B 8024 NG', 'Kawasaki KLX'),
  ('rs-v-11', 'rs-c-09', 'CAR', 'AB 1198 YN', 'Honda Jazz'),
  ('rs-v-12', 'rs-c-10', 'MOTOR', 'B 2347 CU', 'Vespa GTS'),
  ('rs-v-13', 'rs-c-11', 'CAR', 'AB 5410 MP', 'Toyota Fortuner'),
  ('rs-v-14', 'rs-c-12', 'MOTOR', 'B 8703 LM', 'Yamaha Mio')
on conflict (id) do nothing;

insert into public.services_products (
  id, item_type, name, category, type, description, price, duration,
  stock, min_stock, active, image
) values
  ('svc-car', 'SERVICE', 'Professional Car Wash', 'REGULAR', 'CAR', 'Cuci tangan menyeluruh dengan busa, bilas bertekanan, dan pengeringan rapi.', 50000, 50, 0, 0, true, 'https://images.pexels.com/photos/6873176/pexels-photo-6873176.jpeg?auto=compress&cs=tinysrgb&w=1000'),
  ('svc-moto', 'SERVICE', 'Professional Motorcycle Wash', 'REGULAR', 'MOTOR', 'Pembersihan bodi, roda, dan sela mesin agar motor siap digunakan kembali.', 20000, 35, 0, 0, true, 'https://images.pexels.com/photos/36709685/pexels-photo-36709685.jpeg?auto=compress&cs=tinysrgb&w=1000'),
  ('svc-self-car', 'SERVICE', 'Self-Service Car', 'SELF_SERVICE', 'CAR', 'Cuci mobil sendiri di bay khusus dengan foam dan semprotan bertekanan.', 30000, 30, 0, 0, true, 'https://images.pexels.com/photos/15363884/pexels-photo-15363884.jpeg?auto=compress&cs=tinysrgb&w=1000'),
  ('svc-self-moto', 'SERVICE', 'Self-Service Motorcycle', 'SELF_SERVICE', 'MOTOR', 'Cuci motor sendiri di bay khusus dengan peralatan yang siap digunakan.', 10000, 25, 0, 0, true, 'https://images.pexels.com/photos/20515049/pexels-photo-20515049.jpeg?auto=compress&cs=tinysrgb&w=1000'),
  ('addon-pickup', 'ADD_ON', 'Antar-Jemput Mobil', 'PICKUP', null, 'Penjemputan dan pengantaran mobil, maksimal 3 km pulang-pergi.', 10000, 0, 0, 0, true, 'https://images.pexels.com/photos/6873176/pexels-photo-6873176.jpeg?auto=compress&cs=tinysrgb&w=700'),
  ('addon-pickup-moto', 'ADD_ON', 'Antar-Jemput Motor', 'PICKUP', null, 'Penjemputan dan pengantaran motor, maksimal 3 km pulang-pergi.', 5000, 0, 0, 0, true, 'https://images.pexels.com/photos/36709685/pexels-photo-36709685.jpeg?auto=compress&cs=tinysrgb&w=700')
on conflict (id) do update set
  item_type = excluded.item_type, name = excluded.name, category = excluded.category,
  type = excluded.type, description = excluded.description, price = excluded.price,
  duration = excluded.duration, active = excluded.active, image = excluded.image,
  updated_at = now();

update public.transactions t
set amount = case
      when service.category = 'SELF_SERVICE' then
        service.price + coalesce((select addon.price from public.services_products addon where addon.id = t.addon_id), 0)
      else service.price + coalesce((select addon.price from public.services_products addon where addon.id = t.addon_id), 0)
    end,
    item_name = service.name || coalesce((select ' + ' || addon.name from public.services_products addon where addon.id = t.addon_id), '')
from public.services_products service
where service.id = t.item_id and t.item_type = 'SERVICE'
  and t.id in ('t-1','t-2','t-3','t-4','t-6','t-7','t-8','t-10','t-11','t-12','t-13','t-14','t-15','t-16','t-17','t-18','t-19','t-20');

insert into public.services_products (
  id, item_type, name, category, type, description, price, duration,
  stock, min_stock, active, image
) values
  ('addon-vacuum', 'ADD_ON', 'Interior Vacuum', 'ADD_ON', null, 'Pembersihan debu dan kotoran dari karpet serta kabin kendaraan.', 20000, 15, 0, 0, true, 'https://images.pexels.com/photos/5233285/pexels-photo-5233285.jpeg?auto=compress&cs=tinysrgb&w=700'),
  ('addon-wax', 'ADD_ON', 'Spray Wax', 'ADD_ON', null, 'Lapisan kilap tambahan untuk membantu menjaga hasil cuci.', 25000, 10, 0, 0, true, 'https://images.pexels.com/photos/20042050/pexels-photo-20042050.jpeg?auto=compress&cs=tinysrgb&w=700'),
  ('addon-tire', 'ADD_ON', 'Tire Dressing', 'ADD_ON', null, 'Finishing satin untuk tampilan ban yang bersih.', 15000, 8, 0, 0, true, 'https://images.pexels.com/photos/7154623/pexels-photo-7154623.jpeg?auto=compress&cs=tinysrgb&w=700')
on conflict (id) do update set
  item_type = excluded.item_type, name = excluded.name, category = excluded.category,
  type = excluded.type, description = excluded.description, price = excluded.price,
  duration = excluded.duration, active = excluded.active, image = excluded.image,
  updated_at = now();

update public.transactions t
set amount = case
      when service.category = 'SELF_SERVICE' then
        service.price + coalesce((select addon.price from public.services_products addon where addon.id = t.addon_id), 0)
      else service.price + coalesce((select addon.price from public.services_products addon where addon.id = t.addon_id), 0)
    end,
    item_name = service.name || coalesce((select ' + ' || addon.name from public.services_products addon where addon.id = t.addon_id), '')
from public.services_products service
where service.id = t.item_id
  and t.item_type = 'SERVICE'
  and (t.id in ('t-1','t-2','t-3','t-4','t-6','t-7','t-8','t-10','t-11','t-12','t-13','t-14','t-15','t-16','t-17','t-18','t-19','t-20')
    or t.code in ('RS-260908-9006','RS-260909-9005','RS-260910-9004','RS-260911-9003','RS-260912-9002','RS-260913-9001'));

update public.transactions t
set amount = product.price * t.quantity,
    item_name = product.name
from public.services_products product
where product.id = t.item_id
  and t.item_type = 'PRODUCT'
  and t.id in ('t-5', 't-9');

do $$ begin
  perform set_config('rinse.refund_update','on',true);
  update public.transactions set payment_status='PAID',refund_status='PENDING'
  where payment_status='REFUNDED' and transaction_status='CANCELLED';
  perform set_config('rinse.refund_update','off',true);
end $$;

update public.transactions
set transaction_status = 'PENDING', queue_status = 'WAITING'
where payment_status in ('PENDING', 'FAILED')
  and transaction_status in ('BOOKED', 'ACTIVE', 'COMPLETED');

do $$ begin
  perform set_config('rinse.refund_update','on',true);
  update public.transactions set refund_status='PENDING'
  where payment_status='PAID' and transaction_status='CANCELLED';
  perform set_config('rinse.refund_update','off',true);
end $$;

drop function if exists public.lookup_customer_by_phone(text);
create function public.lookup_customer_by_phone(p_phone text)
returns table(
  customer_id text, full_name text, phone text, vehicle_id text, vehicle_type text,
  vehicle_plate text, vehicle_model text, customer_address text
)
language sql stable security definer set search_path = public
as $$
  select c.id, c.full_name, c.phone, v.id, v.type, v.plate, v.model, c.address
  from public.customers c left join public.vehicles v on v.customer_id = c.id
  where regexp_replace(c.phone, '[^0-9]', '', 'g') = regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')
    and length(regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g')) >= 7;
$$;

drop function if exists public.lookup_transaction_history(text);
create function public.lookup_transaction_history(p_search text)
returns table(
  transaction_id text, code text, item_name text, item_type text, amount integer,
  payment_method text, payment_status text, transaction_type text, transaction_status text,
  booking_date date, booking_time time, duration_minutes integer, customer_name text,
  vehicle_type text, vehicle_plate text, vehicle_model text, refund_status text
)
language sql stable security definer set search_path = public
as $$
  select t.id, t.code, t.item_name, t.item_type, t.amount, t.payment_method, t.payment_status,
         t.transaction_type, t.transaction_status, t.booking_date, t.booking_time, t.duration_minutes,
         c.full_name, v.type, v.plate, v.model, t.refund_status
  from public.transactions t
  join public.customers c on c.id = t.customer_id
  left join public.vehicles v on v.id = t.vehicle_id and v.customer_id = t.customer_id
  where lower(t.code) = lower(trim(coalesce(p_search, '')))
    or (length(regexp_replace(coalesce(p_search, ''), '[^0-9]', '', 'g')) >= 7
      and regexp_replace(c.phone, '[^0-9]', '', 'g') = regexp_replace(p_search, '[^0-9]', '', 'g'))
    or lower(regexp_replace(coalesce(v.plate, ''), '[[:space:]]', '', 'g'))
      = lower(regexp_replace(trim(coalesce(p_search, '')), '[[:space:]]', '', 'g'));
$$;

create or replace function public.get_public_today_wash_count()
returns integer language sql stable security definer set search_path = public
as $$
  select count(*)::integer from public.transactions
  where booking_date = (now() at time zone 'Asia/Jakarta')::date
    and item_type = 'SERVICE' and payment_status = 'PAID' and transaction_status = 'COMPLETED';
$$;

create or replace function public.get_public_bay_status()
returns table(bay_number integer, bay_status text, vehicle_type text, duration_minutes integer, minutes_remaining integer, booking_time time)
language sql stable security definer set search_path = public
as $$
  select bays.bay_number,
         case when active.transaction_status = 'ACTIVE'
                    or ((active.booking_date + active.booking_time) at time zone 'Asia/Jakarta') <= now() then 'OCCUPIED'
              when active.transaction_status = 'BOOKED' then 'RESERVED' else 'AVAILABLE' end,
         vehicle.type, coalesce(active.duration_minutes, 0),
         case when active.transaction_status = 'ACTIVE'
                    or ((active.booking_date + active.booking_time) at time zone 'Asia/Jakarta') <= now()
              then greatest(0, active.duration_minutes - floor(extract(epoch from (
                now() - ((active.booking_date + active.booking_time) at time zone 'Asia/Jakarta')
              )) / 60)::integer) else 0 end,
         active.booking_time
  from generate_series(1, 4) as bays(bay_number)
  left join lateral (
    select t.* from public.transactions t
    join public.services_products service on service.id = t.item_id
    where t.bay_number = bays.bay_number and t.item_type = 'SERVICE'
      and service.category = 'SELF_SERVICE' and t.payment_status = 'PAID'
      and t.transaction_status in ('BOOKED', 'ACTIVE')
      and t.booking_date = (now() at time zone 'Asia/Jakarta')::date
      and ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') + make_interval(mins => t.duration_minutes) > now()
    order by ((t.booking_date + t.booking_time) at time zone 'Asia/Jakarta') limit 1
  ) active on true
  left join public.vehicles vehicle on vehicle.id = active.vehicle_id
  order by bays.bay_number;
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
  addon_price integer := 0;
  addon_duration integer := 0;
  expected_amount integer;
begin
  if new.vehicle_id is not null then
    select customer_id, type into owner_id, vehicle_type from public.vehicles where id = new.vehicle_id;
    if not found or owner_id <> new.customer_id then raise exception 'Kendaraan tidak sesuai dengan pelanggan transaksi.'; end if;
  elsif new.item_type = 'SERVICE' then
    raise exception 'Transaksi layanan wajib memiliki kendaraan.';
  end if;
  select item_type, price, duration, category, type
    into catalog_type, catalog_price, catalog_duration, catalog_category, catalog_vehicle_type
  from public.services_products where id = new.item_id;
  if not found or catalog_type <> new.item_type then raise exception 'Item transaksi tidak ditemukan atau jenisnya tidak sesuai.'; end if;
  if new.item_type = 'SERVICE' and vehicle_type <> catalog_vehicle_type then raise exception 'Jenis kendaraan tidak sesuai dengan layanan.'; end if;

  if tg_op = 'INSERT' then
    if new.item_type = 'PRODUCT' then
      if new.addon_id is not null or new.amount <> catalog_price * new.quantity then raise exception 'Nominal produk tidak sesuai katalog.'; end if;
    else
      if new.addon_id is not null then
        select price, duration into addon_price, addon_duration from public.services_products
        where id = new.addon_id and item_type = 'ADD_ON' and active;
        if not found then raise exception 'Add-on tidak ditemukan atau tidak aktif.'; end if;
      end if;
      if new.addon_id in ('addon-pickup', 'addon-pickup-moto') then
        if new.transaction_type <> 'BOOKING' then raise exception 'Antar-Jemput hanya tersedia untuk Booking.'; end if;
        if catalog_category <> 'REGULAR' then raise exception 'Antar-Jemput hanya tersedia untuk Professional Wash.'; end if;
        if (new.addon_id = 'addon-pickup' and catalog_vehicle_type <> 'CAR')
          or (new.addon_id = 'addon-pickup-moto' and catalog_vehicle_type <> 'MOTOR') then
          raise exception 'Jenis Antar-Jemput tidak sesuai kendaraan.';
        end if;
        if not exists (select 1 from public.customers c where c.id = new.customer_id and nullif(trim(c.address), '') is not null) then
          raise exception 'Antar-Jemput memerlukan alamat pelanggan tersimpan.';
        end if;
        if new.pickup_distance_km is null or new.pickup_distance_km <= 0 or new.pickup_distance_km > 3 then
          raise exception 'Jarak Antar-Jemput pulang-pergi maksimal 3 km.';
        end if;
      elsif new.pickup_distance_km is not null then
        raise exception 'Jarak hanya dicatat untuk transaksi Antar-Jemput.';
      end if;
      if new.duration_minutes <= addon_duration then raise exception 'Durasi layanan tidak valid.'; end if;
      if catalog_category = 'SELF_SERVICE' then
        expected_amount := catalog_price;
      else
        expected_amount := catalog_price;
      end if;
      if new.amount <> expected_amount + addon_price then raise exception 'Nominal transaksi tidak sesuai katalog.'; end if;
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

create trigger transactions_integrity_guard before insert or update on public.transactions
for each row execute function public.guard_transaction_integrity();

do $$ begin
  perform set_config('rinse.refund_update','on',true);
  update public.transactions set payment_status='PAID',refund_status='PENDING'
  where payment_status='REFUNDED' and transaction_status='CANCELLED';
  perform set_config('rinse.refund_update','off',true);
end $$;

update public.transactions
set transaction_status = 'PENDING', queue_status = 'WAITING'
where payment_status in ('PENDING','FAILED') and transaction_status in ('BOOKED','ACTIVE','COMPLETED');

do $$ begin
  perform set_config('rinse.refund_update','on',true);
  update public.transactions set refund_status='PENDING'
  where payment_status='PAID' and transaction_status='CANCELLED';
  perform set_config('rinse.refund_update','off',true);
end $$;

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
  pickup_distance numeric(4,2);
  starts_at timestamptz;
  ends_at timestamptz;
begin
  select * into service from public.services_products where id = p_transaction ->> 'item_id' and item_type = 'SERVICE' and active;
  if not found then raise exception 'Layanan tidak ditemukan atau tidak aktif.'; end if;
  select * into customer from public.customers where id = p_transaction ->> 'customer_id';
  if not found then raise exception 'Pelanggan tidak ditemukan.'; end if;
  select * into vehicle from public.vehicles where id = p_transaction ->> 'vehicle_id' and customer_id = customer.id;
  if not found or vehicle.type <> service.type then raise exception 'Kendaraan tidak sesuai dengan pelanggan/layanan.'; end if;
  if p_addon_id is not null then
    select * into addon from public.services_products where id = p_addon_id and item_type = 'ADD_ON' and active;
    if not found then raise exception 'Add-on tidak ditemukan atau tidak aktif.'; end if;
  end if;
  transaction_kind := p_transaction ->> 'transaction_type';
  if transaction_kind not in ('BOOKING','WALK_IN') then raise exception 'Jenis transaksi tidak valid.'; end if;
  if service.category = 'SELF_SERVICE' and transaction_kind <> 'BOOKING' then raise exception 'Self-Service harus berupa Booking.'; end if;
  if p_addon_id in ('addon-pickup','addon-pickup-moto') then
    if transaction_kind <> 'BOOKING' or service.category <> 'REGULAR' then raise exception 'Antar-Jemput hanya berlaku untuk Booking Professional Wash.'; end if;
    if (p_addon_id = 'addon-pickup' and service.type <> 'CAR') or (p_addon_id = 'addon-pickup-moto' and service.type <> 'MOTOR') then raise exception 'Jenis Antar-Jemput tidak sesuai layanan.'; end if;
    if nullif(trim(customer.address),'') is null then raise exception 'Alamat pelanggan untuk Antar-Jemput belum tersedia.'; end if;
    pickup_distance := nullif(p_transaction ->> 'pickup_distance_km','')::numeric;
    if pickup_distance is null or pickup_distance <= 0 or pickup_distance > 3 then raise exception 'Jarak pulang-pergi Antar-Jemput maksimal 3 km.'; end if;
  elsif nullif(p_transaction ->> 'pickup_distance_km','') is not null then
    raise exception 'Jarak hanya boleh dicatat untuk Antar-Jemput.';
  end if;
  duration := (p_transaction ->> 'duration_minutes')::integer;
  service_duration := duration - coalesce(addon.duration,0);
  if service_duration <= 0 then raise exception 'Durasi layanan tidak valid.'; end if;
  if service.category = 'SELF_SERVICE' then amount_value := service.price;
  else amount_value := service.price; end if;
  amount_value := amount_value + coalesce(addon.price,0);
  if p_transaction ->> 'payment_method' not in ('CASH','QRIS','E_WALLET','CARD') then raise exception 'Metode pembayaran tidak valid.'; end if;
  if transaction_kind = 'BOOKING' and p_transaction ->> 'payment_method' = 'CASH' then raise exception 'Booking harus dibayar di muka dengan metode cashless.'; end if;
  starts_at := (((p_transaction ->> 'booking_date')::date + (p_transaction ->> 'booking_time')::time) at time zone 'Asia/Jakarta');
  if transaction_kind = 'BOOKING' and starts_at <= clock_timestamp() then raise exception 'Pilih waktu booking yang belum dimulai.'; end if;
  bay := nullif(p_transaction ->> 'bay_number','')::integer;
  if service.category = 'SELF_SERVICE' then
    if bay is null or bay not between 1 and 4 then raise exception 'Pilih salah satu dari empat bay.'; end if;
    ends_at := starts_at + make_interval(mins => duration);
    perform pg_advisory_xact_lock(78131,bay);
    if exists (
      select 1 from public.transactions t join public.services_products item on item.id=t.item_id
      where t.bay_number=bay and item.category='SELF_SERVICE' and t.payment_status='PAID'
        and t.transaction_status in ('BOOKED','ACTIVE')
        and starts_at < ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta') + make_interval(mins=>t.duration_minutes)
        and ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta') < ends_at
    ) then raise exception 'Bay sudah dipesan pada jadwal ini.'; end if;
  else
    bay := null;
  end if;
  insert into public.transactions (
    id,code,customer_id,vehicle_id,item_id,addon_id,pickup_distance_km,item_type,item_name,quantity,amount,
    payment_method,payment_status,refund_status,transaction_type,transaction_status,queue_status,
    booking_date,booking_time,duration_minutes,bay_number,created_at
  ) values (
    p_transaction ->> 'id', p_transaction ->> 'code', customer.id, vehicle.id, service.id, addon.id, pickup_distance,
    'SERVICE', service.name || case when addon.id is not null then ' + ' || addon.name else '' end,
    1, amount_value, p_transaction ->> 'payment_method','PENDING','NONE',transaction_kind,'PENDING','WAITING',
    (p_transaction ->> 'booking_date')::date,(p_transaction ->> 'booking_time')::time,duration,bay,now()
  ) returning * into saved;
  return to_jsonb(saved);
end;
$$;

create or replace function public.record_product_sale(p_transaction jsonb)
returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  product public.services_products%rowtype;
  sale_quantity integer;
  new_stock integer;
begin
  sale_quantity := greatest(1,coalesce((p_transaction ->> 'quantity')::integer,1));
  select * into product from public.services_products where id=p_transaction ->> 'item_id' and item_type='PRODUCT' and active for update;
  if not found then raise exception 'Produk tidak ditemukan atau tidak aktif.'; end if;
  if product.stock < sale_quantity then raise exception 'Stok produk tidak mencukupi.'; end if;
  update public.services_products set stock=stock-sale_quantity,updated_at=now() where id=product.id returning stock into new_stock;
  insert into public.transactions (
    id,code,customer_id,vehicle_id,item_id,item_type,item_name,quantity,amount,payment_method,payment_status,
    refund_status,transaction_type,transaction_status,queue_status,booking_date,booking_time,duration_minutes,created_at
  ) values (
    p_transaction ->> 'id',p_transaction ->> 'code',p_transaction ->> 'customer_id',null,product.id,'PRODUCT',product.name,
    sale_quantity,product.price*sale_quantity,p_transaction ->> 'payment_method','PENDING','NONE','SHOP','PENDING','WAITING',
    (p_transaction ->> 'booking_date')::date,(p_transaction ->> 'booking_time')::time,0,now()
  );
  return new_stock;
end;
$$;

create or replace function public.confirm_transaction_payment(p_transaction_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  tx public.transactions%rowtype;
  next_status text;
begin
  if auth.uid() is null then raise exception 'Masuk sebagai Admin untuk konfirmasi pembayaran.'; end if;
  select * into tx from public.transactions where id=p_transaction_id for update;
  if not found or tx.payment_status<>'PENDING' or tx.transaction_status<>'PENDING' then raise exception 'Transaksi bukan pembayaran tertunda.'; end if;
  if tx.payment_method<>'CASH' or tx.transaction_type not in ('WALK_IN','SHOP') then raise exception 'Konfirmasi manual hanya untuk pembayaran tunai Walk-in/penjualan.'; end if;
  next_status := case when tx.transaction_type='SHOP' then 'COMPLETED' else 'ACTIVE' end;
  perform set_config('rinse.payment_update','on',true);
  update public.transactions set payment_status='PAID',transaction_status=next_status,
    queue_status=case when next_status='COMPLETED' then 'COMPLETED' else 'WAITING' end
    where id=tx.id returning * into tx;
  return to_jsonb(tx);
end;
$$;

create or replace function public.confirm_booking_payment(p_transaction_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  tx public.transactions%rowtype;
  starts_at timestamptz;
begin
  if coalesce(auth.role(),'') <> 'service_role' then raise exception 'Pembayaran Booking hanya dapat dikonfirmasi dari webhook pembayaran terverifikasi.'; end if;
  select * into tx from public.transactions where id=p_transaction_id for update;
  if not found or tx.transaction_type<>'BOOKING' or tx.payment_status<>'PENDING' or tx.transaction_status<>'PENDING' then raise exception 'Booking bukan pembayaran tertunda.'; end if;
  starts_at := (tx.booking_date+tx.booking_time) at time zone 'Asia/Jakarta';
  if starts_at <= clock_timestamp() then raise exception 'Pembayaran Booking diterima setelah waktu mulai.'; end if;
  perform set_config('rinse.payment_update','on',true);
  update public.transactions set payment_status='PAID',transaction_status='BOOKED',queue_status='WAITING'
    where id=tx.id returning * into tx;
  return to_jsonb(tx);
end;
$$;

create or replace function public.cancel_transaction(p_transaction_id text,p_search text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  tx public.transactions%rowtype;
  starts_at timestamptz;
begin
  select t.* into tx from public.transactions t
  join public.customers c on c.id=t.customer_id left join public.vehicles v on v.id=t.vehicle_id
  where t.id=p_transaction_id and t.transaction_type='BOOKING'
    and (lower(t.code)=lower(trim(coalesce(p_search,'')))
      or (length(regexp_replace(coalesce(p_search,''),'[^0-9]','','g'))>=7 and regexp_replace(c.phone,'[^0-9]','','g')=regexp_replace(p_search,'[^0-9]','','g'))
      or lower(regexp_replace(coalesce(v.plate,''),'[[:space:]]','','g'))=lower(regexp_replace(trim(coalesce(p_search,'')),'[[:space:]]','','g')))
  for update of t;
  if not found then raise exception 'Booking tidak ditemukan.'; end if;
  if tx.transaction_status not in ('PENDING','BOOKED') then raise exception 'Booking tidak dapat dibatalkan.'; end if;
  starts_at := (tx.booking_date+tx.booking_time) at time zone 'Asia/Jakarta';
  if starts_at<=clock_timestamp() then raise exception 'Pembatalan ditutup pada waktu mulai.'; end if;
  perform set_config('rinse.cancellation_update','on',true);
  update public.transactions set transaction_status='CANCELLED',queue_status='COMPLETED',
    refund_status=case when tx.payment_status='PAID' then 'PENDING' else 'NONE' end
    where id=tx.id returning * into tx;
  return to_jsonb(tx);
end;
$$;

create or replace function public.complete_transaction_refund(p_transaction_id text)
returns jsonb language plpgsql security definer set search_path = public, pg_temp
as $$
declare tx public.transactions%rowtype;
begin
  if auth.uid() is null then raise exception 'Masuk sebagai Admin untuk mencatat refund.'; end if;
  select * into tx from public.transactions where id=p_transaction_id for update;
  if not found or tx.transaction_status<>'CANCELLED' or tx.refund_status<>'PENDING' then raise exception 'Tidak ada refund tertunda.'; end if;
  perform set_config('rinse.refund_update','on',true);
  update public.transactions set payment_status='REFUNDED',refund_status='COMPLETED' where id=tx.id returning * into tx;
  return to_jsonb(tx);
end;
$$;

create or replace function public.reconcile_self_service_transactions()
returns integer language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  now_at timestamptz := clock_timestamp();
  completed_count integer := 0;
  activated_count integer := 0;
  expired_count integer := 0;
  expired_rows integer := 0;
begin
  update public.transactions t set transaction_status='COMPLETED',queue_status='COMPLETED',
    completed_at=coalesce(t.completed_at,((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')+make_interval(mins=>t.duration_minutes))
  from public.services_products service
  where service.id=t.item_id and t.item_type='SERVICE' and t.payment_status='PAID' and t.transaction_status='ACTIVE'
    and t.queue_status in ('WASHING','FINISHING','COMPLETED')
    and ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')+make_interval(mins=>t.duration_minutes)<=now_at;
  get diagnostics completed_count=row_count;

  update public.transactions t set transaction_status='EXPIRED',queue_status='COMPLETED'
  where t.item_type='SERVICE' and t.transaction_type='BOOKING'
    and t.payment_status='PAID' and t.transaction_status='BOOKED'
    and ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')+make_interval(mins=>t.duration_minutes)<=now_at;
  get diagnostics expired_rows=row_count;
  expired_count := expired_count + expired_rows;

  update public.transactions t set transaction_status='EXPIRED',queue_status='COMPLETED'
  where t.item_type='SERVICE' and t.transaction_type='BOOKING'
    and t.payment_status in ('PENDING','FAILED') and t.transaction_status='PENDING'
    and ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')<=now_at;
  get diagnostics expired_rows=row_count;
  expired_count := expired_count + expired_rows;

  update public.transactions t set transaction_status='ACTIVE'
  where t.item_type='SERVICE' and t.payment_status='PAID' and t.transaction_status='BOOKED'
    and ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')<=now_at
    and ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')+make_interval(mins=>t.duration_minutes)>now_at;
  get diagnostics activated_count=row_count;

  update public.transactions t set transaction_status='EXPIRED',queue_status='COMPLETED'
  where t.item_type='SERVICE' and t.transaction_type='BOOKING'
    and t.payment_status='PAID' and t.transaction_status='ACTIVE' and t.queue_status='WAITING'
    and ((t.booking_date+t.booking_time) at time zone 'Asia/Jakarta')+make_interval(mins=>t.duration_minutes)<=now_at;
  get diagnostics expired_rows=row_count;
  expired_count := expired_count + expired_rows;

  return completed_count+activated_count+expired_count;
end;
$$;

do $$ begin
  if not exists (select 1 from cron.job where jobname='rinse-self-service-reconciliation') then
    perform cron.schedule('rinse-self-service-reconciliation','* * * * *','select public.reconcile_self_service_transactions();');
  end if;
end $$;

revoke all on function public.confirm_transaction_payment(text) from public, anon;
revoke all on function public.confirm_booking_payment(text) from public, anon, authenticated;
revoke all on function public.complete_transaction_refund(text) from public, anon;
revoke all on function public.cancel_transaction(text,text) from public;
revoke all on function public.guard_transaction_integrity() from public, anon, authenticated;
revoke all on function public.lookup_customer_by_phone(text) from public;
revoke all on function public.lookup_transaction_history(text) from public;
grant execute on function public.confirm_transaction_payment(text) to authenticated;
grant execute on function public.confirm_booking_payment(text) to service_role;
grant execute on function public.complete_transaction_refund(text) to authenticated;
grant execute on function public.cancel_transaction(text,text) to anon, authenticated;
grant execute on function public.lookup_customer_by_phone(text) to anon, authenticated;
grant execute on function public.lookup_transaction_history(text) to anon, authenticated;
grant execute on function public.reconcile_self_service_transactions() to authenticated;
grant execute on function public.get_public_bay_status() to anon, authenticated;
grant execute on function public.get_public_today_wash_count() to anon, authenticated;

do $$ begin
  if not exists (
    select 1 from pg_trigger trigger_row
    join pg_class table_row on table_row.oid = trigger_row.tgrelid
    join pg_namespace schema_row on schema_row.oid = table_row.relnamespace
    where schema_row.nspname = 'public'
      and table_row.relname = 'transactions'
      and trigger_row.tgname = 'transactions_integrity_guard'
      and trigger_row.tgenabled in ('O', 'A')
  ) then
    raise exception 'Guard transaksi harus aktif sebelum seed t-20 direkonsiliasi.';
  end if;
end $$;

delete from public.transactions t
where t.id = 't-20'
  and (t.code is distinct from 'RS-SEED-010'
    or t.customer_id is distinct from 'rs-c-11'
    or t.vehicle_id is distinct from 'rs-v-13'
    or t.item_id is distinct from 'svc-self-car'
    or t.addon_id is not null
    or t.pickup_distance_km is not null
    or t.item_type is distinct from 'SERVICE'
    or t.item_name is distinct from 'Self-Service Car'
    or t.quantity is distinct from 1
    or t.amount is distinct from 30000
    or t.payment_method is distinct from 'CARD'
    or t.payment_status is distinct from 'PAID'
    or t.refund_status is distinct from 'NONE'
    or t.transaction_type is distinct from 'BOOKING'
    or t.transaction_status is distinct from 'BOOKED'
    or t.queue_status is distinct from 'WAITING'
    or t.booking_date is distinct from (now() at time zone 'Asia/Jakarta')::date + 3
    or t.booking_time is distinct from time '09:00'
    or t.duration_minutes is distinct from 30
    or t.bay_number is distinct from 4
    or t.completed_at is not null);

insert into public.transactions (
  id,code,customer_id,vehicle_id,item_id,addon_id,pickup_distance_km,item_type,item_name,quantity,amount,
  payment_method,payment_status,refund_status,transaction_type,transaction_status,queue_status,
  booking_date,booking_time,duration_minutes,bay_number,created_at
)
select seed.id,seed.code,seed.customer_id,seed.vehicle_id,service.id,addon.id,seed.pickup_distance_km,seed.item_type,
  service.name || case when addon.id is not null then ' + '||addon.name else '' end,1,seed.amount,
  seed.payment_method,seed.payment_status,'NONE',seed.transaction_type,seed.transaction_status,seed.queue_status,
  (now() at time zone 'Asia/Jakarta')::date+seed.day_offset,seed.booking_time,seed.duration_minutes,seed.bay_number,
  (((now() at time zone 'Asia/Jakarta')::date+seed.day_offset+seed.booking_time) at time zone 'Asia/Jakarta')
from (values
 ('t-11','RS-SEED-001','rs-c-04','rs-v-04','svc-car',null::text,null::numeric,'SERVICE',50000,'CASH','PAID','WALK_IN','COMPLETED','COMPLETED',-2,time '09:20',50,null::integer),
 ('t-12','RS-SEED-002','rs-c-04','rs-v-05','svc-moto',null::text,null::numeric,'SERVICE',20000,'CASH','PAID','WALK_IN','COMPLETED','COMPLETED',-1,time '16:40',35,null::integer),
 ('t-13','RS-SEED-003','rs-c-05','rs-v-06','svc-self-car',null::text,null::numeric,'SERVICE',30000,'QRIS','PAID','BOOKING','COMPLETED','COMPLETED',-3,time '14:30',30,1),
 ('t-14','RS-SEED-004','rs-c-06','rs-v-07','svc-self-moto',null::text,null::numeric,'SERVICE',10000,'CARD','PAID','BOOKING','COMPLETED','COMPLETED',-4,time '11:15',25,2),
 ('t-15','RS-SEED-005','c-1',null,'prd-shampoo',null::text,null::numeric,'PRODUCT',45000,'CASH','PAID','SHOP','COMPLETED','COMPLETED',-5,time '11:10',0,null::integer),
 ('t-16','RS-SEED-006','rs-c-07','rs-v-08','svc-car',null::text,null::numeric,'SERVICE',50000,'E_WALLET','PAID','BOOKING','COMPLETED','COMPLETED',-6,time '17:15',50,null::integer),
 ('t-17','RS-SEED-007','rs-c-04','rs-v-04','svc-car','addon-pickup',2.40,'SERVICE',60000,'QRIS','PAID','BOOKING','BOOKED','WAITING',1,time '10:00',50,null::integer),
 ('t-18','RS-SEED-008','rs-c-04','rs-v-05','svc-moto','addon-pickup-moto',2.00,'SERVICE',25000,'E_WALLET','PAID','BOOKING','BOOKED','WAITING',2,time '11:00',35,null::integer),
 ('t-19','RS-SEED-009','rs-c-09','rs-v-11','svc-self-car',null::text,null::numeric,'SERVICE',30000,'QRIS','PAID','BOOKING','BOOKED','WAITING',2,time '14:00',30,3),
 ('t-20','RS-SEED-010','rs-c-11','rs-v-13','svc-self-car',null::text,null::numeric,'SERVICE',30000,'CARD','PAID','BOOKING','BOOKED','WAITING',3,time '09:00',30,4)
) as seed(id,code,customer_id,vehicle_id,item_id,addon_id,pickup_distance_km,item_type,amount,payment_method,payment_status,transaction_type,transaction_status,queue_status,day_offset,booking_time,duration_minutes,bay_number)
join public.services_products service on service.id=seed.item_id
left join public.services_products addon on addon.id=seed.addon_id
on conflict (id) do nothing;

do $$ begin
  perform set_config('rinse.payment_update','on',true);
  update public.transactions t
  set payment_status='PAID',transaction_status='BOOKED',queue_status='WAITING'
  from (values
    ('t-3','RS-261001-0107','svc-self-car',30000),
    ('t-7','RS-261002-0216','svc-moto',20000),
    ('t-19','RS-261007-3009','svc-self-car',30000)
  ) seed(id,code,item_id,amount)
  where t.id=seed.id and t.code=seed.code and t.item_id=seed.item_id and t.amount=seed.amount
    and t.item_type='SERVICE' and t.transaction_type='BOOKING'
    and t.payment_method in ('QRIS','E_WALLET','CARD')
    and t.payment_status in ('PENDING','FAILED') and t.transaction_status='PENDING';
  perform set_config('rinse.payment_update','off',true);
end $$;

with shortage as (select greatest(20-count(*),0)::integer as quantity from public.transactions)
insert into public.transactions (id,code,customer_id,vehicle_id,item_id,item_type,item_name,quantity,amount,payment_method,payment_status,refund_status,transaction_type,transaction_status,queue_status,booking_date,booking_time,duration_minutes,created_at)
select gen_random_uuid()::text,
  'RS-'||to_char((now() at time zone 'Asia/Jakarta')::date-30-seq.n,'YYMMDD')||'-'||lpad(seq.n::text,4,'0'),
  'rs-c-04','rs-v-04',service.id,'SERVICE',service.name,1,service.price,'QRIS','PAID','NONE','WALK_IN','COMPLETED','COMPLETED',
  (now() at time zone 'Asia/Jakarta')::date-30-seq.n,time '09:00',service.duration,
  (((now() at time zone 'Asia/Jakarta')::date-30-seq.n+time '09:00') at time zone 'Asia/Jakarta')
from shortage cross join lateral generate_series(1,shortage.quantity) as seq(n)
join public.services_products service on service.id='svc-car';

notify pgrst,'reload schema';
commit;
