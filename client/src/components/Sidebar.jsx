import { useState } from 'react';
import { NavLink, useMatch, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useCompanies } from '../lib/companies.jsx';
import { useTheme } from '../lib/theme.jsx';
import { nf } from '../lib/format.js';

const THEMES = [
  ['auto', 'Otomatis'],
  ['light', 'Terang'],
  ['dark', 'Gelap'],
];

const initials = (name) =>
  name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

function AddCompany({ onAdded }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const c = await api.createCompany(name.trim());
      setName('');
      setOpen(false);
      onAdded(c);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="side-add" onClick={() => setOpen(true)}>
        <span aria-hidden="true">＋</span> Tambah perusahaan
      </button>
    );
  }
  return (
    <form className="side-form" onSubmit={submit}>
      <label htmlFor="new-company" className="sr">Nama perusahaan</label>
      <input id="new-company" autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama perusahaan" />
      <div className="side-form-row">
        <button type="submit" disabled={busy || !name.trim()}>{busy ? 'Menyimpan…' : 'Simpan'}</button>
        <button type="button" onClick={() => { setOpen(false); setError(''); }}>Batal</button>
      </div>
      {error && <p className="side-err" role="alert">{error}</p>}
    </form>
  );
}

export default function Sidebar({ open, onClose }) {
  const { list, error, refresh, readOnly } = useCompanies();
  const { mode, setMode } = useTheme();
  const navigate = useNavigate();
  const match = useMatch('/:slug/:page');
  const page = match?.params.page || 'ringkasan';

  return (
    <aside className={`side ${open ? 'open' : ''}`} aria-label="Perusahaan">
      <div className="side-top">
        <div className="side-logo" aria-hidden="true">▤</div>
        <div>
          <div className="side-title">Dashboard</div>
          <div className="side-sub">Kinerja penjualan</div>
        </div>
      </div>

      <div className="side-label">Perusahaan</div>
      <nav className="side-list">
        {list === null && !error && <div className="side-note">Memuat…</div>}
        {error && (
          <div className="side-note err">
            {error} <button onClick={refresh}>Coba lagi</button>
          </div>
        )}
        {list?.map((c) => (
          <NavLink
            key={c.slug}
            to={`/${c.slug}/${page}`}
            className="side-item"
            onClick={onClose}
          >
            <span className="side-av" style={{ background: c.color }}>{initials(c.name)}</span>
            <span className="side-txt">
              <span className="side-name">{c.name}</span>
              <span className="side-meta">{c.hasData ? `${nf(c.stats.orders)} pesanan` : 'Belum ada data'}</span>
            </span>
          </NavLink>
        ))}
      </nav>

      {!readOnly && (
        <AddCompany
          onAdded={async (c) => {
            await refresh();
            onClose();
            navigate(`/${c.slug}/ringkasan`);
          }}
        />
      )}

      <div className="side-foot">
        <div className="side-label">Tema</div>
        <div className="side-seg" role="group" aria-label="Tema">
          {THEMES.map(([k, l]) => (
            <button key={k} aria-pressed={mode === k} onClick={() => setMode(k)}>{l}</button>
          ))}
        </div>
      </div>
    </aside>
  );
}
