import { defaultFilters } from '../lib/calc.js';

const BASIS = [
  ['delivered', 'Terkirim'],
  ['active', 'Aktif'],
  ['all', 'Semua'],
];

function Select({ id, label, items, value, onChange }) {
  return (
    <div className="fg">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(+e.target.value)}>
        <option value={-1}>Semua</option>
        {items.map((v, i) => (
          <option key={v} value={i}>{v}</option>
        ))}
      </select>
    </div>
  );
}

export default function Filters({ D, S, setS, basisNote }) {
  const set = (patch) => setS((s) => ({ ...s, ...patch }));
  const toggleYear = (y) =>
    setS((s) => {
      const years = new Set(s.years);
      if (years.has(y)) {
        if (years.size > 1) years.delete(y); // minimal satu tahun tetap aktif
      } else years.add(y);
      return { ...s, years };
    });

  return (
    <>
      <div className="filters">
        <div className="fg">
          <span className="lb">Tahun</span>
          <span>
            {D.years.map((y) => (
              <button key={y} className="chip" aria-pressed={S.years.has(y)} onClick={() => toggleYear(y)}>
                {y}
              </button>
            ))}
          </span>
        </div>
        <Select id="f-pv" label="Provinsi" items={D.pv} value={S.pv} onChange={(pv) => set({ pv })} />
        <Select id="f-co" label="Kurir" items={D.co} value={S.co} onChange={(co) => set({ co })} />
        <Select id="f-py" label="Pembayaran" items={D.py} value={S.py} onChange={(py) => set({ py })} />
        <div className="fg">
          <span className="lb">Basis revenue</span>
          <span className="seg">
            {BASIS.map(([k, l]) => (
              <button key={k} aria-pressed={S.basis === k} onClick={() => set({ basis: k })}>{l}</button>
            ))}
          </span>
        </div>
        <button className="reset" onClick={() => setS(defaultFilters(D))}>Atur ulang</button>
      </div>
      <div className="note">{basisNote}</div>
    </>
  );
}
