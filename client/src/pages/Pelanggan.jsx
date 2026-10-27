import { useMemo } from 'react';
import { useDash } from '../lib/dash.js';
import { bar } from '../lib/charts.js';
import { custAgg } from '../lib/calc.js';
import { GENDER_LABEL, nf, rp, rps, pc, sec } from '../lib/format.js';
import { ChartCard, Grid, Kpi, Kpis, Panel } from '../components/ui.jsx';

const SEGS = [
  ['Juara', '3+ pesanan, terakhir beli ≤ 180 hari', 'Program loyalitas dan akses awal koleksi; jaga stok favorit.'],
  ['Loyal aktif', '2 pesanan, terakhir beli ≤ 180 hari', 'Dorong pesanan ke-3 lewat bundling atau voucher pesanan ke-3.'],
  ['Berhenti membeli', '2+ pesanan, terakhir beli > 180 hari', 'Win-back personal berdasarkan kategori yang pernah dibeli.'],
  ['Baru, masih aktif', '1 pesanan, terakhir beli ≤ 180 hari', 'Ajak pembelian kedua dalam 30 hari.'],
  ['Sekali beli, tidak kembali', '1 pesanan, terakhir beli > 180 hari', 'Survei singkat; prioritas rendah.'],
];

function compute({ D, F, B, t }) {
  const A = custAgg(D, F, B);
  const cs = [...A.n.keys()];
  const nb = cs.length;
  const rep = cs.filter((c) => A.n.get(c) > 1).length;
  let tr = 0;
  let no = 0;
  cs.forEach((c) => {
    tr += A.rev.get(c);
    no += A.n.get(c);
  });
  const rv = cs.map((c) => A.rev.get(c)).sort((a, b) => b - a);
  const top = rv.slice(0, Math.floor(nb * 0.2)).reduce((a, b) => a + b, 0);

  // usia x gender (pelanggan tanpa data demografi dilewati)
  const ar = D.age.map(() => D.gen.map(() => 0));
  cs.forEach((c) => {
    const a = D.c.a[c];
    const g = D.c.g[c];
    if (a !== undefined && g !== undefined) ar[a][g] += A.rev.get(c);
  });

  const fr = [0, 0, 0, 0, 0, 0];
  cs.forEach((c) => {
    fr[Math.min(A.n.get(c), 6) - 1] += 1;
  });

  const sg = SEGS.map(() => [0, 0]);
  cs.forEach((c) => {
    const n = A.n.get(c);
    const act = A.ref - A.last.get(c) <= 180;
    const k = n >= 3 && act ? 0 : n === 2 && act ? 1 : n >= 2 ? 2 : act ? 3 : 4;
    sg[k][0] += 1;
    sg[k][1] += A.rev.get(c);
  });

  return {
    nb, rep, tr, no, top, sg,
    age: () =>
      bar(t, {
        labels: D.age,
        stacked: true,
        sets: D.gen.map((g, gi) => ({ label: GENDER_LABEL[g] || g, data: ar.map((r) => r[gi]), color: t.s[gi] })),
        fmt: rp, axisFmt: rps, thick: 44,
      }),
    freq: () =>
      bar(t, {
        labels: ['1', '2', '3', '4', '5', '6+'],
        sets: [{ label: 'Pembeli', data: fr, vlabels: fr.map((x) => nf(x)) }],
        vl: true, fmt: (x) => `${nf(x)} pembeli`, thick: 34,
      }),
    seg: () =>
      bar(t, {
        labels: SEGS.map((s) => s[0]),
        horiz: true,
        sets: [{ label: 'Revenue', data: sg.map((s) => s[1]), vlabels: sg.map((s) => pc(sec(s[1], tr), 0)) }],
        fmt: rp, axisFmt: rps, vl: true, padR: 46,
        tip: (c) => `${rp(c.parsed.x)} · ${nf(sg[c.dataIndex][0])} pelanggan`,
      }),
  };
}

export default function Pelanggan() {
  const dash = useDash();
  const v = useMemo(() => compute(dash), [dash]);
  return (
    <>
      <Kpis>
        <Kpi label="Pembeli aktif" value={nf(v.nb)} sub={`dari ${nf(dash.D.c.g.length)} pelanggan terdaftar`} />
        <Kpi label="Tingkat repeat" value={pc(sec(v.rep, v.nb))} sub={`${nf(v.rep)} pembeli 2+ pesanan`} />
        <Kpi label="Pesanan per pembeli" value={nf(sec(v.no, v.nb), 1)} sub="pesanan" />
        <Kpi label="Revenue per pembeli" value={rp(sec(v.tr, v.nb))} sub="per pembeli" />
        <Kpi label="Revenue dari 20% pembeli teratas" value={pc(sec(v.top, v.tr), 0)} sub="konsentrasi sedang" />
      </Kpis>
      <Grid>
        <ChartCard w="w4" title="Revenue per usia dan gender" sub="Gender ditumpuk per kelompok usia." chart={v.age} />
        <ChartCard w="w4" title="Berapa kali pelanggan membeli" sub="Jumlah pembeli menurut jumlah pesanan pada basis terpilih." chart={v.freq} />
        <ChartCard w="w4" title="Revenue per segmen pelanggan" sub="Segmen dihitung dari frekuensi dan recency (batas 180 hari)." chart={v.seg} />
        <Panel w="w12" title="Segmen pelanggan dan tindakan" sub="Recency dihitung sampai akhir periode filter." maxHeight="none">
          <table>
            <thead>
              <tr><th>Segmen</th><th>Definisi</th><th>Pelanggan</th><th>Revenue</th><th>Porsi</th><th>Tindakan</th></tr>
            </thead>
            <tbody>
              {SEGS.map((s, i) => (
                <tr key={s[0]}>
                  <td><b>{s[0]}</b></td>
                  <td className="wrapc">{s[1]}</td>
                  <td>{nf(v.sg[i][0])}</td>
                  <td>{rp(v.sg[i][1])}</td>
                  <td>{pc(sec(v.sg[i][1], v.tr), 0)}</td>
                  <td className="wrapc">{s[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </Grid>
    </>
  );
}
