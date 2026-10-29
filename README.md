# LANJUT_App — Aplikasi mobile LANJUT (Expo)

**Status:** jalur pengembangan utama LANJUT sejak 18 Sep 2026. Expo dipilih menggantikan rencana Flutter, dan aplikasi ini adalah penerus PWA v1. `MVP-PWA/` sekarang berstatus arsip dan menjadi acuan UI; aplikasi Expo ini harus tampil sama dengannya.

**Sudah jalan:**
- Lima layar P0: Beranda/Linimasa, Jenjang Saya (dulu Khusus SMK), Pilih Mapel, Cerita Alumni, Daftar Periksa. Datanya diambil dari backend lewat React Query.
- Masuk, Daftar, Akun + Keluar, dan perlindungan rute berbasis token.
- Centang Daftar Periksa tersimpan ke akun (`/kemajuan`), jadi ikut pindah ke HP lain.
- **Kelas SMP 7–9** (LANJUT_035): kelas 7–12 ditanyakan wajib di form Daftar dan bisa diubah di Data Akun. Linimasa (tenggat & tahapan), Daftar Periksa, dan Jalur Saya (`/cek-posisi`) berisi SNBP/SNBT/TKA, jadi hanya tampil untuk **kelas akun = 12**; kelas 7–11 dan akun tanpa kelas melihat placeholder sementara (`components/screens/KhususKelas12.tsx`, teks DRAF di salinan §4.11).
- **Jenjang Saya** (LANJUT_037, `/jenjang-saya`, tab "Jenjang"; dulu Khusus SMK, `/khusus-smk` dialihkan): hub per jenjang menurut kelas akun. SMP 7–9: pintu Ngobrol, Gaya Belajar, Eksplorasi Tujuan, tanpa bagian SMK. Kelas 10–11: pintu Pilih Mapel & Eksplorasi Tujuan, dan hanya butir SMK tanpa SNBP/PDSS/UTBK/kuota (daftar izin `lib/khususSmk.ts`). Kelas 12: keenam butir SMK seperti dulu. Bagian "Kalau kamu anak SMK" hanya untuk jenis sekolah SMK (LANJUT_038). Teks baru DRAF (salinan §4.2).
- **F7 Latihan** (LANJUT_041, tombol "Mulai latihan" di Arsip Belajar): `/latihan` — pilih mapel (atau semua), sesi kartu milik sendiri diacak, maks. 12 kartu (pilihan singkat 5), Lihat jawaban → nilai sendiri (Benar/Salah, atau Sudah/Belum ingat untuk catatan) → Berikutnya; ringkasan + Ulangi. Jawaban dikirim sekaligus di akhir sesi (`POST /riwayat-latihan`), lalu sesi ditutup. `/latihan-riwayat` — sesi-sesi sebelumnya. **Tanpa Level-In**: tidak ada keyakinan, spaced repetition, maupun skor kesulitan.
- **F6 Arsip Belajar** (LANJUT_039, pintu di Beranda): `/arsip` (daftar kartu milik sendiri + saringan per mapel), `/arsip-tulis` (tambah/ubah: mapel, judul, isi, jawaban opsional), `/arsip-kartu` (lihat, Lihat jawaban, hapus). Kategori kartu = `kartu.mapel_id` (tabel `mapel`, daftar yang sama dengan F3); "Soal"/"Catatan" diturunkan dari ada-tidaknya jawaban. Kartu kurasi tim (`sumber=resmi`, belum diverifikasi) tidak ditampilkan: app meminta `GET /kartu?sumber=pengguna`.
- **Jenis sekolah** (LANJUT_038, migrasi 011): SMP/SMA/SMK/MA. Kelas 7–9 selalu SMP dan diisi server (tidak pernah ditanya); kelas 10–12 memilih SMA/SMK/MA di form Daftar, Data Akun, atau gerbang langkah 2 "Kamu sekolah di mana?".
- **Gerbang wajib isi kelas** (LANJUT_036): akun tanpa kelas (akun lama) tertahan di layar "Kamu kelas berapa sekarang?" (`components/screens/IsiKelasScreen.tsx`) sampai kelas disimpan; yang tetap terbuka hanya Data Akun dan tombol Keluar. Dipasang di `app/(app)/_layout.tsx` setelah gerbang auth dan sebelum gerbang kelas 12.
- **Butir Daftar Periksa milik akun** (LANJUT_034, `/butir-pribadi`): "Simpan ke Daftar Periksa" di Pilih Mapel menambah butir "Pilih X & Y sebagai mapel TKA — untuk [prodi]" (langsung tercentang), dan di Eksplorasi Tujuan menambah "Cari tahu lebih lanjut soal [prodi]" (kategori Riset Kampus). Butir ini bisa dicentang, dibatalkan, dan dihapus, serta ikut dihitung di X/Y.
- **Data Akun** (v1.1, di layar Akun `/akun`; sebelum LANJUT_074 bernama Jalur Saya): nama tampilan, kelas, target prodi, dan ringkasan "X dari Y langkah Daftar Periksa selesai". Nama, kelas, dan prodi bisa diubah; disimpan ke akun lewat `PATCH /pengguna/saya`.
- **Jalur Saya** (v1.1, `/cek-posisi`; nama ini dipakai sejak LANJUT_074, rute tetap; pintu dari Beranda, Jenjang Saya, dan Data Akun): tahap siswa (Eksplorasi → Pemantapan Awal → Persiapan Aktif → Menjelang Pendaftaran), fokus sekarang, dan tombol langkah berikutnya. Tahap dihitung rule-based di `lib/cekPosisi.ts` dari data yang sudah ada — prodi impian, centang `mapel-tka`, dan persen Daftar Periksa — tanpa kuis. Satu pertanyaan opsional ("apa yang paling bikin bingung") hanya menambah kalimat fokus dan tidak disimpan.
- Tampilan disamakan dengan `MVP-PWA/` (lihat bagian **Tampilan**).

**Catatan historis:** `docs/prd-sdd-lanjut.md` Bagian 8 dulu menolak React Native untuk v1. Keputusan itu berlaku untuk rilis PWA v1, bukan untuk arah proyek saat ini.

## Menjalankan

```bash
# 1. Backend (butuh MySQL jalan, konfigurasi di server/.env)
cd LANJUT_App/server && npm start          # http://localhost:4000

# 2. Aplikasi (terminal lain)
cd LANJUT_App && npm run web               # http://localhost:8081
npm run android                            # emulator/device Android
```

`npm run web` harus berjalan di port **8081**, karena hanya port ini yang diizinkan CORS di `server/.env` (`ASAL_DIIZINKAN`). Base URL API diatur di `app.config.ts`: `localhost` untuk web, `10.0.2.2` untuk emulator Android. Device fisik perlu `EXPO_PUBLIC_API_URL_DEV_ANDROID` berisi IP LAN komputer.

## APK Android (EAS Build)

APK dibangun di cloud Expo, jadi tidak butuh Android Studio atau SDK lokal.

- Proyek EAS: `lippbyte/lanjut` (projectId ada di `app.config.ts`)
- Package Android: `com.edilakso.lanjut`

```bash
cd LANJUT_App
npx eas-cli build --platform android --profile preview   # hasil: .apk (bukan .aab)
```

- **URL API** diatur lewat `EXPO_PUBLIC_API_URL` di `eas.json` → `build.preview.env`. Saat ini isinya IP LAN komputer backend. Kalau IP komputer berubah, ganti nilai itu lalu build ulang; kode tidak perlu diubah.
- **Kalau `EXPO_PUBLIC_API_URL` diisi,** nilainya dipakai di semua platform dan mengalahkan pemilihan otomatis (`localhost` untuk web / `10.0.2.2` untuk emulator / URL produksi).
- **HTTP polos** (`usesCleartextTraffic`) hanya diizinkan kalau URL-nya berawalan `http://`. Build ke backend `https://` otomatis kembali aman.
- **Syarat di HP:** HP harus berada di WiFi yang sama dengan komputer backend, dan backend harus jalan (`cd server && npm start`). Backend sudah listen di `0.0.0.0:4000`.
- **Penyimpanan APK:** simpan unduhan di `LANJUT_App/build/`. Folder ini diabaikan git.
- **Aturan abaikan untuk EAS wajib di `.gitignore` root repo.** Saat mengemas proyek, EAS hanya membaca `.gitignore` root; aturan di `LANJUT_App/.gitignore` tidak berlaku untuk upload EAS (tanpa aturan root, APK di `build/` ikut terunggah dan arsip jadi ±220 MB). Cek isi arsip tanpa upload: `npx eas-cli build:inspect -p android -s archive -e preview -o <folder> --force`.

## Audit dependensi (`npm audit`)

Per LANJUT_050 (3 Oktober 2026), `npm audit` di folder ini melaporkan 29
temuan: 19 tinggi dan 10 sedang. Jumlahnya sama dengan atau tanpa
`--omit=dev`, karena perkakas Expo/Metro tercatat sebagai dependensi biasa.
Semua temuan berasal dari 4 paket akar, dan sengaja **belum diperbaiki**:

| Paket akar | Advisori | Dipakai di | Kenapa belum diperbaiki |
|---|---|---|---|
| `braces` 3.0.3 (tinggi) | GHSA-vfj7-8cjw-p6xm | Metro (pemantau berkas) di komputer pengembang | belum ada versi perbaikan di registri |
| `node-forge` 1.4.0 (tinggi) | GHSA-86w9-cpqp-85rv | `@expo/cli` (sertifikat code signing) | belum ada versi perbaikan; app tidak memakai code signing/expo-updates |
| `uuid` 7.0.3 (sedang) | GHSA-w5hq-g745-h8pq | `xcode` saat prebuild iOS | perbaikan di 11.1.1 (naik mayor); `xcode` hanya memakai `v4`, padahal celahnya di v3/v5/v6 |
| `decode-uri-component` 0.2.2 (sedang) | GHSA-vcc3-ghjq-m6fr | `query-string` di expo-router, ikut ke HP/web | perbaikan 0.5.0 hanya ESM (merusak `require`); hilang di Expo SDK 58 |

**Jangan jalankan `npm audit fix` di folder ini,** dengan atau tanpa
`--force`. Tanpa `--force`, perintah itu menyelipkan paket SDK 58
(expo-router 58, expo-constants 58) ke proyek SDK 57. Saran `--force`
malah menurunkan ke expo 44. Tinjau ulang saat naik ke Expo SDK 58.

## Tampilan

Tampilan meniru `MVP-PWA/` (port, bukan desain ulang):

- **Token desain:** `theme/tokens.ts`. Warna, huruf, jarak, radius, bayangan, dan gradasi disalin dari `MVP-PWA/assets/tokens.css`. Komponen tidak menulis HEX atau ukuran huruf mentah.
- **Huruf:** Poppins 400/500/600, sama dengan PWA. Dimuat di `app/_layout.tsx` lewat `@expo-google-fonts/poppins`.
- **Komponen dasar:** `components/ui/` berisi padanan kelas CSS PWA: `Kartu` (`.kartu`, `--soft`, `--outline`, `--brand`), `KartuPintu`, `Lencana`, `Peringatan`, `Kosong`, `Tombol`, `Kepala`, `SeksiJudul`, `Sumber`/`Penafian`, dan `Ikon` (SVG garis yang sama dengan PWA).
- **Navigasi:** app bar (maskot, wordmark, ikon profil), tab bar bawah lima tab (LANJUT_074: Beranda, Jenjang Saya, **Ngobrol** di tengah sebagai lingkaran lebih besar yang menonjol ke atas, Pilih Mapel, Daftar Periksa), dan page bar dengan tombol kembali untuk halaman anak (Cerita Alumni, Data Akun, Jalur Saya, dan lainnya). Daftar tab ada di `lib/navigasi.ts`; tab bar & page bar digambar di `components/layout/AppShell.tsx`. Tab tengah sementara berisi huruf "L" — ikon kelinci menunggu aset dari Khalifa.

Perbedaan yang disengaja dari PWA:

| Layar | Beda | Alasan |
|---|---|---|
| Beranda | Tahapan tanpa `diperiksa_pada` tidak ditampilkan (PWA menampilkannya dengan peringatan "Contoh"). Layar kosongnya mengarah ke laman resmi SNPMB. | PRD F1; keputusan PM 26 Sep 2026. |
| Beranda | Sapaan dan hitung mundur tenggat (kelas 12) ada di kepala bergradasi blue200 → blue300 yang menyatu dengan app bar (tanpa garis bawah); bagian lain di lembar putih bersudut bulat di bawahnya. | LANJUT_074, gaya header GoPay — pilihan di percakapan, belum disetujui PM. |
| Beranda | Tidak ada kartu "Latihan Hari Ini". Ada pintu Arsip Belajar (Latihan dibuka dari sana) dan pintu Level-In; saran harian tampil di layar Level-In, bukan di Beranda. | LANJUT_039/041/058: satu pintu per fitur; Level-In untuk semua kelas 7–12. |
| Jenjang Saya (dulu Khusus SMK) | Semua kartu tertutup saat layar dibuka (PWA membuka kartu pertama). | Kartu pertama yang terbuka menutupi judul lain di layar HP; permintaan user 27 Sep 2026. |
| Pilih Mapel | Tidak ada kartu "Lihat prospek & kampus" (F10). "Simpan ke Daftar Periksa" mencentang butir `mapel-tka` di akun, tidak membuat butir baru. | F10 belum ada di Expo; backend belum mendukung butir buatan pengguna. |
| Pilih Mapel | Rangkuman umum memakai `GET /konten/mapel/agregasi-lintas-prodi` (jumlah prodi), PWA menjumlah bobot di klien. | Endpoint backend sudah ada. |
| Daftar Periksa | Ada keping Kelas & Jalur untuk menyaring butir. Centang disimpan ke akun. | AC F5 di PRD (PWA belum menyaring). Jalur disimpan di perangkat karena akun belum punya medan jalur. |

## Autentikasi

| Hal | Nilai |
|---|---|
| Masuk | `POST /auth/masuk` — `nama_pengguna`, `kata_sandi` |
| Daftar | `POST /auth/daftar` — wajib: `nama_pengguna` (3–32 karakter `a-z 0-9 . _`, disimpan huruf kecil) dan `kata_sandi` (8–200 karakter, sandi umum ditolak). Opsional: `email`, `nama_tampilan` (≤60), `kelas` (`'10' \| '11' \| '12'`), `prodi_impian` (id prodi). Sumber: `server/src/modul/auth/auth.skema.js`. |
| Hasil sukses | `{ ok: true, data: { token, kedaluwarsa_pada, pengguna } }`. Daftar mengembalikan 201 dan langsung login. |
| Hasil gagal | `{ ok: false, galat: { kode, pesan, medan? } }`. Kuncinya **`galat`**, bukan `error`. |
| Penyimpanan | AsyncStorage `auth_token` (token) dan `auth_pengguna` (profil). Di web tersimpan di `localStorage`. |

Formulir Daftar mengikuti `MVP-PWA/daftar.html`: nama pengguna, email (boleh kosong), kata sandi, dan prodi impian ("Belum, aku belum tahu" juga jawaban yang sah dan tidak dikirim ke server). Kalimat galat disalin dari `PESAN_GALAT` di `MVP-PWA/assets/api.js`.

Saat aplikasi dibuka:
1. `AuthProvider` membaca token.
2. Token diperiksa ke `GET /auth/saya`.
   - Jawaban 401 → token dibuang dan pengguna kembali ke layar Masuk.
   - Galat jaringan → pengguna tetap dianggap masuk (bisa dipakai offline).

## Struktur

```
app/
  _layout.tsx          provider (SafeArea, Query, Auth) + muat huruf Poppins
  index.tsx            → /linimasa
  (auth)/_layout.tsx   khusus yang belum masuk; sudah masuk → /linimasa
  (auth)/masuk.tsx, daftar.tsx
  (app)/_layout.tsx    khusus yang sudah masuk; belum masuk → /masuk. Membungkus AppShell
  (app)/linimasa.tsx … lima layar P0, (app)/akun.tsx
api/                   client.ts (apiFetch, ApiError), auth.ts (layanan auth), types.ts
providers/             QueryProvider, AuthProvider (status sesi: memuat | masuk | keluar)
hooks/                 useAuth, useKemajuan (baca + centang), hook data per fitur
theme/tokens.ts        token desain dari MVP-PWA
components/            ui/ (komponen dasar), layout/ (AppShell), screens/ (per fitur, auth/)
server/                backend Express + MySQL (lihat server/README.md)
```

## Keputusan struktur (satu kalimat per keputusan)

- **Perlindungan rute memakai grup Expo Router `(auth)` & `(app)` yang masing-masing punya `_layout.tsx` penjaga, bukan `RootNavigator` ala React Navigation** — proyek ini memakai routing berbasis file, jadi penjagaan diletakkan di layout grup dan URL tetap bersih (`/masuk`, `/linimasa`).
- **Setelah login/daftar tidak ada `router.push` manual** — penjaga di `(auth)/_layout.tsx` otomatis pindah ke `/linimasa` begitu status sesi berubah jadi `masuk`, jadi hanya ada satu sumber kebenaran untuk navigasi.
- **Kedua layout grup memakai `<Slot/>`, bukan `<Stack/>` atau `<Tabs/>`** — tab bar & page bar digambar sendiri di `AppShell` supaya sama persis dengan PWA.
- **Gerbang isi kelas tidak melepas `<Slot/>`** — app di bawahnya hanya disembunyikan (`display: none`). Mengganti `<Slot/>` dengan layar lain membuat navigator kehilangan state: tab dari `/akun` tidak bisa pindah halaman lagi.
- **`@expo/html-elements` untuk `Header`, `Nav`, `Main`, `Footer`, `Article`, `Section`, `H1`** — di web menghasilkan tag HTML semantik asli, di native menjadi `View`/`Text`.
- **Tab bar memakai `<Link asChild>`** — supaya di web jadi `<a href>` sungguhan, bukan navigasi yang hanya jalan lewat klik.
- **Status centang/pilihan/buka memakai atribut `aria-*`** (`aria-checked`, `aria-expanded`, `aria-current`), bukan `accessibilityState` — react-native-web tidak menerjemahkan `accessibilityState` ke atribut ARIA.
- **Ringkasan kemajuan di Data Akun memakai `hooks/useProgresDaftarPeriksa`, hook yang sama dengan layar Daftar Periksa** — saringan kelas/jalur dan hitungan X/Y hanya ada di satu tempat, jadi angkanya selalu cocok.
- **Pilihan kelas/jalur di perangkat disimpan per akun** (`lanjut.profil.lokal.v1:<id pengguna>`) — HP yang dipakai bergantian tidak membawa saringan akun lain.
- **`DELETE /kemajuan/:id` tidak menghapus baris**, hanya mengosongkan `selesai_pada`; klien menganggap butir tercentang hanya kalau `selesai_pada` terisi.
- **Cache data milik akun (`['kemajuan']`, `['butir_pribadi']`, `['levelin']`, dan lainnya di `KUNCI_DATA_AKUN`) dibuang di `AuthProvider` setiap sesi berganti** — keluar, masuk akun lain, atau sesi ditolak server — supaya data akun A tidak pernah tampil di akun B pada perangkat yang sama.
- **Keyakinan di Latihan (LANJUT_058) memakai tiga pilihan yang dipetakan ke skala server 1–5** (`lib/latihan.ts` `KEYAKINAN`: yakin 4, ragu 2, tebak 1, sesuai label PWA) — tidak ada kolom atau ambang baru; dilewati berarti tidak dikirim.
- **Layar Level-In (`/level-in`) hanya menampilkan hasil server** (`/kalibrasi/ringkasan`, `/saran-harian`); angka "berapa kartu lagi" dan batas persen diambil dari `/konfigurasi/levelin`, tidak ditulis di app (`lib/levelin.ts`).

## Yang belum ada

- Pilihan jalur di Daftar Periksa masih tersimpan per perangkat (`useProfilLokal`), karena akun belum punya medan jalur.
- Antrean luring untuk hasil Latihan: hasil dikirim sekaligus di akhir sesi, dengan "Coba lagi" bila gagal (keyakinan ikut terkirim ulang).
- Data konten (Linimasa, Khusus SMK, dll.) masih data contoh (`asal: mockup`, `diperiksa_pada: null`) dan perlu diverifikasi tim konten.
- Lupa sandi dan ubah sandi.
