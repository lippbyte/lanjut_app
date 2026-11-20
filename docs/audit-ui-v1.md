# Audit UI v1 (LANJUT_029)

> **Status:** hanya baca. Tidak ada layar, rute, API, skema, atau saklar yang diubah oleh audit ini.
> **Kode yang diaudit:** `lippbyte/lanjut_app` `main` ca680d4 (PR 026 dan 027 sudah masuk).
> **Tanggal:** 20 November 2026.
> **Rujukan yang tidak ditemukan di komputer ini:** `claude/alur-dan-ia-app-v2.md`, keputusan K46–K49, dan `LANJUT-v2-Feature-Catalog-and-Agent-Brief.md`. Audit ini tidak memakainya. Rujukan yang dipakai: `docs/design.md` v3.1 dan `docs/salinan-teks-lanjut.md` di repo induk, serta `task/keputusan-lanjut-v2-11-13-nov.md` (sampai K38).

## Cara mengukur

Ada dua sumber angka. Keduanya bisa diulang.

1. **Statis** (`server/tools/audit-ui.js`)
   - Membaca semua berkas `.tsx` di `app/` dan `components/` dengan TypeScript milik app.
   - Kata yang ditulis langsung di berkas layar. Teks dari `lib/*.ts`, server, atau basis data tidak terhitung, jadi angka ini **batas bawah**.
   - Kontrol interaktif di kode. Elemen di dalam `.map()` dihitung sekali.
   - Warna, jarak, dan ukuran huruf yang ditulis langsung versus lewat `theme/tokens.ts`.
   - Pressable tanpa peran.
   - Target sentuh yang ukurannya **tertulis** di bawah 44.
2. **Dirender** (Edge headless, lebar 360 px)
   - Build web produksi dengan saklar Jalur & Tujuan, Discover, Portofolio, dan Kelola data akun menyala.
   - API dev di `lanjut_dev` dengan akun dummy `demo_kelas12_dc` (kelas 12, SMK).
   - Per rute dihitung:
     - kata yang tampil di area isi (`<main>`, tanpa app bar dan tab bar);
     - kontrol yang bisa dijangkau;
     - kontrol yang kotaknya di bawah 44×44 px;
     - kontrol tanpa nama untuk pembaca layar.
   - **Ini peramban, bukan HP.** 1 px CSS di sini setara 1 pt/dp, tetapi ukuran sebenarnya di HP tidak diukur.

## 1. Inventaris layar dan rute

Navigasi berbasis berkas (expo-router). Saklar build dibaca lewat `lib/fiturApp.ts`. Rute bersaklar keluar dari bundel lewat `metro.config.js:9-29`, dan setiap berkas rutenya punya penjaga kedua (`if (!…Aktif) return <Redirect …>`, mis. `app/(app)/discover.tsx`).

| Fitur | Rute | Berkas layar | Saklar |
|---|---|---|---|
| Pembuka | (lapisan, bukan rute) | `components/layout/PembukaKelinci.tsx` | aktif, tampil setiap app dibuka, minimal 2 detik (`lib/pembuka.ts:22`) |
| Onboarding | (lapisan di grup auth) | `components/screens/auth/OnboardingScreen.tsx` | aktif bila tidak ada sesi tersimpan (`app/(auth)/_layout.tsx:171-174`) |
| Masuk | `/masuk` | `auth/LoginScreen.tsx`, `auth/MasukKodeEmail.tsx`, `auth/TombolGoogle.tsx` | aktif. Tombol Google hanya bila `EXPO_PUBLIC_GOOGLE_CLIENT_ID` diisi (`app.config.ts`) |
| Masuk Google (penerus) | `/masuk-google` | `app/masuk-google.tsx` | aktif |
| Daftar | `/daftar` | `auth/RegisterScreen.tsx`, `VerifikasiEmail.tsx` | aktif |
| Kebijakan privasi | `/kebijakan-privasi` (tanpa sesi), `/terima-kebijakan` | `KebijakanPrivasiScreen.tsx`, `TerimaKebijakan.tsx` | aktif |
| Gerbang | (lapisan di grup app) | `BuatSandiBaruScreen.tsx`, `IsiKelasScreen.tsx` (kelas, jenis sekolah), `TerimaKebijakan.tsx` (`PromptKebijakan`) | aktif, berurutan (`app/(app)/_layout.tsx:88-129`) |
| Beranda | `/linimasa` (dan `/` dialihkan) | `LinimasaScreen.tsx` | aktif |
| Jenjang Saya | `/jenjang-saya` (`/khusus-smk` dialihkan) | `JenjangSayaScreen.tsx`, `KhususKelas12.tsx` | aktif |
| Ngobrol | `/ngobrol`, `/persetujuan-ortu` | `NgobrolScreen.tsx`, `KonfirmasiOrtuWali.tsx` | rute aktif; AI mengikuti `ai_aktif` di server. Mikrofon mati kecuali `EXPO_PUBLIC_MIKROFON_NGOBROL=1` |
| Pilih Mapel | `/pilih-mapel` | `PilihMapelScreen.tsx`, `MapelPilihan.tsx` | aktif |
| Daftar Periksa | `/daftar-periksa` | `DaftarPeriksaScreen.tsx`, `PersiapanEvent.tsx`, `KesiapanUjian.tsx` | aktif |
| Eksplorasi | `/eksplorasi-tujuan`, `/cek-posisi`, `/gaya-belajar`, `/cerita-alumni` | `EksplorasiKampusScreen.tsx` (+ `EksplorasiTujuanScreen.tsx`), `CekPosisiScreen.tsx`, `GayaBelajarScreen.tsx`, `CeritaAlumniScreen.tsx` | aktif |
| Arsip Belajar | `/arsip`, `/arsip-tulis`, `/arsip-kartu`, `/arsip-modul`, `/arsip-modul-unggah` | `ArsipScreen.tsx`, `ArsipTulisScreen.tsx`, `ArsipKartuScreen.tsx`, `ModulScreens.tsx` | aktif |
| Latihan | `/latihan`, `/latihan-riwayat` | `LatihanScreen.tsx`, `LatihanRiwayatScreen.tsx` | aktif |
| Level-In | `/level-in` | `LevelInScreen.tsx` | aktif (tidak disentuh, K33) |
| Data Akun | `/akun` | `AkunScreen.tsx` | aktif |
| Hapus akun dan unduh data | `/hapus-akun` | `HapusAkunScreen.tsx` | **mati** kecuali `EXPO_PUBLIC_KELOLA_DATA_AKUN=1`; menyala di profil `pilot` `eas.json` |
| Portofolio | `/portofolio`, `/portofolio-tulis`, `/portofolio-butir` | `PortofolioScreens.tsx`, `PortofolioFoto.tsx` | **mati** kecuali `EXPO_PUBLIC_PORTOFOLIO=1`; menyala di profil `pilot` |
| Jalur & Tujuan | `/jalur-tujuan`, `/jalur-tujuan-tulis` | `JalurTujuanScreens.tsx` | **mati**, hanya dev (`EXPO_PUBLIC_JALUR_TUJUAN=1`); tidak ada profil EAS yang menyalakan |
| Discover | `/discover`, `/discover-refleksi`, `/discover-profil` | `DiscoverScreens.tsx` | **mati**, hanya dev (`EXPO_PUBLIC_DISCOVER=1`); tidak ada profil EAS yang menyalakan |

Total di `main`: 35 berkas rute, 3 tata letak, `app/+html.tsx`, dan 39 berkas di `components/screens` (termasuk `auth/`).

## 2. Per layar

Kolom "Kontrol" termasuk 5 tab, tombol kembali, dan ikon profil di bilah atas. Tanda "(+1)" berarti ikon profil 32×32 di bilah atas (`components/layout/AppShell.tsx:110-117`, gaya baris 201-209), yang ada di semua layar bersesi kecuali `/akun`.

| Rute | Berkas layar | Kata tampil (isi) | Kontrol | < 44 pt (tanpa ikon profil) | Isian tanpa nama | Kata di kode | Spasi langsung / token | Huruf langsung | Warna langsung |
|---|---|---|---|---|---|---|---|---|---|
| onboarding (layar 1 dari 4) | auth/OnboardingScreen | 81 | 2 | 0 | 0 | 0 | 3 / 14 | 4 | 0 |
| /masuk | auth/LoginScreen | 22 | 5 | 1 | 0 | 38 | 0 / 1 | 0 | 0 |
| /daftar | auth/RegisterScreen | 297 | 33 | 28 | 0 | 106 | 0 / 5 | 0 | 0 |
| /linimasa | LinimasaScreen | 60 | 14 | 0 (+1) | 0 | 24 | 3 / 29 | 4 | 0 |
| /jenjang-saya | JenjangSayaScreen | 92 | 14 | 0 (+1) | 0 | 24 | 0 / 10 | 0 | 0 |
| /ngobrol (AI mati) | NgobrolScreen | 60 | 9 | 0 (+1) | 0 | 15 | 3 / 25 | 2 | 0 |
| /pilih-mapel | PilihMapelScreen | 63 | 12 | 4 (+1) | 0 | 93 | 1 / 10 | 0 | 0 |
| /daftar-periksa | DaftarPeriksaScreen | 33 | 12 | 6 (+1) | 0 | 93 | 1 / 10 | 0 | 0 |
| /cerita-alumni | CeritaAlumniScreen | 28 | 8 | 0 (+1) | 0 | 45 | 1 / 3 | 0 | 0 |
| /akun | AkunScreen | 131 | 13 | 3 | 0 | 109 | 0 / 10 | 0 | 0 |
| /hapus-akun | HapusAkunScreen | 129 | 12 | 0 (+1) | 1 | 0 | 0 / 3 | 0 | 0 |
| /cek-posisi | CekPosisiScreen | 39 | 13 | 4 (+1) | 0 | 67 | 0 / 8 | 2 | 0 |
| /gaya-belajar | GayaBelajarScreen | 65 | 12 | 0 (+1) | 0 | 40 | 1 / 3 | 0 | 0 |
| /eksplorasi-tujuan | EksplorasiKampusScreen | 37 | 8 | 0 (+1) | 0 | 1 | 0 / 7 | 0 | 0 |
| /arsip | ArsipScreen | 54 | 13 | 2 (+1) | 0 | 26 | 0 / 5 | 0 | 0 |
| /arsip-tulis | ArsipTulisScreen | 37 | 21 | 10 (+1) | 0 | 43 | 0 / 2 | 0 | 0 |
| /arsip-modul (tanpa id: "tidak ditemukan") | ModulScreens | 10 | 8 | 0 (+1) | 0 | 7 | 0 / 16 | 0 | 0 |
| /arsip-modul-unggah | ModulScreens | 78 | 22 | 12 (+1) | 0 | 7 | 0 / 16 | 0 | 0 |
| /arsip-kartu (tanpa id: "tidak ditemukan") | ArsipKartuScreen | 10 | 8 | 0 (+1) | 0 | 37 | 0 / 5 | 0 | 0 |
| /latihan | LatihanScreen | 22 | 12 | 2 (+1) | 0 | 117 | 0 / 8 | 0 | 0 |
| /latihan-riwayat | LatihanRiwayatScreen | 15 | 7 | 0 (+1) | 0 | 23 | 0 / 4 | 0 | 0 |
| /level-in | LevelInScreen | 62 | 8 | 0 (+1) | 0 | 0 | 0 / 6 | 0 | 0 |
| /terima-kebijakan (sudah diterima) | TerimaKebijakan | 10 | 8 | 0 (+1) | 0 | 11 | 0 / 11 | 0 | 1 |
| /persetujuan-ortu | KonfirmasiOrtuWali | 129 | 10 | 0 (+1) | 0 | 12 | 0 / 5 | 0 | 0 |
| /portofolio (kosong) | PortofolioScreens | 13 | 8 | 0 (+1) | 0 | 0 | 1 / 6 | 0 | 0 |
| /portofolio-tulis | PortofolioScreens | 25 | 15 | 3 (+1) | 4 | 0 | 1 / 6 | 0 | 0 |
| /jalur-tujuan | JalurTujuanScreens | 98 | 12 | 4 (+1) | 0 | 0 | 1 / 7 | 0 | 0 |
| /jalur-tujuan-tulis | JalurTujuanScreens | 20 | 12 | 1 (+1) | 3 | 0 | 1 / 7 | 0 | 0 |
| /discover | DiscoverScreens | 38 | 8 | 0 (+1) | 0 | 0 | 1 / 6 | 0 | 0 |
| /discover-refleksi (tanpa id kartu: "tidak ditemukan") | DiscoverScreens | 14 | 8 | 0 (+1) | 0 | 0 | 1 / 6 | 0 | 0 |
| /discover-profil | DiscoverScreens | 89 | 10 | 0 (+1) | 1 | 0 | 1 / 6 | 0 | 0 |
| /kebijakan-privasi | KebijakanPrivasiScreen | 2936 | 1 | 0 | 0 | 15 | 0 / 4 | 0 | 0 |

**Paling padat teks** (kata tampil):
- Kebijakan Privasi: 2.936.
- Daftar: 297, ditambah 33 kontrol.
- Data Akun: 131.
- Hapus akun: 129.
- Persetujuan orang tua/wali: 129.
- Jalur & Tujuan: 98.
- Jenjang Saya: 92.
- Profil Eksplorasi: 89.
- Onboarding: 81 di layar pertama saja, dari 4 layar.

**Tidak diukur** (butuh keadaan khusus):
- Gerbang buat sandi baru, isi kelas, dan isi jenis sekolah.
- Prompt kebijakan untuk akun lama.
- Verifikasi email dan masuk dengan kode email.
- Sesi latihan yang sedang berjalan.
- `/portofolio-butir`, `/arsip-kartu`, `/arsip-modul`, dan `/discover-refleksi` dengan isi (tanpa id, layar menampilkan "tidak ditemukan").
- Linimasa untuk akun SMP dan kelas 10–11.

Angkanya **tidak diketahui**.

**Warna dan jarak langsung di kode.** v1 hampir seluruhnya memakai token (`theme/tokens.ts`). Pengecualian:
- Warna langsung hanya 2:
  - `app/+html.tsx:22` (`#456A8C`, meta tema);
  - `components/screens/TerimaKebijakan.tsx:169` (`rgba(26, 26, 26, 0.45)`, tirai).
- Jarak langsung 23, misalnya:
  - `gap: 2` di beberapa layar;
  - `components/ui/index.tsx:303-304` (`paddingVertical: 4`, `paddingHorizontal: 10`);
  - `components/screens/auth/OnboardingScreen.tsx:314, 329, 342`.
- Ukuran huruf langsung 21, misalnya:
  - label tab 11 px di `components/layout/AppShell.tsx:256`;
  - `components/screens/CekPosisiScreen.tsx:155`;
  - `components/screens/LinimasaScreen.tsx:454, 592`.
- Daftar lengkap dengan nomor baris: `node tools/audit-ui.js --json` dari folder `server/`.

## 3. Tema dan token yang ada

- **Satu berkas token:** `theme/tokens.ts:13-133`. Isinya:
  - warna: biru 100–600, tinta 050–900, status, app bar, fokus;
  - gradasi (`cover`, `tile`, `kepala`, `onboarding`, `progress`);
  - `spacing` 4–48 dengan `gutter` 20;
  - `radius` 8–32 dan pil;
  - `shadow` s1–s3;
  - `font` Poppins 400/500/600;
  - `teks` h1 32/36 sampai caption 13/19;
  - `typography` lama;
  - `layout` (`lebarMaks` 420, `tinggiAppbar` 56).
- **Poppins benar-benar dimuat.** Sumbernya paket `@expo-google-fonts/poppins` (`package.json:6`), dimuat lewat `useFonts` di `app/_layout.tsx:25-29`. Bila gagal dimuat, app jatuh ke huruf sistem (`app/_layout.tsx:33`).
- **Source Sans 3 tidak dimuat dan tidak ada di repo.**
  - Tidak ada paket untuknya di `package.json`.
  - Tidak ada berkas huruf di `assets/`.
  - Tidak ada `useFonts` untuknya.
  - Di repo induk, `landing/src/aset/font/` hanya berisi Poppins 400–700.
  - Klaim `design.md` §3 bahwa "kedua font dihosting sendiri di `landing/` dan `LANJUT_App/`" **tidak sesuai kode**. Seluruh teks badan v1 memakai Poppins (`theme/tokens.ts:91-95`).
- **Warna teks di atas biru brand.** `components/ui/index.tsx:209-216` sudah mengganti tombol utama ke `blue600` (5,68:1) karena putih di `blue400` hanya 2,63:1.

## 4. Navigasi

- **Pustaka:** `expo-router` ~57.0.21 (`package.json`). Tidak ada navigator Stack atau Tabs; semua tata letak memakai `<Slot />`:
  - `app/_layout.tsx:45`;
  - `app/(app)/_layout.tsx:125`;
  - `app/(auth)/_layout.tsx:171`.
- **Tab bawah buatan sendiri.** Didefinisikan di `components/layout/AppShell.tsx:146-180`, dengan lima tab dari `lib/navigasi.ts:72-79`: Beranda, Jenjang Saya, Ngobrol (tab tengah), Pilih Mapel, Daftar Periksa. Tab dirender sebagai `Link` dengan `accessibilityRole="link"` dan `aria-current`.
- **Halaman anak.** Mendapat bilah atas dengan tombol kembali 44×44 (`AppShell.tsx:126-143`, gaya baris 220). Kembali memakai `router.back()`, atau ke `/linimasa` bila tidak ada riwayat. Tab yang menyala untuk halaman anak diatur `tabAktif` (`lib/navigasi.ts:120-124`).
- **Data Akun.** Dibuka dari ikon profil di bilah atas (`AppShell.tsx:109-117`), bukan tab.
- **Fitur lain.** Dibuka dari kartu dan grid di Beranda dan Jenjang Saya (`KartuPintu`, `components/ui/index.tsx:78-109`).
- **Transisi.** Tidak ada animasi transisi antarlayar, karena `Slot` mengganti isi langsung.

## 5. Alur masuk sekarang

| Urutan | Langkah | Data yang diminta | Disimpan di |
|---|---|---|---|
| 1 | Pembuka kelinci (`components/layout/PembukaKelinci.tsx`) | tidak ada | tidak ada. Tampil setiap app dibuka, minimal 2 detik, paling lama 4,5 detik (`lib/pembuka.ts:22-24`) |
| 2 | Onboarding 4 layar, hanya bila tidak ada sesi tersimpan (`providers/AuthProvider.tsx:101-104`, `app/(auth)/_layout.tsx:171-174`) | pilihan Masuk, Daftar, atau Lewati | tidak disimpan. Tampil lagi setiap app dibuka tanpa sesi |
| 3a | Masuk (`auth/LoginScreen.tsx`) | nama pengguna dan kata sandi; atau email lalu kode 5 menit (`auth/MasukKodeEmail.tsx`, `server/src/modul/auth/otp.layanan.js:29`); atau Google | server: sesi baru (`sesi_pengguna`), token disimpan di perangkat (lihat "Sesi tersimpan"). Nonce Google sementara di AsyncStorage (`components/screens/auth/TombolGoogle.tsx:34`, dihapus di `app/masuk-google.tsx:38`) |
| 3b | Daftar (`auth/RegisterScreen.tsx:186-260`) | nama pengguna, email (boleh kosong), kata sandi, kelas, jenis sekolah (kelas 10–12), prodi impian (boleh "belum"), centang "sudah membaca kebijakan privasi" | tanpa email: akun langsung dibuat di tabel `pengguna`. Dengan email: data menunggu di `pendaftaran_tertunda` (berlaku 30 menit, `daftarEmail.layanan.js:23`) sampai kode email dimasukkan (`RegisterScreen.tsx:109-124`). Versi kebijakan yang diterima dicatat di tabel `persetujuan` (`server/src/db/migrasi/012_persetujuan.sql:19-25`) |
| 4 | Gerbang buat sandi baru (akun yang diambil alih pemilik email), lalu isi kelas, lalu isi jenis sekolah (`app/(app)/_layout.tsx:88-129`) | kata sandi baru; kelas; jenis sekolah | `pengguna` di server |
| 5 | Prompt kebijakan privasi untuk akun yang belum menerima versi berlaku (`app/(app)/_layout.tsx:114, 129`), bisa ditunda per sesi (`hooks/useTundaKebijakan.ts:21-31`) | terima atau "Nanti saja" | terima → `persetujuan`; tunda → AsyncStorage (tanda sesi, bukan token) |
| 6 | Persetujuan orang tua/wali, **hanya untuk fitur AI di Ngobrol** dan bukan gerbang masuk (`components/screens/KonfirmasiOrtuWali.tsx:1-25`) | centang pernyataan oleh orang tua/wali di HP siswa | `persetujuan` jenis `ortu_wali` lewat `POST /persetujuan/ortu-wali` (`hooks/usePersetujuan.ts:24-34`) |
| 7 | Onboarding profil | **tidak ada layar onboarding profil terpisah.** Kelas, jenis sekolah, dan prodi impian ditanyakan di form Daftar; gaya belajar, posisi, dan jalur diisi kemudian dari Beranda dan Data Akun | `pengguna` (`gaya_belajar`, `minat_rumpun`, `mapel_pilihan`, `kesiapan_ujian`); profil lokal kelas dan jalur seleksi di AsyncStorage (`lib/profilLokal.ts:1, 17`) |

**Sesi tersimpan:**
- **Tempat simpan:** token dan profil disimpan di **AsyncStorage**, bukan penyimpanan aman (`api/auth.ts:184-189`, kunci `auth_token` dan `auth_pengguna`, baris 8-9).
  - Di Android, AsyncStorage tidak dienkripsi; isinya ada di penyimpanan privat aplikasi.
  - Di web, isinya ada di `localStorage`.
  - `expo-secure-store` tidak terpasang.
- **Masa berlaku:**
  - Server menyimpan hash token (`sesi.repo.js:8-19`).
  - Sesi berlaku `SESI_UMUR_HARI` hari, bawaan 90 (`server/src/config/env.js:128`), dan **diperpanjang setiap kali dipakai** (`server/src/middleware/autentikasi.js:32`, `sesi.repo.js:42-56`). Jadi sesi yang dipakai rutin tidak pernah habis.
  - Nilai di produksi **tidak diketahui**; contoh env dan `docker-compose.yml:36` memakai 90.
- **Keluar:**
  - Tombol "Keluar" ada di Data Akun (`components/screens/AkunScreen.tsx:45-48, 88`).
  - App memanggil `POST /auth/keluar`; server mencabut sesi itu (`auth.layanan.js:229-233`). Token dan profil di perangkat dihapus, begitu juga cache data akun (`providers/AuthProvider.tsx:148-163`).
  - Bila server tak terjangkau, hanya sesi di perangkat yang dihapus. Sesi di server tetap aktif sampai kedaluwarsa (`api/auth.ts:130-138`).
  - Jawaban 401 dari server di tengah pemakaian juga mengeluarkan pengguna (`AuthProvider.tsx:74-83`).

## 6. Kecenderungan arah (Bekerja, Melanjutkan, Wirausaha)

- **Tidak ada kolom kecenderungan di tabel `pengguna`** (`server/src/db/migrasi/001_pengguna_dan_sesi.sql:10-31` dan migrasi sesudahnya).
- **Yang paling dekat: Jalur & Tujuan (model data v2).**
  - **Tabel `jalur_minat`** (`030_model_data_v2.sql:19-33`).
    - Berisi tiga baris dari `server/data-konten/jalur-minat.json:12-31`: `melanjutkan`, `bekerja`, `wirausaha`.
    - **Ketiganya `status_teks: draf`.**
  - **Tabel `pengguna_jalur_minat`** (`030_model_data_v2.sql:35-51`).
    - **Mendukung banyak pilihan sekaligus.** Indeks unik hanya membatasi satu baris aktif per pasangan siswa dan jalur (`:45`), jadi siswa bisa punya ketiga jalur aktif bersamaan.
    - Status: `aktif`, `dijeda`, `selesai`, `ditinggalkan`. Riwayat tersimpan sebagai babak.
  - **Jalur yang bisa dipilih.** Siswa hanya bisa memilih jalur yang aktif dan berstatus disetujui (K37, `server/src/modul/jalur-minat/jalur-minat.layanan.js:84-92`). Saat ini tidak ada jalur yang disetujui di data konten.
  - **Rute:**
    - `GET/POST /jalur-minat/saya`;
    - `PATCH /jalur-minat/saya/:id` (`jalur-minat.rute.js:43-46`).
  - **Tidak ada pilihan "belum tahu".** Belum memilih berarti tidak ada baris.
  - **Layar Jalur & Tujuan** di balik saklar mati (bagian 1).
- **Konsep lain yang bukan kecenderungan arah:**
  - `minat_rumpun` (JSON, migrasi 019);
  - jalur seleksi SNBP/SNBT/TKA di profil lokal (`lib/profilLokal.ts`);
  - pertanyaan "Apa yang paling bikin kamu bingung" di `/cek-posisi`.
- **Kesimpulan:** kecenderungan banyak pilihan **bisa** disimpan di `pengguna_jalur_minat` tanpa mengubah skema. Pilihan "belum tahu" dan kaitan K37 (hanya jalur disetujui) perlu diputuskan dulu. Model data tidak diubah di task ini.

## 7. Pustaka yang sudah ada (`package.json`)

| Kebutuhan | Yang ada | Catatan |
|---|---|---|
| Animasi | `Animated` bawaan React Native | dipakai di `components/layout/PembukaKelinci.tsx:113-137` dan `components/screens/auth/OnboardingScreen.tsx:122-134`. `react-native-reanimated` tidak ada |
| Gesture | tidak ada (`react-native-gesture-handler` tidak ada) | geser onboarding memakai `ScrollView` berhalaman |
| Ikon | `react-native-svg` 15.15.4 dengan ikon garis buatan sendiri (`components/ui/Ikon.tsx`, 17 ikon) | `@expo-google-fonts/material-symbols` ada di `node_modules` hanya sebagai dependensi `expo-symbols` (`package-lock.json:3986`), tidak dipakai kode |
| Haptik | tidak ada (`expo-haptics` tidak ada) | — |
| Gradasi | `expo-linear-gradient` | kartu brand, kepala Beranda, bilah progres |

## 8. Aksesibilitas

- **Peran.**
  - Semua 36 Pressable atau Touchable mentah di v1 punya `accessibilityRole` atau `role` (`audit-ui.js`: 0 tanpa peran).
  - Atribut peran tercatat 77 kali, label 23 kali, dan keadaan (`aria-checked`, `aria-current`, dan lain-lain) 15 kali.
  - v1 tidak memakai `accessibilityState`.
  - Catatan: react-native-web 0.21 yang dipakai web **tidak membaca** `accessibilityState`, hanya `aria-*` (`node_modules/react-native-web/dist/modules/createDOMProps/index.js`). Komponen v2 memakai keduanya.
- **Isian tanpa label.**
  - **14 dari 32 kolom isian** tidak punya `accessibilityLabel` atau `placeholder`, jadi pembaca layar tidak menyebut namanya:
    - `AkunScreen.tsx:176`;
    - `DiscoverScreens.tsx:174, 177, 266`;
    - `HapusAkunScreen.tsx:97, 117`;
    - `JalurTujuanScreens.tsx:300, 311, 314`;
    - `PersiapanEvent.tsx:226`;
    - `PortofolioScreens.tsx:167, 177, 180, 183`.
  - Penyebabnya: label kolom di `Field` adalah `Text` terpisah (`components/screens/auth/AuthUI.tsx:63-91`) yang tidak terhubung ke `Input` (`AuthUI.tsx:94-120`).
- **Target sentuh di bawah 44** (terukur di peramban):
  - **ikon profil 32×32** di bilah atas semua layar bersesi (`AppShell.tsx:201-209`);
  - **pil pilihan setinggi 40** (`OpsiPil`, `AuthUI.tsx:232-241`, gaya `:336-345`), dipakai di 13 berkas: Daftar, Pilih Mapel, Daftar Periksa, Cek Posisi, Arsip, Latihan, Portofolio, Jalur & Tujuan, dan lainnya;
  - **`Tombol kecil` setinggi 36–38** (`components/ui/index.tsx:343`), dipakai di 29 tempat, misalnya `AkunScreen.tsx:114, 241, 280, 320`, `PersiapanEvent.tsx:117-141`, `JalurTujuanScreens.tsx:134-205`;
  - **tautan teks setinggi 22–23** (`TautanBawah`, `AuthUI.tsx:182`; "Baca kebijakan privasi");
  - kotak centang Daftar Periksa tinggi 40 (`DaftarPeriksaScreen.tsx:147`).
  - Dari 32 keadaan layar yang diukur, **30 punya setidaknya satu kontrol di bawah 44×44**. 27 di antaranya punya ikon profil, dan 13 punya kontrol kecil lain (Masuk dan Daftar tidak punya ikon profil).
- **Skala font.**
  - Tidak ada `allowFontScaling={false}` atau `maxFontSizeMultiplier` di v1, jadi skala font sistem berlaku.
  - Apakah tata letak tetap utuh pada skala besar di HP **tidak diketahui**, karena tidak diuji di HP. Label tab dibatasi dua baris (`AppShell.tsx:171`).
- **Reduce motion.**
  - Pembuka dan onboarding membaca `AccessibilityInfo.isReduceMotionEnabled()` **sekali** saat dibuka (`PembukaKelinci.tsx:85-93`, `OnboardingScreen.tsx:94-102`).
  - Perubahan setelan selama app terbuka tidak diikuti.
  - Tidak ada gerak lain di v1.
- **Urutan fokus.** Mengikuti urutan sumber: app bar, bilah atas, isi, tab (`AppShell.tsx:74-88`). Gerbang menyembunyikan isi di bawahnya dengan `display: none` (`app/(app)/_layout.tsx:119-127`). Urutan dengan pembaca layar sungguhan **tidak diketahui**, karena tidak diuji.
- **Kontras bermasalah:**

  | Pasangan | Rasio | Lokasi |
  |---|---|---|
  | Placeholder `ink300`/`textSubtle` `#A7AEB8` di putih | 2,24:1 | `AuthUI.tsx:98`, `NgobrolScreen.tsx:397` |
  | Lencana bawaan `blue600` di `blue200`, teks 13 px | 4,03:1 (di bawah 4,5) | `components/ui/index.tsx:124`; 7 pemakaian: `CeritaAlumniScreen.tsx:60`, `DiscoverScreens.tsx:106`, `JalurTujuanScreens.tsx:130, 150`, `LevelInScreen.tsx:149`, `PilihMapelScreen.tsx:185, 216` |
  | Teks `statusOk` `#4E9C87` di putih, keterangan | 3,27:1 | `PilihMapelScreen.tsx:288` |
  | Tombol nonaktif putih di `ink300` | 2,24:1 | `AuthUI.tsx:316`, `NgobrolScreen.tsx:568`. Nonaktif dikecualikan WCAG, tetapi sulit dibaca |
  | Titik linimasa `blue400` dan `ink300` di putih (bukan teks) | 2,63:1 dan 2,24:1 | `LinimasaScreen.tsx:461, 474-477` |
  | Lencana `solid` putih di `blue400` | 2,63:1 | `components/ui/index.tsx:126`, **tidak dipakai** di layar mana pun |

## 9. Tes yang terkunci pada tampilan atau teks

Tidak ada tes snapshot. Kuncinya berupa pencarian teks dan pola di sumber.

- **21 berkas tes membaca sumber layar atau tata letak:**
  - `apk-v2-app`, `beranda-hero-navigasi`, `data-akun-app`, `discover-app`, `eksplorasi-kampus`;
  - `event-sekolah`, `event-sekolah-smp`, `google-masuk-app`, `grid-tab-075b`, `jalur-tujuan-app`;
  - `latihan-berikutnya`, `mapel-pilihan`, `modul-latihan`, `ngobrol-penghubung`, `onboarding`;
  - `pembuka-kelinci`, `perbaikan-080b`, `persiapan-ujian`, `portofolio-app`, `saklar-bawaan-dan-smp`, `sandi-baru-app`.
- **Paling banyak dikunci:**
  - `LinimasaScreen.tsx` (7 tes);
  - `AppShell.tsx` (7);
  - `AkunScreen.tsx` (5);
  - `CekPosisiScreen.tsx` dan `DaftarPeriksaScreen.tsx` (3).
- **30 berkas tes memuat modul `lib/` yang berisi teks layar** (label tab, teks draf Discover dan Jalur, onboarding, dan lainnya) lewat `muatModulApp`. Reskin yang hanya mengganti tampilan dan tetap memakai teks dari `lib/` tidak memecahkannya. Memindahkan atau mengubah teks akan memecahkannya.
- **Daftar per berkas:** dicetak ulang dengan perintah di bagian akhir.

## 10. Komponen yang dipakai ulang dan yang diduplikasi

**Dipakai ulang** (`components/ui/index.tsx` dan `components/screens/auth/AuthUI.tsx`):
- `Tombol`: 138 pemakaian di 33 berkas.
- `Kartu`: 65 di 27.
- `Field`: 48 di 14.
- `PesanGalat`: 38 di 19.
- `Memuat`: 35 di 23.
- `Lencana`: 31 di 13.
- `Input`: 31 di 13.
- `SeksiJudul`: 29 di 17.
- `OpsiPil`: 29 di 13.
- `Kosong`: 27 di 15.
- `KeadaanGalat`: 20 di 14.
- `Kepala`: 19 di 15.

**Diduplikasi** (dibuat ulang di beberapa layar):

| Pola | Tempat |
|---|---|
| Dua sistem tombol | `Tombol` (`components/ui/index.tsx:167`) dan `TombolUtama` (`AuthUI.tsx:135`) |
| Tiga kotak centang | `KotakCentang` (`AuthUI.tsx:190`), `Centang` (`DaftarPeriksaScreen.tsx:240`), `ChipCentang` (`MapelPilihan.tsx:167`) |
| Dua bilah kemajuan | `BilahProgres` (`components/ui/index.tsx:229`) dan `BilahKemajuan` (`DaftarPeriksaScreen.tsx:192`) |
| Keadaan memuat/galat per fitur | `KeadaanLayar` (`DiscoverScreens.tsx:39`, `JalurTujuanScreens.tsx:46`), `KeadaanPortofolio` (`PortofolioScreens.tsx:42`), di samping `KeadaanGalat` bersama |
| "Tidak ditemukan" | `DiscoverScreens.tsx:127`, `JalurTujuanScreens.tsx:256`, `PortofolioScreens.tsx:66` |
| Baris daftar | `Baris` (`AkunScreen.tsx:326`), `BarisKartu` (`ArsipScreen.tsx:82`, `DiscoverScreens.tsx:100`), `BarisSesi` (`LatihanRiwayatScreen.tsx:57`), `BarisMapel` (`LevelInScreen.tsx:129`), `BarisModul` (`ModulScreens.tsx:86`), `BarisButir` (`PortofolioScreens.tsx:108`) |
| Judul seksi | `SeksiJudul` bersama, `KepalaSeksi` (`EksplorasiKampusScreen.tsx:135`), `Seksi` (`EksplorasiTujuanScreen.tsx:249`) |
| Lencana status | `Lencana` bersama dan `LencanaStatus` (`EksplorasiTujuanScreen.tsx:106`) |

Komponen v2 (`components/v2/`) disiapkan untuk menggantikan pola-pola ini saat layar direskin. Belum ada yang diganti.

## Mengulang audit

```powershell
cd LANJUT_App\server
node tools/audit-ui.js            # tabel ringkas per berkas
node tools/audit-ui.js --json     # semua nomor baris
node tools/kontras-token.js       # kontras token v2 (docs/desain-token-v2.md)
```

Pengukuran di peramban memakai alat sementara di luar repo (Edge headless dan CDP), seperti LANJUT_025 dan 026. Hasilnya tercantum di tabel bagian 2 dan tidak disimpan sebagai tes.
