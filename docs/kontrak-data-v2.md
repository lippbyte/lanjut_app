# Kontrak data v2

**Task:** LANJUT_008 seri v2, Bagian 2. Rute dan penyimpanan foto dari LANJUT_010, Bagian 3. Rute Jalur & Tujuan dari LANJUT_023, Bagian 5. **Migrasi:** `030_model_data_v2.sql`, `032_berkas_tertunda_hapus.sql`.
**Keadaan:** tabel, lapisan data, dan rute server sudah ada. Rute portofolio berada di balik saklar `PORTOFOLIO_AKTIF`, dan rute Jalur & Tujuan di balik `JALUR_TUJUAN_AKTIF`. Keduanya bawaannya mati.

Tes: `tests/migrasi-model-data-v2.test.js`, `tests/model-data-v2.test.js`, `tests/benih-jalur-minat.test.js`, `tests/portofolio.test.js`, `tests/portofolio-saklar.test.js`, `tests/foto-murni.test.js`, `tests/migrasi-berkas-tertunda.test.js`, `tests/jalur-tujuan.test.js`, `tests/jalur-tujuan-saklar.test.js`, `tests/jalur-tujuan-app.test.js`. Hasil audit: `docs/audit-model-data-v2.md`, `docs/audit-portofolio-server.md`.

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

`pengguna.prodi_tujuan` (medan API `prodi_impian`) tidak diubah dan tidak dipindah. Sejak LANJUT_023, `GET /api/v1/tujuan` menampilkannya sebagai salah satu tujuan dengan sumber Data Akun (bagian 5).

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
| | `akhiriAktifMilikSendiri(penggunaId, id, status, waktu)` | LANJUT_023. Hanya dari `aktif`. `false` bila bukan milik sendiri atau sudah tidak aktif |
| | `hapusMilikSendiri(penggunaId, id)` | Hanya untuk baris yang salah dibuat |
| `modul/tujuan/tujuan.repo.js` | `daftarMilikSendiri`, `ambilMilikSendiri` | Baris, atau `null` |
| | `buat({id, penggunaId, jalurMinatId, judul, uraian, targetPada, status, diubahDariId, waktu})` | `false` bila `diubahDariId` milik akun lain |
| | `ubahMilikSendiri(penggunaId, id, {...})`, `hapusMilikSendiri(penggunaId, id)` | `false` bila bukan milik sendiri |
| | `buatVersiMilikSendiri(penggunaId, idLama, {id, jalurMinatId, judul, uraian, targetPada, waktu})` | LANJUT_023. Satu transaksi: versi baru, lalu versi lama menjadi `diubah`. `'ok'`, `'tidak_ada'`, atau `'bukan_terkini'` |
| | `akhiriMilikSendiri(penggunaId, id, status, waktu)` | LANJUT_023. Hanya dari `aktif`. `false` bila tidak berlaku |
| `modul/butir-bukti/butir-bukti.repo.js` | `daftarMilikSendiri`, `ambilMilikSendiri` | Baris, atau `null` |
| | `buat({id, penggunaId, jalurMinatId, tujuanId, judul, uraian, tautan, jenis, tanggalKarya, rujukan, waktu})` | `false` bila `tujuanId` milik akun lain |
| | `ubahMilikSendiri(penggunaId, id, {judul, uraian, tautan, jenis, tanggalKarya, waktu})` | `false` bila bukan milik sendiri |
| | `ubahKaitanMilikSendiri(penggunaId, id, {jalurMinatId, tujuanId, rujukan, waktu})` | `false` bila bukan milik sendiri, atau `tujuanId` milik akun lain |
| | `hapusMilikSendiri(penggunaId, id)` | `false` bila bukan milik sendiri |
| `modul/butir-bukti/lampiran-butir-bukti.repo.js` | `daftarUntukButirMilikSendiri`, `daftarSemuaMilikSendiri`, `ambilMilikSendiri` | Baris, atau `null` |
| | `buat({id, penggunaId, butirBuktiId, jenisBerkas, ukuranByte, namaTersimpan, namaAsli, waktu})` | `false` bila butir milik akun lain |
| | `buatDenganBatas({..., batasPerButir, batasPerAkun})` | `'ok'`, `'butir_tidak_ada'`, `'batas_butir'`, atau `'batas_akun'` |
| | `ubahNamaAsliMilikSendiri`, `hapusMilikSendiri` | `false` bila bukan milik sendiri |
| `modul/data-pengguna/data-pengguna.layanan.js` | `eksporDataV2(penggunaId)` | Empat tabel milik akun itu |
| | `eksporSemua(penggunaId)` | Seluruh data milik akun, lihat bagian 3 |
| | `kirimKodeHapus(penggunaId)`, `hapusAkun(penggunaId, {kata_sandi, kode_email})` | Lihat bagian 3 |
| `modul/data-pengguna/berkas-pengguna.js` | `hapusBerkasPengguna(penggunaId)`, `daftarkanPenyediaBerkas({nama, hapus})` | `{berhasil, gagal}` |

Medan `rujukan` berbentuk `{ jenis, id }`, atau `null`.

## 3. Hapus akun dan ekspor

Daftar lengkap tempat data pengguna ada di `docs/audit-hapus-akun-ekspor.md`. Semua rute di bawah wajib masuk, dan dibatasi 10 permintaan per 15 menit per akun.

| Rute | Badan | Hasil |
|---|---|---|
| `GET /api/v1/pengguna/saya/ekspor` | | Satu JSON berisi data akun sendiri |
| `POST /api/v1/pengguna/saya/hapus/kirim-kode` | | Mengirim kode `hapus_akun` ke email terverifikasi |
| `DELETE /api/v1/pengguna/saya` | `penegasan` = `HAPUS AKUN SAYA`, ditambah tepat satu dari `kata_sandi` atau `kode_email` | `{ dihapus: true }` |

**Hapus akun.** Id akun selalu diambil dari sesi. Urutannya:

1. Konfirmasi identitas. Tanpa penegasan atau konfirmasi: 400. Kata sandi salah: 401, dan tercatat di `percobaan_masuk`.
2. Satu transaksi: `percobaan_masuk`, `kode_otp_email`, `pendaftaran_tertunda`, lalu baris `pengguna`. Tabel lain ikut lewat `ON DELETE CASCADE`, termasuk sesi.
3. Setelah transaksi berhasil: `hapusBerkasPengguna`, lalu perapian indeks FULLTEXT bila akunnya punya modul.

Penghapusan berlaku seketika dan tidak bisa dibatalkan.

**`hapusBerkasPengguna`.** Penyedianya saat ini satu, yaitu foto butir bukti (bagian 4). Fungsi ini berjalan sesudah barisnya hilang, jadi setiap penyedia harus bisa menemukan berkas dari `penggunaId` saja. Kegagalan tidak membatalkan penghapusan akun, dan dicatat di log server dengan kata kunci `[hapus-berkas-gagal]` beserta ID akun dan nama penyedia.

**Ekspor: yang disertakan.** `pengguna`, `percobaan_masuk`, `sesi_pengguna`, `kemajuan`, `butir_pribadi`, `kartu` milik sendiri, `sesi_latihan`, `riwayat_latihan`, `persetujuan`, `modul`, `event_sekolah`, `pengguna_jalur_minat`, `tujuan`, `butir_bukti`, `lampiran_butir_bukti`. Baris yang dihapus lunak ikut, karena masih tersimpan. Nama medan mengikuti nama kolom. Foto ikut sebagai data lampirannya saja, isi berkas fotonya tidak ada di ekspor.

**Ekspor: yang sengaja dikecualikan.**

| Data | Alasan |
|---|---|
| `kata_sandi_hash`, `token_hash`, `kode_hash` | Rahasia |
| `pengguna.disetel_ulang_oleh` | ID akun tim, bukan data siswa |
| `potongan_modul` | Isinya sama dengan `modul.isi` |
| `kode_otp_email`, `pendaftaran_tertunda` | Berisi rahasia dan hilang sendiri dalam 24 jam |
| Kartu kurasi tim, konten umum | Bukan milik akun |

**Batas ekspor.** 20.000 baris per tabel dan 30 MB. Data yang melewatinya ditolak utuh dengan `EKSPOR_TERLALU_BESAR`, tidak pernah dipotong diam-diam. Permintaan seperti itu dilayani manual oleh tim. Data siswa biasa jauh di bawah batas: modul paling besar 10 × 200.000 karakter.

## 4. Portofolio & Bukti (LANJUT_010)

Hasil audit dan langkah Dokploy: `docs/audit-portofolio-server.md`.

**Saklar.** `PORTOFOLIO_AKTIF` bawaannya mati. Saat mati, semua rute di bawah menjawab sama persis dengan jalur yang tidak ada. Saat menyala, `DIREKTORI_BERKAS` wajib berupa jalur lengkap yang bisa ditulis, di luar `dist` dan `public`. Bila tidak, server menolak berjalan.

**Gerbang semua rute.** 401 bila belum masuk, lalu 403 `AI_BELUM_DIIZINKAN` bila kebijakan privasi belum diterima. Butir atau foto akun lain, dan id yang bukan UUID, menjawab 404.

| Rute (`/api/v1/butir-bukti`) | Badan | Hasil |
|---|---|---|
| `GET /` | | Daftar butir sendiri, masing-masing dengan `foto` |
| `POST /` | Medan butir | 201, satu butir |
| `GET /:id` | | Satu butir |
| `PATCH /:id` | Medan butir, sebagian | Satu butir. Medan yang tidak dikirim tidak berubah, `null` mengosongkan |
| `DELETE /:id` | | `{ dihapus: true }`. Lampiran dan berkasnya ikut hilang |
| `POST /:id/foto` | Multipart, satu berkas di medan `foto` | 201, data foto |
| `GET /:id/foto/:fotoId` | | Isi foto |
| `DELETE /:id/foto/:fotoId` | | `{ dihapus: true }` |

Tidak ada rute berbagi, tidak ada alamat publik untuk foto, dan tidak ada rute yang menerima baris `pengguna_jalur_minat`.

**Medan butir.**

| Medan | Aturan |
|---|---|
| `judul` | Wajib saat membuat, 1 sampai 200 karakter |
| `jenis` | Wajib saat membuat: `karya`, `proses`, atau `refleksi` |
| `uraian` | Paling panjang 5000 karakter |
| `tautan` | Hanya `http` dan `https`, paling panjang 500 karakter |
| `tanggal_karya` | `YYYY-MM-DD` yang sah |
| `jalur_minat_id` | Id `jalur_minat` yang ada dan aktif. `jalur_minat` adalah data bersama, jadi jalur mana pun yang aktif boleh dipakai. Selain itu 400 |
| `tujuan_id` | Tujuan milik akun sendiri. Selain itu 400 |

`uraian` dan `tautan` yang kosong disimpan sebagai `NULL`. Medan lain dibuang: `visibilitas` selalu `privat` (K18), dan `rujukan_jenis` serta `rujukan_id` tidak bisa diisi klien. Respons tidak memuat `nama_tersimpan` maupun `rujukan_*`.

**Batas foto (K20).** Diperiksa di server. Batas jumlah diperiksa dalam transaksi dengan baris `pengguna` terkunci, jadi unggahan serentak tidak bisa melewatinya.

| Hal | Batas | Galat |
|---|---|---|
| Ukuran berkas yang dikirim | 5 MB | 413 `FOTO_TERLALU_BESAR` |
| Jumlah per butir | 3 | 409 `BATAS_FOTO_BUTIR` |
| Jumlah per akun | 30 | 409 `BATAS_FOTO_AKUN` |
| Jenis | JPEG, PNG, WebP, dikenali dari isi berkas | 415 `FOTO_JENIS_DITOLAK` |
| HEIC dan HEIF | Ditolak dengan pesan agar diubah dulu | 415 `FOTO_HEIC_DITOLAK` |
| WebP animasi, AVIF | Ditolak | 415 `FOTO_JENIS_DITOLAK` |
| Struktur gambar tidak utuh | Ditolak | 422 `FOTO_RUSAK` |
| Laju unggah | 20 permintaan per 15 menit per akun | 429 `TERLALU_SERING` |

Batas ini ada di kode, bukan di `konfigurasi_levelin` (K7).

**Metadata.** Sebelum disimpan, `foto-murni.js` menyalin hanya bagian yang dibutuhkan untuk menampilkan gambar. EXIF, GPS, XMP, IPTC, komentar, gambar kecil, dan data sesudah akhir gambar tidak ikut. Dari EXIF hanya arah putar yang dipertahankan, supaya foto dari HP tidak tampil miring. `ukuran_byte` adalah ukuran sesudah dibersihkan.

**Penyajian.** Hanya untuk pemilik, dengan `Content-Type` tersimpan, `X-Content-Type-Options: nosniff`, dan `Cache-Control: private, no-store`.

**Penyimpanan.** `<DIREKTORI_BERKAS>/foto-butir-bukti/<sidik akun>/<uuid>.<jpg|png|webp>`. Sidik akun adalah 32 karakter awal SHA-256 dari id akun. Nama dibuat server. `nama_asli` hanya untuk tampilan. Di Dokploy foldernya adalah volume `lanjut_berkas` yang terpasang di `/data/berkas`.

**Penghapusan.** Barisnya dihapus dulu, lalu berkasnya. Hapus foto, hapus butir, dan hapus akun semuanya menghapus berkas. Kegagalan tidak menggagalkan permintaan siswa, ditulis ke log dengan kata kunci `[hapus-berkas-gagal]`, dan dicatat di `berkas_tertunda_hapus`.

| Kolom `berkas_tertunda_hapus` | Isi |
|---|---|
| `id` | UUID |
| `nama_tersimpan` | `<sidik akun>/<nama berkas>`, unik. Tidak memuat ID akun |
| `alasan` | `hapus_foto`, `hapus_butir`, `hapus_akun`, `unggah_ditolak`, atau `unggah_gagal`, ditambah kode galat |
| `dicatat_pada` | Waktu kegagalan terakhir |
| `jumlah_percobaan` | Bertambah setiap kali `bersihkan-berkas` gagal |

Satu berkas memakai satu baris. Bila gagal lagi, alasan dan waktunya diperbarui.

`npm run bersihkan-berkas` mencoba ulang yang tertunda. `--cek` hanya melaporkan. Berkas yatim, yaitu ada di disk tetapi tidak ada di basis data, dilaporkan dan tidak pernah dihapus otomatis.

**Butir bermakna.** Butir yang uraiannya minimal 30 karakter sesudah spasi di tepi dibuang, atau punya minimal satu foto. Tautan saja tidak cukup (LANJUT_011, keputusan Khalifa): tautan hanya terhitung bila disertai uraian yang memenuhi 30 karakter.

`npm run metrik-portofolio` hanya membaca. Keluarannya jumlah siswa dengan minimal satu butir bermakna yang dibuat dalam jendela waktu. Pilihan: `--hari=14`, `--kecualikan=id,id` untuk akun uji, dan `--daftar` untuk menampilkan ID akun.

**Volume dan cadangan.** Langkah pemasangan volume di Dokploy ada di audit bagian 4. Foto tidak ikut cadangan database, jadi volumenya perlu dicadangkan tersendiri.

## 5. Jalur & Tujuan Saya (LANJUT_023)

Untuk lingkungan dev. Teks layar dan teks jalur masih draf (`docs/draf-teks-jalur-tujuan.md`). Tidak ada migrasi baru: semua kolom yang dibutuhkan sudah ada di `030_model_data_v2.sql`.

**Saklar.** `JALUR_TUJUAN_AKTIF` di server dan `EXPO_PUBLIC_JALUR_TUJUAN` di aplikasi, bawaannya mati. Saat mati, semua rute di bawah menjawab sama persis dengan jalur yang tidak ada, dan berkas layar tidak masuk bundel aplikasi.

**Gerbang semua rute.** Sama dengan Portofolio: 401 bila belum masuk, lalu 403 `AI_BELUM_DIIZINKAN` bila kebijakan privasi belum diterima. Data akun lain, dan id yang bukan UUID, menjawab 404. Pemilik selalu diperiksa di dalam SQL.

**Riwayat tidak pernah hilang.** Tidak ada rute hapus. Setiap baris `pengguna_jalur_minat` adalah satu babak: dimulai saat jalur dipilih, berakhir saat dijeda, selesai, atau ditinggalkan. Babak yang berakhir tidak diubah lagi, dan memilih jalur itu lagi membuat babak baru. Memperbarui tujuan membuat versi baru lewat `diubah_dari_id`, dan versi lama menjadi `diubah` tanpa isinya berubah.

| Rute (`/api/v1/jalur-minat`) | Badan | Hasil |
|---|---|---|
| `GET /` | | Jalur aktif: `id`, `nama`, `deskripsi_singkat`, `status_teks`, `urutan`. Jalur draf ikut, dengan `status_teks: draf` |
| `GET /saya` | | Semua babak milik sendiri, lama ke baru |
| `POST /saya` | `jalur_minat_id` | 201, babak baru. 409 `JALUR_SUDAH_DIPILIH` bila jalur itu sudah aktif |
| `PATCH /saya/:id` | `status`: `dijeda`, `selesai`, atau `ditinggalkan` | Babak yang diakhiri. 409 `PILIHAN_SUDAH_BERAKHIR` bila sudah tidak aktif |

| Rute (`/api/v1/tujuan`) | Badan | Hasil |
|---|---|---|
| `GET /` | | `{ tujuan, prodi_impian }`. `tujuan`: versi terkini dengan `jumlah_versi`. `prodi_impian`: `{ prodi_id, nama, sumber: 'data_akun' }` atau `null` |
| `POST /` | `judul`, `uraian`, `target_pada`, `jalur_minat_id` | 201, tujuan baru |
| `GET /perjalanan` | | Peristiwa jalur dan tujuan, lama ke baru |
| `GET /:id/riwayat` | | Semua versi satu tujuan, lama ke baru |
| `POST /:id/versi` | Medan tujuan, sebagian | 201, versi baru. Medan yang tidak dikirim disalin, `null` mengosongkan. 409 `TUJUAN_BUKAN_TERKINI` dari versi lama atau tujuan yang sudah berakhir. 400 bila tidak ada perubahan |
| `PATCH /:id/status` | `status`: `tercapai` atau `ditinggalkan` | Hanya dari `aktif`, selain itu 409 `TUJUAN_BUKAN_TERKINI` |
| `PATCH /bukti/:butirId` | `jalur_minat_id`, `tujuan_id` | Menautkan butir bukti milik sendiri. Tujuan akun lain: 400 |

**Medan tujuan.** `judul` 1 sampai 200 karakter, wajib saat membuat. `uraian` paling panjang 2000 karakter, kosong menjadi `NULL`. `target_pada` `YYYY-MM-DD` yang sah. `jalur_minat_id` jalur yang ada dan aktif. Medan lain, termasuk `status`, `diubah_dari_id`, dan `pengguna_id`, dibuang.

**Peristiwa perjalanan.** `jalur_dipilih`, `jalur_dijeda`, `jalur_selesai`, `jalur_ditinggalkan`, `tujuan_dibuat`, `tujuan_diperbarui`, `tujuan_tercapai`, `tujuan_ditinggalkan`. Versi baru selalu sesudah induknya, walau dibuat pada detik yang sama.

**Ekspor dan hapus akun.** Tidak berubah: ekspor sudah memuat semua baris `pengguna_jalur_minat` dan `tujuan`, termasuk babak yang berakhir dan versi lama, dan hapus akun menghapus keduanya lewat `ON DELETE CASCADE`.

## 6. Yang sengaja belum ada

- Fitur berbagi dan nilai visibilitas selain `privat` (K18, Bagian 9).
- `ProjectRecord` (K17, Bagian 8).
- Pemindahan `prodi_tujuan` menjadi baris `tujuan` (Bagian 4). Sejak LANJUT_023 hanya ditampilkan, tidak dipindah.
- Persetujuan teks Jalur & Tujuan, dan saklarnya di lingkungan mana pun selain dev.
- Pendaftaran `jalur_minat` di `npm run verifikasi-konten` dan lembar review. Kolom verifikasinya sudah ada.
