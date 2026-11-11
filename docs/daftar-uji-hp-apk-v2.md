# Daftar uji APK v2

**Task:** LANJUT_013 seri v2. **Untuk:** Khalifa.
Ikuti dari atas ke bawah. Isi kolom **Hasil** dengan OK atau catatan. Bila ada yang gagal, berhenti dulu.

`<kontainer-api>` dan `<kontainer-db>` adalah nama kontainer di server. Lihat dengan `docker ps`.

## Profil build

| Profil | Saklar | Bentuk | Siapa yang boleh menerima berkasnya |
|---|---|---|---|
| `apk-sekolah` | Portofolio dan hapus akun **mati** | APK | Semua siswa, lewat halaman Unduh |
| `production` | **Mati** | App bundle | Toko aplikasi, bila kelak dipakai |
| `pilot` | Portofolio dan hapus akun **menyala** | APK, distribusi internal | **Hanya kelompok pilot.** Jangan diunggah ke halaman Unduh atau diteruskan ke grup sekolah |
| `preview` | **Mati** | APK | Tim, untuk uji |
| `development` | **Mati** | APK dev client | Pengembang |

Saklar bersifat global di tiap build, bukan per siswa. Karena itu pilot punya berkas APK sendiri.

Ketiga profil Android memakai nama paket yang sama. Memasang APK pilot **menggantikan** APK sekolah di HP itu, dan APK dengan `versionCode` lebih rendah tidak bisa dipasang di atasnya.

Versi: `2.0.0`, `versionCode` 3. Setiap build yang dibagikan perlu `versionCode` baru, jadi naikkan sebelum build kedua, misalnya APK sekolah sesudah APK pilot.

## 1. Sebelum build

| No | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| 1.1 | T1: daftar kelompok pilot dan ambang lolos | Disetujui dan tertulis | |
| 1.2 | T14: keputusan apakah pilot ikut membuka hapus akun. Bila tidak, hapus `EXPO_PUBLIC_KELOLA_DATA_AKUN` dari profil `pilot` | Diputuskan | |
| 1.3 | T15: draf kebijakan privasi (LANJUT_012) ditinjau pihak berwenang | Disetujui | |
| 1.4 | T17: cocokkan dengan rencana | Terpenuhi | |
| 1.5 | Teks kebijakan di aplikasi sudah selaras dengan draf (LANJUT_014 dan LANJUT_014b) | Sudah. Isian yang tersisa dipantau butir 1.13 | |
| 1.6 | Teks draf disetujui: `docs/draf-teks-portofolio.md`, `docs/draf-teks-hapus-akun.md` | Disetujui | |
| 1.7 | Keystore: APK v2 harus ditandatangani kunci yang sama dengan APK 1.0.0 (lihat `docs/rilis/lanjut-1.0.0.md`) | Kuncinya dipastikan. Kunci berbeda berarti HP harus menghapus aplikasi lama | |
| 1.8 | Catat migrasi di server sekarang: `docker exec <kontainer-db> sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE" -e "SELECT nama FROM _migrasi ORDER BY nama DESC LIMIT 5"'` | Nama migrasi terakhir tercatat, dibutuhkan untuk prosedur mundur | |
| 1.9 | Cadangkan database: `docker exec <kontainer-db> sh -c 'exec mysqldump --single-transaction --routines --triggers -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' > cadangan-sebelum-v2.sql` | Berkas terbentuk dan tidak kosong. `npm run cadangan-db` tidak bisa dipakai di kontainer API, karena `mysqldump` tidak terpasang di sana | |
| 1.10 | Deploy, lalu periksa volume seperti `docs/audit-portofolio-server.md` bagian 4: `docker volume ls \| grep lanjut_berkas` | Volume ada | |
| 1.11 | `docker exec <kontainer-api> sh -c 'touch /data/berkas/.uji && rm /data/berkas/.uji && echo BISA_DITULIS'` | Tercetak `BISA_DITULIS` | |
| 1.12 | Cadangkan volume foto sesudah ada isinya: `docker run --rm -v <nama-volume>:/data -v "$PWD":/cadangan alpine tar czf /cadangan/berkas.tgz -C /data .` | Berkas terbentuk. **Belum terbukti:** belum pernah dijalankan di Dokploy | |
| 1.13 | **Syarat sebelum `eas build`:** di folder `LANJUT_App`, jalankan `npm run periksa-gerbang-rilis` | Tercetak `LOLOS`. Bila `BELUM BOLEH BUILD`, bereskan daftar yang tercetak, lalu ulangi | |
| 1.14 | **Syarat sebelum situs terbit:** di folder `landing`, jalankan `npm run periksa-gerbang-landing` | Tercetak `LOLOS`. Bila `BELUM BOLEH TERBIT`, situs tidak boleh diunggah | |

### Pemeriksa gerbang rilis

`npm run periksa-gerbang-rilis` gagal bila:

- kebijakan di aplikasi masih memuat penanda `[ISI`;
- kebijakan masih menyatakan tidak mengumpulkan foto atau hapus akun belum ada, padahal fiturnya menyala di salah satu profil `eas.json`;
- teks bertanda draf dipakai profil yang menyalakan fiturnya, dan belum disetujui;
- kalimat foto yang sudah diganti (K29) muncul lagi, padahal Portofolio menyala.

Pemeriksa juga mencetak **peringatan** berisi jumlah teks lain yang masih berkomentar DRAF. Peringatan ini bukan kegagalan.

**Cara menyetujui teks:** baca teksnya, jalankan `npm run periksa-gerbang-rilis -- --sidik`, salin baris teks yang disetujui ke bagian `disetujui` di `docs/persetujuan-teks-rilis.json`, lalu isi tanggalnya. Persetujuan terikat pada isi teks, jadi gugur sendiri bila teksnya berubah.

### Pemeriksa gerbang landing

`npm run periksa-gerbang-landing` (folder `landing` di repo induk) gagal bila teks situs masih memuat `[ISI`, atau salinan kebijakan tidak sama dengan `lib/kebijakan-privasi.json`. Jalankan dari folder kerja yang memuat repo `LANJUT_App` terbaru, karena salinan `LANJUT_App` yang dilacak repo induk sudah lama. Di tempat build yang tidak punya repo aplikasi, pakai `npm run periksa-gerbang-landing -- --hanya-isian`.

## 2. Uji APK 1.0.0 terhadap server baru

**Hasil penyelidikan:** alamat server APK 1.0.0 tertanam saat build (`https://lanjut.smkn4bdg.sch.id/api/v1`, di `docs/rilis/lanjut-1.0.0.md`), dan HTTP polos diblokir. APK itu tidak bisa diarahkan ke lingkungan uji. Jalan teraman: deploy dengan cadangan segar, uji cepat, dan siapkan jalan mundur.

Yang sudah terbukti sebelum deploy hanya tes `server/tests/kompatibel-apk-lama.test.js`, yaitu nama medan lama masih dilayani. **Belum terbukti:** APK 1.0.0 sungguhan melawan server baru.

| No | Langkah, di HP dengan APK 1.0.0 dan akun uji | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| 2.1 | Masuk | Berhasil | |
| 2.2 | Buka Jalur Saya dengan jalur SNBP | Tahap tampil tanpa galat | |
| 2.3 | Ganti ke jalur SNBT | Tahap tampil | |
| 2.4 | Ganti ke jalur Mandiri | Tahap tampil | |
| 2.5 | Buka Daftar Periksa, centang satu butir, tutup, buka lagi | Centang tersimpan | |
| 2.6 | Buka Level-In | Tampil tanpa galat | |

APK 1.0.0 tetap memakai nama "Jalur Saya". Itu benar, karena teksnya tertanam di APK lama.

### Prosedur mundur

Pakai bila uji di atas gagal. Pilih yang paling ringan.

| Cara | Langkah | Akibat | Status |
|---|---|---|---|
| **A. Kembalikan gambar lama, skema dibiarkan** | Di Dokploy, deploy ulang commit sebelumnya | Tidak ada data hilang. Migrasi `030`–`032` hanya menambah, dan pelari migrasi lama mengabaikan baris yang berkasnya tidak ia punya | Terbukti dari kode dan uji lokal. **Belum terbukti** di Dokploy. Hanya aman bila 1.8 menunjukkan `029` sudah ada sebelum deploy |
| **B. Turunkan migrasi** | **Sebelum** mengembalikan gambar lama, di kontainer API dan berurutan: `npm run migrasi-turun -- 032_berkas_tertunda_hapus.sql`, lalu `031_kode_hapus_akun.sql`, lalu `030_model_data_v2.sql`. Sesudah itu baru cara A | `030` menghapus semua butir dan data foto. Jalankan `npm run bersihkan-berkas` lebih dulu. Hanya migrasi terakhir yang bisa diturunkan | Terbukti lokal, termasuk penolakan urutan yang salah. **Belum terbukti** di Dokploy |
| **C. Pulihkan cadangan** | Hentikan API. `docker exec <kontainer-db> sh -c 'mysql -uroot -p"$MYSQL_ROOT_PASSWORD" -e "DROP DATABASE \`$MYSQL_DATABASE\`; CREATE DATABASE \`$MYSQL_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"'`, lalu `docker exec -i <kontainer-db> sh -c 'exec mysql -uroot -p"$MYSQL_ROOT_PASSWORD" "$MYSQL_DATABASE"' < cadangan-sebelum-v2.sql`. Sesudah itu cara A | Semua data sesudah cadangan hilang. Akun yang dihapus sesudah cadangan kembali, dan harus dihapus lagi. Belum ada alat yang mencatat akun itu | Terbukti lokal. **Belum terbukti** di Dokploy |

**Jangan memulihkan tanpa membuang database dulu.** Uji lokal menunjukkan tabel `030`–`032` beserta isinya tertinggal, karena tidak ada di berkas cadangan.

Foto: bila volume perlu dipulihkan, `docker run --rm -v <nama-volume>:/data -v "$PWD":/cadangan alpine sh -c 'rm -rf /data/* && tar xzf /cadangan/berkas.tgz -C /data'`. **Belum terbukti.**

## 3. Uji APK v2 di HP sungguhan (profil `pilot`)

Butuh `PORTOFOLIO_AKTIF=1` di server (bagian 4). Pakai akun uji.

| No | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| 3.1 | Pasang di atas APK 1.0.0 | Terpasang tanpa menghapus aplikasi lama. Sesi masih masuk | |
| 3.2 | Buka Beranda dan menu | Tertulis "Profil Saya", tidak ada "Jalur Saya" | |
| 3.3 | Ketuk kartu Portofolio, Tambah catatan, isi judul, Simpan | Tersimpan dengan 3 ketukan | |
| 3.4 | Tambah foto dari galeri, foto HEIC asli dari iPhone | Terunggah dan tampil tidak miring. Bila tidak ada iPhone, pakai HP Android yang menyimpan HEIC | |
| 3.5 | Ambil foto dengan kamera, izinkan | Terunggah | |
| 3.6 | Cabut izin kamera di Pengaturan, Ambil foto, tolak | Pesan jalan keluar dan tombol Buka Pengaturan tampil | |
| 3.7 | Ketuk Buka Pengaturan, izinkan, kembali, Ambil foto | Kamera terbuka | |
| 3.8 | Pilih foto sangat besar, lebih dari 5 MB | Diperkecil lalu terunggah. Bila tetap di atas 5 MB, tampil pesan memilih foto lain | |
| 3.9 | Tambah sampai 3 foto di satu catatan | Tombol tambah hilang, pesan batas tampil | |
| 3.10 | Isi sampai 30 foto di satu akun | Pesan batas akun tampil. Boleh dibantu tim dengan mengisi data uji | |
| 3.11 | Nyalakan mode pesawat, tambah foto, matikan mode pesawat, Coba lagi | Gagal dengan pesan jelas, lalu berhasil tanpa memilih ulang | |
| 3.12 | Unduh data saya, kirim ke Email atau Drive, buka berkasnya | Berkas JSON utuh dan tidak kosong | |
| 3.13 | Isi layar Unduh | Menjelaskan isi foto tidak ikut | |
| 3.14 | Keluar akun, lihat ukuran cache aplikasi di Pengaturan HP | Tidak ada foto atau berkas salinan tersisa. Periksa folder `cache/ImagePicker`, `cache/ImageManipulator`, dan `cache/EksporData` bila HP bisa membukanya | |
| 3.15 | Masuk akun kedua, buka Portofolio | Tidak melihat apa pun milik akun pertama | |
| 3.16 | Hapus akun uji dengan kata sandi | Keluar, muncul "Akunmu sudah dihapus.", tidak bisa masuk lagi | |
| 3.17 | Bila ada akun Google uji: hapus akun dengan kode email | Sama dengan 3.16 | |
| 3.18 | Sesudah 3.16, cek `docker exec <kontainer-api> npm run bersihkan-berkas -- --cek` | `Tertunda: 0` | |
| 3.19 | Lihat daftar izin aplikasi di Pengaturan HP | Kamera, dan penyimpanan sampai Android 12. Tidak ada mikrofon | |

## 4. Setelah deploy

| No | Langkah | Hasil yang diharapkan | Hasil |
|---|---|---|---|
| 4.1 | `curl -i https://<domain>/api/v1/butir-bukti` selagi `PORTOFOLIO_AKTIF` mati | `404` | |
| 4.2 | Sesudah bagian 1–3 dan gerbang di bagian 5 terpenuhi: isi `PORTOFOLIO_AKTIF=1` di tab Environment Dokploy, deploy ulang | Server menyala. Bila tidak, cari `[server] DIREKTORI_BERKAS` di log | |
| 4.3 | Ulangi 4.1 | `401`, artinya rutenya ada | |
| 4.4 | Unggah foto uji, deploy ulang, buka lagi | Foto masih ada | |
| 4.5 | Pantau: `docker exec <kontainer-api> npm run metrik-portofolio -- --hari=14 --kecualikan=<id akun uji>` | Jumlah siswa dengan butir bermakna | |
| 4.6 | Pantau: `docker exec <kontainer-api> npm run bersihkan-berkas -- --cek` | Hanya melaporkan | |

**Perhatikan `--` pada 4.6.** Tanpa itu, `npm` menelan `--cek`, dan alatnya benar-benar menjalankan penghapusan berkas tertunda.

`PORTOFOLIO_AKTIF=1` berlaku untuk seluruh server. APK sekolah tidak punya layarnya, jadi siswa lain tidak melihat perubahan.

## 5. Gerbang jalan atau tidak

APK pilot baru boleh dibagikan bila **semua** ini terpenuhi.

| Syarat | Terpenuhi? |
|---|---|
| Bagian 1 selesai, termasuk `npm run periksa-gerbang-rilis` yang lolos (1.13) | |
| Bagian 2 lolos | |
| Bagian 3 lolos, terutama 3.4, 3.12, 3.14, dan 3.15 | |
| Bagian 4 sampai 4.4 lolos | |
| Cadangan database dan volume foto sudah ada | |
| Surat orang tua atau wali sudah diperbarui (masih menyatakan tidak mengumpulkan foto) | |

**Penerima APK pilot** (diisi Khalifa dari T1):

| Nama atau kode siswa | Sudah menerima kebijakan? | Tanggal dibagikan |
|---|---|---|
| | | |

Keputusan: **Jalan / Tidak**. Tanggal: __________. Oleh: __________
