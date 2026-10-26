# Rinse Society | Car Wash Management System

Rinse Society adalah aplikasi manajemen wash studio berbasis web untuk pemesanan Self-Service dan Professional Wash, pemantauan empat bay universal, POS kasir untuk transaksi walk-in dan produk, antrean operasional, serta dashboard Admin dengan ringkasan dan laporan keuangan.

Live site: [Rinse Society Wash Studio](https://tiararidha.github.io/car-wash-system/)

## Fitur

### Client dan Beranda

- Hero interaktif dengan CTA untuk memesan layanan atau membuka katalog.
- Kartu Universal Live Bay B-01 sampai B-04 memakai foto studio, overlay nomor, badge status, dan waktu layanan.
- Status bay dimuat dari Supabase dan diperbarui melalui Realtime; Self-Service menggunakan jadwal dan durasi layanan untuk menentukan status.
- Form booking Professional Wash dan Self-Service memvalidasi nama, nomor telepon, plat, layanan, serta pembayaran 100% cashless melalui QRIS, E-Wallet, atau Kartu. Waktu dan alokasi bay dihitung otomatis.
- Katalog layanan dan produk menggunakan harga, durasi, stok, dan gambar dari Supabase. Checkout retail mendukung pick-up tanpa biaya kirim atau kurir lokal dengan ongkir flat Rp 10.000 per pesanan.


### Dashboard Admin

- **Ringkasan** menampilkan pendapatan kotor hari ini dan tujuh hari terakhir, jumlah transaksi lunas, aktivitas, antrean aktif, dan laba kotor.
- **Transaksi** menyediakan daftar serta pengelolaan transaksi. Perubahan pembayaran, refund, dan data transaksi dihitung kembali dari `db.transactions`.
- **Struk Digital Resmi (Thermal Receipt PDF):** Mendukung cetak dan unduh struk transaksi format 80mm via window.print / Save as PDF untuk setiap transaksi berstatus PAID (layanan cuci maupun produk retail).
- **Antrean** menampilkan layanan aktif berstatus menunggu, dicuci, atau tahap akhir. Transaksi selesai tidak dihitung sebagai antrean aktif.
- **Status Bay** mengikuti transaksi layanan, durasi, dan jadwal yang sama dengan tampilan client.
- **Pelanggan & Kendaraan** menampilkan data secara defensif saat properti atau relasi bernilai null.
- **Produk & Layanan** menggunakan katalog dan stok Supabase yang sama dengan form pemesanan.
- **Laporan** menyediakan periode bulanan/tahunan, rincian jasa, retail, ongkir, HPP, laba kotor, dan dokumen siap cetak/PDF.
- Tombol **Cetak Laporan Keuangan**, navigasi tab, kembali ke Beranda, pengaturan, dan logout tersedia dari area Admin.

## Rekonsiliasi Keuangan

`db.transactions` adalah sumber data transaksi untuk semua tab Admin. Fungsi agregasi bersama hanya memasukkan transaksi lunas yang tidak dibatalkan, kedaluwarsa, atau direfund ke pendapatan:

```text
Pendapatan kotor = jasa cuci lunas + retail lunas
Penerimaan non-tunai = pendapatan kotor + ongkir
Laba kotor = pendapatan kotor - HPP retail tercatat
```

Ongkir disajikan terpisah dari pendapatan kotor. Nominal dikonversi aman sebelum dijumlahkan. KPI transaksi lunas dan jumlah baris lunas memakai predicate status yang sama. Seluruh transaksi baru menggunakan kanal cashless; data historis berlabel CASH ditampilkan sebagai QRIS.

Setelah mutasi transaksi lokal, dispatcher event memperbarui tab yang sedang terbuka. Supabase Realtime menyebarkan perubahan antar-sesi; polling berkala menjadi fallback. Pemeriksaan lifecycle layanan berjalan otomatis berdasarkan `start_time`/`finished_at` atau booking time dan durasi katalog.

## Arsitektur

- **Frontend:** HTML5, Vanilla JavaScript ES6+, dan CSS3 kustom. Styling dipisah ke `styles.css`, `polish.css`, dan `theme.css`.
- **Backend:** Supabase Auth, PostgREST, PostgreSQL, RLS, trigger integritas, RPC terproteksi, dan channel WebSocket Realtime.
- **Admin snapshot:** Aplikasi mencoba RPC `get_demo_admin_snapshot` terlebih dahulu. Jika RPC gagal, loader mengambil `transactions` langsung melalui REST; relasi pelanggan, kendaraan, dan katalog dimuat secara opsional. Database kosong adalah state valid.
- **Runtime lokal:** Server HTTP Node.js kecil didefinisikan di `app.js`; port default `3000`, dapat diubah dengan `PORT`.
- **Pengujian:** Node.js built-in test runner dan pemeriksaan sintaks bawaan.

## Data dan Durasi Layanan

Tabel utama:

- `transactions`: transaksi, status pembayaran/antrean, jadwal, bay, fulfillment, dan HPP snapshot.
- `customers`: nama, nomor telepon, dan alamat pelanggan.
- `vehicles`: pemilik, jenis kendaraan, plat, dan model.
- `services_products`: katalog layanan, add-on, dan produk beserta harga, durasi, serta stok.

Durasi standar katalog:

| Layanan | Durasi |
| --- | ---: |
| Self-Service Moto | 20 menit |
| Self-Service Car | 30 menit |
| Pro Wash Moto | 35 menit |
| Pro Wash Car | 50 menit |

Jadwal operasional studio adalah 08.00–21.00 WIB. Harga layanan dan durasi transaksi diambil dari katalog Supabase.

## Menjalankan Lokal

Prasyarat: Node.js 18 atau lebih baru dan akses ke project Supabase.

```powershell
git clone https://github.com/tiararidha/car-wash-system.git
cd car-wash-system
npm install
node app.js
```

Buka `http://localhost:3000`. Untuk port lain, jalankan dengan environment variable `PORT`, misalnya `$env:PORT=3001; node app.js`.

### Konfigurasi Supabase

Nilai konfigurasi yang diperlukan adalah:

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<publishable-or-anon-key>
```

Catatan: frontend statis saat ini membaca konstanta `SUPABASE_URL` dan `SUPABASE_PUBLISHABLE_KEY` di `app.js`; ia belum memuat `.env` atau membaca environment Node secara langsung. Menetapkan variabel shell saja tidak mengubah konfigurasi browser. Gunakan URL project dan publishable/anon key yang sesuai pada konstanta tersebut atau sediakan mekanisme konfigurasi client saat deployment. Jangan pernah memasukkan `service_role` atau secret key ke frontend.

Login Admin memerlukan akun Supabase Auth dengan claim tepercaya `app_metadata.rinse_role = 'admin'`. RPC order guest mensimulasikan pembayaran dan menyimpan status `PAID`; integrasi payment gateway eksternal tidak termasuk.

### Migrasi Supabase

Terapkan migrasi versioned yang belum terpasang melalui Supabase CLI:

```powershell
npx supabase login
npx supabase link --project-ref "PROJECT_REF"
npx supabase migration list
npx supabase db push
```

Tinjau migration list dan perubahan yang akan diterapkan sebelum `db push`. Migrasi terbaru berada di `supabase/migrations/` dan mencakup durasi/HPP, sinkronisasi waktu serta bay, ketahanan snapshot Admin, broadcast perubahan transaksi, dan sinkronisasi stok produk berdasarkan status pembayaran. Migrasi `20261026000000_paid_product_stock_lifecycle.sql` hanya memakai tabel yang sudah ada dan tidak menambah tabel atau kolom. Jangan menjalankan ulang `sql/schema.sql` atau file `*-proposal.sql` sebagai migrasi pada database yang sudah berisi data. Folder `sql/REFERENCE/` berisi snapshot HTML referensi, bukan halaman aplikasi.

## Pengujian

```powershell
node --check app.js
node --test
```

`npm run check` dan `npm test` menjalankan perintah yang sama melalui script `package.json`. Suite menguji helper, rekonsiliasi pendapatan, delta transaksi lunas, lifecycle, kontrak migrasi, serta fallback data null/kosong.

## Struktur Proyek

- `index.html`: shell aplikasi.
- `app.js`: UI, state transaksi, validasi, integrasi Supabase, dan server lokal.
- `styles.css`, `polish.css`, `theme.css`: gaya dasar dan tema aplikasi.
- `supabase/migrations/`: migrasi database versioned.
- `sql/`: schema/proposal dan referensi migrasi; proposal bukan migrasi yang otomatis diterapkan.
- `tests/booking-helpers.test.js`: tes helper dan kontrak statis.
- `assets/`: foto dan media aplikasi.

Foto `assets/self-service-bay.jpg` bersumber dari G. Edward Johnson, [Glo Car Wash, Pahrump, NV](https://commons.wikimedia.org/wiki/File:Car_Wash_Pahrump_NV_2026-04-03_15-05-36.jpg), berlisensi [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Versi lokal diubah ukurannya untuk penggunaan web.