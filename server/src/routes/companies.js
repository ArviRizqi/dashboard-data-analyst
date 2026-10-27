import { Router } from 'express';
import { Company } from '../models/index.js';
import { buildDataset } from '../services/datasetBuilder.js';
import { importDataset, loadRows, ImportError } from '../services/importer.js';

export const slugify = (s) =>
  String(s)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

const PALETTE = ['#2a78d6', '#eb6834', '#1baf7a', '#7b5cd6', '#e87ba4', '#c98500', '#0f9bb5'];

// Cache dataset per perusahaan; dibuang saat data diimpor ulang.
const cache = new Map();

const summary = (c) => ({
  slug: c.slug,
  name: c.name,
  tagline: c.tagline,
  color: c.color,
  stats: c.stats,
  hasData: (c.stats?.orders || 0) > 0,
});

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

export const companiesRouter = Router();

companiesRouter.get(
  '/',
  wrap(async (_req, res) => {
    const list = await Company.find().sort({ createdAt: 1, name: 1 }).lean();
    res.json(list.map(summary));
  })
);

companiesRouter.post(
  '/',
  wrap(async (req, res) => {
    const name = String(req.body?.name || '').trim();
    if (!name) return res.status(400).json({ error: 'Nama perusahaan wajib diisi.' });
    const slug = slugify(req.body?.slug || name);
    if (!slug) return res.status(400).json({ error: 'Nama perusahaan tidak valid.' });
    if (await Company.exists({ slug })) {
      return res.status(409).json({ error: `Perusahaan dengan slug "${slug}" sudah ada.` });
    }
    const count = await Company.countDocuments();
    const company = await Company.create({
      slug,
      name,
      tagline: req.body?.tagline || undefined,
      color: PALETTE[count % PALETTE.length],
    });
    res.status(201).json(summary(company.toObject()));
  })
);

companiesRouter.get(
  '/:slug',
  wrap(async (req, res) => {
    const company = await Company.findOne({ slug: req.params.slug }).lean();
    if (!company) return res.status(404).json({ error: 'Perusahaan tidak ditemukan.' });
    res.json({ ...summary(company), insights: company.insights, dataDictionary: company.dataDictionary });
  })
);

companiesRouter.get(
  '/:slug/dataset',
  wrap(async (req, res) => {
    const { slug } = req.params;
    const company = await Company.findOne({ slug }).select('slug stats.importedAt').lean();
    if (!company) return res.status(404).json({ error: 'Perusahaan tidak ditemukan.' });

    const version = String(company.stats?.importedAt?.getTime?.() ?? 0);
    const hit = cache.get(slug);
    if (hit && hit.version === version) return res.json(hit.dataset);

    const dataset = buildDataset(await loadRows(slug));
    cache.set(slug, { version, dataset });
    res.json(dataset);
  })
);

companiesRouter.post(
  '/:slug/import',
  wrap(async (req, res) => {
    const { slug } = req.params;
    if (!(await Company.exists({ slug }))) {
      return res.status(404).json({ error: 'Perusahaan tidak ditemukan.' });
    }
    const result = await importDataset(slug, req.body);
    cache.delete(slug);
    res.json({ company: summary(result.company), counts: result.counts, warnings: result.warnings });
  })
);

export function clearDatasetCache(slug) {
  if (slug) cache.delete(slug);
  else cache.clear();
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ImportError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  if (err?.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Berkas terlalu besar.' });
  }
  if (err?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Isi berkas bukan JSON yang valid.' });
  }
  console.error(err);
  res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
}
