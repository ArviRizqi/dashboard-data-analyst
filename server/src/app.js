import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import { config } from './config.js';
import { companiesRouter, errorHandler } from './routes/companies.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(here, '../../client/dist');

export function createApp({ readOnly = config.readOnly } = {}) {
  const app = express();
  app.use(compression());
  app.use(cors(config.clientOrigin ? { origin: config.clientOrigin } : {}));
  app.use(express.json({ limit: '100mb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));
  app.get('/api/config', (_req, res) => res.json({ readOnly }));

  // Mode baca-saja: tolak semua permintaan yang mengubah data.
  if (readOnly) {
    app.use('/api', (req, res, next) => {
      if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
      return res.status(403).json({ error: 'Server berjalan dalam mode baca-saja.' });
    });
  }
  app.use('/api/companies', companiesRouter);
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint tidak ditemukan.' }));

  // Produksi: Express ikut menyajikan hasil build React.
  if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
  }

  app.use(errorHandler);
  return app;
}
