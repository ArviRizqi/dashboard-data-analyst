import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api.js';

const CompaniesContext = createContext(null);
export const useCompanies = () => useContext(CompaniesContext);

/** Daftar perusahaan untuk sidebar. `refresh` dipanggil setelah menambah perusahaan atau impor data. */
export function CompaniesProvider({ children }) {
  const [state, setState] = useState({ list: null, error: '' });
  const [readOnly, setReadOnly] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const list = await api.companies();
      setState({ list, error: '' });
    } catch (err) {
      setState((s) => ({ list: s.list, error: err.message }));
    }
  }, []);

  useEffect(() => {
    refresh();
    api.config().then((c) => setReadOnly(!!c.readOnly)).catch(() => {});
  }, [refresh]);

  const value = useMemo(() => ({ ...state, refresh, readOnly }), [state, refresh, readOnly]);
  return <CompaniesContext.Provider value={value}>{children}</CompaniesContext.Provider>;
}
