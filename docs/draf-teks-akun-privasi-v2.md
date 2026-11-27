# Draf Teks Akun & Privasi v2 (LANJUT_037)

> **Status: DRAF — belum disetujui.** Tidak boleh dinyalakan pada build rilis sebelum Khalifa membaca dan menyetujui teks di bawah ini.
> **Saklar:** `EXPO_PUBLIC_NAVIGASI_V2` bersama `EXPO_PUBLIC_KELOLA_DATA_AKUN` (keduanya mati bawaan). Terdaftar di `server/tools/periksa-gerbang-rilis.js` di bawah entri `navigasi-v2`.
> **Sumber kode:** `lib/akunPrivasiV2.ts` (`TEKS_AKUN_PRIVASI_V2`), `components/screens/v2/AkunPrivasiV2.tsx`, `components/screens/v2/HapusAkunV2.tsx`.
> **Prinsip & batas:** maksimal **40 kata teks tetap per keadaan layar** (di luar data dinamis akun seperti nama/email siswa); nada pendek, menenangkan, jujur, tanpa menakut-nakuti, tanpa membujuk agar batal menghapus, dan **tanpa klaim privasi baru** (hanya menyatakan hal yang terbukti di kode atau sudah tercatat di `docs/draf-teks-hapus-akun.md`).

---

## 1. Layar Akun & Privasi (`/akun`)

| Tempat | Teks (DRAF) | Catatan |
|---|---|---|
| Judul layar | `Akun & Privasi` | Label v2 (K47) |
| Judul kartu 1 | `Akunku` | Menampilkan nama tampilan, `@nama_pengguna`, dan email utuh tanpa potong |
| Label email | `Email` | Disusun vertikal penuh agar email panjang tidak terpotong |
| Nilai bila akun tanpa email | `Belum ada` | Tampil hanya bila `pengguna.email` kosong |
| Tautan kebijakan (sudah ada di v1) | `Kebijakan privasi` | Membuka `/kebijakan-privasi` |
| Tombol terima kebijakan (bila belum diterima) | `Baca dan terima` | Membuka `/terima-kebijakan` (hanya muncul bila versi berlaku belum diterima) |
| Judul kartu 2 (mode tampilan, bila `EXPO_PUBLIC_MODE_GELAP=1`) | `Tampilan` | Memakai `TEKS_MODE_TAMPILAN.judul` (`lib/modeTampilan.ts`) |
| Pilihan mode tampilan | `Ikuti sistem` / `Terang` / `Gelap` | Memakai `TEKS_MODE_TAMPILAN.opsi` |
| Penanda tertulis mode aktif | `Aktif` | Tampil bersama ikon centang agar status aktif bukan warna saja |
| Judul kartu 3 (unduh data) | `Datamu` | Hanya saat `EXPO_PUBLIC_KELOLA_DATA_AKUN=1` |
| Penjelasan unduh data (1 kalimat) | `Salinan data akunmu (JSON); isi foto tidak ikut.` | Jujur sesuai kontrak `GET /pengguna/saya/ekspor` (sama dengan v1, tanpa klaim baru) |
| Tombol unduh data | `Unduh data saya` | Memanggil `useUnduhDataSaya()` |
| Tombol unduh saat memuat | `Menyiapkan data…` | Menggantikan label tombol saat memuat |
| Status unduh berhasil | `Berkas disiapkan.` | Ditampilkan bersama ikon centang |
| Tombol coba lagi saat unduh gagal | `Coba lagi` | Mengulang `useUnduhDataSaya()` |
| Penanda bahaya tertulis kartu 4 | `Tindakan permanen` | Ditampilkan bersama ikon waspada (bukan warna saja) |
| Judul kartu 4 | `Hapus akun` | Terpisah di bagian bawah, hanya saat `EXPO_PUBLIC_KELOLA_DATA_AKUN=1` |
| Tombol buka konfirmasi hapus akun | `Hapus akun saya` | Membuka `/hapus-akun` |
| Tombol keluar (sekunder) | `Keluar` | Memanggil `keluar()` dari `AuthProvider` |
| Tombol keluar saat memuat | `Mengeluarkan…` | Menggantikan label tombol saat memuat |

### Pesan galat unduh data (`/akun`)
| Keadaan | Teks (DRAF) |
|---|---|
| Data melewati batas (`EKSPOR_TERLALU_BESAR`) | `Datamu terlalu besar. Hubungi tim LANJUT.` |
| Terlalu sering (`TERLALU_SERING`) | `Terlalu banyak percobaan. Coba nanti.` |
| Galat jaringan (`JARINGAN`) | `Gagal terhubung ke server.` |
| Berbagi tidak tersedia di HP (`BAGIKAN_TIDAK_TERSEDIA`) | `Buka di peramban untuk mengunduh.` |
| Galat lain | `Data belum bisa diunduh.` |

---

## 2. Layar Konfirmasi Hapus Akun (`/hapus-akun`)

| Tempat | Teks (DRAF) | Catatan |
|---|---|---|
| Penanda bahaya tertulis | `Tidak dapat dibatalkan` | Bersama ikon waspada, tenang tanpa menakut-nakuti |
| Judul layar | `Hapus akun` | — |
| Judul daftar dampak | `Yang ikut terhapus:` | Daftar singkat & faktual sesuai kode server |
| Butir 1 | `Profil, catatan, kemajuan, kartu, modul, dan foto.` | Sesuai penghapusan tabel akun + berkas di server |
| Butir 2 | `Persetujuan akunmu di server LANJUT.` | Sesuai penghapusan catatan persetujuan akun |
| Kotak centang penegasan eksplisit | `Saya paham akun dihapus permanen.` | Wajib dicentang sebelum tombol kirim mengirim permintaan |
| Label kolom identitas ulang (kata sandi) | `Kata sandi` | Input `secureTextEntry`, wajib diisi |
| Tautan alih ke kode email (hanya bila email terverifikasi) | `Pakai kode email` | Sama aturan `bisaPakaiKodeEmail` v1 |
| Label kolom kode email (mode kode) | `Kode email` | 6 angka |
| Tombol kirim kode (mode kode) | `Kirim kode` | Saat memuat: `Mengirim…`; sesudah terkirim: `Kirim ulang` |
| Status kode terkirim | `Kode dikirim.` | Ditampilkan bersama ikon centang |
| Tautan alih ke kata sandi (mode kode) | `Pakai kata sandi` | — |
| Tombol aksi hapus (gaya destruktif tenang) | `Hapus akun permanen` | Saat memuat: `Menghapus…` |
| Tombol batal | `Batal` | Kembali ke `/akun` tanpa membujuk |

### Pesan galat hapus akun (`/hapus-akun`)
| Keadaan | Teks (DRAF) |
|---|---|
| Isian belum lengkap (belum centang / kosong) | `Centang dan isi konfirmasi dulu.` |
| Kata sandi salah (`KREDENSIAL_SALAH`) | `Kata sandi tidak cocok.` |
| Kode salah (`KODE_SALAH`) | `Kode tidak cocok.` |
| Kode kedaluwarsa (`KODE_KEDALUWARSA`) | `Kode kedaluwarsa. Minta kode baru.` |
| Terlalu sering (`TERLALU_SERING`) | `Terlalu banyak percobaan. Coba nanti.` |
| Pengiriman kode belum tersedia (`OTP_TIDAK_TERSEDIA`) | `Kode email belum tersedia.` |
| Email belum terverifikasi (`TIDAK_BERHAK`) | `Email belum terverifikasi. Pakai sandi.` |
| Galat jaringan (`JARINGAN`) | `Gagal terhubung. Akun belum dihapus.` |
| Galat lain | `Akun belum bisa dihapus.` |

---

## 3. Ringkasan Hitungan Kata Tetap per Keadaan Layar (Batas Maks. 40 Kata)

| Keadaan layar | Jumlah kata tetap | Status |
|---|---|---|
| `/akun` — bawaan (semua kartu aktif) | 33 kata | Lolos (`≤ 40`) |
| `/akun` — sedang mengunduh data | 32 kata | Lolos (`≤ 40`) |
| `/akun` — unduh data berhasil | 35 kata | Lolos (`≤ 40`) |
| `/akun` — galat jaringan unduh + tombol `Coba lagi` | 39 kata | Lolos (`≤ 40`) |
| `/akun` — galat umum unduh + tombol `Coba lagi` | 39 kata | Lolos (`≤ 40`) |
| `/akun` — galat data terlalu besar | 39 kata | Lolos (`≤ 40`) |
| `/akun` — kebijakan belum diterima (`Baca dan terima`) | 36 kata | Lolos (`≤ 40`) |
| `/hapus-akun` — bawaan (mode kata sandi + tautan kode email) | 34 kata | Lolos (`≤ 40`) |
| `/hapus-akun` — sedang menghapus | 32 kata | Lolos (`≤ 40`) |
| `/hapus-akun` — galat kata sandi salah | 38 kata | Lolos (`≤ 40`) |
| `/hapus-akun` — galat jaringan | 39 kata | Lolos (`≤ 40`) |
| `/hapus-akun` — galat belum lengkap | 39 kata | Lolos (`≤ 40`) |
| `/hapus-akun` — mode kode email + kode terkirim | 38 kata | Lolos (`≤ 40`) |
