if (typeof window === 'undefined') {
  const http = require('node:http');
  const fs = require('node:fs');
  const path = require('node:path');
  const root = __dirname;
  const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.sql': 'text/plain; charset=utf-8' };
  const server = http.createServer((request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const relative = pathname === '/' ? 'index.html' : decodeURIComponent(pathname.slice(1));
    const filename = path.resolve(root, relative);
    if (!filename.startsWith(root + path.sep) && filename !== path.join(root, 'index.html')) {
      response.writeHead(403).end('Forbidden');
      return;
    }
    fs.readFile(filename, (error, content) => {
      if (error) { response.writeHead(404).end('Not found'); return; }
      response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
      response.end(content);
    });
  });
  const port = Number(process.env.PORT || 3000);
  server.listen(port, () => console.log(`Rinse Society running at http://localhost:${port}`));
} else {
const PHOTOS = {
  hero: 'https://images.pexels.com/photos/28995189/pexels-photo-28995189.jpeg?auto=compress&cs=tinysrgb&w=2000',
  car: 'https://images.pexels.com/photos/6873176/pexels-photo-6873176.jpeg?auto=compress&cs=tinysrgb&w=1000',
  motorcycle: 'https://images.pexels.com/photos/36709685/pexels-photo-36709685.jpeg?auto=compress&cs=tinysrgb&w=1000',
  selfCar: 'https://images.pexels.com/photos/15363884/pexels-photo-15363884.jpeg?auto=compress&cs=tinysrgb&w=1000',
  selfMotorcycle: 'https://images.pexels.com/photos/20515049/pexels-photo-20515049.jpeg?auto=compress&cs=tinysrgb&w=1000',
  self: 'https://images.pexels.com/photos/15363884/pexels-photo-15363884.jpeg?auto=compress&cs=tinysrgb&w=1000',
  product: 'https://images.pexels.com/photos/9470891/pexels-photo-9470891.jpeg?auto=compress&cs=tinysrgb&w=700',
  detailing: 'https://images.pexels.com/photos/12920558/pexels-photo-12920558.jpeg?auto=compress&cs=tinysrgb&w=700',
  shampoo: 'https://images.pexels.com/photos/9470891/pexels-photo-9470891.jpeg?auto=compress&cs=tinysrgb&w=700',
  microfiber: 'https://images.pexels.com/photos/39562202/pexels-photo-39562202.jpeg?auto=compress&cs=tinysrgb&w=700',
  tireShine: 'https://images.pexels.com/photos/12920558/pexels-photo-12920558.jpeg?auto=compress&cs=tinysrgb&w=700',
  wax: 'https://images.pexels.com/photos/7796591/pexels-photo-7796591.jpeg?auto=compress&cs=tinysrgb&w=700',
  interior: 'https://images.pexels.com/photos/10566526/pexels-photo-10566526.jpeg?auto=compress&cs=tinysrgb&w=700',
  glass: 'https://images.pexels.com/photos/11215808/pexels-photo-11215808.jpeg?auto=compress&cs=tinysrgb&w=700',
  addonVacuum: 'https://images.pexels.com/photos/5233285/pexels-photo-5233285.jpeg?auto=compress&cs=tinysrgb&w=700',
  addonWax: 'https://images.pexels.com/photos/20042050/pexels-photo-20042050.jpeg?auto=compress&cs=tinysrgb&w=700',
  addonTire: 'https://images.pexels.com/photos/7154623/pexels-photo-7154623.jpeg?auto=compress&cs=tinysrgb&w=700'
};

const CATALOG_COPY = {
  'svc-car': { name: 'Regular Car Wash', description: 'Cuci tangan menyeluruh dengan busa, bilas bertekanan, dan pengeringan rapi.', image: PHOTOS.car },
  'svc-moto': { name: 'Regular Motorcycle Wash', description: 'Pembersihan bodi, roda, dan sela mesin agar motor siap digunakan kembali.', image: PHOTOS.motorcycle },
  'svc-self-car': { name: 'Self-Service Car', description: 'Cuci mobil sendiri di bay khusus dengan foam dan semprotan bertekanan.', image: PHOTOS.selfCar },
  'svc-self-moto': { name: 'Self-Service Motorcycle', description: 'Cuci motor sendiri di bay khusus dengan peralatan yang siap digunakan.', image: PHOTOS.selfMotorcycle },
  'addon-vacuum': { name: 'Interior Vacuum', description: 'Pembersihan debu dan kotoran dari karpet serta kabin kendaraan.', image: PHOTOS.addonVacuum },
  'addon-wax': { name: 'Spray Wax', description: 'Lapisan kilap tambahan untuk membantu menjaga hasil cuci.', image: PHOTOS.addonWax },
  'addon-tire': { name: 'Tire Dressing', description: 'Finishing satin untuk tampilan ban yang bersih.', image: PHOTOS.addonTire },
  'prd-shampoo': { name: 'Sampo Cuci Mobil pH Netral', category: 'CUCI & PERAWATAN', description: 'Sampo kendaraan pH netral untuk perawatan rutin tanpa mengganggu lapisan wax.', image: PHOTOS.shampoo },
  'prd-cloth': { name: 'Kain Microfiber Premium', category: 'PERLENGKAPAN', description: 'Kain microfiber lembut dengan daya serap tinggi · 40 × 40 cm.', image: PHOTOS.microfiber },
  'prd-tire': { name: 'Semir Ban Satin', category: 'PERLINDUNGAN', description: 'Perawatan ban dengan hasil hitam satin dan tampilan rapi · 250 ml.', image: PHOTOS.tireShine },
  'prd-wax': { name: 'Wax Cair Kilap Dalam', category: 'PERLINDUNGAN', description: 'Wax cair untuk menambah kilap dan membantu melindungi permukaan cat · 250 ml.', image: PHOTOS.wax },
  'prd-interior': { name: 'Pembersih Interior', category: 'PERAWATAN INTERIOR', description: 'Pembersih untuk jok dan trim interior kendaraan · 300 ml.', image: PHOTOS.interior },
  'prd-glass': { name: 'Pembersih Kaca Otomotif', category: 'PERAWATAN KACA', description: 'Pembersih kaca kendaraan untuk hasil bening tanpa bekas lap · 300 ml.', image: PHOTOS.glass }
};

function catalogItem(item) {
  const copy = CATALOG_COPY[item.id] || {};
  return { ...item, ...copy, image: copy.image || item.image || '' };
}

const SERVICES = [
  { id: 'svc-car', name: 'Regular Car Wash', type: 'CAR', category: 'REGULAR', price: 80000, duration: 50, description: 'Cuci busa menyeluruh, bilas tekanan tinggi, dan pengeringan rapi untuk mobil harian Anda.', image: PHOTOS.car },
  { id: 'svc-moto', name: 'Regular Motorcycle Wash', type: 'MOTOR', category: 'REGULAR', price: 35000, duration: 35, description: 'Pembersihan bodi, velg, sela mesin, dan bagian motor yang sulit dijangkau.', image: PHOTOS.motorcycle },
  { id: 'svc-self-car', name: 'Self-Service Car', type: 'CAR', category: 'SELF_SERVICE', price: 30000, duration: 30, description: 'Cuci mobil sendiri di bay khusus dengan foam dan semprotan bertekanan.', image: PHOTOS.selfCar },
  { id: 'svc-self-moto', name: 'Self-Service Motorcycle', type: 'MOTOR', category: 'SELF_SERVICE', price: 20000, duration: 25, description: 'Cuci motor sendiri di bay khusus dengan peralatan yang siap digunakan.', image: PHOTOS.selfMotorcycle }
];
const ADDONS = [
  { id: 'addon-vacuum', name: 'Interior Vacuum', price: 20000, duration: 15, image: PHOTOS.addonVacuum },
  { id: 'addon-wax', name: 'Spray Wax', price: 25000, duration: 10, image: PHOTOS.addonWax },
  { id: 'addon-tire', name: 'Tire Dressing', price: 15000, duration: 8, image: PHOTOS.addonTire }
];
const SEED = {
  customers: [
    { id: 'c-1', full_name: 'Nadia Prameswari', phone: '081234567890' },
    { id: 'c-2', full_name: 'Rafi Mahendra', phone: '081298765432' },
    { id: 'c-3', full_name: 'Dimas Wicaksono', phone: '082145670001' }
  ],
  vehicles: [
    { id: 'v-1', customer_id: 'c-1', type: 'CAR', plate: 'H 1234 NP', model: 'Honda HR-V' },
    { id: 'v-2', customer_id: 'c-2', type: 'MOTOR', plate: 'H 4567 RM', model: 'Vespa Sprint' },
    { id: 'v-3', customer_id: 'c-3', type: 'CAR', plate: 'K 8821 DW', model: 'Toyota Yaris' }
  ],
  services_products: [
    ...SERVICES.map(item => ({ ...item, item_type: 'SERVICE', active: true })),
    ...ADDONS.map(item => ({ ...item, item_type: 'ADD_ON', category: 'ADD_ON', active: true })),
    { id: 'prd-shampoo', item_type: 'PRODUCT', name: 'Sampo Cuci Mobil pH Netral', category: 'WASH & CARE', price: 45000, stock: 22, min_stock: 6, active: true, image: PHOTOS.shampoo, description: 'Sampo khusus kendaraan, aman untuk lapisan wax · 500 ml.' },
    { id: 'prd-cloth', item_type: 'PRODUCT', name: 'Kain Premium Microfiber', category: 'TOOLS', price: 40000, stock: 13, min_stock: 5, active: true, image: PHOTOS.microfiber, description: 'Serat lembut dan tebal untuk mengeringkan bodi tanpa goresan · 40 × 40 cm.' },
    { id: 'prd-tire', item_type: 'PRODUCT', name: 'Semir Ban Satin', category: 'PROTECTION', price: 60000, stock: 9, min_stock: 4, active: true, image: PHOTOS.tireShine, description: 'Perawatan ban dengan hasil hitam satin, bukan licin berminyak · 250 ml.' },
    { id: 'prd-wax', item_type: 'PRODUCT', name: 'Liquid Wax Kilap Dalam', category: 'PROTECTION', price: 115000, stock: 8, min_stock: 4, active: true, image: PHOTOS.wax, description: 'Wax cair untuk kilap dan perlindungan cat · 250 ml.' },
    { id: 'prd-interior', item_type: 'PRODUCT', name: 'Pembersih Interior', category: 'INTERIOR CARE', price: 50000, stock: 11, min_stock: 4, active: true, image: PHOTOS.interior, description: 'Pembersih jok dan trim interior untuk perawatan rutin · 300 ml.' },
    { id: 'prd-glass', item_type: 'PRODUCT', name: 'Pembersih Kaca Otomotif', category: 'GLASS CARE', price: 40000, stock: 10, min_stock: 4, active: true, image: PHOTOS.glass, description: 'Pembersih kaca untuk hasil bening tanpa bekas lap · 300 ml.' }
  ],
  transactions: [
    { id: 't-1', code: 'RS-260929-1042', customer_id: 'c-1', vehicle_id: 'v-1', item_id: 'svc-car', item_type: 'SERVICE', item_name: 'Regular Car Wash', quantity: 1, amount: 80000, payment_method: 'QRIS', payment_status: 'PAID', transaction_type: 'WALK_IN', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-09-29', booking_time: '09:20', duration_minutes: 50, created_at: '2026-09-29T09:20:00' },
    { id: 't-2', code: 'RS-260930-1088', customer_id: 'c-2', vehicle_id: 'v-2', item_id: 'svc-self-moto', item_type: 'SERVICE', item_name: 'Self-Service Motorcycle Bay', quantity: 1, amount: 20000, payment_method: 'CASH', payment_status: 'PAID', transaction_type: 'WALK_IN', transaction_status: 'ACTIVE', queue_status: 'WASHING', booking_date: '2026-09-30', booking_time: '10:05', duration_minutes: 25, bay_number: 2, created_at: '2026-09-30T10:05:00' },
    { id: 't-3', code: 'RS-261001-0107', customer_id: 'c-3', vehicle_id: 'v-3', item_id: 'svc-self-car', item_type: 'SERVICE', item_name: 'Self-Service Car Bay', quantity: 1, amount: 30000, payment_method: 'E_WALLET', payment_status: 'PENDING', transaction_type: 'BOOKING', transaction_status: 'BOOKED', queue_status: 'WAITING', booking_date: '2026-10-01', booking_time: '14:30', duration_minutes: 30, bay_number: 1, created_at: '2026-09-30T10:15:00' },
    { id: 't-4', code: 'RS-260929-0781', customer_id: 'c-2', vehicle_id: 'v-2', item_id: 'svc-moto', item_type: 'SERVICE', item_name: 'Regular Motorcycle Wash', quantity: 1, amount: 35000, payment_method: 'CASH', payment_status: 'PAID', transaction_type: 'WALK_IN', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-09-29', booking_time: '16:40', duration_minutes: 35, created_at: '2026-09-29T16:40:00' },
    { id: 't-5', code: 'RS-260928-0551', customer_id: 'c-1', vehicle_id: null, item_id: 'prd-shampoo', item_type: 'PRODUCT', item_name: 'Sampo Cuci Mobil pH Netral', quantity: 2, amount: 90000, payment_method: 'CASH', payment_status: 'PAID', transaction_type: 'SHOP', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-09-28', booking_time: '11:10', duration_minutes: 0, created_at: '2026-09-28T11:10:00' },
    { id: 't-6', code: 'RS-260927-0332', customer_id: 'c-3', vehicle_id: 'v-3', item_id: 'svc-car', item_type: 'SERVICE', item_name: 'Regular Car Wash', quantity: 1, amount: 80000, payment_method: 'QRIS', payment_status: 'PAID', transaction_type: 'WALK_IN', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-09-27', booking_time: '15:25', duration_minutes: 50, created_at: '2026-09-27T15:25:00' },
    { id: 't-7', code: 'RS-261002-0216', customer_id: 'c-2', vehicle_id: 'v-2', item_id: 'svc-moto', item_type: 'SERVICE', item_name: 'Regular Motorcycle Wash', quantity: 1, amount: 35000, payment_method: 'CARD', payment_status: 'PENDING', transaction_type: 'BOOKING', transaction_status: 'BOOKED', queue_status: 'WAITING', booking_date: '2026-10-02', booking_time: '10:30', duration_minutes: 35, created_at: '2026-09-30T10:30:00' },
    { id: 't-8', code: 'RS-260930-1134', customer_id: 'c-3', vehicle_id: 'v-3', item_id: 'svc-car', item_type: 'SERVICE', item_name: 'Regular Car Wash', quantity: 1, amount: 80000, payment_method: 'CASH', payment_status: 'PAID', transaction_type: 'WALK_IN', transaction_status: 'ACTIVE', queue_status: 'WAITING', booking_date: '2026-09-30', booking_time: '10:30', duration_minutes: 50, created_at: '2026-09-30T10:27:00' },
    { id: 't-9', code: 'RS-260926-0972', customer_id: 'c-1', vehicle_id: null, item_id: 'prd-cloth', item_type: 'PRODUCT', item_name: 'Kain Premium Microfiber', quantity: 1, amount: 40000, payment_method: 'QRIS', payment_status: 'PAID', transaction_type: 'SHOP', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-09-26', booking_time: '12:05', duration_minutes: 0, created_at: '2026-09-26T12:05:00' },
    { id: 't-10', code: 'RS-260925-0821', customer_id: 'c-3', vehicle_id: 'v-3', item_id: 'svc-self-car', item_type: 'SERVICE', item_name: 'Self-Service Car Bay', quantity: 1, amount: 30000, payment_method: 'E_WALLET', payment_status: 'PAID', transaction_type: 'WALK_IN', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-09-25', booking_time: '17:15', duration_minutes: 30, created_at: '2026-09-25T17:15:00' }
  ]
};
const seedToday = new Date().toISOString().slice(0, 10);
const seedYesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
const seedTomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const activeSeed = SEED.transactions.find(tx => tx.id === 't-2');
const activeStarted = new Date(Date.now() - 8 * 60000);
activeSeed.booking_date = seedToday;
activeSeed.booking_time = activeStarted.toTimeString().slice(0, 5);
activeSeed.created_at = activeStarted.toISOString();
SEED.transactions.find(tx => tx.id === 't-1').booking_date = seedYesterday;
SEED.transactions.find(tx => tx.id === 't-3').booking_date = seedTomorrow;
SEED.transactions.find(tx => tx.id === 't-3').bay_number = 1;
SEED.transactions.find(tx => tx.id === 't-4').booking_date = seedYesterday;
for (const [id, offset] of [['t-5', -2], ['t-6', -3], ['t-7', 2], ['t-8', 0], ['t-9', -4], ['t-10', -5]]) {
  const transaction = SEED.transactions.find(tx => tx.id === id);
  transaction.booking_date = new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10);
  transaction.created_at = new Date(Date.now() + offset * 86400000).toISOString();
}

const SUPABASE_URL = 'https://cvnzbfbzgmjlepbsjinl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vzeEcRxxXJaMfE7JyKWOeg_KLx8XqnH';
const AUTH_SESSION_KEY = 'rinse-admin-session';
const CART_KEY = 'rinse-society-cart';
const EMPTY_DB = { customers: [], vehicles: [], services_products: [], transactions: [] };
let db = structuredClone(EMPTY_DB);
let page = 'home';
let cart = JSON.parse(localStorage.getItem(CART_KEY) || '{}');
let supabaseSession = readAuthSession();
let adminUser = null;
let databaseConnected = false;
let dataLoadState = 'loading';
let adminDataReady = false;
let adminDataState = 'loading';
let publicWashCount = 0;
let publicBays = [];

function isSupabaseConfigured() {
  return SUPABASE_URL.startsWith('https://') && SUPABASE_PUBLISHABLE_KEY.length > 20 && !SUPABASE_URL.includes('PASTE_') && !SUPABASE_PUBLISHABLE_KEY.includes('PASTE_');
}
function readAuthSession() {
  try { return JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) || 'null'); } catch (_) { return null; }
}
function rememberAuthSession(session) {
  supabaseSession = session;
  if (session) sessionStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(session));
  else sessionStorage.removeItem(AUTH_SESSION_KEY);
}
function emptyDatabase() { return structuredClone(EMPTY_DB); }
function supabaseConfig() { return { url: isSupabaseConfigured() ? SUPABASE_URL : '', key: SUPABASE_PUBLISHABLE_KEY }; }
function syncServiceCatalog() {
  const services = db.services_products.filter(item => item.item_type === 'SERVICE' && item.active !== false);
  const addons = db.services_products.filter(item => item.item_type === 'ADD_ON' && item.active !== false);
  SERVICES.splice(0, SERVICES.length, ...services.map(catalogItem));
  ADDONS.splice(0, ADDONS.length, ...addons.map(catalogItem));
}
function transactionTypeLabel(value) {
  return ({ BOOKING: 'Booking', WALK_IN: 'Walk-in', SHOP: 'Toko' })[value] || String(value || '').replaceAll('_', ' ');
}
function money(value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0); }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function getVehicle(tx) { return db.vehicles.find(item => item.id === tx.vehicle_id); }
function getCustomer(tx) { return db.customers.find(item => item.id === tx.customer_id); }
function statusLabel(value) {
  return ({ AVAILABLE: 'TERSEDIA', OCCUPIED: 'DIGUNAKAN', RESERVED: 'DIPESAN', PAID: 'LUNAS', PENDING: 'MENUNGGU', FAILED: 'GAGAL', REFUNDED: 'DIKEMBALIKAN', COMPLETED: 'SELESAI', BOOKED: 'DIBOOKING', ACTIVE: 'AKTIF', CANCELLED: 'DIBATALKAN', WAITING: 'MENUNGGU', WASHING: 'DICUCI', FINISHING: 'TAHAP AKHIR', CASH: 'TUNAI', QRIS: 'QRIS', E_WALLET: 'E-WALLET', CARD: 'KARTU' })[value] || String(value || '').replaceAll('_', ' ');
}
function statusBadge(value) { return `<span class="status status-${String(value).toLowerCase().replaceAll('_', '-')}">${statusLabel(value)}</span>`; }
function bayMinutesLeft(tx) { return Math.max(0, tx.duration_minutes - Math.floor((Date.now() - new Date(tx.created_at).getTime()) / 60000)); }

function setPage(next) {
  if (next === 'admin') { openAdmin(); return; }
  page = next;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelector('.main-nav')?.classList.remove('is-open');
}
async function openAdmin() {
  page = 'admin';
  if (!isSupabaseConfigured()) { render(); return; }
  if (!adminUser && supabaseSession) await restoreAdminSession();
  if (adminUser) {
    adminDataReady = false;
    adminDataState = 'loading';
    render();
    try { await loadAdminData(); }
    catch (_) { adminDataReady = false; adminDataState = 'error'; }
  }
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function render() {
  const views = { home: renderHome, services: renderServices, 'self-service': renderBays, shop: renderShop, history: renderHistory, admin: renderAdmin };
  const app = document.getElementById('app');
  if (page === 'admin') app.innerHTML = !adminUser ? renderAdminLogin() : adminDataReady ? renderAdmin() : renderAdminDataState();
  else app.innerHTML = databaseConnected ? (views[page] || renderHome)() : renderPublicDataState();
  app.querySelectorAll('.connection-indicator, .database-notice').forEach(element => element.remove());
  const settingsButton = app.querySelector('.admin-sidebar [data-action="settings"]');
  if (settingsButton) settingsButton.setAttribute('aria-label', 'Pengaturan studio');
  app.querySelectorAll('.eyebrow, .banner-index').forEach(label => {
    label.textContent = label.textContent.replaceAll('CUCI MANDIRI', 'SELF-SERVICE');
  });
  app.querySelectorAll('.bay-card-bottom > span, .bay-visual img').forEach(element => {
    if (element.tagName === 'IMG') element.alt = element.alt.replaceAll('Bay cuci mandiri', 'Bay Self-Service');
    else element.textContent = element.textContent.replaceAll('Bay cuci mandiri', 'Bay Self-Service');
  });
  const bayNote = app.querySelector('.bay-note p');
  if (bayNote) bayNote.textContent = `Status bay dihitung dari transaksi aktif. Sesi Self-Service mulai ${money(20000)}.`;
  app.querySelector('.admin-nav[data-admin-tab="self-service"]')?.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) node.textContent = node.textContent.replace('Cuci mandiri', 'Self-Service');
  });
  if (page === 'admin' && adminUser) renderAdminMetrics();
  document.querySelectorAll('[data-nav]').forEach(link => link.classList.toggle('active', link.dataset.nav === page));
  simplifyUiSymbols();
}
function renderPublicDataState() {
  const loading = dataLoadState === 'loading';
  return `<section class="section"><div class="empty-state" role="status"><h3>${loading ? 'Memuat layanan...' : 'Layanan sementara tidak tersedia.'}</h3><p>${loading ? 'Mohon tunggu sebentar.' : 'Kami belum dapat memuat layanan. Silakan coba lagi.'}</p>${loading ? '' : '<button class="button button-dark" data-action="retry-data">Coba lagi</button>'}</div></section>`;
}
function renderAdminDataState() {
  const loading = adminDataState === 'loading';
  return `<section class="section"><div class="empty-state" role="status"><h3>${loading ? 'Memuat dashboard...' : 'Dashboard belum dapat dimuat.'}</h3><p>${loading ? 'Mohon tunggu sebentar.' : 'Data studio belum tersedia. Silakan coba lagi.'}</p>${loading ? '' : '<button class="button button-dark" data-action="retry-admin-data">Coba lagi</button>'}</div></section>`;
}
function simplifyUiSymbols(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (/[↗↓→←]/.test(node.nodeValue)) node.nodeValue = node.nodeValue.replace(/[↗↓→←]/g, '').replace(/\s{2,}/g, ' ');
  }
}
function renderAdminLogin() {
  return `<section class="admin-login-page"><div class="admin-login-image"><img src="${PHOTOS.hero}" alt="Mobil sedang dicuci di studio"></div><div class="admin-login-content"><a class="brand" href="#home" data-nav="home"><span class="brand-mark">R</span><span>rinse<span class="brand-light">society</span><small>WASH STUDIO · SEMARANG</small></span></a><p class="eyebrow">AREA KHUSUS TIM STUDIO</p><h1>Admin Login</h1><p>Masuk untuk mengelola operasional Rinse Society.</p><form id="admin-login-form" class="admin-login-form"><label for="admin-email">Email</label><input id="admin-email" name="email" type="email" autocomplete="username" required placeholder="nama@bisnis.id"><label for="admin-password">Password</label><input id="admin-password" name="password" type="password" autocomplete="current-password" required placeholder="Masukkan password"><button class="button button-dark button-full" type="submit">Masuk</button><p class="login-error" id="login-error" role="alert"></p></form><button class="text-link" data-nav="home">Kembali ke Website</button></div></section>`;
}
function renderAdminMetrics() {
  const today = new Date().toISOString().slice(0, 10);
  const todays = db.transactions.filter(tx => tx.booking_date === today);
  const paidToday = todays.filter(tx => tx.payment_status === 'PAID');
  const lowStock = db.services_products.filter(item => item.item_type === 'PRODUCT' && item.stock <= item.min_stock).length;
  const washed = todays.filter(tx => tx.item_type !== 'PRODUCT' && tx.transaction_status === 'COMPLETED').length;
  const bookings = todays.filter(tx => tx.transaction_type === 'BOOKING').length;
  const selfService = todays.filter(tx => tx.item_type !== 'PRODUCT' && db.services_products.find(item => item.id === tx.item_id)?.category === 'SELF_SERVICE').length;
  const metrics = [
    ['PENDAPATAN HARI INI', money(paidToday.reduce((sum, tx) => sum + Number(tx.amount), 0)), `${paidToday.length} transaksi lunas`, 'primary'],
    ['TOTAL TRANSAKSI', db.transactions.length.toString().padStart(2, '0'), `${db.transactions.filter(tx => tx.transaction_type === 'BOOKING').length} booking tercatat`],
    ['KENDARAAN DICUCI', String(washed).padStart(2, '0'), 'Transaksi selesai hari ini'],
    ['BOOKING HARI INI', String(bookings).padStart(2, '0'), 'Jadwal kunjungan'],
    ['PEMAKAIAN BAY', String(selfService).padStart(2, '0'), 'Sesi cuci mandiri hari ini'],
    ['PENDAPATAN JASA', money(db.transactions.filter(tx => tx.item_type !== 'PRODUCT' && tx.payment_status === 'PAID').reduce((sum, tx) => sum + Number(tx.amount), 0)), 'Cuci kendaraan dan add-on'],
    ['PENDAPATAN PRODUK', money(db.transactions.filter(tx => tx.item_type === 'PRODUCT' && tx.payment_status === 'PAID').reduce((sum, tx) => sum + Number(tx.amount), 0)), 'Penjualan perawatan kendaraan'],
    ['STOK MENIPIS', String(lowStock).padStart(2, '0'), 'Produk perlu ditambah']
  ];
  document.querySelector('.metric-grid').innerHTML = metrics.map(([label, value, note, primary]) => `<article class="metric-card ${primary ? 'metric-primary' : ''}"><span>${label}</span><strong>${value}</strong><small>${note}</small>${primary ? '<i>↗</i>' : ''}</article>`).join('');

  const paid = db.transactions.filter(tx => tx.payment_status === 'PAID');
  const serviceRevenue = paid.filter(tx => tx.item_type !== 'PRODUCT').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const productRevenue = paid.filter(tx => tx.item_type === 'PRODUCT').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalRevenue = serviceRevenue + productRevenue;
  const revenuePanel = document.querySelector('.revenue-panel');
  if (revenuePanel) revenuePanel.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">TRANSAKSI LUNAS</p><h2>Pendapatan studio</h2></div><span class="panel-period">SEMUA WAKTU</span></div><div class="revenue-total">${money(totalRevenue)}<span>Total pemasukan</span></div><div class="revenue-bars"><div class="revenue-bar-row"><span>Pendapatan jasa</span><div><i style="width:${totalRevenue ? serviceRevenue / totalRevenue * 100 : 0}%"></i></div><strong>${money(serviceRevenue)}</strong></div><div class="revenue-bar-row"><span>Pendapatan produk</span><div><i class="bar-green" style="width:${totalRevenue ? productRevenue / totalRevenue * 100 : 0}%"></i></div><strong>${money(productRevenue)}</strong></div></div><div class="chart-footnote"><span>Pendapatan jasa</span><span>Pendapatan produk</span></div>`;

  const lowStockItems = db.services_products.filter(item => item.item_type === 'PRODUCT' && item.stock <= item.min_stock);
  const lowStockPanel = document.querySelector('.low-stock-panel');
  if (lowStockPanel) lowStockPanel.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">PANTAU STOK</p><h2>Perlu ditambah</h2></div><span class="low-stock-count">${lowStockItems.length} MENIPIS</span></div>${lowStockItems.length ? lowStockItems.map(item => `<div class="stock-row"><img src="${catalogItem(item).image}" alt=""><span><strong>${escapeHtml(catalogItem(item).name)}</strong><small>Minimum ${item.min_stock} unit</small></span><b>${item.stock} tersisa</b></div>`).join('') : '<div class="stock-clear">Semua stok mencukupi.</div>'}<button class="text-link" data-admin-tab="catalog">Kelola persediaan</button>`;

  const queuePreview = document.querySelector('.queue-preview');
  if (queuePreview) queuePreview.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">KONDISI AREA CUCI</p><h2>Antrean saat ini</h2></div><button class="text-link" data-admin-tab="queue">Lihat antrean</button></div>${renderQueueColumns(false)}`;
}
function serviceCard(service) {
  const item = catalogItem(service);
  return `<article class="service-card"><div class="service-photo"><img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy"><span class="photo-tag">${item.category === 'SELF_SERVICE' ? 'SELF-SERVICE' : 'LAYANAN CUCI'}</span><button class="photo-cta" data-service="${item.id}" aria-label="Pesan ${escapeHtml(item.name)}">Pesan</button></div><div class="service-copy"><div class="service-title-row"><h3>${escapeHtml(item.name)}</h3><span class="service-price">${money(item.price)}</span></div><p>${escapeHtml(item.description)}</p><div class="service-meta"><span>${item.duration} menit</span><span class="meta-dot"></span><span>${item.type === 'MOTOR' ? 'Motor' : 'Mobil'}</span><button data-service="${item.id}">Pilih layanan <span>↗</span></button></div></div></article>`;
}
function renderHome() {
  const washes = publicWashCount;
  const notice = '';
  return `${notice}<section class="hero"><img class="hero-image" src="${PHOTOS.hero}" alt="Mobil berbusa saat dicuci di studio detailing"><div class="hero-shade"></div><div class="hero-topline"><span>STUDIO CUCI KENDARAAN SEMARANG</span><span><i class="live-dot"></i> BUKA HARI INI · 08.00 — 21.00</span></div><div class="hero-content"><p class="eyebrow eyebrow-light">GOOD CARE. GOOD MILES.</p><h1>Mobil Anda layak<br>mendapat <em>perawatan lebih.</em></h1><p class="hero-description">Cuci profesional, bay mandiri, dan produk pilihan untuk menjaga kendaraan tetap bersih setiap hari.</p><div class="hero-buttons"><button class="button button-white" data-action="booking">Pesan cuci <span>↗</span></button><a class="text-link light-link" href="#services" data-nav="services">Lihat layanan <span>↓</span></a></div></div><div class="hero-note"><strong>${String(washes).padStart(2, '0')}</strong><span>kendaraan dirawat<br>hari ini</span></div><div class="hero-index">01 <span></span> 04</div></section>
  <section class="intro-strip"><p>GOOD CLEAN. <span>GOOD ENERGY.</span></p><p>CUCI DETAIL, TANPA REPOT.</p><span class="intro-arrow">↓</span></section>
  <section class="section services-section" id="services"><div class="section-heading"><div><p class="eyebrow">PILIH KEBUTUHAN KENDARAAN</p><h2>Perawatan untuk<br><em>setiap perjalanan.</em></h2></div><p class="section-aside">Mulai dari cuci tangan profesional hingga bay mandiri. Pilih perawatan yang pas untuk kendaraan Anda.</p><a class="text-link" href="#services" data-nav="services">Semua layanan <span>↗</span></a></div><div class="service-grid">${SERVICES.slice(0, 2).map(serviceCard).join('')}</div><div class="service-banner"><img src="${PHOTOS.selfCar}" alt="Pelanggan mencuci mobil sendiri di bay mandiri" loading="lazy"><div class="banner-content"><span class="eyebrow eyebrow-light">BAY ANDA. CARA ANDA.</span><h3>Cuci sendiri,<br>dengan <em>peralatan tepat.</em></h3><p>Peralatan profesional dan ruang yang nyaman untuk membersihkan kendaraan sesuai cara Anda.</p><button class="button button-white" data-nav="self-service">Lihat layanan mandiri <span>↗</span></button></div><span class="banner-index">CUCI MANDIRI · 02</span></div></section>
  <section class="editorial-band"><div class="editorial-image"><img src="${PHOTOS.motorcycle}" alt="Motor sedang dicuci dengan foam" loading="lazy"><span class="editorial-caption">UNTUK PENGGEMAR RODA DUA</span></div><div class="editorial-copy"><p class="eyebrow">MOBIL DAN MOTOR</p><h2>Motor bersih.<br><em>Siap melaju.</em></h2><p>Pembersihan menyeluruh untuk bodi, velg, sela mesin, dan bagian motor yang sulit dijangkau. Detail kecilnya ikut kami perhatikan.</p><button class="text-link" data-service="svc-moto">Lihat cuci motor <span>↗</span></button><div class="editorial-stat"><strong>35<span>m</span></strong><span>perawatan motor<br>menyeluruh</span></div></div></section>
  <section class="shop-teaser"><div class="section-heading"><div><p class="eyebrow">PERAWATAN KENDARAAN DI RUMAH</p><h2>Produk pilihan.<br><em>Rawat kilapnya.</em></h2></div><a class="text-link" href="#shop" data-nav="shop">Lihat semua produk <span>↗</span></a></div><div class="product-grid">${db.services_products.filter(item => item.item_type === 'PRODUCT').slice(0, 2).map(productCard).join('')}</div></section>
  <section class="closing-cta"><div><p class="eyebrow eyebrow-light">RAWAT DENGAN LEBIH BAIK</p><h2>Mulai hari ini<br><em>dengan kendaraan bersih.</em></h2></div><button class="button button-white" data-action="booking">Pesan layanan <span>↗</span></button><span class="closing-mark">R.</span></section>`;
}
function productCard(sourceProduct) {
  const product = catalogItem(sourceProduct);
  const low = product.stock <= product.min_stock;
  return `<article class="product-card"><button class="product-image" data-product="${product.id}" aria-label="Tambahkan ${escapeHtml(product.name)} ke keranjang"><img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy"><span class="product-add">+</span></button><div class="product-info"><span class="eyebrow">${escapeHtml(product.category || 'PRODUK PERAWATAN')}</span><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description || '')}</p><div class="product-price-row"><strong>${money(product.price)}</strong><span class="stock-note ${low ? 'low-stock' : ''}">${low ? 'STOK MENIPIS' : `STOK ${product.stock}`}</span></div><button class="product-buy" data-product="${product.id}">Tambah ke keranjang <span>↗</span></button></div></article>`;
}
function renderServices() {
  return `<section class="page-hero page-hero-blue"><div><p class="eyebrow eyebrow-light">DAFTAR LAYANAN</p><h1>Perawatan tepat<br><em>untuk setiap kendaraan.</em></h1><p>Pilih layanan, jadwalkan kunjungan, lalu biar tim kami menangani detailnya.</p></div><span class="page-hero-number">04<br><small>LAYANAN</small></span></section><section class="section services-list"><div class="section-heading compact-heading"><div><p class="eyebrow">PILIHAN PERAWATAN</p><h2>Temukan layanan <em>Anda.</em></h2></div><span class="availability"><i class="live-dot"></i> Walk-in tersedia setiap hari</span></div><div class="service-grid">${SERVICES.map(serviceCard).join('')}</div><div class="addons-row"><div><p class="eyebrow">SENTUHAN AKHIR</p><h3>Perawatan ekstra.<br><em>Hasil lebih bersih.</em></h3></div>${ADDONS.map(addon => `<button class="addon-item" data-addon="${addon.id}"><img src="${addon.image}" width="54" height="54" alt="${escapeHtml(addon.name)}" loading="lazy"><span><strong>${addon.name}</strong><small>${money(addon.price)} · ${addon.duration} menit</small></span><b>↗</b></button>`).join('')}</div></section>`;
}
function renderBays() {
  const bays = publicBays.map(row => ({ number: row.bay_number, state: row.bay_status, type: row.vehicle_type, duration: row.duration_minutes, remaining: row.minutes_remaining, time: row.booking_time }));
  return `<section class="page-hero page-hero-navy"><div><p class="eyebrow eyebrow-light">CUCI MANDIRI</p><h1>Ruang sendiri<br><em>untuk kendaraan Anda.</em></h1><p>Gunakan peralatan cuci profesional dan waktu yang leluasa. Periksa ketersediaan bay sebelum datang.</p></div><span class="page-hero-number">04<br><small>WASH BAY</small></span></section><section class="section bays-section"><div class="section-heading compact-heading"><div><p class="eyebrow">STATUS BAY TERKINI</p><h2>Pilih <em>bay Anda.</em></h2></div><span class="updated-label"><i class="live-dot"></i> Ketersediaan langsung</span></div><div class="bay-grid">${bays.map(bay => { const motorcycle = bay.type === 'MOTOR'; return `<article class="bay-card bay-${bay.state.toLowerCase()}"><div class="bay-card-top"><span>B-${String(bay.number).padStart(2, '0')}</span>${statusBadge(bay.state)}</div><div class="bay-visual"><img src="${motorcycle ? PHOTOS.selfMotorcycle : PHOTOS.selfCar}" alt="${bay.state === 'AVAILABLE' ? 'Bay cuci mandiri tersedia' : `Kendaraan sedang berada di bay ${bay.number}`}" loading="lazy"><span class="bay-number">${String(bay.number).padStart(2, '0')}</span></div><div class="bay-card-bottom"><strong>${bay.state === 'AVAILABLE' ? 'Siap digunakan' : motorcycle ? 'Sepeda motor' : 'Mobil'}</strong><span>${bay.duration ? `${bay.duration} menit${bay.plate ? ` · ${escapeHtml(bay.plate)}` : ''}` : 'Bay cuci mandiri'}</span>${bay.state === 'AVAILABLE' ? `<button class="text-link" data-service="${motorcycle ? 'svc-self-moto' : 'svc-self-car'}">Pilih bay ini <span>↗</span></button>` : `<span class="bay-time">${bay.state === 'OCCUPIED' ? `${bay.remaining} menit tersisa` : `${bay.time || ''} · dipesan`}</span>`}</div></article>`; }).join('')}</div><div class="bay-note"><span class="bay-note-icon">i</span><p>Status bay dihitung dari transaksi aktif. Sesi mandiri mulai ${money(20000)}.</p><button class="text-link" data-action="walkin">Mulai walk-in <span>↗</span></button></div></section>`;
}
function renderShop() {
  const items = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = Object.entries(cart).reduce((sum, [id, row]) => sum + (db.services_products.find(product => product.id === id)?.price || 0) * row.quantity, 0);
  return `<section class="page-hero page-hero-green"><div><p class="eyebrow eyebrow-light">RINSE GOODS</p><h1>Produk pilihan.<br><em>Rawat kilapnya.</em></h1><p>Produk perawatan kendaraan yang kami pilih untuk membantu menjaga hasil cuci lebih lama.</p></div><button class="cart-summary" data-action="cart"><span class="cart-icon">▱</span><span><strong>${items} produk</strong><small>${money(subtotal)} di keranjang</small></span><b>↗</b></button></section><section class="section shop-section"><div class="section-heading compact-heading"><div><p class="eyebrow">RAK PERAWATAN KENDARAAN</p><h2>Belanja produk <em>studio.</em></h2></div><span class="shop-count">${db.services_products.filter(item => item.item_type === 'PRODUCT' && item.active !== false).length} produk pilihan</span></div><div class="product-grid">${db.services_products.filter(item => item.item_type === 'PRODUCT' && item.active !== false).map(productCard).join('')}</div><div class="cart-drawer-inline"><div><span class="eyebrow">KERANJANG ANDA</span><strong>${items} produk · ${money(subtotal)}</strong></div><button class="button button-dark" data-action="cart">Lihat keranjang <span>↗</span></button></div></section>`;
}
function renderHistory() {
  return `<section class="page-hero page-hero-sand"><div><p class="eyebrow">RIWAYAT KUNJUNGAN</p><h1>Setiap kunjungan.<br><em>Tersimpan rapi.</em></h1><p>Cari transaksi menggunakan kode booking, nomor HP, atau nomor polisi yang terdaftar.</p></div><span class="history-stamp">SENANG<br>BERJUMPA<br>KEMBALI.</span></section><section class="section history-section"><form id="history-search" class="history-search"><label for="history-query">Cari kunjungan</label><div><input id="history-query" name="query" placeholder="Kode booking, nomor HP, atau plat" autocomplete="off"><button class="button button-dark" type="submit">Cari riwayat <span>↗</span></button></div><small>Masukkan data lengkap yang digunakan saat transaksi.</small></form><div id="history-results">${renderHistoryResults([])}</div></section>`;
}
function renderHistoryResults(records) {
  if (!records.length) return `<div class="empty-state"><h3>Belum ada kunjungan yang cocok.</h3><p>Periksa kembali kode booking, nomor HP, atau plat kendaraan.</p></div>`;
  return `<div class="history-list">${records.map(tx => `<article class="history-item"><div class="history-date"><strong>${new Date(`${tx.booking_date}T12:00:00`).toLocaleDateString('id-ID', { day: '2-digit' })}</strong><span>${new Date(`${tx.booking_date}T12:00:00`).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</span></div><div class="history-main"><span class="eyebrow">${escapeHtml(tx.code)} · ${escapeHtml(transactionTypeLabel(tx.transaction_type))}</span><h3>${escapeHtml(tx.item_name || 'Pembelian produk')}</h3><p>${escapeHtml(tx.vehicle_model || '')} · ${escapeHtml(tx.vehicle_plate || 'Pembelian produk')} · ${escapeHtml(tx.customer_name || '')}</p></div><div class="history-meta"><strong>${money(tx.amount)}</strong><span>${escapeHtml(statusLabel(tx.payment_method))} · ${tx.duration_minutes || 0} menit</span></div><div class="history-status">${statusBadge(tx.transaction_status)}${statusBadge(tx.payment_status)}</div></article>`).join('')}</div>`;
}
function renderAdminLegacy() {
  const today = new Date().toISOString().slice(0, 10);
  const todayRows = db.transactions.filter(tx => tx.booking_date === today);
  const paid = db.transactions.filter(tx => tx.payment_status === 'PAID');
  const todayRevenue = todayRows.filter(tx => tx.payment_status === 'PAID').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const serviceRevenue = paid.filter(tx => tx.item_type !== 'PRODUCT').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const productRevenue = paid.filter(tx => tx.item_type === 'PRODUCT').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const total = serviceRevenue + productRevenue;
  const lowStock = db.services_products.filter(item => item.item_type === 'PRODUCT' && item.stock <= item.min_stock);
  const vehiclesWashed = todayRows.filter(tx => tx.item_type !== 'PRODUCT' && tx.transaction_status === 'COMPLETED').length;
  const bookingsToday = todayRows.filter(tx => tx.transaction_type === 'BOOKING').length;
  const selfServiceToday = todayRows.filter(tx => tx.item_type !== 'PRODUCT' && db.services_products.find(item => item.id === tx.item_id)?.category === 'SELF_SERVICE').length;
  return `<div class="admin-shell"><aside class="admin-sidebar"><div class="admin-brand"><span class="brand-mark">R</span><span>rinse<span class="brand-light">society</span><small>STUDIO CONSOLE</small></span></div><p class="admin-nav-label">WORKSPACE</p><button class="admin-nav active" data-admin-tab="overview">◫ &nbsp; Overview</button><button class="admin-nav" data-admin-tab="queue">≋ &nbsp; Wash queue <b>${db.transactions.filter(tx => tx.queue_status !== 'COMPLETED').length}</b></button><button class="admin-nav" data-admin-tab="catalog">▦ &nbsp; Services & products</button><button class="admin-nav" data-admin-tab="customers">◎ &nbsp; Customers & vehicles</button><button class="admin-nav" data-admin-tab="reports">↗ &nbsp; Revenue reports</button><div class="sidebar-bottom"><span class="sidebar-avatar">RS</span><span><strong>Rinse Studio</strong><small>Semarang · Studio 01</small></span><button data-action="settings" aria-label="Database settings">⚙</button></div></aside><div class="admin-main"><header class="admin-topbar"><div><p class="eyebrow">STUDIO CONSOLE · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</p><h1 id="admin-heading">Studio overview</h1></div><div class="admin-top-actions"><span class="connection-indicator ${supabaseConfig().url ? 'connected' : ''}"><i></i>${supabaseConfig().url ? 'SUPABASE CONNECTED' : 'LOCAL DEMO DATA'}</span><button class="button button-dark button-small" data-action="walkin">+ New walk-in</button></div></header><div id="admin-content"><div class="metric-grid"><article class="metric-card metric-primary"><span>REVENUE · ALL TIME</span><strong>${money(total)}</strong><small>From ${paid.length} paid transactions</small><i>↗</i></article><article class="metric-card"><span>TRANSACTIONS</span><strong>${db.transactions.length.toString().padStart(2, '0')}</strong><small>${db.transactions.filter(tx => tx.transaction_type === 'BOOKING').length} bookings on record</small></article><article class="metric-card"><span>SERVICE REVENUE</span><strong>${money(serviceRevenue)}</strong><small>Wash, self-service & add-ons</small></article><article class="metric-card"><span>PRODUCT REVENUE</span><strong>${money(productRevenue)}</strong><small>Retail sales · ${db.transactions.filter(tx => tx.item_type === 'PRODUCT').length} line items</small></article></div><div class="admin-content-grid"><section class="admin-panel revenue-panel"><div class="panel-heading"><div><p class="eyebrow">PAID TRANSACTIONS</p><h2>Revenue mix</h2></div><span class="panel-period">ALL TIME</span></div><div class="revenue-total">${money(total)}<span>Total collected</span></div><div class="revenue-bars"><div class="revenue-bar-row"><span>Wash & service</span><div><i style="width:${total ? Math.max(4, serviceRevenue / total * 100) : 0}%"></i></div><strong>${money(serviceRevenue)}</strong></div><div class="revenue-bar-row"><span>Studio goods</span><div><i class="bar-green" style="width:${total ? Math.max(4, productRevenue / total * 100) : 0}%"></i></div><strong>${money(productRevenue)}</strong></div></div><div class="chart-footnote"><span>● Service revenue</span><span>● Product revenue</span></div></section><section class="admin-panel low-stock-panel"><div class="panel-heading"><div><p class="eyebrow">STOCK WATCH</p><h2>Needs a top-up</h2></div><span class="low-stock-count">${lowStock.length} LOW</span></div>${lowStock.length ? lowStock.map(item => `<div class="stock-row"><img src="${item.image}" alt=""><span><strong>${escapeHtml(item.name)}</strong><small>Minimum ${item.min_stock} units</small></span><b>${item.stock} left</b></div>`).join('') : '<div class="stock-clear">All studio shelves are looking good.</div>'}<button class="text-link" data-admin-tab="catalog">Manage inventory <span>↗</span></button></section></div><section class="admin-panel queue-preview"><div class="panel-heading"><div><p class="eyebrow">THE FLOOR, RIGHT NOW</p><h2>Wash queue</h2></div><button class="text-link" data-admin-tab="queue">Open queue <span>↗</span></button></div>${renderQueueColumns(false)}</section></div></div></div>`;
}
function renderAdmin() {
  const today = new Date().toISOString().slice(0, 10);
  const waiting = db.transactions.filter(tx => tx.item_type !== 'PRODUCT' && tx.queue_status !== 'COMPLETED').length;
  return `<div class="admin-shell"><aside class="admin-sidebar"><div class="admin-brand"><span class="brand-mark">R</span><span>rinse<span class="brand-light">society</span><small>DASHBOARD STUDIO</small></span></div><p class="admin-nav-label">MENU STUDIO</p><button class="admin-nav active" data-admin-tab="overview"><span>◫</span> Ringkasan</button><button class="admin-nav" data-admin-tab="transactions"><span>▤</span> Transaksi</button><button class="admin-nav" data-admin-tab="bookings"><span>▣</span> Booking</button><button class="admin-nav" data-admin-tab="queue"><span>≋</span> Antrean cuci <b>${waiting}</b></button><button class="admin-nav" data-admin-tab="self-service"><span>⌂</span> Cuci mandiri</button><button class="admin-nav" data-admin-tab="customers"><span>◎</span> Pelanggan & kendaraan</button><button class="admin-nav" data-admin-tab="catalog"><span>▦</span> Layanan & produk</button><button class="admin-nav" data-admin-tab="reports"><span>↗</span> Laporan</button><button class="admin-nav" data-action="settings"><span>⚙</span> Pengaturan</button><button class="admin-nav" data-action="logout"><span>↪</span> Keluar</button><div class="sidebar-bottom"><span class="sidebar-avatar">RS</span><span><strong>${escapeHtml(adminUser?.email || 'Admin studio')}</strong><small>Semarang · Studio 01</small></span></div></aside><div class="admin-main"><header class="admin-topbar"><div><p class="eyebrow">RINGKASAN STUDIO · ${new Date(`${today}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</p><h1 id="admin-heading">Ringkasan operasional</h1></div><div class="admin-top-actions"><span class="connection-indicator ${databaseConnected ? 'connected' : ''}"><i></i>${databaseConnected ? 'SUPABASE TERHUBUNG' : 'DATABASE TERPUTUS'}</span><button class="button button-dark button-small" data-action="walkin">+ Walk-in baru</button></div></header><div id="admin-content"><div class="metric-grid">${Array.from({ length: 8 }, () => '<article class="metric-card"><span>MEMUAT DATA</span><strong>—</strong><small>Dari transaksi Supabase</small></article>').join('')}</div><div class="admin-content-grid"><section class="admin-panel revenue-panel"><div class="panel-heading"><div><p class="eyebrow">TRANSAKSI LUNAS</p><h2>Pendapatan studio</h2></div><span class="panel-period">SEMUA WAKTU</span></div><div class="revenue-total">${money(0)}<span>Total pemasukan</span></div><div class="revenue-bars"><div class="revenue-bar-row"><span>Pendapatan jasa</span><div><i style="width:0%"></i></div><strong>${money(0)}</strong></div><div class="revenue-bar-row"><span>Pendapatan produk</span><div><i class="bar-green" style="width:0%"></i></div><strong>${money(0)}</strong></div></div><div class="chart-footnote"><span>● Pendapatan jasa</span><span>● Pendapatan produk</span></div></section><section class="admin-panel low-stock-panel"><div class="panel-heading"><div><p class="eyebrow">PANTAU STOK</p><h2>Perlu ditambah</h2></div><span class="low-stock-count">0 MENIPIS</span></div><div class="stock-clear">Memuat persediaan dari Supabase.</div><button class="text-link" data-admin-tab="catalog">Kelola persediaan <span>↗</span></button></section></div><section class="admin-panel queue-preview"><div class="panel-heading"><div><p class="eyebrow">KONDISI AREA CUCI</p><h2>Antrean saat ini</h2></div><button class="text-link" data-admin-tab="queue">Buka antrean <span>↗</span></button></div>${renderQueueColumns(false)}</section></div></div></div>`;
}
function queueCard(tx) {
  const vehicle = getVehicle(tx), customer = getCustomer(tx);
  return `<article class="queue-card"><div class="queue-card-top"><strong>${escapeHtml(tx.code)}</strong>${statusBadge(tx.payment_status)}</div><h3>${escapeHtml(vehicle?.plate || 'Penjualan produk')}</h3><p>${escapeHtml(tx.item_name || 'Layanan cuci')} · ${escapeHtml(customer?.full_name || 'Walk-in')}</p><div class="queue-card-foot"><span>${escapeHtml(tx.booking_time || 'Walk-in')} · ${tx.duration_minutes || 0} menit</span><select aria-label="Ubah status ${escapeHtml(tx.code)}" data-queue-id="${tx.id}">${['WAITING', 'WASHING', 'FINISHING', 'COMPLETED'].map(status => `<option value="${status}" ${tx.queue_status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select></div></article>`;
}
function renderQueueColumns(large) {
  const stages = ['WAITING', 'WASHING', 'FINISHING', 'COMPLETED'];
  const washTransactions = db.transactions.filter(tx => tx.item_type !== 'PRODUCT');
  return `<div class="queue-columns ${large ? 'queue-columns-large' : ''}">${stages.map(stage => `<div class="queue-column"><div class="queue-column-head"><span>${statusLabel(stage)}</span><b>${washTransactions.filter(tx => (tx.queue_status || 'WAITING') === stage).length}</b></div>${washTransactions.filter(tx => (tx.queue_status || 'WAITING') === stage).map(queueCard).join('') || '<div class="queue-empty">Belum ada kendaraan</div>'}</div>`).join('')}</div>`;
}

function openDialog(kind, serviceId) {
  const dialog = document.getElementById('flow-dialog');
  const content = document.getElementById('dialog-content');
  const service = db.services_products.find(item => item.id === serviceId);
  if (['booking', 'walkin', 'cart', 'product-checkout'].includes(kind) && !databaseConnected) {
    toast('Layanan sedang tidak tersedia. Silakan coba lagi.', 'error');
    return;
  }
  if ((kind === 'booking' || kind === 'walkin') && !(service || SERVICES[0])) {
    toast('Layanan belum tersedia. Silakan coba lagi nanti.', 'error');
    return;
  }
  if (kind === 'settings') {
    content.innerHTML = `<p class="eyebrow">PENGATURAN STUDIO</p><h2>Akun <em>studio.</em></h2><p class="dialog-intro">${adminUser ? `Masuk sebagai ${escapeHtml(adminUser.email || 'admin')}.` : 'Pengaturan operasional Rinse Society.'}</p><div class="settings-status"><strong>Rinse Society · Semarang</strong><p>Kelola jadwal, layanan, dan produk studio dari dashboard.</p></div><div class="dialog-actions">${adminUser ? '<button class="button button-dark" data-action="logout">Keluar dari akun</button>' : ''}<button class="button button-quiet" data-action="close-dialog">Tutup</button></div>`;
  } else if (kind === 'cart') renderCartDialog(content);
  else if (kind === 'booking' || kind === 'walkin') renderTransactionForm(content, kind, service);
  else if (kind === 'product-checkout') renderProductCheckout(content);
  dialog.showModal();
  simplifyUiSymbols(dialog);
}
function renderTransactionForm(content, kind, selectedService) {
  const walkin = kind === 'walkin';
  const service = catalogItem(selectedService || SERVICES[0]);
  const allowedVehicles = db.vehicles.filter(vehicle => vehicle.type === service.type);
  content.innerHTML = `<p class="eyebrow">${walkin ? 'WALK-IN · TANPA BOOKING' : 'BOOKING · LANGKAH 1'}</p><h2>${walkin ? 'Langsung datang.<br><em>Kami siap melayani.</em>' : 'Jadwalkan cuci<br><em>kendaraan Anda.</em>'}</h2><p class="dialog-intro">${escapeHtml(service.name)} · ${money(service.price)} · ${service.duration} menit</p><form id="transaction-form" class="dialog-form"><input type="hidden" name="flow" value="${kind}"><label>Layanan cuci<select name="service_id" required>${db.services_products.filter(item => item.item_type === 'SERVICE' && item.active !== false).map(item => `<option value="${item.id}" ${item.id === service.id ? 'selected' : ''}>${escapeHtml(item.name)} · ${money(item.price)}</option>`).join('')}</select></label><div class="form-two"><label>Nama lengkap<input name="name" required placeholder="Nama pelanggan"></label><label>Nomor HP<input name="phone" required type="tel" placeholder="08…"></label></div><label>Kendaraan terdaftar<select name="vehicle_id"><option value="">Tambahkan detail kendaraan di bawah</option>${allowedVehicles.map(vehicle => `<option value="${vehicle.id}">${escapeHtml(vehicle.model)} · ${escapeHtml(vehicle.plate)}</option>`).join('')}</select></label><div class="form-two"><label>Model kendaraan<input name="model" placeholder="Contoh: Honda HR-V"></label><label>Nomor polisi<input name="plate" required placeholder="H 1234 NP"></label></div><label>Layanan tambahan<select name="addon_id"><option value="">Tanpa layanan tambahan</option>${ADDONS.map(addon => `<option value="${addon.id}">${escapeHtml(addon.name)} · ${money(addon.price)}</option>`).join('')}</select></label><div class="form-two"><label>${walkin ? 'Waktu datang' : 'Tanggal kunjungan'}<input name="date" type="${walkin ? 'time' : 'date'}" required value="${walkin ? new Date().toTimeString().slice(0, 5) : new Date().toISOString().slice(0, 10)}" ${walkin ? '' : `min="${new Date().toISOString().slice(0, 10)}"`}></label><label>Jam layanan<input name="time" type="time" required value="10:30"></label></div>${service.category === 'SELF_SERVICE' ? `<label>Durasi penggunaan bay<select name="duration">${[20, 25, 30, 45, 60].map(minutes => `<option value="${minutes}" ${Number(service.duration) === minutes ? 'selected' : ''}>${minutes} menit</option>`).join('')}</select></label>` : ''}<fieldset class="payment-options"><legend>Metode pembayaran</legend>${['CASH', 'QRIS', 'E_WALLET', 'CARD'].map(method => `<label><input type="radio" name="payment" value="${method}" ${method === (walkin ? 'CASH' : 'QRIS') ? 'checked' : ''}><span>${method === 'E_WALLET' ? 'E-Wallet' : method}</span></label>`).join('')}</fieldset><div class="dialog-total"><span>Perkiraan total</span><strong id="flow-total">${money(service.price)}</strong></div><button class="button button-dark button-full" type="submit">${walkin ? 'Masukkan ke antrean' : 'Konfirmasi booking'} <span>↗</span></button><small>Tunai untuk walk-in langsung dicatat lunas. Pembayaran cashless menunggu konfirmasi penyedia pembayaran.</small></form>`;
  const form = content.querySelector('#transaction-form');
  content.querySelectorAll('[name="service_id"] option').forEach(option => {
    const item = db.services_products.find(serviceItem => serviceItem.id === option.value);
    if (item) option.textContent = `${catalogItem(item).name} · ${money(item.price)}`;
  });
  const serviceSelect = content.querySelector('[name="service_id"]');
  const vehicleSelect = content.querySelector('[name="vehicle_id"]');
  const phoneInput = content.querySelector('[name="phone"]');
  let matchingVehicles = allowedVehicles;
  const updateVehicleChoices = async () => {
    const phone = phoneInput.value.trim();
    if (phone.replace(/\D/g, '').length < 7) return;
    try {
      const rows = await customerByPhone(phone);
      matchingVehicles = rows.filter(row => row.vehicle_id).map(row => ({ id: row.vehicle_id, type: row.vehicle_type, plate: row.vehicle_plate, model: row.vehicle_model }));
      const type = db.services_products.find(item => item.id === serviceSelect.value)?.type;
      const choices = matchingVehicles.filter(vehicle => vehicle.type === type);
      vehicleSelect.innerHTML = `<option value="">${choices.length ? 'Pilih kendaraan terdaftar' : 'Tambahkan detail kendaraan di bawah'}</option>${choices.map(vehicle => `<option value="${vehicle.id}">${escapeHtml(vehicle.model)} · ${escapeHtml(vehicle.plate)}</option>`).join('')}`;
      const row = rows[0];
      if (row?.full_name && !form.elements.name.value) form.elements.name.value = row.full_name;
    } catch (error) { toast(`Kendaraan belum dapat dimuat: ${error.message}`, 'error'); }
  };
  phoneInput.addEventListener('blur', updateVehicleChoices);
  phoneInput.addEventListener('change', updateVehicleChoices);
  const recalculate = () => {
    const chosen = db.services_products.find(item => item.id === serviceSelect.value);
    const duration = Number(content.querySelector('[name="duration"]')?.value || chosen.duration || 30);
    const base = chosen.category === 'SELF_SERVICE' ? Math.round(chosen.price * duration / Number(chosen.duration || duration)) : chosen.price;
    const extra = db.services_products.find(item => item.id === content.querySelector('[name="addon_id"]')?.value);
    content.querySelector('#flow-total').textContent = money(base + Number(extra?.price || 0));
  };
  serviceSelect.addEventListener('change', () => {
    const chosen = db.services_products.find(item => item.id === serviceSelect.value);
    const choices = matchingVehicles.filter(vehicle => vehicle.type === chosen.type);
    vehicleSelect.innerHTML = `<option value="">${choices.length ? 'Pilih kendaraan terdaftar' : 'Tambahkan detail kendaraan di bawah'}</option>${choices.map(vehicle => `<option value="${vehicle.id}">${escapeHtml(vehicle.model)} · ${escapeHtml(vehicle.plate)}</option>`).join('')}`;
    const durationField = content.querySelector('[name="duration"]');
    if (durationField) durationField.value = chosen.duration;
    recalculate();
  });
  content.querySelector('[name="addon_id"]').addEventListener('change', recalculate);
  content.querySelector('[name="duration"]')?.addEventListener('change', recalculate);
}
function renderCartDialog(content) {
  const lines = Object.entries(cart).map(([id, row]) => ({ product: catalogItem(db.services_products.find(item => item.id === id) || {}), ...row })).filter(row => row.product.id);
  const total = lines.reduce((sum, row) => sum + row.quantity * row.product.price, 0);
  content.innerHTML = `<p class="eyebrow">PRODUK PILIHAN</p><h2>Keranjang <em>belanja.</em></h2>${lines.length ? `<div class="cart-lines">${lines.map(({ product, quantity }) => `<div class="cart-line"><img src="${product.image}" alt="${escapeHtml(product.name)}"><span><strong>${escapeHtml(product.name)}</strong><small>${money(product.price)} per produk</small></span><div class="quantity-control"><button data-cart-change="${product.id}" data-delta="-1" aria-label="Kurangi satu">−</button><b>${quantity}</b><button data-cart-change="${product.id}" data-delta="1" aria-label="Tambah satu">+</button></div><strong>${money(product.price * quantity)}</strong></div>`).join('')}</div><div class="dialog-total"><span>Subtotal</span><strong>${money(total)}</strong></div><button class="button button-dark button-full" data-action="checkout-product">Lanjut ke pembayaran <span>↗</span></button>` : `<div class="empty-state"><h3>Keranjang masih kosong.</h3><p>Pilih produk perawatan kendaraan dari rak studio.</p><button class="button button-dark" data-action="close-dialog">Lanjut belanja</button></div>`}`;
  simplifyUiSymbols(content);
}
function renderProductCheckout(content) {
  const total = Object.entries(cart).reduce((sum, [id, row]) => sum + (db.services_products.find(item => item.id === id)?.price || 0) * row.quantity, 0);
  content.innerHTML = `<p class="eyebrow">PEMBAYARAN PRODUK</p><h2>Perawatan pilihan<br><em>segera di tangan Anda.</em></h2><form id="product-checkout-form" class="dialog-form"><label>Nama lengkap<input name="name" required placeholder="Nama lengkap"></label><label>Nomor HP<input name="phone" required type="tel" placeholder="08…"></label><fieldset class="payment-options"><legend>Metode pembayaran</legend>${['CASH', 'QRIS', 'E_WALLET', 'CARD'].map((method, index) => `<label><input type="radio" name="payment" value="${method}" ${index === 0 ? 'checked' : ''}><span>${method === 'E_WALLET' ? 'E-Wallet' : method}</span></label>`).join('')}</fieldset><div class="dialog-total"><span>Total pembayaran</span><strong>${money(total)}</strong></div><button class="button button-dark button-full" type="submit">Buat pesanan <span>↗</span></button><small>Pembayaran tunai dicatat lunas. Pembayaran cashless menunggu konfirmasi penyedia pembayaran.</small></form>`;
  simplifyUiSymbols(content);
}
function makeCode() { return `RS-${new Date().toISOString().slice(2, 10).replaceAll('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`; }
async function customerByPhone(phone) {
  if (!databaseConnected) throw new Error('Data pelanggan belum dapat dimuat. Silakan coba lagi.');
  return rpcRequest('lookup_customer_by_phone', { p_phone: phone });
}
async function findOrCreateCustomer(name, phone) {
  const matches = await customerByPhone(phone);
  if (matches.length) {
    const first = matches[0];
    return { customer: { id: first.customer_id, full_name: first.full_name, phone: first.phone }, vehicles: matches.filter(row => row.vehicle_id).map(row => ({ id: row.vehicle_id, customer_id: row.customer_id, type: row.vehicle_type, plate: row.vehicle_plate, model: row.vehicle_model })) };
  }
  const customer = { id: crypto.randomUUID(), full_name: String(name).trim(), phone: String(phone).trim() };
  await insertRow('customers', customer);
  return { customer, vehicles: [] };
}
function makeVehicle(customerId, type, model, plate) {
  return { id: crypto.randomUUID(), customer_id: customerId, type, plate: String(plate || '').trim().toUpperCase(), model: String(model || (type === 'CAR' ? 'Mobil' : 'Sepeda motor')).trim() };
}
function firstAvailableBay() {
  if (!databaseConnected) throw new Error('Status Self-Service belum dapat dimuat. Silakan coba lagi.');
  return publicBays.find(bay => bay.bay_status === 'AVAILABLE')?.bay_number || null;
}
async function persistTransaction(tx) {
  if (!databaseConnected) throw new Error('Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.');
  if (tx.item_type === 'PRODUCT') {
    const newStock = await rpcRequest('record_product_sale', { p_transaction: tx });
    const product = db.services_products.find(item => item.id === tx.item_id);
    if (product && Number.isFinite(Number(newStock))) product.stock = Number(newStock);
  } else {
    const result = await rpcRequest('record_service_transaction', { p_transaction: tx, p_addon_id: tx.addon_id || null });
    if (result && typeof result === 'object') Object.assign(tx, result);
    delete tx.addon_id;
  }
  db.transactions.unshift(tx);
}
async function submitService(form) {
  const data = new FormData(form);
  if (!databaseConnected) throw new Error('Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.');
  const service = db.services_products.find(item => item.id === data.get('service_id'));
  if (!service) throw new Error('Layanan tidak ditemukan. Muat ulang katalog lalu coba lagi.');
  const customerName = String(data.get('name') || '').trim();
  const phone = String(data.get('phone') || '').trim();
  const plate = String(data.get('plate') || '').trim().toUpperCase();
  if (customerName.length < 2) throw new Error('Masukkan nama lengkap.');
  if (phone.replace(/\D/g, '').length < 7) throw new Error('Masukkan nomor HP yang valid.');
  if (plate.length < 4) throw new Error('Masukkan nomor polisi yang valid.');
  const booking = data.get('flow') === 'booking';
  const dateValue = String(data.get('date') || '');
  const timeValue = String(data.get('time') || '');
  if (!/^\d{2}:\d{2}$/.test(timeValue)) throw new Error('Pilih waktu layanan yang valid.');
  if (booking && (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue) || dateValue < new Date().toISOString().slice(0, 10))) {
    throw new Error('Pilih tanggal booking hari ini atau setelahnya.');
  }
  if (!booking && !/^\d{2}:\d{2}$/.test(dateValue)) throw new Error('Pilih waktu kedatangan yang valid.');
  if (booking && dateValue === new Date().toISOString().slice(0, 10) && timeValue <= new Date().toTimeString().slice(0, 5)) {
    throw new Error('Pilih waktu booking yang belum lewat.');
  }
  const paymentMethod = String(data.get('payment') || '');
  if (!['CASH', 'QRIS', 'E_WALLET', 'CARD'].includes(paymentMethod)) throw new Error('Pilih metode pembayaran.');
  const duration = Number(data.get('duration') || service.duration || 30);
  if (!Number.isSafeInteger(duration) || duration <= 0) throw new Error('Pilih durasi yang valid.');
  if (service.category === 'SELF_SERVICE' && ![20, 25, 30, 45, 60].includes(duration)) throw new Error('Pilih durasi Self-Service yang tersedia.');
  const addonId = String(data.get('addon_id') || '');
  const addon = addonId ? db.services_products.find(item => item.id === addonId && item.item_type === 'ADD_ON' && item.active !== false) : null;
  if (addonId && !addon) throw new Error('Add-on tidak tersedia. Pilih add-on lain.');
  const bayNumber = service.category === 'SELF_SERVICE' ? firstAvailableBay() : null;
  if (service.category === 'SELF_SERVICE' && !bayNumber) throw new Error('Semua bay Self-Service sedang digunakan atau dipesan.');
  const customerResult = await findOrCreateCustomer(customerName, phone);
  const customer = customerResult.customer;
  const existingVehicle = customerResult.vehicles.find(item => item.id === data.get('vehicle_id'));
  const vehicle = existingVehicle || makeVehicle(customer.id, service.type, data.get('model'), plate);
  if (vehicle.type !== service.type) throw new Error('Jenis kendaraan tidak sesuai dengan layanan yang dipilih.');
  if (!existingVehicle) await insertRow('vehicles', vehicle);
  const washPrice = service.category === 'SELF_SERVICE' ? Math.round(Number(service.price) * duration / Number(service.duration || duration)) : Number(service.price);
  const tx = { id: crypto.randomUUID(), code: makeCode(), customer_id: customer.id, vehicle_id: vehicle.id, item_id: service.id, item_type: 'SERVICE', item_name: `${service.name}${addon ? ` + ${addon.name}` : ''}`, addon_id: addon?.id || null, amount: washPrice + Number(addon?.price || 0), payment_method: paymentMethod, payment_status: paymentMethod === 'CASH' && !booking ? 'PAID' : 'PENDING', transaction_type: booking ? 'BOOKING' : 'WALK_IN', transaction_status: booking ? 'BOOKED' : 'ACTIVE', queue_status: 'WAITING', booking_date: booking ? dateValue : new Date().toISOString().slice(0, 10), booking_time: booking ? timeValue : dateValue, duration_minutes: duration + Number(addon?.duration || 0), bay_number: bayNumber, created_at: new Date().toISOString() };
  await persistTransaction(tx);
  try { await loadPublicData(); }
  catch (_) { toast('Transaksi tersimpan, tetapi data terbaru belum dapat dimuat.', 'error'); }
  showConfirmation(tx);
  render();
}
function showConfirmation(tx) {
  document.getElementById('dialog-content').innerHTML = `<div class="confirmation"><div class="confirmation-check">✓</div><p class="eyebrow">${tx.transaction_type === 'BOOKING' ? 'BOOKING TERCATAT' : 'MASUK KE ANTREAN'}</p><h2>${tx.transaction_type === 'BOOKING' ? 'Kami siapkan<br><em>kunjungan Anda.</em>' : 'Kendaraan Anda<br><em>segera kami tangani.</em>'}</h2><p class="dialog-intro">${tx.transaction_type === 'BOOKING' ? 'Booking berhasil disimpan. Tunjukkan kode ini saat tiba di studio.' : 'Transaksi berhasil disimpan dan kendaraan masuk ke antrean cuci.'}</p><div class="pass-card"><div><span>KODE BOOKING</span><strong>${escapeHtml(tx.code)}</strong><small>${escapeHtml(tx.item_name)} · ${tx.booking_date} · ${tx.booking_time}</small></div><img class="fake-qr" src="https://api.qrserver.com/v1/create-qr-code/?size=144x144&data=${encodeURIComponent(tx.code)}" alt="QR untuk kode ${escapeHtml(tx.code)}"></div><div class="confirmation-details"><span>${money(tx.amount)}</span>${statusBadge(tx.payment_status)}${statusBadge(tx.payment_method)}</div><button class="button button-dark button-full" data-action="close-dialog">Selesai <span>↗</span></button></div>`;
}
async function submitProducts(form) {
  const data = new FormData(form);
  const customerName = String(data.get('name') || '').trim();
  const phone = String(data.get('phone') || '').trim();
  if (customerName.length < 2) throw new Error('Masukkan nama lengkap.');
  if (phone.replace(/\D/g, '').length < 7) throw new Error('Masukkan nomor HP yang valid.');
  const lines = Object.entries(cart).filter(([id, row]) => row.quantity && db.services_products.some(item => item.id === id));
  if (!lines.length) throw new Error('Keranjang masih kosong.');
  for (const [id, row] of lines) {
    const product = db.services_products.find(item => item.id === id);
    const quantity = Number(row.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Jumlah produk tidak valid.');
    if (product.stock < quantity) throw new Error(`Stok ${catalogItem(product).name} tidak mencukupi.`);
  }
  const customer = (await findOrCreateCustomer(customerName, phone)).customer;
  const completedIds = [];
  for (const [id, row] of lines) {
    const product = db.services_products.find(item => item.id === id);
    const quantity = Number(row.quantity);
    try {
      await persistTransaction({ id: crypto.randomUUID(), code: makeCode(), customer_id: customer.id, vehicle_id: null, item_id: id, item_type: 'PRODUCT', item_name: product.name, quantity, amount: product.price * quantity, payment_method: data.get('payment'), payment_status: data.get('payment') === 'CASH' ? 'PAID' : 'PENDING', transaction_type: 'SHOP', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: new Date().toISOString().slice(0, 10), booking_time: new Date().toTimeString().slice(0, 5), duration_minutes: 0, created_at: new Date().toISOString() });
      completedIds.push(id);
    } catch (error) {
      if (!completedIds.length) throw error;
      for (const completedId of completedIds) delete cart[completedId];
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      try { await loadPublicData(); } catch (_) {}
      document.getElementById('dialog-content').innerHTML = `<div class="confirmation"><div class="confirmation-check">!</div><p class="eyebrow">PESANAN SEBAGIAN TERCATAT</p><h2>Produk yang belum diproses<br><em>tetap di keranjang.</em></h2><p class="dialog-intro">Sebagian produk berhasil dipesan. Periksa keranjang sebelum mencoba lagi.</p><button class="button button-dark button-full" data-action="close-dialog">Tutup</button></div>`;
      render();
      return;
    }
  }
  cart = {};
  localStorage.removeItem(CART_KEY);
  try { await loadPublicData(); }
  catch (_) { toast('Pesanan tersimpan, tetapi katalog belum dapat diperbarui.', 'error'); }
  document.getElementById('dialog-content').innerHTML = `<div class="confirmation"><div class="confirmation-check">✓</div><p class="eyebrow">PESANAN TERCATAT</p><h2>Produk pilihan<br><em>siap untuk Anda.</em></h2><p class="dialog-intro">Pembayaran telah dicatat. Terima kasih telah berbelanja di Rinse Society.</p><button class="button button-dark button-full" data-action="close-dialog">Kembali ke studio <span>↗</span></button></div>`;
  render();
}
function renderReportsLegacy() {
  const paid = db.transactions.filter(tx => tx.payment_status === 'PAID');
  const serviceRows = paid.filter(tx => tx.item_type !== 'PRODUCT');
  const productRows = paid.filter(tx => tx.item_type === 'PRODUCT');
  const serviceRevenue = serviceRows.reduce((sum, tx) => sum + tx.amount, 0);
  const productRevenue = productRows.reduce((sum, tx) => sum + tx.amount, 0);
  return `<div class="reports-heading"><div><p class="eyebrow">THE NUMBERS, CLEARLY</p><h2>Good work, accounted for.</h2></div><span class="shop-count">Live from ${db.transactions.length} transactions</span></div><div class="report-grid"><article class="report-card"><span>SERVICE REVENUE</span><strong>${money(serviceRevenue)}</strong><small>${serviceRows.length} wash transactions</small></article><article class="report-card"><span>PRODUCT REVENUE</span><strong>${money(productRevenue)}</strong><small>${productRows.length} product line items</small></article><article class="report-card"><span>TRANSACTION COUNT</span><strong>${paid.length}</strong><small>${db.transactions.filter(tx => tx.transaction_type === 'BOOKING').length} bookings · ${db.transactions.filter(tx => tx.transaction_type === 'WALK_IN').length} walk-ins</small></article><article class="report-card"><span>VEHICLES SERVED</span><strong>${new Set(serviceRows.map(tx => tx.vehicle_id).filter(Boolean)).size}</strong><small>${db.vehicles.filter(vehicle => vehicle.type === 'CAR').length} cars · ${db.vehicles.filter(vehicle => vehicle.type === 'MOTOR').length} motorcycles on file</small></article></div><section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">PAYMENT MIX</p><h2>How guests check out</h2></div></div>${['CASH', 'QRIS', 'E_WALLET', 'CARD'].map(method => { const rows = paid.filter(tx => tx.payment_method === method); const amount = rows.reduce((sum, tx) => sum + tx.amount, 0); return `<div class="revenue-bar-row"><span>${method.replaceAll('_', ' ')}</span><div><i style="width:${paid.length ? rows.length / paid.length * 100 : 0}%"></i></div><strong>${money(amount)} · ${rows.length}</strong></div>`; }).join('')}</section><section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">REVENUE BY SERVICE</p><h2>What guests come back for</h2></div></div>${SERVICES.map(service => { const amount = serviceRows.filter(tx => tx.item_id === service.id).reduce((sum, tx) => sum + tx.amount, 0); const maximum = Math.max(1, ...SERVICES.map(item => serviceRows.filter(tx => tx.item_id === item.id).reduce((sum, tx) => sum + tx.amount, 0))); return `<div class="revenue-bar-row"><span>${escapeHtml(service.name)}</span><div><i style="width:${amount / maximum * 100}%"></i></div><strong>${money(amount)}</strong></div>`; }).join('')}</section>`;
}
function renderReports() {
  const paid = db.transactions.filter(tx => tx.payment_status === 'PAID');
  const services = paid.filter(tx => tx.item_type !== 'PRODUCT');
  const products = paid.filter(tx => tx.item_type === 'PRODUCT');
  const serviceRevenue = services.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const productRevenue = products.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const total = db.transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  return `<div class="reports-heading"><div><p class="eyebrow">RINGKASAN KEUANGAN</p><h2>Pendapatan tercatat rapi.</h2></div><span class="shop-count">${db.transactions.length} transaksi tercatat</span></div><div class="report-grid"><article class="report-card"><span>PENDAPATAN JASA</span><strong>${money(serviceRevenue)}</strong><small>${services.length} transaksi cuci dan add-on</small></article><article class="report-card"><span>PENDAPATAN PRODUK</span><strong>${money(productRevenue)}</strong><small>${products.length} baris penjualan retail</small></article><article class="report-card"><span>JUMLAH TRANSAKSI</span><strong>${db.transactions.length}</strong><small>${db.transactions.filter(tx => tx.transaction_type === 'BOOKING').length} booking · ${db.transactions.filter(tx => tx.transaction_type === 'WALK_IN').length} walk-in</small></article><article class="report-card"><span>TOTAL NILAI TRANSAKSI</span><strong>${money(total)}</strong><small>Termasuk pembayaran yang menunggu</small></article></div><section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">METODE PEMBAYARAN</p><h2>Ringkasan pembayaran</h2></div></div>${['CASH', 'QRIS', 'E_WALLET', 'CARD'].map(method => { const rows = paid.filter(tx => tx.payment_method === method); const amount = rows.reduce((sum, tx) => sum + Number(tx.amount), 0); return `<div class="revenue-bar-row"><span>${statusLabel(method)}</span><div><i style="width:${paid.length ? rows.length / paid.length * 100 : 0}%"></i></div><strong>${money(amount)} · ${rows.length} transaksi</strong></div>`; }).join('')}</section>`;
}
function renderAdminTransactionList(records, title, eyebrow) {
  return `<div class="catalog-toolbar"><div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2></div><span class="shop-count">${records.length} transaksi</span></div><div class="catalog-table"><div class="catalog-row catalog-head"><span>REFERENSI</span><span>PELANGGAN / KENDARAAN</span><span>ITEM</span><span>PEMBAYARAN</span><span>TOTAL</span></div>${records.length ? records.map(tx => { const customer = getCustomer(tx), vehicle = getVehicle(tx); return `<div class="catalog-row"><span class="catalog-name"><strong>${escapeHtml(tx.code)}<small>${escapeHtml(tx.booking_date)} · ${escapeHtml(tx.booking_time)}</small></strong></span><span>${escapeHtml(customer?.full_name || 'Pelanggan')}<small>${escapeHtml(vehicle?.plate || 'Pembelian produk')}</small></span><span>${escapeHtml(tx.item_name)}</span><span>${statusLabel(tx.payment_method)}<small>${statusLabel(tx.payment_status)}</small></span><span>${money(tx.amount)}</span></div>`; }).join('') : '<div class="queue-empty">Belum ada transaksi.</div>'}</div>`;
}
function renderAdminBays() {
  const bays = [1, 2, 3, 4].map(number => {
    const tx = db.transactions.find(item => ['ACTIVE', 'BOOKED'].includes(item.transaction_status) && item.bay_number === number);
    const vehicle = tx && getVehicle(tx);
    const status = !tx ? 'AVAILABLE' : tx.transaction_status === 'ACTIVE' ? 'OCCUPIED' : 'RESERVED';
    return `<article class="bay-card bay-${status.toLowerCase()}"><div class="bay-card-top"><span>B-${String(number).padStart(2, '0')}</span>${statusBadge(status)}</div><div class="bay-visual"><img src="${vehicle?.type === 'MOTOR' ? PHOTOS.selfMotorcycle : PHOTOS.selfCar}" alt="Bay cuci mandiri ${number}"><span class="bay-number">${String(number).padStart(2, '0')}</span></div><div class="bay-card-bottom"><strong>${vehicle ? `${escapeHtml(vehicle.model)} · ${escapeHtml(vehicle.plate)}` : 'Siap digunakan'}</strong><span>${tx ? `${tx.duration_minutes} menit · ${vehicle?.type === 'MOTOR' ? 'Motor' : 'Mobil'}` : 'Belum ada sesi aktif'}</span><span class="bay-time">${status === 'OCCUPIED' ? `${bayMinutesLeft(tx)} menit tersisa` : status === 'RESERVED' ? `${tx.booking_time} · dipesan` : 'Tersedia sekarang'}</span></div></article>`;
  }).join('');
  return `<div class="catalog-toolbar"><div><p class="eyebrow">AREA CUCI MANDIRI</p><h2>Status bay saat ini.</h2></div><span class="shop-count">${db.transactions.filter(tx => tx.transaction_status === 'ACTIVE' && tx.bay_number).length} bay digunakan</span></div><div class="bay-grid">${bays}</div>`;
}
function renderReportDetailsLegacy() {
  const paid = db.transactions.filter(tx => tx.payment_status === 'PAID');
  const periods = field => [...new Set(paid.map(tx => tx.booking_date.slice(0, field === 'day' ? 10 : 7)))].sort();
  const chart = (label, heading, keys, selector) => `<section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">${label}</p><h2>${heading}</h2></div></div>${keys.map(key => { const amount = paid.filter(selector(key)).reduce((sum, tx) => sum + tx.amount, 0); const max = Math.max(1, ...keys.map(period => paid.filter(selector(period)).reduce((sum, tx) => sum + tx.amount, 0))); return `<div class="revenue-bar-row"><span>${key}</span><div><i style="width:${amount / max * 100}%"></i></div><strong>${money(amount)}</strong></div>`; }).join('')}</section>`;
  const days = periods('day').slice(-7);
  const months = periods('month').slice(-6);
  const vehicles = ['CAR', 'MOTOR'];
  const vehicleSection = `<section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">REVENUE BY VEHICLE</p><h2>Car vs motorcycle</h2></div></div>${vehicles.map(type => { const amount = paid.filter(tx => getVehicle(tx)?.type === type).reduce((sum, tx) => sum + tx.amount, 0); return `<div class="revenue-bar-row"><span>${type === 'CAR' ? 'Cars' : 'Motorcycles'}</span><div><i style="width:${amount / Math.max(1, ...vehicles.map(value => paid.filter(tx => getVehicle(tx)?.type === value).reduce((sum, tx) => sum + tx.amount, 0))) * 100}%"></i></div><strong>${money(amount)}</strong></div>`; }).join('')}</section>`;
  const productSection = `<section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">PRODUCT SALES</p><h2>Studio goods, sold</h2></div></div>${db.services_products.filter(item => item.item_type === 'PRODUCT').map(product => { const units = paid.filter(tx => tx.item_id === product.id).reduce((sum, tx) => sum + (tx.quantity || 1), 0); return `<div class="revenue-bar-row"><span>${escapeHtml(product.name)}</span><div><i class="bar-green" style="width:${units / Math.max(1, ...db.services_products.filter(item => item.item_type === 'PRODUCT').map(item => paid.filter(tx => tx.item_id === item.id).reduce((sum, tx) => sum + (tx.quantity || 1), 0))) * 100}%"></i></div><strong>${units} sold</strong></div>`; }).join('')}</section>`;
  return `${chart('DAILY REVENUE', 'The last seven trading days', days, key => tx => tx.booking_date === key)}${chart('MONTHLY REVENUE', 'Month by month', months, key => tx => tx.booking_date.startsWith(key))}${vehicleSection}${productSection}`;
}
function renderReportDetails() {
  const paid = db.transactions.filter(tx => tx.payment_status === 'PAID');
  const periods = [...new Set(paid.map(tx => tx.booking_date))].sort();
  const days = periods.slice(-7);
  const months = [...new Set(paid.map(tx => tx.booking_date.slice(0, 7)))].sort().slice(-6);
  const renderBars = (eyebrow, title, rows) => {
    const maximum = Math.max(1, ...rows.map(row => row.amount));
    return `<section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2></div></div>${rows.map(row => `<div class="revenue-bar-row"><span>${escapeHtml(row.label)}</span><div><i style="width:${row.amount / maximum * 100}%"></i></div><strong>${row.count === undefined ? money(row.amount) : `${row.count} produk`}</strong></div>`).join('') || '<div class="queue-empty">Belum ada transaksi lunas.</div>'}</section>`;
  };
  const daily = days.map(day => ({ label: day, amount: paid.filter(tx => tx.booking_date === day).reduce((sum, tx) => sum + Number(tx.amount), 0) }));
  const monthly = months.map(month => ({ label: month, amount: paid.filter(tx => tx.booking_date.startsWith(month)).reduce((sum, tx) => sum + Number(tx.amount), 0) }));
  const byVehicle = ['CAR', 'MOTOR'].map(type => ({ label: type === 'CAR' ? 'Mobil' : 'Sepeda motor', amount: paid.filter(tx => getVehicle(tx)?.type === type).reduce((sum, tx) => sum + Number(tx.amount), 0) }));
  const popular = SERVICES.map(service => ({ label: service.name, amount: paid.filter(tx => tx.item_id === service.id).reduce((sum, tx) => sum + Number(tx.amount), 0) })).sort((a, b) => b.amount - a.amount);
  const productSales = db.services_products.filter(item => item.item_type === 'PRODUCT').map(product => ({ label: product.name, amount: paid.filter(tx => tx.item_id === product.id).reduce((sum, tx) => sum + (tx.quantity || 1), 0), count: paid.filter(tx => tx.item_id === product.id).reduce((sum, tx) => sum + (tx.quantity || 1), 0) }));
  return `${renderBars('PENDAPATAN HARIAN', 'Tujuh hari terakhir', daily)}${renderBars('PENDAPATAN BULANAN', 'Ringkasan per bulan', monthly)}${renderBars('PENDAPATAN PER KENDARAAN', 'Mobil dan sepeda motor', byVehicle)}${renderBars('LAYANAN TERPOPULER', 'Pendapatan per layanan', popular)}${renderBars('PENJUALAN PRODUK', 'Produk terjual', productSales)}`;
}
function activateAdminTab(tab) {
  document.querySelectorAll('.admin-nav').forEach(button => button.classList.toggle('active', button.dataset.adminTab === tab));
  const heading = document.getElementById('admin-heading');
  const content = document.getElementById('admin-content');
  if (!content) return;
  const labels = { overview: 'Ringkasan operasional', transactions: 'Transaksi', bookings: 'Booking', queue: 'Antrean cuci', 'self-service': 'Self-Service Bays', catalog: 'Layanan & produk', customers: 'Pelanggan & kendaraan', reports: 'Laporan pendapatan' };
  heading.textContent = labels[tab] || labels.overview;
  if (tab === 'overview') { render(); return; }
  if (tab === 'transactions') content.innerHTML = renderAdminTransactionList(db.transactions, 'Seluruh transaksi studio.', 'DAFTAR TRANSAKSI');
  else if (tab === 'bookings') content.innerHTML = renderAdminTransactionList(db.transactions.filter(tx => tx.transaction_type === 'BOOKING'), 'Jadwal booking mendatang dan riwayat booking.', 'DAFTAR BOOKING');
  else if (tab === 'self-service') content.innerHTML = renderAdminBays();
  if (tab === 'queue') content.innerHTML = `<div class="queue-toolbar"><div><p class="eyebrow">PENGELOLAAN AREA CUCI</p><h2>Pantau setiap kendaraan.</h2></div><button class="button button-dark" data-action="walkin">+ Walk-in baru</button></div>${renderQueueColumns(true)}`;
  else if (tab === 'reports') { content.innerHTML = renderReports(); content.insertAdjacentHTML('beforeend', renderReportDetails()); }
  else if (tab === 'customers') content.innerHTML = `<div class="catalog-toolbar"><div><p class="eyebrow">DATA PELANGGAN</p><h2>Pelanggan dan kendaraannya.</h2></div><span class="shop-count">${db.customers.length} pelanggan · ${db.vehicles.length} kendaraan</span></div><div class="customer-grid">${db.customers.map(customer => `<article class="customer-card"><span class="customer-avatar">${customer.full_name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase()}</span><h3>${escapeHtml(customer.full_name)}</h3><p>${escapeHtml(customer.phone)}</p><div>${db.vehicles.filter(vehicle => vehicle.customer_id === customer.id).map(vehicle => `<span class="vehicle-chip">${escapeHtml(vehicle.model)} · ${escapeHtml(vehicle.plate)}</span>`).join('')}</div><small>${db.transactions.filter(tx => tx.customer_id === customer.id).length} kunjungan</small></article>`).join('')}</div>`;
  else if (tab === 'catalog') content.innerHTML = `<div class="catalog-toolbar"><div><p class="eyebrow">KATALOG DAN PERSEDIAAN</p><h2>Kelola layanan dan produk.</h2></div><button class="button button-dark" data-action="add-item">+ Tambah item</button></div><div class="catalog-table"><div class="catalog-row catalog-head"><span>ITEM</span><span>JENIS</span><span>HARGA</span><span>STOK / DURASI</span><span>STATUS</span></div>${db.services_products.map(item => `<div class="catalog-row"><span class="catalog-name"><img src="${item.image || PHOTOS.car}" alt=""><strong>${escapeHtml(item.name)}</strong></span><span>${item.item_type === 'PRODUCT' ? 'PRODUK' : item.item_type === 'ADD_ON' ? 'TAMBAHAN' : 'LAYANAN'}</span><span>${money(item.price)}</span><span>${item.item_type === 'PRODUCT' ? `<b class="${item.stock <= item.min_stock ? 'stock-low' : ''}">${item.stock} / min ${item.min_stock}</b>` : `${item.duration || 0} menit`}</span><button class="toggle-active" data-edit-item="${item.id}">${item.active === false ? 'NONAKTIF' : 'AKTIF'} · Ubah</button></div>`).join('')}</div>`;
  simplifyUiSymbols(content);
}
function showToast(message, type = 'success') { const element = document.createElement('div'); element.className = `toast toast-${type}`; element.textContent = message; document.getElementById('toast-region').append(element); setTimeout(() => element.remove(), 4500); }
function requestHeaders(prefer = 'return=representation') {
  const bearer = supabaseSession?.access_token || SUPABASE_PUBLISHABLE_KEY;
  return { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json', Prefer: prefer };
}
async function supabaseRequest(table, method = 'GET', body, query = '', prefer = 'return=representation') {
  if (!isSupabaseConfigured()) throw new Error('Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.');
  if (supabaseSession?.expires_at && supabaseSession.expires_at * 1000 < Date.now() + 30000) await refreshAdminSession();
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}${query}`, { method, headers: requestHeaders(prefer), body: body ? JSON.stringify(body) : undefined });
  if (!response.ok) throw new Error('Permintaan belum berhasil. Silakan coba lagi.');
  if (response.status === 204) return null;
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
async function rpcRequest(name, parameters = {}) {
  if (!isSupabaseConfigured()) throw new Error('Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.');
  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${name}`, { method: 'POST', headers: requestHeaders('return=representation'), body: JSON.stringify(parameters) });
  if (!response.ok) throw new Error('Permintaan belum berhasil. Silakan coba lagi.');
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
async function insertRow(table, row) {
  await supabaseRequest(table, 'POST', row, '', 'return=minimal');
}
async function upsertRow(table, row) {
  return supabaseRequest(table, 'POST', row, '?on_conflict=id', 'resolution=merge-duplicates,return=representation');
}
async function patchRow(table, id, changes) {
  return supabaseRequest(table, 'PATCH', changes, `?id=eq.${encodeURIComponent(id)}`, 'return=representation');
}
async function refreshAdminSession() {
  if (!supabaseSession?.refresh_token) throw new Error('Sesi admin berakhir. Silakan masuk kembali.');
  let response;
  try {
    response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: supabaseSession.refresh_token })
    });
  } catch (_) { throw new Error('Tidak dapat memverifikasi sesi. Periksa koneksi lalu coba lagi.'); }
  if (!response.ok) {
    if ([400, 401, 403].includes(response.status)) {
      rememberAuthSession(null);
      adminUser = null;
      throw new Error('Sesi admin berakhir. Silakan masuk kembali.');
    }
    throw new Error('Tidak dapat memverifikasi sesi. Silakan coba lagi.');
  }
  const session = await response.json();
  session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
  rememberAuthSession(session);
  return session;
}
async function signInAdmin(email, password) {
  if (!isSupabaseConfigured()) throw new Error('Layanan login belum tersedia. Silakan coba lagi nanti.');
  let response;
  try {
    response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
  } catch (_) { throw new Error('Tidak dapat terhubung. Periksa koneksi lalu coba lagi.'); }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const authCode = result.error_code || result.code || '';
    const authMessage = String(result.msg || result.message || result.error_description || '').toLowerCase();
    if (['invalid_credentials', 'invalid_grant'].includes(authCode) || /invalid login credentials|invalid credentials/.test(authMessage)) {
      throw new Error('Email atau password yang kamu masukkan salah.');
    }
    if (response.status === 429) throw new Error('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.');
    if (authCode === 'email_not_confirmed') throw new Error('Email akun belum dikonfirmasi.');
    throw new Error('Login belum dapat diproses. Silakan coba lagi.');
  }
  if (result.user?.app_metadata?.role !== 'admin') throw new Error('Akun ini tidak memiliki akses admin.');
  result.expires_at = Math.floor(Date.now() / 1000) + result.expires_in;
  rememberAuthSession(result);
  adminUser = result.user;
  try { await loadAdminData(); }
  catch (_) {
    adminDataReady = false;
    adminDataState = 'error';
    throw new Error('Login berhasil, tetapi dashboard belum dapat dimuat. Silakan coba lagi.');
  }
}
async function restoreAdminSession() {
  if (!supabaseSession || !isSupabaseConfigured()) return false;
  try {
    if (supabaseSession.expires_at * 1000 < Date.now() + 30000) await refreshAdminSession();
    const response = await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, { headers: requestHeaders() });
    if ([401, 403].includes(response.status)) {
      rememberAuthSession(null);
      adminUser = null;
      return false;
    }
    if (!response.ok) throw new Error('Tidak dapat memverifikasi sesi. Silakan coba lagi.');
    adminUser = await response.json();
    if (adminUser.app_metadata?.role !== 'admin') {
      rememberAuthSession(null);
      adminUser = null;
      return false;
    }
    return true;
  } catch (_) {
    adminUser = null;
    return false;
  }
}
async function logoutAdmin() {
  if (supabaseSession?.access_token && isSupabaseConfigured()) {
    await fetch(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/logout`, { method: 'POST', headers: requestHeaders() }).catch(() => {});
  }
  rememberAuthSession(null);
  adminUser = null;
  db = { ...emptyDatabase(), services_products: db.services_products };
  page = 'home';
  render();
}
async function seedEmptyDatabase() {
  for (const table of ['customers', 'vehicles', 'services_products', 'transactions']) {
    for (const row of SEED[table]) await upsertRow(table, row);
  }
}
async function loadPublicData() {
  if (!isSupabaseConfigured()) throw new Error('Service unavailable');
  const products = await supabaseRequest('services_products', 'GET', null, '?select=*&active=eq.true&order=name.asc');
  const count = await rpcRequest('get_public_today_wash_count');
  publicBays = await rpcRequest('get_public_bay_status') || [];
  db = { ...emptyDatabase(), services_products: products || [] };
  syncServiceCatalog();
  publicWashCount = Number(count) || 0;
  databaseConnected = true;
  dataLoadState = 'ready';
}
async function loadAdminData() {
  if (!adminUser) throw new Error('Masuk sebagai admin untuk membuka data studio.');
  let loaded = {};
  for (const table of ['customers', 'vehicles', 'services_products', 'transactions']) loaded[table] = await supabaseRequest(table, 'GET', null, '?select=*&order=created_at.desc');
  if (!loaded.services_products.length) {
    await seedEmptyDatabase();
    for (const table of ['customers', 'vehicles', 'services_products', 'transactions']) loaded[table] = await supabaseRequest(table, 'GET', null, '?select=*&order=created_at.desc');
  }
  db = loaded;
  syncServiceCatalog();
  databaseConnected = true;
  adminDataReady = true;
  adminDataState = 'ready';
}
async function bootstrapSupabase() {
  dataLoadState = 'loading';
  databaseConnected = false;
  db = emptyDatabase();
  publicWashCount = 0;
  publicBays = [];
  SERVICES.splice(0, SERVICES.length);
  ADDONS.splice(0, ADDONS.length);
  render();
  try {
    await loadPublicData();
    if (supabaseSession) await restoreAdminSession();
    render();
  } catch (_) {
    databaseConnected = false;
    dataLoadState = 'error';
    db = emptyDatabase();
    publicWashCount = 0;
    publicBays = [];
    SERVICES.splice(0, SERVICES.length);
    ADDONS.splice(0, ADDONS.length);
    render();
  }
}
function addCatalogItem() {
  const content = document.getElementById('dialog-content');
  content.innerHTML = `<p class="eyebrow">KATALOG STUDIO</p><h2>Tambah item <em>baru.</em></h2><form id="catalog-form" class="dialog-form"><label>Nama item<input name="name" required></label><label>Jenis item<select name="item_type"><option value="SERVICE">LAYANAN</option><option value="PRODUCT">PRODUK</option><option value="ADD_ON">ADD-ON</option></select></label><label>Jenis kendaraan<select name="type"><option value="">Tidak terkait kendaraan</option><option value="CAR">Mobil</option><option value="MOTOR">Sepeda motor</option></select></label><label>Kategori<input name="category" placeholder="REGULAR, SELF_SERVICE, WASH & CARE"></label><label>Deskripsi<input name="description" required></label><div class="form-two"><label>Harga (Rp)<input name="price" type="number" min="0" required></label><label>Durasi (menit)<input name="duration" type="number" min="0" value="30"></label></div><div class="form-two"><label>Stok<input name="stock" type="number" min="0" value="0"></label><label>Stok minimum<input name="min_stock" type="number" min="0" value="5"></label></div><label>URL foto yang sesuai<input name="image" type="url" placeholder="https://..."></label><button class="button button-dark button-full" type="submit">Simpan ke katalog <span>↗</span></button></form>`;
  document.getElementById('flow-dialog').showModal();
  simplifyUiSymbols(document.getElementById('flow-dialog'));
}
function editCatalogItem(item) {
  const content = document.getElementById('dialog-content');
  content.innerHTML = `<p class="eyebrow">UBAH KATALOG</p><h2>Perbarui <em>item.</em></h2><form id="catalog-edit-form" class="dialog-form"><input type="hidden" name="record_id" value="${item.id}"><label>Nama item<input name="name" value="${escapeHtml(item.name)}" required></label><label>Deskripsi<input name="description" value="${escapeHtml(item.description || '')}" required></label><label>URL foto<input name="image" type="url" value="${escapeHtml(item.image || '')}"></label><div class="form-two"><label>Harga (Rp)<input name="price" type="number" value="${item.price}" required></label><label>Status<select name="active"><option value="true" ${item.active !== false ? 'selected' : ''}>Aktif</option><option value="false" ${item.active === false ? 'selected' : ''}>Nonaktif</option></select></label></div>${item.item_type === 'PRODUCT' ? `<div class="form-two"><label>Stok<input name="stock" type="number" value="${item.stock}" min="0"></label><label>Stok minimum<input name="min_stock" type="number" value="${item.min_stock}" min="0"></label></div>` : ''}<button class="button button-dark button-full" type="submit">Simpan perubahan <span>↗</span></button></form>`;
  document.getElementById('flow-dialog').showModal();
  simplifyUiSymbols(document.getElementById('flow-dialog'));
}

document.addEventListener('click', event => {
  const nav = event.target.closest('[data-nav]');
  if (nav) { event.preventDefault(); setPage(nav.dataset.nav); return; }
  const service = event.target.closest('[data-service]');
  if (service) { openDialog('booking', service.dataset.service); return; }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action) {
    if (action === 'close-dialog') document.getElementById('flow-dialog').close();
    else if (action === 'logout') { document.getElementById('flow-dialog').open && document.getElementById('flow-dialog').close(); logoutAdmin(); }
    else if (action === 'retry-data') bootstrapSupabase();
    else if (action === 'retry-admin-data') openAdmin().catch(() => {});
    else if (['booking', 'walkin', 'cart', 'settings'].includes(action)) openDialog(action);
    else if (action === 'checkout-product') renderProductCheckout(document.getElementById('dialog-content'));
    else if (action === 'add-item') addCatalogItem();
    return;
  }
  const productButton = event.target.closest('[data-product]');
  if (productButton) {
    const item = db.services_products.find(product => product.id === productButton.dataset.product);
    if (!item || item.stock < 1) { showToast('Produk sedang habis. Silakan pilih produk lain.', 'error'); return; }
    cart[item.id] = { quantity: Math.min(item.stock, (cart[item.id]?.quantity || 0) + 1) };
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    showToast(`${catalogItem(item).name} ditambahkan ke keranjang.`);
    if (page === 'shop') render();
    return;
  }
  const change = event.target.closest('[data-cart-change]');
  if (change) {
    const id = change.dataset.cartChange;
    cart[id].quantity += Number(change.dataset.delta);
    if (cart[id].quantity <= 0) delete cart[id];
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    renderCartDialog(document.getElementById('dialog-content')); render(); return;
  }
  const tab = event.target.closest('[data-admin-tab]');
  if (tab) { activateAdminTab(tab.dataset.adminTab); return; }
  const item = event.target.closest('[data-edit-item]');
  if (item) editCatalogItem(db.services_products.find(product => product.id === item.dataset.editItem));
  const addon = event.target.closest('[data-addon]');
  if (addon) { openDialog('booking', 'svc-car'); document.querySelector('[name="addon_id"]').value = addon.dataset.addon; document.querySelector('[name="addon_id"]').dispatchEvent(new Event('change', { bubbles: true })); }
});
document.addEventListener('submit', async event => {
  if (event.target.id === 'admin-login-form') {
    event.preventDefault();
    const data = new FormData(event.target);
    const submit = event.target.querySelector('[type="submit"]');
    submit.disabled = true;
    try { await signInAdmin(data.get('email'), data.get('password')); page = 'admin'; render(); showToast('Berhasil masuk ke dashboard admin.'); }
    catch (error) {
      if (adminUser && !adminDataReady) {
        page = 'admin';
        render();
        toast(error.message || 'Dashboard belum dapat dimuat. Silakan coba lagi.', 'error');
        return;
      }
      const loginError = document.getElementById('login-error');
      if (loginError) loginError.textContent = error.message || 'Login belum dapat diproses. Silakan coba lagi.';
      if (submit.isConnected) submit.disabled = false;
    }
  }
  if (event.target.id === 'history-search') {
    event.preventDefault();
    const query = new FormData(event.target).get('query');
    try {
      const records = await rpcRequest('lookup_transaction_history', { p_search: query });
      document.getElementById('history-results').innerHTML = renderHistoryResults(records || []);
    } catch (error) { document.getElementById('history-results').innerHTML = `<div class="empty-state"><h3>Riwayat belum dapat dimuat.</h3><p>${escapeHtml(error.message)}</p></div>`; }
  }
  if (event.target.id === 'transaction-form') { event.preventDefault(); const submit = event.target.querySelector('[type="submit"]'); submit.disabled = true; try { await submitService(event.target); } catch (error) { showToast(error.message, 'error'); submit.disabled = false; } }
  if (event.target.id === 'product-checkout-form') {
    event.preventDefault();
    const submit = event.target.querySelector('[type="submit"]');
    submit.disabled = true;
    try { await submitProducts(event.target); }
    catch (error) { showToast(error.message, 'error'); if (submit.isConnected) submit.disabled = false; }
  }
  if (event.target.id === 'catalog-form') {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const item = { id: crypto.randomUUID(), ...data, type: data.type || null, price: Number(data.price), duration: Number(data.duration), stock: Number(data.stock), min_stock: Number(data.min_stock), active: true, image: data.image || (data.item_type === 'PRODUCT' ? PHOTOS.detailing : PHOTOS.car) };
    try { await upsertRow('services_products', item); db.services_products.push(item); syncServiceCatalog(); document.getElementById('flow-dialog').close(); activateAdminTab('catalog'); showToast('Item ditambahkan ke katalog.'); }
    catch (error) { showToast(error.message, 'error'); }
  }
  if (event.target.id === 'catalog-edit-form') {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const item = db.services_products.find(product => product.id === data.record_id);
    const updated = { ...item, name: data.name, description: data.description, image: data.image || item.image, price: Number(data.price), active: data.active === 'true' };
    if (data.stock !== undefined) { updated.stock = Number(data.stock); updated.min_stock = Number(data.min_stock); }
    try { await patchRow('services_products', item.id, updated); Object.assign(item, updated); syncServiceCatalog(); document.getElementById('flow-dialog').close(); activateAdminTab('catalog'); showToast('Perubahan katalog tersimpan.'); }
    catch (error) { showToast(error.message, 'error'); }
  }
});
document.addEventListener('change', async event => {
  if (event.target.matches('[data-queue-id]')) {
    const tx = db.transactions.find(item => item.id === event.target.dataset.queueId);
    const changes = { queue_status: event.target.value, transaction_status: event.target.value === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE' };
    try { await patchRow('transactions', tx.id, changes); Object.assign(tx, changes); activateAdminTab('queue'); showToast(`${tx.code} dipindahkan ke ${tx.queue_status.toLowerCase()}.`); }
    catch (error) { event.target.value = tx.queue_status; showToast(error.message, 'error'); }
  }
});
document.getElementById('admin-shortcut').addEventListener('click', () => setPage('admin'));
document.getElementById('mobile-menu').addEventListener('click', () => document.querySelector('.main-nav').classList.toggle('is-open'));
bootstrapSupabase();
render();
}