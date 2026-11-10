# Audit rujukan `MVP-PWA`

**Task:** LANJUT_006 seri v2, tindak lanjut keputusan K16.
**Dasar:** commit `10736dc`. Nomor baris di bawah tetap berlaku sesudah perbaikan, karena perbaikan hanya mengganti teks di baris yang sama.

Sejak LANJUT_005, sumber data konten adalah `server/data-konten`, dan `MVP-PWA/data` adalah arsip beku yang tidak dibaca benih. Suntingan di arsip itu hilang diam-diam. Dokumen ini mencatat setiap penyebutan `MVP-PWA` di repo `lanjut_app`, dan mana yang perlu diubah.

## 1. Ringkasan

Ada 128 baris yang menyebut `MVP-PWA`, tersebar di 34 berkas.

| Kelompok | Arti | Jumlah baris | Keputusan |
|---|---|---|---|
| (a) | Menyuruh menyunting konten di `MVP-PWA/data`, atau menyebut folder itu sebagai sumber konten saat ini | 8 | Diubah ke `server/data-konten` |
| (b) | Rujukan sejarah atau penjelasan asal-usul | 106 | Dibiarkan |
| (c) | Pembanding pada tes kesetaraan atau pemindaian PWA | 14 | Dibiarkan |

Kelompok (a) sengaja mencakup kalimat yang bukan perintah langsung, seperti kepala lembar review dan catatan sumber. Kalimat itu juga mengarahkan pembaca ke folder yang salah, dan task menyebut sebagian di antaranya secara khusus. Dua komentar di `lib/` termasuk di sini dengan alasan yang sama. Perubahannya hanya pada komentar, jadi aplikasi tidak berubah.

## 2. Semua penyebutan

Tanda `|` dan tanda kutip terbalik di dalam kutipan diganti supaya tabel tetap terbaca. Dokumen ini sendiri tidak dihitung.

| Lokasi | Kutipan pendek | Kelompok | Keputusan |
|---|---|---|---|
| `lib/kesiapanUjian.ts:20` | `/** id kategori & butir di MVP-PWA/data/checklist.json. */` | (a) | Diubah ke `server/data-konten`. Menyebut folder lama sebagai sumber konten saat ini. |
| `lib/pilihMapel.ts:25` | `* MVP-PWA/data/prodi-mapel.json (sumber data benih) — bukan is…` | (a) | Diubah ke `server/data-konten`. Menyebut folder lama sebagai sumber konten saat ini. |
| `server/src/db/verifikasi/lembar-review.js:7` | `…lewat SELECT, berkas data konten (MVP-PWA/data),` | (a) | Diubah ke `server/data-konten`. Menyebut folder lama sebagai sumber konten saat ini. |
| `server/src/db/verifikasi/lembar-review.js:183` | `…gian yang salah, perbaiki dulu di 'MVP-PWA/data/profil-prodi.json' → 'npm run benih' → baru tan…` | (a) | Diubah ke `server/data-konten`. Perintah menyunting konten. |
| `server/src/db/verifikasi/lembar-review.js:488` | `…data \'${basisData}\' dan berkas \'MVP-PWA/data/\'. Lembar ini **hanya bacaan**: membuat atau m…` | (a) | Diubah ke `server/data-konten`. Menyebut folder lama sebagai sumber konten saat ini. |
| `server/src/db/verifikasi/lembar-review.js:496` | `…u diperbaiki: ubah berkas data di 'MVP-PWA/data/', jalankan 'npm run benih', lalu buat ulang le…` | (a) | Diubah ke `server/data-konten`. Perintah menyunting konten. |
| `server/tools/lembar-review-teks.js:789` | `…di_mapel bobot ≥ 2 dari data benih MVP-PWA/data/prodi*.json, 0 dari 19 prodi terverifikasi). Ve…` | (a) | Diubah ke `server/data-konten`. Menyebut folder lama sebagai sumber konten saat ini. |
| `server/tools/lembar-review-teks.js:809` | `// Data: MVP-PWA/data/checklist.json (kategori persiapan-ujian); teks…` | (a) | Diubah ke `server/data-konten`. Menyebut folder lama sebagai sumber konten saat ini. |
| `api/auth.ts:187` | `…alimat disalin dari PESAN_GALAT di MVP-PWA/assets/api.js supaya kedua` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `app/(app)/linimasa.tsx:5` | `// Tab "Beranda" (padanan MVP-PWA/beranda.html): linimasa F1 + pintu ke Cerita Alumni.` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `components/screens/AkunScreen.tsx:31` | `…sejak LANJUT_074) di atas padanan MVP-PWA/akun.html` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `components/screens/auth/AuthUI.tsx:22` | `// di MVP-PWA/masuk.html & daftar.html.` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `components/screens/auth/AuthUI.tsx:204` | `// Keping pilihan prodi (MVP-PWA/daftar.html) — dipakai Daftar & Data Akun.` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `components/screens/auth/AuthUI.tsx:293` | `…n '.input:focus' + --focus-ring di MVP-PWA/assets/app.css.` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `components/screens/auth/LoginScreen.tsx:14` | `// Salinan teks disamakan dengan MVP-PWA/masuk.html. Setelah sukses tidak ada` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `components/screens/auth/RegisterScreen.tsx:65` | `// Medan & salinan teks mengikuti MVP-PWA/daftar.html: nama pengguna, email` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `components/screens/CeritaAlumniScreen.tsx:11` | `…dengan tombol "Hubungkan kami" di MVP-PWA/alumni.html.` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `components/screens/CeritaAlumniScreen.tsx:16` | `* F4 — padanan MVP-PWA/alumni.html. Judul ada di page bar (AppShell).` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `components/screens/DaftarPeriksaScreen.tsx:24` | `* F5 — padanan MVP-PWA/checklist.html: bilah kemajuan bergradasi + tiga` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `components/screens/LinimasaScreen.tsx:67` | `* Tab Beranda — padanan MVP-PWA/beranda.html. Dari atas (LANJUT_074,` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `components/screens/PilihMapelScreen.tsx:46` | `* F3 — padanan MVP-PWA/pilih-mapel.html, tiga langkah:` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `components/ui/Ikon.tsx:6` | `…ersis dengan SVG inline di halaman MVP-PWA` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `components/ui/index.tsx:21` | `// Padanan komponen di MVP-PWA/assets/app.css — nama kelas CSS dicantumkan` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `docs/audit-penamaan-jalur.md:5` | `…mencari lokasinya di sini. Folder 'MVP-PWA', 'landing', dan 'diagrams' hanya ada di repo induk.…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:14` | `…n dan pembacanya / 222 / Kunci di 'MVP-PWA/data', 'server/data-konten', PWA arsip / Sengaja dip…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:25` | `…erkas JSON konten tidak diubah.** 'MVP-PWA/data' dibaca langsung oleh PWA arsip, dan 'server/da…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:201` | `/ 'MVP-PWA/data/cerita-alumni.json — jalur' / 2 /` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:202` | `/ 'MVP-PWA/data/checklist.json — berlaku_untuk_jalur' / 15 /` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:203` | `/ 'MVP-PWA/data/linimasa.json — jalur' / 6 /` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:204` | `/ 'MVP-PWA/data/profil-prodi.json — jalur' / 18 /` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:205` | `/ 'MVP-PWA/data/profil-prodi.json — jalur_masuk' / 58 /` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:225` | `/ 'MVP-PWA/alumni.html:83' / '<p><span class="lencana">Jalur <s…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:226` | `/ 'MVP-PWA/assets/app.js:273' / 'jalur: t.jalur,' /` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:227` | `/ 'MVP-PWA/assets/app.js:1005' / '/* Baris sumber, SATU slot be…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:228` | `/ 'MVP-PWA/assets/app.js:1010' / 'var jalurTahun = [prodi.pemin…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:229` | `/ 'MVP-PWA/assets/app.js:1013' / 'isiSlot(document, 'sumber-bar…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:230` | `/ 'MVP-PWA/assets/app.js:1062' / 'dipakai sebagai mini-prototip…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:231` | `/ 'MVP-PWA/assets/app.js:1078' / 'var jalurMasuk = Array.isArra…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:232` | `/ 'MVP-PWA/assets/app.js:1482' / 'isiSlot(el, 'jalur', c.jalur)…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:233` | `/ 'MVP-PWA/eksplorasi-tujuan.html:110' / 'supaya lolos check.js…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:234` | `/ 'MVP-PWA/eksplorasi-tujuan.html:112' / 'kepala berkas dan pem…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:594` | `/ 'MVP-PWA/alumni.html:115' / Arti umum (alur kode, alamat, ata…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:595` | `/ 'MVP-PWA/assets/api.js:30' / Arti umum (alur kode, alamat, at…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:596` | `/ 'MVP-PWA/assets/api.js:142' / Arti umum (alur kode, alamat, a…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:597` | `/ 'MVP-PWA/assets/api.js:154' / Alamat URL atau berkas / 'retur…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:598` | `/ 'MVP-PWA/assets/app.js:1079' / Arti umum (alur kode, alamat,…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:599` | `/ 'MVP-PWA/assets/levelin.js:896' / Arti umum (alur kode, alama…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:600` | `/ 'MVP-PWA/assets/levelin.js:897' / Arti umum (alur kode, alama…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:601` | `/ 'MVP-PWA/beranda.html:136' / Arti umum (alur kode, alamat, at…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:602` | `/ 'MVP-PWA/checklist.html:111' / Arti umum (alur kode, alamat,…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:603` | `/ 'MVP-PWA/checklist.html:114' / Arti umum (alur kode, alamat,…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:604` | `/ 'MVP-PWA/index.html:7' / Arti umum (alur kode, alamat, atau t…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:605` | `/ 'MVP-PWA/khusus-smk.html:110' / Arti umum (alur kode, alamat,…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:606` | `/ 'MVP-PWA/khusus-smk.html:140' / Arti umum (alur kode, alamat,…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:607` | `/ 'MVP-PWA/khusus-smk.html:148' / Arti umum (alur kode, alamat,…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:608` | `/ 'MVP-PWA/manifest.webmanifest:2' / Arti umum (alur kode, alam…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:609` | `/ 'MVP-PWA/pilih-mapel.html:72' / Arti umum (alur kode, alamat,…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:610` | `/ 'MVP-PWA/tools/test-app.js:40' / Arti umum (alur kode, alamat…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:611` | `/ 'MVP-PWA/tools/test-levelin.js:314' / Arti umum (alur kode, a…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:612` | `/ 'MVP-PWA/tools/test-levelin.js:501' / Arti umum (alur kode, a…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:628` | `/ 'MVP-PWA/data/checklist.json:2' / '"_catatan": "Entitas 'buti…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:629` | `/ 'MVP-PWA/data/checklist.json:119' / '"nama": "Jalur Pembiayaa…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:630` | `/ 'MVP-PWA/data/khusus-smk.json:20' / '"apa_yang_bisa_dilakukan…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:631` | `/ 'MVP-PWA/data/khusus-smk.json:33' / '"id": "jalur-vokasi",' /` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:632` | `/ 'MVP-PWA/data/khusus-smk.json:34' / '"judul": "Jalur vokasi P…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:633` | `/ 'MVP-PWA/data/khusus-smk.json:35' / '"apa_yang_beda": "Lulusa…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:634` | `/ 'MVP-PWA/data/linimasa.json:2' / '"_catatan": "Entitas 'tahap…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:635` | `/ 'MVP-PWA/data/linimasa.json:14' / '"judul": "Sosialisasi jalu…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:636` | `/ 'MVP-PWA/data/profil-prodi.json:396' / '"_catatan_data": "Pem…` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-penamaan-jalur.md:695` | `/ 'MVP-PWA/README.md' / 1 /` | (b) | Biarkan. Catatan audit LANJUT_001: temuan pada saat itu. |
| `docs/audit-tes-luar-repo.md:29` | `/ 'benih-rumpun' / 'MVP-PWA/data/' lewat 'DIR_DATA' / Data benih / Gagal bersuar…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:30` | `/ 'benih-verifikasi' / 'MVP-PWA/data/' lewat 'DIR_DATA' / Benih ulang dan pemulihan…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:33` | `/ 'eksplorasi-kampus' / 'MVP-PWA/data/prodi.json', 'docs/salinan-teks-lanjut.md' / Pe…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:39` | `…, surat, klaim, salinan, lembar), 'MVP-PWA/*.html' / Kesamaan teks, pindai kalimat terlarang /…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:42` | `/ 'konten-eksplorasi-tujuan' / 'MVP-PWA/data/' lewat 'DIR_DATA', 'MVP-PWA/data/profil-prodi.…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:46` | `/ 'lembar-review' / 'MVP-PWA/data/' lewat 'DIR_DATA' / Sumber lembar review / Gag…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:47` | `/ 'levelin-keputusan' / 'MVP-PWA/assets/levelin.js', 'MVP-PWA/data/levelin-konfig.jso…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:48` | `/ 'mapel-pilihan' / 'MVP-PWA/data/' (prodi, prodi-mapel, mapel), 'docs/' (salinan…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:50` | `/ 'onboarding' / 'MVP-PWA/onboarding.html', 'docs/salinan-teks-lanjut.md' / Ke…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:52` | `/ 'persiapan-ujian' / 'MVP-PWA/data/checklist.json', 'MVP-PWA/data/' lewat 'DIR_DAT…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:54` | `/ 'verifikasi-konten' / 'MVP-PWA/data/arsip.json' lewat 'DIR_DATA' / Pembanding kartu…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:57` | `…ten yang dipakai benih. Bawaannya 'MVP-PWA/data' saat LANJUT_003 dan 'server/data-konten' sejak…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:85` | `/ Hanya 'MVP-PWA' hilang / 957 / 879 / 78 / 0 / 1 /` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:86` | `/ 'MVP-PWA' hilang, 'LOKASI_DATA_KONTEN=data-konten' / 957 / 91…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:98` | `…s JSON di dalamnya identik dengan 'MVP-PWA/data/'. Yang benar-benar hanya ada di 'MVP-PWA' adal…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:103` | `…KONTEN'; 37 tes lain yang membaca 'MVP-PWA/data' langsung diperkirakan ikut pulih bila diubah (…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:105` | `/ D. Bawa seluruh 'MVP-PWA' / Semua tes PWA berjalan / Kode lama masuk repo apl…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:107` | `…, sebaiknya tetap bergantung pada 'MVP-PWA' sampai diputuskan apakah PWA masih menjadi acuan di…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:114` | `…run benih' tidak lagi membutuhkan 'MVP-PWA'.` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:119` | `…kini menjadi sumber data konten. 'MVP-PWA/data' adalah arsip beku. Tes yang membaca data konte…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:124` | `/ Hanya 'MVP-PWA' hilang / 948 / 941 / 7 / 0 / 1 / 879/78/0 /` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:130` | `…bali, tes itu kembali membutuhkan 'MVP-PWA/data', kecuali 'LOKASI_DATA_KONTEN=data-konten' diis…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:132` | `…*Tujuh tes yang tetap membutuhkan 'MVP-PWA':**` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:134` | `…as tes / Tes / Alasan tetap butuh 'MVP-PWA' /` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:140` | `…di atasnya, jadi ikut gagal bila 'MVP-PWA' hilang /` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/audit-tes-luar-repo.md:142` | `…ndai seluruh repo induk, termasuk 'MVP-PWA'. Pemindaian folder 'LANJUT_App' adalah tes terpisah…` | (b) | Biarkan. Catatan hasil LANJUT_003 dan LANJUT_005. |
| `docs/istilah-baku.md:13` | `…konten' (sumber data konten, K16; 'MVP-PWA/data' di repo induk adalah arsip bekunya) masih mema…` | (b) | Biarkan. Menjelaskan status arsip beku. |
| `docs/peta-modul-v2.md:215` | `…usan.test.js:21-24' / Tes membaca 'MVP-PWA' di luar repo, dan melewati diri bila folder itu tid…` | (b) | Biarkan. Catatan peta modul tentang tes pada saat itu. |
| `docs/peta-modul-v2.md:355` | `…as tes di 'server/tests/' membaca 'MVP-PWA', 'docs', atau folder lain di luar repo ini, jadi ra…` | (b) | Biarkan. Catatan peta modul tentang tes pada saat itu. |
| `lib/latihan.ts:14` | `* label PWA (MVP-PWA/latihan.html): 4 "Yakin", 2 "Ragu", 1 "Ragu banget".` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `lib/onboarding.ts:6` | `…nan-teks-lanjut.md §3, sama dengan MVP-PWA/onboarding.html ("sarannya" ditulis` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `README.md:3` | `…likasi ini adalah penerus PWA v1. 'MVP-PWA/' sekarang berstatus arsip dan menjadi acuan UI; apl…` | (b) | Biarkan. Acuan tampilan dari PWA, bukan data konten. |
| `README.md:18` | `- Tampilan disamakan dengan 'MVP-PWA/' (lihat bagian **Tampilan**).` | (b) | Biarkan. Acuan tampilan dari PWA, bukan data konten. |
| `README.md:79` | `Tampilan meniru 'MVP-PWA/' (port, bukan desain ulang):` | (b) | Biarkan. Acuan tampilan dari PWA, bukan data konten. |
| `README.md:81` | `…ayangan, dan gradasi disalin dari 'MVP-PWA/assets/tokens.css'. Komponen tidak menulis HEX atau…` | (b) | Biarkan. Acuan tampilan dari PWA, bukan data konten. |
| `README.md:108` | `Formulir Daftar mengikuti 'MVP-PWA/daftar.html': nama pengguna, email (boleh kosong), k…` | (b) | Biarkan. Acuan tampilan dari PWA, bukan data konten. |
| `README.md:129` | `…tokens.ts        token desain dari MVP-PWA` | (b) | Biarkan. Acuan tampilan dari PWA, bukan data konten. |
| `server/README.md:72` | `'npm run benih'. 'MVP-PWA/data/' di repo induk adalah arsip beku: jangan` | (b) | Biarkan. Catatan bahwa folder ini arsip beku. |
| `server/README.md:1112` | `PERSIS Lapisan 2 'MVP-PWA/assets/levelin.js' ('gapNumerik',` | (b) | Biarkan. Asal-usul logika Level-In, bukan data konten. |
| `server/src/db/benih/benih.js:43` | `…dak diubah, dan salinan bekunya di MVP-PWA/data masih dibaca` | (b) | Biarkan. Menjelaskan salinan beku yang dibaca PWA arsip. |
| `server/src/db/migrasi/008_profil_prodi.sql:1` | `…profil prodi (LANJUT_031). Sumber: MVP-PWA/data/profil-prodi.json.` | (b) | Biarkan. Asal-usul data, dan migrasi lama tidak boleh disunting. |
| `server/src/modul/levelin/keputusan.js:8` | `…n) adalah SALINAN PERSIS Lapisan 2 MVP-PWA/assets/levelin.js —` | (b) | Biarkan. Asal-usul logika Level-In, bukan data konten. |
| `server/src/modul/levelin/keputusan.js:55` | `SALINAN PERSIS Lapisan 2 MVP-PWA/assets/levelin.js (baris 155–385).` | (b) | Biarkan. Asal-usul logika Level-In, bukan data konten. |
| `theme/tokens.ts:3` | `…gan LANJUT_App. Nilai disalin dari MVP-PWA/assets/tokens.css (yang` | (b) | Biarkan. Komentar asal-usul tampilan atau teks. |
| `server/README.md:889` | `…ca folder di luar 'LANJUT_App'** ('MVP-PWA', 'docs', 'landing',` | (c) | Biarkan. Menjelaskan tes yang membaca folder luar. |
| `server/tests/kebijakan-privasi.test.js:23` | `const MVP_PWA = path.join(AKAR, 'MVP-PWA');` | (c) | Biarkan. Tes atau pembantu tes yang memang menunjuk ke PWA. |
| `server/tests/kebijakan-privasi.test.js:135` | `…...fs.readdirSync(path.join(AKAR, 'MVP-PWA')).filter((n) => n.endsWith('.html')).map((n) => pat…` | (c) | Biarkan. Tes atau pembantu tes yang memang menunjuk ke PWA. |
| `server/tests/keystore-rilis.test.js:130` | `…RepoInduk = tesLuarRepo(test, ...['MVP-PWA', 'docs', 'landing', 'diagrams', 'assets'].map((n) =…` | (c) | Biarkan. Tes atau pembantu tes yang memang menunjuk ke PWA. |
| `server/tests/levelin-keputusan.test.js:5` | `//    MVP-PWA/assets/levelin.js (dijalankan di vm dengan shim wind…` | (c) | Biarkan. Tes atau pembantu tes yang memang menunjuk ke PWA. |
| `server/tests/levelin-keputusan.test.js:6` | `//    MVP-PWA/tools/test-levelin.js).` | (c) | Biarkan. Tes atau pembantu tes yang memang menunjuk ke PWA. |
| `server/tests/levelin-keputusan.test.js:22` | `…join(__dirname, '..', '..', '..', 'MVP-PWA', 'assets', 'levelin.js');` | (c) | Biarkan. Tes atau pembantu tes yang memang menunjuk ke PWA. |
| `server/tests/levelin-keputusan.test.js:87` | `…a[nama]), '${nama} menyimpang dari MVP-PWA/assets/levelin.js');` | (c) | Biarkan. Tes atau pembantu tes yang memang menunjuk ke PWA. |
| `server/tests/luar-repo.js:62` | `…pat LANJUT_App berdampingan dengan MVP-PWA, docs, landing, diagrams, dan assets.',` | (c) | Biarkan. Tes atau pembantu tes yang memang menunjuk ke PWA. |
| `server/tests/luar-repo.test.js:125` | `…path\.join\(AKAR_APP, '\.\.'\)/, /'MVP-PWA'/];` | (c) | Biarkan. Tes atau pembantu tes yang memang menunjuk ke PWA. |
| `server/tests/luar-repo.test.js:136` | `…ten, tidak ada tes yang kembali ke MVP-PWA/data (K16)', () => {` | (c) | Biarkan. Tes atau pembantu tes yang memang menunjuk ke PWA. |
| `server/tests/luar-repo.test.js:137` | `const PENUNJUK_ARSIP = /MVP-PWA['"\s,/\\]+data/;` | (c) | Biarkan. Tes atau pembantu tes yang memang menunjuk ke PWA. |
| `server/tests/onboarding.test.js:8` | `const ONBOARDING_PWA = jalurInduk('MVP-PWA', 'onboarding.html');` | (c) | Biarkan. Tes atau pembantu tes yang memang menunjuk ke PWA. |
| `server/tests/onboarding.test.js:41` | `…oarding = salinan teks §3 (seperti MVP-PWA/onboarding.html)', () => {` | (c) | Biarkan. Tes atau pembantu tes yang memang menunjuk ke PWA. |

## 3. Catatan

- **Berkas hasil skrip ada di repo induk.** `docs/verifikasi/lembar-review-konten.md` dibuat oleh `npm run lembar-review`, dan `docs/lembar-review-draf-teks.md` dibuat oleh `npm run lembar-review-teks`. Keduanya berada di repo induk `lippbyte/lanjut-app`, jadi tidak ikut berubah di repo ini. Keduanya perlu diperbarui di repo induk setelah perubahan ini masuk `main`.
- **Selisih lembar.** Pada basis data dan sumber yang sama, kode lama dan kode baru hanya berbeda nama folder: lembar konten 88 butir sebelum dan sesudah (3 baris berubah), lembar teks 266 butir dari 43 blok sebelum dan sesudah (1 baris berubah). Berkas di repo induk sudah tertinggal sebelum task ini, jadi membangunnya ulang juga membawa butir yang bertambah sejak terakhir dibuat: lembar teks dari 241 menjadi 266 butir, lembar konten dari 84 menjadi 88 butir (diukur pada basis data uji).
- **Rujukan tanpa nama folder dibiarkan.** Beberapa komentar menulis `data/levelin-konfig.json` atau `data/mapel.json` tanpa menyebut `MVP-PWA`. Tulisan itu tidak menunjuk ke folder arsip, jadi tidak termasuk audit ini.
- **Cara mencari.** `git grep -n MVP-PWA 10736dc`, mencakup semua berkas yang dilacak git. Tidak ada nama berkas yang mengandung `MVP-PWA`, dan tidak ada penyebutan di `server/data-konten`.
