# Audit tes yang membaca path di luar repo

**Task:** LANJUT_003 seri v2 (Bagian 1b rencana implementasi).
**Sifat:** perbaikan tes dan dokumen. Kode produksi, skema, dan data tidak berubah.
**Diperbarui:** LANJUT_005 seri v2 (keputusan K16). Keadaan terbaru ada di bagian 7. Bagian 1, 2, dan 4 tetap mencatat hasil LANJUT_003, kecuali kolom "Setelah LANJUT_005".

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

Sekarang semua 110 tes yang bergantung pada path luar mengikuti satu aturan (bagian 3), dan jumlah tes tetap 957 di semua kondisi. Setelah LANJUT_005, tes yang masih bergantung pada path luar tinggal 39 (bagian 7).

## 2. Inventaris

Kolom "Lama" berisi hasil tes lama saat semua folder luar hilang, dengan format lolos/gagal/dilewati. Angka gagal bisa berupa satu kegagalan untuk seluruh berkas. Kolom "Tes" berisi jumlah tes yang bergantung pada path luar saat LANJUT_003. Kolom "Setelah LANJUT_005" berisi jumlah tes yang masih bergantung dan path-nya; "Mandiri" berarti seluruh tes di berkas itu berjalan tanpa folder luar.

| Berkas tes | Path luar | Untuk apa | Bila path hilang (lama) | Lama | Tes | Setelah LANJUT_005 |
|---|---|---|---|---|---|---|
| `benih-rumpun` | `MVP-PWA/data/` lewat `DIR_DATA` | Data benih | Gagal bersuara | 0/4/0 | 4 | Mandiri |
| `benih-verifikasi` | `MVP-PWA/data/` lewat `DIR_DATA` | Benih ulang dan pemulihan isi | Gagal, lalu menggantung | 4/6/0 | 5 | Mandiri |
| `beranda-hero-navigasi` | `docs/salinan-teks-lanjut.md`, `docs/lembar-review-draf-teks.md` | Teks tercatat | Gagal bersuara; blok salinan tidak terdaftar | 24/1/0 | 3 | 3, `docs/` |
| `beranda-urutan` | `docs/salinan-teks-lanjut.md` | Teks tercatat | Gagal bersuara | 11/1/0 | 1 | 1, `docs/` |
| `eksplorasi-kampus` | `MVP-PWA/data/prodi.json`, `docs/salinan-teks-lanjut.md` | Pembanding rumpun, teks tercatat | Gagal, berkas tidak termuat | 0/1/0 | 6 | 1, `docs/` (5 tes mandiri) |
| `event-sekolah-smp` | `docs/salinan-teks-lanjut.md`, `docs/verifikasi/panduan-materi-sumber-resmi.md` | Teks dan panduan tim konten | Gagal bersuara | 16/1/0 | 1 | 1, `docs/` |
| `event-sekolah` | `docs/salinan-teks-lanjut.md` | Teks tercatat | Gagal bersuara | 32/1/0 | 1 | 1, `docs/` |
| `grid-tab-075b` | `docs/salinan-teks-lanjut.md`, `docs/lembar-review-draf-teks.md` | Teks tercatat | Gagal bersuara; satu blok tidak terdaftar | 14/1/0 | 2 | 2, `docs/` |
| `info-penting-tanggal` | `docs/salinan-teks-lanjut.md` | Teks tercatat | Gagal bersuara | 18/1/0 | 1 | 1, `docs/` |
| `jenjang-saya` | `docs/salinan-teks-lanjut.md` | Teks tercatat | Gagal bersuara | 9/2/0 | 2 | 2, `docs/` |
| `kebijakan-privasi` | `docs/` (kebijakan, surat, klaim, salinan, lembar), `MVP-PWA/*.html` | Kesamaan teks, pindai kalimat terlarang | Gagal bersuara | 3/6/0 | 6 | 6: 5 `docs/`, 1 `docs/` dan `MVP-PWA` |
| `keystore-rilis` | Seluruh folder repo induk | Pindai berkas keystore | **Lolos diam-diam** | 5/0/0 | 1 | 1, seluruh repo induk |
| `konten-banner` | `docs/salinan-teks-lanjut.md` | Teks tercatat | Gagal bersuara | 28/1/0 | 1 | 1, `docs/` |
| `konten-eksplorasi-tujuan` | `MVP-PWA/data/` lewat `DIR_DATA`, `MVP-PWA/data/profil-prodi.json` | Data benih dan pembanding | Gagal bersuara | 0/20/0 | 20 | Mandiri |
| `landing` | `landing/src/data/kebijakan-privasi.json` lewat alat | Kesamaan data landing | Gagal bersuara | 0/2/0 | 2 | 2, `landing/` |
| `latihan-berikutnya` | `docs/salinan-teks-lanjut.md` | Teks tercatat | Gagal bersuara | 10/1/0 | 1 | 1, `docs/` |
| `lembar-review-teks` | `docs/salinan-teks-lanjut.md` lewat alat | Sumber lembar review | Gagal, berkas tidak termuat | 0/1/0 | 6 | 6, `docs/` |
| `lembar-review` | `MVP-PWA/data/` lewat `DIR_DATA` | Sumber lembar review | Gagal bersuara | 0/6/0 | 6 | Mandiri |
| `levelin-keputusan` | `MVP-PWA/assets/levelin.js`, `MVP-PWA/data/levelin-konfig.json` | Kesetaraan logika PWA dan server | **Dilewati**, tanpa membuat rangkaian gagal | 7/0/3 | 3 | 2, `MVP-PWA/assets/levelin.js` (1 tes mandiri) |
| `mapel-pilihan` | `MVP-PWA/data/` (prodi, prodi-mapel, mapel), `docs/` (salinan, lembar) | Harapan pemetaan, teks tercatat | Gagal, berkas tidak termuat | 0/1/0 | 10 | 2, `docs/` (8 tes mandiri) |
| `ngobrol-keselamatan` | `docs/salinan-teks-lanjut.md` | Teks keselamatan tercatat | Gagal bersuara | 16/1/0 | 1 | 1, `docs/` |
| `onboarding` | `MVP-PWA/onboarding.html`, `docs/salinan-teks-lanjut.md` | Kesamaan isi dengan PWA | Gagal bersuara; satu blok tidak terdaftar | 18/0/0 | 3 | 3, `MVP-PWA/onboarding.html` dan `docs/` |
| `perbaikan-080b` | `docs/salinan-teks-lanjut.md`, `docs/lembar-review-draf-teks.md` | Teks tercatat | Gagal bersuara | 7/1/0 | 1 | 1, `docs/` |
| `persiapan-ujian` | `MVP-PWA/data/checklist.json`, `MVP-PWA/data/` lewat `DIR_DATA` | Pembanding dan benih | Gagal, berkas tidak termuat | 0/1/0 | 21 | Mandiri |
| `skenario-ai` | `docs/skenario-ai.md` lewat alat | Kesamaan dokumen skenario | Gagal bersuara | 80/1/0 | 1 | 1, `docs/` |
| `verifikasi-konten` | `MVP-PWA/data/arsip.json` lewat `DIR_DATA` | Pembanding kartu kurasi | Gagal bersuara | 8/1/0 | 1 | Mandiri |
| **Total** | | | | 310/62/3 | **110** | **39** |

`DIR_DATA` adalah folder data konten yang dipakai benih. Bawaannya `MVP-PWA/data` saat LANJUT_003 dan `server/data-konten` sejak LANJUT_005, dan bisa diubah lewat `LOKASI_DATA_KONTEN`. `benih-lokasi.test.js` mengisi variabel itu dengan folder sementara miliknya sendiri, jadi tidak termasuk daftar.

**Cara mengukur.** Daftar berasal dari pencatat akses berkas yang dipasang saat seluruh tes berjalan, sehingga pembacaan lewat kode server dan proses anak ikut terhitung. Perilaku lama diukur dengan menjalankan tes yang belum diubah saat folder luar tidak ada.

## 3. Aturan baru

Aturannya ada di `server/tests/luar-repo.js`.

- Bila path luar tidak ada, tes **gagal** dengan pesan yang menyebut berkas tes, path yang dicari, dan cara memperbaikinya.
- Bila path luar tidak ada dan `LEWATI_TES_LUAR_REPO=1`, tes ditandai **dilewati**. Nilai selain `1` tidak berlaku.
- Bila path luar ada, tes selalu berjalan, walau saklarnya menyala.
- Akhir keluaran `npm test` menampilkan jumlah tes dilewati beserta alasannya, dan jumlah tes yang gagal karena path luar hilang (`server/tests/pelapor-ringkasan.js`).
- Tes baru yang menunjuk ke luar folder ini wajib memakai aturan yang sama. `luar-repo.test.js` memeriksanya.
- Path di dalam `LANJUT_App`, seperti `server/data-konten`, juga membuat tes gagal bersuara bila hilang. Saklar tidak berlaku untuknya, jadi tes itu tidak pernah dilewati (ditambahkan di LANJUT_005).

Perubahan di luar berkas tes dan dokumen hanya satu: skrip `test` di `server/package.json` kini memakai pelapor ringkasan.

Tes `keystore-rilis` dipecah menjadi dua. Pemindaian repo induk mengikuti aturan di atas, dan pemindaian baru atas folder `LANJUT_App` selalu berjalan, supaya penjaga kebocoran keystore tetap aktif tanpa repo induk.

## 4. Bukti perusakan terkontrol

Semua uji memakai kode final dan basis data uji tersendiri yang dibuat ulang setiap kali jalan.

| Kondisi | Total | Lolos | Gagal | Dilewati | Kode keluar |
|---|---|---|---|---|---|---|
| Normal, semua folder ada | 957 | 957 | 0 | 0 | 0 |
| Semua folder luar hilang | 957 | 847 | 110 | 0 | 1 |
| Semua folder luar hilang, saklar menyala | 957 | 847 | 0 | 110 | 0 |
| Hanya `MVP-PWA` hilang | 957 | 879 | 78 | 0 | 1 |
| `MVP-PWA` hilang, `LOKASI_DATA_KONTEN=data-konten` | 957 | 913 | 44 | 0 | 1 |

Sebagai pembanding, tes lama saat semua folder hilang hanya melaporkan 867 tes, dan harus dihentikan paksa karena menggantung.

Seluruh 110 kegagalan membawa pesan baru. Pencatat akses berkas pada jalan "semua folder luar hilang" mencatat 168 akses ke path yang tidak ada, dan semuanya berasal dari pemeriksa di `luar-repo.js`. Artinya tidak ada badan tes yang berjalan tanpa path-nya.

**Cara uji.** Task meminta folder luar diganti namanya sementara. Windows menolak penggantian nama itu pada jalan-jalan terakhir karena foldernya dipegang proses lain. Uji final di atas memakai salinan kode di folder baru yang memang tidak berisi folder luar tersebut, jadi tidak ada folder yang perlu dikembalikan.

## 5. Keputusan untuk Khalifa: membawa data PWA ke repo

**Sudah diputuskan: opsi B (K16), dikerjakan di LANJUT_005.** Tabel di bawah dipertahankan sebagai catatan.

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
- Basis data uji tetap harus dibenih lebih dulu. Sejak LANJUT_005, `npm run benih` tidak lagi membutuhkan `MVP-PWA`.
- Node mencatat lokasi tes berbungkus di `luar-repo.js`, sehingga baris `test at` pada keluaran bawaan menunjuk ke berkas itu. Pesan gagal dan ringkasan tetap menyebut berkas tes yang sebenarnya.

## 7. Keadaan setelah LANJUT_005 (keputusan K16)

`server/data-konten` kini menjadi sumber data konten. `MVP-PWA/data` adalah arsip beku. Tes yang membaca data konten, langsung maupun lewat `DIR_DATA`, tidak lagi memerlukan repo induk, dan tidak ada berkas data yang disalin.

| Kondisi | Total | Lolos | Gagal | Dilewati | Kode keluar | LANJUT_003 (lolos/gagal/dilewati dari 957) |
|---|---|---|---|---|---|---|
| Normal, semua folder ada | 948 | 948 | 0 | 0 | 0 | 957/0/0 |
| Hanya `MVP-PWA` hilang | 948 | 941 | 7 | 0 | 1 | 879/78/0 |
| Semua folder luar hilang | 948 | 909 | 39 | 0 | 1 | 847/110/0 |
| Semua folder luar hilang, saklar menyala | 948 | 909 | 0 | 39 | 0 | 847/0/110 |

Total berubah dari 957 menjadi 948 karena LANJUT_004 menghapus 13 tes endpoint klaim, dan LANJUT_005 menambah 4 tes. Dibandingkan `main` sebelum task ini (944 tes), tidak ada nama tes yang hilang.

Sebanyak 71 tes pulih, sama dengan perkiraan: 57 lewat `DIR_DATA` dan 14 yang membaca berkas datanya langsung. Berkas-berkasnya ada di kolom "Setelah LANJUT_005" pada bagian 2. Ke-57 tes itu mengikuti bawaan benih. Bila commit bawaan benih ditarik kembali, tes itu kembali membutuhkan `MVP-PWA/data`, kecuali `LOKASI_DATA_KONTEN=data-konten` diisi. Angka 57 ini dihitung dari kode, dan keadaan setelah penarikan tidak dijalankan.

**Tujuh tes yang tetap membutuhkan `MVP-PWA`:**

| Berkas tes | Tes | Alasan tetap butuh `MVP-PWA` |
|---|---|---|
| `levelin-keputusan` | teks badan kelima fungsi Lapisan 2 identik dengan PWA | Membandingkan kode server dengan `assets/levelin.js`, yang hanya ada di PWA |
| `levelin-keputusan` | keluaran sama dengan PWA pada ratusan masukan acak | Menjalankan `assets/levelin.js` sebagai pembanding |
| `onboarding` | empat layar cerita, urutan sama dengan PWA | Membandingkan dengan `onboarding.html` |
| `onboarding` | setiap teks persis ada di PWA dan di salinan teks | Membandingkan dengan `onboarding.html` |
| `onboarding` | setiap layar punya isi atau butir; label tombol sesuai salinan | Tidak membaca `onboarding.html` dan hanya butuh salinan teks di `docs/`, tetapi dibungkus aturan yang sama dengan dua tes di atasnya, jadi ikut gagal bila `MVP-PWA` hilang |
| `kebijakan-privasi` | kalimat "tidak dikirim ke mana pun" tidak ada di kebijakan, surat, salinan, maupun teks app | Memindai semua berkas `*.html` di PWA, selain dokumen di `docs/` |
| `keystore-rilis` | tidak ada keystore di repo | Memindai seluruh repo induk, termasuk `MVP-PWA`. Pemindaian folder `LANJUT_App` adalah tes terpisah yang selalu berjalan |

Sisanya, 32 tes, hanya bergantung pada `docs/` atau `landing/` di repo induk, dan tidak termasuk cakupan K16.

**Cara uji.** Sama dengan bagian 4: salinan kode di folder baru tanpa folder luar, dengan basis data uji yang dibuat ulang dan dibenih setiap kali jalan.
