# Peta Data Jejak Waktu dan Langkah Saya v2 (LANJUT_032)

> **Status:** inventaris sumber data klien yang sudah ada sebelum pembangunan layar `/jejak-waktu` dan `/langkah-saya` (di balik saklar `EXPO_PUBLIC_NAVIGASI_V2`, mati bawaan).
> **Aturan keras:** **tanpa perubahan server, API, skema, migrasi, atau isi `server/data-konten`.** Semua layar v2 di task ini hanya memakai rute API dan hook klien yang sudah tersedia di repositori.

---

## 1. Ringkasan sumber data yang dipakai

| Sumber / Tabel DB | Rute API klien yang sudah ada | Hook & utilitas klien | Kolom tersedia di respons klien | Jenjang / kelas relevan | Dipakai di layar v2 | Penanda jalur (`Melanjutkan` / `Bekerja` / `Wirausaha`) |
|---|---|---|---|---|---|---|
| `tahapan_linimasa` | `GET /konten/linimasa` | `hooks/useTahapanLinimasa.ts`, `lib/linimasa.ts` | `id`, `judul`, `tanggal_mulai`, `tanggal_selesai`, `jalur_seleksi` (`TKA` \| `SNBP` \| `SNBT`), `jalur` (alias kompatibilitas), `sumber`, `pemilik`, `status_verifikasi`, `asal`, `url_sumber`, `diperiksa_pada` | **Kelas 12** (`kelompokJenjang(kelas) === 'kelas12'`) | **Jejak Waktu** (`/jejak-waktu`) — **hanya** baris dengan `status_verifikasi === 'terverifikasi'` dan `diperiksa_pada != null` | **Tidak ada** (hanya `jalur_seleksi` seleksi kampus: `TKA`, `SNBP`, `SNBT`) |
| `event_sekolah` | `GET /pengguna/event`, `POST /pengguna/event`, `PATCH /pengguna/event/:id`, `DELETE /pengguna/event/:id`, `GET /pengguna/event/pilihan-kartu` | `hooks/useEventSekolah.ts`, `lib/eventSekolah.ts` | `id`, `jenis` (`UTS` \| `UAS` \| `PAS` \| `Ulangan` \| `TKA` \| `Lainnya`), `tanggal` (`YYYY-MM-DD`), `mapel_id`, `materi_teks`, `kartu_id`, `materi` (`tersedia`, `jenis`, `judul`, `isi`, `sumber_nama`), `dibuat_pada`, `diubah_pada` | **Kelas 7–9 (SMP)** (`untukPersiapanEvent(kelas)`), saat saklar server `event_sekolah_aktif = 1` | **Jejak Waktu** (`/jejak-waktu`, baca jadwal) & **Langkah Saya** (`/langkah-saya`, tambah/ubah/hapus jadwal SMP seperti di v1) | **Tidak ada** |
| `butir_daftar_periksa` + `kategori_checklist` | `GET /konten/checklist?kelas=&jalur_seleksi=&rumpun=` | `hooks/useButirDaftarPeriksa.ts`, `hooks/useProgresDaftarPeriksa.ts`, `hooks/useSaringDaftarPeriksa.ts`, `lib/daftarPeriksa.ts` | `id`, `judul`, `urutan`, `berlaku_untuk_kelas`, `berlaku_untuk_jalur_seleksi`, `berlaku_untuk_jalur`, `berlaku_untuk_rumpun`, `kategori_id`, `kategori_nama`, `sumber`, `pemilik`, `status_verifikasi`, `asal`, `url_sumber`, `diperiksa_pada` | **Kelas 12** di tampilan utama (dengan penyaring lokal `kelas` `10`/`11`/`12`, `jalur_seleksi`, dan `rumpun` dari `pengguna.prodi_impian`, sama persis dengan v1) | **Langkah Saya** (`/langkah-saya`) | **Tidak ada** (hanya `berlaku_untuk_jalur_seleksi`: `TKA`, `SNBP`, `SNBT`) |
| `kemajuan_pengguna` | `GET /kemajuan`, `PUT /kemajuan/:butirId`, `DELETE /kemajuan/:butirId` | `hooks/useKemajuan.ts` (`useKemajuan`, `useTandaiKemajuan`) | `butir_id`, `selesai_pada` | Mengikuti akun masuk (dipasangkan dengan `butir_daftar_periksa` pada **kelas 12**) | **Langkah Saya** (`/langkah-saya`) | **Tidak ada** |
| `butir_pribadi` | `GET /butir-pribadi`, `POST /butir-pribadi`, `PUT /butir-pribadi/:id/selesai`, `DELETE /butir-pribadi/:id/selesai`, `DELETE /butir-pribadi/:id` | `hooks/useButirPribadi.ts` (`useButirPribadi`, `useTambahButirPribadi`, `useTandaiButirPribadi`, `useHapusButirPribadi`) | `id`, `jenis` (`mapel_tka` \| `riset_kampus`), `prodi_id`, `judul`, `kategori_id`, `kategori_nama`, `selesai_pada`, `dibuat_pada` | **Semua kelas (7–12)** | **Langkah Saya** (`/langkah-saya`: centang, batal-centang, hapus; tambah tetap lewat `/pilih-mapel` dan `/eksplorasi-tujuan` karena skema server mewajibkan `jenis` + `prodi_id` terdaftar) | **Tidak ada** |
| `prodi` (pendukung saringan rumpun) | `GET /konten/prodi` | `hooks/useProdi.ts` | `id`, `nama`, `rumpun`, `status_verifikasi`, `diperiksa_pada` | Dipakai memetakan `pengguna.prodi_impian` → `rumpun` untuk saringan `butir_daftar_periksa` | **Langkah Saya** (`/langkah-saya`) | **Tidak ada** |

### Catatan tentang sumber lain yang diperiksa tetapi tidak dijadikan sumber utama

- **`tujuan` (`GET /tujuan`, kolom `target_pada`):** berada di balik saklar eksperimen terpisah `EXPO_PUBLIC_JALUR_TUJUAN` (mati bawaan), dan pada benih akun dummy (`server/tools/benih-dummy.js`) kolom `target_pada` bernilai `null`. Karena Jejak Waktu v2 harus bekerja mandiri saat hanya `EXPO_PUBLIC_NAVIGASI_V2=1` yang dinyalakan tanpa memaksa `EXPO_PUBLIC_JALUR_TUJUAN=1`, tabel `tujuan` tidak dipakai sebagai sumber Jejak Waktu pada tahap ini.

---

## 2. Kejujuran penanda jalur (`Melanjutkan`, `Bekerja`, `Wirausaha`)

Tidak ada satu pun dari keempat sumber di atas (`tahapan_linimasa`, `event_sekolah`, `butir_daftar_periksa`, `butir_pribadi`) yang memiliki kolom penanda `jalur_minat_id` (`melanjutkan`, `bekerja`, `wirausaha`):

1. Kolom `jalur_seleksi` / `berlaku_untuk_jalur_seleksi` pada `tahapan_linimasa` dan `butir_daftar_periksa` hanya berisi jalur seleksi masuk perguruan tinggi (`TKA`, `SNBP`, `SNBT`).
2. Sesuai aturan `LANJUT_032` §3 dan §9, aplikasi **tidak membuat pemetaan karangan** (misalnya menganggap `SNBP` = `Melanjutkan` lalu menyembunyikannya dari siswa yang memilih `Bekerja` + `Melanjutkan`, atau mengarang butir baru untuk `Bekerja`/`Wirausaha`).
3. Layar **Jejak Waktu** dan **Langkah Saya** menampilkan seluruh butir yang relevan menurut **jenjang/kelas akun** (serta pilihan saringan `jalur_seleksi` di Langkah Saya kelas 12 seperti di v1). Penyaringan otomatis menurut jalur minat (`Melanjutkan`, `Bekerja`, `Wirausaha`) menunggu data konten di server memiliki kolom penanda jalur resmi.

---

## 3. Penanganan per jenjang dan kelas (jujur apa adanya)

### Kelas 12 (`kelompokJenjang === 'kelas12'`)
- **Jejak Waktu (`/jejak-waktu`):**
  - Membaca `tahapan_linimasa` dan menyaring ketat hanya baris dengan `status_verifikasi === 'terverifikasi'` **dan** `diperiksa_pada` terisi.
  - Baris dengan tanggal tidak lengkap atau kosong **tidak ditebak**; tanggalnya ditampilkan sebagai `"Tanggal resmi belum diumumkan"` dan ditempatkan di kelompok **Berikutnya**.
  - Bila belum ada tahapan terverifikasi sama sekali, layar menampilkan keadaan kosong ramah (maskot kelinci di dalam lingkaran `#B4E1EB` pada mode terang maupun gelap) dan satu tombol aksi.
- **Langkah Saya (`/langkah-saya`):**
  - Menampilkan satu ringkasan progres di atas (`"X dari Y selesai"` dengan batang progres) yang menghitung gabungan butir umum (`butir_daftar_periksa` sesuai saringan kelas/jalur seleksi/rumpun) dan `butir_pribadi`.
  - Mempertahankan pilihan saringan lokal v1 (`kelas`: `10`/`11`/`12`; `jalurSeleksi`: `Semua`/`TKA`/`SNBP`/`SNBT`) agar tidak ada kemampuan `DaftarPeriksaScreen` v1 yang hilang.
  - Mengizinkan centang/batal-centang butir umum (`PUT`/`DELETE /kemajuan/:id`), centang/batal-centang butir pribadi (`PUT`/`DELETE /butir-pribadi/:id/selesai`), hapus butir pribadi (`DELETE /butir-pribadi/:id`), serta pintasan menambah butir pribadi lewat Pilih Mapel (`/pilih-mapel`) atau Eksplorasi Kampus (`/eksplorasi-tujuan`).

### Kelas 7–9 / SMP (`kelompokJenjang === 'smp'`)
- **Jejak Waktu (`/jejak-waktu`):**
  - Tidak menampilkan `tahapan_linimasa` (khusus kelas 12).
  - Membaca `event_sekolah` milik siswa (`GET /pengguna/event`). Bila saklar server `event_sekolah_aktif = 1` dan siswa memiliki jadwal ujian/persiapan, butirnya dikelompokkan ke **Segera**, **Berikutnya**, dan **Sudah lewat** (terlipat).
  - Bila saklar server `event_sekolah_aktif = 0` (`403 FITUR_BELUM_TERSEDIA`) atau siswa belum mencatat jadwal apa pun, layar menampilkan keadaan kosong ramah dengan maskot kelinci di lingkaran `#B4E1EB` dan satu tombol menuju **Langkah Saya**.
- **Langkah Saya (`/langkah-saya`):**
  - Menampilkan `butir_pribadi` milik siswa (bila ada: progres, centang/batal-centang, hapus) **ditambah** pengelolaan **Jadwal & Persiapan Sekolah** (`event_sekolah`: tambah, ubah, hapus jadwal UTS/UAS/PAS/Ulangan Harian/TKA kelas 9/Lainnya beserta materi teks atau kartu) ketika fitur `event_sekolah_aktif` di server menyala — memakai komponen dan token v2.
  - Bila belum ada `butir_pribadi` dan belum ada jadwal (atau fitur `event_sekolah_aktif` sedang mati di server), tampil keadaan kosong ramah dengan maskot kelinci di lingkaran `#B4E1EB` dan satu tombol aksi.

### Kelas 10–11 (`kelompokJenjang === 'sma1011'`)
- **Jejak Waktu (`/jejak-waktu`):**
  - Secara jujur **belum ada tabel jadwal di server untuk kelas 10–11**: `tahapan_linimasa` adalah jadwal seleksi kelas 12, sedangkan endpoint `/pengguna/event` menolak kelas 10–12 dengan `403 KELAS_TIDAK_DIDUKUNG`.
  - Aplikasi **tidak mengarang tanggal** dan tidak memaksakan jadwal kelas 12. Siswa kelas 10–11 melihat keadaan kosong yang tenang dengan maskot kelinci di lingkaran `#B4E1EB` dan satu tombol aksi (ke **Jelajah** `/discover` bila saklar Discover aktif, atau ke **Langkah Saya** `/langkah-saya` bila mati).
- **Langkah Saya (`/langkah-saya`):**
  - Menampilkan progres, centang/batal-centang, dan hapus untuk `butir_pribadi` yang sudah disimpan siswa (misalnya dari Pilih Mapel atau Eksplorasi Tujuan/Kampus), lengkap dengan pintasan ke layar tersebut.
  - Bila siswa kelas 10–11 belum menyimpan `butir_pribadi` apa pun, tampil keadaan kosong ramah dengan maskot kelinci di lingkaran `#B4E1EB` dan satu tombol aksi (ke `/pilih-mapel` untuk mulai menyimpan langkah pribadi).

---

## 4. Aturan pengelompokan waktu di Jejak Waktu (`lib/jejakWaktuV2.ts`)

- **Zona waktu acuan:** selalu `Asia/Jakarta` (WIB, `UTC+7`), melalui fungsi murni `hariIniWib(sekarangMs)` dengan parameter waktu `"sekarang"` yang disuntikkan agar deterministik pada pengujian otomatis.
- **Batas jendela "Segera":** **`JENDELA_SEGERA_HARI = 30` hari kalender** terhitung dari tengah malam WIB hari ini (`0 <= selisihHari <= 30`, termasuk tahapan rentang tanggal yang sedang berlangsung hari ini selama `tanggal_selesai >= hariIni`).
- **Kelompok tampilan:**
  1. **Segera:** butir bertanggal resmi yang jatuh hari ini, sedang berlangsung hari ini, atau mulai dalam `1..30` hari ke depan. Ditandai dengan bobot huruf judul semi-tebal dan lencana teks `"Segera"` (tanpa warna merah/oranye dan tanpa hitungan mundur berdetak).
  2. **Berikutnya:** butir bertanggal resmi dengan `selisihHari > 30` hari ke depan, serta butir terverifikasi yang tanggal resminya belum diumumkan (`"Tanggal resmi belum diumumkan"`).
  3. **Sudah lewat** *(terlipat secara bawaan)*: butir yang tanggal akhirnya (`tanggal_selesai ?? tanggal_mulai`) `< hariIni` (WIB). Butir yang sudah lewat **tidak pernah** masuk ke **Segera** ataupun **Berikutnya**.
