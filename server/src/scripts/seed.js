/**
 * Seed / impor data.
 *
 *   npm run seed
 *       Membuat perusahaan bawaan (Gayanara + Gayanari) dan mengimpor dataset Gayanara.
 *
 *   npm run seed -- --company gayanari --file ./data_gayanari.json [--name "Gayanari"]
 *       Mengimpor berkas JSON (skema sama dengan gayanara_data_bersih.json) ke satu perusahaan.
 *       Perusahaan dibuat bila belum ada; datanya diganti seluruhnya bila sudah ada.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { connectDb, disconnectDb } from '../db.js';
import { Company } from '../models/index.js';
import { importDataset } from '../services/importer.js';
import { slugify } from '../routes/companies.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const seedDir = path.resolve(here, '../../seed');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const DEFAULT_COMPANIES = [
  {
    slug: 'gayanara',
    name: 'Gayanara',
    tagline: 'Dashboard kinerja penjualan fashion',
    color: '#2a78d6',
    data: path.join(seedDir, 'data/gayanara_data_bersih.json'),
    insights: path.join(seedDir, 'gayanara.insights.json'),
  },
  {
    slug: 'gayanari',
    name: 'Gayanari',
    tagline: 'Dashboard kinerja penjualan fashion',
    color: '#eb6834',
  },
];

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) args[argv[i].slice(2)] = argv[i + 1];
  }
  return args;
}

async function upsertCompany({ slug, name, tagline, color, insights }) {
  const set = { name };
  if (tagline) set.tagline = tagline;
  if (color) set.color = color;
  if (insights) set.insights = readJson(insights);
  return Company.findOneAndUpdate({ slug }, { $set: set }, { upsert: true, new: true, setDefaultsOnInsert: true });
}

async function importFor(slug, file) {
  const t0 = Date.now();
  const result = await importDataset(slug, readJson(file));
  const c = result.counts;
  console.log(
    `  ${slug}: ${c.orders} orders, ${c.order_items} items, ${c.products} produk, ${c.customers} pelanggan, ${c.reviews} ulasan (${Date.now() - t0} ms)`
  );
  result.warnings.forEach((w) => console.log(`  ! ${w}`));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  await connectDb();

  if (args.company || args.file) {
    if (!args.company || !args.file) throw new Error('Gunakan --company <slug> dan --file <berkas.json> bersamaan.');
    const slug = slugify(args.company);
    const existing = await Company.findOne({ slug });
    await upsertCompany({ slug, name: args.name || existing?.name || args.company });
    console.log(`Mengimpor ${args.file} ke "${slug}" ...`);
    await importFor(slug, path.resolve(args.file));
  } else {
    console.log('Menyiapkan perusahaan bawaan ...');
    for (const def of DEFAULT_COMPANIES) {
      await upsertCompany(def);
      if (def.data) await importFor(def.slug, def.data);
      else console.log(`  ${def.slug}: dibuat tanpa data (impor lewat UI atau --file)`);
    }
  }

  await disconnectDb();
  console.log('Selesai.');
}

main().catch(async (err) => {
  console.error(err.message);
  if (err.details?.length) err.details.forEach((d) => console.error(`  - ${d}`));
  await disconnectDb().catch(() => {});
  process.exit(1);
});
