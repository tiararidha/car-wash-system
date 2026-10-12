# Rinse Society Wash Studio

Aplikasi operasional wash studio untuk katalog layanan, sesi bay Self-Service, produk, antrean, transaksi, dan dashboard admin.

## Fitur

- Katalog Professional Wash, Self-Service, dan produk dari Supabase.
- Form order Professional Wash dan Self-Service tanpa pilihan jadwal atau bay manual; waktu layanan dan alokasi bay Self-Service ditentukan otomatis dari ketersediaan.
- Order layanan dan checkout produk menyimpan data nyata di Supabase; pembayaran tugas disimulasikan berhasil dan dicatat `PAID` oleh RPC database.
- Dashboard snapshot tersedia dalam mode baca saja; mutasi Admin memerlukan sesi Supabase dengan claim `app_metadata.rinse_role = 'admin'`.
- Metrik publik jumlah layanan dan ketersediaan bay.

Form order customer tidak meminta login, OTP email, atau SMS. Order layanan mengirim hanya nama, nomor HP, model/plat kendaraan, layanan, dan metode pembayaran ke RPC atomik; database harus menghitung total, jadwal/bay, ID, dan status. Checkout produk tetap memakai RPC capability. Dashboard ringkasan membaca snapshot RPC yang disamarkan; masuk Admin menggunakan Supabase Auth dan hanya menerima claim tepercaya.

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
node app.js
```

Buka `http://localhost:3000`. Tes lokal: `npm test`. Cek sintaks: `npm run check`.

## Konfigurasi Supabase

Atur `SUPABASE_URL` dan `SUPABASE_PUBLISHABLE_KEY` pada konstanta di `app.js`. Publishable key memang digunakan oleh browser; jangan pernah memasukkan `service_role` atau secret key.

Pada audit 12 Oktober 2026, project Supabase yang dikonfigurasi berisi 22 transaksi dan registry demo kosong. RPC order dan snapshot aktif. Definisi remote menggunakan variabel `existing_customer_id`/`existing_vehicle_id` terpisah dari UUID baru, sehingga klaim terdahulu bahwa `SELECT INTO` menimpa UUID tidak didukung oleh definisi yang terpasang. Order valid berhasil melalui RPC langsung dan form localhost; kegagalan generik/`23502` sebelumnya tidak dapat direproduksi pada kondisi audit ini.

Migration versioned `20261012000000_secure_demo_service_orders.sql` menambahkan idempotency key pada registry private dan menulis order layanan melalui wrapper `SECURITY DEFINER` yang tetap menjalankan trigger integritas. Migration `20261012000001_restrict_legacy_anon_rpcs.sql` mencabut akses `anon` ke lookup PII, cancellation, direct product/service sale, dan insert langsung customer/vehicle, sambil menjaga katalog publik serta grant `authenticated`/`service_role`. Migration `20261012000002_demo_product_checkout.sql` menambahkan checkout produk guest yang mengunci stok, menghitung harga dari katalog, menyimpan transaksi lewat trigger, dan meregistrasikan order secara idempotent. Migration `20261012000003_fix_demo_product_fingerprint.sql` memperbaiki operator precedence yang sempat menghasilkan SQLSTATE `42883`. Migration `20261012000004_simulate_demo_payments.sql` mencatat status `PAID` dalam transaksi database yang sama dan memindahkan booking Self-Service ke `BOOKED`. Semua migration sudah diterapkan dan tercatat.

Snapshot dashboard demo hanya membaca registry dan meredaksi nama, telepon, alamat, plat, dan model. Query database read-only kini mengonfirmasi 43 transaksi: 22 tanpa registry (selaras dengan 22 transaksi historis pada audit sebelumnya) dan 21 order demo terdaftar, tanpa orphan registry rows. Tiga order uji baru dibuat melalui formulir aplikasi dan seluruh 21 order demo sengaja dipertahankan untuk audit serta integritas relasi. Lima checkout sebelumnya menurunkan stok `prd-cloth` dari 14 menjadi 9; pembelian browser tambahan menurunkannya menjadi 8, lalu replay request tidak menurunkan stok lagi.

**Blokir Admin:** database tertaut memiliki satu akun Auth dan nol `app_metadata.rinse_role = 'admin'`. Policy RLS saat ini memberi akses `true` ke seluruh role `authenticated`, dan RPC pembayaran/refund tidak memeriksa klaim Admin di server. Pemeriksaan UI di browser bukan pengganti otorisasi database. Role-gated migration `sql/admin-role-authorization-proposal.sql` mensyaratkan admin break-glass yang diverifikasi serta OTP telepon sebelum penerapan; prasyarat tersebut belum terpenuhi, jadi migration itu tidak diterapkan. Jangan aktifkan operasi mutasi Admin sampai role dan RLS diperbaiki di staging.

Form login hanya memverifikasi akun yang sudah memiliki claim; form ini tidak menetapkan role. Form mutasi disembunyikan saat sesi terverifikasi tidak tersedia, tetapi ini bukan proteksi Data API: live policy inspection menemukan `USING true` dan `WITH CHECK true` untuk role `authenticated` pada customers, vehicles, services_products, dan transactions. Satu akun Auth tanpa claim Admin ditemukan; email/identitas yang dimaksud dan kredensial sign-in tidak tersedia. Jangan anggap CRUD Admin aman atau tetapkan role sampai pemilik project mengidentifikasi Admin/break-glass account dan role-gated RLS diterapkan sesuai proposal.

Navigasi, form kunjungan terjadwal, dan tampilan Admin Booking telah dihapus. Transaksi historis tetap dipertahankan; Self-Service tetap menyimpan sesi dan reservasi bay melalui status transaksi internal.

Lookup/history capability (`lookup_customer_profile_by_capability`, `lookup_customer_history_with_capability`, dan `create_service_booking_with_capability`) tetap tidak ada pada database tertaut; alur guest demo memakai RPC order khusus dan tidak lagi bergantung pada lookup capability tersebut. Guest checkout produk sudah diuji live hingga order ID tampil dan bertahan setelah refresh. Checkout produk Admin, pembayaran/refund, history capability, dan autentikasi Admin belum diverifikasi.

Urutan file baseline/proposal tetap hanya untuk staging terisolasi dari baseline yang ditinjau: `schema.sql` -> `rls-authenticated-access.sql` -> `self-service-bay-live-migration.sql` -> `business-flow-hardening.sql` -> `catalog-revision.sql` -> (opsional fixture staging: `t-20-seed-reconciliation.sql`, lalu `booking-seed-payment-reconciliation.sql`) -> `admin-role-authorization-proposal.sql` -> `multi-addon-booking-integrity-proposal.sql` -> `customer-capability-booking-migration.sql`. Jangan jalankan ulang baseline atau seluruh proposal terhadap database berisi data. `sql/demo-public-order-dashboard-proposal.sql` adalah artefak historis yang fail-closed; jangan dieksekusi. `pickup-rpc-hardening-proposal.sql` superseded dan tidak boleh dijalankan.

`npm test` menguji helper JavaScript dan kontrak source statis. Verifikasi live mencakup order Professional Wash, Self-Service dan produk dengan status `PAID`, booking Self-Service `BOOKED`, retry idempotent tanpa pengurangan stok kedua, reuse customer/vehicle, input invalid, akses anon ditolak ke RPC legacy, laporan berbasis transaksi lunas, serta snapshot dashboard setelah refresh. Test layanan inactive memakai ID yang tidak ada karena katalog tidak memiliki layanan service inactive. Operasi Admin, pembayaran/refund, dan history capability belum diverifikasi karena klaim Admin/capability belum tersedia.

## Pembayaran dan Batasan

- Untuk assignment, pembayaran customer disimulasikan sukses di RPC database yang sama dengan penyimpanan order; status tercatat `PAID` tanpa gateway atau callback eksternal. Booking Self-Service menjadi `BOOKED`, sementara walk-in dan produk menunggu proses operasional. Ini simulasi pembayaran, bukan simulasi persistensi.
- Transaksi historis tidak di-backfill ke `PAID`; simulasi berlaku untuk order baru yang dibuat melalui RPC guest.
- Refund dicatat admin setelah pengembalian dana dilakukan di luar aplikasi.
- Capability adalah bearer credential: browser yang menyimpan token dapat mengakses profil terkait. Nomor telepon yang diketik bukan bukti identitas; penautan profil lama harus dilakukan melalui proses Admin tepercaya di luar aplikasi.
- Antar-Jemput dinonaktifkan di aplikasi; data dan RPC historis di database belum dihapus.

Foto `assets/self-service-bay.jpg`: G. Edward Johnson, [Glo Car Wash, Pahrump, NV](https://commons.wikimedia.org/wiki/File:Car_Wash_Pahrump_NV_2026-04-03_15-05-36.jpg), dilisensikan di bawah [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Versi lokal diubah ukuran untuk penggunaan web.