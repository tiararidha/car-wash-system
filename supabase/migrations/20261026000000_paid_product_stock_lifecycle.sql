begin;

create or replace function private.sync_paid_product_stock()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  old_consumed boolean := false;
  new_consumed boolean := false;
  old_product_id text;
  new_product_id text;
begin
  if tg_op = 'INSERT' then
    new_consumed := new.item_type = 'PRODUCT'
      and new.payment_status = 'PAID'
      and new.transaction_status not in ('CANCELLED', 'EXPIRED')
      and new.refund_status <> 'COMPLETED';
    if new_consumed then new_product_id := new.item_id; end if;
  elsif tg_op = 'DELETE' then
    old_consumed := old.item_type = 'PRODUCT'
      and old.payment_status = 'PAID'
      and old.transaction_status not in ('CANCELLED', 'EXPIRED')
      and old.refund_status <> 'COMPLETED';
    if old_consumed then old_product_id := old.item_id; end if;
  else
    old_consumed := old.item_type = 'PRODUCT'
      and old.payment_status = 'PAID'
      and old.transaction_status not in ('CANCELLED', 'EXPIRED')
      and old.refund_status <> 'COMPLETED';
    new_consumed := new.item_type = 'PRODUCT'
      and new.payment_status = 'PAID'
      and new.transaction_status not in ('CANCELLED', 'EXPIRED')
      and new.refund_status <> 'COMPLETED';
    if old_consumed then old_product_id := old.item_id; end if;
    if new_consumed then new_product_id := new.item_id; end if;
  end if;

  if tg_op = 'UPDATE'
    and old_consumed = new_consumed
    and (not old_consumed or (old.item_id = new.item_id and old.quantity = new.quantity)) then
    return new;
  end if;

  perform product.id
  from public.services_products product
  where product.id in (old_product_id, new_product_id)
  order by product.id
  for update;

  if old_consumed then
    update public.services_products
    set stock = stock + old.quantity, updated_at = now()
    where id = old.item_id and item_type = 'PRODUCT';
    if not found then raise exception 'Stok produk lama tidak dapat dipulihkan.'; end if;
  end if;

  if new_consumed then
    update public.services_products
    set stock = stock - new.quantity, updated_at = now()
    where id = new.item_id and item_type = 'PRODUCT' and stock >= new.quantity;
    if not found then raise exception 'Stok produk tidak mencukupi.'; end if;
  end if;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

create or replace function private.guard_pending_product_stock()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  available_stock integer;
  pending_stock integer;
begin
  if new.item_type <> 'PRODUCT'
    or new.transaction_status in ('CANCELLED', 'EXPIRED')
    or new.refund_status = 'COMPLETED'
    or current_setting('rinse.demo_product_order_pending', true) = 'on' then
    return new;
  end if;

  perform product.id
  from public.services_products product
  where product.id in (
    new.item_id,
    case when tg_op = 'UPDATE' and old.item_type = 'PRODUCT'
      and old.payment_status = 'PAID'
      and old.transaction_status not in ('CANCELLED', 'EXPIRED')
      and old.refund_status <> 'COMPLETED'
      then old.item_id end
  ) and product.item_type = 'PRODUCT'
  order by product.id
  for update;
  select stock into available_stock
  from public.services_products
  where id = new.item_id and item_type = 'PRODUCT';
  if not found then raise exception 'Produk tidak ditemukan.'; end if;

  select coalesce(sum(transaction_row.quantity), 0)::integer into pending_stock
  from public.transactions transaction_row
  where transaction_row.item_type = 'PRODUCT'
    and transaction_row.item_id = new.item_id
    and transaction_row.payment_status = 'PENDING'
    and transaction_row.transaction_status not in ('CANCELLED', 'EXPIRED')
    and transaction_row.refund_status <> 'COMPLETED'
    and transaction_row.id is distinct from new.id;
  available_stock := available_stock - pending_stock;

  if tg_op = 'UPDATE' and old.item_type = 'PRODUCT'
    and old.payment_status = 'PAID'
    and old.transaction_status not in ('CANCELLED', 'EXPIRED')
    and old.refund_status <> 'COMPLETED'
    and old.item_id = new.item_id then
    available_stock := available_stock + old.quantity;
  end if;
  if available_stock < new.quantity then raise exception 'Stok produk tidak mencukupi.'; end if;
  return new;
end;
$$;

with legacy_stock_to_restore as (
  select transaction_row.item_id, sum(transaction_row.quantity)::integer as quantity
  from public.transactions transaction_row
  join private.demo_transaction_registry registry on registry.transaction_id = transaction_row.id
  where transaction_row.item_type = 'PRODUCT'
    and (transaction_row.payment_status <> 'PAID'
      or transaction_row.transaction_status in ('CANCELLED', 'EXPIRED')
      or transaction_row.refund_status = 'COMPLETED')
  group by transaction_row.item_id
)
update public.services_products product
set stock = product.stock + legacy_stock_to_restore.quantity, updated_at = now()
from legacy_stock_to_restore
where product.id = legacy_stock_to_restore.item_id and product.item_type = 'PRODUCT';

do $$
begin
  if to_regclass('private.customer_capabilities') is not null then
    execute $restore$
      with legacy_capability_stock_to_restore as (
        select transaction_row.item_id, sum(transaction_row.quantity)::integer as quantity
        from public.transactions transaction_row
        join private.customer_capabilities capability on capability.customer_id = transaction_row.customer_id
        where transaction_row.item_type = 'PRODUCT'
          and not exists (
            select 1 from private.demo_transaction_registry registry
            where registry.transaction_id = transaction_row.id
          )
          and (transaction_row.payment_status <> 'PAID'
            or transaction_row.transaction_status in ('CANCELLED', 'EXPIRED')
            or transaction_row.refund_status = 'COMPLETED')
        group by transaction_row.item_id
      )
      update public.services_products product
      set stock = product.stock + legacy_capability_stock_to_restore.quantity, updated_at = now()
      from legacy_capability_stock_to_restore
      where product.id = legacy_capability_stock_to_restore.item_id and product.item_type = 'PRODUCT'
    $restore$;
  end if;
end;
$$;

drop trigger if exists transactions_paid_product_stock on public.transactions;
create trigger transactions_paid_product_stock
after insert or update or delete on public.transactions
for each row execute function private.sync_paid_product_stock();

drop trigger if exists transactions_pending_product_stock_guard on public.transactions;
create trigger transactions_pending_product_stock_guard
before insert or update on public.transactions
for each row execute function private.guard_pending_product_stock();

create or replace function public.create_demo_product_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  saved_transaction jsonb;
begin
  if coalesce(auth.role(), '') <> 'anon' then
    raise exception 'Demo product endpoint accepts anonymous demo requests only.';
  end if;
  if p_order is null or coalesce(p_order ->> 'request_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Kunci permintaan produk tidak valid.';
  end if;

  perform set_config('rinse.demo_product_order_pending', 'on', true);
  saved_transaction := public.create_demo_product_order_pending(p_order);
  if saved_transaction ->> 'payment_status' = 'PENDING' then
    update public.services_products
    set stock = stock + (saved_transaction ->> 'quantity')::integer, updated_at = now()
    where id = saved_transaction ->> 'item_id' and item_type = 'PRODUCT';
    if not found then raise exception 'Stok produk tidak dapat diselaraskan.'; end if;
  end if;
  return private.simulate_demo_payment(saved_transaction ->> 'id', (p_order ->> 'request_id')::uuid);
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
  payment_method_value text;
  payment_status_value text;
  fulfillment_method_value text;
  fulfillment_address_value text;
  fulfillment_order_id_value uuid;
  shipping_fee_value integer;
  amount_value bigint;
  new_stock integer;
begin
  if p_transaction is null or jsonb_typeof(p_transaction) <> 'object' then
    raise exception 'Payload pesanan tidak valid.';
  end if;
  if public.is_rinse_admin() then
    owner_id := p_transaction ->> 'customer_id';
  else
    owner_id := public.current_verified_customer_id();
  end if;
  if owner_id is null or p_transaction ->> 'customer_id' is distinct from owner_id then
    raise exception 'Pesanan hanya dapat dibuat untuk profil customer yang terverifikasi.';
  end if;

  sale_quantity := (p_transaction ->> 'quantity')::integer;
  if sale_quantity is null or sale_quantity <= 0 then raise exception 'Jumlah produk tidak valid.'; end if;
  payment_method_value := upper(coalesce(p_transaction ->> 'payment_method', ''));
  if payment_method_value not in ('CASH', 'QRIS', 'E_WALLET', 'CARD') then
    raise exception 'Metode pembayaran tidak valid.';
  end if;
  payment_status_value := upper(coalesce(p_transaction ->> 'payment_status', 'PENDING'));
  if payment_status_value not in ('PENDING', 'PAID') then
    raise exception 'Status pembayaran produk tidak valid.';
  end if;

  fulfillment_method_value := upper(coalesce(p_transaction ->> 'fulfillment_method', 'PICKUP'));
  fulfillment_address_value := nullif(trim(coalesce(p_transaction ->> 'fulfillment_address', '')), '');
  fulfillment_order_id_value := nullif(p_transaction ->> 'fulfillment_order_id', '')::uuid;
  shipping_fee_value := coalesce((p_transaction ->> 'shipping_fee')::integer, 0);
  if fulfillment_method_value not in ('PICKUP', 'COURIER') or shipping_fee_value not in (0, 10000)
    or (fulfillment_method_value = 'PICKUP' and (shipping_fee_value <> 0 or fulfillment_address_value is not null))
    or (fulfillment_method_value = 'COURIER' and (fulfillment_address_value is null or fulfillment_order_id_value is null)) then
    raise exception 'Alamat atau biaya pengiriman tidak valid.';
  end if;

  select * into product from public.services_products
  where id = p_transaction ->> 'item_id' and item_type = 'PRODUCT' and active for update;
  if not found then raise exception 'Produk tidak ditemukan atau tidak aktif.'; end if;
  if product.stock < sale_quantity then raise exception 'Stok produk tidak mencukupi.'; end if;
  amount_value := product.price::bigint * sale_quantity + shipping_fee_value;
  if amount_value > 2147483647 then raise exception 'Nominal pesanan melebihi batas.'; end if;

  insert into public.transactions (
    id, code, customer_id, vehicle_id, item_id, item_type, item_name, quantity, amount,
    payment_method, payment_status, refund_status, transaction_type, transaction_status,
    queue_status, booking_date, booking_time, duration_minutes, fulfillment_method,
    fulfillment_address, fulfillment_order_id, shipping_fee, created_at
  ) values (
    p_transaction ->> 'id', p_transaction ->> 'code', owner_id, null, product.id,
    'PRODUCT', product.name, sale_quantity, amount_value::integer,
    payment_method_value, payment_status_value, 'NONE', 'SHOP', 'PENDING', 'WAITING',
    (p_transaction ->> 'booking_date')::date, (p_transaction ->> 'booking_time')::time,
    0, fulfillment_method_value, fulfillment_address_value, fulfillment_order_id_value, shipping_fee_value, now()
  );

  select stock into new_stock from public.services_products where id = product.id;
  return new_stock;
end;
$$;

revoke all on function private.sync_paid_product_stock() from public, anon, authenticated;
revoke all on function private.guard_pending_product_stock() from public, anon, authenticated;

notify pgrst, 'reload schema';
commit;