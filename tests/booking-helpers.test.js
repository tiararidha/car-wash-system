const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
  hasAdminRole,
  getServiceDuration,
  calculateFinancialSummary,
  calculateFinancialMetrics,
  isRevenueTransaction,
  checkServiceLifecycles,
  formatServiceTimeRange,
  formatTransactionTime,
  hasCustomerPhoneChanged,
  toSupabasePhone,
  verifiedPhoneMatchesInput,
  mergePersistedTransaction,
  removeTransactionFromState,
  normalizeAdminSnapshot,
  isValidIndonesianPlate,
  isValidRequestId,
  isValidServiceOrderResponse,
  isValidDemoProductOrderResponse,
  normalizeTransactionStatusForDisplay,
  countActiveQueueTransactions,
  filterQueueTransactionsForDate,
  resolveCustomerIdentity,
  validateServicePaymentMethod,
  normalizePaymentMethod,
  validatePaymentMethod,
  sanitizeQuantity,
  paymentStatusForMethod,
  productShippingFee,
  adminProductShippingFee,
  calculateProductAmount,
  recognizedRevenueAmount,
  shippingRevenueAmount,
  collectedAmount,
  isStudioOpenAt,
  validateTransactionSchedule,
  getMaxAllowedTransactionDate,
  isValidCustomerCapabilityToken,
  requireCustomerCapabilityToken,
  sanitizeCart,
  PRODUCT_CATALOG_IDS,
  migrateProductStorage,
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
const themeSource = fs.readFileSync(path.join(__dirname, '..', 'theme.css'), 'utf8');
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
const demoDateCorrectionSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261019000005_cap_demo_transaction_dates.sql'), 'utf8');
const wibScheduleMigrationSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261022000000_dynamic_transaction_time_and_product_fulfillment.sql'), 'utf8');
const legacyPerfumeCleanupSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261025000000_remove_legacy_perfume_product.sql'), 'utf8');
const canonicalDurationCogsMigrationSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261025010000_canonical_service_duration_and_product_cogs.sql'), 'utf8');
const bookingSyncMigrationSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261025020000_booking_state_synchronization.sql'), 'utf8');
const adminSnapshotResilienceSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261025030000_admin_snapshot_resilience.sql'), 'utf8');
const paidProductStockMigrationSource = fs.readFileSync(path.join(__dirname, '..', 'supabase', 'migrations', '20261026000000_paid_product_stock_lifecycle.sql'), 'utf8');
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
const adminSaveStart = appSource.indexOf('async function saveAdminTransaction(form)');
const adminSaveEnd = appSource.indexOf('\nasync function deleteAdminTransaction', adminSaveStart);
const adminSaveSource = appSource.slice(adminSaveStart, adminSaveEnd);
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
const productCardStart = appSource.indexOf('function productCard(');
const productCardEnd = appSource.indexOf('\nfunction isAdminAuthorized', productCardStart);
const productCardSource = appSource.slice(productCardStart, productCardEnd);
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
assert.equal(getServiceDuration('Self-Service Motorcycle'), 20);
assert.equal(getServiceDuration('svc-self-moto', 25), 20);
assert.equal(getServiceDuration('Self-Service Car'), 30);
assert.equal(getServiceDuration('Professional Motorcycle Wash'), 35);
assert.equal(getServiceDuration('Professional Car Wash'), 50);
assert.equal(formatServiceTimeRange('11:02:00', getServiceDuration('Self-Service Motorcycle')), '11:02 - 11:22');
assert.equal(formatTransactionTime({ item_type: 'SERVICE', item_name: 'Self-Service Car', booking_time: '11:02:00', duration_minutes: 25 }), '11:02 - 11:32');
const financialSummary = calculateFinancialSummary([
  { item_type: 'SERVICE', payment_status: 'PAID', transaction_status: 'COMPLETED', amount: 100 },
  { item_type: 'PRODUCT', item_id: 'prd-one', payment_status: 'PAID', transaction_status: 'COMPLETED', amount: 100, shipping_fee: 10, quantity: 2, cogs_amount: 40 },
  { item_type: 'PRODUCT', item_id: 'prd-cost-missing', payment_status: 'PAID', transaction_status: 'COMPLETED', amount: 50, quantity: 1, cogs_amount: null },
  { item_type: 'PRODUCT', item_id: 'prd-two', payment_status: 'PENDING', transaction_status: 'PENDING', amount: 500, quantity: 1, unit_cost: 40 }
]);
assert.equal(financialSummary.serviceRevenue, 100);
assert.equal(financialSummary.productRevenue, 140);
assert.equal(financialSummary.shippingRevenue, 10);
assert.equal(financialSummary.grossRevenue, 240);
assert.equal(financialSummary.totalRevenue, 240);
assert.equal(financialSummary.cashCollected, 250);
assert.equal(financialSummary.cogs, 40);
assert.equal(financialSummary.grossProfit, 200);
assert.equal(financialSummary.costRecordedCount, 1);
const reconciledRows = [
  { item_type: 'SERVICE', payment_status: 'PAID', transaction_status: 'COMPLETED', amount: '50000' },
  { item_type: 'PRODUCT', status: 'PAID', transaction_status: 'COMPLETED', amount: '75000', shipping_fee: '10000' },
  { item_type: 'SERVICE', payment_status: 'PENDING', amount: '900000' },
  { item_type: 'PRODUCT', payment_status: 'PAID', transaction_status: 'CANCELLED', amount: '200000' }
];
const reconciledMetrics = calculateFinancialMetrics(reconciledRows);
assert.equal(reconciledMetrics.totalRevenue, 115000);
assert.equal(reconciledMetrics.cashCollected, 125000);
assert.equal(reconciledMetrics.paidTransactionCount, reconciledRows.filter(isRevenueTransaction).length);
assert.equal(isRevenueTransaction({ payment_status: 'PENDING', status: 'PAID', amount: '50' }), false);
assert.equal(calculateFinancialMetrics([{ item_type: 'SERVICE', payment_status: 'PENDING', status: 'PAID', amount: '50000' }]).totalRevenue, 0);
assert.equal(calculateFinancialMetrics([{ item_type: 'SERVICE', payment_status: 'PAID', amount: '50000' }]).totalRevenue, 50000);
const metricsBeforeBooking = calculateFinancialMetrics(reconciledRows);
const reactiveRows = [...reconciledRows, { item_type: 'SERVICE', payment_status: 'PAID', amount: '50000' }];
const metricsAfterBooking = calculateFinancialMetrics(reactiveRows);
assert.equal(metricsAfterBooking.totalRevenue - metricsBeforeBooking.totalRevenue, 50000);
assert.equal(metricsAfterBooking.paidTransactionCount, metricsBeforeBooking.paidTransactionCount + 1);
const lifecycleStart = Date.now();
const lifecycleFixture = [{
  id: 'lifecycle-a', item_type: 'SERVICE', transaction_type: 'BOOKING',
  payment_status: 'PAID', transaction_status: 'BOOKED', queue_status: 'WAITING',
  start_time: new Date(lifecycleStart - 20 * 60000).toISOString(),
  finished_at: new Date(lifecycleStart).toISOString(), duration_minutes: 20
}];
const lifecycleResult = checkServiceLifecycles(lifecycleFixture, lifecycleStart + 1);
assert.equal(lifecycleResult[0].transaction_status, 'COMPLETED');
assert.equal(lifecycleResult[0].queue_status, 'COMPLETED');
const activeLifecycle = checkServiceLifecycles([{
  item_type: 'SERVICE', transaction_type: 'WALK_IN', payment_status: 'PAID',
  transaction_status: 'PENDING', queue_status: 'WAITING', start_time: new Date(lifecycleStart - 60000).toISOString(),
  finished_at: new Date(lifecycleStart + 20 * 60000).toISOString(), duration_minutes: 20
}], lifecycleStart);
assert.equal(activeLifecycle[0].transaction_status, 'ACTIVE');
assert.equal(activeLifecycle[0].queue_status, 'WASHING');
assert.equal(sanitizeQuantity('3'), 3);
assert.equal(sanitizeQuantity('0'), 1);
assert.equal(sanitizeQuantity('invalid'), 1);
assert.equal(paymentStatusForMethod('QRIS', 'PENDING'), 'PAID');
assert.equal(paymentStatusForMethod('TRANSFER', 'PENDING'), 'PAID');
assert.equal(paymentStatusForMethod('E_WALLET', 'PENDING'), 'PAID');
assert.equal(paymentStatusForMethod('CARD', 'PENDING'), 'PAID');
assert.equal(normalizePaymentMethod('CASH'), 'QRIS');
assert.equal(normalizePaymentMethod('TRANSFER'), 'QRIS');
assert.equal(normalizePaymentMethod('UNKNOWN'), 'QRIS');
assert.equal(paymentStatusForMethod('CASH', 'PENDING'), 'PAID');
assert.throws(() => validatePaymentMethod('CASH'), /non-tunai/);
assert.equal(paymentStatusForMethod('CARD', 'REFUNDED'), 'REFUNDED');
assert.throws(() => requireCustomerCapabilityToken(undefined), /tidak tersedia/);
assert.throws(() => requireCustomerCapabilityToken('invalid-token'), /tidak valid/);
assert.deepEqual(sanitizeCart({ 'prd-a': { quantity: 2 }, 'prd-b': { quantity: 0 }, 'prd-c': { quantity: 'nope' } }), {
  'prd-a': { quantity: 2 }
});
assert.deepEqual(sanitizeCart([]), {});
assert.deepEqual(PRODUCT_CATALOG_IDS, ['prd-cloth', 'prd-interior', 'prd-glass', 'prd-shampoo', 'prd-tire', 'prd-wax']);
const legacyProductStorage = new Map([
  ['rinse-society-cart', JSON.stringify({ 'prd-shampoo': { quantity: 1 }, 'prd-perfume': { quantity: 2 } })],
  ['rinse-product-request-ids', JSON.stringify({ 'prd-shampoo': 'valid-id', 'prd-perfume': 'legacy-id' })],
  ['rinse-product-checkout', JSON.stringify({ fee_item_id: 'prd-perfume', fulfillment_method: 'COURIER' })]
]);
const localStorageFixture = {
  getItem: key => legacyProductStorage.get(key) ?? null,
  setItem: (key, value) => legacyProductStorage.set(key, value),
  removeItem: key => legacyProductStorage.delete(key)
};
migrateProductStorage(localStorageFixture);
assert.equal(legacyProductStorage.has('rinse-society-cart'), false);
assert.equal(legacyProductStorage.has('rinse-product-request-ids'), false);
assert.equal(legacyProductStorage.has('rinse-product-checkout'), false);
assert.equal(legacyProductStorage.get('rinse-product-catalog-version'), '20261025.1');
const outdatedProductStorage = new Map([
  ['rinse-society-cart', JSON.stringify({ 'prd-shampoo': { quantity: 1 } })],
  ['rinse-product-catalog-version', '20261025']
]);
migrateProductStorage({
  getItem: key => outdatedProductStorage.get(key) ?? null,
  setItem: (key, value) => outdatedProductStorage.set(key, value),
  removeItem: key => outdatedProductStorage.delete(key)
});
assert.equal(outdatedProductStorage.has('rinse-society-cart'), false);
assert.equal(outdatedProductStorage.get('rinse-product-catalog-version'), '20261025.1');
assert.equal(recognizedRevenueAmount({ item_type: 'PRODUCT', amount: 70000, shipping_fee: 10000 }), 60000);
assert.equal(shippingRevenueAmount({ item_type: 'PRODUCT', amount: 70000, shipping_fee: 10000 }), 10000);
assert.equal(collectedAmount({ item_type: 'PRODUCT', amount: 70000, shipping_fee: 10000 }), 70000);
assert.equal(recognizedRevenueAmount({ item_type: 'SERVICE', amount: 50000, shipping_fee: 0 }), 50000);
assert.equal(calculateFinancialSummary([
  { item_type: 'PRODUCT', payment_status: 'PAID', transaction_status: 'PENDING', amount: 70000, shipping_fee: 10000 },
  { item_type: 'PRODUCT', payment_status: 'PENDING', status: 'PAID', amount: 80000, shipping_fee: 10000 }
]).cashCollected, 70000);
assert.match(paidProductStockMigrationSource, /create trigger transactions_paid_product_stock[\s\S]*after insert or update or delete on public\.transactions/);
assert.match(paidProductStockMigrationSource, /create trigger transactions_pending_product_stock_guard[\s\S]*before insert or update on public\.transactions/);
assert.match(paidProductStockMigrationSource, /available_stock < new\.quantity/);
assert.match(paidProductStockMigrationSource, /sum\(transaction_row\.quantity\)[\s\S]*payment_status = 'PENDING'[\s\S]*available_stock := available_stock - pending_stock/);
assert.match(paidProductStockMigrationSource, /new_consumed := new\.item_type = 'PRODUCT'[\s\S]*new\.payment_status = 'PAID'/);
assert.match(paidProductStockMigrationSource, /stock = stock - new\.quantity[\s\S]*stock >= new\.quantity/);
assert.match(paidProductStockMigrationSource, /stock = stock \+ old\.quantity/);
assert.match(paidProductStockMigrationSource, /payment_status_value := upper\(coalesce\(p_transaction ->> 'payment_status', 'PENDING'\)\)/);
assert.match(paidProductStockMigrationSource, /COURIER' and \(fulfillment_address_value is null or fulfillment_order_id_value is null\)/);
assert.match(paidProductStockMigrationSource, /to_regclass\('private\.customer_capabilities'\)[\s\S]*legacy_capability_stock_to_restore/);
assert.doesNotMatch(paidProductStockMigrationSource, /create\s+table/i);
assert.match(appSource, /form\.querySelector\('#product-checkout-total'\)\.textContent = money\(subtotal \+ fee\)/);
assert.doesNotMatch(productFormSource, /productFulfillmentDetails\(tx\)/);
assert.match(appSource, /const shippingRow = transaction\.item_type === 'PRODUCT'[\s\S]*money\(shippingFee\)/);
assert.match(appSource, /receipt-address[\s\S]*fulfillment_address/);
assert.match(adminSaveSource, /const amount = item\.item_type === 'PRODUCT'[\s\S]*calculateProductAmount\(item\.price, quantity, shippingFee\)/);
assert.match(wibScheduleMigrationSource, /delete from public\.transactions where item_id = 'prd-perfume';\s*delete from public\.services_products where id = 'prd-perfume' and item_type = 'PRODUCT';/);
assert.match(legacyPerfumeCleanupSource, /delete from public\.transactions transaction_row[\s\S]*transaction_row\.item_id in \(select id from legacy_products\)/);
assert.match(legacyPerfumeCleanupSource, /where transaction_row\.item_id = 'prd-perfume'/);
assert.match(legacyPerfumeCleanupSource, /lower\(trim\(name\)\) = 'pewangi' and price = 10000/);
assert.match(legacyPerfumeCleanupSource, /delete from public\.services_products catalog_row/);
assert.match(canonicalDurationCogsMigrationSource, /when 'svc-self-moto' then 20[\s\S]*when 'svc-self-car' then 30[\s\S]*when 'svc-moto' then 35[\s\S]*when 'svc-car' then 50/);
assert.match(canonicalDurationCogsMigrationSource, /add column if not exists unit_cost integer/);
assert.match(canonicalDurationCogsMigrationSource, /add column if not exists cogs_amount integer/);
assert.match(canonicalDurationCogsMigrationSource, /new\.cogs_amount := product_unit_cost \* new\.quantity/);
assert.match(canonicalDurationCogsMigrationSource, /revoke select on public\.services_products from public, anon, authenticated[\s\S]*grant select \(id, item_type, name, category, type, description, price, duration, stock, min_stock, active, image\)[\s\S]*to anon[\s\S]*grant select on public\.services_products to authenticated/);
assert.match(canonicalDurationCogsMigrationSource, /Role-gated catalog and HPP access[\s\S]*auth\.jwt\(\) -> 'app_metadata' ->> 'rinse_role'[\s\S]*= 'admin'/);
assert.doesNotMatch(appSource, /const SEED =|Siti Nurhaliza|seed-tx-/);
assert.match(bookingSyncMigrationSource, /local_start := timezone\('Asia\/Jakarta', clock_timestamp\(\)\)/);
assert.doesNotMatch(bookingSyncMigrationSource, /interval '10 minutes'|08:10/);
assert.match(bookingSyncMigrationSource, /requested_start := local_start at time zone 'Asia\/Jakarta'/);
assert.doesNotMatch(bookingSyncMigrationSource, /existing_service\.category = 'SELF_SERVICE'/);
assert.match(bookingSyncMigrationSource, /transaction_row\.transaction_status in \('PENDING', 'BOOKED', 'ACTIVE'\)/);
assert.match(bookingSyncMigrationSource, /start_time timestamptz generated always/);
assert.match(bookingSyncMigrationSource, /finished_at timestamptz generated always/);
assert.match(bookingSyncMigrationSource, /'customer_name', case when admin_view\.enabled then customer_row\.full_name/);
assert.match(bookingSyncMigrationSource, /alter publication supabase_realtime add table public\.transactions/);
assert.match(bookingSyncMigrationSource, /realtime\.send\([\s\S]*'transaction_changed'[\s\S]*'public:transactions'[\s\S]*false/);
assert.doesNotMatch(bookingSyncMigrationSource, /jsonb_build_object\('customer_name'|jsonb_build_object\('vehicle_plate'/);
assert.match(appSource, /postgres_changes: \[\{ event: '\*', schema: 'public', table: 'transactions' \}\]/);
assert.match(appSource, /message\.payload\?\.event === 'transaction_changed'/);
assert.match(appSource, /async function refreshLiveData\(\)[\s\S]*loadAdminData\(\)[\s\S]*loadPublicData\(\)/);
assert.match(appSource, /document\.addEventListener\('rinse:transactions-changed', refreshCurrentTransactionView\)/);
assert.match(appSource, /function dispatchTransactionStateChange\(\)[\s\S]*dispatchEvent\(new Event\('rinse:transactions-changed'\)\)/);
assert.match(appSource, /function renderAdminMetrics\(\)[\s\S]*\['Transaksi Lunas',[\s\S]*String\(paid\.length\)/);
assert.match(appSource, /Laba Kotor · Tujuh Hari[\s\S]*weeklyMetrics\.grossProfit/);
assert.match(appSource, /function renderAdminTransactionList\([\s\S]*const paidCount = transactions\.filter\(isRevenueTransaction\)\.length/);
assert.match(appSource, /const stages = \['WAITING', 'WASHING'\]/);
assert.match(appSource, /window\.setInterval\(\(\) => \{\s*if \(databaseConnected && document\.visibilityState === 'visible'\) runServiceLifecycleCheck\(\)/);
assert.match(appSource, /function renderBayStatus\(\)[\s\S]*homeBayGrid\.innerHTML = cards/);
assert.match(appSource, /home-bay-section[\s\S]*\$\{renderBayStatus\(\)\}/);
assert.match(appSource, /supabaseRequest\(\s*'transactions', 'GET', null, '\?select=\*&order=created_at\.desc'/);
assert.match(appSource, /supabaseRequest\('transactions', 'GET', null, '\?select=\*'/);
assert.match(appSource, /Belum ada transaksi tercatat\. Buat pesanan pertama melalui Beranda\./);
assert.match(appSource, /customer_name: String\(transaction\.customer_name \|\| customerRelation\?\.full_name \|\| customerRelation\?\.name[\s\S]*transaction\.notes \|\| 'Pelanggan'\)/);
assert.match(appSource, /vehicle_plate: String\(transaction\.vehicle_plate \|\| vehicleRelation\?\.plate_number \|\| vehicleRelation\?\.plate[\s\S]*transaction\.vehicle_id \|\| '-'\)/);
assert.match(adminSnapshotResilienceSource, /customer_row\.full_name/);
assert.doesNotMatch(adminSnapshotResilienceSource, /customer_row\.name/);
assert.match(adminSnapshotResilienceSource, /to_jsonb\(transaction_row\) ->> 'notes'/);
const normalizedAdminFixture = normalizeAdminSnapshot({
  customers: [{ id: 'customer-a', full_name: null }],
  vehicles: [{ id: 'vehicle-a', plate: 'H 1234 AB', type: 'CAR' }],
  services_products: [],
  transactions: [
    { id: 'tx-a', customer_id: 'customer-a', customer_name: null, notes: 'Rendi', vehicle_id: 'vehicle-a', vehicle_plate: null, item_id: 'svc-car', item_type: 'SERVICE', transaction_type: 'WALK_IN', item_name: null, amount: null, payment_method: 'CASH', created_at: '2026-10-25T08:00:00Z' },
    { id: 'tx-b', customer_id: null, vehicle_id: null, item_id: 'legacy-product', item_type: 'PRODUCT', transaction_type: 'SHOP', amount: null }
  ]
});
assert.equal(normalizedAdminFixture.transactions[0].customer_name, 'Rendi');
assert.equal(normalizedAdminFixture.transactions[0].payment_method, 'QRIS');
assert.equal(normalizedAdminFixture.transactions[0].vehicle_plate, 'H 1234 AB');
assert.equal(normalizedAdminFixture.transactions[0].amount, 0);
assert.equal(normalizedAdminFixture.transactions[0].duration_minutes, 50);
assert.equal(normalizedAdminFixture.transactions[1].customer_name, 'Pelanggan');
assert.equal(normalizedAdminFixture.transactions[1].vehicle_plate, '-');
assert.equal(normalizedAdminFixture.services_products.length, 2);
assert.deepEqual(normalizeAdminSnapshot({}), { customers: [], vehicles: [], services_products: [], transactions: [] });
assert.match(submitSource, /created_at: new Date\(\)\.toISOString\(\)/);
assert.match(submitSource, /render\(\);\s*renderBayStatus\(\);/);
assert.match(persistenceSource, /created_at: tx\.created_at/);
assert.match(appSource, /select=id,item_type,name,category,type,description,price,duration,stock,min_stock,active,image&item_type=eq\.PRODUCT/);
assert.match(appSource, /item_type=eq\.PRODUCT&id=in\.\(\$\{PRODUCT_CATALOG_IDS\.join\(','\)\}\)&active=eq\.true/);
assert.match(appSource, /item_type=eq\.SERVICE&active=eq\.true/);
assert.match(appSource, /title: 'Produk Fisik'/);
assert.match(appSource, /item\.item_type !== 'PRODUCT' \|\| PRODUCT_CATALOG_ID_SET\.has\(item\.id\)/);
assert.match(appSource, /data-admin-catalog-filter/);
assert.match(productCardSource, /class="stock-note">STOK \$\{product\.stock\}/);
assert.doesNotMatch(productCardSource, /STOK MENIPIS|low-stock/);
assert.match(appSource, /header-print-button/);
assert.match(appSource, /Laporan Keuangan/);
assert.match(themeSource, /\.product-buy\s*\{[\s\S]*?display:\s*flex[\s\S]*?justify-content:\s*center/);
assert.match(themeSource, /\.stock-note\s*\{[\s\S]*?background:\s*#ecfdf5[\s\S]*?color:\s*#065f46/);
assert.match(appSource, /class="bay-status-copy"><strong>\$\{label\}<\/strong><span class="bay-time">/);
assert.match(themeSource, /\.bay-status-copy\s*\{[\s\S]*?flex-direction:\s*column[\s\S]*?gap:\s*4px/);
assert.match(themeSource, /\.bay-status-copy > \.bay-time\s*\{[\s\S]*?align-self:\s*flex-start[\s\S]*?color:\s*#64748b !important[\s\S]*?text-align:\s*left/);
assert.match(themeSource, /\.closing-cta \.button-white\s*\{[\s\S]*?background:\s*#0d9488 !important/);
assert.match(themeSource, /\.admin-sidebar \.admin-nav,[\s\S]*?justify-content:\s*flex-start !important[\s\S]*?text-align:\s*left !important/);
assert.match(themeSource, /\.admin-sidebar \.admin-nav > b,[\s\S]*?margin-left:\s*auto/);
assert.match(themeSource, /\.bay-visual, \.bay-card-media \{ margin: 0 16px; border-radius: 6px; \}/);
assert.match(themeSource, /\.reference-home-hero \.hero-buttons \.button-dark\s*\{[\s\S]*?background:\s*#0d9488 !important/);
assert.match(themeSource, /\.reference-home-hero \.hero-buttons \.button-quiet\s*\{[\s\S]*?border:\s*1px solid[\s\S]*?background:\s*transparent/);
assert.equal((appSource.match(/class="bay-card-media bay-visual"/g) || []).length, 2);
assert.match(appSource, /class="bay-number">\$\{String\(number\)\.padStart\(2, '0'\)\}/);
assert.match(appSource, /class="bay-number">\$\{String\(bay\.number\)\.padStart\(2, '0'\)\}/);
assert.match(appSource, /Pesan Layanan[\s\S]*Lihat Semua Layanan/);
assert.match(appSource, /function normalizeAdminSnapshot\(snapshot = \{\}\)[\s\S]*customer_name: String\(transaction\.customer_name[\s\S]*transaction\.notes \|\| 'Pelanggan'\)/);
assert.match(themeSource, /--navy-dark:\s*#091724/i);
assert.match(themeSource, /--teal-accent:\s*#1db59b/i);
assert.match(appSource, /group\.hidden = catalogFilter !== 'all'/);
assert.match(indexSource, /app\.js\?v=20261026-cashless-fulfillment/);
assert.match(indexSource, /polish\.css\?v=20261025-time-financial/);
assert.match(appSource, /catalog-edit-button[^<]*type="button" data-edit-item/);
assert.match(appSource, /function readStoredCart\(\)\s*\{\s*try\s*\{ return sanitizeCart\(JSON\.parse\(localStorage\.getItem\(CART_KEY\)/);
const publicCatalogFixture = [
  ...PRODUCT_CATALOG_IDS.map(id => ({ id, item_type: 'PRODUCT', price: 10000, stock: 4, active: true })),
  { id: 'svc-car', item_type: 'SERVICE', price: 50000, duration: 50, active: true }
];
const publicBaysFixture = [1, 2, 3, 4].map(bay_number => ({
  bay_number, bay_status: 'AVAILABLE', vehicle_type: null, duration_minutes: 0, minutes_remaining: 0
}));
assert.deepEqual(validatePublicDataResponse(publicCatalogFixture, 0, publicBaysFixture), {
  products: publicCatalogFixture,
  washCount: 0,
  bays: publicBaysFixture
});
assert.throws(() => validatePublicDataResponse([...publicCatalogFixture, { id: 'addon-wax', item_type: 'ADD_ON', price: 10000, active: true }], 0, publicBaysFixture), /Katalog Supabase/);
assert.throws(() => validatePublicDataResponse(publicCatalogFixture.slice(1), 0, publicBaysFixture), /enam produk resmi/);
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
assert.equal(countActiveQueueTransactions([
  { item_type: 'SERVICE', transaction_type: 'WALK_IN', transaction_status: 'ACTIVE', payment_status: 'PAID', queue_status: 'WAITING' },
  { item_type: 'SERVICE', transaction_type: 'WALK_IN', transaction_status: 'ACTIVE', payment_status: 'PAID', queue_status: 'WASHING' },
  { item_type: 'SERVICE', transaction_type: 'WALK_IN', transaction_status: 'ACTIVE', payment_status: 'PAID', queue_status: 'FINISHING' },
  { item_type: 'SERVICE', transaction_type: 'WALK_IN', transaction_status: 'COMPLETED', payment_status: 'PAID', queue_status: 'COMPLETED' },
  { item_type: 'SERVICE', transaction_type: 'WALK_IN', transaction_status: 'PENDING', payment_status: 'PENDING', queue_status: 'WAITING' },
  { item_type: 'SERVICE', transaction_type: 'WALK_IN', transaction_status: 'CANCELLED', payment_status: 'PAID', queue_status: 'WAITING' },
  { item_type: 'PRODUCT', transaction_type: 'SHOP', transaction_status: 'PENDING', payment_status: 'PAID', queue_status: 'WAITING' }
]), 3);
const queueToday = getMaxAllowedTransactionDate(new Date());
const queueYesterday = getMaxAllowedTransactionDate(new Date(Date.now() - 86400000));
const queueFixture = [
  { item_type: 'SERVICE', transaction_type: 'WALK_IN', transaction_status: 'ACTIVE', payment_status: 'PAID', queue_status: 'WAITING', booking_date: queueToday },
  { item_type: 'SERVICE', transaction_type: 'WALK_IN', transaction_status: 'COMPLETED', payment_status: 'PAID', queue_status: 'COMPLETED', booking_date: queueToday },
  { item_type: 'SERVICE', transaction_type: 'BOOKING', transaction_status: 'COMPLETED', payment_status: 'PAID', queue_status: 'COMPLETED', booking_date: queueToday, booking_time: '00:00', duration_minutes: 30 },
  { item_type: 'SERVICE', transaction_type: 'WALK_IN', transaction_status: 'ACTIVE', payment_status: 'PAID', queue_status: 'WASHING', booking_date: queueYesterday },
  { item_type: 'PRODUCT', transaction_type: 'SHOP', transaction_status: 'COMPLETED', payment_status: 'PAID', queue_status: 'COMPLETED', booking_date: queueToday }
];
const dailyQueue = filterQueueTransactionsForDate(queueFixture, queueToday);
assert.equal(dailyQueue.length, 1);
assert.equal(countActiveQueueTransactions(dailyQueue), 1);
assert.equal(dailyQueue.filter(tx => tx.queue_status === 'COMPLETED').length, 0);
assert.match(appSource, /renderAdminTransactionList\(db\.transactions, 'Seluruh transaksi studio\.'/);
assert.match(appSource, /const stages = \['WAITING', 'WASHING'\]/);
assert.match(appSource, /'self-service'\) tab = 'overview'/);
assert.doesNotMatch(appSource.slice(appSource.indexOf('function renderAdminTransactionList'), appSource.indexOf('\nfunction renderAdminCustomers')), /data-action="delete|data-delete-transaction/);
assert.match(appSource, /if \(type === 'error' && !explicitFormSubmit\) return;/);
assert.match(appSource.slice(appSource.indexOf('function openDialog('), appSource.indexOf('\nfunction renderTransactionForm')), /renderAdminTransactionForm[\s\S]*setupAdminTransactionForm/);
assert.match(adminSaveSource, /validateTransactionSchedule/);
const changeHandlerStart = appSource.indexOf("document.addEventListener('change', async event => {");
const changeHandlerEnd = appSource.indexOf("\ndocument.getElementById('admin-shortcut')", changeHandlerStart);
assert.doesNotMatch(appSource.slice(changeHandlerStart, changeHandlerEnd), /showFormErrorToast|validateTransactionSchedule/);

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
assert.match(wibScheduleMigrationSource, /fulfillment_method text not null default 'PICKUP'/);
assert.match(schemaSource, /fulfillment_method text not null default 'PICKUP'/);
assert.match(wibScheduleMigrationSource, /add column if not exists fulfillment_address text/);
assert.match(wibScheduleMigrationSource, /add column if not exists shipping_fee integer not null default 0/);
assert.match(wibScheduleMigrationSource, /transactions_one_shipping_fee_per_order_idx/);
assert.match(wibScheduleMigrationSource, /Ongkir kurir harus dibayar satu kali per checkout/);
assert.match(schemaSource, /transactions_one_shipping_fee_per_order_idx/);
assert.match(wibScheduleMigrationSource, /delete from public\.transactions where item_id = 'prd-perfume'/);
assert.match(wibScheduleMigrationSource, /delete from public\.services_products where id = 'prd-perfume'/);
assert.doesNotMatch(wibScheduleMigrationSource, /'prd-perfume',\s*'PRODUCT'/);
assert.doesNotMatch(appSource, /prd-perfume|Parfum Mobil|Parfum \/ Pewangi/);
assert.doesNotMatch(schemaSource, /prd-perfume|Parfum Mobil|Parfum \/ Pewangi/);
assert.match(wibScheduleMigrationSource, /request_fingerprint_value[\s\S]*fulfillment_method_value/);
assert.match(wibScheduleMigrationSource, /case when p_order \? 'fulfillment_method' then/);
assert.match(wibScheduleMigrationSource, /fulfillment_method,\s*fulfillment_address,\s*fulfillment_order_id,\s*shipping_fee/);
assert.match(wibScheduleMigrationSource, /create or replace function public\.create_demo_product_order_pending/);
assert.match(wibScheduleMigrationSource, /saved_transaction := public\.create_demo_product_order_pending\(p_order\)/);
assert.match(wibScheduleMigrationSource, /return private\.simulate_demo_payment\(saved_transaction/);
assert.match(wibScheduleMigrationSource, /Tanggal transaksi tidak boleh melewati hari ini/);
assert.match(wibScheduleMigrationSource, /Transaksi baru tidak boleh melebihi waktu saat ini/);
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
assert.match(adminRichDataSource, /when 1 then local_day\.today[\s\S]*else local_day\.today - 1/);
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
assert.match(demoDateCorrectionSource, /disable trigger transactions_integrity_guard[\s\S]*set booking_date[\s\S]*booking_date > jakarta_today\.today[\s\S]*transaction_row\.id like 'rich-tx-%'[\s\S]*enable trigger transactions_integrity_guard/);
assert.match(wibScheduleMigrationSource, /new\.booking_date > local_now::date/);
assert.match(wibScheduleMigrationSource, /new\.booking_time < time '08:00' or new\.booking_time > time '21:00'/);
assert.match(wibScheduleMigrationSource, /new\.created_at := clock_timestamp\(\)/);
assert.match(wibScheduleMigrationSource, /before insert or update on public\.transactions/);
assert.match(appSource, /dateField\.max = getMaxAllowedTransactionDate\(\)/);
assert.match(appSource, /timeField\.min = '08:00'[\s\S]*timeField\.max = '21:00'/);
assert.match(cleanupGeneratorSource, /'seed-tx-rina-self-service'[\s\S]*\(now\(\) at time zone 'Asia\/Jakarta'\)::date, time '13:00'/);
assert.doesNotMatch(cleanupGeneratorSource, /current_date\s*\+\s*(1|30)/);
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
assert.match(capabilitySource, /fulfillment_address, fulfillment_order_id, shipping_fee/);
assert.match(capabilitySource, /product\.price \* sale_quantity \+ shipping_fee_value/);

for (const method of ['QRIS', 'E_WALLET', 'CARD']) {
  assert.equal(validateServicePaymentMethod(method, 'BOOKING'), method);
  assert.equal(validateServicePaymentMethod(method, 'WALK_IN'), method);
}
assert.throws(() => validateServicePaymentMethod('CASH', 'WALK_IN'), /non-tunai/);
assert.throws(() => validateServicePaymentMethod('CASH', 'BOOKING'), /non-tunai/);
assert.throws(() => validateServicePaymentMethod('BANK_TRANSFER', 'BOOKING'), /Pilih metode pembayaran/);
assert.equal(productShippingFee('PICKUP'), 0);
assert.equal(productShippingFee('COURIER'), 10000);
assert.equal(productShippingFee('COURIER', false), 0);
const multiProductOrder = [
  { id: 'product-a', fulfillment_method: 'COURIER', fulfillment_order_id: 'order-a', shipping_fee: 10000 },
  { id: 'product-b', fulfillment_method: 'COURIER', fulfillment_order_id: 'order-a', shipping_fee: 0 }
];
assert.equal(adminProductShippingFee('COURIER', multiProductOrder[0], multiProductOrder), 10000);
assert.equal(adminProductShippingFee('COURIER', multiProductOrder[1], multiProductOrder), 0);
assert.equal(adminProductShippingFee('PICKUP', multiProductOrder[0], multiProductOrder), 0);
assert.throws(() => productShippingFee('INVALID'), /Pilih metode pemenuhan/);
assert.equal(calculateProductAmount(45000, 2, productShippingFee('PICKUP')), 90000);
assert.equal(calculateProductAmount(45000, 2, productShippingFee('COURIER')), 100000);
assert.equal(calculateProductAmount(45000, 2, productShippingFee('COURIER', false)), 90000);
assert.throws(() => calculateProductAmount(45000, 1.5, 10000), /Nominal produk tidak valid/);
const scheduleTestDate = getMaxAllowedTransactionDate(new Date());
const scheduleTestNow = new Date(`${scheduleTestDate}T10:00:00+07:00`);
const scheduleTime = time => new Date(`${scheduleTestDate}T${time}:00+07:00`);
const scheduleTomorrow = getMaxAllowedTransactionDate(new Date(scheduleTestNow.getTime() + 86400000));
assert.equal(getMaxAllowedTransactionDate(scheduleTestNow), scheduleTestDate);
assert.equal(isStudioOpenAt(scheduleTime('08:00')), true);
assert.equal(isStudioOpenAt(scheduleTime('21:00')), true);
assert.equal(isStudioOpenAt(scheduleTime('07:59')), false);
assert.equal(isStudioOpenAt(scheduleTime('21:01')), false);
assert.equal(isStudioOpenAt(new Date(`${scheduleTestDate}T21:00:01+07:00`)), false);
assert.equal(validateTransactionSchedule(scheduleTestDate, '08:00', 0, scheduleTestNow), true);
assert.equal(validateTransactionSchedule(scheduleTestDate, '20:00', 60, scheduleTestNow, true), true);
assert.throws(() => validateTransactionSchedule(scheduleTestDate, '18:00', 0, scheduleTestNow), /waktu saat ini/);
assert.throws(() => validateTransactionSchedule(scheduleTomorrow, '10:00', 0, scheduleTestNow), /hari ini/);
assert.throws(() => validateTransactionSchedule(scheduleTestDate, '07:59', 0, scheduleTestNow), /08.00–21.00 WIB/);
assert.throws(() => validateTransactionSchedule(scheduleTestDate, '21:01', 0, scheduleTestNow), /08.00–21.00 WIB/);
assert.throws(() => validateTransactionSchedule(scheduleTestDate, '20:11', 50, new Date(`${scheduleTestDate}T22:00:00+07:00`)), /selesai paling lambat/);
assert.equal(isValidIndonesianPlate('H 1234 NP'), true);
assert.equal(isValidIndonesianPlate('ab 12 c'), true);
assert.equal(isValidIndonesianPlate('1234'), false);
assert.equal(isValidIndonesianPlate('ABC 1234 QZ'), false);
assert.equal(isValidIndonesianPlate('H 12345 NP'), false);
assert.equal(isValidRequestId('78df9b22-f1e7-4a9a-ac72-e0e6823409ef'), true);
assert.equal(isValidRequestId('not-a-uuid'), false);
assert.deepEqual(removeTransactionFromState([
  { id: 'keep-a' }, { id: 'remove-me' }, { id: 'keep-b' }
], 'remove-me'), [{ id: 'keep-a' }, { id: 'keep-b' }]);
assert.match(appSource, /supabaseRequest\(table, 'DELETE', null, `\?id=eq\.\$\{encodeURIComponent\(id\)\}`/);
assert.match(appSource, /window\.confirm\('Apakah Anda yakin ingin menghapus transaksi ini\?'\)/);
assert.match(appSource, /replaceAll\('>Batal<\/button>', '>Hapus<\/button>'\)/);
assert.match(appSource, /replaceAll\('aria-label="Batalkan transaksi ', 'aria-label="Hapus transaksi '\)/);
const validWalkInResponse = {
  id: '78df9b22-f1e7-4a9a-ac72-e0e6823409ef', code: 'RS-261012-ED7CFF9A',
  customer_id: 'customer-id', vehicle_id: 'vehicle-id', item_id: 'svc-car', item_type: 'SERVICE',
  transaction_type: 'WALK_IN', payment_method: 'QRIS', amount: 50000,
  booking_date: '2026-10-12', booking_time: '09:37:00', duration_minutes: 50,
  payment_status: 'PAID', transaction_status: 'PENDING', bay_number: 1
};
const validWalkInExpectation = {
  item_id: 'svc-car', transaction_type: 'WALK_IN', transaction_status: 'PENDING', payment_method: 'QRIS', amount: 50000, duration_minutes: 50
};
assert.equal(isValidServiceOrderResponse(validWalkInResponse, validWalkInExpectation), true);
assert.equal(isValidServiceOrderResponse({ ...validWalkInResponse, bay_number: null }, validWalkInExpectation), false);
assert.equal(isValidServiceOrderResponse({ ...validWalkInResponse, amount: 1 }, validWalkInExpectation), false);
assert.equal(isValidServiceOrderResponse({ ...validWalkInResponse, transaction_status: 'BOOKED' }, validWalkInExpectation), false);
assert.equal(isValidServiceOrderResponse({ ...validWalkInResponse, bay_number: 5 }, validWalkInExpectation), false);
assert.equal(isValidServiceOrderResponse({ ...validWalkInResponse, transaction_type: 'BOOKING', transaction_status: 'BOOKED', bay_number: 1 }, {
  ...validWalkInExpectation, transaction_type: 'BOOKING', transaction_status: 'BOOKED'
}), true);
const validProductResponse = {
  id: 'a1e096b2-ee77-410b-8a68-e7a68057d9f3', code: 'RS-261012-3950ADC5', customer_id: 'customer-id',
  vehicle_id: null, item_id: 'prd-shampoo', item_type: 'PRODUCT', transaction_type: 'SHOP',
  payment_method: 'QRIS', quantity: 2, amount: 90000, payment_status: 'PAID',
  transaction_status: 'PENDING', refund_status: 'NONE', queue_status: 'WAITING', fulfillment_method: 'PICKUP',
  fulfillment_address: null, shipping_fee: 0, fulfillment_order_id: null,
  duration_minutes: 0, bay_number: null, booking_date: '2026-10-12', booking_time: '10:11:00'
};
const validProductExpectation = { item_id: 'prd-shampoo', quantity: 2, payment_method: 'QRIS', fulfillment_method: 'PICKUP', fulfillment_address: null, shipping_fee: 0, fulfillment_order_id: null, amount: 90000 };
assert.equal(isValidDemoProductOrderResponse(validProductResponse, validProductExpectation), true);
assert.equal(isValidDemoProductOrderResponse({ ...validProductResponse, amount: 1 }, validProductExpectation), false);
assert.equal(isValidDemoProductOrderResponse({ ...validProductResponse, fulfillment_method: 'COURIER' }, validProductExpectation), false);
assert.equal(isValidDemoProductOrderResponse({ ...validProductResponse, shipping_fee: 10000, amount: 100000 }, validProductExpectation), false);
const validCourierProductResponse = {
  ...validProductResponse,
  amount: 100000,
  fulfillment_method: 'COURIER',
  fulfillment_address: 'Jl. Pahlawan 12, Semarang',
  shipping_fee: 10000,
  fulfillment_order_id: 'b7e64c8f-7c96-4610-8a51-2735300df431'
};
assert.equal(isValidDemoProductOrderResponse(validCourierProductResponse, {
  ...validProductExpectation,
  fulfillment_method: 'COURIER',
  fulfillment_address: 'Jl. Pahlawan 12, Semarang',
  shipping_fee: 10000,
  fulfillment_order_id: 'b7e64c8f-7c96-4610-8a51-2735300df431',
  amount: 100000
}), true);
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
assert.match(submitSource, /assertServiceScheduleAvailable\(getServiceDuration\(/);
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
assert.match(persistenceSource, /fulfillment_method: tx\.fulfillment_method/);
assert.match(appSource, /name="fulfillment_method" value="PICKUP"/);
assert.match(appSource, /name="fulfillment_method" value="COURIER"/);
assert.match(appSource, /Metode pemenuhan/);
assert.match(appSource, /form\.querySelector\('#fulfillment-summary strong'\)\.textContent = fulfillmentLabel/);
assert.match(appSource, /Khusus pengiriman lokal \(Maks\. 10 km dari studio\)\. Biaya ongkir flat Rp 10\.000\./);
assert.match(appSource, /name="fulfillment_address"/);
assert.match(appSource, /amount: calculateProductAmount\(product\.price, quantity, shippingFee\)/);
assert.match(appSource, /shipping_fee_paid/);
assert.match(appSource, /Alamat Pengiriman/);
assert.match(appSource, /fulfillment_address: fulfillmentAddress \|\| null/);
assert.match(appSource, /shipping_fee: shippingFee/);
assert.match(appSource, /fulfillment_order_id/);
assert.match(productSubmitSource, /fulfillment_method: fulfillmentMethod/);
assert.match(appSource, /const fulfillmentFieldset = document\.createElement\('fieldset'\)/);
assert.match(appSource, /function productFulfillmentDetails\(transaction\)/);
for (const [name, description] of [
  ['Lap Microfiber Bodi & Kaca', 'Kain lap halus berdaya serap tinggi, aman untuk bodi dan kaca tanpa meninggalkan goresan.'],
  ['Pembersih Interior & Jok', 'Cairan pembersih untuk mengangkat debu, noda makanan, dan kotoran pada jok serta dasbor.'],
  ['Pembersih Kaca Mobil', 'Membersihkan bercak air dan kotoran pada kaca kendaraan agar pandangan kembali bening.'],
  ['Sampo Mobil pH Netral', 'Sampo cuci bodi busa melimpah, aman digunakan sehari-hari tanpa merusak cat.'],
  ['Semir Pengkilap Ban', 'Semir ban untuk membuat warna hitam terlihat pekat, mengkilap, dan bersih tahan lama.'],
  ['Pengkilap Bodi (Wax Spray)', 'Semprotan pengkilap cat instan yang memberi efek daun talas agar air dan debu tidak mudah menempel.']
]) {
  assert.ok(appSource.includes(`name: '${name}'`), `Missing product ${name}`);
  assert.ok(appSource.includes(`description: '${description}'`), `Missing product description for ${name}`);
  assert.ok(schemaSource.includes(`'${name}'`), `Missing SQL product ${name}`);
  assert.ok(schemaSource.includes(`'${description}'`), `Missing SQL product description for ${name}`);
}
assert.match(persistenceSource, /isValidServiceOrderResponse\(result/);
assert.match(persistenceSource, /return tx/);
assert.match(appSource, /result\.payment_status === 'PAID'/);
assert.match(appSource, /result\.transaction_status === expected\.transaction_status/);
assert.match(appSource, /if \(form\.dataset\.submitting === 'true'\) return/);
assert.match(appSource, /showFormErrorToast\(serviceOrderErrorMessage\(error\), 'service-order'\)/);
assert.match(appSource, /event\.preventDefault\(\);\s*const form = event\.target/);
assert.match(appSource, /const activeSession = adminUser \? supabaseSession : null/);
assert.match(appSource, /const requestSession = adminUser \? supabaseSession : null/);
assert.match(appSource, /openDialog\(action === 'service-order' \? 'order'/);
assert.match(appSource, /method !== 'GET'\) requireAdminAuthorization\(\)/);
assert.match(appSource, /function removeUnauthorizedAdminMutations\(/);
assert.match(appSource, /!\['overview', 'transactions', 'queue', 'customers', 'catalog', 'reports'\]\.includes\(tab\)/);
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
assert.match(appSource, />Konfirmasi Pembayaran<\/button>/);
assert.match(appSource, /const canConfirmPayment = tx\.payment_status === 'PENDING'[\s\S]*\['QRIS', 'E_WALLET', 'CARD'\]/);
assert.match(appSource, /rpcRequest\('confirm_transaction_payment'[\s\S]*await loadAdminData\(\);\s*dispatchTransactionStateChange\(\)/);
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
assert.match(productFormSource, /input\[name="payment"\]\[value="QRIS"\]/);
assert.match(productFormSource, /defaultPayment\.checked = true/);
assert.match(productFormSource, /#shipping-summary'\)\.style\.display = method === 'COURIER' \? '' : 'none'/);
assert.match(productFormSource, /#delivery-address-summary'\)\.style\.display = method === 'COURIER' \? '' : 'none'/);
assert.match(indexSource, /app\.js\?v=20261026-cashless-fulfillment/);
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
assert.match(readmeSource, /20261026000000_paid_product_stock_lifecycle\.sql[\s\S]*tidak menambah tabel atau kolom/);
assert.match(readmeSource, /100% cashless[\s\S]*QRIS, E-Wallet, atau Kartu/);
assert.match(readmeSource, /pick-up tanpa biaya kirim atau kurir lokal dengan ongkir flat Rp 10\.000/);
assert.match(readmeSource, /Penerimaan non-tunai = pendapatan kotor \+ ongkir/);
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
