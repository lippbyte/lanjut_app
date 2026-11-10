# Kontrak data v2

**Task:** LANJUT_008 seri v2, Bagian 2. **Migrasi:** `030_model_data_v2.sql`.
**Keadaan:** tabel dan lapisan data sudah ada. Belum ada rute atau layar yang memakainya.

Tes: `tests/migrasi-model-data-v2.test.js`, `tests/model-data-v2.test.js`, `tests/benih-jalur-minat.test.js`. Hasil audit: `docs/audit-model-data-v2.md`.

## 1. Tabel

### `jalur_minat`: data referensi

Bukan milik pengguna. Dibenihkan dari `server/data-konten/jalur-minat.json`. Jangan tertukar dengan `jalur_seleksi` (K6).

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | `VARCHAR(64)` PK | `melanjutkan`, `bekerja`, `wirausaha` |
| `nama` | `VARCHAR(120)` | |
| `deskripsi_singkat` | `VARCHAR(255)` | Satu kalimat |
| `status_teks` | `ENUM('draf','disetujui')` | Bawaan `draf`. Yang masih draf tidak boleh ditampilkan ke siswa |
| `urutan` | `SMALLINT` | |
| `aktif` | `TINYINT(1)` | |
| `sumber`, `pemilik`, `status_verifikasi`, `asal`, `url_sumber`, `diperiksa_pada` | | Metadata konten seperti tabel konten lain. Isi `asal`: `Product Strategy v2.1` |

### `pengguna_jalur_minat`

Siswa boleh memiliki beberapa jalur. Berganti arah berarti mengubah status, dan barisnya tetap ada.

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | `CHAR(36)` PK | |
| `pengguna_id` | FK `pengguna` | Hapus berantai |
| `jalur_minat_id` | FK `jalur_minat` | Jalur yang masih dipilih tidak bisa dihapus |
| `status` | `ENUM('aktif','dijeda','selesai','ditinggalkan')` | |
| `mulai_pada` | `DATETIME` | |
| `berakhir_pada` | `DATETIME` NULL | Terisi hanya untuk `selesai` dan `ditinggalkan` |
| `diubah_pada` | `DATETIME` | |
| `penanda_aktif` | kolom turunan | 1 bila `aktif`, selain itu NULL |

**Batasan:** indeks unik `(pengguna_id, jalur_minat_id, penanda_aktif)`. Satu baris aktif per pasangan pengguna dan jalur, dan baris non-aktif boleh lebih dari satu.

### `tujuan`

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | `CHAR(36)` PK | |
| `pengguna_id` | FK `pengguna` | Hapus berantai |
| `jalur_minat_id` | FK `jalur_minat` NULL | Menjadi NULL bila jalurnya dihapus |
| `judul` | `VARCHAR(200)` | |
| `uraian` | `TEXT` NULL | |
| `target_pada` | `DATE` NULL | |
| `status` | `ENUM('aktif','tercapai','diubah','ditinggalkan')` | |
| `diubah_dari_id` | FK `tujuan` NULL | Tujuan sebelumnya, hanya milik akun yang sama. Tidak bisa diubah setelah dibuat |
| `dibuat_pada`, `diubah_pada` | `DATETIME` | |

Mengganti tujuan: buat tujuan baru dengan `diubahDariId`, lalu ubah status yang lama menjadi `diubah`.

`pengguna.prodi_tujuan` (medan API `prodi_impian`) tidak diubah. Bagian 4 yang memutuskan caranya menjadi salah satu bentuk tujuan.

### `butir_bukti`

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | `CHAR(36)` PK | |
| `pengguna_id` | FK `pengguna` | Hapus berantai |
| `jalur_minat_id` | FK `jalur_minat` NULL | |
| `tujuan_id` | FK `tujuan` NULL | Hanya milik akun yang sama. Menjadi NULL bila tujuannya dihapus |
| `judul` | `VARCHAR(200)` | |
| `uraian` | `TEXT` NULL | |
| `tautan` | `VARCHAR(500)` NULL | |
| `jenis` | `ENUM('karya','proses','refleksi')` | Daftar menunggu keputusan |
| `tanggal_karya` | `DATE` NULL | Kapan hal itu dikerjakan |
| `visibilitas` | `ENUM('privat')` | Bawaan `privat`. Tidak bisa diisi lewat lapisan data (K18) |
| `rujukan_jenis`, `rujukan_id` | `VARCHAR` NULL | Rujukan eksternal (K11). **Sengaja bukan foreign key dan sengaja tanpa indeks.** Harus terisi berpasangan |
| `dibuat_pada`, `diubah_pada` | `DATETIME` | |

Menghapus butir adalah `DELETE` sungguhan.

Bagian 9 cukup menambah nilai pada `ENUM` `visibilitas`, tanpa membentuk ulang tabel.

### `lampiran_butir_bukti`

Hanya metadata (K19).

| Kolom | Tipe | Catatan |
|---|---|---|
| `id` | `CHAR(36)` PK | |
| `butir_bukti_id` | FK `butir_bukti` | Hapus berantai |
| `jenis_berkas` | `VARCHAR(100)` | Mime |
| `ukuran_byte` | `INT UNSIGNED` | |
| `nama_tersimpan` | `VARCHAR(128)` unik | Dibuat server. **Jangan pernah memakai `nama_asli` sebagai jalur berkas** |
| `nama_asli` | `VARCHAR(255)` | Hanya untuk tampilan |
| `dibuat_pada` | `DATETIME` | |

### Foreign key

Semua foreign key tabel baru hanya menuju `pengguna`, `jalur_minat`, `tujuan`, atau `butir_bukti`. Tidak ada yang menuju tabel Level-In (K7).

## 2. Kontrak fungsi akses data

Semua fungsi menerima `penggunaId` dari pemanggil dan memeriksa pemilik di dalam SQL. Baris akun lain menghasilkan `null` atau `false`, sama dengan "tidak ditemukan". Id dan waktu dibuat pemanggil (`buatUuid`, `sekarangUntukDb`), seperti modul lain.

Pada fungsi `ubah`, medan bernilai `undefined` berarti tidak diubah, dan `null` berarti dikosongkan.

| Modul | Fungsi | Hasil |
|---|---|---|
| `modul/jalur-minat/jalur-minat.repo.js` | `daftarAktif()`, `ambil(id)` | Baris, atau `null` |
| `modul/jalur-minat/pengguna-jalur-minat.repo.js` | `daftarMilikSendiri`, `ambilMilikSendiri` | Baris, atau `null` |
| | `buat({id, penggunaId, jalurMinatId, waktu})` | `false` bila sudah ada baris aktif |
| | `ubahStatusMilikSendiri(penggunaId, id, status, waktu)` | `false` bila bukan milik sendiri, atau akan membuat dua baris aktif |
| | `hapusMilikSendiri(penggunaId, id)` | Hanya untuk baris yang salah dibuat |
| `modul/tujuan/tujuan.repo.js` | `daftarMilikSendiri`, `ambilMilikSendiri` | Baris, atau `null` |
| | `buat({id, penggunaId, jalurMinatId, judul, uraian, targetPada, status, diubahDariId, waktu})` | `false` bila `diubahDariId` milik akun lain |
| | `ubahMilikSendiri(penggunaId, id, {...})`, `hapusMilikSendiri(penggunaId, id)` | `false` bila bukan milik sendiri |
| `modul/butir-bukti/butir-bukti.repo.js` | `daftarMilikSendiri`, `ambilMilikSendiri` | Baris, atau `null` |
| | `buat({id, penggunaId, jalurMinatId, tujuanId, judul, uraian, tautan, jenis, tanggalKarya, rujukan, waktu})` | `false` bila `tujuanId` milik akun lain |
| | `ubahMilikSendiri(penggunaId, id, {judul, uraian, tautan, jenis, tanggalKarya, waktu})` | `false` bila bukan milik sendiri |
| | `ubahKaitanMilikSendiri(penggunaId, id, {jalurMinatId, tujuanId, rujukan, waktu})` | `false` bila bukan milik sendiri, atau `tujuanId` milik akun lain |
| | `hapusMilikSendiri(penggunaId, id)` | `false` bila bukan milik sendiri |
| `modul/butir-bukti/lampiran-butir-bukti.repo.js` | `daftarUntukButirMilikSendiri`, `daftarSemuaMilikSendiri`, `ambilMilikSendiri` | Baris, atau `null` |
| | `buat({id, penggunaId, butirBuktiId, jenisBerkas, ukuranByte, namaTersimpan, namaAsli, waktu})` | `false` bila butir milik akun lain |
| | `ubahNamaAsliMilikSendiri`, `hapusMilikSendiri` | `false` bila bukan milik sendiri |
| `modul/data-pengguna/data-pengguna.layanan.js` | `eksporDataV2(penggunaId)` | Empat tabel milik akun itu |

Medan `rujukan` berbentuk `{ jenis, id }`, atau `null`.

## 3. Hapus akun dan ekspor

Aplikasi belum punya fitur hapus akun maupun ekspor data (lihat audit, bagian 3).

- `DELETE FROM pengguna` membersihkan baris di keempat tabel lewat `ON DELETE CASCADE`.
- `eksporDataV2` sudah memuat keempat tabel, dan siap dipakai bila fitur ekspor dibuat.
- **Catatan untuk Bagian 3:** lampiran akan berupa berkas di disk. Penghapusan butir dan penghapusan akun kelak **juga harus menghapus berkasnya**. Hapus berantai di database tidak menyentuh disk, jadi `nama_tersimpan` harus dibaca sebelum barisnya dihapus.

## 4. Usulan batas lampiran untuk Bagian 3

Hanya usulan, belum menjadi aturan. Dasarnya kebiasaan Unggah modul.

| Hal | Usulan | Dasar |
|---|---|---|
| Ukuran per foto | 5 MB | Sama dengan `modul_ukuran_maks_byte` |
| Jumlah per butir | 3 foto | Cukup untuk bukti, tetap ringan |
| Jumlah per akun | 30 foto | Modul membatasi 10 per akun. Foto butuh lebih banyak, tetapi disk server terbatas |
| Jenis berkas | JPEG, PNG, WebP | Diperiksa dari isi berkas, bukan ekstensi, seperti pemeriksaan PDF |

Catatan rancangan untuk Bagian 3:

- Simpan di luar folder yang disajikan publik, dan sajikan hanya lewat rute yang memeriksa pemilik (K19).
- Tambah volume Docker untuk folder foto. `docker-compose.yml` hanya punya volume database, jadi tanpa volume foto hilang saat server dibangun ulang.
- Buang metadata EXIF saat foto diterima, karena foto dari ponsel bisa memuat lokasi, dan penggunanya siswa di bawah umur.
- Jangan menaruh batas foto di `konfigurasi_levelin` (K7).

## 5. Yang sengaja belum ada

- Rute HTTP dan layar aplikasi (Bagian 3 dan 4).
- Fitur berbagi dan nilai visibilitas selain `privat` (K18, Bagian 9).
- `ProjectRecord` (K17, Bagian 8).
- Kode unggah dan penyajian berkas (K19, Bagian 3).
- Pemindahan `prodi_tujuan` menjadi tujuan (Bagian 4).
- Fitur hapus akun dan ekspor data di aplikasi.
- Pendaftaran `jalur_minat` di `npm run verifikasi-konten` dan lembar review. Kolom verifikasinya sudah ada.
