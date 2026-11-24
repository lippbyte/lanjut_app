# Peta Navigasi v2 (LANJUT_031, diperbarui LANJUT_032 & LANJUT_033)

> **Status:** inventaris terverifikasi terhadap seluruh berkas di `app/` dan `docs/audit-ui-v1.md`. Diperbarui pada `LANJUT_032` (`/jejak-waktu`, `/langkah-saya`) dan `LANJUT_033` (reskin `/jalur-tujuan` & `/jalur-tujuan-tulis` menjadi Jalur Saya v2).
> **Saklar v2:** `EXPO_PUBLIC_NAVIGASI_V2` (mati bawaan). Saat mati, navigasi v1 berjalan persis seperti sebelumnya tanpa perubahan rute maupun perilaku.
> **Aturan nama:** nama rute, kunci API, tabel, dan saklar yang sudah ada **tidak diubah**. Hanya label tampilan yang disesuaikan (K47: Arah Saya, Jelajah, Jalur Saya, Jejak Waktu, Langkah Saya, Rekam Jejak, Profil Saya, Akun & Privasi).

## 1. Susunan tab bawah v2

Dibaca dari satu berkas konfigurasi (`lib/navigasiV2.ts`, `KONFIGURASI_TAB_V2`):

| Urutan | Label tampilan v2 | Rute utama | Rute cadangan | Muncul bila |
|---|---|---|---|---|
| 1 | Arah Saya | `/arah-saya` | — | selalu (wajib) |
| 2 | Jelajah | `/discover` | — | `EXPO_PUBLIC_DISCOVER=1` |
| 3 | Jejak Waktu | `/jejak-waktu` | — | selalu (wajib) |
| 4 | Profil Saya | `/discover-profil` | `/akun` (saat `EXPO_PUBLIC_DISCOVER` mati) | selalu (wajib) |

Saat `EXPO_PUBLIC_DISCOVER` mati, hanya tiga tab yang tampil (`Arah Saya`, `Jejak Waktu`, `Profil Saya`), merata penuh tanpa celah, dan tab `Profil Saya` langsung membuka `/akun`. Saat `EXPO_PUBLIC_DISCOVER=1`, tab `Profil Saya` membuka `/discover-profil` (layar profil 026) disertai pintu langsung ke **Akun & Privasi** (`/akun`). Di tab **Jejak Waktu** (`/jejak-waktu`) tersedia pintu langsung ke **Langkah Saya** (`/langkah-saya`).

## 2. Inventaris seluruh layar dan rute v1 → tempatnya di v2

Diperiksa langsung dari seluruh berkas `.tsx` di `app/` (3 `_layout.tsx`, 1 `+html.tsx`, 35 rute v1, 3 rute khusus v2, dan 1 rute galeri dev dari 029) serta 3 lapisan non-rute. **Tidak ada kemampuan atau rute v1 yang hilang tanpa alasan eksplisit.**

### 2.1 Lapisan non-rute (tetap berlaku di v1 dan v2)

| Nama v1 | Rute | Saklar | Dijangkau di v2 | Label tampilan v2 |
|---|---|---|---|---|
| Pembuka | (lapisan di `app/_layout.tsx`) | aktif (`EXPO_PUBLIC_ALUR_MASUK_V2` mempersingkat jadi 800 ms) | otomatis saat app dibuka | — |
| Onboarding | (lapisan di `app/(auth)/_layout.tsx`) | aktif tanpa sesi (`EXPO_PUBLIC_ALUR_MASUK_V2` memakai `PengantarV2`) | otomatis saat belum masuk | — |
| Gerbang pasca-masuk | (lapisan di `app/(app)/_layout.tsx`: buat sandi baru, isi kelas, isi jenis sekolah, prompt kebijakan, gerbang kecenderungan arah 030) | aktif berurutan (`GerbangArahV2` hanya bila `EXPO_PUBLIC_ALUR_MASUK_V2=1`; layar yang sama dibuka ulang dari kartu Arahku di Arah Saya) | otomatis di atas shell v2 sebelum tab bisa dipakai | — |

### 2.2 Rute luar sesi dan pengalihan akar (5 rute v1 + 1 rute dev)

| Nama v1 | Rute | Saklar | Dijangkau di v2 | Label tampilan v2 |
|---|---|---|---|---|
| Indeks akar | `/` | selalu aktif | pengalihan otomatis ke `/arah-saya` saat `EXPO_PUBLIC_NAVIGASI_V2=1` (v1: `/linimasa`) | — |
| Masuk | `/masuk` | selalu aktif (`EXPO_PUBLIC_ALUR_MASUK_V2` memilih v2; tombol Google bila `EXPO_PUBLIC_GOOGLE_CLIENT_ID` diisi) | otomatis saat belum masuk / dari Onboarding | Masuk |
| Masuk Google (penerus) | `/masuk-google` | selalu aktif (terpakai bila `EXPO_PUBLIC_GOOGLE_CLIENT_ID` diisi) | penerus OAuth dari `/masuk`, lalu masuk ke `/arah-saya` saat v2 menyala | Masuk dengan Google |
| Daftar | `/daftar` | selalu aktif (`EXPO_PUBLIC_ALUR_MASUK_V2` memilih v2) | pintu dari Onboarding dan `/masuk` | Daftar |
| Kebijakan privasi (tanpa sesi) | `/kebijakan-privasi` | selalu aktif | pintu dari `/daftar`, `PromptKebijakan`, dan Akun & Privasi (`/akun`) | Kebijakan Privasi |
| Galeri komponen (khusus dev, 029) | `/galeri-komponen` | `EXPO_PUBLIC_GALERI_KOMPONEN=1` dan `__DEV__` (dikeluarkan di `metro.config.js` dan produksi) | URL dev langsung; bukan layar siswa | Galeri Komponen |

### 2.3 Rute dalam sesi (`app/(app)/*` — semua 30 rute v1)

| Nama v1 | Rute | Saklar | Dijangkau / status di v2 | Label tampilan v2 |
|---|---|---|---|---|
| Beranda / Linimasa | `/linimasa` | selalu aktif di v1 | **Digantikan oleh Arah Saya (`/arah-saya`) dan Jejak Waktu (`/jejak-waktu`).** Alasan: `/linimasa` sebenarnya Beranda v1 sehingga sebelumnya menduplikasi beranda saat tab Jejak Waktu membukanya; di v2 peran beranda diambil `/arah-saya` dan jadwal waktu dibuka di `/jejak-waktu`. Rute `/linimasa` tetap utuh saat `EXPO_PUBLIC_NAVIGASI_V2` mati. | Arah Saya / Jejak Waktu |
| Discover | `/discover` | `EXPO_PUBLIC_DISCOVER=1` | **Tab:** Jelajah; **Kartu pintu besar** di Arah Saya; **Tombol keadaan kosong** Arah Saya & Jejak Waktu | Jelajah |
| Tulis Refleksi | `/discover-refleksi` | `EXPO_PUBLIC_DISCOVER=1` | **Pintu dari layar lain:** layar Jelajah (`/discover`) | Tulis Refleksi |
| Profil Eksplorasi (026) | `/discover-profil` | `EXPO_PUBLIC_DISCOVER=1` | **Tab:** Profil Saya (saat Discover menyala); **Pintu dari layar lain:** `/discover` | Profil Saya |
| Data Akun | `/akun` | selalu aktif | **Pintu dari layar lain:** pintu Akun & Privasi di tab Profil Saya (`/discover-profil`), atau langsung di **Tab:** Profil Saya saat Discover mati | Akun & Privasi |
| Hapus akun & unduh data | `/hapus-akun` | `EXPO_PUBLIC_KELOLA_DATA_AKUN=1` | **Pintu dari layar lain:** bagian Data saya di Akun & Privasi (`/akun`) | Hapus Akun |
| Terima Kebijakan Privasi | `/terima-kebijakan` | selalu aktif | **Pintu dari layar lain:** Akun & Privasi (`/akun`), `PromptKebijakan`, dan `/ngobrol` | Kebijakan Privasi |
| Daftar Periksa | `/daftar-periksa` | selalu aktif di v1 | **Digantikan oleh Langkah Saya (`/langkah-saya`).** Alasan: daftar periksa di-reskin menjadi `/langkah-saya` memakai token dua mode v2 dengan perilaku data identik (`kemajuan_pengguna`, `butir_pribadi`, dan `event_sekolah` SMP). Rute `/daftar-periksa` tetap utuh saat `EXPO_PUBLIC_NAVIGASI_V2` mati. | Langkah Saya |
| Jalur & Tujuan | `/jalur-tujuan` | `EXPO_PUBLIC_JALUR_TUJUAN=1` | **Kartu pintu besar** Jalur Saya di Arah Saya; **Chip Arahku** di Arah Saya. Merender komponen v2 (`JalurSayaV2`, LANJUT_033) saat `EXPO_PUBLIC_NAVIGASI_V2=1`, dan tetap merender v1 (`JalurTujuanScreen`) saat mati. | Jalur Saya |
| Tulis Tujuan | `/jalur-tujuan-tulis` | `EXPO_PUBLIC_JALUR_TUJUAN=1` | **Pintu dari layar lain / URL langsung:** layar Jalur Saya (`/jalur-tujuan`, formulir utama dibuka lewat modal di `/jalur-tujuan`; rute `/jalur-tujuan-tulis` merender `TujuanTulisV2` saat `EXPO_PUBLIC_NAVIGASI_V2=1`). | Tulis Tujuan |
| Portofolio | `/portofolio` | `EXPO_PUBLIC_PORTOFOLIO=1` | **Kartu pintu besar** Rekam Jejak (bobot visual terbesar) di Arah Saya | Rekam Jejak |
| Tulis Catatan Portofolio | `/portofolio-tulis` | `EXPO_PUBLIC_PORTOFOLIO=1` | **Pintu dari layar lain:** layar Rekam Jejak (`/portofolio`) | Tulis Catatan |
| Detail Catatan Portofolio | `/portofolio-butir` | `EXPO_PUBLIC_PORTOFOLIO=1` | **Pintu dari layar lain:** layar Rekam Jejak (`/portofolio`) | Catatan |
| Arsip Belajar | `/arsip` | selalu aktif | **Alat belajar** (lipat) di Arah Saya | Arsip Belajar |
| Tulis Kartu | `/arsip-tulis` | selalu aktif | **Pintu dari layar lain:** Arsip Belajar (`/arsip`) | Tulis Kartu |
| Kartu | `/arsip-kartu` | selalu aktif | **Pintu dari layar lain:** Arsip Belajar (`/arsip`) dan Langkah Saya (`/langkah-saya`, materi event SMP) | Kartu |
| Modul | `/arsip-modul` | selalu aktif | **Pintu dari layar lain:** Arsip Belajar (`/arsip`) | Modul |
| Unggah Modul | `/arsip-modul-unggah` | selalu aktif | **Pintu dari layar lain:** Arsip Belajar (`/arsip`) | Unggah Modul |
| Latihan | `/latihan` | selalu aktif | **Alat belajar** (lipat) di Arah Saya; **Pintu dari layar lain:** Arsip Belajar (`/arsip`) dan Level-In (`/level-in`) | Latihan |
| Riwayat Latihan | `/latihan-riwayat` | selalu aktif | **Pintu dari layar lain:** Latihan (`/latihan`) dan Arsip Belajar (`/arsip`) | Riwayat Latihan |
| Level-In | `/level-in` | selalu aktif (isi & logika tidak disentuh, K33) | **Alat belajar** (lipat) di Arah Saya | Level-In |
| Ngobrol Bareng LANJUT | `/ngobrol` | rute aktif; AI mengikuti `ai_aktif` server; mikrofon via `EXPO_PUBLIC_MIKROFON_NGOBROL=1` | **Alat belajar** (lipat) di Arah Saya | Ngobrol Bareng LANJUT |
| Persetujuan Orang Tua/Wali | `/persetujuan-ortu` | selalu aktif | **Pintu dari layar lain:** Ngobrol Bareng LANJUT (`/ngobrol`) | Persetujuan Orang Tua/Wali |
| Jenjang Saya | `/jenjang-saya` | selalu aktif | **Alat belajar** (lipat) di Arah Saya | Jenjang Saya |
| Khusus SMK (alias lama) | `/khusus-smk` | selalu aktif | pengalihan otomatis ke `/jenjang-saya` (alias dipertahankan utuh) | Jenjang Saya |
| Pilih Mapel | `/pilih-mapel` | selalu aktif | **Alat belajar** (lipat) di Arah Saya; **Pintu dari layar lain:** Jenjang Saya (`/jenjang-saya`) dan Langkah Saya (`/langkah-saya`) | Pilih Mapel |
| Eksplorasi Kampus / Tujuan | `/eksplorasi-tujuan` | selalu aktif | **Alat belajar** (lipat) di Arah Saya; **Pintu dari layar lain:** Pilih Mapel (`/pilih-mapel`), Jenjang Saya (`/jenjang-saya`), dan Langkah Saya (`/langkah-saya`) | Eksplorasi Kampus |
| Cek Posisi (v1: Profil Saya) | `/cek-posisi` | selalu aktif (khusus kelas 12; jenjang lain menampilkan placeholder) | **Alat belajar** (lipat) di Arah Saya; **Pintu dari layar lain:** Akun & Privasi (`/akun`) | Cek Posisi |
| Gaya Belajar | `/gaya-belajar` | selalu aktif | **Alat belajar** (lipat) di Arah Saya; **Pintu dari layar lain:** Jenjang Saya (`/jenjang-saya`) | Gaya Belajar |
| Cerita Alumni | `/cerita-alumni` | selalu aktif | **Alat belajar** (lipat) di Arah Saya | Cerita Alumni |

### 2.4 Rute baru khusus v2 (3 rute, di balik saklar mati bawaan)

| Nama v2 | Rute | Saklar | Dijangkau di v2 | Label tampilan v2 |
|---|---|---|---|---|
| Arah Saya (Beranda v2, 031) | `/arah-saya` | `EXPO_PUBLIC_NAVIGASI_V2=1` (keluar dari bundel di `metro.config.js` bila mati) | **Tab:** Arah Saya (tab pertama dan halaman awal sesudah masuk) | Arah Saya |
| Jejak Waktu (032) | `/jejak-waktu` | `EXPO_PUBLIC_NAVIGASI_V2=1` (keluar dari bundel di `metro.config.js` bila mati) | **Tab:** Jejak Waktu; **Kartu Langkah berikutnya** di Arah Saya (untuk tahapan linimasa) | Jejak Waktu |
| Langkah Saya (032) | `/langkah-saya` | `EXPO_PUBLIC_NAVIGASI_V2=1` (keluar dari bundel di `metro.config.js` bila mati) | **Kartu pintu besar** Langkah Saya di Arah Saya; **Kartu Langkah berikutnya** di Arah Saya; **Pintu** di tab Jejak Waktu (`/jejak-waktu`) | Langkah Saya |

## 3. Ringkasan cakupan

- **Rute v1 yang sengaja digantikan di v2 (`RUTE_V1_DIGANTIKAN_V2`):** **2 rute** (`/linimasa` → `/arah-saya` + `/jejak-waktu`; `/daftar-periksa` → `/langkah-saya`), masing-masing terdokumentasi eksplisit beserta alasannya dan diuji otomatis di `server/tests/navigasi-v2.test.js`. Kedua rute v1 tetap utuh saat `EXPO_PUBLIC_NAVIGASI_V2` mati.
- **Rute v1 lainnya (28 rute dalam sesi + 5 luar sesi):** seluruhnya tetap terjangkau langsung di graf navigasi v2.
- **Catatan layar yang belum di-reskin (task 034–035):** layar v1 lain (`/discover`, `/discover-profil`, `/portofolio`, `/akun`, dan layar di Alat belajar) tetap tampil dalam bentuk v1 di dalam shell navigasi v2. (`/jalur-tujuan` dan `/jalur-tujuan-tulis` sudah memakai tampilan Jalur Saya v2 sejak `LANJUT_033` saat `EXPO_PUBLIC_NAVIGASI_V2=1`.)
