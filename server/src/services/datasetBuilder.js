/**
 * Mengubah baris-baris dari MongoDB menjadi dataset kolumnar yang ringkas untuk frontend.
 *
 * Setiap dimensi teks (provinsi, kota, kurir, ...) dipetakan ke kamus (array string) dan
 * baris hanya menyimpan indeksnya. Dengan begitu satu respons berisi seluruh data perusahaan
 * dan filter di dashboard bisa dihitung seketika di browser.
 *
 * Fungsi ini murni (tanpa akses database) supaya mudah diuji.
 */

const MS_DAY = 86_400_000;
export const STATUS_ORDER = ['delivered', 'shipped', 'processing', 'cancelled', 'returned'];
export const NO_PROMO = 'Tanpa Promo';
const UNKNOWN = 'Tidak diketahui';

const cmp = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const iso = (d) => new Date(d).toISOString();
const monthKey = (d) => iso(d).slice(0, 7);
const dayNumber = (d) => Math.floor(new Date(d).getTime() / MS_DAY);

/** Kamus terurut + fungsi pencari indeks. */
function dictionary(values, { first } = {}) {
  const set = new Set(values.map((v) => (v == null || v === '' ? UNKNOWN : String(v))));
  if (first) set.delete(first);
  const list = [...set].sort(cmp);
  if (first) list.unshift(first);
  const index = new Map(list.map((v, i) => [v, i]));
  const at = (v) => index.get(v == null || v === '' ? UNKNOWN : String(v));
  return { list, at };
}

/** Urutkan rentang harga menurut angka pertamanya: "<=100 rb" < "100-200 rb" < ... */
function bandKey(label) {
  const n = parseFloat(String(label).replace(/[^\d.]/g, '')) || 0;
  return String(label).trim().startsWith('<') ? n - 0.5 : n;
}

/** Tampilan rentang harga: "<=100 rb" -> "≤ 100 rb", "100-200 rb" -> "100–200 rb". */
export function bandLabel(label) {
  return String(label).replace(/^<=?\s*/, '≤ ').replace(/(\d)-(\d)/, '$1–$2');
}

function monthRange(from, to) {
  const out = [];
  let [y, m] = from.split('-').map(Number);
  const [ty, tm] = to.split('-').map(Number);
  while (y < ty || (y === ty && m <= tm)) {
    out.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return out;
}

export function buildDataset({ orders, items, products, customers, reviews }) {
  // ---- kamus --------------------------------------------------------------------------
  const promoCode = (o) =>
    o.promo_flag === 'Tanpa promo' || !o.promo_code ? NO_PROMO : o.promo_code;

  const pv = dictionary(orders.map((o) => o.shipping_province));
  const ct = dictionary(orders.map((o) => o.shipping_city));
  const py = dictionary(orders.map((o) => o.payment_method));
  const co = dictionary(orders.map((o) => o.courier));
  const pr = dictionary(orders.map(promoCode), { first: NO_PROMO }); // indeks 0 = tanpa promo
  const cat = dictionary(products.map((p) => p.category));
  const br = dictionary(products.map((p) => p.brand));
  const gen = dictionary(customers.map((c) => c.gender));
  const age = dictionary(customers.map((c) => c.age_group));

  const bandRaw = [...new Set(products.map((p) => p.price_band || UNKNOWN))].sort(
    (a, b) => bandKey(a) - bandKey(b) || cmp(a, b)
  );
  const bandAt = new Map(bandRaw.map((v, i) => [v, i]));

  // ---- bulan (dari pesanan dan ulasan) -----------------------------------------------
  const monthKeys = [
    ...orders.map((o) => monthKey(o.order_date)),
    ...reviews.map((r) => monthKey(r.review_date)),
  ].sort();
  const ym = monthKeys.length ? monthRange(monthKeys[0], monthKeys[monthKeys.length - 1]) : [];
  const ymAt = new Map(ym.map((v, i) => [v, i]));

  // ---- indeks entitas -----------------------------------------------------------------
  const orderIdx = new Map(orders.map((o, i) => [o.order_id, i]));
  const productIdx = new Map(products.map((p, i) => [p.product_id, i]));
  const customerIdx = new Map(customers.map((c, i) => [c.customer_id, i]));
  const statusAt = new Map(STATUS_ORDER.map((s, i) => [s, i]));

  // ---- orders -------------------------------------------------------------------------
  const o = {
    ym: [], st: [], pv: [], ct: [], py: [], co: [], pr: [],
    amt: [], disc: [], ship: [], cu: [], dd: [],
  };
  for (const x of orders) {
    o.ym.push(ymAt.get(monthKey(x.order_date)));
    o.st.push(statusAt.get(x.order_status));
    o.pv.push(pv.at(x.shipping_province));
    o.ct.push(ct.at(x.shipping_city));
    o.py.push(py.at(x.payment_method));
    o.co.push(co.at(x.courier));
    o.pr.push(pr.at(promoCode(x)));
    o.amt.push(x.total_amount_idr);
    o.disc.push(x.discount_amount_idr || 0);
    o.ship.push(x.shipping_cost_idr || 0);
    o.cu.push(customerIdx.has(x.customer_id) ? customerIdx.get(x.customer_id) : -1);
    o.dd.push(dayNumber(x.order_date));
  }

  // ---- order_items --------------------------------------------------------------------
  const i = { o: [], p: [], q: [], s: [] };
  let droppedItems = 0;
  for (const x of items) {
    const oi = orderIdx.get(x.order_id);
    const pi = productIdx.get(x.product_id);
    if (oi === undefined || pi === undefined) {
      droppedItems += 1;
      continue;
    }
    i.o.push(oi);
    i.p.push(pi);
    i.q.push(x.quantity);
    i.s.push(x.subtotal_idr);
  }

  // ---- products / customers -----------------------------------------------------------
  const p = {
    id: products.map((x) => x.product_id),
    name: products.map((x) => x.name),
    cat: products.map((x) => cat.at(x.category)),
    sub: products.map((x) => x.sub_category || ''),
    br: products.map((x) => br.at(x.brand)),
    bd: products.map((x) => bandAt.get(x.price_band || UNKNOWN)),
    price: products.map((x) => x.price_idr),
    stock: products.map((x) => x.stock || 0),
    sold: products.map((x) => x.total_terjual || 0),
    rating: products.map((x) => x.avg_rating ?? null),
  };
  const c = {
    g: customers.map((x) => gen.at(x.gender)),
    a: customers.map((x) => age.at(x.age_group)),
  };

  // ---- reviews ------------------------------------------------------------------------
  const r = { o: [], p: [], t: [], ym: [] };
  let droppedReviews = 0;
  for (const x of reviews) {
    const oi = orderIdx.get(x.order_id);
    const pi = productIdx.get(x.product_id);
    if (oi === undefined || pi === undefined) {
      droppedReviews += 1;
      continue;
    }
    r.o.push(oi);
    r.p.push(pi);
    r.t.push(x.rating);
    r.ym.push(ymAt.get(monthKey(x.review_date)));
  }

  // ---- periode ------------------------------------------------------------------------
  let from = null;
  let to = null;
  for (const x of orders) {
    const t = new Date(x.order_date).getTime();
    if (from === null || t < from) from = t;
    if (to === null || t > to) to = t;
  }

  return {
    ym,
    st: STATUS_ORDER,
    pv: pv.list,
    ct: ct.list,
    py: py.list,
    co: co.list,
    pr: pr.list,
    gen: gen.list,
    age: age.list,
    cat: cat.list,
    br: br.list,
    band: bandRaw.map(bandLabel),
    o,
    i,
    p,
    c,
    r,
    meta: {
      counts: {
        orders: orders.length,
        items: i.o.length,
        products: products.length,
        customers: customers.length,
        reviews: r.o.length,
      },
      period: {
        from: from === null ? null : new Date(from).toISOString().slice(0, 10),
        to: to === null ? null : new Date(to).toISOString().slice(0, 10),
      },
      dropped: { items: droppedItems, reviews: droppedReviews },
    },
  };
}
