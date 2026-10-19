-- CUSTOMER CAPABILITY OWNERSHIP MIGRATION
-- Apply only on an isolated staging database prepared from a reviewed baseline:
-- schema.sql -> rls-authenticated-access.sql -> self-service-bay-live-migration.sql
-- -> business-flow-hardening.sql -> catalog-revision.sql -> optional fixture-only
-- t-20-seed-reconciliation.sql -> booking-seed-payment-reconciliation.sql
-- -> admin-role-authorization-proposal.sql -> multi-addon-booking-integrity-proposal.sql
-- -> this migration as the final customer/RPC definition.
-- Do not execute schema.sql, seeds, or state-changing migrations against a populated
-- database without a reviewed upgrade plan. Keep app traffic disabled until complete.
-- This migration enables OTP-free guest ownership with a random 256-bit browser
-- capability. The raw token is never stored in PostgreSQL; only SHA-256 is stored.
-- Customer ownership is per profile, not proof that a typed phone number belongs
-- to the visitor. Existing profiles have no token and stay inaccessible to guests.
-- This migration provides no legacy-profile linking RPC; linking requires a
-- separately reviewed trusted process outside this application.
-- Do not run on production without staging tests and approval.
begin;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.customer_capabilities (
  customer_id text primary key references public.customers(id) on delete cascade,
  owner_token_hash bytea not null unique
);
revoke all on table private.customer_capabilities from public, anon, authenticated;

-- Migrate hashes from an earlier draft without leaving the hash in the API schema.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customers' and column_name = 'owner_token_hash'
  ) then
    execute 'insert into private.customer_capabilities(customer_id, owner_token_hash) '
      || 'select id, owner_token_hash from public.customers where owner_token_hash is not null '
      || 'on conflict (customer_id) do update set owner_token_hash = excluded.owner_token_hash';
    execute 'alter table public.customers drop column owner_token_hash';
  end if;
end;
$$;

create or replace function public.ensure_customer_capability_profile(
  p_customer_id text,
  p_full_name text,
  p_phone text,
  p_address text,
  p_owner_token text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  existing_customer public.customers%rowtype;
  token_hash bytea;
  stored_token_hash bytea;
begin
  if p_owner_token is null or p_owner_token !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception 'Kunci akses customer tidak valid.';
  end if;
  if p_customer_id is null or length(trim(p_customer_id)) < 8
    or length(trim(coalesce(p_full_name, ''))) < 2
    or public.normalize_indonesian_phone(p_phone) is null then
    raise exception 'Data customer tidak valid.';
  end if;

  token_hash := digest(p_owner_token, 'sha256');
  select * into existing_customer
  from public.customers
  where id = p_customer_id
  for update;

  if found then
    select owner_token_hash into stored_token_hash
    from private.customer_capabilities where customer_id = p_customer_id;
    if stored_token_hash is distinct from token_hash
      or public.normalize_indonesian_phone(existing_customer.phone)
        is distinct from public.normalize_indonesian_phone(p_phone) then
      raise exception 'Profil customer tidak dapat diakses.';
    end if;
  else
    begin
      insert into public.customers(id, full_name, phone, address)
      values (p_customer_id, trim(p_full_name), trim(p_phone), coalesce(p_address, ''));
    exception when unique_violation then
      raise exception 'Profil untuk nomor ini sudah ada. Minta Admin memverifikasi dan menautkan profil.';
    end;
    insert into private.customer_capabilities(customer_id, owner_token_hash)
    values (p_customer_id, token_hash);
  end if;

  perform set_config('rinse.customer_owner_id', p_customer_id, true);
  perform set_config('rinse.customer_owner_token', p_owner_token, true);
  perform set_config('rinse.customer_owner_verified', 'on', true);
  return p_customer_id;
end;
$$;

revoke all on function public.ensure_customer_capability_profile(text, text, text, text, text)
  from public, anon, authenticated;

create or replace function public.current_verified_customer_id()
returns text
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  owner_id text := nullif(current_setting('rinse.customer_owner_id', true), '');
  owner_token text := nullif(current_setting('rinse.customer_owner_token', true), '');
  matched_id text;
begin
  if current_setting('rinse.customer_owner_verified', true) is distinct from 'on'
    or owner_id is null or owner_token is null then
    raise exception 'Kunci akses customer diperlukan.';
  end if;
  select c.id into matched_id from public.customers c
  join private.customer_capabilities capability on capability.customer_id = c.id
  where c.id = owner_id and capability.owner_token_hash = digest(owner_token, 'sha256');
  if not found then raise exception 'Profil customer tidak dapat diakses.'; end if;
  return matched_id;
end;
$$;

create or replace function public.customer_owns_vehicle(p_customer_id text, p_vehicle_id text)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
  select p_customer_id = public.current_verified_customer_id()
    and exists (
      select 1 from public.vehicles v
      where v.id = p_vehicle_id and v.customer_id = p_customer_id
    );
$$;

revoke all on function public.current_verified_customer_id() from public, anon, authenticated;
revoke all on function public.customer_owns_vehicle(text, text) from public, anon;
grant execute on function public.customer_owns_vehicle(text, text) to authenticated;

create or replace function public.lookup_customer_profile_by_capability(p_phone text, p_owner_token text)
returns table(
  customer_id text, full_name text, phone text, vehicle_id text, vehicle_type text,
  vehicle_plate text, vehicle_model text, customer_address text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  token_hash bytea;
begin
  if p_owner_token is null or p_owner_token !~ '^[A-Za-z0-9_-]{43}$' then
    return;
  end if;
  token_hash := digest(p_owner_token, 'sha256');
  return query
  select c.id, c.full_name, c.phone, v.id, v.type, v.plate, v.model, c.address
  from public.customers c
  left join public.vehicles v on v.customer_id = c.id
  join private.customer_capabilities capability on capability.customer_id = c.id
  where capability.owner_token_hash = token_hash
    and public.normalize_indonesian_phone(c.phone)
      = public.normalize_indonesian_phone(p_phone);
end;
$$;

create or replace function public.create_service_booking_with_capability(
  p_transaction jsonb,
  p_addon_id text,
  p_owner_token text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  owner_id text;
  requested_vehicle_id text := p_transaction ->> 'vehicle_id';
  vehicle_owner text;
  saved jsonb;
begin
  if p_transaction is null or jsonb_typeof(p_transaction) <> 'object' then
    raise exception 'Payload booking tidak valid.';
  end if;
  owner_id := public.ensure_customer_capability_profile(
    p_transaction ->> 'customer_id', p_transaction ->> 'customer_name',
    p_transaction ->> 'customer_phone', coalesce(p_transaction ->> 'customer_address', ''),
    p_owner_token
  );

  select customer_id into vehicle_owner from public.vehicles where id = requested_vehicle_id;
  if found then
    if vehicle_owner <> owner_id then raise exception 'Kendaraan tidak dimiliki profil customer ini.'; end if;
  else
    if requested_vehicle_id is null
      or p_transaction ->> 'vehicle_type' not in ('CAR', 'MOTOR')
      or length(trim(coalesce(p_transaction ->> 'vehicle_plate', ''))) < 4 then
      raise exception 'Data kendaraan tidak valid.';
    end if;
    begin
      insert into public.vehicles(id, customer_id, type, plate, model)
      values (requested_vehicle_id, owner_id, p_transaction ->> 'vehicle_type',
        upper(trim(p_transaction ->> 'vehicle_plate')),
        coalesce(nullif(trim(p_transaction ->> 'vehicle_model'), ''), 'Kendaraan'));
    exception when unique_violation then
      raise exception 'Kendaraan tidak dapat ditautkan ke profil ini.';
    end;
  end if;

  perform set_config('rinse.customer_owner_id', owner_id, true);
  perform set_config('rinse.customer_owner_token', p_owner_token, true);
  perform set_config('rinse.customer_owner_verified', 'on', true);
  saved := public.record_service_transaction(p_transaction, p_addon_id);
  return saved;
end;
$$;

create or replace function public.create_product_sale_with_capability(
  p_transaction jsonb,
  p_owner_token text
)
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  owner_id text;
  sale jsonb;
  new_stock integer;
begin
  if p_transaction is null or jsonb_typeof(p_transaction) <> 'object' then
    raise exception 'Payload pesanan tidak valid.';
  end if;
  owner_id := public.ensure_customer_capability_profile(
    p_transaction ->> 'customer_id', p_transaction ->> 'customer_name',
    p_transaction ->> 'customer_phone', '', p_owner_token
  );
  perform set_config('rinse.customer_owner_id', owner_id, true);
  perform set_config('rinse.customer_owner_token', p_owner_token, true);
  perform set_config('rinse.customer_owner_verified', 'on', true);
  new_stock := public.record_product_sale(p_transaction);
  return new_stock;
end;
$$;

-- Keep the legacy RPC callable by admins while deriving guest ownership only from
-- the transaction-local capability context set by the wrapper above.
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
  payment_method_value := p_transaction ->> 'payment_method';
  if payment_method_value is null or payment_method_value not in ('CASH', 'QRIS', 'E_WALLET', 'CARD') then
    raise exception 'Metode pembayaran tidak valid.';
  end if;
  select * into product from public.services_products
  where id = p_transaction ->> 'item_id' and item_type = 'PRODUCT' and active for update;
  if not found then raise exception 'Produk tidak ditemukan atau tidak aktif.'; end if;
  if product.stock < sale_quantity then raise exception 'Stok produk tidak mencukupi.'; end if;
  update public.services_products set stock = stock - sale_quantity, updated_at = now()
  where id = product.id returning stock into new_stock;
  insert into public.transactions (
    id, code, customer_id, vehicle_id, item_id, item_type, item_name, quantity, amount,
    payment_method, payment_status, refund_status, transaction_type, transaction_status,
    queue_status, booking_date, booking_time, duration_minutes, created_at
  ) values (
    p_transaction ->> 'id', p_transaction ->> 'code', owner_id, null, product.id,
    'PRODUCT', product.name, sale_quantity, product.price * sale_quantity,
    payment_method_value, 'PENDING', 'NONE', 'SHOP', 'PENDING', 'WAITING',
    (p_transaction ->> 'booking_date')::date, (p_transaction ->> 'booking_time')::time,
    0, now()
  );
  return new_stock;
end;
$$;

drop function if exists public.lookup_customer_history_with_capability(text, text);
create function public.lookup_customer_history_with_capability(
  p_search text,
  p_owner_token text
)
returns table(
  transaction_id text, code text, item_name text, item_type text, amount integer,
  payment_method text, payment_status text, transaction_type text, transaction_status text,
  booking_date date, booking_time time, duration_minutes integer, customer_name text,
  vehicle_type text, vehicle_plate text, vehicle_model text, refund_status text, bay_number integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  owner_id text;
  search_value text := trim(coalesce(p_search, ''));
begin
  if p_owner_token is null or p_owner_token !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception 'Kunci akses customer tidak valid.';
  end if;
  select customer_id into owner_id from private.customer_capabilities
  where owner_token_hash = digest(p_owner_token, 'sha256');
  if owner_id is null then raise exception 'Profil customer tidak dapat diakses.'; end if;
  return query
  select t.id, t.code, t.item_name, t.item_type, t.amount, t.payment_method, t.payment_status,
    t.transaction_type, t.transaction_status, t.booking_date, t.booking_time, t.duration_minutes,
    c.full_name, v.type, v.plate, v.model, t.refund_status, t.bay_number
  from public.transactions t
  join public.customers c on c.id = t.customer_id
  left join public.vehicles v on v.id = t.vehicle_id and v.customer_id = t.customer_id
  where t.customer_id = owner_id
    and (search_value = '' or lower(t.code) = lower(search_value)
      or lower(regexp_replace(coalesce(v.plate, ''), '[[:space:]]', '', 'g'))
        = lower(regexp_replace(search_value, '[[:space:]]', '', 'g')));
end;
$$;

drop function if exists public.cancel_customer_booking_with_capability(text, text, text);
create or replace function public.cancel_customer_booking_with_capability(
  p_transaction_id text,
  p_owner_token text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, extensions, pg_temp
as $$
declare
  owner_id text;
  tx public.transactions%rowtype;
  starts_at timestamptz;
begin
  if p_owner_token is null or p_owner_token !~ '^[A-Za-z0-9_-]{43}$' then
    raise exception 'Kunci akses customer tidak valid.';
  end if;
  select customer_id into owner_id from private.customer_capabilities
  where owner_token_hash = digest(p_owner_token, 'sha256');
  if owner_id is null then raise exception 'Profil customer tidak dapat diakses.'; end if;
  perform set_config('rinse.customer_owner_id', owner_id, true);
  perform set_config('rinse.customer_owner_token', p_owner_token, true);
  perform set_config('rinse.customer_owner_verified', 'on', true);
  owner_id := public.current_verified_customer_id();
  select * into tx from public.transactions
  where id = p_transaction_id and customer_id = owner_id and transaction_type = 'BOOKING'
  for update;
  if not found then raise exception 'Booking tidak ditemukan untuk profil ini.'; end if;
  if tx.transaction_status not in ('PENDING', 'BOOKED') then
    raise exception 'Booking tidak dapat dibatalkan.';
  end if;
  starts_at := (tx.booking_date + tx.booking_time) at time zone 'Asia/Jakarta';
  if starts_at <= clock_timestamp() then raise exception 'Pembatalan ditutup pada waktu mulai.'; end if;
  perform set_config('rinse.cancellation_update', 'on', true);
  update public.transactions set transaction_status = 'CANCELLED', queue_status = 'COMPLETED',
    refund_status = case when tx.payment_status = 'PAID' then 'PENDING' else 'NONE' end
  where id = tx.id returning * into tx;
  return to_jsonb(tx);
end;
$$;

-- The phone lookup is admin-only. Customers use the capability-scoped lookup above.
create or replace function public.lookup_customer_by_phone(p_phone text)
returns table(
  customer_id text, full_name text, phone text, vehicle_id text, vehicle_type text,
  vehicle_plate text, vehicle_model text, customer_address text
)
language plpgsql
stable
security definer
set search_path = pg_catalog, public, pg_temp
as $$
begin
  if not public.is_rinse_admin() then raise exception 'Akses Admin diperlukan.'; end if;
  return query
  select c.id, c.full_name, c.phone, v.id, v.type, v.plate, v.model, c.address
  from public.customers c left join public.vehicles v on v.customer_id = c.id
  where public.normalize_indonesian_phone(c.phone)
    = public.normalize_indonesian_phone(p_phone);
end;
$$;

-- Replace broad table policies: customer access is through token-checked RPCs only.
do $$
declare
  policy_row record;
begin
  for policy_row in
    select tablename, policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('customers', 'vehicles', 'services_products', 'transactions')
  loop
    execute format('drop policy %I on public.%I', policy_row.policyname, policy_row.tablename);
  end loop;
end;
$$;

alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.services_products enable row level security;
alter table public.transactions enable row level security;

grant usage on schema public to anon, authenticated;
revoke all on public.customers, public.vehicles, public.transactions from public, anon;
revoke insert, update, delete on public.services_products from public, anon;
grant select on public.services_products to anon;
grant select, insert, update, delete on public.customers, public.vehicles, public.services_products, public.transactions to authenticated;

create policy "Capability customer catalog read" on public.services_products
  for select to anon using (active = true);
create policy "Capability admin customers" on public.customers
  for all to authenticated using (public.is_rinse_admin()) with check (public.is_rinse_admin());
create policy "Capability admin vehicles" on public.vehicles
  for all to authenticated using (public.is_rinse_admin()) with check (public.is_rinse_admin());
create policy "Capability admin catalog" on public.services_products
  for all to authenticated using (public.is_rinse_admin()) with check (public.is_rinse_admin());
create policy "Capability admin transactions" on public.transactions
  for all to authenticated using (public.is_rinse_admin()) with check (public.is_rinse_admin());

revoke all on function public.lookup_customer_by_phone(text) from public, anon;
revoke all on function public.lookup_transaction_history(text) from public, anon, authenticated;
revoke all on function public.cancel_transaction(text, text) from public, anon, authenticated;
revoke all on function public.record_service_transaction(jsonb, text) from public, anon;
revoke all on function public.record_product_sale(jsonb) from public, anon;
grant execute on function public.lookup_customer_by_phone(text) to authenticated;
grant execute on function public.record_service_transaction(jsonb, text) to authenticated;
grant execute on function public.record_product_sale(jsonb) to authenticated;

revoke all on function public.lookup_customer_profile_by_capability(text, text) from public, anon, authenticated;
revoke all on function public.create_service_booking_with_capability(jsonb, text, text) from public, anon, authenticated;
revoke all on function public.create_product_sale_with_capability(jsonb, text) from public, anon, authenticated;
revoke all on function public.lookup_customer_history_with_capability(text, text) from public, anon, authenticated;
revoke all on function public.cancel_customer_booking_with_capability(text, text) from public, anon, authenticated;
grant execute on function public.lookup_customer_profile_by_capability(text, text) to anon, authenticated;
grant execute on function public.create_service_booking_with_capability(jsonb, text, text) to anon, authenticated;
grant execute on function public.create_product_sale_with_capability(jsonb, text) to anon, authenticated;
grant execute on function public.lookup_customer_history_with_capability(text, text) to anon, authenticated;
grant execute on function public.cancel_customer_booking_with_capability(text, text) to anon, authenticated;

revoke all on function public.confirm_transaction_payment(text) from public, anon;
revoke all on function public.complete_transaction_refund(text) from public, anon;
grant execute on function public.confirm_transaction_payment(text) to authenticated;
grant execute on function public.complete_transaction_refund(text) to authenticated;
revoke all on function public.reconcile_self_service_transactions() from public, anon, authenticated;
grant execute on function public.reconcile_self_service_transactions() to service_role;
grant execute on function public.confirm_booking_payment(text) to service_role;
grant execute on function public.get_public_bay_status() to anon, authenticated;
grant execute on function public.get_public_today_wash_count() to anon, authenticated;

notify pgrst, 'reload schema';
commit;
