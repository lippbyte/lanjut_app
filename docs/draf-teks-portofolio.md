# Draf teks Portofolio

**Status:** draf, menunggu persetujuan Khalifa. **Task:** LANJUT_011 seri v2.

Dokumen ini menggantikan sementara `docs/salinan-teks-lanjut.md` di repo induk, yang tidak boleh disunting di task ini. Setelah disetujui, teksnya dipindahkan ke sana.

Teks ini belum tampil ke siapa pun. Layarnya tidak ada di aplikasi sampai build dibuat dengan `EXPO_PUBLIC_PORTOFOLIO=1`. Sumber teksnya `lib/portofolio.ts`, `lib/beranda.ts`, `components/layout/AppShell.tsx`, dan `app.config.ts`.

Layar memakai kata "catatan" untuk satu butir bukti, karena "butir" dan "bukti" terdengar teknis bagi siswa. Ini pilihan agen, bisa diganti.

## Usulan perubahan LANJUT_014

**Draf, menunggu persetujuan Khalifa.** Tiga kalimat di bawah mengubah teks yang sudah disetujui (T17), karena "Hanya kamu yang bisa melihat" terlalu mutlak: tim pengelola server secara teknis bisa mengakses penyimpanan.

| Tempat | Sebelum | Usulan |
|---|---|---|
| Kartu di Beranda | Catat karya dan prosesmu. Hanya kamu yang bisa melihatnya. | Catat karya dan prosesmu. Hanya bisa dibuka lewat akunmu. |
| Pengantar daftar | Catatan karyamu. Hanya kamu yang bisa melihatnya. | Catatan karyamu. Hanya bisa dibuka lewat akunmu. |
| Peringatan privasi foto | Hanya kamu yang bisa melihat foto ini. | Foto ini hanya bisa dibuka lewat akunmu di aplikasi, dan siswa lain tidak bisa melihatnya. Pengelola layanan secara teknis bisa mengakses tempat penyimpanannya, dan tidak membukanya tanpa keperluan. |

## Kartu di Beranda

| Tempat | Teks |
|---|---|
| Judul kartu | Portofolio |
| Keterangan | Catat karya dan prosesmu. Hanya bisa dibuka lewat akunmu. |

## Judul di bilah atas

| Layar | Teks |
|---|---|
| Daftar | Portofolio |
| Tulis atau ubah | Tulis Catatan |
| Detail | Catatan |

## Daftar

| Tempat | Teks |
|---|---|
| Judul | Portofolio |
| Pengantar | Catatan karyamu. Hanya bisa dibuka lewat akunmu. |
| Tombol | Tambah catatan |
| Kosong, judul | Belum ada catatan. |
| Kosong, ajakan | Mulai dari satu hal yang baru kamu buat. |

## Formulir

| Tempat | Teks |
|---|---|
| Label | Judul |
| Label | Jenis |
| Pilihan jenis | Karya |
| Pilihan jenis | Proses |
| Pilihan jenis | Refleksi |
| Label | Cerita singkat |
| Label | Tautan |
| Label | Tanggal karya |
| Tambahan label | (boleh kosong) |
| Petunjuk tautan | Diawali http:// atau https:// |
| Petunjuk tanggal | Tulis seperti ini: 2026-11-30 |
| Tombol | Simpan |
| Tombol, saat menyimpan | Menyimpan… |

## Galat formulir

| Keadaan | Teks |
|---|---|
| Judul kosong | Judulnya belum diisi. |
| Judul terlalu panjang | Judul paling panjang 200 karakter. |
| Jenis belum dipilih | Pilih salah satu jenis. |
| Cerita terlalu panjang | Cerita singkat paling panjang 5000 karakter. |
| Tautan tidak sah | Tautan harus diawali http:// atau https://. |
| Tautan terlalu panjang | Tautan paling panjang 500 karakter. |
| Format tanggal salah | Tulis tanggal seperti ini: 2026-11-30. |
| Tanggal tidak ada | Tanggal ini tidak ada di kalender. |
| Isian ditolak server | Ada isian yang belum sesuai. Coba periksa lagi. |
| Galat lain | Belum bisa disimpan. Coba lagi sebentar lagi. |

## Detail

| Tempat | Teks |
|---|---|
| Tombol | Ubah catatan |
| Tombol | Hapus catatan |
| Konfirmasi hapus catatan | Hapus catatan ini? Semua fotonya ikut terhapus dan tidak bisa dikembalikan. |
| Tombol | Batal |
| Tombol | Ya, hapus |
| Gagal menghapus | Belum terhapus. Coba lagi sebentar lagi. |
| Tidak ditemukan, judul | Catatan ini tidak ditemukan. |
| Tidak ditemukan, keterangan | Mungkin sudah dihapus. |
| Tombol | Kembali ke Portofolio |

## Foto

| Tempat | Teks |
|---|---|
| Judul bagian | Foto |
| Peringatan privasi | Foto ini hanya bisa dibuka lewat akunmu di aplikasi, dan siswa lain tidak bisa melihatnya. Pengelola layanan secara teknis bisa mengakses tempat penyimpanannya, dan tidak membukanya tanpa keperluan. Jangan unggah dokumen pribadi seperti KTP, kartu pelajar, atau rapor, dan jangan unggah wajah orang lain tanpa izin mereka. |
| Jumlah | Foto di catatan ini: 1 dari 3. Foto di akunmu: 12 dari 30. |
| Tombol | Pilih dari galeri |
| Tombol | Ambil foto |
| Penjelasan izin | Kamera hanya dipakai saat kamu mengambil foto di sini. |
| Batas per catatan | Catatan ini sudah punya 3 foto. Hapus satu dulu kalau mau menggantinya. |
| Batas per akun | Akunmu sudah menyimpan 30 foto. Hapus foto lain dulu kalau mau menambah. |
| Saat diolah | Menyiapkan foto… |
| Saat diunggah | Mengunggah foto… |
| Tombol sesudah gagal | Coba lagi |
| Izin kamera ditolak | Izin kamera belum diberikan. Kamu bisa mengizinkannya di Pengaturan, atau pilih foto dari galeri. |
| Tombol izin | Buka Pengaturan |
| Foto gagal dimuat | Foto belum bisa dimuat. |
| Tombol | Muat lagi |
| Tombol | Hapus foto |
| Konfirmasi hapus foto | Hapus foto ini? Foto yang dihapus tidak bisa dikembalikan. |

## Galat foto

| Keadaan | Teks |
|---|---|
| Tetap lebih dari 5 MB | Foto ini masih lebih dari 5 MB. Coba pilih foto lain. |
| Jenis berkas ditolak | Jenis berkas ini belum bisa disimpan. Pakai foto JPEG, PNG, atau WebP. |
| HEIC sampai ke server | Foto HEIC belum bisa disimpan. Coba pilih foto lain. |
| HEIC di peramban | Foto HEIC belum bisa dibuka di peramban. Buka lewat aplikasi di HP, atau pilih foto JPEG atau PNG. |
| Foto tidak terbaca | Foto ini tidak bisa dibuka. Coba pilih foto lain. |
| Build lama tanpa pemilih foto | Pemilih foto belum tersedia di versi aplikasi ini. |
| Terlalu sering mengunggah | Terlalu banyak unggahan dalam waktu singkat. Coba lagi beberapa menit lagi. |
| Kebijakan belum diterima | Terima kebijakan privasi dulu supaya bisa menyimpan catatan. |
| Catatan sudah hilang | Catatan ini tidak ditemukan. Mungkin sudah dihapus. |

## Keadaan layar

| Keadaan | Teks |
|---|---|
| Fitur belum tersedia, judul | Fitur ini belum tersedia. |
| Fitur belum tersedia, keterangan | Portofolio sedang disiapkan. Coba buka lagi nanti. |
| Kebijakan belum diterima, judul | Terima kebijakan privasi dulu. |
| Kebijakan belum diterima, keterangan | Setelah itu kamu bisa mulai mencatat karyamu. |
| Tombol | Baca dan terima |
| Tidak ada jaringan | Tidak bisa terhubung ke server. Periksa sambunganmu, lalu coba lagi. |
| Galat server | Sedang ada gangguan di server. Coba lagi sebentar lagi. |

## Teks izin di sistem operasi

Tampil di kotak izin iOS. Android memakai kalimat bawaannya.

| Izin | Teks |
|---|---|
| Galeri | LANJUT membuka galeri saat kamu memilih foto untuk catatan portofoliomu. |
| Kamera | LANJUT memakai kamera saat kamu mengambil foto untuk catatan portofoliomu. |
