import { config } from './config.js';
import { connectDb } from './db.js';
import { createApp } from './app.js';

try {
  await connectDb();
  console.log(`MongoDB terhubung: ${config.mongoUri}`);
} catch (err) {
  console.error(`Tidak bisa terhubung ke MongoDB (${config.mongoUri}).`);
  console.error(err.message);
  console.error('Jalankan MongoDB lebih dulu, mis. "docker compose up -d", atau ubah MONGODB_URI di server/.env.');
  process.exit(1);
}

createApp().listen(config.port, () => {
  console.log(`API berjalan di http://localhost:${config.port}`);
});
