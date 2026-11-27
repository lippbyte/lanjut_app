# Audit Siap-Tester v2 — LANJUT_038 (Hanya Baca)

- **Tanggal audit:** 27 November 2026
- **Commit dasar yang diaudit:** `8735a2b` (`LANJUT_037`) pada branch `lanjut-v2-dev` (`lippbyte/lanjut_app`)
- **Sifat audit:** **hanya baca**. Tidak ada berkas aplikasi (`app/`, `components/`, `hooks/`, `lib/`, `theme/`), server (`server/src/`), tes yang sudah ada, kebijakan, maupun konfigurasi build (`eas.json`, `app.config.ts`, `package.json`, `docker-compose.yml`, `railway.json`) yang diubah.
- **Alat pengukur yang dapat diulang:** `node tools/audit-siap-tester.js` (dijalankan dari `LANJUT_App/server/`, atau tambah `--tanpa-db` bila MySQL dev mati).
- **Tangkapan layar alur penuh:** `docs/periksa-layar-038/` (21 berkas PNG bertanda `DEV`).

> **Aturan pemisahan status bukti dalam laporan ini:**
> 1. **Terbukti (diukur):** didukung langsung oleh keluaran skrip yang bisa diulang, kueri basis data `lanjut_dev`, atau tangkapan layar peramban di `docs/periksa-layar-038/`.
> 2. **Belum diuji (butuh HP fisik atau manusia):** belum pernah dijalankan di HP Android/iOS nyata, TalkBack/VoiceOver, kamera asli, HEIC iOS, skala huruf OS asli, atau infrastruktur server produksi (Dokploy).
> 3. **Bergantung pada konten atau keputusan Khalifa / peninjau hukum:** tidak bisa diselesaikan lewat kode semata (persetujuan teks, isi konten jalur/Jelajah/jadwal, 19 isian kebijakan privasi, surat orang tua, keputusan tampilan fitur v1).

---

## Ringkasan Posisi terhadap Definisi "Siap-Tester" (K46)

| Syarat Definisi Siap-Tester (K46) | Status saat ini | Keterangan singkat |
|---|---|---|
| Alur masuk lengkap | **Sebagian terbukti** | Alur daftar 8 langkah, masuk, keluar, dan `Tetap masuk` berjalan lancar di peramban (0 galat konsol). Namun modal kebijakan di `DaftarV2` tidak terbaca di mode gelap, dan alur persetujuan orang tua untuk siswa di bawah 18 tahun belum ada di formulir pendaftaran (menunggu tinjauan hukum isian #2 & #13). |
| Semua layar utama berwajah v2 | **Terbukti untuk layar utama, TAPI layar v1 masih bocor** | 15 rute siswa utama sudah berwajah v2 (+ 1 dev `/galeri-komponen`). Namun **18 rute v1 aktif** di dalam sesi (17 rute + 1 alias `/khusus-smk`, termasuk seluruh 10 item **Alat belajar** di Arah Saya) masih bisa dibuka penguji dan **teksnya hilang/tidak terbaca di mode gelap**, plus `/kebijakan-privasi` menyilaukan putih terang saat mode gelap. |
| Minimal 2–3 kartu Jelajah bersumber & teks 3 jalur disetujui | **Belum terpenuhi (0 / 0)** | Di `lanjut_dev`: `0` dari 3 jalur disetujui (T13), `0` dari 6 kartu Jelajah disetujui/terverifikasi/bersumber URL (K39). Penguji hari ini melihat keadaan kosong di Kecenderungan Arah, Jalur Saya, Jelajah, dan Profil Saya. |
| Aksesibilitas dasar & 360 px rapi | **Sebagian lolos, sebagian gagal** | Terbukti di peramban: 0 overflow mendatar (360 & 412 px), 0 target sentuh `< 44 pt` (120 kontrol), 0 kontrol tanpa nama aksesibel, 9/9 animasi menghormati Kurangi Gerakan. **Gagal:** kontras modal kebijakan & layar v1 di mode gelap (`1.01:1`), maskot `PengantarV2` gelap (`#16294A`), serta label `TabBarV2` terpotong pada simulasi font 1,3× dan 2,0×. Uji HP fisik, TalkBack/VoiceOver, dan font OS asli **belum pernah dilakukan**. |
| Gerbang rilis lolos | **Belum lolos (22 pemblokir)** | `npm run periksa-gerbang-rilis` gagal dengan 19 isian `[ISI]` kebijakan privasi + 3 kelompok teks pilot belum disetujui (`0` disetujui di `docs/persetujuan-teks-rilis.json`). Menyalakan saklar v2 di profil build akan menambah 3 pemblokir teks v2 lagi (total 6 kelompok teks). |
| Cadangan terbukti, surat orang tua lengkap, peninjau hukum menilai | **Belum terbukti / menunggu manusia** | Cadangan & pemulihan Dokploy belum pernah diuji di produksi; surat orang tua masih menyebut aplikasi tidak mengumpulkan foto; 19 isian kebijakan & tinjauan hukum masih terbuka. |

---

## Bagian A — Peta Seluruh Rute Aplikasi Saat Semua 7 Saklar v2 Menyala

Konfigurasi uji: `EXPO_PUBLIC_ALUR_MASUK_V2=1`, `EXPO_PUBLIC_NAVIGASI_V2=1`, `EXPO_PUBLIC_MODE_GELAP=1`, `EXPO_PUBLIC_PORTOFOLIO=1`, `EXPO_PUBLIC_JALUR_TUJUAN=1`, `EXPO_PUBLIC_DISCOVER=1`, `EXPO_PUBLIC_KELOLA_DATA_AKUN=1` (total **39 berkas rute** di `app/` + **4 lapisan non-rute**).

### A.1 Lapisan Non-Rute dan Modal (di luar berkas rute `app/`)

| Lapisan / Komponen | Nama tampilan | Muncul dari mana | Wajah saat 7 saklar v2 menyala | Status Mode Gelap | Catatan untuk penguji |
|---|---|---|---|---|---|
| `LayarMemuat` (`app/_layout.tsx`) | Pembuka / Memuat | Otomatis saat app dibuka | **v1** (durasi dipersingkat jadi 800 ms oleh `ALUR_MASUK_V2`) | **Tidak serasi** (latar terang tetap `#FFFFFF` saat tema gelap sistem aktif) | Ringan (sekilas), namun menyilaukan sejenak di mode gelap. |
| `PengantarV2` (`app/(auth)/_layout.tsx`) | Pengantar 3 kartu | Otomatis saat belum masuk | **v2** | **Kurang serasi di maskot:** lingkaran maskot memakai `warna.brand` (`#16294A`) bukan `#B4E1EB` (bukti `01-pengantar-gelap-412.png`). | **Mengganggu:** garis biru maskot meredup di mode gelap; kartu 3 juga memuat istilah v1 `"Data Akun"`. |
| `ModalKebijakanV2` (di dalam `DaftarV2.tsx`) | Kebijakan Privasi Lengkap | Ketuk "Baca lengkap" saat langkah Privasi di `/daftar` | **Campuran v2 + isi v1 (`IsiKebijakan`)** | **RUSAK / TIDAK TERBACA:** wadah modal memakai latar `#0C1B33`, sedangkan `IsiKebijakan` memakai tinta gelap keras `#1A1A1A` (`1.01:1`) dan `#3D4450` (`1.75:1`). | **Pemblokir penguji** di mode gelap. |
| `GerbangArahV2` (`app/(app)/_layout.tsx`) | Kecenderungan Arah | Otomatis sesudah daftar/masuk baru (atau dari chip Arahku di Arah Saya) | **v2** | **Benar** | Saat ini selalu menampilkan keadaan kosong karena 0 jalur disetujui. |
| 4 gerbang v1 pasca-masuk (`app/(app)/_layout.tsx`: `BuatSandiBaruScreen`, `IsiKelasScreen`, `IsiJenisSekolahScreen`, `PromptKebijakan`) | Buat sandi / Lengkapi kelas / Pembaruan kebijakan | Otomatis untuk akun lama / kebijakan versi baru | **Masih v1** | **Tidak serasi** (latar putih terang tetap, belum mengenal token v2) | Terlihat bila akun lama migrasi atau versi kebijakan naik. |

### A.2 Rute Luar Sesi, Akar, dan Dev (6 berkas rute)

| Rute | Nama tampilan | Dapat dicapai dari mana (ketukan dari Arah Saya) | Wajah saat 7 saklar v2 menyala | Status Mode Gelap | Layak dicapai penguji / saran |
|---|---|---|---|---|---|
| `/` (`app/index.tsx`) | Pengalihan akar | Otomatis saat masuk (0 ketukan) | Pengalihan ke `/arah-saya` | — | Ya (internal) |
| `/masuk` (`app/(auth)/masuk.tsx`) | Masuk | Otomatis tanpa sesi / Keluar dari `/akun` (3 ketukan dari Arah Saya) | **v2 (`MasukV2`)** | **Benar** | **Ya** |
| `/daftar` (`app/(auth)/daftar.tsx`) | Daftar (8 langkah) | Dari Pengantar / `/masuk` | **v2 (`DaftarV2`)** *(kecuali modal isi kebijakan masih v1)* | **Benar di formulir, RUSAK di `ModalKebijakanV2`** | **Ya**, setelah modal kebijakan diperbaiki |
| `/kebijakan-privasi` (`app/kebijakan-privasi.tsx`) | Kebijakan Privasi | `/akun` → Kebijakan privasi (**3 ketukan** dari Arah Saya: tab Profil Saya → Akun & Privasi → Kebijakan privasi) | **Masih v1** | **Tidak serasi:** seluruh layar menyilaukan putih terang di tengah sesi mode gelap (bukti `15-v1-kebijakan-privasi-di-gelap-412.png`). | **Ya, wajib dipakai** — perlu token dua mode v2 supaya tidak kontras menyilaukan |
| `/masuk-google` (`app/masuk-google.tsx`) | Masuk dengan Google | Penerus OAuth dari `/masuk` (hanya aktif bila `EXPO_PUBLIC_GOOGLE_CLIENT_ID` diisi) | **Masih v1** | **Tidak serasi** (layar tunggu putih terang) | Hanya aktif bila Google OAuth dinyalakan |
| `/galeri-komponen` (`app/galeri-komponen.tsx`) | Galeri Komponen | URL dev langsung saja (`EXPO_PUBLIC_GALERI_KOMPONEN=1` & `__DEV__`) | **v2 (khusus pengembang)** | **Benar** | **Sembunyikan / pastikan MATI** (sudah diblokir `metro.config.js` dan `app.config.ts` pada profil selain `development`) |

### A.3 Rute Dalam Sesi yang Sudah Berwajah v2 (13 berkas rute)

| Rute | Nama tampilan v2 | Dapat dicapai dari mana & ketukan dari Arah Saya | Wajah saat 7 saklar v2 menyala | Status Mode Gelap | Layak dicapai penguji / saran |
|---|---|---|---|---|---|
| `/arah-saya` | Arah Saya | Tab 1 / layar awal (**0 ketukan**) | **v2 (`ArahSayaV2`)** | **Benar** (`06b-arah-saya-gelap-412.png`) | **Ya** |
| `/jejak-waktu` | Jejak Waktu | Tab 3 (**1 ketukan**) atau kartu Langkah berikutnya (**1 ketukan**) | **v2 (`JejakWaktuV2`)** | **Benar** | **Ya** *(lihat catatan konten Kelas 10/11 & batas 29 Nov 2026)* |
| `/langkah-saya` | Langkah Saya | Kartu Langkah Saya di Arah Saya (**1 ketukan**) atau pintu di Jejak Waktu (**2 ketukan**) | **v2 (`LangkahSayaV2`)** | **Benar** | **Ya** |
| `/jalur-tujuan` | Jalur Saya | Kartu Jalur Saya atau chip Arahku di Arah Saya (**1 ketukan**) | **v2 (`JalurSayaV2`)** | **Benar** | **Ya** *(tunggu T13 agar jalur tidak kosong; perbaiki 1 label `"Data Akun"`)* |
| `/jalur-tujuan-tulis` | Tulis Tujuan | Rute anak `/jalur-tujuan` (**2 ketukan** bila dibuka langsung; modal utama di `/jalur-tujuan`) | **v2 (`TujuanTulisV2`)** | **Benar** | **Ya** |
| `/discover` | Jelajah | Tab 2 (**1 ketukan**) atau kartu Jelajah di Arah Saya (**1 ketukan**) | **v2 (`JelajahV2`)** | **Benar** | **Ya** *(tunggu K39 agar tidak kosong)* |
| `/discover-refleksi` | Tulis Refleksi | Rincian kartu di `/discover` (**3 ketukan**) | **v2 (`RefleksiJelajahV2`)** | **Benar** | **Ya** *(baru bisa dicapai sesudah K39 ada kartu disetujui)* |
| `/discover-profil` | Profil Saya (Profil Eksplorasi) | Tab 4 (**1 ketukan**) | **v2 (`ProfilEksplorasiV2`)** | **Benar** | **Ya** *(perbaiki 1 label `"Data Akun"`)* |
| `/portofolio` | Rekam Jejak | Kartu Rekam Jejak di Arah Saya (**1 ketukan**) | **v2 (`RekamJejakDaftarV2`)** | **Benar** | **Ya** |
| `/portofolio-tulis` | Tulis Catatan | Tombol Tambah catatan di `/portofolio` (**2 ketukan**) | **v2 (`RekamJejakTulisV2`)** | **Benar** | **Ya** |
| `/portofolio-butir` | Catatan (Rincian & Foto) | Ketuk satu catatan di `/portofolio` (**2 ketukan**) | **v2 (`RekamJejakDetailV2`)** | **Benar** | **Ya** |
| `/akun` | Akun & Privasi | Tab Profil Saya → kartu Akun & Privasi (**2 ketukan**; atau **1 ketukan** bila Discover mati) | **v2 (`AkunPrivasiV2`)** | **Benar** (`13-akun-privasi-gelap-412.png`) | **Ya** |
| `/hapus-akun` | Hapus Akun | Kartu Hapus akun di `/akun` (**3 ketukan**) | **v2 (`HapusAkunV2`)** | **Benar** (`14-hapus-akun-gelap-412.png`) | **Ya** *(tergantung keputusan T14 untuk penguji)* |

*(Catatan: jumlah rute v2 dalam sesi di atas adalah **13 berkas rute** + 2 rute luar sesi `/masuk`, `/daftar` + 1 rute dev `/galeri-komponen` = **16 berkas rute berwajah v2** dari total 39 berkas rute.)*

### A.4 Rute Dalam Sesi yang MASIH v1 di Dalam `AppShellV2` (20 berkas rute)

> **TEMUAN KRITIS — LAYAR v1 RUSAK DI MODE GELAP:**
> `AppShellV2` memberi latar belakang gelap `#0C1B33` pada wadah utama, sementara layar v1 di bawahnya tidak menetapkan latar putih sendiri dan memakai warna teks keras v1 `#1A1A1A` (rasio kontras **`1.01:1`**) serta `#3D4450` (rasio **`1.75:1`**). Akibatnya pada mode gelap, **judul layar, subjudul, dan pesan kosong di layar v1 nyaris menghilang sepenuhnya** di atas latar biru gelap! Bukti visual: **`docs/periksa-layar-038/16-v1-arsip-di-shell-gelap-412.png`** (judul `"Arsip Belajar"` dan tulisan `"Belum ada kartu."` menghilang di latar gelap).

| Rute | Nama tampilan | Dapat dicapai dari mana & ketukan dari Arah Saya | Wajah saat 7 saklar v2 menyala | Status Mode Gelap | Layak dicapai penguji / saran |
|---|---|---|---|---|---|
| `/arsip` | Arsip Belajar | Arah Saya → buka lipatan Alat belajar → Arsip Belajar (**2 ketukan**) | **Masih v1** | **RUSAK (`1.01:1`, teks hilang di latar `#0C1B33`)** — bukti `16-v1-arsip-di-shell-gelap-412.png` | **Saran:** bungkus layar v1 dengan permukaan terang di shell, atau sembunyikan bagian Alat belajar pada build penguji v2 bila di luar cakupan uji |
| `/arsip-tulis` | Tulis Kartu | Dari `/arsip` (**3 ketukan**) | **Masih v1** | **RUSAK di mode gelap** | Sama seperti `/arsip` |
| `/arsip-kartu` | Kartu | Dari `/arsip` (**3 ketukan**) atau materi event SMP di `/langkah-saya` (**2–3 ketukan**) | **Masih v1** | **RUSAK di mode gelap** | Sama seperti `/arsip` |
| `/arsip-modul` | Modul | Dari `/arsip` (**3 ketukan**) | **Masih v1** | **RUSAK di mode gelap** | Sama seperti `/arsip` |
| `/arsip-modul-unggah` | Unggah Modul | Dari `/arsip` (**3 ketukan**) | **Masih v1** | **RUSAK di mode gelap** | Sama seperti `/arsip` |
| `/latihan` | Latihan | Alat belajar (**2 ketukan**), `/arsip`, `/level-in` | **Masih v1** | **RUSAK di mode gelap** | Sama seperti `/arsip` |
| `/latihan-riwayat` | Riwayat Latihan | Dari `/latihan` atau `/arsip` (**3 ketukan**) | **Masih v1** | **RUSAK di mode gelap** | Sama seperti `/arsip` |
| `/level-in` | Level-In | Alat belajar (**2 ketukan**) | **Masih v1** (K33: isi & logika tidak disentuh) | **RUSAK di mode gelap** | **Sebaiknya disembunyikan** di APK penguji v2 (atau diberi wadah permukaan terang) agar penguji tidak menilai layar v1 rusak |
| `/ngobrol` | Ngobrol Bareng LANJUT | Alat belajar (**2 ketukan**; AI mengikuti `ai_aktif=0` di server) | **Masih v1** | **RUSAK di mode gelap** | **Sebaiknya disembunyikan** saat `ai_aktif=0` atau diberi wadah terang |
| `/persetujuan-ortu` | Persetujuan Orang Tua/Wali | Dari `/ngobrol` (**3 ketukan**) | **Masih v1** | **RUSAK di mode gelap** | Mengikuti `/ngobrol` (surat orang tua juga belum diperbarui untuk foto) |
| `/jenjang-saya` | Jenjang Saya | Alat belajar (**2 ketukan**) | **Masih v1** | **RUSAK di mode gelap** | Butuh wadah terang atau ditunda di luar cakupan penguji |
| `/khusus-smk` | Alias → `/jenjang-saya` | Tautan/URL lama (pengalihan otomatis) | **Pengalihan v1** | Mengikuti `/jenjang-saya` | Rute alias usang (dipertahankan untuk kompatibilitas, tidak ada tautan langsung di UI v2) |
| `/pilih-mapel` | Pilih Mapel | Alat belajar (**2 ketukan**) atau tautan di `/langkah-saya` (**2 ketukan**) | **Masih v1** | **RUSAK di mode gelap** | **Dapat dicapai dari Langkah Saya!** Wajib minimal dibungkus wadah terang di shell v2 |
| `/eksplorasi-tujuan` | Eksplorasi Kampus | Alat belajar (**2 ketukan**) atau tautan di `/langkah-saya` (**2 ketukan**) | **Masih v1** | **RUSAK di mode gelap** | **Dapat dicapai dari Langkah Saya!** Wajib minimal dibungkus wadah terang di shell v2 |
| `/cek-posisi` | Cek Posisi | Alat belajar (**2 ketukan**) | **Masih v1** | **RUSAK di mode gelap** | Sama seperti Alat belajar lainnya |
| `/gaya-belajar` | Gaya Belajar | Alat belajar (**2 ketukan**) atau `/jenjang-saya` | **Masih v1** | **RUSAK di mode gelap** | Sama seperti Alat belajar lainnya |
| `/cerita-alumni` | Cerita Alumni | Alat belajar (**2 ketukan**) | **Masih v1** | **RUSAK di mode gelap** | Sama seperti Alat belajar lainnya |
| `/terima-kebijakan` | Kebijakan Privasi (sesi) | Dari `/ngobrol` atau `PromptKebijakan` | **Masih v1** | **RUSAK di mode gelap** | Perlu token dua mode v2 bersama `IsiKebijakan` dan `/kebijakan-privasi` |
| `/linimasa` | Beranda v1 (digantikan) | Tidak ada tautan di UI v2 (hanya URL langsung) | **Masih v1** (digantikan `/arah-saya` & `/jejak-waktu`) | **RUSAK jika dibuka manual** | **Rute usang di v2** (aman karena tidak ada pintu di UI; tetap utuh bila saklar v2 mati) |
| `/daftar-periksa` | Daftar Periksa v1 (digantikan) | Tidak ada tautan di UI v2 (hanya URL langsung) | **Masih v1** (digantikan `/langkah-saya`) | **RUSAK jika dibuka manual** | **Rute usang di v2** (aman karena tidak ada pintu di UI; tetap utuh bila saklar v2 mati) |

**Ringkasan inventaris rute (`39` berkas rute di `app/`):**
- **16 rute berwajah v2** (13 dalam sesi + 2 luar sesi `/masuk`, `/daftar` + 1 dev `/galeri-komponen`).
- **1 rute pengalihan akar** (`/`).
- **2 rute luar sesi masih v1** (`/kebijakan-privasi`, `/masuk-google`).
- **20 rute dalam sesi masih v1** (17 bisa dibuka penguji lewat Alat belajar / Langkah Saya / Ngobrol, 1 alias `/khusus-smk`, 2 digantikan tanpa tautan UI `/linimasa`, `/daftar-periksa`).

---

## Bagian B — Hasil Pengukuran yang Bisa Diulang & Kesiapan Konten/Rilis

### B.1 Pengukuran Teknis yang Dapat Diulang

Semua pengukuran statis & basis data bisa dijalankan ulang oleh Khalifa kapan saja dari `LANJUT_App/server/` lewat:
```powershell
node tools/audit-siap-tester.js
```

#### 1. Kontras Warna (WCAG 2.2 AA: 4,5:1 teks biasa; 3,0:1 teks besar & komponen UI)
- **Token inti v2 (`server/tools/kontras-token.js`):**
  - 14/14 pasangan semantik 031b **LOLOS** di mode terang dan gelap (`0` gagal).
  - 28/28 pasangan komponen v2 (`Kartu`, `Tombol`, `Isian`, `PesanStatus`, `TabBarV2`, `DaftarItem`, `Penanda`) **LOLOS** di mode terang dan gelap (`0` gagal).
- **Pasangan tambahan yang dipakai layar v2 (`audit-siap-tester.js`):**
  - `aksen / permukaanLembut` (pilihan aktif Tampilan, chip aktif): `5.88:1` terang / `7.07:1` gelap — **LOLOS**.
  - `garisKontrol / permukaanLembut` (tepi kontrol): `4.77:1` terang / `4.54:1` gelap — **LOLOS**.
  - `galat / halaman` (tepi tombol/kartu hapus): `6.51:1` terang / `7.20:1` gelap — **LOLOS**.
  - `aksen / halaman` (garis fokus & tombol sekunder): `6.69:1` terang / `8.63:1` gelap — **LOLOS**.
  - `aksen / permukaan` (tombol sekunder di kartu): `6.23:1` terang / `7.26:1` gelap — **LOLOS**.
  - `teksSekunder / brand` (pemeriksaan larangan `muted` di atas `bagianBiru`): `3.85:1` terang (**GAGAL** 4,5:1) / `4.66:1` gelap (lolos). *Aman saat ini karena komponen `Kartu` varian `brand` memaksa teks utama `#0C1B33`, bukan `teksSekunder`.*
- **KEGAGALAN KONTRAS NYATA (wajib diperbaiki sebelum penguji):**
  1. **`DaftarV2 -> ModalKebijakanV2 -> IsiKebijakan (v1)` di mode gelap:** latar `#0C1B33` dipasangkan dengan tinta keras v1 `#1A1A1A` = **`1.01:1`** (GAGAL), `#3D4450` = **`1.75:1`** (GAGAL), `#6B7480` = **`3.63:1`** (GAGAL).
  2. **Seluruh 18 layar v1 dalam sesi di dalam `AppShellV2` mode gelap:** latar `#0C1B33` dipasangkan dengan tinta keras v1 `#1A1A1A` = **`1.01:1`** (GAGAL; bukti visual `docs/periksa-layar-038/16-v1-arsip-di-shell-gelap-412.png`).
  3. **`PengantarV2` lingkaran maskot di mode gelap (`components/screens/v2/PengantarV2.tsx:60`):** memakai `warna.brand` (`#16294A`) bukan `warna.latarMaskot` (`#B4E1EB`, keputusan 24 Nov), sehingga garis biru maskot kelinci meredup di mode gelap (bukti `docs/periksa-layar-038/01-pengantar-gelap-412.png`).

#### 2. Target Sentuh (< 44 pt), Nama Aksesibel, dan Overflow Mendatar (360 px & 412 px)
Diukur otomatis lewat peramban (Chrome headless terhadap bundel web dengan 7 saklar v2 menyala) pada **17 tangkapan layar v2** (total **120 kontrol interaktif**):

| Layar & Tangkapan | Mode & Lebar | Kontrol | `< 44 pt` | Tanpa nama aksesibel | Overflow mendatar (`sw > vw`) | Galat konsol |
|---|---|---:|---:|---:|---:|---:|
| `01-pengantar-gelap-412` | Gelap, 412 px | 4 | 0 | 0 | Tidak (`412/412`) | 0 |
| `01b-pengantar-terang-360` | Terang, 360 px | 4 | 0 | 0 | Tidak (`360/360`) | 0 |
| `02-daftar-akun-terang-360` | Terang, 360 px | 4 | 0 | 0 | Tidak (`360/360`) | 0 |
| `03-daftar-modal-kebijakan-gelap-412`* | 412 px* | 5 | 0 | 0 | Tidak (`412/412`) | 0 |
| `04-daftar-siap-terang-360` | Terang, 360 px | 3 | 0 | 0 | Tidak (`360/360`) | 0 |
| `05-kecenderungan-kosong-terang-360` | Terang, 360 px | 1 | 0 | 0 | Tidak (`360/360`) | 0 |
| `06-arah-saya-terang-360` | Terang, 360 px | 11 | 0 | 0 | Tidak (`360/360`) | 0 |
| `06b-arah-saya-gelap-412` | Gelap, 412 px | 11 | 0 | 0 | Tidak (`412/412`) | 0 |
| `07-jalur-saya-terang-360` | Terang, 360 px | 7 | 0 | 0 | Tidak (`360/360`) | 0 |
| `08-rekam-jejak-detail-foto-terang-360` | Terang, 360 px | 10 | 0 | 0 | Tidak (`360/360`) | 0 |
| `09-jejak-waktu-terang-360` | Terang, 360 px | 7 | 0 | 0 | Tidak (`360/360`) | 0 |
| `10-langkah-saya-terang-360` | Terang, 360 px | 11 | 0 | 0 | Tidak (`360/360`) | 0 |
| `11-jelajah-kosong-terang-360` | Terang, 360 px | 5 | 0 | 0 | Tidak (`360/360`) | 0 |
| `12-profil-saya-terang-360` | Terang, 360 px | 6 | 0 | 0 | Tidak (`360/360`) | 0 |
| `13-akun-privasi-gelap-412` | Gelap, 412 px | 12 | 0 | 0 | Tidak (`412/412`) | 0 |
| `14-hapus-akun-gelap-412` | Gelap, 412 px | 9 | 0 | 0 | Tidak (`412/412`) | 0 |
| `17-masuk-v2-setelah-keluar-terang-360` | Terang, 360 px | 6 | 0 | 0 | Tidak (`360/360`) | 0 |
| **Total (17 tangkapan v2)** | **360 & 412 px** | **120** | **0** | **0** | **0** | **0** |

*\*Catatan transparan pada `03-daftar-modal-kebijakan-gelap-412.png`: penyetelan `localStorage` di tengah sesi halaman tanpa pemicu React membuat gambar tersebut tertangkap dalam mode terang; kegagalan mode gelap `ModalKebijakanV2` dibuktikan secara eksak dari audit kode `DaftarV2.tsx:388` + perhitungan kontras `1.01:1` / `1.75:1` / `3.63:1` dan pola identik yang tertangkap langsung pada `16-v1-arsip-di-shell-gelap-412.png`.*

#### 3. Skala Font 1,3× dan 2,0× (Simulasi Peramban 360 px)
- **Cara pengukuran:** pada lebar layar `360 px` di Chrome headless, seluruh node teks di DOM dikalikan nilai `fontSize` dan `lineHeight` terhitungnya sebesar **1,3×** dan **2,0×** untuk 9 layar v2 utama (`Arah Saya`, `Jalur Saya`, `Jelajah`, `Profil Saya`, `Jejak Waktu`, `Langkah Saya`, `Rekam Jejak`, `Akun & Privasi`, `Hapus Akun`), lalu diperiksa overflow mendatar, potongan teks (`scrollWidth > clientWidth`), dan kontrol keluar layar.
- **Peringatan tegas:** ini **simulasi CSS peramban, BUKAN pengganti uji Ukuran Font / Dynamic Type asli di HP Android dan iOS** (perilaku `allowFontScaling`, pembatasan `maxFontSizeMultiplier`, dan tinggi komponen native bisa berbeda).
- **Hasil pengukuran (18 kombinasi = 9 layar × 2 skala):**
  - Overflow mendatar halaman: **0 dari 18** (`sw = 360`, `vw = 360`).
  - Kontrol keluar batas layar: **0 dari 18**.
  - **GAGAL — Label `TabBarV2` terpotong pada SEMUA 9 layar:**
    - Pada **1,3×:** label tab **`Jejak Waktu`** terpotong di seluruh 9 layar (`scrollWidth: 92–95 px` di dalam ruang `86 px`).
    - Pada **2,0×:** **3 dari 4 label tab terpotong parah** di seluruh 9 layar (`Arah Saya` `115–118/86` tampil `"Arah..."`, `Jejak Waktu` `141–146/86` tampil `"Jeja..."`, `Profil Saya` `124–129/86` tampil `"Profi..."`) dan hampir bertabrakan dengan `"Jelajah"`. Bukti visual: **`docs/periksa-layar-038/font-2x-arah-saya-360.png`** dan **`docs/periksa-layar-038/font-2x-akun-privasi-360.png`**.
  - Pada **2,0× di Arah Saya:** sapaan `"Halo, uji_audit..."` juga terpotong karena batas 2 baris; konten kartu utama di `Akun & Privasi` dan layar isi lainnya membungkus baris ke bawah dengan rapi dan tetap dapat digulir. *(Catatan: catatan `tumpuk` pada keluaran mentah JSON berasal dari kartu isi yang sedang berada di bawah bilah tab bawah tetap/sticky, bukan tombol bersaudara yang saling menimpa di area gulir.)*

#### 4. Gerak dan Preferensi "Kurangi Gerakan"
- Seluruh **9 berkas v2** yang memakai animasi (`PlaceholderMemuat`, `AppShellV2`, `ArahSayaV2`, `DaftarV2`, `JalurSayaV2`, `JelajahV2`, `KerangkaV2`, `PengantarV2`, `ProfilEksplorasiV2`) terbukti memeriksa `useKurangiGerak` / `gerakBoleh`.
- **0** timer `setInterval` berdetak ditemukan di seluruh komponen v2.

#### 5. Bahasa, Batas 40 Kata, Kata Terlarang, dan Kebocoran Istilah v1
Diukur oleh `server/tools/audit-siap-tester.js`:
- **Batas kata teks tetap:** **31 dari 31 keadaan** yang diukur **LOLOS** (`0` pelanggaran; tertinggi di layar isi v2 adalah `39/40` kata pada galat `Akun & Privasi` / `Hapus Akun`, dan `47/60` kata pada langkah masuk kode email).
- **Kata terlarang** (berbagi, peringkat, penilaian, lomba, klaim privasi baru): **0** ditemukan.
- **Warna ungu EDILAKSO terlarang:** **0** ditemukan di seluruh kode v2.
- **KEBOCORAN ISTILAH v1 YANG DITEMUKAN (3 bocor nyata di layar v2 + 1 kalimat v1 yang disetujui + 2 teks izin native):**
  1. `lib/alurMasukV2.ts:36` — `"Data bisa diunduh atau dihapus di Data Akun."` → terlihat langsung di kartu 3 `PengantarV2` (seharusnya `"Akun & Privasi"`).
  2. `lib/jalurSayaV2.ts:72` — `"Prodi impian · Data Akun"` → terlihat di `JalurSayaV2` (seharusnya `"Akun & Privasi"`).
  3. `lib/jelajahV2.ts:89` — `"Data Akun"` → terlihat di `ProfilEksplorasiV2` (seharusnya `"Akun & Privasi"`).
  4. *(Butuh keputusan Khalifa)* `lib/alurMasukV2.ts:17` (`TEKS_V1.dataPribadi`, disalin persis dari kalimat persetujuan v1 yang sudah disetujui 28 Sep 2026) masih memuat `"Daftar Periksamu"`.
  5. *(Teks izin native di `app.config.ts:100-101`)* `photosPermission` & `cameraPermission` masih menyebut `"catatan portofoliomu"` (istilah v1, bukan `"Rekam Jejakmu"`).
  *(Catatan: 2 temuan di `lib/navigasiV2.ts:290,295` adalah alasan dokumentasi internal pada `RUTE_V1_DIGANTIKAN_V2`, tidak pernah ditampilkan ke pengguna.)*

#### 6. Alur Penuh dari Nol (`docs/periksa-layar-038/`)
Dijalankan dari nol memakai akun baru `uji_audit_038_eulhk` (Kelas 12 SMA, sudah dihapus permanen kembali lewat `DELETE /api/v1/pengguna/saya` di akhir sesi) dengan semua 7 saklar v2 menyala:
- **Lintasan yang berhasil ditempuh tanpa macet (0 galat konsol):**
  `PengantarV2` (3 kartu) → `DaftarV2` (8 langkah: nama tampilan, nama pengguna, sandi, lewati email, baca modal kebijakan & centang setuju, kelas 12, SMA, prodi impian, ringkasan & kirim) → `GerbangArahV2` (kosong, lanjut) → `ArahSayaV2` → `JalurSayaV2` → `RekamJejakDaftarV2` → `RekamJejakTulisV2` (buat 1 catatan) → `RekamJejakDetailV2` (unggah 1 foto PNG nyata via `Pilih galeri`!) → `JejakWaktuV2` (1 aktif + 2 lewat) → `LangkahSayaV2` → `JelajahV2` → `ProfilEksplorasiV2` → `AkunPrivasiV2` (uji mode gelap) → `HapusAkunV2` → `Keluar` → `MasukV2` (`Tetap masuk` menyala + muat ulang halaman → tetap di `/arah-saya`).
- **Titik janggal yang tercatat pada alur penuh:**
  1. **Tidak ada langkah persetujuan orang tua/wali untuk siswa di bawah 18 tahun di `DaftarV2`:** pendaftaran hanya mengumpulkan centang kebijakan privasi oleh siswa sendiri (`versi_kebijakan`). Persetujuan orang tua saat ini baru ada di `/persetujuan-ortu` (khusus fitur AI/Ngobrol), karena isian kebijakan #2 dan #13 masih menunggu tinjauan hukum apakah akun dasar (tanpa AI) memerlukan persetujuan orang tua.
  2. **Empat layar utama tampil kosong pada hari pertama penguji baru:** Kecenderungan Arah (`"Pilihan jalur sedang disiapkan"`), Jalur Saya (tidak ada kartu jalur), Jelajah (`"Kartu sedang disiapkan"`), dan Profil Saya (`"Profil belum disusun"`), seluruhnya akibat konten `jalur_minat` dan `kartu_discover` masih berstatus draf (`0` disetujui).
  3. **Buka `/kebijakan-privasi` dari mode gelap:** menembakkan layar putih terang penuh (`15-v1-kebijakan-privasi-di-gelap-412.png`).
  4. **Buka `Alat belajar → Arsip Belajar` dari mode gelap:** judul dan teks kosong lenyap karena kontras `1.01:1` (`16-v1-arsip-di-shell-gelap-412.png`).

#### 7. Pemeriksaan Kebocoran Data API
- Seluruh respons JSON yang dicegat selama alur penuh (`/jalur-minat`, `/tujuan`, `/discover`, `/butir-bukti`): **0 kebocoran** (tidak ada ID jalur draf mentah, tidak ada teks `[DUMMY]`, tidak ada data akun lain).
- **Catatan pengecualian server yang sudah dikenal (sebelum audit ini):** pada `server/src/modul/tujuan/` (tercatat sejak 036/037b), titik akhir `PATCH /api/v1/tujuan/bukti/:butirId` masih mengembalikan medan `jalur_minat_id` mentah tanpa penyamaran `samarkanJalur` (tidak terpicu di alur standar tanpa kaitan jalur, tetapi perlu diselaraskan di server agar konsisten dengan semua titik akhir lain).

---

### B.2 Kesiapan Konten, Teks, dan Rilis (Bukti `lanjut_dev` per 27 November 2026)

#### 1. Jalur (`jalur_minat`)
- **Keadaan di `lanjut_dev`:** `3` baris total (`melanjutkan`, `bekerja`, `wirausaha`), **`0` disetujui**, **`3` berstatus `draf`**.
- **Yang dilihat penguji hari ini:** layar Kecenderungan Arah menampilkan `"Pilihan jalur sedang disiapkan"` dan layar Jalur Saya menampilkan keadaan kosong pada bagian pilihan jalur (penguji hanya bisa menulis tujuan bebas tanpa memilih jalur).
- **Syarat agar layak diuji:** **T13** — Khalifa membaca dan menyetujui teks ketiga jalur lalu status teksnya diperbarui sesuai prosedur persetujuan.

#### 2. Jelajah (`kartu_discover`)
- **Keadaan di `lanjut_dev`:** `6` baris total (`asal: 'contoh LANJUT_024'`), **`0` disetujui**, **`0` terverifikasi**, **`0` bersumber URL**.
- **Yang dilihat penguji hari ini:** tab **Jelajah** selalu menampilkan keadaan kosong `"Kartu sedang disiapkan"`, sehingga alur menulis refleksi (`/discover-refleksi`) dan menyusun Profil Eksplorasi dari hasil refleksi tidak bisa dialami penguji sama sekali.
- **Syarat agar layak diuji:** **K39** — minimal **2–3 kartu Jelajah** yang punya sumber URL nyata, terverifikasi, dan teksnya disetujui.

#### 3. Jejak Waktu (`tahapan_linimasa` + `event_sekolah`, tanggal audit: 27 Nov 2026)
- **Keadaan di `lanjut_dev`:**
  - `tahapan_linimasa`: `6` baris total = **`3` terverifikasi** (`asal: 'resmi'`, diperiksa `2026-09-27`) + **`3` belum diverifikasi** (`asal: 'mockup'`, `diperiksa_pada: null`).
  - `event_sekolah`: **`0` baris** dan konfigurasi `event_sekolah_aktif = '0'` (`ai_aktif = '0'`).
- **Rincian 6 entri `tahapan_linimasa`:**
  - `sosialisasi` (1–31 Jul 2026, TKA) — **belum diverifikasi (`mockup`)**, sudah lewat.
  - `daftar-akun-tka` (27 Jul–27 Sep 2026, TKA) — **terverifikasi**, sudah lewat.
  - `pelaksanaan-tka` (26 Okt–8 Nov 2026, TKA) — **terverifikasi**, sudah lewat.
  - `susulan-tka` (16–29 Nov 2026, TKA) — **terverifikasi**, **Segera (2 hari lagi, Sedang berlangsung)**.
  - `pdss` (1–31 Des 2026, SNBP) — **belum diverifikasi (`mockup`)**, *disembunyikan dari siswa sampai diverifikasi*.
  - `daftar-snbp` (4–18 Feb 2027, SNBP) — **belum diverifikasi (`mockup`)**, *disembunyikan dari siswa sampai diverifikasi*.
- **Yang dilihat penguji hari ini (27 Nov 2026) per jenjang:**
  - **Kelas 12:** `1` entri **Segera** (`Pelaksanaan susulan TKA`, sisa 2 hari) + `0` **Berikutnya** + `2` **Sudah lewat**. **PERINGATAN TANGGAL KRITIS:** sesudah **29 November 2026** (2 hari lagi), Kelas 12 akan melihat **`0` jadwal aktif / akan datang** (semua masuk lipatan Sudah lewat) kecuali jadwal resmi PDSS/SNBP/SNBT 2027 diverifikasi!
  - **Kelas 11:** **`0` entri** (layar kosong tenang dengan maskot kelinci).
  - **Kelas 10:** **`0` entri** (layar kosong tenang dengan maskot kelinci).
  - **SMP (Kelas 7–9):** **`0` entri** (layar kosong karena `event_sekolah_aktif = '0'` dan `0` event sekolah).

#### 4. Daftar Berkas Teks Draf dan Status Gerbang Rilis
- **`docs/persetujuan-teks-rilis.json`:** **`0` disetujui** (`disetujui: []`).
- **Seluruh 12 berkas `docs/draf-teks-*.md` (semua masih berstatus DRAF):**
  1. `docs/draf-teks-akun-privasi-v2.md`
  2. `docs/draf-teks-alur-masuk-v2.md`
  3. `docs/draf-teks-discover.md`
  4. `docs/draf-teks-hapus-akun.md`
  5. `docs/draf-teks-jalur-saya-v2.md`
  6. `docs/draf-teks-jalur-tujuan.md`
  7. `docs/draf-teks-jejak-waktu-v2.md`
  8. `docs/draf-teks-jelajah-v2.md`
  9. `docs/draf-teks-mode-tampilan-v2.md`
  10. `docs/draf-teks-navigasi-v2.md`
  11. `docs/draf-teks-portofolio.md`
  12. `docs/draf-teks-rekam-jejak-v2.md`
- **Hasil `npm run periksa-gerbang-rilis` saat ini (keluar kode `1` — BELUM BOLEH BUILD):**
  - **22 masalah pemblokir:**
    - **19 isian kebijakan privasi masih `[ISI]`** di `lib/kebijakan-privasi.json` (identitas badan pengelola & alamat, dasar hukum persetujuan orang tua untuk akun dasar/aplikasi, penyedia email & negara pemrosesan, retensi log server, pemegang akses & lokasi server, penyedia model AI/pencari/hak cipta modul, retensi OpenRouter, prosedur hak hapus & verifikasi orang tua, keamanan/pencadangan, pemberitahuan perubahan kebijakan, dan kontak resmi / petugas pelindungan data).
    - **3 kelompok teks pilot belum disetujui:** Kebijakan privasi, Teks Portofolio, Teks unduh data dan hapus akun.
  - **Peringatan (bukan kegagalan):** `41` berkas lain masih memuat `144` tanda `DRAF`.
  - **Catatan dampak profil build v2:** begitu profil build penguji di `eas.json` menyalakan `EXPO_PUBLIC_ALUR_MASUK_V2`, `EXPO_PUBLIC_NAVIGASI_V2`, dan `EXPO_PUBLIC_MODE_GELAP`, `periksa-gerbang-rilis` otomatis akan menambah **3 pemblokir teks v2** (`alur-masuk-v2`, `navigasi-v2`, `mode-gelap-v2`) sehingga total 6 kelompok teks harus disetujui sebelum `eas build`.

#### 5. Rencana Profil Build Penguji
Disusun terpisah sebagai rencana saja (tanpa mengubah `eas.json` maupun `app.config.ts`) di [`docs/profil-build-tester-v2.md`](profil-build-tester-v2.md).

#### 6. Paket Native dan Aset Baru Sejak APK 1.0.0 (`git diff 15f5106..HEAD -- package.json`)
Enam paket dan 2 berkas font lokal ditambahkan setelah APK 1.0.0 dan **hanya benar-benar teruji pada build native (APK/AAB) baru**, bukan di web maupun Expo Go:
1. `expo-secure-store` (`~57.0.4`) — Android Keystore / iOS Keychain untuk token sesi (`api/penyimpananAman.ts`). **Wajib uji migrasi token satu kali dari `AsyncStorage` APK 1.0.0 di HP fisik (K55)!**
2. `expo-image-picker` (`~57.0.21`) — pemilih galeri & kamera (`app.config.ts` juga mengatur izin kamera/galeri & mematikan mikrofon).
3. `expo-image-manipulator` (`~57.0.22`) — perkecil resolusi foto & ubah HEIC → JPEG sebelum unggah.
4. `expo-file-system` (`~57.0.7`) — tulis berkas ekspor JSON & pembersihan cache saat keluar akun.
5. `expo-sharing` (`~57.0.25`) — lembar berbagi sistem HP untuk Unduh Data Saya.
6. `phosphor-react-native` (`^3.0.6`) — ikon v2 (bergantung `react-native-svg`).
7. Font lokal `assets/fonts/SourceSans3_400Regular.ttf` dan `SourceSans3_600SemiBold.ttf`.

#### 7. Daftar Tegas: Yang BELUM PERNAH Diuji
Hingga 27 November 2026, hal-hal berikut **belum pernah dijalankan/dibuktikan** dan tidak boleh diklaim lolos:
- Semua layar v2 di **HP fisik Android dan iOS** (baik lewat Expo Go maupun APK build EAS).
- **Migrasi token sesi K55** saat memasang APK v2 di atas APK 1.0.0 pada HP Android sungguhan tanpa menghapus aplikasi lama.
- **Pembaca layar sungguhan:** TalkBack (Android) dan VoiceOver (iOS) — urutan fokus, pengumuman tab aktif, pembacaan modal & peringatan.
- **Ukuran huruf besar sistem asli** (Android Font Size / Display Size & iOS Dynamic Type) pada komponen native.
- **Kamera asli, penolakan izin kamera → Buka Pengaturan, serta foto HEIC iOS** (konversi HEIC→JPEG dan orientasi EXIF) pada Rekam Jejak.
- **Lembar berbagi sistem (`expo-sharing`)** dan pemeriksaan **folder cache (`ImagePicker`, `ImageManipulator`, `EksporData`) bersih** sesudah keluar akun di HP fisik.
- **APK 1.0.0 sungguhan** melawan server baru sesudah deploy.
- **Cadangan dan pemulihan database + volume foto di server produksi (Dokploy)** (termasuk prosedur mundur B/C).
- **Pembaruan surat orang tua/wali** (masih menyatakan aplikasi tidak mengumpulkan foto) dan **peninjauan hukum formal** atas kebijakan privasi.

---

## Bagian C — Daftar Temuan & Usulan Urutan Task Berikutnya

### C.1 Daftar Temuan Berurutan

| ID | Temuan | Tingkat | Bukti | Perkiraan kerja | Butuh Khalifa / Server? | Jalur kerja |
|---|---|---|---|---|---|---|
| **T01** | **18 rute v1 di dalam `AppShellV2` tidak terbaca di mode gelap** (teks `#1A1A1A` di latar `#0C1B33` = `1.01:1`), termasuk 10 item **Alat belajar** dan tautan `Pilih Mapel` / `Eksplorasi Kampus` dari `Langkah Saya`. | **Pemblokir penguji** | `docs/periksa-layar-038/16-v1-arsip-di-shell-gelap-412.png`, `audit-siap-tester.js` | **Kecil** (wadah latar terang bagi layar v1 di `AppShellV2`) atau **Sedang** (reskin/sembunyikan Alat belajar) | Butuh keputusan Khalifa bila Alat belajar / Level-In ingin disembunyikan untuk penguji; wadah terang di `AppShellV2` murni klien. | **(1) Kode sekarang** + keputusan visibilitas Khalifa |
| **T02** | **`DaftarV2 -> ModalKebijakanV2 -> IsiKebijakan` tidak terbaca di mode gelap** (`1.01:1`, `1.75:1`, `3.63:1`) dan `/kebijakan-privasi` menyilaukan putih penuh saat mode gelap. | **Pemblokir penguji** | `audit-siap-tester.js`, `DaftarV2.tsx:388`, `docs/periksa-layar-038/15-v1-kebijakan-privasi-di-gelap-412.png` | **Kecil** (berikan dukungan token dua mode pada `IsiKebijakan` & `/kebijakan-privasi` / `/terima-kebijakan`) | Tidak (murni klien, teks kebijakan tidak berubah) | **(1) Kode sekarang** |
| **T03** | **Konten inti kosong: `0` jalur disetujui (T13) dan `0` kartu Jelajah bersumber/disetujui (K39).** Penguji melihat 4 layar utama kosong (Kecenderungan, Jalur Saya, Jelajah, Profil Saya). | **Pemblokir penguji** | `audit-siap-tester.js` (`lanjut_dev`), `docs/periksa-layar-038/05-*.png`, `07-*.png`, `11-*.png`, `12-*.png` | **Sedang** (penyusunan & persetujuan konten) | **Ya — konten & persetujuan Khalifa (T13 & K39)** | **(2) Keputusan & konten Khalifa** |
| **T04** | **Gerbang rilis gagal (`22` masalah):** 19 isian `[ISI]` kebijakan privasi + 0 teks disetujui (3 pilot sekarang, +3 teks v2 saat profil tester dinyalakan) + surat orang tua belum diperbarui + belum ditinjau hukum. | **Pemblokir penguji** | `npm run periksa-gerbang-rilis`, `docs/persetujuan-teks-rilis.json` | **Besar** (non-kode: hukum, kebijakan, baca 12 draf teks) | **Ya — Khalifa & peninjau hukum** | **(2) Keputusan & konten Khalifa** |
| **T05** | **Jejak Waktu habis tanggal pada 29 Nov 2026 (2 hari lagi)** untuk Kelas 12, dan **`0` entri** untuk Kelas 10/11/SMP (`pdss` & `daftar-snbp` masih `mockup` belum diverifikasi). | **Pemblokir penguji** (bila uji lewat 29 Nov atau melibatkan kelas 10/11) | `audit-siap-tester.js` (`tahapan_linimasa`, `simulasiJejakWaktuHariIni`) | **Kecil–Sedang** (verifikasi jadwal SNPMB 2027 resmi) | **Ya — verifikasi sumber resmi oleh Khalifa/tim** | **(2) Keputusan & konten Khalifa** |
| **T06** | **Label `TabBarV2` terpotong pada skala font 1,3× dan 2,0×** di seluruh 9 layar (`Jejak Waktu` terpotong sejak 1,3×; 3 dari 4 tab jadi `"Arah..."`, `"Jeja..."`, `"Profi..."` di 2,0×). | **Mengganggu** | `docs/periksa-layar-038/font-2x-arah-saya-360.png`, `font-2x-akun-privasi-360.png`, pengukuran 18 kombinasi | **Kecil** (atur `maxFontSizeMultiplier` wajar atau tata letak 2 baris adaptif di `TabBarV2`) | Tidak (murni klien) | **(1) Kode sekarang** |
| **T07** | **Lingkaran maskot `PengantarV2` memakai `#16294A` di mode gelap**, bukan `#B4E1EB` (keputusan 24 Nov), sehingga garis biru maskot meredup. | **Mengganggu** | `PengantarV2.tsx:60`, `docs/periksa-layar-038/01-pengantar-gelap-412.png` | **Kecil** (1 baris ke `warna.latarMaskot`) | Tidak (keputusan 24 Nov sudah ada) | **(1) Kode sekarang** |
| **T08** | **3 kebocoran istilah v1 `"Data Akun"` di teks v2** (`lib/alurMasukV2.ts:36`, `lib/jalurSayaV2.ts:72`, `lib/jelajahV2.ts:89`), plus 2 teks izin native `"portofoliomu"` di `app.config.ts:100-101` (dan 1 `"Daftar Periksamu"` di kalimat v1 yang disetujui `lib/alurMasukV2.ts:17`). | **Mengganggu** | `audit-siap-tester.js`, `app.config.ts:100-101` | **Kecil** | 3 teks draf v2 & `app.config.ts` bisa diselaraskan; perubahan `TEKS_V1.dataPribadi` butuh persetujuan Khalifa. | **(1) Kode sekarang** *(kecuali kalimat v1 disetujui)* |
| **T09** | **Ketiadaan langkah persetujuan orang tua di bawah 18 tahun pada `DaftarV2`.** | **Pemblokir penguji** *(bila peninjau hukum mewajibkan untuk akun dasar)* | `DaftarV2.tsx`, isian kebijakan #2 & #13 | **Sedang–Besar** (tergantung syarat hukum) | **Ya — menunggu peninjau hukum & Khalifa** | **(2) Keputusan & konten Khalifa** |
| **T10** | **`PATCH /api/v1/tujuan/bukti/:butirId` di server** masih mengembalikan `jalur_minat_id` mentah tanpa `samarkanJalur` (temuan lanjutan dari 036/037b). | **Mengganggu** | Audit kode server (tercatat sejak LANJUT_036) | **Kecil** | **Ya — perubahan server kecil** | **(1) Kode sekarang** (task server terpisah) |
| **T11** | **4 gerbang v1 pasca-masuk & `LayarMemuat` belum mengenal mode gelap** (tampil terang sejenak saat buka aplikasi atau akun lama melengkapi kelas). | **Polesan** | `app/_layout.tsx`, `app/(app)/_layout.tsx`, `app.config.ts:87` | **Kecil** | Tidak (murni klien) | **(1) Kode sekarang** |
| **T12** | **Belum pernah diuji di HP fisik, APK, K55 migrasi token, TalkBack/VoiceOver, kamera/HEIC asli, cadangan Dokploy.** | **Pemblokir penguji** | Seluruh daftar B.2.7 & `docs/daftar-uji-hp-apk-v2.md` | **Sedang** (eksekusi manual di HP & server) | **Ya — manusia, HP Android/iOS, & akses Dokploy** | **(3) Butuh HP fisik & manusia** |

### C.2 Usulan Pengelompokan Menjadi Task Berikutnya (Berurutan)

#### Jalur 1 — Bisa Dikerjakan Pengembang / Agen Kode Sekarang (Tidak Menunggu Konten)
1. **LANJUT_039 — Perbaikan Aksesibilitas & Kerapian Mode Gelap Klien v2 (Kecil, murni klien):**
   - Beri dukungan token dua mode v2 pada `IsiKebijakan`, `/kebijakan-privasi`, dan `/terima-kebijakan` (menutup T02 — memperbaiki kontras `1.01:1` di `ModalKebijakanV2` dan layar putih menyilaukan dari `/akun`).
   - Bungkus layar anak v1 di dalam `AppShellV2` dengan permukaan terang yang serasi (menutup T01 — teks layar v1 tidak lagi lenyap di mode gelap; sekaligus menunggu keputusan Khalifa apakah `Alat belajar` tetap dilipat atau disembunyikan pada build penguji).
   - Ubah lingkaran maskot `PengantarV2.tsx:60` memakai `warna.latarMaskot` (`#B4E1EB`) sesuai keputusan 24 Nov (menutup T07).
   - Perbaiki pemotongan label `TabBarV2` pada skala font 1,3×–2,0× (menutup T06).
   - Ganti 3 kebocoran istilah v1 `"Data Akun"` di `lib/alurMasukV2.ts:36`, `lib/jalurSayaV2.ts:72`, `lib/jelajahV2.ts:89` menjadi `"Akun & Privasi"` (menutup T08 bagian draf v2; tidak menyentuh kalimat v1 yang sudah disetujui tanpa izin Khalifa).
   - Poles `LayarMemuat` agar mengikuti tema v2 (T11).
2. **LANJUT_040 — Penyamaran `jalur_minat_id` di `PATCH /tujuan/bukti/:butirId` & Opsi Visibilitas Alat Belajar (Kecil, server + klien):**
   - Terapkan `samarkanJalur` pada respons `PATCH /api/v1/tujuan/bukti/:butirId` + tambah tes otomatis (menutup T10).
   - Bila Khalifa memutuskan menyembunyikan `Alat belajar` (termasuk Level-In & Ngobrol saat `ai_aktif=0`) dari APK penguji v2, tambahkan saklar/pengaturan visibilitas yang rapi tanpa menghapus rute v1.

#### Jalur 2 — Menunggu Keputusan, Konten, dan Tinjauan Hukum dari Khalifa
3. **LANJUT_041 — Kesiapan Konten, Jadwal, dan Gerbang Rilis (Menunggu Khalifa & Peninjau Hukum):**
   - **T13:** Khalifa membaca & menyetujui teks 3 jalur (`melanjutkan`, `bekerja`, `wirausaha`).
   - **K39:** Menyiapkan & menyetujui minimal 2–3 kartu Jelajah yang bersumber URL nyata dan terverifikasi.
   - **Jejak Waktu:** Memverifikasi jadwal resmi PDSS/SNBP/SNBT 2027 (mendesak sebelum 29 Nov 2026) serta memutuskan apakah ada jadwal untuk Kelas 10/11 saat uji.
   - **Gerbang rilis & hukum:** Melengkapi 19 isian `[ISI]` di `lib/kebijakan-privasi.json` (bersama peninjau hukum, termasuk keputusan persetujuan orang tua untuk akun dasar di bawah 18 tahun — T09), memperbarui surat orang tua (untuk foto Rekam Jejak), lalu menyetujui seluruh teks draf yang dipakai profil build lewat `npm run periksa-gerbang-rilis -- --sidik` → `docs/persetujuan-teks-rilis.json`.
   - **Keputusan produk:** Apakah `EXPO_PUBLIC_KELOLA_DATA_AKUN` ikut menyala di APK penguji (T14), dan apakah `TEKS_V1.dataPribadi` (`"Daftar Periksamu"`) diizinkan diperbarui di v2.

#### Jalur 3 — Membutuhkan HP Fisik, Manusia, dan Akses Produksi (Sesudah Jalur 1 & 2 Selesai)
4. **LANJUT_042 — Profil Build `tester-v2`, Uji HP Fisik, K55 Migrasi Token, & Cadangan Produksi:**
   - Menerapkan rencana `docs/profil-build-tester-v2.md` ke `eas.json` dan `app.config.ts` (naikkan `versionCode`, perbaiki teks izin `"portofoliomu"` → `"Rekam Jejakmu"`, pastikan `npm run periksa-gerbang-rilis` **LOLOS**).
   - Membangun APK internal `tester-v2` (dengan keystore rilis yang sama dengan APK 1.0.0).
   - Menguji di **HP fisik Android & iOS:** pemasangan di atas APK 1.0.0 + **migrasi token sesi K55**, kamera & penolakan izin, foto HEIC iOS, `expo-sharing` + kebersihan cache keluar akun, ukuran font besar sistem OS, dan pembaca layar TalkBack/VoiceOver.
   - Membuktikan cadangan & pemulihan database serta volume foto langsung di server Dokploy sebelum APK penguji dibagikan.
