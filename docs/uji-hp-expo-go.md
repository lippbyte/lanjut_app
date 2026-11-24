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

## 10. Alur masuk dan onboarding v2 (LANJUT_030)

Alur ini **mati bawaan**. Langkah di bawah belum pernah dijalankan di HP; hasilnya belum ada.

**Syarat:** paket `expo-secure-store` harus sudah terpasang di `LANJUT_App` (`npx expo install expo-secure-store`). Tanpa paket itu, bundel untuk HP gagal disusun. Web tidak memerlukannya.

1. Ikuti langkah 2 sampai 5, lalu sebelum `npx expo start` tambahkan satu baris di jendela PowerShell yang sama:
   ```powershell
   $env:EXPO_PUBLIC_ALUR_MASUK_V2 = "1"
   ```
   Baris ini hanya berlaku di jendela itu. Tutup jendela untuk kembali ke alur v1.
2. Bila Expo Go sudah pernah dipakai dengan akun lain, keluar dulu dari akun, lalu tutup Expo Go sepenuhnya.
3. Buka lagi lewat QR. Catat:
   - Layar kelinci tidak menahan lebih dari sekitar 1 detik.
   - Tiga kartu pengantar bisa digeser; "Berikutnya", "Lewati", "Mulai", dan "Saya sudah punya akun" berfungsi.
4. **Daftar** dengan nama pengguna uji baru (huruf kecil, mis. `uji_hp_030_a`), tanpa email:
   - Setiap langkah satu pertanyaan; "Kembali" mengembalikan isian sebelumnya.
   - "Baca lengkap" di langkah Privasi membuka kebijakan lengkap, dan "Lanjut" ditolak sebelum kotak dicentang.
   - Papan ketik tidak menutup kolom dan tombol.
5. Sesudah akun dibuat, layar **kecenderungan arah** muncul. Selama jalur masih draf, isinya "Pilihan jalur sedang disiapkan". Untuk mencoba pilihan jalur, jalankan `npm run benih-persetujuan-dummy` di `server` dulu; jalur `melanjutkan` lalu tampil sebagai `[DUMMY]`.
6. **Tetap masuk:**
   - Keluar, lalu masuk lagi dengan "Tetap masuk di HP ini" **dimatikan**. Tutup Expo Go sepenuhnya, lalu buka lagi: harus kembali ke pengantar atau Masuk.
   - Ulangi dengan pilihan itu **menyala**: harus langsung masuk.
7. **Migrasi sesi:** tidak bisa dibuktikan lewat Expo Go. Perlu APK v2 yang dipasang di atas APK 1.0.0 dengan akun yang sedang masuk.
8. Nyalakan **Hapus animasi** (Android: Setelan > Aksesibilitas) dan **Ukuran font** besar. Semua langkah harus tetap bisa diselesaikan.

Catat hasil di tabel 3a `docs/daftar-uji-hp-apk-v2.md`. Akun uji baru ini milik `lanjut_dev` saja.

## 11. Navigasi v2 dan Arah Saya (LANJUT_031)

Navigasi ini **mati bawaan**. Langkah di bawah belum dijalankan di HP; belum ada klaim hasil di HP, pembaca layar, atau skala huruf besar.

> **Penting — selalu gunakan `--clear`:** setiap kali mengganti kombinasi saklar (`EXPO_PUBLIC_*`), jalankan Expo dengan `--clear` (mis. `npx expo start --go --lan --clear` atau `npx expo start --web --clear`). Cache Metro pernah membawa nilai saklar dari sesi sebelumnya sehingga tab atau kartu tampil dengan konfigurasi lama.

1. Ikuti langkah 2 sampai 4 (server dev lokal + database `lanjut_dev`). Untuk melihat Rekam Jejak, pastikan juga `PORTOFOLIO_AKTIF=1` dan `DIREKTORI_BERKAS` di `server/.env` terisi bila ingin mencoba menyimpan catatan.
2. Di PowerShell kedua, nyalakan saklar hanya untuk sesi lokal ini (ganti `192.168.x.x` dengan IP Wi-Fi komputer):
   ```powershell
   cd "D:\DATA ALIF\Project - Profesional\EDILAKSO Group\LANJUT - Project\EDILAKSO-LANJUT-repo\LANJUT_App"
   $env:EXPO_PUBLIC_API_URL = "http://192.168.x.x:4000/api/v1"
   $env:EXPO_PUBLIC_NAVIGASI_V2 = "1"
   $env:EXPO_PUBLIC_DISCOVER = "1"
   $env:EXPO_PUBLIC_JALUR_TUJUAN = "1"
   $env:EXPO_PUBLIC_PORTOFOLIO = "1"
   npx expo start --go --lan --clear
   ```
3. Masuk dengan akun dummy:
   - `demo_kelas12_dc` — memeriksa Arah Saya dengan jalur/langkah nyata, 4 tab bawah (`Arah Saya`, `Jelajah`, `Jejak Waktu`, `Profil Saya`), pintu `Akun & Privasi` di tab Profil Saya, dan pintu `Langkah Saya` di tab Jejak Waktu.
   - `uji_belum_memilih` — memeriksa keadaan "Pilih arahmu" dan keadaan kosong "Langkah berikutnya" dengan maskot kelinci.
   - `demo_kelas12_p26` — memeriksa jalur yang masih draf tampil netral (`Jalur belum tersedia`) tanpa id mentah atau teks draf.
4. Uji **kombinasi saklar**: hentikan Expo, kosongkan `$env:EXPO_PUBLIC_DISCOVER = ""` dan `$env:EXPO_PUBLIC_PORTOFOLIO = ""`, lalu jalankan lagi dengan `--clear`. Pastikan:
   - hanya 3 tab tampil (`Arah Saya`, `Jejak Waktu`, `Profil Saya`) merata tanpa celah;
   - kartu Rekam Jejak dan Jelajah tidak tampil;
   - tab Profil Saya tetap terbuka (`/akun`).
5. Uji **tombol kembali Android**:
   - buka layar anak (mis. `Alat belajar` → `Arsip Belajar`), lalu tekan Kembali → kembali ke Arah Saya;
   - pindah beberapa tab (`Arah Saya` → `Jejak Waktu` → `Profil Saya`), lalu tekan Kembali → kembali sekali ke `Arah Saya` tanpa bolak-balik antar-tab;
   - dari `Arah Saya`, tekan Kembali → keluar aplikasi seperti biasa.
6. Uji **Aksesibilitas** (belum terverifikasi sampai dicoba di HP): nyalakan Hapus animasi, perbesar ukuran huruf, dan uji dengan TalkBack/VoiceOver pada bilah tab dan kartu Arah Saya.

## 12. Mode terang dan gelap v2 (LANJUT_031b)

Fitur ini **mati bawaan**. Langkah di bawah belum pernah dijalankan di HP; belum ada klaim hasil uji di HP, pembaca layar, atau skala huruf besar.

> **Penting — selalu gunakan `--clear`:** setiap kali menyalakan atau mematikan `EXPO_PUBLIC_MODE_GELAP` (atau saklar `EXPO_PUBLIC_*` lain), selalu jalankan Expo dengan `--clear` (`npx expo start --go --lan --clear` atau `npx expo start --web --clear`) supaya cache Metro tidak membawa konfigurasi saklar lama.

1. Ikuti langkah 2 sampai 4 (database `lanjut_dev` + server dev lokal).
2. Di PowerShell kedua, nyalakan saklar hanya untuk sesi lokal ini (ganti `192.168.x.x` dengan IP Wi-Fi komputer):
   ```powershell
   cd "D:\DATA ALIF\Project - Profesional\EDILAKSO Group\LANJUT - Project\EDILAKSO-LANJUT-repo\LANJUT_App"
   $env:EXPO_PUBLIC_API_URL = "http://192.168.x.x:4000/api/v1"
   $env:EXPO_PUBLIC_ALUR_MASUK_V2 = "1"
   $env:EXPO_PUBLIC_NAVIGASI_V2 = "1"
   $env:EXPO_PUBLIC_MODE_GELAP = "1"
   $env:EXPO_PUBLIC_DISCOVER = "1"
   $env:EXPO_PUBLIC_JALUR_TUJUAN = "1"
   $env:EXPO_PUBLIC_PORTOFOLIO = "1"
   npx expo start --go --lan --clear
   ```
3. **Uji "Ikuti sistem" (bawaan saat saklar menyala):**
   - Ubah setelan tampilan HP antara Terang dan Gelap (Android: Setelan > Tampilan > Tema gelap; iPhone: Settings > Display & Brightness).
   - Pastikan layar v2 (Pengantar, Masuk, Daftar, Kecenderungan, Arah Saya, bilah tab) ikut berganti tanpa menutup aplikasi, serta bilah status HP dan papan ketik tetap terbaca.
4. **Uji tombol ganti mode:**
   - Masuk dengan akun dummy (mis. `demo_kelas12_dc`), buka tab **Profil Saya** → ketuk **Akun & Privasi** (atau langsung tab **Profil Saya** saat `EXPO_PUBLIC_DISCOVER` mati).
   - Di bagian **Tampilan**, coba ganti ke **Gelap**, lalu **Terang**, lalu **Ikuti sistem**. Pastikan tampilan berganti seketika tanpa kedip atau memulai ulang aplikasi.
   - Pilih **Gelap**, tutup Expo Go sepenuhnya, lalu buka lagi: pastikan mode **Gelap** tetap bertahan.
   - Periksa jendela server dev (PowerShell pertama): pergantian mode **tidak** boleh memicu permintaan jaringan apa pun ke server.
5. **Uji tampilan visual di mode gelap:**
   - Periksa wordmark LANJUT di bilah atas (langsung di atas navy saat gelap; di dalam badge biru saat terang), maskot kelinci di Pengantar & Arah Saya, garis bawah pada tautan, dan ikon Phosphor di bilah tab.
   - Buka layar v1 (mis. **Jejak Waktu** `/linimasa`): layar v1 memang sengaja tetap terang di dalam kerangka v2 gelap sampai tahap reskin layar v1.
6. **Uji saklar mati:** hentikan Expo, kosongkan `$env:EXPO_PUBLIC_MODE_GELAP = ""`, jalankan lagi dengan `--clear`. Pastikan tampilan selalu terang meski tema gelap HP menyala, dan kartu **Tampilan** tidak ada di **Akun & Privasi**.


