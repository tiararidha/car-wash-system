begin;

-- REVIEW PROPOSAL; apply on a staging copy after baseline migrations and seeds.
-- Apply this before multi-addon-booking-integrity-proposal.sql.
-- Prerequisite: assign app_metadata.rinse_role = 'admin' to named admin accounts
-- through a trusted Supabase Auth Admin API/dashboard process; never user_metadata.
-- Preflight in SQL Editor: inspect auth.users.raw_app_meta_data for every intended
-- admin and confirm at least one break-glass admin before changing any policy.
-- Existing sessions must sign out/in after the claim is assigned and be verified
-- through the real dashboard before this policy switch is considered.
-- Phone OTP must be enabled and rate-limited in Supabase Auth before this proposal is applied.
-- This proposal preserves customer booking through verified phone sessions, not anonymous RPCs.
-- Staging order: baseline migrations/seeds -> this proposal -> multi-addon-booking-integrity-proposal.sql.
-- Keep customer traffic disabled between them; this file revokes the legacy service RPC.
-- It revokes anon access to customer lookup, history, cancellation, booking and product-sale RPCs.
-- Customer sessions resolve customer_id from the verified JWT phone; only an admin claim may act on another customer's behalf.
-- Preflight: audit normalized-phone duplicates; the unique index below must fail closed on duplicates.
-- Resolve/merge duplicates manually on a reviewed copy before attempting this migration again.
-- Number changes require a separate recovery flow verifying old and new numbers (or manual support).
-- Do not claim privacy is closed until app, Auth provider/rate limits, RPCs and policies deploy together.
-- Rollback: retain the role-gated policies and claims while restoring a compatible
-- function body or app version. Never restore the prior broad authenticated policies;
-- if dashboard access fails, repair the verified admin claims under break-glass control.
-- Negative staging tests: missing/wrong role denied dashboard, catalog writes,
-- payment/refund confirmations; admin claim allowed; anon catalog/registration remains;
-- anon PII lookup/history/cancel/transaction RPCs denied; verified phone sees own data only.

create or replace function public.is_rinse_admin()
returns boolean
language sql
stable
security invoker
set search_path = pg_catalog, public, pg_temp
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'rinse_role', '') = 'admin';
$$;

revoke all on function public.is_rinse_admin() from public, anon;
grant execute on function public.is_rinse_admin() to authenticated;

create or replace function public.normalize_indonesian_phone(p_phone text)
returns text language sql immutable strict set search_path = pg_catalog
as $$
  with digits as (
    select regexp_replace(p_phone, '[^0-9]', '', 'g') as value
  )
  select case
    when value like '0%' and length(value) between 10 and 14 then '62' || substr(value, 2)
    when value like '62%' and length(value) between 11 and 15 then value
    else null
  end
  from digits;
$$;

create unique index if not exists customers_phone_e164_uidx
  on public.customers (public.normalize_indonesian_phone(phone));

create or replace function public.current_verified_customer_id()
returns text language plpgsql stable security definer set search_path = pg_catalog, public, pg_temp
as $$
declare
  verified_phone text := public.normalize_indonesian_phone(auth.jwt() ->> 'phone');
  matched_customer_id text;
begin
  if verified_phone is null then raise exception 'Verifikasi nomor HP diperlukan.'; end if;
  select id into matched_customer_id from public.customers
  where public.normalize_indonesian_phone(phone) = verified_phone;
  if not found then raise exception 'Profil pelanggan belum terdaftar untuk nomor terverifikasi.'; end if;
  return matched_customer_id;
end;
$$;

create or replace function public.customer_owns_vehicle(p_customer_id text, p_vehicle_id text)
returns boolean language sql stable security definer set search_path = pg_catalog, public, pg_temp
as $$
  select exists (
    select 1 from public.customers c join public.vehicles v on v.customer_id = c.id
    where c.id = p_customer_id and v.id = p_vehicle_id
      and public.normalize_indonesian_phone(c.phone)
        = public.normalize_indonesian_phone(auth.jwt() ->> 'phone')
  );
$$;

revoke all on function public.normalize_indonesian_phone(text) from public, anon;
revoke all on function public.current_verified_customer_id() from public, anon;
revoke all on function public.customer_owns_vehicle(text, text) from public, anon;
grant execute on function public.normalize_indonesian_phone(text) to authenticated;
grant execute on function public.current_verified_customer_id() to authenticated;
grant execute on function public.customer_owns_vehicle(text, text) to authenticated;

alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.services_products enable row level security;
alter table public.transactions enable row level security;

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

grant usage on schema public to anon, authenticated;
grant select on public.services_products to anon;
revoke insert on public.customers, public.vehicles from public, anon;
grant insert on public.customers, public.vehicles to authenticated;
create policy "Public catalog read" on public.services_products
  for select to anon using (active = true);
create policy "Verified customer registration" on public.customers
  for insert to authenticated
  with check (
    length(trim(full_name)) > 1
    and public.normalize_indonesian_phone(phone)
      = public.normalize_indonesian_phone(auth.jwt() ->> 'phone')
  );
create policy "Verified customer vehicle registration" on public.vehicles
  for insert to authenticated
  with check (customer_id = public.current_verified_customer_id());

create policy "Role-gated admin access" on public.customers
  for all to authenticated using (public.is_rinse_admin()) with check (public.is_rinse_admin());
create policy "Role-gated admin access" on public.vehicles
  for all to authenticated using (public.is_rinse_admin()) with check (public.is_rinse_admin());
create policy "Role-gated admin access" on public.services_products
  for all to authenticated using (public.is_rinse_admin()) with check (public.is_rinse_admin());
create policy "Role-gated admin access" on public.transactions
  for all to authenticated using (public.is_rinse_admin()) with check (public.is_rinse_admin());

drop function if exists public.lookup_customer_by_phone(text);
create function public.lookup_customer_by_phone(p_phone text)
returns table(
  customer_id text, full_name text, phone text, vehicle_id text, vehicle_type text,
  vehicle_plate text, vehicle_model text, customer_address text
)
language plpgsql stable security definer set search_path = pg_catalog, public, pg_temp
as $$
declare
  admin_access boolean := public.is_rinse_admin();
  verified_phone text;
begin
  if admin_access then
    verified_phone := public.normalize_indonesian_phone(p_phone);
  else
    verified_phone := public.normalize_indonesian_phone(auth.jwt() ->> 'phone');
    if verified_phone is null or verified_phone is distinct from public.normalize_indonesian_phone(p_phone) then
      raise exception 'Verifikasi nomor HP diperlukan.';
    end if;
  end if;
  return query
  select c.id, c.full_name, c.phone, v.id, v.type, v.plate, v.model, c.address
  from public.customers c left join public.vehicles v on v.customer_id = c.id
  where public.normalize_indonesian_phone(c.phone) = verified_phone;
end;
$$;

drop function if exists public.lookup_transaction_history(text);
create function public.lookup_transaction_history(p_search text)
returns table(
  transaction_id text, code text, item_name text, item_type text, amount integer,
  payment_method text, payment_status text, transaction_type text, transaction_status text,
  booking_date date, booking_time time, duration_minutes integer, customer_name text,
  vehicle_type text, vehicle_plate text, vehicle_model text, refund_status text
)
language plpgsql stable security definer set search_path = pg_catalog, public, pg_temp
as $$
declare
  admin_access boolean := public.is_rinse_admin();
  customer_id_value text;
  search_value text := trim(coalesce(p_search, ''));
begin
  if not admin_access then customer_id_value := public.current_verified_customer_id(); end if;
  return query
  select t.id, t.code, t.item_name, t.item_type, t.amount, t.payment_method, t.payment_status,
    t.transaction_type, t.transaction_status, t.booking_date, t.booking_time, t.duration_minutes,
    c.full_name, v.type, v.plate, v.model, t.refund_status
  from public.transactions t
  join public.customers c on c.id = t.customer_id
  left join public.vehicles v on v.id = t.vehicle_id and v.customer_id = t.customer_id
  where (admin_access or t.customer_id = customer_id_value)
    and (search_value = '' or lower(t.code) = lower(search_value)
      or lower(regexp_replace(coalesce(v.plate, ''), '[[:space:]]', '', 'g'))
        = lower(regexp_replace(search_value, '[[:space:]]', '', 'g')));
end;
$$;

create or replace function public.cancel_transaction(p_transaction_id text, p_search text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp
as $$
declare
  tx public.transactions%rowtype;
  admin_access boolean := public.is_rinse_admin();
  customer_id_value text;
  starts_at timestamptz;
begin
  if not admin_access then customer_id_value := public.current_verified_customer_id(); end if;
  select t.* into tx from public.transactions t
  where t.id = p_transaction_id and t.transaction_type = 'BOOKING'
    and (admin_access or t.customer_id = customer_id_value)
  for update;
  if not found then raise exception 'Booking tidak ditemukan.'; end if;
  if tx.transaction_status not in ('PENDING', 'BOOKED') then raise exception 'Booking tidak dapat dibatalkan.'; end if;
  starts_at := (tx.booking_date + tx.booking_time) at time zone 'Asia/Jakarta';
  if starts_at <= clock_timestamp() then raise exception 'Pembatalan ditutup pada waktu mulai.'; end if;
  perform set_config('rinse.cancellation_update', 'on', true);
  update public.transactions set transaction_status = 'CANCELLED', queue_status = 'COMPLETED',
    refund_status = case when tx.payment_status = 'PAID' then 'PENDING' else 'NONE' end
  where id = tx.id returning * into tx;
  return to_jsonb(tx);
end;
$$;

create or replace function public.record_product_sale(p_transaction jsonb)
returns integer language plpgsql security definer set search_path = pg_catalog, public, pg_temp
as $$
declare
  customer_id_value text;
  customer public.customers%rowtype;
  product public.services_products%rowtype;
  sale_quantity integer;
  new_stock integer;
  payment_method_value text := p_transaction ->> 'payment_method';
begin
  if public.is_rinse_admin() then
    customer_id_value := p_transaction ->> 'customer_id';
  else
    customer_id_value := public.current_verified_customer_id();
    if p_transaction ->> 'customer_id' is distinct from customer_id_value then
      raise exception 'Pesanan hanya dapat dibuat untuk customer yang terverifikasi.';
    end if;
  end if;
  select * into customer from public.customers where id = customer_id_value;
  if not found then raise exception 'Pelanggan tidak ditemukan.'; end if;
  sale_quantity := coalesce((p_transaction ->> 'quantity')::integer, 0);
  if sale_quantity <= 0 then raise exception 'Jumlah produk tidak valid.'; end if;
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
    p_transaction ->> 'id', p_transaction ->> 'code', customer_id_value, null, product.id,
    'PRODUCT', product.name, sale_quantity, product.price * sale_quantity,
    payment_method_value, 'PENDING', 'NONE', 'SHOP', 'PENDING', 'WAITING',
    (p_transaction ->> 'booking_date')::date, (p_transaction ->> 'booking_time')::time,
    0, now()
  );
  return new_stock;
end;
$$;

create or replace function public.confirm_transaction_payment(p_transaction_id text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp
as $$
declare
  tx public.transactions%rowtype;
  next_status text;
begin
  if not public.is_rinse_admin() then raise exception 'Akses Admin diperlukan untuk konfirmasi pembayaran.'; end if;
  select * into tx from public.transactions where id = p_transaction_id for update;
  if not found or tx.payment_status <> 'PENDING' or tx.transaction_status <> 'PENDING' then
    raise exception 'Transaksi bukan pembayaran tertunda.';
  end if;
  if tx.payment_method <> 'CASH' or tx.transaction_type not in ('WALK_IN', 'SHOP') then
    raise exception 'Konfirmasi manual hanya untuk pembayaran tunai Walk-in/penjualan.';
  end if;
  next_status := case when tx.transaction_type = 'SHOP' then 'COMPLETED' else 'ACTIVE' end;
  perform set_config('rinse.payment_update', 'on', true);
  update public.transactions set payment_status = 'PAID', transaction_status = next_status,
    queue_status = case when next_status = 'COMPLETED' then 'COMPLETED' else 'WAITING' end
    where id = tx.id returning * into tx;
  return to_jsonb(tx);
end;
$$;

create or replace function public.complete_transaction_refund(p_transaction_id text)
returns jsonb language plpgsql security definer set search_path = pg_catalog, public, pg_temp
as $$
declare
  tx public.transactions%rowtype;
begin
  if not public.is_rinse_admin() then raise exception 'Akses Admin diperlukan untuk mencatat refund.'; end if;
  select * into tx from public.transactions where id = p_transaction_id for update;
  if not found or tx.transaction_status <> 'CANCELLED' or tx.refund_status <> 'PENDING' then
    raise exception 'Tidak ada refund tertunda.';
  end if;
  perform set_config('rinse.refund_update', 'on', true);
  update public.transactions set payment_status = 'REFUNDED', refund_status = 'COMPLETED'
    where id = tx.id returning * into tx;
  return to_jsonb(tx);
end;
$$;

revoke all on function public.lookup_customer_by_phone(text) from public, anon;
revoke all on function public.lookup_transaction_history(text) from public, anon;
revoke all on function public.cancel_transaction(text, text) from public, anon;
revoke all on function public.record_product_sale(jsonb) from public, anon;
grant execute on function public.lookup_customer_by_phone(text) to authenticated;
grant execute on function public.lookup_transaction_history(text) to authenticated;
grant execute on function public.cancel_transaction(text, text) to authenticated;
grant execute on function public.record_product_sale(jsonb) to authenticated;
revoke all on function public.record_service_transaction(jsonb, text) from public, anon, authenticated;
revoke all on function public.confirm_booking_payment(text) from public, anon, authenticated;
grant execute on function public.confirm_booking_payment(text) to service_role;
alter function public.confirm_booking_payment(text) set search_path to pg_catalog, public, pg_temp;
alter function public.get_public_today_wash_count() set search_path to pg_catalog, public, pg_temp;
revoke all on function public.confirm_transaction_payment(text) from public, anon;
revoke all on function public.complete_transaction_refund(text) from public, anon;
grant execute on function public.confirm_transaction_payment(text) to authenticated;
grant execute on function public.complete_transaction_refund(text) to authenticated;
revoke all on function public.reconcile_self_service_transactions() from public, anon, authenticated;
grant execute on function public.reconcile_self_service_transactions() to service_role;

notify pgrst, 'reload schema';
commit;
