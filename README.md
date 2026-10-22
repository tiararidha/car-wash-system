# Rinse Society Wash Studio

Aplikasi operasional wash studio untuk katalog layanan, sesi bay Self-Service, produk, antrean, transaksi, dan dashboard admin.

## Live Website

[Buka Rinse Society Wash Studio](https://tiararidha.github.io/car-wash-system/)

## Fitur

- Katalog Professional Wash, Self-Service, dan produk dari Supabase.
- Form order Professional Wash dan Self-Service tanpa pilihan jadwal atau bay manual; waktu layanan dan alokasi bay Self-Service ditentukan otomatis dari ketersediaan.
- Order layanan dan checkout produk menyimpan data di Supabase; pembayaran order baru disimulasikan berhasil dan dicatat `PAID` oleh RPC database.
- Tanggal transaksi mengikuti tanggal WIB saat ini; input transaksi manual tidak boleh melewati waktu saat ini. Jam operasional studio tetap 08.00–21.00 WIB.
- Checkout produk mendukung Ambil di Studio (Pick-up, ongkir Rp0) atau Pengiriman Online / Kurir lokal maksimal 10 km (ongkir flat Rp10.000). Alamat kurir wajib diisi; metode, alamat, dan ongkir tersimpan pada transaksi dan tampil pada konfirmasi serta daftar Admin.
- Papan Antrean Harian (Today's Queue) hanya menampilkan operasional kendaraan bertanggal hari ini, dengan counter Antrean Aktif dan Selesai yang dihitung dari data harian. Tab Transaksi menampilkan transaksi operasional dan pembelian produk yang masih aktif; transaksi yang dibatalkan disimpan tetapi disembunyikan dari daftar aktif.
- Seluruh 28 transaksi historis/demo di database tercatat `PAID`; dashboard Admin hanya dapat dibuka setelah verifikasi Supabase Auth dengan claim `app_metadata.rinse_role = 'admin'`.
- Tab Self-Service khusus di Admin telah dihapus. Tab Ringkasan Studio menampilkan satu panel ringkas status empat bay sebagai indikator monitoring ketersediaan real-time, tanpa aksi pemesanan.
- Badge sidebar Antrean tersinkronisasi real-time dan hanya menghitung antrean aktif berstatus MENUNGGU atau DICUCI; jumlah otomatis berkurang saat kendaraan berstatus SELESAI.
- Tab Transaksi menyediakan CRUD khusus Admin: tambah transaksi layanan atau produk secara manual selama jam operasional, serta kolom **Kelola** dengan tombol **Edit** dan **Hapus** pada setiap baris. Tanggal/jam default mengikuti waktu WIB; validasi menolak waktu mendatang, jam di luar operasional, dan sesi layanan yang melewati pukul 21.00. Edit dapat mengubah item, nominal, tanggal, metode pemenuhan produk, status pembayaran, dan antrean; Hapus meminta konfirmasi lalu menghapus baris dari database dan daftar lokal.
- Tab Laporan menyediakan Cetak Laporan Keuangan melalui dialog print browser (dapat disimpan sebagai PDF). Dokumen mencakup identitas studio/Admin, waktu cetak, ringkasan pendapatan lunas per Professional Wash, Self-Service, dan produk, serta rincian transaksi aktif.
- Metrik publik jumlah layanan dan ketersediaan bay.

Form order customer tidak meminta login, OTP email, atau SMS. Order layanan mengirim hanya nama, nomor HP, model/plat kendaraan, layanan, dan metode pembayaran ke RPC atomik; database menghitung total, jadwal/bay, ID, dan status. Checkout produk tetap memakai RPC capability. Login Admin menggunakan Modal Login Admin khusus dan Supabase Auth; akses dashboard mensyaratkan claim tepercaya `app_metadata.rinse_role = 'admin'`. Dashboard tidak lagi memakai mode read-only atau banner melayang.

## Teknologi

- HTML5, CSS, JavaScript tanpa framework frontend.
- Node.js built-in HTTP server; Supabase CLI tersedia sebagai dev dependency lokal untuk administrasi project.
- Supabase Auth, PostgREST, dan PostgreSQL.
- Node.js test runner.

## Struktur penting

- `index.html`: shell aplikasi.
- `app.js`: UI, validasi, request Supabase, dan server lokal.
- `styles.css`, `polish.css`, `theme.css`: styling.
- `sql/schema.sql` dan migrasi: schema, RLS, RPC, seed, dan operasional.
- `sql/*proposal.sql`: file review lokal; proposal belum berarti perubahan sudah diterapkan.
- `sql/REFERENCE/`: snapshot HTML referensi, bukan halaman aplikasi.
- `tests/booking-helpers.test.js`: tes helper dan kontrak statis.
- `assets/`: media aplikasi.

## Menjalankan Lokal

Gunakan Node.js 18 atau lebih baru:

```powershell
npm install
node app.js
```

Buka `http://localhost:3000`. Tes lokal: `npm test` atau `node --test`. Cek sintaks: `npm run check` atau `node --check app.js`.

## Konfigurasi Supabase

Atur `SUPABASE_URL` dan `SUPABASE_PUBLISHABLE_KEY` pada konstanta di `app.js`. Publishable key memang digunakan oleh browser; jangan pernah memasukkan `service_role` atau secret key.

Project Supabase menyimpan order customer melalui RPC; CRUD transaksi manual Admin menggunakan akses terautentikasi untuk menulis dan menghapus baris transaksi beserta relasi pelanggan/kendaraan. Tanggal transaksi baru mengikuti tanggal WIB saat ini, sementara seed operasional dihitung relatif terhadap tanggal ketika migration dijalankan. Papan Antrean Harian hanya mencakup layanan bertanggal hari ini. Tab Transaksi menampilkan transaksi aktif, termasuk layanan, produk, dan tanggal historis; baris `CANCELLED`/`EXPIRED` historis tidak tampil dalam daftar aktif atau perhitungan laporan. Order customer baru juga dicatat `PAID` oleh RPC pembayaran.

Migration versioned `20261012000000_secure_demo_service_orders.sql` menambahkan idempotency key pada registry private dan menulis order layanan melalui wrapper `SECURITY DEFINER` yang tetap menjalankan trigger integritas. Migration `20261012000001_restrict_legacy_anon_rpcs.sql` mencabut akses `anon` ke lookup PII, cancellation, direct product/service sale, dan insert langsung customer/vehicle, sambil menjaga katalog publik serta grant `authenticated`/`service_role`. Migration `20261012000002_demo_product_checkout.sql` menambahkan checkout produk guest yang mengunci stok, menghitung harga dari katalog, menyimpan transaksi lewat trigger, dan meregistrasikan order secara idempotent. Migration `20261012000003_fix_demo_product_fingerprint.sql` memperbaiki operator precedence yang sempat menghasilkan SQLSTATE `42883`. Migration `20261012000004_simulate_demo_payments.sql` mencatat status `PAID` dalam transaksi database yang sama dan memindahkan booking Self-Service ke `BOOKED`. Migration `20261022000000_dynamic_transaction_time_and_product_fulfillment.sql` menerapkan tanggal WIB dinamis, guard waktu transaksi terkini, katalog produk terbaru, dan metode pemenuhan produk. Terapkan migration terbaru pada project Supabase untuk mengaktifkan perubahan database.

Untuk menerapkan migration versioned yang belum ada di project Supabase, login dan hubungkan project terlebih dahulu, lalu jalankan:

```powershell
npx supabase login
npx supabase link --project-ref "PROJECT_REF"
npx supabase db push
```

Periksa daftar migration yang akan diterapkan sebelum menyetujui `db push`. File di `supabase/migrations/` adalah migration versioned; jangan jalankan ulang baseline `sql/schema.sql` atau file `*-proposal.sql` pada database yang sudah berisi data.

Dashboard Admin menggunakan alur login melalui Modal Login Admin khusus. Supabase Auth memverifikasi sesi dan aplikasi hanya memberikan akses dashboard kepada akun dengan claim `app_metadata.rinse_role = 'admin'`; dashboard tidak lagi menampilkan akses read-only atau banner melayang. Modal login memverifikasi akun yang sudah memiliki claim dan tidak menetapkan role. Panel status empat bay berada di tab Ringkasan Studio sebagai indikator monitoring ketersediaan real-time; tab Self-Service khusus Admin dan tombol pemesanan bay di Admin telah dihapus. Badge Antrean menghitung status MENUNGGU dan DICUCI, lalu berkurang saat status kendaraan menjadi SELESAI. Admin dapat membuat transaksi layanan/produk, mengubah item, nominal, tanggal, metode dan status pembayaran/antrean, atau menghapus transaksi dari tab Transaksi. Tab Laporan dapat mencetak atau menyimpan PDF laporan untuk seluruh periode.

Navigasi, form kunjungan terjadwal, dan tampilan Admin Booking telah dihapus. Transaksi historis tetap dipertahankan; Self-Service tetap menyimpan sesi dan reservasi bay melalui status transaksi internal.

Lookup/history capability (`lookup_customer_profile_by_capability`, `lookup_customer_history_with_capability`, dan `create_service_booking_with_capability`) tetap tidak ada pada database tertaut; alur guest demo memakai RPC order khusus dan tidak lagi bergantung pada lookup capability tersebut. Guest checkout produk sudah diuji live hingga order ID tampil dan bertahan setelah refresh. CRUD transaksi Admin dan cetak laporan sudah tersedia di frontend, tetapi perlu diverifikasi pada project Supabase dengan sesi Admin ber-role benar serta grant/policy tabel transaksi yang sesuai. Pembayaran/refund, history capability, dan autentikasi Admin tetap belum diverifikasi live.

Urutan file baseline/proposal tetap hanya untuk staging terisolasi dari baseline yang ditinjau: `schema.sql` -> `rls-authenticated-access.sql` -> `self-service-bay-live-migration.sql` -> `business-flow-hardening.sql` -> `catalog-revision.sql` -> (opsional fixture staging: `t-20-seed-reconciliation.sql`, lalu `booking-seed-payment-reconciliation.sql`) -> `admin-role-authorization-proposal.sql` -> `multi-addon-booking-integrity-proposal.sql` -> `customer-capability-booking-migration.sql`. Jangan jalankan ulang baseline atau seluruh proposal terhadap database berisi data. `sql/demo-public-order-dashboard-proposal.sql` adalah artefak historis yang fail-closed; jangan dieksekusi. `pickup-rpc-hardening-proposal.sql` superseded dan tidak boleh dijalankan.

`node --test` menguji helper JavaScript dan kontrak source statis, termasuk pembatasan tanggal papan antrean harian; `node --check app.js` memeriksa sintaks. Verifikasi live mencakup order Professional Wash, Self-Service dan produk dengan status `PAID`, booking Self-Service `BOOKED`, retry idempotent tanpa pengurangan stok kedua, reuse customer/vehicle, input invalid, akses anon ditolak ke RPC legacy, laporan berbasis transaksi lunas, serta pemuatan dashboard setelah refresh. Test layanan inactive memakai ID yang tidak ada karena katalog tidak memiliki layanan service inactive. Refund dan history capability belum diverifikasi.

## Pembayaran dan Batasan

- Pembayaran customer untuk order baru disimulasikan sukses di RPC database yang sama dengan penyimpanan order; status tercatat `PAID` tanpa gateway atau callback eksternal. Sebanyak 28 transaksi historis/demo juga telah diperbarui dan tercatat `PAID` (Lunas). Booking Self-Service menjadi `BOOKED`. Ini simulasi pembayaran, bukan simulasi persistensi.
- Refund dicatat admin setelah pengembalian dana dilakukan di luar aplikasi.
- Capability adalah bearer credential: browser yang menyimpan token dapat mengakses profil terkait. Nomor telepon yang diketik bukan bukti identitas; penautan profil lama harus dilakukan melalui proses Admin tepercaya di luar aplikasi.
- Antar-Jemput dinonaktifkan di aplikasi; data dan RPC historis di database belum dihapus.

Foto `assets/self-service-bay.jpg`: G. Edward Johnson, [Glo Car Wash, Pahrump, NV](https://commons.wikimedia.org/wiki/File:Car_Wash_Pahrump_NV_2026-04-03_15-05-36.jpg), dilisensikan di bawah [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Versi lokal diubah ukuran untuk penggunaan web.