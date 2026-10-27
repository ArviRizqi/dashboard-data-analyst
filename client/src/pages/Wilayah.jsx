import { useMemo, useState } from 'react';
import { useDash } from '../lib/dash.js';
import { bar } from '../lib/charts.js';
import { aggO, statusAgg } from '../lib/calc.js';
import { nf, rp, rps, rpf, pc, sec } from '../lib/format.js';
import { ChartCard, Grid, Kpi, Kpis, Panel } from '../components/ui.jsx';

function cityRows({ D, F, B }) {
  const nC = D.ct.length;
  const cc = statusAgg(D, F, (i) => D.o.ct[i], nC);
  const ag = aggO(D, F, B, (i) => D.o.ct[i], nC);
  const prov = new Array(nC).fill('');
  for (let i = 0; i < D.N; i += 1) if (!prov[D.o.ct[i]]) prov[D.o.ct[i]] = D.pv[D.o.pv[i]];
  return D.ct
    .map((c, k) => {
      const tot = cc[k].reduce((a, b) => a + b, 0);
      return { c, p: prov[k], n: tot, rev: ag.rev[k], aov: sec(ag.rev[k], ag.n[k]), canc: sec(cc[k][3], tot), ret: sec(cc[k][4], tot) };
    })
    .filter((r) => r.n > 0);
}

function compute(dash) {
  const { D, F, B, t } = dash;
  const ag = aggO(D, F, B, (i) => D.o.pv[i], D.pv.length);
  const tot = ag.rev.reduce((a, b) => a + b, 0);
  const po = ag.rev.map((v, i) => [v, i]).filter((x) => x[0] > 0).sort((a, b) => b[0] - a[0]);
  const rows = cityRows(dash);

  let all = 0;
  let cn = 0;
  rows.forEach((r) => {
    all += r.n;
    cn += r.canc * r.n;
  });
  const avg = sec(cn, all);
  const cr = [...rows].sort((a, b) => b.canc - a.canc);
  const rr = rows.filter((r) => r.n >= 20);
  const lo = rr.length ? [...rr].sort((a, b) => a.canc - b.canc)[0] : null;

  return {
    rows, avg, tot, po,
    hi: rr.length ? cr[0] : null,
    lo,
    smallSample: rows.length > 0 && rows.some((r) => r.n < 60),
    prov: () =>
      bar(t, {
        labels: po.map((x) => D.pv[x[1]]),
        horiz: true,
        sets: [{ label: 'Revenue', data: po.map((x) => x[0]), vlabels: po.map((x) => `${rps(x[0])} · ${pc(sec(x[0], tot), 0)}`) }],
        fmt: rp, axisFmt: rps, vl: true, padR: 92, thick: 18, skip: false,
        tip: (c) => `${rp(c.parsed.x)} (${pc(sec(c.parsed.x, tot))})`,
      }),
    cityc: () =>
      bar(t, {
        labels: cr.map((r) => r.c),
        horiz: true,
        sets: [{
          label: 'Tingkat batal',
          data: cr.map((r) => r.canc * 100),
          color: cr.map((r) => (r.canc > avg + 1e-9 ? t.s[7] : t.s[0])),
          vlabels: cr.map((r) => `${nf(r.canc * 100, 1)}%`),
        }],
        fmt: (x) => `${nf(x, 1)}%`, axisFmt: (x) => `${x}%`, vl: true, padR: 46, thick: 14, skip: false,
        tip: (c) => `${nf(c.parsed.x, 1)}% dari ${nf(cr[c.dataIndex].n)} pesanan`,
      }),
  };
}

const COLS = [
  ['c', 'Kota'], ['p', 'Provinsi'], ['n', 'Pesanan'], ['rev', 'Revenue'], ['aov', 'AOV'], ['canc', 'Batal'], ['ret', 'Retur'],
];

export default function Wilayah() {
  const dash = useDash();
  const { D } = dash;
  const [sort, setSort] = useState({ k: 'rev', d: -1 });
  const v = useMemo(() => compute(dash), [dash]);

  const sorted = useMemo(() => {
    const { k, d } = sort;
    return [...v.rows].sort((a, b) => (typeof a[k] === 'string' ? d * a[k].localeCompare(b[k]) : d * (a[k] - b[k])));
  }, [v.rows, sort]);

  const topProv = v.po[0];
  return (
    <>
      <Kpis>
        <Kpi label="Provinsi teratas" value={topProv ? D.pv[topProv[1]] : '–'} sub={topProv ? `${pc(sec(topProv[0], v.tot))} dari revenue` : ''} />
        <Kpi label="Kota dengan pesanan" value={nf(v.rows.length)} sub={`kota; rata-rata batal ${pc(v.avg)}`} />
        <Kpi
          label="Pembatalan tertinggi"
          value={v.hi ? pc(v.hi.canc) : '–'}
          sub={v.hi ? v.hi.c + (v.smallSample ? ' · sampel kecil, baca hati-hati' : '') : ''}
        />
        <Kpi label="Pembatalan terendah" value={v.lo ? pc(v.lo.canc) : '–'} sub={v.lo ? v.lo.c : ''} />
      </Kpis>
      <Grid>
        <ChartCard w="w6" h="tall" title="Revenue per provinsi" sub="Provinsi diambil dari alamat pengiriman." chart={v.prov} />
        <ChartCard w="w6" h="tall" title="Tingkat batal per kota" sub="Merah: di atas rata-rata filter. Biru: di bawah atau sama." chart={v.cityc} />
        <Panel w="w12" title="Peringkat kota" sub="Klik judul kolom untuk mengurutkan." maxHeight="420px">
          <table>
            <thead>
              <tr>
                {COLS.map(([k, l]) => (
                  <th key={k} className="sortable" onClick={() => setSort((s) => (s.k === k ? { k, d: -s.d } : { k, d: -1 }))}>
                    {l}{sort.k === k ? (sort.d < 0 ? ' ▼' : ' ▲') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.c}>
                  <td>{r.c}</td><td>{r.p}</td><td>{nf(r.n)}</td><td>{rp(r.rev)}</td><td>{rpf(r.aov)}</td><td>{pc(r.canc)}</td><td>{pc(r.ret)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </Grid>
    </>
  );
}
