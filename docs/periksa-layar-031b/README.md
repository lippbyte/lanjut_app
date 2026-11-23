# Pemeriksaan layar LANJUT_031b — Mode Terang dan Gelap v2

> **Catatan:** semua tangkapan layar di folder ini diambil di peramban (Chrome headless) pada lebar **360 px** dan **412 px**, di **mode terang** dan **mode gelap**, memakai **akun dummy** pada database lokal `lanjut_dev` (`EXPO_PUBLIC_MODE_GELAP=1`, `EXPO_PUBLIC_ALUR_MASUK_V2=1`, `EXPO_PUBLIC_NAVIGASI_V2=1`, `EXPO_PUBLIC_DISCOVER=1`, `EXPO_PUBLIC_JALUR_TUJUAN=1`, `EXPO_PUBLIC_PORTOFOLIO=1`, `EXPO_PUBLIC_KELOLA_DATA_AKUN=1`).
> Semua gambar diberi stempel **"DEV"** di pojok kanan atas. Belum diuji di HP fisik, dengan pembaca layar (TalkBack/VoiceOver), atau skala huruf sistem besar.

## Daftar tangkapan layar (36 berkas: 9 layar × 2 mode × 2 lebar)

| Layar | Terang 360 / 412 | Gelap 360 / 412 | Akun & catatan |
|---|---|---|---|
| 1. Pengantar v2 | `01-pengantar-terang-{360,412}.png` | `01-pengantar-gelap-{360,412}.png` | Tanpa sesi; maskot besar + tombol sekunder transparan + tautan bergaris bawah |
| 2. Masuk v2 | `02-masuk-terang-{360,412}.png` | `02-masuk-gelap-{360,412}.png` | Tanpa sesi; isian + kotak centang Phosphor + tombol utama + tautan bergaris bawah |
| 3. Daftar v2 (langkah 1) | `03-daftar-langkah1-terang-{360,412}.png` | `03-daftar-langkah1-gelap-{360,412}.png` | Tanpa sesi; indikator langkah + isian berlabel |
| 4. Kecenderungan arah | `04-kecenderungan-terang-{360,412}.png` | `04-kecenderungan-gelap-{360,412}.png` | `uji_belum_memilih` + benih persetujuan dummy sementara |
| 5. Arah Saya — ada jalur + TabBar | `05-arah-saya-ada-jalur-terang-{360,412}.png` | `05-arah-saya-ada-jalur-gelap-{360,412}.png` | `demo_kelas12_dc`; chip `[DUMMY] Melanjutkan`, kartu Rekam Jejak, bilah tab Phosphor |
| 6. Arah Saya — belum memilih + maskot | `06-arah-saya-belum-memilih-terang-{360,412}.png` | `06-arah-saya-belum-memilih-gelap-{360,412}.png` | `uji_belum_memilih` (jalur draf); kartu "Pilih arahmu" + keadaan kosong bermaskot |
| 7. Arah Saya — Belum tahu | `07-arah-saya-belum-tahu-terang-{360,412}.png` | `07-arah-saya-belum-tahu-gelap-{360,412}.png` | `uji_belum_memilih` + tanda lokal `dijawab`; tautan "Ubah" bergaris bawah |
| 8. Tombol ganti mode (Akun & Privasi) | `08-mode-switcher-akun-terang-{360,412}.png` | `08-mode-switcher-akun-gelap-{360,412}.png` | `demo_kelas12_dc` di `/akun`; kartu "Tampilan" v2 (Ikuti sistem, Terang, Gelap) di atas layar v1 |
| 9. Layar v1 paling janggal (Jejak Waktu) | `09-v1-janggal-linimasa-terang-{360,412}.png` | `09-v1-janggal-linimasa-gelap-{360,412}.png` | `demo_kelas12_dc` di `/linimasa`; layar v1 terang di dalam kerangka v2 gelap |

## Temuan visual & verifikasi interaktif

- **Wordmark (`lanjut-wordmark.png`):** di mode gelap tampil sangat jelas langsung di atas `#0C1B33`. Di mode terang (`[PERLU DIKONFIRMASI]` badge `#78A4CB`), huruf putih `"anjut"` terlihat jelas, namun huruf `"L"` berwarna biru muda agak menyatu dengan warna badge `#78A4CB` — menunggu keputusan Khalifa (atau varian tinta gelap).
- **Maskot (`mascot-blue.png`):** dipakai apa adanya. Di Pengantar gelap (ukuran besar 96×96 px di atas `#16294A`) garis maskot terlihat cukup jelas; di keadaan kosong Arah Saya gelap (ukuran kecil 32×32 px di atas `#172B4D`) garis maskot terlihat agak redup/tipis dibanding mode terang.
- **Layar v1 paling janggal di mode gelap:** **Jejak Waktu (`/linimasa`)** paling kontras/janggal karena header biru muda dan badan putih penuh v1 langsung menempel di antara kartu `"Langkah Saya"` gelap dan bilah tab gelap (diterima di dev sampai reskin v1; layar v1 tidak diubah pada task ini).
- **Verifikasi interaktif peramban:**
  - Target sentuh 3 tombol radio mode tampilan: masing-masing `294 × 44 px` (`≥ 44 pt`), dengan `aria-selected` dan `aria-checked` sesuai pilihan aktif.
  - Ganti ke **Gelap**: `0` permintaan API jaringan, latar berubah seketika ke `#0C1B33`, tersimpan lokal di `lanjut.modeTampilan.v2`, dan tetap gelap setelah muat ulang halaman penuh.
  - Pilih **Ikuti sistem**: mengikuti perubahan `prefers-color-scheme` peramban dari `light` (`#FFFFFF`) ke `dark` (`#0C1B33`) secara langsung tanpa muat ulang.
