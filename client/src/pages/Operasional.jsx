import { useMemo } from 'react';
import { useDash } from '../lib/dash.js';
import { bar } from '../lib/charts.js';
import { aggO, statusAgg } from '../lib/calc.js';
import { ST_L, nf, rp, rps, rpf, pc, sec } from '../lib/format.js';
import { ChartCard, Grid, Kpi, Kpis } from '../components/ui.jsx';

function compute({ D, F, B, t }) {
  const stc = [t.s[0], t.s[2], t.mute, t.s[7], t.s[1]];

  const stack = (labels, keyFn, nk) => {
    const c = statusAgg(D, F, keyFn, nk);
    const tot = c.map((r) => r.reduce((a, b) => a + b, 0));
    return () =>
      bar(t, {
        labels,
        horiz: true,
        stacked: true,
        sets: ST_L.map((s, si) => ({
          label: s,
          color: stc[si],
          data: c.map((r, i) => (tot[i] ? (r[si] / tot[i]) * 100 : 0)),
          n: c.map((r) => r[si]),
        })),
        fmt: (x) => `${nf(x, 1)}%`, axisFmt: (x) => `${x}%`, max: 100, thick: 30, skip: false,
        tip: (cx) => `${cx.dataset.label}: ${nf(cx.parsed.x, 1)}% (${nf(cx.dataset.n[cx.dataIndex])} pesanan)`,
      });
  };

  const nc = D.co.length;
  const sh = new Array(nc).fill(0);
  const cn = new Array(nc).fill(0);
  let sa = 0;
  let sn = 0;
  let sr = 0;
  let rn = 0;
  for (let i = 0; i < D.N; i += 1) {
    if (!F[i]) continue;
    sh[D.o.co[i]] += D.o.ship[i];
    cn[D.o.co[i]] += 1;
    sa += D.o.ship[i];
    sn += 1;
    if (B[i]) {
      sr += D.o.amt[i];
      rn += 1;
    }
  }
  const total = cn.reduce((x, y) => x + y, 0);
  const co = cn.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0]);
  const pg = aggO(D, F, B, (i) => D.o.py[i], D.py.length);
  const po = pg.rev.map((v, i) => [v, i]).sort((x, y) => y[0] - x[0]);

  return {
    co, total, sa, sn, sr, rn, po,
    cos: stack(D.co, (i) => D.o.co[i], D.co.length),
    pys: stack(D.py, (i) => D.o.py[i], D.py.length),
    ship: () =>
      bar(t, {
        labels: D.co,
        sets: [{ label: 'Ongkir rata-rata', data: sh.map((v, i) => sec(v, cn[i])), vlabels: sh.map((v, i) => rps(sec(v, cn[i]))) }],
        vl: true, fmt: rpf, axisFmt: rps, thick: 34,
      }),
    cosh: () =>
      bar(t, {
        labels: co.map((x) => D.co[x[1]]),
        horiz: true,
        sets: [{ label: 'Porsi pesanan', data: co.map((x) => sec(x[0], total) * 100), vlabels: co.map((x) => pc(sec(x[0], total))) }],
        vl: true, fmt: (x) => `${nf(x, 1)}%`, axisFmt: (x) => `${x}%`, padR: 50, thick: 26, skip: false,
        tip: (c) => `${nf(c.parsed.x, 1)}% (${nf(co[c.dataIndex][0])} pesanan)`,
      }),
    pyr: () =>
      bar(t, {
        labels: po.map((x) => D.py[x[1]]),
        horiz: true,
        sets: [{ label: 'Revenue', data: po.map((x) => x[0]), vlabels: po.map((x) => rps(x[0])) }],
        vl: true, fmt: rp, axisFmt: rps, padR: 60, thick: 26, skip: false,
        tip: (c) => `${rp(c.parsed.x)} · AOV ${rpf(sec(pg.rev[po[c.dataIndex][1]], pg.n[po[c.dataIndex][1]]))}`,
      }),
  };
}

export default function Operasional() {
  const dash = useDash();
  const { D } = dash;
  const v = useMemo(() => compute(dash), [dash]);
  const topCo = v.co[0];
  const topPy = v.po[0];
  return (
    <>
      <Kpis>
        <Kpi label="Kurir terbesar" value={topCo && topCo[0] ? D.co[topCo[1]] : '–'} sub={topCo && v.total ? `${pc(sec(topCo[0], v.total))} dari pesanan` : ''} />
        <Kpi label="Ongkir rata-rata" value={rpf(sec(v.sa, v.sn))} sub="per pesanan" />
        <Kpi label="Ongkir terhadap nilai pesanan" value={pc(sec(sec(v.sa, v.sn), sec(v.sr, v.rn)), 1)} sub="ongkir rata-rata ÷ AOV" />
        <Kpi label="Metode bayar terbesar" value={topPy && topPy[0] ? D.py[topPy[1]] : '–'} sub={topPy && topPy[0] ? rp(topPy[0]) : ''} />
      </Kpis>
      <Grid>
        <ChartCard w="w6" title="Hasil pesanan per kurir" sub="Persentase pesanan menurut status. Jumlah pesanan di tooltip." chart={v.cos} />
        <ChartCard w="w6" title="Hasil pesanan per metode pembayaran" sub="Persentase pesanan menurut status." chart={v.pys} />
        <ChartCard w="w4" title="Ongkir rata-rata per kurir" sub="Sumbu mulai dari nol." chart={v.ship} />
        <ChartCard w="w4" title="Porsi pesanan per kurir" sub="Persen dari semua pesanan dalam filter." chart={v.cosh} />
        <ChartCard w="w4" title="Revenue per metode pembayaran" sub="Basis revenue terpilih." chart={v.pyr} />
      </Grid>
    </>
  );
}
