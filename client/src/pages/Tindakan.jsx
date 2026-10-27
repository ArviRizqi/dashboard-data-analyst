import { useDash } from '../lib/dash.js';

export default function Tindakan() {
  const { company } = useDash();
  const ins = company.insights;
  const recs = ins?.recommendations || [];
  const quality = ins?.dataQuality || [];
  const dict = company.dataDictionary || [];

  return (
    <>
      {recs.length > 0 ? (
        <div className="recs">
          {recs.map((r, i) => (
            <article className="rec" key={r.title}>
              <span className={`pill ${r.level}`}>{r.levelLabel}</span>
              <h3>{i + 1}. {r.title}</h3>
              <p><b>Bukti.</b> {r.evidence}</p>
              <p><b>Tindakan.</b> {r.action}</p>
              <p><b>Ukuran.</b> {r.metric}</p>
            </article>
          ))}
        </div>
      ) : (
        <section className="card w12 empty-note">
          <h3>Belum ada rekomendasi tertulis</h3>
          <div className="sub">
            Rekomendasi dan catatan kualitas data untuk {company.name} disimpan di dokumen perusahaan
            (<code>insights</code>) pada MongoDB. Isi kolom itu agar tampil di halaman ini.
          </div>
        </section>
      )}

      {quality.length > 0 && (
        <section className="card w12" style={{ marginTop: 6 }}>
          <h3>Kualitas data dan cara penanganannya</h3>
          <div className="sub">Temuan dari pemeriksaan semua sheet.</div>
          <div className="tblv" style={{ maxHeight: 'none' }}>
            <table>
              <thead><tr><th>Temuan</th><th>Detail</th><th>Penanganan</th></tr></thead>
              <tbody>
                {quality.map((q) => (
                  <tr key={q.finding}>
                    <td className="wrapc"><b>{q.finding}</b></td>
                    <td className="wrapc">{q.detail}</td>
                    <td className="wrapc">{q.handling}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {dict.length > 0 && (
        <section className="card w12" style={{ marginTop: 14 }}>
          <h3>Kamus data</h3>
          <div className="sub">Sheet, kunci, dan catatan dari berkas dataset yang diimpor.</div>
          <div className="tblv" style={{ maxHeight: 'none' }}>
            <table>
              <thead><tr><th>Sheet</th><th>Kunci</th><th>Catatan</th></tr></thead>
              <tbody>
                {dict.map((d) => (
                  <tr key={d.sheet}>
                    <td><b>{d.sheet}</b></td>
                    <td className="wrapc">{d.key}</td>
                    <td className="wrapc">{d.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </>
  );
}
