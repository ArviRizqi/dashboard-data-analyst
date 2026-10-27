import { useMemo } from 'react';
import { useDash } from '../lib/dash.js';
import { bar, line } from '../lib/charts.js';
import { ratingStats } from '../lib/calc.js';
import { ST_L, MON, ml, nf, rp, rps, rpf, pc, sec } from '../lib/format.js';
import { ChartCard, Grid, Kpi, Kpis } from '../components/ui.jsx';

function compute({ D, F, B, S, t }) {
  let rev = 0;
  let n = 0;
  let all = 0;
  let cn = 0;
  let rn = 0;
  for (let i = 0; i < D.N; i += 1) {
    if (F[i]) {
      all += 1;
      if (D.o.st[i] === 3) cn += 1;
      if (D.o.st[i] === 4) rn += 1;
    }
    if (B[i]) {
      rev += D.o.amt[i];
      n += 1;
    }
  }
  const rs = ratingStats(D, F);

  // per bulan (hanya bulan yang punya pesanan; bulan ulasan di luar periode tidak ikut)
  const mrev = new Array(D.ym.length).fill(0);
  for (let i = 0; i < D.N; i += 1) if (B[i]) mrev[D.o.ym[i]] += D.o.amt[i];
  const idx = [];
  for (let k = D.ymFrom; k <= D.ymTo; k += 1) if (S.years.has(+D.ym[k].slice(0, 4))) idx.push(k);
  const labs = idx.map((k) => ml(D.ym[k]));
  const vals = idx.map((k) => mrev[k]);
  const ma = vals.map((_, i) => (i < 2 ? null : (vals[i] + vals[i - 1] + vals[i - 2]) / 3));

  // per tahun dan periode sebanding (Jan–bulan terakhir)
  const ys = D.years.filter((y) => S.years.has(y));
  const yr = {};
  const jf = {};
  ys.forEach((y) => {
    yr[y] = 0;
    jf[y] = 0;
  });
  for (let i = 0; i < D.N; i += 1) {
    if (!B[i]) continue;
    yr[D.OY[i]] += D.o.amt[i];
    if (+D.ym[D.o.ym[i]].slice(5) <= D.lastMonth) jf[D.OY[i]] += D.o.amt[i];
  }
  const partial = (y) => D.partialYear && y === D.maxYear;
  const yl = ys.map((y) => (partial(y) ? `${y} (Jan–${MON[D.lastMonth - 1]})` : String(y)));
  const growth = (cur, prev) => `${cur >= prev ? '+' : ''}${nf((cur / prev - 1) * 100, 1)}%`;
  const jfTitle = D.lastMonth === 1 ? 'Januari' : `Jan–${MON[D.lastMonth - 1]}`;

  // status
  const sv = [0, 0, 0, 0, 0];
  const sn = [0, 0, 0, 0, 0];
  for (let i = 0; i < D.N; i += 1) {
    if (!F[i]) continue;
    sv[D.o.st[i]] += D.o.amt[i];
    sn[D.o.st[i]] += 1;
  }
  const stc = [t.s[0], t.s[2], t.mute, t.s[7], t.s[1]];

  return {
    kpi: { rev, n, all, cn, rn, rs },
    jfTitle,
    jfPeriod: D.lastMonth === 12 ? 'setahun penuh' : `Jan–${MON[D.lastMonth - 1]}`,
    partialNote: D.partialYear ? `${D.maxYear} baru mencakup Jan–${MON[D.lastMonth - 1]}.` : '',
    month: () =>
      line(t, {
        labels: labs,
        sets: [
          { label: 'Revenue bulanan', data: vals, fill: true },
          { label: 'Rata-rata 3 bulan', data: ma, color: t.s[1], dash: [6, 4] },
        ],
        fmt: rp,
        axisFmt: rps,
        skip: true,
      }),
    year: () =>
      bar(t, {
        labels: yl,
        sets: [{ label: 'Revenue', data: ys.map((y) => yr[y]), vlabels: ys.map((y) => rps(yr[y])) }],
        fmt: rp,
        axisFmt: rps,
        vl: true,
        tip: (c) => {
          const y = ys[c.dataIndex];
          const prev = yr[y - 1];
          return rp(c.parsed.y) + (prev && !partial(y) ? ` (${growth(yr[y], prev)} vs ${y - 1})` : '');
        },
      }),
    jf: () =>
      bar(t, {
        labels: ys.map(String),
        sets: [{ label: `Revenue ${D.lastMonth === 12 ? 'setahun' : `Jan–${MON[D.lastMonth - 1]}`}`, data: ys.map((y) => jf[y]), vlabels: ys.map((y) => rps(jf[y])) }],
        fmt: rp,
        axisFmt: rps,
        vl: true,
        tip: (c) => {
          const y = ys[c.dataIndex];
          const prev = jf[y - 1];
          return rp(c.parsed.y) + (prev ? ` (${growth(jf[y], prev)} vs ${y - 1})` : '');
        },
      }),
    status: () =>
      bar(t, {
        labels: ST_L,
        horiz: true,
        sets: [{ label: 'Nilai pesanan', data: sv, color: stc, vlabels: sv.map((v, i) => `${rps(v)} · ${nf(sn[i])} pesanan (${pc(sec(sn[i], all))})`) }],
        fmt: rp,
        axisFmt: rps,
        vl: true,
        padR: 200,
        thick: 26,
        tip: (c) => `${rp(c.parsed.x)} · ${nf(sn[c.dataIndex])} pesanan`,
      }),
  };
}

export default function Ringkasan() {
  const dash = useDash();
  const v = useMemo(() => compute(dash), [dash]);
  const { rev, n, all, cn, rn, rs } = v.kpi;
  return (
    <>
      <Kpis>
        <Kpi label="Revenue" value={rp(rev)} sub={`dari ${nf(all)} pesanan masuk`} />
        <Kpi label="Pesanan" value={nf(n)} sub="pesanan pada basis terpilih" />
        <Kpi label="Nilai pesanan rata-rata (AOV)" value={rpf(sec(rev, n))} sub="revenue ÷ pesanan" />
        <Kpi label="Tingkat batal" value={pc(sec(cn, all))} sub={`${nf(cn)} pesanan`} />
        <Kpi label="Tingkat retur" value={pc(sec(rn, all))} sub={`${nf(rn)} pesanan`} />
        <Kpi label="Rating ulasan" value={`${nf(rs.avg, 2)} / 5`} sub={`${nf(rs.n)} ulasan`} />
      </Kpis>
      <Grid>
        <ChartCard w="w8" title="Revenue per bulan" sub="Garis tebal: nilai bulanan. Garis putus: rata-rata 3 bulan." chart={v.month} />
        <ChartCard w="w4" title="Revenue per tahun" sub={v.partialNote} chart={v.year} />
        <ChartCard w="w4" title={`${v.jfTitle} tiap tahun`} sub={`Periode sebanding untuk menilai laju awal ${dash.D.maxYear}.`} chart={v.jf} />
        <ChartCard w="w8" title="Status pesanan" sub="Nilai pesanan menurut status, semua pesanan dalam filter. Ikuti angka di ujung batang." chart={v.status} />
      </Grid>
    </>
  );
}
