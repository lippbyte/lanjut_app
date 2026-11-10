# Audit Portofolio sisi server

**Task:** LANJUT_010 seri v2, Bagian 3 tahap 1.
**Dasar:** commit `9fc7905`, skema sampai migrasi 031.
**Sifat:** catatan pembacaan kode sebelum rute ditulis, ditambah langkah untuk Dokploy. Kontrak rute ada di `docs/kontrak-data-v2.md` bagian 4.

## 1. Konvensi rute, validasi, galat, dan gerbang

| Hal | Yang berlaku | Yang dipakai portofolio |
|---|---|---|
| Letak rute | `src/modul/<nama>/<nama>.rute.js`, dipasang di `src/app.js` pada `/api/v1/...` | `/api/v1/butir-bukti` |
| Letak SQL | Hanya di `*.repo.js`, dan semua query data pengguna memfilter pemilik. Dijaga `npm run periksa-sql` | Sama. Repositori LANJUT_008 dipakai ulang |
| Validasi | zod lewat `validasiBody`. Medan yang tidak disebut dibuang | Sama. Klien tidak bisa mengisi `visibilitas` atau `rujukan_*` |
| Bentuk galat | `GalatApi(kode, pesan, medan)`, status dari tabel di `src/util/respons.js` | Enam kode baru, lihat kontrak |
| Data akun lain | Menjawab 404, bukan 403 | Sama |

**Gerbang.** Rute lama (`kartu`, `modul`, `kemajuan`, `butir-pribadi`) hanya memakai `wajibLogin`. Rute data pribadi yang lebih baru (`event-sekolah`, `minat_rumpun`, `kesiapan_ujian`) menambah pemeriksaan `persetujuanLayanan.kebijakanDiterima`, dan menjawab 403 `AI_BELUM_DIIZINKAN` bila kebijakan privasi belum diterima. Portofolio memakai dua gerbang itu, dipasang di tingkat router sehingga berlaku untuk semua rutenya.

Nama kode `AI_BELUM_DIIZINKAN` terdengar khusus AI, tetapi itulah kode yang dipakai rute data pribadi non-AI. Aplikasi sudah mengenalnya, jadi kode ini dipertahankan.

## 2. Pustaka unggahan dan gambar

Dependensi server: `bcryptjs`, `cors`, `dotenv`, `express`, `express-rate-limit`, `helmet`, `multer`, `mysql2`, `pdfjs-dist`, `zod`.

- **Unggahan:** `multer` dengan `memoryStorage`, pola yang sama dengan Unggah modul.
- **Gambar:** tidak ada pustaka gambar.

**Keputusan: tidak ada dependensi baru.** Pembersihan metadata ditulis sendiri di `src/modul/butir-bukti/foto-murni.js`, sekitar 260 baris tanpa dependensi. Berkas dibaca bagian per bagian, dan hanya bagian yang dibutuhkan untuk menampilkan gambar yang disalin. Berkas yang strukturnya tidak utuh ditolak.

Pilihan lainnya adalah `sharp` (lisensi Apache-2.0, dengan pustaka libvips LGPL-3.0). `sharp` bisa memproses ulang gambar sepenuhnya, tetapi memasang biner native berukuran puluhan MB dan butuh pemasangan dari registri luar saat dibangun.

Keterbatasan pendekatan ini: gambarnya tidak didekode ulang. Metadata hilang, tetapi data piksel disalin apa adanya, dan gambar tidak diperkecil. Foto hanya disajikan kepada pemiliknya, dengan jenis yang ditetapkan server dan `nosniff`, jadi ini cukup untuk tahap ini. Bila kelak foto dibagikan ke orang lain (K18, Bagian 9), proses ulang penuh perlu dipertimbangkan lagi.

## 3. Batas laju

Semua pembatas ada di `src/middleware/batasLaju.js`, memakai `express-rate-limit`, dan dipasang per rute. Pembatas per akun dipasang sesudah `wajibLogin`. Saat `NODE_ENV=test` angkanya dilonggarkan.

Yang ditambah: `batasUnggahFoto`, 20 permintaan per 15 menit per akun, dipasang di `POST /:id/foto`. Permintaan lain tetap mengikuti batas global 300 per 15 menit.

## 4. Docker dan Dokploy

Yang sudah ada: `docker-compose.yml` di akar dipakai Dokploy, dengan volume bernama `lanjut_db_data` untuk MySQL. API berjalan sebagai `USER node`, dan menjalankan `npm run migrasi` sebelum server menyala. `server/docker-compose.yml` hanya untuk MySQL lokal.

Yang ditambah dengan pola yang sama:

- Volume bernama `lanjut_berkas`, terpasang di `/data/berkas` pada layanan `api`.
- `DIREKTORI_BERKAS: /data/berkas` di `docker-compose.yml`, jadi tidak perlu diisi di Dokploy.
- `server/Dockerfile` membuat `/data/berkas` milik pengguna `node`. Volume bernama yang masih kosong mengikuti pemilik folder itu saat pertama dipasang.

### Langkah di Dokploy untuk Khalifa

**Saat deploy LANJUT_010 (saklar tetap mati):**

1. Cadangkan database produksi. Deploy ini menjalankan migrasi `032`.
2. Pastikan tab Environment **tidak** memuat `PORTOFOLIO_AKTIF=1`. Kosong berarti mati.
3. Deploy. Volume `lanjut_berkas` dibuat otomatis oleh Docker Compose, tidak perlu dibuat di layar Dokploy.
4. Pastikan volumenya terpasang, di terminal server:
   - `docker volume ls | grep lanjut_berkas`. Nama lengkapnya diawali nama proyek Compose.
   - `docker inspect <kontainer-api> --format '{{json .Mounts}}'` harus memuat tujuan `/data/berkas`.
   - `docker exec <kontainer-api> sh -c 'touch /data/berkas/.uji && rm /data/berkas/.uji && echo BISA_DITULIS'`.
5. Periksa bahwa rutenya masih mati: `GET /api/v1/butir-bukti` harus menjawab 404.

**Saat nanti dinyalakan (sesudah LANJUT_011 dan pilot siap):**

1. Isi `PORTOFOLIO_AKTIF=1` di tab Environment, lalu deploy ulang.
2. Bila server tidak mau menyala, cari baris `[server] DIREKTORI_BERKAS` di log. Server sengaja menolak berjalan bila foldernya tidak bisa ditulis.
3. Unggah satu foto uji, deploy ulang, lalu pastikan fotonya masih bisa dibuka. Ini membuktikan foto bertahan saat kontainer dibangun ulang.

**Cadangan.** Foto tidak ikut cadangan database. Volume `lanjut_berkas` perlu dicadangkan tersendiri sebelum portofolio dipakai siswa.

**Bila memakai bind mount, bukan volume bernama:** folder di host harus bisa ditulis oleh UID 1000 (pengguna `node`).

**Pemeliharaan.** Di kontainer API, `npm run bersihkan-berkas -- --cek` menunjukkan berkas yang tertunda dihapus dan berkas yatim. Tanpa `--cek`, penghapusan yang tertunda dicoba ulang.

## 5. Pola saklar

Ada tiga pola: nilai di tabel `konfigurasi_levelin` (`ai_aktif`, `event_sekolah_aktif`), variabel build aplikasi `EXPO_PUBLIC_*`, dan variabel lingkungan server seperti `JALANKAN_BENIH`.

Portofolio memakai variabel lingkungan server, `PORTOFOLIO_AKTIF`. Alasannya:

- Rute hanya dipasang saat menyala. Saat mati, jawabannya sama persis dengan jalur yang tidak ada.
- Saklar dan foldernya diperiksa bersama saat server menyala. Saklar di basis data bisa dinyalakan tanpa pemeriksaan folder.

Penyedia hapus berkas tetap terdaftar saat saklar mati, selama `DIREKTORI_BERKAS` terisi. Foto yang sudah tersimpan tetap ikut terhapus bila pemiliknya menghapus akun.
