# Audit kerentanan npm

**Task:** LANJUT_013 seri v2.
**Sifat:** hanya baca, hasil `npm audit` per 11 November 2026 di branch LANJUT_013. **Tidak ada perbaikan yang diterapkan.**

| Bagian | Kritis | Tinggi | Sedang | Rendah | Total |
|---|---|---|---|---|---|
| Aplikasi | 1 | 7 | 7 | 1 | 16 |
| Server | 1 | 3 | 1 | 0 | 5 |

"Ikut ke produksi" berarti kodenya berjalan di APK, web, atau server tayang. `npm audit` menghitung semua dependensi `expo` sebagai produksi, walau sebagian hanya alat build.

## Server

Bagian ini yang paling penting, karena berjalan di internet.

| Paket | Tingkat | Masalah | Ikut produksi? | Jalur rentan dipakai? | Perbaikan | Rekomendasi |
|---|---|---|---|---|---|---|
| `body-parser` 1.20.8 (lewat `express`) | Tinggi | Penolakan layanan lewat data sisa sesudah badan permintaan terkompresi (GHSA-27r3-jxmh-p828) | Ya | **Ya.** `express.json` dan `urlencoded` menerima badan terkompresi secara bawaan, dan bisa dijangkau tanpa login | 1.20.9, masih di rentang `express` | **Perbaiki lebih dulu** |
| `proxy-addr` 2.0.7 (lewat `express`) | Kritis | Pemalsuan IP lewat subnet tepercaya IPv4-mapped IPv6 (GHSA-jqcg-44mw-7w3h) | Ya | Tidak, selama `TRUST_PROXY` berupa angka. Bawaan `docker-compose.yml` adalah `1`, dan produksi menolak nilai `true`. Bila diisi nama atau subnet, jalurnya terpakai | 2.0.8, masih di rentang `express` | Perbaiki bersama `body-parser` |
| `multer` 2.4.0 (langsung) | Tinggi | Penolakan layanan saat `fileFilter` asinkron masih berjalan (GHSA-q7qp-rjg7-q26m) | Ya | Tidak. Tidak ada `fileFilter` di `server/src` | 2.5.0, masih di rentang `^2.4.0` | Perbaiki bersama, risiko kecil |
| `zod` 3.25.76 (langsung) | Tinggi | Kehabisan memori saat memvalidasi koleksi besar yang dibatasi (GHSA-mrhx-c7xc-m3w5) | Ya | Terbatas. `z.array(...).max(200)` ada di `levelin.skema.js`, tetapi badan permintaan dibatasi 1 MB | Hanya zod 4, perubahan besar | Tunda, jadikan task tersendiri |

Satu temuan sedang di server: `qs`.

## Aplikasi

| Paket | Tingkat | Masalah | Ikut produksi? | Jalur rentan dipakai? | Perbaikan | Rekomendasi |
|---|---|---|---|---|---|---|
| `decode-uri-component` 0.2.2, lewat `query-string` 7.1.3 dan `expo-router` | Tinggi | Penolakan layanan lewat masukan persen yang rusak (GHSA-vcc3-ghjq-m6fr, GHSA-qr28-fpjm-wq7f) | **Ya**, ikut di APK dan web | Ya, saat mengurai alamat dan tautan dalam. Dampaknya hanya aplikasi di HP korban tersendat bila membuka tautan buatan. Tidak ada data yang terbuka | Hanya `expo-router` 58, artinya pindah ke Expo SDK 58 | Terima dulu, tangani saat naik SDK |
| `shell-quote` 1.10.0, lewat `react-devtools-core` | Kritis | Injeksi perintah pada `quote()` (GHSA-pqg4-j6r4-53mv) | Tidak. `react-devtools-core` hanya dimuat saat `__DEV__` | Tidak di APK atau web. Hanya alat pengembang | Ada di rentang kecil | Terima. Jangan dijalankan pada masukan tak tepercaya |
| `node-forge` 1.4.0, lewat `@expo/cli` | Tinggi | 23 temuan terkait sertifikat, TLS, dan tanda tangan | Tidak, hanya alat build | Tidak. Dipakai untuk code signing `expo-updates`, dan aplikasi tidak memakainya | Ada | Terima |
| `source-map-js` 1.2.1, lewat `postcss` dan `@expo/metro-config` | Tinggi | Penolakan layanan lewat source map (GHSA-68fv-2mgg-jv7q) | Tidak, hanya alat build | Tidak. Hanya memproses berkas proyek sendiri | Ada | Terima |
| `zod` 3.25.76, lewat `@expo/cli` | Tinggi | Sama dengan di server | Tidak, hanya alat build | Tidak. Kode aplikasi tidak mengimpor `zod` | Hanya zod 4 | Terima |
| `@expo/cli` | Tinggi | Mewarisi temuan `glob` dan `zod` | Tidak, hanya alat build | Tidak | Mengikuti versi Expo | Terima |
| `expo-router` dan `query-string` | Tinggi | Mewarisi temuan `decode-uri-component` | Ya | Lihat baris pertama | Expo SDK 58 | Terima dulu |

Sedang dan rendah: `@expo/config`, `@expo/fingerprint`, `@expo/metro-config`, `@expo/prebuild-config`, `expo`, `glob`, `minimatch`, `deepmerge`. Semuanya alat build.

## Rekomendasi

1. **Server:** perbarui `body-parser`, `proxy-addr`, dan `multer` dalam satu task kecil, tanpa `npm audit fix`, lalu jalankan seluruh tes. Sebaiknya sebelum pilot, karena `body-parser` bisa dijangkau dari internet tanpa login.
2. **Aplikasi:** tidak ada tindakan sebelum build v2. Satu-satunya temuan yang ikut ke HP butuh naik ke Expo SDK 58.
3. **Tetap jangan** menjalankan `npm audit fix` di folder aplikasi, karena akan menarik SDK 58 dan merusak aplikasi.
