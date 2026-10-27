import { createContext, useContext } from 'react';

/** Konteks satu dashboard perusahaan: dataset, filter aktif, dan topeng pesanan F/B. */
export const DashContext = createContext(null);
export const useDash = () => useContext(DashContext);
