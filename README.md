# Rinse Society Wash Studio

Aplikasi wash studio berbasis HTML, CSS, JavaScript, Node.js, dan Supabase PostgreSQL. Tidak menggunakan React/Vue, package.json, atau tabel di luar empat entitas utama.

## Menjalankan aplikasi

Gunakan Node.js 18 atau lebih baru:

```powershell
node app.js
```

Buka `http://localhost:3000`.

## Menghubungkan Supabase

1. Buka bagian konstanta di awal `app.js`.
2. Isi `SUPABASE_URL` dengan Project URL (`https://xxxxx.supabase.co`) dan `SUPABASE_PUBLISHABLE_KEY` dengan publishable key proyek.
3. Jalankan `sql/schema.sql` melalui Supabase SQL Editor. Schema membuat tepat empat tabel: `customers`, `vehicles`, `services_products`, dan `transactions`, beserta indeks, constraints, RLS, RPC aman, dan data awal operasional.
4. Jalankan `sql/rls-authenticated-access.sql` untuk memperbarui izin authenticated dan RPC. Muat ulang aplikasi. Data katalog, metrik publik, riwayat, pelanggan, kendaraan, transaksi, dan status bay harus berasal dari Supabase; kegagalan akses ditampilkan sebagai error, bukan diganti data seed.
5. Jalankan `sql/self-service-bay-live-migration.sql`, lalu `sql/business-flow-hardening.sql`. Migrasi terakhir memperketat relasi dan nominal transaksi, pembayaran sebelum pengerjaan, pembatalan/refund, serta rekonsiliasi otomatis setiap menit. Migrasi hanya menambah kolom dan fungsi pada tabel yang ada; tidak membuat tabel baru. Kolom dan RPC pickup lama tetap dipertahankan untuk data historis dan belum dihapus dari database.

Jangan masukkan `service_role` atau secret key ke browser. Aplikasi memakai REST API dan Supabase Auth langsung dengan publishable key.

## Akun Admin

1. Buat akun melalui Supabase Authentication; tidak ada tabel `users` atau halaman registrasi pada aplikasi.
2. Login admin diverifikasi oleh Supabase Auth menggunakan email dan password. Aplikasi tidak memeriksa email tertentu atau metadata role; sesi authenticated memberi akses ke area privat dan data operasional.
3. Token sesi sementara disimpan pada `sessionStorage`; tombol **Keluar** mengakhiri sesi.

Data pelanggan dan transaksi tidak dibuka untuk pembacaan anon. Pencarian history menggunakan RPC yang hanya mengembalikan kecocokan persis berdasarkan kode booking, nomor HP, atau plat; lookup kendaraan menggunakan nomor HP persis. Penjualan produk memakai RPC yang mengunci stok, mengurangi stok, dan membuat transaksi secara atomik.

## Pembayaran dan Operasional

Jika Supabase belum dapat dihubungi, website menampilkan error state dan tidak mengganti data aktif dengan data preview. localStorage hanya menyimpan keranjang; sessionStorage hanya menyimpan sesi login sementara.

Harga jasa final: Professional Car Wash Rp50.000, Professional Motorcycle Wash Rp20.000, Self-Service Car Rp30.000, dan Self-Service Motorcycle Rp10.000.

Walk-in tunai menunggu konfirmasi Admin setelah uang diterima. Booking hanya memakai QRIS, E-Wallet, atau Card dan tidak memiliki konfirmasi manual; booking tetap belum dibayar sampai payment gateway memanggil `confirm_booking_payment` setelah pembayaran benar-benar berhasil. Gateway belum terhubung, jadi transaksi cashless tidak otomatis menjadi Lunas. Pembatalan booking sebelum waktu mulai melepas slot; dana yang telah dibayar tercatat menunggu pengembalian manual. Status pengembalian selesai hanya dicatat Admin setelah dana benar-benar dikembalikan di luar aplikasi.

Antar-Jemput telah dinonaktifkan di aplikasi: tidak tersedia di booking, katalog, atau RPC yang dipanggil aplikasi. Kolom, RPC, dan transaksi historis terkait masih ada di Supabase karena perubahan skema/database tidak dijalankan. RPC database lama masih dapat menerima pemanggilan langsung sampai penghapusannya diaudit dan disetujui secara terpisah.

Rekonsiliasi Self-Service tetap memakai `pg_cron` setiap menit dan kini mengatur seluruh layanan yang sudah dibayar. Perubahan status tersimpan otomatis tanpa halaman atau tindakan admin; pembaruan status persisten dapat tertunda sampai tick cron berikutnya.

Foto `assets/self-service-bay.jpg`: G. Edward Johnson, [Glo Car Wash, Pahrump, NV](https://commons.wikimedia.org/wiki/File:Car_Wash_Pahrump_NV_2026-04-03_15-05-36.jpg), dilisensikan di bawah [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Versi lokal diubah ukuran untuk penggunaan web.