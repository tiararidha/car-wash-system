begin;

do $$
declare
  trigger_oid oid;
  trigger_definition text;
begin
  if to_regclass('private.demo_transaction_registry') is null
    or not exists (
      select 1 from information_schema.columns
      where table_schema='private' and table_name='demo_transaction_registry' and column_name='request_id' and data_type='uuid'
    )
    or not exists (
      select 1 from information_schema.columns
      where table_schema='private' and table_name='demo_transaction_registry' and column_name='request_fingerprint' and data_type='text'
    ) then
    raise exception 'Demo product preflight failed: versioned private registry and idempotency columns are required.';
  end if;
  if to_regprocedure('extensions.digest(bytea,text)') is null
    or not has_function_privilege('authenticated','public.record_product_sale(jsonb)','EXECUTE') then
    raise exception 'Demo product preflight failed: pgcrypto and authenticated legacy product sale access must remain available.';
  end if;
  if not exists (
    select 1 from pg_index i
    where i.indrelid='private.demo_transaction_registry'::regclass
      and i.indisunique
      and pg_get_indexdef(i.indexrelid) ilike '%(request_id)%'
  ) then
    raise exception 'Demo product preflight failed: a unique request_id index is required on the private registry.';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_roles r on r.oid=p.proowner
    where p.oid='public.create_demo_service_order(jsonb)'::regprocedure and p.prosecdef and r.rolbypassrls
  ) then
    raise exception 'Demo product preflight failed: the demo order SECURITY DEFINER owner must be able to pass enabled RLS safely.';
  end if;
  select t.tgfoid, pg_get_triggerdef(t.oid,true) into trigger_oid,trigger_definition
  from pg_trigger t
  where t.tgrelid='public.transactions'::regclass
    and t.tgname='transactions_integrity_guard' and t.tgenabled<>'D' and not t.tgisinternal;
  if trigger_oid is distinct from to_regprocedure('public.guard_transaction_integrity()')
    or upper(trigger_definition) not like '%BEFORE INSERT%' then
    raise exception 'Demo product preflight failed: transaction integrity trigger is required.';
  end if;
  if not has_table_privilege('anon','public.services_products','SELECT') then
    raise exception 'Demo product preflight failed: public active-catalog reads must remain available.';
  end if;
end;
$$;

create or replace function public.create_demo_product_order(p_order jsonb)
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
  quantity_value integer;
  amount_value integer;
  request_id_value uuid;
  request_fingerprint_value text;
  existing_fingerprint text;
  existing_transaction jsonb;
begin
  if coalesce(auth.role(),'')<>'anon' then
    raise exception 'Demo product endpoint accepts anonymous demo requests only.';
  end if;
  if p_order is null or jsonb_typeof(p_order)<>'object' then
    raise exception 'Data pesanan produk tidak valid.';
  end if;
  if coalesce(p_order->>'request_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Kunci permintaan produk tidak valid. Buka kembali checkout lalu coba lagi.';
  end if;
  request_id_value := (p_order->>'request_id')::uuid;
  perform pg_advisory_xact_lock(hashtextextended(request_id_value::text,78132));

  customer_name_value := trim(coalesce(p_order->>'customer_name',''));
  normalized_phone := regexp_replace(coalesce(p_order->>'customer_phone',''),'[^0-9]','','g');
  if normalized_phone like '0%' and length(normalized_phone) between 10 and 14 then
    normalized_phone := '62'||substr(normalized_phone,2);
  end if;
  payment_method_value := upper(trim(coalesce(p_order->>'payment_method','')));
  if length(customer_name_value)<2 then raise exception 'Masukkan nama lengkap.'; end if;
  if normalized_phone !~ '^62[0-9]{8,13}$' then raise exception 'Gunakan nomor HP Indonesia yang valid.'; end if;
  if payment_method_value not in ('CASH','QRIS','E_WALLET','CARD') then raise exception 'Metode pembayaran tidak valid.'; end if;
  if coalesce(p_order->>'quantity','') !~ '^[1-9][0-9]{0,2}$' then raise exception 'Jumlah produk tidak valid.'; end if;
  quantity_value := (p_order->>'quantity')::integer;
  if nullif(trim(coalesce(p_order->>'item_id','')),'') is null then raise exception 'Produk tidak valid.'; end if;

  request_fingerprint_value := encode(extensions.digest(convert_to(
    lower(customer_name_value)||chr(31)||normalized_phone||chr(31)||(p_order->>'item_id')||chr(31)
      ||quantity_value::text||chr(31)||payment_method_value,'UTF8'),'sha256'),'hex');
  select r.request_fingerprint,to_jsonb(t) into existing_fingerprint,existing_transaction
  from private.demo_transaction_registry r
  join public.transactions t on t.id=r.transaction_id
  where r.request_id=request_id_value
  for update of r;
  if found then
    if existing_fingerprint is distinct from request_fingerprint_value then
      raise exception 'Kunci checkout sudah digunakan untuk data berbeda. Ubah pesanan lalu kirim ulang.';
    end if;
    return existing_transaction;
  end if;

  select * into product_row
  from public.services_products
  where id=p_order->>'item_id' and item_type='PRODUCT' and active=true
  for update;
  if not found then raise exception 'Produk tidak ditemukan atau tidak aktif.'; end if;
  if product_row.stock<quantity_value then raise exception 'Stok produk tidak mencukupi.'; end if;
  if product_row.price::bigint*quantity_value>2147483647 then raise exception 'Nominal pesanan melebihi batas.'; end if;
  amount_value := product_row.price*quantity_value;

  select id,full_name into existing_customer_id,existing_customer_name
  from public.customers
  where regexp_replace(phone,'[^0-9]','','g') in (normalized_phone,'0'||substr(normalized_phone,3))
  order by created_at
  limit 1
  for update;
  if found then
    customer_id_value := existing_customer_id;
    if lower(trim(existing_customer_name))<>lower(customer_name_value) then
      raise exception 'Nomor pelanggan sudah terdaftar dengan nama berbeda. Hubungi studio.';
    end if;
  else
    insert into public.customers(id,full_name,phone,address)
    values(customer_id_value,customer_name_value,'+'||normalized_phone,'');
  end if;

  update public.services_products
  set stock=stock-quantity_value,updated_at=now()
  where id=product_row.id and stock>=quantity_value;
  if not found then raise exception 'Stok produk berubah. Periksa keranjang lalu coba lagi.'; end if;

  transaction_code_value := 'RS-'||to_char(timezone('Asia/Jakarta',clock_timestamp()),'YYMMDD')||'-'
    ||upper(substr(replace(gen_random_uuid()::text,'-',''),1,8));
  insert into public.transactions(
    id,code,customer_id,vehicle_id,item_id,item_type,item_name,quantity,amount,
    payment_method,payment_status,refund_status,transaction_type,transaction_status,
    queue_status,booking_date,booking_time,duration_minutes,bay_number
  ) values (
    transaction_id_value,transaction_code_value,customer_id_value,null,product_row.id,'PRODUCT',
    product_row.name,quantity_value,amount_value,payment_method_value,'PENDING','NONE','SHOP','PENDING',
    'WAITING',(timezone('Asia/Jakarta',clock_timestamp()))::date,
    (timezone('Asia/Jakarta',clock_timestamp()))::time,0,null
  ) returning * into saved_transaction;

  insert into private.demo_transaction_registry(transaction_id,request_id,request_fingerprint)
  values(transaction_id_value,request_id_value,request_fingerprint_value);
  return to_jsonb(saved_transaction);
exception
  when unique_violation then
    raise exception using errcode='23505',
      message='Nomor HP atau permintaan checkout sudah digunakan. Periksa data lalu coba lagi.';
end;
$$;

revoke all on function public.create_demo_product_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_demo_product_order(jsonb) to anon;

commit;
