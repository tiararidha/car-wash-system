begin;

alter table public.transactions
  add column if not exists fulfillment_method text not null default 'PICKUP'
    check (fulfillment_method in ('PICKUP', 'COURIER'));
alter table public.transactions
  add column if not exists fulfillment_address text,
  add column if not exists fulfillment_order_id uuid,
  add column if not exists shipping_fee integer not null default 0
    check (shipping_fee in (0, 10000));
alter table public.transactions
  add constraint transactions_product_fulfillment_check
  check ((fulfillment_method = 'PICKUP' and shipping_fee = 0)
    or fulfillment_method = 'COURIER');
create unique index if not exists transactions_one_shipping_fee_per_order_idx
  on public.transactions(fulfillment_order_id) where shipping_fee = 10000;
alter table public.transactions
  alter column booking_date set default (now() at time zone 'Asia/Jakarta')::date;

delete from public.transactions where item_id = 'prd-perfume';
delete from public.services_products where id = 'prd-perfume' and item_type = 'PRODUCT';

update public.services_products set
  name = 'Lap Microfiber Bodi & Kaca',
  category = 'PERLENGKAPAN',
  description = 'Kain lap halus berdaya serap tinggi, aman untuk bodi dan kaca tanpa meninggalkan goresan.'
where id = 'prd-cloth' and item_type = 'PRODUCT';
update public.services_products set
  name = 'Pembersih Interior & Jok',
  category = 'PERAWATAN INTERIOR',
  description = 'Cairan pembersih untuk mengangkat debu, noda makanan, dan kotoran pada jok serta dasbor.'
where id = 'prd-interior' and item_type = 'PRODUCT';
update public.services_products set
  name = 'Pembersih Kaca Mobil',
  category = 'PERAWATAN KACA',
  description = 'Membersihkan bercak air dan kotoran pada kaca kendaraan agar pandangan kembali bening.'
where id = 'prd-glass' and item_type = 'PRODUCT';
update public.services_products set
  name = 'Sampo Mobil pH Netral',
  category = 'CUCI & PERAWATAN',
  description = 'Sampo cuci bodi busa melimpah, aman digunakan sehari-hari tanpa merusak cat.'
where id = 'prd-shampoo' and item_type = 'PRODUCT';
update public.services_products set
  name = 'Semir Pengkilap Ban',
  category = 'PERLINDUNGAN',
  description = 'Semir ban untuk membuat warna hitam terlihat pekat, mengkilap, dan bersih tahan lama.'
where id = 'prd-tire' and item_type = 'PRODUCT';
update public.services_products set
  name = 'Pengkilap Bodi (Wax Spray)',
  category = 'PERLINDUNGAN',
  description = 'Semprotan pengkilap cat instan yang memberi efek daun talas agar air dan debu tidak mudah menempel.'
where id = 'prd-wax' and item_type = 'PRODUCT';
alter table public.transactions disable trigger transactions_integrity_guard;
update public.transactions transaction_row
set item_name = catalog.name
from public.services_products catalog
where transaction_row.item_type = 'PRODUCT'
  and transaction_row.item_id = catalog.id;
alter table public.transactions enable trigger transactions_integrity_guard;
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
  local_now timestamp := clock_timestamp() at time zone 'Asia/Jakarta';
begin
  if new.booking_date > local_now::date and new.transaction_type <> 'BOOKING' then
    raise exception 'Tanggal transaksi tidak boleh melewati hari ini.';
  end if;
  if new.booking_time < time '08:00' or new.booking_time > time '21:00' then
    raise exception 'Transaksi hanya dapat dijadwalkan pukul 08.00–21.00 WIB.';
  end if;
  if new.item_type = 'SERVICE' and new.duration_minutes > 0
    and new.booking_time + make_interval(mins => new.duration_minutes) > time '21:00' then
    raise exception 'Durasi layanan harus selesai paling lambat pukul 21.00 WIB.';
  end if;
  if tg_op = 'INSERT' then
    if new.id not in ('t-11','t-12','t-13','t-14','t-15','t-16','t-17','t-18','t-19','t-20')
      and new.id not like 'rich-tx-%'
      and (local_now::time < time '08:00' or local_now::time > time '21:00') then
      raise exception 'Transaksi baru hanya dapat dibuat pada 08.00–21.00 WIB.';
    end if;
    if new.id not in ('t-11','t-12','t-13','t-14','t-15','t-16','t-17','t-18','t-19','t-20')
      and new.id not like 'rich-tx-%' then
      new.created_at := clock_timestamp();
    end if;
    if (new.transaction_type = 'SHOP' or coalesce(auth.role(), '') = 'authenticated')
      and ((new.booking_date + new.booking_time) at time zone 'Asia/Jakarta') > clock_timestamp() then
      raise exception 'Transaksi baru tidak boleh melebihi waktu saat ini.';
    end if;
  end if;
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
      if new.addon_id is not null
        or new.fulfillment_method not in ('PICKUP', 'COURIER')
        or new.shipping_fee not in (0, 10000)
        or (new.fulfillment_method = 'PICKUP' and (new.shipping_fee <> 0 or new.fulfillment_address is not null))
        or (new.fulfillment_method = 'COURIER' and (nullif(trim(new.fulfillment_address), '') is null or new.fulfillment_order_id is null))
        or new.amount <> catalog_price * new.quantity + new.shipping_fee then
        raise exception 'Nominal atau pemenuhan produk tidak valid.';
      end if;
      if new.fulfillment_method = 'COURIER'
        and ((not exists (select 1 from public.transactions where fulfillment_order_id = new.fulfillment_order_id)
            and new.shipping_fee <> 10000)
          or (exists (select 1 from public.transactions where fulfillment_order_id = new.fulfillment_order_id)
            and new.shipping_fee <> 0)) then
        raise exception 'Ongkir kurir harus dibayar satu kali per checkout.';
      end if;
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
      expected_amount := catalog_price;
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

create or replace function public.guard_transaction_wib_schedule()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  local_now timestamp := clock_timestamp() at time zone 'Asia/Jakarta';
  schedule_changed boolean;
begin
  if tg_op = 'INSERT' then
    schedule_changed := true;
  else
    schedule_changed := old.booking_date is distinct from new.booking_date
      or old.booking_time is distinct from new.booking_time
      or old.item_type is distinct from new.item_type
      or old.duration_minutes is distinct from new.duration_minutes;
  end if;
  if schedule_changed then
    if new.booking_date > local_now::date and new.transaction_type <> 'BOOKING' then
      raise exception 'Tanggal transaksi tidak boleh melewati hari ini.';
    end if;
    if new.booking_time < time '08:00' or new.booking_time > time '21:00' then
      raise exception 'Transaksi hanya dapat dijadwalkan pukul 08.00–21.00 WIB.';
    end if;
    if new.item_type = 'SERVICE' and new.duration_minutes > 0
      and new.booking_time + make_interval(mins => new.duration_minutes) > time '21:00' then
      raise exception 'Durasi layanan harus selesai paling lambat pukul 21.00 WIB.';
    end if;
  end if;
  if tg_op = 'INSERT' then
    if local_now::time < time '08:00' or local_now::time > time '21:00' then
      raise exception 'Transaksi baru hanya dapat dibuat pada 08.00–21.00 WIB.';
    end if;
    new.created_at := clock_timestamp();
  end if;
  return new;
end;
$$;

drop trigger if exists transactions_wib_schedule_guard on public.transactions;
create trigger transactions_wib_schedule_guard
before insert or update on public.transactions
for each row execute function public.guard_transaction_wib_schedule();

create or replace function public.create_demo_product_order_pending(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare
  product_row public.services_products%rowtype;
  saved_transaction public.transactions%rowtype;
  customer_id_value text := gen_random_uuid()::text;
  transaction_id_value text := gen_random_uuid()::text;
  transaction_code_value text;
  customer_name_value text;
  normalized_phone text;
  existing_customer_id text;
  existing_customer_name text;
  payment_method_value text;
  fulfillment_method_value text;
  fulfillment_address_value text;
  fulfillment_order_id_value uuid;
  shipping_fee_value integer;
  quantity_value integer;
  amount_value integer;
  request_id_value uuid;
  request_fingerprint_value text;
  existing_fingerprint text;
  existing_transaction jsonb;
begin
  if coalesce(auth.role(),'') <> 'anon' then raise exception 'Demo product endpoint accepts anonymous demo requests only.'; end if;
  if p_order is null or jsonb_typeof(p_order) <> 'object' then raise exception 'Data pesanan produk tidak valid.'; end if;
  if coalesce(p_order->>'request_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Kunci permintaan produk tidak valid. Buka kembali checkout lalu coba lagi.';
  end if;
  request_id_value := (p_order->>'request_id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended(request_id_value::text,78132));
  customer_name_value := trim(coalesce(p_order->>'customer_name',''));
  normalized_phone := regexp_replace(coalesce(p_order->>'customer_phone',''),'[^0-9]','','g');
  if normalized_phone like '0%' and length(normalized_phone) between 10 and 14 then normalized_phone := '62'||substr(normalized_phone,2); end if;
  payment_method_value := upper(trim(coalesce(p_order->>'payment_method','')));
  fulfillment_method_value := upper(trim(coalesce(p_order->>'fulfillment_method','PICKUP')));
  fulfillment_address_value := nullif(trim(coalesce(p_order->>'fulfillment_address','')), '');
  fulfillment_order_id_value := nullif(p_order->>'fulfillment_order_id','')::uuid;
  shipping_fee_value := coalesce((p_order->>'shipping_fee')::integer, 0);
  if length(customer_name_value) < 2 then raise exception 'Masukkan nama lengkap.'; end if;
  if normalized_phone !~ '^62[0-9]{8,13}$' then raise exception 'Gunakan nomor HP Indonesia yang valid.'; end if;
  if payment_method_value not in ('CASH','QRIS','E_WALLET','CARD') then raise exception 'Metode pembayaran tidak valid.'; end if;
  if fulfillment_method_value not in ('PICKUP','COURIER') then raise exception 'Metode pemenuhan produk tidak valid.'; end if;
  if shipping_fee_value not in (0,10000)
    or (fulfillment_method_value = 'PICKUP' and (shipping_fee_value <> 0 or fulfillment_address_value is not null))
    or (fulfillment_method_value = 'COURIER' and (fulfillment_address_value is null or fulfillment_order_id_value is null)) then
    raise exception 'Alamat atau biaya pengiriman tidak valid.';
  end if;
  if coalesce(p_order->>'quantity','') !~ '^[1-9][0-9]{0,2}$' then raise exception 'Jumlah produk tidak valid.'; end if;
  quantity_value := (p_order->>'quantity')::integer;
  if nullif(trim(coalesce(p_order->>'item_id','')),'') is null then raise exception 'Produk tidak valid.'; end if;
  request_fingerprint_value := encode(extensions.digest(convert_to(
    lower(customer_name_value)||chr(31)||normalized_phone||chr(31)||(p_order->>'item_id')||chr(31)
      ||quantity_value::text||chr(31)||payment_method_value
      ||case when p_order ? 'fulfillment_method' then chr(31)||fulfillment_method_value else '' end
      ||case when p_order ? 'shipping_fee' then chr(31)||shipping_fee_value::text||chr(31)||coalesce(fulfillment_address_value,'')
        ||chr(31)||coalesce(fulfillment_order_id_value::text,'') else '' end,'UTF8'),'sha256'),'hex');
  select r.request_fingerprint,to_jsonb(t) into existing_fingerprint,existing_transaction
  from private.demo_transaction_registry r join public.transactions t on t.id=r.transaction_id
  where r.request_id=request_id_value for update of r;
  if found then
    if existing_fingerprint is distinct from request_fingerprint_value then
      raise exception 'Kunci checkout sudah digunakan untuk data berbeda. Ubah pesanan lalu coba lagi.';
    end if;
    return existing_transaction;
  end if;
  select * into product_row from public.services_products
  where id=p_order->>'item_id' and item_type='PRODUCT' and active=true for update;
  if not found then raise exception 'Produk tidak ditemukan atau tidak aktif.'; end if;
  if product_row.stock<quantity_value then raise exception 'Stok produk tidak mencukupi.'; end if;
  if product_row.price::bigint*quantity_value+shipping_fee_value>2147483647 then raise exception 'Nominal pesanan melebihi batas.'; end if;
  amount_value := product_row.price*quantity_value+shipping_fee_value;
  select id,full_name into existing_customer_id,existing_customer_name from public.customers
  where regexp_replace(phone,'[^0-9]','','g') in (normalized_phone,'0'||substr(normalized_phone,3))
  order by created_at limit 1 for update;
  if found then
    customer_id_value := existing_customer_id;
    if lower(trim(existing_customer_name))<>lower(customer_name_value) then raise exception 'Nomor pelanggan sudah terdaftar dengan nama berbeda. Hubungi studio.'; end if;
  else
    insert into public.customers(id,full_name,phone,address) values(customer_id_value,customer_name_value,'+'||normalized_phone,'');
  end if;
  update public.services_products set stock=stock-quantity_value,updated_at=now()
  where id=product_row.id and stock>=quantity_value;
  if not found then raise exception 'Stok produk berubah. Periksa keranjang lalu coba lagi.'; end if;
  transaction_code_value := 'RS-'||to_char(timezone('Asia/Jakarta',clock_timestamp()),'YYMMDD')||'-'
    ||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.transactions(
    id,code,customer_id,vehicle_id,item_id,item_type,item_name,quantity,amount,
    payment_method,payment_status,refund_status,transaction_type,transaction_status,
    queue_status,booking_date,booking_time,duration_minutes,bay_number,fulfillment_method,
    fulfillment_address,fulfillment_order_id,shipping_fee
  ) values (
    transaction_id_value,transaction_code_value,customer_id_value,null,product_row.id,'PRODUCT',
    product_row.name,quantity_value,amount_value,payment_method_value,'PENDING','NONE','SHOP','PENDING',
    'WAITING',(timezone('Asia/Jakarta',clock_timestamp()))::date,
    (timezone('Asia/Jakarta',clock_timestamp()))::time,0,null,fulfillment_method_value,
    fulfillment_address_value,fulfillment_order_id_value,shipping_fee_value
  ) returning * into saved_transaction;
  insert into private.demo_transaction_registry(transaction_id,request_id,request_fingerprint)
  values(transaction_id_value,request_id_value,request_fingerprint_value);
  return to_jsonb(saved_transaction);
exception when unique_violation then
  raise exception using errcode='23505', message='Nomor HP atau permintaan checkout sudah digunakan. Periksa data lalu coba lagi.';
end;
$$;

create or replace function public.create_demo_product_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare
  saved_transaction jsonb;
begin
  if coalesce(auth.role(),'') <> 'anon' then raise exception 'Demo product endpoint accepts anonymous demo requests only.'; end if;
  if p_order is null or coalesce(p_order->>'request_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Kunci permintaan produk tidak valid.';
  end if;
  saved_transaction := public.create_demo_product_order_pending(p_order);
  return private.simulate_demo_payment(saved_transaction->>'id',(p_order->>'request_id')::uuid);
end;
$$;

create or replace function public.record_product_sale(p_transaction jsonb)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  owner_id text;
  product public.services_products%rowtype;
  sale_quantity integer;
  new_stock integer;
  payment_method_value text;
  fulfillment_method_value text;
  fulfillment_address_value text;
  fulfillment_order_id_value uuid;
  shipping_fee_value integer;
begin
  if p_transaction is null or jsonb_typeof(p_transaction) <> 'object' then raise exception 'Payload pesanan tidak valid.'; end if;
  if public.is_rinse_admin() then owner_id := p_transaction ->> 'customer_id';
  else owner_id := public.current_verified_customer_id(); end if;
  if owner_id is null or p_transaction ->> 'customer_id' is distinct from owner_id then
    raise exception 'Pesanan hanya dapat dibuat untuk profil customer yang terverifikasi.';
  end if;
  sale_quantity := (p_transaction ->> 'quantity')::integer;
  if sale_quantity is null or sale_quantity <= 0 then raise exception 'Jumlah produk tidak valid.'; end if;
  payment_method_value := p_transaction ->> 'payment_method';
  if payment_method_value is null or payment_method_value not in ('CASH','QRIS','E_WALLET','CARD') then raise exception 'Metode pembayaran tidak valid.'; end if;
  fulfillment_method_value := upper(coalesce(p_transaction ->> 'fulfillment_method','PICKUP'));
  if fulfillment_method_value not in ('PICKUP','COURIER') then raise exception 'Metode pemenuhan produk tidak valid.'; end if;
  fulfillment_address_value := nullif(trim(coalesce(p_transaction ->> 'fulfillment_address','')), '');
  fulfillment_order_id_value := nullif(p_transaction ->> 'fulfillment_order_id','')::uuid;
  shipping_fee_value := coalesce((p_transaction ->> 'shipping_fee')::integer, 0);
  if shipping_fee_value not in (0,10000)
    or (fulfillment_method_value = 'PICKUP' and (shipping_fee_value <> 0 or fulfillment_address_value is not null))
    or (fulfillment_method_value = 'COURIER' and (fulfillment_address_value is null or fulfillment_order_id_value is null)) then
    raise exception 'Alamat atau biaya pengiriman tidak valid.';
  end if;
  select * into product from public.services_products
  where id=p_transaction ->> 'item_id' and item_type='PRODUCT' and active for update;
  if not found then raise exception 'Produk tidak ditemukan atau tidak aktif.'; end if;
  if product.stock<sale_quantity then raise exception 'Stok produk tidak mencukupi.'; end if;
  update public.services_products set stock=stock-sale_quantity,updated_at=now()
  where id=product.id returning stock into new_stock;
  insert into public.transactions(
    id,code,customer_id,vehicle_id,item_id,item_type,item_name,quantity,amount,
    payment_method,payment_status,refund_status,transaction_type,transaction_status,
    queue_status,booking_date,booking_time,duration_minutes,fulfillment_method,
    fulfillment_address,fulfillment_order_id,shipping_fee,created_at
  ) values (
    p_transaction ->> 'id',p_transaction ->> 'code',owner_id,null,product.id,'PRODUCT',product.name,
    sale_quantity,product.price*sale_quantity+shipping_fee_value,payment_method_value,'PENDING','NONE','SHOP','PENDING','WAITING',
    (p_transaction ->> 'booking_date')::date,(p_transaction ->> 'booking_time')::time,0,
    fulfillment_method_value,fulfillment_address_value,fulfillment_order_id_value,shipping_fee_value,now()
  );
  return new_stock;
end;
$$;

revoke all on function public.create_demo_product_order_pending(jsonb) from public, anon, authenticated;
revoke all on function public.create_demo_product_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_demo_product_order(jsonb) to anon;
revoke all on function public.record_product_sale(jsonb) from public, anon;
grant execute on function public.record_product_sale(jsonb) to authenticated;

notify pgrst, 'reload schema';
commit;