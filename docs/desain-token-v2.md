# Token desain v2 (LANJUT_029)

> **Status: usulan.** Warna biru tua, sukses, dan galat **menunggu keputusan Khalifa**. Kode memakai opsi pertama dengan komentar `// MENUNGGU KEPUTUSAN` (`theme/v2/warna.ts`).
> **Dasar:** `docs/design.md` v3.1 di repo induk. Warna inti (`#B4E1EB`, `#95BDD7`, `#78A4CB`, `#FFFFFF`, `#1A1A1A`) dan dua font (Poppins, Source Sans 3) **tidak diubah**. Dokumen ini mengisi kekosongan `design.md` §2.2, §3, dan §4.
> **Kode:** `theme/v2/` (token), `components/v2/` (komponen dasar). Belum dipakai layar mana pun; layar v1 tetap memakai `theme/tokens.ts`.
> **Bukti angka kontras:** `node tools/kontras-token.js` (dari `server/`). Keluarannya ditempel di lampiran. Tes `server/tests/fondasi-desain-v2.test.js` memeriksa ulang angka yang sama.

## Prinsip

Empat prinsip Apple HIG, dipakai sebagai prinsip saja, tanpa aset atau merek Apple:

- **Kejelasan.** Satu tujuan per layar, teks pendek, ukuran yang terbaca.
- **Deference.** Isi lebih menonjol daripada hiasan: latar tenang, satu warna aksen, bayangan minimal.
- **Kedalaman.** Urutan dibuat lewat ukuran dan jarak, bukan efek; yang rinci dibuka bertahap.
- **Kontrol pengguna.** Target sentuh besar, skala font sistem dihormati, "Kurangi gerakan" dipatuhi, dan pengguna boleh menjawab "belum tahu".

Nada tetap mengikuti `salinan-teks-lanjut.md` §0: menenangkan, isi serius. Tenggat ditampilkan, bukan ditekankan; warna galat tidak pernah dipakai untuk tenggat (`design.md` §8).

## 1. Warna

### 1.1 Peran warna (`theme/v2/warna.ts`)

| Peran | Nilai | Asal |
|---|---|---|
| `halaman` | `#F5F7F9` | netral v1 (`ink050`) |
| `permukaan` | `#FFFFFF` | inti |
| `permukaanLembut` | `#E4F3F7` | turunan biru muda v1 (`blue100`) |
| `brand` | `#B4E1EB` | inti, biru muda |
| `teks` | `#1A1A1A` | inti |
| `teksSekunder` | `#3D4450` | netral v1 (`ink700`) |
| `teksPadaAksen` | `#FFFFFF` | inti |
| `aksen`, `fokus` | **biru tua: menunggu keputusan** (sementara opsi A `#456A8C`) | bagian 1.3 |
| `aksenTekan` | `#3D4450` | netral v1 |
| `garisKontrol` | `#6B7480` | netral v1 (`ink500`) |
| `garisHalus`, `kerangka`, `nonaktifLatar` | `#E6E9ED` | netral v1 (`ink100`) |
| `nonaktifTeks` | `#3D4450` | netral v1 |
| `sukses`, `suksesLatar` | **menunggu keputusan** (sementara opsi A) | bagian 1.4 |
| `galat`, `galatLatar` | **menunggu keputusan** (sementara opsi A) | bagian 1.4 |

**Teks putih di atas biru brand tidak lolos.** Putih di atas `#78A4CB` hanya 2,63:1, dan di atas `#B4E1EB` hanya 1,40:1; ambang AA adalah 4,5:1. Karena itu:

- di atas biru brand selalu memakai teks gelap: `#1A1A1A` di biru muda 12,35:1;
- tombol utama dan tautan memakai biru tua (bagian 1.3).

### 1.2 Pasangan yang dipakai komponen

Semua 29 pasangan lolos dengan opsi pertama. Tabel lengkap ada di lampiran.

Tes juga memeriksa **27 kombinasi opsi** (3 biru tua × 3 sukses × 3 galat), dan semuanya lolos. Jadi opsi mana pun yang dipilih tidak merusak komponen.

Ada tiga warna yang sengaja dicatat sebagai dekoratif (`WARNA_DEKORATIF`) dan tidak wajib 3:1:
- `garisHalus`: tepi Kartu, yang dikenali dari isinya;
- `kerangka`: balok placeholder, yang dibacakan "Memuat";
- `transparan`.

Tes melarang ketiganya dipakai untuk teks.

### 1.3 Pilihan biru tua (tombol utama, tautan, cincin fokus): **usulan, menunggu Khalifa**

| Opsi | HEX | Putih di atasnya | Sebagai teks di putih | di `#F5F7F9` | di `#E4F3F7` | di biru muda `#B4E1EB` |
|---|---|---|---|---|---|---|
| A. Biru baja tua (sudah dipakai v1) | `#456A8C` | 5,68 | 5,68 | 5,29 | 4,99 | 4,03 (di bawah 4,5) |
| B. Biru laut | `#3B5F80` | 6,69 | 6,69 | 6,23 | 5,88 | 4,75 |
| C. Biru malam | `#2F5273` | 8,15 | 8,15 | 7,59 | 7,16 | 5,78 |

Contoh pasangan:
- Tombol utama: teks putih di atas biru tua.
- Tautan "Selengkapnya": biru tua di putih.
- Cincin fokus: garis 2 pt biru tua.

Pertimbangan:
- **A** paling dekat dengan wajah v1. Tetapi tidak boleh dipakai sebagai teks di atas biru muda: 4,03:1, sehingga di sana hanya untuk ikon.
- **B** lolos di semua latar terang.
- **C** paling tegas (AAA untuk teks biasa) dan paling jauh dari kesan lembut.

### 1.4 Pilihan sukses dan galat: **usulan, menunggu Khalifa**

**Sukses**

| Opsi | HEX / latar | Teks di putih | Teks di latarnya | `#1A1A1A` di latarnya |
|---|---|---|---|---|
| A. Hijau toska (v1 `statusOkFg`) | `#2F6B5C` / `#E6F2EF` | 6,21 | 5,42 | 15,17 |
| B. Hijau daun | `#276749` / `#E7F3EC` | 6,72 | 5,90 | 15,27 |
| C. Hijau zaitun | `#4A6B2A` / `#EEF3E6` | 6,12 | 5,42 | 15,41 |

**Galat** (hanya untuk kegagalan murni, misalnya gagal menyimpan atau gagal memuat; tidak untuk tenggat)

| Opsi | HEX / latar | Teks di putih | Teks di latarnya | `#1A1A1A` di latarnya |
|---|---|---|---|---|
| A. Merah bata redup | `#A33A3A` / `#FBEDED` | 6,51 | 5,71 | 15,28 |
| B. Merah anggur | `#8C2F45` / `#F8EBEF` | 8,05 | 6,94 | 15,01 |
| C. Plum (bukan merah) | `#7B3F6E` / `#F5ECF3` | 7,55 | 6,54 | 15,06 |

Contoh pasangan:
- Pesan galat: ikon waspada dan kalimat galat di putih, atau kalimat `#1A1A1A` di atas latar galat.
- Pesan sukses: ikon centang dan kalimat sukses di putih.

Tidak ada merah atau oranye terang. Tes membatasi kanal merah galat paling tinggi `0xB0`. Opsi C paling tenang, tetapi kurang dikenali sebagai galat; bila dipilih, galat harus selalu disertai ikon dan kalimat. Aturan ini sudah berlaku untuk semua opsi.

**Status tidak pernah hanya warna:**
- Galat memakai ikon `waspada`, sukses memakai ikon `centang`, dan keduanya selalu disertai kalimat.
- Pilihan yang terpilih diberi tanda centang di dalam kotak, garis lebih tebal, dan tulisan "2 dipilih".

## 2. Tipografi (`theme/v2/token.ts`)

| Elemen | Font | Ukuran / tinggi baris (pt) | Berat |
|---|---|---|---|
| H1 (judul layar) | Poppins | 28 / 36 | SemiBold 600 |
| H2 (subjudul, judul seksi) | Poppins | 20 / 28 | Medium 500 |
| Judul kecil (judul kartu, pertanyaan) | Poppins | 17 / 24 | SemiBold 600 |
| Badan | Source Sans 3 (sementara Poppins) | 17 / 26 | Regular 400 |
| Badan kecil | Source Sans 3 (sementara Poppins) | 15 / 22 | Regular 400 |
| Keterangan | Source Sans 3 (sementara Poppins) | 14 / 20 | Regular 400 |
| Tombol | Poppins | 16 / 22 | SemiBold 600 |

- **Teks terkecil 14.** v1 memakai 11–13 untuk label tab dan lencana.
- **Skala font sistem dihormati.** Komponen v2 tidak memakai `allowFontScaling={false}`, `maxFontSizeMultiplier`, atau tinggi tetap pada wadah teks; tes memeriksanya. Apakah tata letak tetap rapi pada skala 200% di HP belum diuji.
- **Source Sans 3 belum ada di aplikasi** (`docs/audit-ui-v1.md` bagian 3). Memasangnya menambah dependensi, jadi butuh persetujuan. Sampai saat itu, badan memakai Poppins dengan komentar `// MENUNGGU KEPUTUSAN`. Usulan pemasangannya ada di bagian 7.

## 3. Jarak, radius, garis, elevasi

| Token | Nilai |
|---|---|
| Jarak (`ruang`) | 8, 16, 24, 32, 40, 48, 64, semuanya kelipatan 8. Tepi layar 16, sehingga kolom isi 328 pt di layar 360 |
| Radius | kecil 8 (pilihan, pesan), sedang 16 (kartu), besar 24, pil 999 (tombol) |
| Garis | tipis 1, fokus 2 |
| Elevasi | `datar`: tanpa bayangan, hanya garis tipis (bawaan). `angkat`: satu bayangan `0 1px 3px` tinta 8% (untuk lapisan di atas isi). Tanpa blur besar dan tanpa efek kaca |
| Ukuran | target sentuh min 44 × 44; ikon 20 dan besar 32; lingkaran ikon 64 |
| Lebar kolom maksimal | 420 (sama dengan v1) |

## 4. Gerak

| Token | Nilai | Pakai untuk |
|---|---|---|
| `cepat` | 120 ms | umpan balik tekan |
| `standar` | 200 ms | muncul dan hilang kecil |
| `lambat` | 300 ms | perpindahan bagian; denyut placeholder 2 × 300 ms |
| Kurva `standar` | bezier(0,2; 0; 0; 1) | masuk |
| Kurva `keluar` | bezier(0,4; 0; 1; 1) | keluar |

- **Kurangi gerakan.**
  - `hooks/useKurangiGerak.ts` mengikuti setelan perangkat, termasuk bila diubah saat app terbuka (berbeda dengan v1).
  - Gerak non-esensial (denyut placeholder, hiasan, transisi) menjadi 0 lewat `durasiGerak()` dan `gerakBoleh()` di `lib/kurangiGerak.ts`.
  - Gerak yang membawa arti boleh tetap, dengan tanda `esensial`.
- **Tanpa gerak tekan berskala.** Umpan balik tekan memakai perubahan latar, bukan `scale`.
- **"Selengkapnya" tanpa animasi** buka-tutup.

## 5. Aturan layar

### 5.1 Satu aksi utama per layar
- Setiap layar punya **paling banyak satu** `Tombol` varian `utama` (biru tua penuh).
- Aksi lain memakai `sekunder` (bergaris) atau `teks`.
- Aksi yang merusak (hapus) tidak pernah menjadi tombol utama berwarna galat; ia memakai `sekunder` dengan konfirmasi.
- Bila layar terasa butuh dua tombol utama, itu tanda layarnya perlu dipecah.

### 5.2 Teks panjang disajikan bertahap
- **Satu kalimat ringkasan** selalu tampil (paling banyak sekitar 20 kata), lalu tombol **"Selengkapnya"** (`RingkasanSelengkapnya`) untuk uraian.
- Header layar hanya judul dan paling banyak satu kalimat.
- Kartu hanya judul dan satu kalimat keterangan.
- Daftar panjang dipecah per seksi dengan judul H2.
- Teks yang bermakna hukum atau privasi tidak boleh diringkas sampai mengubah arti. Ringkasannya harus disetujui seperti teks lain (gerbang rilis).

### 5.3 Jawaban "belum tahu"
- Pertanyaan tentang arah dan minat menyediakan **"Belum tahu"** sebagai jawaban sah (`Pilihan` dengan `belumTahu`).
- Di pilihan banyak, "belum tahu" berdiri sendiri (`lib/pilihan.ts`).

## 6. Komponen dasar dan keadaannya

Semua komponen bisa dilihat di galeri komponen dev (`docs/galeri-komponen-029/`).

| Komponen | Memuat | Nonaktif | Galat | Fokus |
|---|---|---|---|---|
| `Teks` (7 varian) | — (teks statis) | warna `nonaktifTeks` | warna `galat` | — (bukan kontrol) |
| `Tombol` (utama, sekunder, teks) | putaran dan label tetap; `aria-busy` | latar abu-abu; `aria-disabled` | pesan dan ikon di bawah, garis galat | cincin 2 pt |
| `Kartu` (biasa, lembut, brand; bisa ditekan) | placeholder | latar abu-abu, panah redup | pesan berlatar | cincin (bila bisa ditekan) |
| `BarisDaftar` | placeholder satu baris | teks redup | pesan di bawah | cincin |
| `Pilihan` (satu atau banyak, dan "belum tahu") | placeholder | semua opsi abu-abu | pesan, garis galat pada opsi | cincin per opsi |
| `HeaderLayar` | placeholder judul | tombol kembali nonaktif | pesan di bawah judul | cincin pada kembali |
| `KeadaanKosong` | lewat aksinya (`Tombol memuat`) | lewat aksinya | — (keadaan kosong bukan galat; pakai `KeadaanGalat`) | lewat aksinya |
| `KeadaanGalat` | "mencoba lagi" (`Tombol memuat`) | — | inti komponen ini | lewat tombol coba lagi |
| `PlaceholderMemuat` | inti komponen ini; dibacakan "Memuat" | — | — | — (bukan kontrol) |
| `RingkasanSelengkapnya` | placeholder | tombol nonaktif | pesan menggantikan tombol | cincin; `aria-expanded` |
| `PesanStatus` (galat, sukses) | — | — | inti komponen ini; dibacakan segera | — |

**Aksesibilitas bawaan:**
- `Sentuh` adalah satu-satunya pembungkus `Pressable` di `components/v2`.
- Ia mewajibkan peran dan label.
- Ia memasang target minimal 44 × 44 **sesudah** gaya komponen, jadi tidak bisa ditimpa.
- Ia mengirim keadaan lewat `accessibilityState` (dibaca HP) **dan** `aria-*` (dibaca react-native-web 0.21, yang mengabaikan `accessibilityState`).
- Ia menampilkan cincin fokus saat dijangkau papan ketik.
- Di web, cincin fokus juga muncul sesudah klik mouse, karena kontrol yang diklik menjadi fokus. Di HP, fokus hanya dari papan ketik atau pembaca layar.

## 7. Dependensi: **usulan, belum dipasang**

| Paket | Untuk | Ukuran | Usulan |
|---|---|---|---|
| `@expo-google-fonts/source-sans-3` 0.4.2 | huruf badan sesuai `design.md` §3 | tarball npm 6,6 MB (semua berat). Yang masuk APK/web hanya berat yang dimuat: 400Regular 381 KB, 600SemiBold 381 KB, total ±762 KB. Sebagai pembanding, Poppins 400 = 158 KB | **Perlu persetujuan.** Alternatif tanpa paket: salin dua berkas TTF (lisensi SIL OFL) ke `assets/fonts/`; ukurannya sama |
| `react-native-reanimated` 4.8.0 | animasi di thread UI | paket npm 5,6 MB; ukuran di bundel tidak diukur | **Belum perlu.** `Animated` bawaan cukup untuk gerak tenang yang diusulkan |
| `react-native-gesture-handler` 3.5.0 | geser dan seret | paket npm 3,3 MB; tidak diukur | **Belum perlu.** Belum ada layar v2 yang butuh gestur |
| `expo-haptics` | getar halus saat memilih | paket npm 96 KB (versi 58.0.8; versi untuk SDK 57 belum diperiksa) | **Opsional.** Bila dipasang, harus mati saat "Kurangi gerakan" dan tidak boleh menjadi satu-satunya tanda |

## Lampiran: keluaran `node tools/kontras-token.js`

### Pasangan yang dipakai komponen v2 (opsi pertama)

| Depan | Latar | Jenis (ambang) | Rasio | Hasil | Dipakai di |
|---|---|---|---|---|---|
| `teks` #1A1A1A | `permukaan` #FFFFFF | teks (4,50) | 17,40:1 | lolos | Teks, Kartu, BarisDaftar, Pilihan |
| `teks` #1A1A1A | `halaman` #F5F7F9 | teks (4,50) | 16,20:1 | lolos | HeaderLayar, KeadaanKosong, KeadaanGalat |
| `teks` #1A1A1A | `permukaanLembut` #E4F3F7 | teks (4,50) | 15,30:1 | lolos | Pilihan terpilih |
| `teks` #1A1A1A | `brand` #B4E1EB | teks (4,50) | 12,35:1 | lolos | Kartu varian brand |
| `teks` #1A1A1A | `suksesLatar` #E6F2EF | teks (4,50) | 15,17:1 | lolos | Pesan sukses |
| `teks` #1A1A1A | `galatLatar` #FBEDED | teks (4,50) | 15,28:1 | lolos | Pesan galat |
| `teksSekunder` #3D4450 | `permukaan` #FFFFFF | teks (4,50) | 9,80:1 | lolos | keterangan di Kartu, BarisDaftar, Pilihan |
| `teksSekunder` #3D4450 | `halaman` #F5F7F9 | teks (4,50) | 9,13:1 | lolos | ringkasan HeaderLayar, KeadaanKosong |
| `teksSekunder` #3D4450 | `permukaanLembut` #E4F3F7 | teks (4,50) | 8,62:1 | lolos | keterangan Pilihan terpilih |
| `teksSekunder` #3D4450 | `brand` #B4E1EB | teks (4,50) | 6,96:1 | lolos | keterangan Kartu brand |
| `teksPadaAksen` #FFFFFF | `aksen` #456A8C | teks (4,50) | 5,68:1 | lolos | Tombol utama |
| `teksPadaAksen` #FFFFFF | `aksenTekan` #3D4450 | teks (4,50) | 9,80:1 | lolos | Tombol utama ditekan |
| `aksen` #456A8C | `permukaan` #FFFFFF | teks (4,50) | 5,68:1 | lolos | Tombol sekunder dan teks, tautan Selengkapnya |
| `aksen` #456A8C | `halaman` #F5F7F9 | teks (4,50) | 5,29:1 | lolos | Tombol teks di atas halaman |
| `aksen` #456A8C | `permukaanLembut` #E4F3F7 | teks (4,50) | 4,99:1 | lolos | Tombol sekunder/teks ditekan |
| `nonaktifTeks` #3D4450 | `nonaktifLatar` #E6E9ED | teks (4,50) | 8,05:1 | lolos | semua kontrol nonaktif |
| `sukses` #2F6B5C | `permukaan` #FFFFFF | teks (4,50) | 6,21:1 | lolos | label sukses |
| `sukses` #2F6B5C | `halaman` #F5F7F9 | teks (4,50) | 5,78:1 | lolos | pesan sukses di atas halaman |
| `sukses` #2F6B5C | `suksesLatar` #E6F2EF | teks (4,50) | 5,42:1 | lolos | label dan ikon pesan sukses |
| `galat` #A33A3A | `permukaan` #FFFFFF | teks (4,50) | 6,51:1 | lolos | pesan galat di bawah kontrol |
| `galat` #A33A3A | `halaman` #F5F7F9 | teks (4,50) | 6,06:1 | lolos | pesan galat di atas halaman |
| `galat` #A33A3A | `galatLatar` #FBEDED | teks (4,50) | 5,71:1 | lolos | judul dan ikon KeadaanGalat |
| `garisKontrol` #6B7480 | `permukaan` #FFFFFF | kontrol (3,00) | 4,73:1 | lolos | batas Pilihan, kotak centang |
| `garisKontrol` #6B7480 | `halaman` #F5F7F9 | kontrol (3,00) | 4,40:1 | lolos | batas Pilihan di atas halaman |
| `aksen` #456A8C | `brand` #B4E1EB | kontrol (3,00) | 4,03:1 | lolos | ikon di lingkaran KeadaanKosong |
| `fokus` #456A8C | `permukaan` #FFFFFF | kontrol (3,00) | 5,68:1 | lolos | cincin fokus |
| `fokus` #456A8C | `halaman` #F5F7F9 | kontrol (3,00) | 5,29:1 | lolos | cincin fokus |
| `fokus` #456A8C | `permukaanLembut` #E4F3F7 | kontrol (3,00) | 4,99:1 | lolos | cincin fokus, batas Pilihan terpilih |
| `galat` #A33A3A | `permukaan` #FFFFFF | kontrol (3,00) | 6,51:1 | lolos | batas kontrol bergalat |

### Palet inti dan netral

| Teks \ Latar | putih #FFFFFF | tinta050 #F5F7F9 | biru100 #E4F3F7 | biruMuda #B4E1EB | biruSedang #95BDD7 | biruBaja #78A4CB |
|---|---|---|---|---|---|---|
| putih #FFFFFF | – | 1,07 | 1,13 | 1,40 | 1,99 | 2,63 |
| tinta #1A1A1A | 17,40 | 16,20 | 15,30 | 12,35 | 8,73 | 6,60 |
| tinta700 #3D4450 | 9,80 | 9,13 | 8,62 | 6,96 | 4,92 | 3,72 |
| tinta500 #6B7480 | 4,73 | 4,40 | 4,16 | 3,36 | 2,37 | 1,79 |

### Opsi biru tua

| Opsi | HEX | Teks putih di atasnya (tombol) | Sebagai teks di putih | di halaman #F5F7F9 | di biru100 #E4F3F7 | di biru muda #B4E1EB |
|---|---|---|---|---|---|---|
| A. Biru baja tua (sudah dipakai v1 sebagai blue600) | #456A8C | 5,68 | 5,68 | 5,29 | 4,99 | 4,03 (di bawah 4,5) |
| B. Biru laut | #3B5F80 | 6,69 | 6,69 | 6,23 | 5,88 | 4,75 |
| C. Biru malam | #2F5273 | 8,15 | 8,15 | 7,59 | 7,16 | 5,78 |

### Opsi sukses

| Opsi | HEX / latar | Teks di putih | Teks di latarnya sendiri | Teks #1A1A1A di latarnya | Teks putih di atasnya |
|---|---|---|---|---|---|
| A. Hijau toska (sudah dipakai v1 sebagai statusOkFg) | #2F6B5C / #E6F2EF | 6,21 | 5,42 | 15,17 | 6,21 |
| B. Hijau daun | #276749 / #E7F3EC | 6,72 | 5,90 | 15,27 | 6,72 |
| C. Hijau zaitun | #4A6B2A / #EEF3E6 | 6,12 | 5,42 | 15,41 | 6,12 |

### Opsi galat

| Opsi | HEX / latar | Teks di putih | Teks di latarnya sendiri | Teks #1A1A1A di latarnya | Teks putih di atasnya |
|---|---|---|---|---|---|
| A. Merah bata redup | #A33A3A / #FBEDED | 6,51 | 5,71 | 15,28 | 6,51 |
| B. Merah anggur | #8C2F45 / #F8EBEF | 8,05 | 6,94 | 15,01 | 8,05 |
| C. Plum (bukan merah; wajib selalu dengan ikon dan teks) | #7B3F6E / #F5ECF3 | 7,55 | 6,54 | 15,06 | 7,55 |

29 pasangan, 0 gagal.
