async function request(url, options) {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new Error('Tidak bisa menghubungi server. Pastikan API Express berjalan.');
  }
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* respons tanpa JSON */
  }
  if (!res.ok) {
    const err = new Error(body?.error || `Permintaan gagal (${res.status}).`);
    err.details = body?.details || [];
    throw err;
  }
  return body;
}

const json = (method, data) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(data),
});

export const api = {
  config: () => request('/api/config'),
  companies: () => request('/api/companies'),
  company: (slug) => request(`/api/companies/${encodeURIComponent(slug)}`),
  dataset: (slug) => request(`/api/companies/${encodeURIComponent(slug)}/dataset`),
  createCompany: (name) => request('/api/companies', json('POST', { name })),
  importData: (slug, payload) =>
    request(`/api/companies/${encodeURIComponent(slug)}/import`, json('POST', payload)),
};
