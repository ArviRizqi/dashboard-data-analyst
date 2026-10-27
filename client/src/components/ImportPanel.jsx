import { useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { nf } from '../lib/format.js';

/**
 * Impor berkas JSON (skema sama dengan gayanara_data_bersih.json) ke satu perusahaan.
 * `variant="empty"` dipakai pada keadaan kosong, `variant="button"` sebagai tombol di header.
 */
export default function ImportPanel({ company, variant = 'button', onDone }) {
  const inputRef = useRef(null);
  const [state, setState] = useState({ busy: false, error: '', details: [], ok: '' });

  const pick = () => inputRef.current?.click();

  async function onFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (variant === 'button' && !window.confirm(`Ganti seluruh data ${company.name} dengan isi ${file.name}?`)) return;

    setState({ busy: true, error: '', details: [], ok: '' });
    try {
      let payload;
      try {
        payload = JSON.parse(await file.text());
      } catch {
        throw new Error('Berkas bukan JSON yang valid.');
      }
      const res = await api.importData(company.slug, payload);
      const c = res.counts;
      setState({
        busy: false,
        error: '',
        details: res.warnings,
        ok: `${nf(c.orders)} pesanan, ${nf(c.order_items)} item, ${nf(c.products)} produk, ${nf(c.customers)} pelanggan, ${nf(c.reviews)} ulasan diimpor.`,
      });
      onDone?.();
    } catch (err) {
      setState({ busy: false, error: err.message, details: err.details || [], ok: '' });
    }
  }

  const input = <input ref={inputRef} type="file" accept="application/json,.json" hidden onChange={onFile} />;
  const messages = (
    <>
      {state.error && <p className="msg err" role="alert">{state.error}</p>}
      {state.ok && <p className="msg ok" role="status">{state.ok}</p>}
      {state.details.length > 0 && (
        <ul className="msg-list">{state.details.map((d) => <li key={d}>{d}</li>)}</ul>
      )}
    </>
  );

  if (variant === 'empty') {
    return (
      <div className="empty">
        <div className="empty-ic" aria-hidden="true">＋</div>
        <h2>Belum ada data untuk {company.name}</h2>
        <p>
          Impor berkas JSON dengan sheet <code>orders</code>, <code>order_items</code>, <code>products</code>,{' '}
          <code>customers</code>, dan <code>reviews</code> (skema sama dengan <code>gayanara_data_bersih.json</code>;
          sheet <code>README</code> opsional).
        </p>
        <button className="btn primary" onClick={pick} disabled={state.busy}>
          {state.busy ? 'Mengimpor…' : 'Pilih berkas JSON'}
        </button>
        <p className="hint">
          Atau lewat terminal: <code>npm run seed -- --company {company.slug} --file data.json</code>
        </p>
        {input}
        {messages}
      </div>
    );
  }

  return (
    <div className="import-inline">
      <button className="btn" onClick={pick} disabled={state.busy}>
        {state.busy ? 'Mengimpor…' : 'Impor ulang data'}
      </button>
      {input}
      {messages}
    </div>
  );
}
