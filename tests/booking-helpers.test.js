const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  hasAdminRole,
  hasCustomerPhoneChanged,
  toSupabasePhone,
  verifiedPhoneMatchesInput,
  mergePersistedTransaction,
  isValidIndonesianPlate,
  isValidRequestId,
  isValidServiceOrderResponse,
  isValidDemoProductOrderResponse,
  normalizeTransactionStatusForDisplay,
  resolveCustomerIdentity,
  validateServicePaymentMethod,
  isValidCustomerCapabilityToken,
  requireCustomerCapabilityToken,
  sanitizeCart,
  validatePublicDataResponse,
  safeSupabaseErrorCode,
  safeSupabaseErrorDetails,
  sanitizeSupabaseDiagnostic,
  supabaseHttpError,
  serviceOrderErrorMessage
} = require('../app.js');

const appSource = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const indexSource = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const polishSource = fs.readFileSync(path.join(__dirname, '..', 'polish.css'), 'utf8');
const migrationSource = fs.readFileSync(path.join(__dirname, '..', 'sql', 'multi-addon-booking-integrity-proposal.sql'), 'utf8');
const authorizationSource = fs.readFileSync(path.join(__dirname, '..', 'sql', 'admin-role-authorization-proposal.sql'), 'utf8');
const operationsSource = fs.readFileSync(path.join(__dirname, '..', 'sql', 'business-flow-hardening.sql'), 'utf8');
const accessSource = fs.readFileSync(path.join(__dirname, '..', 'sql', 'rls-authenticated-access.sql'), 'utf8');
const schemaSource = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
const pickupSource = fs.readFileSync(path.join(__dirname, '..', 'sql', 'pickup-rpc-hardening-proposal.sql'), 'utf8');
const capabilitySource = fs.readFileSync(path.join(__dirname, '..', 'sql', 'customer-capability-booking-migration.sql'), 'utf8');
const demoProposalSource = fs.readFileSync(path.join(__dirname, '..', 'sql', 'demo-public-order-dashboard-proposal.sql'), 'utf8');
const demoRpcSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261012000000_secure_demo_service_orders.sql'), 'utf8');
const anonymousLockdownSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261012000001_restrict_legacy_anon_rpcs.sql'), 'utf8');
const demoProductSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261012000002_demo_product_checkout.sql'), 'utf8');
const simulatedPaymentSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261012000004_simulate_demo_payments.sql'), 'utf8');
const customerNameCanonicalizationSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261019000000_canonicalize_demo_order_customer_name.sql'), 'utf8');
const cleanupGeneratorSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261019000001_cleanup_demo_data_and_realistic_fallback.sql'), 'utf8');
const adminRichDataSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261019000003_add_admin_and_rich_dummy_data.sql'), 'utf8');
const paidDemoMigrationSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261019000004_mark_demo_transactions_paid.sql'), 'utf8');
const demoSnapshotStart = demoProposalSource.search(/create(?:\s+or\s+replace)?\s+function public\.get_demo_admin_snapshot\(\)/i);
const demoOrderStart = demoRpcSource.search(/create(?:\s+or\s+replace)?\s+function public\.create_demo_service_order\(p_order jsonb\)/i);
const demoOrderEnd = demoRpcSource.search(/\nrevoke all on function public\.create_demo_service_order\(jsonb\)/i);
const demoOrderSource = demoRpcSource.slice(demoOrderStart, demoOrderEnd);
const demoSnapshotSource = demoProposalSource.slice(demoSnapshotStart);
const demoProductStart = demoProductSource.search(/create(?:\s+or\s+replace)?\s+function public\.create_demo_product_order\(p_order jsonb\)/i);
const demoProductEnd = demoProductSource.search(/\nrevoke all on function public\.create_demo_product_order\(jsonb\)/i);
const demoProductOrderSource = demoProductSource.slice(demoProductStart, demoProductEnd);
const readmeSource = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8');
const submitStart = appSource.indexOf('async function submitService(form)');
const submitEnd = appSource.indexOf('\nfunction showConfirmation', submitStart);
const submitSource = appSource.slice(submitStart, submitEnd);
const persistenceStart = appSource.indexOf('async function persistTransaction(');
const persistenceEnd = appSource.indexOf('\nasync function submitService', persistenceStart);
const persistenceSource = appSource.slice(persistenceStart, persistenceEnd);
const productSubmitStart = appSource.indexOf('async function submitProducts(form)');
const productSubmitEnd = appSource.indexOf('\nfunction showProductConfirmation', productSubmitStart);
const productSubmitSource = appSource.slice(productSubmitStart, productSubmitEnd);
const serviceFormStart = appSource.indexOf('function renderTransactionForm(content, selectedService)');
const serviceFormEnd = appSource.indexOf('\nfunction renderCartDialog', serviceFormStart);
const serviceFormSource = appSource.slice(serviceFormStart, serviceFormEnd);
const productFormStart = appSource.indexOf('function renderProductCheckout(content)');
const productFormEnd = appSource.indexOf('\nfunction makeCode', productFormStart);
const productFormSource = appSource.slice(productFormStart, productFormEnd);
const bookingRpcStart = migrationSource.indexOf('create or replace function public.record_service_transaction(');
const bookingRpcEnd = migrationSource.indexOf('\ncreate or replace function public.reconcile_self_service_transactions()', bookingRpcStart);
const bookingRpcSource = migrationSource.slice(bookingRpcStart, bookingRpcEnd);
const historyCapabilityStart = capabilitySource.indexOf('create function public.lookup_customer_history_with_capability(');
const cancelCapabilityStart = capabilitySource.indexOf('create or replace function public.cancel_customer_booking_with_capability(');
const legacyLookupStart = capabilitySource.indexOf('-- The phone lookup is admin-only.');
const historyCapabilitySource = capabilitySource.slice(historyCapabilityStart, cancelCapabilityStart);
const cancelCapabilitySource = capabilitySource.slice(cancelCapabilityStart, legacyLookupStart);
const profileCapabilityStart = capabilitySource.indexOf('create or replace function public.lookup_customer_profile_by_capability(');
const bookingCapabilityStart = capabilitySource.indexOf('create or replace function public.create_service_booking_with_capability(');
const profileCapabilitySource = capabilitySource.slice(profileCapabilityStart, bookingCapabilityStart);

const validCapabilityToken = 'A'.repeat(43);
const wrongOwnerCapabilityToken = 'B'.repeat(43);
assert.notEqual(validCapabilityToken, wrongOwnerCapabilityToken);
assert.equal(isValidCustomerCapabilityToken(validCapabilityToken), true);
assert.equal(hasAdminRole({ app_metadata: { rinse_role: 'admin' } }), true);
assert.equal(hasAdminRole({ user_metadata: { rinse_role: 'admin' } }), false);
assert.equal(isValidCustomerCapabilityToken(wrongOwnerCapabilityToken), true);
assert.equal(isValidCustomerCapabilityToken('invalid-token'), false);
assert.equal(isValidCustomerCapabilityToken(undefined), false);
assert.throws(() => requireCustomerCapabilityToken(undefined), /tidak tersedia/);
assert.throws(() => requireCustomerCapabilityToken('invalid-token'), /tidak valid/);
assert.deepEqual(sanitizeCart({ 'prd-a': { quantity: 2 }, 'prd-b': { quantity: 0 }, 'prd-c': { quantity: 'nope' } }), {
  'prd-a': { quantity: 2 }
});
assert.deepEqual(sanitizeCart([]), {});
assert.match(appSource, /function readStoredCart\(\)\s*\{\s*try\s*\{ return sanitizeCart\(JSON\.parse\(localStorage\.getItem\(CART_KEY\)/);
const publicCatalogFixture = [{ id: 'svc-car', item_type: 'SERVICE', price: 50000, active: true }];
const publicBaysFixture = [1, 2, 3, 4].map(bay_number => ({
  bay_number, bay_status: 'AVAILABLE', vehicle_type: null, duration_minutes: 0, minutes_remaining: 0
}));
assert.deepEqual(validatePublicDataResponse(publicCatalogFixture, 0, publicBaysFixture), {
  products: publicCatalogFixture,
  washCount: 0,
  bays: publicBaysFixture
});
assert.throws(() => validatePublicDataResponse(null, 0, publicBaysFixture), /Katalog Supabase/);
assert.throws(() => validatePublicDataResponse(publicCatalogFixture, '0', publicBaysFixture), /jumlah kendaraan/);
assert.throws(() => validatePublicDataResponse(publicCatalogFixture, 0, publicBaysFixture.slice(1)), /tepat empat bay/);
assert.throws(() => validatePublicDataResponse(publicCatalogFixture, 0, [
  ...publicBaysFixture.slice(0, 3), { ...publicBaysFixture[3], bay_number: 3 }
]), /status bay mengembalikan data yang tidak valid/);
assert.equal(safeSupabaseErrorCode('{"code":"PGRST202","message":"token must never be logged"}'), 'PGRST202');
assert.equal(safeSupabaseErrorCode('{"code":"Bearer secret","message":"private value"}'), '');
const safeErrorDetails = safeSupabaseErrorDetails(JSON.stringify({
  code: '23505',
  message: 'Duplicate phone 081234567890',
  details: 'Failing row contains (private, 081234567890, plate).',
  hint: 'Contact owner@example.test'
}));
assert.equal(safeErrorDetails.code, '23505');
assert.doesNotMatch(JSON.stringify(safeErrorDetails), /081234567890|owner@example\.test/);
assert.match(sanitizeSupabaseDiagnostic('Bearer private-token'), /Bearer \[redacted\]/);
const previousWindow = global.window;
global.window = { location: { hostname: 'localhost' } };
const localDatabaseError = supabaseHttpError('POST /rest/v1/rpc/create_demo_service_order', 400, JSON.stringify({
  code: '23502',
  message: 'null value in column phone violates not-null constraint',
  details: 'Key (phone)=(+6281234567890) already exists.',
  hint: 'Bearer private-token'
}));
if (previousWindow === undefined) delete global.window;
else global.window = previousWindow;
assert.match(localDatabaseError, /HTTP 400.*23502/);
assert.match(localDatabaseError, /Detail server \(lokal\).*null value in column phone/);
assert.doesNotMatch(localDatabaseError, /6281234567890|private-token/);
assert.match(supabaseHttpError('POST /rest/v1/rpc/create_service_booking_with_capability', 404, '{"code":"PGRST202","message":"private payload"}'), /RPC create_service_booking_with_capability tidak ditemukan.*PGRST202/);
const sqlExecutionError = supabaseHttpError('POST /rest/v1/rpc/create_demo_product_order', 404, JSON.stringify({
  code: '42883', message: 'operator does not exist: text ->> unknown'
}));
assert.match(sqlExecutionError, /HTTP 404 · SQLSTATE 42883/);
assert.doesNotMatch(sqlExecutionError, /RPC create_demo_product_order tidak ditemukan/);
assert.match(supabaseHttpError('GET /rest/v1/services_products', 401), /URL dan publishable key/);
assert.match(supabaseHttpError('GET /rest/v1/services_products', 403), /grant, RLS, dan role Admin/);
assert.doesNotMatch(supabaseHttpError('POST /rest/v1/rpc/cancel_customer_booking_with_capability', 404, '{"code":"PGRST202","message":"owner token private"}'), /owner token private/);
assert.match(serviceOrderErrorMessage({ code: 'P0001', message: 'Nomor pelanggan sudah terdaftar dengan nama berbeda.' }), /Gunakan nama yang terdaftar/);
assert.match(serviceOrderErrorMessage({ message: 'POST /rpc failed · SQLSTATE P0001' }), /hubungi studio/);
assert.equal(serviceOrderErrorMessage(new Error('network failure')), 'network failure');

const rpcContracts = {
  lookup_customer_by_phone: { source: capabilitySource, args: [['p_phone', 'text']], returns: 'table', columns: /returns table\(\s*customer_id text,\s*full_name text,\s*phone text,\s*vehicle_id text,\s*vehicle_type text,\s*vehicle_plate text,\s*vehicle_model text,\s*customer_address text\s*\)/i },
  lookup_customer_profile_by_capability: { source: capabilitySource, args: [['p_phone', 'text'], ['p_owner_token', 'text']], returns: 'table', columns: /returns table\(\s*customer_id text,\s*full_name text,\s*phone text,\s*vehicle_id text,\s*vehicle_type text,\s*vehicle_plate text,\s*vehicle_model text,\s*customer_address text\s*\)/i },
  create_product_sale_with_capability: { source: capabilitySource, args: [['p_transaction', 'jsonb'], ['p_owner_token', 'text']], returns: 'integer' },
  record_product_sale: { source: capabilitySource, args: [['p_transaction', 'jsonb']], returns: 'integer' },
  get_public_today_wash_count: { source: operationsSource, args: [], returns: 'integer' },
  get_public_bay_status: { source: migrationSource, args: [], returns: 'table', columns: /returns table\(\s*bay_number integer,\s*bay_status text,\s*vehicle_type text,\s*duration_minutes integer,\s*minutes_remaining integer,\s*booking_time time\s*\)/i },
  create_demo_service_order: { source: demoRpcSource, args: [['p_order', 'jsonb']], returns: 'jsonb' },
  create_demo_product_order: { source: demoProductSource, args: [['p_order', 'jsonb']], returns: 'jsonb' },
  get_demo_admin_snapshot: { source: demoSnapshotSource, args: [], returns: 'jsonb' },
  confirm_transaction_payment: { source: authorizationSource, args: [['p_transaction_id', 'text']], returns: 'jsonb' },
  complete_transaction_refund: { source: authorizationSource, args: [['p_transaction_id', 'text']], returns: 'jsonb' }
};
const rpcCalls = [...appSource.matchAll(/rpcRequest\(\s*'([a-z_]+)'(?:\s*,\s*\{([^{}]*)\})?\s*\)/g)];
const calledRpcNames = new Set();
for (const [, name, parameterSource = ''] of rpcCalls) {
  calledRpcNames.add(name);
  const expected = rpcContracts[name];
  assert.ok(expected, `Missing SQL contract for frontend RPC ${name}`);
  const actualParameters = [...parameterSource.matchAll(/\b(p_[a-z_]+)\s*:/g)].map(([, parameter]) => parameter).sort();
  assert.deepEqual(actualParameters, expected.args.map(([parameter]) => parameter).sort(), `RPC parameters mismatch for ${name}`);
}
assert.deepEqual([...calledRpcNames].sort(), Object.keys(rpcContracts).sort());
for (const [name, contract] of Object.entries(rpcContracts)) {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const functionDefinition = new RegExp(`create(?:\\s+or\\s+replace)?\\s+function\\s+public\\.${escapedName}\\s*\\(([\\s\\S]*?)\\)\\s*returns\\s+(\\w+)`, 'i').exec(contract.source);
  assert.ok(functionDefinition, `Missing SQL function definition for ${name}`);
  const actualArguments = functionDefinition[1].trim()
    ? functionDefinition[1].split(',').map(argument => argument.trim().replace(/\s+default[\s\S]*$/i, '').split(/\s+/))
    : [];
  assert.deepEqual(actualArguments, contract.args, `SQL argument signature mismatch for ${name}`);
  assert.equal(functionDefinition[2].toLowerCase(), contract.returns, `SQL return type mismatch for ${name}`);
  if (contract.columns) assert.match(contract.source.slice(functionDefinition.index, functionDefinition.index + 1200), contract.columns);
}
assert.doesNotMatch(demoOrderSource, /public\.record_service_transaction\(transaction_payload/);
assert.match(demoOrderSource, /transaction_code_value text;/);
assert.match(demoOrderSource, /transaction_code_value := 'RS-'/);
assert.doesNotMatch(demoOrderSource, /\btransaction_code\s*:=/);
assert.match(demoOrderSource, /existing_customer_id text;/);
assert.match(demoOrderSource, /select id, full_name into existing_customer_id, existing_customer_name/);
assert.match(demoOrderSource, /customer_id_value := existing_customer_id/);
assert.doesNotMatch(demoOrderSource, /into customer_id_value\b/);
assert.match(demoOrderSource, /existing_vehicle_id text;/);
assert.match(demoOrderSource, /select id, customer_id, type into existing_vehicle_id, existing_vehicle_customer_id, existing_vehicle_type/);
assert.match(demoOrderSource, /vehicle_id_value := existing_vehicle_id/);
assert.match(demoOrderSource, /existing_vehicle_type <> service_row\.type/);
assert.match(demoOrderSource, /request_id_value := \(p_order ->> 'request_id'\)::uuid/);
assert.match(demoOrderSource, /pg_advisory_xact_lock\(hashtextextended\(request_id_value::text, 78131\)\)/);
assert.match(demoOrderSource, /request_fingerprint_value := encode\(extensions\.digest/);
assert.match(demoOrderSource, /if existing_fingerprint is distinct from request_fingerprint_value then[\s\S]*return existing_transaction/);
assert.match(demoOrderSource, /normalized_plate !~ '\^\[A-Z\]\{1,2\}\[0-9\]\{1,4\}\[A-Z\]\{1,3\}\$'/);
assert.match(demoOrderSource, /insert into public\.transactions\s*\([\s\S]*'PENDING',[\s\S]*'NONE',[\s\S]*transaction_type_value/);
assert.match(demoRpcSource, /insert into private\.demo_transaction_registry\(transaction_id, request_id, request_fingerprint\)/);
assert.match(demoRpcSource, /alter table private\.demo_transaction_registry[\s\S]*add column if not exists request_id uuid/);
assert.match(demoRpcSource, /revoke all on function public\.record_service_transaction\(jsonb, text\) from public, anon/);
assert.doesNotMatch(demoRpcSource, /grant execute on function public\.record_service_transaction\(jsonb, text\) to anon/i);
assert.match(demoRpcSource, /has_function_privilege\('authenticated', 'public\.record_service_transaction\(jsonb,text\)', 'EXECUTE'\)/);
assert.match(demoRpcSource, /grant execute on function public\.create_demo_service_order\(jsonb\) to anon;/);
assert.doesNotMatch(demoRpcSource, /grant execute on function public\.create_demo_service_order\(jsonb\) to authenticated/i);
assert.match(demoProposalSource, /SUPERSEDED historical proposal[\s\S]*Do not execute this file/);
assert.match(demoProposalSource, /20261012000000_secure_demo_service_orders\.sql/);
assert.match(demoSnapshotSource, /join public\.transactions transaction_row on transaction_row\.id = registry\.transaction_id/);
assert.match(demoSnapshotSource, /'full_name', 'Pelanggan demo '/);
assert.match(demoSnapshotSource, /'phone', 'disamarkan'/);
assert.match(demoSnapshotSource, /'plate', 'DEMO-'/);
assert.doesNotMatch(demoSnapshotSource, /customer_row\.phone|customer_row\.address|vehicle_row\.plate|vehicle_row\.model/);
assert.match(demoRpcSource, /private\.demo_transaction_registry/);
assert.match(demoSnapshotSource, /from private\.demo_transaction_registry registry/);
assert.match(demoSnapshotSource, /grant execute on function public\.get_demo_admin_snapshot\(\) to anon/);
assert.doesNotMatch(demoRpcSource, /alter table public\.transactions|drop trigger|disable row level security/i);
for (const [name, signature] of [
  ['lookup_customer_by_phone', 'text'],
  ['lookup_transaction_history', 'text'],
  ['cancel_transaction', 'text, text'],
  ['record_product_sale', 'jsonb']
]) {
  assert.match(anonymousLockdownSource, new RegExp(`revoke all on function public\\.${name}\\(${signature.replace(/, /g, ', ')}\\) from public, anon`));
  assert.match(anonymousLockdownSource, new RegExp(`grant execute on function public\\.${name}\\(${signature.replace(/, /g, ', ')}\\) to authenticated, service_role`));
}
assert.match(anonymousLockdownSource, /revoke insert on public\.customers, public\.vehicles from public, anon/);
assert.match(anonymousLockdownSource, /drop policy if exists "Customer registration" on public\.customers/);
assert.match(anonymousLockdownSource, /drop policy if exists "Vehicle registration" on public\.vehicles/);
assert.match(anonymousLockdownSource, /has_function_privilege\('anon', 'public\.create_demo_service_order\(jsonb\)', 'EXECUTE'\)/);
assert.match(anonymousLockdownSource, /p\.prosecdef and r\.rolbypassrls/);
assert.doesNotMatch(anonymousLockdownSource, /revoke all on function public\.(?:lookup_customer_by_phone|lookup_transaction_history|cancel_transaction|record_product_sale)[^;]*authenticated/i);
assert.doesNotMatch(anonymousLockdownSource, /disable row level security|drop trigger|delete from public\./i);
assert.match(demoProductSource, /a unique request_id index is required/);
assert.ok(demoProductOrderSource.indexOf('where r.request_id=request_id_value') < demoProductOrderSource.indexOf("where id=p_order->>'item_id' and item_type='PRODUCT'"));
assert.match(demoProductOrderSource, /for update[\s\S]*if product_row\.stock<quantity_value/);
assert.match(demoProductOrderSource, /stock=stock-quantity_value/);
assert.match(demoProductOrderSource, /insert into public\.transactions\s*\(/);
assert.match(demoProductOrderSource, /insert into private\.demo_transaction_registry\(transaction_id,request_id,request_fingerprint\)/);
assert.match(demoProductSource, /grant execute on function public\.create_demo_product_order\(jsonb\) to anon/);
assert.doesNotMatch(demoProductSource, /grant execute on function public\.create_demo_product_order\(jsonb\) to authenticated/i);
assert.match(simulatedPaymentSource, /rename to create_demo_service_order_pending/);
assert.match(simulatedPaymentSource, /rename to create_demo_product_order_pending/);
assert.match(simulatedPaymentSource, /set_config\('rinse\.payment_update','on',true\)/);
assert.match(simulatedPaymentSource, /payment_status='PAID'/);
assert.match(simulatedPaymentSource, /when transaction_type='BOOKING' then 'BOOKED'/);
assert.match(simulatedPaymentSource, /return private\.simulate_demo_payment/);
assert.match(simulatedPaymentSource, /if saved_transaction\.payment_status='PAID' then return to_jsonb\(saved_transaction\)/);
assert.match(simulatedPaymentSource, /where registry\.request_id=p_request_id and transaction_row\.id=p_transaction_id/);
assert.match(simulatedPaymentSource, /update public\.transactions[\s\S]*payment_status='PAID'[\s\S]*then 'BOOKED'/);
assert.match(simulatedPaymentSource, /revoke all on function public\.create_demo_service_order_pending\(jsonb\) from public, anon, authenticated/);
assert.match(simulatedPaymentSource, /revoke all on function public\.create_demo_product_order_pending\(jsonb\) from public, anon, authenticated/);
assert.match(simulatedPaymentSource, /revoke all on function private\.simulate_demo_payment\(text,uuid\) from public, anon, authenticated/);
assert.match(simulatedPaymentSource, /grant execute on function public\.create_demo_service_order\(jsonb\) to anon/);
assert.match(simulatedPaymentSource, /grant execute on function public\.create_demo_product_order\(jsonb\) to anon/);
assert.match(customerNameCanonicalizationSource, /create or replace function public\.create_demo_service_order\(p_order jsonb\)/i);
assert.match(customerNameCanonicalizationSource, /select full_name into existing_customer_name[\s\S]*from public\.customers[\s\S]*normalized_phone/i);
assert.match(customerNameCanonicalizationSource, /jsonb_set\(p_order, '\{customer_name\}', to_jsonb\(existing_customer_name\), true\)/i);
assert.ok(customerNameCanonicalizationSource.indexOf('jsonb_set(p_order') < customerNameCanonicalizationSource.indexOf('create_demo_service_order_pending(p_order)'));
assert.match(customerNameCanonicalizationSource, /private\.simulate_demo_payment\(/);
assert.match(customerNameCanonicalizationSource, /grant execute on function public\.create_demo_service_order\(jsonb\) to anon/);
assert.match(cleanupGeneratorSource, /delete from public\.transactions transaction_row[\s\S]*using demo_cleanup_rows cleanup_row/);
assert.match(cleanupGeneratorSource, /registry\.transaction_id is not null/);
assert.match(cleanupGeneratorSource, /ilike '%demo%'/);
assert.match(cleanupGeneratorSource, /'Budi Santoso', '081298765432'/);
assert.match(cleanupGeneratorSource, /'Rina Wijaya', '081233445566'/);
assert.match(cleanupGeneratorSource, /'Hendra Gunawan', '081277889900'/);
assert.match(cleanupGeneratorSource, /on conflict \(phone\) do update\s+set full_name = excluded\.full_name/i);
assert.ok(cleanupGeneratorSource.indexOf('delete from public.transactions') < cleanupGeneratorSource.indexOf("'Budi Santoso', '081298765432'"));
assert.ok(cleanupGeneratorSource.indexOf('delete from public.customers') < cleanupGeneratorSource.indexOf("'Budi Santoso', '081298765432'"));
assert.match(cleanupGeneratorSource, /'H 8821 AB'/);
assert.match(cleanupGeneratorSource, /'B 1234 XYZ'/);
assert.match(cleanupGeneratorSource, /'seed-tx-budi-wash'[\s\S]*'CASH', 'PAID', 'WALK_IN', 'COMPLETED', 'COMPLETED'/);
assert.match(cleanupGeneratorSource, /'seed-tx-rina-self-service'[\s\S]*'QRIS', 'PAID', 'BOOKING', 'BOOKED', 'WAITING'/);
assert.match(cleanupGeneratorSource, /'seed-tx-hendra-wash'[\s\S]*'CASH', 'PENDING', 'WALK_IN', 'PENDING', 'WAITING'/);
assert.match(cleanupGeneratorSource, /insert into private\.demo_transaction_registry \(transaction_id\)[\s\S]*seed-tx-hendra-wash/);
assert.match(cleanupGeneratorSource, /private\.demo_realistic_name\(request_id_value::text\)/);
assert.match(cleanupGeneratorSource, /private\.demo_realistic_plate\(request_id_value::text \|\| ':' \|\| candidate_number::text\)/);
assert.match(cleanupGeneratorSource, /where registry\.request_id = request_id_value/);
assert.match(cleanupGeneratorSource, /'full_name', private\.demo_realistic_name\(customer_row\.id\)/);
assert.match(cleanupGeneratorSource, /'plate', private\.demo_realistic_plate\(vehicle_row\.id\)/);
assert.doesNotMatch(cleanupGeneratorSource, /Pelanggan demo|Kendaraan demo/);
assert.match(adminRichDataSource, /raise notice 'Admin account is not provisioned yet[\s\S]*app_metadata\.rinse_role=admin\./);
assert.doesNotMatch(adminRichDataSource, /Admin_123|public\.app_admins|insert into auth\.users/i);
assert.match(adminRichDataSource, /create table if not exists private\.demo_transaction_registry/i);
assert.doesNotMatch(adminRichDataSource, /public\.demo_transaction_registry/);
assert.match(adminRichDataSource, /from private\.demo_transaction_registry registry[\s\S]*join public\.transactions transaction_row/);
assert.match(adminRichDataSource, /lower\(trim\(full_name\)\) = 'dimas saputra'/);
assert.match(adminRichDataSource, /generate_series\(1, 28\)/);
assert.match(adminRichDataSource, /floor\(\(sequence\.n - 1\) \* 90\.0 \/ 27\)/);
assert.match(adminRichDataSource, /when 0 then 'CASH'[\s\S]*when 1 then 'QRIS'[\s\S]*when 2 then 'E_WALLET'[\s\S]*else 'CARD'/);
assert.match(adminRichDataSource, /when 0 then 'COMPLETED'[\s\S]*when 1 then 'BOOKED'[\s\S]*else 'PENDING'/);
assert.match(adminRichDataSource, /'Bambang Pamungkas'[\s\S]*'Doni Tata'[\s\S]*'Budi Santoso'/);
assert.match(adminRichDataSource, /join public\.customers customer_row on customer_row\.phone = seed\.customer_phone[\s\S]*join public\.vehicles vehicle_row on vehicle_row\.customer_id = customer_row\.id[\s\S]*vehicle_row\.plate = seed\.vehicle_plate/);
assert.match(adminRichDataSource, /select seed\.transaction_id, seed\.transaction_code, customer_row\.id, vehicle_row\.id/);
assert.doesNotMatch(adminRichDataSource, /selected\.vehicle_id/);
assert.match(adminRichDataSource, /insert into private\.demo_transaction_registry/);
assert.match(paidDemoMigrationSource, /set payment_status = 'PAID'[\s\S]*from private\.demo_transaction_registry/);
assert.match(paidDemoMigrationSource, /set_config\('rinse\.payment_update', 'on', true\)/);
assert.match(paidDemoMigrationSource, /payment_status not in \('PAID', 'REFUNDED'\)/);
assert.match(paidDemoMigrationSource, /transaction_status <> 'CANCELLED'/);
assert.doesNotMatch(paidDemoMigrationSource, /create table|alter table/i);
assert.match(appSource, /\['create_demo_service_order', 'create_demo_product_order'\]\.includes\(name\)\)\s*\{\s*requestSession = \{ access_token: SUPABASE_PUBLISHABLE_KEY \};/);
assert.match(appSource, /payment-status-\$\{String\(tx\.payment_status\)\.toLowerCase\(\)\}/);
assert.match(polishSource, /\.payment-status-paid\s*\{\s*color:\s*#26724e/i);
assert.doesNotMatch(simulatedPaymentSource, /grant execute on function public\.create_demo_(?:service|product)_order\(jsonb\) to authenticated/i);
for (const [name, signature] of [
  ['lookup_customer_profile_by_capability', 'text, text'],
  ['create_service_booking_with_capability', 'jsonb, text, text'],
  ['create_product_sale_with_capability', 'jsonb, text'],
  ['lookup_customer_history_with_capability', 'text, text'],
  ['cancel_customer_booking_with_capability', 'text, text']
]) {
  assert.match(capabilitySource, new RegExp(`revoke all on function public\\.${name}\\(${signature.replace(/, /g, ', ')}\\) from public, anon, authenticated`));
  assert.match(capabilitySource, new RegExp(`grant execute on function public\\.${name}\\(${signature.replace(/, /g, ', ')}\\) to anon, authenticated`));
}
assert.match(capabilitySource, /grant select on public\.services_products to anon/);
assert.match(capabilitySource, /revoke all on public\.customers, public\.vehicles, public\.transactions from public, anon/);
assert.match(capabilitySource, /grant select, insert, update, delete on public\.customers, public\.vehicles, public\.services_products, public\.transactions to authenticated/);
assert.match(capabilitySource, /create policy "Capability customer catalog read" on public\.services_products\s+for select to anon using \(active = true\)/);
assert.match(capabilitySource, /for all to authenticated using \(public\.is_rinse_admin\(\)\) with check \(public\.is_rinse_admin\(\)\)/);

for (const method of ['QRIS', 'E_WALLET', 'CARD']) {
  assert.equal(validateServicePaymentMethod(method, 'BOOKING'), method);
  assert.equal(validateServicePaymentMethod(method, 'WALK_IN'), method);
}
assert.equal(validateServicePaymentMethod('CASH', 'WALK_IN'), 'CASH');
assert.throws(() => validateServicePaymentMethod('CASH', 'BOOKING'), /Self-Service/);
assert.throws(() => validateServicePaymentMethod('BANK_TRANSFER', 'BOOKING'), /Pilih metode pembayaran/);
assert.equal(isValidIndonesianPlate('H 1234 NP'), true);
assert.equal(isValidIndonesianPlate('ab 12 c'), true);
assert.equal(isValidIndonesianPlate('1234'), false);
assert.equal(isValidIndonesianPlate('ABC 1234 QZ'), false);
assert.equal(isValidIndonesianPlate('H 12345 NP'), false);
assert.equal(isValidRequestId('78df9b22-f1e7-4a9a-ac72-e0e6823409ef'), true);
assert.equal(isValidRequestId('not-a-uuid'), false);
const validWalkInResponse = {
  id: '78df9b22-f1e7-4a9a-ac72-e0e6823409ef', code: 'RS-261012-ED7CFF9A',
  customer_id: 'customer-id', vehicle_id: 'vehicle-id', item_id: 'svc-car', item_type: 'SERVICE',
  transaction_type: 'WALK_IN', payment_method: 'QRIS', amount: 50000,
  booking_date: '2026-10-12', booking_time: '09:37:00', duration_minutes: 50,
  payment_status: 'PAID', transaction_status: 'PENDING', bay_number: null
};
const validWalkInExpectation = {
  item_id: 'svc-car', transaction_type: 'WALK_IN', transaction_status: 'PENDING', payment_method: 'QRIS', amount: 50000, duration_minutes: 50
};
assert.equal(isValidServiceOrderResponse(validWalkInResponse, validWalkInExpectation), true);
assert.equal(isValidServiceOrderResponse({ ...validWalkInResponse, amount: 1 }, validWalkInExpectation), false);
assert.equal(isValidServiceOrderResponse({ ...validWalkInResponse, transaction_status: 'BOOKED' }, validWalkInExpectation), false);
assert.equal(isValidServiceOrderResponse({ ...validWalkInResponse, bay_number: 5 }, validWalkInExpectation), false);
assert.equal(isValidServiceOrderResponse({ ...validWalkInResponse, transaction_type: 'BOOKING', transaction_status: 'BOOKED', bay_number: 1 }, {
  ...validWalkInExpectation, transaction_type: 'BOOKING', transaction_status: 'BOOKED'
}), true);
const validProductResponse = {
  id: 'a1e096b2-ee77-410b-8a68-e7a68057d9f3', code: 'RS-261012-3950ADC5', customer_id: 'customer-id',
  vehicle_id: null, item_id: 'prd-shampoo', item_type: 'PRODUCT', transaction_type: 'SHOP',
  payment_method: 'CASH', quantity: 2, amount: 90000, payment_status: 'PAID',
  transaction_status: 'PENDING', refund_status: 'NONE', queue_status: 'WAITING',
  duration_minutes: 0, bay_number: null, booking_date: '2026-10-12', booking_time: '10:11:00'
};
const validProductExpectation = { item_id: 'prd-shampoo', quantity: 2, payment_method: 'CASH', amount: 90000 };
assert.equal(isValidDemoProductOrderResponse(validProductResponse, validProductExpectation), true);
assert.equal(isValidDemoProductOrderResponse({ ...validProductResponse, amount: 1 }, validProductExpectation), false);
assert.equal(isValidDemoProductOrderResponse({ ...validProductResponse, transaction_status: 'PAID' }, validProductExpectation), false);
assert.equal(normalizeTransactionStatusForDisplay({ payment_status: 'PAID', transaction_status: 'PENDING' }), 'WAITING');
assert.equal(normalizeTransactionStatusForDisplay({ payment_status: 'PENDING', transaction_status: 'PENDING' }), 'PENDING');

assert.equal(resolveCustomerIdentity({
  name: 'Nadia Prameswari',
  phone: '081234567890',
  existingCustomers: [{ id: 'customer-a', full_name: 'Nadia Prameswari', phone: '081234567890' }]
}).mismatch, false);
assert.equal(resolveCustomerIdentity({
  name: 'Rafi Mahendra',
  phone: '081234567890',
  existingCustomers: [{ id: 'customer-a', full_name: 'Nadia Prameswari', phone: '081234567890' }]
}).mismatch, true);
const customerA = { id: 'customer-a', full_name: 'Alya', phone: '081111111111', vehicles: [] };
const customerB = { id: 'customer-b', full_name: 'Bima', phone: '082222222222', vehicles: [] };
assert.equal(customerA.vehicles.length, 0);
assert.equal(hasCustomerPhoneChanged(customerA.phone, customerB.phone), true);
assert.equal(hasCustomerPhoneChanged('0811-1111-1111', '081111111111'), false);
assert.equal(toSupabasePhone('0812-3456-7890'), '+6281234567890');
assert.equal(verifiedPhoneMatchesInput('+6281234567890', '0812 3456 7890'), true);
assert.equal(verifiedPhoneMatchesInput('+6281234567890', '081298765432'), false);
assert.throws(() => toSupabasePhone('12345'), /nomor HP Indonesia/);
assert.equal(toSupabasePhone('0812-3456-7890'), '+6281234567890');
assert.equal(resolveCustomerIdentity({
  name: customerA.full_name,
  phone: customerB.phone,
  existingCustomers: [customerB]
}).mismatch, true);
assert.equal(resolveCustomerIdentity({
  name: customerB.full_name,
  phone: customerB.phone,
  existingCustomers: [customerB]
}).customer.id, customerB.id);

assert.notEqual(submitStart, -1);
assert.match(submitSource, /validateServicePaymentMethod\(/);
assert.match(submitSource, /toSupabasePhone\(phone\)/);
assert.match(submitSource, /payment_status: 'PAID'/);
assert.match(submitSource, /String\(data\.get\('name'\) \|\| ''\)\.trim\(\)/);
assert.match(submitSource, /String\(data\.get\('phone'\) \|\| ''\)\.trim\(\)/);
assert.match(submitSource, /String\(data\.get\('model'\) \|\| ''\)\.trim\(\)/);
assert.match(submitSource, /isValidIndonesianPlate\(plate\)/);
assert.doesNotMatch(submitSource, /findOrCreateCustomer|customerCapability/);
assert.match(persistenceSource, /rpcRequest\('create_demo_service_order',\s*\{\s*p_order:/);
assert.match(persistenceSource, /rpcRequest\('create_demo_product_order',\s*\{\s*p_order:/);
assert.match(persistenceSource, /isValidDemoProductOrderResponse\(result/);
assert.match(persistenceSource, /request_id: requestId/);
assert.match(persistenceSource, /isValidServiceOrderResponse\(result/);
assert.match(persistenceSource, /return tx/);
assert.match(appSource, /result\.payment_status === 'PAID'/);
assert.match(appSource, /result\.transaction_status === expected\.transaction_status/);
assert.match(appSource, /if \(form\.dataset\.submitting === 'true'\) return/);
assert.match(appSource, /showToast\(serviceOrderErrorMessage\(error\), 'error', 'service-order'\)/);
assert.match(appSource, /event\.preventDefault\(\);\s*const form = event\.target/);
assert.match(appSource, /const activeSession = adminUser \? supabaseSession : null/);
assert.match(appSource, /const requestSession = adminUser \? supabaseSession : null/);
assert.match(appSource, /openDialog\(action === 'service-order' \? 'order'/);
assert.match(appSource, /method !== 'GET'\) requireAdminAuthorization\(\)/);
assert.match(appSource, /function removeUnauthorizedAdminMutations\(/);
assert.match(appSource, /!\['overview', 'transactions', 'queue', 'self-service', 'customers', 'catalog', 'reports'\]\.includes\(tab\)/);
assert.doesNotMatch(appSource, /else if \(tab === 'bookings'\)/);
assert.doesNotMatch(appSource, /action === 'booking'/);
assert.match(appSource, /openDialog\('order', service\.dataset\.service\)/);
assert.match(serviceFormSource, /Pilih layanan<select name="service_id" required>/);
assert.match(serviceFormSource, /name="request_id" value="\$\{crypto\.randomUUID\(\)\}"/);
assert.match(serviceFormSource, /name="model"/);
assert.match(serviceFormSource, /name="plate" required/);
assert.match(serviceFormSource, /name="payment" required/);
assert.match(serviceFormSource, /id="flow-total"/);
assert.doesNotMatch(serviceFormSource, /addon|vehicle_id|Kendaraan terdaftar|name="(?:date|time|bay_number)"/i);
assert.doesNotMatch(appSource, /firstAvailableBay|isBayScheduledForWindow/);
assert.match(serviceFormSource, /pembayaran simulasi dicatat lunas saat order tersimpan/);
assert.doesNotMatch(serviceFormSource, /menunggu konfirmasi pembayaran/);
assert.doesNotMatch(appSource, /lookup_customer_history_with_capability|cancel_customer_booking_with_capability|renderHistory\(/);
assert.match(capabilitySource, /create schema if not exists private/);
assert.match(capabilitySource, /revoke all on schema private from public, anon, authenticated/);
assert.match(capabilitySource, /create table if not exists private\.customer_capabilities/);
assert.match(profileCapabilitySource, /where capability\.owner_token_hash = token_hash/);
assert.match(capabilitySource, /capability\.owner_token_hash = digest\(owner_token, 'sha256'\)/);
assert.match(capabilitySource, /saved := public\.record_service_transaction\(p_transaction, p_addon_id\);\s*return saved;/);
assert.match(capabilitySource, /new_stock := public\.record_product_sale\(p_transaction\);\s*return new_stock;/);
assert.match(profileCapabilitySource, /return query\s+select c\.id, c\.full_name, c\.phone, v\.id, v\.type, v\.plate, v\.model, c\.address/);
assert.match(historyCapabilitySource, /where t\.customer_id = owner_id/);
assert.match(historyCapabilitySource, /where owner_token_hash = digest\(p_owner_token, 'sha256'\)[\s\S]*if owner_id is null then raise exception/);
assert.match(historyCapabilitySource, /return query\s+select t\.id, t\.code,[\s\S]*t\.refund_status, t\.bay_number/);
assert.match(cancelCapabilitySource, /where id = p_transaction_id and customer_id = owner_id and transaction_type = 'BOOKING'/);
assert.match(cancelCapabilitySource, /where owner_token_hash = digest\(p_owner_token, 'sha256'\)[\s\S]*if owner_id is null then raise exception/);
assert.match(cancelCapabilitySource, /return to_jsonb\(tx\)/);
assert.doesNotMatch(capabilitySource, /grant\s+[^;]*customer_capabilities/i);
assert.doesNotMatch(capabilitySource, /grant\s+[^;]*owner_token_hash/i);
assert.match(capabilitySource, /drop function if exists public\.cancel_customer_booking_with_capability\(text, text, text\)/);
assert.match(capabilitySource, /revoke all on function public\.lookup_transaction_history\(text\) from public, anon, authenticated/);
assert.match(capabilitySource, /revoke all on function public\.cancel_transaction\(text, text\) from public, anon, authenticated/);
assert.match(appSource, /customerBoundRpc = \['lookup_customer_by_phone', 'record_service_transaction', 'record_product_sale'\]/);
assert.match(appSource, /if \(customerBoundRpc && !adminRpc\) \{\s*throw new Error\('Operasi customer ditutup/);
assert.doesNotMatch(appSource, /attachCustomerEmailOtpControls|sendCustomerEmailOtp|verifyCustomerEmailOtp|requireVerifiedCustomerEmail|type: 'sms'/);
assert.match(appSource, /user\.app_metadata\?\.rinse_role !== 'admin'/);
assert.match(appSource, /requestHeaders\('return=representation', supabaseSession\).*GET \/auth\/v1\/user/);
assert.match(appSource, /session\.user\?\.app_metadata\?\.rinse_role !== 'admin'/);
assert.match(appSource, /const adminRpc = page === 'admin' && adminUser\?\.app_metadata\?\.rinse_role === 'admin'/);
assert.match(appSource, /if \(adminOnlyRpc && !adminRpc\) throw new Error/);
assert.match(appSource, /async function openAdmin\(\)[\s\S]*setPage\('admin'\)[\s\S]*loadAdminData\(\)/);
assert.match(appSource, /if \(page === 'admin'\) \{\s*app\.innerHTML = renderAdmin\(\)/);
assert.match(appSource, /if \(!adminDataReady\) \{/);
assert.match(appSource, /rpcRequest\('get_demo_admin_snapshot'\)/);
assert.match(appSource, /id="admin-login-form"/);
assert.match(appSource, /user\.app_metadata\?\.rinse_role !== 'admin'/);
assert.match(appSource, /removeUnauthorizedAdminMutations\(app\)/);
assert.doesNotMatch(appSource, /admin-readonly-notice/);
assert.match(indexSource, /id="admin-shortcut" aria-label="Login Admin">Login Admin/);
assert.match(appSource, />Tandai Lunas<\/button>/);
assert.match(appSource, /tx\.payment_status === 'PENDING' && tx\.transaction_status === 'PENDING'[\s\S]*tx\.payment_method === 'CASH'/);
assert.match(appSource, /rpcRequest\('confirm_transaction_payment'[\s\S]*await loadAdminData\(\);\s*activateAdminTab\('transactions'\)/);
assert.match(appSource, /await signInAdmin\([\s\S]*await openAdmin\(\)/);
assert.doesNotMatch(appSource, /renderAdminDemo|demoAdminOrders|data-demo-order-status/);
assert.match(persistenceSource, /mergePersistedTransaction\(tx, result\)/);
assert.match(persistenceSource, /Database belum mengonfirmasi penyimpanan pesanan layanan/);
assert.notEqual(productSubmitStart, -1);
assert.match(productSubmitSource, /requestId = requestIds\[id\]/);
assert.match(productSubmitSource, /payment_status: 'PAID'/);
assert.match(productSubmitSource, /customerResult = isAdmin \? await findOrCreateCustomer/);
assert.match(productSubmitSource, /completedTransactions\.push\(savedTransaction\)/);
assert.match(productSubmitSource, /escapeHtml\(saved\.code\)/);
assert.match(productSubmitSource, /statusBadge\(saved\.payment_status\)/);
assert.match(productSubmitSource, /statusBadge\(transactionStatusLabel\(saved\)\)/);
assert.match(productFormSource, /getProductRequestId\(id\)/);
assert.match(productFormSource, /name="request_ids" value="\$\{escapeHtml\(JSON\.stringify\(requestIds\)\)\}"/);
assert.match(authorizationSource, /revoke all on function public\.lookup_customer_by_phone\(text\) from public, anon/);
assert.match(appSource, /statusBadge\(tx\.payment_status\)/);
assert.match(migrationSource, /where id = p_transaction ->> 'vehicle_id' and customer_id = customer\.id/);
assert.match(migrationSource, /total_amount := service\.price \+ addon_price/);
assert.match(migrationSource, /starts_at < opens_at or ends_at > closes_at/);
assert.match(migrationSource, /pg_advisory_xact_lock\(78131, bay\)/);
assert.match(migrationSource, /new\.payment_status <> 'PENDING'/);
assert.match(migrationSource, /and t\.payment_status in \('PENDING', 'PAID'\)/);
assert.match(migrationSource, /revoke insert, delete on public\.transactions from public, anon, authenticated/);
assert.match(migrationSource, /old\.transaction_type is distinct from new\.transaction_type/);
assert.match(migrationSource, /current_setting\('rinse\.reconciliation_update', true\)/);
assert.match(migrationSource, /services_products_addon_reference_guard/);
assert.match(migrationSource, /revoke all on function public\.reconcile_self_service_transactions\(\) from public, anon, authenticated/);
assert.match(authorizationSource, /auth\.jwt\(\) -> 'app_metadata' ->> 'rinse_role'/);
assert.match(authorizationSource, /Role-gated admin access/);
assert.match(authorizationSource, /public\.normalize_indonesian_phone\(auth\.jwt\(\) ->> 'phone'\)/);
assert.match(operationsSource, /cron\.schedule\('rinse-self-service-reconciliation','\* \* \* \* \*'/);

assert.match(authorizationSource, /Staging order: baseline migrations\/seeds -> this proposal -> multi-addon-booking-integrity-proposal\.sql/);
assert.match(migrationSource, /Staging order from a reviewed reset baseline:[\s\S]*admin-role-authorization-proposal\.sql -> this proposal -> customer-capability-booking-migration\.sql/);
assert.match(migrationSource, /optional fixture-only t-20-seed-reconciliation\.sql and booking-seed-payment-reconciliation\.sql/);
assert.match(migrationSource, /Do not run business-flow-hardening\.sql[\s\S]*superseded pickup-rpc-hardening-proposal\.sql must never be run/);
assert.match(readmeSource, /schema\.sql[\s\S]*rls-authenticated-access\.sql[\s\S]*self-service-bay-live-migration\.sql[\s\S]*business-flow-hardening\.sql[\s\S]*catalog-revision\.sql[\s\S]*admin-role-authorization-proposal\.sql[\s\S]*multi-addon-booking-integrity-proposal\.sql[\s\S]*customer-capability-booking-migration\.sql/);
assert.match(pickupSource, /SUPERSEDED: do not execute this file/);
assert.ok(pickupSource.indexOf("raise exception 'Superseded proposal") < pickupSource.indexOf('create or replace function public.record_service_transaction('));
assert.match(pickupSource, /customer_id to the verified JWT/);

assert.match(bookingRpcSource, /public\.current_verified_customer_id\(\)/);
assert.match(bookingRpcSource, /customer\.id is distinct from verified_customer_id/);
assert.match(bookingRpcSource, /where id = p_transaction ->> 'vehicle_id' and customer_id = customer\.id/);
assert.match(bookingRpcSource, /jsonb_array_elements_text\(coalesce\(p_transaction -> 'addon_ids'/);
assert.match(bookingRpcSource, /sum\(price\).*sum\(duration\)/);
assert.match(bookingRpcSource, /service_duration <> service\.duration/);
assert.match(bookingRpcSource, /starts_at < opens_at or ends_at > closes_at/);
assert.match(bookingRpcSource, /pg_advisory_xact_lock\(78131, bay\)/);
assert.match(bookingRpcSource, /t\.payment_status in \('PENDING', 'PAID'\)/);
assert.match(bookingRpcSource, /selected_addons, 'SERVICE',[\s\S]*total_amount,[\s\S]*'PENDING', 'NONE'/);
assert.doesNotMatch(bookingRpcSource, /p_transaction ->> '(amount|payment_status|transaction_status|refund_status)'/);
assert.match(migrationSource, /tgfoid = 'public\.guard_transaction_integrity\(\)'::regprocedure/);
assert.match(migrationSource, /pg_get_userbyid\(proc\.proowner\) in \('anon', 'authenticated'\)/);
assert.match(migrationSource, /pg_get_userbyid\(proc\.proowner\) not in \('postgres', 'service_role'\)/);
assert.match(migrationSource, /proc\.oid in \([\s\S]*record_service_transaction\(jsonb, text\)[\s\S]*record_product_sale\(jsonb\)[\s\S]*reconcile_self_service_transactions\(\)/);
assert.match(migrationSource, /revoke all on function public\.record_service_transaction\(jsonb, text\) from public, anon, authenticated/);
assert.match(migrationSource, /grant execute on function public\.record_service_transaction\(jsonb, text\) to authenticated/);
assert.doesNotMatch(migrationSource, /grant execute on function public\.record_service_transaction\(jsonb, text\) to anon/);
assert.match(authorizationSource, /revoke all on function public\.confirm_booking_payment\(text\) from public, anon, authenticated/);
assert.match(authorizationSource, /grant execute on function public\.confirm_booking_payment\(text\) to service_role/);
assert.doesNotMatch(authorizationSource, /grant execute on function public\.record_service_transaction\(jsonb, text\)/);
assert.match(authorizationSource, /alter function public\.confirm_booking_payment\(text\) set search_path to pg_catalog, public, pg_temp/);
assert.match(authorizationSource, /alter function public\.get_public_today_wash_count\(\) set search_path to pg_catalog, public, pg_temp/);
assert.match(authorizationSource, /if not public\.is_rinse_admin\(\) then raise exception 'Akses Admin diperlukan untuk konfirmasi pembayaran\.'/);
assert.match(authorizationSource, /if not public\.is_rinse_admin\(\) then raise exception 'Akses Admin diperlukan untuk mencatat refund\.'/);
assert.match(authorizationSource, /revoke all on function public\.reconcile_self_service_transactions\(\) from public, anon, authenticated/);
assert.match(authorizationSource, /grant execute on function public\.reconcile_self_service_transactions\(\) to service_role/);
assert.match(accessSource, /grant select, insert, update, delete on public\.customers, public\.vehicles, public\.services_products, public\.transactions to authenticated/);
assert.match(authorizationSource, /for all to authenticated using \(public\.is_rinse_admin\(\)\) with check \(public\.is_rinse_admin\(\)\)/);
for (const proposal of [authorizationSource, migrationSource]) {
  const definerLines = proposal.split('\n').filter(line => /^\s*(returns|language)\b.*security definer/i.test(line));
  assert.ok(definerLines.length > 0);
  assert.ok(definerLines.every(line => /security definer set search_path = pg_catalog, public, (?:auth, )?pg_temp/i.test(line)));
}

const localTransaction = { payment_status: 'PAID', transaction_status: 'BOOKED' };
mergePersistedTransaction(localTransaction, { payment_status: 'PENDING', transaction_status: 'PENDING' });
assert.equal(localTransaction.payment_status, 'PENDING');
assert.equal(localTransaction.transaction_status, 'PENDING');

assert.doesNotMatch(appSource, /renderLegacyBookingChoiceDialog|renderLegacyScheduledTransactionForm|renderLegacyScheduledSelfServiceTransactionForm|renderAdminBookings/);
assert.match(appSource, /button\.dataset\.action = 'service-order'/);
assert.doesNotMatch(appSource, /action === 'booking'|else if \(tab === 'bookings'\)/);
assert.match(appSource, /button\.dataset\.action = 'self-service-order'/);
assert.doesNotMatch(appSource, /includes\(action\).*self-service-book/);
assert.doesNotMatch(indexSource, />Booking</i);

console.log('booking helper tests: PASS');
