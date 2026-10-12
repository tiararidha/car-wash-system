begin;

do $$
begin
  if to_regprocedure('public.create_demo_service_order(jsonb)') is null
    or to_regprocedure('public.create_demo_product_order(jsonb)') is null
    or not has_function_privilege('anon','public.create_demo_service_order(jsonb)','EXECUTE')
    or not has_function_privilege('anon','public.create_demo_product_order(jsonb)','EXECUTE') then
    raise exception 'Simulated payment preflight failed: both anonymous demo order RPCs must exist.';
  end if;
  if to_regclass('private.demo_transaction_registry') is null
    or not exists (
      select 1 from information_schema.columns
      where table_schema='private' and table_name='demo_transaction_registry' and column_name='request_id' and data_type='uuid'
    ) then
    raise exception 'Simulated payment preflight failed: idempotent private demo registry is required.';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_roles r on r.oid=p.proowner
    where p.oid='public.create_demo_service_order(jsonb)'::regprocedure and p.prosecdef and r.rolbypassrls
  ) or not exists (
    select 1 from pg_proc p join pg_roles r on r.oid=p.proowner
    where p.oid='public.create_demo_product_order(jsonb)'::regprocedure and p.prosecdef and r.rolbypassrls
  ) then
    raise exception 'Simulated payment preflight failed: demo order RPC owners must retain SECURITY DEFINER and RLS bypass.';
  end if;
  if position('rinse.payment_update' in pg_get_functiondef('public.guard_transaction_integrity()'::regprocedure))=0
    or not exists (
      select 1 from pg_trigger t
      where t.tgrelid='public.transactions'::regclass
        and t.tgname='transactions_integrity_guard'
        and t.tgenabled<>'D' and not t.tgisinternal
        and t.tgfoid='public.guard_transaction_integrity()'::regprocedure
    ) then
    raise exception 'Simulated payment preflight failed: payment-update integrity guard must remain enabled.';
  end if;
end;
$$;

alter function public.create_demo_service_order(jsonb) rename to create_demo_service_order_pending;
alter function public.create_demo_product_order(jsonb) rename to create_demo_product_order_pending;

revoke all on function public.create_demo_service_order_pending(jsonb) from public, anon, authenticated;
revoke all on function public.create_demo_product_order_pending(jsonb) from public, anon, authenticated;

create or replace function private.simulate_demo_payment(p_transaction_id text, p_request_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
declare
  saved_transaction public.transactions%rowtype;
begin
  if coalesce(auth.role(),'')<>'anon' then
    raise exception 'Simulated demo payment accepts anonymous demo requests only.';
  end if;
  select transaction_row.* into saved_transaction
  from private.demo_transaction_registry registry
  join public.transactions transaction_row on transaction_row.id=registry.transaction_id
  where registry.request_id=p_request_id and transaction_row.id=p_transaction_id
  for update of registry,transaction_row;
  if not found then raise exception 'Order demo tidak ditemukan untuk simulasi pembayaran.'; end if;
  if saved_transaction.payment_status='PAID' then return to_jsonb(saved_transaction); end if;
  if saved_transaction.payment_status<>'PENDING' or saved_transaction.refund_status<>'NONE' then
    raise exception 'Status order tidak dapat diselesaikan oleh simulasi pembayaran.';
  end if;

  perform set_config('rinse.payment_update','on',true);
  update public.transactions
  set payment_status='PAID',
      transaction_status=case when transaction_type='BOOKING' then 'BOOKED' else transaction_status end
  where id=saved_transaction.id
  returning * into saved_transaction;
  if not found or saved_transaction.payment_status<>'PAID' then
    raise exception 'Database tidak mengonfirmasi simulasi pembayaran.';
  end if;
  return to_jsonb(saved_transaction);
end;
$$;
revoke all on function private.simulate_demo_payment(text,uuid) from public, anon, authenticated;

create or replace function public.create_demo_service_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare
  saved_transaction jsonb;
begin
  if coalesce(auth.role(),'')<>'anon' then
    raise exception 'Demo order endpoint accepts anonymous demo requests only.';
  end if;
  if p_order is null or coalesce(p_order->>'request_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Kunci permintaan order tidak valid.';
  end if;
  saved_transaction := public.create_demo_service_order_pending(p_order);
  return private.simulate_demo_payment(saved_transaction->>'id',(p_order->>'request_id')::uuid);
end;
$$;
revoke all on function public.create_demo_service_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_demo_service_order(jsonb) to anon;

create or replace function public.create_demo_product_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare
  saved_transaction jsonb;
begin
  if coalesce(auth.role(),'')<>'anon' then
    raise exception 'Demo product endpoint accepts anonymous demo requests only.';
  end if;
  if p_order is null or coalesce(p_order->>'request_id','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Kunci permintaan produk tidak valid.';
  end if;
  saved_transaction := public.create_demo_product_order_pending(p_order);
  return private.simulate_demo_payment(saved_transaction->>'id',(p_order->>'request_id')::uuid);
end;
$$;
revoke all on function public.create_demo_product_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_demo_product_order(jsonb) to anon;

notify pgrst,'reload schema';
commit;
