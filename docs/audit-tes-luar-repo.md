# Audit tes yang membaca path di luar repo

**Task:** LANJUT_003 seri v2 (Bagian 1b rencana implementasi).
**Sifat:** perbaikan tes dan dokumen. Kode produksi, skema, dan data tidak berubah.

## 1. Ringkasan

Sebanyak 26 berkas tes di `server/tests/` membaca path di luar folder `LANJUT_App`. Laporan LANJUT_002 menyebut 19, karena hitungan itu hanya mencari path yang tertulis di berkas tes. Tujuh berkas lainnya membaca lewat kode server atau alat di `server/tools/`.

Perilaku lama saat semua folder luar hilang:

| Perilaku lama | Jumlah berkas | Berkas atau tes |
|---|---|---|
| Lolos diam-diam | 1 berkas, 1 tes | `keystore-rilis`: tetap lolos walau pemindaian repo induknya tidak lengkap |
| Dilewati, rangkaian tetap tidak gagal karenanya | 1 berkas, 3 tes | `levelin-keputusan`: tes kesetaraan aturan Level-In |
| Gagal, lalu menggantung selamanya | 1 berkas | `benih-verifikasi`: `after()` gagal sebelum koneksi DB ditutup, sehingga `npm test` tidak pernah selesai |
| Gagal, dan tes di dalamnya hilang dari hitungan | 7 berkas | `eksplorasi-kampus`, `lembar-review-teks`, `mapel-pilihan`, `persiapan-ujian` tidak bisa dimuat; satu blok tes di `beranda-hero-navigasi`, `grid-tab-075b`, dan `onboarding` tidak terdaftar |
| Gagal bersuara | 16 berkas | Sebagian besar berupa `ENOENT` tanpa petunjuk perbaikan |

Sekarang semua 110 tes yang bergantung pada path luar mengikuti satu aturan (bagian 3), dan jumlah tes tetap 957 di semua kondisi.

## 2. Inventaris

Kolom "Lama" berisi hasil tes lama saat semua folder luar hilang, dengan format lolos/gagal/dilewati. Angka gagal bisa berupa satu kegagalan untuk seluruh berkas. Kolom "Tes" berisi jumlah tes yang sekarang bergantung pada path luar.

| Berkas tes | Path luar | Untuk apa | Bila path hilang (lama) | Lama | Tes |
|---|---|---|---|---|---|
| `benih-rumpun` | `MVP-PWA/data/` lewat `DIR_DATA` | Data benih | Gagal bersuara | 0/4/0 | 4 |
| `benih-verifikasi` | `MVP-PWA/data/` lewat `DIR_DATA` | Benih ulang dan pemulihan isi | Gagal, lalu menggantung | 4/6/0 | 5 |
| `beranda-hero-navigasi` | `docs/salinan-teks-lanjut.md`, `docs/lembar-review-draf-teks.md` | Teks tercatat | Gagal bersuara; blok salinan tidak terdaftar | 24/1/0 | 3 |
| `beranda-urutan` | `docs/salinan-teks-lanjut.md` | Teks tercatat | Gagal bersuara | 11/1/0 | 1 |
| `eksplorasi-kampus` | `MVP-PWA/data/prodi.json`, `docs/salinan-teks-lanjut.md` | Pembanding rumpun, teks tercatat | Gagal, berkas tidak termuat | 0/1/0 | 6 |
| `event-sekolah-smp` | `docs/salinan-teks-lanjut.md`, `docs/verifikasi/panduan-materi-sumber-resmi.md` | Teks dan panduan tim konten | Gagal bersuara | 16/1/0 | 1 |
| `event-sekolah` | `docs/salinan-teks-lanjut.md` | Teks tercatat | Gagal bersuara | 32/1/0 | 1 |
| `grid-tab-075b` | `docs/salinan-teks-lanjut.md`, `docs/lembar-review-draf-teks.md` | Teks tercatat | Gagal bersuara; satu blok tidak terdaftar | 14/1/0 | 2 |
| `info-penting-tanggal` | `docs/salinan-teks-lanjut.md` | Teks tercatat | Gagal bersuara | 18/1/0 | 1 |
| `jenjang-saya` | `docs/salinan-teks-lanjut.md` | Teks tercatat | Gagal bersuara | 9/2/0 | 2 |
| `kebijakan-privasi` | `docs/` (kebijakan, surat, klaim, salinan, lembar), `MVP-PWA/*.html` | Kesamaan teks, pindai kalimat terlarang | Gagal bersuara | 3/6/0 | 6 |
| `keystore-rilis` | Seluruh folder repo induk | Pindai berkas keystore | **Lolos diam-diam** | 5/0/0 | 1 |
| `konten-banner` | `docs/salinan-teks-lanjut.md` | Teks tercatat | Gagal bersuara | 28/1/0 | 1 |
| `konten-eksplorasi-tujuan` | `MVP-PWA/data/` lewat `DIR_DATA`, `MVP-PWA/data/profil-prodi.json` | Data benih dan pembanding | Gagal bersuara | 0/20/0 | 20 |
| `landing` | `landing/src/data/kebijakan-privasi.json` lewat alat | Kesamaan data landing | Gagal bersuara | 0/2/0 | 2 |
| `latihan-berikutnya` | `docs/salinan-teks-lanjut.md` | Teks tercatat | Gagal bersuara | 10/1/0 | 1 |
| `lembar-review-teks` | `docs/salinan-teks-lanjut.md` lewat alat | Sumber lembar review | Gagal, berkas tidak termuat | 0/1/0 | 6 |
| `lembar-review` | `MVP-PWA/data/` lewat `DIR_DATA` | Sumber lembar review | Gagal bersuara | 0/6/0 | 6 |
| `levelin-keputusan` | `MVP-PWA/assets/levelin.js`, `MVP-PWA/data/levelin-konfig.json` | Kesetaraan logika PWA dan server | **Dilewati**, tanpa membuat rangkaian gagal | 7/0/3 | 3 |
| `mapel-pilihan` | `MVP-PWA/data/` (prodi, prodi-mapel, mapel), `docs/` (salinan, lembar) | Harapan pemetaan, teks tercatat | Gagal, berkas tidak termuat | 0/1/0 | 10 |
| `ngobrol-keselamatan` | `docs/salinan-teks-lanjut.md` | Teks keselamatan tercatat | Gagal bersuara | 16/1/0 | 1 |
| `onboarding` | `MVP-PWA/onboarding.html`, `docs/salinan-teks-lanjut.md` | Kesamaan isi dengan PWA | Gagal bersuara; satu blok tidak terdaftar | 18/0/0 | 3 |
| `perbaikan-080b` | `docs/salinan-teks-lanjut.md`, `docs/lembar-review-draf-teks.md` | Teks tercatat | Gagal bersuara | 7/1/0 | 1 |
| `persiapan-ujian` | `MVP-PWA/data/checklist.json`, `MVP-PWA/data/` lewat `DIR_DATA` | Pembanding dan benih | Gagal, berkas tidak termuat | 0/1/0 | 21 |
| `skenario-ai` | `docs/skenario-ai.md` lewat alat | Kesamaan dokumen skenario | Gagal bersuara | 80/1/0 | 1 |
| `verifikasi-konten` | `MVP-PWA/data/arsip.json` lewat `DIR_DATA` | Pembanding kartu kurasi | Gagal bersuara | 8/1/0 | 1 |
| **Total** | | | | 310/62/3 | **110** |

`DIR_DATA` adalah folder data konten yang dipakai benih. Bawaannya `MVP-PWA/data`, dan bisa diubah lewat `LOKASI_DATA_KONTEN`. `benih-lokasi.test.js` mengisi variabel itu dengan folder sementara miliknya sendiri, jadi tidak termasuk daftar.

**Cara mengukur.** Daftar berasal dari pencatat akses berkas yang dipasang saat seluruh tes berjalan, sehingga pembacaan lewat kode server dan proses anak ikut terhitung. Perilaku lama diukur dengan menjalankan tes yang belum diubah saat folder luar tidak ada.

## 3. Aturan baru

Aturannya ada di `server/tests/luar-repo.js`.

- Bila path luar tidak ada, tes **gagal** dengan pesan yang menyebut berkas tes, path yang dicari, dan cara memperbaikinya.
- Bila path luar tidak ada dan `LEWATI_TES_LUAR_REPO=1`, tes ditandai **dilewati**. Nilai selain `1` tidak berlaku.
- Bila path luar ada, tes selalu berjalan, walau saklarnya menyala.
- Akhir keluaran `npm test` menampilkan jumlah tes dilewati beserta alasannya, dan jumlah tes yang gagal karena path luar hilang (`server/tests/pelapor-ringkasan.js`).
- Tes baru yang menunjuk ke luar folder ini wajib memakai aturan yang sama. `luar-repo.test.js` memeriksanya.

Perubahan di luar berkas tes dan dokumen hanya satu: skrip `test` di `server/package.json` kini memakai pelapor ringkasan.

Tes `keystore-rilis` dipecah menjadi dua. Pemindaian repo induk mengikuti aturan di atas, dan pemindaian baru atas folder `LANJUT_App` selalu berjalan, supaya penjaga kebocoran keystore tetap aktif tanpa repo induk.

## 4. Bukti perusakan terkontrol

Semua uji memakai kode final dan basis data uji tersendiri yang dibuat ulang setiap kali jalan.

| Kondisi | Total | Lolos | Gagal | Dilewati | Kode keluar |
|---|---|---|---|---|---|
| Normal, semua folder ada | 957 | 957 | 0 | 0 | 0 |
| Semua folder luar hilang | 957 | 847 | 110 | 0 | 1 |
| Semua folder luar hilang, saklar menyala | 957 | 847 | 0 | 110 | 0 |
| Hanya `MVP-PWA` hilang | 957 | 879 | 78 | 0 | 1 |
| `MVP-PWA` hilang, `LOKASI_DATA_KONTEN=data-konten` | 957 | 913 | 44 | 0 | 1 |

Sebagai pembanding, tes lama saat semua folder hilang hanya melaporkan 867 tes, dan harus dihentikan paksa karena menggantung.

Seluruh 110 kegagalan membawa pesan baru. Pencatat akses berkas pada jalan "semua folder luar hilang" mencatat 168 akses ke path yang tidak ada, dan semuanya berasal dari pemeriksa di `luar-repo.js`. Artinya tidak ada badan tes yang berjalan tanpa path-nya.

**Cara uji.** Task meminta folder luar diganti namanya sementara. Windows menolak penggantian nama itu pada jalan-jalan terakhir karena foldernya dipegang proses lain. Uji final di atas memakai salinan kode di folder baru yang memang tidak berisi folder luar tersebut, jadi tidak ada folder yang perlu dikembalikan.

## 5. Keputusan untuk Khalifa: membawa data PWA ke repo

Tidak ada yang dibawa masuk di task ini. Temuan yang relevan: `server/data-konten/` sudah ada di repo, dan 10 berkas JSON di dalamnya identik dengan `MVP-PWA/data/`. Yang benar-benar hanya ada di `MVP-PWA` adalah `assets/levelin.js` dan berkas HTML.

| Opsi | Pro | Kontra |
|---|---|---|
| A. Biarkan, tes dijalankan dari repo induk | Tanpa kerja tambahan, tidak ada duplikat | `lanjut_app` tidak bisa diuji utuh sendirian; 110 tes gagal atau dilewati di sana |
| B. Arahkan tes data ke `server/data-konten`, tanpa menyalin apa pun | Datanya sudah di repo; terbukti 34 tes pulih hanya dengan `LOKASI_DATA_KONTEN`; 37 tes lain yang membaca `MVP-PWA/data` langsung diperkirakan ikut pulih bila diubah (belum diuji) | Perbandingan terhadap PWA berubah menjadi perbandingan terhadap salinan; 7 tes tetap butuh `MVP-PWA` |
| C. Salin `levelin.js` dan `onboarding.html` sebagai fixture beku | Tes kesetaraan bisa berjalan di repo ini | Pembandingnya tidak lagi mengikuti PWA asli, jadi kesetaraannya bisa basi tanpa terlihat |
| D. Bawa seluruh `MVP-PWA` | Semua tes PWA berjalan | Kode lama masuk repo aplikasi dan ada dua sumber yang harus dijaga |

**Rekomendasi: B.** Opsi ini memulihkan tes paling banyak tanpa menambah isi repo. Tes yang tersisa, terutama kesetaraan Level-In, sebaiknya tetap bergantung pada `MVP-PWA` sampai diputuskan apakah PWA masih menjadi acuan di Level-In v2.

Folder `docs/` di repo induk adalah soal terpisah: 32 tes hanya bergantung pada `docs/` atau `landing/`, dan isinya tidak ada salinannya di repo ini.

## 6. Catatan

- Beberapa tes dan alat membaca berkas di dalam aplikasi lewat `<repo induk>/LANJUT_App/...`. Bila repo ini dikloning dengan nama folder lain, misalnya `lanjut_app`, tes itu gagal dengan `ENOENT`. Ini gagal bersuara, dan alatnya termasuk kode di luar cakupan task ini.
- Basis data uji tetap harus dibenih lebih dulu. Di lingkungan tanpa `MVP-PWA`, `npm run benih` membutuhkan `LOKASI_DATA_KONTEN=data-konten`.
- Node mencatat lokasi tes berbungkus di `luar-repo.js`, sehingga baris `test at` pada keluaran bawaan menunjuk ke berkas itu. Pesan gagal dan ringkasan tetap menyebut berkas tes yang sebenarnya.
