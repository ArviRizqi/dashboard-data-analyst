import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Order, OrderItem, Product, Customer, Review } from '../src/models/index.js';
import { buildDataset, bandLabel } from '../src/services/datasetBuilder.js';
import { checkShape, ImportError } from '../src/services/importer.js';
import { slugify } from '../src/routes/companies.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const raw = JSON.parse(
  fs.readFileSync(path.resolve(here, '../seed/data/gayanara_data_bersih.json'), 'utf8')
);

// Lewat skema Mongoose supaya bentuknya sama dengan baris dari MongoDB (tanggal -> Date).
const cast = (Model, rows) =>
  rows.map((r) => {
    const doc = new Model({ ...r, company: 'gayanara' });
    assert.equal(doc.validateSync(), undefined);
    return doc.toObject();
  });

const ds = buildDataset({
  orders: cast(Order, raw.orders),
  items: cast(OrderItem, raw.order_items),
  products: cast(Product, raw.products),
  customers: cast(Customer, raw.customers),
  reviews: cast(Review, raw.reviews),
});

test('jumlah baris sesuai dataset', () => {
  assert.deepEqual(ds.meta.counts, { orders: 3000, items: 4986, products: 300, customers: 800, reviews: 1500 });
  assert.deepEqual(ds.meta.period, { from: '2022-01-01', to: '2025-02-28' });
  assert.deepEqual(ds.meta.dropped, { items: 0, reviews: 0 });
});

test('revenue pesanan terkirim = Rp 877.752.049 dari 1.776 pesanan', () => {
  let rev = 0;
  let n = 0;
  ds.o.st.forEach((s, i) => {
    if (s === 0) {
      rev += ds.o.amt[i];
      n += 1;
    }
  });
  assert.equal(rev, 877_752_049);
  assert.equal(n, 1776);
});

test('indeks kamus valid dan "Tanpa Promo" selalu di indeks 0', () => {
  assert.equal(ds.pr[0], 'Tanpa Promo');
  const inRange = (arr, dict) => arr.every((v) => v >= 0 && v < dict.length);
  assert.ok(inRange(ds.o.pv, ds.pv) && inRange(ds.o.ct, ds.ct) && inRange(ds.o.co, ds.co));
  assert.ok(inRange(ds.o.py, ds.py) && inRange(ds.o.pr, ds.pr) && inRange(ds.o.st, ds.st));
  assert.ok(inRange(ds.p.cat, ds.cat) && inRange(ds.p.br, ds.br) && inRange(ds.p.bd, ds.band));
});

test('rentang harga diurutkan dan diberi label', () => {
  assert.deepEqual(ds.band, ['≤ 100 rb', '100–200 rb', '200–300 rb', '300–400 rb', '400–600 rb']);
  assert.equal(bandLabel('<=100 rb'), '≤ 100 rb');
});

test('item/ulasan yatim diabaikan, bukan menyebabkan error', () => {
  const orders = cast(Order, raw.orders.slice(0, 5));
  const out = buildDataset({
    orders,
    items: cast(OrderItem, [...raw.order_items.slice(0, 3), { ...raw.order_items[0], item_id: 'X', order_id: 'TIDAK-ADA' }]),
    products: cast(Product, raw.products),
    customers: [],
    reviews: [],
  });
  assert.equal(out.meta.dropped.items, 1);
  assert.equal(out.o.cu[0], -1); // pelanggan tidak ditemukan
});

test('validasi bentuk berkas impor', () => {
  assert.throws(() => checkShape(null), ImportError);
  assert.throws(() => checkShape({ orders: [] }), /tidak ditemukan/);
  assert.doesNotThrow(() => checkShape(raw));
});

test('status pesanan di luar daftar ditolak skema', () => {
  const doc = new Order({ ...raw.orders[0], company: 'x', order_status: 'aneh' });
  assert.ok(doc.validateSync());
});

test('slugify', () => {
  assert.equal(slugify('Gayanari Store!'), 'gayanari-store');
  assert.equal(slugify('  Ünïcode  Co '), 'unicode-co');
});

test('mode baca-saja menolak penulisan tetapi mengizinkan pembacaan', async () => {
  const { createApp } = await import('../src/app.js');
  const server = createApp({ readOnly: true }).listen(0);
  const base = `http://127.0.0.1:${server.address().port}/api`;
  try {
    assert.deepEqual(await (await fetch(`${base}/config`)).json(), { readOnly: true });
    const post = await fetch(`${base}/companies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'X' }),
    });
    assert.equal(post.status, 403);
    const imp = await fetch(`${base}/companies/gayanara/import`, { method: 'POST' });
    assert.equal(imp.status, 403);
  } finally {
    server.close();
  }
});
