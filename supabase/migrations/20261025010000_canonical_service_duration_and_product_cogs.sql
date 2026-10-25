begin;

update public.services_products
set duration = case id
  when 'svc-self-moto' then 20
  when 'svc-self-car' then 30
  when 'svc-moto' then 35
  when 'svc-car' then 50
end,
updated_at = now()
where item_type = 'SERVICE'
  and id in ('svc-self-moto', 'svc-self-car', 'svc-moto', 'svc-car');

update public.transactions
set duration_minutes = case item_id
  when 'svc-self-moto' then 20
  when 'svc-self-car' then 30
  when 'svc-moto' then 35
  when 'svc-car' then 50
end
where item_type = 'SERVICE'
  and item_id in ('svc-self-moto', 'svc-self-car', 'svc-moto', 'svc-car');

alter table public.services_products
  add column if not exists unit_cost integer check (unit_cost is null or unit_cost >= 0);

alter table public.transactions
  add column if not exists cogs_amount integer check (cogs_amount is null or cogs_amount >= 0);

revoke select on public.services_products from public, anon, authenticated;
grant select (id, item_type, name, category, type, description, price, duration, stock, min_stock, active, image)
  on public.services_products to anon;
grant select on public.services_products to authenticated;

do $$
declare
  existing_policy record;
begin
  for existing_policy in
    select policyname
    from pg_policies
    where schemaname = 'public' and tablename = 'services_products'
  loop
    execute format('drop policy %I on public.services_products', existing_policy.policyname);
  end loop;
end;
$$;

create policy "Public catalog read" on public.services_products
  for select to anon using (active = true);
create policy "Role-gated catalog and HPP access" on public.services_products
  for all to authenticated
  using (coalesce(auth.jwt() -> 'app_metadata' ->> 'rinse_role', '') = 'admin')
  with check (coalesce(auth.jwt() -> 'app_metadata' ->> 'rinse_role', '') = 'admin');

create or replace function public.snapshot_transaction_product_cogs()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
declare
  product_unit_cost integer;
begin
  if new.item_type <> 'PRODUCT' then
    new.cogs_amount := null;
    return new;
  end if;

  select unit_cost into product_unit_cost
  from public.services_products
  where id = new.item_id and item_type = 'PRODUCT';

  if product_unit_cost is null then
    new.cogs_amount := null;
    return new;
  end if;

  if product_unit_cost::bigint * new.quantity > 2147483647 then
    raise exception 'HPP produk melebihi batas nominal transaksi.';
  end if;

  new.cogs_amount := product_unit_cost * new.quantity;
  return new;
end;
$$;

drop trigger if exists transactions_snapshot_product_cogs on public.transactions;
create trigger transactions_snapshot_product_cogs
before insert or update of item_id, item_type, quantity
on public.transactions
for each row execute function public.snapshot_transaction_product_cogs();

commit;