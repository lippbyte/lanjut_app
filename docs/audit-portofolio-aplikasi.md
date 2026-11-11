# Audit Portofolio sisi aplikasi

**Task:** LANJUT_011 seri v2, Bagian 3 tahap 2.
**Dasar:** commit `e95fe57`, Expo SDK 57.
**Sifat:** catatan pembacaan kode sebelum layar ditulis. Rute server ada di `docs/kontrak-data-v2.md` bagian 4.

## 1. Pola yang diikuti

| Hal | Yang berlaku | Yang dipakai portofolio |
|---|---|---|
| Navigasi | Expo Router berbasis berkas. `app/(app)/_layout.tsx` memakai `<Slot />` di dalam `AppShell` | Tiga berkas datar seperti `arsip-*`: `portofolio`, `portofolio-tulis`, `portofolio-butir` |
| Bilah atas | `HALAMAN_ANAK` di `AppShell` | Tiga judul, hanya bila saklar menyala |
| Klien API | `apiFetch` di `api/client.ts`, token lewat `Authorization: Bearer`, galat menjadi `ApiError(status, pesan, kode, medan)` | Sama, ditambah `apiUnggah` dan `apiAmbilDataUri` |
| Galat 401 | Satu pendengar di `AuthProvider` membuang sesi | Dua fungsi baru memanggil pendengar yang sama |
| Galat 404 dan 429 | Ditangani per layar lewat `kode` dan `status` | 404 pada daftar berarti saklar server mati. 429 menawarkan coba lagi |
| Data | React Query, cache hanya di memori. `KUNCI_DATA_AKUN` dibuang saat sesi berganti | Kunci `['butir_bukti']` ditambahkan |
| Layar daftar, formulir, konfirmasi | `ArsipScreen`, `PersiapanEvent`, `ArsipKartuScreen`. Konfirmasi dua langkah di dalam layar | Sama |
| Komponen | `components/ui` dan `components/screens/auth/AuthUI` | Dipakai ulang, satu ikon baru `foto` |
| Tes | Aplikasi tidak punya pelari tes. Modul murni dan susunan layar dites dari `server/tests` lewat `muatModulApp` | Sama, `server/tests/portofolio-app.test.js` |

## 2. Pola saklar build

`EXPO_PUBLIC_KELOLA_DATA_AKUN` dibaca `app.config.ts` ke `extra`, lalu `lib/fiturApp.ts`. Bawaan mati diatur di `Dockerfile` dan `docker-compose.yml`, dan `eas.json` tidak menyalakannya. Saat mati, bagian di layar tidak dirender dan rutenya mengalihkan dengan `<Redirect>`. Tesnya di `server/tests/data-akun-app.test.js`.

`EXPO_PUBLIC_PORTOFOLIO` mengikuti pola itu, dengan satu tambahan. Task meminta rute tidak terdaftar saat mati, sedangkan Expo Router mendaftarkan rute dari berkas. `Protected` tidak tersedia untuk `<Slot />`, dan mengganti `<Slot />` berarti mengubah navigasi utama. Jadi `metro.config.js` mengeluarkan ketiga berkas rute dari bundel saat saklar bukan `1`. Layar, hook, dan teks draf ikut hilang dari bundel karena hanya dijangkau dari berkas rute. Penjaga `<Redirect>` tetap ada sebagai lapis kedua.

Yang tetap ada di bundel saat mati hanya judul kartu, tiga judul bilah atas, dan pembersih folder sementara. Semuanya tidak pernah tampil atau berjalan.

Mengganti nilai saklar saat pengembangan perlu `expo start --clear`.

## 3. Pustaka gambar

Belum ada pemilih foto maupun pengolah gambar. `Image` dari `react-native` sudah ada. Yang dipasang lewat `npx expo install`:

| Paket | Versi | Alasan | Ukuran di `node_modules` | Lisensi |
|---|---|---|---|---|
| `expo-image-picker` | 57.0.21 | Galeri dan kamera | 679 KB | MIT |
| `expo-image-manipulator` | 57.0.22 | Konversi HEIC ke JPEG dan memperkecil | 32 MB, sebagian besar berkas build native | MIT |
| `expo-file-system` | 57.0.7 | Membaca ukuran dan menghapus berkas sementara. Sudah ikut bersama `expo`, kini ditulis langsung | 8 MB | MIT |

`expo-image-loader` 57.0.1 ikut sebagai dependensi `expo-image-manipulator`. Tambahan ukuran pada APK belum terukur, karena APK tidak dibangun.

**Izin platform saat saklar menyala:**

- Android: `CAMERA`, ditambah `READ_EXTERNAL_STORAGE` dan `WRITE_EXTERNAL_STORAGE` sampai Android 12. `RECORD_AUDIO` dicabut.
- iOS: `NSCameraUsageDescription` dan `NSPhotoLibraryUsageDescription`.

Galeri tidak perlu izin. Kamera meminta izin saat dipakai.

**Saat saklar mati:** `CAMERA` dan `RECORD_AUDIO` dicabut. Plugin tetap ditulis di `app.config.ts`, karena Expo memasangnya otomatis bila paketnya ada, dan tanpa opsi itu izin mikrofon ikut masuk (diperbaiki di LANJUT_013). Modul native-nya tetap terpasang di APK karena Expo menautkannya dari `package.json`, tetapi kodenya tidak pernah dipanggil.

Ketiganya hanya berlaku pada build APK v2 pertama. APK 1.0.0 tidak berubah.

## 4. Menampilkan foto dan cache

Foto tidak punya URL publik. `Image` dari `react-native` bisa mengirim header, tetapi di Android hasilnya masuk cache disk Fresco tanpa memedulikan `no-store`.

Jadi foto diambil dengan `fetch` bertoken, diubah menjadi data URI, dan disimpan di cache React Query:

- Tidak masuk cache disk HTTP, karena server mengirim `no-store`.
- Data URI tidak ditulis ke cache disk gambar.
- Dibuang saat keluar akun, sesi berakhir, ganti akun, atau hapus akun.
- Hilang dari cache 60 detik sesudah tidak ditampilkan.

**Yang tersimpan di perangkat:**

| Tempat | Isi | Kapan hilang |
|---|---|---|
| Memori, React Query | Data URI foto | Saat keluar akun, atau 60 detik sesudah tidak ditampilkan |
| Memori, cache gambar React Native | Gambar yang sudah didekode | Tidak bisa dibersihkan dari kode. Hilang saat tergeser atau aplikasi ditutup. Tidak ditulis ke disk |
| Disk, `cache/ImagePicker` dan `cache/ImageManipulator` | Salinan foto sementara | Dihapus sesudah diolah dan diunggah, saat layar ditinggalkan, dan saat keluar akun |

Foto yang diambil dari kamera tidak disimpan ke galeri oleh aplikasi.

## 5. Pintu masuk

Beranda, tepat di bawah grid menu, sebagai `KartuPintu`. Tampil untuk semua jenjang. Grid dan lima tab tidak berubah. Data Akun tidak dipilih, karena pintu di sana menambah ketukan.
