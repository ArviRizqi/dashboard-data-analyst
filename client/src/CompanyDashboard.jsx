import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, Navigate, useParams } from 'react-router-dom';
import { api } from './lib/api.js';
import { DashContext } from './lib/dash.js';
import { useTheme } from './lib/theme.jsx';
import { useCompanies } from './lib/companies.jsx';
import { autoAnswer, defaultFilters, masks, prepare } from './lib/calc.js';
import { fmtDate, nf, pc, rp } from './lib/format.js';
import Filters from './components/Filters.jsx';
import ImportPanel from './components/ImportPanel.jsx';
import Ringkasan from './pages/Ringkasan.jsx';
import Produk from './pages/Produk.jsx';
import Pelanggan from './pages/Pelanggan.jsx';
import Wilayah from './pages/Wilayah.jsx';
import Operasional from './pages/Operasional.jsx';
import Promo from './pages/Promo.jsx';
import Tindakan from './pages/Tindakan.jsx';

const PAGES = [
  { k: 'ringkasan', t: 'Ringkasan', C: Ringkasan, q: (n) => `Seberapa sehat bisnis ${n}, dan apakah pertumbuhannya berlanjut?` },
  { k: 'produk', t: 'Produk', C: Produk, q: () => 'Kategori, brand, dan produk mana yang paling menggerakkan penjualan?' },
  { k: 'pelanggan', t: 'Pelanggan', C: Pelanggan, q: (n) => `Siapa pelanggan ${n}, dan seberapa loyal mereka?` },
  { k: 'wilayah', t: 'Wilayah', C: Wilayah, q: () => 'Dari mana pesanan datang, dan di kota mana pemenuhan pesanan paling bermasalah?' },
  { k: 'operasional', t: 'Operasional', C: Operasional, q: () => 'Seberapa andal kurir dan metode pembayaran kita?' },
  { k: 'promo', t: 'Promo & ulasan', C: Promo, q: () => 'Apakah promo menaikkan penjualan, dan apakah pelanggan puas?' },
  { k: 'tindakan', t: 'Rekomendasi & data', C: Tindakan, q: () => 'Apa yang harus dilakukan berikutnya, dan seberapa bisa data ini dipercaya?' },
];
export const PAGE_KEYS = PAGES.map((p) => p.k);

const BASIS_NOTE = {
  delivered: 'Revenue menghitung pesanan terkirim saja.',
  active: 'Revenue menghitung pesanan terkirim, dikirim, dan diproses.',
  all: 'Revenue menghitung semua pesanan, termasuk batal dan retur.',
};

const DEFAULT_FOOTER =
  'Revenue = total_amount_idr (nilai item dikurangi diskon, di luar ongkir). Basis "Terkirim" hanya menghitung pesanan berstatus delivered. "Aktif" menambah shipped dan processing. "Semua" memasukkan pesanan batal dan retur. Tingkat batal dan retur selalu dihitung dari semua pesanan dalam filter. Tidak ada data biaya, jadi margin tidak dapat dihitung.';

/** Muat detail perusahaan + dataset. `reloadKey` naik setiap kali data diimpor ulang. */
function useCompanyData(slug, reloadKey) {
  const [state, setState] = useState({ slug: null, status: 'loading' });
  useEffect(() => {
    let alive = true;
    setState({ slug, status: 'loading' });
    (async () => {
      try {
        const company = await api.company(slug);
        if (!company.hasData) return alive && setState({ slug, status: 'empty', company });
        const D = prepare(await api.dataset(slug));
        if (alive) setState({ slug, status: 'ready', company, D });
      } catch (err) {
        if (alive) setState({ slug, status: 'error', message: err.message });
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug, reloadKey]);
  // Selama slug baru belum selesai dimuat, jangan tampilkan data perusahaan sebelumnya.
  return state.slug === slug ? state : { slug, status: 'loading' };
}

export default function CompanyDashboard() {
  const { slug, page } = useParams();
  const { list, refresh, readOnly } = useCompanies();
  const [reloadKey, setReloadKey] = useState(0);
  const data = useCompanyData(slug, reloadKey);

  const known = list?.some((c) => c.slug === slug);
  if (list && !known) return <NotFound slug={slug} />;
  if (!PAGE_KEYS.includes(page)) return <Navigate to={`/${slug}/ringkasan`} replace />;

  const onImported = () => {
    setReloadKey((k) => k + 1);
    refresh();
  };

  if (data.status === 'loading') return <Status title="Memuat data…" />;
  if (data.status === 'error') {
    return (
      <Status title="Data tidak bisa dimuat" text={data.message}>
        <button className="btn" onClick={() => setReloadKey((k) => k + 1)}>Coba lagi</button>
      </Status>
    );
  }
  if (data.status === 'empty') {
    return (
      <div className="wrap">
        <Header company={data.company} />
        {readOnly ? (
          <div className="empty">
            <h2>Belum ada data untuk {data.company.name}</h2>
            <p>Data perusahaan ini belum diisi.</p>
          </div>
        ) : (
          <ImportPanel company={data.company} variant="empty" onDone={onImported} />
        )}
      </div>
    );
  }
  return <Ready key={`${slug}:${reloadKey}`} company={data.company} D={data.D} page={page} onImported={onImported} readOnly={readOnly} />;
}

function Ready({ company, D, page, onImported, readOnly }) {
  const { t } = useTheme();
  const [S, setS] = useState(() => defaultFilters(D));
  const { F, B } = useMemo(() => masks(D, S), [D, S]);
  const setCat = useCallback((cat) => setS((s) => ({ ...s, cat })), []);
  const dash = useMemo(() => ({ company, D, S, F, B, t, setCat }), [company, D, S, F, B, t, setCat]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [page, company.slug]);

  const nF = useMemo(() => F.reduce((a, b) => a + b, 0), [F]);
  const def = PAGES.find((p) => p.k === page);
  const insight = company.insights?.pages?.[page];
  const question = insight?.question || def.q(company.name);
  const hasWritten = !!insight?.answer;
  const answer = hasWritten
    ? insight.answer
    : page === 'tindakan'
      ? 'Rekomendasi tertulis belum tersedia untuk perusahaan ini. Kamus data dari berkas yang diimpor ada di bawah.'
      : autoAnswer(page, D, { rp, nf, pc });

  return (
    <DashContext.Provider value={dash}>
      <div className="wrap">
        <Header company={company} D={D} actions={readOnly ? null : <ImportPanel company={company} onDone={onImported} />} />
        <nav className="tabs" role="tablist" aria-label="Halaman dashboard">
          {PAGES.map((p) => (
            <NavLink key={p.k} to={`/${company.slug}/${p.k}`} role="tab" aria-selected={p.k === page}>
              {p.t}
            </NavLink>
          ))}
        </nav>
        <Filters D={D} S={S} setS={setS} basisNote={`${BASIS_NOTE[S.basis]} ${nf(nF)} pesanan masuk filter saat ini.`} />

        <main>
          <div className="ask">
            <div className="eyebrow">Pertanyaan utama</div>
            <h2 className="q">{question}</h2>
            <div className="answer">
              <b className="lb">{hasWritten ? 'Jawaban singkat' : 'Ringkasan otomatis'} · seluruh periode, tidak mengikuti filter</b>
              <p>{answer}</p>
            </div>
          </div>
          <def.C />
        </main>
        <footer>{company.insights?.footer || DEFAULT_FOOTER}</footer>
      </div>
    </DashContext.Provider>
  );
}

function Header({ company, D, actions }) {
  const period = D?.meta.period;
  const c = D?.meta.counts;
  return (
    <header className="top">
      <h1 className="brand">
        {company.name}
        <small>{company.tagline}</small>
      </h1>
      <div className="top-right">
        {c && (
          <div className="period">
            Data pesanan {fmtDate(period.from)} – {fmtDate(period.to)} · {nf(c.orders)} pesanan · {nf(c.customers)} pelanggan · {nf(c.products)} produk
          </div>
        )}
        {actions}
      </div>
    </header>
  );
}

function Status({ title, text, children }) {
  return (
    <div className="wrap">
      <div className="empty">
        <h2>{title}</h2>
        {text && <p>{text}</p>}
        {children}
      </div>
    </div>
  );
}

function NotFound({ slug }) {
  return <Status title="Perusahaan tidak ditemukan" text={`Tidak ada perusahaan dengan alamat "${slug}". Pilih salah satu dari sidebar.`} />;
}
