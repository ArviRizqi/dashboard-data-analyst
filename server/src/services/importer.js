import { Company, Order, OrderItem, Product, Customer, Review } from '../models/index.js';

/** Sheet pada file JSON -> model. Urutan impor: induk dulu, lalu turunannya. */
const SHEETS = [
  ['products', Product],
  ['customers', Customer],
  ['orders', Order],
  ['order_items', OrderItem],
  ['reviews', Review],
];

export class ImportError extends Error {
  constructor(message, details = []) {
    super(message);
    this.name = 'ImportError';
    this.status = 400;
    this.details = details;
  }
}

/** Pastikan payload berbentuk { orders, order_items, products, customers, reviews, README? }. */
export function checkShape(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ImportError('Berkas harus berupa objek JSON dengan sheet sebagai kuncinya.');
  }
  const missing = SHEETS.map(([k]) => k).filter((k) => !Array.isArray(payload[k]));
  if (missing.length) {
    throw new ImportError(`Sheet berikut tidak ditemukan atau bukan array: ${missing.join(', ')}.`);
  }
  if (payload.orders.length === 0) throw new ImportError('Sheet orders kosong.');
}

/** Validasi semua baris terhadap skema Mongoose sebelum ada data lama yang dihapus. */
function validateAll(slug, payload) {
  const errors = [];
  for (const [sheet, Model] of SHEETS) {
    for (let n = 0; n < payload[sheet].length; n += 1) {
      const doc = new Model({ ...payload[sheet][n], company: slug });
      const err = doc.validateSync();
      if (err) {
        errors.push(`${sheet}[${n}]: ${Object.values(err.errors).map((e) => e.message).join('; ')}`);
        if (errors.length >= 5) break;
      }
    }
    if (errors.length >= 5) break;
  }
  if (errors.length) throw new ImportError('Data tidak sesuai skema.', errors);
}

function referenceWarnings(payload) {
  const orderIds = new Set(payload.orders.map((o) => o.order_id));
  const productIds = new Set(payload.products.map((p) => p.product_id));
  const customerIds = new Set(payload.customers.map((c) => c.customer_id));
  const warnings = [];
  const orphanItems = payload.order_items.filter(
    (x) => !orderIds.has(x.order_id) || !productIds.has(x.product_id)
  ).length;
  const orphanReviews = payload.reviews.filter(
    (x) => !orderIds.has(x.order_id) || !productIds.has(x.product_id)
  ).length;
  const unknownCustomers = payload.orders.filter((x) => !customerIds.has(x.customer_id)).length;
  if (orphanItems) warnings.push(`${orphanItems} item pesanan merujuk order/produk yang tidak ada dan diabaikan.`);
  if (orphanReviews) warnings.push(`${orphanReviews} ulasan merujuk order/produk yang tidak ada dan diabaikan.`);
  if (unknownCustomers) warnings.push(`${unknownCustomers} pesanan memakai customer_id yang tidak ada di sheet customers.`);
  return warnings;
}

/**
 * Mengganti seluruh data satu perusahaan dengan isi payload.
 * (MongoDB standalone tidak punya transaksi, jadi validasi dilakukan lebih dulu
 * agar data lama tidak terhapus bila berkas bermasalah.)
 */
export async function importDataset(slug, payload) {
  checkShape(payload);
  validateAll(slug, payload);

  for (const [, Model] of SHEETS) await Model.deleteMany({ company: slug });
  for (const [sheet, Model] of SHEETS) {
    const rows = payload[sheet].map((r) => ({ ...r, company: slug }));
    for (let n = 0; n < rows.length; n += 5000) {
      await Model.insertMany(rows.slice(n, n + 5000), { ordered: true });
    }
  }

  let minDate = Infinity;
  let maxDate = -Infinity;
  for (const o of payload.orders) {
    const t = new Date(o.order_date).getTime();
    if (t < minDate) minDate = t;
    if (t > maxDate) maxDate = t;
  }
  const dictionary = Array.isArray(payload.README)
    ? payload.README.map((r) => ({ sheet: r.Sheet, key: r.Kunci, note: r.Catatan }))
    : undefined;

  const set = {
    'stats.orders': payload.orders.length,
    'stats.customers': payload.customers.length,
    'stats.products': payload.products.length,
    'stats.reviews': payload.reviews.length,
    'stats.periodFrom': new Date(minDate),
    'stats.periodTo': new Date(maxDate),
    'stats.importedAt': new Date(),
  };
  if (dictionary) set.dataDictionary = dictionary;
  const company = await Company.findOneAndUpdate({ slug }, { $set: set }, { new: true }).lean();

  return {
    company,
    counts: Object.fromEntries(SHEETS.map(([k]) => [k, payload[k].length])),
    warnings: referenceWarnings(payload),
  };
}

export async function loadRows(slug) {
  const q = (Model) => Model.find({ company: slug }).sort({ _id: 1 }).lean();
  const [orders, items, products, customers, reviews] = await Promise.all([
    q(Order), q(OrderItem), q(Product), q(Customer), q(Review),
  ]);
  return { orders, items, products, customers, reviews };
}
