begin;

do $$
declare
  function_signature text;
  signatures text[] := array[
    'public.lookup_customer_by_phone(text)',
    'public.lookup_transaction_history(text)',
    'public.cancel_transaction(text,text)',
    'public.record_product_sale(jsonb)'
  ];
begin
  foreach function_signature in array signatures loop
    if to_regprocedure(function_signature) is null
      or not has_function_privilege('authenticated', function_signature, 'EXECUTE') then
      raise exception 'Anonymous RPC lockdown preflight failed: authenticated access to % must remain available.', function_signature;
    end if;
  end loop;
  if not has_function_privilege('anon', 'public.create_demo_service_order(jsonb)', 'EXECUTE')
    or not has_function_privilege('anon', 'public.get_demo_admin_snapshot()', 'EXECUTE') then
    raise exception 'Anonymous RPC lockdown preflight failed: demo order and masked snapshot access are required.';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_roles r on r.oid = p.proowner
    where p.oid = 'public.create_demo_service_order(jsonb)'::regprocedure
      and p.prosecdef and r.rolbypassrls
  ) or not has_table_privilege('anon', 'public.services_products', 'SELECT') then
    raise exception 'Anonymous RPC lockdown preflight failed: the demo definer and public catalog access must remain functional.';
  end if;
  if not (select relrowsecurity from pg_class where oid = 'public.customers'::regclass)
    or not (select relrowsecurity from pg_class where oid = 'public.vehicles'::regclass) then
    raise exception 'Anonymous RPC lockdown preflight failed: customer and vehicle RLS must remain enabled.';
  end if;
end;
$$;

revoke all on function public.lookup_customer_by_phone(text) from public, anon;
revoke all on function public.lookup_transaction_history(text) from public, anon;
revoke all on function public.cancel_transaction(text, text) from public, anon;
revoke all on function public.record_product_sale(jsonb) from public, anon;
grant execute on function public.lookup_customer_by_phone(text) to authenticated, service_role;
grant execute on function public.lookup_transaction_history(text) to authenticated, service_role;
grant execute on function public.cancel_transaction(text, text) to authenticated, service_role;
grant execute on function public.record_product_sale(jsonb) to authenticated, service_role;

revoke insert on public.customers, public.vehicles from public, anon;
drop policy if exists "Customer registration" on public.customers;
drop policy if exists "Vehicle registration" on public.vehicles;

notify pgrst, 'reload schema';
commit;
