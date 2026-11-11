# Audit teks kebijakan di aplikasi

**Task:** LANJUT_014 seri v2, Langkah 1, berpasangan dengan LANJUT_014b di repo induk.
**Dasar:** `lib/kebijakan-privasi.json` di commit `6752957`, `docs/kebijakan-privasi-DRAF.md` repo induk di commit `f2c0fe1`.
**Sifat:** catatan perbandingan teks. Semua teks kebijakan tetap berstatus DRAF sampai ditinjau ahli hukum.

## 1. Perbedaan JSON dan draf, per bagian

Dari 20 bagian, 12 sudah sama dan 8 berbeda. Tidak ada perbedaan yang sengaja dipertahankan. Teks yang tertinggal berasal dari LANJUT_012, yang memperbarui draf tanpa boleh menyentuh aplikasi.

| Bagian | Yang berbeda | Sifat | Tindakan |
|---|---|---|---|
| Data yang kami simpan di server | Butir Portofolio belum ada. Butir kartu masih memuat penanda "kapan dihapus permanen" | Ketinggalan, dan K27 | Butir Portofolio ditambah. Butir kartu memakai rumusan K27 |
| Yang tidak kami kumpulkan | JSON masih menyatakan foto tidak dikumpulkan | Ketinggalan | Diganti "Foto, kecuali foto yang kamu pilih atau ambil sendiri untuk Portofolio" |
| Untuk apa datanya dipakai | Dua butir Portofolio belum ada | Ketinggalan | Ditambah |
| Siapa yang bisa melihat datamu | Butir Portofolio belum ada | Ketinggalan | Ditambah |
| Persetujuan orang tua atau wali | Menyebut "Jalur Saya" | Ketinggalan | Menjadi "Data Akun" |
| Hak kamu dan orang tua atau walimu | Unduh data dan hapus akun belum ada. Menyebut "Jalur Saya". Daftar yang tidak bisa dihapus belum ada | Ketinggalan | Diselaraskan |
| Berapa lama data disimpan | Dua penanda masa simpan, dan paragraf cadangan belum ada | Ketinggalan, dan K27 | Memakai rumusan K27 dan paragraf cadangan |
| Perubahan kebijakan | Kalimat Portofolio menunggu versi berlaku belum ada | Ketinggalan | Ditambah |

Sama, tidak diubah: Tentang kebijakan ini; Data yang hanya ada di HP atau browsermu; lima bagian Fitur AI dan data yang disamarkan; Pertanyaan pelajaran; Apa yang disimpan dari obrolanmu; Keselamatan; Keamanan; Kontak.

## 2. Semua 21 penanda `[ISI]`

Nomor mengikuti Lampiran B draf sebelum LANJUT_014. Golongan (a) sudah diputuskan K27, jadi penandanya hilang. Golongan (b) menunggu angka dari Dokploy. Golongan (c) butuh informasi dari Khalifa. Golongan (b) dan (c) tetap kosong, 18 penanda.

| No | Bagian | Yang diminta | Golongan |
|---|---|---|---|
| 1 | Tentang kebijakan ini | Nama badan pengelola dan alamatnya | (c) |
| 2 | Data yang kami simpan di server | Berapa lama catatan teknis disimpan oleh server dan penyedianya | (b) |
| 3 | Data yang kami simpan di server | Kapan data yang dihapus benar-benar dihapus permanen | (a) |
| 4 | Untuk apa datanya dipakai | Tujuan lain, misalnya penelitian atau laporan ke sekolah. Bila tidak ada, butirnya dihapus | (c) |
| 5 | Siapa yang bisa melihat datamu | Siapa saja dan untuk keperluan apa | (c) |
| 6 | Siapa yang bisa melihat datamu | Nama penyedia dan lokasi servernya | (c) |
| 7 | Siapa yang bisa melihat datamu | Konfirmasi apakah ini akan berubah | (c) |
| 8 | Fitur AI: siapa penyedianya | Penyedia model yang benar-benar menerima data, dan lokasinya | (c) |
| 9 | Fitur AI: siapa penyedianya | Negara pemrosesan, dan dasar pengirimannya ke luar negeri | (c) |
| 10 | Pertanyaan pelajaran | Aturan untuk modul dari guru atau penerbit (hak cipta) | (c) |
| 11 | Pertanyaan pelajaran | Mesin pencari yang menerima pertanyaan, dan apakah permintaan agar data tidak dikumpulkan berlaku di sana | (c) |
| 12 | Apa yang disimpan dari obrolanmu | Apa yang disimpan OpenRouter dan penyedia model, dan berapa lama | (c) |
| 13 | Persetujuan orang tua atau wali | Apakah akun dasar tanpa AI juga butuh persetujuan | (c) |
| 14 | Hak kamu dan orang tua atau walimu | Cara meminta penghapusan di OpenRouter dan penyedia model | (c) |
| 15 | Hak kamu dan orang tua atau walimu | Berapa lama permintaan ditanggapi, dan cara memastikan pemintanya orang tua atau wali | (c) |
| 16 | Berapa lama data disimpan | Masa simpan data akun, data latihan, catatan persetujuan, dan catatan teknis | (a) |
| 17 | Berapa lama data disimpan | Masa simpan modul bila akunnya lama tidak dipakai | (a) |
| 18 | Keamanan | Perlindungan lain di server, misalnya HTTPS dan pencadangan | (b) |
| 19 | Perubahan kebijakan | Kapan persetujuan orang tua atau wali diminta ulang | (c) |
| 20 | Perubahan kebijakan | Cara memberi tahu pengguna dan orang tua atau wali | (c) |
| 21 | Kontak | Nama pengelola, alamat, email, nomor, dan petugas pelindungan data bila ada | (c) |

Penanda nomor 16 juga menanyakan masa simpan catatan teknis. Bagian itu tetap terwakili oleh penanda nomor 2.

## 3. Rumusan K27 terhadap kode

| Kalimat | Bukti |
|---|---|
| Akun disimpan sampai pemiliknya menghapus, tanpa hapus otomatis | Tidak ada tugas terjadwal yang menghapus akun |
| Hapus akun berlaku seketika, tanpa masa tenggang | `docs/audit-hapus-akun-ekspor.md` |
| Kartu dan butir yang dihapus tetap tersimpan sampai akunnya dihapus | `docs/audit-hapus-akun-ekspor.md` bagian 1: `kartu` dan `butir_pribadi` berantai dari `pengguna`, termasuk baris yang sudah dihapus lunak |
| Modul dihapus permanen | `docs/audit-hapus-akun-ekspor.md` bagian 1 |

## 4. Kalimat yang boleh ditambah angka

Rumusan K27 sengaja tanpa angka untuk cadangan dan log. Sesudah angka dari Dokploy diketahui, hanya dua tempat ini yang perlu ditambah:

- Bagian "Berapa lama data disimpan", kalimat "...sampai cadangan itu tergantikan".
- Bagian "Data yang kami simpan di server", penanda "berapa lama catatan teknis disimpan".

## 5. Kalimat foto

Tiga kalimat Portofolio mengubah teks yang sudah disetujui (T17), karena "Hanya kamu yang bisa melihat" terlalu mutlak. Usulannya ada di `docs/draf-teks-portofolio.md`, berstatus *draf, menunggu persetujuan Khalifa*.

Usulan awal memuat janji tentang cara kerja tim yang tidak bisa dibuktikan kode. Janji itu dihapus di LANJUT_017 (K29, bagian 7).

## 6. Batas dan hal yang tidak diubah

- `versi` kebijakan tetap 1, dan statusnya tetap DRAF. Siswa yang sudah menerima versi 1 tidak diminta menerima ulang, walaupun teksnya kini menyebut foto. Keputusan menaikkan versi perlu diambil sebelum kebijakan berlaku.
- Lampiran C draf butir 5 dan 8c sudah terjawab K27, tetapi tidak diubah karena di luar lingkup LANJUT_014b.
- Surat orang tua dan teks "Jalur Saya" di luar kebijakan adalah urusan LANJUT_015.
- `npm run periksa-gerbang-rilis` hanya memeriksa kebijakan dan teks dua fitur bersaklar. Teks lain yang berkomentar DRAF, misalnya `lib/ngobrol.ts`, sudah ada di APK 1.0.0 dan tidak diperiksa.
- Persetujuan teks Portofolio terikat pada `lib/portofolio.ts` dan dokumen drafnya. Kartu di `lib/beranda.ts` hanya terwakili lewat dokumen itu.

## 7. Keputusan K29: tempat yang diubah (LANJUT_017)

| Tempat | Perubahan |
|---|---|
| `lib/portofolio.ts` (`privasiFoto`) | Janji tentang perilaku tim dihapus |
| `docs/draf-teks-portofolio.md` (dua tempat) | Sama |
| `lib/kebijakan-privasi.json`, bagian "Siapa yang bisa melihat datamu" | "hanya terlihat olehmu" menjadi "hanya bisa dibuka lewat akunmu", ditambah kalimat akses teknis pengelola |
| Repo induk: `docs/kebijakan-privasi-DRAF.md`, `landing/src/data/kebijakan-privasi.json` | Sama |

`docs/audit-kebijakan-privasi.md` di repo induk masih mengutip kalimat lama sebagai catatan sejarah LANJUT_012, jadi tidak diubah.

Tes yang disesuaikan: `server/tests/periksa-gerbang-rilis.test.js` menambah pemeriksaan bahwa kedua kalimat lama tidak muncul.

## 8. Versi kebijakan: temuan (LANJUT_017)

**Hasil: versi tetap 1. Menaikkannya sekarang tidak aman untuk APK 1.0.0.**

Nomor versi ada di tiga tempat:

| Tempat | Letak | Peran |
|---|---|---|
| Teks di aplikasi | `lib/kebijakan-privasi.json` (`versi`), tertanam saat build | Versi yang dibaca siswa |
| Versi berlaku di server | `konfigurasi_levelin.persetujuan_versi_kebijakan` (`server/src/db/migrasi/012_persetujuan.sql`) | Versi yang diminta server |
| Catatan per siswa | `persetujuan.versi` | Versi yang pernah diterima |

Cara membandingkan:

- Saat daftar dan menerima, versi yang dikirim harus **sama persis** dengan versi berlaku. Bila tidak, server menjawab 409 `KEBIJAKAN_USANG` (`persetujuan.layanan.js`, `pastikanVersiBerlaku`).
- Untuk gerbang fitur, versi yang pernah diterima harus **sama atau lebih tinggi** dari versi berlaku (`kebijakanTerkini`).
- Di aplikasi, tombol Terima hanya muncul bila versi berlaku sama dengan versi teks di aplikasi. Selain itu tampil "belum ada di aplikasimu" (`lib/kebijakanPrivasi.ts`, `keadaanKebijakan`).

Bila server menetapkan versi 2:

| Pengguna | Yang dialami |
|---|---|
| APK 1.0.0, akun baru | **Tidak bisa mendaftar.** Aplikasi mengirim `versi_kebijakan: 1` (`RegisterScreen.tsx:109`, sudah ada di commit `cd0e652`, sebelum build 1.0.0), lalu ditolak 409. Dijaga `server/tests/persetujuan.test.js`, tes "versi usang → 409 dan akun TIDAK dibuat" |
| APK 1.0.0, akun lama | Tidak terkunci dari fitur dasar, tetapi **tidak bisa menerima versi baru**. Jendela hanya memberi "Nanti saja". Ngobrol tertutup, dan bidang minat, kesiapan ujian, serta Persiapan Event ditolak (`kebijakanDiterima`) |
| APK 1.0.0, teks versi lama diterima sebagai versi 2? | Tidak bisa terjadi, karena server menolak versi yang tidak sama |
| APK v2 berteks versi 2 | Diminta menerima ulang, tombol Terima muncul, dan fiturnya terbuka lagi |

Bila hanya JSON yang dinaikkan dan server tetap 1, build baru dan web tidak bisa mendaftar, karena mengirim 2 kepada server yang meminta 1.

Opsi:

1. **Naikkan bersamaan saat APK v2 menggantikan APK 1.0.0.** JSON, web, dan migrasi server berubah sekaligus. Tanpa perubahan kode, tetapi APK 1.0.0 yang masih dipakai terkena dampak di atas.
2. **Pisahkan versi terbaru dari versi minimum yang masih diterima.** Server menerima versi lama untuk sementara, lalu batasnya dinaikkan setelah APK 1.0.0 pensiun. Perlu perubahan kode server dan task sendiri.
3. **Tahan di versi 1 selama teks masih DRAF,** lalu naikkan sekali saat teks final, dengan opsi 1 atau 2.

## 9. Teks DRAF di luar gerbang (LANJUT_017)

`npm run periksa-gerbang-rilis` menghitung berkas ini sebagai peringatan, bukan kegagalan: **37 berkas, 102 tanda**, dan 15 berkas memuat klaim tentang data, keamanan akun, atau keselamatan. Tidak ada yang disetujui di task ini. Teks yang sudah tercatat di salinan menunggu keputusan lewat `docs/lembar-review-draf-teks.md` di repo induk.

Profil `pilot` dan `apk-sekolah` hanya berbeda pada Portofolio dan unduh data serta hapus akun. Sebagian layar hanya tampil untuk kelas tertentu.

| Berkas | Tanda | Layar | Pilot | Sekolah | Klaim data atau keselamatan |
|---|---|---|---|---|---|
| `api/auth.ts` | 6 | Pesan galat masuk dan daftar | Ya | Ya | Ya, keamanan akun |
| `app/masuk-google.tsx` | 2 | Masuk dengan Google | Bila Client ID diisi | Bila Client ID diisi | Tidak |
| `components/layout/AppShell.tsx` | 4 | Judul bilah halaman | Ya | Ya | Tidak |
| `components/screens/AkunScreen.tsx` | 5 | Data Akun | Ya | Ya | Ya, data akun dan status persetujuan |
| `components/screens/auth/MasukKodeEmail.tsx` | 2 | Masuk dengan kode email | Ya | Ya | Ya, keamanan akun |
| `components/screens/auth/RegisterScreen.tsx` | 4 | Daftar | Ya | Ya | **Ya, data pribadi dan persetujuan** |
| `components/screens/BuatSandiBaruScreen.tsx` | 2 | Buat kata sandi baru | Ya, akun yang diambil alih | Ya, akun yang diambil alih | Ya, keamanan akun |
| `components/screens/DaftarPeriksaScreen.tsx` | 1 | Daftar Periksa | Ya | Ya | Tidak |
| `components/screens/EksplorasiTujuanScreen.tsx` | 2 | Eksplorasi Tujuan | Ya | Ya | Tidak |
| `components/screens/IsiKelasScreen.tsx` | 4 | Gerbang isi kelas | Ya | Ya | Tidak |
| `components/screens/JenjangSayaScreen.tsx` | 2 | Jenjang Saya | Ya | Ya | Tidak |
| `components/screens/KhususKelas12.tsx` | 2 | Pengganti isi kelas 12 | Ya | Ya | Tidak |
| `components/screens/KonfirmasiOrtuWali.tsx` | 2 | Persetujuan orang tua atau wali | Ya, dari Ngobrol | Ya, dari Ngobrol | **Ya, data ke penyedia AI dan persetujuan** |
| `components/screens/LatihanScreen.tsx` | 1 | Latihan | Ya | Ya | Tidak |
| `components/screens/LinimasaScreen.tsx` | 1 | Linimasa | Ya | Ya | Tidak |
| `components/screens/ModulScreens.tsx` | 1 | Arsip Belajar, modul | Ya | Ya | Ya, data yang disimpan |
| `components/screens/NgobrolScreen.tsx` | 1 | Ngobrol | Ya | Ya | **Ya, data ke penyedia AI dan keselamatan** |
| `components/screens/TerimaKebijakan.tsx` | 2 | Terima kebijakan | Ya | Ya | Ya, kebijakan |
| `components/screens/VerifikasiEmail.tsx` | 2 | Verifikasi email | Ya | Ya | Ya, keamanan akun |
| `components/ui/index.tsx` | 1 | Galat muat, semua layar | Ya | Ya | Tidak |
| `hooks/usePersetujuan.ts` | 1 | Bukan teks layar, komentar kode | — | — | Tidak |
| `lib/beranda.ts` | 8 | Beranda | Ya | Ya, tanpa kartu Portofolio | Ya, kartu Portofolio (pilot saja) |
| `lib/eksplorasi.ts` | 1 | Eksplorasi Tujuan | Ya | Ya | Tidak |
| `lib/eksplorasiKampus.ts` | 4 | Eksplorasi Kampus | Ya | Ya | Ya, bidang minat yang disimpan |
| `lib/eventSekolah.ts` | 3 | Persiapan Event | Tidak selama `event_sekolah_aktif` mati | Tidak selama `event_sekolah_aktif` mati | Ya, peringatan data pribadi |
| `lib/jenjang.ts` | 1 | Pilihan jenjang | Ya | Ya | Tidak |
| `lib/jenjangSaya.ts` | 6 | Jenjang Saya | Ya | Ya | Tidak |
| `lib/kesiapanUjian.ts` | 2 | Profil Saya, kelas 12 | Ya | Ya | Tidak |
| `lib/latihan.ts` | 4 | Latihan | Ya | Ya | Tidak |
| `lib/levelin.ts` | 4 | Level-In | Ya | Ya | Tidak |
| `lib/linimasa.ts` | 1 | Linimasa | Ya | Ya | Tidak |
| `lib/mapelPilihan.ts` | 3 | Pilih Mapel dan Mapel Saya | Ya | Ya | Tidak |
| `lib/modul.ts` | 3 | Arsip Belajar, modul | Ya | Ya | Ya, data yang disimpan |
| `lib/navigasi.ts` | 1 | Label tab | Ya | Ya | Tidak |
| `lib/ngobrol.ts` | 10 | Ngobrol | Ya | Ya | **Ya, data ke penyedia AI dan keselamatan** |
| `lib/pembuka.ts` | 1 | Layar pembuka | Ya | Ya | Tidak |
| `lib/tautanNgobrol.ts` | 2 | Kartu tautan di Ngobrol | Ya | Ya | Tidak |
