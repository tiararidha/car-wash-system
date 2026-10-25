begin;

create or replace function public.get_demo_admin_snapshot()
returns jsonb
language sql
stable
security definer
set search_path = pg_catalog, public, private, pg_temp
as $$
  with demo_transactions as materialized (
    select transaction_row.*
    from private.demo_transaction_registry registry
    join public.transactions transaction_row on transaction_row.id = registry.transaction_id
    order by transaction_row.created_at desc
    limit 500
  ),
  admin_view as (
    select coalesce(auth.jwt() -> 'app_metadata' ->> 'rinse_role', '') = 'admin' as enabled
  )
  select jsonb_build_object(
    'customers', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', customer_row.id,
        'full_name', case when admin_view.enabled
          then coalesce(customer_row.full_name, 'Pelanggan')
          else private.demo_realistic_name(customer_row.id) end,
        'phone', case when admin_view.enabled then customer_row.phone else 'disamarkan' end,
        'address', case when admin_view.enabled then customer_row.address else '' end,
        'created_at', customer_row.created_at
      ) order by customer_row.created_at desc)
      from public.customers customer_row
      cross join admin_view
      where exists (select 1 from demo_transactions row_tx where row_tx.customer_id = customer_row.id)
    ), '[]'::jsonb),
    'vehicles', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', vehicle_row.id,
        'customer_id', vehicle_row.customer_id,
        'type', vehicle_row.type,
        'plate', case when admin_view.enabled
          then coalesce(vehicle_row.plate, vehicle_row.id, '-')
          else private.demo_realistic_plate(vehicle_row.id) end,
        'model', case when admin_view.enabled
          then coalesce(vehicle_row.model, '')
          else private.demo_realistic_model(vehicle_row.id, vehicle_row.type) end,
        'created_at', vehicle_row.created_at
      ) order by vehicle_row.created_at desc)
      from public.vehicles vehicle_row
      cross join admin_view
      where exists (select 1 from demo_transactions row_tx where row_tx.vehicle_id = vehicle_row.id)
    ), '[]'::jsonb),
    'services_products', coalesce((
      select jsonb_agg(to_jsonb(item_row) order by item_row.name)
      from (
        select id, item_type, name, category, type, description, price, duration,
          stock, min_stock, active, image, created_at, updated_at
        from public.services_products catalog_item
        where catalog_item.active = true
          or exists (select 1 from demo_transactions row_tx where row_tx.item_id = catalog_item.id)
      ) item_row
    ), '[]'::jsonb),
    'transactions', coalesce((
      select jsonb_agg(
        to_jsonb(transaction_row) || jsonb_build_object(
          'customer_name', case when admin_view.enabled then coalesce(
            customer_row.full_name,
            nullif(to_jsonb(transaction_row) ->> 'notes', ''),
            'Pelanggan'
          ) else private.demo_realistic_name(customer_row.id) end
        ) order by transaction_row.created_at desc
      )
      from demo_transactions transaction_row
      join public.customers customer_row on customer_row.id = transaction_row.customer_id
      cross join admin_view
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.get_demo_admin_snapshot() from public, anon, authenticated;
grant execute on function public.get_demo_admin_snapshot() to anon, authenticated;

notify pgrst, 'reload schema';
commit;
