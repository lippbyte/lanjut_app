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

Frasa "tidak membukanya tanpa keperluan" adalah janji tentang cara kerja tim. Kode tidak bisa membuktikannya.

## 6. Batas dan hal yang tidak diubah

- `versi` kebijakan tetap 1, dan statusnya tetap DRAF. Siswa yang sudah menerima versi 1 tidak diminta menerima ulang, walaupun teksnya kini menyebut foto. Keputusan menaikkan versi perlu diambil sebelum kebijakan berlaku.
- Lampiran C draf butir 5 dan 8c sudah terjawab K27, tetapi tidak diubah karena di luar lingkup LANJUT_014b.
- Surat orang tua dan teks "Jalur Saya" di luar kebijakan adalah urusan LANJUT_015.
- `npm run periksa-gerbang-rilis` hanya memeriksa kebijakan dan teks dua fitur bersaklar. Teks lain yang berkomentar DRAF, misalnya `lib/ngobrol.ts`, sudah ada di APK 1.0.0 dan tidak diperiksa.
- Persetujuan teks Portofolio terikat pada `lib/portofolio.ts` dan dokumen drafnya. Kartu di `lib/beranda.ts` hanya terwakili lewat dokumen itu.
