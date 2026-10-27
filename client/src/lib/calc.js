import { sec } from './format.js';

/** Menambahkan turunan yang dipakai banyak halaman ke dataset dari API. */
export function prepare(raw) {
  const N = raw.o.amt.length;
  const OY = new Int16Array(N);
  let ymFrom = Infinity;
  let ymTo = -Infinity;
  for (let i = 0; i < N; i += 1) {
    const k = raw.o.ym[i];
    OY[i] = +raw.ym[k].slice(0, 4);
    if (k < ymFrom) ymFrom = k;
    if (k > ymTo) ymTo = k;
  }
  const years = [...new Set(OY)].sort((a, b) => a - b);
  const last = raw.ym[ymTo] || '0000-12';
  const lastMonth = +last.slice(5);
  return {
    ...raw,
    N,
    OY,
    years,
    ymFrom,
    ymTo,
    lastMonth,
    maxYear: +last.slice(0, 4),
    partialYear: lastMonth < 12,
  };
}

export const defaultFilters = (D) => ({
  years: new Set(D.years),
  pv: -1,
  co: -1,
  py: -1,
  basis: 'delivered',
  cat: -1,
});

/**
 * F = pesanan yang lolos filter (tahun, provinsi, kurir, pembayaran).
 * B = subset F menurut "basis revenue": terkirim / aktif (terkirim+dikirim+diproses) / semua.
 */
export function masks(D, S) {
  const { N } = D;
  const F = new Uint8Array(N);
  const B = new Uint8Array(N);
  for (let i = 0; i < N; i += 1) {
    if (!S.years.has(D.OY[i])) continue;
    if (S.pv >= 0 && D.o.pv[i] !== S.pv) continue;
    if (S.co >= 0 && D.o.co[i] !== S.co) continue;
    if (S.py >= 0 && D.o.py[i] !== S.py) continue;
    F[i] = 1;
    const st = D.o.st[i];
    B[i] = S.basis === 'all' ? 1 : S.basis === 'active' ? (st <= 2 ? 1 : 0) : st === 0 ? 1 : 0;
  }
  return { F, B };
}

/** Revenue dan jumlah pesanan per kunci (basis B atau F). */
export function aggO(D, F, B, keyFn, nk, sel = 'B') {
  const mask = sel === 'B' ? B : F;
  const rev = new Array(nk).fill(0);
  const n = new Array(nk).fill(0);
  for (let i = 0; i < D.N; i += 1) {
    if (!mask[i]) continue;
    const k = keyFn(i);
    rev[k] += D.o.amt[i];
    n[k] += 1;
  }
  return { rev, n };
}

/** Jumlah pesanan per kunci x status (dalam filter F). */
export function statusAgg(D, F, keyFn, nk) {
  const c = Array.from({ length: nk }, () => [0, 0, 0, 0, 0]);
  for (let i = 0; i < D.N; i += 1) if (F[i]) c[keyFn(i)][D.o.st[i]] += 1;
  return c;
}

export function ratingStats(D, F) {
  let n = 0;
  let s = 0;
  let low = 0;
  for (let k = 0; k < D.r.o.length; k += 1) {
    if (!F[D.r.o[k]]) continue;
    n += 1;
    s += D.r.t[k];
    if (D.r.t[k] <= 2) low += 1;
  }
  return { n, avg: n ? s / n : 0, low };
}

/** Per pelanggan: jumlah pesanan, revenue, dan hari pembelian terakhir (basis B). */
export function custAgg(D, F, B) {
  const n = new Map();
  const rev = new Map();
  const last = new Map();
  let ref = 0;
  for (let i = 0; i < D.N; i += 1) {
    if (F[i] && D.o.dd[i] > ref) ref = D.o.dd[i];
    if (!B[i]) continue;
    const c = D.o.cu[i];
    n.set(c, (n.get(c) || 0) + 1);
    rev.set(c, (rev.get(c) || 0) + D.o.amt[i]);
    last.set(c, Math.max(last.get(c) || 0, D.o.dd[i]));
  }
  return { n, rev, last, ref: ref + 1 };
}

/** Ringkasan satu kalimat per halaman untuk perusahaan yang belum punya narasi tertulis. */
export function autoAnswer(key, D, fmt) {
  const { rp, nf, pc } = fmt;
  const all = new Uint8Array(D.N).fill(1);
  const del = Uint8Array.from(D.o.st, (s) => (s === 0 ? 1 : 0));
  const rev = (mask) => D.o.amt.reduce((a, v, i) => a + (mask[i] ? v : 0), 0);
  const top = (arr, labels) => {
    let bi = 0;
    arr.forEach((v, i) => {
      if (v > arr[bi]) bi = i;
    });
    return { label: labels[bi], v: arr[bi], i: bi };
  };
  const nDel = del.reduce((a, b) => a + b, 0);
  const total = rev(del);

  switch (key) {
    case 'ringkasan': {
      const byYear = {};
      D.o.amt.forEach((v, i) => {
        if (del[i]) byYear[D.OY[i]] = (byYear[D.OY[i]] || 0) + v;
      });
      const ys = Object.keys(byYear).map(Number).sort();
      const trend = ys.length > 1
        ? ` Revenue ${ys[ys.length - 2]}: ${rp(byYear[ys[ys.length - 2]])}; ${ys[ys.length - 1]}: ${rp(byYear[ys[ys.length - 1]])}${D.partialYear ? ' (tahun berjalan, belum penuh)' : ''}.`
        : '';
      return `Revenue terealisasi ${rp(total)} dari ${nf(nDel)} pesanan terkirim (${nf(D.N)} pesanan seluruhnya).${trend}`;
    }
    case 'produk': {
      const cr = D.cat.map(() => 0);
      for (let j = 0; j < D.i.o.length; j += 1) if (del[D.i.o[j]]) cr[D.p.cat[D.i.p[j]]] += D.i.s[j];
      const t = top(cr, D.cat);
      return `Katalog berisi ${nf(D.p.id.length)} produk di ${D.cat.length} kategori. Kategori terbesar ${t.label} dengan ${pc(sec(t.v, cr.reduce((a, b) => a + b, 0)))} revenue item.`;
    }
    case 'pelanggan': {
      const buyers = new Map();
      D.o.cu.forEach((c, i) => {
        if (del[i]) buyers.set(c, (buyers.get(c) || 0) + 1);
      });
      const rep = [...buyers.values()].filter((v) => v > 1).length;
      return `${nf(buyers.size)} dari ${nf(D.c.g.length)} pelanggan terdaftar pernah menerima pesanan; ${pc(sec(rep, buyers.size), 0)} di antaranya membeli lebih dari sekali.`;
    }
    case 'wilayah': {
      const pr = D.pv.map(() => 0);
      D.o.pv.forEach((p, i) => {
        if (del[i]) pr[p] += D.o.amt[i];
      });
      const t = top(pr, D.pv);
      return `Pesanan tersebar di ${D.pv.length} provinsi dan ${D.ct.length} kota. ${t.label} memimpin dengan ${pc(sec(t.v, total))} revenue.`;
    }
    case 'operasional': {
      const cn = D.co.map(() => 0);
      D.o.co.forEach((c) => (cn[c] += 1));
      const t = top(cn, D.co);
      const dlv = D.o.st.filter((s) => s === 0).length;
      return `${t.label} membawa ${pc(sec(t.v, D.N))} pesanan. Secara keseluruhan ${pc(sec(dlv, D.N))} pesanan berstatus terkirim.`;
    }
    case 'promo': {
      let np = 0;
      D.o.pr.forEach((p) => {
        if (p !== 0) np += 1;
      });
      const rs = ratingStats(D, all);
      return `Promo dipakai di ${pc(sec(np, D.N))} pesanan. Rating ulasan rata-rata ${nf(rs.avg, 2)} dari 5 (${nf(rs.n)} ulasan).`;
    }
    default:
      return '';
  }
}
