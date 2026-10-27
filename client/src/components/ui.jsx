import { useEffect, useMemo, useRef, useState } from 'react';
import { Chart } from 'chart.js';

export function Kpi({ label, value, sub }) {
  return (
    <div className="kpi">
      <div className="l">{label}</div>
      <div className="v">{value ?? '–'}</div>
      <div className="s">{sub || ' '}</div>
    </div>
  );
}

export const Kpis = ({ children }) => <div className="kpis">{children}</div>;
export const Grid = ({ children }) => <div className="grid">{children}</div>;

/** Kartu kosong untuk tabel atau konten bebas. */
export function Panel({ title, sub, w = '', children, maxHeight }) {
  return (
    <section className={`card ${w}`}>
      <h3>{title}</h3>
      {sub && <div className="sub">{sub}</div>}
      <div className="tblv" style={maxHeight ? { maxHeight } : undefined}>
        {children}
      </div>
    </section>
  );
}

function ChartTable({ meta }) {
  if (meta.noTbl) return <p className="note">Tabel tidak tersedia untuk grafik ini.</p>;
  return (
    <div className="tblv">
      <table>
        <thead>
          <tr>
            <th />
            {meta.sets.map((s, i) => (
              <th key={i}>{s.label || 'Nilai'}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {meta.labels.map((l, i) => (
            <tr key={i}>
              <td>{l}</td>
              {meta.sets.map((s, j) => (
                <td key={j}>{s.data[i] == null ? '–' : (s.tfmt || meta.fmt)(s.data[i])}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Kartu grafik. `chart` adalah fungsi yang mengembalikan { config, meta } (lihat lib/charts.js).
 * Fungsi dipanggil ulang saat grafik dibuat supaya Chart.js tidak memakai ulang objek config
 * yang sudah dimodifikasinya.
 */
export function ChartCard({ title, sub, w = '', h = '', chart, foot }) {
  const canvasRef = useRef(null);
  const [asTable, setAsTable] = useState(false);
  const meta = useMemo(() => chart().meta, [chart]);

  useEffect(() => {
    if (asTable || !canvasRef.current) return undefined;
    const instance = new Chart(canvasRef.current, chart().config);
    return () => instance.destroy();
  }, [chart, asTable]);

  return (
    <section className={`card ${w}`}>
      <div className="hd">
        <div>
          <h3>{title}</h3>
          <div className="sub">{sub}</div>
        </div>
        <button className="tb" aria-pressed={asTable} onClick={() => setAsTable((v) => !v)}>
          Tabel
        </button>
      </div>
      {asTable ? (
        <ChartTable meta={meta} />
      ) : (
        <div className={`plot ${h}`}>
          <canvas ref={canvasRef} role="img" aria-label={title} />
        </div>
      )}
      {foot && <div className="note">{foot}</div>}
    </section>
  );
}
