# Uji layar di HP lewat Expo Go

**Untuk:** Khalifa, atau siapa pun di tim yang ingin melihat layar Jalur & Tujuan dan Discover di HP sungguhan. **Task:** LANJUT_027 seri v2.

> **Peringatan.** Ini hanya untuk melihat layar dengan **data dummy**, di komputer sendiri dan Wi-Fi sendiri.
> - **Jangan masuk dengan akun siswa asli** atau akunmu sendiri. Pakai akun dummy di langkah 6.
> - Ini **tidak sama dengan uji APK.** Hasilnya tidak menggantikan bagian 2 dan 3 di `docs/daftar-uji-hp-apk-v2.md`.
> - Jangan memakai terowongan publik seperti `expo start --tunnel` atau ngrok. Server dev hanya boleh terbuka di Wi-Fi yang sama.

## 1. Yang dibutuhkan

- **Komputer pengembang dan HP di Wi-Fi yang sama.** Pakai Wi-Fi rumah atau kantor yang kamu kendalikan, bukan Wi-Fi umum. Wi-Fi umum sering memblokir sambungan antarperangkat.
- **Expo Go** di HP, dari Play Store (Android) atau App Store (iPhone). Aplikasi ini memakai **Expo SDK 57**. Bila Expo Go menolak dengan pesan bahwa versi SDK tidak cocok, berhenti dan beri tahu tim. Versi Expo Go yang lain hanya boleh diambil dari halaman resmi `expo.dev/go`.
- **Docker Desktop menyala** di komputer.
- **Memori komputer yang cukup.** Tutup aplikasi besar lain dulu. Saat dicoba di LANJUT_027, penyusun aplikasi (Metro) berhenti dengan galat "out of memory" ketika memori komputer hampir habis.

## 2. Nyalakan database dev dan isi data dummy

Buka **PowerShell** pertama, lalu:

```powershell
cd "D:\DATA ALIF\Project - Profesional\EDILAKSO Group\LANJUT - Project\EDILAKSO-LANJUT-repo\LANJUT_App"
docker compose -f docker-compose.dev.yml --env-file .env.dev.local up -d
cd server
npm run benih-persetujuan-dummy
```

Baris terakhir menandai satu jalur dan satu kartu bertanda `[DUMMY]` sebagai disetujui, **hanya di database dev** (`lanjut_dev`, port 3309). Isinya terbaca palsu, misalnya "[DUMMY] Kesehatan". Berkas konten tidak berubah.

## 3. Buka server dev ke Wi-Fi

Buka berkas `LANJUT_App\server\.env` dengan Notepad. Pastikan ada ketiga baris ini; tambahkan bila belum ada:

```
JALUR_TUJUAN_AKTIF=1
DISCOVER_AKTIF=1
DEV_DENGAN_JARINGAN_LOKAL=1
```

`DEV_DENGAN_JARINGAN_LOKAL=1` membuat server dev bisa dijangkau HP di Wi-Fi yang sama. Tanpa baris itu, server hanya bisa dijangkau dari komputer ini. Server menolak menyala dengan opsi ini bila databasenya bukan `lanjut_dev`, dan opsi ini tidak bisa dipakai di server produksi.

Lalu di PowerShell yang sama (masih di folder `server`):

```powershell
npm start
```

Tunggu sampai muncul kotak tulisan seperti ini:

```
[server] TERBUKA DI JARINGAN LOKAL (DEV_DENGAN_JARINGAN_LOKAL=1), basis data lanjut_dev.
[server] Bisa dijangkau dari perangkat di Wi-Fi yang sama: http://192.168.x.x:4000, ...
```

Biarkan jendela ini terbuka. Setiap permintaan dari HP akan tercatat di sini.

## 4. Cari alamat IP komputer

Alamat yang dicetak server di langkah 3 adalah alamat komputermu. Bila ada lebih dari satu, pakai yang dimulai `192.168.` atau sesuai jaringan Wi-Fi-mu. Alamat `172.` biasanya milik WSL atau Hyper-V, bukan Wi-Fi.

Cara lain: buka PowerShell, ketik `ipconfig`, lalu cari bagian **Wireless LAN adapter Wi-Fi**, baris **IPv4 Address**.

Di langkah berikutnya, alamat ini ditulis sebagai `192.168.x.x`. Ganti dengan alamatmu.

## 5. Nyalakan aplikasi untuk Expo Go

Buka **PowerShell kedua**, lalu ketik baris demi baris. Ganti `192.168.x.x` dengan alamatmu:

```powershell
cd "D:\DATA ALIF\Project - Profesional\EDILAKSO Group\LANJUT - Project\EDILAKSO-LANJUT-repo\LANJUT_App"
$env:EXPO_PUBLIC_API_URL = "http://192.168.x.x:4000/api/v1"
$env:EXPO_PUBLIC_JALUR_TUJUAN = "1"
$env:EXPO_PUBLIC_DISCOVER = "1"
$env:EXPO_PUBLIC_KELOLA_DATA_AKUN = "1"
npx expo start --go --lan
```

**Jangan lewati baris `EXPO_PUBLIC_API_URL`.** Berkas `LANJUT_App\.env` di komputer pengembang bisa berisi alamat server **produksi**, dan tanpa baris ini aplikasi di HP akan memakai alamat itu. Keempat baris `$env:` hanya berlaku di jendela PowerShell ini dan hilang saat jendela ditutup. Kode dan pengaturan build tidak berubah.

Saat siap, Expo menampilkan **kode QR**.
- **Android:** buka Expo Go, ketuk **Scan QR code**, lalu arahkan ke kode itu.
- **iPhone:** buka aplikasi **Kamera**, arahkan ke kode itu, lalu ketuk tautan yang muncul.

Pembukaan pertama perlu satu sampai beberapa menit.

**Bila HP tidak bisa tersambung,** biasanya karena Windows Firewall. Saat server atau Expo pertama kali menyala, Windows bisa menampilkan pertanyaan izin untuk Node.js. Pilih **Private networks** saja, jangan Public. Bila pertanyaan itu tidak muncul, buka **PowerShell sebagai Administrator**, lalu buat dua aturan yang hanya berlaku di jaringan Private:

```powershell
New-NetFirewallRule -DisplayName "LANJUT dev 4000 (uji HP)" -Direction Inbound -Protocol TCP -LocalPort 4000 -Profile Private -Action Allow
New-NetFirewallRule -DisplayName "LANJUT dev 8081 (uji HP)" -Direction Inbound -Protocol TCP -LocalPort 8081 -Profile Private -Action Allow
```

Pastikan Wi-Fi di komputer berstatus **Private network**: Settings > Network & internet > Wi-Fi > nama Wi-Fi > Network profile type. Cara menghapus aturan ini ada di langkah 8.

## 6. Masuk dengan akun dummy

Akun yang bisa dipakai, semuanya dibuat oleh `npm run benih-dummy`:

| Akun | Isinya |
|---|---|
| `uji_belum_memilih` | Kosong; cocok untuk mencoba dari awal |
| `demo_kelas12_dc` | Jalur, tujuan dua versi, refleksi, dan profil dua versi |
| `uji_belum_memilih_p26` | Tujuan dan profil tiga versi |
| `demo_kelas12_p26` | Memilih jalur saat jalur itu masih draf |

**Sandinya** ada di berkas `LANJUT_App\server\.env`, pada baris `DUMMY_KATA_SANDI`. Jangan menyalin sandi itu ke dokumen atau pesan.

**Pastikan HP memakai server dev:** setelah menekan Masuk, jendela PowerShell pertama harus menampilkan baris `POST /api/v1/auth/masuk 200`. Bila akun dummy tidak bisa masuk, atau baris itu tidak muncul, **berhenti**. Aplikasi mungkin tersambung ke server lain. Jangan mencoba akun asli.

## 7. Apa yang dilihat dan dicatat

Ikuti tabel bagian **3a** di `docs/daftar-uji-hp-apk-v2.md`. Layar yang perlu dilihat:

- **Beranda**: pintu Jalur & Tujuan dan Discover.
- **Jalur & Tujuan**: pilih jalur, tulis tujuan, perbarui, Lihat perubahan, jeda, dan pilih lagi.
- **Discover**: daftar kartu, Tulis refleksi, Profil Eksplorasi, dan Lihat versi sebelumnya.
- **Data Akun**: bagian Data saya.

Catat untuk setiap layar:

- **HP dan ukuran layar**: merek, model, dan lebar layar bila tahu. Gambar uji sebelumnya dibuat di lebar 360 px; HP-mu bisa lebih lebar atau lebih sempit.
- **Teks yang janggal**: salah ketik, kalimat yang membingungkan, atau janji yang tidak sesuai kenyataan.
- **Huruf atau isi yang terpotong**, termasuk saat ukuran huruf HP diperbesar.
- **Tombol yang sulit ditekan**, terlalu kecil, atau tertutup papan ketik.
- Tangkapan layar bila perlu. Isinya dummy, tetapi jangan ikut memotret notifikasi pribadi di HP.

## 8. Mematikan dan membersihkan

1. Di kedua jendela PowerShell, tekan **Ctrl+C**, lalu tutup jendelanya. Variabel `$env:` ikut hilang.
2. Kembalikan data dummy ke draf. Di PowerShell baru, di folder `LANJUT_App\server`:
   ```powershell
   npm run benih-persetujuan-dummy -- --cabut
   ```
3. Di `LANJUT_App\server\.env`, ubah `DEV_DENGAN_JARINGAN_LOKAL=1` menjadi `DEV_DENGAN_JARINGAN_LOKAL=0`, atau hapus barisnya. Server kembali hanya bisa dijangkau dari komputer ini.
4. Bila kamu membuat aturan firewall di langkah 5, hapus lewat PowerShell sebagai Administrator:
   ```powershell
   Remove-NetFirewallRule -DisplayName "LANJUT dev 4000 (uji HP)"
   Remove-NetFirewallRule -DisplayName "LANJUT dev 8081 (uji HP)"
   ```
   Bila tadi kamu mengizinkan Node.js lewat pertanyaan Windows, izin itu bisa dicabut di **Windows Security > Firewall & network protection > Allow an app through firewall**.
5. Bila tidak dipakai lagi, matikan database dev:
   ```powershell
   docker compose -f docker-compose.dev.yml --env-file .env.dev.local down
   ```
   Isi database tetap tersimpan.

## 9. Apa yang tidak bisa dibuktikan lewat Expo Go

Expo Go menjalankan aplikasi dalam mode pengembangan, di dalam aplikasi Expo Go sendiri. Karena itu hal berikut **tidak** bisa dibuktikan di sini dan tetap menunggu uji APK:

- Izin dan teks permintaan izin (kamera, galeri, penyimpanan).
- Kamera, foto HEIC, foto besar, dan membagikan berkas.
- Ukuran APK, ikon, nama aplikasi, dan pemasangan di atas APK 1.0.0.
- Kecepatan dan perilaku bundel produksi.

Daftar lengkapnya ada di bagian 3a `docs/daftar-uji-hp-apk-v2.md`.
