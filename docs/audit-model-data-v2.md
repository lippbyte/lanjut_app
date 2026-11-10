# Audit model data v2

**Task:** LANJUT_008 seri v2, Bagian 2.
**Dasar:** commit `73e85ae`, sebelum migrasi 030.
**Sifat:** catatan hasil pembacaan skema dan kode. Rancangan akhirnya ada di `docs/kontrak-data-v2.md`.

## 1. Konvensi penamaan

| Hal | Konvensi yang berlaku |
|---|---|
| Nama tabel dan kolom | Bahasa Indonesia, huruf kecil, `snake_case`, tabel berbentuk tunggal |
| Kolom waktu | `*_pada`, bertipe `DATETIME`, nilainya UTC dari `sekarangUntukDb()` di aplikasi, tanpa `DEFAULT CURRENT_TIMESTAMP` |
| Kolom tanggal | `DATE`, misalnya `diperiksa_pada` dan `event_sekolah.tanggal` |
| Waktu dibuat dan diubah | `dibuat_pada` dan `diubah_pada` |
| Primary key baris milik pengguna | `id CHAR(36)`, UUID dari aplikasi (`buatUuid`) atau klien |
| Primary key data referensi | `id VARCHAR(64)`, berupa slug dari berkas JSON, misalnya `matematika` |
| Status | `ENUM` |
| Mesin dan collation | `InnoDB`, `utf8mb4`, `utf8mb4_unicode_ci` di semua 26 tabel |
| Nama batasan | `fk_<tabel>_<kolom>`, `idx_...`, `uq_...`, `chk_...` |
| Metadata konten | `sumber` (`ENUM` kelas kepercayaan: `resmi`, `pengguna`, `mitra`), `pemilik`, `status_verifikasi`, `asal` (asal-usul teks, misalnya `mockup` atau `riset`), `url_sumber`, `diperiksa_pada` |
| Letak SQL | Hanya di `*.repo.js`, query statis dengan placeholder `?`, dan query tabel pribadi memfilter pengguna. Diperiksa `npm run periksa-sql` |

## 2. Cara migrasi ditulis dan dijalankan

- Berkas `server/src/db/migrasi/NNN_nama.sql` dijalankan sekali oleh `npm run migrasi` dan dicatat di tabel `_migrasi`. Migrasi yang sudah jalan tidak boleh disunting.
- Pelari memecah pernyataan pada `;` di akhir baris. Komentar SQL tidak boleh berakhir dengan titik koma.
- Satu berkas per fitur, walau memuat beberapa tabel (contoh: `005_levelin.sql` dan `013_modul.sql`).
- Langkah turun ada di `server/src/db/migrasi-turun/` dengan nama yang sama, dijalankan `npm run migrasi-turun -- <nama>`. Hanya migrasi terakhir yang boleh diturunkan.
- Pengujian mengikuti `tests/migrasi-jalur-seleksi.test.js`: database sendiri, naik dan turun, pada keadaan bersih dan berisi.
- `docker-compose.yml` menjalankan `npm run migrasi`, lalu `npm run benih` bila `JALANKAN_BENIH=true` (bawaannya `true`), setiap kali server API dinyalakan.

## 3. Aliran penghapusan dan ekspor data pengguna

**Aplikasi belum punya fitur hapus akun maupun ekspor data.** Tidak ada rute atau kode untuk keduanya. Kebijakan privasi di repo induk menyatakan hal yang sama: permintaan penghapusan diajukan lewat kontak (`docs/kebijakan-privasi-DRAF.md`, bagian hak pengguna, dan bukti H3 di `docs/kebijakan-v2-klaim-vs-kode.md`).

Penghapusan akun yang ada hanyalah `DELETE FROM pengguna`, misalnya di `server/tools/smoke.js`. Pembersihan data milik akun bergantung sepenuhnya pada `ON DELETE CASCADE`.

| Tempat yang harus memuat tabel baru | Keadaan |
|---|---|
| Foreign key `ON DELETE CASCADE` ke `pengguna` | Sudah, di migrasi 030 |
| Daftar tabel pribadi di `server/tools/periksa-sql.js` | Sudah |
| Bahan ekspor (`server/src/modul/data-pengguna/data-pengguna.layanan.js`) | Baru dibuat, belum dipanggil rute mana pun |
| Inventaris data di kebijakan privasi (repo induk) dan `lib/kebijakan-privasi.json` | Belum. Perlu diperbarui saat Bagian 3 dan 4 mulai mengumpulkan data ini |
| Penghapusan berkas lampiran saat akun dihapus | Belum ada berkasnya. Catatan untuk Bagian 3 ada di kontrak |

## 4. Kebiasaan unggah berkas di modul Unggah modul

Hanya rujukan untuk Bagian 3. Tidak ada kode atau tabel modul yang dipakai tabel baru.

- `multer.memoryStorage`: berkas hanya ada di memori selama permintaan, tidak pernah ditulis ke disk.
- Yang disimpan hanya teks hasil ekstraksi, di basis data.
- Ekstensi dibatasi (`.txt`, `.md`, `.pdf`), dan isi berkas diperiksa, bukan hanya ekstensinya.
- Batas dibaca dari `konfigurasi_levelin`: `modul_ukuran_maks_byte` 5.242.880 (5 MB), `modul_karakter_maks` 200.000, `modul_jumlah_maks` 10.
- Penyajian hanya berupa teks lewat API, milik sendiri. Id modul akun lain menghasilkan 404.

Dua akibat untuk Bagian 3:

1. Foto akan menjadi berkas pertama yang benar-benar disimpan di disk. `docker-compose.yml` hanya punya volume untuk database, jadi tanpa volume baru foto akan hilang setiap kali server dibangun ulang.
2. `konfigurasi_levelin` termasuk tabel Level-In, jadi batas foto sebaiknya tidak ditaruh di sana (K7).

## 5. Lokasi data referensi dan cara benih membacanya

- Sumbernya `server/data-konten/*.json` (K16). Benih membaca berkas yang terdaftar di `BERKAS_DATA` pada `server/src/db/benih/benih.js`, dan berhenti sebelum menulis apa pun bila ada yang hilang.
- Bentuk berkas: metadata di tingkat atas (`sumber`, `pemilik`, `status`, `asal`, `url_sumber`, `diperiksa_pada`), baris di `data[]`.
- Benih memakai `INSERT ... ON DUPLICATE KEY UPDATE`. Tanda verifikasi dipertahankan selama isi tidak berubah, dan direset bila ada yang berubah.
- Di berkas yang ada, `pemilik` selalu `tim`, dan `diperiksa_pada` kosong sampai isinya diverifikasi.

Akibat penambahan `jalur-minat.json`: `LOKASI_DATA_KONTEN` yang menunjuk ke `MVP-PWA/data` kini berhenti dengan pesan "tidak lengkap", karena berkas baru hanya ada di `server/data-konten`. Ini sesuai K16.

## 6. Tempat di kode yang memuat daftar tabel

| Tempat | Isi | Tindakan |
|---|---|---|
| `server/tools/periksa-sql.js`, `TABEL_PRIBADI` | Tabel yang query-nya wajib memfilter pengguna | Empat tabel ditambahkan. `tujuan` juga nama kolom di `kode_otp_email`, jadi tabel itu dikenali dari posisinya di SQL |
| `server/src/db/benih/benih.js`, `BERKAS_DATA` | Berkas konten wajib | `jalur-minat.json` ditambahkan |
| `tests/ngobrol.test.js`, `tests/ngobrol-penghubung.test.js` | Memindai nama tabel dan semua kolom teks untuk memastikan obrolan tidak tersimpan | Tidak perlu diubah. Tabel baru ikut terpindai otomatis dan tidak cocok dengan polanya |
| Tes lain yang memakai `information_schema` | Hanya memeriksa tabel fiturnya sendiri | Tidak perlu diubah |
| `server/tools/cadangan-db.js` | `mysqldump` seluruh database | Tidak perlu diubah |

Tidak ada tes yang mendaftar seluruh tabel, jadi tidak ada tes lama yang diubah.

## 7. Penyesuaian terhadap rancangan task

| Rancangan | Yang dibuat | Alasan |
|---|---|---|
| `jalur_minat` punya `id` dan `kode` unik | Satu kolom `id VARCHAR(64)` berisi `melanjutkan`, `bekerja`, `wirausaha` | Sama dengan `mapel` dan `prodi`, slug-nya adalah primary key |
| `sumber` = Product Strategy v2.1 | `sumber` = `resmi`, dan `asal` = `Product Strategy v2.1` | Di repo ini `sumber` adalah kelas kepercayaan, dan asal-usul teks ada di `asal` |
| `pemilik` dan `diperiksa_pada` | `pemilik` = `tim`, `diperiksa_pada` kosong, `status_verifikasi` = `belum_diverifikasi` | Mengikuti berkas konten lain. Task hanya meminta nilai pengganti bila tidak ada kebiasaan |
| Tanda draf pada `deskripsi_singkat` | Kolom `status_teks` (`draf`, `disetujui`) | Repo belum punya kolom untuk status teks |
| `mulai`, `berakhir` | `mulai_pada`, `berakhir_pada`, ditambah `diubah_pada` | Konvensi kolom waktu |
| Batasan satu baris aktif | Kolom turunan `penanda_aktif`, bagian dari indeks unik | Bernilai NULL untuk status non-aktif, jadi status itu tidak saling melanggar |
| `prodi_impian` | Kolom sebenarnya `pengguna.prodi_tujuan`; `prodi_impian` adalah nama medan API | Tidak diubah |
| Perbarui aliran hapus akun dan ekspor | Hapus akun lewat `ON DELETE CASCADE`, dan fungsi `eksporDataV2` tanpa rute | Kedua aliran belum ada (bagian 3) |
| `butir_bukti.uraian` | Boleh kosong | Butir yang hanya berisi foto atau tautan harus bisa dibuat |
| Fungsi ubah butir bukti | Dua fungsi: isi, dan kaitan | `periksa-sql` hanya membaca 400 karakter, dan satu pernyataan besar melewatinya |
| `jalur_minat` di lapisan data | Hanya baca | Isinya ditulis benih |

Penghapusan butir bukti memakai `DELETE` sungguhan. Konvensi repo campuran: `kartu` dan `butir_pribadi` memakai tanda, sedangkan `event_sekolah` dan `modul` dihapus sungguhan. Data siswa di bawah umur mengikuti pola yang kedua.
