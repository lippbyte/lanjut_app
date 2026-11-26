# Draf Teks Rekam Jejak v2 (LANJUT_036)

> **Status: DRAF — belum disetujui Khalifa.**
> **Saklar:** `EXPO_PUBLIC_NAVIGASI_V2` (mati bawaan) bersama `EXPO_PUBLIC_PORTOFOLIO` (mati bawaan). Terdaftar di `server/tools/periksa-gerbang-rilis.js` pada entri `navigasi-v2`; profil build mana pun di `eas.json` yang menyalakan `EXPO_PUBLIC_NAVIGASI_V2` akan ditahan selama berkas ini dan berkas Rekam Jejak v2 masih bertanda DRAF.
> **Nada:** pendek, hangat, privat, tanpa menggurui, tanpa janji hasil, tanpa kata yang menyiratkan berbagi, penilaian, peringkat, lomba, atau perbandingan antar siswa, dan tanpa klaim privasi baru (jujur sesuai K29).
> **Batas kata:** maksimal **40 kata teks tetap per keadaan layar** (di luar isi catatan dan isian siswa).

---

## 1. Kalimat Privasi Foto (K29 — Jujur, Tanpa Klaim Baru)

Ringkasan jujur dari rumusan K29 (`docs/draf-teks-portofolio.md`, LANJUT_014) tanpa kalimat terlarang (`"hanya kamu yang bisa melihat"`, `"hanya terlihat olehmu"`, `"tanpa keperluan"`):

> `Foto dibuka lewat akunmu; pengelola secara teknis bisa mengaksesnya. Jangan unggah dokumen pribadi (KTP, rapor) atau wajah orang tanpa izin.`

---

## 2. Daftar Salinan Teks (`TEKS_REKAM_JEJAK_V2` di `lib/rekamJejakV2.ts`)

| Kunci | Teks DRAF | Keterangan pemakaian |
|---|---|---|
| `judul` | `Rekam Jejak` | Judul layar daftar `/portofolio` (K47) |
| `ringkasan` | `Catat karya dan prosesmu.` | Subjudul ringkas di bawah judul daftar |
| `tambah` | `Tambah catatan` | Satu tombol utama menambah catatan di daftar |
| `kosongJudul` | `Belum ada catatan` | Judul keadaan kosong daftar (maskot di lingkaran `latarMaskot`) |
| `kosongTeks` | `Mulai dari satu karya atau prosesmu.` | Satu kalimat ringan mengajak membuat catatan pertama |
| `satuanFoto` | `foto` | Penanda jumlah foto pada kartu daftar (mis. `2 foto`) |
| `bukaCatatan` | `Buka catatan` | Petunjuk aksesibilitas kartu catatan pada daftar |
| `labelJudul` | `Judul` | Label kolom judul wajib (maks 200 karakter) |
| `labelJenis` | `Jenis` | Label kelompok radio jenis (`Karya`, `Proses`, `Refleksi`) |
| `labelUraian` | `Cerita singkat (opsional)` | Label kolom uraian opsional (maks 5000 karakter) |
| `labelTautan` | `Tautan (opsional)` | Label kolom tautan opsional (maks 500 karakter) |
| `petunjukTautan` | `Diawali http:// atau https://` | Petunjuk format tautan yang aman |
| `labelTanggal` | `Tanggal karya (opsional)` | Label kolom tanggal karya opsional |
| `petunjukTanggal` | `Contoh: 2026-11-30` | Petunjuk format tanggal `YYYY-MM-DD` |
| `simpan` | `Simpan` | Satu-satunya tombol Simpan pada formulir satu layar |
| `ubah` | `Ubah` | Tombol mengubah catatan dari layar detail |
| `hapus` | `Hapus` | Tombol membuka konfirmasi hapus catatan |
| `yakinHapus` | `Hapus catatan ini? Semua fotonya ikut terhapus dan tidak bisa dikembalikan.` | Konfirmasi hapus catatan yang menyebut foto ikut terhapus |
| `batal` | `Batal` | Tombol membatalkan konfirmasi atau unggahan gagal |
| `yaHapus` | `Ya, hapus` | Tombol menegaskan penghapusan catatan atau foto |
| `hapusGagal` | `Belum terhapus. Coba lagi sebentar lagi.` | Pesan galat saat penghapusan gagal |
| `bukaTautan` | `Buka tautan` | Label aksesibilitas tautan karya di layar detail |
| `judulFoto` | `Foto` | Judul bagian foto pada layar detail |
| `altFoto` | `Foto catatan` | Teks alternatif gambar foto (tidak membocorkan isi pribadi atau nama berkas) |
| `privasiFoto` | `Foto dibuka lewat akunmu; pengelola secara teknis bisa mengaksesnya. Jangan unggah dokumen pribadi (KTP, rapor) atau wajah orang tanpa izin.` | Peringatan privasi foto (K29) |
| `galeri` | `Pilih galeri` | Tombol memilih foto dari galeri |
| `kamera` | `Ambil foto` | Tombol memotret dengan kamera (izin diminta saat dipakai) |
| `penjelasIzin` | `Kamera dipakai saat memotret.` | Penjelasan singkat izin kamera |
| `penuhButir` | `Sudah 3 foto di sini. Hapus satu untuk mengganti.` | Penanda batas 3 foto per catatan tercapai |
| `penuhAkun` | `Sudah 30 foto di akunmu. Hapus foto lain dulu.` | Penanda batas 30 foto per akun tercapai |
| `mengolah` | `Menyiapkan foto…` | Status saat konversi HEIC / pengecilan gambar |
| `mengunggah` | `Mengunggah foto…` | Status bersama bilah kemajuan unggah |
| `cobaLagi` | `Coba lagi` | Tombol ulang unggah foto gagal atau muat ulang saat galat |
| `izinDitolak` | `Izin kamera belum diberikan. Buka Pengaturan atau pilih dari galeri.` | Penjelasan jalan keluar saat izin kamera ditolak |
| `bukaPengaturan` | `Buka Pengaturan` | Tombol membuka Pengaturan perangkat |
| `fotoGagalMuat` | `Foto belum bisa dimuat.` | Pesan saat foto bertoken gagal dimuat |
| `muatLagi` | `Muat lagi` | Tombol muat ulang satu foto |
| `hapusFoto` | `Hapus foto` | Tombol membuka konfirmasi hapus satu foto |
| `yakinHapusFoto` | `Hapus foto ini? Foto yang dihapus tidak bisa dikembalikan.` | Konfirmasi hapus satu foto |
| `memuatDaftar` | `Memuat Rekam Jejak` | Label aksesibilitas kerangka memuat |
| `memuatFoto` | `Memuat foto` | Label aksesibilitas kerangka memuat foto |
| `fiturMatiJudul` | `Fitur belum tersedia` | Judul keadaan 404 saat saklar server mati |
| `fiturMatiTeks` | `Coba buka kembali nanti.` | Keterangan keadaan 404 |
| `perluKebijakanJudul` | `Terima kebijakan privasi dulu` | Judul saat kebijakan privasi belum diterima (403) |
| `perluKebijakanTeks` | `Setelah itu kamu bisa mencatat karyamu.` | Keterangan pengarah penerimaan kebijakan |
| `bacaKebijakan` | `Baca kebijakan` | Tombol menuju `/terima-kebijakan` |
| `galatJudul` | `Belum bisa memuat data` | Judul `KeadaanGalat` |
| `galatJaringan` | `Periksa sambunganmu, lalu coba lagi.` | Pesan galat jaringan |
| `galatServer` | `Sedang ada gangguan. Coba lagi sebentar lagi.` | Pesan galat server |
| `tidakDitemukanJudul` | `Catatan tidak ditemukan` | Judul saat id catatan tidak ada / milik akun lain |
| `tidakDitemukanTeks` | `Mungkin sudah dihapus.` | Keterangan saat catatan tidak ditemukan |
| `kembali` | `Kembali` | Tombol kembali ke daftar Rekam Jejak |

> **Teks bersama v1 (`lib/portofolio.ts`, tercatat DRAF di `docs/draf-teks-portofolio.md`):** pilihan jenis (`Karya`, `Proses`, `Refleksi`), pesan validasi medan (`GALAT_ISIAN`), dan pesan galat foto/server (`pesanGalatPortofolio`, `GALAT_UMUM`), serta label jalur netral (`Jalur belum tersedia` dari `lib/jalurSayaV2.ts`).
> **Format penghitung batas foto (`teksBatasFotoV2`):** `<jumlahButir>/3 foto, <jumlahAkun>/30 akun (maks 5 MB)` — menampilkan ketiga batas (3 per catatan, 30 per akun, 5 MB) sebelum siswa mencoba mengunggah.

---

## 3. Hitungan Kata Teks Tetap per Keadaan Layar (`teksTetapRekamJejakV2`)

- **Daftar kosong (`daftar_kosong`):** `17 kata` (`≤ 40`).
- **Daftar berisi (`daftar_isi`):** `13 kata` (`≤ 40`).
- **Formulir buat/ubah (`formulir`):** `20 kata` (`≤ 40`).
- **Detail + foto siap unggah (`detail`, sudah termasuk 20 kata peringatan privasi K29):** `38 kata` (`≤ 40`).
- **Detail + batas foto tercapai (`detail_batas_penuh`):** `39 kata` (`≤ 40`).
- **Detail konfirmasi hapus catatan (`detail_konfirmasi_hapus`):** `14 kata` (`≤ 40`).
- **Keadaan galat (`galat`):** `13 kata` (`≤ 40`).
- **Keadaan 404 fitur mati (`fitur_mati`):** `9 kata` (`≤ 40`).
- **Keadaan perlu kebijakan (`perlu_kebijakan`):** `14 kata` (`≤ 40`).
- **Keadaan tidak ditemukan (`tidak_ditemukan`):** `7 kata` (`≤ 40`).
