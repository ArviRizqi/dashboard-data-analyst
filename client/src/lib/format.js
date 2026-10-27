export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const ST_L = ['Terkirim', 'Dikirim', 'Diproses', 'Dibatalkan', 'Diretur'];

export const ml = (ym) => `${MON[+ym.slice(5) - 1]} ${ym.slice(2, 4)}`;
export const nf = (n, d = 0) =>
  Number(n).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d });

export const rp = (n) => {
  const a = Math.abs(n);
  return a >= 1e9
    ? `Rp ${nf(n / 1e9, 2)} M`
    : a >= 1e6
      ? `Rp ${nf(n / 1e6, 1)} jt`
      : a >= 1e3
        ? `Rp ${nf(n / 1e3, 0)} rb`
        : `Rp ${nf(n)}`;
};
export const rps = (n) => {
  const a = Math.abs(n);
  return a >= 1e9
    ? `${nf(n / 1e9, 1)} M`
    : a >= 1e6
      ? `${nf(n / 1e6, a < 1e7 ? 1 : 0)} jt`
      : a >= 1e3
        ? `${nf(n / 1e3, 0)} rb`
        : nf(n);
};
export const rpf = (n) => `Rp ${nf(Math.round(n))}`;
export const pc = (x, d = 1) => `${nf(x * 100, d)}%`;
export const sec = (a, b) => (b ? a / b : 0);

const DATE_FMT = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
export const fmtDate = (iso) => (iso ? DATE_FMT.format(new Date(iso)) : '–');

export const GENDER_LABEL = { Female: 'Perempuan', Male: 'Laki-laki' };
