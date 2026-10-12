# Rinse Society Wash Studio

Aplikasi operasional wash studio untuk katalog layanan, booking, Self-Service, produk, antrean, transaksi, dan dashboard admin.

## Fitur

- Katalog Professional Wash, Self-Service, dan produk dari Supabase.
- Form order Professional Wash dan Self-Service tanpa pilihan jadwal atau bay manual; jadwal dan alokasi bay Self-Service ditentukan otomatis dari ketersediaan.
- Keranjang checkout produk; semua order tetap `PENDING` sampai dikonfirmasi oleh proses pembayaran/Admin yang berwenang.
- Dashboard admin langsung tanpa form login; data dashboard diambil melalui RPC snapshot Supabase.
- Metrik publik jumlah layanan dan ketersediaan bay.

Form order customer tidak meminta login, OTP email, atau SMS. Order layanan mengirim hanya nama, nomor HP, model/plat kendaraan, layanan, dan metode pembayaran ke RPC atomik; database harus menghitung total, jadwal/bay, ID, dan status. Checkout produk tetap memakai RPC capability. Dashboard Admin dibuka langsung tanpa form login dan membaca snapshot RPC, bukan localStorage atau data demo.

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

Migration versioned `20261012000000_secure_demo_service_orders.sql` menambahkan idempotency key pada registry private dan menulis order layanan melalui wrapper `SECURITY DEFINER` yang tetap menjalankan trigger integritas. Migration `20261012000001_restrict_legacy_anon_rpcs.sql` mencabut akses `anon` ke lookup PII, cancellation, direct product/service sale, dan insert langsung customer/vehicle, sambil menjaga katalog publik serta grant `authenticated`/`service_role`. Migration `20261012000002_demo_product_checkout.sql` menambahkan checkout produk guest yang mengunci stok, menghitung harga dari katalog, menyimpan transaksi lewat trigger, dan meregistrasikan order secara idempotent. Migration `20261012000003_fix_demo_product_fingerprint.sql` memperbaiki operator precedence yang sempat menghasilkan SQLSTATE `42883`. Keempat migration sudah diterapkan dan tercatat.

Snapshot dashboard demo hanya membaca registry dan meredaksi nama, telepon, alamat, plat, dan model. Dashboard demo tetap dapat dibuka tanpa login; ini bukan pengganti autentikasi Admin. Empat belas order uji sintetis ditambahkan sepanjang verifikasi; database kini berisi 36 transaksi termasuk 22 transaksi awal yang tetap utuh. Snapshot menampilkan hanya 14 order demo terdaftar. Checkout produk mengurangi stok `prd-cloth` dari 14 menjadi 11 melalui tiga order uji satuan; transaksi tersebut tercatat sebagai pending.

**Blokir Admin:** database tertaut memiliki satu akun Auth dan nol `app_metadata.rinse_role = 'admin'`. Policy RLS saat ini memberi akses `true` ke seluruh role `authenticated`, dan RPC pembayaran/refund tidak memeriksa klaim Admin di server. Pemeriksaan UI di browser bukan pengganti otorisasi database. Role-gated migration `sql/admin-role-authorization-proposal.sql` mensyaratkan admin break-glass yang diverifikasi serta OTP telepon sebelum penerapan; prasyarat tersebut belum terpenuhi, jadi migration itu tidak diterapkan. Jangan aktifkan operasi mutasi Admin sampai role dan RLS diperbaiki di staging.

Lookup/history capability (`lookup_customer_profile_by_capability`, `lookup_customer_history_with_capability`, dan `create_service_booking_with_capability`) tetap tidak ada pada database tertaut; alur guest demo memakai RPC order khusus dan tidak lagi bergantung pada lookup capability tersebut. Guest checkout produk sudah diuji live hingga order ID tampil dan bertahan setelah refresh. Checkout produk Admin, pembayaran/refund, history capability, dan autentikasi Admin belum diverifikasi.

Urutan file baseline/proposal tetap hanya untuk staging terisolasi dari baseline yang ditinjau: `schema.sql` -> `rls-authenticated-access.sql` -> `self-service-bay-live-migration.sql` -> `business-flow-hardening.sql` -> `catalog-revision.sql` -> (opsional fixture staging: `t-20-seed-reconciliation.sql`, lalu `booking-seed-payment-reconciliation.sql`) -> `admin-role-authorization-proposal.sql` -> `multi-addon-booking-integrity-proposal.sql` -> `customer-capability-booking-migration.sql`. Jangan jalankan ulang baseline atau seluruh proposal terhadap database berisi data. `sql/demo-public-order-dashboard-proposal.sql` adalah artefak historis yang fail-closed; jangan dieksekusi. `pickup-rpc-hardening-proposal.sql` superseded dan tidak boleh dijalankan.

`npm test` menguji helper JavaScript dan kontrak source statis. Verifikasi live mencakup order Professional Wash dan Self-Service, guest product checkout, retry produk dengan ID sama tanpa pengurangan stok kedua, reuse customer/vehicle, input invalid, akses anon ditolak ke RPC legacy, serta snapshot dashboard setelah refresh. Test layanan inactive memakai ID yang tidak ada karena katalog tidak memiliki layanan service inactive. Operasi Admin, pembayaran/refund, dan history capability belum diverifikasi karena klaim Admin/capability belum tersedia.

## Pembayaran dan Batasan

- Booking QRIS/E-Wallet/Card tetap `PENDING` sampai payment gateway tepercaya mengonfirmasi pembayaran. Gateway belum terhubung.
- Pembayaran tunai hanya dapat dikonfirmasi oleh admin yang berwenang.
- Refund dicatat admin setelah pengembalian dana dilakukan di luar aplikasi.
- Capability adalah bearer credential: browser yang menyimpan token dapat mengakses profil terkait. Nomor telepon yang diketik bukan bukti identitas; penautan profil lama harus dilakukan melalui proses Admin tepercaya di luar aplikasi.
- Antar-Jemput dinonaktifkan di aplikasi; data dan RPC historis di database belum dihapus.

Foto `assets/self-service-bay.jpg`: G. Edward Johnson, [Glo Car Wash, Pahrump, NV](https://commons.wikimedia.org/wiki/File:Car_Wash_Pahrump_NV_2026-04-03_15-05-36.jpg), dilisensikan di bawah [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/). Versi lokal diubah ukuran untuk penggunaan web.