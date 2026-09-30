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
3. Jalankan `sql/schema.sql` melalui Supabase SQL Editor. Schema membuat tepat empat tabel: `customers`, `vehicles`, `services_products`, dan `transactions`, beserta indeks, constraints, RLS, RPC aman, dan data demo lintas tanggal.
4. Muat ulang aplikasi. Katalog, metrik publik, riwayat, kendaraan milik pelanggan, dan status bay dibaca dari Supabase. Jika katalog belum ada, jalankan SQL schema lebih dahulu; dashboard admin juga mengisi seed bila katalog masih kosong.

Jangan masukkan `service_role` atau secret key ke browser. Aplikasi memakai REST API dan Supabase Auth langsung dengan publishable key.

## Akun Admin

1. Buat akun admin dari Supabase Authentication; tidak ada tabel `users`.
2. Pada `app_metadata` akun tersebut, tetapkan `role: "admin"`. RLS hanya mengizinkan role ini membaca dan mengubah data operasional.
3. Masuk lewat tombol dashboard pada website. Kata sandi hanya dikirim ke Supabase Auth dan tidak disimpan. Token sesi sementara disimpan pada `sessionStorage`; tombol **Keluar** mengakhiri sesi.

Data pelanggan dan transaksi tidak dibuka untuk pembacaan anon. Pencarian history menggunakan RPC yang hanya mengembalikan kecocokan persis berdasarkan kode booking, nomor HP, atau plat; lookup kendaraan menggunakan nomor HP persis. Penjualan produk memakai RPC yang mengunci stok, mengurangi stok, dan membuat transaksi secara atomik.

## Demo dan Pembayaran

Jika konstanta Supabase masih berupa placeholder atau proyek belum dapat dihubungi, website menampilkan data preview di memori dan menandainya sebagai **Mode pratinjau**. Preview tidak bisa menyimpan transaksi dan tidak disimpan ke localStorage. localStorage hanya menyimpan keranjang; sessionStorage hanya menyimpan sesi login sementara.

Walk-in CASH dicatat lunas. Booking cash dan metode cashless tetap `PENDING` sampai dibayar; metode QRIS, E-Wallet, dan Card memerlukan payment gateway untuk konfirmasi otomatis, yang belum disertakan.

Foto Pexels berada pada konstanta `PHOTOS` di `app.js`; URL dapat diganti dengan foto aset usaha sendiri.