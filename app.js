function normalizePhone(value = '') {
  const digits = String(value || '').replace(/\D+/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}
function toSupabasePhone(value = '') {
  const normalized = normalizePhone(value);
  if (!normalized.startsWith('62') || normalized.length < 10 || normalized.length > 15) {
    throw new Error('Gunakan nomor HP Indonesia yang valid.');
  }
  return `+${normalized}`;
}
function verifiedPhoneMatchesInput(verifiedPhone, inputPhone) {
  return !!verifiedPhone && normalizePhone(verifiedPhone) === normalizePhone(inputPhone);
}
function hasCustomerPhoneChanged(previousPhone, nextPhone) {
  return !!previousPhone && normalizePhone(previousPhone) !== normalizePhone(nextPhone);
}
function parseJakartaDateTime(dateString, timeString) {
  if (!dateString || !timeString) return new Date();
  return new Date(`${dateString}T${timeString}:00+07:00`);
}
function getWibDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23'
  }).formatToParts(date);
  return Object.fromEntries(parts.filter(part => part.type !== 'literal').map(part => [part.type, part.value]));
}
function isStudioOpenAt(date = new Date()) {
  const parts = getWibDateParts(date);
  const minuteOfDay = Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60;
  return minuteOfDay >= 8 * 60
    && minuteOfDay <= 21 * 60;
}
function getMaxAllowedTransactionDate(now = new Date()) {
  const parts = getWibDateParts(now);
  return `${parts.year}-${parts.month}-${parts.day}`;
}
function assertStudioOpenAt(date = new Date()) {
  if (!isStudioOpenAt(date)) {
    throw new Error('Transaksi hanya dapat dibuat pukul 08.00–21.00 WIB.');
  }
}
function validateTransactionSchedule(dateString, timeString, durationMinutes = 0, now = new Date(), allowFuture = false) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString || ''))
    || (() => {
      const parts = getWibDateParts(new Date(`${dateString}T12:00:00+07:00`));
      return `${parts.year}-${parts.month}-${parts.day}` !== dateString;
    })()) {
    throw new Error('Tanggal transaksi tidak valid.');
  }
  if (dateString > getMaxAllowedTransactionDate(now)) {
    throw new Error('Tanggal transaksi tidak boleh melewati hari ini.');
  }
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(String(timeString || ''));
  if (!timeMatch) throw new Error('Jam transaksi tidak valid.');
  const minuteOfDay = Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
  if (minuteOfDay < 8 * 60 || minuteOfDay > 21 * 60) {
    throw new Error('Jam transaksi harus berada di antara 08.00–21.00 WIB.');
  }
  if (!allowFuture && parseJakartaDateTime(dateString, timeString) > now) {
    throw new Error('Transaksi tidak boleh melebihi waktu saat ini.');
  }
  const duration = Number(durationMinutes);
  if (!Number.isFinite(duration) || duration < 0 || minuteOfDay + duration > 21 * 60) {
    throw new Error('Transaksi layanan harus selesai paling lambat pukul 21.00 WIB.');
  }
  return true;
}
function assertServiceScheduleAvailable(durationMinutes, now = new Date()) {
  assertStudioOpenAt(now);
  const parts = getWibDateParts(now);
  const startMinute = Number(parts.hour) * 60 + Number(parts.minute) + Number(parts.second) / 60;
  if (startMinute + Number(durationMinutes) > 21 * 60) {
    throw new Error('Transaksi layanan harus selesai paling lambat pukul 21.00 WIB.');
  }
  validateTransactionSchedule(
    getJakartaDateString(now),
    getJakartaTimeString(now),
    durationMinutes,
    now,
    true
  );
}
function mergePersistedTransaction(transaction, savedTransaction) {
  if (savedTransaction && typeof savedTransaction === 'object') Object.assign(transaction, savedTransaction);
  return transaction;
}
function removeTransactionFromState(transactions = [], transactionId) {
  return transactions.filter(transaction => transaction.id !== transactionId);
}
function validateServicePaymentMethod(paymentMethod, transactionType) {
  if (!['CASH', 'QRIS', 'E_WALLET', 'CARD'].includes(paymentMethod)) throw new Error('Pilih metode pembayaran.');
  if (transactionType === 'BOOKING' && paymentMethod === 'CASH') throw new Error('Self-Service wajib menggunakan metode bayar digital.');
  return paymentMethod;
}
function sanitizeQuantity(value) {
  return Math.max(1, parseInt(value, 10) || 1);
}
function paymentStatusForMethod(paymentMethod, selectedStatus = 'PENDING') {
  if (selectedStatus === 'REFUNDED') return 'REFUNDED';
  return ['QRIS', 'E_WALLET', 'TRANSFER', 'CARD'].includes(String(paymentMethod || '').toUpperCase()) ? 'PAID' : selectedStatus;
}
function safeRows(rows) {
  return Array.isArray(rows) ? rows.filter(row => row && typeof row === 'object') : [];
}
function finiteNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}
function getServiceDuration(serviceName, fallback = 0) {
  const key = String(serviceName || '').trim().toLowerCase();
  const durations = {
    'self-service motorcycle': 20,
    'svc-self-moto': 20,
    'self-service car': 30,
    'svc-self-car': 30,
    'professional motorcycle wash': 35,
    'svc-moto': 35,
    'professional car wash': 50,
    'svc-car': 50
  };
  return durations[key] || Math.max(0, finiteNumber(fallback));
}
function normalizeAdminSnapshot(snapshot = {}) {
  const customers = safeRows(snapshot?.customers).map(customer => ({
    ...customer,
    full_name: String(customer.full_name || customer.name || ''),
    phone: String(customer.phone || ''),
    email: String(customer.email || ''),
    address: String(customer.address || '')
  }));
  const vehicles = safeRows(snapshot?.vehicles).map(vehicle => ({
    ...vehicle,
    plate: String(vehicle.plate || vehicle.plate_number || vehicle.vehicle_plate || vehicle.id || '-'),
    model: String(vehicle.model || ''),
    type: vehicle.type || vehicle.vehicle_type || null
  }));
  const customersById = new Map(customers.map(customer => [customer.id, customer]));
  const vehiclesById = new Map(vehicles.map(vehicle => [vehicle.id, vehicle]));
  const transactions = safeRows(snapshot?.transactions).map(transaction => {
    const customerRelationValue = transaction.customers;
    const vehicleRelationValue = transaction.vehicles;
    const customerRelation = Array.isArray(customerRelationValue) ? customerRelationValue[0] : customerRelationValue;
    const vehicleRelation = Array.isArray(vehicleRelationValue) ? vehicleRelationValue[0] : vehicleRelationValue;
    const customer = customersById.get(transaction.customer_id);
    const vehicle = vehiclesById.get(transaction.vehicle_id);
    const transactionDate = transaction.created_at ? new Date(transaction.created_at) : null;
    const dateParts = transactionDate && !Number.isNaN(transactionDate.getTime())
      ? getWibDateParts(transactionDate) : null;
    const itemType = transaction.item_type === 'PRODUCT' || transaction.transaction_type === 'SHOP'
      ? 'PRODUCT' : 'SERVICE';
    const itemName = String(transaction.item_name || transaction.item_id || (itemType === 'PRODUCT' ? 'Produk' : 'Layanan cuci'));
    const serviceDuration = itemType === 'SERVICE'
      ? getServiceDuration(itemName, transaction.duration_minutes) : Math.max(0, finiteNumber(transaction.duration_minutes));
    const paymentStatus = isPaidTransaction(transaction) ? 'PAID'
      : String(transaction.payment_status || transaction.status || 'PENDING').toUpperCase();
    const transactionStatus = String(transaction.transaction_status || 'PENDING').toUpperCase();
    const refundStatus = String(transaction.refund_status || 'NONE').toUpperCase();
    return {
      ...transaction,
      item_type: itemType,
      item_name: itemName,
      amount: finiteNumber(transaction.amount),
      quantity: sanitizeQuantity(transaction.quantity),
      duration_minutes: serviceDuration,
      payment_status: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'].includes(paymentStatus) ? paymentStatus : 'PENDING',
      transaction_status: ['PENDING', 'BOOKED', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED'].includes(transactionStatus) ? transactionStatus : 'PENDING',
      refund_status: ['NONE', 'PENDING', 'COMPLETED'].includes(refundStatus) ? refundStatus : 'NONE',
      customer_name: String(transaction.customer_name || customerRelation?.full_name || customerRelation?.name
        || customer?.full_name || transaction.notes || 'Pelanggan'),
      vehicle_plate: String(transaction.vehicle_plate || vehicleRelation?.plate_number || vehicleRelation?.plate
        || vehicle?.plate || transaction.vehicle_id || '-'),
      booking_date: transaction.booking_date || dateParts && `${dateParts.year}-${dateParts.month}-${dateParts.day}` || '',
      booking_time: transaction.booking_time || dateParts && `${dateParts.hour}:${dateParts.minute}` || '',
      shipping_fee: Math.max(0, finiteNumber(transaction.shipping_fee))
    };
  });
  const servicesProducts = safeRows(snapshot?.services_products).map(item => ({
    ...item,
    name: String(item.name || item.id || 'Item'),
    description: String(item.description || ''),
    price: Math.max(0, finiteNumber(item.price)),
    duration: item.item_type === 'SERVICE'
      ? getServiceDuration(item.name || item.id, Math.max(1, finiteNumber(item.duration, 1)))
      : Math.max(0, finiteNumber(item.duration)),
    stock: Math.max(0, finiteNumber(item.stock)),
    min_stock: Math.max(0, finiteNumber(item.min_stock))
  }));
  const itemIds = new Set(servicesProducts.map(item => item.id));
  for (const transaction of transactions) {
    if (!transaction.item_id || itemIds.has(transaction.item_id)) continue;
    const type = transaction.vehicle_id ? vehiclesById.get(transaction.vehicle_id)?.type || null : null;
    servicesProducts.push({
      id: transaction.item_id,
      item_type: transaction.item_type,
      name: transaction.item_name,
      description: '',
      category: '',
      type,
      price: transaction.amount,
      duration: transaction.duration_minutes,
      stock: 0,
      min_stock: 0,
      active: false
    });
    itemIds.add(transaction.item_id);
  }
  return { customers, vehicles, services_products: servicesProducts, transactions };
}
function formatServiceTimeRange(startTime, durationMinutes) {
  const match = /^(\d{2}):(\d{2})/.exec(String(startTime || ''));
  if (!match) return '';
  const start = Number(match[1]) * 60 + Number(match[2]);
  const end = start + Math.max(0, finiteNumber(durationMinutes));
  const format = minutes => `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
  return `${format(start)} - ${format(end)}`;
}
function formatTransactionTime(transaction = {}) {
  if (transaction.item_type !== 'SERVICE') return String(transaction.booking_time || '');
  return formatServiceTimeRange(
    transaction.booking_time,
    getServiceDuration(transaction.item_name || transaction.item_id, transaction.duration_minutes)
  ) || String(transaction.booking_time || '');
}
function isValidIndonesianPlate(value = '') {
  const normalized = String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return /^[A-Z]{1,2}[0-9]{1,4}[A-Z]{1,3}$/.test(normalized);
}
function isValidRequestId(value = '') {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}
function productShippingFee(method, isFeeCarrier = true) {
  if (method === 'PICKUP') return 0;
  if (method === 'COURIER') return isFeeCarrier ? 10000 : 0;
  throw new Error('Pilih metode pemenuhan produk.');
}
const COURIER_FLAT_RATE = 10000;
function calculateProductAmount(unitPrice, quantity, shippingFee = 0) {
  if (!Number.isSafeInteger(Number(unitPrice)) || Number(unitPrice) < 0
    || !Number.isSafeInteger(Number(quantity)) || Number(quantity) < 1
    || ![0, COURIER_FLAT_RATE].includes(Number(shippingFee))) {
    throw new Error('Nominal produk tidak valid.');
  }
  const amount = Number(unitPrice) * Number(quantity) + Number(shippingFee);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Nominal produk tidak valid.');
  return amount;
}
function recognizedRevenueAmount(transaction = {}) {
  const amount = Number(transaction.amount) || 0;
  const shippingFee = transaction.item_type === 'PRODUCT' ? Number(transaction.shipping_fee) || 0 : 0;
  return Math.max(0, amount - shippingFee);
}
function shippingRevenueAmount(transaction = {}) {
  return transaction.item_type === 'PRODUCT' ? Math.max(0, Number(transaction.shipping_fee) || 0) : 0;
}
function collectedAmount(transaction = {}) {
  return recognizedRevenueAmount(transaction) + shippingRevenueAmount(transaction);
  }
function isPaidTransaction(transaction = {}) {
  return [transaction.payment_status, transaction.status]
    .some(status => String(status || '').toUpperCase() === 'PAID');
}
function isRevenueTransaction(transaction = {}) {
  const transactionStatus = String(transaction.transaction_status || '').toUpperCase();
  const refundStatus = String(transaction.refund_status || 'NONE').toUpperCase();
  return isPaidTransaction(transaction)
    && !['CANCELLED', 'EXPIRED'].includes(transactionStatus)
    && !['PENDING', 'COMPLETED'].includes(refundStatus);
}
function calculateFinancialSummary(transactions = [], catalog = []) {
  const paid = safeRows(transactions).filter(isRevenueTransaction);
  const services = paid.filter(tx => tx.item_type === 'SERVICE');
  const retail = paid.filter(tx => tx.item_type === 'PRODUCT');
  const serviceRevenue = services.reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0);
  const productRevenue = retail.reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0);
  const shippingRevenue = paid.reduce((sum, tx) => sum + shippingRevenueAmount(tx), 0);
  const retailCosts = retail.map(tx => {
    const snapshot = Number(tx.cogs_amount);
    const hasSnapshot = tx.cogs_amount !== null && tx.cogs_amount !== undefined
      && Number.isFinite(snapshot) && snapshot >= 0;
    return {
      amount: hasSnapshot ? snapshot : 0,
      recorded: hasSnapshot
    };
  });
  const cogs = retailCosts.reduce((sum, item) => sum + item.amount, 0);
  const grossRevenue = serviceRevenue + productRevenue;
  const cashCollected = grossRevenue + shippingRevenue;
  return {
    paid,
    serviceRevenue,
    productRevenue,
    shippingRevenue,
    grossRevenue,
    totalRevenue: grossRevenue,
    cashCollected,
    cogs,
    grossProfit: grossRevenue - cogs,
    productCount: retail.length,
    costRecordedCount: retailCosts.filter(item => item.recorded).length
  };
}
function calculateFinancialMetrics(transactions = []) {
  const summary = calculateFinancialSummary(transactions);
  return {
    totalRevenue: summary.grossRevenue,
    grossProfit: summary.grossProfit,
    paidTransactionCount: summary.paid.length,
    serviceRevenue: summary.serviceRevenue,
    productRevenue: summary.productRevenue,
    shippingRevenue: summary.shippingRevenue
  };
}
function checkServiceLifecycles(transactions = [], now = Date.now()) {
  const nowMs = now instanceof Date ? now.getTime() : new Date(now).getTime();
  if (!Number.isFinite(nowMs)) return safeRows(transactions);
  return safeRows(transactions).map(transaction => {
    if (transaction.item_type !== 'SERVICE') return transaction;
    const currentStatus = String(transaction.transaction_status || 'PENDING').toUpperCase();
    if (['CANCELLED', 'EXPIRED', 'COMPLETED'].includes(currentStatus)) return transaction;
    const startsAt = transaction.start_time
      ? new Date(transaction.start_time).getTime()
      : transaction.booking_date && transaction.booking_time
        ? parseJakartaDateTime(transaction.booking_date, transaction.booking_time).getTime()
        : NaN;
    if (!Number.isFinite(startsAt)) return transaction;
    const duration = Math.max(0, getServiceDuration(transaction.item_name || transaction.item_id, transaction.duration_minutes));
    const finishesAt = transaction.finished_at
      ? new Date(transaction.finished_at).getTime()
      : startsAt + duration * 60000;
    if (!Number.isFinite(finishesAt)) return transaction;
    let transactionStatus = currentStatus;
    let queueStatus = String(transaction.queue_status || 'WAITING').toUpperCase();
    if (isPaidTransaction(transaction)) {
      if (finishesAt <= nowMs) {
        transactionStatus = 'COMPLETED';
        queueStatus = 'COMPLETED';
      } else if (startsAt <= nowMs) {
        transactionStatus = 'ACTIVE';
        if (queueStatus === 'WAITING') queueStatus = 'WASHING';
      } else if (transaction.transaction_type === 'BOOKING' && currentStatus === 'PENDING') {
        transactionStatus = 'BOOKED';
      }
    } else if (transaction.transaction_type === 'BOOKING' && startsAt <= nowMs) {
      transactionStatus = 'EXPIRED';
      queueStatus = 'COMPLETED';
    }
    if (transactionStatus === currentStatus && queueStatus === String(transaction.queue_status || 'WAITING').toUpperCase()) {
      return transaction;
    }
    return { ...transaction, transaction_status: transactionStatus, queue_status: queueStatus };
  });
}
function isValidServiceOrderResponse(result, expected) {
  if (!result || typeof result !== 'object' || !expected) return false;
  const hasIdentity = ['id', 'code', 'customer_id', 'vehicle_id'].every(key =>
    typeof result[key] === 'string' && result[key].trim().length > 0
  );
  const validBay = Number.isInteger(result.bay_number) && result.bay_number >= 1 && result.bay_number <= 4;
  return hasIdentity
    && /^RS-\d{6}-[A-Z0-9]{8}$/.test(result.code)
    && result.item_id === expected.item_id
    && result.item_type === 'SERVICE'
    && result.transaction_type === expected.transaction_type
    && result.payment_method === expected.payment_method
    && Number.isSafeInteger(result.amount) && result.amount === expected.amount
    && /^\d{4}-\d{2}-\d{2}$/.test(result.booking_date || '')
    && /^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(result.booking_time || '')
    && Number.isSafeInteger(result.duration_minutes)
    && result.duration_minutes === expected.duration_minutes
    && result.payment_status === 'PAID'
    && result.transaction_status === expected.transaction_status
    && validBay;
}
function isValidDemoProductOrderResponse(result, expected) {
  return !!result && typeof result === 'object' && !!expected
    && ['id', 'code', 'customer_id'].every(key => typeof result[key] === 'string' && result[key].trim())
    && /^RS-\d{6}-[A-Z0-9]{8}$/.test(result.code)
    && result.item_id === expected.item_id
    && result.item_type === 'PRODUCT'
    && result.transaction_type === 'SHOP'
    && result.payment_method === expected.payment_method
    && result.fulfillment_method === expected.fulfillment_method
    && result.fulfillment_address === expected.fulfillment_address
    && result.shipping_fee === expected.shipping_fee
    && result.fulfillment_order_id === expected.fulfillment_order_id
    && result.quantity === expected.quantity
    && result.amount === expected.amount
    && result.payment_status === 'PAID'
    && result.transaction_status === 'PENDING'
    && result.refund_status === 'NONE'
    && result.queue_status === 'WAITING'
    && result.vehicle_id === null
    && result.bay_number === null
    && result.duration_minutes === 0
    && /^\d{4}-\d{2}-\d{2}$/.test(result.booking_date || '')
    && /^\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?$/.test(result.booking_time || '');
}
function normalizeTransactionStatusForDisplay(transaction = {}) {
  const status = String(transaction.transaction_status || 'PENDING').toUpperCase();
  return status === 'PENDING' && String(transaction.payment_status || '').toUpperCase() === 'PAID'
    ? 'WAITING'
    : status;
}
function resolveCustomerIdentity({ name, phone, existingCustomers = [] }) {
  const trimmedName = String(name || '').trim();
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) return { customer: null, mismatch: true, reason: 'Phone required' };
  const matches = existingCustomers.filter(customer => normalizePhone(customer.phone) === cleanPhone);
  if (!matches.length) return { customer: null, mismatch: false, reason: 'No customer match' };
  const candidate = matches[0];
  if (trimmedName && candidate.full_name && candidate.full_name.trim().toLowerCase() !== trimmedName.toLowerCase()) {
    return { customer: null, mismatch: true, reason: 'Customer name mismatch' };
  }
  return { customer: candidate, mismatch: false, reason: 'Matched customer' };
}
function isValidCustomerCapabilityToken(token) {
  return typeof token === 'string' && /^[A-Za-z0-9_-]{43}$/.test(token);
}
function requireCustomerCapabilityToken(token) {
  if (!token) throw new Error('Kunci akses customer tidak tersedia pada browser ini. Booking dibuat pada browser lain tidak dapat diambil tanpa penautan Admin.');
  if (!isValidCustomerCapabilityToken(token)) throw new Error('Kunci akses customer tidak valid.');
  return token;
}
function sanitizeCart(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).flatMap(([id, row]) => {
    const quantity = Number(row?.quantity);
    return id && Number.isSafeInteger(quantity) && quantity > 0 ? [[id, { quantity }]] : [];
  }));
}
function validatePublicDataResponse(products, washCount, bays) {
  if (!Array.isArray(products) || products.some(item => !item || typeof item.id !== 'string'
    || !['SERVICE', 'PRODUCT'].includes(item.item_type)
    || !Number.isSafeInteger(item.price) || item.price < 0 || item.active !== true
    || (item.item_type === 'PRODUCT' && (!PRODUCT_CATALOG_ID_SET.has(item.id)
      || !Number.isSafeInteger(item.stock) || item.stock < 0))
    || (item.item_type === 'SERVICE' && (!Number.isSafeInteger(item.duration) || item.duration < 1)))) {
    throw new Error('Katalog Supabase mengembalikan data yang tidak valid.');
  }
  const productRows = products.filter(item => item.item_type === 'PRODUCT');
  if (productRows.length !== PRODUCT_CATALOG_IDS.length
    || PRODUCT_CATALOG_IDS.some(id => productRows.filter(item => item.id === id).length !== 1)
    || new Set(products.map(item => item.id)).size !== products.length
    || !products.some(item => item.item_type === 'SERVICE')) {
    throw new Error('Katalog Supabase harus memuat enam produk resmi dan layanan cuci aktif.');
  }
  if (!Number.isSafeInteger(washCount) || washCount < 0) {
    throw new Error('RPC jumlah kendaraan mengembalikan tipe data yang tidak valid.');
  }
  if (!Array.isArray(bays) || bays.length !== 4) {
    throw new Error('RPC status bay harus mengembalikan tepat empat bay.');
  }
  const seenBays = new Set();
  for (const bay of bays) {
    if (!bay || !Number.isInteger(bay.bay_number) || bay.bay_number < 1 || bay.bay_number > 4
      || seenBays.has(bay.bay_number)
      || !['AVAILABLE', 'RESERVED', 'OCCUPIED'].includes(bay.bay_status)
      || !Number.isSafeInteger(bay.duration_minutes) || bay.duration_minutes < 0
      || !Number.isSafeInteger(bay.minutes_remaining) || bay.minutes_remaining < 0
      || (bay.vehicle_type !== null && !['CAR', 'MOTOR'].includes(bay.vehicle_type))) {
      throw new Error('RPC status bay mengembalikan data yang tidak valid.');
    }
    seenBays.add(bay.bay_number);
  }
  return { products, washCount, bays };
}
function safeSupabaseErrorCode(text = '') {
  try {
    const body = JSON.parse(text);
    const code = String(body.code || body.error_code || '');
    return /^[A-Za-z0-9_.-]{1,64}$/.test(code) ? code : '';
  } catch (_) { return ''; }
}
function sanitizeSupabaseDiagnostic(value = '') {
  return String(value || '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\bBearer\s+[^\s,;]+/gi, 'Bearer [redacted]')
    .replace(/\b(?:sb_(?:publishable|secret)_)[A-Za-z0-9_-]+|\beyJ[A-Za-z0-9._-]{20,}/g, '[redacted token]')
    .replace(/\b[\w.+-]+@[\w.-]+\.[A-Z]{2,}\b/gi, '[redacted email]')
    .replace(/\+?(?:62|0)[\d\s().-]{8,}\d/g, '[redacted phone]')
    .replace(/(\bKey\s+\([^)]*\)\s*=\s*)\([^)]*\)/gi, '$1[redacted]')
    .replace(/(Failing row contains)\s*\([\s\S]*$/i, '$1 ([redacted row])')
    .trim()
    .slice(0, 240);
}
function safeSupabaseErrorDetails(text = '') {
  try {
    const body = JSON.parse(text);
    return {
      code: safeSupabaseErrorCode(text),
      message: sanitizeSupabaseDiagnostic(body.message),
      details: sanitizeSupabaseDiagnostic(body.details),
      hint: sanitizeSupabaseDiagnostic(body.hint)
    };
  } catch (_) {
    return { code: '', message: '', details: '', hint: '' };
  }
}
function isLocalDevelopment() {
  return typeof window !== 'undefined'
    && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);
}
function supabaseHttpError(label, status, responseText = '') {
  const errorCode = safeSupabaseErrorCode(responseText);
  let message;
  if (status === 401) message = 'Supabase menolak autentikasi (HTTP 401). Pastikan URL dan publishable key berasal dari project yang sama.';
  else if (status === 403) message = 'Supabase menolak akses (HTTP 403). Periksa grant, RLS, dan role Admin.';
  if (status === 404) {
    const rpcName = label.match(/\/rpc\/([A-Za-z0-9_]+)/)?.[1];
    message = /^\d{5}$/.test(errorCode)
      ? `${label} gagal saat eksekusi SQL (HTTP 404 · SQLSTATE ${errorCode}).`
      : rpcName
        ? `RPC ${rpcName} tidak ditemukan (HTTP 404). Periksa urutan migrasi dan schema cache Supabase${errorCode ? ` · ${errorCode}` : ''}.`
        : `Resource Supabase tidak ditemukan (HTTP 404). Periksa tabel dan migration${errorCode ? ` · ${errorCode}` : ''}.`;
  }
  if (!message && status === 429) message = 'Supabase membatasi terlalu banyak permintaan (HTTP 429). Tunggu sebentar lalu coba lagi.';
  if (!message && status >= 500) message = `Supabase sedang bermasalah (HTTP ${status}). Coba lagi sebentar lagi.`;
  if (!message) message = `${label} ditolak oleh Supabase (HTTP ${status})${errorCode ? ` · ${errorCode}` : ''}. Periksa kontrak RPC dan data yang dikirim.`;
  if (isLocalDevelopment()) {
    const details = safeSupabaseErrorDetails(responseText);
    const codeDetail = details.code && !message.includes(details.code)
      ? `${/^\d{5}$/.test(details.code) ? 'SQLSTATE' : 'Kode'} ${details.code}`
      : '';
    const diagnostic = [codeDetail, details.message, details.details, details.hint].filter(Boolean).join(' · ');
    if (diagnostic) message += ` Detail server (lokal): ${diagnostic}`;
  }
  return message;
}
function serviceOrderErrorMessage(error) {
  if (error?.code === 'P0001' || /SQLSTATE P0001/.test(error?.message || '')) {
    return 'Nomor HP sudah terdaftar dengan nama berbeda. Gunakan nama yang terdaftar atau hubungi studio untuk memperbarui profil.';
  }
  return error?.message || 'Pesanan layanan belum dapat diproses. Silakan coba lagi.';
}
function countActiveQueueTransactions(records = []) {
  return records.filter(tx => tx?.item_type === 'SERVICE'
    && isRevenueTransaction(tx)
    && (tx.transaction_type !== 'BOOKING' || ['ACTIVE', 'COMPLETED'].includes(String(tx.transaction_status || '').toUpperCase()))
    && ['WAITING', 'WASHING', 'FINISHING'].includes(String(tx.queue_status || 'WAITING').toUpperCase())).length;
}
function filterQueueTransactionsForDate(records = [], queueDate) {
  return records.filter(tx => tx?.item_type === 'SERVICE'
    && tx.booking_date === queueDate
    && isRevenueTransaction(tx)
    && (tx.transaction_type !== 'BOOKING' || ['ACTIVE', 'COMPLETED'].includes(String(tx.transaction_status || '').toUpperCase()))
    && ['WAITING', 'WASHING', 'FINISHING'].includes(String(tx.queue_status || 'WAITING').toUpperCase()));
}

function hasAdminRole(user) {
  return user?.app_metadata?.rinse_role === 'admin';
}

const PRODUCT_CATALOG_IDS = Object.freeze([
  'prd-cloth', 'prd-interior', 'prd-glass', 'prd-shampoo', 'prd-tire', 'prd-wax'
]);
const PRODUCT_CATALOG_ID_SET = new Set(PRODUCT_CATALOG_IDS);
const PRODUCT_CATALOG_VERSION = '20261025.1';
function migrateProductStorage(storage) {
  const readJson = key => {
    try { return JSON.parse(storage.getItem(key) || '{}'); } catch (_) { return {}; }
  };
  try {
    const cartKey = 'rinse-society-cart';
    const requestIdsKey = 'rinse-product-request-ids';
    const checkoutKey = 'rinse-product-checkout';
    const versionKey = 'rinse-product-catalog-version';
    const cart = sanitizeCart(readJson(cartKey));
    const requestIds = readJson(requestIdsKey);
    const checkout = readJson(checkoutKey);
    const storedVersion = storage.getItem(versionKey);
    const hasLegacyData = Object.keys(cart).some(id => !PRODUCT_CATALOG_ID_SET.has(id))
      || (requestIds && typeof requestIds === 'object' && !Array.isArray(requestIds)
        && Object.keys(requestIds).some(id => !PRODUCT_CATALOG_ID_SET.has(id)))
      || (!!checkout?.fee_item_id && !PRODUCT_CATALOG_ID_SET.has(checkout.fee_item_id));
    if ((storedVersion && storedVersion !== PRODUCT_CATALOG_VERSION) || hasLegacyData) {
      storage.removeItem(cartKey);
      storage.removeItem(requestIdsKey);
      storage.removeItem(checkoutKey);
      storage.setItem(versionKey, PRODUCT_CATALOG_VERSION);
      return;
    }
    const validCart = Object.fromEntries(Object.entries(cart).filter(([id]) => PRODUCT_CATALOG_ID_SET.has(id)));
    if (JSON.stringify(cart) !== JSON.stringify(validCart)) {
      storage.setItem(cartKey, JSON.stringify(validCart));
    }
    const validRequestIds = requestIds && typeof requestIds === 'object' && !Array.isArray(requestIds)
      ? Object.fromEntries(Object.entries(requestIds).filter(([id]) => PRODUCT_CATALOG_ID_SET.has(id)))
      : {};
    if (JSON.stringify(requestIds) !== JSON.stringify(validRequestIds)) {
      if (Object.keys(validRequestIds).length) storage.setItem(requestIdsKey, JSON.stringify(validRequestIds));
      else storage.removeItem(requestIdsKey);
    }
    if (storedVersion !== PRODUCT_CATALOG_VERSION) storage.setItem(versionKey, PRODUCT_CATALOG_VERSION);
  } catch (_) {}
}

if (typeof window === 'undefined') {
  const appExports = {
    normalizePhone,
    toSupabasePhone,
    getServiceDuration,
    calculateFinancialSummary,
    formatServiceTimeRange,
    formatTransactionTime,
    hasAdminRole,
    verifiedPhoneMatchesInput,
    hasCustomerPhoneChanged,
    mergePersistedTransaction,
    removeTransactionFromState,
    isPaidTransaction,
    isRevenueTransaction,
    calculateFinancialMetrics,
    checkServiceLifecycles,
    normalizeAdminSnapshot,
    validateServicePaymentMethod,
    productShippingFee,
    calculateProductAmount,
    recognizedRevenueAmount,
    shippingRevenueAmount,
    collectedAmount,
    isStudioOpenAt,
    validateTransactionSchedule,
    getMaxAllowedTransactionDate,
    isValidIndonesianPlate,
    isValidRequestId,
    sanitizeQuantity,
    paymentStatusForMethod,
    isValidServiceOrderResponse,
    isValidDemoProductOrderResponse,
    normalizeTransactionStatusForDisplay,
    countActiveQueueTransactions,
    filterQueueTransactionsForDate,
    resolveCustomerIdentity,
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
  };
  if (typeof module !== 'undefined') {
    module.exports = appExports;
  }
  if (require.main === module) {
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
  }
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
  'prd-shampoo': { name: 'Sampo Mobil pH Netral', category: 'CUCI & PERAWATAN', description: 'Sampo cuci bodi busa melimpah, aman digunakan sehari-hari tanpa merusak cat.', image: PHOTOS.shampoo },
  'prd-cloth': { name: 'Lap Microfiber Bodi & Kaca', category: 'PERLENGKAPAN', description: 'Kain lap halus berdaya serap tinggi, aman untuk bodi dan kaca tanpa meninggalkan goresan.', image: PHOTOS.microfiber },
  'prd-tire': { name: 'Semir Pengkilap Ban', category: 'PERLINDUNGAN', description: 'Semir ban untuk membuat warna hitam terlihat pekat, mengkilap, dan bersih tahan lama.', image: PHOTOS.tireShine },
  'prd-wax': { name: 'Pengkilap Bodi (Wax Spray)', category: 'PERLINDUNGAN', description: 'Semprotan pengkilap cat instan yang memberi efek daun talas agar air dan debu tidak mudah menempel.', image: PHOTOS.wax },
  'prd-interior': { name: 'Pembersih Interior & Jok', category: 'PERAWATAN INTERIOR', description: 'Cairan pembersih untuk mengangkat debu, noda makanan, dan kotoran pada jok serta dasbor.', image: PHOTOS.interior },
  'prd-glass': { name: 'Pembersih Kaca Mobil', category: 'PERAWATAN KACA', description: 'Membersihkan bercak air dan kotoran pada kaca kendaraan agar pandangan kembali bening.', image: PHOTOS.glass }
};

function catalogItem(item) {
  const copy = CATALOG_COPY[item.id] || {};
  const normalized = { ...item, ...copy, image: copy.image || item.image || '' };
  if (normalized.item_type === 'SERVICE' || ['REGULAR', 'SELF_SERVICE'].includes(String(normalized.category || '').toUpperCase())) {
    normalized.duration = getServiceDuration(normalized.name || normalized.id, normalized.duration);
  }
  return normalized;
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
const SUPABASE_URL = 'https://cvnzbfbzgmjlepbsjinl.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_vzeEcRxxXJaMfE7JyKWOeg_KLx8XqnH';
const SUPABASE_REQUEST_TIMEOUT_MS = 15000;
const AUTH_SESSION_KEY = 'rinse-admin-session';
const CART_KEY = 'rinse-society-cart';
const PRODUCT_REQUEST_IDS_KEY = 'rinse-product-request-ids';
const PRODUCT_CHECKOUT_KEY = 'rinse-product-checkout';
const CUSTOMER_CAPABILITIES_KEY = 'rinse-customer-capabilities';
const EMPTY_DB = { customers: [], vehicles: [], services_products: [], transactions: [] };
let db = structuredClone(EMPTY_DB);
let page = 'home';
migrateProductStorage(localStorage);
function readStoredCart() {
  try { return sanitizeCart(JSON.parse(localStorage.getItem(CART_KEY) || '{}')); }
  catch (_) { return {}; }
}
function readProductRequestIds() {
  try {
    const value = JSON.parse(localStorage.getItem(PRODUCT_REQUEST_IDS_KEY) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (_) { return {}; }
}
function getProductRequestId(productId) {
  const requestIds = readProductRequestIds();
  if (isValidRequestId(requestIds[productId])) return requestIds[productId];
  requestIds[productId] = crypto.randomUUID();
  localStorage.setItem(PRODUCT_REQUEST_IDS_KEY, JSON.stringify(requestIds));
  return requestIds[productId];
}
function clearProductRequestIds(productIds) {
  const requestIds = readProductRequestIds();
  for (const productId of productIds) delete requestIds[productId];
  if (Object.keys(requestIds).length) localStorage.setItem(PRODUCT_REQUEST_IDS_KEY, JSON.stringify(requestIds));
  else localStorage.removeItem(PRODUCT_REQUEST_IDS_KEY);
}
function readProductCheckoutState() {
  let value = {};
  try { value = JSON.parse(localStorage.getItem(PRODUCT_CHECKOUT_KEY) || '{}'); } catch (_) {}
  return {
    order_id: isValidRequestId(value.order_id) ? value.order_id : crypto.randomUUID(),
    fulfillment_method: ['PICKUP', 'COURIER'].includes(value.fulfillment_method) ? value.fulfillment_method : 'PICKUP',
    fulfillment_address: String(value.fulfillment_address || ''),
    fee_item_id: String(value.fee_item_id || ''),
    shipping_fee_paid: value.shipping_fee_paid === true
  };
}
function saveProductCheckoutState(value) {
  localStorage.setItem(PRODUCT_CHECKOUT_KEY, JSON.stringify(value));
}
let cart = readStoredCart();
let supabaseSession = readAuthSession();
let adminUser = null;
let databaseConnected = false;
let dataLoadState = 'loading';
let publicDataError = '';
let adminDataReady = false;
let adminDataState = 'loading';
let adminDataError = '';
let publicWashCount = 0;
let publicBays = [];
let publicRefreshInProgress = false;
let realtimeRefreshTimer = null;
let realtimeReconnectTimer = null;
let realtimeSocket = null;
let realtimeAuthToken = '';
let realtimeHeartbeatTimer = null;
let realtimeRef = 0;
let activeAdminTab = 'overview';
let serviceFilter = 'all';
let productFilter = 'all';
let catalogFilter = 'all';
let reportPeriod = 'month';

function isSupabaseConfigured() {
  return SUPABASE_URL.startsWith('https://') && SUPABASE_PUBLISHABLE_KEY.length > 20 && !SUPABASE_URL.includes('PASTE_') && !SUPABASE_PUBLISHABLE_KEY.includes('PASTE_');
}
function readAuthSession() {
  try { return JSON.parse(sessionStorage.getItem(AUTH_SESSION_KEY) || 'null'); } catch (_) { return null; }
}
function customerCapability(phone, create = false) {
  const normalizedPhone = normalizePhone(phone);
  if (normalizedPhone.length < 7) return null;
  let capabilities = {};
  try {
    const stored = JSON.parse(localStorage.getItem(CUSTOMER_CAPABILITIES_KEY) || '{}');
    if (stored && typeof stored === 'object' && !Array.isArray(stored)) capabilities = stored;
  } catch (_) {}
  const saved = capabilities[normalizedPhone];
  if (typeof saved?.customer_id === 'string' && saved.customer_id.length >= 8
    && isValidCustomerCapabilityToken(saved.owner_token)) return saved;
  if (!create) return null;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const ownerToken = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const credential = { customer_id: crypto.randomUUID(), owner_token: ownerToken };
  capabilities[normalizedPhone] = credential;
  localStorage.setItem(CUSTOMER_CAPABILITIES_KEY, JSON.stringify(capabilities));
  return credential;
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
  return ({ BOOKING: 'Layanan terjadwal', WALK_IN: 'Datang langsung', SHOP: 'Toko' })[value] || String(value || '').replaceAll('_', ' ');
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
function getJakartaDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
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
function addDaysToJakartaDate(dateString, offsetDays) {
  const date = new Date(`${dateString}T12:00:00+07:00`);
  date.setDate(date.getDate() + Number(offsetDays || 0));
  return getJakartaDateString(date);
}
function getVehicle(tx) {
  const vehicle = safeRows(db?.vehicles).find(item => item.id === tx?.vehicle_id);
  if (vehicle) return vehicle;
  const relation = tx?.vehicles && typeof tx.vehicles === 'object' ? tx.vehicles : null;
  const plate = tx?.vehicle_plate || relation?.plate_number || relation?.plate;
  if (!tx?.vehicle_id && !plate) return null;
  return {
    id: tx.vehicle_id || null,
    customer_id: tx.customer_id || null,
    type: relation?.type || tx?.vehicle_type || null,
    plate: String(plate || tx.vehicle_id || '-'),
    model: String(relation?.model || tx?.vehicle_model || '')
  };
}
function getCustomer(tx) {
  const customer = safeRows(db?.customers).find(item => item.id === tx?.customer_id);
  const relation = tx?.customers && typeof tx.customers === 'object' ? tx.customers : null;
  const displayName = tx?.customer_name || relation?.full_name || relation?.name || customer?.full_name || tx?.notes || 'Pelanggan';
  return { ...customer, full_name: String(displayName) };
}
function normalizeTransactionRecord(tx = {}) {
  const normalized = tx && typeof tx === 'object' ? { ...tx } : {};
  normalized.amount = finiteNumber(normalized.amount);
  normalized.quantity = sanitizeQuantity(normalized.quantity);
  normalized.duration_minutes = normalized.item_type === 'SERVICE'
    ? getServiceDuration(normalized.item_name || normalized.item_id, normalized.duration_minutes)
    : Math.max(0, finiteNumber(normalized.duration_minutes));
  normalized.shipping_fee = Math.max(0, finiteNumber(normalized.shipping_fee));
  const paymentStatus = isPaidTransaction(normalized) ? 'PAID'
    : String(normalized.payment_status || normalized.status || 'PENDING').toUpperCase();
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
function normalizeCatalogRecord(item = {}) {
  const durationFallback = item.item_type === 'SERVICE' ? 1 : 0;
  return {
    ...item,
    name: String(item.name || 'Item'),
    description: String(item.description || ''),
    price: Math.max(0, finiteNumber(item.price)),
    duration: item.item_type === 'SERVICE'
      ? getServiceDuration(item.name || item.id, Math.max(durationFallback, finiteNumber(item.duration, durationFallback)))
      : Math.max(durationFallback, finiteNumber(item.duration, durationFallback)),
    stock: Math.max(0, finiteNumber(item.stock)),
    min_stock: Math.max(0, finiteNumber(item.min_stock))
  };
}
function normalizeOperationalTransaction(tx = {}) {
  const normalized = normalizeTransactionRecord(tx);
  return checkServiceLifecycles([normalized])[0] || normalized;
}
function getOperationalTransactions(records = []) {
  return safeRows(records).map(tx => normalizeOperationalTransaction(tx));
}
function getOperationalQueueTransactions(records = [], queueDate = getJakartaDateString()) {
  return filterQueueTransactionsForDate(getOperationalTransactions(records), queueDate);
}
function statusLabel(value) {
  return ({ AVAILABLE: 'Tersedia', OCCUPIED: 'Digunakan', RESERVED: 'Dipesan', PAID: 'Lunas', PENDING: 'Belum Dibayar', FAILED: 'Gagal', REFUNDED: 'Pengembalian Dana', NONE: 'Tidak ada', COMPLETED: 'Selesai', BOOKED: 'Terkonfirmasi', ACTIVE: 'Sedang Berlangsung', CANCELLED: 'Dibatalkan', EXPIRED: 'Hangus', WAITING: 'Menunggu', WASHING: 'Dicuci', FINISHING: 'Tahap Akhir', CASH: 'Tunai', QRIS: 'QRIS', E_WALLET: 'Dompet digital', CARD: 'Kartu' })[String(value || '').toUpperCase()] || String(value || '').replaceAll('_', ' ');
}
function fulfillmentLabel(method) {
  return method === 'COURIER' ? 'Pengiriman Online / Kurir' : 'Ambil di Studio (Pick-up)';
}
function productFulfillmentDetails(transaction) {
  return `<small>Pemenuhan: ${escapeHtml(fulfillmentLabel(transaction.fulfillment_method))}</small>${transaction.fulfillment_method === 'COURIER' ? `<small>Alamat Pengiriman: ${escapeHtml(transaction.fulfillment_address || '')}</small>` : ''}<small>Ongkir: ${money(transaction.shipping_fee || 0)}</small>`;
}
function transactionStatusLabel(transaction) {
  return statusLabel(normalizeTransactionStatusForDisplay(transaction));
}
function statusBadge(value) { return `<span class="status status-${String(value).toLowerCase().replaceAll('_', '-')}">${statusLabel(value)}</span>`; }
function isBayTransactionCurrent(tx, now = Date.now()) {
  if (!tx?.booking_date || !tx?.booking_time) return false;
  const start = parseJakartaDateTime(tx.booking_date, tx.booking_time).getTime();
  const end = start + Math.max(Number(tx.duration_minutes) || 0, 0) * 60000;
  if (tx.transaction_status === 'ACTIVE') return start <= now && end > now;
  return ['BOOKED', 'PENDING'].includes(tx.transaction_status)
    && tx.booking_date === getJakartaDateString(new Date(now)) && end > now;
}
function bayMinutesLeft(tx) {
  const start = parseJakartaDateTime(tx.booking_date, tx.booking_time).getTime();
  return Math.max(0, Number(tx.duration_minutes) - Math.floor((Date.now() - start) / 60000));
}

function setPage(next) {
  page = next;
  render();
  window.scrollTo({ top: 0, behavior: 'smooth' });
  document.querySelector('.main-nav')?.classList.remove('is-open');
}
async function openAdmin() {
  if (supabaseSession) await restoreAdminSession();
  if (!hasAdminRole(adminUser)) {
    setPage('home');
    openDialog('admin-login');
    return;
  }
  activeAdminTab = 'overview';
  adminDataReady = false;
  adminDataState = 'loading';
  adminDataError = '';
  setPage('admin');
  try {
    await loadAdminData();
    subscribeToTransactionChanges();
    render();
  } catch (error) {
    adminDataState = 'error';
    adminDataError = error.message || 'Data dashboard belum dapat dimuat.';
    render();
  }
}
function polishUiLabels(root) {
  const finalUiLabel = value => value
    .replaceAll('CUCI MANDIRI', 'SELF-SERVICE')
    .replaceAll('Cuci Mandiri', 'Self-Service')
    .replaceAll('Cuci mandiri', 'Self-Service')
    .replaceAll('cuci mandiri', 'Self-Service')
    .replaceAll('LANDASAN LAYANAN', 'PROFESSIONAL WASH')
    .replaceAll('Semua layanan', 'Lihat pilihan')
    .replaceAll('Coba Self-Service', 'Mulai Self-Service')
    .replaceAll('Pilih paket sesi', 'Tinjau harga')
    .replaceAll('Mulai sesi dalam tiga langkah', 'Pesan Self-Service')
    .replaceAll('Booking tetap menunggu konfirmasi pembayaran sebelum sesi dapat dimulai.', 'Pembayaran simulasi berhasil dicatat setelah sesi tersimpan.')
    .replaceAll('booking belum mengaktifkan sesi sebelum pembayaran diverifikasi.', 'sesi dimulai setelah pembayaran simulasi berhasil dicatat.')
    .replaceAll('setelah booking tersimpan.', 'setelah order sesi tersimpan.')
    .replaceAll('Pilih salah satu dari empat bay universal untuk mobil atau sepeda motor, lalu tentukan waktu dan durasi cuci.', 'Pilih jenis kendaraan dan paket sesi. Sistem memilih waktu serta bay otomatis berdasarkan ketersediaan.')
    .replaceAll('Pilih kendaraan dan bay', 'Pilih jenis kendaraan')
    .replaceAll('Tentukan jenis kendaraan, salah satu dari empat bay, serta waktu kunjungan.', 'Waktu kunjungan dan bay ditentukan otomatis berdasarkan ketersediaan.')
    .replaceAll('Pilih bay yang tersedia; booking belum mengaktifkan sesi sebelum pembayaran diverifikasi.', 'Sesi dan bay ditentukan otomatis setelah pembayaran simulasi berhasil dicatat.')
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
    const serviceBannerCopy = root.querySelector('.service-banner .banner-content p');
    if (serviceBannerCopy) serviceBannerCopy.textContent = 'Pilih layanan Self-Service; waktu kunjungan dan bay tersedia ditentukan otomatis.';
    const visitCopy = root.querySelector('.closing-cta > div > p:last-child');
    if (visitCopy) visitCopy.textContent = 'Pilih layanan. Jadwal kunjungan disusun otomatis oleh studio.';
    const allServices = root.querySelector('.closing-cta [data-nav="services"]');
    if (allServices) {
      allServices.removeAttribute('data-nav');
      allServices.dataset.action = 'all-services';
      allServices.textContent = 'Lihat Semua Layanan';
    }
  }
  if (currentPage === 'services') {
    const titles = { car: 'Layanan cuci mobil', bike: 'Layanan cuci motor' };
    root.querySelectorAll('[data-service-group]').forEach(group => {
      const title = titles[group.dataset.serviceGroup];
      if (title) group.querySelector('.service-group-heading h3').textContent = title;
    });
  }
  if (currentPage === 'self-service') {
    root.querySelectorAll('.bay-card [data-action="self-service-order"]').forEach(button => button.remove());
    const bayNote = root.querySelector('.bay-note p');
    if (bayNote) bayNote.textContent = 'Status bay diperbarui langsung. Setiap pesanan dialokasikan ke bay yang tersedia secara otomatis.';
    const firstStep = root.querySelector('.guide-steps li:first-child');
    if (firstStep) {
      firstStep.querySelector('h3').textContent = 'Pilih layanan kendaraan';
      firstStep.querySelector('p').textContent = 'Sistem menentukan waktu kunjungan dan bay yang tersedia secara otomatis.';
    }
    const secondStep = root.querySelector('.guide-steps li:nth-child(2)');
    if (secondStep) {
      secondStep.querySelector('h3').textContent = 'Tinjau total pesanan';
      secondStep.querySelector('p').textContent = 'Harga dan durasi mengikuti paket Self-Service aktif di katalog.';
    }
    const thirdStep = root.querySelector('.guide-steps li:nth-child(3)');
    if (thirdStep) {
      thirdStep.querySelector('h3').textContent = 'Pembayaran berhasil';
      thirdStep.querySelector('p').textContent = 'Pembayaran simulasi dicatat sebagai lunas di database setelah order tersimpan.';
    }
    const facilityCopy = root.querySelector('.self-service-facilities > p');
    if (facilityCopy) facilityCopy.textContent = 'Status empat bay ditampilkan langsung. Pemilihan waktu dan bay dilakukan otomatis saat pesanan dibuat.';
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
  const views = { home: renderHome, services: renderServices, 'self-service': renderBays, shop: renderShop };
  const app = document.getElementById('app');
  if (page === 'admin' && !hasAdminRole(adminUser)) page = 'home';
  document.body.dataset.page = page;
  document.body.classList.toggle('admin-mode', page === 'admin');
  if (page === 'admin') {
    app.innerHTML = renderAdmin()
      .replace(/<button class="admin-nav" data-admin-tab="bookings">[\s\S]*?<\/button>/, '')
      .replace(/<button class="admin-nav" data-admin-tab="self-service">[\s\S]*?<\/button>/, '');
    app.querySelector('.admin-top-actions')?.insertAdjacentHTML('afterbegin', '<button class="button button-quiet button-small" type="button" data-action="home">← Kembali ke Beranda</button>');
    app.querySelectorAll('[data-action="walkin"]').forEach(button => button.remove());
    updateQueueSidebarCount(app);
    if (!adminDataReady) {
      const content = app.querySelector('#admin-content');
      if (content) content.innerHTML = renderAdminDataState();
    }
  }
  else {
    app.innerHTML = (views[page] || renderHome)();
    if (!databaseConnected) app.insertAdjacentHTML('afterbegin', renderPublicDataState());
  }
  if (page === 'admin') {
    removeUnauthorizedAdminMutations(app);
  }
  document.querySelectorAll('[data-action="booking"]').forEach(button => {
    button.dataset.action = 'service-order';
  });
  app.querySelectorAll('[data-action="self-service-book"]').forEach(button => {
    button.dataset.action = 'self-service-order';
  });
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
  if (page === 'admin' && adminDataReady) setAdminDescription('overview');
  app.querySelectorAll('.database-notice').forEach(element => element.remove());
  const settingsButton = app.querySelector('.admin-sidebar [data-action="settings"]');
  if (settingsButton) settingsButton.setAttribute('aria-label', 'Pengaturan studio');
  if (page === 'admin' && adminDataReady && document.querySelector('.metric-grid')) {
    try {
      renderAdminMetrics();
      removeUnauthorizedAdminMutations(app);
    } catch (error) {
      console.error('[Admin dashboard] Render failed:', error);
      const content = app.querySelector('#admin-content');
      if (content) content.innerHTML = `<section class="empty-state" role="alert"><h3>Data belum dapat dimuat</h3><p>${escapeHtml(error.message || 'Dashboard gagal dirender.')}</p><button class="button button-dark" data-action="retry-admin-data">Coba muat ulang</button></section>`;
    }
  }
  document.querySelectorAll('[data-nav]').forEach(link => link.classList.toggle('active', link.dataset.nav === page));
  simplifyUiSymbols();
}
function renderBayStatus() {
  const cards = Array.from({ length: 4 }, (_, index) => {
    const number = index + 1;
    const row = publicBays.find(item => Number(item.bay_number) === number);
    const state = ['AVAILABLE', 'RESERVED', 'OCCUPIED'].includes(row?.bay_status) ? row.bay_status : 'UNKNOWN';
    const duration = Math.max(0, finiteNumber(row?.duration_minutes));
    const timeRange = formatServiceTimeRange(row?.booking_time, duration);
    const label = state === 'AVAILABLE' ? 'TERSEDIA'
      : state === 'RESERVED' ? 'DIPESAN'
        : state === 'OCCUPIED' ? 'DIGUNAKAN' : 'STATUS BELUM TERSEDIA';
    const detail = state === 'AVAILABLE' ? 'Bay kosong · siap digunakan'
      : timeRange || 'Jadwal tidak tersedia';
    return `<article class="bay-card bay-${state.toLowerCase()}"><div class="bay-card-top"><span>B-${String(number).padStart(2, '0')}</span>${statusBadge(state)}</div><div class="bay-card-media bay-visual"><img src="${PHOTOS.selfBay}" alt="Area cuci untuk bay B-${String(number).padStart(2, '0')}" loading="lazy"><span class="bay-number">${String(number).padStart(2, '0')}</span></div><div class="bay-card-bottom"><div class="bay-status-copy"><strong>${label}</strong><span class="bay-time">${detail}</span></div></div></article>`;
  }).join('');
  const homeBayGrid = document.querySelector('.home-bay-section .bay-grid');
  if (homeBayGrid) homeBayGrid.innerHTML = cards;
  return cards;
}
function applyReferencePresentation(app) {
  const hero = app.querySelector('.hero');
  if (page !== 'home' || !hero) return;

  const availableBays = publicBays.filter(bay => bay.bay_status === 'AVAILABLE').length;
  const totalBays = publicBays.length || 4;
  const availableLabel = publicBays.length ? String(availableBays).padStart(2, '0') : '--';
  app.insertAdjacentHTML('afterbegin', `<section class="home-statusbar"><div><span class="live-dot"></span><strong>${publicWashCount} KENDARAAN TERAWAT HARI INI</strong><span class="status-divider">/</span><span>RINSE SOCIETY · SEMARANG</span></div><div><span>SELF-SERVICE LIVE</span><strong>${availableLabel} / ${totalBays} BAY TERSEDIA</strong></div></section>`);
  hero.classList.add('reference-home-hero');
  hero.querySelector('.hero-content .hero-buttons').innerHTML = '<button class="button button-dark" data-action="service-order">Pesan Layanan</button><button class="button button-quiet" data-nav="services">Lihat Semua Layanan</button>';
  hero.insertAdjacentHTML('beforeend', `<aside class="home-capacity-panel"><div class="capacity-panel-heading"><span><i class="live-dot"></i> TELEMETRI BAY LIVE</span><strong>SISTEM NORMAL</strong></div><div class="capacity-metrics"><article><div><span>PROFESSIONAL WASH</span><b>${String(regularServices().length).padStart(2, '0')}</b></div><small>Layanan studio</small><i>Studio Semarang</i></article><article><div><span>SELF-SERVICE</span><b>${String(totalBays).padStart(2, '0')}</b></div><small>Bay universal</small><i>${availableLabel} tersedia</i></article></div><div class="capacity-panel-foot"><span>Jadwal diperbarui dari status bay</span><button class="text-link" data-nav="self-service">Lihat status bay</button></div></aside>`);
}
function renderPublicDataState() {
  const loading = dataLoadState === 'loading';
  const errorMessage = publicDataError || 'Kami belum dapat memuat data. Silakan coba lagi.';
  return `<section class="section"><div class="empty-state" role="status"><h3>${loading ? 'Memuat katalog...' : 'Katalog belum tersedia.'}</h3><p>${loading ? 'Menu tetap dapat dibuka; pemesanan tersedia setelah katalog berhasil dimuat.' : escapeHtml(errorMessage)}</p>${loading ? '' : '<button class="button button-dark" data-action="retry-data">Coba lagi</button>'}</div></section>`;
}
function renderAdminDataState() {
  const loading = adminDataState === 'loading';
  return `<section class="empty-state" role="status"><h3>${loading ? 'Memuat dashboard...' : 'Data dashboard belum tersedia.'}</h3><p>${loading ? 'Memuat ringkasan dari Supabase.' : escapeHtml(adminDataError || 'RPC dashboard demo belum tersedia di project Supabase.')}</p>${loading ? '' : '<button class="button button-dark" data-action="retry-admin-data">Coba lagi</button>'}</section>`;
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
function dailyPaidRevenue(transactions, dayCount = 7) {
  const today = getJakartaDateString();
  return Array.from({ length: dayCount }, (_, index) => {
    const key = addDaysToJakartaDate(today, -(dayCount - index - 1));
    const date = new Date(`${key}T12:00:00+07:00`);
    return {
      key,
      label: date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }),
      amount: transactions.filter(tx => isRevenueTransaction(tx) && tx.booking_date === key).reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0)
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
  return getOperationalTransactions(db?.transactions)
    .filter(tx => !['CANCELLED', 'EXPIRED'].includes(tx.transaction_status));
}
function reportVehicle(transaction) {
  return getVehicle(transaction);
}
function currentReportPeriodKey(now = new Date()) {
  const { year, month } = getWibDateParts(now);
  return reportPeriod === 'year' ? year : `${year}-${month}`;
}
function currentReportPeriodLabel(now = new Date()) {
  const { year, month } = getWibDateParts(now);
  if (reportPeriod === 'year') return `Tahun ${year}`;
  const monthName = new Date(`${year}-${month}-01T12:00:00+07:00`).toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta', month: 'long', year: 'numeric'
  });
  return `Bulan ${monthName}`;
}
function reportPeriodTransactions() {
  const key = currentReportPeriodKey();
  return reportTransactions().filter(tx => String(tx.booking_date || '').startsWith(key));
}
function renderAdminMetrics() {
  const studioStatus = document.querySelector('.admin-topbar .eyebrow');
  if (studioStatus) {
    const studioDate = new Intl.DateTimeFormat('id-ID', { dateStyle: 'full', timeZone: 'Asia/Jakarta' }).format(new Date());
    studioStatus.textContent = `BANYUMANIK STUDIO · UNIT 01 AKTIF · ${studioDate} · ${getJakartaTimeString()} WIB`;
  }
  const reportLink = document.querySelector('.admin-nav[data-admin-tab="reports"]');
  if (reportLink) reportLink.innerHTML = '<span>↗</span> Laporan Keuangan';
  const adminActions = document.querySelector('.admin-top-actions');
  if (adminActions && !adminActions.querySelector('[data-action="print-financial-report"]')) {
    const printButton = document.createElement('button');
    printButton.type = 'button';
    printButton.className = 'button button-dark button-small header-print-button';
    printButton.dataset.action = 'print-financial-report';
    printButton.setAttribute('aria-label', 'Cetak Laporan Keuangan sebagai PDF');
    printButton.innerHTML = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v4a2 2 0 0 1-2 2h-2M7 14h10v7H7z"/><path d="M18 11h.01"/></svg><span>Cetak Laporan (PDF)</span>';
    adminActions.insertBefore(printButton, adminActions.querySelector('[data-action="walkin"]'));
  }
  if (!document.querySelector('.metric-grid')) return;
  updateQueueSidebarCount();
  const transactions = reportTransactions();
  const today = getJakartaDateString();
  const todays = transactions.filter(tx => tx.booking_date === today);
  const paidToday = todays.filter(isRevenueTransaction);
  const todayMetrics = calculateFinancialMetrics(paidToday);
  const lowStock = db.services_products.filter(item => item.item_type === 'PRODUCT' && item.stock <= item.min_stock).length;
  const washed = new Set(todays.filter(tx => tx.item_type === 'SERVICE' && isRevenueTransaction(tx) && tx.transaction_status === 'COMPLETED').map(tx => tx.vehicle_id).filter(Boolean)).size;
  const selfService = todays.filter(tx => tx.item_type === 'SERVICE' && isRevenueTransaction(tx) && db.services_products.find(item => item.id === tx.item_id)?.category === 'SELF_SERVICE').length;
  const paid = transactions.filter(isRevenueTransaction);
  const weeklyRows = dailyPaidRevenue(transactions);
  const weeklyDates = new Set(weeklyRows.map(row => row.key));
  const weeklyPaid = paid.filter(tx => weeklyDates.has(tx.booking_date));
  const weeklyMetrics = calculateFinancialMetrics(weeklyPaid);
  const serviceRevenue = weeklyMetrics.serviceRevenue;
  const productRevenue = weeklyMetrics.productRevenue;
  const shippingRevenue = weeklyMetrics.shippingRevenue;
  const metrics = [
    ['Pendapatan Kotor Hari Ini', money(todayMetrics.totalRevenue), `${paidToday.length} transaksi lunas`, 'primary'],
    ['Transaksi Lunas', String(paid.length).padStart(2, '0'), `${transactions.length} transaksi tercatat`, 'primary'],
    ['Kendaraan Dilayani', String(washed).padStart(2, '0'), 'Transaksi selesai hari ini', 'primary'],
    ['Order Hari Ini', String(todays.length).padStart(2, '0'), 'Layanan, sesi, dan produk', 'primary']
  ];
  document.querySelector('.metric-grid').innerHTML = metrics.map(([label, value, note, primary]) => `<article class="metric-card ${primary ? 'metric-primary' : ''}"><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('');
  const secondaryMetrics = `<div class="metric-secondary-grid"><div><span>Sesi Self-Service Hari Ini</span><strong>${String(selfService).padStart(2, '0')}</strong><small>Sesi lunas hari ini</small></div><div><span>Pendapatan Jasa · Tujuh Hari</span><strong>${money(serviceRevenue)}</strong><small>Transaksi lunas dalam tujuh hari</small></div><div><span>Pendapatan Produk · Tujuh Hari</span><strong>${money(productRevenue)}</strong><small>Transaksi lunas dalam tujuh hari</small></div><div><span>Laba Kotor · Tujuh Hari</span><strong>${money(weeklyMetrics.grossProfit)}</strong><small>Pendapatan kotor dikurangi HPP retail</small></div><div><span>Pelanggan</span><strong>${String(db.customers.length).padStart(2, '0')}</strong><small>Data pelanggan terdaftar</small></div></div>`;
  let secondaryGrid = document.querySelector('.metric-secondary-grid');
  if (!secondaryGrid) {
    document.querySelector('.metric-grid').insertAdjacentHTML('afterend', secondaryMetrics);
  } else {
    secondaryGrid.outerHTML = secondaryMetrics;
  }

  const totalRevenue = weeklyMetrics.totalRevenue;
  const revenuePanel = document.querySelector('.revenue-panel');
  if (revenuePanel) revenuePanel.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">TREN PENDAPATAN</p><h2>Pendapatan Periode</h2></div><strong class="dashboard-revenue-total">${money(totalRevenue)}</strong></div><p class="dashboard-chart-context">Transaksi lunas · tujuh hari terakhir</p>${renderRevenueLineChart(weeklyRows)}<div class="dashboard-revenue-split"><div><span>Jasa · tujuh hari</span><strong>${money(serviceRevenue)}</strong></div><div><span>Produk · tujuh hari</span><strong>${money(productRevenue)}</strong></div><div><span>Ongkir · tujuh hari</span><strong>${money(shippingRevenue)}</strong></div></div>`;

  const lowStockItems = db.services_products.filter(item => item.item_type === 'PRODUCT' && item.stock <= item.min_stock);
  const lowStockPanel = document.querySelector('.low-stock-panel');
  if (lowStockPanel) lowStockPanel.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">PANTAU STOK</p><h2>Perlu ditambah</h2></div><span class="low-stock-count">${lowStockItems.length} MENIPIS</span></div>${lowStockItems.length ? lowStockItems.map(item => `<div class="stock-row"><img src="${catalogItem(item).image}" alt=""><span><strong>${escapeHtml(catalogItem(item).name)}</strong><small>Minimum ${item.min_stock} unit</small></span><b>${item.stock} tersisa</b></div>`).join('') : '<div class="stock-clear">Semua stok mencukupi.</div>'}<button class="text-link" data-admin-tab="catalog">Kelola persediaan</button>`;

  const queuePreview = document.querySelector('.queue-preview');
  if (queuePreview) queuePreview.innerHTML = `<div class="panel-heading"><div><p class="eyebrow">KONDISI AREA CUCI</p><h2>Antrean saat ini</h2></div><button class="text-link" data-admin-tab="queue">Lihat antrean</button></div>${renderQueueColumns(false)}`;
  const bayStatus = document.querySelector('.admin-bay-status-panel');
  if (bayStatus) bayStatus.outerHTML = renderAdminBayStatus();
  else if (queuePreview) queuePreview.insertAdjacentHTML('afterend', renderAdminBayStatus());

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
  <section class="section home-bay-section"><div class="section-heading compact-heading"><div><p class="eyebrow">AREA CUCI · LIVE</p><h2>Status bay terkini</h2></div><button class="text-link" type="button" data-nav="self-service">Buka Self-Service</button></div><div class="bay-grid">${renderBayStatus()}</div></section>
  <section class="section quality-section"><div class="section-heading"><div><p class="eyebrow">STANDARDISASI PERAWATAN</p><h2>Metode dan kualitas<br><em>yang terasa bedanya.</em></h2></div><p class="section-aside">Perawatan dirancang untuk membersihkan kendaraan dengan teliti dan menjaga hasilnya tetap rapi.</p></div><div class="quality-grid"><article><span class="quality-index">01</span><h3>Air tersaring</h3><p>Bilas Reverse Osmosis membantu mengurangi residu mineral yang dapat meninggalkan noda air.</p></article><article><span class="quality-index">02</span><h3>Formula pH-netral</h3><p>Sampo khusus kendaraan untuk membersihkan dengan lembut dan menjaga lapisan wax.</p></article><article><span class="quality-index">03</span><h3>Teknik menyeluruh</h3><p>Busa, bilas bertekanan, dan pengeringan rapi sesuai layanan yang dipilih.</p></article><article><span class="quality-index">04</span><h3>Pilihan sesuai kendaraan</h3><p>Layanan tersedia untuk mobil dan sepeda motor, termasuk empat bay Self-Service.</p></article></div></section>
  <section class="section services-section" id="services"><div class="section-heading"><div><p class="eyebrow">PROFESSIONAL WASH</p><h2>Serahkan kendaraan.<br><em>Tim kami yang menangani.</em></h2></div><p class="section-aside">Tim Rinse Society menangani pencucian kendaraan dengan fokus pada kualitas hasil, durasi, dan penanganan yang rapi.</p><a class="text-link" href="#services" data-nav="services">Lihat pilihan</a></div><div class="service-grid">${regularServices().slice(0, 2).map(serviceCard).join('')}</div><div class="service-banner"><img src="${PHOTOS.selfBay}" alt="Beberapa bay Self-Service yang siap digunakan" loading="lazy"><div class="banner-content"><span class="eyebrow eyebrow-light">SELF-SERVICE</span><h3>Self-Service</h3><p>Pilih salah satu dari empat bay universal untuk mobil atau sepeda motor, lalu tentukan waktu dan durasi cuci.</p><button class="button button-white" data-nav="self-service">Pilih bay</button></div><span class="banner-index">BAY UNIVERSAL · 02</span></div></section>
  <section class="shop-teaser"><div class="section-heading"><div><p class="eyebrow">PERAWATAN KENDARAAN DI RUMAH</p><h2>Produk pilihan.<br><em>Rawat kilapnya.</em></h2></div><a class="text-link" href="#shop" data-nav="shop">Lihat semua produk</a></div><div class="product-grid">${db.services_products.filter(item => item.item_type === 'PRODUCT').slice(0, 2).map(productCard).join('')}</div></section>
  <section class="closing-cta"><div><p class="eyebrow eyebrow-light">RINSE SOCIETY · SEMARANG</p><h2>Siap memberikan kilau terbaik<br>untuk kendaraan Anda?</h2><p>Pilih layanan dan waktu kunjungan yang sesuai.</p></div><div class="closing-cta-actions"><button class="button button-white" data-action="service-order">Pesan Layanan</button><button class="text-link light-link" data-nav="services">Lihat Semua Layanan</button></div></section>`;
}
function productCard(sourceProduct, options = {}) {
  const product = catalogItem(sourceProduct);
  const categoryAttribute = options.categoryFilter ? `data-product-category="${escapeHtml(options.categoryFilter)}"` : '';
  const hidden = options.categoryFilter && productFilter !== 'all' && options.categoryFilter !== productFilter ? 'hidden' : '';
  return `<article class="product-card" ${categoryAttribute} ${hidden}><button class="product-image" data-product="${product.id}" aria-label="Tambahkan ${escapeHtml(product.name)} ke keranjang"><img src="${product.image}" alt="${escapeHtml(product.name)}" loading="lazy"><span class="product-add">+</span></button><div class="product-info"><span class="eyebrow">${escapeHtml(product.category || 'PRODUK PERAWATAN')}</span><h3>${escapeHtml(product.name)}</h3><p>${escapeHtml(product.description || '')}</p><div class="product-price-row"><strong>${money(product.price)}</strong><span class="stock-note">STOK ${product.stock}</span></div><button class="product-buy" data-product="${product.id}">Tambah ke keranjang <span>↗</span></button></div></article>`;
}
function isAdminAuthorized() {
  return page === 'admin' && hasAdminRole(adminUser);
}
function requireAdminAuthorization() {
  if (!isAdminAuthorized()) throw new Error('Akses Admin terverifikasi diperlukan.');
}
function removeUnauthorizedAdminMutations(root) {
  if (isAdminAuthorized()) return;
  root.querySelectorAll('[data-action="walkin"], [data-action="admin-transaction-create"], [data-action="add-item"], [data-action="logout"], [data-edit-item], [data-edit-transaction], [data-admin-remove], [data-edit-customer-address], [data-payment-paid], [data-refund-complete], [data-queue-id]')
    .forEach(control => control.remove());
}
function renderServices() {
  const cars = regularServices().filter(service => service.type === 'CAR');
  const motorcycles = regularServices().filter(service => service.type === 'MOTOR');
  const count = regularServices().length;
  const filterButton = (value, label, amount) => `<button class="catalog-filter${serviceFilter === value ? ' is-active' : ''}" type="button" data-service-filter="${value}" aria-pressed="${serviceFilter === value}">${label}<span>${amount}</span></button>`;
  const group = (key, title, note, services) => `<section class="service-filter-group" data-service-group="${key}" ${serviceFilter !== 'all' && serviceFilter !== key ? 'hidden' : ''}><div class="service-group-heading"><div><p class="eyebrow">${key === 'car' ? 'PROFESSIONAL · MOBIL' : 'PROFESSIONAL · MOTOR'}</p><h3>${title}</h3></div><span>${note}</span></div><div class="service-grid">${services.map(serviceCard).join('') || '<p class="empty-state">Layanan belum tersedia.</p>'}</div></section>`;
  return `<section class="page-hero page-hero-blue"><div><p class="eyebrow eyebrow-light">PROFESSIONAL WASH</p><h1>Professional Wash</h1><p>Tim Rinse Society mencuci kendaraan Anda dengan hasil yang konsisten, rapi, dan terpercaya.</p></div><span class="page-hero-number">02<br><small>PILIHAN</small></span></section><section class="section services-list"><div class="section-heading compact-heading"><div><p class="eyebrow">PILIHAN PERAWATAN</p><h2>Temukan layanan <em>yang tepat.</em></h2></div><span class="availability"><i class="live-dot"></i> Waktu kunjungan diatur otomatis</span></div><div class="catalog-filter-bar" role="group" aria-label="Filter layanan">${filterButton('all', 'Semua', count)}${filterButton('car', 'Mobil', cars.length)}${filterButton('bike', 'Motor', motorcycles.length)}</div>${group('car', 'Layanan cuci mobil', `${cars.length} layanan tersedia`, cars)}${group('bike', 'Layanan cuci motor', `${motorcycles.length} layanan tersedia`, motorcycles)}</section>`;
}
function renderBays() {
  const bays = Array.from({ length: 4 }, (_, index) => {
    const number = index + 1;
    const row = publicBays.find(item => Number(item.bay_number) === number);
    const state = ['AVAILABLE', 'RESERVED', 'OCCUPIED'].includes(row?.bay_status) ? row.bay_status : 'UNKNOWN';
    const type = row?.vehicle_type || null;
    const serviceName = type === 'MOTOR' ? 'Self-Service Motorcycle' : 'Self-Service Car';
    const duration = type ? getServiceDuration(serviceName, row?.duration_minutes) : Number(row?.duration_minutes || 0);
    return { number, state, type, duration, remaining: Number(row?.minutes_remaining || 0), time: row?.booking_time || null };
  });
  const packages = db.services_products.filter(isSelfServiceItem).map(item => ({
    ...item,
    duration: getServiceDuration(item.name || item.id, item.duration)
  }));
  const availableCount = bays.filter(bay => bay.state === 'AVAILABLE').length;
  const reservedCount = bays.filter(bay => bay.state === 'RESERVED').length;
  const occupiedCount = bays.filter(bay => bay.state === 'OCCUPIED').length;
  const availability = publicBays.length ? `${availableCount} / ${publicBays.length}` : '—';
  return `<section class="page-hero page-hero-navy"><div><p class="eyebrow eyebrow-light">SELF-SERVICE</p><h1>Self-Service</h1><p>Pilih jenis kendaraan dan layanan. Sistem memilih waktu serta bay terdekat secara otomatis.</p></div><aside class="self-service-hero-status" aria-label="Ketersediaan bay live"><div><p class="eyebrow eyebrow-light">KETERSEDIAAN BAY · LIVE</p><strong>${availability}</strong><span>Bay tersedia</span></div><div class="self-service-hero-breakdown"><span>Tersedia <b>${publicBays.length ? availableCount : '—'}</b></span><span>Dipesan <b>${publicBays.length ? reservedCount : '—'}</b></span><span>Digunakan <b>${publicBays.length ? occupiedCount : '—'}</b></span></div></aside></section><section class="section bays-section"><div class="section-heading compact-heading"><div><p class="eyebrow">STATUS BAY TERKINI</p><h2>Empat bay universal.<br><em>Siap untuk mobil atau motor.</em></h2></div><span class="updated-label"><i class="live-dot"></i> Diperbarui langsung</span></div><div class="bay-grid">${bays.map(bay => {
    const normalizedState = ['AVAILABLE', 'RESERVED', 'OCCUPIED'].includes(bay.state) ? bay.state : 'UNKNOWN';
    const isOccupied = normalizedState === 'OCCUPIED';
    const isReserved = normalizedState === 'RESERVED';
    const visual = PHOTOS.selfBay;
    const label = isOccupied ? (bay.type === 'MOTOR' ? 'DIGUNAKAN · Sepeda motor' : 'DIGUNAKAN · Mobil') : isReserved ? 'DIPESAN' : normalizedState === 'AVAILABLE' ? 'TERSEDIA' : 'STATUS BELUM TERSEDIA';
    const timeRange = formatServiceTimeRange(bay.time, bay.duration);
    return `<article class="bay-card bay-${normalizedState.toLowerCase()}"><div class="bay-card-top"><span>B-${String(bay.number).padStart(2, '0')}</span>${statusBadge(normalizedState)}</div><div class="bay-card-media bay-visual"><img src="${visual}" alt="Fasilitas Self-Service untuk bay B-${String(bay.number).padStart(2, '0')}" loading="lazy"><span class="bay-number">${String(bay.number).padStart(2, '0')}</span></div><div class="bay-card-bottom"><div class="bay-status-copy"><strong>${label}</strong><span class="bay-time">${isOccupied || isReserved ? timeRange || 'Jadwal tidak tersedia' : 'Bay kosong · siap digunakan'}</span></div>${normalizedState === 'AVAILABLE' ? `<button class="text-link" data-action="self-service-book">Pesan Self-Service</button>` : ''}</div></article>`;
  }).join('')}</div><div class="bay-note"><span class="bay-note-icon">i</span><p>Empat bay universal untuk mobil dan sepeda motor. Status ditentukan dari jadwal dan durasi sesi aktif.</p><button class="text-link" data-action="self-service-book">Mulai Self-Service</button></div></section><section class="section self-service-packages"><div class="section-heading compact-heading"><div><p class="eyebrow">PAKET SESI</p><h2>Pilihan paket Self-Service</h2><p>Paket mengikuti layanan dan harga yang tersedia di katalog studio.</p></div></div><div class="package-grid">${packages.map(item => `<article class="package-card"><span class="package-type">${item.type === 'MOTOR' ? 'MOTOR' : 'MOBIL'}</span><h3>${escapeHtml(catalogItem(item).name)}</h3><p>${Number(item.duration) || 0} menit di bay universal</p><strong>${money(item.price)}</strong><button class="button button-dark" type="button" data-self-service-type="${item.type}">Pilih paket</button></article>`).join('') || '<div class="empty-state">Paket Self-Service belum tersedia.</div>'}</div></section><section class="section self-service-guide"><div class="section-heading compact-heading"><div><p class="eyebrow">PANDUAN PENGGUNAAN</p><h2>Mulai sesi dalam tiga langkah</h2></div></div><ol class="guide-steps"><li><span>01</span><div><h3>Pilih kendaraan dan bay</h3><p>Tentukan jenis kendaraan, salah satu dari empat bay, serta waktu kunjungan.</p></div></li><li><span>02</span><div><h3>Pilih paket sesi</h3><p>Durasi dan harga mengikuti layanan Self-Service aktif yang tersedia di katalog.</p></div></li><li><span>03</span><div><h3>Konfirmasi pembayaran</h3><p>Booking tetap menunggu verifikasi pembayaran sebelum sesi dapat dimulai.</p></div></li></ol></section><section class="section self-service-facilities"><div><p class="eyebrow">INFORMASI STUDIO</p><h2>Empat bay, satu alur yang jelas.</h2></div><p>Status bay diperbarui dari jadwal sesi aktif. Pilih bay yang tersedia; booking belum mengaktifkan sesi sebelum pembayaran diverifikasi.</p></section>`;
}
function renderShop() {
  const items = Object.values(cart).reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = Object.entries(cart).reduce((sum, [id, row]) => sum + (db.services_products.find(product => product.id === id)?.price || 0) * row.quantity, 0);
  const products = db.services_products.filter(item => item.item_type === 'PRODUCT'
    && item.active !== false && PRODUCT_CATALOG_ID_SET.has(item.id));
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
function renderAdminLegacy() {
  const today = getJakartaDateString();
  const todayRows = db.transactions.filter(tx => tx.booking_date === today);
  const paid = db.transactions.filter(isRevenueTransaction);
  const todayRevenue = todayRows.filter(isRevenueTransaction).reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0);
  const serviceRevenue = paid.filter(tx => tx.item_type === 'SERVICE').reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0);
  const productRevenue = paid.filter(tx => tx.item_type === 'PRODUCT').reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0);
  const total = serviceRevenue + productRevenue;
  const lowStock = db.services_products.filter(item => item.item_type === 'PRODUCT' && item.stock <= item.min_stock);
  const vehiclesWashed = todayRows.filter(tx => tx.item_type !== 'PRODUCT' && tx.transaction_status === 'COMPLETED').length;
  const bookingsToday = todayRows.filter(tx => tx.transaction_type === 'BOOKING').length;
  const selfServiceToday = todayRows.filter(tx => tx.item_type !== 'PRODUCT' && db.services_products.find(item => item.id === tx.item_id)?.category === 'SELF_SERVICE').length;
  return `<div class="admin-shell"><aside class="admin-sidebar"><div class="admin-brand"><span class="brand-mark">R</span><span>rinse<span class="brand-light">society</span><small>STUDIO CONSOLE</small></span></div><p class="admin-nav-label">WORKSPACE</p><button class="admin-nav active" data-admin-tab="overview">◫ &nbsp; Overview</button><button class="admin-nav" data-admin-tab="queue">≋ &nbsp; Wash queue <b>${db.transactions.filter(tx => tx.queue_status !== 'COMPLETED').length}</b></button><button class="admin-nav" data-admin-tab="catalog">▦ &nbsp; Services & products</button><button class="admin-nav" data-admin-tab="customers">◎ &nbsp; Customers & vehicles</button><button class="admin-nav" data-admin-tab="reports">↗ &nbsp; Revenue reports</button><div class="sidebar-bottom"><span class="sidebar-avatar">RS</span><span><strong>Rinse Studio</strong><small>Semarang · Studio 01</small></span><button data-action="settings" aria-label="Database settings">⚙</button></div></aside><div class="admin-main"><header class="admin-topbar"><div><p class="eyebrow">STUDIO CONSOLE · ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</p><h1 id="admin-heading">Studio overview</h1></div><div class="admin-top-actions"><span class="connection-indicator ${supabaseConfig().url ? 'connected' : ''}"><i></i>${supabaseConfig().url ? 'SUPABASE CONNECTED' : 'DATA LOKAL'}</span><button class="button button-dark button-small" data-action="walkin">+ New walk-in</button></div></header><div id="admin-content"><div class="metric-grid"><article class="metric-card metric-primary"><span>REVENUE · ALL TIME</span><strong>${money(total)}</strong><small>From ${paid.length} paid transactions</small><i>↗</i></article><article class="metric-card"><span>TRANSACTIONS</span><strong>${db.transactions.length.toString().padStart(2, '0')}</strong><small>${db.transactions.filter(tx => tx.transaction_type === 'BOOKING').length} bookings on record</small></article><article class="metric-card"><span>SERVICE REVENUE</span><strong>${money(serviceRevenue)}</strong><small>Wash, self-service & add-ons</small></article><article class="metric-card"><span>PRODUCT REVENUE</span><strong>${money(productRevenue)}</strong><small>Retail sales · ${db.transactions.filter(tx => tx.item_type === 'PRODUCT').length} line items</small></article></div><div class="admin-content-grid"><section class="admin-panel revenue-panel"><div class="panel-heading"><div><p class="eyebrow">PAID TRANSACTIONS</p><h2>Revenue mix</h2></div><span class="panel-period">ALL TIME</span></div><div class="revenue-total">${money(total)}<span>Total collected</span></div><div class="revenue-bars"><div class="revenue-bar-row"><span>Wash & service</span><div><i style="width:${total ? Math.max(4, serviceRevenue / total * 100) : 0}%"></i></div><strong>${money(serviceRevenue)}</strong></div><div class="revenue-bar-row"><span>Studio goods</span><div><i class="bar-green" style="width:${total ? Math.max(4, productRevenue / total * 100) : 0}%"></i></div><strong>${money(productRevenue)}</strong></div></div><div class="chart-footnote"><span>● Service revenue</span><span>● Product revenue</span></div></section><section class="admin-panel low-stock-panel"><div class="panel-heading"><div><p class="eyebrow">STOCK WATCH</p><h2>Needs a top-up</h2></div><span class="low-stock-count">${lowStock.length} LOW</span></div>${lowStock.length ? lowStock.map(item => `<div class="stock-row"><img src="${item.image}" alt=""><span><strong>${escapeHtml(item.name)}</strong><small>Minimum ${item.min_stock} units</small></span><b>${item.stock} left</b></div>`).join('') : '<div class="stock-clear">All studio shelves are looking good.</div>'}<button class="text-link" data-admin-tab="catalog">Manage inventory <span>↗</span></button></section></div><section class="admin-panel queue-preview"><div class="panel-heading"><div><p class="eyebrow">THE FLOOR, RIGHT NOW</p><h2>Wash queue</h2></div><button class="text-link" data-admin-tab="queue">Open queue <span>↗</span></button></div>${renderQueueColumns(false)}</section></div></div></div>`;
}
function renderAdmin() {
  const today = getJakartaDateString();
  const waiting = countActiveQueueTransactions(getOperationalQueueTransactions(db.transactions));
  return `<div class="admin-shell"><aside class="admin-sidebar"><div class="admin-brand"><span class="brand-mark">R</span><span>rinse<span class="brand-light">society</span><small>DASHBOARD STUDIO</small></span></div><p class="admin-nav-label">MENU STUDIO</p><button class="admin-nav active" data-admin-tab="overview"><span>◫</span> Ringkasan</button><button class="admin-nav" data-admin-tab="transactions"><span>▤</span> Transaksi</button><button class="admin-nav" data-admin-tab="bookings"><span>▣</span> Booking</button><button class="admin-nav" data-admin-tab="queue"><span>≋</span> Antrean cuci <b>${waiting}</b></button><button class="admin-nav" data-admin-tab="self-service"><span>⌂</span> Cuci mandiri</button><button class="admin-nav" data-admin-tab="customers"><span>◎</span> Pelanggan & kendaraan</button><button class="admin-nav" data-admin-tab="catalog"><span>▦</span> Layanan & produk</button><button class="admin-nav" data-admin-tab="reports"><span>↗</span> Laporan</button><button class="admin-nav" data-action="settings"><span>⚙</span> Pengaturan</button><button class="admin-nav" data-action="logout"><span>↪</span> Keluar</button><div class="sidebar-bottom"><span class="sidebar-avatar">RS</span><span><strong>${escapeHtml(adminUser?.email || 'Admin studio')}</strong><small>Semarang · Studio 01</small></span></div></aside><div class="admin-main"><header class="admin-topbar"><div><p class="eyebrow">RINGKASAN STUDIO · ${new Date(`${today}T12:00:00`).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).toUpperCase()}</p><h1 id="admin-heading">Ringkasan operasional</h1></div><div class="admin-top-actions"><span class="connection-indicator ${databaseConnected ? 'connected' : ''}"><i></i>${databaseConnected ? 'SUPABASE TERHUBUNG' : 'DATABASE TERPUTUS'}</span><button class="button button-dark button-small" data-action="walkin">+ Walk-in baru</button></div></header><div id="admin-content"><div class="metric-grid">${Array.from({ length: 8 }, () => '<article class="metric-card"><span>MEMUAT DATA</span><strong>—</strong><small>Dari transaksi Supabase</small></article>').join('')}</div><div class="admin-content-grid"><section class="admin-panel revenue-panel"><div class="panel-heading"><div><p class="eyebrow">TRANSAKSI LUNAS</p><h2>Pendapatan studio</h2></div><span class="panel-period">SEMUA WAKTU</span></div><div class="revenue-total">${money(0)}<span>Total pemasukan</span></div><div class="revenue-bars"><div class="revenue-bar-row"><span>Pendapatan jasa</span><div><i style="width:0%"></i></div><strong>${money(0)}</strong></div><div class="revenue-bar-row"><span>Pendapatan produk</span><div><i class="bar-green" style="width:0%"></i></div><strong>${money(0)}</strong></div></div><div class="chart-footnote"><span>● Pendapatan jasa</span><span>● Pendapatan produk</span></div></section><section class="admin-panel low-stock-panel"><div class="panel-heading"><div><p class="eyebrow">PANTAU STOK</p><h2>Perlu ditambah</h2></div><span class="low-stock-count">0 MENIPIS</span></div><div class="stock-clear">Memuat persediaan dari Supabase.</div><button class="text-link" data-admin-tab="catalog">Kelola persediaan <span>↗</span></button></section></div><section class="admin-panel queue-preview"><div class="panel-heading"><div><p class="eyebrow">KONDISI AREA CUCI</p><h2>Antrean saat ini</h2></div><button class="text-link" data-admin-tab="queue">Buka antrean <span>↗</span></button></div>${renderQueueColumns(false)}</section></div></div></div>`;
}
function queueCard(tx) {
  const vehicle = getVehicle(tx), customer = getCustomer(tx);
  return `<article class="queue-card"><div class="queue-card-top"><strong>${escapeHtml(tx.code)}</strong>${statusBadge(tx.payment_status)}</div><h3>${escapeHtml(vehicle?.plate || 'Penjualan produk')}</h3><p>${escapeHtml(tx.item_name || 'Layanan cuci')} · ${escapeHtml(customer?.full_name || 'Walk-in')}</p><div class="queue-card-foot"><span>${escapeHtml(formatTransactionTime(tx) || 'Walk-in')}</span><select aria-label="Ubah status ${escapeHtml(tx.code)}" data-queue-id="${tx.id}">${['WAITING', 'WASHING', 'FINISHING', 'COMPLETED'].map(status => `<option value="${status}" ${tx.queue_status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select></div></article>`;
}
function renderQueueColumns(large) {
  const stages = ['WAITING', 'WASHING'];
  const washTransactions = getOperationalQueueTransactions(db.transactions);
  const stageTransactions = stage => washTransactions.filter(tx => stage === 'WASHING'
    ? ['WASHING', 'FINISHING'].includes(tx.queue_status || 'WAITING')
    : (tx.queue_status || 'WAITING') === stage);
  return `<div class="queue-columns ${large ? 'queue-columns-large' : ''}">${stages.map(stage => {
    const rows = stageTransactions(stage);
    return `<div class="queue-column"><div class="queue-column-head"><span>${statusLabel(stage)}</span><b>${rows.length}</b></div>${rows.map(queueCard).join('') || '<div class="queue-empty">Belum ada kendaraan</div>'}</div>`;
  }).join('')}</div>`;
}
function updateQueueSidebarCount(root = document) {
  const count = countActiveQueueTransactions(getOperationalQueueTransactions(db.transactions));
  const badge = root.querySelector('.admin-nav[data-admin-tab="queue"] b');
  if (badge) badge.textContent = String(count);
}

const lifecycleUpdatesInFlight = new Set();
function refreshCurrentTransactionView() {
  if (page === 'admin' && adminDataReady) {
    const currentTab = activeAdminTab;
    render();
    if (currentTab !== 'overview') activateAdminTab(currentTab);
  } else if (page === 'home' || page === 'self-service') {
    render();
  }
}
function dispatchTransactionStateChange() {
  document.dispatchEvent(new Event('rinse:transactions-changed'));
}
document.addEventListener('rinse:transactions-changed', refreshCurrentTransactionView);

function refreshPublicBayLifecycles(now = Date.now()) {
  let changed = false;
  const today = getJakartaDateString(new Date(now));
  publicBays = publicBays.map(bay => {
    if (!['RESERVED', 'OCCUPIED'].includes(bay.bay_status) || !bay.booking_time) return bay;
    const start = parseJakartaDateTime(today, bay.booking_time).getTime();
    const serviceName = bay.vehicle_type === 'MOTOR' ? 'Self-Service Motorcycle' : 'Self-Service Car';
    const duration = getServiceDuration(serviceName, bay.duration_minutes);
    const finish = start + duration * 60000;
    const status = now >= finish ? 'AVAILABLE' : now >= start ? 'OCCUPIED' : 'RESERVED';
    if (status === bay.bay_status) return bay;
    changed = true;
    return status === 'AVAILABLE'
      ? { ...bay, bay_status: status, vehicle_type: null, duration_minutes: 0, minutes_remaining: 0, booking_time: null }
      : { ...bay, bay_status: status, minutes_remaining: Math.max(0, Math.ceil((finish - now) / 60000)) };
  });
  return changed;
}
function runServiceLifecycleCheck(now = Date.now()) {
  const currentRows = safeRows(db?.transactions);
  const updatedRows = checkServiceLifecycles(currentRows, now);
  const updates = updatedRows.filter((transaction, index) => transaction !== currentRows[index]);
  if (updates.length) {
    db.transactions = updatedRows;
    dispatchTransactionStateChange();
    if (isAdminAuthorized()) {
      updates.forEach(transaction => {
        if (!transaction.id || lifecycleUpdatesInFlight.has(transaction.id)) return;
        lifecycleUpdatesInFlight.add(transaction.id);
        patchRow('transactions', transaction.id, {
          transaction_status: transaction.transaction_status,
          queue_status: transaction.queue_status
        }).catch(error => {
          console.warn('[Service lifecycle] Status update failed:', error.message);
        }).finally(() => lifecycleUpdatesInFlight.delete(transaction.id));
      });
    }
  }
  if (refreshPublicBayLifecycles(now)) dispatchTransactionStateChange();
}

async function refreshLiveData() {
  if (!databaseConnected || publicRefreshInProgress || document.visibilityState !== 'visible') return;
  publicRefreshInProgress = true;
  const currentPage = page;
  const currentTab = activeAdminTab;
  try {
    if (currentPage === 'admin' && hasAdminRole(adminUser)) {
      await loadAdminData();
      if (page === 'admin') {
        render();
        if (currentTab !== 'overview') activateAdminTab(currentTab);
      }
    } else {
      await loadPublicData();
      if (page === currentPage) render();
    }
  } catch (_) {
  } finally {
    publicRefreshInProgress = false;
  }
}

function subscribeToTransactionChanges() {
  if (typeof WebSocket === 'undefined' || !isSupabaseConfigured()) return;
  const accessToken = hasAdminRole(adminUser) && supabaseSession?.access_token
    ? supabaseSession.access_token
    : SUPABASE_PUBLISHABLE_KEY;
  if (realtimeSocket && realtimeAuthToken === accessToken
    && [WebSocket.CONNECTING, WebSocket.OPEN].includes(realtimeSocket.readyState)) return;
  if (realtimeSocket) realtimeSocket.close();
  const endpoint = new URL(`${SUPABASE_URL.replace(/^http/, 'ws').replace(/\/$/, '')}/realtime/v1/websocket`);
  endpoint.searchParams.set('apikey', SUPABASE_PUBLISHABLE_KEY);
  endpoint.searchParams.set('vsn', '1.0.0');
  const socket = new WebSocket(endpoint);
  realtimeSocket = socket;
  realtimeAuthToken = accessToken;
  realtimeRef = 0;
  socket.addEventListener('open', () => {
    socket.send(JSON.stringify({
      topic: 'realtime:public:transactions',
      event: 'phx_join',
      payload: {
        access_token: accessToken,
        config: {
          broadcast: { ack: false, self: false },
          presence: { key: '' },
          postgres_changes: [{ event: '*', schema: 'public', table: 'transactions' }]
        }
      },
      ref: String(++realtimeRef)
    }));
    window.clearInterval(realtimeHeartbeatTimer);
    realtimeHeartbeatTimer = window.setInterval(() => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ topic: 'phoenix', event: 'heartbeat', payload: {}, ref: String(++realtimeRef) }));
      }
    }, 25000);
  });
  socket.addEventListener('message', event => {
    let message;
    try { message = JSON.parse(event.data); } catch (_) { return; }
    if (message.event === 'postgres_changes'
      || (message.event === 'broadcast' && message.payload?.event === 'transaction_changed')) {
      window.clearTimeout(realtimeRefreshTimer);
      realtimeRefreshTimer = window.setTimeout(() => refreshLiveData(), 150);
    }
  });
  socket.addEventListener('close', () => {
    window.clearInterval(realtimeHeartbeatTimer);
    if (realtimeSocket !== socket) return;
    realtimeSocket = null;
    window.clearTimeout(realtimeReconnectTimer);
    realtimeReconnectTimer = window.setTimeout(subscribeToTransactionChanges, 5000);
  });
  socket.addEventListener('error', () => socket.close());
}

function openDialog(kind, serviceId) {
  const dialog = document.getElementById('flow-dialog');
  const content = document.getElementById('dialog-content');
  const service = db.services_products.find(item => item.id === serviceId);
  if (['order', 'self-service', 'cart', 'product-checkout'].includes(kind) && !databaseConnected) {
    showToast('Layanan sedang tidak tersedia. Silakan coba lagi.', 'error');
    return;
  }
  if (['admin-transaction-create', 'admin-transaction-edit'].includes(kind)) {
    if (!isAdminAuthorized() || !adminDataReady) {
      showToast('Akses Admin terverifikasi diperlukan.', 'error');
      return;
    }
    renderAdminTransactionForm(content, kind === 'admin-transaction-edit' ? serviceId : null);
    setupAdminTransactionForm(content);
  } else if (kind === 'walkin') {
    if (!isAdminAuthorized() || !adminDataReady) {
      showToast('Data dashboard belum tersedia untuk membuat transaksi langsung.', 'error');
      return;
    }
    renderTransactionForm(content, service || regularServices()[0]);
  } else if (kind === 'settings') {
    content.innerHTML = `<p class="eyebrow">PENGATURAN STUDIO</p><h2>Akun <em>studio.</em></h2><p class="dialog-intro">${adminUser ? `Masuk sebagai ${escapeHtml(adminUser.email || 'admin')}.` : 'Pengaturan operasional Rinse Society.'}</p><div class="settings-status"><strong>Rinse Society · Semarang</strong><p>Kelola jadwal, layanan, dan produk studio dari dashboard.</p></div><div class="dialog-actions">${adminUser ? '<button class="button button-dark" data-action="logout">Keluar dari akun</button>' : ''}<button class="button button-quiet" data-action="close-dialog">Tutup</button></div>`;
  } else if (kind === 'admin-login') {
    content.innerHTML = '<p class="eyebrow">LOGIN ADMIN</p><h2>Masuk ke <em>dashboard studio.</em></h2><p class="dialog-intro">Area pengelolaan hanya tersedia untuk akun Admin terverifikasi.</p><form id="admin-login-form" class="dialog-form"><label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="button button-dark button-full" type="submit">Masuk sebagai Admin</button></form>';
  } else if (kind === 'cart') renderCartDialog(content);
  else if (kind === 'self-service') {
    const selfService = service || db.services_products.find(item => isSelfServiceItem(item) && item.type === 'CAR') || db.services_products.find(isSelfServiceItem);
    renderTransactionForm(content, selfService);
  }
  else if (kind === 'order') renderTransactionForm(content, service);
  else if (kind === 'product-checkout') renderProductCheckout(content);
  polishUiLabels(content);
  if (kind === 'self-service') {
    content.querySelector('.eyebrow').textContent = 'SELF-SERVICE · PEMESANAN';
  }
  dialog.showModal();
  simplifyUiSymbols(dialog);
}
function renderTransactionForm(content, selectedService) {
  const services = db.services_products.filter(item => item.item_type === 'SERVICE' && item.active !== false);
  const service = services.find(item => item.id === selectedService?.id)
    || services.find(item => item.category !== 'SELF_SERVICE')
    || services[0];
  if (!service) {
    content.innerHTML = '<div class="empty-state"><h3>Layanan belum tersedia.</h3><p>Muat ulang katalog sebelum membuat order.</p></div>';
    return;
  }
  const serviceOptions = () => services.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === service.id ? 'selected' : ''}>${escapeHtml(item.name)} · ${money(item.price)}</option>`).join('');
  content.innerHTML = `<p class="eyebrow">ORDER LAYANAN</p><h2>Buat pesanan<br><em>kendaraan Anda.</em></h2><p class="dialog-intro">Waktu kunjungan diatur otomatis. Pembayaran disimulasikan dan disimpan setelah order berhasil.</p><form id="transaction-form" class="dialog-form"><input type="hidden" name="flow" value="order"><input type="hidden" name="request_id" value="${crypto.randomUUID()}"><input type="hidden" name="duration" value="${service.duration}"><label>Pilih layanan<select name="service_id" required>${serviceOptions()}</select></label><div class="form-two"><label>Nama lengkap<input name="name" autocomplete="name" required placeholder="Nama pelanggan"></label><label>Nomor HP<input name="phone" type="tel" autocomplete="tel" required placeholder="08…"></label></div><div class="form-two"><label>Model kendaraan<input name="model" placeholder="Contoh: Honda HR-V"></label><label>Nomor polisi<input name="plate" required placeholder="H 1234 NP"></label></div><label>Metode pembayaran<select name="payment" required></select></label><small id="order-payment-note">Pembayaran simulasi akan dicatat lunas setelah order tersimpan.</small><div class="dialog-total"><span>Total pesanan</span><strong id="flow-total">${money(service.price)}</strong></div><button class="button button-dark button-full" type="submit">Bayar & buat pesanan</button></form>`;
  const form = content.querySelector('#transaction-form');
  const serviceField = form.elements.service_id;
  const paymentField = form.elements.payment;
  const paymentNote = content.querySelector('#order-payment-note');
  const updateServiceDetails = () => {
    const selected = services.find(item => item.id === serviceField.value);
    if (!selected) return;
    form.elements.duration.value = selected.duration;
    content.querySelector('#flow-total').textContent = money(selected.price);
    const methods = selected.category === 'SELF_SERVICE'
      ? [['QRIS', 'QRIS'], ['E_WALLET', 'Dompet digital'], ['CARD', 'Kartu']]
      : [['CASH', 'Bayar di tempat'], ['QRIS', 'QRIS'], ['E_WALLET', 'Dompet digital'], ['CARD', 'Kartu']];
    paymentField.innerHTML = methods.map(([value, label]) => `<option value="${value}">${label}</option>`).join('');
    paymentNote.textContent = selected.category === 'SELF_SERVICE'
      ? 'Bay dan waktu dipilih otomatis; pembayaran simulasi dicatat lunas saat order tersimpan.'
      : 'Order walk-in; pembayaran simulasi dicatat lunas saat order tersimpan.';
  };
  serviceField.addEventListener('change', updateServiceDetails);
  const rotateRequestIdAfterEdit = () => {
    if (form.dataset.orderRequestAttempted !== 'true') return;
    form.elements.request_id.value = crypto.randomUUID();
    form.dataset.orderRequestAttempted = 'false';
  };
  form.addEventListener('input', rotateRequestIdAfterEdit);
  form.addEventListener('change', rotateRequestIdAfterEdit);
  updateServiceDetails();
}
function renderCartDialog(content) {
  const lines = Object.entries(cart).map(([id, row]) => ({ product: catalogItem(db.services_products.find(item => item.id === id) || {}), ...row })).filter(row => row.product.id);
  const total = lines.reduce((sum, row) => sum + row.quantity * row.product.price, 0);
  content.innerHTML = `<p class="eyebrow">PRODUK PILIHAN</p><h2>Keranjang <em>belanja.</em></h2>${lines.length ? `<div class="cart-lines">${lines.map(({ product, quantity }) => `<div class="cart-line"><img src="${product.image}" alt="${escapeHtml(product.name)}"><span><strong>${escapeHtml(product.name)}</strong><small>${money(product.price)} per produk</small></span><div class="quantity-control"><button data-cart-change="${product.id}" data-delta="-1" aria-label="Kurangi satu">−</button><b>${quantity}</b><button data-cart-change="${product.id}" data-delta="1" aria-label="Tambah satu">+</button></div><strong>${money(product.price * quantity)}</strong></div>`).join('')}</div><div class="dialog-total"><span>Subtotal</span><strong>${money(total)}</strong></div><button class="button button-dark button-full" data-action="checkout-product">Lanjut ke pembayaran <span>↗</span></button>` : `<div class="empty-state"><h3>Keranjang masih kosong.</h3><p>Pilih produk perawatan kendaraan dari rak studio.</p><button class="button button-dark" data-action="close-dialog">Lanjut belanja</button></div>`}`;
  simplifyUiSymbols(content);
}
function renderProductCheckout(content) {
  const productIds = Object.keys(cart);
  const fulfillment = readProductCheckoutState();
  if (!fulfillment.shipping_fee_paid && !productIds.includes(fulfillment.fee_item_id)) fulfillment.fee_item_id = '';
  if (fulfillment.fulfillment_method === 'COURIER' && !fulfillment.shipping_fee_paid && !fulfillment.fee_item_id) fulfillment.fee_item_id = productIds[0] || '';
  saveProductCheckoutState(fulfillment);
  const subtotal = Object.entries(cart).reduce((sum, [id, row]) => sum + calculateProductAmount(db.services_products.find(item => item.id === id)?.price || 0, row.quantity), 0);
  const shippingFee = productShippingFee(fulfillment.fulfillment_method, fulfillment.fulfillment_method === 'COURIER' && !fulfillment.shipping_fee_paid && !!fulfillment.fee_item_id);
  const total = subtotal + shippingFee;
  const requestIds = Object.fromEntries(Object.keys(cart).map(id => [id, getProductRequestId(id)]));
  content.innerHTML = `<p class="eyebrow">PEMBAYARAN PRODUK</p><h2>Perawatan pilihan<br><em>segera di tangan Anda.</em></h2><form id="product-checkout-form" class="dialog-form"><input type="hidden" name="request_ids" value="${escapeHtml(JSON.stringify(requestIds))}"><label>Nama lengkap<input name="name" required placeholder="Nama lengkap"></label><label>Nomor HP<input name="phone" required type="tel" placeholder="08…"></label><fieldset id="product-fulfillment-options" class="payment-options fulfillment-options"><legend>Metode pemenuhan</legend><label><input type="radio" name="fulfillment_method" value="PICKUP" ${fulfillment.fulfillment_method === 'PICKUP' ? 'checked' : ''} ${fulfillment.shipping_fee_paid ? 'disabled' : ''}><span>Ambil di Studio (Pick-up)</span></label><label><input type="radio" name="fulfillment_method" value="COURIER" ${fulfillment.fulfillment_method === 'COURIER' ? 'checked' : ''} ${fulfillment.shipping_fee_paid ? 'disabled' : ''}><span>Pengiriman Online / Kurir</span></label><p id="courier-note" ${fulfillment.fulfillment_method !== 'COURIER' ? 'hidden' : ''}>Khusus pengiriman lokal (Maks. 10 km dari studio). Biaya ongkir flat Rp 10.000.</p><label id="delivery-address-label" ${fulfillment.fulfillment_method !== 'COURIER' ? 'hidden' : ''}>Alamat Pengiriman<textarea name="fulfillment_address" rows="2" maxlength="500" ${fulfillment.fulfillment_method !== 'COURIER' || fulfillment.shipping_fee_paid ? 'disabled' : 'required'}>${escapeHtml(fulfillment.fulfillment_address)}</textarea></label></fieldset><div id="fulfillment-summary" class="dialog-total"><span>Metode pemenuhan</span><strong>${fulfillmentLabel(fulfillment.fulfillment_method)}</strong></div><div id="shipping-summary" class="dialog-total"><span>Ongkir</span><strong>${money(shippingFee)}</strong></div><fieldset class="payment-options"><legend>Metode pembayaran</legend>${['CASH', 'QRIS', 'E_WALLET', 'CARD'].map((method, index) => `<label><input type="radio" name="payment" value="${method}" ${index === 0 ? 'checked' : ''}><span>${method === 'E_WALLET' ? 'E-Wallet' : method}</span></label>`).join('')}</fieldset><div class="dialog-total"><span>Total pembayaran</span><strong id="product-checkout-total">${money(total)}</strong></div><button class="button button-dark button-full" type="submit">Bayar sekarang <span>↗</span></button><small>Pembayaran disimulasikan dan dicatat lunas setelah pesanan tersimpan.</small></form>`;
    content.innerHTML = `<p class="eyebrow">PEMBAYARAN PRODUK</p><h2>Perawatan pilihan<br><em>segera di tangan Anda.</em></h2><form id="product-checkout-form" class="dialog-form"><input type="hidden" name="request_ids" value="${escapeHtml(JSON.stringify(requestIds))}">${fulfillment.shipping_fee_paid ? `<input type="hidden" name="fulfillment_method" value="${fulfillment.fulfillment_method}">` : ''}<label>Nama lengkap<input name="name" required placeholder="Nama lengkap"></label><label>Nomor HP<input name="phone" required type="tel" placeholder="08…"></label><fieldset id="product-fulfillment-options" class="payment-options fulfillment-options"><legend>Metode pemenuhan</legend><label><input type="radio" name="fulfillment_method" value="PICKUP" ${fulfillment.fulfillment_method === 'PICKUP' ? 'checked' : ''} ${fulfillment.shipping_fee_paid ? 'disabled' : ''}><span>Ambil di Studio (Pick-up)</span></label><label><input type="radio" name="fulfillment_method" value="COURIER" ${fulfillment.fulfillment_method === 'COURIER' ? 'checked' : ''} ${fulfillment.shipping_fee_paid ? 'disabled' : ''}><span>Pengiriman Online / Kurir</span></label><p id="courier-note" ${fulfillment.fulfillment_method !== 'COURIER' ? 'hidden' : ''}>Khusus pengiriman lokal (Maks. 10 km dari studio). Biaya ongkir flat Rp 10.000.</p><label id="delivery-address-label" ${fulfillment.fulfillment_method !== 'COURIER' ? 'hidden' : ''}>Alamat Pengiriman<textarea name="fulfillment_address" rows="2" maxlength="500" ${fulfillment.fulfillment_method !== 'COURIER' || fulfillment.shipping_fee_paid ? 'disabled' : 'required'}>${escapeHtml(fulfillment.fulfillment_address)}</textarea></label></fieldset><div id="fulfillment-summary" class="dialog-total"><span>Metode pemenuhan</span><strong>${fulfillmentLabel(fulfillment.fulfillment_method)}</strong></div><div id="delivery-address-summary" class="dialog-total" ${fulfillment.fulfillment_method !== 'COURIER' ? 'hidden' : ''}><span>Alamat Pengiriman</span><strong>${escapeHtml(fulfillment.fulfillment_address)}</strong></div><div id="shipping-summary" class="dialog-total"><span>Ongkir</span><strong>${money(shippingFee)}</strong></div><fieldset class="payment-options"><legend>Metode pembayaran</legend>${['CASH', 'QRIS', 'E_WALLET', 'CARD'].map((method, index) => `<label><input type="radio" name="payment" value="${method}" ${index === 0 ? 'checked' : ''}><span>${method === 'E_WALLET' ? 'E-Wallet' : method}</span></label>`).join('')}</fieldset><div class="dialog-total"><span>Total pembayaran</span><strong id="product-checkout-total">${money(total)}</strong></div><button class="button button-dark button-full" type="submit">Bayar sekarang <span>↗</span></button><small>Pembayaran disimulasikan dan dicatat lunas setelah pesanan tersimpan.</small></form>`;
  const form = content.querySelector('#product-checkout-form');
  const updateFulfillment = () => {
    const method = form.elements.fulfillment_method.value;
    fulfillment.fulfillment_method = method;
    fulfillment.fulfillment_address = method === 'COURIER' ? form.elements.fulfillment_address.value.trim() : '';
    if (method === 'COURIER' && !fulfillment.shipping_fee_paid && !fulfillment.fee_item_id) fulfillment.fee_item_id = productIds[0] || '';
    if (method === 'PICKUP' && !fulfillment.shipping_fee_paid) fulfillment.fee_item_id = '';
    saveProductCheckoutState(fulfillment);
    const fee = productShippingFee(method, method === 'COURIER' && !fulfillment.shipping_fee_paid && !!fulfillment.fee_item_id);
    form.querySelector('#courier-note').hidden = method !== 'COURIER';
    form.querySelector('#delivery-address-label').hidden = method !== 'COURIER';
    form.elements.fulfillment_address.disabled = method !== 'COURIER' || fulfillment.shipping_fee_paid;
    form.elements.fulfillment_address.required = method === 'COURIER' && !fulfillment.shipping_fee_paid;
    form.querySelector('#fulfillment-summary strong').textContent = fulfillmentLabel(method);
      form.querySelector('#delivery-address-summary').hidden = method !== 'COURIER';
      form.querySelector('#delivery-address-summary strong').textContent = fulfillment.fulfillment_address;
      productFulfillmentDetails(tx)
    form.querySelector('#shipping-summary strong').textContent = money(fee);
    form.querySelector('#product-checkout-total').textContent = money(subtotal + fee);
  };
  form.querySelector('#product-fulfillment-options').addEventListener('change', updateFulfillment);
  form.elements.fulfillment_address.addEventListener('input', () => {
    fulfillment.fulfillment_address = form.elements.fulfillment_address.value;
    form.querySelector('#delivery-address-summary strong').textContent = fulfillment.fulfillment_address;
    saveProductCheckoutState(fulfillment);
  });
  simplifyUiSymbols(content);
}
function makeCode() { return `RS-${getJakartaDateString().slice(2).replaceAll('-', '')}-${Math.floor(1000 + Math.random() * 9000)}`; }
async function customerByPhone(phone) {
  if (!databaseConnected) throw new Error('Data pelanggan belum dapat dimuat. Silakan coba lagi.');
  if (page === 'admin' && adminUser) return rpcRequest('lookup_customer_by_phone', { p_phone: phone });
  const capability = customerCapability(phone);
  if (!capability) return [];
  return rpcRequest('lookup_customer_profile_by_capability', {
    p_phone: phone,
    p_owner_token: capability.owner_token
  });
}
async function findOrCreateCustomer(name, phone, address = '') {
  const isAdmin = page === 'admin' && !!adminUser;
  const capability = isAdmin ? null : customerCapability(phone, true);
  const matches = isAdmin
    ? await customerByPhone(phone)
    : await rpcRequest('lookup_customer_profile_by_capability', {
      p_phone: phone,
      p_owner_token: capability.owner_token
    });
  if (matches.length) {
    const first = matches[0];
    return {
      customer: { id: first.customer_id, full_name: first.full_name, phone: first.phone, address: first.customer_address || '' },
      vehicles: matches.filter(row => row.vehicle_id).map(row => ({ id: row.vehicle_id, customer_id: row.customer_id, type: row.vehicle_type, plate: row.vehicle_plate, model: row.vehicle_model })),
      owner_token: capability?.owner_token || null
    };
  }
  const customer = {
    id: capability?.customer_id || crypto.randomUUID(),
    full_name: String(name).trim(),
    phone: String(phone).trim(),
    address: String(address || '').trim()
  };
  if (isAdmin) await insertRow('customers', customer);
  return { customer, vehicles: [], owner_token: capability?.owner_token || null };
}
function makeVehicle(customerId, type, model, plate) {
  return { id: crypto.randomUUID(), customer_id: customerId, type, plate: String(plate || '').trim().toUpperCase(), model: String(model || (type === 'CAR' ? 'Mobil' : 'Sepeda motor')).trim() };
}
function normalizePlate(value = '') {
  return String(value).toUpperCase().replace(/[^A-Z0-9]/g, '');
}
function resolveOrderVehicle(customerVehicles, customerId, type, model, plate) {
  const normalizedPlate = normalizePlate(plate);
  const existingVehicle = customerVehicles.find(vehicle => vehicle.type === type
    && normalizePlate(vehicle.plate) === normalizedPlate);
  return existingVehicle || makeVehicle(customerId, type, model, plate);
}
async function persistTransaction(tx, ownerToken = null, requestId = null) {
  assertStudioOpenAt();
  if (!databaseConnected) throw new Error('Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.');
  if (carriesPickupData(tx)) throw new Error('Add-on antar-jemput tidak lagi tersedia.');
  tx.payment_status = ['PENDING', 'PAID', 'FAILED', 'REFUNDED'].includes(String(tx.payment_status || '').toUpperCase()) ? String(tx.payment_status).toUpperCase() : 'PENDING';
  tx.refund_status = ['NONE', 'PENDING', 'COMPLETED'].includes(String(tx.refund_status || 'NONE').toUpperCase()) ? String(tx.refund_status || 'NONE').toUpperCase() : 'NONE';
  if (tx.item_type === 'PRODUCT') {
    if (!ownerToken) {
      const productOrderPayload = {
        request_id: requestId,
        customer_name: tx.customer_name,
        customer_phone: tx.customer_phone,
        item_id: tx.item_id,
        quantity: tx.quantity,
        payment_method: tx.payment_method,
        fulfillment_method: tx.fulfillment_method,
        fulfillment_address: tx.fulfillment_address,
        shipping_fee: tx.shipping_fee,
        fulfillment_order_id: tx.fulfillment_order_id
      };
      const result = await rpcRequest('create_demo_product_order', { p_order: productOrderPayload });
      if (!isValidDemoProductOrderResponse(result, {
        item_id: tx.item_id,
        quantity: tx.quantity,
        payment_method: tx.payment_method,
        fulfillment_method: tx.fulfillment_method,
        fulfillment_address: tx.fulfillment_address,
        shipping_fee: tx.shipping_fee,
        fulfillment_order_id: tx.fulfillment_order_id,
        amount: tx.amount
      })) throw new Error('Database belum mengonfirmasi penyimpanan pesanan produk.');
      mergePersistedTransaction(tx, result);
    } else {
      const newStock = ownerToken
        ? await rpcRequest('create_product_sale_with_capability', { p_transaction: tx, p_owner_token: ownerToken })
        : await rpcRequest('record_product_sale', { p_transaction: tx });
      if (!Number.isSafeInteger(newStock) || newStock < 0) throw new Error('Database belum mengonfirmasi penyimpanan pesanan produk.');
      const product = db.services_products.find(item => item.id === tx.item_id);
      if (product) product.stock = newStock;
    }
  } else {
    const orderPayload = {
      request_id: requestId,
      customer_name: tx.customer_name,
      customer_phone: tx.customer_phone,
      vehicle_model: tx.vehicle_model,
      vehicle_plate: tx.vehicle_plate,
      item_id: tx.item_id,
      payment_method: tx.payment_method,
      created_at: tx.created_at
    };
    const result = await rpcRequest('create_demo_service_order', {
      p_order: orderPayload
    });
    const service = db.services_products.find(item => item.id === tx.item_id);
    const expectedTransactionType = isSelfServiceItem(service) ? 'BOOKING' : 'WALK_IN';
    if (!isValidServiceOrderResponse(result, {
      item_id: tx.item_id,
      transaction_type: expectedTransactionType,
      transaction_status: expectedTransactionType === 'BOOKING' ? 'BOOKED' : 'PENDING',
      payment_method: tx.payment_method,
      amount: tx.amount,
      duration_minutes: getServiceDuration(service?.name || service?.id, service?.duration)
    })) {
      throw new Error('Database belum mengonfirmasi penyimpanan pesanan layanan.');
    }
    mergePersistedTransaction(tx, result);
  }
  db.transactions.unshift(tx);
  dispatchTransactionStateChange();
  return tx;
}
async function submitService(form) {
  const data = new FormData(form);
  const selectedService = db.services_products.find(item => item.id === data.get('service_id'));
  assertServiceScheduleAvailable(getServiceDuration(selectedService?.name || selectedService?.id, selectedService?.duration));
  if (!databaseConnected) throw new Error('Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.');
  const service = db.services_products.find(item => item.id === data.get('service_id') && item.active !== false);
  if (!service) throw new Error('Layanan tidak ditemukan. Muat ulang katalog lalu coba lagi.');
  if (String(data.get('flow') || '') !== 'order') throw new Error('Jenis order tidak lagi didukung. Buka kembali form order.');
  const isSelfService = isSelfServiceItem(service);
  if (!isSelfService && !isRegularServiceItem(service)) throw new Error('Layanan ini tidak tersedia untuk order.');
  const customerName = String(data.get('name') || '').trim();
  const phone = String(data.get('phone') || '').trim();
  const plate = String(data.get('plate') || '').trim().toUpperCase();
  if (customerName.length < 2) throw new Error('Masukkan nama lengkap.');
  const normalizedPhone = toSupabasePhone(phone);
  if (!isValidIndonesianPlate(plate)) throw new Error('Masukkan nomor polisi Indonesia yang valid, contoh H 1234 NP.');
  const paymentMethod = validateServicePaymentMethod(String(data.get('payment') || ''), isSelfService ? 'BOOKING' : 'WALK_IN');
  const tx = { customer_name: customerName, customer_phone: normalizedPhone, vehicle_model: String(data.get('model') || '').trim(), vehicle_plate: plate, item_id: service.id, item_type: 'SERVICE', item_name: service.name, amount: service.price, payment_method: paymentMethod, payment_status: 'PAID', refund_status: 'NONE', created_at: new Date().toISOString() };
  const requestId = String(data.get('request_id') || '');
  if (!isValidRequestId(requestId)) {
    throw new Error('Kunci permintaan tidak valid. Tutup lalu buka kembali form order.');
  }
  form.dataset.orderRequestAttempted = 'true';
  await persistTransaction(tx, null, requestId);
  const currentAdminTab = activeAdminTab;
  try {
    if (page === 'admin') await loadAdminData();
    else await loadPublicData();
  }
  catch (_) { showToast('Transaksi tersimpan, tetapi data terbaru belum dapat dimuat.', 'error'); }
  showConfirmation({ ...tx, payment_status: tx.payment_status, transaction_status: tx.transaction_status });
  render();
  renderBayStatus();
  if (page === 'admin' && currentAdminTab !== 'overview') activateAdminTab(currentAdminTab);
}
function showConfirmation(tx) {
  const isSelfServiceSession = tx.transaction_type === 'BOOKING';
  document.getElementById('dialog-content').innerHTML = `<div class="confirmation"><div class="confirmation-check">✓</div><p class="eyebrow">${isSelfServiceSession ? 'SESI SELF-SERVICE TERCATAT' : 'TRANSAKSI TERCATAT'}</p><h2>${isSelfServiceSession ? 'Sesi Self-Service dikonfirmasi.' : 'Pembayaran berhasil.'}</h2><p class="dialog-intro">Pembayaran simulasi telah disimpan sebagai LUNAS bersama order Anda.</p><div class="pass-card"><div><span>KODE ORDER</span><strong>${escapeHtml(tx.code)}</strong><small>${escapeHtml(tx.item_name)} · ${tx.booking_date} · ${escapeHtml(formatTransactionTime(tx))}</small></div><img class="fake-qr" src="https://api.qrserver.com/v1/create-qr-code/?size=144x144&data=${encodeURIComponent(tx.code)}" alt="Kode order ${escapeHtml(tx.code)}"></div><div class="confirmation-details"><span>${money(tx.amount)}</span><span class="payment-status payment-status-paid">LUNAS (SIMULASI)</span>${statusBadge(tx.payment_method)}</div><button class="button button-dark button-full" data-action="new-service-order">Buat pesanan baru</button></div>`;
}
async function submitProducts(form) {
  const transactionNow = new Date();
  assertStudioOpenAt(transactionNow);
  const data = new FormData(form);
  const customerName = String(data.get('name') || '').trim();
  const phone = String(data.get('phone') || '').trim();
  if (customerName.length < 2) throw new Error('Masukkan nama lengkap.');
  const normalizedPhone = toSupabasePhone(phone);
  const fulfillmentMethod = String(data.get('fulfillment_method') || '');
  if (!['PICKUP', 'COURIER'].includes(fulfillmentMethod)) throw new Error('Pilih metode pemenuhan produk.');
  const fulfillment = readProductCheckoutState();
  const fulfillmentAddress = fulfillmentMethod === 'COURIER' ? String(data.get('fulfillment_address') || fulfillment.fulfillment_address).trim() : '';
  if (fulfillmentMethod === 'COURIER' && !fulfillmentAddress) throw new Error('Masukkan alamat pengiriman.');
  fulfillment.fulfillment_method = fulfillmentMethod;
  fulfillment.fulfillment_address = fulfillmentAddress;
  saveProductCheckoutState(fulfillment);
  const lines = Object.entries(cart).filter(([id, row]) => row.quantity && db.services_products.some(item => item.id === id));
  if (!lines.length) throw new Error('Keranjang masih kosong.');
  if (fulfillmentMethod === 'COURIER' && !fulfillment.shipping_fee_paid && !fulfillment.fee_item_id) fulfillment.fee_item_id = lines[0][0];
  for (const [id, row] of lines) {
    const product = db.services_products.find(item => item.id === id);
    const quantity = Number(row.quantity);
    if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new Error('Jumlah produk tidak valid.');
    if (product.stock < quantity) throw new Error(`Stok ${catalogItem(product).name} tidak mencukupi.`);
  }
  let requestIds = {};
  try { requestIds = JSON.parse(String(data.get('request_ids') || '{}')); } catch (_) {}
  const isAdmin = page === 'admin' && adminUser?.app_metadata?.rinse_role === 'admin';
  const customerResult = isAdmin ? await findOrCreateCustomer(customerName, normalizedPhone) : null;
  const customer = customerResult?.customer || null;
  if (customer) {
    const identity = resolveCustomerIdentity({ name: customerName, phone: normalizedPhone, existingCustomers: [customer] });
    if (identity.mismatch) throw new Error('Identitas pelanggan tidak cocok dengan nomor telepon yang diverifikasi.');
  }
  const completedIds = [];
  const completedTransactions = [];
  for (const [id, row] of lines) {
    const product = db.services_products.find(item => item.id === id);
    const quantity = Number(row.quantity);
    const shippingFee = productShippingFee(fulfillmentMethod,
      fulfillmentMethod === 'COURIER' && !fulfillment.shipping_fee_paid && id === fulfillment.fee_item_id);
    const requestId = requestIds[id];
    if (!isValidRequestId(requestId)) throw new Error('Kunci permintaan produk tidak valid. Buka kembali checkout lalu coba lagi.');
    try {
      const transaction = {
        id: crypto.randomUUID(), code: makeCode(), customer_id: customer?.id || null,
        customer_name: customerName, customer_phone: normalizedPhone, vehicle_id: null,
        item_id: id, item_type: 'PRODUCT', item_name: product.name, quantity,
        amount: calculateProductAmount(product.price, quantity, shippingFee), payment_method: data.get('payment'),
        fulfillment_method: fulfillmentMethod,
        fulfillment_address: fulfillmentAddress || null,
        shipping_fee: shippingFee,
        fulfillment_order_id: fulfillment.order_id,
        payment_status: 'PAID', refund_status: 'NONE', transaction_type: 'SHOP',
        transaction_status: 'PENDING', queue_status: 'WAITING',
        booking_date: getJakartaDateString(transactionNow), booking_time: getJakartaTimeString(transactionNow),
        duration_minutes: 0, created_at: transactionNow.toISOString()
      };
      const savedTransaction = await persistTransaction(transaction, customerResult?.owner_token || null, requestId);
      if (shippingFee) {
        fulfillment.shipping_fee_paid = true;
        fulfillment.fee_item_id = '';
        saveProductCheckoutState(fulfillment);
      }
      completedIds.push(id);
      completedTransactions.push(savedTransaction);
    } catch (error) {
      if (!completedIds.length) throw error;
      for (const completedId of completedIds) delete cart[completedId];
      clearProductRequestIds(completedIds);
      localStorage.setItem(CART_KEY, JSON.stringify(cart));
      try { await loadPublicData(); } catch (_) {}
      document.getElementById('dialog-content').innerHTML = `<div class="confirmation"><div class="confirmation-check">!</div><p class="eyebrow">PESANAN SEBAGIAN TERCATAT</p><h2>Produk yang belum diproses<br><em>tetap di keranjang.</em></h2><p class="dialog-intro">Sebagian produk berhasil dipesan. Periksa keranjang sebelum mencoba lagi.</p><div class="product-order-results">${completedTransactions.map(saved => `<article><strong>${escapeHtml(saved.code)}</strong><span>${escapeHtml(saved.item_name)} · ${saved.quantity} item · ${money(saved.amount)}</span><span>${fulfillmentLabel(saved.fulfillment_method)}</span><span>${statusBadge(saved.payment_status)} ${statusBadge(transactionStatusLabel(saved))}</span></article>`).join('')}</div><button class="button button-dark button-full" data-action="close-dialog">Tutup</button></div>`;
        document.getElementById('dialog-content').innerHTML = `<div class="confirmation"><div class="confirmation-check">!</div><p class="eyebrow">PESANAN SEBAGIAN TERCATAT</p><h2>Produk yang belum diproses<br><em>tetap di keranjang.</em></h2><p class="dialog-intro">Sebagian produk berhasil dipesan. Periksa keranjang sebelum mencoba lagi.</p><div class="product-order-results">${completedTransactions.map(saved => `<article><strong>${escapeHtml(saved.code)}</strong><span>${escapeHtml(saved.item_name)} · ${saved.quantity} item · ${money(saved.amount)}</span>${productFulfillmentDetails(saved)}<span>${statusBadge(saved.payment_status)} ${statusBadge(transactionStatusLabel(saved))}</span></article>`).join('')}</div><button class="button button-dark button-full" data-action="close-dialog">Tutup</button></div>`;
      render();
      return;
    }
  }
  cart = {};
  localStorage.removeItem(CART_KEY);
  localStorage.removeItem(PRODUCT_CHECKOUT_KEY);
  clearProductRequestIds(lines.map(([id]) => id));
  try { await loadPublicData(); }
  catch (_) { showToast('Pesanan tersimpan, tetapi katalog belum dapat diperbarui.', 'error'); }
  document.getElementById('dialog-content').innerHTML = `<div class="confirmation"><div class="confirmation-check">✓</div><p class="eyebrow">PESANAN TERCATAT</p><h2>Pembayaran berhasil.</h2><p class="dialog-intro">Pembayaran simulasi telah disimpan sebagai LUNAS bersama pesanan produk.</p><div class="product-order-results">${completedTransactions.map(saved => `<article><strong>${escapeHtml(saved.code)}</strong><span>${escapeHtml(saved.item_name)} · ${saved.quantity} item · ${money(saved.amount)}</span><span>${fulfillmentLabel(saved.fulfillment_method)}</span><span>${statusBadge(saved.payment_status)} ${statusBadge(transactionStatusLabel(saved))}</span></article>`).join('')}</div><button class="button button-dark button-full" data-action="close-dialog">Kembali ke studio <span>↗</span></button></div>`;
    document.getElementById('dialog-content').innerHTML = `<div class="confirmation"><div class="confirmation-check">✓</div><p class="eyebrow">PESANAN TERCATAT</p><h2>Pembayaran berhasil.</h2><p class="dialog-intro">Pembayaran simulasi telah disimpan sebagai LUNAS bersama pesanan produk.</p><div class="product-order-results">${completedTransactions.map(saved => `<article><strong>${escapeHtml(saved.code)}</strong><span>${escapeHtml(saved.item_name)} · ${saved.quantity} item · ${money(saved.amount)}</span>${productFulfillmentDetails(saved)}<span>${statusBadge(saved.payment_status)} ${statusBadge(transactionStatusLabel(saved))}</span></article>`).join('')}</div><button class="button button-dark button-full" data-action="close-dialog">Kembali ke studio <span>↗</span></button></div>`;
  render();
}
function renderReportsLegacy() {
  const paid = db.transactions.filter(isRevenueTransaction).map(tx => ({ ...tx, amount: recognizedRevenueAmount(tx) }));
  const serviceRows = paid.filter(tx => tx.item_type === 'SERVICE');
  const productRows = paid.filter(tx => tx.item_type === 'PRODUCT');
  const serviceRevenue = serviceRows.reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0);
  const productRevenue = productRows.reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0);
  return `<div class="reports-heading"><div><p class="eyebrow">THE NUMBERS, CLEARLY</p><h2>Good work, accounted for.</h2></div><span class="shop-count">Live from ${db.transactions.length} transactions</span></div><div class="report-grid"><article class="report-card"><span>SERVICE REVENUE</span><strong>${money(serviceRevenue)}</strong><small>${serviceRows.length} wash transactions</small></article><article class="report-card"><span>PRODUCT REVENUE</span><strong>${money(productRevenue)}</strong><small>${productRows.length} product line items</small></article><article class="report-card"><span>TRANSACTION COUNT</span><strong>${paid.length}</strong><small>${db.transactions.filter(tx => tx.transaction_type === 'BOOKING').length} bookings · ${db.transactions.filter(tx => tx.transaction_type === 'WALK_IN').length} walk-ins</small></article><article class="report-card"><span>VEHICLES SERVED</span><strong>${new Set(serviceRows.map(tx => tx.vehicle_id).filter(Boolean)).size}</strong><small>${db.vehicles.filter(vehicle => vehicle.type === 'CAR').length} cars · ${db.vehicles.filter(vehicle => vehicle.type === 'MOTOR').length} motorcycles on file</small></article></div><section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">PAYMENT MIX</p><h2>How guests check out</h2></div></div>${['CASH', 'QRIS', 'E_WALLET', 'CARD'].map(method => { const rows = paid.filter(tx => tx.payment_method === method); const amount = rows.reduce((sum, tx) => sum + tx.amount, 0); return `<div class="revenue-bar-row"><span>${method.replaceAll('_', ' ')}</span><div><i style="width:${paid.length ? rows.length / paid.length * 100 : 0}%"></i></div><strong>${money(amount)} · ${rows.length}</strong></div>`; }).join('')}</section><section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">REVENUE BY SERVICE</p><h2>What guests come back for</h2></div></div>${SERVICES.map(service => { const amount = serviceRows.filter(tx => tx.item_id === service.id).reduce((sum, tx) => sum + tx.amount, 0); const maximum = Math.max(1, ...SERVICES.map(item => serviceRows.filter(tx => tx.item_id === item.id).reduce((sum, tx) => sum + tx.amount, 0))); return `<div class="revenue-bar-row"><span>${escapeHtml(service.name)}</span><div><i style="width:${amount / maximum * 100}%"></i></div><strong>${money(amount)}</strong></div>`; }).join('')}</section>`;
}
function renderReports() {
  const transactions = reportTransactions();
  const paid = transactions.filter(isRevenueTransaction);
  const services = paid.filter(tx => tx.item_type === 'SERVICE');
  const products = paid.filter(tx => tx.item_type === 'PRODUCT');
  const serviceRevenue = services.reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0);
  const productRevenue = products.reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0);
  const shippingRevenue = paid.reduce((sum, tx) => sum + shippingRevenueAmount(tx), 0);
  const totalRevenue = serviceRevenue + productRevenue + shippingRevenue;
  const vehiclesServed = new Set(transactions.filter(tx => tx.item_type === 'SERVICE' && isRevenueTransaction(tx) && tx.transaction_status === 'COMPLETED').map(tx => tx.vehicle_id).filter(Boolean)).size;
  return `<header class="reports-heading"><div><p class="eyebrow">LAPORAN PENDAPATAN</p><h2>Laporan Pendapatan</h2><p>Hanya transaksi lunas yang masuk perhitungan pendapatan.</p></div><div class="report-heading-actions"><span class="report-period">${transactions.length} transaksi · seluruh tanggal</span><button class="button button-dark" type="button" data-action="print-financial-report">Cetak Laporan Keuangan</button></div></header><div class="report-grid report-summary-grid"><article class="report-card report-card-primary"><span>TOTAL PENERIMAAN</span><strong>${money(totalRevenue)}</strong><small>Termasuk ongkir terpisah</small></article><article class="report-card"><span>PENDAPATAN JASA</span><strong>${money(serviceRevenue)}</strong><small>${services.length} transaksi lunas</small></article><article class="report-card"><span>PENDAPATAN PRODUK</span><strong>${money(productRevenue)}</strong><small>${products.length} baris · di luar ongkir</small></article><article class="report-card"><span>PENDAPATAN ONGKIR</span><strong>${money(shippingRevenue)}</strong><small>Akun pengiriman terpisah</small></article><article class="report-card"><span>JUMLAH TRANSAKSI</span><strong>${transactions.length}</strong><small>Semua status aktif</small></article><article class="report-card report-card-quiet"><span>TRANSAKSI LUNAS</span><strong>${paid.length}</strong><small>Lunas</small></article><article class="report-card report-card-quiet"><span>KENDARAAN DILAYANI</span><strong>${vehiclesServed}</strong><small>Kendaraan unik · selesai</small></article></div>`;
}
function renderFinancialPrintDocument() {
  const transactions = reportTransactions().sort((a, b) => new Date(`${b.booking_date}T${b.booking_time || '00:00'}`) - new Date(`${a.booking_date}T${a.booking_time || '00:00'}`));
  const paid = transactions.filter(isRevenueTransaction);
  const revenue = rows => rows.filter(isRevenueTransaction).reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0);
  const shippingRevenue = paid.reduce((sum, tx) => sum + shippingRevenueAmount(tx), 0);
  const totalCollected = paid.reduce((sum, tx) => sum + collectedAmount(tx), 0);
  const professionalWash = transactions.filter(tx => tx.item_type === 'SERVICE'
    && db.services_products.find(item => item.id === tx.item_id)?.category !== 'SELF_SERVICE');
  const selfService = transactions.filter(tx => tx.item_type === 'SERVICE'
    && db.services_products.find(item => item.id === tx.item_id)?.category === 'SELF_SERVICE');
  const products = transactions.filter(tx => tx.item_type === 'PRODUCT');
  const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' });
  const details = transactions.map(tx => {
    const customer = getCustomer(tx);
    const vehicle = getVehicle(tx);
    return `<tr><td>${escapeHtml(tx.booking_date)} ${escapeHtml(tx.booking_time || '')}</td><td>${escapeHtml(tx.code)}</td><td>${escapeHtml(customer?.full_name || 'Pelanggan')}</td><td>${escapeHtml(vehicle ? `${vehicle.plate} · ${vehicle.model}` : 'Produk')}</td><td>${escapeHtml(tx.item_name || 'Item')}</td><td class="print-number">${money(recognizedRevenueAmount(tx))}</td><td class="print-number">${money(shippingRevenueAmount(tx))}</td><td class="print-number">${money(collectedAmount(tx))}</td><td>${escapeHtml(statusLabel(tx.payment_status))}</td></tr>`;
  }).join('');
  return `<article id="financial-print-report" class="financial-print-report"><header class="print-report-header"><div class="print-brand"><span class="print-brand-mark">R</span><div><strong>Rinse Society</strong><span>Wash Studio · Semarang</span></div></div><div class="print-report-title"><h1>Laporan Keuangan</h1><p>Periode: Seluruh tanggal · ${transactions.length} transaksi aktif</p><p>Tanggal cetak: ${escapeHtml(printedAt)}</p><p>Admin: ${escapeHtml(adminUser?.email || 'Admin studio')}</p></div></header><section class="print-summary"><h2>Ringkasan Keuangan</h2><div class="print-summary-grid"><div><span>Total Penerimaan Lunas</span><strong>${money(totalCollected)}</strong></div><div><span>Pendapatan Jasa</span><strong>${money(revenue(professionalWash) + revenue(selfService))}</strong></div><div><span>Professional Wash</span><strong>${money(revenue(professionalWash))}</strong></div><div><span>Self-Service</span><strong>${money(revenue(selfService))}</strong></div><div><span>Pendapatan Produk</span><strong>${money(revenue(products))}</strong></div><div><span>Pendapatan Ongkir</span><strong>${money(shippingRevenue)}</strong></div><div><span>Total Transaksi Aktif</span><strong>${transactions.length}</strong></div></div></section><section class="print-detail"><h2>Rincian Transaksi</h2><table><thead><tr><th>Tanggal / Jam</th><th>ID Transaksi</th><th>Pelanggan</th><th>Plat / Model</th><th>Layanan / Produk</th><th>Pendapatan</th><th>Ongkir</th><th>Total</th><th>Status</th></tr></thead><tbody>${details || '<tr><td colspan="9">Tidak ada transaksi aktif pada periode laporan.</td></tr>'}</tbody></table></section><footer class="print-report-footer"><span>Rinse Society Wash Studio</span><span>Dokumen laporan keuangan internal</span></footer></article>`;
}
function renderPeriodReports() {
  const transactions = reportPeriodTransactions();
  const summary = calculateFinancialSummary(transactions, db.services_products);
  const vehiclesServed = new Set(summary.paid.filter(tx => tx.item_type === 'SERVICE' && tx.transaction_status === 'COMPLETED').map(tx => tx.vehicle_id).filter(Boolean)).size;
  const hppLabel = summary.productCount === 0
    ? 'Tidak ada penjualan retail pada periode'
    : summary.costRecordedCount === summary.productCount
      ? 'HPP dari biaya produk tercatat'
      : `HPP belum lengkap · biaya tercatat ${summary.costRecordedCount}/${summary.productCount} transaksi`;
  return `<header class="reports-heading"><div><p class="eyebrow">LAPORAN LABA RUGI</p><h2>Laporan Keuangan</h2><p>Perhitungan pendapatan hanya memasukkan transaksi lunas.</p></div><div class="report-heading-actions"><label class="report-period-control">Periode<select data-report-period aria-label="Periode laporan"><option value="month"${reportPeriod === 'month' ? ' selected' : ''}>Bulan Ini</option><option value="year"${reportPeriod === 'year' ? ' selected' : ''}>Tahun Ini</option></select></label><span class="report-period">${escapeHtml(currentReportPeriodLabel())} · ${transactions.length} transaksi</span><button class="button button-dark" type="button" data-action="print-financial-report">Cetak Laporan Keuangan</button></div></header><div class="report-grid report-summary-grid"><article class="report-card report-card-primary"><span>TOTAL PENDAPATAN KOTOR</span><strong>${money(summary.grossRevenue)}</strong><small>Jasa cuci + produk retail</small></article><article class="report-card"><span>PENDAPATAN JASA CUCI</span><strong>${money(summary.serviceRevenue)}</strong><small>Professional Wash + Self-Service</small></article><article class="report-card"><span>PENDAPATAN PRODUK RETAIL</span><strong>${money(summary.productRevenue)}</strong><small>${summary.productCount} transaksi produk lunas</small></article><article class="report-card"><span>HPP PRODUK RETAIL</span><strong>${money(summary.cogs)}</strong><small>${escapeHtml(hppLabel)}</small></article><article class="report-card report-card-primary"><span>LABA KOTOR</span><strong>${money(summary.grossProfit)}</strong><small>Pendapatan kotor dikurangi HPP retail</small></article><article class="report-card"><span>PENDAPATAN ONGKIR</span><strong>${money(summary.shippingRevenue)}</strong><small>Disajikan terpisah dari pendapatan produk</small></article><article class="report-card report-card-quiet"><span>TRANSAKSI LUNAS</span><strong>${summary.paid.length}</strong><small>${vehiclesServed} kendaraan selesai</small></article></div>`;
}
function renderPeriodFinancialPrintDocument() {
  const transactions = reportPeriodTransactions().sort((a, b) => new Date(`${b.booking_date}T${b.booking_time || '00:00'}`) - new Date(`${a.booking_date}T${a.booking_time || '00:00'}`));
  const summary = calculateFinancialSummary(transactions, db.services_products);
  const printedAt = new Date().toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Jakarta' });
  const accountRows = [
    ['Pendapatan jasa cuci', summary.serviceRevenue],
    ['Pendapatan penjualan produk retail', summary.productRevenue],
    ['Total pendapatan kotor', summary.grossRevenue],
    ['Pendapatan ongkir (disajikan terpisah)', summary.shippingRevenue],
    ['Harga pokok penjualan produk retail (HPP)', -summary.cogs],
    ['Laba kotor', summary.grossProfit]
  ].map(([label, amount]) => `<tr><td>${label}</td><td class="print-number">${money(amount)}</td></tr>`).join('');
  const details = transactions.map(tx => {
    const customer = getCustomer(tx);
    const recognized = isRevenueTransaction(tx);
    const amount = recognized ? recognizedRevenueAmount(tx) : null;
    const shipping = recognized ? shippingRevenueAmount(tx) : null;
    return `<tr><td>${escapeHtml(tx.booking_date)} ${escapeHtml(tx.booking_time || '')}</td><td>${escapeHtml(tx.code)}</td><td>${escapeHtml(customer?.full_name || 'Pelanggan')}</td><td>${escapeHtml(tx.item_name || 'Item')}</td><td>${escapeHtml(statusLabel(tx.payment_status))}</td><td class="print-number">${amount === null ? '—' : money(amount)}</td><td class="print-number">${shipping === null ? '—' : money(shipping)}</td></tr>`;
  }).join('');
  const costNote = summary.productCount && summary.costRecordedCount < summary.productCount
    ? `<p class="print-accounting-note">Perhatian: biaya pokok belum tercatat untuk ${summary.productCount - summary.costRecordedCount} transaksi produk. HPP dan laba kotor belum lengkap.</p>`
    : '';
  return `<article id="financial-print-report" class="financial-print-report"><header class="print-report-header"><div class="print-brand"><span class="print-brand-mark">R</span><div><strong>RINSE SOCIETY WASH STUDIO SEMARANG</strong><span>LAPORAN LABA RUGI OPERASIONAL</span></div></div><div class="print-report-title"><h1>Laporan Keuangan</h1><p>Periode: ${escapeHtml(currentReportPeriodLabel())}</p><p>Tanggal cetak: ${escapeHtml(printedAt)} WIB</p></div></header><section class="print-summary"><h2>Ringkasan Akun Keuangan</h2><table class="print-account-table"><thead><tr><th>Nama akun</th><th>Nilai (IDR)</th></tr></thead><tbody>${accountRows}</tbody></table>${costNote}<p class="print-accounting-note">Jumlah transaksi lunas: ${summary.paid.length} · ${summary.costRecordedCount}/${summary.productCount} transaksi produk memiliki data HPP.</p></section><section class="print-detail"><h2>Rincian Transaksi Periode</h2><table><thead><tr><th>Tanggal / Jam WIB</th><th>ID Transaksi</th><th>Pelanggan</th><th>Layanan / Produk</th><th>Status</th><th>Pendapatan</th><th>Ongkir</th></tr></thead><tbody>${details || '<tr><td colspan="7">Tidak ada transaksi pada periode laporan.</td></tr>'}</tbody></table></section><footer class="print-report-footer"><span>Dokumen internal · Rinse Society Wash Studio Semarang</span><span>Dicetak ${escapeHtml(printedAt)} WIB</span></footer><section class="print-signature"><p>Penanggung Jawab Keuangan</p><div><span>Manajer Studio / Kasir</span></div></section></article>`;
}
function renderAdminTransactionList(records, title, eyebrow) {
  const transactions = getOperationalTransactions(records)
    .filter(tx => !['CANCELLED', 'EXPIRED'].includes(tx.transaction_status))
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  const paidCount = transactions.filter(isRevenueTransaction).length;
  const pendingCount = transactions.filter(tx => tx.payment_status === 'PENDING').length;
  const rows = transactions.map(tx => {
    const customer = getCustomer(tx);
    const vehicle = getVehicle(tx);
    const transactionTime = formatTransactionTime(tx);
    const canConfirmCash = tx.payment_status === 'PENDING' && tx.transaction_status === 'PENDING'
      && tx.payment_method === 'CASH' && ['WALK_IN', 'SHOP'].includes(tx.transaction_type);
    const paymentAction = canConfirmCash ? `<button class="payment-mark-paid" type="button" data-payment-paid="${escapeHtml(tx.id)}">Tandai Lunas</button>` : '';
    const refundAction = tx.refund_status === 'PENDING' ? `<button class="payment-mark-paid" type="button" data-refund-complete="${escapeHtml(tx.id)}">Catat Pengembalian Dana</button>` : '';
    const refundStatus = tx.refund_status === 'PENDING' ? '<small>Pengembalian Dana: menunggu proses manual</small>' : tx.refund_status === 'COMPLETED' ? '<small>Pengembalian Dana: selesai</small>' : '';
    const pickupAddress = tx.item_type === 'PRODUCT'
      ? productFulfillmentDetails(tx)
      : ['addon-pickup', 'addon-pickup-moto'].includes(tx.addon_id) && customer?.address
        ? `<small>Alamat Antar-Jemput: ${escapeHtml(customer.address)}</small><small>Jarak pulang-pergi: ${escapeHtml(tx.pickup_distance_km)} km</small>`
        : '';
    const receiptAction = isPaidTransaction(tx) ? `<button type="button" aria-label="Cetak struk ${escapeHtml(tx.code)}" data-print-receipt="${escapeHtml(tx.id)}">Cetak Struk</button>` : '';
    return `<div class="catalog-row"><span class="transaction-code"><strong>${escapeHtml(tx.code)}</strong><small>${escapeHtml(transactionTypeLabel(tx.transaction_type))}</small></span><span class="transaction-date"><strong>${escapeHtml(tx.booking_date)}</strong><small>${escapeHtml(transactionTime)}</small></span><span class="transaction-customer"><strong>${escapeHtml(customer?.full_name || 'Pelanggan')}</strong><small>${escapeHtml(vehicle ? `${vehicle.plate} · ${vehicle.model}` : 'Pembelian produk')}</small>${pickupAddress}</span><span class="transaction-item">${escapeHtml(tx.item_name || (tx.item_type === 'PRODUCT' ? 'Pembelian produk' : 'Layanan cuci'))}</span><span class="transaction-payment"><span class="payment-method">${statusLabel(tx.payment_method)}</span><span class="payment-status payment-status-${String(tx.payment_status).toLowerCase()}">${statusLabel(tx.payment_status)}</span>${refundStatus}${paymentAction}${refundAction}</span><span class="transaction-state transaction-state-${String(tx.transaction_status).toLowerCase()}">${transactionStatusLabel(tx)}</span><span class="transaction-amount">${money(tx.amount)}</span><span class="transaction-row-actions">${receiptAction}<button type="button" aria-label="Edit transaksi ${escapeHtml(tx.code)}" data-edit-transaction="${escapeHtml(tx.id)}">Edit</button><button type="button" aria-label="Batalkan transaksi ${escapeHtml(tx.code)}" data-admin-remove="${escapeHtml(tx.id)}">Batal</button></span></div>`;
  }).join('')
    .replaceAll('>Batal</button>', '>Hapus</button>')
    .replaceAll('aria-label="Batalkan transaksi ', 'aria-label="Hapus transaksi ');
  return `<div class="catalog-toolbar transaction-toolbar"><div><p class="eyebrow">${eyebrow}</p><h2>${title}</h2><p>Data operasional studio dengan status pembayaran dan jadwal yang konsisten.</p></div><div class="transaction-actions"><div class="transaction-summary"><strong>${transactions.length} transaksi</strong><span>${paidCount} lunas · ${pendingCount} belum dibayar</span></div><button class="button button-dark" type="button" data-action="admin-transaction-create">+ Transaksi</button></div></div><div class="catalog-table transaction-table"><div class="catalog-row catalog-head"><span>REFERENSI</span><span>TANGGAL / WAKTU</span><span>PELANGGAN / KENDARAAN</span><span>LAYANAN / ITEM</span><span>PEMBAYARAN</span><span>STATUS</span><span>JUMLAH</span><span>KELOLA</span></div>${transactions.length ? rows : '<div class="queue-empty">Belum ada transaksi tercatat. Buat pesanan pertama melalui Beranda.</div>'}</div>`;
}
function receiptTransactions(transaction) {
  if (transaction.item_type !== 'PRODUCT' || !transaction.fulfillment_order_id) return [transaction];
  return safeRows(db.transactions)
    .filter(item => item.item_type === 'PRODUCT'
      && item.fulfillment_order_id === transaction.fulfillment_order_id
      && isPaidTransaction(item))
    .map(normalizeOperationalTransaction);
}
function printTransactionReceipt(transaction) {
  if (!isPaidTransaction(transaction)) {
    showToast('Struk hanya tersedia untuk transaksi yang sudah lunas.', 'error');
    return;
  }
  const rows = receiptTransactions(transaction);
  const customer = getCustomer(transaction);
  const vehicle = getVehicle(transaction);
  const createdAt = new Date(transaction.created_at || Date.now());
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta', dateStyle: 'medium', timeStyle: 'short'
  }).format(createdAt);
  const itemRows = rows.map(item => {
    const name = escapeHtml(item.item_name || (item.item_type === 'PRODUCT' ? 'Produk' : 'Layanan cuci'));
    if (item.item_type === 'SERVICE') {
      return `<div class="receipt-item"><span><strong>${name}</strong><small>Durasi ${item.duration_minutes} menit</small></span><strong>${money(item.amount)}</strong></div>`;
    }
    const quantity = sanitizeQuantity(item.quantity);
    const unitPrice = Math.max(0, finiteNumber(item.amount - item.shipping_fee, item.amount)) / quantity;
    return `<div class="receipt-item"><span><strong>${name}</strong><small>${quantity} × ${money(unitPrice)}</small></span><strong>${money(unitPrice * quantity)}</strong></div>`;
  }).join('');
  const subtotal = rows.reduce((sum, item) => sum + Math.max(0, finiteNumber(item.amount) - finiteNumber(item.shipping_fee)), 0);
  const shippingFee = rows.reduce((sum, item) => sum + Math.max(0, finiteNumber(item.shipping_fee)), 0);
  const total = rows.reduce((sum, item) => sum + finiteNumber(item.amount), 0);
  const invoice = rows.map(item => item.code || item.id).filter(Boolean).join(' / ') || transaction.id;
  const bayNumber = transaction.item_type === 'SERVICE' && transaction.bay_number
    ? `Bay B-${String(transaction.bay_number).padStart(2, '0')}` : '-';
  const receiptHtml = `<main class="receipt"><header class="receipt-header"><h1>RINSE SOCIETY</h1><p>Studio Car &amp; Motorcycle Wash</p></header><section class="receipt-meta"><div><span>Tanggal / Jam</span><strong>${escapeHtml(dateLabel)} WIB</strong></div><div><span>No. Invoice</span><strong>${escapeHtml(invoice)}</strong></div></section><section class="receipt-customer"><h2>Data Pelanggan</h2><div><span>Nama</span><strong>${escapeHtml(customer.full_name || 'Pelanggan')}</strong></div><div><span>No. WhatsApp</span><strong>${escapeHtml(transaction.customer_phone || customer.phone || '-')}</strong></div><div><span>Pelat Nomor</span><strong>${escapeHtml(vehicle?.plate || transaction.vehicle_plate || '-')}</strong></div><div><span>Bilik Cuci</span><strong>${escapeHtml(bayNumber)}</strong></div></section><section class="receipt-details"><h2>Rincian Belanja</h2>${itemRows}${shippingFee ? `<div class="receipt-item"><span><strong>Ongkos kirim</strong></span><strong>${money(shippingFee)}</strong></div>` : ''}</section><section class="receipt-totals"><div><span>Subtotal</span><strong>${money(subtotal)}</strong></div><div><span>Total Bayar</span><strong>${money(total)}</strong></div><div><span>Metode Pembayaran</span><strong>${escapeHtml(statusLabel(transaction.payment_method))}</strong></div></section><div class="receipt-paid">LUNAS / PAID</div><footer class="receipt-footer">Terima kasih atas kunjungan Anda di Rinse Society</footer></main>`;
  const popup = window.open('', '_blank', 'popup,width=420,height=760');
  if (!popup) {
    showToast('Pop-up diblokir browser. Izinkan pop-up untuk mencetak struk.', 'error');
    return;
  }
  const stylesheetUrl = new URL('receipt.css', document.baseURI).href;
  popup.addEventListener('afterprint', () => popup.close(), { once: true });
  popup.document.open();
  popup.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Struk ${escapeHtml(invoice)}</title><link rel="stylesheet" href="${escapeHtml(stylesheetUrl)}"></head><body>${receiptHtml}</body></html>`);
  popup.document.close();
  const stylesheet = popup.document.querySelector('link[rel="stylesheet"]');
  const startPrint = () => {
    popup.focus();
    popup.print();
  };
  if (stylesheet.sheet) startPrint();
  else {
    stylesheet.addEventListener('load', startPrint, { once: true });
    stylesheet.addEventListener('error', startPrint, { once: true });
  }
}
function renderAdminTransactionForm(content, transactionId = null) {
  const transaction = transactionId ? safeRows(db.transactions).find(tx => tx.id === transactionId) : null;
  if (transactionId && !transaction) {
    content.innerHTML = '<div class="empty-state"><h3>Transaksi tidak ditemukan.</h3><p>Data mungkin sudah dihapus atau berubah. Tutup dialog dan muat ulang daftar transaksi.</p></div>';
    return;
  }
  const catalog = safeRows(db.services_products);
  const itemType = transaction?.item_type || (catalog.some(item => item.item_type === 'SERVICE' && item.active !== false) ? 'SERVICE' : 'PRODUCT');
  const items = catalog.filter(item => item.item_type === itemType && item.active !== false);
  const selectedItem = items.find(item => item.id === transaction?.item_id) || items[0];
  if (!selectedItem) {
    content.innerHTML = '<div class="empty-state"><h3>Katalog belum tersedia.</h3><p>Tambahkan layanan atau produk sebelum mencatat transaksi.</p></div>';
    return;
  }
  const customer = transaction ? getCustomer(transaction) : null;
  const vehicle = transaction ? getVehicle(transaction) : null;
  const options = (values, selected) => values.map(([value, label]) => `<option value="${value}" ${value === selected ? 'selected' : ''}>${label}</option>`).join('');
  const itemOptions = items.map(item => `<option value="${escapeHtml(item.id)}" ${item.id === selectedItem.id ? 'selected' : ''}>${escapeHtml(item.name)} · ${money(item.price)}</option>`).join('');
  content.innerHTML = `<p class="eyebrow">${transaction ? 'PERBARUI TRANSAKSI' : 'TRANSAKSI MANUAL ADMIN'}</p><h2>${transaction ? 'Edit Transaksi' : 'Tambah Transaksi'}</h2><form id="admin-transaction-form" class="dialog-form"><input type="hidden" name="transaction_id" value="${escapeHtml(transaction?.id || '')}"><input type="hidden" name="item_type" value="${itemType}">${transaction ? `<label>Pelanggan<input value="${escapeHtml(customer?.full_name || '')}" disabled></label>` : `<div class="form-two"><label>Nama pelanggan<input name="customer_name" required minlength="2" value="" placeholder="Nama lengkap"></label><label>Nomor HP<input name="customer_phone" type="tel" required value="" placeholder="08…"></label></div>`}${itemType === 'SERVICE' ? `<div class="form-two"><label>Model kendaraan<input name="vehicle_model" ${transaction ? 'disabled' : ''} value="${escapeHtml(vehicle?.model || '')}" placeholder="Contoh: Honda HR-V" ${transaction ? '' : 'required'}></label><label>Nomor polisi<input name="vehicle_plate" ${transaction ? 'disabled' : ''} value="${escapeHtml(vehicle?.plate || '')}" placeholder="H 1234 NP" ${transaction ? '' : 'required'}></label></div>` : ''}<label>Layanan / produk<select name="item_id" required>${itemOptions}</select></label><div class="form-two"><label>Tanggal<input name="booking_date" type="date" required value="${escapeHtml(transaction?.booking_date || getJakartaDateString())}"></label><label>Jam<input name="booking_time" type="time" required value="${escapeHtml(String(transaction?.booking_time || getJakartaTimeString(new Date())).slice(0, 5))}"></label></div><div class="form-two"><label>Nominal (Rp)<input name="amount" type="number" min="0" step="1" required value="${Number(transaction?.amount ?? selectedItem.price)}"></label><label>Metode pembayaran<select name="payment_method" required>${options([['CASH', 'Tunai'], ['QRIS', 'QRIS'], ['E_WALLET', 'Dompet digital'], ['CARD', 'Kartu']], transaction?.payment_method || 'CASH')}</select></label></div><div class="form-two"><label>Status pembayaran<select name="payment_status" required>${options([['PENDING', 'Belum dibayar'], ['PAID', 'Lunas'], ['FAILED', 'Gagal'], ['REFUNDED', 'Refunded']], transaction?.payment_status || 'PENDING')}</select></label><label>Status transaksi<select name="transaction_status" required>${options([['PENDING', 'Menunggu'], ['BOOKED', 'Dipesan'], ['ACTIVE', 'Aktif'], ['COMPLETED', 'Selesai'], ['CANCELLED', 'Dibatalkan'], ['EXPIRED', 'Hangus']], transaction?.transaction_status || (itemType === 'SERVICE' ? 'ACTIVE' : 'COMPLETED'))}</select></label></div>${itemType === 'SERVICE' ? `<label>Status antrean<select name="queue_status" required>${options([['WAITING', 'Menunggu'], ['WASHING', 'Dicuci'], ['FINISHING', 'Tahap akhir'], ['COMPLETED', 'Selesai']], transaction?.queue_status || 'WAITING')}</select></label>` : ''}<div class="dialog-actions"><button class="button button-quiet" type="button" data-action="close-dialog">Batal</button><button class="button button-dark" type="submit">${transaction ? 'Simpan Perubahan' : 'Simpan Transaksi'}</button></div></form>`;
}
function setupAdminTransactionForm(content) {
  const form = content.querySelector('#admin-transaction-form');
  if (!form) return;
  const catalogItems = safeRows(db?.services_products).map(normalizeCatalogRecord);
  const dateField = form.elements.booking_date;
  const timeField = form.elements.booking_time;
  dateField.max = getMaxAllowedTransactionDate();
  timeField.min = '08:00';
  timeField.max = '21:00';
  const timeRangeNote = document.createElement('small');
  timeRangeNote.className = 'transaction-time-range';
  timeField.closest('.form-two').after(timeRangeNote);
  const updateTimeRange = () => {
    const selected = catalogItems.find(item => item.id === form.elements.item_id.value);
    const isService = selected?.item_type === 'SERVICE';
    const duration = isService ? getServiceDuration(selected.name || selected.id, selected.duration) : 0;
    const range = isService ? formatServiceTimeRange(timeField.value, duration) : '';
    timeRangeNote.hidden = !range;
    timeRangeNote.textContent = range ? `Rentang layanan: ${range} WIB` : '';
  };
  timeField.addEventListener('input', updateTimeRange);
  form.elements.item_id.addEventListener('change', updateTimeRange);
  updateTimeRange();
  if (!form.elements.transaction_id.value) {
    const now = new Date();
    dateField.value = getJakartaDateString(now);
    timeField.value = getJakartaTimeString(now);
  }
  let typeField = form.elements.item_type;
  const isEditing = Boolean(form.elements.transaction_id.value);
  if (!isEditing) {
    const select = document.createElement('select');
    select.name = 'item_type';
    select.required = true;
    select.innerHTML = [['SERVICE', 'Layanan'], ['PRODUCT', 'Produk']]
      .filter(([type]) => catalogItems.some(item => item.item_type === type && item.active !== false))
      .map(([type, label]) => `<option value="${type}" ${type === typeField.value ? 'selected' : ''}>${label}</option>`)
      .join('');
    const label = document.createElement('label');
    label.textContent = 'Jenis transaksi';
    label.append(select);
    typeField.replaceWith(label);
    typeField = select;
  }
  const quantityLabel = document.createElement('label');
  quantityLabel.textContent = 'Jumlah item';
  const quantityField = document.createElement('input');
  quantityField.name = 'quantity';
  quantityField.type = 'number';
  quantityField.min = '1';
  quantityField.step = '1';
  quantityField.required = true;
  const editingTransaction = safeRows(db.transactions).find(tx => tx.id === form.elements.transaction_id.value);
  quantityField.value = String(sanitizeQuantity(editingTransaction?.quantity));
  form.elements.amount.value = String(Math.max(0, finiteNumber(form.elements.amount.value, finiteNumber(catalogItems.find(item => item.id === form.elements.item_id.value)?.price))));
  const paymentMethodField = form.elements.payment_method;
  const paymentStatusField = form.elements.payment_status;
  if (paymentMethodField && paymentStatusField) {
    paymentStatusField.value = paymentStatusForMethod(paymentMethodField.value, paymentStatusField.value);
  }
  quantityLabel.append(quantityField);
  form.elements.amount.closest('.form-two').before(quantityLabel);
  const fulfillmentFieldset = document.createElement('fieldset');
  fulfillmentFieldset.className = 'payment-options fulfillment-options';
  fulfillmentFieldset.innerHTML = `<legend>Metode pemenuhan</legend><label><input type="radio" name="fulfillment_method" value="PICKUP" ${(editingTransaction?.fulfillment_method || 'PICKUP') === 'PICKUP' ? 'checked' : ''}><span>Ambil di Studio (Pick-up)</span></label><label><input type="radio" name="fulfillment_method" value="COURIER" ${editingTransaction?.fulfillment_method === 'COURIER' ? 'checked' : ''}><span>Pengiriman Online / Kurir</span></label>`;
  quantityLabel.before(fulfillmentFieldset);
  const fulfillmentTransaction = editingTransaction;
  const adminShippingFee = method => method !== 'COURIER' ? 0
    : fulfillmentTransaction?.fulfillment_method === 'COURIER'
      ? Number(fulfillmentTransaction.shipping_fee) || 0
      : COURIER_FLAT_RATE;
  const deliveryNote = document.createElement('p');
  deliveryNote.textContent = 'Khusus pengiriman lokal (Maks. 10 km dari studio). Biaya ongkir flat Rp 10.000.';
  deliveryNote.hidden = fulfillmentTransaction?.fulfillment_method !== 'COURIER';
  fulfillmentFieldset.after(deliveryNote);
  const deliveryAddressLabel = document.createElement('label');
  deliveryAddressLabel.textContent = 'Alamat Pengiriman';
  deliveryAddressLabel.hidden = fulfillmentTransaction?.fulfillment_method !== 'COURIER';
  const deliveryAddressField = document.createElement('textarea');
  deliveryAddressField.name = 'fulfillment_address';
  deliveryAddressField.rows = 2;
  deliveryAddressField.maxLength = 500;
  deliveryAddressField.value = fulfillmentTransaction?.fulfillment_address || '';
  deliveryAddressField.required = fulfillmentTransaction?.fulfillment_method === 'COURIER';
  deliveryAddressLabel.append(deliveryAddressField);
  deliveryNote.after(deliveryAddressLabel);
  const deliveryAddressSummary = document.createElement('div');
  deliveryAddressSummary.className = 'dialog-total';
  deliveryAddressSummary.innerHTML = `<span>Alamat Pengiriman</span><strong>${escapeHtml(fulfillmentTransaction?.fulfillment_address || '')}</strong>`;
  deliveryAddressLabel.after(deliveryAddressSummary);
  const shippingSummary = document.createElement('div');
  shippingSummary.className = 'dialog-total';
  shippingSummary.innerHTML = `<span>Ongkir</span><strong>${money(fulfillmentTransaction?.shipping_fee || 0)}</strong>`;
  deliveryAddressLabel.after(shippingSummary);
  const itemField = form.elements.item_id;
  const vehicleFields = form.elements.vehicle_model?.closest('.form-two');
  const queueLabel = form.elements.queue_status?.closest('label');
  const queueField = form.elements.queue_status;
  const updateItems = (updateAmount = false) => {
    const type = typeField.value;
    const items = catalogItems.filter(item => item.item_type === type && item.active !== false);
    const previousItemId = itemField.value;
    itemField.innerHTML = items.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)} · ${money(item.price)}</option>`).join('');
    if (items.some(item => item.id === previousItemId)) itemField.value = previousItemId;
    const item = items.find(row => row.id === itemField.value);
    if (item) {
      const fee = type === 'PRODUCT' ? adminShippingFee(form.elements.fulfillment_method.value) : 0;
      shippingSummary.querySelector('strong').textContent = money(fee);
      if (updateAmount) form.elements.amount.value = String(calculateProductAmount(finiteNumber(item.price), sanitizeQuantity(quantityField.value), fee));
    }
    if (vehicleFields) {
      vehicleFields.hidden = type !== 'SERVICE';
      vehicleFields.querySelectorAll('input').forEach(input => { input.disabled = type !== 'SERVICE'; input.required = type === 'SERVICE'; });
    }
    if (queueLabel) queueLabel.hidden = type !== 'SERVICE';
    if (queueField) { queueField.disabled = type !== 'SERVICE'; queueField.required = type === 'SERVICE'; }
    fulfillmentFieldset.hidden = type !== 'PRODUCT';
    fulfillmentFieldset.querySelectorAll('input').forEach(input => { input.disabled = type !== 'PRODUCT'; });
    deliveryNote.hidden = type !== 'PRODUCT' || form.elements.fulfillment_method.value !== 'COURIER';
    deliveryAddressLabel.hidden = type !== 'PRODUCT' || form.elements.fulfillment_method.value !== 'COURIER';
    deliveryAddressField.disabled = type !== 'PRODUCT' || form.elements.fulfillment_method.value !== 'COURIER';
    deliveryAddressField.required = type === 'PRODUCT' && form.elements.fulfillment_method.value === 'COURIER';
    deliveryAddressSummary.hidden = type !== 'PRODUCT' || form.elements.fulfillment_method.value !== 'COURIER';
    shippingSummary.hidden = type !== 'PRODUCT';
  };
  typeField.addEventListener('change', () => updateItems(true));
  fulfillmentFieldset.addEventListener('change', () => updateItems(true));
  paymentMethodField.addEventListener('change', () => {
    if (paymentStatusField.value !== 'REFUNDED') paymentStatusField.value = paymentStatusForMethod(paymentMethodField.value, paymentStatusField.value);
  });
  deliveryAddressField.addEventListener('input', () => {
    deliveryAddressSummary.querySelector('strong').textContent = deliveryAddressField.value;
  });
  itemField.addEventListener('change', () => {
    const item = catalogItems.find(row => row.id === itemField.value);
    if (item) form.elements.amount.value = String(calculateProductAmount(finiteNumber(item.price), sanitizeQuantity(quantityField.value),
      typeField.value === 'PRODUCT' ? adminShippingFee(form.elements.fulfillment_method.value) : 0));
  });
  quantityField.addEventListener('change', () => {
    const item = catalogItems.find(row => row.id === itemField.value);
    quantityField.value = String(sanitizeQuantity(quantityField.value));
    if (item) form.elements.amount.value = String(calculateProductAmount(finiteNumber(item.price), sanitizeQuantity(quantityField.value),
      typeField.value === 'PRODUCT' ? adminShippingFee(form.elements.fulfillment_method.value) : 0));
  });
  updateItems();
}
async function saveAdminTransaction(form) {
  requireAdminAuthorization();
  if (!adminDataReady) throw new Error('Data dashboard belum siap.');
  const data = Object.fromEntries(new FormData(form));
  const amount = finiteNumber(data.amount, NaN);
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('Nominal transaksi harus berupa angka bulat tidak negatif.');
  const quantity = sanitizeQuantity(data.quantity);
  const item = safeRows(db?.services_products).map(normalizeCatalogRecord).find(row => row.id === data.item_id && row.item_type === data.item_type);
  if (!item) throw new Error('Layanan atau produk tidak ditemukan. Muat ulang katalog.');
  const transaction = data.transaction_id ? safeRows(db?.transactions).find(tx => tx.id === data.transaction_id) : null;
  if (data.transaction_id && !transaction) throw new Error('Transaksi tidak ditemukan.');
  validateTransactionSchedule(data.booking_date, data.booking_time, item.item_type === 'SERVICE' ? Number(item.duration) || 0 : 0, new Date());
  if (!transaction) assertStudioOpenAt();
  const changes = {
    item_id: item.id,
    item_name: item.name,
    quantity,
    amount,
    payment_method: data.payment_method,
    payment_status: paymentStatusForMethod(data.payment_method, data.payment_status),
    transaction_status: data.transaction_status,
    refund_status: paymentStatusForMethod(data.payment_method, data.payment_status) === 'REFUNDED' ? 'COMPLETED' : 'NONE',
    booking_date: data.booking_date,
    booking_time: data.booking_time,
    duration_minutes: Math.max(0, finiteNumber(item.duration))
  };
  if (item.item_type === 'PRODUCT') {
    const fulfillmentMethod = data.fulfillment_method || transaction?.fulfillment_method || 'PICKUP';
    const shippingFee = fulfillmentMethod === 'COURIER'
      ? transaction?.fulfillment_method === 'COURIER' ? Number(transaction.shipping_fee) || 0 : COURIER_FLAT_RATE
      : 0;
    const fulfillmentAddress = fulfillmentMethod === 'COURIER' ? String(data.fulfillment_address || '').trim() : '';
    if (fulfillmentMethod === 'COURIER' && !fulfillmentAddress) throw new Error('Masukkan alamat pengiriman.');
    changes.amount = amount;
    changes.fulfillment_method = fulfillmentMethod;
    changes.fulfillment_address = fulfillmentAddress || null;
    changes.shipping_fee = shippingFee;
    changes.fulfillment_order_id = fulfillmentMethod === 'COURIER'
      ? transaction?.fulfillment_order_id || crypto.randomUUID()
      : null;
  }
  if (item.item_type === 'SERVICE') changes.queue_status = data.queue_status;
  if (transaction) {
    await patchRow('transactions', transaction.id, changes);
    Object.assign(transaction, changes);
    dispatchTransactionStateChange();
    return transaction;
  }
  const customerResult = await findOrCreateCustomer(data.customer_name, data.customer_phone);
  const customer = customerResult.customer;
  if (!db.customers.some(row => row.id === customer.id)) db.customers.push(customer);
  let vehicle = null;
  if (item.item_type === 'SERVICE') {
    const serviceType = item.type === 'MOTOR' ? 'MOTOR' : 'CAR';
    vehicle = resolveOrderVehicle(customerResult.vehicles, customer.id, serviceType, data.vehicle_model, data.vehicle_plate);
    if (!customerResult.vehicles.some(row => row.id === vehicle.id)) {
      await insertRow('vehicles', vehicle);
      db.vehicles.push(vehicle);
    }
  }
  const transactionType = item.item_type === 'PRODUCT' ? 'SHOP' : isSelfServiceItem(item) ? 'BOOKING' : 'WALK_IN';
  const created = {
    id: crypto.randomUUID(),
    code: makeCode(),
    customer_id: customer.id,
    vehicle_id: vehicle?.id || null,
    item_id: item.id,
    item_type: item.item_type,
    item_name: item.name,
    quantity,
    ...changes,
    transaction_type: transactionType,
    queue_status: item.item_type === 'SERVICE' ? data.queue_status : 'COMPLETED',
    refund_status: changes.payment_status === 'REFUNDED' ? 'COMPLETED' : 'NONE',
    created_at: new Date().toISOString()
  };
  await insertRow('transactions', created);
  db.transactions.unshift(created);
  dispatchTransactionStateChange();
  return created;
}
async function deleteAdminTransaction(transactionId) {
  requireAdminAuthorization();
  if (!db.transactions.some(tx => tx.id === transactionId)) throw new Error('Transaksi tidak ditemukan.');
  if (isSupabaseConfigured()) await deleteRow('transactions', transactionId);
  db.transactions = removeTransactionFromState(db.transactions, transactionId);
  dispatchTransactionStateChange();
}
function renderAdminCustomers() {
  const customers = safeRows(db?.customers);
  const vehiclesList = safeRows(db?.vehicles);
  const transactionsList = safeRows(db?.transactions);
  return `<div class="customer-toolbar"><div><p class="eyebrow">DATA PELANGGAN</p><h2>Pelanggan & Kendaraan</h2><p>Ringkasan kunjungan dan kendaraan terdaftar.</p></div><label class="customer-search" for="customer-search">Cari nama, nomor HP, atau plat<input id="customer-search" type="search" placeholder="Nama, nomor HP, atau plat"></label><span>${customers.length} pelanggan · ${vehiclesList.length} kendaraan</span></div><div class="customer-grid">${customers.map(customer => {
    const vehicles = vehiclesList.filter(vehicle => vehicle.customer_id === customer.id);
    const transactions = transactionsList.filter(tx => tx.customer_id === customer.id);
    const fullName = String(customer.full_name || 'Pelanggan');
    const initials = fullName.split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase();
    const searchText = [fullName, customer.phone, customer.email, customer.address, ...vehicles.flatMap(vehicle => [vehicle.plate, vehicle.model])].filter(Boolean).join(' ').toLocaleLowerCase('id-ID');
    return `<article class="customer-card" data-customer-search="${escapeHtml(searchText)}"><div class="customer-card-heading"><span class="customer-avatar">${escapeHtml(initials)}</span><div><h3>${escapeHtml(fullName)}</h3><p>${escapeHtml(customer.phone || '')}</p>${customer.email ? `<p class="customer-email">${escapeHtml(customer.email)}</p>` : ''}${customer.address ? `<p class="customer-address">${escapeHtml(customer.address)}</p>` : ''}</div></div><div class="customer-stats"><span><strong>${transactions.length}</strong> transaksi</span><span><strong>${vehicles.length}</strong> kendaraan</span></div><button class="text-link" type="button" data-edit-customer-address="${escapeHtml(customer.id || '')}">Ubah alamat</button><div class="customer-vehicles">${vehicles.map(vehicle => `<div class="customer-vehicle"><span class="vehicle-type">${vehicle.type === 'MOTOR' ? 'Motor' : 'Mobil'}</span><strong>${escapeHtml(vehicle.plate || '')}</strong><small>${escapeHtml(vehicle.model || '')}</small></div>`).join('') || '<span class="report-empty">Belum ada kendaraan terdaftar.</span>'}</div></article>`;
  }).join('')}</div>`;
}
function adminDescription(tab) {
  return ({ overview: 'Pantau pendapatan, aktivitas studio, dan kebutuhan operasional.', transactions: 'Kelola pembayaran dan aktivitas transaksi dari semua kanal.', queue: 'Pantau kendaraan yang menunggu, dicuci, dan siap diserahkan.', customers: 'Lihat pelanggan, kendaraan, dan frekuensi kunjungan.', catalog: 'Kelola layanan, produk, harga, dan persediaan studio.', reports: 'Analisis pendapatan, metode pembayaran, layanan, dan penjualan produk.' })[tab] || '';
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
function renderAdminBayStatus() {
  const bays = [1, 2, 3, 4].map(number => {
    const tx = getOperationalTransactions(db.transactions).find(item => item.bay_number === number && isRevenueTransaction(item) && isBayTransactionCurrent(item));
    const vehicle = tx && getVehicle(tx);
    const started = tx && parseJakartaDateTime(tx.booking_date, tx.booking_time).getTime() <= Date.now();
    const status = !tx ? 'AVAILABLE' : tx.transaction_status === 'ACTIVE' || started ? 'OCCUPIED' : 'RESERVED';
    const label = status === 'OCCUPIED' ? 'DALAM PENGGUNAAN' : status === 'RESERVED' ? 'TERISI' : 'KOSONG';
    const duration = tx ? getServiceDuration(tx.item_name || tx.item_id, tx.duration_minutes) : 0;
    const timeRange = tx ? formatServiceTimeRange(tx.booking_time, duration) : '';
    const detail = tx ? `${vehicle?.type === 'MOTOR' ? 'Motor' : 'Mobil'}${vehicle?.plate ? ` · ${escapeHtml(vehicle.plate)}` : ''} · ${timeRange || 'Waktu tidak tersedia'}` : 'Siap digunakan';
    return `<article class="admin-bay-indicator admin-bay-${status.toLowerCase()}" aria-label="Bay ${number}: ${label}"><strong>Bay ${number}</strong><span class="admin-bay-state">${label}</span><small>${detail}</small></article>`;
  }).join('');
  return `<section class="admin-panel admin-bay-status-panel"><div class="panel-heading"><div><p class="eyebrow">SELF-SERVICE · KETERSEDIAAN</p><h2>Status empat bay</h2></div><span class="updated-label"><i class="live-dot"></i> Diperbarui langsung</span></div><div class="admin-bay-indicators">${bays}</div></section>`;
}
function renderReportDetailsLegacy() {
  const paid = db.transactions.filter(isRevenueTransaction);
  const periods = field => [...new Set(paid.map(tx => tx.booking_date.slice(0, field === 'day' ? 10 : 7)))].sort();
  const chart = (label, heading, keys, selector) => `<section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">${label}</p><h2>${heading}</h2></div></div>${keys.map(key => { const amount = paid.filter(selector(key)).reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0); const max = Math.max(1, ...keys.map(period => paid.filter(selector(period)).reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0))); return `<div class="revenue-bar-row"><span>${key}</span><div><i style="width:${amount / max * 100}%"></i></div><strong>${money(amount)}</strong></div>`; }).join('')}</section>`;
  const days = periods('day').slice(-7);
  const months = periods('month').slice(-6);
  const vehicles = ['CAR', 'MOTOR'];
  const vehicleSection = `<section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">REVENUE BY VEHICLE</p><h2>Car vs motorcycle</h2></div></div>${vehicles.map(type => { const amount = paid.filter(tx => getVehicle(tx)?.type === type).reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0); return `<div class="revenue-bar-row"><span>${type === 'CAR' ? 'Cars' : 'Motorcycles'}</span><div><i style="width:${amount / Math.max(1, ...vehicles.map(value => paid.filter(tx => getVehicle(tx)?.type === value).reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0))) * 100}%"></i></div><strong>${money(amount)}</strong></div>`; }).join('')}</section>`;
  const productSection = `<section class="admin-panel payment-report"><div class="panel-heading"><div><p class="eyebrow">PRODUCT SALES</p><h2>Studio goods, sold</h2></div></div>${db.services_products.filter(item => item.item_type === 'PRODUCT').map(product => { const units = paid.filter(tx => tx.item_id === product.id).reduce((sum, tx) => sum + (tx.quantity || 1), 0); return `<div class="revenue-bar-row"><span>${escapeHtml(product.name)}</span><div><i class="bar-green" style="width:${units / Math.max(1, ...db.services_products.filter(item => item.item_type === 'PRODUCT').map(item => paid.filter(tx => tx.item_id === item.id).reduce((sum, tx) => sum + (tx.quantity || 1), 0))) * 100}%"></i></div><strong>${units} sold</strong></div>`; }).join('')}</section>`;
  return `${chart('DAILY REVENUE', 'The last seven trading days', days, key => tx => tx.booking_date === key)}${chart('MONTHLY REVENUE', 'Month by month', months, key => tx => tx.booking_date.startsWith(key))}${vehicleSection}${productSection}`;
}
function renderReportDetails() {
  const transactions = reportPeriodTransactions();
  const financialSummary = calculateFinancialSummary(transactions, db.services_products);
  const paid = financialSummary.paid;
  const daily = dailyPaidRevenue(transactions);
  const periodKeys = new Set(daily.map(row => row.key));
  const periodPaid = paid.filter(tx => periodKeys.has(tx.booking_date));
  const renderBars = (rows, formatValue = money, valueKey = 'amount') => {
    const maximum = Math.max(1, ...rows.map(row => row.amount));
    return `<div class="report-bars">${rows.map(row => `<div class="report-bar-row"><span>${escapeHtml(row.label)}</span><div class="report-bar-track"><i style="width:${row.amount / maximum * 100}%"></i></div><strong>${formatValue(row[valueKey], row)}</strong></div>`).join('') || '<p class="report-empty">Belum ada transaksi.</p>'}</div>`;
  };
  const serviceRevenue = financialSummary.serviceRevenue;
  const productRevenue = financialSummary.productRevenue;
  const totalRevenue = financialSummary.grossRevenue;
  const revenueSplit = [
    { label: 'Jasa', amount: serviceRevenue },
    { label: 'Produk', amount: productRevenue }
  ];
  const paymentMix = ['CASH', 'QRIS', 'E_WALLET', 'CARD'].map(method => {
    const rows = paid.filter(tx => tx.payment_method === method);
    return { label: statusLabel(method), amount: rows.reduce((sum, tx) => sum + collectedAmount(tx), 0), count: rows.length };
  });
  const byVehicle = ['CAR', 'MOTOR'].map(type => {
    const rows = paid.filter(tx => reportVehicle(tx)?.type === type);
    return { label: type === 'CAR' ? 'Mobil' : 'Sepeda motor', amount: rows.reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0), count: rows.length };
  });
  const serviceItems = db.services_products.filter(item => item.item_type === 'SERVICE').map(service => {
    const rows = paid.filter(tx => tx.item_id === service.id);
    return { label: catalogItem(service).name, amount: rows.reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0), count: rows.length };
  }).sort((a, b) => b.count - a.count || b.amount - a.amount);
  const vehicleItems = ['CAR', 'MOTOR'].map(type => {
    const rows = paid.filter(tx => reportVehicle(tx)?.type === type);
    return { label: type === 'CAR' ? 'Mobil' : 'Sepeda motor', amount: rows.reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0), count: rows.length };
  });
  const productItems = db.services_products.filter(item => item.item_type === 'PRODUCT').map(product => {
    const rows = paid.filter(tx => tx.item_id === product.id);
    return { label: catalogItem(product).name, amount: rows.reduce((sum, tx) => sum + Number(tx.quantity || 1), 0), revenue: rows.reduce((sum, tx) => sum + recognizedRevenueAmount(tx), 0), stock: Number(product.stock) || 0, minStock: Number(product.min_stock) || 0 };
  }).sort((a, b) => b.amount - a.amount || b.revenue - a.revenue);
  const servicePerformance = `<div class="performance-list">${serviceItems.map((row, index) => `<div class="performance-row"><span class="performance-rank">${String(index + 1).padStart(2, '0')}</span><span class="performance-main"><strong>${escapeHtml(row.label)}</strong><small>${row.count} transaksi lunas</small></span><strong>${money(row.amount)}</strong></div>`).join('') || '<p class="report-empty">Belum ada transaksi jasa.</p>'}</div>`;
  const productPerformance = `<div class="performance-list">${productItems.map(row => `<div class="performance-row"><span class="performance-main"><strong>${escapeHtml(row.label)}</strong><small>${row.amount} unit · ${money(row.revenue)}</small></span><span class="stock-indicator ${row.stock <= row.minStock ? 'stock-indicator-low' : ''}">${row.stock <= row.minStock ? 'Stok rendah' : `${row.stock} stok`}</span></div>`).join('') || '<p class="report-empty">Belum ada penjualan produk.</p>'}</div>`;
  const pendingCount = transactions.filter(tx => tx.payment_status === 'PENDING').length;
  return `<section class="admin-panel report-primary"><div class="panel-heading"><div><p class="eyebrow">TREN PENDAPATAN</p><h2>Tujuh hari terakhir</h2></div><span class="report-period">Lunas · ${periodPaid.length} transaksi</span></div>${renderRevenueLineChart(daily)}</section><div class="report-support-grid"><section class="admin-panel report-split"><div class="panel-heading"><div><p class="eyebrow">KOMPOSISI PENDAPATAN</p><h2>Jasa dan produk</h2></div><strong>${money(totalRevenue)}</strong></div><div class="revenue-composition" role="img" aria-label="Jasa ${money(serviceRevenue)}, produk ${money(productRevenue)}"><span class="revenue-service" style="width:${totalRevenue ? serviceRevenue / totalRevenue * 100 : 0}%"></span><span class="revenue-product" style="width:${totalRevenue ? productRevenue / totalRevenue * 100 : 0}%"></span></div><div class="composition-legend"><span><i></i>Jasa <strong>${money(serviceRevenue)}</strong></span><span><i></i>Produk <strong>${money(productRevenue)}</strong></span></div></section><section class="admin-panel report-payments"><div class="panel-heading"><div><p class="eyebrow">METODE PEMBAYARAN</p><h2>Transaksi lunas</h2></div><span>${pendingCount} pending</span></div>${paymentMix.map(row => `<div class="report-payment-row"><span>${escapeHtml(row.label)}</span><strong>${money(row.amount)}</strong><small>${row.count} transaksi</small></div>`).join('')}</section></div><section class="admin-panel report-vehicle-panel"><div class="panel-heading"><div><p class="eyebrow">PENDAPATAN PER KENDARAAN</p><h2>Mobil dan sepeda motor</h2></div></div><div class="report-vehicle-list">${vehicleItems.map(row => `<div><span>${escapeHtml(row.label)} <small>${row.count} transaksi lunas</small></span><strong>${money(row.amount)}</strong></div>`).join('')}</div></section><div class="report-performance-grid"><section class="admin-panel"><div class="panel-heading"><div><p class="eyebrow">KINERJA LAYANAN</p><h2>Jasa teratas</h2></div></div>${servicePerformance}</section><section class="admin-panel"><div class="panel-heading"><div><p class="eyebrow">KINERJA PRODUK</p><h2>Penjualan dan stok</h2></div></div>${productPerformance}</section></div><section class="report-detail"><div class="catalog-toolbar"><div><p class="eyebrow">DETAIL</p><h2>Transaksi tercatat</h2></div><span class="shop-count">${db.transactions.length} transaksi</span></div>${renderAdminTransactionList(db.transactions, 'Transaksi dari semua status pembayaran.', 'RIWAYAT TRANSAKSI')}</section>`;
}
function renderAdminCatalog() {
  const groups = [
    { key: 'PRODUCT', title: 'Produk Fisik', note: 'Persediaan dihitung dalam unit.' },
    { key: 'SERVICE', title: 'Layanan Cuci', note: 'Waktu pengerjaan dihitung dalam menit.' },
    { key: 'ADD_ON', title: 'Layanan Tambahan', note: 'Item tambahan yang aktif di katalog.' }
  ].filter(group => catalogFilter === 'all' || catalogFilter === group.key);
  const filter = (value, label) => `<button class="catalog-filter${catalogFilter === value ? ' is-active' : ''}" type="button" data-admin-catalog-filter="${value}" aria-pressed="${catalogFilter === value}">${label}</button>`;
  const renderItem = item => {
    const copy = catalogItem(item);
    const category = item.category || (item.item_type === 'ADD_ON' ? 'Tambahan' : 'Perawatan');
    const vehicleType = item.type === 'MOTOR' ? 'Motor' : item.type === 'CAR' ? 'Mobil' : '';
    const inventory = item.item_type === 'PRODUCT'
      ? `<b class="${item.stock <= item.min_stock ? 'stock-low' : ''}">${item.stock} unit</b><small>Minimum ${item.min_stock}</small>`
      : `<b>${item.duration || 0} menit</b><small>Estimasi durasi</small>`;
    const active = item.active !== false;
    return `<div class="catalog-row"><span class="catalog-name catalog-name-${String(item.item_type).toLowerCase()}"><img src="${copy.image || PHOTOS.car}" alt=""><strong>${escapeHtml(copy.name)}<small>${escapeHtml([category, vehicleType].filter(Boolean).join(' · '))}</small></strong></span><span>${item.item_type === 'PRODUCT' ? 'Produk fisik' : item.item_type === 'ADD_ON' ? 'Tambahan' : 'Layanan cuci'}<small>${escapeHtml(category)}</small></span><span class="catalog-price">${money(item.price)}</span><span>${inventory}</span><span><span class="catalog-status ${active ? 'is-active' : 'is-inactive'}">${active ? 'Aktif' : 'Nonaktif'}</span></span><button class="catalog-edit-button" type="button" data-edit-item="${escapeHtml(item.id)}">Ubah</button></div>`;
  };
  return `<div class="catalog-toolbar"><div><p class="eyebrow">KATALOG STUDIO</p><h2>Layanan dan produk</h2><p>Stok produk dihitung per unit; layanan memakai estimasi durasi.</p></div><button class="button button-dark" data-action="add-item">Tambah item</button></div><div class="catalog-filter-bar admin-catalog-filters" role="group" aria-label="Filter jenis katalog">${filter('all', 'Semua')}${filter('PRODUCT', 'Produk fisik')}${filter('SERVICE', 'Layanan cuci')}${filter('ADD_ON', 'Tambahan')}</div>${groups.map(group => {
    const items = safeRows(db?.services_products).map(normalizeCatalogRecord).filter(item => item.item_type === group.key
      && !isPickupAddon(item)
      && (item.item_type !== 'PRODUCT' || PRODUCT_CATALOG_ID_SET.has(item.id)))
      .sort((a, b) => a.name.localeCompare(b.name));
    return `<section class="catalog-admin-group" data-admin-catalog-group="${group.key}"><header class="catalog-section-heading"><h3>${group.title}</h3><p>${group.note}</p><span>${items.length} item</span></header><div class="catalog-table admin-catalog-table"><div class="catalog-row catalog-head"><span>ITEM</span><span>KATEGORI</span><span>HARGA</span><span>${group.key === 'PRODUCT' ? 'STOK UNIT' : 'DURASI'}</span><span>STATUS</span><span>KELOLA</span></div>${items.map(renderItem).join('') || '<div class="queue-empty">Belum ada item pada kategori ini.</div>'}</div></section>`;
  }).join('')}`;
}
function activateAdminTab(tab) {
  if (tab === 'self-service') tab = 'overview';
  if (!['overview', 'transactions', 'queue', 'customers', 'catalog', 'reports'].includes(tab)) return;
  if (!adminDataReady) {
    const content = document.getElementById('admin-content');
    if (content) content.innerHTML = renderAdminDataState();
    return;
  }
  activeAdminTab = tab;
  updateQueueSidebarCount();
  document.querySelectorAll('.admin-nav').forEach(button => button.classList.toggle('active', button.dataset.adminTab === tab));
  const heading = document.getElementById('admin-heading');
  const content = document.getElementById('admin-content');
  if (!content) return;
  const labels = { overview: 'Ringkasan', transactions: 'Transaksi', queue: 'Antrean', catalog: 'Produk & Layanan', customers: 'Pelanggan & Kendaraan', reports: 'Laporan Pendapatan' };
  heading.textContent = labels[tab] || labels.overview;
  setAdminDescription(tab);
  if (tab === 'overview') { render(); return; }
  if (tab === 'catalog') {
    content.innerHTML = renderAdminCatalog();
    removeUnauthorizedAdminMutations(content);
    polishUiLabels(content);
    simplifyUiSymbols(content);
    return;
  }
  if (tab === 'transactions') content.innerHTML = renderAdminTransactionList(db.transactions, 'Seluruh transaksi studio.', 'DAFTAR TRANSAKSI');
  if (tab === 'queue') content.innerHTML = `<div class="queue-toolbar"><div><p class="eyebrow">PENGELOLAAN AREA CUCI</p><h2>Pantau setiap kendaraan.</h2></div></div>${renderQueueColumns(true)}`;
  else if (tab === 'reports') { content.innerHTML = renderPeriodReports(); content.insertAdjacentHTML('beforeend', renderReportDetails()); content.insertAdjacentHTML('beforeend', renderPeriodFinancialPrintDocument()); }
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
  removeUnauthorizedAdminMutations(content);
  polishUiLabels(content);
  simplifyUiSymbols(content);
}
function showToast(message, type = 'success', dedupeKey = '', explicitFormSubmit = false) {
  if (type === 'error' && !explicitFormSubmit) return;
  const region = document.getElementById('toast-region');
  if (dedupeKey) {
    [...region.querySelectorAll('.toast')]
      .filter(toast => toast.dataset.toastKey === dedupeKey)
      .forEach(toast => toast.remove());
  }
  const element = document.createElement('div');
  element.className = `toast toast-${type}`;
  if (dedupeKey) element.dataset.toastKey = dedupeKey;
  element.textContent = message;
  region.append(element);
  setTimeout(() => element.remove(), 4500);
}
function showFormErrorToast(message, dedupeKey = '') {
  showToast(message, 'error', dedupeKey, true);
}
function requestHeaders(prefer = 'return=representation', session = null) {
  const activeSession = session || (adminUser ? supabaseSession : null);
  const bearer = activeSession?.access_token || SUPABASE_PUBLISHABLE_KEY;
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
    else {
      const errorCode = safeSupabaseErrorCode(text);
      console.error(`${result}: request rejected${errorCode ? ` [${errorCode}]` : ''}`);
    }
    return { response, text };
  } catch (error) {
    const reason = controller.signal.aborted ? `timeout after ${SUPABASE_REQUEST_TIMEOUT_MS} ms` : 'network failure';
    console.error(`[Supabase] ${label} failed: ${reason}`);
    throw new Error(`${label} gagal karena ${reason}. Periksa koneksi lalu coba lagi.`);
  } finally {
    window.clearTimeout(timeoutId);
  }
}
async function supabaseRequest(table, method = 'GET', body, query = '', prefer = 'return=representation') {
  if (method !== 'GET') requireAdminAuthorization();
  if (!isSupabaseConfigured()) throw new Error('Layanan sedang tidak tersedia. Silakan coba beberapa saat lagi.');
  const activeSession = adminUser ? supabaseSession : null;
  if (activeSession?.expires_at && activeSession.expires_at * 1000 < Date.now() + 30000) {
    await refreshAdminSession();
  }
  const label = `${method} /rest/v1/${table}`;
  const requestSession = adminUser ? supabaseSession : null;
  const { response, text } = await fetchWithDiagnostics(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/${table}${query}`, { method, headers: requestHeaders(prefer, requestSession), body: body ? JSON.stringify(body) : undefined }, label);
  if (!response.ok) {
    throw new Error(supabaseHttpError(label, response.status, text));
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
  const adminOnlyRpc = ['confirm_transaction_payment', 'complete_transaction_refund'].includes(name);
  const adminRpc = page === 'admin' && adminUser?.app_metadata?.rinse_role === 'admin';
  if (adminOnlyRpc && !adminRpc) throw new Error('Konfirmasi pembayaran/refund belum tersedia melalui RPC demo tanpa login.');
  const customerBoundRpc = ['lookup_customer_by_phone', 'record_service_transaction', 'record_product_sale'].includes(name);
  if (customerBoundRpc && !adminRpc) {
    throw new Error('Operasi customer ditutup sampai database memverifikasi kepemilikan profil dan transaksi di server. Hubungi studio untuk bantuan.');
  }
  const capabilityRpc = [
    'lookup_customer_profile_by_capability',
    'create_service_booking_with_capability',
    'create_product_sale_with_capability'
  ].includes(name);
  if (capabilityRpc) requireCustomerCapabilityToken(parameters.p_owner_token);
  let requestSession = adminRpc ? supabaseSession : null;
  if (['create_demo_service_order', 'create_demo_product_order'].includes(name)) {
    requestSession = { access_token: SUPABASE_PUBLISHABLE_KEY };
  }
  if (requestSession?.expires_at && requestSession.expires_at * 1000 < Date.now() + 30000) {
    await refreshAdminSession();
    requestSession = supabaseSession;
  }
  const label = `POST /rest/v1/rpc/${name}`;
  const { response, text } = await fetchWithDiagnostics(`${SUPABASE_URL.replace(/\/$/, '')}/rest/v1/rpc/${name}`, { method: 'POST', headers: requestHeaders('return=representation', requestSession), body: JSON.stringify(parameters) }, label);
  if (!response.ok) {
    const error = new Error(supabaseHttpError(label, response.status, text));
    error.code = safeSupabaseErrorCode(text);
    throw error;
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
async function deleteRow(table, id) {
  const deletedRows = await supabaseRequest(table, 'DELETE', null, `?id=eq.${encodeURIComponent(id)}`, 'return=representation');
  if (!Array.isArray(deletedRows) || deletedRows.length === 0) {
    throw new Error('Transaksi tidak ditemukan atau tidak dapat dihapus oleh akun Admin.');
  }
  return deletedRows[0];
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
  if (session.user?.app_metadata?.rinse_role !== 'admin') {
    rememberAuthSession(null);
    adminUser = null;
    throw new Error('Sesi ini tidak lagi memiliki role admin. Masuk kembali dengan akun Admin.');
  }
  session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
  rememberAuthSession(session);
  adminUser = session.user;
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
  if (user.app_metadata?.rinse_role !== 'admin') {
    throw new Error('Akun ini belum memiliki role admin yang ditetapkan melalui proses tepercaya.');
  }
  result.expires_at = Math.floor(Date.now() / 1000) + result.expires_in;
  rememberAuthSession(result);
  adminUser = user;
}
async function restoreAdminSession() {
  if (!supabaseSession || !isSupabaseConfigured()) return false;
  try {
    if (supabaseSession.expires_at * 1000 < Date.now() + 30000) await refreshAdminSession();
    const { response, text } = await fetchWithDiagnostics(`${SUPABASE_URL.replace(/\/$/, '')}/auth/v1/user`, { headers: requestHeaders('return=representation', supabaseSession) }, 'GET /auth/v1/user');
    if ([401, 403].includes(response.status)) {
      rememberAuthSession(null);
      adminUser = null;
      return false;
    }
    if (!response.ok) throw new Error('Tidak dapat memverifikasi sesi. Silakan coba lagi.');
    const user = JSON.parse(text || '{}');
    if (user.app_metadata?.rinse_role !== 'admin') {
      rememberAuthSession(null);
      adminUser = null;
      return false;
    }
    adminUser = user;
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
  subscribeToTransactionChanges();
  page = 'home';
  render();
}
async function loadPublicData() {
  if (!isSupabaseConfigured()) throw new Error('Supabase belum dikonfigurasi. Pastikan URL dan publishable key benar.');
  const [physicalProducts, services, count, bays] = await Promise.all([
    supabaseRequest('services_products', 'GET', null, `?select=id,item_type,name,category,type,description,price,duration,stock,min_stock,active,image&item_type=eq.PRODUCT&id=in.(${PRODUCT_CATALOG_IDS.join(',')})&active=eq.true&order=name.asc`),
    supabaseRequest('services_products', 'GET', null, '?select=id,item_type,name,category,type,description,price,duration,stock,min_stock,active,image&item_type=eq.SERVICE&active=eq.true&order=name.asc'),
    rpcRequest('get_public_today_wash_count'),
    rpcRequest('get_public_bay_status')
  ]);
  const publicData = validatePublicDataResponse([...physicalProducts, ...services], count, bays);
  publicBays = publicData.bays.map(normalizeTransactionRecord);
  db = { ...emptyDatabase(), services_products: publicData.products };
  syncServiceCatalog();
  publicWashCount = publicData.washCount;
  publicDataError = '';
  databaseConnected = true;
  dataLoadState = 'ready';
}
async function loadAdminSnapshotFromTables() {
  let transactions;
  try {
    transactions = safeRows(await supabaseRequest(
      'transactions', 'GET', null, '?select=*&order=created_at.desc'
    ));
  } catch (orderedError) {
    try {
      transactions = safeRows(await supabaseRequest('transactions', 'GET', null, '?select=*'));
    } catch (_) {
      throw orderedError;
    }
  }

  const customerIds = [...new Set(transactions.map(transaction => transaction.customer_id).filter(Boolean))];
  const vehicleIds = [...new Set(transactions.map(transaction => transaction.vehicle_id).filter(Boolean))];
  const idFilter = ids => `?select=*&id=in.(${ids.map(id => encodeURIComponent(String(id))).join(',')})`;
  const loadOptionalRows = async (table, query) => {
    try { return safeRows(await supabaseRequest(table, 'GET', null, query)); }
    catch (error) {
      console.warn(`[Admin fallback] ${table} could not be loaded:`, error.message);
      return [];
    }
  };
  const [customers, vehicles, services_products] = await Promise.all([
    customerIds.length ? loadOptionalRows('customers', idFilter(customerIds)) : Promise.resolve([]),
    vehicleIds.length ? loadOptionalRows('vehicles', idFilter(vehicleIds)) : Promise.resolve([]),
    loadOptionalRows('services_products', '?select=*&order=name.asc')
  ]);
  return { customers, vehicles, services_products, transactions };
}
async function loadAdminData() {
  let snapshot;
  try {
    snapshot = await rpcRequest('get_demo_admin_snapshot');
    if (!snapshot || !Array.isArray(snapshot.customers) || !Array.isArray(snapshot.vehicles)
      || !Array.isArray(snapshot.services_products) || !Array.isArray(snapshot.transactions)) {
      throw new Error('RPC get_demo_admin_snapshot tidak mengembalikan semua daftar dashboard.');
    }
  } catch (rpcError) {
    console.warn('[Admin snapshot] RPC failed; loading tables directly:', rpcError.message);
    snapshot = await loadAdminSnapshotFromTables();
  }
  try {
    db = normalizeAdminSnapshot(snapshot);
    syncServiceCatalog();
    databaseConnected = true;
    adminDataReady = true;
    adminDataState = 'ready';
    adminDataError = '';
  } catch (error) {
    adminDataReady = false;
    adminDataState = 'error';
    adminDataError = error.message;
    console.error('[Supabase admin data] Load failed:', error.message);
    throw error;
  }
}
async function bootstrapSupabase() {
  dataLoadState = 'loading';
  publicDataError = '';
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
    publicDataError = error.message || 'Koneksi Supabase gagal. Silakan coba lagi.';
    databaseConnected = false;
    dataLoadState = 'error';
    db = emptyDatabase();
    publicWashCount = 0;
    publicBays = [];
    SERVICES.splice(0, SERVICES.length);
    ADDONS.splice(0, ADDONS.length);
  }
  render();
}
function addCatalogItem() {
  if (!isAdminAuthorized()) { showToast('Akses Admin terverifikasi diperlukan.', 'error'); return; }
  const content = document.getElementById('dialog-content');
  content.innerHTML = `<p class="eyebrow">KATALOG STUDIO</p><h2>Tambah item <em>baru.</em></h2><form id="catalog-form" class="dialog-form"><label>Nama item<input name="name" required></label><label>Jenis item<select name="item_type"><option value="SERVICE">LAYANAN</option><option value="PRODUCT">PRODUK</option><option value="ADD_ON">ADD-ON</option></select></label><label>Jenis kendaraan<select name="type"><option value="">Tidak terkait kendaraan</option><option value="CAR">Mobil</option><option value="MOTOR">Sepeda motor</option></select></label><label>Kategori<input name="category" placeholder="REGULAR, SELF_SERVICE, WASH & CARE"></label><label>Deskripsi<input name="description" required></label><div class="form-two"><label>Harga (Rp)<input name="price" type="number" min="0" step="1" value="0" required></label><label>Durasi (menit)<input name="duration" type="number" min="0" step="1" value="30"></label></div><div class="form-two"><label>Stok<input name="stock" type="number" min="0" step="1" value="0"></label><label>Stok minimum<input name="min_stock" type="number" min="0" step="1" value="5"></label></div><label>URL foto yang sesuai<input name="image" type="url" placeholder="https://..."></label><button class="button button-dark button-full" type="submit">Simpan ke katalog <span>↗</span></button></form>`;
  const typeSelect = content.querySelector('#catalog-form [name="item_type"]');
  const imageLabel = content.querySelector('#catalog-form [name="image"]').closest('label');
  const costLabel = document.createElement('label');
  const costInput = document.createElement('input');
  costLabel.className = 'catalog-unit-cost-field';
  costLabel.textContent = 'HPP per unit (Rp)';
  costInput.name = 'unit_cost';
  costInput.type = 'number';
  costInput.min = '0';
  costInput.step = '1';
  costLabel.append(costInput);
  imageLabel.before(costLabel);
  const updateCostVisibility = () => { costLabel.hidden = typeSelect.value !== 'PRODUCT'; };
  typeSelect.addEventListener('change', updateCostVisibility);
  updateCostVisibility();
  document.getElementById('flow-dialog').showModal();
  simplifyUiSymbols(document.getElementById('flow-dialog'));
}
function editCatalogItem(item) {
  if (!isAdminAuthorized()) { showToast('Akses Admin terverifikasi diperlukan.', 'error'); return; }
  if (!item || typeof item !== 'object') return;
  item = normalizeCatalogRecord(item);
  if (isPickupAddon(item)) {
    showToast('Add-on antar-jemput tidak lagi tersedia.', 'error');
    return;
  }
  const content = document.getElementById('dialog-content');
  content.innerHTML = `<p class="eyebrow">UBAH KATALOG</p><h2>Perbarui <em>item.</em></h2><form id="catalog-edit-form" class="dialog-form"><input type="hidden" name="record_id" value="${escapeHtml(item.id || '')}"><label>Nama item<input name="name" value="${escapeHtml(item.name)}" required></label><label>Deskripsi<input name="description" value="${escapeHtml(item.description)}" required></label><label>URL foto<input name="image" type="url" value="${escapeHtml(item.image || '')}"></label><div class="form-two"><label>Harga (Rp)<input name="price" type="number" min="0" step="1" value="${item.price}" required></label><label>Status<select name="active"><option value="true" ${item.active !== false ? 'selected' : ''}>Aktif</option><option value="false" ${item.active === false ? 'selected' : ''}>Nonaktif</option></select></label></div>${item.item_type === 'PRODUCT' ? `<div class="form-two"><label>Stok<input name="stock" type="number" value="${item.stock}" min="0" step="1"></label><label>Stok minimum<input name="min_stock" type="number" value="${item.min_stock}" min="0" step="1"></label></div>` : ''}<button class="button button-dark button-full" type="submit">Simpan perubahan <span>↗</span></button></form>`;
  if (item.item_type === 'PRODUCT') {
    const stockRow = content.querySelector('#catalog-edit-form [name="stock"]').closest('.form-two');
    const costLabel = document.createElement('label');
    const costInput = document.createElement('input');
    costLabel.className = 'catalog-unit-cost-field';
    costLabel.textContent = 'HPP per unit (Rp)';
    costInput.name = 'unit_cost';
    costInput.type = 'number';
    costInput.min = '0';
    costInput.step = '1';
    costInput.value = item.unit_cost ?? '';
    costLabel.append(costInput);
    stockRow.after(costLabel);
  }
  document.getElementById('flow-dialog').showModal();
  simplifyUiSymbols(document.getElementById('flow-dialog'));
}
function editCustomerAddress(customer) {
  if (!isAdminAuthorized()) { showToast('Akses Admin terverifikasi diperlukan.', 'error'); return; }
  const content = document.getElementById('dialog-content');
  content.innerHTML = `<p class="eyebrow">DATA PELANGGAN</p><h2>Alamat <em>${escapeHtml(customer.full_name)}</em></h2><form id="customer-address-form" class="dialog-form"><input type="hidden" name="customer_id" value="${escapeHtml(customer.id)}"><label>Alamat pelanggan<textarea name="address" rows="3" required>${escapeHtml(customer.address || '')}</textarea></label><button class="button button-dark button-full" type="submit">Simpan alamat</button></form>`;
  document.getElementById('flow-dialog').showModal();
}

document.addEventListener('click', async event => {
  const adminCatalogFilter = event.target.closest('[data-admin-catalog-filter]');
  if (adminCatalogFilter) {
    catalogFilter = adminCatalogFilter.dataset.adminCatalogFilter;
    document.querySelectorAll('[data-admin-catalog-filter]').forEach(button => {
      const selected = button.dataset.adminCatalogFilter === catalogFilter;
      button.classList.toggle('is-active', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    document.querySelectorAll('[data-admin-catalog-group]').forEach(group => {
      group.hidden = catalogFilter !== 'all' && group.dataset.adminCatalogGroup !== catalogFilter;
    });
    return;
  }
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
  const packageButton = event.target.closest('[data-self-service-type]');
  if (packageButton) {
    const selectedPackage = db.services_products.find(item => isSelfServiceItem(item) && item.type === packageButton.dataset.selfServiceType);
    openDialog('self-service', selectedPackage?.id);
    return;
  }
  const receiptButton = event.target.closest('[data-print-receipt]');
  if (receiptButton) {
    if (!isAdminAuthorized()) { showToast('Struk hanya dapat dicetak dari akun Admin.', 'error'); return; }
    const transaction = db.transactions.find(item => item.id === receiptButton.dataset.printReceipt);
    if (!transaction || !isPaidTransaction(transaction)) {
      showToast('Struk hanya tersedia untuk transaksi yang sudah lunas.', 'error');
      return;
    }
    printTransactionReceipt(normalizeOperationalTransaction(transaction));
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
      dispatchTransactionStateChange();
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
      await loadAdminData();
      dispatchTransactionStateChange();
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
    openDialog('order', service.dataset.service);
    return;
  }
  const action = event.target.closest('[data-action]')?.dataset.action;
  if (action) {
    if (action === 'close-dialog') document.getElementById('flow-dialog').close();
    else if (action === 'new-service-order') openDialog('order');
    else if (action === 'print-financial-report') {
      if (!isAdminAuthorized()) { showToast('Laporan hanya dapat dicetak dari akun Admin.', 'error'); return; }
      if (activeAdminTab !== 'reports') activateAdminTab('reports');
      window.print();
    }
    else if (action === 'home') setPage('home');
    else if (action === 'logout') { document.getElementById('flow-dialog').open && document.getElementById('flow-dialog').close(); logoutAdmin(); }
    else if (action === 'retry-data') bootstrapSupabase();
    else if (action === 'retry-admin-data') openAdmin().catch(() => {});
    else if (action === 'all-services') {
      page = 'home';
      render();
      document.getElementById('services')?.scrollIntoView({ behavior: 'instant' });
    }
    else if (action === 'admin-transaction-create') openDialog('admin-transaction-create');
    else if (['service-order', 'walkin', 'self-service-order', 'cart', 'settings', 'admin-login'].includes(action)) {
      const dialog = document.getElementById('flow-dialog');
      if (dialog.open && ['service-order', 'self-service-order'].includes(action)) dialog.close();
      openDialog(action === 'service-order' ? 'order' : action === 'self-service-order' ? 'self-service' : action);
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
    if (!Object.keys(cart).length) localStorage.removeItem(PRODUCT_CHECKOUT_KEY);
    renderCartDialog(document.getElementById('dialog-content')); render(); return;
  }
  const tab = event.target.closest('[data-admin-tab]');
  if (tab) { activateAdminTab(tab.dataset.adminTab); return; }
  const editTransactionButton = event.target.closest('[data-edit-transaction]');
  if (editTransactionButton) {
    if (!isAdminAuthorized()) { showToast('Akses Admin terverifikasi diperlukan.', 'error'); return; }
    openDialog('admin-transaction-edit', editTransactionButton.dataset.editTransaction);
    return;
  }
  const removeTransactionButton = event.target.closest('[data-admin-remove]');
  if (removeTransactionButton) {
    if (!isAdminAuthorized()) { showToast('Akses Admin terverifikasi diperlukan.', 'error'); return; }
    const tx = db.transactions.find(item => item.id === removeTransactionButton.dataset.adminRemove);
    if (!tx || !window.confirm('Apakah Anda yakin ingin menghapus transaksi ini?')) return;
    removeTransactionButton.disabled = true;
    try {
      await deleteAdminTransaction(tx.id);
      activateAdminTab('transactions');
      showToast(`${tx.code} dihapus.`);
    } catch (error) {
      removeTransactionButton.disabled = false;
      showToast(error.message || 'Transaksi belum dapat dihapus.', 'error');
    }
    return;
  }
  const item = event.target.closest('[data-edit-item]');
  if (item) editCatalogItem(db.services_products.find(product => product.id === item.dataset.editItem));
  const customerAddressButton = event.target.closest('[data-edit-customer-address]');
  if (customerAddressButton) editCustomerAddress(db.customers.find(customer => customer.id === customerAddressButton.dataset.editCustomerAddress));
});
document.addEventListener('submit', async event => {
  if (event.target.id === 'admin-transaction-form') {
    event.preventDefault();
    const form = event.target;
    if (form.dataset.submitting === 'true') return;
    const submit = form.querySelector('[type="submit"]');
    form.dataset.submitting = 'true';
    submit.disabled = true;
    try {
      const saved = await saveAdminTransaction(form);
      document.getElementById('flow-dialog').close();
      activateAdminTab('transactions');
      showToast(`${saved.code} ${form.elements.transaction_id.value ? 'diperbarui' : 'ditambahkan'}.`);
    } catch (error) {
      showFormErrorToast(error.message || 'Transaksi belum dapat disimpan.');
      if (submit.isConnected) submit.disabled = false;
    } finally { delete form.dataset.submitting; }
  }
  if (event.target.id === 'transaction-form') {
    event.preventDefault();
    const form = event.target;
    if (form.dataset.submitting === 'true') return;
    const submit = form.querySelector('[type="submit"]');
    form.dataset.submitting = 'true';
    submit.disabled = true;
    try { await submitService(form); }
    catch (error) {
      showFormErrorToast(serviceOrderErrorMessage(error), 'service-order');
      if (submit.isConnected) submit.disabled = false;
    }
    finally { delete form.dataset.submitting; }
  }
  if (event.target.id === 'product-checkout-form') {
    event.preventDefault();
    const submit = event.target.querySelector('[type="submit"]');
    submit.disabled = true;
    try { await submitProducts(event.target); }
    catch (error) { showFormErrorToast(error.message); if (submit.isConnected) submit.disabled = false; }
  }
  if (event.target.id === 'admin-login-form') {
    event.preventDefault();
    const submit = event.target.querySelector('[type="submit"]');
    submit.disabled = true;
    const data = new FormData(event.target);
    try {
      await signInAdmin(String(data.get('email') || '').trim(), String(data.get('password') || ''));
      document.getElementById('flow-dialog').close();
      await openAdmin();
    } catch (error) {
      showFormErrorToast(error.message || 'Login Admin belum dapat diproses.');
      submit.disabled = false;
    }
  }
  if (event.target.id === 'customer-address-form') {
    event.preventDefault();
    if (!isAdminAuthorized()) { showFormErrorToast('Akses Admin terverifikasi diperlukan.'); return; }
    const data = Object.fromEntries(new FormData(event.target));
    const customer = db.customers.find(item => item.id === data.customer_id);
    if (!customer) { showFormErrorToast('Data pelanggan tidak ditemukan.'); return; }
    try {
      await patchRow('customers', customer.id, { address: String(data.address || '').trim() });
      customer.address = String(data.address || '').trim();
      document.getElementById('flow-dialog').close();
      activateAdminTab('customers');
      showToast('Alamat pelanggan tersimpan.');
    } catch (error) {
      showFormErrorToast(error.message || 'Alamat belum dapat disimpan.');
    }
  }
  if (event.target.id === 'catalog-form') {
    event.preventDefault();
    if (!isAdminAuthorized()) { showFormErrorToast('Akses Admin terverifikasi diperlukan.'); return; }
    const data = Object.fromEntries(new FormData(event.target));
    const item = { id: crypto.randomUUID(), ...data, type: data.type || null, price: Math.max(0, finiteNumber(data.price)), duration: Math.max(0, finiteNumber(data.duration)), stock: Math.max(0, finiteNumber(data.stock)), min_stock: Math.max(0, finiteNumber(data.min_stock)), active: true, image: data.image || (data.item_type === 'PRODUCT' ? PHOTOS.detailing : PHOTOS.car) };
    item.unit_cost = data.item_type === 'PRODUCT' && data.unit_cost !== '' ? Math.max(0, Math.round(finiteNumber(data.unit_cost))) : null;
    if (isPickupAddon(item)) { showFormErrorToast('Add-on antar-jemput tidak lagi tersedia.'); return; }
    try { await upsertRow('services_products', item); db.services_products.push(item); syncServiceCatalog(); document.getElementById('flow-dialog').close(); activateAdminTab('catalog'); showToast('Item ditambahkan ke katalog.'); }
    catch (error) { showFormErrorToast(error.message); }
  }
  if (event.target.id === 'catalog-edit-form') {
    event.preventDefault();
    if (!isAdminAuthorized()) { showFormErrorToast('Akses Admin terverifikasi diperlukan.'); return; }
    const data = Object.fromEntries(new FormData(event.target));
    const item = db.services_products.find(product => product.id === data.record_id);
    if (!item || isPickupAddon(item)) { showFormErrorToast('Item tidak ditemukan atau tidak lagi dapat diedit.'); return; }
    const updated = { ...item, name: data.name, description: data.description, image: data.image || item.image, price: Math.max(0, finiteNumber(data.price)), active: data.active === 'true' };
    if (item.item_type === 'PRODUCT') updated.unit_cost = data.unit_cost === '' ? null : Math.max(0, Math.round(finiteNumber(data.unit_cost)));
    if (isPickupAddon(updated)) { showFormErrorToast('Add-on antar-jemput tidak lagi tersedia.'); return; }
    if (data.stock !== undefined) { updated.stock = Math.max(0, finiteNumber(data.stock)); updated.min_stock = Math.max(0, finiteNumber(data.min_stock)); }
    try { await patchRow('services_products', item.id, updated); Object.assign(item, updated); syncServiceCatalog(); document.getElementById('flow-dialog').close(); activateAdminTab('catalog'); showToast('Perubahan katalog tersimpan.'); }
    catch (error) { showFormErrorToast(error.message); }
  }
});
document.addEventListener('change', async event => {
  if (event.target.matches('[data-report-period]')) {
    reportPeriod = event.target.value === 'year' ? 'year' : 'month';
    activateAdminTab('reports');
    return;
  }
  if (event.target.matches('[data-queue-id]')) {
    const tx = db.transactions.find(item => item.id === event.target.dataset.queueId);
    const current = tx && normalizeOperationalTransaction(tx);
    if (!tx || !isRevenueTransaction(current) || current.transaction_status === 'BOOKED') {
      if (tx) event.target.value = tx.queue_status;
      return;
    }
    const changes = { queue_status: event.target.value, transaction_status: event.target.value === 'COMPLETED' ? 'COMPLETED' : 'ACTIVE' };
    try { await patchRow('transactions', tx.id, changes); Object.assign(tx, changes); dispatchTransactionStateChange(); showToast(`${tx.code} dipindahkan ke ${tx.queue_status.toLowerCase()}.`); }
    catch (error) { event.target.value = tx.queue_status; console.warn('[Queue status] Update failed:', error.message); }
  }
});
document.getElementById('admin-shortcut').addEventListener('click', () => openAdmin());
document.getElementById('mobile-menu').addEventListener('click', () => document.querySelector('.main-nav').classList.toggle('is-open'));
bootstrapSupabase();
render();
subscribeToTransactionChanges();
window.setInterval(() => {
  if (databaseConnected && document.visibilityState === 'visible') runServiceLifecycleCheck();
}, 1000);
window.setInterval(async () => {
  if (!databaseConnected || publicRefreshInProgress || document.visibilityState !== 'visible') return;
  await refreshLiveData();
}, 30000);
}