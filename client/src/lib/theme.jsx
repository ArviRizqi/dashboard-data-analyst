import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { readTheme } from './charts.js';

const ThemeContext = createContext(null);

const safe = {
  get: (k) => {
    try {
      return localStorage.getItem(k);
    } catch {
      return null;
    }
  },
  set: (k, v) => {
    try {
      if (v == null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    } catch {
      /* penyimpanan tidak tersedia */
    }
  },
};

/** Mode: 'auto' (ikuti sistem), 'light', atau 'dark'. Token warna dibaca ulang saat tema berubah. */
export function ThemeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    const m = safe.get('theme');
    return m === 'light' || m === 'dark' ? m : 'auto';
  });
  const [t, setT] = useState(() => readTheme());

  const refresh = useCallback(() => setT(readTheme()), []);

  const setMode = useCallback((m) => {
    setModeState(m);
    if (m === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', m);
    safe.set('theme', m === 'auto' ? null : m);
  }, []);

  useEffect(() => {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', refresh);
    const mo = new MutationObserver(refresh);
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    refresh();
    return () => {
      mq.removeEventListener('change', refresh);
      mo.disconnect();
    };
  }, [refresh]);

  const value = useMemo(() => ({ t, mode, setMode }), [t, mode, setMode]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => useContext(ThemeContext);
