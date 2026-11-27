# Rencana Profil Build Penguji v2 (`tester-v2`)

> **Status dokumen:** **RENCANA SAJA (LANJUT_038).** Dokumen ini **tidak mengubah** `eas.json`, `app.config.ts`, `package.json`, maupun berkas aplikasi/server mana pun. Pembuatan profil build baru dan eksekusi `eas build` baru boleh dilakukan sesudah prasyarat konten, gerbang rilis, dan perbaikan pemblokir pada [`docs/audit-siap-tester.md`](audit-siap-tester.md) terpenuhi.

---

## 1. Tujuan dan Isolasi Profil

Profil `tester-v2` dirancang sebagai **APK distribusi internal khusus penguji v2**, terpisah dari:
- `apk-sekolah` (semua saklar v2 mati — untuk siswa sekolah umum saat ini),
- `pilot` (portofolio + hapus akun v1), dan
- `production` (App Bundle toko aplikasi).

**Pengingat kompatibilitas Android:** seluruh profil memakai `android.package = "com.edilakso.lanjut"`. Memasang APK `tester-v2` di HP yang sudah memiliki APK 1.0.0 akan **menimpa (upgrade)** aplikasi lama secara langsung selama ditandatangani dengan **keystore rilis yang sama** dan **`versionCode` dinaikkan** dari nilai saat ini (`3` di `app.config.ts:112`).

---

## 2. Usulan Nilai Setiap Saklar untuk APK Penguji v2

### 2.1 Saklar Klien (`eas.json` → `build.tester-v2.env` / `app.config.ts`)

| Saklar Klien | Usulan nilai | Alasan | Bergantung pada konten / keputusan? |
|---|---|---|---|
| `EXPO_PUBLIC_ALUR_MASUK_V2` | `"1"` | Menampilkan Pengantar v2, Masuk v2, Daftar 8 langkah, dan penyimpanan token aman (`expo-secure-store`). | Menambah blokir teks `alur-masuk-v2` di `periksa-gerbang-rilis`; butuh perbaikan `ModalKebijakanV2` & `PengantarV2` dulu (`LANJUT_039`). |
| `EXPO_PUBLIC_NAVIGASI_V2` | `"1"` | Menampilkan shell navigasi v2, Arah Saya, Jejak Waktu, Langkah Saya, dan wajah v2 seluruh layar utama. | Menambah blokir teks `navigasi-v2` di `periksa-gerbang-rilis`; butuh perbaikan wadah layar v1 di mode gelap & `TabBarV2` 2× font (`LANJUT_039`). |
| `EXPO_PUBLIC_MODE_GELAP` | `"1"` | Menyalakan mode Terang/Gelap/Ikuti sistem v2 serta mengatur `userInterfaceStyle: "automatic"` di `app.config.ts`. | Menambah blokir teks `mode-gelap-v2` di `periksa-gerbang-rilis`; wajib sesudah kontras layar v1 & kebijakan mode gelap beres (`LANJUT_039`). |
| `EXPO_PUBLIC_PORTOFOLIO` | `"1"` | Menampilkan kartu utama **Rekam Jejak** v2 dan mengaktifkan izin kamera/galeri (tanpa mikrofon) di plugin `expo-image-picker`. | Butuh teks `portofolio` disetujui di `periksa-gerbang-rilis`, surat orang tua diperbarui, serta `PORTOFOLIO_AKTIF=1` + volume foto di server. |
| `EXPO_PUBLIC_JALUR_TUJUAN` | `"1"` *(hanya jika T13 selesai)* — jika belum, `"0"` | Menampilkan kartu **Jalur Saya** v2 dan pilihan jalur di Kecenderungan Arah. | **Sangat bergantung pada T13** (persetujuan teks 3 jalur: Melanjutkan, Bekerja, Wirausaha). Tanpa T13, penguji hanya melihat keadaan kosong. |
| `EXPO_PUBLIC_DISCOVER` | `"1"` *(hanya jika K39 selesai)* — jika belum, `"0"` | Menampilkan tab **Jelajah** dan **Profil Eksplorasi** pada tab Profil Saya. | **Sangat bergantung pada K39** (minimal 2–3 kartu Jelajah bersumber URL nyata, terverifikasi, disetujui). Bila `"0"`, navigasi otomatis rapi menjadi 3 tab merata dan tab Profil Saya membuka `/akun`. |
| `EXPO_PUBLIC_KELOLA_DATA_AKUN` | `"1"` *(sesuai keputusan T14)* | Menampilkan wajah v2 **Akun & Privasi** (kartu Unduh data + Hapus akun permanen). | **Bergantung pada T14** (keputusan Khalifa apakah penguji boleh mencoba hapus akun) dan persetujuan teks `hapus-akun` di `periksa-gerbang-rilis`. *(Catatan: saat ini `app/(app)/akun.tsx` memakai `AkunPrivasiV2` hanya jika `NAVIGASI_V2` DAN `KELOLA_DATA_AKUN` keduanya menyala.)* |
| `EXPO_PUBLIC_ALAT_BELAJAR` | **`"0"` (tidak diisi / bawaan mati)** | **Rencana (LANJUT_040):** menyembunyikan bagian "Alat belajar" (10 fitur v1 yang belum direskin + 7 rute anaknya) dari antarmuka v2 penguji, dengan pengalihan ramah ke Arah Saya bila dibuka langsung. Rute v1 tidak dihapus dan tetap utuh saat `NAVIGASI_V2` mati. | Tidak menambah teks draf baru. Bila penguji nanti perlu mencoba Alat belajar v1, baru ubah ke `"1"` pada profil build terpisah. *(Catatan: `eas.json` dan `app.config.ts` belum diubah pada LANJUT_040.)* |
| `EXPO_PUBLIC_MIKROFON_NGOBROL` | **`"0"` (tidak diisi)** | Mikrofon Ngobrol masih menunggu tinjauan hukum dan fitur AI masih mati. | Ya — tetap mati sampai tinjauan hukum selesai. |
| `EXPO_PUBLIC_GALERI_KOMPONEN` | **`"0"` (tidak diisi)** | Khusus pengembang (`__DEV__`); otomatis diblokir `metro.config.js` dan `app.config.ts` pada profil non-development. | Tidak — wajib selalu mati untuk penguji. |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` & `EXPO_PUBLIC_GOOGLE_REDIRECT_URI` | Kosong *(atau isi sesuai produksi bila Google Masuk ikut diuji)* | Kosong = tombol Google tidak tampil; aman bagi penguji nama pengguna + sandi. | Keputusan Khalifa apakah alur Google ikut diuji pada putaran ini. |
| `EXPO_PUBLIC_API_URL` | Diisi dari EAS Environment (`https://...`) | Wajib `https://` untuk profil non-`preview`/`development` (`app.config.ts:62`). | Alamat server uji/produksi yang sudah diverifikasi cadangannya. |

### 2.2 Saklar & Konfigurasi Server yang Harus Selaras

| Variabel / Tabel Server | Usulan nilai untuk uji v2 | Catatan penting |
|---|---|---|
| `PORTOFOLIO_AKTIF` | `"1"` | Wajib bersama `DIREKTORI_BERKAS` yang sudah terpasang ke volume persisten dan terbukti bisa ditulis (`BISA_DITULIS`). |
| `JALUR_TUJUAN_AKTIF` | `"1"` (bila `EXPO_PUBLIC_JALUR_TUJUAN="1"`) | Pastikan 3 baris `jalur_minat` sudah disetujui (T13), bukan benih `[DUMMY]`. |
| `DISCOVER_AKTIF` | `"1"` (bila `EXPO_PUBLIC_DISCOVER="1"`) | Pastikan minimal 2–3 baris `kartu_discover` sudah bersumber URL, terverifikasi, dan disetujui (K39), bukan benih `[DUMMY]`. |
| `konfigurasi.ai_aktif` | **`"0"`** | AI tetap mati sesuai aturan. |
| `konfigurasi.event_sekolah_aktif` | **`"0"`** *(kecuali ada event resmi terverifikasi)* | Bila `"0"`, siswa SMP melihat keadaan kosong tenang di Jejak Waktu. |

---

## 3. Penyesuaian Kecil `app.config.ts` yang Perlu Disiapkan Saat Task Build Tiba

Saat nanti masuk ke task penerapan build (bukan di audit ini), perhatikan 3 hal di `app.config.ts`:
1. **Naikkan `android.versionCode`** dari `3` ke `4` (atau angka berikutnya yang belum pernah dibagikan) agar APK baru bisa dipasang di atas build sebelumnya tanpa mencopot aplikasi.
2. **Perbarui teks izin native `expo-image-picker` (`app.config.ts:100-101`):** ganti kata v1 `"catatan portofoliomu"` menjadi `"catatan Rekam Jejakmu"` agar konsisten dengan nama tampilan v2 (K47).
3. **Periksa `androidStatusBar.barStyle` (`app.config.ts:87`):** saat ini terkunci `'dark-content'`; pastikan transisi status bar di mode gelap native Android terlihat bersih sejak layar pembuka.

---

## 4. Paket Native & Aset Baru Sejak APK 1.0.0 (`15f5106..HEAD`)

Paket berikut tidak ada di APK 1.0.0, sehingga **hanya aktif dan dapat dibuktikan pada APK build baru** (bukan Expo Go dan bukan peramban):

| Paket / Aset | Versi | Fungsi | Dampak pada build & uji HP |
|---|---|---|---|
| `expo-secure-store` | `~57.0.4` | Penyimpanan token sesi di Android Keystore / iOS Keychain (`api/penyimpananAman.ts`) | **Kritis (K55):** wajib uji migrasi sesi satu kali saat upgrade dari APK 1.0.0 di HP fisik. |
| `expo-image-picker` | `~57.0.21` | Memilih foto dari galeri & memotret dengan kamera (Rekam Jejak) | Menambah izin kamera & galeri di manifest Android (mikrofon tetap `false`). Wajib uji tolak izin → Buka Pengaturan. |
| `expo-image-manipulator` | `~57.0.22` | Memperkecil foto dan mengubah HEIC → JPEG sebelum unggah | Wajib uji foto > 5 MB dan foto HEIC asli dari iPhone / Android. |
| `expo-file-system` | `~57.0.7` | Menyimpan sementara berkas JSON unduhan & membersihkan cache saat keluar | Wajib uji kebersihan folder cache (`ImagePicker`, `ImageManipulator`, `EksporData`) setelah keluar akun. |
| `expo-sharing` | `~57.0.25` | Membuka lembar berbagi sistem HP untuk Unduh Data Saya | Tidak bisa diuji di Expo Go/web; wajib uji kirim ke Email/Drive di APK. |
| `phosphor-react-native` | `^3.0.6` | Ikon tab dan tombol v2 (memakai `react-native-svg`) | Pastikan seluruh ikon tampil tajam di layar DPI tinggi Android/iOS. |
| `assets/fonts/SourceSans3_*.ttf` | Regular & SemiBold | Font isi v2 lokal | Pastikan tidak jatuh kembali ke font sistem saat HP luring. |

---

## 5. Daftar Verifikasi Wajib Sebelum `eas build`

Jalankan berurutan dan jangan lanjutkan `eas build` bila ada satu pun yang gagal:

1. **Perbaikan pemblokir kode selesai (`LANJUT_039`–`040`):** `ModalKebijakanV2`, `/kebijakan-privasi`, wadah terang layar v1 di mode gelap, maskot `PengantarV2`, `TabBarV2` skala font, dan `npm test` seluruhnya lulus tanpa regresi.
2. **Bersihkan cache Metro (`--clear`):** pada setiap pengujian lokal sebelum build, selalu jalankan `npx expo start --clear` saat mengubah saklar `EXPO_PUBLIC_*` agar cache Metro tidak membawa konfigurasi lama.
3. **Verifikasi nilai saklar yang benar-benar masuk ke bundel:** jalankan pemeriksaan konfigurasi dengan variabel profil yang sama (mis. `npx expo config --type public`) dan pastikan seluruh bidang `extra` (`alurMasukV2`, `navigasiV2`, `modeGelap`, `portofolio`, `jalurTujuan`, `discover`, `kelolaDataAkun`, `galeriKomponen=false`, `mikrofonNgobrol=false`, `apiUrl=https://...`) bernilai persis sesuai tabel §2.
4. **Gerbang rilis wajib LOLOS:**
   ```powershell
   cd LANJUT_App
   npm run periksa-gerbang-rilis
   ```
   Harus mencetak `[periksa-gerbang-rilis] LOLOS` (0 isian `[ISI]`, 0 konflik kalimat kebijakan, seluruh 6 kelompok teks yang saklarnya menyala sudah memiliki sidik sah di `docs/persetujuan-teks-rilis.json`).
5. **Keystore & cadangan server siap:**
   - Pastikan keystore rilis di `LANJUT_KEYSTORE_PROPS` identik dengan keystore APK 1.0.0 (`docs/rilis/lanjut-1.0.0.md`).
   - Pastikan cadangan database dan volume foto di server produksi/uji (Dokploy) sudah dibuat dan diuji keterbacaannya sesuai `docs/daftar-uji-hp-apk-v2.md` bagian 1.8–1.12.
6. **Pastikan tidak ada data `[DUMMY]` di server target:** benih persetujuan dummy hanya untuk `lanjut_dev` dan tidak boleh pernah ada di server yang dipakai penguji.

---

## 6. Rencana Uji Wajib Migrasi Token Sesi di HP Fisik (K55)

Migrasi token satu kali dari penyimpanan lama (`AsyncStorage` di APK 1.0.0) ke penyimpanan aman perangkat (`expo-secure-store` Android Keystore di APK v2) **tidak dapat dibuktikan melalui web, emulator kosong, maupun Expo Go**. Pengujian berikut wajib lulus di minimal 1 HP Android fisik sebelum APK `tester-v2` dibagikan ke penguji:

| Langkah | Tindakan di HP Android fisik | Hasil yang wajib terbukti |
|---|---|---|
| **K55.1** | Pasang **APK 1.0.0** (rilis yang sama dengan yang dipakai siswa), lalu masuk dengan **akun uji** (bukan akun siswa asli). | Berhasil masuk ke Beranda v1; tutup aplikasi penuh lalu buka lagi, sesi tetap masuk. |
| **K55.2** | Tanpa menghapus APK 1.0.0, pasang **APK `tester-v2`** (ditandatangani keystore sama, `versionCode` lebih tinggi) langsung di atasnya. | Pemasangan berhasil sebagai pembaruan (tidak ditolak sistem dan tidak meminta uninstall). |
| **K55.3** | Buka aplikasi LANJUT v2 untuk pertama kalinya sesudah pembaruan. | Aplikasi langsung masuk ke **Arah Saya** (`/arah-saya`) dengan akun uji yang sama — pengguna **tidak terlempar keluar** ke layar Pengantar/Masuk. |
| **K55.4** | Tutup paksa aplikasi (force close / swipe dari recents), lalu buka kembali. | Sesi tetap bertahan dari `expo-secure-store` (token sudah terpindah secara bersih). |
| **K55.5** | Buka **Profil Saya → Akun & Privasi → Keluar**, lalu tutup aplikasi dan buka ulang. | Aplikasi kembali ke layar awal tanpa sesi (baik kunci `SecureStore` maupun sisa lama di `AsyncStorage` bersih). |
| **K55.6** | Masuk lagi dengan pilihan **"Tetap masuk di HP ini" dimatikan**, tutup paksa aplikasi, lalu buka lagi. | Aplikasi meminta masuk ulang (token tidak disimpan permanen). Ulangi dengan **"Tetap masuk" menyala** → langsung masuk. |

*(Lanjutkan uji APK penuh lainnya: izin kamera/galeri tanpa mikrofon, foto HEIC & > 5 MB, `expo-sharing`, pembersihan cache saat keluar, ukuran huruf besar sistem Android/iOS, dan pembaca layar TalkBack/VoiceOver sesuai `docs/daftar-uji-hp-apk-v2.md` bagian 3.)*
