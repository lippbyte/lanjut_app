# LANJUT — Server (Fondasi Backend)

Backend Express + MySQL untuk LANJUT. Dirancang di
`docs/SDD-Backend-Foundation.md` — baca dokumen itu untuk alasan tiap
keputusan. Berkas ini hanya menjelaskan **cara menjalankan**.

Status implementasi & batasan yang perlu diketahui ada di bagian
["Status & yang belum selesai"](#status--yang-belum-selesai) di bawah.

## Dependensi

8 sesuai §2.1 SDD: `express`, `mysql2`, `bcryptjs`, `zod`,
`express-rate-limit`, `helmet`, `cors`, `dotenv`. Ditambah 2 di LANJUT_049
untuk unggah modul: `multer` (menerima berkas) dan `pdfjs-dist` (ekstraksi
teks PDF, dipin 4.10.38). Alasannya ada di bagian 2c. Jangan menambah
dependensi baru tanpa mencatat alasannya di sini.

**Audit keamanan (LANJUT_050, 3 Oktober 2026):** `npm audit` = 0 kerentanan,
baik penuh maupun `--omit=dev`. Tiga temuan sedang (`qs` < 6.16.0, lewat
`express` dan `body-parser`) diperbaiki dengan naik patch: express 4.22.3,
body-parser 1.20.8, qs 6.16.0. Tanpa `overrides`, tanpa kenaikan mayor.
Jalankan `npm audit` lagi sebelum setiap deploy.

## 1. Menyiapkan lingkungan

Butuh **Node.js 20+** dan **MySQL 8** yang menyala (lokal, atau layanan
staging/produksi apa pun — konfigurasi di bawah tidak mengasumsikan satu
penyedia hosting tertentu, sesuai keputusan PM).

```bash
cd server
npm install
```

Buat basis data kosong (nama bebas, cocokkan dengan `.env`):

```sql
CREATE DATABASE lanjut CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Salin `.env.example` menjadi `.env` dan isi nilainya:

```bash
cp .env.example .env
```

| Variabel | Contoh (lokal) | Keterangan |
|---|---|---|
| `PORT` | `3000` | Port HTTP server |
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `DB_HOST` | `127.0.0.1` | Host MySQL |
| `DB_PORT` | `3306` | Port MySQL |
| `DB_USER` | `root` | — |
| `DB_PASSWORD` | (kosong bila tanpa sandi) | — |
| `DB_NAME` | `lanjut` | Basis data yang sudah dibuat di atas |
| `ASAL_DIIZINKAN` | `http://localhost:5500` | CORS, dipisah koma, **tidak pernah** `*` |
| `SESI_UMUR_HARI` | `90` | Umur sesi login, bergulir (§5.3) |
| `JUMLAH_PROXY` | (kosong) | Opsional. Jumlah reverse proxy di depan server — lihat bagian **Deployment** |

Server **menolak menyala** (gagal cepat) bila salah satu variabel wajib
kosong — pesan galatnya menyebutkan variabel mana yang kurang.

## 2. Migrasi & benih

```bash
npm run migrasi   # menjalankan server/src/db/migrasi/001..006 yang belum jalan
npm run benih     # mengisi konten dari MVP-PWA/data/*.json (idempoten, aman diulang)
```

Migrasi dicatat di tabel `_migrasi` — hanya berkas yang belum pernah
dijalankan yang dieksekusi. Migrasi **tidak pernah** disunting setelah
dijalankan di server tayang; perbaikan selalu berkas baru bernomor lebih
tinggi (§3.6).

Benih membaca `MVP-PWA/data/*.json` langsung (tidak menyalin isinya ke SQL) dan
memakai `INSERT ... ON DUPLICATE KEY UPDATE` — aman dijalankan berkali-kali.

**Benih aman dijalankan ulang kapan saja — tanda "sudah dicek" tidak hilang
selama isinya tidak berubah** (LANJUT_011, LANJUT_020). `status_verifikasi`
dan `diperiksa_pada` hanya diisi dari JSON saat baris **baru** dimasukkan
(biasanya "belum diverifikasi"). Untuk baris yang sudah ada:

- **Isi di JSON sama dengan di basis data** → tanda yang dibuat lewat
  `npm run verifikasi-konten` (bagian 2a) tetap ada.
- **Ada isi yang berubah** (judul, tanggal, teks, sumber, urutan, atau kolom
  konten lain) → benih menulis isi baru **dan mengembalikan tanda ke "belum
  diverifikasi"**. Tanda lama berlaku untuk isi lama; isi baru harus dicek dan
  ditandai ulang. Tanpa ini, tanggal yang baru diubah akan tetap tampil
  sebagai "sudah dicek" padahal belum pernah dicek.

Jadi urutan kerja yang benar selalu: ubah JSON → `npm run benih` → cek ke
sumber resmi → `npm run verifikasi-konten`.

Akibatnya, mengubah `status_verifikasi`/`diperiksa_pada` di berkas JSON
**tidak** berpengaruh ke baris yang sudah ada. Untuk menandai atau
membatalkan tanda, selalu pakai `npm run verifikasi-konten`. Sejak LANJUT_043
aturan ini juga berlaku untuk kartu kurasi Arsip/Latihan (`arsip.json`);
dulu benih selalu mengembalikannya ke "belum diverifikasi".

## 2a. Menandai konten sudah dicek (untuk tim konten)

Konten di aplikasi (jadwal Linimasa, Khusus SMK, dan lainnya) baru dianggap
"sudah dicek" setelah ditandai. Contoh: jadwal di Beranda **tidak tampil sama
sekali** sampai jadwal itu ditandai sudah dicek ke laman resmi SNPMB.

Alat ini **hanya mengubah tanda "sudah dicek"** dan tanggal pengecekannya.
Isi konten (judul, tanggal, teks) tidak bisa berubah, dan tidak ada yang
terhapus. Memutuskan konten mana yang benar tetap tugas tim konten: tandai
hanya konten yang sudah kamu cocokkan dengan sumber resminya.

**Lembar review.** Daftar lengkap yang perlu dicek beserta isinya, sumbernya,
dan kolom catatan ada di
[`docs/verifikasi/lembar-review-konten.md`](../../docs/verifikasi/lembar-review-konten.md).
Buat ulang lembar itu dari basis data kapan saja dengan `npm run lembar-review`
(hanya membaca, tidak mengubah apa pun). Bagian "Standar pemeriksaan" di awal
lembar (sumber apa yang dihitung resmi) masih **DRAF**, menunggu persetujuan
Khalifa (LANJUT_046).

**Lembar review draf teks** (LANJUT_046). Semua teks app yang masih DRAF di
`docs/salinan-teks-lanjut.md` dikumpulkan di
[`docs/lembar-review-draf-teks.md`](../../docs/lembar-review-draf-teks.md),
dikelompokkan per layar, dengan kotak Setuju / Ubah / Tolak. Buat ulang dengan
`npm run lembar-review-teks`. Perintah ini hanya membaca berkas salinan teks
dan tidak butuh basis data.

### Sebelum mulai (sekali saja)

Minta orang teknis memastikan komputermu sudah bisa menjalankan server
(bagian 1 di atas: Node.js terpasang, `npm install` sudah dijalankan, dan
berkas `.env` sudah diisi). Tanyakan juga: `.env` itu terhubung ke basis data
**mana** — basis data uji atau basis data yang dipakai aplikasi sungguhan.
Alat ini mengubah basis data yang tertulis di `.env`.

### Langkah demi langkah

1. **Buka terminal.** Di Windows: tekan tombol Windows, ketik `PowerShell`,
   tekan Enter. Di Mac: buka aplikasi **Terminal**.
2. **Masuk ke folder server.** Ketik `cd`, spasi, lalu seret folder
   `LANJUT_App/server` ke jendela terminal, lalu tekan Enter. Contoh hasilnya:
   ```
   cd "D:\EDILAKSO-LANJUT-repo\LANJUT_App\server"
   ```
3. **Lihat apa saja yang belum dicek:**
   ```
   npm run verifikasi-konten -- --list
   ```
   Hasilnya dikelompokkan per jenis konten. Kolom pertama adalah **ID**, yang
   dipakai di langkah berikutnya:
   ```
   == Linimasa (Beranda)  (--jenis=linimasa)  5 belum terverifikasi
      daftar-akun-tka              Pendaftaran akun TKA  [asal: mockup]
      daftar-snbp                  Pendaftaran SNBP  [asal: mockup]
      ...
   ```
   Hanya ingin melihat satu jenis? Tambahkan `--jenis=`, misalnya
   `npm run verifikasi-konten -- --list --jenis=linimasa`.
4. **Periksa dulu apa yang akan ditandai.** Isi jenis, ID, dan namamu:
   ```
   npm run verifikasi-konten -- --jenis=linimasa --id=daftar-snbp --oleh="Nama Kamu"
   ```
   Tanpa `--ya` **belum ada yang diubah**. Skrip hanya menampilkan pratinjau
   lalu berhenti:
   ```
   [pratinjau] linimasa/daftar-snbp "Pendaftaran SNBP" → akan TERVERIFIKASI (dicek 2026-09-27)
   [verifikasi] Belum ada yang diubah. Periksa daftar di atas, lalu ulangi perintah yang sama dengan --ya ...
   ```
5. **Tandai.** Kalau pratinjaunya benar, ulangi perintah yang sama dengan
   `--ya` di akhir:
   ```
   npm run verifikasi-konten -- --jenis=linimasa --id=daftar-snbp --oleh="Nama Kamu" --ya
   ```
   Kalau berhasil, muncul baris seperti ini:
   ```
   [verifikasi] linimasa/daftar-snbp "Pendaftaran SNBP" → TERVERIFIKASI (dicek 2026-09-27)
   ```
   Jadwal itu langsung tampil di Beranda aplikasi (muat ulang aplikasinya).

### Pilihan lain

| Kebutuhan | Tambahkan | Contoh |
|---|---|---|
| Menandai beberapa sekaligus | pisahkan ID dengan koma, tanpa spasi | `--id=daftar-snbp,pdss` |
| Tanggal cek bukan hari ini | `--tanggal=TAHUN-BULAN-TANGGAL` | `--tanggal=2026-09-25` |
| Salah tandai, mau dibatalkan | `--batal` (juga wajib `--ya`) | `npm run verifikasi-konten -- --jenis=linimasa --id=daftar-snbp --batal --ya` |

Semua perubahan, termasuk `--batal`, baru terjadi kalau ada `--ya`. Hanya
`--ya` persis seperti itu yang dihitung; `--ya=ya` dan sejenisnya tidak.

Jenis yang tersedia: `linimasa`, `khusus-smk`, `checklist`, `prodi`, `mapel`,
`cerita-alumni`, `eksplorasi-tujuan`, `kartu`.

`kartu` (LANJUT_043) = kartu kurasi tim di Arsip Belajar/Latihan (`arsip.json`,
mis. `--id=k-mtk-1`). Kartu buatan siswa tidak pernah bisa ditandai: ID-nya
dianggap "tidak ditemukan". Kartu kurasi baru dikirim ke aplikasi setelah
ditandai (LANJUT_040).

`eksplorasi-tujuan` (F10, LANJUT_031) = satu profil prodi utuh per ID (ID =
id prodi, mis. `--id=k3`): peminat, mata kuliah, profesi, dan kampus dicek
bersama. Profil baru tampil di layar Eksplorasi Tujuan setelah ditandai.
Label "Terverifikasi"/"Perkiraan" per kelompok di `profil-prodi.json`
(`status_sumber`) tetap tampil apa adanya; tanda dari skrip ini yang
menentukan profil boleh tampil atau tidak. Status di kepala berkas
(`terverifikasi_sebagian`, 31 Agu 2026) **tidak** dianggap tanda — itu
tanggal riset disusun, jadi semua profil mulai sebagai belum terverifikasi.

### Kalau muncul pesan galat

- **"Belum ada yang diubah ... ulangi perintah yang sama dengan --ya"** —
  bukan galat. Ini pratinjau (langkah 4); tambahkan `--ya` bila daftarnya benar.
- **"ID tidak ditemukan"** — ada ID yang salah ketik. **Tidak ada yang
  diubah**, termasuk ID lain yang benar di perintah yang sama. Salin ID dari
  hasil `--list`, lalu ulangi.
- **"Jenis ... tidak dikenal"** / **"Argumen ... tidak dikenal"** — periksa
  ejaan; pesan galatnya menyebutkan pilihan yang benar.
- **"Tanggal ... tidak valid"** — tulis tanggal dengan format `2026-09-27`.
- **Galat lain soal koneksi / basis data** — server basis data belum jalan
  atau `.env` belum benar. Hubungi orang teknis.

### Catatan untuk orang teknis

- Skrip: `src/db/verifikasi/verifikasi-konten.js`. Yang diubah hanya
  `status_verifikasi` (`terverifikasi` / `belum_diverifikasi`) dan
  `diperiksa_pada` (DATE; bawaannya tanggal hari ini menurut UTC). Semua ID
  diperiksa dalam satu transaksi. Tanpa `--ya` (`konfirmasi: true` di
  `ubahStatus`) transaksi di-rollback dan dilempar `PerluKonfirmasi` berisi
  pratinjau (LANJUT_043).
- `pemilik` **tidak** diubah: artinya kelas kurator (`tim` / nama mitra), bukan
  nama verifikator. Nama dari `--oleh` hanya dicatat ke
  `verifikasi-konten.log` di folder ini (diabaikan git, jadi hanya ada di
  komputer yang menjalankan skrip). Belum ada kolom basis data untuk
  menyimpan siapa verifikatornya.
- `kartu`: tabelnya juga berisi kartu buatan pengguna, jadi jenis ini memakai
  varian SQL statis tersendiri (`*Kurasi`) yang selalu menyaring
  `sumber = 'resmi' AND dihapus_pada IS NULL`, termasuk di `UPDATE`-nya.
- `npm run lembar-review` (`src/db/verifikasi/lembar-review.js`) menyusun
  lembar review Markdown dari basis data (SELECT saja) + `MVP-PWA/data/`.
  Bawaannya ditulis ke `docs/verifikasi/lembar-review-konten.md`;
  `--keluar=berkas.md` untuk lokasi lain. Bagian "Standar pemeriksaan" ditulis
  dari `STANDAR_PEMERIKSAAN` di berkas yang sama, jadi tidak hilang saat
  lembar dibuat ulang.
- `npm run lembar-review-teks` (`tools/lembar-review-teks.js`, LANJUT_046)
  membaca blok DRAF di `docs/salinan-teks-lanjut.md` dan menulis
  `docs/lembar-review-draf-teks.md`. Bunyi teks disalin persis. Letak di app,
  pembaca, dan klaim faktual dicatat di `PETA` di berkas itu; butir DRAF baru
  yang belum dipetakan tetap masuk lembar, di bagian "Belum dipetakan".
  Tes: `tests/lembar-review-teks.test.js` (tanpa basis data).

## 2b. Persetujuan orang tua/wali & gerbang AI (LANJUT_047)

Pengguna LANJUT banyak yang di bawah 18 tahun. Untuk data anak (UU PDP Pasal
25), persetujuan harus datang dari orang tua/wali, bukan dari centang di app.

### Aturan wajib untuk setiap endpoint AI di masa depan

> **Setiap endpoint yang mengirim data pengguna ke penyedia AI WAJIB memanggil
> `bolehPakaiAi(req.pengguna.id)` di server, sebelum mengirim apa pun, dan
> menolak bila hasilnya `false`.** Jangan mengandalkan app (layar, tombol,
> atau `boleh_pakai_ai` dari `GET /persetujuan/saya`), karena itu hanya
> tampilan dan bisa dilewati.

`bolehPakaiAi` (`src/modul/persetujuan/persetujuan.layanan.js`) adalah
satu-satunya penentu. Hasilnya `true` hanya kalau:

1. catatan `ortu_wali` terakhir akun itu `setuju` (tidak dicabut) dengan
   versi ≥ `persetujuan_versi_min_ortu`, **dan**
2. catatan `kebijakan_privasi` terakhir `setuju` dengan versi ≥
   `persetujuan_versi_kebijakan`.

Gagal-tertutup: konfigurasi hilang atau tidak sah → `false`. Endpoint AI
pertama, `POST /ngobrol` (LANJUT_051), memanggilnya sebelum apa pun dikirim
ke OpenRouter; lihat bagian 2d.

### Data

- Tabel `persetujuan` (migrasi 012): `id` (urutan), `pengguna_id`, `jenis`
  (`kebijakan_privasi` / `ortu_wali`), `versi`, `status` (`setuju` / `cabut`),
  `sumber` (`mandiri` / `surat_sekolah` / `admin`), `catatan` (mis. nomor
  surat), `dicatat_pada`. **Riwayat tidak ditimpa**: setuju baru dan pencabutan
  sama-sama baris baru; status berlaku = baris terakhir per jenis. Repo hanya
  membaca dan menambah.
- Konfigurasi di tabel `konfigurasi_levelin` (tabel konfigurasi yang sudah
  ada), kunci `persetujuan_versi_kebijakan` dan `persetujuan_versi_min_ortu`,
  diisi migrasi 012. Endpoint publik `/konfigurasi/levelin` hanya mengirim
  kunci Level-In.
- **Menaikkan versi kebijakan:** ubah `versi` dan teks di
  `LANJUT_App/lib/kebijakan-privasi.json`, jalankan `npm run dokumen-kebijakan`,
  lalu buat migrasi baru yang menaikkan `persetujuan_versi_kebijakan`
  (dan `persetujuan_versi_min_ortu` bila orang tua/wali perlu menyetujui ulang).
  Tes menolak bila versi di app berbeda dari konfigurasi.
- **Terima ulang (LANJUT_048).** Begitu versi berlaku naik, semua akun yang
  menerima versi lama melihat jendela kebijakan lagi setelah login (sekali
  per sesi, sesudah gerbang kelas & jenis sekolah), dan Data Akun
  menampilkan "Perlu diterima ulang". App hanya mengirim versi TEKS yang ia
  tampilkan; selama app yang terpasang masih membawa teks lama, jendela hanya
  meminta memuat ulang/memperbarui app (tanpa tombol Terima). Jadi
  **rilis app dengan teks baru dulu, baru naikkan konfigurasi** — kalau
  terbalik, siswa dengan app lama tidak bisa menerima sampai app diperbarui.
  Fitur dasar tidak pernah diblokir oleh status ini.

### Endpoint (wajib login, hanya akun sendiri)

| Metode | Jalur | Isi |
|---|---|---|
| GET | `/api/v1/persetujuan/saya` | Status akun sendiri: catatan terakhir per jenis (tanpa `catatan` internal), `versi_kebijakan_berlaku`, `kebijakan_terkini`, `ortu_wali_aktif`, `boleh_pakai_ai`. |
| POST | `/api/v1/persetujuan` | `{ jenis: "kebijakan_privasi", versi }` → 201 (atau 200 bila versi itu sudah diterima). Versi bukan yang berlaku → 409 `KEBIJAKAN_USANG`. `jenis: "ortu_wali"` → **403** `TIDAK_BERHAK`: akun siswa tidak pernah bisa mencatat persetujuan orang tua/wali. |

`POST /auth/daftar` menerima `versi_kebijakan` (opsional untuk APK lama); app
terbaru selalu mengirimnya setelah kotak kebijakan dicentang, dan server
mencatatnya sebagai `kebijakan_privasi` / `mandiri`. Versi usang → 409, dan
akun tidak dibuat.

### Mencatat persetujuan orang tua/wali (lewat sekolah)

Sekolah membagikan surat (`docs/surat-persetujuan-ortu-wali-DRAF.md`),
mengumpulkan yang ditandatangani, lalu petugas mencatat:

```bash
npm run persetujuan-ortu -- --status --pengguna=budi.smk12,ani.12          # lihat status (hanya membaca)
npm run persetujuan-ortu -- --pengguna=budi.smk12,ani.12 --catatan="Surat 012/SMKN4/X/2026, 3 Okt 2026"        # pratinjau
npm run persetujuan-ortu -- --pengguna=budi.smk12,ani.12 --catatan="Surat 012/SMKN4/X/2026, 3 Okt 2026" --ya   # mencatat
npm run persetujuan-ortu -- --berkas=kelas-12a.txt --catatan="..." --ya     # satu nama pengguna per baris, # = komentar
npm run persetujuan-ortu -- --pengguna=budi.smk12 --cabut --catatan="Surat pencabutan, 5 Okt 2026" --ya
```

Tanpa `--ya` hanya pratinjau. `--catatan` wajib. Satu nama tidak ditemukan →
tidak ada yang dicatat. Yang sudah setuju dengan versi sama, atau `--cabut`
untuk akun tanpa persetujuan aktif, dilewati. Pilihan: `--sumber=admin`,
`--versi=N` (bawaan: versi kebijakan yang berlaku). Tidak ada panel admin web.

### Dokumen untuk ahli hukum (DRAF)

- `docs/kebijakan-privasi-DRAF.md`: teks kebijakan (ditulis dari
  `lib/kebijakan-privasi.json` dengan `npm run dokumen-kebijakan`), inventaris
  data per tabel/kolom, daftar `[ISI: ...]`, dan pertanyaan terbuka.
- `docs/surat-persetujuan-ortu-wali-DRAF.md`: surat yang bisa dicetak sekolah.

Tes: `tests/persetujuan.test.js`, `tests/kebijakan-privasi.test.js`.

## 2c. Modul di Arsip Belajar (LANJUT_049)

Siswa mengunggah materi pelajaran (.txt, .md, PDF berisi teks, atau teks yang
ditempel). **Yang disimpan hanya teks hasil ekstraksi**; berkas asli diterima
di memori (multer `memoryStorage`), diekstrak, lalu dibuang, tanpa pernah
ditulis ke disk, dieksekusi, atau disajikan ulang. **Tidak ada layanan luar**
untuk unggah, ekstraksi, dan pencarian: semuanya berjalan di server sendiri.
Sejak LANJUT_055, untuk pertanyaan materi di Ngobrol, hingga 3 potongan modul
milik penanya (disamarkan) ikut dikirim ke penyedia AI; lihat bagian
"Materi: modul Arsip, pencarian web, sitasi".

### Data

- `modul` (migrasi 013): id, pengguna_id, mapel_id (10 mapel), judul, isi
  (MEDIUMTEXT), jumlah_karakter, jenis (`txt`/`md`/`pdf`/`tempel`),
  nama_berkas (tampilan saja), diunggah_pada.
- `potongan_modul`: teks dibelah ±800–1.200 karakter di batas paragraf atau
  kalimat (`src/modul/modul/potong.js`), dengan indeks **FULLTEXT MySQL**.
  `pengguna_id` disalin ke potongan supaya setiap pencarian memfilter pemilik.
- **Hapus permanen**: baris modul + potongan dihapus (bukan hapus lunak).
  InnoDB menyimpan kata dari baris FULLTEXT yang dihapus sampai tabel
  dirapikan, jadi ±30 detik sesudah penghapusan server menjalankan
  `OPTIMIZE TABLE potongan_modul` (digabung bila banyak hapus berdekatan).
  OPTIMIZE membangun ulang tabel itu; untuk data besar, pindahkan ke jadwal
  di luar jam ramai.

### Batas (di tabel konfigurasi, bukan di kode)

| Kunci di `konfigurasi_levelin` | Bawaan | Arti |
|---|---|---|
| `modul_ukuran_maks_byte` | 5242880 (5 MB) | Ukuran berkas; juga teks tempelan (byte UTF-8). |
| `modul_karakter_maks` | 200000 | Karakter teks hasil ekstraksi per modul. |
| `modul_jumlah_maks` | 10 | Modul per akun (dicek ulang di transaksi dengan baris pengguna dikunci). |

Ubah langsung, berlaku di unggahan berikutnya tanpa restart, mis.
`UPDATE konfigurasi_levelin SET nilai = '20' WHERE kunci = 'modul_jumlah_maks';`.
Kunci ini tidak ikut di endpoint publik `/konfigurasi/levelin`. Teks tempelan
juga dibatasi `express.json` 1 MB.

### Endpoint (wajib login, hanya milik sendiri; id orang lain → 404)

| Metode | Jalur | Isi |
|---|---|---|
| POST | `/api/v1/modul` | multipart (`berkas`, `judul`, `mapel_id`) atau JSON (`judul`, `mapel_id`, `teks`) → 201 ringkasan + `jumlah_potongan` |
| GET | `/api/v1/modul` | daftar tanpa isi |
| GET | `/api/v1/modul/cari?q=` | potongan yang cocok (FULLTEXT, mode bahasa alami, maks. 10, urut skor) + judul modul |
| GET | `/api/v1/modul/:id` | isi lengkap (teks biasa) |
| DELETE | `/api/v1/modul/:id` | hapus permanen |
| DELETE | `/api/v1/modul?semua=ya` | hapus permanen semua modul sendiri (tanpa `?semua=ya` → 400) |

Penolakan: `TIPE_BERKAS_DITOLAK` 415, `BERKAS_TERLALU_BESAR` 413,
`TEKS_TERLALU_PANJANG` 413, `BATAS_MODUL` 409, `PDF_TANPA_TEKS` /
`PDF_TERENKRIPSI` / `PDF_GAGAL_DIBACA` 422. Angka batas ikut di `medan`
supaya app bisa menyusun kalimatnya sendiri.

### Ekstraksi & keamanan unggahan

- **Tipe dari isi, bukan hanya ekstensi**: `.pdf` wajib diawali `%PDF-`;
  `.txt`/`.md` wajib UTF-8 sah tanpa byte NUL dan bukan PDF yang diganti nama.
  Ekstensi lain ditolak.
- **PDF: pdfjs-dist 4.10.38** (Mozilla, Apache-2.0). Dipilih karena pustaka
  pembaca PDF paling matang, murni JavaScript (tidak ada biner untuk teks),
  dan bekerja dari byte tanpa jaringan. Versi 4.10 dipakai karena v5+
  mensyaratkan Node ≥ 22.13, padahal server menjanjikan Node 20+. Sudah
  memuat perbaikan CVE-2024-4367; `isEvalSupported: false` tetap dipasang.
  (`@napi-rs/canvas` ikut terpasang sebagai dependensi opsional pdf.js. Modul
  native itu **dilarang dimuat** di worker: ekstraksi teks tidak
  membutuhkannya, dan memuatnya di worker_thread membuat seluruh proses
  server kadang crash, berupa segfault dengan exit 139, saat beberapa PDF
  diunggah beruntun. Dijaga oleh tes di `tests/modul.test.js`.)
- Ekstraksi berjalan di **worker_thread** (`ekstrak-pdf.worker.mjs`) dengan
  batas waktu 15 detik dan memori 256 MB; worker dihentikan paksa bila lewat.
  Di dalam worker, modul jaringan Node (net, tls, http, https, dns, fetch)
  dimatikan sebelum pdf.js dimuat.
- PDF terenkripsi (ada `/Encrypt`, dengan atau tanpa sandi pembuka) ditolak
  sebelum dibuka. PDF tanpa teks (pindai/foto) ditolak; tidak ada OCR.
- Pencarian kata kunci FULLTEXT tidak memahami makna: tidak cocok untuk
  sinonim atau imbuhan Indonesia ("membelah" ≠ "belah"), dan kata < 3 huruf
  diabaikan. Pencarian makna lewat embedding pihak ketiga sengaja tidak
  dipakai karena akan mengirim isi modul keluar.

Tes: `tests/modul.test.js`, `tests/modul-potong.test.js` (berkas contoh di
`tests/fixtures/modul/`).

## 2d. Ngobrol Bareng LANJUT dengan AI (LANJUT_051, pengaman LANJUT_053)

Ngobrol dijawab AI lewat **OpenRouter**. Model dan pengaturan penyedia ada
di tabel konfigurasi (`ai_*`); model bawaan `anthropic/claude-sonnet-5.5`.

### Bawaan: AI mati (LANJUT_060)

Sejak LANJUT_060, `ai_aktif` bawaannya **`0`** untuk instalasi baru (migrasi
015). Server yang baru dipasang langsung membalas Ngobrol dengan balasan uji
coba berlabel sampai seseorang sengaja menyalakannya. Basis data yang sudah
menjalankan migrasi 015 sebelumnya **tidak diubah**: migrasi hanya jalan
sekali, jadi nilainya tetap seperti dulu (biasanya `1`). Periksa sendiri:

```sql
SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'ai_aktif';
```

**Uji lokal** dengan penyedia tiruan atau kunci uji: nyalakan di basis data
pengembangan.

```sql
UPDATE konfigurasi_levelin SET nilai = '1' WHERE kunci = 'ai_aktif';
```

> **Produksi:** jangan jalankan perintah itu di server tayang sebelum daftar
> periksa keselamatan di `docs/kesiapan-rilis-uji.md` (bagian 3) beres:
> tinjauan guru BK, kebijakan privasi final, persetujuan orang tua/wali, dan
> batas kredit kunci.

Tes yang butuh AI (`ngobrol*.test.js`, `skenario-ai.test.js`) menyalakan
`ai_aktif = 1` sendiri di awal dan mengembalikan nilai asli di akhir, jadi
tetap lolos di basis data tes yang baru.

### Mematikan AI seketika

```sql
UPDATE konfigurasi_levelin SET nilai = '0' WHERE kunci = 'ai_aktif';
```

Berlaku di permintaan berikutnya, tanpa restart: semua akun mendapat balasan
uji coba berlabel, penyedia tidak dipanggil. Nyalakan lagi dengan `'1'`.
Nilai selain `'1'` dianggap mati (gagal-tertutup). Tanda bahaya akut tetap
dijawab dengan kartu bantuan walau AI mati.

> **Sebelum siswa sungguhan memakainya:** teks kebijakan privasi dan surat
> orang tua/wali sudah diperbarui menjadi draf v2 (LANJUT_056; bukti per
> klaim di `docs/kebijakan-v2-klaim-vs-kode.md`), tetapi nomor versinya
> sengaja masih 1. Isi dulu bagian `[ISI: ...]`, rilis app dengan teks itu,
> naikkan versi kebijakan (bagian 2b), dan baru catat persetujuan orang
> tua/wali sungguhan. Selama belum ada persetujuan yang tercatat, tidak ada
> akun yang bisa memakai AI.

### Menyalakan

1. Buat kunci di openrouter.ai, lalu **pasang batas kredit pada kunci itu**
   di dasbor OpenRouter (pengaman biaya terakhir).
2. Isi `OPENROUTER_API_KEY=` di `server/.env`. Kunci hanya ada di server,
   jangan pernah di app atau di `eas.json`. Kunci kosong =
   `503 AI_TIDAK_TERSEDIA`; server tetap jalan.
3. `npm run migrasi` (014: batas pemakaian; 015: saklar & pengaturan
   penyedia; 018: hitungan pemakaian harian), lalu nyalakan ulang server.
4. Akun harus lolos gerbang `bolehPakaiAi`: kebijakan diterima **dan**
   persetujuan orang tua/wali tercatat (`npm run persetujuan-ortu`, bagian 2b).
5. Nyalakan saklar `ai_aktif` (lihat "Bawaan: AI mati" di atas).

### Alur `POST /api/v1/ngobrol` (wajib login)

`{ pesan: [{ peran: "pengguna" | "bot", teks }] }` →
`{ balasan, kartu_bantuan, uji_coba, data_pribadi_disamarkan, konteks, tautan }`.
App mengirim riwayat sesi (maks. 20 pesan; server menerima maks. 30, pesan
siswa maks. 500 karakter sejak LANJUT_078, pesan terakhir harus dari siswa).
Peran lain → 400, tanpa menggemakan isinya.

1. **Tanda bahaya akut** di pesan terbaru → server membalas sendiri dengan
   teks tetap + kartu bantuan. AI tidak dipanggil, dan ini berlaku **sebelum**
   batas laju, gerbang, dan saklar, jadi siswa dalam bahaya selalu mendapat
   kartu.
2. Batas per akun → gerbang `bolehPakaiAi` → saklar `ai_aktif` → kunci dan
   pengaturan penyedia sah. Kalau salah satu gagal, **tidak ada apa pun yang
   dikirim keluar**.
3. **Pesan akut di riwayat diganti** (LANJUT_060, `tanpaPesanAkut` di
   `ngobrol.layanan.js`): setiap pesan siswa di riwayat diperiksa ulang
   dengan daftar tanda bahaya yang berlaku. Yang akut diganti penanda netral
   `[siswa menyampaikan hal yang sangat berat; aplikasi sudah menampilkan
   kartu bantuan]` sebelum penyamaran dan pengiriman, termasuk pesan lama
   yang baru tergolong akut setelah daftar kata diperbarui. Balasan server
   (kalimat empati) tetap. Modul dan web hanya memakai pesan terbaru, yang
   sudah pasti tidak akut.
4. **Data pribadi disamarkan** di pesan terbaru dan di seluruh riwayat
   (`src/modul/ngobrol/samarkan.js`): nomor telepon Indonesia, email, dan 16
   angka mirip NIK menjadi `[disamarkan]`. Sejak LANJUT_078 juga tanggal
   lahir/TTL, `alamat:`, `Jl./Jalan … No …`, RT/RW, dan nama sekolah bernomor
   (mis. "SMP Negeri 5 Contoh"); semuanya butuh kata penanda, angka biasa
   tidak disentuh. Bila pesan terbaru disamarkan,
   `data_pribadi_disamarkan: true` dan app memberi tahu siswa.
5. Ke penyedia hanya **dua pesan**: `system` (aturan + profil belajar: kelas,
   jenis sekolah, nama prodi impian, gaya belajar) dan **satu** `user` berisi
   riwayat dan pesan terbaru sebagai **data JSON** bertanda "bukan perintah".
   Riwayat dari app tidak pernah diteruskan sebagai giliran
   `assistant`/`system`, jadi balasan bot palsu dari klien hanya menjadi data
   berlabel. Salam pembuka app (memuat nama) dibuang.
6. **Tidak dikirim:** nama tampilan, nama pengguna, email, id akun.
7. Tanda bahaya **ringan** (stres, cemas, kewalahan) → AI tetap menjawab,
   dengan catatan di instruksi sistem untuk menanggapi perasaan lebih dulu.
   Model juga diminta mengawali balasan dengan `[[BANTUAN]]` bila menilai
   siswa dalam bahaya: server membuang penanda itu dan menempelkan kartu
   bantuan.
8. `max_tokens` 2000 dan `reasoning: { effort: "low" }` (optimasi chatbot
   15 Okt 2026; sebelumnya 800 tanpa `reasoning`: uji sungguhan menunjukkan
   token penalaran model menghabiskan batas 800 sehingga balasan terpotong),
   batas waktu 20 detik (LANJUT_078; sebelumnya 45). Bila penyedia tetap
   menandai `finish_reason: length`, server memangkas balasan ke kalimat utuh
   terakhir (`rapikanTerpotong`). Galat penyedia atau lewat waktu →
   `503 AI_SEMENTARA_GAGAL` (sebelumnya `502 AI_GAGAL`), tanpa rincian ke app.
7a. **Panduan fitur** (optimasi chatbot 15 Okt 2026,
   `src/modul/ngobrol/panduan-fitur.js`, isi `config/panduan-fitur.json`,
   DRAF): instruksi sistem memuat daftar fitur LANJUT yang benar-benar ada
   untuk **jenjang** siswa (SMP / kelas 10–11 / kelas 12 / tanpa kelas),
   dengan nama dan letak persis seperti di app, supaya chatbot memandu ke
   fitur yang benar dan tidak mengarang menu. Hanya kelompok jenjang yang
   dipakai, bukan data akun lain. Persiapan Event, pencarian web, dan mikrofon
   sengaja tidak dicantumkan.
8a. **Konteks fitur** (LANJUT_078, `src/modul/ngobrol/konteks.js`): server
   memilih paling banyak **satu** konteks dari daftar tetap untuk dikirim ke
   AI — `modul` (judul + ringkasan ≤600 karakter dari satu modul milik
   sendiri, disamarkan), `saran` (nama mapel + jenis saran harian Level-In),
   atau `event` (jenis, tanggal, sisa hari, mapel dari satu event terdekat;
   tanpa materi bebas, dan hanya bila Persiapan Event boleh untuk akun itu)
   — atau kosong. Kata kunci di `config/konteks-ngobrol.json` (DRAF). Kartu
   `tautan` (maks. 3, satu per jenis) disusun server dari data akun sendiri
   dan tidak dikirim ke AI. Isian klien selain `pesan` diabaikan.
9. Hitungan harian (`pemakaian_ai_harian`) ditambah sesudah jawaban siap,
   tanpa ditunggu (lihat "Pemakaian AI harian" di bawah).

**Isi obrolan tidak disimpan** di basis data dan tidak dicatat di log:
- log akses hanya mencatat metode dan jalur;
- galat penyedia hanya jenis dan status HTTP;
- keselamatan hanya `[keselamatan] tingkat=akut|ringan|model waktu=…`, tanpa
  kata yang cocok maupun isi pesan;
- JSON rusak → `400 VALIDASI_GAGAL`, dan pesan galat parser (yang bisa memuat
  cuplikan isi) tidak dicetak, di semua rute;
- hitungan harian `pemakaian_ai_harian` hanya berisi tanggal dan angka;
- sejak LANJUT_078 satu baris per permintaan yang sampai ke penyedia AI
  (sesudah gerbang, saklar, dan kunci):
  `[ngobrol] pengguna=<id> konteks=<modul|saran|event|kosong> tautan=<n>
  status=<200|503> lama=<ms>ms`, tanpa isi pesan, ringkasan, atau kunci.
  Jawaban AI juga tidak disimpan.

Riwayat hanya hidup di memori app. Yang tetap terjadi: OpenRouter dan
penyedia model menerima isi obrolan yang sudah disamarkan untuk membuat
balasan, sesuai kebijakan mereka.

| Kode | HTTP | Arti |
|---|---|---|
| `VALIDASI_GAGAL` | 400 | isi tidak sah, termasuk JSON rusak |
| `AI_BELUM_DIIZINKAN` | 403 | gerbang persetujuan belum lolos |
| `TERLALU_SERING` | 429 | lewat batas pemakaian akun |
| `AI_SEMENTARA_GAGAL` | 503 | penyedia AI gagal, menolak, saldo habis, atau lewat 20 detik (sebelum LANJUT_078: `AI_GAGAL` 502) |
| `AI_TIDAK_TERSEDIA` | 503 | `OPENROUTER_API_KEY` kosong, atau pengaturan `ai_*` tidak sah |

`GET /api/v1/ngobrol/kartu-bantuan` (wajib login, tanpa gerbang) mengembalikan
kartu yang sama, untuk tautan "Butuh bicara dengan orang?" di app.

`GET /api/v1/ngobrol/status` (wajib login, LANJUT_078) → `{ ai_aktif }`. App
memakainya untuk menampilkan petunjuk dan catatan konteks hanya saat saklar
menyala; saat mati, layar Ngobrol tidak berubah.

### Kartu bantuan & tanda bahaya (berkas di `server/config/`)

- `kartu-bantuan.json`: daftar layanan (`nama`, `nomor_atau_alamat`,
  `keterangan`, `terverifikasi`, `sumber`, `tanggal_cek`). **Hanya
  `terverifikasi: true` yang pernah dikirim ke app.** SAPA 129 tercatat
  dengan `terverifikasi: false` sampai dicek ke sumber resmi KemenPPPA; untuk
  menampilkannya, ubah ke `true`, isi `sumber` dan `tanggal_cek`.
- `tanda-bahaya.json`: daftar frasa akut (mengakhiri hidup, menyakiti diri,
  kekerasan yang dialami, pelecehan) dan ringan, serta peta ejaan gaul.
  **DRAF untuk direview guru BK.** Normalisasi: huruf kecil, angka di kata
  menjadi huruf (`d1r1` = `diri`), tanda baca dihapus, huruf terpisah
  digabung (`b u n u h` = `bunuh`), huruf berulang diringkas
  (`matiii` = `mati`), kata gaul diganti bentuk bakunya (`ilang` = `hilang`,
  `fotoku` = `foto aku`). Selain frasa, ada **kombinasi kata**
  (`akut_kombinasi`, LANJUT_060): pesan akut bila setiap kelompok punya
  setidaknya satu akar yang muncul di salah satu kata, dalam urutan apa pun.
  Contoh: `ancam` + `sebar`/`viral`/`upload` + `foto`/`video` menangkap
  "dia ngancem bakal nyebarin foto aku". Sengaja longgar: ada positif palsu
  (daftarnya di `positif_palsu_diketahui`, mis. "dipukul rata", "jerawatku
  mau hilang"), dan siswa tetap bisa lanjut ngobrol.
- `ngobrol-teks.json`: teks tetap server (balasan akut, judul/penutup kartu,
  kalimat tolak di luar topik dan tolak mengabaikan aturan, balasan uji
  coba). Sama persis dengan salinan teks §4.16.
- `panduan-fitur.json` (optimasi chatbot 15 Okt 2026, DRAF): panduan fitur
  per jenjang untuk instruksi sistem chatbot (lihat butir 7a di atas). Setiap
  fitur punya `nama`, `letak`, `guna`, dan `untuk` (`smp`, `kelas10_11`,
  `kelas12`, `umum`). Nama dan label bertanda kutip dijaga
  `tests/ngobrol-optimasi.test.js` supaya tetap sama dengan app.

Berkas-berkas ini dibaca dan diperiksa **saat server menyala**: berkas rusak
membuat server gagal menyala. Mengubahnya perlu restart.

### Konfigurasi (tabel `konfigurasi_levelin`, tanpa restart)

| Kunci | Default | Arti |
|---|---|---|
| `ngobrol_batas_5_menit` | 10 | pesan per akun per 5 menit |
| `ngobrol_batas_24_jam` | 50 | pesan per akun per 24 jam (pengendali biaya) |
| `ai_aktif` | 0 (instalasi baru sejak LANJUT_060) | saklar AI (lihat di atas) |
| `ai_model` | `anthropic/claude-sonnet-5.5` | model OpenRouter |
| `ai_data_collection` | `deny` | `provider.data_collection`: `deny` = tanpa penyedia yang menyimpan data dan bisa melatih model darinya |
| `ai_zdr` | 0 | `provider.zdr`: 1 = hanya endpoint tanpa penyimpanan data (ZDR) |
| `ai_penyedia_only` | (kosong) | `provider.only`: slug penyedia dipisah koma; kosong = tidak dibatasi |
| `ai_tarif_masuk_per_juta` | (kosong) | US$ per 1 juta token masuk, hanya untuk perkiraan biaya `npm run pemakaian-ai` |
| `ai_tarif_keluar_per_juta` | (kosong) | US$ per 1 juta token keluar; perkiraan biaya muncul bila kedua tarif terisi |

```sql
UPDATE konfigurasi_levelin SET nilai = '100' WHERE kunci = 'ngobrol_batas_24_jam';
```

Nama parameter `provider` sesuai dokumentasi OpenRouter "Provider Routing".
`zdr` sengaja mati: dokumentasi ZDR tidak menjelaskan apa yang terjadi bila
model tidak punya endpoint ZDR, jadi menyalakannya bisa membuat semua
permintaan gagal. Uji dulu dengan akun uji. Setiap pembatasan (`deny`,
`zdr`, `only`) bisa mempersempit penyedia yang tersedia untuk model; bila
tidak ada yang cocok, permintaan gagal dan siswa melihat `AI_SEMENTARA_GAGAL`.
Pengaturan yang tidak sah membuat AI tidak dipakai (`503`), bukan diabaikan.
Hitungan batas laju disimpan di memori proses, jadi hilang saat restart.

### Batas kode

Hanya `src/modul/ngobrol/penyedia-ai.js` yang boleh mengirim data ke luar,
dan hanya `ngobrol.layanan.js` yang memakainya, sesudah gerbang, saklar, dan
penyamaran. Ini dijaga `tests/ngobrol.test.js`. Tes tidak pernah memanggil
internet: penyedia di-mock, klien asli diuji terhadap server tiruan di
localhost, dan selama tes alamat penyedia menunjuk ke `127.0.0.1:9` supaya
tes yang lupa memakai mock gagal di tempat. Tes pengaman murni (deteksi,
penyamaran, kartu, instruksi sistem) ada di `tests/ngobrol-keselamatan.test.js`.

### Pemakaian AI harian (LANJUT_060)

Untuk memantau pilot, server menjumlahkan pemakaian per tanggal WIB di tabel
`pemakaian_ai_harian` (migrasi 018): panggilan ke penyedia yang berhasil,
token masuk/keluar (dari `usage` respons penyedia; 0 bila tidak ada), balasan
uji coba, tanda bahaya akut/ringan/model, galat penyedia, pencarian web
dipakai/kuota habis, dan jawaban yang memakai modul.

- **Bukan data pribadi:** satu baris per tanggal untuk semua akun digabung,
  tanpa id akun, isi pesan, kueri, potongan, atau alamat web.
- **Atomik:** setiap permintaan menambah hitungannya dengan satu
  `INSERT … ON DUPLICATE KEY UPDATE kolom = kolom + nilai`
  (`src/modul/ngobrol/pemakaian.repo.js`).
- **Tidak mengganggu jawaban:** penulisan tidak ditunggu
  (`src/modul/ngobrol/pemakaian.js`). Bila basis data gagal, siswa tetap
  mendapat jawaban dan log hanya memuat `[pemakaian] gagal dicatat (<kode>)`.

Ringkasan di terminal server:

```bash
npm run pemakaian-ai              # 7 hari terakhir
npm run pemakaian-ai -- --hari=30 # 1–366 hari
```

Perkiraan biaya dalam US$ muncul bila `ai_tarif_masuk_per_juta` **dan**
`ai_tarif_keluar_per_juta` diisi (harga model di OpenRouter), mis.

```sql
UPDATE konfigurasi_levelin SET nilai = '3' WHERE kunci = 'ai_tarif_masuk_per_juta';
UPDATE konfigurasi_levelin SET nilai = '15' WHERE kunci = 'ai_tarif_keluar_per_juta';
```

Angka itu perkiraan dari token; biaya pencarian web tidak ikut. Tagihan
sebenarnya tetap di dasbor OpenRouter. Contoh keluaran ada di
`docs/kesiapan-rilis-uji.md` bagian 5. Tes: `tests/ngobrol.test.js`,
`tests/ngobrol-materi.test.js` (hitungan), `tests/pemakaian-ai.test.js`
(skrip).

### Materi: modul Arsip, pencarian web, sitasi (LANJUT_055)

Alur data lengkap ada di `docs/alur-data-ai-materi.md`. Ringkasnya:

- **Kapan aktif.** Hanya untuk pertanyaan materi (`src/modul/ngobrol/materi.js`,
  aturan di `config/materi.json`). Obrolan biasa, pertanyaan jalur masuk, dan
  tanda bahaya akut tidak memicu pengambilan modul maupun web.
- **Potongan modul.**
  - Hanya milik akun yang bertanya (`modul.repo.js` → `kandidatUntukAi`,
    filter `pengguna_id` di kedua tabel), dipersempit ke mapel bila disebut.
  - Penyaring tahap 1 di server: pemotong imbuhan, lalu skor FULLTEXT ≥
    `ai_modul_skor_min` **dan** kata bermakna yang sama ≥
    `min(ai_modul_kata_min, jumlah kata bermakna di pertanyaan)`. Jadi
    "apa itu fotosintesis" (satu kata bermakna) cukup satu kata sama.
  - Kata topik saja tanpa kata tanya atau tanda tanya ("fotosintesis",
    "newton") dianggap obrolan, bukan pertanyaan materi, sehingga tidak
    mengambil modul (pengukuran LANJUT_057). "newton?" atau "apa itu
    newton" mengambil modul.
  - Kata umum ("energi?") bisa meloloskan potongan dari beberapa mapel;
    tahap 2 yang menyaring, atau siswa menyebut mapelnya.
  - Maksimal `ai_modul_potongan_maks` potongan, berlabel M1, M2, dan
    seterusnya.
  - Tahap 2: model menilai dan mengabaikan potongan yang tidak menjawab.
- **Web.**
  - `ai_web_aktif` (bawaan **0**) dan `ai_web_batas_harian` dibaca tiap
    permintaan.
  - Pencarian memakai plugin `web` OpenRouter (`plugins: [{ id: "web",
    max_results }]`), dalam **permintaan terpisah** yang hanya berisi
    pertanyaan terbaru yang sudah disamarkan.
  - Sumber diambil dari `message.annotations` (`url_citation`). Hasilnya
    masuk ke permintaan jawaban sebagai data berlabel W1, W2, dan seterusnya.
  - Alamat web di balasan yang tidak ada di anotasi dibuang server, dan
    daftar sumber (`sumber.modul`, `sumber.web`) disusun server dari label
    yang dipakai. Kata pengantar yang menggantung karenanya ("Lihat juga",
    "Sumber:", butir daftar dan judul "Referensi:" yang isinya habis) ikut
    dibuang (LANJUT_057).
- **Mesin pencari (`ai_web_mesin`, LANJUT_057).** Nilai yang sah:
  - kosong (bawaan): tanpa parameter `engine`. Menurut dokumentasi
    OpenRouter, model Anthropic, OpenAI, Google, Perplexity, dan SpaceXAI
    memakai pencarian bawaan penyedia model (harga diteruskan dari penyedia),
    model lain memakai Exa;
  - `exa`: `plugins: [{ id: "web", max_results, engine: "exa" }]`. Menurut
    dokumentasi OpenRouter, Exa mode bawaan (auto) US$0,007 per permintaan,
    termasuk hingga 10 hasil.

  Nilai lain (juga huruf besar, `native`, atau kunci yang hilang) membuat
  pencarian web **tidak dipakai**, bukan diabaikan. Sumber nama parameter:
  OpenRouter, "Web Search",
  `https://openrouter.ai/docs/guides/features/plugins/web-search` (dicek
  9 Oktober 2026).

  > **Peringatan:** biarkan `ai_web_aktif` tetap `0` sampai kebijakan data
  > mesin pencari yang dipilih (Exa atau pencarian bawaan penyedia) sudah
  > dicek, termasuk apakah `data_collection: deny` berlaku di sana. Dokumentasi
  > Web Search OpenRouter tidak menyebut `data_collection` untuk pencarian
  > web. Ini masih `[ISI]` di kebijakan privasi draf v2.
- **Kuota web harian** disimpan di memori proses: hilang saat restart, dan
  tidak dibagi antarproses.

```sql
UPDATE konfigurasi_levelin SET nilai = 'exa' WHERE kunci = 'ai_web_mesin';      -- paksa Exa ('' = bawaan)
UPDATE konfigurasi_levelin SET nilai = '1' WHERE kunci = 'ai_web_aktif';        -- nyalakan web (lihat peringatan)
UPDATE konfigurasi_levelin SET nilai = '0' WHERE kunci = 'ai_modul_aktif';      -- jangan kirim modul
```

Evaluasi lapis 2 memakai mesin yang sama lewat `--web --web-mesin=exa`.

Tes: `tests/ngobrol-materi.test.js` (rute, isolasi antarakun, web, sitasi)
dan `tests/ngobrol-materi-murni.test.js` (imbuhan, pengenal pesan, perapian
sumber).

### Skenario uji AI (LANJUT_054)

76 percakapan fiktif (per LANJUT_060) di `tests/skenario-ai/skenario.json`,
dalam dua lapis.
Daftar lengkap dan rubriknya ada di `docs/skenario-ai.md`; tabelnya ditulis
ulang dengan `npm run dokumen-skenario-ai`.

- **Lapis 1** ikut `npm test` (`tests/skenario-ai.test.js`), dengan penyedia
  tiruan dan satu tes per skenario. Skenario bertanda `diketahui_gagal`
  tampil sebagai TODO, dan tidak membuat tes merah.
- **Lapis 2** memanggil **model sungguhan** dan **berbiaya**. Ia tidak pernah
  ikut `npm test` dan hanya dijalankan manual:

  ```powershell
  # PowerShell; kunci di server/.env; pasang batas kredit di OpenRouter dulu
  $env:EVALUASI_AI_IZIN = 'ya'
  npm run evaluasi-ai -- --ya-panggil-penyedia
  ```

  Skrip menolak berjalan tanpa `EVALUASI_AI_IZIN=ya`, flag
  `--ya-panggil-penyedia`, dan `OPENROUTER_API_KEY`, atau bila
  `NODE_ENV=production`. Sebelum memanggil, skrip menampilkan jumlah
  panggilan (48 untuk set LANJUT_060, tanpa `--web`) dan modelnya, lalu menunggu 5
  detik. Skrip berhenti di kegagalan pertama (mis. 402 kredit habis, atau
  429) tanpa mengulang. Hasilnya ditulis ke
  `docs/hasil-evaluasi-ai-<tanggal>.md` (diabaikan git), untuk dinilai Khalifa
  dan guru BK.

  Perkiraan biaya: setiap panggilan mengirim ±1.000–1.500 token instruksi
  ditambah pesan, dan menerima ≤800 token. Hitung dengan harga model di
  OpenRouter sebelum menjalankan.

  Untuk melihat rencana tanpa memanggil apa pun dan tanpa biaya:
  `npm run evaluasi-ai -- --kering`.

## 2e. Banner Beranda (LANJUT_073)

Banner pengumuman di Beranda diambil dari `server/config/banner-beranda.json`
(bukan tabel, tanpa migrasi), lewat `GET /api/v1/konten/banner` (publik).
Isinya dikurasi tim — **bukan** berita otomatis dari internet. Saat LANJUT_073
berkas ini sengaja kosong: `{ "versi": 1, "banner": [] }`.

- Setiap item wajib punya `id` (unik), `judul` (≤ 80 karakter), `isi`
  (≤ 200 karakter), `tanggal_mulai` dan `tanggal_selesai` (`YYYY-MM-DD`, WIB),
  `sumber`, `url_sumber` (wajib `https://`), dan `status_verifikasi`
  (`belum_diverifikasi` / `terverifikasi`). `diperiksa_pada` = tanggal
  pengecekan manusia; tanpa medan ini item dianggap belum terverifikasi.
- **Isi banner wajib dicek manusia ke sumber resmi sebelum `status_verifikasi`
  diubah menjadi `terverifikasi`.**
- Yang dikirim: paling banyak **tiga** item terverifikasi yang berlaku hari ini (WIB),
  diurutkan dari `tanggal_mulai` paling baru (seri → `id` terkecil), hanya medan `id`,
  `judul`, `isi`, `sumber`, `url_sumber`, `tanggal_selesai`. Sejak LANJUT_074 app
  menampilkannya sebagai carousel di bawah Info Penting (sebelumnya satu banner).
- Berkas dibaca setiap permintaan, jadi perubahan berlaku tanpa menyalakan ulang
  server. Gagal-tertutup: JSON rusak, struktur salah, atau **satu** item tidak sah
  (medan kosong, terlalu panjang, tanggal salah, bukan https, `id` ganda) membuat
  banner kosong dan mencatat `[banner-beranda] banner dikosongkan: …` di log
  (hanya letak medan, tanpa isi banner). Server tidak pernah mati karena berkas ini.
- Kode: `src/modul/konten/banner.js`; tes: `tests/konten-banner.test.js`.

## 3. Menjalankan server

```bash
npm start
# atau untuk pengembangan dengan auto-restart, pakai `node --watch`:
node --watch src/index.js
```

Cek server hidup:

```bash
curl http://localhost:4000/health
# { "ok": true }

# atau endpoint kompatibilitas:
curl http://localhost:4000/api/v1/sehat
# { "ok": true, "data": { "status": "ok", "waktu": "..." } }
```

Uji asap otomatis pasca-deploy (LANJUT_061):

```bash
npm run smoke
# atau ke domain tertentu:
npm run smoke -- --url=https://api.GANTI-DOMAIN
```

## 4. Menjalankan test

Test di `tests/*.test.js` adalah **uji integrasi** — butuh MySQL nyata dengan
migrasi §3.6 sudah dijalankan (tidak memakai mock). Siapkan **basis data
terpisah untuk test** (jangan pakai basis data pengembangan/produksi, karena
test membuat pengguna & kartu sungguhan):

```bash
# .env yang dipakai server dan tests/ SAMA (via dotenv) — arahkan DB_NAME ke
# basis data khusus test sebelum menjalankan, mis. `lanjut_test`.
npm run migrasi
npm run benih     # opsional, sebagian test kartu memakai mapel/kartu resmi
npm test
```

**Windows + Node 20:** `npm test` gagal dengan "Could not find
'...tests\*.test.js'". Di Windows, npm menjalankan skrip lewat cmd.exe yang
tidak mengembangkan pola `*`, dan baru Node 21+ yang bisa mengembangkannya
sendiri. Di Node 20, jalankan dari Git Bash: `node --test tests/*.test.js`.
Di Linux (server produksi) dan di Node 22+, `npm test` berjalan normal.

`NODE_ENV=test` menaikkan batas `express-rate-limit` (§8.2) supaya rangkaian
test yang memanggil endpoint `/auth/*` berkali-kali dari mesin yang sama tidak
saling memblokir — ini **tidak** mengubah angka pembatasan di lingkungan lain.

Gerbang SQL (§9.4):

```bash
npm run periksa-sql
```

Memeriksa: (1) tidak ada kata kunci SQL di luar `*.repo.js` (kecuali
`src/db/` — pelari migrasi & benih), (2) tidak ada `${...}` di dalam string
SQL, (3) setiap query atas tabel pribadi memfilter `pengguna_id`/`pemilik_id`.

## 5. Struktur folder

Lihat §9.2 `docs/SDD-Backend-Foundation.md` untuk rancangan lengkapnya. Tiga
lapis per modul, batasnya tegas:

| Lapis | Berkas | Boleh | Dilarang |
|---|---|---|---|
| Rute | `*.rute.js` | Baca `req`, panggil layanan, susun respons | SQL, aturan bisnis |
| Layanan | `*.layanan.js` | Aturan bisnis, panggil repositori | SQL, sentuh `req`/`res` |
| Repositori | `*.repo.js` | **SQL (satu-satunya tempat)** | Sentuh `req`/`res` |

## 6. Deployment

Bagian ini berlaku untuk hosting apa pun. Langkah khusus Rumahweb (cPanel
Node.js App) ada di [`DEPLOYMENT-RUMAHWEB.md`](DEPLOYMENT-RUMAHWEB.md).

### Prasyarat

- **Node.js 20 atau lebih baru** (dicantumkan juga di `package.json` → `engines`).
- **MySQL 8** dengan satu basis data kosong berkarakter `utf8mb4`. Hosting
  cPanel sering memakai **MariaDB**; skema ini belum pernah diuji di MariaDB
  (yang paling mungkin bermasalah: `ROW_NUMBER() OVER` dan `CHECK`, keduanya
  butuh MariaDB 10.2+).
- Pengguna basis data dengan hak membuat & mengubah tabel (untuk migrasi).

### Environment variable

Semua konfigurasi dibaca dari environment variable (atau berkas `.env` di
folder `server/`). Tidak ada nilai yang tertanam di kode. Daftar lengkap,
sama dengan `.env.example`:

| Variabel | Wajib? | Contoh produksi | Keterangan |
|---|---|---|---|
| `PORT` | tidak (bawaan `3000`) | `3000` | Banyak hosting mengisinya sendiri — biarkan hosting yang menentukan |
| `NODE_ENV` | disarankan | `production` | `production` memakai batas laju asli (§8.2). **Jangan** `test` di server tayang |
| `DB_HOST` | **ya** | `localhost` | Host MySQL |
| `DB_PORT` | tidak (bawaan `3306`) | `3306` | |
| `DB_USER` | **ya** | `akun_lanjut` | Di cPanel biasanya berawalan nama akun |
| `DB_PASSWORD` | ya (boleh kosong hanya di lokal) | *(rahasia)* | |
| `DB_NAME` | **ya** | `akun_lanjut` | |
| `CORS_ORIGINS` (atau `ASAL_DIIZINKAN`) | **ya** | `https://app.GANTI-DOMAIN` | Asal web yang boleh memanggil API, dipisah koma, **tidak pernah** `*` |
| `SESI_UMUR_HARI` | tidak (bawaan `90`) | `90` | Umur sesi login (hari, bergulir) |
| `TRUST_PROXY` (atau `JUMLAH_PROXY`) | tidak (bawaan `0`) | `1` | Jumlah reverse proxy tepercaya di depan server — lihat di bawah |
| `LOKASI_DATA_KONTEN` | tidak (bawaan `../../MVP-PWA/data`) | `data-konten` | Folder berisi berkas `*.json` konten untuk `npm run benih` — lihat di bawah |
| `OPENROUTER_API_KEY` | tidak (bawaan kosong) | *(rahasia, biarkan kosong dulu)* | Kunci AI Ngobrol (§2d). Kosong = AI tidak tersedia (`503 AI_TIDAK_TERSEDIA`), atau balasan uji coba selama `ai_aktif = 0`; server tetap jalan. Hanya di `.env` server, jangan di app. Isi sesudah daftar periksa keselamatan di `docs/kesiapan-rilis-uji.md` beres, dengan batas kredit di dasbor OpenRouter |

Koneksi basis data memakai **lima variabel terpisah** (`DB_HOST`, `DB_PORT`,
`DB_USER`, `DB_PASSWORD`, `DB_NAME`), bukan satu URL koneksi. Hosting yang
memberi satu URL (mis. `mysql://user:sandi@host:port/nama`) perlu dipecah ke
lima variabel itu.

**`CORS_ORIGINS` (atau `ASAL_DIIZINKAN`).** Isi dengan alamat web yang membuka aplikasi,
persis termasuk `https://` dan tanpa garis miring di akhir (mis.
`https://app.GANTI-DOMAIN`). Variabel ini wajib walau web dan API satu
domain — server menolak menyala bila kosong. Di produksi, setiap asal diperiksa
ketat (harus https:// yang valid). **Aplikasi Android (APK) tidak
terkena CORS** — CORS hanya berlaku untuk peramban — jadi APK tidak perlu
dimasukkan ke daftar ini.

**`TRUST_PROXY` (atau `JUMLAH_PROXY`).** Di hosting, server biasanya berada di belakang reverse
proxy (Nginx, PM2, Cloudflare, cPanel). Tanpa variabel ini, semua pengguna terlihat ber-IP sama (IP proxy),
sehingga batas laju per-IP berlaku untuk **semua orang sekaligus** (mis.
hanya 5 pendaftaran per jam untuk seluruh pengguna). Isi dengan jumlah proxy
di depan server — biasanya `1`, tapi **pastikan ke dokumentasi hostingnya**.
Jangan isi lebih besar dari jumlah sebenarnya: header `X-Forwarded-For` bisa
dipalsukan pengguna untuk lolos dari batas laju.

Rahasia hanya diisi di `.env` di server atau di pengaturan environment
variable hosting — **tidak pernah** di berkas yang ada di git. Templat
`.env.production.example` hanya berisi placeholder; `.env` dan
`.env.production` diabaikan git.

### Urutan langkah di server baru

```bash
# 1. Pasang dependensi (dari folder server/)
npm ci

# 2. Isi environment variable: salin templat lalu isi nilai sungguhan,
#    ATAU isi lewat pengaturan env hosting (tanpa berkas .env).
cp .env.production.example .env

# 3. Buat semua tabel (hanya menjalankan migrasi yang belum pernah jalan)
npm run migrasi

# 4. Isi konten dari berkas *.json (aman diulang). Kalau yang diunggah hanya
#    folder server/, siapkan dulu folder data-konten — lihat di bawah.
npm run benih

# 5. (Opsional) Tandai konten yang sudah dicek ke sumber resmi — tanda ini
#    tersimpan di basis data, jadi di server baru harus ditandai ulang.
#    Tanpa --ya hanya pratinjau (LANJUT_043).
npm run verifikasi-konten -- --list
npm run verifikasi-konten -- --jenis=linimasa --id=daftar-akun-tka,pelaksanaan-tka,susulan-tka --oleh="Nama"
npm run verifikasi-konten -- --jenis=linimasa --id=daftar-akun-tka,pelaksanaan-tka,susulan-tka --oleh="Nama" --ya

# 6. Nyalakan server (mode produksi; tanpa auto-restart)
npm start
```

Catatan:

- Jalankan semua perintah **dari folder `server/`**: berkas `.env` dibaca
  dari folder tempat perintah dijalankan.
- Menandai verifikasi (langkah 5) hanya untuk konten yang benar-benar sudah
  dicocokkan dengan sumber resminya — lihat bagian 2a.

### Data konten untuk `npm run benih` (`LOKASI_DATA_KONTEN`)

Isi aplikasi (jadwal Linimasa, daftar prodi, Daftar Periksa, dan lainnya)
berasal dari berkas-berkas `.json` di folder **`MVP-PWA/data`** di repo.
`npm run benih` menyalin isi berkas-berkas itu ke basis data.

- **Kalau seluruh repo ada di server** (mis. hasil `git clone`): tidak perlu
  apa-apa. Benih otomatis membaca `MVP-PWA/data` seperti di laptop.
- **Kalau yang diunggah hanya folder `server/`** (misalnya lewat cPanel), ikuti
  langkah berikut:

1. Di komputer, buka folder repo lalu masuk ke **`MVP-PWA`**. Klik kanan
   folder **`data`** → *Compress / Kirim ke → Folder terkompresi (zip)*.
2. Unggah berkas zip itu ke folder `server/` di hosting (di cPanel: *File
   Manager* → masuk ke folder aplikasi → *Upload*).
3. Ekstrak zip-nya di sana (di cPanel: klik kanan berkas zip → *Extract*),
   lalu **ganti nama** folder hasil ekstrak dari `data` menjadi
   **`data-konten`**. Pastikan berkas seperti `prodi.json` dan
   `linimasa.json` langsung berada di dalam `server/data-konten/` — bukan di
   `server/data-konten/data/`.
4. Tambahkan baris ini ke berkas `.env` di folder `server/` (atau ke
   pengaturan *environment variable* di hosting):
   ```
   LOKASI_DATA_KONTEN=data-konten
   ```
5. Jalankan `npm run benih`. Baris pertama hasilnya menyebut folder yang
   dipakai, mis. `[benih] data konten: /home/akun/lanjut/server/data-konten`.

Kalau foldernya salah atau belum lengkap, benih **berhenti sebelum menulis
apa pun** dan menyebut folder yang dicari serta berkas yang kurang. Isi
`LOKASI_DATA_KONTEN` boleh path lengkap (mis. `/home/akun/data-konten`)
atau path relatif terhadap folder `server/` (mis. `data-konten`).

**Setiap kali isi berkas JSON diubah** (mis. tanggal Linimasa diperbarui),
ulangi langkah 1–3 untuk menimpa folder `data-konten` di server, lalu
jalankan `npm run benih` lagi. Ingat: konten yang isinya berubah akan kembali
"belum diverifikasi" dan perlu ditandai ulang (bagian 2 dan 2a).

### Memastikan server sehat

```bash
curl https://<domain>/api/v1/sehat
# { "ok": true, "data": { "status": "ok", "waktu": "..." } }
```

`/api/v1/sehat` hanya memastikan proses Node hidup — **tidak** memeriksa
basis data. Untuk memastikan basis data tersambung dan sudah dibenih, cek
juga satu endpoint konten:

```bash
curl https://<domain>/api/v1/konten/prodi   # harus berisi daftar prodi
```

Kalau hosting meminta *health check path*, pakai `/api/v1/sehat`.

## Status & yang belum selesai

Ditulis apa adanya supaya tidak dianggap kelalaian. Tahap mengacu ke §9.3
`docs/SDD-Backend-Foundation.md`.

- **B1–B5 selesai penuh**: kerangka server, migrasi 001–005, benih, auth
  (daftar/masuk/keluar/keluar-semua/saya/ubah-sandi), konten publik F1–F5,
  `kemajuan` (F5), `kartu` (F6) dengan uji otorisasi kepemilikan.
- **Arsip Belajar (LANJUT_039)**: `PATCH /kartu/:id` kini juga menerima
  `mapel_id` (kategori kartu, divalidasi ke tabel `mapel`). Tidak ada migrasi:
  `kartu.mapel_id` sudah ada sejak 004. Tes: `tests/kartu-arsip.test.js`.
- **F7 Latihan (LANJUT_041)**: `GET /sesi-latihan` baru (sesi milik sendiri, 50
  terakhir, dengan `jumlah_dijawab` & `jumlah_benar`). `POST /sesi-latihan`
  menolak mapel tak dikenal (400) dan id sesi milik akun lain (400 `id`).
  `POST /riwayat-latihan` memeriksa semua rujukan sebelum menulis: sesi milik
  sendiri, kartu milik sendiri atau kurasi terverifikasi (404), mapel dikenal
  (400); `mapel_id` diambil dari kartunya. Dulu rujukan tak dikenal jatuh ke
  FK (500) dan akun lain bisa menautkan catatan ke sesi/kartu orang lain.
  Tes: `tests/latihan.test.js`.
  - **Keyakinan (LANJUT_058, tanpa migrasi):** setiap catatan `POST
    /riwayat-latihan` boleh membawa `keyakinan` bilangan bulat **1–5**
    (opsional, boleh `null`; kolom `riwayat_latihan.keyakinan` sudah ada sejak
    005). Nilai lain (0, 6, pecahan, teks) → 400 `VALIDASI_GAGAL` dan seluruh
    kiriman tidak tersimpan. App Expo menanyakan tiga pilihan dan mengirim
    yakin = 4, ragu = 2, tebak = 1 (label PWA); dilewati = tidak dikirim, jadi
    app lama tetap sah. `gap_numerik`/`kelas_gap` tetap dihitung server.
    Pemeriksaan kontrak lengkap: `docs/levelin-pemeriksaan-kontrak-058.md`.
  - `POST /sesi-latihan` `asal_mula`: app memakai `arsip` (bawaan) dan
    `beranda_saran` bila sesi dimulai dari kartu saran di layar Level-In.
- **Saringan kartu kurasi di server (LANJUT_040)**: `GET /kartu` (dengan atau
  tanpa parameter) hanya mengirim kartu resmi yang `status_verifikasi =
  'terverifikasi'` DAN `diperiksa_pada` terisi — syarat yang sama dengan F10 —
  plus kartu milik sendiri. `?sumber=` hanya menyaring lebih lanjut. Tes:
  `tests/kartu-kurasi.test.js`. Menandai kartu kurasi: `npm run
  verifikasi-konten -- --jenis=kartu --id=... --ya` (LANJUT_043, bagian 2a).
- **Persiapan verifikasi konten (LANJUT_043)**: `verifikasi-konten` mengenal
  jenis `kartu` (hanya kurasi tim) dan setiap perubahan status wajib `--ya`;
  benih kini mempertahankan tanda kartu kurasi selama isinya sama (pola
  LANJUT_020); `npm run lembar-review` menyusun lembar review tim konten.
  Tes: `tests/verifikasi-konten.test.js`, `tests/benih-verifikasi.test.js`,
  `tests/lembar-review.test.js`.
- **Jenis sekolah (LANJUT_038, migrasi 011)**: `pengguna.jenis_sekolah`
  SMP/SMA/SMK/MA; migrasi mengisi SMP untuk kelas 7–9. Aturannya satu, di
  `src/util/kelas.js` `tentukanJenisSekolah` (dipakai daftar, PATCH profil,
  klaim sinkron): kelas 7–9 → SMP; kelas 10–12 → SMA/SMK/MA atau null (SMP
  lama dikosongkan saat kelas naik); kombinasi bertentangan → 400. Tes:
  `tests/pengguna-jenis-sekolah.test.js`.
- **Kelas SMP (LANJUT_035, migrasi 010)**: `pengguna.kelas` menerima
  '7'–'12' (daftar nilai di `src/util/kelas.js`, dipakai skema daftar, ubah
  profil, dan klaim sinkron). `kelas` tetap opsional saat daftar supaya APK
  lama tidak gagal. Tes: `tests/pengguna-kelas.test.js`.
- **`butir-pribadi` (LANJUT_034, migrasi 009)**: butir Daftar Periksa milik
  akun dari F3/F10. `GET/POST /butir-pribadi`, `PUT/DELETE
  /butir-pribadi/:id/selesai` (centang/batal, baris tetap), `DELETE
  /butir-pribadi/:id` (hapus lunak). Judul disusun server; butir akun lain →
  404. Tes: `tests/butir-pribadi.test.js`, termasuk lintas akun.
- **B6 (Level-In) selesai di server (LANJUT_042)** — gratis, dihitung di
  server (keputusan Khalifa). `src/modul/levelin/keputusan.js` kini SALINAN
  PERSIS Lapisan 2 `MVP-PWA/assets/levelin.js` (`gapNumerik`,
  `klasifikasiKartu`, `agregatPerMapel`, `ringkasSesi`, `saranHarian`);
  `tests/levelin-keputusan.test.js` membandingkan teks badan fungsi dan
  keluarannya dengan berkas PWA (B-K6/RB5). Perbedaan tanda tangan ditangani
  adaptor di `levelin.layanan.js`. Ambang dibaca dari `konfigurasi_levelin`
  (benih dari `data/levelin-konfig.json`, pemetaan di
  `modul/levelin/konfigurasi.js`), bukan ditulis di kode.
  - `GET /kalibrasi/ringkasan?jendela=` — satu baris `kalibrasi_mapel`
    (SDD-LevelIn §3.2) per mapel, SEMUA mapel eksplisit, ditambah
    `level_akurasi` { kartu_dijawab, n_benar, rate_benar, level }.
  - `level_akurasi` (khusus server, `levelAkurasiPerMapel`): tabel fallback
    Khalifa dari benar/salah tanpa keyakinan — < 10 jawaban
    `belum_cukup_data`; < 50% `perlu_penguatan_dasar`; 50–75%
    `cukup_lanjut_latihan`; > 75% `sudah_kuat`. Ada karena logika PWA hanya
    menghitung jawaban berkeyakinan, sedangkan F7 tidak mengirimnya.
  - `GET /saran-harian` — `{ jenis, mapel_id, alasan }`, `jenis` persis rantai
    PWA §6.1f (dari kalibrasi keyakinan). Tanpa keyakinan, akun F7 mendapat
    `pengguna_baru`.
  - `POST /riwayat-latihan` dengan `keyakinan` kini menghitung `gap_numerik`,
    `kelas_gap`, dan `aturan_versi` dengan ambang yang berlaku (dulu 500).
  - Ketersediaan kartu untuk saran: milik sendiri + kurasi terverifikasi
    (syarat LANJUT_040).
  - **Layar Level-In di app (LANJUT_058)** memakai ketiga endpoint ini apa
    adanya; tidak ada logika atau ambang yang diubah. Sejak app mengirim
    keyakinan, kalibrasi dan saran harian punya bahan dari F7.
  Tes: `tests/levelin-keputusan.test.js`, `tests/levelin-kalibrasi.test.js`,
  `tests/latihan.test.js` (keyakinan, LANJUT_058).
- **B7 selesai**: `POST /sinkron/klaim` — idempoten, menolak baris milik
  pengguna lain (`TIDAK_BERHAK`), tidak pernah memindahkan kepemilikan. Diuji
  di `tests/sinkron.test.js`. **Audit LANJUT_042**: rujukan di dalam baris
  kini diperiksa sebelum ditulis — `sesi_id`/`kartu_id` yang bukan milik
  pengklaim dilepas (NULL, dihitung di `peristiwa.tautan_dilepas`), `mapel_id`
  /`butir_id` tak dikenal ditolak per baris (`VALIDASI_GAGAL`), kartu
  diklaim sebelum peristiwa. Dulu akun B bisa menautkan riwayatnya ke
  sesi/kartu pribadi akun A, dan rujukan tak dikenal → 500. Tes lintas akun:
  `tests/sinkron-lintas-akun.test.js`. Belum ada klien yang memanggil
  endpoint ini (SDD §6.3, catatan 27 Sep 2026).
- **B8, B9 tidak dikerjakan** — di luar cakupan tugas ini (penyambungan
  klien `daftar.html`/`masuk.html`/`akun.html`, dan penyiapan tayang/HTTPS/
  cadangan). Lihat §9.3 SDD.

### Penyimpangan kecil dari SDD (dengan alasan)

1. **Tabel `kategori_checklist` ditambahkan** (migrasi 002), di luar daftar
   tabel eksplisit §3.4. `MVP-PWA/data/checklist.json` mengelompokkan butir
   checklist ke dalam kategori tampilan ("Berkas Pendaftaran", dst.), dan
   catatan di berkas JSON itu sendiri menyarankan "kalau nanti masuk basis
   data, kategori sebaiknya jadi tabel sendiri, bukan teks bebas." §3.4 SDD
   backend tidak menyebut tabel ini (kemungkinan luput tercatat saat
   perancangan). Ditambahkan seminimal mungkin (2 kolom + FK dari
   `butir_daftar_periksa.kategori_id`) supaya `GET /konten/checklist` bisa
   mengembalikan pengelompokan yang sama seperti JSON sekarang, tanpa
   mengubah 5 kolom inti `butir_daftar_periksa` yang memang dikunci §3.4.
2. **`percobaanMasuk.repo.js` sebagai berkas terpisah** di `modul/auth/` —
   tidak disebut eksplisit di pohon folder §9.2, tetapi dibutuhkan supaya SQL
   untuk tabel `percobaan_masuk` (§8.2) tetap hanya hidup di berkas
   `*.repo.js` (aturan §2.2), bukan disisipkan ke `sesi.repo.js` yang secara
   semantik untuk tabel berbeda.
3. **Pemetaan medan `cerita-alumni.json`** — item di berkas itu memakai nama
   medan `sumber` untuk nilai `"contoh"`, yang secara semantik cocok dengan
   kolom `asal` (nilai sejenis `"mockup"/"contoh"/"resmi"` di berkas JSON
   lain), bukan dengan kolom `sumber` (kelas kepercayaan
   resmi/pengguna/mitra, `rancangan-arsip-latihan-banksoal.md` §1). Benih
   memetakan: kolom `sumber` = `'resmi'` (dikurasi tim), kolom `asal` = nilai
   asli `item.sumber`. Nilai isi (teks, `izin_tayang`, `tayang`) **tidak**
   diubah — lihat komentar lengkap di `src/db/benih/benih.js`.
4. **`§6.6` (jam perangkat salah) diimplementasikan sebagian.** Waktu yang
   dikirim klien (`dijawab_pada`, `dimulai_pada`, `selesai_pada`,
   `selesai_pada` klaim kemajuan) diterima apa adanya **hanya bila** selisih
   dengan jam server ≤ 24 jam; di luar itu, server memakai jamnya sendiri
   (`src/util/waktu.js#keDbDariKlien`). Ini penerapan literal aturan §6.6,
   tetapi belum ada uji otomatis khusus untuk kasus tepi ini — hanya diuji
   manual.
5. **`PATCH /kartu/{id}` memakai `CASE WHEN ... THEN ... ELSE kolom END`**,
   bukan merakit klausa `SET` secara dinamis dari daftar kolom yang berubah.
   Ini supaya SQL tetap 100% statis (tanpa `${...}` sama sekali di dalam
   string SQL) sesuai larangan literal §2.2 aturan 2, termasuk untuk kolom
   yang diperbarui sebagian.

### Yang belum diuji otomatis (diuji manual saja)

Tidak ada lagi endpoint yang hanya diuji manual. Sudah punya tes HTTP sejak
ditulisnya bagian ini: konten publik F1–F5 dan `kemajuan` (LANJUT_030,
`tests/konten-*.test.js`, `tests/kemajuan.test.js`), `GET/POST/PATCH
/sesi-latihan` dan `POST /riwayat-latihan` (LANJUT_041, `tests/latihan.test.js`),
serta `GET /kalibrasi/ringkasan`, `GET /saran-harian`, `GET
/konfigurasi/levelin`, dan riwayat berkeyakinan (LANJUT_042,
`tests/levelin-kalibrasi.test.js`).

## Cara test manual cepat (tanpa menulis test)

```bash
# Daftar
curl -s -X POST http://localhost:3000/api/v1/auth/daftar \
  -H "Content-Type: application/json" \
  -d '{"nama_pengguna":"budi123","kata_sandi":"sandiaman1"}'

# Simpan token dari respons di atas, lalu:
curl -s http://localhost:3000/api/v1/auth/saya -H "Authorization: Bearer <token>"

# Konten publik, tanpa login:
curl -s http://localhost:3000/api/v1/konten/linimasa
curl -s http://localhost:3000/api/v1/konten/banner
curl -s http://localhost:3000/api/v1/konten/checklist?kelas=12&jalur=SNBP
curl -s "http://localhost:3000/api/v1/konten/checklist?kelas=12&jalur=SNBP&rumpun=Teknologi%20%26%20Rekayasa"
```

### Filter rumpun di checklist (migrasi 006, LANJUT_007)

- Kolom `butir_daftar_periksa.berlaku_untuk_rumpun`: daftar rumpun dipisah
  koma, nilainya sama persis dengan `prodi.rumpun` (mis. `Teknologi & Rekayasa`).
  `NULL` = butir umum, berlaku untuk semua rumpun.
- `GET /konten/checklist?rumpun=` mengembalikan butir umum **ditambah** butir
  khusus rumpun itu. Rumpun yang tidak cocok butir mana pun → hanya butir umum.
- **Beda dari `kelas`/`jalur`:** tanpa `rumpun`, butir khusus rumpun **tidak**
  ikut (bukan "semua"). Klien lama yang belum mengirim `rumpun` tetap mendapat
  hasil persis seperti sebelum kolom ini ada, dan hitungan X/Y-nya tidak
  bertambah oleh butir rumpun lain.
- Tiap butir di respons kini punya `berlaku_untuk_rumpun`: `null` (umum) atau
  array rumpun.
- Butir khusus rumpun belum ada; mengisinya kerja tim konten, lewat
  `MVP-PWA/data/checklist.json` + `npm run benih` (lihat di bawah).

**Menambah butir khusus rumpun (tim konten).** Di `MVP-PWA/data/checklist.json`,
beri butir medan opsional `berlaku_untuk_rumpun` berisi array nama rumpun,
ditulis **persis** seperti `rumpun` di `prodi.json`:

```json
{ "id": "surat-sehat", "judul": "…", "urutan": 12,
  "berlaku_untuk_kelas": ["12"], "berlaku_untuk_jalur": ["SNBP", "SNBT"],
  "berlaku_untuk_rumpun": ["Kesehatan"] }
```

Lalu jalankan `npm run benih`. Butir tanpa medan ini (atau array kosong) tetap
berlaku untuk semua rumpun. Nama rumpun yang tidak dikenal membuat benih
berhenti dengan pesan galat berisi daftar pilihan yang sah, sebelum ada data
checklist yang ditulis. Contoh lengkap: `tests/contoh/checklist-contoh-rumpun.json`.
