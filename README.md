# 📊 Dashboard Kinerja Penjualan Multi-Perusahaan

Sebuah aplikasi web interaktif yang dirancang untuk memantau, menganalisis, dan memvisualisasikan data kinerja penjualan dari berbagai perusahaan (multi-tenant) dalam satu tempat. 

Proyek ini dibuat sebagai **portofolio *Data Analyst* / *Full-Stack Web Developer*** untuk memperlihatkan bagaimana data penjualan yang kompleks dapat diubah menjadi wawasan bisnis (*business insights*) yang intuitif dan mudah dipahami oleh pembuat keputusan.

---

## 💡 Apa Fungsi Dashboard Ini?

Dashboard ini membantu pemilik bisnis atau tim manajemen menjawab **7 pertanyaan kunci** tentang kesehatan usaha mereka melalui visualisasi interaktif:

1. **📈 Ringkasan Bisnis**: Apakah bisnis berjalan sehat dan pertumbuhannya positif?
2. **📦 Performa Produk**: Produk, brand, atau kategori mana yang menjadi *best-seller*?
3. **👥 Analisis Pelanggan**: Siapa pembeli kita, seberapa sering mereka kembali, dan segmen mana yang paling menguntungkan?
4. **📍 Pemetaan Wilayah**: Dari kota/provinsi mana pesanan paling banyak datang, dan wilayah mana yang mengalami kendala pengiriman?
5. **🚚 Efisiensi Operasional**: Seberapa cepat dan andal layanan kurir serta metode pembayaran pilihan pelanggan?
6. **🏷️ Promo & Ulasan**: Apakah diskon promo efektif menaikkan penjualan, dan apakah pelanggan puas dengan produknya?
7. **💡 Rekomendasi & Evaluasi Data**: Apa langkah strategis berikutnya yang harus diambil, serta seberapa akurat data yang dimiliki?

### 🌟 Fitur Utama untuk Pengguna
- **Multi-Perusahaan**: Beralih antar profil perusahaan (misalnya *Gayanara*, *Gayanari*) dengan mudah dari menu samping (sidebar).
- **Filter Interaktif**: Saring data berdasarkan tahun, wilayah provinsi, jasa kurir, hingga metode pembayaran secara instan tanpa perlu memuat ulang halaman.
- **Tampilan Fleksibel**:
  - *Mode Grafik & Tabel*: Semua grafik statistik dapat diubah menjadi tabel angka jika ingin melihat data detail.
  - *Tema Terang & Gelap*: Tampilan nyaman di mata.
  - *Responsif HP*: Layar dapat menyesuaikan dengan mulus saat diakses via ponsel pintar.

---

## 📂 Apa Saja Isi Repositori Ini?

Repositori ini memuat seluruh kode program (aplikasi penuh) mulai dari tampilan visual hingga sistem pengolahan datanya:

- **Tampilan Visual (`/client`)**: Kode antarmuka dashboard, halaman grafik, filter, dan komponen interaktif yang dilihat oleh pengguna.
- **Sistem Server (`/server`)**: Mesin belakang yang bertugas mengambil data dari database, memproses angka-angka statistik, dan mengirimkannya ke tampilan visual.
- **Contoh Data Bersih (`/server/seed`)**: Dataset fiktif penjualan (*Gayanara*) yang berisi ribuan transaksi pesanan, produk, pelanggan, dan ulasan sebagai contoh nyata penggunaan dashboard.
- **Sistem Pengujian (`/test`)**: Skrip otomatis untuk memastikan perhitungan angka transaksi dan fungsi aplikasi berjalan akurat.

---

## 🛠️ Teknologi yang Digunakan (Tech Stack)

Aplikasi ini dibangun menggunakan kombinasi teknologi modern yang cepat dan efisien:

### 1. Tampilan Utama (Frontend)
- **React 18**: Kerangka kerja JavaScript utama untuk membuat tampilan web yang dinamis dan cepat.
- **Chart.js**: Perpustakaan grafik untuk menampilkan diagram batang, garis, dan lingkaran yang interaktif.
- **Vite**: Alat bantu *build* agar aplikasi web dapat dimuat dengan sangat cepat.

### 2. Sistem Belakang (Backend & Database)
- **Node.js & Express**: Server ringan yang mengelola permintaan data dan menghubungkan database dengan tampilan web.
- **MongoDB (Mongoose)**: Database non-relasional untuk menyimpan informasi perusahaan, daftar transaksi, produk, dan pelanggan.

---

## 🚀 Cara Cepat Mencoba Aplikasi

*(Khusus untuk developer yang ingin menjalankan aplikasi di komputer lokal)*

1. **Pasang dependensi**:
   ```bash
   npm run install:all
   ```
2. **Jalankan database & isi data contoh**:
   ```bash
   npm run seed
   ```
3. **Jalankan aplikasi**:
   ```bash
   npm run dev
   ```
4. Buka peramban (browser) dan akses alamat `http://localhost:5173`.

---

> ℹ️ **Catatan**: Seluruh nama perusahaan, transaksi, dan data pelanggan dalam proyek ini bersifat **fiktif** dan dibuat khusus untuk keperluan demonstrasi portofolio.