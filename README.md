# Dashboard Perusahaan

Dashboard kinerja penjualan multi-perusahaan untuk portfolio data analyst / frontend developer.
Sidebar di kiri berisi daftar perusahaan (Gayanara, Gayanari, …); setiap perusahaan punya dashboard sendiri
dengan tujuh halaman:

| Halaman | Pertanyaan yang dijawab |
| --- | --- |
| Ringkasan | Seberapa sehat bisnisnya, dan apakah pertumbuhannya berlanjut? |
| Produk | Kategori, brand, dan produk mana yang paling menggerakkan penjualan? |
| Pelanggan | Siapa pelanggan, seberapa loyal, dan segmen mana yang bernilai? |
| Wilayah | Dari mana pesanan datang, dan kota mana yang paling bermasalah? |
| Operasional | Seberapa andal kurir dan metode pembayaran? |
| Promo & ulasan | Apakah promo menaikkan penjualan, dan apakah pelanggan puas? |
| Rekomendasi & data | Apa tindakan berikutnya, dan seberapa bisa data dipercaya? |

Filter global: tahun, provinsi, kurir, metode pembayaran, dan basis revenue (terkirim / aktif / semua).
Setiap grafik bisa dialihkan menjadi tabel. Mendukung tema terang/gelap dan layar ponsel.

Seluruh perusahaan dalam proyek ini fiktif.

**Stack:** React 18 + Vite + Chart.js · Express 4 · MongoDB (Mongoose 8) · Node.js 20+

---

## Daftar isi

1. [Menjalankan di komputer sendiri](#1-menjalankan-di-komputer-sendiri)
2. [Deploy](#2-deploy)
3. [Variabel lingkungan](#3-variabel-lingkungan)
4. [Menambah data perusahaan](#4-menambah-data-perusahaan)
5. [Skema MongoDB](#5-skema-mongodb)
6. [API](#6-api)
7. [Cara kerja](#7-cara-kerja)
8. [Struktur proyek](#8-struktur-proyek)
9. [Tes dan pemecahan masalah](#9-tes-dan-pemecahan-masalah)

---

## 1. Menjalankan di komputer sendiri

Prasyarat: Node.js 20+ dan sebuah MongoDB (Atlas, instalasi lokal, atau Docker).

```bash
# 1. Pasang dependensi (root, server, client)
npm run install:all

# 2. Atur koneksi database
cp server/.env.example server/.env
#    lalu isi MONGODB_URI di server/.env

# 3. Isi database: membuat Gayanara (dengan data) dan Gayanari (kosong)
npm run seed

# 4. Jalankan API (:4000) dan React (:5173) bersamaan
npm run dev
```

Buka <http://localhost:5173>.

Belum punya MongoDB? Jalankan satu lewat Docker: `docker compose up -d`
(URI bawaan `mongodb://127.0.0.1:27017/dashboard_perusahaan` sudah cocok).

## 2. Deploy

Aplikasi dideploy sebagai **satu service**: Express menyajikan API sekaligus hasil build React, jadi tidak ada
CORS atau dua server yang perlu diurus. Yang dibutuhkan hanya MongoDB yang bisa diakses dari internet,
misalnya MongoDB Atlas (tersedia paket gratis).

### Langkah 0 — siapkan MongoDB Atlas dan isi datanya

1. Buat cluster di <https://www.mongodb.com/atlas> dan buat database user.
2. Di **Network Access**, izinkan akses dari server hosting. Platform gratis biasanya tidak punya IP tetap,
   jadi paling praktis memakai `0.0.0.0/0` (dilindungi oleh username dan password database).
3. Salin connection string, bentuknya `mongodb+srv://USER:PASSWORD@cluster.xxxx.mongodb.net/dashboard_perusahaan`.
   Karakter khusus pada password harus di-URL-encode.
4. Isi data **dari komputer Anda** sekali saja:

   ```bash
   cd server
   MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster.xxxx.mongodb.net/dashboard_perusahaan" npm run seed
   ```

   Di Windows PowerShell:

   ```powershell
   cd server
   $env:MONGODB_URI="mongodb+srv://USER:PASSWORD@cluster.xxxx.mongodb.net/dashboard_perusahaan"; npm run seed
   ```

### Opsi A — Render (disarankan, ada paket gratis)

1. Push proyek ini ke GitHub.
2. Di Render: **New → Blueprint**, pilih repo. Render membaca `render.yaml` dan memakai `Dockerfile`.
3. Saat diminta, isi `MONGODB_URI` dengan connection string Atlas.
4. Tunggu build selesai, lalu buka URL `https://<nama-service>.onrender.com`.

`READ_ONLY=true` sudah diatur di `render.yaml`. Paket gratis Render "tidur" setelah beberapa menit tanpa
trafik, jadi permintaan pertama bisa memakan waktu sekitar satu menit.

Tanpa Blueprint: buat **Web Service** baru, pilih runtime **Docker**, lalu atur environment variable sendiri
(`MONGODB_URI`, `READ_ONLY=true`) dan health check path `/api/health`.

### Opsi B — Railway

1. **New Project → Deploy from GitHub repo**. Railway mendeteksi `Dockerfile` otomatis.
2. Di tab **Variables**, tambahkan `MONGODB_URI` dan `READ_ONLY=true`.
3. Di **Settings → Networking**, klik **Generate Domain**.

### Opsi C — Fly.io

```bash
fly launch --no-deploy          # terima Dockerfile yang terdeteksi; ubah internal port menjadi 4000
fly secrets set MONGODB_URI="mongodb+srv://..." READ_ONLY=true
fly deploy
```

### Opsi D — VPS / server sendiri

```bash
git clone <repo> && cd dashboard-perusahaan
npm run install:all
npm run build
MONGODB_URI="mongodb+srv://..." READ_ONLY=true PORT=4000 npm start
```

Jalankan di belakang Nginx/Caddy untuk HTTPS dan gunakan pm2 atau systemd agar proses tetap hidup.

### Docker secara manual

```bash
docker build -t dashboard-perusahaan .
docker run -p 4000:4000 -e MONGODB_URI="mongodb+srv://..." -e READ_ONLY=true dashboard-perusahaan
```

### Mode baca-saja (`READ_ONLY=true`)

Aplikasi ini tidak memakai login. Karena itu, di server online aktifkan `READ_ONLY=true`:
server menolak semua permintaan yang mengubah data (tambah perusahaan dan impor data dengan status 403), dan
tombol **Tambah perusahaan** serta **Impor ulang data** disembunyikan. Pengunjung hanya bisa melihat dashboard.
Data tetap bisa diisi dari komputer Anda lewat `npm run seed` (skrip itu langsung ke database dan tidak
terpengaruh mode ini).

### Daftar periksa setelah deploy

- `https://<domain>/api/health` mengembalikan `{"ok":true}`.
- `https://<domain>/api/companies` menampilkan daftar perusahaan.
- Halaman utama memuat dashboard Gayanara dengan angka Revenue Rp 877,8 jt dan 1.776 pesanan.

## 3. Variabel lingkungan

Dibaca dari `server/.env` (lokal) atau pengaturan platform hosting.

| Variabel | Bawaan | Keterangan |
| --- | --- | --- |
| `MONGODB_URI` | `mongodb://127.0.0.1:27017/dashboard_perusahaan` | Connection string MongoDB. |
| `PORT` | `4000` | Port server. Platform hosting biasanya mengisinya sendiri. |
| `READ_ONLY` | `false` | `true` = tolak semua penulisan lewat API (lihat di atas). |
| `CLIENT_ORIGIN` | kosong | Origin frontend yang diizinkan CORS. Hanya relevan bila frontend dihosting terpisah; saat `npm run dev`, Vite memakai proxy sehingga tidak perlu diisi. |

## 4. Menambah data perusahaan

Gayanara memakai dataset `server/seed/data/gayanara_data_bersih.json`. Perusahaan lain dapat diisi dengan berkas JSON
berskema sama: sheet `orders`, `order_items`, `products`, `customers`, `reviews`, dan `README` (opsional).

| Cara | Perintah / langkah |
| --- | --- |
| Terminal (cocok untuk database online) | `npm run seed -- --company gayanari --file ./data_gayanari.json` |
| UI (hanya bila `READ_ONLY=false`) | Pilih perusahaan yang masih kosong → **Pilih berkas JSON** |
| API | `POST /api/companies/gayanari/import` dengan isi JSON sebagai body |

Perusahaan baru dibuat otomatis bila belum ada. Mengimpor ke perusahaan yang sudah berdata akan **mengganti
seluruh datanya**. Berkas divalidasi terhadap skema sebelum data lama dihapus; item atau ulasan yang merujuk
order/produk yang tidak ada diabaikan dan dilaporkan sebagai peringatan.

Narasi tertulis (jawaban singkat per halaman, rekomendasi, catatan kualitas data) disimpan di field `insights`
dokumen perusahaan. Gayanara sudah memilikinya. Perusahaan tanpa `insights` tetap tampil penuh dengan ringkasan
otomatis dari datanya.

## 5. Skema MongoDB

Mengikuti sheet pada `gayanara_data_bersih.json`. Setiap koleksi data punya field tambahan `company` (slug
perusahaan), sehingga semua perusahaan berbagi koleksi yang sama dan dipisahkan oleh field itu.

| Koleksi | Kunci unik | Field utama |
| --- | --- | --- |
| `companies` | `slug` | `name`, `tagline`, `color`, `dataDictionary`, `insights`, `stats` |
| `orders` | `company` + `order_id` | `customer_id`, `order_date`, `order_status`, `total_amount_idr`, `discount_amount_idr`, `shipping_cost_idr`, `shipping_city`, `shipping_province`, `payment_method`, `courier`, `promo_code`, … (20 field) |
| `orderitems` | `company` + `item_id` | `order_id`, `product_id`, `quantity`, `unit_price_idr`, `subtotal_idr`, … |
| `products` | `company` + `product_id` | `name`, `category`, `brand`, `price_idr`, `price_band`, `stock`, `total_terjual`, `avg_rating`, … |
| `customers` | `company` + `customer_id` | `gender`, `age_group`, `city`, `province`, `registration_date` |
| `reviews` | `company` + `review_id` | `order_id`, `product_id`, `rating`, `review_date`, `review_text`, … |

Aturan data:

- `order_status` harus salah satu dari `delivered`, `shipped`, `processing`, `cancelled`, `returned`.
- Tanggal disimpan sebagai `Date` (UTC).
- Revenue = `total_amount_idr` (nilai item dikurangi diskon, di luar ongkir).
- Nama, email, dan telepon pelanggan sengaja tidak ada dalam skema.

## 6. API

| Metode | Path | Keterangan |
| --- | --- | --- |
| GET | `/api/health` | Pemeriksaan kesehatan. |
| GET | `/api/config` | `{ "readOnly": boolean }`. |
| GET | `/api/companies` | Daftar perusahaan untuk sidebar. |
| POST | `/api/companies` | Tambah perusahaan, body `{ "name": "..." }`. |
| GET | `/api/companies/:slug` | Detail, `insights`, dan kamus data. |
| GET | `/api/companies/:slug/dataset` | Seluruh data perusahaan dalam bentuk kolumnar ringkas (di-cache di server). |
| POST | `/api/companies/:slug/import` | Ganti seluruh data dengan isi JSON. |

Dua endpoint POST mengembalikan 403 bila `READ_ONLY=true`.

## 7. Cara kerja

Server membaca baris satu perusahaan dari MongoDB lalu mengubahnya menjadi dataset kolumnar: nilai teks
(provinsi, kota, kurir, …) dipetakan ke kamus dan setiap baris hanya menyimpan indeksnya. Untuk 3.000 pesanan
hasilnya sekitar 500 KB setelah kompresi. Dataset di-cache per perusahaan dan dibuang saat data diimpor ulang.

React menghitung seluruh KPI dan grafik di browser, sehingga filter langsung bereaksi tanpa permintaan ke server.
Pendekatan ini cocok untuk ribuan hingga puluhan ribu pesanan. Untuk data yang jauh lebih besar, perhitungan
sebaiknya dipindah ke aggregation pipeline MongoDB.

## 8. Struktur proyek

```
Dockerfile · render.yaml · docker-compose.yml (MongoDB lokal)
server/
  src/models/        Skema Mongoose (Company, Order, OrderItem, Product, Customer, Review)
  src/services/      datasetBuilder.js (MongoDB -> dataset kolumnar), importer.js (validasi + impor)
  src/routes/        /api/companies/...
  src/scripts/       seed.js
  seed/              gayanara_data_bersih.json + narasi analisis Gayanara
  test/              tes dengan node:test
client/
  src/CompanyDashboard.jsx   header, tab, filter, pemilihan halaman
  src/pages/                 satu berkas per halaman dashboard
  src/components/            Sidebar, Filters, ImportPanel, KPI dan kartu grafik
  src/lib/                   kalkulasi, format angka, konfigurasi Chart.js, tema, klien API
```

## 9. Tes dan pemecahan masalah

```bash
npm test
```

Menguji pembentukan dataset terhadap total yang diketahui (revenue terkirim Rp 877.752.049 dari 1.776 pesanan),
validasi skema dan impor, serta mode baca-saja.

| Gejala | Penyebab dan solusi |
| --- | --- |
| `Tidak bisa terhubung ke MongoDB` saat start | `MONGODB_URI` salah atau MongoDB belum berjalan. Di Atlas, periksa Network Access dan password (URL-encode karakter khusus). |
| Sidebar kosong / "Server tidak terjangkau" | API tidak berjalan atau tidak bisa dijangkau. Cek `/api/health`. |
| Gayanara tampil "Belum ada data" | `npm run seed` belum dijalankan ke database yang sama dengan yang dipakai server. |
| Tombol impor / tambah perusahaan tidak muncul | `READ_ONLY=true`. Ini disengaja untuk versi online. |
| Halaman 404 saat refresh di URL seperti `/gayanara/produk` | Pastikan server dijalankan lewat Express (`npm start`), yang sudah mengarahkan semua path ke `index.html`. |
| Permintaan pertama lambat di Render gratis | Service sedang "tidur"; nyala kembali dalam kurang lebih satu menit. |

## Catatan keamanan

Tidak ada autentikasi. Untuk deploy publik, selalu pakai `READ_ONLY=true`. Jangan pernah meng-commit `server/.env`
(sudah ada di `.gitignore`).
