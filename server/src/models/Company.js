import mongoose from 'mongoose';

/**
 * Satu dokumen = satu perusahaan di sidebar.
 * Data transaksi (orders, order_items, products, customers, reviews) disimpan di
 * koleksi masing-masing dan dikaitkan lewat field `company` (= slug perusahaan).
 */
const companySchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    tagline: { type: String, default: 'Dashboard kinerja penjualan' },
    color: { type: String, default: '#2a78d6' },

    // Sheet README dari dataset: kamus data (Sheet, Kunci, Catatan).
    dataDictionary: [
      {
        _id: false,
        sheet: String,
        key: String,
        note: String,
      },
    ],

    // Narasi analisis tertulis (jawaban singkat per halaman, rekomendasi, kualitas data).
    // Opsional; perusahaan tanpa narasi memakai ringkasan otomatis di frontend.
    insights: { type: mongoose.Schema.Types.Mixed, default: null },

    // Diisi setiap kali data diimpor.
    stats: {
      orders: { type: Number, default: 0 },
      customers: { type: Number, default: 0 },
      products: { type: Number, default: 0 },
      reviews: { type: Number, default: 0 },
      periodFrom: Date,
      periodTo: Date,
      importedAt: Date,
    },
  },
  { timestamps: true, versionKey: false }
);

export const Company = mongoose.models.Company || mongoose.model('Company', companySchema);
