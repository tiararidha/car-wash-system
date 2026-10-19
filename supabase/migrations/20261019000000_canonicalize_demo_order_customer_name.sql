begin;

do $$
begin
  if to_regprocedure('public.create_demo_service_order_pending(jsonb)') is null
    or to_regprocedure('private.simulate_demo_payment(text,uuid)') is null then
    raise exception 'Customer name canonicalization preflight failed: simulated service order functions are required.';
  end if;
end;
$$;

create or replace function public.create_demo_service_order(p_order jsonb)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, private, extensions, pg_temp
as $$
declare
  saved_transaction jsonb;
  normalized_phone text;
  existing_customer_name text;
begin
  if coalesce(auth.role(), '') <> 'anon' then
    raise exception 'Demo order endpoint accepts anonymous demo requests only.';
  end if;
  if p_order is null or coalesce(p_order ->> 'request_id', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    raise exception 'Kunci permintaan order tidak valid.';
  end if;

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
  return private.simulate_demo_payment(saved_transaction ->> 'id', (p_order ->> 'request_id')::uuid);
end;
$$;

revoke all on function public.create_demo_service_order(jsonb) from public, anon, authenticated;
grant execute on function public.create_demo_service_order(jsonb) to anon;

notify pgrst, 'reload schema';
commit;