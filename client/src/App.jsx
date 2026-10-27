import { useState } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import Sidebar from './components/Sidebar.jsx';
import CompanyDashboard from './CompanyDashboard.jsx';
import { useCompanies } from './lib/companies.jsx';

function Home() {
  const { list, error } = useCompanies();
  if (list?.length) return <Navigate to={`/${list[0].slug}/ringkasan`} replace />;
  return (
    <div className="wrap">
      <div className="empty">
        <h2>{error ? 'Server tidak terjangkau' : list ? 'Belum ada perusahaan' : 'Memuat…'}</h2>
        <p>
          {error ||
            (list && 'Jalankan "npm run seed" di folder proyek, atau tambahkan perusahaan lewat sidebar.')}
        </p>
      </div>
    </div>
  );
}

export default function App() {
  const [menu, setMenu] = useState(false);
  return (
    <div className="app">
      <button className="menu-btn" onClick={() => setMenu((v) => !v)} aria-expanded={menu} aria-label="Buka daftar perusahaan">
        <span aria-hidden="true">☰</span> Perusahaan
      </button>
      {menu && <div className="scrim" onClick={() => setMenu(false)} />}
      <Sidebar open={menu} onClose={() => setMenu(false)} />
      <div className="content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:slug" element={<RedirectToSummary />} />
          <Route path="/:slug/:page" element={<CompanyDashboard />} />
        </Routes>
      </div>
    </div>
  );
}

function RedirectToSummary() {
  const { slug } = useParams();
  return <Navigate to={`/${slug}/ringkasan`} replace />;
}
