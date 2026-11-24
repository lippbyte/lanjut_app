# Token desain v2 — Dua Mode (LANJUT_029, diperbarui LANJUT_031b)

> **Status:** sumber kebenaran token layar v2. Warna biru tua terang, sukses terang, galat terang, dan tipografi Poppins + Source Sans 3 adalah **keputusan 20 Nov 2026**; kerangka dua mode (terang dominan putih & gelap Midnight Navy) adalah **keputusan 23 Nov 2026**. Beberapa warna pendukung mode gelap masih bertanda **usulan** (terukur kontrasnya, satu berkas di `theme/v2/warna.ts`, mudah diubah).
> **Dasar:** `docs/design.md` v3.1 di repo induk. Warna inti (`#B4E1EB`, `#95BDD7`, `#78A4CB`, `#FFFFFF`, `#1A1A1A`), maskot kelinci wisudawan, dan dua font (Poppins, Source Sans 3) **tidak diubah**. **Ungu EDILAKSO tidak pernah dipakai di LANJUT.**
> **Kode:** `theme/v2/` (token murni & `konteks.tsx` untuk `useTemaV2()`), `components/v2/` (komponen dasar + Phosphor Icons), `components/screens/v2/TemaV2Provider.tsx` (di balik saklar `EXPO_PUBLIC_MODE_GELAP`, mati bawaan). Layar v1 tetap memakai `theme/tokens.ts`.
> **Bukti angka kontras:** `node tools/kontras-token.js` (dari `server/`). Keluarannya ditempel di lampiran. Tes `server/tests/fondasi-desain-v2.test.js` dan `server/tests/mode-gelap-v2.test.js` memeriksa ulang angka yang sama.

## Prinsip

Empat prinsip antarmuka mobile (padanan RN untuk Apple HIG, tanpa aset atau merek Apple):

- **Kejelasan.** Satu tujuan per layar, teks pendek, ukuran yang terbaca, tautan bergaris bawah di kedua mode.
- **Deference.** Isi lebih menonjol daripada hiasan: latar tenang (terang dominan putih 70/20/10, gelap Midnight Navy 60/30/10), satu warna aksen, bayangan tipis hanya di mode terang.
- **Kedalaman.** Urutan dibuat lewat ukuran, permukaan, dan jarak, bukan efek; yang rinci dibuka bertahap.
- **Kontrol pengguna.** Target sentuh minimal 44 pt, skala font sistem dihormati, "Kurangi gerakan" dipatuhi, pilihan mode lokal saja (`Ikuti sistem`, `Terang`, `Gelap`), dan pengguna boleh menjawab "belum tahu".

Nada tetap mengikuti `salinan-teks-lanjut.md` §0: menenangkan, isi serius. Tenggat ditampilkan, bukan ditekankan; warna galat tidak pernah dipakai untuk tenggat (`design.md` §8).

## 1. Warna dua mode (`theme/v2/warna.ts`)

Semua layar dan komponen v2 membaca warna lewat `useTemaV2()` dengan nama peran token, tidak pernah menulis kode HEX langsung. Saat saklar `EXPO_PUBLIC_MODE_GELAP` mati (bawaan), `TemaV2Provider` selalu mengembalikan set **terang** dan mengabaikan setelan sistem.

### 1.1 Token semantik utama (`PETA_TOKEN_SEMANTIK`)

| Token semantik | Nama peran di kode | Mode terang | Mode gelap | Status |
|---|---|---|---|---|
| `bg` (latar halaman) | `halaman` | `#FFFFFF` | `#0C1B33` | keputusan 23 Nov |
| `surface` (kartu, panel, bilah) | `permukaan` | `#F4F7FB` | `#16294A` | keputusan 23 Nov |
| `border` (garis kartu, pemisah; dekoratif) | `garisHalus` | `#D9E1EC` | `#2B4268` | terang: keputusan 23 Nov · gelap: **usulan** |
| `borderKontrol` (batas kolom isian & kontrol; wajib ≥ 3:1) | `garisKontrol` | `#5B6B82` | `#8793A8` | keputusan 23 Nov |
| `text` | `teks` | `#0C1B33` | `#EEF1F6` | keputusan 23 Nov |
| `muted` (hanya teks pendukung, bukan info penting / di atas `bagianBiru`) | `teksSekunder` | `#5B6B82` | `#8793A8` | keputusan 23 Nov |
| `accent` (tombol utama, tautan, ikon aktif) | `aksen`, `fokus` | `#3B5F80` | `#95BDD7` | terang: keputusan 20 Nov · gelap: keputusan 23 Nov (biru kedua LANJUT) |
| `onAccent` (teks di atas tombol aksen) | `teksPadaAksen` | `#FFFFFF` | `#0C1B33` | keputusan 23 Nov |
| `bagianBiru` (latar bagian berwarna, sekitar 20% di terang) | `brand` | `#B4E1EB` | `#16294A` (= `surface`) | keputusan 23 Nov |
| `sukses` | `sukses` | `#276749` | `#6FCF97` | terang: keputusan 20 Nov · gelap: **usulan** |
| `galat` | `galat` | `#A33A3A` | `#F28B82` | terang: keputusan 20 Nov · gelap: **usulan** |

### 1.2 Peran warna pendukung

| Nama peran | Mode terang | Mode gelap | Status & catatan |
|---|---|---|---|
| `permukaanLembut` | `#E4F3F7` | `#172B4D` | terang: turunan biru muda v1 · gelap: **usulan** (kontras `teksSekunder` 4,54:1 ≥ 4,5) |
| `aksenTekan` | `#2F5273` | `#B4E1EB` | terang: opsi biru malam (8,15:1) · gelap: biru muda inti (12,21:1) |
| `nonaktifLatar` | `#E6E9ED` | `#1F3150` | terang: netral v1 · gelap: **usulan** |
| `nonaktifTeks` | `#3D4450` | `#A6B3C6` | terang: netral v1 (8,05:1) · gelap: **usulan** (6,12:1) |
| `kerangka` (dekoratif) | `#E6E9ED` | `#1F3150` | balok `PlaceholderMemuat`, dibacakan "Memuat" |
| `suksesLatar` | `#E7F3EC` | `#133326` | terang: keputusan 20 Nov · gelap: **usulan** (`sukses` 7,22:1, `teks` 12,12:1) |
| `galatLatar` | `#FBEDED` | `#3B1D24` | terang: keputusan 20 Nov · gelap: **usulan** (`galat` 6,33:1, `teks` 13,37:1) |
| `badgeLogo` (dekoratif) | `#78A4CB` | `transparent` | **`[PERLU DIKONFIRMASI]`**: penampung sementara wordmark putih di mode terang; transparan di mode gelap |
| `latarMaskot` (dekoratif) | `#B4E1EB` | `#B4E1EB` | **keputusan 24 Nov 2026**: lingkaran latar maskot kelinci pada keadaan kosong di kedua mode agar garis maskot tidak redup di mode gelap |
| `transparan` (dekoratif) | `transparent` | `transparent` | latar tombol sekunder, tombol teks, dan `badgeLogo` gelap |

### 1.3 Aturan kontras dan tampilan

- **Teks putih di atas biru brand tidak dipakai.** Putih di atas `#78A4CB` hanya 2,63:1, dan di atas `#B4E1EB` hanya 1,40:1.
- **Teks di atas `bagianBiru` (`brand`)** selalu memakai `teks` (`#0C1B33` di `#B4E1EB` = 12,21:1; `#EEF1F6` di `#16294A` = 12,79:1), bukan `teksSekunder`.
- **Tombol utama:** latar `aksen`, teks `teksPadaAksen` (putih di terang 6,69:1; navy `#0C1B33` di gelap 8,63:1), sudut pil, tinggi minimal 44 pt.
- **Tombol sekunder:** latar `transparan` dengan garis `aksen` dan teks `aksen`.
- **Tautan / tombol teks:** warna `aksen` **ditambah garis bawah** di kedua mode (`Tombol varian="teks"` dan `RingkasanSelengkapnya`).
- **Kartu:** latar `permukaan` (`surface`); bayangan tipis (`elevasi.angkat`) **hanya di mode terang**, datar di mode gelap.
- **Status tidak pernah hanya warna:** galat memakai ikon `waspada` + kalimat, sukses memakai ikon `centang` + kalimat, pilihan aktif dan tab aktif memakai bentuk ikon (`fill` / centang) + tebal huruf + label.
- **Komposisi terang:** sekitar 70% putih (`#FFFFFF`), 20% biru (`#B4E1EB`), 10% aksen; **tidak ada latar navy penuh di mode terang**. **Komposisi gelap:** sekitar 60% `bg` (`#0C1B33`), 30% `surface` (`#16294A`), 10% aksen (`#95BDD7`).
- **Warna dekoratif (`WARNA_DEKORATIF`):** `garisHalus`, `kerangka`, `badgeLogo`, `latarMaskot`, `transparan`. Tes melarang kelimanya dipakai sebagai warna teks.
- Semua **28 pasangan** lolos di mode terang DAN mode gelap (0 gagal), serta seluruh **27 kombinasi opsi terang** (3 biru tua × 3 sukses × 3 galat) tetap lolos.

### 1.4 Pilihan warna terang yang sudah diputuskan (20 Nov 2026)

- **Biru tua (`aksen` terang):** opsi B — Biru laut `#3B5F80` (keputusan 20 Nov, dapat diubah di satu tempat di `theme/v2/warna.ts`).
- **Sukses terang:** opsi B — Hijau daun `#276749` / latar `#E7F3EC` (keputusan 20 Nov).
- **Galat terang:** opsi A — Merah bata redup `#A33A3A` / latar `#FBEDED` (keputusan 20 Nov; hanya untuk kegagalan murni, bukan tenggat; kanal merah ≤ `0xB0`).

## 2. Tipografi (`theme/v2/token.ts`)

| Elemen | Font | Ukuran / tinggi baris (pt) | Berat |
|---|---|---|---|
| H1 (judul layar) | Poppins | 28 / 36 | SemiBold 600 |
| H2 (subjudul, judul seksi) | Poppins | 20 / 28 | Medium 500 |
| Judul kecil (judul kartu, pertanyaan) | Poppins | 17 / 24 | SemiBold 600 |
| Badan | Source Sans 3 | 17 / 26 | Regular 400 |
| Badan kecil | Source Sans 3 | 15 / 22 | Regular 400 |
| Keterangan | Source Sans 3 | 14 / 20 | Regular 400 |
| Tombol | Poppins | 16 / 22 | SemiBold 600 |

- **Font terkunci (keputusan 20 Nov):** Poppins untuk judul dan tombol; Source Sans 3 lokal berlisensi SIL OFL (`assets/fonts/`) untuk isi. Tidak diubah pada LANJUT_031b.
- **Skala font sistem dihormati.** Komponen v2 tidak memakai `allowFontScaling={false}`, `maxFontSizeMultiplier`, atau tinggi tetap pada wadah teks.

## 3. Ikon dan logo (LANJUT_031b)

- **Ikon v2 (`components/v2/IkonV2.tsx`):** memakai **Phosphor Icons** (`phosphor-react-native` v3.0.6, bergantung pada `react-native-svg` yang sudah ada). Ukuran baku `ukuran.ikon` (20) dan `ukuran.ikonBesar` (32), bobot konsisten (`regular` bawaan, `bold` untuk centang, `fill` untuk ikon tab/radio terpilih).
- **Wordmark (`assets/lanjut-wordmark.png`, huruf putih):**
  - Mode gelap: tampil langsung di atas `bg` (`#0C1B33`) tanpa badge.
  - Mode terang: dibungkus badge persegi membulat berwarna biru LANJUT (`#78A4CB`, token `badgeLogo`) sebagai penampung sementara — **`[PERLU DIKONFIRMASI]`** (logo dikecualikan dari batas kontras teks; menunggu keputusan Khalifa atau aset varian tinta gelap).
- **Maskot (`assets/mascot-blue.png`):** dipakai apa adanya tanpa menggambar ulang. Pada keadaan kosong layar v2 (Arah Saya, Jejak Waktu, Langkah Saya), maskot ditempatkan di dalam lingkaran `latarMaskot` (`#B4E1EB` di mode terang maupun gelap, keputusan 24 Nov 2026) supaya garis maskot tetap jelas di mode gelap.

## 4. Jarak, radius, garis, elevasi, dan gerak (`theme/v2/token.ts`)

| Token | Nilai |
|---|---|
| Jarak (`ruang`) | 8, 16, 24, 32, 40, 48, 64 (kelipatan 8). Tepi layar 16 |
| Radius | kecil 8, sedang 16, besar 24, pil 999 |
| Garis | tipis 1, fokus 2 |
| Elevasi | `datar`: tanpa bayangan (selalu di mode gelap). `angkat`: bayangan tipis `0 1px 3px` tinta 8% (hanya di mode terang) |
| Ukuran | target sentuh min 44 × 44; ikon 20 dan besar 32; lingkaran ikon 64 |
| Lebar kolom maksimal | 420 |
| Gerak | `cepat` 120 ms, `standar` 200 ms, `lambat` 300 ms; mati saat "Kurangi gerakan". Pergantian mode langsung tanpa kedip dan tanpa memuat ulang aplikasi |

## 5. Pemilihan mode dan saklar `EXPO_PUBLIC_MODE_GELAP`

- **Saklar:** `EXPO_PUBLIC_MODE_GELAP` (mati bawaan di `app.config.ts` dan `lib/fiturApp.ts`).
- **Saat mati:** `userInterfaceStyle: 'light'`, aplikasi selalu terang, mengabaikan pengaturan sistem, dan tombol ganti mode tidak tampil.
- **Saat menyala:** `userInterfaceStyle: 'automatic'`, pilihan (`sistem` bawaan, `terang`, `gelap`) disimpan **hanya di perangkat** (`AsyncStorage` kunci `lanjut.modeTampilan.v2`, bukan penyimpanan aman dan tidak pernah dikirim ke server). Tombol ganti mode tampil di layar **Akun & Privasi** (`/akun`) lewat `AppShellV2`.
- **Bilah status & papan ketik:** `StatusBarV2` mengubah ikon bilah status (`light` di gelap, `dark` di terang) beserta warna latar, dan `Isian` meneruskan `keyboardAppearance` sesuai mode aktif.

## Lampiran: keluaran `node tools/kontras-token.js`

### Ringkasan pasangan dua mode (LANJUT_031b)

| Pasangan (ambang) | Terang (HEX & rasio) | Gelap (HEX & rasio) | Hasil |
|---|---|---|---|
| `text` / `bg` (4,50:1) | #0C1B33 / #FFFFFF — **17,21:1** | #EEF1F6 / #0C1B33 — **15,20:1** | lolos |
| `text` / `surface` (4,50:1) | #0C1B33 / #F4F7FB — **16,01:1** | #EEF1F6 / #16294A — **12,79:1** | lolos |
| `text` / `bagianBiru` (4,50:1) | #0C1B33 / #B4E1EB — **12,21:1** | #EEF1F6 / #16294A — **12,79:1** | lolos |
| `muted` / `bg` (4,50:1) | #5B6B82 / #FFFFFF — **5,42:1** | #8793A8 / #0C1B33 — **5,54:1** | lolos |
| `muted` / `surface` (4,50:1) | #5B6B82 / #F4F7FB — **5,04:1** | #8793A8 / #16294A — **4,66:1** | lolos |
| `accent` / `bg` (4,50:1) | #3B5F80 / #FFFFFF — **6,69:1** | #95BDD7 / #0C1B33 — **8,63:1** | lolos |
| `accent` / `surface` (4,50:1) | #3B5F80 / #F4F7FB — **6,23:1** | #95BDD7 / #16294A — **7,26:1** | lolos |
| `onAccent` / `accent` (4,50:1) | #FFFFFF / #3B5F80 — **6,69:1** | #0C1B33 / #95BDD7 — **8,63:1** | lolos |
| `sukses` / `bg` (4,50:1) | #276749 / #FFFFFF — **6,72:1** | #6FCF97 / #0C1B33 — **9,05:1** | lolos |
| `sukses` / `surface` (4,50:1) | #276749 / #F4F7FB — **6,25:1** | #6FCF97 / #16294A — **7,61:1** | lolos |
| `galat` / `bg` (4,50:1) | #A33A3A / #FFFFFF — **6,51:1** | #F28B82 / #0C1B33 — **7,20:1** | lolos |
| `galat` / `surface` (4,50:1) | #A33A3A / #F4F7FB — **6,06:1** | #F28B82 / #16294A — **6,06:1** | lolos |
| `borderKontrol` / `bg` (3,00:1) | #5B6B82 / #FFFFFF — **5,42:1** | #8793A8 / #0C1B33 — **5,54:1** | lolos |
| `borderKontrol` / `surface` (3,00:1) | #5B6B82 / #F4F7FB — **5,04:1** | #8793A8 / #16294A — **4,66:1** | lolos |

### Pasangan komponen v2 — Mode terang

| Depan | Latar | Jenis (ambang) | Rasio | Hasil | Dipakai di |
|---|---|---|---|---|---|
| `teks` #0C1B33 | `permukaan` #F4F7FB | teks (4,50) | 16,01:1 | lolos | Teks, Kartu, BarisDaftar, Pilihan |
| `teks` #0C1B33 | `halaman` #FFFFFF | teks (4,50) | 17,21:1 | lolos | HeaderLayar, KeadaanKosong, KeadaanGalat |
| `teks` #0C1B33 | `permukaanLembut` #E4F3F7 | teks (4,50) | 15,13:1 | lolos | Pilihan terpilih |
| `teks` #0C1B33 | `brand` #B4E1EB | teks (4,50) | 12,21:1 | lolos | Kartu varian brand (judul dan keterangan) |
| `teks` #0C1B33 | `suksesLatar` #E7F3EC | teks (4,50) | 15,10:1 | lolos | Pesan sukses |
| `teks` #0C1B33 | `galatLatar` #FBEDED | teks (4,50) | 15,11:1 | lolos | Pesan galat |
| `teksSekunder` #5B6B82 | `permukaan` #F4F7FB | teks (4,50) | 5,04:1 | lolos | keterangan di Kartu, BarisDaftar, Pilihan |
| `teksSekunder` #5B6B82 | `halaman` #FFFFFF | teks (4,50) | 5,42:1 | lolos | ringkasan HeaderLayar, KeadaanKosong |
| `teksSekunder` #5B6B82 | `permukaanLembut` #E4F3F7 | teks (4,50) | 4,77:1 | lolos | keterangan Pilihan terpilih |
| `teksPadaAksen` #FFFFFF | `aksen` #3B5F80 | teks (4,50) | 6,69:1 | lolos | Tombol utama |
| `teksPadaAksen` #FFFFFF | `aksenTekan` #2F5273 | teks (4,50) | 8,15:1 | lolos | Tombol utama ditekan |
| `aksen` #3B5F80 | `permukaan` #F4F7FB | teks (4,50) | 6,23:1 | lolos | Tombol sekunder dan teks, tautan Selengkapnya |
| `aksen` #3B5F80 | `halaman` #FFFFFF | teks (4,50) | 6,69:1 | lolos | Tombol teks di atas halaman |
| `aksen` #3B5F80 | `permukaanLembut` #E4F3F7 | teks (4,50) | 5,88:1 | lolos | Tombol sekunder/teks ditekan |
| `nonaktifTeks` #3D4450 | `nonaktifLatar` #E6E9ED | teks (4,50) | 8,05:1 | lolos | semua kontrol nonaktif |
| `sukses` #276749 | `permukaan` #F4F7FB | teks (4,50) | 6,25:1 | lolos | label sukses |
| `sukses` #276749 | `halaman` #FFFFFF | teks (4,50) | 6,72:1 | lolos | pesan sukses di atas halaman |
| `sukses` #276749 | `suksesLatar` #E7F3EC | teks (4,50) | 5,90:1 | lolos | label dan ikon pesan sukses |
| `galat` #A33A3A | `permukaan` #F4F7FB | teks (4,50) | 6,06:1 | lolos | pesan galat di bawah kontrol |
| `galat` #A33A3A | `halaman` #FFFFFF | teks (4,50) | 6,51:1 | lolos | pesan galat di atas halaman |
| `galat` #A33A3A | `galatLatar` #FBEDED | teks (4,50) | 5,71:1 | lolos | judul dan ikon KeadaanGalat |
| `garisKontrol` #5B6B82 | `permukaan` #F4F7FB | kontrol (3,00) | 5,04:1 | lolos | batas Pilihan, kotak centang, kolom isian |
| `garisKontrol` #5B6B82 | `halaman` #FFFFFF | kontrol (3,00) | 5,42:1 | lolos | batas Pilihan di atas halaman |
| `aksen` #3B5F80 | `brand` #B4E1EB | kontrol (3,00) | 4,75:1 | lolos | ikon di lingkaran KeadaanKosong |
| `fokus` #3B5F80 | `permukaan` #F4F7FB | kontrol (3,00) | 6,23:1 | lolos | cincin fokus |
| `fokus` #3B5F80 | `halaman` #FFFFFF | kontrol (3,00) | 6,69:1 | lolos | cincin fokus |
| `fokus` #3B5F80 | `permukaanLembut` #E4F3F7 | kontrol (3,00) | 5,88:1 | lolos | cincin fokus, batas Pilihan terpilih |
| `galat` #A33A3A | `permukaan` #F4F7FB | kontrol (3,00) | 6,06:1 | lolos | batas kontrol bergalat |

### Pasangan komponen v2 — Mode gelap

| Depan | Latar | Jenis (ambang) | Rasio | Hasil | Dipakai di |
|---|---|---|---|---|---|
| `teks` #EEF1F6 | `permukaan` #16294A | teks (4,50) | 12,79:1 | lolos | Teks, Kartu, BarisDaftar, Pilihan |
| `teks` #EEF1F6 | `halaman` #0C1B33 | teks (4,50) | 15,20:1 | lolos | HeaderLayar, KeadaanKosong, KeadaanGalat |
| `teks` #EEF1F6 | `permukaanLembut` #172B4D | teks (4,50) | 12,45:1 | lolos | Pilihan terpilih |
| `teks` #EEF1F6 | `brand` #16294A | teks (4,50) | 12,79:1 | lolos | Kartu varian brand (judul dan keterangan) |
| `teks` #EEF1F6 | `suksesLatar` #133326 | teks (4,50) | 12,12:1 | lolos | Pesan sukses |
| `teks` #EEF1F6 | `galatLatar` #3B1D24 | teks (4,50) | 13,37:1 | lolos | Pesan galat |
| `teksSekunder` #8793A8 | `permukaan` #16294A | teks (4,50) | 4,66:1 | lolos | keterangan di Kartu, BarisDaftar, Pilihan |
| `teksSekunder` #8793A8 | `halaman` #0C1B33 | teks (4,50) | 5,54:1 | lolos | ringkasan HeaderLayar, KeadaanKosong |
| `teksSekunder` #8793A8 | `permukaanLembut` #172B4D | teks (4,50) | 4,54:1 | lolos | keterangan Pilihan terpilih |
| `teksPadaAksen` #0C1B33 | `aksen` #95BDD7 | teks (4,50) | 8,63:1 | lolos | Tombol utama |
| `teksPadaAksen` #0C1B33 | `aksenTekan` #B4E1EB | teks (4,50) | 12,21:1 | lolos | Tombol utama ditekan |
| `aksen` #95BDD7 | `permukaan` #16294A | teks (4,50) | 7,26:1 | lolos | Tombol sekunder dan teks, tautan Selengkapnya |
| `aksen` #95BDD7 | `halaman` #0C1B33 | teks (4,50) | 8,63:1 | lolos | Tombol teks di atas halaman |
| `aksen` #95BDD7 | `permukaanLembut` #172B4D | teks (4,50) | 7,07:1 | lolos | Tombol sekunder/teks ditekan |
| `nonaktifTeks` #A6B3C6 | `nonaktifLatar` #1F3150 | teks (4,50) | 6,12:1 | lolos | semua kontrol nonaktif |
| `sukses` #6FCF97 | `permukaan` #16294A | teks (4,50) | 7,61:1 | lolos | label sukses |
| `sukses` #6FCF97 | `halaman` #0C1B33 | teks (4,50) | 9,05:1 | lolos | pesan sukses di atas halaman |
| `sukses` #6FCF97 | `suksesLatar` #133326 | teks (4,50) | 7,22:1 | lolos | label dan ikon pesan sukses |
| `galat` #F28B82 | `permukaan` #16294A | teks (4,50) | 6,06:1 | lolos | pesan galat di bawah kontrol |
| `galat` #F28B82 | `halaman` #0C1B33 | teks (4,50) | 7,20:1 | lolos | pesan galat di atas halaman |
| `galat` #F28B82 | `galatLatar` #3B1D24 | teks (4,50) | 6,33:1 | lolos | judul dan ikon KeadaanGalat |
| `garisKontrol` #8793A8 | `permukaan` #16294A | kontrol (3,00) | 4,66:1 | lolos | batas Pilihan, kotak centang, kolom isian |
| `garisKontrol` #8793A8 | `halaman` #0C1B33 | kontrol (3,00) | 5,54:1 | lolos | batas Pilihan di atas halaman |
| `aksen` #95BDD7 | `brand` #16294A | kontrol (3,00) | 7,26:1 | lolos | ikon di lingkaran KeadaanKosong |
| `fokus` #95BDD7 | `permukaan` #16294A | kontrol (3,00) | 7,26:1 | lolos | cincin fokus |
| `fokus` #95BDD7 | `halaman` #0C1B33 | kontrol (3,00) | 8,63:1 | lolos | cincin fokus |
| `fokus` #95BDD7 | `permukaanLembut` #172B4D | kontrol (3,00) | 7,07:1 | lolos | cincin fokus, batas Pilihan terpilih |
| `galat` #F28B82 | `permukaan` #16294A | kontrol (3,00) | 6,06:1 | lolos | batas kontrol bergalat |

Mode terang: 28 pasangan, 0 gagal.
Mode gelap: 28 pasangan, 0 gagal.
