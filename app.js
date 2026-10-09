if (typeof window === 'undefined') {
  const http = require('node:http');
  const fs = require('node:fs');
  const path = require('node:path');
  const root = __dirname;
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.sql': 'text/plain; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif'
  };
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
  selfCar: 'assets/self-service-bay.jpg',
  selfMotorcycle: 'assets/self-service-bay.jpg',
  selfBay: 'assets/self-service-bay.jpg',
  self: 'assets/self-service-bay.jpg',
  product: 'https://images.pexels.com/photos/9470891/pexels-photo-9470891.jpeg?auto=compress&cs=tinysrgb&w=700',
  detailing: 'https://images.pexels.com/photos/12920558/pexels-photo-12920558.jpeg?auto=compress&cs=tinysrgb&w=700',
  shampoo: 'https://cdn.shopify.com/s/files/1/0261/5033/8613/files/54320_HS-Pure-Wash-64oz_MobileOptPDP_wGray_Square_Tile1_1.jpg?v=1765195718',
  microfiber: 'https://cdn.shopify.com/s/files/1/0261/5033/8613/files/cfc294ad-831f-4dab-95e4-10f4b0904680.jpg?v=1737753986',
  tireShine: 'https://cdn.shopify.com/s/files/1/0261/5033/8613/files/50181_Wet-n-Black-Tire-Shine-23oz_MobileOptPDP_wGray_Square_Tile1.jpg?v=1764922355',
  wax: 'https://cdn.shopify.com/s/files/1/0261/5033/8613/files/50187_SHS-Paste-Wax-14oz_MobileOptPDP_wGray_Square_Tile1.jpg?v=1764923251',
  interior: 'https://cdn.shopify.com/s/files/1/0261/5033/8613/files/50799_FRESH-Interior-1-Multi-Purpose-Cleaner-18oz_MobileOptPDP_wGray_Square_Tile1.jpg?v=1764923579',
  glass: 'https://cdn.shopify.com/s/files/1/0261/5033/8613/files/50423_FRESH-Dash-Glass-Interior-Detailer-23oz_MobileOptPDP_wGray_Square_Tile1.png?v=1764923519',
  addonVacuum: 'https://images.pexels.com/photos/5233285/pexels-photo-5233285.jpeg?auto=compress&cs=tinysrgb&w=700',
  addonWax: 'https://images.pexels.com/photos/20042050/pexels-photo-20042050.jpeg?auto=compress&cs=tinysrgb&w=700',
  addonTire: 'https://images.pexels.com/photos/7154623/pexels-photo-7154623.jpeg?auto=compress&cs=tinysrgb&w=700'
};

const CATALOG_COPY = {
  'svc-car': { name: 'Professional Car Wash', description: 'Cuci tangan menyeluruh dengan busa, bilas bertekanan, dan pengeringan rapi.', image: PHOTOS.car },
  'svc-moto': { name: 'Professional Motorcycle Wash', description: 'Pembersihan bodi, roda, dan sela mesin agar motor siap digunakan kembali.', image: PHOTOS.motorcycle },
  'svc-self-car': { name: 'Self-Service Car', description: 'Cuci mobil sendiri di bay khusus dengan foam dan semprotan bertekanan.', image: PHOTOS.selfCar },
  'svc-self-moto': { name: 'Self-Service Motorcycle', description: 'Cuci motor sendiri di bay khusus dengan peralatan yang siap digunakan.', image: PHOTOS.selfMotorcycle },
  'addon-vacuum': { name: 'Interior Vacuum', description: 'Pembersihan debu dan kotoran dari karpet serta kabin kendaraan.', image: PHOTOS.addonVacuum },
  'addon-wax': { name: 'Spray Wax', description: 'Lapisan kilap tambahan untuk membantu menjaga hasil cuci.', image: PHOTOS.addonWax },
  'addon-tire': { name: 'Tire Dressing', description: 'Finishing satin untuk tampilan ban yang bersih.', image: PHOTOS.addonTire },
  'prd-shampoo': { name: 'Sampo Mobil pH Netral', category: 'CUCI & PERAWATAN', description: 'Sampo kendaraan pH netral untuk perawatan rutin tanpa mengganggu lapisan wax.', image: PHOTOS.shampoo },
  'prd-cloth': { name: 'Kain Microfiber 40 × 40 cm', category: 'PERLENGKAPAN', description: 'Kain microfiber lembut dengan daya serap tinggi · 40 × 40 cm.', image: PHOTOS.microfiber },
  'prd-tire': { name: 'Semir Ban Satin', category: 'PERLINDUNGAN', description: 'Perawatan ban dengan hasil hitam satin dan tampilan rapi · 250 ml.', image: PHOTOS.tireShine },
  'prd-wax': { name: 'Wax Cair Pelindung Cat', category: 'PERLINDUNGAN', description: 'Wax cair untuk menambah kilap dan membantu melindungi permukaan cat · 250 ml.', image: PHOTOS.wax },
  'prd-interior': { name: 'Pembersih Interior Mobil', category: 'PERAWATAN INTERIOR', description: 'Pembersih untuk jok dan trim interior kendaraan · 300 ml.', image: PHOTOS.interior },
  'prd-glass': { name: 'Pembersih Kaca Mobil', category: 'PERAWATAN KACA', description: 'Pembersih kaca kendaraan untuk hasil bening tanpa bekas lap · 300 ml.', image: PHOTOS.glass }
};

function catalogItem(item) {
  const copy = CATALOG_COPY[item.id] || {};
  return { ...item, ...copy, image: copy.image || item.image || '' };
}
const PICKUP_ADDON_IDS = new Set(['addon-pickup', 'addon-pickup-moto']);
function isPickupAddon(item) {
  const id = typeof item === 'string' ? item : item?.id;
  if (PICKUP_ADDON_IDS.has(id)) return true;
  if (!item || typeof item !== 'object' || item.item_type !== 'ADD_ON') return false;
  const details = `${item.name || ''} ${item.category || ''} ${item.description || ''}`;
  return String(item.category || '').trim().toUpperCase() === 'PICKUP'
    || /\b(?:PICK[\s-]?UP|DROP[\s-]?OFF|ANTAR[\s-]?JEMPUT)\b/i.test(details);
}
function carriesPickupData(transaction = {}) {
  if (!transaction || typeof transaction !== 'object') return false;
  const addon = db?.services_products?.find(item => item.id === transaction.addon_id);
  return isPickupAddon(transaction.addon_id) || isPickupAddon(addon)
    || [transaction.pickup_distance_km, transaction.pickup_address].some(value => value !== undefined && value !== null && String(value).trim() !== '');
}

const SERVICES = [
  { id: 'svc-car', name: 'Professional Car Wash', type: 'CAR', category: 'REGULAR', price: 50000, duration: 50, description: 'Cuci busa menyeluruh, bilas tekanan tinggi, dan pengeringan rapi untuk mobil harian Anda.', image: PHOTOS.car },
  { id: 'svc-moto', name: 'Professional Motorcycle Wash', type: 'MOTOR', category: 'REGULAR', price: 20000, duration: 35, description: 'Pembersihan bodi, velg, sela mesin, dan bagian motor yang sulit dijangkau.', image: PHOTOS.motorcycle },
  { id: 'svc-self-car', name: 'Self-Service Car', type: 'CAR', category: 'SELF_SERVICE', price: 30000, duration: 30, description: 'Cuci mobil sendiri di bay khusus dengan foam dan semprotan bertekanan.', image: PHOTOS.selfCar },
  { id: 'svc-self-moto', name: 'Self-Service Motorcycle', type: 'MOTOR', category: 'SELF_SERVICE', price: 10000, duration: 25, description: 'Cuci motor sendiri di bay khusus dengan peralatan yang siap digunakan.', image: PHOTOS.selfMotorcycle }
];
const ADDONS = [
  { id: 'addon-vacuum', name: 'Interior Vacuum', price: 20000, duration: 15, image: PHOTOS.addonVacuum },
  { id: 'addon-wax', name: 'Spray Wax', price: 25000, duration: 10, image: PHOTOS.addonWax },
  { id: 'addon-tire', name: 'Tire Dressing', price: 15000, duration: 8, image: PHOTOS.addonTire }
];
const SEED = {
  customers: [
    { id: 'c-1', full_name: 'Fajar Pratama', phone: '081200000001', email: 'fajar.pratama@rinse.id', address: 'Jl. Pahlawan 12, Semarang' },
    { id: 'c-2', full_name: 'Nanda Putri', phone: '081200000002', email: 'nanda.putri@rinse.id', address: 'Jl. Gajah Mada 45, Semarang' },
    { id: 'c-3', full_name: 'Rizky Hidayat', phone: '081200000003', email: 'rizky.hidayat@rinse.id', address: 'Jl. Imam Bonjol 67, Semarang' },
    { id: 'c-4', full_name: 'Siti Rahma', phone: '081200000004', email: 'siti.rahma@rinse.id', address: 'Jl. Sudirman 88, Semarang' },
    { id: 'c-5', full_name: 'Dimas Adi', phone: '081200000005', email: 'dimas.adi@rinse.id', address: 'Jl. Diponegoro 19, Semarang' },
    { id: 'c-6', full_name: 'Arif Wijaya', phone: '081200000006', email: 'arif.wijaya@rinse.id', address: 'Jl. Sriwijaya 23, Semarang' },
    { id: 'c-7', full_name: 'Melya Sari', phone: '081200000007', email: 'melya.sari@rinse.id', address: 'Jl. Merdeka 31, Semarang' },
    { id: 'c-8', full_name: 'Bayu Saputra', phone: '081200000008', email: 'bayu.saputra@rinse.id', address: 'Jl. Taman Siswa 15, Semarang' },
    { id: 'c-9', full_name: 'Aulia Rahman', phone: '081200000009', email: 'aulia.rahman@rinse.id', address: 'Jl. Kenanga 9, Semarang' },
    { id: 'c-10', full_name: 'Kezia Lestari', phone: '081200000010', email: 'kezia.lestari@rinse.id', address: 'Jl. Beringin 54, Semarang' },
    { id: 'c-11', full_name: 'Farhan Nugroho', phone: '081200000011', email: 'farhan.nugroho@rinse.id', address: 'Jl. Cendrawasih 17, Semarang' },
    { id: 'c-12', full_name: 'Indah Permata', phone: '081200000012', email: 'indah.permata@rinse.id', address: 'Jl. Setiabudi 76, Semarang' }
  ],
  vehicles: [
    { id: 'v-1', customer_id: 'c-1', type: 'CAR', plate: 'AB 2345 CD', model: 'Honda HR-V' },
    { id: 'v-2', customer_id: 'c-2', type: 'MOTOR', plate: 'B 7701 QL', model: 'Vespa Sprint' },
    { id: 'v-3', customer_id: 'c-3', type: 'CAR', plate: 'AB 6712 KL', model: 'Toyota Yaris' },
    { id: 'v-4', customer_id: 'c-4', type: 'CAR', plate: 'AB 9154 HP', model: 'Toyota Avanza' },
    { id: 'v-5', customer_id: 'c-4', type: 'MOTOR', plate: 'B 4611 XA', model: 'Honda Vario' },
    { id: 'v-6', customer_id: 'c-5', type: 'CAR', plate: 'AB 3098 RT', model: 'Daihatsu Sigra' },
    { id: 'v-7', customer_id: 'c-6', type: 'MOTOR', plate: 'B 1902 SZ', model: 'Yamaha NMAX' },
    { id: 'v-8', customer_id: 'c-7', type: 'CAR', plate: 'AB 7440 OR', model: 'Mitsubishi Xpander' },
    { id: 'v-9', customer_id: 'c-8', type: 'CAR', plate: 'AB 5026 TM', model: 'Suzuki Ertiga' },
    { id: 'v-10', customer_id: 'c-8', type: 'MOTOR', plate: 'B 8024 NG', model: 'Kawasaki KLX' },
    { id: 'v-11', customer_id: 'c-9', type: 'CAR', plate: 'AB 1198 YN', model: 'Honda Jazz' },
    { id: 'v-12', customer_id: 'c-10', type: 'MOTOR', plate: 'B 2347 CU', model: 'Vespa GTS' },
    { id: 'v-13', customer_id: 'c-11', type: 'CAR', plate: 'AB 5410 MP', model: 'Toyota Fortuner' },
    { id: 'v-14', customer_id: 'c-12', type: 'MOTOR', plate: 'B 8703 LM', model: 'Yamaha Mio' }
  ],
  services_products: [
    ...SERVICES.map(item => ({ ...item, item_type: 'SERVICE', active: true })),
    ...ADDONS.map(item => ({ ...item, item_type: 'ADD_ON', category: 'ADD_ON', active: true })),
    { id: 'prd-shampoo', item_type: 'PRODUCT', name: 'Sampo Cuci Mobil pH Netral', category: 'WASH & CARE', price: 45000, stock: 22, min_stock: 6, active: true, image: PHOTOS.shampoo, description: 'Sampo khusus kendaraan, aman untuk lapisan wax · 500 ml.' },
    { id: 'prd-cloth', item_type: 'PRODUCT', name: 'Kain Premium Microfiber', category: 'TOOLS', price: 45000, stock: 13, min_stock: 5, active: true, image: PHOTOS.microfiber, description: 'Serat lembut dan tebal untuk mengeringkan bodi tanpa goresan · 40 × 40 cm.' },
    { id: 'prd-tire', item_type: 'PRODUCT', name: 'Semir Ban Satin', category: 'PROTECTION', price: 60000, stock: 9, min_stock: 4, active: true, image: PHOTOS.tireShine, description: 'Perawatan ban dengan hasil hitam satin, bukan licin berminyak · 250 ml.' },
    { id: 'prd-wax', item_type: 'PRODUCT', name: 'Liquid Wax Kilap Dalam', category: 'PROTECTION', price: 115000, stock: 8, min_stock: 4, active: true, image: PHOTOS.wax, description: 'Wax cair untuk kilap dan perlindungan cat · 250 ml.' },
    { id: 'prd-interior', item_type: 'PRODUCT', name: 'Pembersih Interior', category: 'INTERIOR CARE', price: 50000, stock: 11, min_stock: 4, active: true, image: PHOTOS.interior, description: 'Pembersih jok dan trim interior untuk perawatan rutin · 300 ml.' },
    { id: 'prd-glass', item_type: 'PRODUCT', name: 'Pembersih Kaca Otomotif', category: 'GLASS CARE', price: 40000, stock: 10, min_stock: 4, active: true, image: PHOTOS.glass, description: 'Pembersih kaca untuk hasil bening tanpa bekas lap · 300 ml.' }
  ],
  transactions: [
    { id: 't-1', code: 'RS-260929-1042', customer_id: 'c-1', vehicle_id: 'v-1', item_id: 'svc-car', item_type: 'SERVICE', item_name: 'Professional Car Wash', quantity: 1, amount: 50000, payment_method: 'QRIS', payment_status: 'PAID', transaction_type: 'WALK_IN', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-09-29', booking_time: '09:20', duration_minutes: 50, created_at: '2026-09-29T09:20:00' },
    { id: 't-2', code: 'RS-260930-1088', customer_id: 'c-2', vehicle_id: 'v-2', item_id: 'svc-self-moto', item_type: 'SERVICE', item_name: 'Self-Service Motorcycle', quantity: 1, amount: 10000, payment_method: 'QRIS', payment_status: 'PAID', transaction_type: 'BOOKING', transaction_status: 'ACTIVE', queue_status: 'WASHING', booking_date: '2026-09-30', booking_time: '10:05', duration_minutes: 25, bay_number: 2, created_at: '2026-09-30T10:05:00' },
    { id: 't-3', code: 'RS-261001-0107', customer_id: 'c-3', vehicle_id: 'v-3', item_id: 'svc-self-car', item_type: 'SERVICE', item_name: 'Self-Service Car', quantity: 1, amount: 30000, payment_method: 'E_WALLET', payment_status: 'PAID', transaction_type: 'BOOKING', transaction_status: 'BOOKED', queue_status: 'WAITING', booking_date: '2026-10-01', booking_time: '14:30', duration_minutes: 30, bay_number: 1, created_at: '2026-09-30T10:15:00' },
    { id: 't-4', code: 'RS-260929-0781', customer_id: 'c-2', vehicle_id: 'v-2', item_id: 'svc-moto', item_type: 'SERVICE', item_name: 'Professional Motorcycle Wash', quantity: 1, amount: 20000, payment_method: 'CASH', payment_status: 'PAID', transaction_type: 'WALK_IN', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-09-29', booking_time: '16:40', duration_minutes: 35, created_at: '2026-09-29T16:40:00' },
    { id: 't-5', code: 'RS-260928-0551', customer_id: 'c-1', vehicle_id: null, item_id: 'prd-shampoo', item_type: 'PRODUCT', item_name: 'Sampo Cuci Mobil pH Netral', quantity: 2, amount: 90000, payment_method: 'CASH', payment_status: 'PAID', transaction_type: 'SHOP', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-09-28', booking_time: '11:10', duration_minutes: 0, created_at: '2026-09-28T11:10:00' },
    { id: 't-6', code: 'RS-260927-0332', customer_id: 'c-3', vehicle_id: 'v-3', item_id: 'svc-car', item_type: 'SERVICE', item_name: 'Professional Car Wash', quantity: 1, amount: 50000, payment_method: 'QRIS', payment_status: 'PAID', transaction_type: 'WALK_IN', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-09-27', booking_time: '15:25', duration_minutes: 50, created_at: '2026-09-27T15:25:00' },
    { id: 't-7', code: 'RS-261002-0216', customer_id: 'c-2', vehicle_id: 'v-2', item_id: 'svc-moto', item_type: 'SERVICE', item_name: 'Professional Motorcycle Wash', quantity: 1, amount: 20000, payment_method: 'CARD', payment_status: 'PAID', transaction_type: 'BOOKING', transaction_status: 'BOOKED', queue_status: 'WAITING', booking_date: '2026-10-02', booking_time: '10:30', duration_minutes: 35, created_at: '2026-09-30T10:30:00' },
    { id: 't-8', code: 'RS-260930-1134', customer_id: 'c-3', vehicle_id: 'v-3', item_id: 'svc-car', item_type: 'SERVICE', item_name: 'Professional Car Wash', quantity: 1, amount: 50000, payment_method: 'CASH', payment_status: 'PAID', transaction_type: 'WALK_IN', transaction_status: 'ACTIVE', queue_status: 'WAITING', booking_date: '2026-09-30', booking_time: '10:30', duration_minutes: 50, created_at: '2026-09-30T10:27:00' },
    { id: 't-9', code: 'RS-260926-0972', customer_id: 'c-1', vehicle_id: null, item_id: 'prd-cloth', item_type: 'PRODUCT', item_name: 'Kain Premium Microfiber', quantity: 1, amount: 45000, payment_method: 'QRIS', payment_status: 'PAID', transaction_type: 'SHOP', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-09-26', booking_time: '12:05', duration_minutes: 0, created_at: '2026-09-26T12:05:00' },
    { id: 't-10', code: 'RS-260925-0821', customer_id: 'c-3', vehicle_id: 'v-3', item_id: 'svc-self-car', item_type: 'SERVICE', item_name: 'Self-Service Car', quantity: 1, amount: 30000, payment_method: 'E_WALLET', payment_status: 'PAID', transaction_type: 'BOOKING', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-09-25', booking_time: '17:15', duration_minutes: 30, bay_number: 4, created_at: '2026-09-25T17:15:00' },
    { id: 't-11', code: 'RS-261004-1171', customer_id: 'c-4', vehicle_id: 'v-4', item_id: 'svc-car', addon_id: 'addon-pickup', pickup_distance_km: 2.4, item_type: 'SERVICE', item_name: 'Professional Car Wash', quantity: 1, amount: 60000, payment_method: 'QRIS', payment_status: 'PAID', transaction_type: 'BOOKING', transaction_status: 'BOOKED', queue_status: 'WAITING', booking_date: '2026-10-04', booking_time: '08:40', duration_minutes: 50 },
    { id: 't-12', code: 'RS-261005-1388', customer_id: 'c-5', vehicle_id: 'v-6', item_id: 'svc-self-car', item_type: 'SERVICE', item_name: 'Self-Service Car', quantity: 1, amount: 30000, payment_method: 'QRIS', payment_status: 'PAID', transaction_type: 'BOOKING', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-10-05', booking_time: '10:15', duration_minutes: 30, bay_number: 3 },
    { id: 't-13', code: 'RS-261006-1457', customer_id: 'c-6', vehicle_id: 'v-7', item_id: 'svc-moto', item_type: 'SERVICE', item_name: 'Professional Motorcycle Wash', quantity: 1, amount: 20000, payment_method: 'E_WALLET', payment_status: 'PAID', transaction_type: 'BOOKING', transaction_status: 'BOOKED', queue_status: 'WAITING', booking_date: '2026-10-06', booking_time: '11:20', duration_minutes: 35 },
    { id: 't-14', code: 'RS-261005-1514', customer_id: 'c-7', vehicle_id: 'v-8', item_id: 'svc-car', item_type: 'SERVICE', item_name: 'Professional Car Wash', quantity: 1, amount: 50000, payment_method: 'CARD', payment_status: 'PAID', transaction_type: 'WALK_IN', transaction_status: 'ACTIVE', queue_status: 'WASHING', booking_date: '2026-10-05', booking_time: '13:05', duration_minutes: 50 },
    { id: 't-15', code: 'RS-261006-1606', customer_id: 'c-8', vehicle_id: 'v-10', item_id: 'svc-self-moto', item_type: 'SERVICE', item_name: 'Self-Service Motorcycle', quantity: 1, amount: 10000, payment_method: 'QRIS', payment_status: 'PAID', transaction_type: 'BOOKING', transaction_status: 'BOOKED', queue_status: 'WAITING', booking_date: '2026-10-06', booking_time: '15:10', duration_minutes: 25, bay_number: 2 },
    { id: 't-16', code: 'RS-261007-1832', customer_id: 'c-9', vehicle_id: 'v-11', item_id: 'svc-self-car', item_type: 'SERVICE', item_name: 'Self-Service Car', quantity: 1, amount: 30000, payment_method: 'QRIS', payment_status: 'PAID', transaction_type: 'BOOKING', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-10-07', booking_time: '16:35', duration_minutes: 30, bay_number: 4 },
    { id: 't-17', code: 'RS-261003-1960', customer_id: 'c-10', vehicle_id: 'v-12', item_id: 'svc-moto', addon_id: 'addon-pickup-moto', pickup_distance_km: 2.0, item_type: 'SERVICE', item_name: 'Professional Motorcycle Wash', quantity: 1, amount: 25000, payment_method: 'QRIS', payment_status: 'PAID', transaction_type: 'BOOKING', transaction_status: 'BOOKED', queue_status: 'WAITING', booking_date: '2026-10-03', booking_time: '09:45', duration_minutes: 35 },
    { id: 't-18', code: 'RS-261008-2019', customer_id: 'c-11', vehicle_id: 'v-13', item_id: 'svc-car', item_type: 'SERVICE', item_name: 'Professional Car Wash', quantity: 1, amount: 50000, payment_method: 'E_WALLET', payment_status: 'PAID', transaction_type: 'BOOKING', transaction_status: 'BOOKED', queue_status: 'WAITING', booking_date: '2026-10-08', booking_time: '12:25', duration_minutes: 50 },
    { id: 't-19', code: 'RS-261004-2286', customer_id: 'c-12', vehicle_id: 'v-14', item_id: 'svc-self-moto', item_type: 'SERVICE', item_name: 'Self-Service Motorcycle', quantity: 1, amount: 10000, payment_method: 'CARD', payment_status: 'PAID', transaction_type: 'BOOKING', transaction_status: 'COMPLETED', queue_status: 'COMPLETED', booking_date: '2026-10-04', booking_time: '14:50', duration_minutes: 25, bay_number: 1 },
    { id: 't-20', code: 'RS-261009-2417', customer_id: 'c-1', vehicle_id: 'v-1', item_id: 'svc-car', item_type: 'SERVICE', item_name: 'Professional Car Wash', quantity: 1, amount: 50000, payment_method: 'CASH', payment_status: 'REFUNDED', transaction_type: 'BOOKING', transaction_status: 'CANCELLED', queue_status: 'COMPLETED', booking_date: '2026-10-09', booking_time: '17:10', duration_minutes: 50 }
  ]
};
const seedToday = getJakartaDateString();
const seedYesterday = addDaysToJakartaDate(seedToday, -1);
const seedTomorrow = addDaysToJakartaDate(seedToday, 1);
const activeSeed = SEED.transactions.find(tx => tx.id === 't-2');
const activeStarted = new Date(Date.now() - 8 * 60000);
activeSeed.booking_date = seedToday;
activeSeed.booking_time = getJakartaTimeString(activeStarted);
activeSeed.created_at = activeStarted.toISOString();
SEED.transactions.find(tx => tx.id === 't-1').booking_date = seedYesterday;
SEED.transactions.find(tx => tx.id === 't-3').booking_date = seedTomorrow;
SEED.transactions.find(tx => tx.id === 't-3').bay_number = 1;
SEED.transactions.find(tx => tx.id === 't-4').booking_date = seedYesterday;
for (const [id, offset] of [['t-5', -2], ['t-6', -3], ['t-7', 2], ['t-8', 0], ['t-9', -4], ['t-10', -5]]) {
  const transaction = SEED.transactions.find(tx => tx.id === id);
  transaction.booking_date = addDaysToJakartaDate(seedToday, offset);
  transaction.created_at = new Date(Date.now() + offset * 86400000).toISOString();
}
for (const [id, offset] of [['t-11', -1], ['t-12', 0], ['t-13', 1], ['t-14', 0], ['t-15', 1], ['t-16', 2], ['t-17', -2], ['t-18', 3], ['t-19', -1], ['t-20', 4]]) {
  const transaction = SEED.transactions.find(tx => tx.id === id);
  transaction.booking_date = addDaysToJakartaDate(seedToday, offset);
}
SEED.transactions.forEach((transaction, index) => {
  const [year, month, day] = transaction.booking_date.slice(2).split('-');
  transaction.code = `RS-${year}${month}${day}-${String(1042 + index * 37).padStart(4, '0')}`;
  if (transaction.id !== 't-2') {
    transaction.created_at = transaction.transaction_type === 'BOOKING' && transaction.booking_date >= seedToday
      ? new Date(Date.now() - (index + 1) * 17 * 60000).toISOString()
      : new Date(`${transaction.booking_date}T${transaction.booking_time}:00+07:00`).toISOString();
  }
});
SEED.transactions.filter(transaction => transaction.item_type === 'SERVICE').forEach(transaction => {
  const service = SEED.services_products.find(item => item.id === transaction.item_id);
  const addon = SEED.services_products.find(item => item.id === transaction.addon_id);
  if (!service) return;
  const serviceAmount = service.price;
  transaction.amount = serviceAmount + Number(addon?.price || 0);
  transaction.item_name = `${service.name}${addon ? ` + ${addon.name}` : ''}`;
});

const SUPABASE_URL = 'https://cvnzbfbzgmjlepbsjinl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vzeEcRxxXJaMfE7JyKWOeg_KLx8XqnH';
const SUPABASE_REQUEST_TIMEOUT_MS = 15000;
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
let adminDataError = '';
let publicWashCount = 0;
let publicBays = [];
let publicRefreshInProgress = false;
let activeAdminTab = 'overview';
let serviceFilter = 'all';
let productFilter = 'all';
let historyRecords = [];
let historyFilter = 'all';

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
  const services = db.services_products.filter(isRegularServiceItem);
  const addons = db.services_products.filter(item => item.item_type === 'ADD_ON' && item.active !== false && !isPickupAddon(item));
  SERVICES.splice(0, SERVICES.length, ...services.map(catalogItem));
  ADDONS.splice(0, ADDONS.length, ...addons.map(catalogItem));
}
function transactionTypeLabel(value) {
  return ({ BOOKING: 'Booking', WALK_IN: 'Datang langsung', SHOP: 'Toko' })[value] || String(value || '').replaceAll('_', ' ');
}
function money(value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value) || 0); }
function escapeHtml(value = '') { return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char])); }
function isRegularServiceItem(item) {
  return !!item && item.item_type === 'SERVICE' && item.active !== false && item.category !== 'SELF_SERVICE';
}
function isSelfServiceItem(item) {
  return !!item && item.item_type === 'SERVICE' && item.active !== false && item.category === 'SELF_SERVICE';
}
function regularServices() {
  return SERVICES.filter(isRegularServiceItem);
}
function getJakartaFutureTimeString(minutes = 10) {
  return getJakartaTimeString(new Date(Date.now() + Number(minutes) * 60000));
}
function getJakartaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(date);
  const result = {};
  parts.forEach(part => { if (part.type !== 'literal') result[part.type] = part.value; });
  return {
    year: result.year || '2026',
    month: result.month || '01',
    day: result.day || '01',
    hour: result.hour || '00',
    minute: result.minute || '00',
    second: result.second || '00'
  };
}
function getJakartaDateString(date = new Date()) {
  const { year, month, day } = getJakartaDateParts(date);
  return `${year}-${month}-${day}`;
}
function getJakartaTimeString(date = new Date()) {
  const { hour, minute, second } = getJakartaDateParts(date);
  return `${hour}:${minute}:${second}`.slice(0, 5);
}
function parseJakartaDateTime(dateString, timeString) {
  if (!dateString || !timeString) return new Date();
  return new Date(`${dateString}T${timeString}:00+07:00`);
}
function addDaysToJakartaDate(dateString, offsetDays) {
  const date = new Date(`${dateString}T12:00:00+07:00`);
  date.setDate(date.getDate() + Number(offsetDays || 0));
  return getJakartaDateString(date);
}
function getVehicle(tx) { return db.vehicles.find(item => item.id === tx.vehicle_id); }
function getCustomer(tx) { return db.customers.find(item => item.id === tx.customer_id); }
function normalizeTransactionRecord(tx = {}) {
  const normalized = { ...tx };
  const paymentStatus = String(normalized.payment_status || 'PENDING').toUpperCase();
  const transactionStatus = String(normalized.transaction_status || 'PENDING').toUpperCase();
  const refundStatus = String(normalized.refund_status || 'NONE').toUpperCase();
  normalized.payment_status = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'].includes(paymentStatus) ? paymentStatus : 'PENDING';
  normalized.transaction_status = ['PENDING', 'BOOKED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(transactionStatus) ? transactionStatus : 'PENDING';
  normalized.refund_status = ['NONE', 'PENDING', 'COMPLETED'].includes(refundStatus) ? refundStatus : 'NONE';
  if (!normalized.booking_time && normalized.created_at) {
    const created = new Date(normalized.created_at);
    if (!Number.isNaN(created.getTime())) {
      normalized.booking_time = getJakartaTimeString(created);
      normalized.booking_date = normalized.booking_date || getJakartaDateString(created);
    }
  }
  return normalized;
}
function normalizeOperationalTransaction(tx = {}) {
  const normalized = normalizeTransactionRecord(tx);
  if (normalized.item_type === 'SERVICE' && normalized.transaction_type === 'BOOKING'
    && ['PENDING', 'BOOKED', 'ACTIVE', 'COMPLETED'].includes(normalized.transaction_status)
    && normalized.booking_date && normalized.booking_time) {
    const startsAt = parseJakartaDateTime(normalized.booking_date, normalized.booking_time).getTime();
    const endsAt = startsAt + Math.max(Number(normalized.duration_minutes) || 0, 0) * 60000;
    if (normalized.payment_status !== 'PAID' && startsAt <= Date.now()) {
      normalized.transaction_status = 'EXPIRED';
      normalized.queue_status = 'COMPLETED';
      return normalized;
    }
    if (endsAt <= Date.now()) {
      normalized.transaction_status = normalized.transaction_status === 'ACTIVE'
        && ['WASHING', 'FINISHING', 'COMPLETED'].includes(normalized.queue_status) ? 'COMPLETED' : 'EXPIRED';
      normalized.queue_status = 'COMPLETED';
    } else if (normalized.payment_status === 'PAID' && normalized.transaction_status === 'BOOKED' && startsAt <= Date.now()) {
      normalized.transaction_status = 'ACTIVE';
      normalized.queue_status = normalized.queue_status || 'WAITING';
    } else if (normalized.payment_status !== 'PAID' && ['BOOKED', 'ACTIVE', 'COMPLETED'].includes(normalized.transaction_status)) {
      normalized.transaction_status = 'PENDING';
      normalized.queue_status = 'WAITING';
    }
  }
  return normalized;
}
function getOperationalTransactions(records = []) {
  return records.map(tx => normalizeOperationalTransaction(tx));
}
function isRevenueTransaction(tx) {
  const paymentStatus = String(tx?.payment_status || 'PENDING').toUpperCase();
  const transactionStatus = String(tx?.transaction_status || 'PENDING').toUpperCase();
  const refundStatus = String(tx?.refund_status || 'NONE').toUpperCase();
  return paymentStatus === 'PAID'
    && !['CANCELLED', 'EXPIRED'].includes(transactionStatus)
    && !['PENDING', 'COMPLETED'].includes(refundStatus);
}
function statusLabel(value) {
  return ({ AVAILABLE: 'Tersedia', OCCUPIED: 'Digunakan', RESERVED: 'Dipesan', PAID: 'Lunas', PENDING: 'Belum Dibayar', FAILED: 'Gagal', REFUNDED: 'Pengembalian Dana', NONE: 'Tidak ada', COMPLETED: 'Selesai', BOOKED: 'Terkonfirmasi', ACTIVE: 'Sedang Berlangsung', CANCELLED: 'Dibatalkan', EXPIRED: 'Hangus', WAITING: 'Menunggu', WASHING: 'Dicuci', FINISHING: 'Tahap Akhir', CASH: 'Tunai', QRIS: 'QRIS', E_WALLET: 'Dompet digital', CARD: 'Kartu' })[String(value || '').toUpperCase()] || String(value || '').replaceAll('_', ' ');
}
function statusBadge(value) { return `<span class="status status-${String(value).toLowerCase().replaceAll('_', '-')}">${statusLabel(value)}</span>`; }
function isBayTransactionCurrent(tx, now = Date.now()) {
  if (!tx?.booking_date || !tx?.booking_time) return false;
  const start = parseJakartaDateTime(tx.booking_date, tx.booking_time).getTime();
  const end = start + Math.max(Number(tx.duration_minutes) || 0, 0) * 60000;
  if (tx.transaction_status === 'ACTIVE') return start <= now && end > now;
  return tx.transaction_status === 'BOOKED' && tx.booking_date === getJakartaDateString(new Date(now)) && end > now;
}
function bayMinutesLeft(tx) {
  const start = parseJakartaDateTime(tx.booking_date, tx.booking_time).getTime();
  return Math.max(0, Number(tx.duration_minutes) - Math.floor((Date.now() - start) / 60000));
}

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
function polishUiLabels(root) {
  const finalUiLabel = value => value
    .replaceAll('CUCI MANDIRI', 'SELF-SERVICE')
    .replaceAll('Cuci Mandiri', 'Self-Service')
    .replaceAll('Cuci mandiri', 'Self-Service')
    .replaceAll('cuci mandiri', 'Self-Service')
    .replaceAll('LANDASAN LAYANAN', 'PROFESSIONAL WASH')
    .replaceAll('Semua layanan', 'Lihat pilihan')
    .replaceAll('Coba Self-Service', 'Pilih bay')
    .replaceAll('LAYANAN CUCI', 'PROFESSIONAL WASH')
    .replaceAll('Layanan Cuci', 'Professional Wash')
    .replaceAll('Layanan cuci', 'Professional Wash')
    .replaceAll('Layanan & produk', 'Produk & Layanan')
    .replaceAll('Layanan dan produk', 'Produk & Layanan')
    .replaceAll('Services & products', 'Produk & Layanan')
    .replaceAll('Customers & vehicles', 'Pelanggan & Kendaraan')
    .replaceAll('Antrean cuci', 'Antrean')
    .replaceAll('Pesan cuci', 'Pesan Cuci')
    .replaceAll('Walk-in baru', 'Transaksi langsung')
    .replaceAll('WALK-IN', 'DATANG LANGSUNG')
    .replaceAll(' pending', ' belum dibayar')
    .replaceAll('Layanan tambahan', 'Tambahan')
    .replaceAll('E-Wallet', 'Dompet digital')
    .replaceAll('Lanjut ke review', 'Lanjut ke ringkasan')
    .replaceAll('LAPORAN KEUANGAN', 'LAPORAN PENDAPATAN');
  const labelWalker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let labelNode;
  while ((labelNode = labelWalker.nextNode())) labelNode.textContent = finalUiLabel(labelNode.textContent);
  root.querySelectorAll('img[alt]').forEach(image => { image.alt = finalUiLabel(image.alt); });
}

function polishPublicContent(root, currentPage) {
  if (currentPage === 'home') {
    const qualityCopy = [
      ['Air bilasan lebih bersih', 'Air hasil penyaringan membantu mengurangi residu mineral yang bisa meninggalkan noda setelah kendaraan kering.'],
      ['Sampo khusus kendaraan', 'Menggunakan sampo dengan pH seimbang untuk membersihkan kendaraan dengan lembut dan membantu menjaga lapisan wax.'],
      ['Dibersihkan sampai rapi', 'Mulai dari penyabunan dan pembilasan hingga pengeringan, semuanya dilakukan sesuai layanan yang kamu pilih.'],
      ['Untuk mobil dan motor', 'Pilih layanan sesuai kendaraanmu, termasuk cuci mandiri di area Self-Service.']
    ];
    root.querySelectorAll('.quality-grid article').forEach((article, index) => {
      const [title, description] = qualityCopy[index] || [];
      if (title) article.querySelector('h3').textContent = title;
      if (description) article.querySelector('p').textContent = description;
    });
    const allServices = root.querySelector('.closing-cta [data-nav="services"]');
    if (allServices) {
      allServices.removeAttribute('data-nav');
      allServices.dataset.action = 'all-services';
      allServices.textContent = 'Lihat Semua Layanan';
    }
  }
  if (currentPage === 'services') {
    const titles = { car: 'Layanan cuci mobil', bike: 'Layanan cuci motor', addon: 'Tambahan layanan' };
    root.querySelectorAll('[data-service-group]').forEach(group => {
      const title = titles[group.dataset.serviceGroup];
      if (title) group.querySelector('.service-group-heading h3').textContent = title;
    });
  }
  if (currentPage === 'self-service') {
    const rowsByNumber = new Map(publicBays
      .filter(row => Number.isInteger(Number(row.bay_number)) && Number(row.bay_number) >= 1 && Number(row.bay_number) <= 4)
      .map(row => [Number(row.bay_number), row]));
    const complete = [1, 2, 3, 4].every(number => ['AVAILABLE', 'RESERVED', 'OCCUPIED'].includes(rowsByNumber.get(number)?.bay_status));
    const counts = ['AVAILABLE', 'RESERVED', 'OCCUPIED'].map(state => [...rowsByNumber.values()].filter(row => row.bay_status === state).length);
    const status = root.querySelector('.self-service-hero-status');
    if (status) {
      status.querySelector('strong').textContent = complete ? `${counts[0]} / 4` : '—';
      status.querySelectorAll('.self-service-hero-breakdown b').forEach((value, index) => {
        value.textContent = complete ? String(counts[index]) : '—';
      });
    }
    const bayGrid = root.querySelector('.bay-grid');
    if (bayGrid && !bayGrid.children.length) {
      const empty = document.createElement('p');
      empty.className = 'empty-state';
      empty.textContent = 'Status bay belum tersedia.';
      bayGrid.append(empty);
    }
    root.querySelectorAll('.bay-card.bay-unknown').forEach(card => {
      const label = card.querySelector('.bay-card-bottom > strong');
      const statusLabel = card.querySelector('.bay-time');
      if (label) label.textContent = 'Status belum tersedia';
      if (statusLabel) statusLabel.textContent = 'Status belum tersedia';
    });
  }
}
function render() {
  const views = { home: renderHome, services: renderServices, 'self-service': renderBays, shop: renderShop, history: renderHistory, admin: renderAdmin };
  const app = document.getElementById('app');
  document.body.dataset.page = page;
  document.body.classList.toggle('admin-mode', page === 'admin');
  if (page === 'admin') app.innerHTML = !adminUser ? renderAdminLogin() : adminDataReady ? renderAdmin() : renderAdminDataState();
  else app.innerHTML = databaseConnected ? (views[page] || renderHome)() : renderPublicDataState();
  applyReferencePresentation(app);
  polishUiLabels(app);
  if (['home', 'services', 'self-service'].includes(page)) polishPublicContent(app, page);
  const pageHero = app.querySelector('.page-hero');
  if (page === 'services' && pageHero) {
    pageHero.querySelector('.eyebrow').textContent = 'PROFESSIONAL WASH';
    pageHero.querySelector('h1').textContent = 'Professional Wash';
    pageHero.querySelector('.page-hero-number').innerHTML = '02<br><small>PILIHAN</small>';
  } else if (page === 'self-service' && pageHero) {
    pageHero.querySelector('.eyebrow').textContent = 'SELF-SERVICE';
    pageHero.querySelector('h1').textContent = 'Self-Service';
  } else if (page === 'home') {
    const selfServiceHeading = app.querySelector('.service-banner h3');
    if (selfServiceHeading) selfServiceHeading.textContent = 'Self-Service';
  }
  if (page === 'admin' && adminUser && adminDataReady) setAdminDescription('overview');
  app.querySelectorAll('.connection-indicator, .database-notice').forEach(element => element.remove());
  const settingsButton = app.querySelector('.admin-sidebar [data-action="settings"]');
  if (settingsButton) settingsButton.setAttribute('aria-label', 'Pengaturan studio');
  if (page === 'admin' && adminUser && adminDataReady && document.querySelector('.metric-grid')) {
    try {
      renderAdminMetrics();
    } catch (error) {
      console.error('[Admin dashboard] Render failed:', error);
      const content = app.querySelector('#admin-content');
      if (content) content.innerHTML = `<section class="empty-state" role="alert"><h3>Data belum dapat dimuat</h3><p>${escapeHtml(error.message || 'Dashboard gagal dirender.')}</p><button class="button button-dark" data-action="retry-admin-data">Coba muat ulang</button></section>`;
    }
  }
  document.querySelectorAll('[data-nav]').forEach(link => link.classList.toggle('active', link.dataset.nav === page));
  simplifyUiSymbols();
}
function applyReferencePresentation(app) {
  const hero = app.querySelector('.hero');
  if (page !== 'home' || !hero) return;

  const availableBays = publicBays.filter(bay => bay.bay_status === 'AVAILABLE').length;
  const totalBays = publicBays.length || 4;
  const availableLabel = publicBays.length ? String(availableBays).padStart(2, '0') : '--';
  app.insertAdjacentHTML('afterbegin', `<section class="home-statusbar"><div><span class="live-dot"></span><strong>${publicWashCount} KENDARAAN TERAWAT HARI INI</strong><span class="status-divider">/</span><span>RINSE SOCIETY · SEMARANG</span></div><div><span>SELF-SERVICE LIVE</span><strong>${availableLabel} / ${totalBays} BAY TERSEDIA</strong></div></section>`);
  hero.classList.add('reference-home-hero');
  hero.querySelector('.hero-content .hero-buttons').innerHTML = '<button class="button button-dark" data-action="booking">Pesan slot cuci</button><button class="button button-quiet" data-nav="services">Jelajahi layanan</button>';
  hero.insertAdjacentHTML('beforeend', `<aside class="home-capacity-panel"><div class="capacity-panel-heading"><span><i class="live-dot"></i> TELEMETRI BAY LIVE</span><strong>SISTEM NORMAL</strong></div><div class="capacity-metrics"><article><div><span>PROFESSIONAL WASH</span><b>${String(regularServices().length).padStart(2, '0')}</b></div><small>Layanan studio</small><i>Studio Semarang</i></article><article><div><span>SELF-SERVICE</span><b>${String(totalBays).padStart(2, '0')}</b></div><small>Bay universal</small><i>${availableLabel} tersedia</i></article></div><div class="capacity-panel-foot"><span>Jadwal diperbarui dari status bay</span><button class="text-link" data-nav="self-service">Lihat status bay</button></div></aside>`);
}
function renderHistoryResultsInto(container, records) {
  container.innerHTML = renderHistoryResults(records);
  const list = container.querySelector('.history-list');
  if (!list) return;

  const visibleRecords = records.filter(tx => {
    if (historyFilter === 'process') return ['BOOKED', 'ACTIVE'].includes(tx.transaction_status);
    if (historyFilter === 'completed') return tx.transaction_status === 'COMPLETED';
    if (historyFilter === 'self-service') return tx.item_type === 'SERVICE' && /self-service/i.test(tx.item_name || '');
    return true;
  });
  const table = document.createElement('table');
  table.className = 'history-table';
  table.innerHTML = '<thead><tr><th>No. Transaksi</th><th>Kendaraan</th><th>Layanan &amp; Bay</th><th>Waktu Booking</th><th>Status</th><th class="text-right">Nominal</th><th>Aksi</th></tr></thead>';
  const body = document.createElement('tbody');

  visibleRecords.forEach(tx => {
    const row = document.createElement('tr');
    const date = new Date(`${tx.booking_date}T12:00:00`);
    const bookingDate = date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
    const bookingTime = String(tx.booking_time || '').slice(0, 5);
    const serviceName = tx.bay_number ? `Self-Service · Bay ${String(tx.bay_number).padStart(2, '0')}` : tx.item_name || (tx.item_type === 'PRODUCT' ? 'Pembelian produk' : 'Layanan cuci');
    const cells = [
      `<strong>${escapeHtml(tx.code)}</strong><small>${escapeHtml(transactionTypeLabel(tx.transaction_type))}</small>`,
      `<strong>${escapeHtml(tx.vehicle_model || 'Pembelian produk')}</strong><small>${escapeHtml(tx.vehicle_plate || '')} · ${escapeHtml(tx.customer_name || '')}</small>`,
      `<strong>${escapeHtml(serviceName)}</strong><small>${tx.duration_minutes || 0} menit</small>`,
      `<strong>${escapeHtml(bookingDate)}</strong><small>${escapeHtml(bookingTime)} WIB</small>`,
      `<span class="history-table-status">${statusBadge(tx.transaction_status)}${tx.payment_status === tx.transaction_status ? '' : statusBadge(tx.payment_status)}</span>`,
      `<strong>${money(tx.amount)}</strong><small>${escapeHtml(statusLabel(tx.payment_method))}</small>`,
      '<span class="history-table-action">—</span>'
    ];
    cells.forEach((content, index) => {
      const cell = document.createElement('td');
      cell.innerHTML = content;
      row.append(cell);
      if (index === 6) {
        const canCancel = tx.transaction_type === 'BOOKING' && ['PENDING', 'BOOKED'].includes(tx.transaction_status)
          && parseJakartaDateTime(tx.booking_date, tx.booking_time).getTime() > Date.now();
        if (canCancel) {
          const action = document.createElement('button');
          action.className = 'payment-mark-paid';
          action.type = 'button';
          action.dataset.cancelBooking = tx.transaction_id;
          action.dataset.cancelSearch = document.getElementById('history-query')?.value.trim() || '';
          action.textContent = 'Batalkan booking';
          cell.replaceChildren(action);
        }
      }
    });
    body.append(row);
  });
  table.append(body);
  list.replaceWith(table);
}
function renderPublicDataState() {
  const loading = dataLoadState === 'loading';
  return `<section class="section"><div class="empty-state" role="status"><h3>${loading ? 'Memuat data studio...' : 'Data studio sementara tidak tersedia.'}</h3><p>${loading ? 'Mohon tunggu sebentar.' : 'Kami belum dapat memuat data. Silakan coba lagi.'}</p>${loading ? '' : '<button class="button button-dark" data-action="retry-data">Coba lagi</button>'}</div></section>`;
}
function renderAdminDataState() {
  const loading = adminDataState === 'loading';
  return `<section class="section"><div class="empty-state" role="status"><h3>${loading ? 'Memuat dashboard...' : 'Data belum dapat dimuat.'}</h3><p>${loading ? 'Mohon tunggu sebentar.' : escapeHtml(adminDataError || 'Data studio belum tersedia. Silakan coba lagi.')}</p>${loading ? '' : '<button class="button button-dark" data-action="retry-admin-data">Coba lagi</button><button class="text-link" data-action="logout">Keluar</button>'}</div></section>`;
}
function simplifyUiSymbols(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const emptyDecorations = new Set();
  let node;
  while ((node = walker.nextNode())) {
    if (!/[↗↓→←]/.test(node.nodeValue)) continue;
    const cleaned = node.nodeValue.replace(/[↗↓→←]/g, '').replace(/\s{2,}/g, ' ');
    const wrapper = node.parentElement;
    if (!cleaned.trim() && wrapper && !wrapper.children.length && /^(SPAN|I)$/.test(wrapper.tagName)) emptyDecorations.add(wrapper);
    else node.nodeValue = cleaned;
  }
  emptyDecorations.forEach(element => element.remove());
}
function renderAdminLogin() {
  return `<section class="admin-login-page"><div class="admin-login-content"><a class="brand" href="#home" data-nav="home"><span class="brand-mark">R</span><span>rinse<span class="brand-light">society</span><small>WASH STUDIO · SEMARANG</small></span></a><h1>Masuk Admin</h1><p>Masuk untuk mengelola operasional Rinse Society.</p><form id="admin-login-form" class="admin-login-form"><label for="admin-email">Email</label><input id="admin-email" name="email" type="email" autocomplete="username" required placeholder="nama@bisnis.id"><label for="admin-password">Kata sandi</label><input id="admin-password" name="password" type="password" autocomplete="current-password" required placeholder="Masukkan kata sandi"><button class="button button-dark button-full" type="submit">Masuk</button><p class="login-error" id="login-error" role="alert"></p></form><button class="text-link" data-nav="home">Kembali ke Beranda</button></div></section>`;
}
function dailyPaidRevenue(transactions, dayCount = 7) {
  const today = getJakartaDateString();
  return Array.from({ length: dayCount }, (_, index) => {
    const key = addDaysToJakartaDate(today, -(dayCount - index - 1));
    const date = new Date(`${key}T12:00:00+07:00`);
    return {
      key,
      label: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      amount: transactions.filter(tx => isRevenueTransaction(tx) && tx.booking_date === key).reduce((sum, tx) => sum + Number(tx.amount), 0)
    };
  });
}
function renderRevenueLineChart(rows, className = '') {
  const width = 760, height = 250;
  const pad = { top: 18, right: 16, bottom: 38, left: 76 };
  const plotWidth = width - pad.left - pad.right;
  const max = Math.max(1, ...rows.map(row => row.amount));
  const plotHeight = height - pad.top - pad.bottom;
  const points = rows.map((row, index) => ({
    ...row,
    x: pad.left + (rows.length < 2 ? plotWidth / 2 : index * plotWidth / (rows.length - 1)),
    y: pad.top + plotHeight - row.amount / max * plotHeight
  }));
  const path = points.map((point, index) => `${index ? 'L' : 'M'}${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' ');
  const guides = [0, .5, 1].map(fraction => {
    const y = pad.top + plotHeight * fraction;
    const value = max * (1 - fraction);
    return `<g class="chart-guide"><line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"/><text x="${pad.left - 10}" y="${y + 4}" text-anchor="end">${escapeHtml(money(value))}</text></g>`;
  }).join('');
  const dots = points.map(point => `<circle class="chart-point" cx="${point.x}" cy="${point.y}" r="4"><title>${escapeHtml(point.label)}: ${escapeHtml(money(point.amount))}</title></circle><text class="chart-date" x="${point.x}" y="${height - 10}" text-anchor="middle">${escapeHtml(point.label)}</text>`).join('');
  return `<svg class="revenue-line-chart ${className}" viewBox="0 0 ${width} ${height}" role="img" aria-label="Tren pendapatan harian tujuh hari terakhir">${guides}<path class="chart-area" d="${path} L${points.at(-1)?.x || pad.left},${pad.top + plotHeight} L${points[0]?.x || pad.left},${pad.top + plotHeight} Z"/><path class="chart-line" d="${path}"/>${dots}</svg>`;
}
function reportTransactions() {
  return getOperationalTransactions(db.transactions);
}
function reportVehicle(transaction) {
  return getVehicle(transaction);
}
function renderAdminMetrics() {
  if (!document.querySelector('.metric-grid')) return;
  const transactions = reportTransactions();
  const today = getJakartaDateString();
  const todays = transactions.filter(tx => tx.booking_date === today);
  const paidToday = todays.filter(isRevenueTransaction);
  const lowStock = db.services_products.filter(item => item.item_type === 'PRODUCT' && item.stock <= item.min_stock).length;
  const washed = new Set(todays.filter(tx => tx.item_type === 'SERVICE' && isRevenueTransaction(tx) && tx.transaction_status === 'COMPLETED').map(tx => tx.vehicle_id).filter(Boolean)).size;
  const bookings = todays.filter(tx => tx.transaction_type === 'BOOKING' && isRevenueTransaction(tx)).length;
  const selfService = todays.filter(tx => tx.item_type === 'SERVICE' && isRevenueTransaction(tx) && db.services_products.find(item => item.id === tx.item_id)?.category === 'SELF_SERVICE').length;
  const paid = transactions.filter(isRevenueTransaction);
  const weeklyRows = dailyPaidRevenue(transactions);
  const weeklyDates = new Set(weeklyRows.map(row => row.key));
  const weeklyPaid = paid.filter(tx => weeklyDates.has(tx.booking_date));
  const serviceRevenue = weeklyPaid.filter(tx => tx.item_type !== 'PRODUCT').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const productRevenue = weeklyPaid.filter(tx => tx.item_type === 'PRODUCT').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const metrics = [
    ['Pendapatan Hari Ini', money(paidToday.reduce((sum, tx) => sum + Number(tx.amount), 0)), `${paidToday.length} transaksi lunas`, 'primary'],
    ['Transaksi', transactions.length.toString().padStart(2, '0'), `${transactions.filter(tx => tx.transaction_type === 'BOOKING' && tx.transaction_status !== 'CANCELLED').length} booking tercatat`, 'primary'],
    ['Kendaraan Dilayani', String(washed).padStart(2, '0'), 'Transaksi selesai hari ini', 'primary'],
    ['Booking Hari Ini', String(bookings).padStart(2, '0'), 'Jadwal kunjungan', 'primary']
  ];
  document.querySelector('.metric-grid').innerHTML = metrics.map(([label, value, note, primary]) => `<article class="metric-card ${primary ? 'metric-primary' : ''}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('');
  const secondaryMetrics = `<div class="metric-secondary-grid"><div><span>Sesi Self-Service Hari Ini</span><strong>${String(selfService).padStart(2, '0')}</strong><small>Sesi lunas hari ini</small></div><div><span>Pendapatan Jasa · Tujuh Hari</span><strong>${money(serviceRevenue)}</strong><small>Transaksi lunas dalam tujuh hari</small></div><div><span>Pendapatan Produk · Tujuh Hari</span><strong>${money(productRevenue)}</strong><small>Transaksi lunas dalam tujuh hari</small></div><div><span>Pelanggan</span><strong>${String(db.customers.length).padStart(2, '0')}</strong><small>Data pelanggan terdaftar</small></div></div>`;
  let secondaryGrid = document.querySelector('.metric-secondary-grid');
  if (!secondaryGrid) {
    document.querySelector('.metric-grid').insertAdjacentHTML('afterend', secondaryMetrics);
  } else {
    secondaryGrid.outerHTML = secondaryMetrics;
  }

  const totalRevenue = serviceRevenue + productRevenue;
  const revenuePanel = document.querySelector('.revenue-panel');
  if (revenuePanel) revenuePanel.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">TREN PENDAPATAN</p><h2>Pendapatan Periode</h2></div><strong class="dashboard-revenue-total">${money(totalRevenue)}</strong></div><p class="dashboard-chart-context">Transaksi lunas · tujuh hari terakhir</p>${renderRevenueLineChart(weeklyRows)}<div class="dashboard-revenue-split"><div><span>Jasa · tujuh hari</span><strong>${money(serviceRevenue)}</strong></div><div><span>Produk · tujuh hari</span><strong>${money(productRevenue)}</strong></div></div>`;

  const lowStockItems = db.services_products.filter(item => item.item_type === 'PRODUCT' && item.stock <= item.min_stock);
  const lowStockPanel = document.querySelector('.low-stock-panel');
  if (lowStockPanel) lowStockPanel.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">PANTAU STOK</p><h2>Perlu ditambah</h2></div><span class="low-stock-count">${lowStockItems.length} MENIPIS</span></div>${lowStockItems.length ? lowStockItems.map(item => `<div class="stock-row"><img src="${catalogItem(item).image}" alt=""><span><strong>${escapeHtml(catalogItem(item).name)}</strong><small>Minimum ${item.min_stock} unit</small></span><b>${item.stock} tersisa</b></div>`).join('') : '<div class="stock-clear">Semua stok mencukupi.</div>'}<button class="text-link" data-admin-tab="catalog">Kelola persediaan</button>`;

  const queuePreview = document.querySelector('.queue-preview');
  if (queuePreview) queuePreview.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">KONDISI AREA CUCI</p><h2>Antrean saat ini</h2></div><button class="text-link" data-admin-tab="queue">Lihat antrean</button></div>${renderQueueColumns(false)}`;

  const activityGrid = document.querySelector('.admin-content-grid');
  if (activityGrid) {
    const recent = [...transactions].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 4);
    const activity = `<section class="admin-panel activity-panel"><div class="panel-heading"><div><p class="eyebrow">AKTIVITAS TERBARU</p><h2>Transaksi terbaru</h2></div><span>${transactions.length} total</span></div><div class="activity-list">${recent.map(tx => `<div class="activity-row"><div><strong>${escapeHtml(tx.code)}</strong><span>${escapeHtml(tx.item_name)}</span></div><div><strong>${money(tx.amount)}</strong><span>${escapeHtml(statusLabel(tx.payment_status))} · ${escapeHtml(tx.booking_date)}</span></div></div>`).join('') || '<p class="report-empty">Belum ada transaksi.</p>'}</div></section>`;
    let activityPanel = activityGrid.querySelector('.activity-panel');
    if (activityPanel) activityPanel.outerHTML = activity;
    else activityGrid.insertAdjacentHTML('beforeend', activity);
  }
}
function serviceCard(service) {
  const item = catalogItem(service);
  return `<article class="service-card"><div class="service-photo"><img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy"><span class="photo-tag">PROFESSIONAL WASH</span></div><div class="service-copy"><div class="service-title-row"><h3>${escapeHtml(item.name)}</h3><span class="service-price">${money(item.price)}</span></div><p>${escapeHtml(item.description)}</p><div class="service-meta"><span>${item.duration} menit</span><span class="meta-dot"></span><span>${item.type === 'MOTOR' ? 'Motor' : 'Mobil'}</span><button data-service="${item.id}">Pilih layanan</button></div></div></article>`;
}
function renderHome() {
  const washes = publicWashCount;
  const notice = '';
  return `${notice}<section class="hero"><img class="hero-image" src="${PHOTOS.hero}" alt="Mobil berbusa saat dicuci di studio"><div class="hero-shade"></div><div class="hero-topline"><span>WASH STUDIO · SEMARANG</span><span><i class="live-dot"></i> BUKA HARI INI · 08.00 — 21.00</span></div><div class="hero-content"><p class="eyebrow eyebrow-light">CUCI LEBIH BAIK. BERKENDARA LEBIH NYAMAN.</p><h1>Mobil Anda layak<br>mendapat <em>perawatan lebih.</em></h1><p class="hero-description">Serahkan kendaraan kepada tim Rinse Society untuk hasil yang konsisten, rapi, dan terpercaya.</p><div class="hero-buttons"><a class="text-link light-link" href="#services" data-nav="services">Lihat pilihan</a></div></div><div class="hero-note"><strong>${String(washes).padStart(2, '0')}</strong><span>kendaraan dirawat<br>hari ini</span></div><div class="hero-index">01 <span></span> 04</div></section>
  <section class="intro-strip"><p>BERSIH MENYELURUH. <span>PERJALANAN LEBIH NYAMAN.</span></p><p>PERAWATAN TELITI, TANPA REPOT.</p></section>
  <section class="section quality-section"><div class="section-heading"><div><p class="eyebrow">STANDARDISASI PERAWATAN</p><h2>Metode dan kualitas<br><em>yang terasa bedanya.</em></h2></div><p class="section-aside">Perawatan dirancang untuk membersihkan kendaraan dengan teliti dan menjaga hasilnya tetap rapi.</p></div><div class="quality-grid"><article><span class="quality-index">01</span><h3>Air tersaring</h3><p>Bilas Reverse Osmosis membantu mengurangi residu mineral yang dapat meninggalkan noda air.</p></article><article><span class="quality-index">02</span><h3>Formula pH-netral</h3><p>Sampo khusus kendaraan untuk membersihkan dengan lembut dan menjaga lapisan wax.</p></article><article><span class="quality-index">03</span><h3>Teknik menyeluruh</h3><p>Busa, bilas bertekanan, dan pengeringan rapi sesuai layanan yang dipilih.</p></article><article><span class="quality-index">04</span><h3>Pilihan sesuai kendaraan</h3><p>Layanan tersedia untuk mobil dan sepeda motor, termasuk empat bay Self-Service.</p></article></div></section>
  <section class="section services-section" id="services"><div class="section-heading"><div><p class="eyebrow">PROFESSIONAL WASH</p><h2>Serahkan kendaraan.<br><em>Tim kami yang menangani.</em></h2></div><p class="section-aside">Tim Rinse Society menangani pencucian kendaraan dengan fokus pada kualitas hasil, durasi, dan penanganan yang rapi.</p><a class="text-link" href="#services" data-nav="services">Lihat pilihan</a></div><div class="service-grid">${regularServices().slice(0, 2).map(serviceCard).join('')}</div><div class="service-banner"><img src="${PHOTOS.selfBay}" alt="Beberapa bay Self-Service yang siap digunakan" loading="lazy"><div class="banner-content"><span class="eyebrow eyebrow-light">SELF-SERVICE</span><h3>Self-Service</h3><p>Pilih salah satu dari empat bay universal untuk mobil atau sepeda motor, lalu tentukan waktu dan durasi cuci.</p><button class="button button-white" data-nav="self-service">Pilih bay</button></div><span class="banner-index">BAY UNIVERSAL · 02</span></div></section>
  <section class="shop-teaser"><div class="section-heading"><div><p class="eyebrow">PERAWATAN KENDARAAN DI RUMAH</p><h2>Produk pilihan.<br><em>Rawat kilapnya.</em></h2></div><a class="text-link" href="#shop" data-nav="shop">Lihat semua produk</a></div><div class="product-grid">${db.services_products.filter(item => item.item_type === 'PRODUCT').slice(0, 2).map(productCard).join('')}</div></section>
  <section class="closing-cta"><div><p class="eyebrow eyebrow-light">RINSE SOCIETY · SEMARANG</p><h2>Siap memberikan kilau terbaik<br>untuk kendaraan Anda?</h2><p>Pilih layanan dan waktu kunjungan yang sesuai.</p></div><div class="closing-cta-actions"><button class="button button-white" data-action="booking">Pesan layanan</button><button class="text-link light-link" data-nav="services">Lihat semua layanan</button></div></section>`;
}
function productCard(sourceProduct, options = {}) {
  const product = catalogItem(sourceProduct);
  const low = product.stock <= product.min_stock;
  const categoryAttribute = options.categoryFilter ? `data-product-category="${escapeHtml(options.categoryFilter)}"` : '';
  const hidden = options.categoryFilter && productFilter !== 'all' && options.categoryFilter !== productFilter ? 'hidden' : '';
  return `<article class="product-card" ${categoryAttribute} ${hidden}><button class="product-image" data-product="${product.id}" aria-label="Tambahkan ${escapeHtml(product.name)} ke keranjang"><img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy"><span class="product-add">+</span></button><div class="product-info"><span class="eyebrow">${escapeHtml(product.category || 'PRODUK PERAWATAN')}</span><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description || '')}</p><div class="product-price-row"><strong>${money(product.price)}</strong><span class="stock-note ${low ? 'low-stock' : ''}">${low ? 'STOK MENIPIS' : `STOK ${product.stock}`}</span></div><button class="product-buy" data-product="${product.id}">Tambah ke keranjang <span>↗</span></button></div></article>`;
}
function renderServices() {
  const catalogAddons = ADDONS;
  const cars = regularServices().filter(service => service.type === 'CAR');
  const motorcycles = regularServices().filter(service => service.type === 'MOTOR');
  const count = regularServices().length + catalogAddons.length;
  const filterButton = (value, label, amount) => `<button class="catalog-filter${serviceFilter === value ? ' is-active' : ''}" type="button" data-service-filter="${value}" aria-pressed="${serviceFilter === value}">${label}<span>${amount}</span></button>`;
  const group = (key, title, note, services) => `<section class="service-filter-group" data-service-group="${key}" ${serviceFilter !== 'all' && serviceFilter !== key ? 'hidden' : ''}><div class="service-group-heading"><div><p class="eyebrow">${key === 'car' ? 'PROFESSIONAL · MOBIL' : key === 'bike' ? 'PROFESSIONAL · MOTOR' : 'TAMBAHAN'}</p><h3>${title}</h3></div><span>${note}</span></div>${key === 'addon' ? `<div class="addons-row">${catalogAddons.map(addon => `<button class="addon-item" data-addon="${addon.id}"><img src="${addon.image}" width="54" height="54" alt="${escapeHtml(addon.name)}" loading="lazy"><span><strong>${escapeHtml(addon.name)}</strong><small>${money(addon.price)} · ${addon.duration} menit</small></span><b>↗</b></button>`).join('') || '<p class="empty-state">Tambahan belum tersedia.</p>'}</div>` : `<div class="service-grid">${services.map(serviceCard).join('') || '<p class="empty-state">Layanan belum tersedia.</p>'}</div>`}</section>`;
  return `<section class="page-hero page-hero-blue"><div><p class="eyebrow eyebrow-light">PROFESSIONAL WASH</p><h1>Professional Wash</h1><p>Tim Rinse Society mencuci kendaraan Anda dengan hasil yang konsisten, rapi, dan terpercaya.</p></div><span class="page-hero-number">02<br><small>PILIHAN</small></span></section><section class="section services-list"><div class="section-heading compact-heading"><div><p class="eyebrow">PILIHAN PERAWATAN</p><h2>Temukan layanan <em>yang tepat.</em></h2></div><span class="availability"><i class="live-dot"></i> Datang langsung atau booking</span></div><div class="catalog-filter-bar" role="group" aria-label="Filter layanan">${filterButton('all', 'Semua', count)}${filterButton('car', 'Mobil', cars.length)}${filterButton('bike', 'Motor', motorcycles.length)}${filterButton('addon', 'Add-on', catalogAddons.length)}</div>${group('car', 'Layanan cuci mobil', `${cars.length} layanan tersedia`, cars)}${group('bike', 'Layanan cuci motor', `${motorcycles.length} layanan tersedia`, motorcycles)}${group('addon', 'Tambahan layanan', `${catalogAddons.length} pilihan`, [])}</section>`;
}
function renderBays() {
  const bays = Array.from({ length: 4 }, (_, index) => {
    const number = index + 1;
    const row = publicBays.find(item => Number(item.bay_number) === number);
    const state = ['AVAILABLE', 'RESERVED', 'OCCUPIED'].includes(row?.bay_status) ? row.bay_status : 'UNKNOWN';
    return { number, state, type: row?.vehicle_type || null, duration: Number(row?.duration_minutes || 0), remaining: Number(row?.minutes_remaining || 0), time: row?.booking_time || null };
  });
  const packages = db.services_products.filter(isSelfServiceItem);
  const availableCount = bays.filter(bay => bay.state === 'AVAILABLE').length;
  const reservedCount = bays.filter(bay => bay.state === 'RESERVED').length;
  const occupiedCount = bays.filter(bay => bay.state === 'OCCUPIED').length;
  const availability = publicBays.length ? `${availableCount} / ${publicBays.length}` : '—';
  return `<section class="page-hero page-hero-navy"><div><p class="eyebrow eyebrow-light">SELF-SERVICE</p><h1>Self-Service</h1><p>Pilih bay universal untuk mobil atau sepeda motor, lalu tentukan waktu dan durasi cuci.</p></div><aside class="self-service-hero-status" aria-label="Ketersediaan bay live"><div><p class="eyebrow eyebrow-light">KETERSEDIAAN BAY · LIVE</p><strong>${availability}</strong><span>Bay tersedia</span></div><div class="self-service-hero-breakdown"><span>Tersedia <b>${publicBays.length ? availableCount : '—'}</b></span><span>Dipesan <b>${publicBays.length ? reservedCount : '—'}</b></span><span>Digunakan <b>${publicBays.length ? occupiedCount : '—'}</b></span></div></aside></section><section class="section bays-section"><div class="section-heading compact-heading"><div><p class="eyebrow">STATUS BAY TERKINI</p><h2>Empat bay universal.<br><em>Siap untuk mobil atau motor.</em></h2></div><span class="updated-label"><i class="live-dot"></i> Diperbarui langsung</span></div><div class="bay-grid">${bays.map(bay => {
    const normalizedState = ['AVAILABLE', 'RESERVED', 'OCCUPIED'].includes(bay.state) ? bay.state : 'UNKNOWN';
    const isOccupied = normalizedState === 'OCCUPIED';
    const isReserved = normalizedState === 'RESERVED';
    const visual = PHOTOS.selfBay;
    const label = isOccupied ? (bay.type === 'MOTOR' ? 'DIGUNAKAN · Sepeda motor' : 'DIGUNAKAN · Mobil') : isReserved ? 'DIPESAN' : normalizedState === 'AVAILABLE' ? 'TERSEDIA' : 'STATUS BELUM TERSEDIA';
    return `<article class="bay-card bay-${normalizedState.toLowerCase()}"><div class="bay-card-top"><span>B-${String(bay.number).padStart(2, '0')}</span>${statusBadge(normalizedState)}</div><div class="bay-visual"><img src="${visual}" alt="Fasilitas Self-Service kosong untuk bay B-${String(bay.number).padStart(2, '0')}" loading="lazy"><span class="bay-number">${String(bay.number).padStart(2, '0')}</span></div><div class="bay-card-bottom"><strong>${label}</strong><span>${isOccupied ? `${bay.duration || 0} menit · ${bay.remaining || 0} menit tersisa` : isReserved ? `${bay.time || 'Jadwal'} · dipesan` : 'Bay kosong · siap digunakan'}</span>${normalizedState === 'AVAILABLE' ? `<button class="text-link" data-action="self-service-book">Pilih bay</button>` : `<span class="bay-time">${isOccupied ? `${bay.remaining || 0} menit tersisa` : `${bay.time || ''} · dipesan`}</span>`}</div></article>`;
  }).join('')}</div><div class="bay-note"><span class="bay-note-icon">i</span><p>Empat bay universal untuk mobil dan sepeda motor. Status ditentukan dari jadwal dan durasi sesi aktif.</p><button class="text-link" data-action="self-service-book">Mulai Self-Service</button></div></section><section class="section self-service-packages"><div class="section-heading compact-heading"><div><p class="eyebrow">PAKET SESI</p><h2>Pilihan paket Self-Service</h2><p>Paket mengikuti layanan dan harga yang tersedia di katalog studio.</p></div></div><div class="package-grid">${packages.map(item => `<article class="package-card"><span class="package-type">${item.type === 'MOTOR' ? 'MOTOR' : 'MOBIL'}</span><h3>${escapeHtml(catalogItem(item).name)}</h3><p>${Number(item.duration) || 0} menit di bay universal</p><strong>${money(item.price)}</strong><button class="button button-dark" type="button" data-self-service-type="${item.type}">Pilih paket</button></article>`).join('') || '<div class="empty-state">Paket Self-Service belum tersedia.</div>'}</div></section><section class="section self-service-guide"><div class="section-heading compact-heading"><div><p class="eyebrow">PANDUAN PENGGUNAAN</p><h2>Mulai sesi dalam tiga langkah</h2></div></div><ol class="guide-steps"><li><span>01</span><div><h3>Pilih kendaraan dan bay</h3><p>Tentukan jenis kendaraan, salah satu dari empat bay, serta waktu kunjungan.</p></div></li><li><span>02</span><div><h3>Pilih paket sesi</h3><p>Durasi dan harga mengikuti layanan Self-Service aktif yang tersedia di katalog.</p></div></li><li><span>03</span><div><h3>Konfirmasi pembayaran</h3><p>Booking tetap menunggu verifikasi pembayaran sebelum sesi dapat dimulai.</p></div></li></ol></section><section class="section self-service-facilities"><div><p class="eyebrow">INFORMASI STUDIO</p><h2>Empat bay, satu alur yang jelas.</h2></div><p>Status bay diperbarui dari jadwal sesi aktif. Pilih bay yang tersedia; booking belum mengaktifkan sesi sebelum pembayaran diverifikasi.</p></section>`;
}
function renderShop() {
  const items = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = Object.entries(cart).reduce((sum, [id, row]) => sum + (db.services_products.find(product => product.id === id)?.price || 0) * row.quantity, 0);
  const products = db.services_products.filter(item => item.item_type === 'PRODUCT' && item.active !== false);
  const groups = { shampoo: products.filter(item => productFilterGroup(item) === 'shampoo').length, detailer: products.filter(item => productFilterGroup(item) === 'detailer').length, accessories: products.filter(item => productFilterGroup(item) === 'accessories').length };
  const filterButton = (value, label, amount) => `<button class="catalog-filter${productFilter === value ? ' is-active' : ''}" type="button" data-product-filter="${value}" aria-pressed="${productFilter === value}">${label}<span>${amount}</span></button>`;
  return `<section class="page-hero page-hero-green"><div><p class="eyebrow eyebrow-light">PRODUK PILIHAN</p><h1>Produk Pilihan</h1><p>Produk perawatan kendaraan pilihan untuk menjaga hasil cuci lebih lama.</p></div><button class="cart-summary" data-action="cart"><span class="cart-icon">▱</span><span><strong>${items} produk</strong><small>${money(subtotal)} di keranjang</small></span></button></section><section class="section shop-section"><div class="section-heading compact-heading"><div><p class="eyebrow">KATALOG PERAWATAN</p><h2>Rawat kendaraan <em>di rumah.</em></h2></div><span class="shop-count">${products.length} produk pilihan</span></div><div class="catalog-filter-bar" role="group" aria-label="Filter kategori produk">${filterButton('all', 'Semua produk', products.length)}${filterButton('shampoo', 'Sampo & pembersih', groups.shampoo)}${filterButton('detailer', 'Detailer & proteksi', groups.detailer)}${filterButton('accessories', 'Aksesori', groups.accessories)}</div><div class="product-grid">${products.map(item => productCard(item, { categoryFilter: productFilterGroup(item) })).join('')}</div><div class="cart-drawer-inline"><div><span class="eyebrow">KERANJANG ANDA</span><strong>${items} produk · ${money(subtotal)}</strong></div><button class="button button-dark" data-action="cart">Lihat keranjang</button></div></section>`;
}
function productFilterGroup(item) {
  const category = `${item.category || ''} ${item.name || ''}`.toLocaleUpperCase('id-ID');
  if (/TOOLS|ACCESSOR|MICROFIBER|KAIN/.test(category)) return 'accessories';
  if (/WASH|SHAMPOO|SAMPO|CLEAN|PEMBERSIH|GLASS|KACA/.test(category)) return 'shampoo';
  return 'detailer';
}
function renderHistory() {
  return `<section class="page-hero page-hero-sand"><div><p class="eyebrow">RIWAYAT TRANSAKSI</p><h1>Riwayat Servis & Kunjungan</h1><p>Temukan transaksi aktual berdasarkan kode booking, nomor HP, atau nomor polisi.</p></div><span class="history-stamp">RIWAYAT<br>RINSE<br>SOCIETY.</span></section><section class="section history-section"><form id="history-search" class="history-search"><label for="history-query">Cari transaksi</label><div><input id="history-query" name="query" placeholder="Kode booking, nomor HP, atau nomor polisi" autocomplete="off"><button class="button button-dark" type="submit">Cari riwayat</button></div><small>Ringkasan hanya menampilkan transaksi yang cocok dengan data pencarian.</small></form><div id="history-results">${renderHistoryResults([])}</div></section>`;
}
function renderHistoryResults(records) {
  historyRecords = records;
  if (!records.length) return `<div class="empty-state"><h3>Belum ada kunjungan yang cocok.</h3><p>Periksa kembali kode booking, nomor HP, atau plat kendaraan.</p></div>`;
  const paidCount = records.filter(tx => tx.payment_status === 'PAID').length;
  const pendingCount = records.filter(tx => tx.payment_status === 'PENDING').length;
  const selfServiceCount = records.filter(tx => tx.item_type === 'SERVICE' && /self-service/i.test(tx.item_name || '')).length;
  const filtered = records.filter(tx => {
    if (historyFilter === 'process') return ['BOOKED', 'ACTIVE'].includes(tx.transaction_status);
    if (historyFilter === 'completed') return tx.transaction_status === 'COMPLETED';
    if (historyFilter === 'self-service') return tx.item_type === 'SERVICE' && /self-service/i.test(tx.item_name || '');
    return true;
  });
  const filterButton = (value, label, amount) => `<button class="history-filter${historyFilter === value ? ' is-active' : ''}" type="button" data-history-filter="${value}" aria-pressed="${historyFilter === value}">${label}<span>${amount}</span></button>`;
  const search = document.getElementById('history-query')?.value.trim() || '';
  return `<section class="history-summary" aria-label="Ringkasan hasil pencarian"><article><span>TRANSAKSI DITEMUKAN</span><strong>${records.length}</strong></article><article><span>TERKONFIRMASI LUNAS</span><strong>${paidCount}</strong></article><article><span>MENUNGGU PEMBAYARAN</span><strong>${pendingCount}</strong></article></section><div class="history-results-toolbar"><div><p class="eyebrow">HASIL PENCARIAN</p><h2>${records.length} transaksi ditemukan</h2></div><button class="button button-quiet" type="button" data-action="print-history" aria-label="Cetak hasil riwayat">Cetak</button></div><div class="history-filter-bar" role="group" aria-label="Filter riwayat">${filterButton('all', 'Semua', records.length)}${filterButton('process', 'Dalam proses', records.filter(tx => ['BOOKED', 'ACTIVE'].includes(tx.transaction_status)).length)}${filterButton('completed', 'Selesai', records.filter(tx => tx.transaction_status === 'COMPLETED').length)}${filterButton('self-service', 'Self-Service', selfServiceCount)}</div><div class="history-list">${filtered.map(tx => {
    const itemName = tx.bay_number ? `Self-Service · B-${String(tx.bay_number).padStart(2, '0')}` : tx.item_name || (tx.item_type === 'PRODUCT' ? 'Pembelian produk' : 'Layanan cuci');
    const canCancel = tx.transaction_type === 'BOOKING' && ['PENDING', 'BOOKED'].includes(tx.transaction_status)
      && parseJakartaDateTime(tx.booking_date, tx.booking_time).getTime() > Date.now();
    const refundNote = tx.refund_status === 'PENDING' ? '<span>Pengembalian Dana: menunggu proses manual</span>' : tx.refund_status === 'COMPLETED' ? '<span>Pengembalian Dana: selesai</span>' : '';
    return `<article class="history-item"><div class="history-date"><strong>${new Date(`${tx.booking_date}T12:00:00`).toLocaleDateString('id-ID', { day: '2-digit' })}</strong><span>${new Date(`${tx.booking_date}T12:00:00`).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })}</span></div><div class="history-main"><span class="eyebrow">${escapeHtml(tx.code)} · ${escapeHtml(transactionTypeLabel(tx.transaction_type))}</span><h3>${escapeHtml(itemName)}</h3><p>${escapeHtml(tx.vehicle_model || '')} · ${escapeHtml(tx.vehicle_plate || 'Pembelian produk')} · ${escapeHtml(tx.customer_name || '')}</p></div><div class="history-meta"><strong>${money(tx.amount)}</strong><span>${escapeHtml(statusLabel(tx.payment_method))} · ${tx.duration_minutes || 0} menit</span>${refundNote}</div><div class="history-status">${statusBadge(tx.transaction_status)}${statusBadge(tx.payment_status)}${canCancel ? `<button class="payment-mark-paid" type="button" data-cancel-booking="${escapeHtml(tx.transaction_id)}" data-cancel-search="${escapeHtml(search)}">Batalkan booking</button>` : ''}</div></article>`;
  }).join('') || '<div class="empty-state"><h3>Tidak ada transaksi pada filter ini.</h3><p>Pilih filter lain untuk melihat hasil pencarian.</p></div>'}</div>`;
}
function renderAdminLegacy() {
  const today = getJakartaDateString();
  const todayRows = db.transactions.filter(tx => tx.booking_date === today);
  const paid = db.transactions.filter(isRevenueTransaction);
  const todayRevenue = todayRows.filter(tx => tx.payment_status === 'PAID').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const serviceRevenue = paid.filter(tx => tx.item_type !== 'PRODUCT').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const productRevenue = paid.filter(tx => tx.item_type === 'PRODUCT').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const total = serviceRevenue + productRevenue;
  const lowStock = db.services_products.filter(item => item.item_type === 'PRODUCT' && item.stock <= item.min_stock);
  const vehiclesWashed = todayRows.filter(tx => tx.item_type !== 'PRODUCT' && tx.transaction_status === 'COMPLETED').length;
  const bookingsToday = todayRows.filter(tx => tx.transaction_type === 'BOOKING').length;
  const selfServiceToday = todayRows.filter(tx => tx.item_type !== 'PRODUCT' && db.services_products.find(item => item.id === tx.item_id)?.category === 'SELF_SERVICE').length;
  return `<div class="admin-shell"><aside class="admin-sidebar"><div class="admin-brand"><span class="brand-mark">R</span><span>rinse<span class="brand-light">society</span><small>STUDIO CONSOLE</small></span></div><p class="admin-nav-label">WORKSPACE</p><button class="admin-nav active" data-admin-tab="overview">◫ &nbsp; Overview</button><button class="admin-nav" data-admin-tab="queue">≋ &nbsp; Wash queue <b>${db.transactions.filter(tx => tx.queue_status !== 'COMPLETED').length}</b></button><button class="admin-nav" data-admin-tab="catalog">▦ &nbsp; Services & products</button><button class="admin-nav" data-admin-tab="customers">◎ &nbsp; Customers & vehicles</button><button class="admin-nav" data-admin-tab="reports">↗ &nbsp; Revenue reports</button><div class="sidebar-bottom"><span class="sidebar-avatar">RS</span><span><strong>Rinse Studio</strong><small>Semarang · Studio 01</small></span><button data-action="settings" aria-label="Database settings">⚙</button></div></aside><div class="admin-main"><header class="admin-topbar"><div><p class="eyebrow">STUDIO CONSOLE · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</p><h1 id="admin-heading">Studio overview</h1></div><div class="admin-top-actions"><span class="connection-indicator ${supabaseConfig().url ? 'connected' : ''}"><i></i>${supabaseConfig().url ? 'SUPABASE CONNECTED' : 'DATA LOKAL'}</span><button class="button button-dark button-small" data-action="walkin">+ New walk-in</button></div></header><div id="admin-content"><div class="metric-grid"><article class="metric-card metric-primary"><span>REVENUE · ALL TIME</span><strong>${money(total)}</strong><small>From ${paid.length} paid transactions</small><i>↗</i></article><article class="metric-card"><span>TRANSACTIONS</span><strong>${db.transactions.length.toString().padStart(2, '0')}</strong><small>${db.transactions.filter(tx => tx.transaction_type === 'BOOKING').length} bookings on record</small></article><article class="metric-card"><span>SERVICE REVENUE</span><strong>${money(serviceRevenue)}</strong><small>Wash, self-service & add-ons</small></article><article class="metric-card"><span>PRODUCT REVENUE</span><strong>${money(productRevenue)}</strong><small>Retail sales · ${db.transactions.filter(tx => tx.item_type === 'PRODUCT').length} line items</small></article></div><div class="admin-content-grid"><section class="admin-panel revenue-panel"><div class="panel-heading"><div><p class="eyebrow">PAID TRANSACTIONS</p><h2>Revenue mix</h2></div><span class="panel-period">ALL TIME</span></div><div class="revenue-total">${money(total)}<span>Total collected</span></div><div class="revenue-bars"><div class="revenue-bar-row"><span>Wash & service</span><div><i style="width:${total ? Math.max(4, serviceRevenue / total * 100) : 0}%"></i></div><strong>${money(serviceRevenue)}</strong></div><div class="revenue-bar-row"><span>Studio goods</span><div><i class="bar-green" style="width:${total ? Math.max(4, productRevenue / total * 100) : 0}%"></i></div><strong>${money(productRevenue)}</strong></div></div><div class="chart-footnote"><span>● Service revenue</span><span>● Product revenue</span></div></section><section class="admin-panel low-stock-panel"><div class="panel-heading"><div><p class="eyebrow">STOCK WATCH</p><h2>Needs a top-up</h2></div><span class="low-stock-count">${lowStock.length} LOW</span></div>${lowStock.length ? lowStock.map(item => `<div class="stock-row"><img src="${item.image}" alt=""><span><strong>${escapeHtml(item.name)}</strong><small>Minimum ${item.min_stock} units</small></span><b>${item.stock} left</b></div>`).join('') : '<div class="stock-clear">All studio shelves are looking good.</div>'}<button class="text-link" data-admin-tab="catalog">Manage inventory <span>↗</span></button></section></div><section class="admin-panel queue-preview"><div class="panel-heading"><div><p class="eyebrow">THE FLOOR, RIGHT NOW</p><h2>Wash queue</h2></div><button class="text-link" data-admin-tab="queue">Open queue <span>↗</span></button></div>${renderQueueColumns(false)}</section></div></div></div>`;
}
function renderAdmin() {
  const today = getJakartaDateString();
  const waiting = getOperationalTransactions(db.transactions).filter(tx => tx.item_type === 'SERVICE'
    && isRevenueTransaction(tx) && tx.queue_status !== 'COMPLETED'
    && (tx.transaction_type !== 'BOOKING' || ['ACTIVE', 'COMPLETED'].includes(tx.transaction_status))).length;
  return `<div class="admin-shell"><aside class="admin-sidebar"><div class="admin-brand"><span class="brand-mark">R</span><span>rinse<span class="brand-light">society</span><small>DASHBOARD STUDIO</small></span></div><p class="admin-nav-label">MENU STUDIO</p><button class="admin-nav active" data-admin-tab="overview"><span>◫</span> Ringkasan</button><button class="admin-nav" data-admin-tab="transactions"><span>▤</span> Transaksi</button><button class="admin-nav" data-admin-tab="bookings"><span>▣</span> Booking</button><button class="admin-nav" data-admin-tab="queue"><span>≋</span> Antrean cuci <b>${waiting}</b></button><button class="admin-nav" data-admin-tab="self-service"><span>⌂</span> Cuci mandiri</button><button class="admin-nav" data-admin-tab="customers"><span>◎</span> Pelanggan & kendaraan</button><button class="admin-nav" data-admin-tab="catalog"><span>▦</span> Layanan & produk</button><button class="admin-nav" data-admin-tab="reports"><span>↗</span> Laporan</button><button class="admin-nav" data-action="settings"><span>⚙</span> Pengaturan</button><button class="admin-nav" data-action="logout"><span>↪</span> Keluar</button><div class="sidebar-bottom"><span class="sidebar-avatar">RS</span><span><strong>${escapeHtml(adminUser?.email || 'Admin studio')}</strong><small>Semarang · Studio 01</small></span></div></aside><div class="admin-main"><header class="admin-topbar"><div><p class="eyebrow">RINGKASAN STUDIO · ${new Date(`${today}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</p><h1 id="admin-heading">Ringkasan operasional</h1></div><div class="admin-top-actions"><span class="connection-indicator ${databaseConnected ? 'connected' : ''}"><i></i>${databaseConnected ? 'SUPABASE TERHUBUNG' : 'DATABASE TERPUTUS'}</span><button class="button button-dark button-small" data-action="walkin">+ Walk-in baru</button></div></header><div id="admin-content"><div class="metric-grid">${Array.from({ length: 8 }, () => '<article class="metric-card"><span>MEMUAT DATA</span><strong>—</strong><small>Dari transaksi Supabase</small></article>').join('')}</div><div class="admin-content-grid"><section class="admin-panel revenue-panel"><div class="panel-heading"><div><p class="eyebrow">TRANSAKSI LUNAS</p><h2>Pendapatan studio</h2></div><span class="panel-period">SEMUA WAKTU</span></div><div class="revenue-total">${money(0)}<span>Total pemasukan</span></div><div class="revenue-bars"><div class="revenue-bar-row"><span>Pendapatan jasa</span><div><i style="width:0%"></i></div><strong>${money(0)}</strong></div><div class="revenue-bar-row"><span>Pendapatan produk</span><div><i class="bar-green" style="width:0%"></i></div><strong>${money(0)}</strong></div></div><div class="chart-footnote"><span>● Pendapatan jasa</span><span>● Pendapatan produk</span></div></section><section class="admin-panel low-stock-panel"><div class="panel-heading"><div><p class="eyebrow">PANTAU STOK</p><h2>Perlu ditambah</h2></div><span class="low-stock-count">0 MENIPIS</span></div><div class="stock-clear">Memuat persediaan dari Supabase.</div><button class="text-link" data-admin-tab="catalog">Kelola persediaan <span>↗</span></button></section></div><section class="admin-panel queue-preview"><div class="panel-heading"><div><p class="eyebrow">KONDISI AREA CUCI</p><h2>Antrean saat ini</h2></div><button class="text-link" data-admin-tab="queue">Buka antrean <span>↗</span></button></div>${renderQueueColumns(false)}</section></div></div></div>`;
}
function queueCard(tx) {
  const vehicle = getVehicle(tx), customer = getCustomer(tx);
  return `<article class="queue-card"><div class="queue-card-top"><strong>${escapeHtml(tx.code)}</strong>${statusBadge(tx.payment_status)}</div><h3>${escapeHtml(vehicle?.plate || 'Penjualan produk')}</h3><p>${escapeHtml(tx.item_name || 'Layanan cuci')} · ${escapeHtml(customer?.full_name || 'Walk-in')}</p><div class="queue-card-foot"><span>${escapeHtml(tx.booking_time || 'Walk-in')} · ${tx.duration_minutes || 0} menit</span><select aria-label="Ubah status ${escapeHtml(tx.code)}" data-queue-id="${tx.id}">${['WAITING', 'WASHING', 'FINISHING', 'COMPLETED'].map(status => `<option value="${status}" ${tx.queue_status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select></div></article>`;
}
function renderQueueColumns(large) {
  const stages = ['WAITING', 'WASHING', 'FINISHING', 'COMPLETED'];
  const washTransactions = getOperationalTransactions(db.transactions).filter(tx => tx.item_type === 'SERVICE' && isRevenueTransaction(tx) && (tx.transaction_type !== 'BOOKING' || ['ACTIVE', 'COMPLETED'].includes(tx.transaction_status)));
  return `<div class="queue-columns ${large ? 'queue-columns-large' : ''}">${stages.map(stage => `<div class="queue-column"><div class="queue-column-head"><span>${statusLabel(stage)}</span><b>${washTransactions.filter(tx => (tx.queue_status || 'WAITING') === stage).length}</b></div>${washTransactions.filter(tx => (tx.queue_status || 'WAITING') === stage).map(queueCard).join('') || '<div class="queue-empty">Belum ada kendaraan</div>'}</div>`).join('')}</div>`;
}

function openDialog(kind, serviceId) {
  const dialog = document.getElementById('flow-dialog');
  const content = document.getElementById('dialog-content');
  const service = db.services_products.find(item => item.id === serviceId);
  if (['booking-choice', 'booking', 'walkin', 'self-service', 'cart', 'product-checkout'].includes(kind) && !databaseConnected) {
    showToast('Layanan sedang tidak tersedia. Silakan coba lagi.', 'error');
    return;
  }
  if ((kind === 'booking' || kind === 'walkin') && !(service || SERVICES[0])) {
    showToast('Layanan belum tersedia. Silakan coba lagi nanti.', 'error');
    return;
  }
  if (kind === 'settings') {
    content.innerHTML = `<p class="eyebrow">PENGATURAN STUDIO</p><h2>Akun <em>studio.</em></h2><p class="dialog-intro">${adminUser ? `Masuk sebagai ${escapeHtml(adminUser.email || 'admin')}.` : 'Pengaturan operasional Rinse Society.'}</p><div class="settings-status"><strong>Rinse Society · Semarang</strong><p>Kelola jadwal, layanan, dan produk studio dari dashboard.</p></div><div class="dialog-actions">${adminUser ? '<button class="button button-dark" data-action="logout">Keluar dari akun</button>' : ''}<button class="button button-quiet" data-action="close-dialog">Tutup</button></div>`;
  } else if (kind === 'booking-choice') renderBookingChoiceDialog(content);
  else if (kind === 'cart') renderCartDialog(content);
  else if (kind === 'self-service') renderSelfServiceTransactionForm(content);
  else if (kind === 'booking' || kind === 'walkin') renderTransactionForm(content, kind, service || SERVICES[0]);
  else if (kind === 'product-checkout') renderProductCheckout(content);
  polishUiLabels(content);
  if (kind === 'self-service') {
    content.querySelector('.eyebrow').textContent = 'SELF-SERVICE · PEMESANAN';
    content.querySelector('h2').textContent = 'Self-Service';
  } else if (kind === 'booking' || kind === 'walkin') {
    const serviceLabel = content.querySelector('select[name="service_id"]')?.closest('label');
    if (serviceLabel?.firstChild) serviceLabel.firstChild.textContent = 'Professional Wash';
  }
  dialog.showModal();
  simplifyUiSymbols(dialog);
}
function renderBookingChoiceDialog(content) {
  const services = regularServices();
  const professionalChoices = services.map(service => `<button class="booking-choice-service" type="button" data-service="${service.id}"><strong>${escapeHtml(service.name)}</strong><span>${money(service.price)} · ${service.duration} menit</span><b>Pilih layanan</b></button>`).join('');
  const availableAddons = ADDONS.map(addon => `<li>${escapeHtml(addon.name)} · ${money(addon.price)}</li>`).join('');
  content.innerHTML = `<p class="eyebrow">PEMESANAN</p><h2>Pilih jenis layanan</h2><p class="dialog-intro">Pilih cara mencuci kendaraan Anda.</p><div class="booking-choice-grid"><section class="booking-choice-option"><p class="eyebrow">PROFESSIONAL WASH</p><h3>Cuci kendaraan oleh tim</h3><p>Tim Rinse Society menangani pencucian kendaraan Anda.</p><div class="booking-choice-services">${professionalChoices || '<p class="report-empty">Layanan Professional Wash belum tersedia.</p>'}</div><div class="booking-choice-addons"><strong>Tambahan tersedia</strong><ul>${availableAddons || '<li>Belum ada tambahan</li>'}</ul></div></section><section class="booking-choice-option"><p class="eyebrow">SELF-SERVICE</p><h3>Cuci kendaraan sendiri</h3><p>Pilih kendaraan, tanggal, waktu, durasi, dan bay universal.</p><button class="button button-dark" type="button" data-action="self-service-book">Pilih Self-Service</button></section></div>`;
  polishUiLabels(content);
}
function renderTransactionForm(content, kind, selectedService) {
  const walkin = kind === 'walkin';
  const service = catalogItem(selectedService || SERVICES[0]);
  const allowedVehicles = [];
  content.innerHTML = `<p class=\"eyebrow\">${walkin ? 'WALK-IN · TANPA BOOKING' : 'BOOKING · LANGKAH 1'}</p><h2>${walkin ? 'Langsung datang.<br><em>Kami siap melayani.</em>' : 'Jadwalkan cuci<br><em>kendaraan Anda.</em>'}</h2><p class=\"dialog-intro\">${escapeHtml(service.name)} · ${money(service.price)} · ${service.duration} menit</p><form id=\"transaction-form\" class=\"dialog-form\"><input type=\"hidden\" name=\"flow\" value=\"${kind}\"><label>Layanan cuci<select name=\"service_id\" required>${db.services_products.filter(isRegularServiceItem).map(item => `<option value=\"${item.id}\" ${item.id === service.id ? 'selected' : ''}>${escapeHtml(item.name)} · ${money(item.price)}</option>`).join('')}</select></label><div class=\"form-two\"><label>Nama lengkap<input name=\"name\" required placeholder=\"Nama pelanggan\"></label><label>Nomor HP<input name=\"phone\" required type=\"tel\" placeholder=\"08…\"></label></div><label>Kendaraan terdaftar<select name=\"vehicle_id\"><option value=\"\">Tambahkan detail kendaraan di bawah</option>${allowedVehicles.map(vehicle => `<option value=\"${vehicle.id}\">${escapeHtml(vehicle.model)} · ${escapeHtml(vehicle.plate)}</option>`).join('')}</select></label><div class=\"form-two\"><label>Model kendaraan<input name=\"model\" placeholder=\"Contoh: Honda HR-V\"></label><label>Nomor polisi<input name=\"plate\" required placeholder=\"H 1234 NP\"></label></div><label>Layanan tambahan<select name=\"addon_id\"><option value=\"\">Tanpa layanan tambahan</option>${ADDONS.map(addon => `<option value=\"${addon.id}\">${escapeHtml(addon.name)} · ${money(addon.price)}</option>`).join('')}</select></label><div class=\"form-two\"><label>${walkin ? 'Waktu datang' : 'Tanggal kunjungan'}<input name=\"date\" type=\"${walkin ? 'time' : 'date'}\" required value=\"${walkin ? getJakartaTimeString() : getJakartaDateString()}\" ${walkin ? '' : `min=\"${getJakartaDateString()}\"`}></label><label>Jam layanan<input name=\"time\" type=\"time\" required value=\"${getJakartaTimeString()}\"></label></div><div class=\"dialog-total\"><span>Estimasi total</span><strong id=\"flow-total\">${money(service.price)}</strong></div><button class=\"button button-dark button-full\" type=\"submit\">Lanjut ke review <span>↗</span></button></form>`;
  const paymentLabel = document.createElement('label');
  paymentLabel.textContent = 'Metode pembayaran';
  const paymentSelect = document.createElement('select');
  paymentSelect.name = 'payment';
  paymentSelect.required = true;
  (walkin ? [['CASH', 'Tunai'], ['QRIS', 'QRIS'], ['E_WALLET', 'Dompet digital'], ['CARD', 'Kartu']] : [['QRIS', 'QRIS'], ['E_WALLET', 'Dompet digital'], ['CARD', 'Kartu']]).forEach(([value, label]) => {
    const option = document.createElement('option');
    option.value = value;
    option.textContent = label;
    paymentSelect.append(option);
  });
  paymentLabel.append(paymentSelect);
  const paymentNote = document.createElement('small');
  paymentNote.textContent = walkin
    ? 'Tunai baru tercatat lunas setelah Admin menerima dan mengonfirmasi pembayaran.'
    : 'Booking wajib dibayar di muka. Pembayaran online belum terhubung; booking tetap belum terkonfirmasi sampai pembayaran diverifikasi.';
  paymentLabel.append(paymentNote);
  content.querySelector('#flow-total')?.closest('.dialog-total')?.before(paymentLabel);
  const addonSelect = content.querySelector('[name="addon_id"]');
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
    } catch (error) { showToast(`Kendaraan belum dapat dimuat: ${error.message}`, 'error'); }
  };
  phoneInput.addEventListener('blur', updateVehicleChoices);
  phoneInput.addEventListener('change', updateVehicleChoices);
  vehicleSelect.addEventListener('change', () => {
    const vehicle = matchingVehicles.find(item => item.id === vehicleSelect.value);
    const modelField = content.querySelector('[name="model"]');
    const plateField = content.querySelector('[name="plate"]');
    modelField.value = vehicle?.model || '';
    plateField.value = vehicle?.plate || '';
    modelField.readOnly = !!vehicle;
    plateField.readOnly = !!vehicle;
  });
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
  addonSelect?.addEventListener('change', recalculate);
  content.querySelector('[name="duration"]')?.addEventListener('change', recalculate);
}
function renderSelfServiceTransactionForm(content) {
  const defaultService = db.services_products.find(item => item.category === 'SELF_SERVICE' && item.type === 'CAR') || db.services_products.find(item => item.category === 'SELF_SERVICE');
  const todayDate = getJakartaDateString();
  const nowTime = getJakartaFutureTimeString();
  const bayOptions = Array.from({ length: 4 }, (_, index) => `<option value="${index + 1}">B-${String(index + 1).padStart(2, '0')}</option>`).join('');
  const durationOptions = [20, 25, 30, 45, 60].map(value => `<option value="${value}" ${value === Number(defaultService.duration || 30) ? 'selected' : ''}>${value} menit</option>`).join('');
  content.innerHTML = `<p class="eyebrow">CUCI MANDIRI · BOOKING</p><h2>Cuci sendiri di<br><em>bay pilihan Anda.</em></h2><p class="dialog-intro">4 bay universal untuk mobil dan sepeda motor. Pastikan jadwal, bay, dan durasi sesuai kebutuhan Anda.</p><form id="transaction-form" class="dialog-form"><input type="hidden" name="flow" value="self-service"><input type="hidden" name="service_id" value="${defaultService.id}"><div class="form-two"><label>Jenis kendaraan<select name="vehicle_type" required><option value="CAR" selected>Mobil</option><option value="MOTOR">Sepeda Motor</option></select></label><label>Bay<select name="bay_number" required>${bayOptions}</select></label></div><div class="form-two"><label>Nama lengkap<input name="name" required placeholder="Nama pelanggan"></label><label>Nomor HP<input name="phone" required type="tel" placeholder="08…"></label></div><div class="form-two"><label>Model kendaraan<input name="model" placeholder="Contoh: Honda HR-V"></label><label>Nomor polisi<input name="plate" required placeholder="H 1234 NP"></label></div><div class="form-two"><label>Tanggal<select name="date" required>${Array.from({ length: 7 }, (_, index) => {
      const value = addDaysToJakartaDate(todayDate, index);
      return `<option value="${value}" ${index === 0 ? 'selected' : ''}>${new Date(`${value}T12:00:00+07:00`).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</option>`;
    }).join('')}</select></label><label>Jam mulai<input name="time" type="time" required value="${nowTime}"></label></div><div class="form-two"><label>Durasi<select name="duration" required>${durationOptions}</select></label><label>Metode pembayaran<select name="payment"><option value="CASH">Tunai</option><option value="QRIS">QRIS</option><option value="E_WALLET">E-Wallet</option><option value="CARD">Kartu</option></select></label></div><div class="dialog-total"><span>Estimasi total</span><strong id="flow-total">${money(defaultService.price)}</strong></div><button class="button button-dark button-full" type="submit">Lanjut ke review <span>↗</span></button></form>`;
  const vehicleTypeField = content.querySelector('[name="vehicle_type"]');
  const bayField = content.querySelector('[name="bay_number"]');
  const durationField = content.querySelector('[name="duration"]');
  const totalField = content.querySelector('#flow-total');
  const customerNameField = content.querySelector('[name="name"]');
  const customerPhoneField = content.querySelector('[name="phone"]');
  const vehicleModelField = content.querySelector('[name="model"]');
  const vehiclePlateField = content.querySelector('[name="plate"]');
  const vehicleSelectLabel = document.createElement('label');
  vehicleSelectLabel.textContent = 'Kendaraan terdaftar';
  const vehicleSelect = document.createElement('select');
  vehicleSelect.name = 'vehicle_id';
  vehicleSelect.innerHTML = '<option value="">Tambahkan kendaraan baru</option>';
  vehicleSelectLabel.append(vehicleSelect);
  customerPhoneField.closest('.form-two')?.after(vehicleSelectLabel);
  let customerVehicles = [];
  const updateSelfServiceVehicleChoices = () => {
    const choices = customerVehicles.filter(vehicle => vehicle.type === vehicleTypeField.value);
    vehicleSelect.innerHTML = `<option value="">${choices.length ? 'Pilih kendaraan pelanggan' : 'Tambahkan kendaraan baru'}</option>${choices.map(vehicle => `<option value="${escapeHtml(vehicle.id)}">${escapeHtml(vehicle.model)} · ${escapeHtml(vehicle.plate)}</option>`).join('')}`;
    vehicleModelField.readOnly = false;
    vehiclePlateField.readOnly = false;
    vehicleModelField.value = '';
    vehiclePlateField.value = '';
  };
  const loadSelfServiceCustomer = async () => {
    if (customerPhoneField.value.replace(/\D/g, '').length < 7) return;
    try {
      const rows = await customerByPhone(customerPhoneField.value.trim());
      customerVehicles = rows.filter(row => row.vehicle_id).map(row => ({
        id: row.vehicle_id,
        type: row.vehicle_type,
        model: row.vehicle_model,
        plate: row.vehicle_plate
      }));
      if (rows[0]?.full_name) customerNameField.value = rows[0].full_name;
      updateSelfServiceVehicleChoices();
    } catch (error) {
      showToast(`Data kendaraan belum dapat dimuat: ${error.message}`, 'error');
    }
  };
  customerPhoneField.addEventListener('blur', loadSelfServiceCustomer);
  customerPhoneField.addEventListener('change', loadSelfServiceCustomer);
  vehicleSelect.addEventListener('change', () => {
    const vehicle = customerVehicles.find(item => item.id === vehicleSelect.value);
    vehicleModelField.value = vehicle?.model || '';
    vehiclePlateField.value = vehicle?.plate || '';
    vehicleModelField.readOnly = !!vehicle;
    vehiclePlateField.readOnly = !!vehicle;
  });
  const selfServicePayment = content.querySelector('[name="payment"]');
  selfServicePayment.querySelector('option[value="CASH"]')?.remove();
  const selfServicePaymentNote = document.createElement('small');
  selfServicePaymentNote.textContent = 'Booking wajib dibayar di muka. Pembayaran online belum terhubung dan bay belum aktif sebelum pembayaran diverifikasi.';
  selfServicePayment.closest('label')?.append(selfServicePaymentNote);
  const updateSelfServiceTotal = () => {
    const vehicleType = vehicleTypeField.value;
    const service = db.services_products.find(item => item.category === 'SELF_SERVICE' && item.type === vehicleType) || db.services_products.find(item => item.category === 'SELF_SERVICE');
    const duration = Number(durationField.value || service.duration || 30);
    const total = Number(service.price || 0);
    totalField.textContent = money(total);
    content.querySelector('[name="service_id"]').value = service.id;
  };
  vehicleTypeField.addEventListener('change', () => { updateSelfServiceTotal(); updateSelfServiceVehicleChoices(); });
  durationField.addEventListener('change', updateSelfServiceTotal);
  bayField.value = '1';
  updateSelfServiceTotal();
}
function renderCartDialog(content) {
  const lines = Object.entries(cart).map(([id, row]) => ({ product: catalogItem(db.services_products.find(item => item.id === id) || {}), ...row })).filter(row => row.product.id);
  const total = lines.reduce((sum, row) => sum + row.quantity * row.product.price, 0);
  content.innerHTML = `<p class="eyebrow">PRODUK PILIHAN</p><h2>Keranjang <em>belanja.</em></h2>${lines.length ? `<div class="cart-lines">${lines.map(({ product, quantity }) => `<div class="cart-line"><img src="${product.image}" alt="${escapeHtml(product.name)}"><span><strong>${escapeHtml(product.name)}</strong><small>${money(product.price)} per produk</small></span><div class="quantity-control"><button data-cart-change="${product.id}" data-delta="-1" aria-label="Kurangi satu">−</button><b>${quantity}</b><button data-cart-change="${product.id}" data-delta="1" aria-label="Tambah satu">+</button></div><strong>${money(product.price * quantity)}</strong></div>`).join('')}</div><div class="dialog-total"><span>Subtotal</span><strong>${money(total)}</strong></div><button class="button button-dark button-full" data-action="checkout-product">Lanjut ke pembayaran <span>↗</span></button>` : `<div class="empty-state"><h3>Keranjang masih kosong.</h3><p>Pilih produk perawatan kendaraan dari rak studio.</p><button class="button button-dark" data-action="close-dialog">Lanjut belanja</button></div>`}`;
  simplifyUiSymbols(content);
}
function renderProductCheckout(content) {
  const total = Object.entries(cart).reduce((sum, [id, row]) => sum + (db.services_products.find(item => item.id === id)?.price || 0) * row.quantity, 0);
  content.innerHTML = `<p class="eyebrow">PEMBAYARAN PRODUK</p><h2>Perawatan pilihan<br><em>segera di tangan Anda.</em></h2><form id="product-checkout-form" class="dialog-form"><label>Nama lengkap<input name="name" required placeholder="Nama lengkap"></label><label>Nomor HP<input name="phone" required type="tel" placeholder="08…"></label><fieldset class="payment-options"><legend>Metode pembayaran</legend>${['CASH', 'QRIS', 'E_WALLET', 'CARD'].map((method, index) => `<label><input type="radio" name="payment" value="${method}" ${index === 0 ? 'checked' : ''}><span>${method === 'E_WALLET' ? 'E-Wallet' : method}</span></label>`).join('')}</fieldset><div class="dialog-total"><span>Total pembayaran</span><strong>${money(total)}</strong></div><button class="button button-dark button-full" type="submit">Buat pesanan <span>↗</span></button><small>Semua transaksi baru menunggu konfirmasi pembayaran sebelum dianggap lunas.</small></form>`;
  simplifyUiSymbols(content);
}
function makeCode() { return `RS-${getJakartaDateString().slice(2).replaceAll('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`; }
async function customerByPhone(phone) {
  if (!databaseConnected) throw new Error('Data pelanggan belum dapat dimuat. Silakan coba lagi.');
  return rpcRequest('lookup_customer_by_phone', { p_phone: phone });
}
async function findOrCreateCustomer(name, phone, address = '') {
  const matches = await customerByPhone(phone);
  if (matches.length) {
    const first = matches[0];
    return { customer: { id: first.customer_id, full_name: first.full_name, phone: first.phone, address: first.customer_address || '' }, vehicles: matches.filter(row => row.vehicle_id).map(row => ({ id: row.vehicle_id, customer_id: row.customer_id, type: row.vehicle_type, plate: row.vehicle_plate, model: row.vehicle_model })) };
  }
  const customer = { id: crypto.randomUUID(), full_name: String(name).trim(), phone: String(phone).trim(), address: String(address || '').trim() };
  await insertRow('customers', customer);
  return { customer, vehicles: [] };
}
function makeVehicle(customerId, type, model, plate) {
  return { id: crypto.randomUUID(), customer_id: customerId, type, plate: String(plate || '').trim().toUpperCase(), model: String(model || (type === 'CAR' ? 'Mobil' : 'Sepeda motor')).trim() };
}
function isBayScheduledForWindow(bayNumber, dateString, timeString, durationMinutes) {
  const startUtc = parseJakartaDateTime(dateString, timeString).getTime();
  const durationMs = Math.max(Number(durationMinutes) || 0, 0) * 60000;
  const endUtc = startUtc + durationMs;
  return db.transactions.some(tx => {
    const normalized = normalizeOperationalTransaction(tx);
    if (!normalized || normalized.item_type === 'PRODUCT' || normalized.payment_status !== 'PAID' || !Number.isFinite(Number(normalized.bay_number)) || Number(normalized.bay_number) !== Number(bayNumber)) return false;
    if (!['ACTIVE', 'BOOKED'].includes(normalized.transaction_status)) return false;
    if (!normalized.booking_date || !normalized.booking_time) return false;
    const txStartUtc = parseJakartaDateTime(normalized.booking_date, normalized.booking_time).getTime();
    const txDurationMs = Math.max(Number(normalized.duration_minutes) || 0, 0) * 60000;
    const txEndUtc = txStartUtc + txDurationMs;
    return !(endUtc <= txStartUtc || startUtc >= txEndUtc);
  });
}
function firstAvailableBay(dateString = getJakartaDateString(), timeString = getJakartaTimeString(), durationMinutes = 30) {
  if (!databaseConnected) throw new Error('Status Self-Service belum dapat dimuat. Silakan coba lagi.');
  const targetDuration = Number(durationMinutes) || 30;
  return Array.from({ length: 4 }, (_, index) => index + 1).find(bayNumber => !isBayScheduledForWindow(bayNumber, dateString, timeString, targetDuration)) || null;
}
async function persistTransaction(tx) {
  if (!databaseConnected) throw new Error('Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.');
  if (carriesPickupData(tx)) throw new Error('Add-on antar-jemput tidak lagi tersedia.');
  tx.payment_status = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'].includes(String(tx.payment_status || '').toUpperCase()) ? String(tx.payment_status).toUpperCase() : 'PENDING';
  tx.refund_status = ['NONE', 'PENDING', 'COMPLETED'].includes(String(tx.refund_status || 'NONE').toUpperCase()) ? String(tx.refund_status || 'NONE').toUpperCase() : 'NONE';
  if (tx.item_type === 'PRODUCT') {
    const newStock = await rpcRequest('record_product_sale', { p_transaction: tx });
    const product = db.services_products.find(item => item.id === tx.item_id);
    if (product && Number.isFinite(Number(newStock))) product.stock = Number(newStock);
  } else {
    const result = await rpcRequest('record_service_transaction', { p_transaction: tx, p_addon_id: tx.addon_id || null });
    if (result && typeof result === 'object') Object.assign(tx, result);
  }
  db.transactions.unshift(tx);
}
async function submitService(form) {
  const data = new FormData(form);
  if (!databaseConnected) throw new Error('Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.');
  const service = db.services_products.find(item => item.id === data.get('service_id'));
  if (!service) throw new Error('Layanan tidak ditemukan. Muat ulang katalog lalu coba lagi.');
  const flowType = String(data.get('flow') || 'booking');
  const isSelfService = flowType === 'self-service';
  const isBooking = flowType === 'booking';
  if (isSelfService ? !isSelfServiceItem(service) : !isRegularServiceItem(service)) {
    throw new Error(isSelfService ? 'Pilih layanan Self-Service yang tersedia.' : 'Self-Service hanya dapat dipesan melalui halaman Self-Service.');
  }
  const customerName = String(data.get('name') || '').trim();
  const phone = String(data.get('phone') || '').trim();
  const plate = String(data.get('plate') || '').trim().toUpperCase();
  if (customerName.length < 2) throw new Error('Masukkan nama lengkap.');
  if (phone.replace(/\D/g, '').length < 7) throw new Error('Masukkan nomor HP yang valid.');
  if (plate.length < 4) throw new Error('Masukkan nomor polisi yang valid.');
  const todayDate = getJakartaDateString();
  const currentTime = getJakartaTimeString();
  let bookingDate = todayDate;
  let bookingTime = currentTime;
  if (isSelfService || isBooking) {
    bookingDate = String(data.get('date') || todayDate);
    bookingTime = String(data.get('time') || currentTime);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) throw new Error('Pilih tanggal kunjungan yang valid.');
    if (!/^\d{2}:\d{2}$/.test(bookingTime)) throw new Error('Pilih waktu kunjungan yang valid.');
    if (bookingDate < todayDate) throw new Error('Pilih tanggal booking hari ini atau setelahnya.');
    if (bookingDate === todayDate && bookingTime < currentTime) throw new Error('Pilih waktu booking yang belum lewat.');
  } else {
    const walkInTime = String(data.get('time') || currentTime);
    if (!/^\d{2}:\d{2}$/.test(walkInTime)) throw new Error('Pilih waktu kedatangan yang valid.');
    bookingTime = walkInTime;
  }
  const paymentMethod = String(data.get('payment') || '');
  if (!['CASH', 'QRIS', 'E_WALLET', 'CARD'].includes(paymentMethod)) throw new Error('Pilih metode pembayaran.');
  const duration = Number(data.get('duration') || service.duration || 30);
  if (!Number.isSafeInteger(duration) || duration <= 0) throw new Error('Pilih durasi yang valid.');
  if (service.category === 'SELF_SERVICE' && ![20, 25, 30, 45, 60].includes(duration)) throw new Error('Pilih durasi Self-Service yang tersedia.');
  const addonId = String(data.get('addon_id') || '');
  const addon = addonId ? db.services_products.find(item => item.id === addonId && item.item_type === 'ADD_ON' && item.active !== false) : null;
  if (addonId && !addon) throw new Error('Add-on tidak tersedia. Pilih add-on lain.');
  if (isPickupAddon(addon) || carriesPickupData({ addon_id: addonId, pickup_distance_km: data.get('pickup_distance_km'), pickup_address: data.get('pickup_address') })) {
    throw new Error('Add-on antar-jemput tidak lagi tersedia.');
  }
  const bayNumber = service.category === 'SELF_SERVICE' ? Number(data.get('bay_number') || firstAvailableBay(bookingDate, bookingTime, duration)) : null;
  if (service.category === 'SELF_SERVICE' && (!Number.isInteger(bayNumber) || bayNumber < 1 || bayNumber > 4)) throw new Error('Pilih salah satu dari empat bay Self-Service.');
  if (service.category === 'SELF_SERVICE' && !bayNumber) throw new Error('Semua bay Self-Service sedang digunakan atau dipesan.');
  if (service.category === 'SELF_SERVICE' && isBayScheduledForWindow(bayNumber, bookingDate, bookingTime, duration)) {
    throw new Error('Bay yang dipilih sudah dipesan untuk slot waktu itu.');
  }
  const customerResult = await findOrCreateCustomer(customerName, phone);
  const customer = customerResult.customer;
  const existingVehicle = customerResult.vehicles.find(item => item.id === data.get('vehicle_id'));
  const vehicle = existingVehicle || makeVehicle(customer.id, service.type, data.get('model'), plate);
  if (vehicle.type !== service.type) throw new Error('Jenis kendaraan tidak sesuai dengan layanan yang dipilih.');
  if (!existingVehicle) await insertRow('vehicles', vehicle);
  const washPrice = Number(service.price);
  const tx = { id: crypto.randomUUID(), code: makeCode(), customer_id: customer.id, vehicle_id: vehicle.id, item_id: service.id, item_type: 'SERVICE', item_name: `${service.name}${addon ? ` + ${addon.name}` : ''}`, addon_id: addon?.id || null, amount: washPrice + Number(addon?.price || 0), payment_method: paymentMethod, payment_status: 'PENDING', refund_status: 'NONE', transaction_type: isSelfService || isBooking ? 'BOOKING' : 'WALK_IN', transaction_status: 'PENDING', queue_status: 'WAITING', booking_date: bookingDate, booking_time: bookingTime, duration_minutes: duration + Number(addon?.duration || 0), bay_number: bayNumber, created_at: new Date().toISOString() };
  await persistTransaction(tx);
  try { await loadPublicData(); }
  catch (_) { showToast('Transaksi tersimpan, tetapi data terbaru belum dapat dimuat.', 'error'); }
  showConfirmation(tx);
  render();
}
function showConfirmation(tx) {
  const isBooking = tx.transaction_type === 'BOOKING';
  document.getElementById('dialog-content').innerHTML = `<div class="confirmation"><div class="confirmation-check">✓</div><p class="eyebrow">${isBooking ? 'BOOKING TERCATAT' : 'TRANSAKSI TERCATAT'}</p><h2>${isBooking ? 'Kami siapkan<br><em>kunjungan Anda.</em>' : 'Kendaraan Anda<br><em>menunggu konfirmasi pembayaran.</em>'}</h2><p class="dialog-intro">${isBooking ? 'Booking sudah dibuat dan menunggu pembayaran dikonfirmasi sebelum sesi dimulai.' : 'Transaksi dibuat. Pembayaran harus dikonfirmasi lunas sebelum kendaraan masuk antrean atau proses cuci.'}</p><div class="pass-card"><div><span>KODE BOOKING</span><strong>${escapeHtml(tx.code)}</strong><small>${escapeHtml(tx.item_name)} · ${tx.booking_date} · ${tx.booking_time}</small></div><img class="fake-qr" src="https://api.qrserver.com/v1/create-qr-code/?size=144x144&data=${encodeURIComponent(tx.code)}" alt="QR untuk kode ${escapeHtml(tx.code)}"></div><div class="confirmation-details"><span>${money(tx.amount)}</span>${statusBadge(tx.payment_status)}${statusBadge(tx.payment_method)}</div><button class="button button-dark button-full" data-action="close-dialog">Selesai <span>↗</span></button></div>`;
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
      await persistTransaction({ id: crypto.randomUUID(), code: makeCode(), customer_id: customer.id, vehicle_id: null, item_id: id, item_type: 'PRODUCT', item_name: product.name, quantity, amount: product.price * quantity, payment_method: data.get('payment'), payment_status: 'PENDING', refund_status: 'NONE', transaction_type: 'SHOP', transaction_status: 'PENDING', queue_status: 'WAITING', booking_date: getJakartaDateString(), booking_time: getJakartaTimeString(), duration_minutes: 0, created_at: new Date().toISOString() });
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
  catch (_) { showToast('Pesanan tersimpan, tetapi katalog belum dapat diperbarui.', 'error'); }
  document.getElementById('dialog-content').innerHTML = `<div class="confirmation"><div class="confirmation-check">✓</div><p class="eyebrow">PESANAN TERCATAT</p><h2>Produk pilihan<br><em>menunggu konfirmasi pembayaran.</em></h2><p class="dialog-intro">Pesanan belum lunas dan belum dapat diselesaikan. Admin akan mengonfirmasi pembayaran setelah diterima.</p><button class="button button-dark button-full" data-action="close-dialog">Kembali ke studio <span>↗</span></button></div>`;
  render();
}
function renderReportsLegacy() {
  const paid = db.transactions.filter(isRevenueTransaction);
  const serviceRows = paid.filter(tx => tx.item_type !== 'PRODUCT');
  const productRows = paid.filter(tx => tx.item_type === 'PRODUCT');
  const serviceRevenue = serviceRows.reduce((sum, tx) => sum + tx.amount, 0);
  const productRevenue = productRows.reduce((sum, tx) => sum + tx.amount, 0);
  return `<div class="reports-heading"><div><p class="eyebrow">THE NUMBERS, CLEARLY</p><h2>Good work, accounted for.</h2></div><span class="shop-count">Live from ${db.transactions.length} transactions</span></div><div class="report-grid"><article class="report-card"><span>SERVICE REVENUE</span><strong>${money(serviceRevenue)}</strong><small>${serviceRows.length} wash transactions</small></article><article class="report-card"><span>PRODUCT REVENUE</span><strong>${money(productRevenue)}</strong><small>${productRows.length} product line items</small></article><article class="report-card"><span>TRANSACTION COUNT</span><strong>${paid.length}</strong><small>${db.transactions.filter(tx => tx.transaction_type === 'BOOKING').length} bookings · ${db.transactions.filter(tx => tx.transaction_type === 'WALK_IN').length} walk-ins</small></article><article class="report-card"><span>VEHICLES SERVED</span><strong>${new Set(serviceRows.map(tx => tx.vehicle_id).filter(Boolean)).size}</strong><small>${db.vehicles.filter(vehicle => vehicle.type === 'CAR').length} cars · ${db.vehicles.filter(vehicle => vehicle.type === 'MOTOR').length} motorcycles on file</small></article></div><section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">PAYMENT MIX</p><h2>How guests check out</h2></div></div>${['CASH', 'QRIS', 'E_WALLET', 'CARD'].map(method => { const rows = paid.filter(tx => tx.payment_method === method); const amount = rows.reduce((sum, tx) => sum + tx.amount, 0); return `<div class="revenue-bar-row"><span>${method.replaceAll('_', ' ')}</span><div><i style="width:${paid.length ? rows.length / paid.length * 100 : 0}%"></i></div><strong>${money(amount)} · ${rows.length}</strong></div>`; }).join('')}</section><section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">REVENUE BY SERVICE</p><h2>What guests come back for</h2></div></div>${SERVICES.map(service => { const amount = serviceRows.filter(tx => tx.item_id === service.id).reduce((sum, tx) => sum + tx.amount, 0); const maximum = Math.max(1, ...SERVICES.map(item => serviceRows.filter(tx => tx.item_id === item.id).reduce((sum, tx) => sum + tx.amount, 0))); return `<div class="revenue-bar-row"><span>${escapeHtml(service.name)}</span><div><i style="width:${amount / maximum * 100}%"></i></div><strong>${money(amount)}</strong></div>`; }).join('')}</section>`;
}
function renderReports() {
  const transactions = reportTransactions();
  const paid = transactions.filter(isRevenueTransaction);
  const services = paid.filter(tx => tx.item_type !== 'PRODUCT');
  const products = paid.filter(tx => tx.item_type === 'PRODUCT');
  const serviceRevenue = services.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const productRevenue = products.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalRevenue = serviceRevenue + productRevenue;
  const vehiclesServed = new Set(transactions.filter(tx => tx.item_type === 'SERVICE' && isRevenueTransaction(tx) && tx.transaction_status === 'COMPLETED').map(tx => tx.vehicle_id).filter(Boolean)).size;
  return `<header class="reports-heading"><div><p class="eyebrow">LAPORAN PENDAPATAN</p><h2>Laporan Pendapatan</h2><p>Hanya transaksi lunas yang masuk perhitungan pendapatan.</p></div><span class="report-period">${transactions.length} transaksi · seluruh tanggal</span></header><div class="report-grid report-summary-grid"><article class="report-card report-card-primary"><span>TOTAL PENDAPATAN</span><strong>${money(totalRevenue)}</strong><small>Transaksi lunas · semua metode</small></article><article class="report-card"><span>PENDAPATAN JASA</span><strong>${money(serviceRevenue)}</strong><small>${services.length} transaksi lunas</small></article><article class="report-card"><span>PENDAPATAN PRODUK</span><strong>${money(productRevenue)}</strong><small>${products.length} baris penjualan</small></article><article class="report-card"><span>JUMLAH TRANSAKSI</span><strong>${transactions.length}</strong><small>Semua status</small></article><article class="report-card report-card-quiet"><span>TRANSAKSI LUNAS</span><strong>${paid.length}</strong><small>Lunas</small></article><article class="report-card report-card-quiet"><span>KENDARAAN DILAYANI</span><strong>${vehiclesServed}</strong><small>Kendaraan unik · selesai</small></article></div>`;
}
function renderAdminTransactionList(records, title, eyebrow) {
  const transactions = getOperationalTransactions(records)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const paidCount = transactions.filter(isRevenueTransaction).length;
  const pendingCount = transactions.filter(tx => tx.payment_status === 'PENDING').length;
  const rows = transactions.map(tx => {
    const customer = getCustomer(tx);
    const vehicle = getVehicle(tx);
    const canConfirmCash = tx.payment_status === 'PENDING' && tx.payment_method === 'CASH'
      && ['WALK_IN', 'SHOP'].includes(tx.transaction_type) && tx.transaction_status !== 'CANCELLED';
    const paymentAction = canConfirmCash ? `<button class="payment-mark-paid" type="button" data-payment-paid="${escapeHtml(tx.id)}">Konfirmasi Lunas</button>` : '';
    const refundAction = tx.refund_status === 'PENDING' ? `<button class="payment-mark-paid" type="button" data-refund-complete="${escapeHtml(tx.id)}">Catat Pengembalian Dana</button>` : '';
    const refundStatus = tx.refund_status === 'PENDING' ? '<small>Pengembalian Dana: menunggu proses manual</small>' : tx.refund_status === 'COMPLETED' ? '<small>Pengembalian Dana: selesai</small>' : '';
    const pickupAddress = ['addon-pickup', 'addon-pickup-moto'].includes(tx.addon_id) && customer?.address ? `<small>Alamat Antar-Jemput: ${escapeHtml(customer.address)}</small><small>Jarak pulang-pergi: ${escapeHtml(tx.pickup_distance_km)} km</small>` : '';
    return `<div class="catalog-row"><span class="transaction-code"><strong>${escapeHtml(tx.code)}</strong><small>${escapeHtml(transactionTypeLabel(tx.transaction_type))}</small></span><span class="transaction-date"><strong>${escapeHtml(tx.booking_date)}</strong><small>${escapeHtml(tx.booking_time)}</small></span><span class="transaction-customer"><strong>${escapeHtml(customer?.full_name || 'Pelanggan')}</strong><small>${escapeHtml(vehicle ? `${vehicle.plate} · ${vehicle.model}` : 'Pembelian produk')}</small>${pickupAddress}</span><span class="transaction-item">${escapeHtml(tx.item_name || (tx.item_type === 'PRODUCT' ? 'Pembelian produk' : 'Layanan cuci'))}</span><span class="transaction-payment"><span class="payment-method">${statusLabel(tx.payment_method)}</span><span class="payment-status payment-status-${String(tx.payment_status).toLowerCase()}">${statusLabel(tx.payment_status)}</span>${refundStatus}${paymentAction}${refundAction}</span><span class="transaction-state transaction-state-${String(tx.transaction_status).toLowerCase()}">${statusLabel(tx.transaction_status)}</span><span class="transaction-amount">${money(tx.amount)}</span></div>`;
  }).join('');
  return `<div class="catalog-toolbar transaction-toolbar"><div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p>Data operasional studio dengan status pembayaran dan jadwal yang konsisten.</p></div><div class="transaction-summary"><strong>${transactions.length} transaksi</strong><span>${paidCount} lunas · ${pendingCount} belum dibayar</span></div></div><div class="catalog-table transaction-table"><div class="catalog-row catalog-head"><span>REFERENSI</span><span>TANGGAL / WAKTU</span><span>PELANGGAN / KENDARAAN</span><span>LAYANAN / ITEM</span><span>PEMBAYARAN</span><span>STATUS</span><span>JUMLAH</span></div>${transactions.length ? rows : '<div class="queue-empty">Belum ada transaksi.</div>'}</div>`;
}
function renderAdminBookings() {
  const bookings = getOperationalTransactions(db.transactions).filter(tx => tx.transaction_type === 'BOOKING' && tx.transaction_status !== 'CANCELLED').sort((a, b) => `${a.booking_date} ${a.booking_time}`.localeCompare(`${b.booking_date} ${b.booking_time}`));
  const today = getJakartaDateString();
  const upcoming = bookings.filter(tx => tx.booking_date >= today && isRevenueTransaction(tx));
  const rows = bookings.filter(tx => tx.booking_date >= today).length ? bookings.filter(tx => tx.booking_date >= today) : bookings;
  const confirmedToday = bookings.filter(tx => tx.booking_date === today && isRevenueTransaction(tx)).length;
  return `<div class="booking-board"><div class="booking-summary"><div><span>BOOKING MENDATANG</span><strong>${upcoming.length}</strong></div><div><span>MENUNGGU PEMBAYARAN</span><strong>${bookings.filter(tx => tx.payment_status === 'PENDING').length}</strong></div><div><span>BOOKING HARI INI</span><strong>${confirmedToday}</strong></div></div><div class="booking-board-heading"><div><p class="eyebrow">JADWAL KUNJUNGAN</p><h2>${rows.some(tx => tx.booking_date >= today) ? 'Booking berikutnya' : 'Riwayat booking'}</h2></div><span>${rows.length} jadwal</span></div><div class="booking-list">${rows.length ? rows.map(tx => { const customer = getCustomer(tx), vehicle = getVehicle(tx); const date = new Date(`${tx.booking_date}T12:00:00`); return `<article class="booking-row"><div class="booking-date"><strong>${date.toLocaleDateString('id-ID', { day: '2-digit' })}</strong><span>${date.toLocaleDateString('id-ID', { month: 'short' })}</span></div><div class="booking-main"><strong>${escapeHtml(tx.item_name)}</strong><span>${escapeHtml(customer?.full_name || 'Pelanggan')} · ${escapeHtml(vehicle ? `${vehicle.plate} · ${vehicle.model}` : 'Pembelian produk')}</span><small>${escapeHtml(tx.code)}</small></div><div class="booking-time"><strong>${escapeHtml(tx.booking_time)}</strong><span>${tx.duration_minutes} menit</span></div><div class="booking-status"><span class="transaction-state transaction-state-${String(tx.transaction_status).toLowerCase()}">${statusLabel(tx.transaction_status)}</span><span class="payment-status payment-status-${String(tx.payment_status).toLowerCase()}">${statusLabel(tx.payment_status)}</span></div><strong class="booking-amount">${money(tx.amount)}</strong></article>`; }).join('') : '<p class="report-empty">Belum ada booking tercatat.</p>'}</div></div>`;
}
function renderAdminCustomers() {
  return `<div class="customer-toolbar"><div><p class="eyebrow">DATA PELANGGAN</p><h2>Pelanggan & Kendaraan</h2><p>Ringkasan kunjungan dan kendaraan terdaftar.</p></div><label class="customer-search" for="customer-search">Cari nama, nomor HP, atau plat<input id="customer-search" type="search" placeholder="Nama, nomor HP, atau plat"></label><span>${db.customers.length} pelanggan · ${db.vehicles.length} kendaraan</span></div><div class="customer-grid">${db.customers.map(customer => {
    const vehicles = db.vehicles.filter(vehicle => vehicle.customer_id === customer.id);
    const transactions = db.transactions.filter(tx => tx.customer_id === customer.id);
    const initials = customer.full_name.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase();
    const searchText = [customer.full_name, customer.phone, customer.email, customer.address, ...vehicles.flatMap(vehicle => [vehicle.plate, vehicle.model])].filter(Boolean).join(' ').toLocaleLowerCase('id-ID');
    return `<article class="customer-card" data-customer-search="${escapeHtml(searchText)}"><div class="customer-card-heading"><span class="customer-avatar">${escapeHtml(initials)}</span><div><h3>${escapeHtml(customer.full_name)}</h3><p>${escapeHtml(customer.phone)}</p>${customer.email ? `<p class="customer-email">${escapeHtml(customer.email)}</p>` : ''}${customer.address ? `<p class="customer-address">${escapeHtml(customer.address)}</p>` : ''}</div></div><div class="customer-stats"><span><strong>${transactions.length}</strong> transaksi</span><span><strong>${vehicles.length}</strong> kendaraan</span></div><button class="text-link" type="button" data-edit-customer-address="${escapeHtml(customer.id)}">Ubah alamat</button><div class="customer-vehicles">${vehicles.map(vehicle => `<div class="customer-vehicle"><span class="vehicle-type">${vehicle.type === 'MOTOR' ? 'Motor' : 'Mobil'}</span><strong>${escapeHtml(vehicle.plate)}</strong><small>${escapeHtml(vehicle.model)}</small></div>`).join('') || '<span class="report-empty">Belum ada kendaraan terdaftar.</span>'}</div></article>`;
  }).join('')}</div>`;
}
function adminDescription(tab) {
  return ({ overview: 'Pantau pendapatan, aktivitas studio, dan kebutuhan operasional.', transactions: 'Kelola pembayaran dan aktivitas transaksi dari semua kanal.', bookings: 'Tinjau jadwal kunjungan mendatang, pelanggan, dan status pembayaran.', queue: 'Pantau kendaraan yang menunggu, dicuci, dan siap diserahkan.', 'self-service': 'Pantau status empat bay dan sesi yang sedang berjalan.', customers: 'Lihat pelanggan, kendaraan, dan frekuensi kunjungan.', catalog: 'Kelola layanan, produk, harga, dan persediaan studio.', reports: 'Analisis pendapatan, metode pembayaran, layanan, dan penjualan produk.' })[tab] || '';
}
function setAdminDescription(tab) {
  const heading = document.getElementById('admin-heading');
  if (!heading) return;
  let description = document.getElementById('admin-description');
  if (!description) {
    description = document.createElement('p');
    description.id = 'admin-description';
    heading.insertAdjacentElement('afterend', description);
  }
  description.className = 'admin-page-description';
  description.textContent = adminDescription(tab);
}
function renderAdminBays() {
  const bays = [1, 2, 3, 4].map(number => {
    const tx = getOperationalTransactions(db.transactions).find(item => item.bay_number === number && isRevenueTransaction(item) && isBayTransactionCurrent(item));
    const vehicle = tx && getVehicle(tx);
    const started = tx && parseJakartaDateTime(tx.booking_date, tx.booking_time).getTime() <= Date.now();
    const status = !tx ? 'AVAILABLE' : tx.transaction_status === 'ACTIVE' || started ? 'OCCUPIED' : 'RESERVED';
    const statusLabelText = !tx ? 'TERSEDIA' : status === 'OCCUPIED' ? 'DIGUNAKAN' : 'DIPESAN';
    return `<article class="bay-card bay-${status.toLowerCase()}"><div class="bay-card-top"><span>B-${String(number).padStart(2, '0')}</span>${statusBadge(status)}</div><div class="bay-visual"><img src="${PHOTOS.selfBay}" alt="Bay cuci mandiri ${number}"><span class="bay-number">${String(number).padStart(2, '0')}</span></div><div class="bay-card-bottom"><strong>${vehicle ? `${statusLabelText} · ${escapeHtml(vehicle.model)} · ${escapeHtml(vehicle.plate)}` : statusLabelText}</strong><span>${tx ? `${tx.duration_minutes} menit · ${vehicle?.type === 'MOTOR' ? 'Sepeda motor' : 'Mobil'}` : 'Belum ada sesi aktif'}</span><span class="bay-time">${status === 'OCCUPIED' ? `${bayMinutesLeft(tx)} menit tersisa` : status === 'RESERVED' ? `${tx.booking_time} · dipesan` : 'Tersedia sekarang'}</span></div></article>`;
  }).join('');
  return `<div class="catalog-toolbar"><div><p class="eyebrow">AREA CUCI MANDIRI</p><h2>Status bay saat ini.</h2></div><span class="shop-count">${getOperationalTransactions(db.transactions).filter(tx => isRevenueTransaction(tx) && tx.bay_number && isBayTransactionCurrent(tx) && (tx.transaction_status === 'ACTIVE' || parseJakartaDateTime(tx.booking_date, tx.booking_time).getTime() <= Date.now())).length} bay digunakan</span></div><div class="bay-grid">${bays}</div>`;
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
  const transactions = reportTransactions();
  const paid = transactions.filter(isRevenueTransaction);
  const daily = dailyPaidRevenue(transactions);
  const periodKeys = new Set(daily.map(row => row.key));
  const periodPaid = paid.filter(tx => periodKeys.has(tx.booking_date));
  const renderBars = (rows, formatValue = money, valueKey = 'amount') => {
    const maximum = Math.max(1, ...rows.map(row => row.amount));
    return `<div class="report-bars">${rows.map(row => `<div class="report-bar-row"><span>${escapeHtml(row.label)}</span><div class="report-bar-track"><i style="width:${row.amount / maximum * 100}%"></i></div><strong>${formatValue(row[valueKey], row)}</strong></div>`).join('') || '<p class="report-empty">Belum ada transaksi.</p>'}</div>`;
  };
  const serviceRevenue = paid.filter(tx => tx.item_type !== 'PRODUCT').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const productRevenue = paid.filter(tx => tx.item_type === 'PRODUCT').reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalRevenue = serviceRevenue + productRevenue;
  const revenueSplit = [
    { label: 'Jasa', amount: serviceRevenue },
    { label: 'Produk', amount: productRevenue }
  ];
  const paymentMix = ['CASH', 'QRIS', 'E_WALLET', 'CARD'].map(method => {
    const rows = paid.filter(tx => tx.payment_method === method);
    return { label: statusLabel(method), amount: rows.reduce((sum, tx) => sum + Number(tx.amount), 0), count: rows.length };
  });
  const byVehicle = ['CAR', 'MOTOR'].map(type => {
    const rows = paid.filter(tx => reportVehicle(tx)?.type === type);
    return { label: type === 'CAR' ? 'Mobil' : 'Sepeda motor', amount: rows.reduce((sum, tx) => sum + Number(tx.amount), 0), count: rows.length };
  });
  const serviceItems = db.services_products.filter(item => item.item_type === 'SERVICE').map(service => {
    const rows = paid.filter(tx => tx.item_id === service.id);
    return { label: catalogItem(service).name, amount: rows.reduce((sum, tx) => sum + Number(tx.amount), 0), count: rows.length };
  }).sort((a, b) => b.count - a.count || b.amount - a.amount);
  const vehicleItems = ['CAR', 'MOTOR'].map(type => {
    const rows = paid.filter(tx => reportVehicle(tx)?.type === type);
    return { label: type === 'CAR' ? 'Mobil' : 'Sepeda motor', amount: rows.reduce((sum, tx) => sum + Number(tx.amount), 0), count: rows.length };
  });
  const productItems = db.services_products.filter(item => item.item_type === 'PRODUCT').map(product => {
    const rows = paid.filter(tx => tx.item_id === product.id);
    return { label: catalogItem(product).name, amount: rows.reduce((sum, tx) => sum + Number(tx.quantity || 1), 0), revenue: rows.reduce((sum, tx) => sum + Number(tx.amount), 0), stock: Number(product.stock) || 0, minStock: Number(product.min_stock) || 0 };
  }).sort((a, b) => b.amount - a.amount || b.revenue - a.revenue);
  const servicePerformance = `<div class="performance-list">${serviceItems.map((row, index) => `<div class="performance-row"><span class="performance-rank">${String(index + 1).padStart(2, '0')}</span><span class="performance-main"><strong>${escapeHtml(row.label)}</strong><small>${row.count} transaksi lunas</small></span><strong>${money(row.amount)}</strong></div>`).join('') || '<p class="report-empty">Belum ada transaksi jasa.</p>'}</div>`;
  const productPerformance = `<div class="performance-list">${productItems.map(row => `<div class="performance-row"><span class="performance-main"><strong>${escapeHtml(row.label)}</strong><small>${row.amount} unit · ${money(row.revenue)}</small></span><span class="stock-indicator ${row.stock <= row.minStock ? 'stock-indicator-low' : ''}">${row.stock <= row.minStock ? 'Stok rendah' : `${row.stock} stok`}</span></div>`).join('') || '<p class="report-empty">Belum ada penjualan produk.</p>'}</div>`;
  const pendingCount = transactions.filter(tx => tx.payment_status === 'PENDING').length;
  return `<section class="admin-panel report-primary"><div class="panel-heading"><div><p class="eyebrow">TREN PENDAPATAN</p><h2>Tujuh hari terakhir</h2></div><span class="report-period">Lunas · ${periodPaid.length} transaksi</span></div>${renderRevenueLineChart(daily)}</section><div class="report-support-grid"><section class="admin-panel report-split"><div class="panel-heading"><div><p class="eyebrow">KOMPOSISI PENDAPATAN</p><h2>Jasa dan produk</h2></div><strong>${money(totalRevenue)}</strong></div><div class="revenue-composition" role="img" aria-label="Jasa ${money(serviceRevenue)}, produk ${money(productRevenue)}"><span class="revenue-service" style="width:${totalRevenue ? serviceRevenue / totalRevenue * 100 : 0}%"></span><span class="revenue-product" style="width:${totalRevenue ? productRevenue / totalRevenue * 100 : 0}%"></span></div><div class="composition-legend"><span><i></i>Jasa <strong>${money(serviceRevenue)}</strong></span><span><i></i>Produk <strong>${money(productRevenue)}</strong></span></div></section><section class="admin-panel report-payments"><div class="panel-heading"><div><p class="eyebrow">METODE PEMBAYARAN</p><h2>Transaksi lunas</h2></div><span>${pendingCount} pending</span></div>${paymentMix.map(row => `<div class="report-payment-row"><span>${escapeHtml(row.label)}</span><strong>${money(row.amount)}</strong><small>${row.count} transaksi</small></div>`).join('')}</section></div><section class="admin-panel report-vehicle-panel"><div class="panel-heading"><div><p class="eyebrow">PENDAPATAN PER KENDARAAN</p><h2>Mobil dan sepeda motor</h2></div></div><div class="report-vehicle-list">${vehicleItems.map(row => `<div><span>${escapeHtml(row.label)} <small>${row.count} transaksi lunas</small></span><strong>${money(row.amount)}</strong></div>`).join('')}</div></section><div class="report-performance-grid"><section class="admin-panel"><div class="panel-heading"><div><p class="eyebrow">KINERJA LAYANAN</p><h2>Jasa teratas</h2></div></div>${servicePerformance}</section><section class="admin-panel"><div class="panel-heading"><div><p class="eyebrow">KINERJA PRODUK</p><h2>Penjualan dan stok</h2></div></div>${productPerformance}</section></div><section class="report-detail"><div class="catalog-toolbar"><div><p class="eyebrow">DETAIL</p><h2>Transaksi tercatat</h2></div><span class="shop-count">${db.transactions.length} transaksi</span></div>${renderAdminTransactionList(db.transactions, 'Transaksi dari semua status pembayaran.', 'RIWAYAT TRANSAKSI')}</section>`;
}
function renderAdminCatalog() {
  const items = db.services_products.filter(item => !isPickupAddon(item)).sort((a, b) => a.item_type.localeCompare(b.item_type) || a.name.localeCompare(b.name));
  return `<div class="catalog-toolbar"><div><p class="eyebrow">KATALOG STUDIO</p><h2>Layanan dan produk</h2><p>Harga, durasi, ketersediaan, dan stok katalog.</p></div><button class="button button-dark" data-action="add-item">Tambah item</button></div><div class="catalog-table admin-catalog-table"><div class="catalog-row catalog-head"><span>ITEM</span><span>JENIS / KATEGORI</span><span>HARGA</span><span>STOK / DURASI</span><span>STATUS</span></div>${items.map(item => {
    const copy = catalogItem(item);
    const category = item.category || (item.item_type === 'ADD_ON' ? 'Tambahan' : 'Perawatan');
    const vehicleType = item.type === 'MOTOR' ? 'Motor' : item.type === 'CAR' ? 'Mobil' : '';
    return `<div class="catalog-row"><span class="catalog-name catalog-name-${String(item.item_type).toLowerCase()}"><img src="${copy.image || PHOTOS.car}" alt=""><strong>${escapeHtml(copy.name)}<small>${escapeHtml([category, vehicleType].filter(Boolean).join(' · '))}</small></strong></span><span>${item.item_type === 'PRODUCT' ? 'Produk' : item.item_type === 'ADD_ON' ? 'Tambahan' : 'Layanan'}<small>${escapeHtml(category)}</small></span><span class="catalog-price">${money(item.price)}</span><span>${item.item_type === 'PRODUCT' ? `<b class="${item.stock <= item.min_stock ? 'stock-low' : ''}">${item.stock} unit</b><small>Minimum ${item.min_stock}</small>` : `${item.duration || 0} menit`}</span><button class="toggle-active" data-edit-item="${item.id}">${item.active === false ? 'Nonaktif' : 'Aktif'} · Ubah</button></div>`;
  }).join('')}</div>`;
}
function activateAdminTab(tab) {
  activeAdminTab = tab;
  document.querySelectorAll('.admin-nav').forEach(button => button.classList.toggle('active', button.dataset.adminTab === tab));
  const heading = document.getElementById('admin-heading');
  const content = document.getElementById('admin-content');
  if (!content) return;
  const labels = { overview: 'Ringkasan', transactions: 'Transaksi', bookings: 'Booking', queue: 'Antrean', 'self-service': 'Self-Service', catalog: 'Produk & Layanan', customers: 'Pelanggan & Kendaraan', reports: 'Laporan Pendapatan' };
  heading.textContent = labels[tab] || labels.overview;
  setAdminDescription(tab);
  if (tab === 'overview') { render(); return; }
  if (tab === 'catalog') {
    content.innerHTML = renderAdminCatalog();
    polishUiLabels(content);
    simplifyUiSymbols(content);
    return;
  }
  if (tab === 'transactions') content.innerHTML = renderAdminTransactionList(db.transactions, 'Seluruh transaksi studio.', 'DAFTAR TRANSAKSI');
  else if (tab === 'bookings') content.innerHTML = renderAdminBookings();
  else if (tab === 'self-service') content.innerHTML = renderAdminBays();
  if (tab === 'queue') content.innerHTML = `<div class="queue-toolbar"><div><p class="eyebrow">PENGELOLAAN AREA CUCI</p><h2>Pantau setiap kendaraan.</h2></div><button class="button button-dark" data-action="walkin">+ Walk-in baru</button></div>${renderQueueColumns(true)}`;
  else if (tab === 'reports') { content.innerHTML = renderReports(); content.insertAdjacentHTML('beforeend', renderReportDetails()); }
  else if (tab === 'customers') {
    content.innerHTML = renderAdminCustomers();
    const searchField = content.querySelector('#customer-search');
    searchField?.addEventListener('input', () => {
      const query = searchField.value.trim().toLocaleLowerCase('id-ID');
      content.querySelectorAll('.customer-card').forEach(card => {
        card.hidden = !card.dataset.customerSearch.includes(query);
      });
    });
  }
  else if (tab === 'catalog') content.innerHTML = `<div class="catalog-toolbar"><div><p class="eyebrow">KATALOG DAN PERSEDIAAN</p><h2>Kelola layanan dan produk.</h2></div><button class="button button-dark" data-action="add-item">+ Tambah item</button></div><div class="catalog-table"><div class="catalog-row catalog-head"><span>ITEM</span><span>JENIS</span><span>HARGA</span><span>STOK / DURASI</span><span>STATUS</span></div>${db.services_products.filter(item => !isPickupAddon(item)).map(item => `<div class="catalog-row"><span class="catalog-name"><img src="${catalogItem(item).image || PHOTOS.car}" alt=""><strong>${escapeHtml(item.name)}</strong></span><span>${item.item_type === 'PRODUCT' ? 'PRODUK' : item.item_type === 'ADD_ON' ? 'TAMBAHAN' : 'LAYANAN'}</span><span>${money(item.price)}</span><span>${item.item_type === 'PRODUCT' ? `<b class="${item.stock <= item.min_stock ? 'stock-low' : ''}">${item.stock} / min ${item.min_stock}</b>` : `${item.duration || 0} menit`}</span><button class="toggle-active" data-edit-item="${item.id}">${item.active === false ? 'NONAKTIF' : 'AKTIF'} · Ubah</button></div>`).join('')}</div>`;
  polishUiLabels(content);
  simplifyUiSymbols(content);
}
function showToast(message, type = 'success') { const element = document.createElement('div'); element.className = `toast toast-${type}`; element.textContent = message; document.getElementById('toast-region').append(element); setTimeout(() => element.remove(), 4500); }
function requestHeaders(prefer = 'return=representation') {
  const bearer = supabaseSession?.access_token || SUPABASE_PUBLISHABLE_KEY;
  return { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${bearer}`, 'Content-Type': 'application/json', Prefer: prefer };
}
async function fetchWithDiagnostics(url, options, label) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), SUPABASE_REQUEST_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const text = response.status === 204 ? '' : await response.text();
    const duration = Date.now() - startedAt;
    const result = `[Supabase] ${label} -> ${response.status} (${duration} ms)`;
    if (response.ok) console.info(result);
    else console.error(`${result}: ${text.slice(0, 500)}`);
    return { response, text };
  } catch (error) {
    const reason = controller.signal.aborted ? `timed out after ${SUPABASE_REQUEST_TIMEOUT_MS} ms` : error.message || 'network error';
    console.error(`[Supabase] ${label} failed: ${reason}`);
    throw new Error(`${label}: ${reason}`);
  } finally {
    window.clearTimeout(timeoutId);
  }
}
async function supabaseRequest(table, method = 'GET', body, query = '', prefer = 'return=representation') {
  if (!isSupabaseConfigured()) throw new Error('Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.');
  if (supabaseSession?.expires_at && supabaseSession.expires_at * 1000 < Date.now() + 30000) await refreshAdminSession();
  const label = `${method} /rest/v1/${table}`;
  const { response, text } = await fetchWithDiagnostics(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}${query}`, { method, headers: requestHeaders(prefer), body: body ? JSON.stringify(body) : undefined }, label);
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${text || response.statusText}`);
  }
  if (response.status === 204) return null;
  return text ? JSON.parse(text) : null;
}
async function rpcRequest(name, parameters = {}) {
  const addon = db?.services_products?.find(item => item.id === parameters.p_addon_id);
  if (name === 'record_service_transaction'
    && (isPickupAddon(parameters.p_addon_id) || isPickupAddon(addon) || carriesPickupData(parameters.p_transaction))) {
    throw new Error('Add-on antar-jemput tidak lagi tersedia.');
  }
  if (!isSupabaseConfigured()) throw new Error('Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.');
  if (supabaseSession?.expires_at && supabaseSession.expires_at * 1000 < Date.now() + 30000) await refreshAdminSession();
  const label = `POST /rest/v1/rpc/${name}`;
  const { response, text } = await fetchWithDiagnostics(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${name}`, { method: 'POST', headers: requestHeaders('return=representation'), body: JSON.stringify(parameters) }, label);
  if (!response.ok) {
    throw new Error(`${label} failed (${response.status}): ${text || response.statusText}`);
  }
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
  let text;
  try {
    ({ response, text } = await fetchWithDiagnostics(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=refresh_token`, {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: supabaseSession.refresh_token })
    }, 'POST /auth/v1/token (refresh)'));
  } catch (error) { throw new Error(error.message || 'Tidak dapat memverifikasi sesi.'); }
  if (!response.ok) {
    if ([400, 401, 403].includes(response.status)) {
      rememberAuthSession(null);
      adminUser = null;
      throw new Error('Sesi admin berakhir. Silakan masuk kembali.');
    }
    throw new Error('Tidak dapat memverifikasi sesi. Silakan coba lagi.');
  }
  const session = JSON.parse(text || '{}');
  session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
  rememberAuthSession(session);
  return session;
}
async function signInAdmin(email, password) {
  if (!email || !password) throw new Error('Masukkan email dan password admin.');
  if (!isSupabaseConfigured()) throw new Error('Layanan login belum tersedia. Silakan coba lagi nanti.');
  let response;
  let text;
  try {
    ({ response, text } = await fetchWithDiagnostics(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }, 'POST /auth/v1/token (password)'));
  } catch (error) { throw new Error(error.message || 'Tidak dapat terhubung. Periksa koneksi lalu coba lagi.'); }
  const result = JSON.parse(text || '{}');
  if (!response.ok) {
    const authCode = result.error_code || result.code || '';
    const authMessage = String(result.msg || result.message || result.error_description || '').toLowerCase();
    if (['invalid_credentials', 'invalid_grant'].includes(authCode) || /invalid login credentials|invalid credentials/.test(authMessage)) {
      throw new Error('Email atau password yang kamu masukkan salah.');
    }
    if (response.status === 429) throw new Error('Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.');
    if (authCode === 'email_not_confirmed') throw new Error('Email akun belum dikonfirmasi.');
    if (authCode === 'user_not_found' || /user not found/.test(authMessage)) throw new Error('Akun admin tidak ditemukan.');
    if (authCode === 'unauthorized' || /not allowed|forbidden|permission denied/.test(authMessage)) throw new Error('Supabase Auth menolak permintaan login ini.');
    throw new Error('Login belum dapat diproses. Silakan coba lagi.');
  }
  const user = result.user;
  if (!user) throw new Error('Login berhasil, tetapi sesi pengguna tidak terbaca. Silakan coba lagi.');
  result.expires_at = Math.floor(Date.now() / 1000) + result.expires_in;
  rememberAuthSession(result);
  adminUser = user;
  try { await loadAdminData(); }
  catch (error) {
    adminDataReady = false;
    adminDataState = 'error';
    throw new Error(`Login berhasil, tetapi data dashboard gagal dimuat: ${error.message}`);
  }
}
async function restoreAdminSession() {
  if (!supabaseSession || !isSupabaseConfigured()) return false;
  try {
    if (supabaseSession.expires_at * 1000 < Date.now() + 30000) await refreshAdminSession();
    const { response, text } = await fetchWithDiagnostics(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, { headers: requestHeaders() }, 'GET /auth/v1/user');
    if ([401, 403].includes(response.status)) {
      rememberAuthSession(null);
      adminUser = null;
      return false;
    }
    if (!response.ok) throw new Error('Tidak dapat memverifikasi sesi. Silakan coba lagi.');
    adminUser = JSON.parse(text || '{}');
    return true;
  } catch (_) {
    adminUser = null;
    return false;
  }
}
async function logoutAdmin() {
  if (supabaseSession?.access_token && isSupabaseConfigured()) {
    await fetchWithDiagnostics(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/logout`, { method: 'POST', headers: requestHeaders() }, 'POST /auth/v1/logout').catch(() => {});
  }
  rememberAuthSession(null);
  adminUser = null;
  db = { ...emptyDatabase(), services_products: db.services_products };
  page = 'home';
  render();
}
async function loadPublicData() {
  if (!isSupabaseConfigured()) throw new Error('Supabase belum dikonfigurasi. Pastikan URL dan publishable key benar.');
  const [products, count, bays] = await Promise.all([
    supabaseRequest('services_products', 'GET', null, '?select=*&active=eq.true&order=name.asc'),
    rpcRequest('get_public_today_wash_count'),
    rpcRequest('get_public_bay_status')
  ]);
  publicBays = Array.isArray(bays) ? bays.map(normalizeTransactionRecord) : [];
  db = { ...emptyDatabase(), services_products: Array.isArray(products) ? products : [] };
  syncServiceCatalog();
  publicWashCount = Number(count) || 0;
  databaseConnected = true;
  dataLoadState = 'ready';
}
async function loadAdminData() {
  if (!adminUser) throw new Error('Masuk sebagai admin untuk membuka data studio.');
  const tables = ['customers', 'vehicles', 'services_products', 'transactions'];
  const publicCatalogIds = new Set(db.services_products.filter(item => item.active !== false).map(item => item.id));
  try {
    if (supabaseSession?.expires_at && supabaseSession.expires_at * 1000 < Date.now() + 30000) await refreshAdminSession();
    const results = await Promise.allSettled(tables.map(table => supabaseRequest(table, 'GET', null, '?select=*&order=created_at.desc')));
    const failures = results.flatMap((result, index) => {
      if (result.status === 'rejected') return [`${tables[index]}: ${result.reason.message}`];
      if (!Array.isArray(result.value)) return [`${tables[index]}: respons tidak mengembalikan daftar data.`];
      return [];
    });
    if (failures.length) {
      throw new Error(`Gagal memuat data Supabase (${failures.join('; ')}).`);
    }
    const loaded = Object.fromEntries(tables.map((table, index) => [table, results[index].value]));
    loaded.transactions = Array.isArray(loaded.transactions) ? loaded.transactions.map(normalizeTransactionRecord) : [];
    loaded.customers = Array.isArray(loaded.customers) ? loaded.customers : [];
    loaded.vehicles = Array.isArray(loaded.vehicles) ? loaded.vehicles : [];
    loaded.services_products = Array.isArray(loaded.services_products) ? loaded.services_products : [];
    const customersById = new Map(loaded.customers.map(customer => [customer.id, customer]));
    const vehiclesById = new Map(loaded.vehicles.map(vehicle => [vehicle.id, vehicle]));
    const itemsById = new Map(loaded.services_products.map(item => [item.id, item]));
    const inconsistentTransactions = loaded.transactions.filter(tx => {
      const item = itemsById.get(tx.item_id);
      const vehicle = tx.vehicle_id ? vehiclesById.get(tx.vehicle_id) : null;
      return !customersById.has(tx.customer_id)
        || !item
        || item.item_type !== tx.item_type
        || (tx.item_type === 'SERVICE' && !vehicle)
        || (vehicle && vehicle.customer_id !== tx.customer_id)
        || (vehicle && tx.item_type === 'SERVICE' && vehicle.type !== item.type);
    });
    if (inconsistentTransactions.length) {
      throw new Error(`${inconsistentTransactions.length} transaksi memiliki relasi pelanggan, kendaraan, atau item yang tidak sesuai.`);
    }
    if ([...publicCatalogIds].some(id => !loaded.services_products.some(item => item.id === id))) {
      throw new Error('Policy RLS menolak pembacaan katalog oleh role authenticated. Jalankan sql/rls-authenticated-access.sql di Supabase.');
    }
    const activeBays = publicBays.filter(bay => bay.bay_status !== 'AVAILABLE');
    if (activeBays.some(bay => !loaded.transactions.some(tx => tx.bay_number === bay.bay_number && ['ACTIVE', 'BOOKED'].includes(tx.transaction_status)))) {
      throw new Error('Policy RLS menolak pembacaan transaksi oleh role authenticated. Jalankan sql/rls-authenticated-access.sql di Supabase.');
    }
    db = loaded;
    syncServiceCatalog();
    databaseConnected = true;
    adminDataReady = true;
    adminDataState = 'ready';
    adminDataError = '';
  } catch (error) {
    databaseConnected = false;
    adminDataReady = false;
    adminDataState = 'error';
    adminDataError = error.message;
    console.error('[Supabase admin data] Load failed:', error.message);
    throw error;
  }
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
  let publicError = null;
  try {
    await loadPublicData();
  } catch (error) {
    publicError = error;
    databaseConnected = false;
    dataLoadState = 'error';
    db = emptyDatabase();
    publicWashCount = 0;
    publicBays = [];
    SERVICES.splice(0, SERVICES.length);
    ADDONS.splice(0, ADDONS.length);
  }
  if (supabaseSession) {
    const restored = await restoreAdminSession();
    if (restored) {
      page = 'admin';
      adminDataReady = false;
      adminDataState = 'loading';
      render();
      try {
        await loadAdminData();
      } catch (_) {
        adminDataReady = false;
        adminDataState = 'error';
      }
    }
  }
  if (!adminUser && publicError) showToast(publicError.message || 'Database tidak dapat diakses. Jelaskan error yang terjadi untuk admin.', 'error');
  render();
}
function addCatalogItem() {
  const content = document.getElementById('dialog-content');
  content.innerHTML = `<p class="eyebrow">KATALOG STUDIO</p><h2>Tambah item <em>baru.</em></h2><form id="catalog-form" class="dialog-form"><label>Nama item<input name="name" required></label><label>Jenis item<select name="item_type"><option value="SERVICE">LAYANAN</option><option value="PRODUCT">PRODUK</option><option value="ADD_ON">ADD-ON</option></select></label><label>Jenis kendaraan<select name="type"><option value="">Tidak terkait kendaraan</option><option value="CAR">Mobil</option><option value="MOTOR">Sepeda motor</option></select></label><label>Kategori<input name="category" placeholder="REGULAR, SELF_SERVICE, WASH & CARE"></label><label>Deskripsi<input name="description" required></label><div class="form-two"><label>Harga (Rp)<input name="price" type="number" min="0" required></label><label>Durasi (menit)<input name="duration" type="number" min="0" value="30"></label></div><div class="form-two"><label>Stok<input name="stock" type="number" min="0" value="0"></label><label>Stok minimum<input name="min_stock" type="number" min="0" value="5"></label></div><label>URL foto yang sesuai<input name="image" type="url" placeholder="https://..."></label><button class="button button-dark button-full" type="submit">Simpan ke katalog <span>↗</span></button></form>`;
  document.getElementById('flow-dialog').showModal();
  simplifyUiSymbols(document.getElementById('flow-dialog'));
}
function editCatalogItem(item) {
  if (isPickupAddon(item)) {
    showToast('Add-on antar-jemput tidak lagi tersedia.', 'error');
    return;
  }
  const content = document.getElementById('dialog-content');
  content.innerHTML = `<p class="eyebrow">UBAH KATALOG</p><h2>Perbarui <em>item.</em></h2><form id="catalog-edit-form" class="dialog-form"><input type="hidden" name="record_id" value="${item.id}"><label>Nama item<input name="name" value="${escapeHtml(item.name)}" required></label><label>Deskripsi<input name="description" value="${escapeHtml(item.description || '')}" required></label><label>URL foto<input name="image" type="url" value="${escapeHtml(item.image || '')}"></label><div class="form-two"><label>Harga (Rp)<input name="price" type="number" value="${item.price}" required></label><label>Status<select name="active"><option value="true" ${item.active !== false ? 'selected' : ''}>Aktif</option><option value="false" ${item.active === false ? 'selected' : ''}>Nonaktif</option></select></label></div>${item.item_type === 'PRODUCT' ? `<div class="form-two"><label>Stok<input name="stock" type="number" value="${item.stock}" min="0"></label><label>Stok minimum<input name="min_stock" type="number" value="${item.min_stock}" min="0"></label></div>` : ''}<button class="button button-dark button-full" type="submit">Simpan perubahan <span>↗</span></button></form>`;
  document.getElementById('flow-dialog').showModal();
  simplifyUiSymbols(document.getElementById('flow-dialog'));
}
function editCustomerAddress(customer) {
  const content = document.getElementById('dialog-content');
  content.innerHTML = `<p class="eyebrow">DATA PELANGGAN</p><h2>Alamat <em>${escapeHtml(customer.full_name)}</em></h2><form id="customer-address-form" class="dialog-form"><input type="hidden" name="customer_id" value="${escapeHtml(customer.id)}"><label>Alamat pelanggan<textarea name="address" rows="3" required>${escapeHtml(customer.address || '')}</textarea></label><button class="button button-dark button-full" type="submit">Simpan alamat</button></form>`;
  document.getElementById('flow-dialog').showModal();
}

document.addEventListener('click', async event => {
  const serviceFilterButton = event.target.closest('[data-service-filter]');
  if (serviceFilterButton) {
    serviceFilter = serviceFilterButton.dataset.serviceFilter;
    document.querySelectorAll('[data-service-filter]').forEach(button => {
      const selected = button.dataset.serviceFilter === serviceFilter;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('[data-service-group]').forEach(group => {
      group.hidden = serviceFilter !== 'all' && group.dataset.serviceGroup !== serviceFilter;
    });
    return;
  }
  const productFilterButton = event.target.closest('[data-product-filter]');
  if (productFilterButton) {
    productFilter = productFilterButton.dataset.productFilter;
    document.querySelectorAll('[data-product-filter]').forEach(button => {
      const selected = button.dataset.productFilter === productFilter;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('[data-product-category]').forEach(card => {
      card.hidden = productFilter !== 'all' && card.dataset.productCategory !== productFilter;
    });
    return;
  }
  const historyFilterButton = event.target.closest('[data-history-filter]');
  if (historyFilterButton) {
    historyFilter = historyFilterButton.dataset.historyFilter;
    const results = document.getElementById('history-results');
    if (results) renderHistoryResultsInto(results, historyRecords);
    return;
  }
  if (event.target.closest('[data-action="print-history"]')) {
    window.print();
    return;
  }
  const packageButton = event.target.closest('[data-self-service-type]');
  if (packageButton) {
    openDialog('self-service');
    const vehicleType = document.querySelector('#dialog-content [name="vehicle_type"]');
    if (vehicleType) {
      vehicleType.value = packageButton.dataset.selfServiceType;
      vehicleType.dispatchEvent(new Event('change', { bubbles: true }));
    }
    return;
  }
  const cancelButton = event.target.closest('[data-cancel-booking]');
  if (cancelButton) {
    cancelButton.disabled = true;
    try {
      await rpcRequest('cancel_transaction', {
        p_transaction_id: cancelButton.dataset.cancelBooking,
        p_search: cancelButton.dataset.cancelSearch
      });
      showToast('Booking dibatalkan. Periksa riwayat untuk status pengembalian dana.');
      document.getElementById('history-search')?.requestSubmit();
    } catch (error) {
      cancelButton.disabled = false;
      showToast(error.message || 'Booking belum dapat dibatalkan.', 'error');
    }
    return;
  }
  const refundButton = event.target.closest('[data-refund-complete]');
  if (refundButton) {
    const tx = db.transactions.find(item => item.id === refundButton.dataset.refundComplete);
    if (!tx || tx.refund_status !== 'PENDING') return;
    refundButton.disabled = true;
    try {
      const updated = await rpcRequest('complete_transaction_refund', { p_transaction_id: tx.id });
      if (!updated || updated.refund_status !== 'COMPLETED' || updated.payment_status !== 'REFUNDED') {
        throw new Error('Status pengembalian dana belum tersimpan.');
      }
      Object.assign(tx, updated);
      activateAdminTab('transactions');
      showToast('Pengembalian dana dicatat selesai. Pastikan dana sudah dikembalikan melalui penyedia pembayaran.');
    } catch (error) {
      refundButton.disabled = false;
      showToast(error.message || 'Status pengembalian dana belum dapat diperbarui.', 'error');
    }
    return;
  }
  const paymentButton = event.target.closest('[data-payment-paid]');
  if (paymentButton) {
    const tx = db.transactions.find(item => item.id === paymentButton.dataset.paymentPaid);
    if (!tx || tx.payment_status !== 'PENDING') return;
    paymentButton.disabled = true;
    try {
      const updated = await rpcRequest('confirm_transaction_payment', { p_transaction_id: tx.id });
      if (!updated || updated.payment_status !== 'PAID') {
        throw new Error('Status pembayaran belum tersimpan.');
      }
      Object.assign(tx, updated);
      activateAdminTab('transactions');
      showToast(`${tx.code} dikonfirmasi lunas.`);
    } catch (error) {
      paymentButton.disabled = false;
      showToast(error.message || 'Status pembayaran belum dapat diperbarui.', 'error');
    }
    return;
  }
  const nav = event.target.closest('[data-nav]');
  if (nav) { event.preventDefault(); setPage(nav.dataset.nav); return; }
  const service = event.target.closest('[data-service]');
  if (service) {
    const dialog = document.getElementById('flow-dialog');
    if (dialog.open) dialog.close();
    openDialog('booking', service.dataset.service);
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action) {
    if (action === 'close-dialog') document.getElementById('flow-dialog').close();
    else if (action === 'logout') { document.getElementById('flow-dialog').open && document.getElementById('flow-dialog').close(); logoutAdmin(); }
    else if (action === 'retry-data') bootstrapSupabase();
    else if (action === 'retry-admin-data') openAdmin().catch(() => {});
    else if (action === 'all-services') {
      page = 'home';
      render();
      document.getElementById('services')?.scrollIntoView({ behavior: 'instant' });
    }
    else if (['booking', 'walkin', 'self-service-book', 'cart', 'settings'].includes(action)) {
      const dialog = document.getElementById('flow-dialog');
      if (dialog.open && ['booking', 'self-service-book'].includes(action)) dialog.close();
      openDialog(action === 'booking' ? 'booking-choice' : action === 'self-service-book' ? 'self-service' : action);
    }
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
  const customerAddressButton = event.target.closest('[data-edit-customer-address]');
  if (customerAddressButton) editCustomerAddress(db.customers.find(customer => customer.id === customerAddressButton.dataset.editCustomerAddress));
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
        showToast(error.message || 'Dashboard belum dapat dimuat. Silakan coba lagi.', 'error');
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
    const results = document.getElementById('history-results');
    historyFilter = 'all';
    try {
      const records = await rpcRequest('lookup_transaction_history', { p_search: query });
      if (results?.isConnected) renderHistoryResultsInto(results, records || []);
    } catch (error) {
      if (results?.isConnected) results.innerHTML = `<div class="empty-state"><h3>Riwayat belum dapat dimuat.</h3><p>${escapeHtml(error.message)}</p></div>`;
    }
  }
  if (event.target.id === 'transaction-form') { event.preventDefault(); const submit = event.target.querySelector('[type="submit"]'); submit.disabled = true; try { await submitService(event.target); } catch (error) { showToast(error.message, 'error'); submit.disabled = false; } }
  if (event.target.id === 'product-checkout-form') {
    event.preventDefault();
    const submit = event.target.querySelector('[type="submit"]');
    submit.disabled = true;
    try { await submitProducts(event.target); }
    catch (error) { showToast(error.message, 'error'); if (submit.isConnected) submit.disabled = false; }
  }
  if (event.target.id === 'customer-address-form') {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const customer = db.customers.find(item => item.id === data.customer_id);
    if (!customer) { showToast('Data pelanggan tidak ditemukan.', 'error'); return; }
    try {
      await patchRow('customers', customer.id, { address: String(data.address || '').trim() });
      customer.address = String(data.address || '').trim();
      document.getElementById('flow-dialog').close();
      activateAdminTab('customers');
      showToast('Alamat pelanggan tersimpan.');
    } catch (error) {
      showToast(error.message || 'Alamat belum dapat disimpan.', 'error');
    }
  }
  if (event.target.id === 'catalog-form') {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const item = { id: crypto.randomUUID(), ...data, type: data.type || null, price: Number(data.price), duration: Number(data.duration), stock: Number(data.stock), min_stock: Number(data.min_stock), active: true, image: data.image || (data.item_type === 'PRODUCT' ? PHOTOS.detailing : PHOTOS.car) };
    if (isPickupAddon(item)) { showToast('Add-on antar-jemput tidak lagi tersedia.', 'error'); return; }
    try { await upsertRow('services_products', item); db.services_products.push(item); syncServiceCatalog(); document.getElementById('flow-dialog').close(); activateAdminTab('catalog'); showToast('Item ditambahkan ke katalog.'); }
    catch (error) { showToast(error.message, 'error'); }
  }
  if (event.target.id === 'catalog-edit-form') {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    const item = db.services_products.find(product => product.id === data.record_id);
    if (!item || isPickupAddon(item)) { showToast('Add-on antar-jemput tidak lagi tersedia.', 'error'); return; }
    const updated = { ...item, name: data.name, description: data.description, image: data.image || item.image, price: Number(data.price), active: data.active === 'true' };
    if (isPickupAddon(updated)) { showToast('Add-on antar-jemput tidak lagi tersedia.', 'error'); return; }
    if (data.stock !== undefined) { updated.stock = Number(data.stock); updated.min_stock = Number(data.min_stock); }
    try { await patchRow('services_products', item.id, updated); Object.assign(item, updated); syncServiceCatalog(); document.getElementById('flow-dialog').close(); activateAdminTab('catalog'); showToast('Perubahan katalog tersimpan.'); }
    catch (error) { showToast(error.message, 'error'); }
  }
});
document.addEventListener('change', async event => {
  if (event.target.matches('[data-queue-id]')) {
    const tx = db.transactions.find(item => item.id === event.target.dataset.queueId);
    const current = tx && normalizeOperationalTransaction(tx);
    if (!tx || !isRevenueTransaction(current) || current.transaction_status === 'BOOKED') {
      if (tx) event.target.value = tx.queue_status;
      return;
    }
    const changes = { queue_status: event.target.value, transaction_status: event.target.value === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE' };
    try { await patchRow('transactions', tx.id, changes); Object.assign(tx, changes); activateAdminTab('queue'); showToast(`${tx.code} dipindahkan ke ${tx.queue_status.toLowerCase()}.`); }
    catch (error) { event.target.value = tx.queue_status; showToast(error.message, 'error'); }
  }
});
document.getElementById('admin-shortcut').addEventListener('click', () => setPage('admin'));
document.getElementById('mobile-menu').addEventListener('click', () => document.querySelector('.main-nav').classList.toggle('is-open'));
bootstrapSupabase();
render();
window.setInterval(async () => {
  if (!databaseConnected || publicRefreshInProgress || document.visibilityState !== 'visible') return;
  publicRefreshInProgress = true;
  try {
    if (page === 'self-service') {
      await loadPublicData();
      if (page === 'self-service') render();
    } else if (page === 'admin' && adminUser) {
      const currentTab = activeAdminTab;
      await loadAdminData();
      if (page === 'admin' && adminUser) {
        render();
        if (currentTab !== 'overview') activateAdminTab(currentTab);
      }
    }
  } catch (_) {
  } finally {
    publicRefreshInProgress = false;
  }
}, 30000);
}