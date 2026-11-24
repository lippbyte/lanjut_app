# Periksa layar navigasi v2 dan Arah Saya: tangkapan layar DEV (LANJUT_031)

> **DEV.** Dibuat di peramban (Chrome headless, lebar **360 px** dan **412 px**), **bukan di HP**, **belum dengan pembaca layar**, dan **belum dengan ukuran huruf besar**.
> **Data:** seluruhnya akun dummy di `lanjut_dev` (`demo_kelas12_dc`, `uji_belum_memilih`, `demo_kelas12_p26`). Jalur `[DUMMY] Melanjutkan` berasal dari `npm run benih-persetujuan-dummy`, yang sudah dicabut kembali dengan `--cabut` sesudahnya.
> **Build:** dua bundel web dibuat dengan `--clear`:
> 1. **Saklar penuh** (`EXPO_PUBLIC_NAVIGASI_V2=1`, `DISCOVER=1`, `JALUR_TUJUAN=1`, `PORTOFOLIO=1`, `KELOLA_DATA_AKUN=1`).
> 2. **Tiga tab** (`EXPO_PUBLIC_NAVIGASI_V2=1`, `DISCOVER=0`, `JALUR_TUJUAN=0`, `PORTOFOLIO=0`, `KELOLA_DATA_AKUN=0`).

## Berkas

| Berkas | Lebar | Akun dummy | Isi yang diperiksa |
|---|---|---|---|
| `01-arah-saya-ada-jalur-360.png` | 360 px | `demo_kelas12_dc` | Arahku (ada jalur `[DUMMY] Melanjutkan`), Langkah berikutnya (`Siapkan KTP` dari `butir_daftar_periksa`), 4 pintu besar (Rekam Jejak berlatar brand), Alat belajar terlipat, 4 tab bawah |
| `02-arah-saya-ada-jalur-412.png` | 412 px | `demo_kelas12_dc` | Keadaan yang sama pada lebar 412 px |
| `03-arah-saya-belum-memilih-kosong-360.png` | 360 px | `uji_belum_memilih` | Arahku ("Pilih arahmu"), keadaan kosong Langkah berikutnya dengan maskot kelinci dan satu tombol "Jelajah", 4 tab bawah |
| `04-arah-saya-belum-memilih-kosong-412.png` | 412 px | `uji_belum_memilih` | Keadaan yang sama pada lebar 412 px |
| `05-arah-saya-belum-tahu-360.png` | 360 px | `uji_belum_memilih` | Arahku keadaan "Belum tahu" (tanda lokal 030: "Belum menentukan arah." + "Ubah") |
| `06-arah-saya-alat-belajar-terbuka-360.png` | 360 px | `demo_kelas12_dc` | Bagian lipat "Alat belajar" dalam keadaan terbuka |
| `07-tab-jejak-waktu-360.png` | 360 px | `demo_kelas12_dc` | Tab Jejak Waktu (`/linimasa` v1 belum di-reskin) dengan pintu "Langkah Saya" dan bilah tab v2 |
| `08-tab-profil-saya-360.png` | 360 px | `demo_kelas12_dc` | Tab Profil Saya (`/discover-profil` v1 belum di-reskin) dengan pintu "Akun & Privasi" dan bilah tab v2 |
| `09-arah-saya-jalur-draf-netral-360.png` | 360 px | `demo_kelas12_p26` | Jalur draf setelah `--cabut`: tampil netral ("Jalur belum tersedia"), tanpa id draf atau teks draf |
| `10-tiga-tab-tanpa-jelajah-360.png` | 360 px | `uji_belum_memilih` | 3 tab merata tanpa celah (lebar tab 115 px), tanpa kartu Rekam Jejak/Jelajah/Jalur Saya, tombol kosong ke "Langkah Saya" |
| `11-tiga-tab-tanpa-jelajah-412.png` | 412 px | `uji_belum_memilih` | Keadaan 3 tab yang sama pada lebar 412 px (lebar tab 132 px) |

## Ringkasan pengukuran peramban

- **Galat konsol:** 0 pada seluruh 11 tangkapan layar.
- **Target sentuh di bawah 44×44 px:** 0 pada seluruh 11 tangkapan layar. Lebar × tinggi tiap tab: 86×80 px (4 tab di 360 px), 99×80 px (4 tab di 412 px), 115×80 px (3 tab di 360 px), 132×80 px (3 tab di 412 px).
- **Kata di area `<main>` Arah Saya (termasuk data siswa seperti nama dan judul langkah):**
  - Ada jalur + semua saklar menyala: 30 kata.
  - Jalur draf netral: 31 kata.
  - Belum memilih + keadaan kosong: 35 kata.
  - Belum tahu + keadaan kosong: 37 kata.
  - Build 3 tab (tanpa Discover/Portofolio/Jalur): 23 kata.
- **Layar v1 paling janggal bersanding dengan bilah v2:** `/linimasa` di tab **Jejak Waktu** (`07-tab-jejak-waktu-360.png`) karena masih memuat kepala gradasi Beranda v1, grid ikon, dan kartu pintu duplikat — akan dibereskan saat reskin task 032–035. Selain itu, aset `lanjut-wordmark.png` huruf "anjut"-nya berwarna putih sehingga tampak redup di atas bilah atas v2 yang putih.

## Yang belum terbukti di sini

- Belum dicoba di HP sungguhan (Android/iOS, Expo Go maupun APK).
- Belum diuji dengan pembaca layar (TalkBack / VoiceOver).
- Belum diuji dengan skala huruf sistem besar (150%–200%) dan setelan "Hapus animasi" di HP.
- Perilaku tombol kembali perangkat keras Android hanya diuji lewat tes unit fungsi murni `tujuanKembaliV2`, belum di perangkat Android sungguhan.
