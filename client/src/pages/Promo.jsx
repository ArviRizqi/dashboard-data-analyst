import { useMemo } from 'react';
import { useDash } from '../lib/dash.js';
import { bar, dot, line } from '../lib/charts.js';
import { ratingStats } from '../lib/calc.js';
import { nf, rp, rps, rpf, pc, sec } from '../lib/format.js';
import { ChartCard, Grid, Kpi, Kpis, Panel } from '../components/ui.jsx';

// Kode promo musiman yang namanya memuat tahun (dipakai untuk mendeteksi pemakaian di luar tahunnya).
const CODE_YEAR = { HARBOLNAS22: 2022, RAMADAN23: 2023, SALE2024: 2024, WEEKEND25: 2025 };

function compute({ D, F, B, t }) {
  const np = D.pr.length;
  const g = Array.from({ length: np }, () => ({ n: 0, nb: 0, rev: 0, gross: 0, disc: 0, canc: 0, out: 0 }));
  const yrOf = D.pr.map((c) => CODE_YEAR[c] || 0);

  for (let i = 0; i < D.N; i += 1) {
    if (!F[i]) continue;
    const k = D.o.pr[i];
    const r = g[k];
    r.n += 1;
    r.disc += D.o.disc[i];
    if (D.o.st[i] === 3) r.canc += 1;
    if (yrOf[k] && yrOf[k] !== D.OY[i]) r.out += 1;
    if (B[i]) {
      r.nb += 1;
      r.rev += D.o.amt[i];
      r.gross += D.o.amt[i] + D.o.disc[i];
    }
  }
  const base = g[0];
  const pr = { n: 0, nb: 0, rev: 0, gross: 0, disc: 0 };
  for (let k = 1; k < np; k += 1) ['n', 'nb', 'rev', 'gross', 'disc'].forEach((f) => (pr[f] += g[k][f]));
  const all = base.n + pr.n;
  const rs = ratingStats(D, F);

  const po = [...Array(np).keys()].slice(1).sort((a, b) => g[b].disc - g[a].disc);

  const rd = [0, 0, 0, 0, 0];
  const bs = D.br.map(() => [0, 0]);
  const cs = D.cat.map(() => [0, 0]);
  const qs = {};
  for (let k = 0; k < D.r.o.length; k += 1) {
    if (!F[D.r.o[k]]) continue;
    rd[D.r.t[k] - 1] += 1;
    const p = D.r.p[k];
    bs[D.p.br[p]][0] += D.r.t[k];
    bs[D.p.br[p]][1] += 1;
    cs[D.p.cat[p]][0] += D.r.t[k];
    cs[D.p.cat[p]][1] += 1;
    const ym = D.ym[D.r.ym[k]];
    const q = `${ym.slice(2, 4)} Q${Math.ceil(+ym.slice(5) / 3)}`;
    qs[q] = qs[q] || [0, 0];
    qs[q][0] += D.r.t[k];
    qs[q][1] += 1;
  }
  const ql = Object.keys(qs).sort();

  const dots = (labs, arr) => {
    const o = arr
      .map((a, i) => [a[1] ? a[0] / a[1] : null, i, a[1]])
      .filter((x) => x[0] != null)
      .sort((x, y) => x[0] - y[0]);
    return () => dot(t, { labels: o.map((x) => labs[x[1]]), values: o.map((x) => x[0]), counts: o.map((x) => x[2]) });
  };

  return {
    g, base, pr, all, rs, yrOf,
    pcmp: () =>
      bar(t, {
        labels: ['Tanpa promo', 'Dengan promo'],
        sets: [
          { label: 'Setelah diskon', data: [sec(base.rev, base.nb), sec(pr.rev, pr.nb)] },
          { label: 'Sebelum diskon', data: [sec(base.gross, base.nb), sec(pr.gross, pr.nb)], color: t.s[1] },
        ],
        fmt: rpf, axisFmt: rps, thick: 38,
      }),
    pdisc: () =>
      bar(t, {
        labels: po.map((k) => D.pr[k]),
        horiz: true,
        sets: [{ label: 'Total diskon', data: po.map((k) => g[k].disc), vlabels: po.map((k) => rps(g[k].disc)) }],
        vl: true, fmt: rp, axisFmt: rps, padR: 60, thick: 20, skip: false,
      }),
    rdist: () =>
      bar(t, {
        labels: ['1★', '2★', '3★', '4★', '5★'],
        sets: [{ label: 'Ulasan', data: rd, vlabels: rd.map((x) => pc(sec(x, rs.n), 0)) }],
        vl: true, fmt: (x) => `${nf(x)} ulasan`, thick: 34,
      }),
    rbr: dots(D.br, bs),
    rcat: dots(D.cat, cs),
    rtr: () =>
      line(t, {
        labels: ql,
        sets: [{ label: 'Rating rata-rata', data: ql.map((q) => sec(qs[q][0], qs[q][1])) }],
        fmt: (x) => nf(x, 2), axisFmt: (x) => nf(x, 1), min: 3.5, max: 4.5, skip: true,
        tip: (c) => `Rating ${nf(c.parsed.y, 2)} dari ${nf(qs[ql[c.dataIndex]][1])} ulasan`,
      }),
  };
}

export default function Promo() {
  const dash = useDash();
  const { D } = dash;
  const v = useMemo(() => compute(dash), [dash]);
  const { pr, rs } = v;
  return (
    <>
      <Kpis>
        <Kpi label="Pesanan memakai promo" value={pc(sec(pr.n, v.all))} sub={`${nf(pr.n)} dari ${nf(v.all)} pesanan`} />
        <Kpi label="Total diskon" value={rp(pr.disc)} sub="semua pesanan berpromo" />
        <Kpi label="Diskon rata-rata per pesanan berpromo" value={rpf(sec(pr.disc, pr.n))} sub="per pesanan" />
        <Kpi label="Rating rata-rata" value={`${nf(rs.avg, 2)} / 5`} sub={`${nf(rs.n)} ulasan`} />
        <Kpi label="Ulasan 1–2 bintang" value={pc(sec(rs.low, rs.n))} sub={`${nf(rs.low)} ulasan`} />
      </Kpis>
      <Grid>
        <ChartCard w="w4" title="Nilai pesanan rata-rata: dengan dan tanpa promo" sub="Nilai setelah diskon dan nilai sebelum diskon, basis terpilih." chart={v.pcmp} />
        <ChartCard w="w4" title="Total diskon per kode promo" sub="Semua pesanan dalam filter." chart={v.pdisc} />
        <ChartCard w="w4" title="Sebaran bintang ulasan" sub="Jumlah ulasan, pesanan dalam filter." chart={v.rdist} />
        <Panel w="w12" title="Kinerja kode promo" sub='Kolom "Di luar tahun kode" memeriksa kode yang mengandung tahun (22, 23, 2024, 25).' maxHeight="none">
          <table>
            <thead>
              <tr><th>Kode promo</th><th>Pesanan</th><th>AOV setelah diskon</th><th>Total diskon</th><th>Diskon rata-rata</th><th>Batal</th><th>Di luar tahun kode</th></tr>
            </thead>
            <tbody>
              {D.pr.map((code, k) => {
                const r = v.g[k];
                return (
                  <tr key={code}>
                    <td>{code}</td>
                    <td>{nf(r.n)}</td>
                    <td>{rpf(sec(r.rev, r.nb))}</td>
                    <td>{rp(r.disc)}</td>
                    <td>{k ? rpf(sec(r.disc, r.n)) : '–'}</td>
                    <td>{pc(sec(r.canc, r.n))}</td>
                    <td>{v.yrOf[k] ? pc(sec(r.out, r.n), 0) : '–'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Panel>
        <ChartCard w="w4" title="Rating rata-rata per brand" sub="Skala 3,5 sampai 4,5." chart={v.rbr} />
        <ChartCard w="w4" title="Rating rata-rata per kategori" sub="Skala 3,5 sampai 4,5." chart={v.rcat} />
        <ChartCard w="w4" title="Rating rata-rata per kuartal" sub="Menurut tanggal ulasan." chart={v.rtr} />
      </Grid>
    </>
  );
}
