# Draf teks: alur masuk dan onboarding v2 (LANJUT_030)

> **Status: DRAF, belum disetujui Khalifa.** Teks ini hanya tampil bila build dibuat dengan `EXPO_PUBLIC_ALUR_MASUK_V2=1` (mati bawaan). `npm run periksa-gerbang-rilis` menahan build yang menyalakan saklar itu sampai teks ini disetujui lewat `docs/persetujuan-teks-rilis.json`. Belum ada yang ditandai disetujui.
> **Sumber di kode:** `lib/alurMasukV2.ts`. Tes `server/tests/alur-masuk-v2.test.js` memastikan setiap teks yang tampil ada di dokumen ini, dan tiap layar paling banyak 60 kata.
> **Nada:** `salinan-teks-lanjut.md` §0. Pendek, menenangkan, tanpa janji hasil, tanpa tekanan, tanpa "hanya kamu yang bisa melihat" (K29).

## Yang tidak dihitung dan tidak diubah

- **Teks kebijakan privasi** (`lib/kebijakan-privasi.json`): ringkasan 4 butir (137 kata) di layar Privasi dan teks lengkap di "Baca lengkap", **tampil apa adanya, sama dengan v1**. Karena tidak boleh diubah, ringkasan itu tidak diringkas lagi dan tidak masuk hitungan 60 kata. **Perlu keputusan:** ringkasan JSON cukup panjang untuk layar ponsel. Bila ingin lebih singkat, ringkasan baru harus ditulis dan disetujui seperti teks kebijakan lain.
- **Data dari server:** nama prodi, nama dan keterangan jalur. Jalur yang tampil hanya yang berstatus disetujui (K37). Saat ini ketiga jalur masih draf, jadi layar kecenderungan menampilkan "Pilihan jalur sedang disiapkan".
- **Teks v1 yang disalin persis** (ditandai "v1" di tabel): kalimat data pribadi (disetujui 28 Sep 2026), label centang kebijakan, petunjuk email, dan pilihan "Belum, aku belum tahu". Tes mencocokkannya dengan `RegisterScreen.tsx` dan `AuthUI.tsx`.

## Kalimat tentang kendali data

Kartu pengantar ketiga hanya menyebut hal yang benar menurut kode:
- email boleh kosong;
- kebijakan privasi bisa dibaca lengkap sebelum daftar;
- pilihan "Tetap masuk di HP ini".

Kalimat "Data bisa diunduh atau dihapus di Akun & Privasi." **hanya tampil bila** `EXPO_PUBLIC_KELOLA_DATA_AKUN=1` pada build yang sama.

## Teks per layar

Hitungan kata memakai langkah terpanjang ("Langkah 8 dari 8") dan termasuk label bawaan komponen Pilihan ("Pilih satu · Belum ada yang dipilih").

### Pengantar, kartu 1

Kata di layar: **25** dari batas 60.

| Teks | Sumber |
|---|---|
| Lewati | DRAF |
| Selamat datang di LANJUT | DRAF |
| Teman menyusun langkah sesudah lulus, sedikit demi sedikit, sesuai keadaanmu. | DRAF |
| Kartu 1 dari 3 | DRAF |
| Berikutnya | DRAF |
| Mulai | DRAF |
| Saya sudah punya akun | DRAF |

### Pengantar, kartu 2

Kata di layar: **26** dari batas 60.

| Teks | Sumber |
|---|---|
| Lewati | DRAF |
| Tiga jalur | DRAF |
| Melanjutkan, Bekerja, atau Wirausaha. Boleh lebih dari satu. Belum tahu juga tidak apa-apa. | DRAF |
| Kartu 2 dari 3 | DRAF |
| Berikutnya | DRAF |
| Mulai | DRAF |
| Saya sudah punya akun | DRAF |

### Pengantar, kartu 3

Kata di layar: **27 (dengan kalimat unduh/hapus data: 35)** dari batas 60.

| Teks | Sumber |
|---|---|
| Lewati | DRAF |
| Pilihanmu | DRAF |
| Email boleh kosong. Kebijakan privasi bisa dibaca lengkap. Tetap masuk di HP ini, kamu yang memilih. Data bisa diunduh atau dihapus di Akun & Privasi. | DRAF |
| Kartu 3 dari 3 | DRAF |
| Mulai | DRAF |
| Saya sudah punya akun | DRAF |

### Masuk (kata sandi)

Kata di layar: **32** dari batas 60.

| Teks | Sumber |
|---|---|
| Masuk | DRAF |
| Lanjutkan dengan akun yang sudah kamu buat. | DRAF |
| Nama pengguna | DRAF |
| Kata sandi | DRAF |
| Tetap masuk di HP ini | DRAF |
| Matikan bila HP ini dipakai bersama. | DRAF |
| Masuk | DRAF |
| Masuk dengan kode email | DRAF |
| Belum punya akun? Daftar | DRAF |

### Masuk dengan kode email: isi email

Kata di layar: **36** dari batas 60.

| Teks | Sumber |
|---|---|
| Masuk | DRAF |
| Kami kirim kode masuk ke email akunmu. | DRAF |
| Email | DRAF |
| Email yang tersimpan di akun LANJUT-mu. | DRAF |
| Tetap masuk di HP ini | DRAF |
| Matikan bila HP ini dipakai bersama. | DRAF |
| Kirim kode | DRAF |
| Masuk dengan kata sandi | DRAF |
| Belum punya akun? Daftar | DRAF |

### Masuk dengan kode email: isi kode

Kata di layar: **47** dari batas 60.

| Teks | Sumber |
|---|---|
| Masuk | DRAF |
| Kami kirim kode masuk ke email akunmu. | DRAF |
| Kalau nama@contoh.com terdaftar di LANJUT, kode masuk sudah kami kirim ke sana. Kode berlaku 5 menit. | DRAF |
| Kode masuk | DRAF |
| Tetap masuk di HP ini | DRAF |
| Matikan bila HP ini dipakai bersama. | DRAF |
| Masuk | DRAF |
| Kirim ulang kode | DRAF |
| Ganti email | DRAF |
| Belum punya akun? Daftar | DRAF |

### Daftar 1: pernyataan usia (LANJUT_041 — DRAF)

Kata di layar: **27** dari batas 40 (dan batas umum 60). Hanya gerbang di klien; tidak ada usia atau tanggal lahir yang disimpan atau dikirim ke server.

| Teks | Sumber |
|---|---|
| Langkah 10 dari 10 | DRAF |
| Umurmu sudah 18 tahun atau lebih? | DRAF |
| Jawaban ini tidak disimpan. | DRAF |
| Pilih satu · Belum ada yang dipilih | DRAF |
| Ya | DRAF |
| Belum | DRAF |
| Lanjut | DRAF |
| Sudah punya akun? Masuk | DRAF |

### Daftar 2: konfirmasi orang tua atau wali (LANJUT_041 — hanya bila menjawab "Belum" — DRAF)

Kata di layar: **33** dari batas 40 (dan batas umum 60; maksimal **38** kata bila pesan galat tampil). Tombol `Lanjut` nonaktif sampai kotak dicentang secara eksplisit. Tidak disimpan atau dikirim ke server.

| Teks | Sumber |
|---|---|
| Langkah 10 dari 10 | DRAF |
| Kembali | DRAF |
| Persetujuan orang tua atau wali | DRAF |
| Minta izin orang tua atau walimu dulu. | DRAF |
| Orang tua atau wali saya sudah tahu dan setuju saya memakai LANJUT. | DRAF |
| Lanjut | DRAF |
| Kembali ke Masuk | DRAF |

### Daftar 3: akun

Kata di layar: **33** dari batas 60.

| Teks | Sumber |
|---|---|
| Langkah 8 dari 8 | DRAF |
| Buat akun | DRAF |
| Pilih nama pengguna dan kata sandi. | DRAF |
| Nama pengguna | DRAF |
| 3–32 karakter: huruf kecil, angka, titik, atau garis bawah. | DRAF |
| Kata sandi | DRAF |
| Minimal 8 karakter. | DRAF |
| Lanjut | DRAF |
| Sudah punya akun? Masuk | DRAF |

### Daftar 2: email

Kata di layar: **25** dari batas 60.

| Teks | Sumber |
|---|---|
| Langkah 8 dari 8 | DRAF |
| Kembali | DRAF |
| Email | DRAF |
| Boleh dikosongkan. | DRAF |
| Email (boleh dikosongkan) | DRAF |
| Kalau diisi, kami kirim kode ke email itu untuk memastikan email itu milikmu. | v1, sudah dipakai (disalin persis) |
| Lanjut | DRAF |

### Daftar 3: privasi (persetujuan)

Kata di layar: **40** dari batas 60.

| Teks | Sumber |
|---|---|
| Langkah 8 dari 8 | DRAF |
| Kembali | DRAF |
| Privasimu | DRAF |
| Baca lengkap | DRAF |
| Kami menyimpan nama pengguna, nama tampilan, email (kalau kamu isi), kelas, prodi impian, dan centang Daftar Periksamu untuk menjalankan LANJUT, yaitu menampilkan jalur dan kemajuanmu. | v1, sudah dipakai (disalin persis) |
| Saya sudah membaca kebijakan privasi LANJUT. | v1, sudah dipakai (disalin persis) |
| Lanjut | DRAF |

### Daftar 4: jenjang

Kata di layar: **22** dari batas 60.

| Teks | Sumber |
|---|---|
| Langkah 8 dari 8 | DRAF |
| Kembali | DRAF |
| Kamu sekarang di jenjang apa? | DRAF |
| Pilih satu · Belum ada yang dipilih | DRAF |
| SMP | DRAF |
| SMA, SMK, atau MA | DRAF |
| Lanjut | DRAF |

### Daftar 5: kelas

Kata di layar: **20** dari batas 60.

| Teks | Sumber |
|---|---|
| Langkah 8 dari 8 | DRAF |
| Kembali | DRAF |
| Kelas berapa? | DRAF |
| Pilih satu · Belum ada yang dipilih | DRAF |
| Kelas 10 | DRAF |
| Kelas 11 | DRAF |
| Kelas 12 | DRAF |
| Lanjut | DRAF |

### Daftar 6: jenis sekolah (hanya kelas 10–12)

Kata di layar: **20** dari batas 60.

| Teks | Sumber |
|---|---|
| Langkah 8 dari 8 | DRAF |
| Kembali | DRAF |
| Sekolahmu yang mana? | DRAF |
| Pilih satu · Belum ada yang dipilih | DRAF |
| SMA | DRAF |
| SMK | DRAF |
| MA (Madrasah Aliyah) | DRAF |
| Lanjut | DRAF |

### Daftar 7: prodi impian

Kata di layar: **23** dari batas 60.

| Teks | Sumber |
|---|---|
| Langkah 8 dari 8 | DRAF |
| Kembali | DRAF |
| Sudah punya prodi impian? | DRAF |
| Boleh dijawab belum. | DRAF |
| Pilih satu · Belum ada yang dipilih | DRAF |
| Belum, aku belum tahu | v1, sudah dipakai (disalin persis) |
| Lanjut | DRAF |

### Daftar 8: siap membuat akun

Kata di layar: **33** dari batas 60.

| Teks | Sumber |
|---|---|
| Langkah 8 dari 8 | DRAF |
| Kembali | DRAF |
| Siap membuat akun | DRAF |
| Periksa lagi, lalu buat akun. | DRAF |
| Nama pengguna | DRAF |
| Email | DRAF |
| Kelas | DRAF |
| Sekolah | DRAF |
| Prodi impian | DRAF |
| Tetap masuk di HP ini | DRAF |
| Matikan bila HP ini dipakai bersama. | DRAF |
| Buat akun | DRAF |

### Daftar: kode dari email (hanya bila email diisi)

Kata di layar: **21** dari batas 60.

| Teks | Sumber |
|---|---|
| Masukkan kode | DRAF |
| Kami kirim kode ke nama@contoh.com. Kode berlaku 5 menit. | DRAF |
| Kode dari email | DRAF |
| Buat akun | DRAF |
| Kirim ulang kode | DRAF |
| Ubah data | DRAF |

### Kecenderungan arah

Kata di layar: **23** dari batas 60.

| Teks | Sumber |
|---|---|
| Ke mana setelah lulus? | DRAF |
| Boleh pilih lebih dari satu. | DRAF |
| Boleh pilih lebih dari satu · Belum ada yang dipilih | DRAF |
| Belum tahu | DRAF |
| Simpan dan lanjut | DRAF |

### Kecenderungan arah: belum ada jalur disetujui

Kata di layar: **9** dari batas 60.

| Teks | Sumber |
|---|---|
| Pilihan jalur sedang disiapkan | DRAF |
| Kamu bisa lanjut dulu. | DRAF |
| Lanjut | DRAF |

### Kecenderungan arah: gagal dimuat

Kata di layar: **18** dari batas 60.

| Teks | Sumber |
|---|---|
| Pilihan jalur belum bisa dimuat | DRAF |
| Kamu bisa lanjut dulu. Pertanyaan ini muncul lagi nanti. | DRAF |
| Coba lagi | DRAF |
| Lanjut dulu | DRAF |

## Pesan galat dan teks pendukung

| Teks | Kapan tampil | Sumber |
|---|---|---|
| Isi nama pengguna dan kata sandi dulu. | Masuk tanpa mengisi | v1 (LoginScreen) |
| Isi email dulu. | Kirim kode tanpa email | v1 (MasukKodeEmail) |
| Email belum benar. | Email ditolak server | v1 |
| Kode terdiri dari 6 angka. | Kode bukan 6 angka | v1 |
| Periksa lagi kodenya. | Kode ditolak server | v1 |
| 3–32 karakter, hanya huruf kecil, angka, titik, dan garis bawah. | Nama pengguna tidak sesuai | v1 (RegisterScreen) |
| Kata sandi minimal 8 karakter. | Sandi terlalu pendek | v1 |
| Pilih kelasmu. | Lanjut tanpa memilih kelas | v1 |
| Pilih jenis sekolahmu. | Lanjut tanpa memilih jenis sekolah | v1 |
| Pilih prodi, atau "Belum, aku belum tahu". | Lanjut tanpa memilih prodi | v1 |
| Centang kotak kebijakan privasi di atas dulu supaya bisa mendaftar. | Lanjut tanpa centang kebijakan | v1 |
| Kode baru sudah dikirim. Kode sebelumnya tidak berlaku lagi. | Sesudah kirim ulang kode daftar | v1 |
| Daftar dengan email belum bisa dipakai sekarang. Kosongkan email untuk daftar tanpa email. | Pengirim email mati | v1 |
| Pilih Ya atau Belum dulu. | Lanjut tanpa memilih usia (LANJUT_041) | DRAF |
| Centang kotak di atas dulu. | Lanjut tanpa mencentang konfirmasi orang tua/wali (LANJUT_041) | DRAF |
| Pilih jenjangmu. | Lanjut tanpa memilih jenjang | DRAF |
| Daftar prodi belum bisa dimuat. Kamu tetap bisa memilih belum. | Daftar prodi gagal dimuat | DRAF (diadaptasi dari v1) |
| Ada langkah yang belum diisi. | Buat akun saat ada langkah kosong | DRAF |
| Tanpa email | Ringkasan sebelum buat akun | DRAF |
| Pilihanmu belum tersimpan. Coba lagi. | Gagal menyimpan jalur | DRAF |
| Kebijakan Privasi / Tutup | Jendela "Baca lengkap" | DRAF |
| Kalau {email} terdaftar di LANJUT, kode masuk sudah kami kirim ke sana. Kode berlaku 5 menit. | Sesudah kirim kode masuk | v1 |
| Kami kirim kode ke {email}. Kode berlaku 5 menit. | Sesudah kirim kode daftar | DRAF (diringkas dari v1) |

## Yang perlu kamu periksa

1. **Ringkasan kebijakan 137 kata** di layar Privasi (lihat bagian atas). Teksnya belum diubah.
2. **"Teman menyusun langkah sesudah lulus"** (kartu 1): apakah cocok dengan posisi LANJUT, dan tidak terlalu menjanjikan.
3. **Tiga jalur di kartu 2** disebut namanya, padahal di aplikasi ketiganya masih draf (K37) dan belum bisa dipilih. Kartu ini hanya memperkenalkan; layar kecenderungan menampilkan "sedang disiapkan" sampai jalurnya disetujui.
4. **"Belum tahu" tidak dikirim ke server.** Di HP baru atau sesudah aplikasi dihapus, pertanyaan kecenderungan bisa muncul sekali lagi.
