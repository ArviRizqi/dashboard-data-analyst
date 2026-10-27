import 'dotenv/config';

export const config = {
  port: Number(process.env.PORT) || 4000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dashboard_perusahaan',
  clientOrigin: process.env.CLIENT_ORIGIN || '',
  // true = API hanya boleh dibaca (tambah perusahaan dan impor data ditolak). Untuk versi online/portfolio.
  readOnly: /^(1|true|yes)$/i.test(process.env.READ_ONLY || ''),
};
