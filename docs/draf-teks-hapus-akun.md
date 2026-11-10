# Draf teks unduh data dan hapus akun

**Status:** draf, menunggu persetujuan Khalifa. **Task:** LANJUT_009 seri v2.

Dokumen ini menggantikan sementara `docs/salinan-teks-lanjut.md` di repo induk, yang tidak boleh disunting di task ini. Setelah disetujui, teksnya dipindahkan ke sana.

Teks ini belum tampil ke siapa pun. Layarnya tertutup sampai build dibuat dengan `EXPO_PUBLIC_KELOLA_DATA_AKUN=1`. Sumber teksnya `lib/dataAkun.ts` dan `server/src/modul/auth/pengirimOtp.js`.

## Data Akun

| Tempat | Teks |
|---|---|
| Judul bagian | Data saya |
| Penjelasan | Salinan data akunmu dalam satu berkas. Kata sandi dan tanda masuk tidak ikut. |
| Tombol | Unduh data saya |
| Tombol, saat memuat | Menyiapkan data… |
| Setelah berhasil | Berkas datamu sudah disiapkan. |
| Tombol kedua | Hapus akun saya |

## Layar hapus akun

Judul di bilah atas: Hapus Akun. Judul layar memakai teks tombol "Hapus akun saya".

| Tempat | Teks |
|---|---|
| Pengantar | Akun dan datamu di server LANJUT akan dihapus permanen. Setelah dihapus, tidak bisa dibatalkan atau dipulihkan. |
| Judul daftar | Yang ikut terhapus |
| Butir | Akun dan profilmu. |
| Butir | Daftar Periksa dan kemajuanmu. |
| Butir | Kartu, modul, dan riwayat latihanmu. |
| Butir | Catatan persetujuan kebijakan privasi dan orang tua atau wali. |
| Butir | Semua catatan lain yang tersimpan di akunmu. |
| Judul daftar | Yang tidak bisa dihapus dari sini |
| Butir | Pesan Ngobrol yang pernah dikirim ke penyedia AI, dan email yang sudah terkirim, mengikuti kebijakan penyedia layanan itu. |
| Butir | Salinan cadangan server ikut hilang saat cadangan lama diganti. |
| Saran | Kalau ingin menyimpan salinannya, unduh datamu dulu di Data Akun. |
| Centang | Aku paham akun dan datanya akan dihapus permanen. |
| Label | Kata sandi |
| Petunjuk | Untuk memastikan ini benar-benar kamu. |
| Label | Kode dari email |
| Tautan ke kode | Masuk lewat Google atau lupa kata sandi? Pakai kode email |
| Tautan ke kata sandi | Pakai kata sandi |
| Tombol kode | Kirim kode ke email |
| Tombol kode, sesudah terkirim | Kirim ulang kode |
| Tombol kode, saat memuat | Mengirim… |
| Setelah kode terkirim | Kode sudah dikirim ke emailmu dan berlaku 5 menit. |
| Isian belum lengkap | Centang pernyataan dan isi konfirmasinya dulu. |
| Tombol utama | Hapus akun permanen |
| Tombol utama, saat memuat | Menghapus… |
| Tombol kembali | Batal |
| Di layar Masuk, sesudah dihapus | Akunmu sudah dihapus. |

## Pesan galat hapus akun

| Keadaan | Teks |
|---|---|
| Kata sandi salah | Kata sandi tidak cocok. Coba lagi. |
| Kode salah | Kode salah. Periksa lagi kode di email. |
| Kode tidak berlaku | Kode sudah tidak berlaku. Minta kode baru. |
| Terlalu banyak percobaan | Terlalu banyak percobaan. Coba lagi beberapa menit lagi. |
| Email kode belum tersedia | Pengiriman kode email belum tersedia. Pakai kata sandi. |
| Email belum terverifikasi | Akun ini belum punya email terverifikasi. Pakai kata sandi. |
| Tidak ada jaringan | Tidak bisa terhubung ke server. Akunmu belum dihapus. Coba lagi. |
| Galat lain | Akun belum bisa dihapus. Coba lagi nanti. |

## Pesan galat unduh

| Keadaan | Teks |
|---|---|
| Data melewati batas | Datamu terlalu besar untuk diunduh sekaligus. Hubungi tim LANJUT untuk memintanya. |
| Terlalu banyak percobaan | Terlalu banyak percobaan. Coba lagi beberapa menit lagi. |
| Tidak ada jaringan | Tidak bisa terhubung ke server. Coba lagi. |
| Terlalu besar untuk HP | Datamu terlalu besar untuk dibagikan dari HP. Buka LANJUT di peramban untuk mengunduhnya. |
| Galat lain | Data belum bisa diunduh. Coba lagi nanti. |

## Email kode hapus akun

| Bagian | Teks |
|---|---|
| Subjek | Kode untuk menghapus akun LANJUT |
| Pembuka | Ini kode untuk menghapus akun LANJUT kamu secara permanen: |
| Penutup | Kalau kamu tidak sedang menghapus akun, abaikan email ini. Tanpa kode ini, akunmu tidak terhapus. |

Bagian lain email sama dengan email kode yang sudah ada.
