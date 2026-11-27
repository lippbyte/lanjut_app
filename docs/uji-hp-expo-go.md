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
   - Buka layar v1 (mis. **Jelajah** `/discover` atau **Alat belajar**): layar v1 yang belum di-reskin memang sengaja tetap terang di dalam kerangka v2 gelap sampai tahap reskin berikutnya.
6. **Uji saklar mati:** hentikan Expo, kosongkan `$env:EXPO_PUBLIC_MODE_GELAP = ""`, jalankan lagi dengan `--clear`. Pastikan tampilan selalu terang meski tema gelap HP menyala, dan kartu **Tampilan** tidak ada di **Akun & Privasi**.

## 13. Jejak Waktu dan Langkah Saya v2 (LANJUT_032)

Kedua layar ini berada di balik saklar `EXPO_PUBLIC_NAVIGASI_V2` (**mati bawaan**). Langkah di bawah belum pernah dijalankan di HP fisik; tidak ada klaim hasil uji di HP, pembaca layar (TalkBack/VoiceOver), atau ukuran huruf besar sistem.

> **Penting — selalu gunakan `--clear`:** setiap kali menyalakan atau mematikan `EXPO_PUBLIC_NAVIGASI_V2` atau `EXPO_PUBLIC_MODE_GELAP`, jalankan Expo dengan `--clear` (`npx expo start --go --lan --clear` atau `npx expo start --web --clear`) agar bundel Metro tidak memakai cache rute lama.

1. Pastikan server dev lokal dan MySQL `lanjut_dev` berjalan (langkah 2–4), serta 3 tahapan resmi TKA di `lanjut_dev` sudah ditandai terverifikasi untuk mencoba Jejak Waktu berisi data.
2. Di PowerShell kedua, nyalakan saklar untuk sesi lokal (ganti `192.168.x.x` dengan IP Wi-Fi komputer):
   ```powershell
   cd "D:\DATA ALIF\Project - Profesional\EDILAKSO Group\LANJUT - Project\EDILAKSO-LANJUT-repo\LANJUT_App"
   $env:EXPO_PUBLIC_API_URL = "http://192.168.x.x:4000/api/v1"
   $env:EXPO_PUBLIC_ALUR_MASUK_V2 = "1"
   $env:EXPO_PUBLIC_NAVIGASI_V2 = "1"
   $env:EXPO_PUBLIC_MODE_GELAP = "1"
   $env:EXPO_PUBLIC_DISCOVER = "1"
   npx expo start --go --lan --clear
   ```
3. **Uji Jejak Waktu (`/jejak-waktu` lewat tab Jejak Waktu):**
   - Masuk dengan `demo_kelas12_dc` (kelas 12): pastikan tab **Jejak Waktu** membuka `/jejak-waktu` (bukan lagi Beranda v1), menampilkan kelompok **Segera** dengan penanda teks `Segera` (tanpa warna merah/oranye dan tanpa hitungan mundur berdetak) serta bagian lipat **Sudah lewat**. Ketuk salah satu butir untuk melihat rincian sumber & tanggal pemeriksaan.
   - Masuk dengan `uji_belum_memilih` (kelas 11) dan `uji_smp_dc` / `uji_smp` (SMP): pastikan tampil keadaan kosong yang tenang dengan maskot kelinci di dalam lingkaran `#B4E1EB` pada mode terang maupun gelap, beserta satu tombol aksi.
4. **Uji Langkah Saya (`/langkah-saya` dari pintu Arah Saya atau pintu di atas Jejak Waktu):**
   - Masuk dengan `demo_kelas12_dc`: pilih jalur seleksi (`TKA` / `SNBP` / `SNBT`), lalu centang dan batal-centang beberapa butir. Pastikan ringkasan progres di atas (`X dari Y selesai` + batang progres) berubah sesuai keadaan (`0`, sebagian, dan kalimat hangat singkat saat semua selesai), serta centang bertahan sesudah layar dimuat ulang.
   - Buka `Pilih Mapel` atau `Eksplorasi Kampus`, simpan satu butir pribadi, lalu kembali ke **Langkah Saya**: pastikan butir pribadi muncul, bisa dicentang/dibatal-centang, dan bisa dihapus.
   - Uji mode **Gelap** (lewat **Profil Saya** → **Akun & Privasi** → **Gelap**): pastikan semua keadaan kosong di Arah Saya, Jejak Waktu, dan Langkah Saya menampilkan maskot kelinci di atas lingkaran `#B4E1EB` sehingga garis maskot tetap jelas.
5. **Uji saklar mati:** hentikan Expo, kosongkan `$env:EXPO_PUBLIC_NAVIGASI_V2 = ""`, lalu jalankan ulang dengan `--clear`. Pastikan aplikasi kembali membuka Beranda v1 (`/linimasa`) dan Daftar Periksa v1 (`/daftar-periksa`) seperti semula.

## 14. Jalur Saya v2 (LANJUT_033)

Layar **Jalur Saya** v2 mereskin `/jalur-tujuan` dan `/jalur-tujuan-tulis` di balik kombinasi saklar `EXPO_PUBLIC_JALUR_TUJUAN` (**mati bawaan**) dan `EXPO_PUBLIC_NAVIGASI_V2` (**mati bawaan**). Langkah di bawah belum pernah dijalankan di HP fisik; belum ada klaim hasil uji di HP, pembaca layar (TalkBack/VoiceOver), atau ukuran huruf besar sistem.

> **Penting — selalu gunakan `--clear`:** setiap kali menyalakan atau mematikan `EXPO_PUBLIC_JALUR_TUJUAN`, `EXPO_PUBLIC_NAVIGASI_V2`, atau `EXPO_PUBLIC_MODE_GELAP`, jalankan Expo dengan `--clear` (`npx expo start --go --lan --clear` atau `npx expo start --web --clear`) supaya cache Metro tidak membawa konfigurasi saklar lama.

1. Pastikan database `lanjut_dev` (port `3309`) dan server dev lokal menyala dengan `JALUR_TUJUAN_AKTIF=1` di `LANJUT_App\server\.env` (langkah 2–4).
2. Di PowerShell kedua, nyalakan saklar untuk sesi lokal (ganti `192.168.x.x` dengan IP Wi-Fi komputer):
   ```powershell
   cd "D:\DATA ALIF\Project - Profesional\EDILAKSO Group\LANJUT - Project\EDILAKSO-LANJUT-repo\LANJUT_App"
   $env:EXPO_PUBLIC_API_URL = "http://192.168.x.x:4000/api/v1"
   $env:EXPO_PUBLIC_ALUR_MASUK_V2 = "1"
   $env:EXPO_PUBLIC_NAVIGASI_V2 = "1"
   $env:EXPO_PUBLIC_MODE_GELAP = "1"
   $env:EXPO_PUBLIC_JALUR_TUJUAN = "1"
   $env:EXPO_PUBLIC_DISCOVER = "1"
   npx expo start --go --lan --clear
   ```
3. **Uji saat jalur masih draf (bawaan database dev):**
   - Masuk dengan `uji_belum_memilih`, lalu dari **Arah Saya** ketuk kartu **Jalur Saya**: pastikan tampil keadaan kosong **"Pilihan jalur sedang disiapkan"** dengan maskot kelinci di dalam lingkaran `#B4E1EB` (terang maupun gelap), kartu **"Tujuanmu"** kosong, dan tombol **Tulis tujuan** berfungsi tanpa tertutup papan ketik.
   - Masuk dengan `demo_kelas12_p26`: pastikan pilihan jalur yang dulu dipilih lalu kembali draf tampil sebagai kartu netral **"Jalur belum tersedia"** dengan satu tombol **Jeda**, tanpa id mentah (`melanjutkan`) dan tanpa teks draf, serta tujuan yang terkait jalur draf ikut menampilkan **"Jalur belum tersedia"**.
4. **Uji saat ada jalur dummy disetujui:**
   - Di PowerShell folder `LANJUT_App\server`, jalankan:
     ```powershell
     npm run benih-persetujuan-dummy
     ```
   - Masuk dengan `demo_kelas12_dc`, buka **Jalur Saya**:
     - Pastikan jalur `[DUMMY] Melanjutkan` tampil sebagai kartu besar interaktif dengan penanda tertulis **Dipilih** (bukan hanya warna), bisa diketuk untuk menjeda dan memilih kembali.
     - Di kartu **Tujuanmu**, ketuk **Lihat perubahan** untuk memeriksa versi lama bernomor & berjam (`Versi ke-1 (...)`), lalu ketuk **Ubah** untuk membuat versi baru dan periksa umpan balik satu kalimat hangat.
   - **Wajib sesudah selesai melihat:** cabut kembali persetujuan dummy di `LANJUT_App\server`:
     ```powershell
     npm run benih-persetujuan-dummy -- --cabut
     ```
5. **Uji saklar v2 mati:** hentikan Expo, kosongkan `$env:EXPO_PUBLIC_NAVIGASI_V2 = ""` (biarkan `$env:EXPO_PUBLIC_JALUR_TUJUAN = "1"`), lalu jalankan ulang dengan `--clear`. Pastikan `/jalur-tujuan` kembali menampilkan layar v1 **Jalur & Tujuan** persis seperti semula.

## 15. Jelajah dan Profil Eksplorasi v2 (LANJUT_034)

Layar **Jelajah** (`/discover`, `/discover-refleksi`) dan **Profil Eksplorasi** (`/discover-profil`, dibuka lewat tab **Profil Saya**) berada di balik kombinasi saklar `EXPO_PUBLIC_DISCOVER` (**mati bawaan**) dan `EXPO_PUBLIC_NAVIGASI_V2` (**mati bawaan**). Langkah di bawah belum pernah dijalankan di HP fisik; belum ada klaim hasil uji di HP, pembaca layar (TalkBack/VoiceOver), atau ukuran huruf besar sistem.

> **Penting — selalu gunakan `--clear`:** setiap kali menyalakan atau mematikan `EXPO_PUBLIC_DISCOVER`, `EXPO_PUBLIC_NAVIGASI_V2`, atau `EXPO_PUBLIC_MODE_GELAP`, jalankan Expo dengan `--clear` (`npx expo start --go --lan --clear` atau `npx expo start --web --clear`) supaya cache Metro tidak membawa konfigurasi saklar lama.

1. Pastikan database `lanjut_dev` (port `3309`) dan server dev lokal menyala dengan `DISCOVER_AKTIF=1` (dan `JALUR_TUJUAN_AKTIF=1` bila ingin ikut memeriksa Jalur Saya) di `LANJUT_App\server\.env` (langkah 2–4).
2. Di PowerShell kedua, nyalakan saklar untuk sesi lokal (ganti `192.168.x.x` dengan IP Wi-Fi komputer):
   ```powershell
   cd "D:\DATA ALIF\Project - Profesional\EDILAKSO Group\LANJUT - Project\EDILAKSO-LANJUT-repo\LANJUT_App"
   $env:EXPO_PUBLIC_API_URL = "http://192.168.x.x:4000/api/v1"
   $env:EXPO_PUBLIC_ALUR_MASUK_V2 = "1"
   $env:EXPO_PUBLIC_NAVIGASI_V2 = "1"
   $env:EXPO_PUBLIC_MODE_GELAP = "1"
   $env:EXPO_PUBLIC_DISCOVER = "1"
   $env:EXPO_PUBLIC_JALUR_TUJUAN = "1"
   npx expo start --go --lan --clear
   ```
3. **Uji saat seluruh kartu masih draf (bawaan database dev):**
   - Masuk dengan `uji_belum_memilih`, buka tab **Jelajah**: pastikan tampil keadaan kosong **"Kartu sedang disiapkan"** dengan maskot kelinci di lingkaran `#B4E1EB` (terang maupun gelap), tanpa satu pun kartu draf.
   - Buka tab **Profil Saya**: pastikan tampil kartu pintu **Akun & Privasi**, keadaan kosong **"Profil belum disusun"** dengan maskot di lingkaran `#B4E1EB`, dan tombol **Susun profil**.
4. **Uji saat satu kartu dummy disetujui:**
   - Di PowerShell folder `LANJUT_App\server`, jalankan:
     ```powershell
     npm run benih-persetujuan-dummy
     ```
   - Masuk dengan `demo_kelas12_dc`, buka tab **Jelajah**:
     - Pastikan kartu **`[DUMMY] Kesehatan`** tampil besar dengan penanda tertulis **Sudah ditulis** (bukan hanya warna).
     - Ketuk kartu untuk membuka **Rincian** (judul, isi dari server apa adanya, penanda sumber dummy, tanpa bagian "Cara belajar"), lalu ketuk **Ubah refleksi**.
     - Di layar refleksi, uji penghitung sisa karakter (`280`), coba isi melebihi `280` karakter untuk memastikan pesan galat muncul dan pengiriman ditolak, lalu uji simpan serta **Hapus tulisan** (mengosongkan teks lewat API v1).
   - Buka tab **Profil Saya** (`/discover-profil`):
     - Periksa kartu pintu **Akun & Privasi** tetap ada di atas.
     - Periksa seluruh isian siswa tampil apa adanya tanpa tafsiran, ketuk **Lihat perubahan** untuk memeriksa versi lama bernomor & berjam (`Versi ke-1 · ...`), dan ketuk **Ubah** untuk mencoba kolom catatan pribadi (batas `500` karakter + penghitung sisa karakter).
   - **Wajib sesudah selesai melihat:** cabut kembali persetujuan dummy di `LANJUT_App\server`:
     ```powershell
     npm run benih-persetujuan-dummy -- --cabut
     ```
5. **Uji saklar mati:**
   - Hentikan Expo, kosongkan `$env:EXPO_PUBLIC_DISCOVER = ""` (biarkan `EXPO_PUBLIC_NAVIGASI_V2 = "1"`), jalankan ulang dengan `--clear`: pastikan tab **Jelajah** tidak tampil (3 tab merata) dan tab **Profil Saya** membuka `/akun`.
   - Kosongkan `$env:EXPO_PUBLIC_NAVIGASI_V2 = ""` dan nyalakan `$env:EXPO_PUBLIC_DISCOVER = "1"` dengan `--clear`: pastikan `/discover`, `/discover-refleksi`, dan `/discover-profil` kembali menampilkan layar v1 **Discover** persis seperti semula.

---

## 16. Rekam Jejak v2 (LANJUT_036)

> **Catatan:** Daftar periksa di bawah ini disusun untuk pengujian manual oleh manusia di perangkat fisik (Expo Go). Hingga selesai LANJUT_036, langkah kamera, galeri, berkas HEIC, dan ukuran huruf besar **belum dijalankan di HP sungguhan**; verifikasi otomatis LANJUT_036 hanya dilakukan lewat uji kode dan peramban komputer (DEV).

1. **Nyalakan saklar di server pengembangan (`LANJUT_App\server`):**
   - Pastikan server lokal berjalan dengan `PORTOFOLIO_AKTIF=1` (dan opsional `JALUR_TUJUAN_AKTIF=1` bila ingin melihat nama jalur tersimpan pada catatan yang sudah pernah dikaitkan).
2. **Nyalakan kedua saklar di sisi aplikasi (`LANJUT_App`) lalu jalankan Expo dengan `--clear`:**
   ```powershell
   $env:EXPO_PUBLIC_PORTOFOLIO = "1"
   $env:EXPO_PUBLIC_NAVIGASI_V2 = "1"
   $env:EXPO_PUBLIC_MODE_GELAP = "1"
   npx expo start --clear
   ```
   *(Menjalankan `--clear` wajib setiap kali saklar `EXPO_PUBLIC_*` diubah agar nilai saklar terbaca ulang oleh Metro.)*
3. **Buka Rekam Jejak dari layar Arah Saya:**
   - Dari tab **Arah Saya**, ketuk kartu besar **Rekam Jejak** (`/portofolio`).
   - Pada akun tanpa catatan, pastikan keadaan kosong tampil dengan maskot kelinci di dalam lingkaran berlatar `#B4E1EB` (pada mode terang maupun mode gelap) dan tombol **Tambah catatan**.
   - Ketuk **Tambah catatan** (`/portofolio-tulis`), pastikan seluruh isian (judul, jenis bawaan `Karya`, catatan opsional, tautan opsional) ada dalam **satu layar** dengan satu tombol **Simpan**. Simpan 1 catatan (total **3 ketukan** dari Arah Saya sampai catatan pertama tersimpan).
4. **Uji foto (kamera, galeri, dan HEIC di iOS bila ada):**
   - Buka catatan yang baru dibuat (`/portofolio-butir?id=...`) lalu periksa peringatan singkat di bagian foto tentang akses pengelola dan larangan mengunggah dokumen pribadi / wajah orang lain tanpa izin.
   - Ketuk **Pilih galeri**: pastikan foto berhasil diperkecil dan diunggah, kemajuan unggah tampil, lalu foto muncul dari memori aplikasi.
   - Ketuk **Ambil foto**: pastikan izin kamera diminta saat dipakai, kamera terbuka, foto hasil jepretan berhasil diunggah dan tampil; uji pula penolakan izin kamera untuk memastikan jalan keluar **Buka Pengaturan** tampil.
   - *(Khusus iPhone/iOS)* Uji memilih foto berformat **HEIC** dari galeri: pastikan berhasil diubah menjadi JPEG dan diunggah, atau bila gagal muncul pesan galat singkat yang jelas tanpa membuat aplikasi macet.
   - Unggah hingga **3 foto** pada satu catatan: pastikan tombol tambah foto menghilang dan pesan batas (`3/3 foto` + `Sudah 3 foto di sini. Hapus satu untuk mengganti.`) tampil.
   - Uji **Hapus foto** dengan konfirmasi, lalu uji **Ubah** dan **Hapus** catatan (konfirmasi menyebut semua foto ikut terhapus).
   - Uji daftar terisi pada mode terang dan gelap: bila ada catatan yang dulu dikaitkan ke jalur yang kini berstatus draf, pastikan hanya tampil tulisan netral **`Jalur belum tersedia`** (tanpa ID mentah).
5. **Uji saklar mati dan 404 server:**
   - Matikan `PORTOFOLIO_AKTIF` di server (sementara kedua saklar aplikasi masih nyala): buka **Rekam Jejak** dan pastikan tampil keadaan ramah **`Fitur belum tersedia`** (bukan layar kosong atau galat mentah).
   - Kosongkan `$env:EXPO_PUBLIC_NAVIGASI_V2 = ""` (biarkan `$env:EXPO_PUBLIC_PORTOFOLIO = "1"`), jalankan ulang `npx expo start --clear`: pastikan `/portofolio`, `/portofolio-tulis`, dan `/portofolio-butir` kembali menampilkan layar v1 **Portofolio** persis seperti semula.
   - Kosongkan `$env:EXPO_PUBLIC_PORTOFOLIO = ""` (dengan `$env:EXPO_PUBLIC_NAVIGASI_V2 = "1"`), jalankan ulang `npx expo start --clear`: pastikan kartu **Rekam Jejak** di Arah Saya tidak tampil dan rute `/portofolio*` mengembalikan ke awal.

---

## 17. Akun & Privasi v2 (LANJUT_037)

> **Catatan:** Daftar periksa di bawah ini disusun untuk pengujian manual oleh manusia di perangkat fisik (Expo Go). Hingga selesai LANJUT_037, pengujian di HP fisik, pembaca layar (TalkBack/VoiceOver), serta skala ukuran huruf besar perangkat **belum dijalankan**; verifikasi otomatis LANJUT_037 hanya dilakukan lewat uji kode dan peramban komputer (DEV).

1. **Jalankan server pengembangan (`LANJUT_App\server`) pada `lanjut_dev`:**
   ```powershell
   npm run benih-dummy
   npm run dev
   ```
2. **Nyalakan saklar aplikasi di `LANJUT_App` lalu jalankan Expo dengan `--clear`:**
   ```powershell
   $env:EXPO_PUBLIC_NAVIGASI_V2 = "1"
   $env:EXPO_PUBLIC_KELOLA_DATA_AKUN = "1"
   $env:EXPO_PUBLIC_MODE_GELAP = "1"
   $env:EXPO_PUBLIC_DISCOVER = "1"
   npx expo start --clear
   ```
   *(Menjalankan `--clear` wajib setiap kali saklar `EXPO_PUBLIC_*` diubah agar nilai saklar terbaca ulang oleh Metro.)*
3. **Periksa dua jalan menuju Akun & Privasi (`/akun`):**
   - Dengan `EXPO_PUBLIC_DISCOVER = "1"`, buka tab **Profil Saya** (`/discover-profil`) lalu ketuk kartu pintu **Akun & Privasi** di bagian atas → pastikan layar **Akun & Privasi v2** terbuka.
   - Uji juga dengan `$env:EXPO_PUBLIC_DISCOVER = ""` dan `npx expo start --clear`: pastikan tab **Profil Saya** langsung membuka **Akun & Privasi v2** (`/akun`) dengan 3 tab bawah merata.
4. **Uji kartu Akunku, Tampilan, Unduh data, dan Keluar (memakai akun dummy, JANGAN hapus akun dummy bersama):**
   - Periksa kartu **Akunku**: pastikan nama, `@nama_pengguna`, dan alamat email panjang tampil **utuh penuh** (pindah baris secara alami, tidak terpotong `…`). Ketuk tautan **Kebijakan privasi** untuk memastikan halaman kebijakan terbuka.
   - Periksa kartu **Tampilan**: coba ketiga pilihan (`Ikuti sistem`, `Terang`, `Gelap`). Pastikan pilihan aktif selalu punya penanda tertulis **`Aktif`** + ikon centang (bukan hanya warna), dan pilihan tetap tersimpan di HP setelah aplikasi ditutup dan dibuka ulang.
   - Periksa kartu **Datamu**: ketuk **Unduh data saya**. Pastikan muncul tanda memuat (`Menyiapkan data…`), lembar berbagi sistem HP terbuka dengan berkas JSON, lalu status `Berkas disiapkan.` tampil (dan bila server dimatikan sementara, muncul pesan galat + tombol **Coba lagi**).
   - Ketuk **Keluar** di bawah: pastikan kembali ke layar masuk dan data akun sebelumnya tidak terbawa bila masuk dengan akun lain.
5. **Uji alur Hapus akun (WAJIB pakai akun uji baru milik sendiri, BUKAN akun dummy bersama):**
   - Daftarkan satu akun uji sementara baru (mis. `uji_hapus_hp_01`) lewat layar Daftar lalu masuk.
   - Buka **Akun & Privasi**, gulir ke kartu **Hapus akun** yang terpisah di bagian bawah (penanda tertulis `Tindakan permanen`), ketuk **Hapus akun saya** (`/hapus-akun`).
   - Pastikan **Batal** mengembalikan ke `/akun` tanpa menghapus apa pun.
   - Coba ketuk **Hapus akun permanen** tanpa mencentang kotak atau tanpa mengisi kata sandi → pastikan permintaan ditolak di layar dengan pesan `Centang dan isi konfirmasi dulu.`.
   - Centang kotak lalu masukkan kata sandi yang salah → pastikan muncul pesan sopan `Kata sandi tidak cocok.` dan akun tidak terhapus.
   - Masukkan kata sandi yang benar lalu ketuk **Hapus akun permanen** → pastikan akun terhapus, sesi dibersihkan, dan aplikasi langsung kembali ke layar awal masuk.
6. **Uji saklar mati:**
   - Kosongkan `$env:EXPO_PUBLIC_KELOLA_DATA_AKUN = ""` (biarkan `EXPO_PUBLIC_NAVIGASI_V2 = "1"`), jalankan ulang `npx expo start --clear`: pastikan tidak ada tombol unduh data atau hapus akun di `/akun` dan membuka `/hapus-akun` mengembalikan ke `/akun`.
   - Kosongkan `$env:EXPO_PUBLIC_NAVIGASI_V2 = ""` (biarkan `EXPO_PUBLIC_KELOLA_DATA_AKUN = "1"`), jalankan ulang `npx expo start --clear`: pastikan `/akun` dan `/hapus-akun` kembali menampilkan layar v1 persis seperti semula.

---

## 18. Perbaikan Mode Gelap & Aksesibilitas Klien v2 (LANJUT_039)

> **Catatan:** Daftar periksa di bawah ini disusun untuk pengujian manual oleh manusia di perangkat fisik (Expo Go). Hingga selesai LANJUT_039, pengujian di HP fisik, pembaca layar (TalkBack/VoiceOver), serta skala ukuran huruf besar sistem perangkat **belum dijalankan**; verifikasi otomatis LANJUT_039 hanya dilakukan lewat uji kode dan peramban komputer (DEV).

1. **Nyalakan saklar v2 di sesi lokal lalu jalankan Expo dengan `--clear`:**
   ```powershell
   $env:EXPO_PUBLIC_API_URL = "http://192.168.x.x:4000/api/v1"
   $env:EXPO_PUBLIC_ALUR_MASUK_V2 = "1"
   $env:EXPO_PUBLIC_NAVIGASI_V2 = "1"
   $env:EXPO_PUBLIC_MODE_GELAP = "1"
   $env:EXPO_PUBLIC_PORTOFOLIO = "1"
   $env:EXPO_PUBLIC_JALUR_TUJUAN = "1"
   $env:EXPO_PUBLIC_DISCOVER = "1"
   $env:EXPO_PUBLIC_KELOLA_DATA_AKUN = "1"
   npx expo start --go --lan --clear
   ```
2. **Uji mode gelap di Pengantar & Modal Kebijakan Daftar:**
   - Aktifkan tema gelap di Setelan HP (sebelum masuk).
   - Buka Pengantar: pastikan maskot kelinci berada di lingkaran `#B4E1EB` (garis maskot jelas, tidak redup) dan kartu 3 menyebut `"Akun & Privasi"` (bukan `"Data Akun"`).
   - Masuk ke **Daftar** sampai langkah Privasi, ketuk **Baca lengkap**: pastikan judul, catatan status, versi, dan seluruh paragraf kebijakan terbaca jelas di latar gelap tanpa teks gelap tenggelam.
3. **Uji mode gelap di `/kebijakan-privasi`, `/terima-kebijakan`, dan rute v1 Alat belajar:**
   - Masuk dengan akun dummy (mis. `demo_kelas12_dc`), pilih mode **Gelap** di **Profil Saya → Akun & Privasi**.
   - Ketuk **Kebijakan privasi** (`/kebijakan-privasi`): pastikan latar gelap serasi (tidak menyilaukan putih) dan tombol Kembali mudah ditekan.
   - Buka **Arah Saya → Alat belajar**, coba buka **Arsip Belajar** (`/arsip`), **Level-In** (`/level-in`), **Ngobrol Bareng LANJUT** (`/ngobrol`), dan dari Ngobrol buka tautan terima kebijakan (`/terima-kebijakan`): pastikan rute v1 tampil terbaca di atas permukaan terang di dalam bingkai v2 gelap, sementara `/terima-kebijakan` tampil serasi mode gelap.
4. **Uji ukuran huruf besar sistem OS (belum terverifikasi sampai dicoba di HP):**
   - Naikkan ukuran font di Setelan HP (Android: Setelan > Tampilan > Ukuran font; iOS: Settings > Accessibility > Larger Text).
   - Buka tiap tab (`Arah Saya`, `Jelajah`, `Jejak Waktu`, `Profil Saya`): pastikan label bilah tab turun rapi ke dua baris tanpa terpotong `…`, ikon dan label tetap utuh, serta target sentuh nyaman ditekan.
5. **Uji saklar mati:**
   - Kosongkan seluruh `$env:EXPO_PUBLIC_*` v2 dan jalankan ulang `npx expo start --go --lan --clear`: pastikan `/kebijakan-privasi`, `/terima-kebijakan`, dan seluruh layar v1 kembali tampil persis seperti v1 tanpa perubahan.







