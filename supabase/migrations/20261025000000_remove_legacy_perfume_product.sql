begin;

with legacy_products as materialized (
  select id
  from public.services_products
  where (id = 'prd-perfume' and item_type = 'PRODUCT')
    or (item_type = 'PRODUCT' and lower(trim(name)) = 'pewangi' and price = 10000)
)
delete from public.transactions transaction_row
where transaction_row.item_id = 'prd-perfume'
  or transaction_row.item_id in (select id from legacy_products)
  or transaction_row.addon_id in (select id from legacy_products)
  or (transaction_row.item_type = 'PRODUCT' and lower(trim(transaction_row.item_name)) = 'pewangi');

delete from public.services_products catalog_row
where catalog_row.item_type = 'PRODUCT'
  and ((catalog_row.id = 'prd-perfume')
    or (lower(trim(catalog_row.name)) = 'pewangi' and catalog_row.price = 10000));

notify pgrst, 'reload schema';
commit;