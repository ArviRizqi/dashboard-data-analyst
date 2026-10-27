import { useMemo } from 'react';
import { useDash } from '../lib/dash.js';
import { bar, line } from '../lib/charts.js';
import { nf, rp, rps, rpf, pc, sec } from '../lib/format.js';
import { ChartCard, Grid, Kpi, Kpis, Panel } from '../components/ui.jsx';

function compute({ D, B, S, t, setCat }) {
  const nP = D.p.id.length;
  const inCat = (p) => S.cat < 0 || D.p.cat[p] === S.cat;

  const catRev = new Array(D.cat.length).fill(0); // grafik kategori mengabaikan pilihan kategori
  let rev = 0;
  let u = 0;
  const prRev = new Array(nP).fill(0);
  const prU = new Array(nP).fill(0);
  const brRev = new Array(D.br.length).fill(0);
  const bRev = D.band.map(() => 0);
  const bU = D.band.map(() => 0);
  const bP = D.band.map(() => 0);

  for (let j = 0; j < D.i.o.length; j += 1) {
    if (!B[D.i.o[j]]) continue;
    const p = D.i.p[j];
    catRev[D.p.cat[p]] += D.i.s[j];
    if (!inCat(p)) continue;
    rev += D.i.s[j];
    u += D.i.q[j];
    prRev[p] += D.i.s[j];
    prU[p] += D.i.q[j];
    brRev[D.p.br[p]] += D.i.s[j];
    bRev[D.p.bd[p]] += D.i.s[j];
    bU[D.p.bd[p]] += D.i.q[j];
  }
  for (let p = 0; p < nP; p += 1) if (inCat(p)) bP[D.p.bd[p]] += 1;

  const sorted = prRev.map((v, p) => [v, p]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]);
  let cum = 0;
  let n50 = 0;
  let n80 = 0;
  const curve = [];
  sorted.forEach((x, i) => {
    cum += x[0];
    const pct = (cum / rev) * 100;
    curve.push({ x: i + 1, y: pct });
    if (!n50 && pct >= 50) n50 = i + 1;
    if (!n80 && pct >= 80) n80 = i + 1;
  });
  const out = D.p.stock.filter((s, p) => s === 0 && inCat(p)).length;

  const ord = catRev.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
  const tot = catRev.reduce((a, b) => a + b, 0);
  const bo = brRev.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
  const pt = (n) => (n ? [{ x: n, y: curve[n - 1].y }] : []);

  const stk = D.cat.map(() => 0);
  const sld = D.cat.map(() => 0);
  D.p.cat.forEach((c, p) => {
    stk[c] += D.p.stock[p];
    sld[c] += D.p.sold[p];
  });

  const outs = D.p.id.map((_, p) => p).filter((p) => D.p.stock[p] === 0).sort((a, b) => D.p.sold[b] - D.p.sold[a]);

  return {
    rev, u, n50, out, nSold: sorted.length,
    top: sorted.slice(0, 10).map((x) => ({ p: x[1], rev: x[0], units: prU[x[1]] })),
    outs,
    cat: () =>
      bar(t, {
        labels: ord.map((x) => D.cat[x[1]]),
        horiz: true,
        sets: [{
          label: 'Revenue',
          data: ord.map((x) => x[0]),
          color: ord.map((x) => (S.cat < 0 || S.cat === x[1] ? t.s[0] : `${t.s[0]}44`)),
          vlabels: ord.map((x) => pc(sec(x[0], tot))),
        }],
        fmt: rp, axisFmt: rps, vl: true, padR: 50,
        onClick: (i) => setCat(S.cat === ord[i][1] ? -1 : ord[i][1]),
        tip: (c) => `${rp(c.parsed.x)} (${pc(sec(c.parsed.x, tot))})`,
      }),
    brand: () =>
      bar(t, {
        labels: bo.map((x) => D.br[x[1]]),
        horiz: true,
        sets: [{ label: 'Revenue', data: bo.map((x) => x[0]), vlabels: bo.map((x) => rps(x[0])) }],
        fmt: rp, axisFmt: rps, vl: true, padR: 60,
        tip: (c) => `${rp(c.parsed.x)} (${pc(sec(c.parsed.x, rev))})`,
      }),
    band: () =>
      bar(t, {
        labels: D.band,
        horiz: true,
        sets: [{ label: 'Revenue', data: bRev, vlabels: bRev.map((v, i) => `${rps(v)} · ${bP[i]} produk`) }],
        fmt: rp, axisFmt: rps, vl: true, padR: 120,
        tip: (c) => `${rp(c.parsed.x)} · ${nf(bU[c.dataIndex])} unit · ${bP[c.dataIndex]} produk di katalog`,
      }),
    pareto: () =>
      line(t, {
        xy: true, xTitle: 'Peringkat produk (1 = terlaris)', labels: [], min: 0, max: 100,
        axisFmt: (x) => `${x}%`, noTbl: true, fmt: (x) => `${nf(x, 1)}%`,
        sets: [
          { label: 'Revenue kumulatif', data: curve, fill: true },
          { label: `50% revenue: ${n50} produk`, data: pt(n50), color: t.s[1], pr: 6, showLine: false },
          { label: `80% revenue: ${n80} produk`, data: pt(n80), color: t.s[2], pr: 6, showLine: false },
        ],
        tip: (c) => (c.datasetIndex === 0 ? `Produk 1–${c.parsed.x}: ${nf(c.parsed.y, 1)}% revenue` : c.dataset.label),
      }),
    stock: () =>
      bar(t, {
        labels: D.cat,
        sets: [{ label: 'Stok tersedia', data: stk }, { label: 'Unit terjual', data: sld, color: t.s[1] }],
        fmt: (x) => `${nf(x)} unit`, axisFmt: (x) => nf(x), thick: 22,
      }),
  };
}

export default function Produk() {
  const dash = useDash();
  const { D, S, setCat } = dash;
  const v = useMemo(() => compute(dash), [dash]);

  return (
    <>
      <Kpis>
        <Kpi label="Revenue produk" value={rp(v.rev)} sub={S.cat >= 0 ? D.cat[S.cat] : 'semua kategori'} />
        <Kpi label="Unit terjual" value={nf(v.u)} sub="unit" />
        <Kpi label="Harga jual rata-rata" value={rpf(sec(v.rev, v.u))} sub="per unit" />
        <Kpi
          label="Produk penyumbang 50% revenue"
          value={v.n50 ? `${nf(v.n50)} produk` : '–'}
          sub={v.nSold ? `${pc(v.n50 / v.nSold, 0)} dari ${nf(v.nSold)} produk terjual` : ''}
        />
        <Kpi label="Produk stok 0" value={nf(v.out)} sub={`dari ${nf(D.p.id.length)} produk`} />
      </Kpis>
      {S.cat >= 0 && (
        <div className="note">
          Kategori dipilih: <b>{D.cat[S.cat]}</b>{' '}
          <button className="chip" onClick={() => setCat(-1)}>Hapus pilihan</button>
        </div>
      )}
      <Grid>
        <ChartCard w="w4" h="tall" title="Revenue per kategori" sub="Klik batang untuk memfilter brand, harga, dan produk di halaman ini." chart={v.cat} />
        <ChartCard w="w4" h="tall" title="Revenue per brand" sub="Mengikuti kategori yang dipilih." chart={v.brand} />
        <ChartCard w="w4" h="tall" title="Revenue per rentang harga" sub="Harga satuan produk." chart={v.band} />
        <ChartCard w="w8" title="Konsentrasi revenue (Pareto)" sub="Produk diurutkan dari terlaris. Sumbu Y: persen kumulatif revenue." chart={v.pareto} />
        <ChartCard w="w4" title="Stok tersedia vs unit terjual per kategori" sub="Tidak mengikuti filter. Terjual = semua status, seluruh periode." chart={v.stock} />
        <Panel w="w8" title="10 produk teratas" sub="Mengikuti filter dan kategori terpilih. Revenue item sebelum diskon pesanan.">
          <table>
            <thead><tr><th>Produk</th><th>Kategori</th><th>Unit</th><th>Revenue</th></tr></thead>
            <tbody>
              {v.top.map((x) => (
                <tr key={x.p}>
                  <td>{D.p.name[x.p]}</td><td>{D.cat[D.p.cat[x.p]]}</td><td>{nf(x.units)}</td><td>{rp(x.rev)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
        <Panel w="w4" title="Produk stok 0" sub="Tidak mengikuti filter.">
          <table>
            <thead><tr><th>Produk</th><th>Terjual</th></tr></thead>
            <tbody>
              {v.outs.map((p) => (
                <tr key={p}><td>{D.p.name[p]}</td><td>{D.p.sold[p]}</td></tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </Grid>
    </>
  );
}
