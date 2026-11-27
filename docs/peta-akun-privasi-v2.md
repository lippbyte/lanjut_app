# Peta Akun & Privasi v2 — Inventaris Layar Akun v1 Sebelum Reskin (LANJUT_037)

> **Tahap:** Langkah 1 (inventaris terverifikasi terhadap kode aktual di `LANJUT_App` pada commit `4e323c1`, sebelum mengubah layar).
> **Batasan task:** reskin klien v2 saja di balik `EXPO_PUBLIC_NAVIGASI_V2` bersama `EXPO_PUBLIC_KELOLA_DATA_AKUN` (keduanya mati bawaan). **Tanpa perubahan server, API, skema, migrasi, atau dependensi baru.**

---

## 1. Inventaris Lengkap Layar Akun v1 di Kode

### 1.1 Rute Expo Router
| Rute | Berkas | Komponen v1 | Saklar / Penjaga |
|---|---|---|---|
| `/akun` | `app/(app)/akun.tsx` | `AkunScreen` | Selalu aktif dalam sesi (bagian unduh & hapus akun di dalamnya tunduk pada `EXPO_PUBLIC_KELOLA_DATA_AKUN`). |
| `/hapus-akun` | `app/(app)/hapus-akun.tsx` | `HapusAkunScreen` (`key={pengguna?.id}`) | `if (!kelolaDataAkunAktif(Constants.expoConfig?.extra)) return <Redirect href="/akun" />;` |
| `/kebijakan-privasi` | `app/kebijakan-privasi.tsx` | `KebijakanPrivasiScreen` | Selalu aktif (dapat dibuka dari `/akun` tanpa teks hukum baru). |
| `/terima-kebijakan` | `app/(app)/terima-kebijakan.tsx` | `TerimaKebijakanScreen` | Selalu aktif (tombol `Baca dan terima` tampil di `/akun` selama versi kebijakan berlaku belum diterima). |

### 1.2 Komponen, Modul, Hook, dan Rute API v1
- **Kartu data akun & identitas (`components/screens/AkunScreen.tsx`):**
  - `AjakanVerifikasiEmail` (`components/screens/VerifikasiEmail.tsx`): hanya tampil untuk akun lama yang punya email dan `email_terverifikasi === false` (`POST /auth/email/kirim-kode`, `POST /auth/email/verifikasi`).
  - `KartuJalur` & `FormJalur`: menampilkan `nama_tampilan`, `kelas`, `jenis_sekolah`, `prodi_impian`, `gaya_belajar`; ubah lewat `useUbahProfil()` → `PATCH /pengguna/saya`.
  - Pintu `Profil Saya` (`/cek-posisi`): hanya untuk non-SMP (`tampilPintuJalurSaya(pengguna.kelas)`).
  - `RingkasanKemajuan`: kemajuan Daftar Periksa (`useProgresDaftarPeriksa`, tombol ke `/daftar-periksa`).
  - Kartu **Akun**: baris `Nama pengguna`, `Email`, `Kebijakan privasi` (`usePersetujuan()` → `GET /persetujuan/saya`), `Persetujuan orang tua/wali` (`ortu_wali_aktif`), tombol `Baca dan terima` ke `/terima-kebijakan` bila belum diterima, catatan singkat persetujuan orang tua/wali, dan tautan `Baca kebijakan privasi` ke `/kebijakan-privasi`. **Tidak ada halaman bantuan terpisah di `/akun` v1.**
  - Tombol **Keluar**: memanggil `keluar()` dari `AuthProvider` (`POST /auth/keluar` lalu pembersihan lokal).
- **Unduh data & hapus akun (`components/screens/HapusAkunScreen.tsx`, `hooks/useDataAkun.ts`, `lib/dataAkun.ts`, `lib/eksporSementara.ts`, `api/auth.ts`):**
  - `BagianDataSaya` (hanya dirender bila `KELOLA_DATA_AKUN` menyala):
    - Tombol **Unduh data saya** → `useUnduhDataSaya()` → `eksporDataSaya(token)` (`GET /pengguna/saya/ekspor`).
    - Di peramban: mengunduh berkas JSON (`data-lanjut-<nama>-<tanggal>.json`) lewat `Blob` + `<a download>`.
    - Di HP: `bagikanEkspor()` (`lib/eksporSementara.ts`) menulis ke folder cache sementara `EksporData`, membagikan lewat `expo-sharing`, lalu menghapus folder `EksporData` di blok `finally`.
    - Tombol **Hapus akun saya** → navigasi ke `/hapus-akun`.
  - `HapusAkunScreen` (`/hapus-akun`):
    - Menjelaskan apa yang ikut terhapus (`YANG_IKUT_TERHAPUS`) dan yang tidak bisa dihapus dari sini (`YANG_TIDAK_TERHAPUS`), serta menegaskan tindakan permanen dan tidak bisa dibatalkan.
    - Penegasan eksplisit berupa kotak centang (`paham`, wajib dicentang) yang oleh klien diterjemahkan menjadi medan `penegasan: PENEGASAN_HAPUS_AKUN` (`'HAPUS AKUN SAYA'`, identik dengan `server/src/modul/data-pengguna/data-pengguna.skema.js`).
    - Konfirmasi identitas ulang: **kata sandi** (`secureTextEntry`, wajib tidak kosong), atau alih ke **kode email** 6 angka (`useKirimKodeHapus()` → `POST /pengguna/saya/hapus/kirim-kode`) hanya bila `bisaPakaiKodeEmail(pengguna)` benar (akun punya email terverifikasi).
    - Validasi klien `siapHapus({ paham, metode, kataSandi, kodeEmail })`: menolak mengirim permintaan apa pun bila kotak belum dicentang atau identitas ulang kosong/belum 6 angka.
    - Pengiriman: `useHapusAkun()` → `hapusAkunSaya(token, badanHapusAkun(isian))` → **`DELETE /pengguna/saya`**; pada `onSuccess` langsung memanggil `selesaiHapusAkun()`.
- **Mode tampilan v2 (`lib/modeTampilan.ts`, `lib/simpanModeTampilan.ts`, `components/screens/v2/PilihModeTampilanV2.tsx`, `components/screens/v2/TemaV2Provider.tsx`):**
  - Di balik saklar `EXPO_PUBLIC_MODE_GELAP` (mati bawaan).
  - Tiga pilihan: `Ikuti sistem` (`sistem`), `Terang` (`terang`), `Gelap` (`gelap`).
  - Disimpan **hanya di perangkat** lewat AsyncStorage biasa (`KUNCI_MODE_TAMPILAN = 'lanjut.modeTampilan.v2'`), tidak pernah dikirim ke server dan tidak memakai penyimpanan aman.
  - Pada 031b, `AppShellV2.tsx` menyisipkan `<PilihModeTampilanV2 />` di atas `/akun` saat `modeGelap && pathname === '/akun'` karena `/akun` saat itu masih layar v1. Pada 037, saat `AkunPrivasiV2` aktif (`NAVIGASI_V2=1` & `KELOLA_DATA_AKUN=1`), kartu **Tampilan** tampil di posisi ke-2 di dalam `AkunPrivasiV2` (sesudah kartu **Akunku**) dan `AppShellV2` tidak menggandakannya.

---

## 2. Dua Jalan Menuju Akun & Privasi di Navigasi v2

1. **Saat Jelajah menyala (`EXPO_PUBLIC_DISCOVER=1`):**
   - Tab bawah **Profil Saya** membuka `/discover-profil` (`ProfilEksplorasiV2`, LANJUT_034).
   - `AppShellV2` merender kartu pintu **Akun & Privasi** (`PINTU_TAB_V2`: `{ diRute: '/discover-profil', keHref: '/akun', label: 'Akun & Privasi' }`) di bagian atas `/discover-profil` → mengetuknya membuka `/akun`.
2. **Saat Jelajah mati (`EXPO_PUBLIC_DISCOVER=0`):**
   - Tab bawah **Profil Saya** (`KONFIGURASI_TAB_V2` di `lib/navigasiV2.ts`) memakai `hrefCadangan: '/akun'`, sehingga mengetuk tab **Profil Saya** langsung membuka `/akun` (dengan 3 tab merata: Arah Saya, Jejak Waktu, Profil Saya).

Kedua jalan ini tetap utuh tanpa mengubah `KONFIGURASI_TAB_V2` maupun `PINTU_TAB_V2`.

---

## 3. Perilaku Saklar `EXPO_PUBLIC_KELOLA_DATA_AKUN` & Pola Layar v2

- **Saat `EXPO_PUBLIC_KELOLA_DATA_AKUN` mati (`0` / tidak diset):**
  - `app/(app)/akun.tsx` merender `AkunScreen` v1 (yang menyembunyikan `<BagianDataSaya />`, sehingga tidak ada tombol unduh data maupun hapus akun).
  - `app/(app)/hapus-akun.tsx` langsung mengalihkan ke `/akun` (`<Redirect href="/akun" />`).
  - Di dalam `AkunPrivasiV2.tsx` sendiri juga terdapat penjaga lapis kedua `kelolaDataAkunAktif(...)` sehingga kartu **Datamu** dan **Hapus akun** tidak pernah dirender saat saklar mati.
- **Saat `EXPO_PUBLIC_NAVIGASI_V2` mati (`0` / tidak diset):**
  - `/akun` merender `AkunScreen` v1 dan `/hapus-akun` merender `HapusAkunScreen` v1 persis seperti sebelumnya.
- **Pola layar v2 yang diikuti (`ProfilEksplorasiV2`, `JelajahV2`, `RekamJejakV2`, `AppShellV2`):**
  - Hanya memakai komponen `components/v2` (`Teks`, `Tombol`, `Isian`, `Kartu`, `Sentuh`, `Ikon` Phosphor, `PesanStatus`) dan token dua mode `theme/v2` (`useTemaV2`, `ruang`, `radius`, `garis`, `elevasi`, `ukuran`, `keluargaHuruf`) — **0 kode HEX langsung**, tanpa warna ungu EDILAKSO, tanpa `Pressable`/`TouchableOpacity`/`TextInput` mentah.
  - Bayangan kartu hanya di mode terang (`mode === 'terang' ? elevasi.angkat : elevasi.datar`); target sentuh minimal `44 pt` lewat `Sentuh`/`Tombol`/`Isian`; semua kontrol berlabel (`accessibilityRole`/`Label`/`State`); penanda status selalu tertulis + ikon (bukan warna saja); menghormati skala font dan `KeyboardAvoidingView` pada layar konfirmasi hapus akun.

---

## 4. Penyebab Email Terpotong di v1 & Cara v2 Menanganinya

- **Penyebab di v1 (`components/screens/AkunScreen.tsx:326-344`):**
  1. Komponen `Baris` menata label (`Email`) dan nilai email secara menyamping (`flexDirection: 'row'`, `justifyContent: 'space-between'`), sehingga ruang mendatar untuk alamat email sangat sempit pada layar 360 px.
  2. Alamat email panjang tidak memiliki spasi sehingga sulit terbungkus rapi dalam kolom kanan sempit.
  3. `<Text ... numberOfLines={2}>` memotong paksa alamat email panjang menjadi `…` setelah dua baris tanpa cara melihat teks utuhnya.
- **Penanganan di v2 (`AkunPrivasiV2.tsx`):**
  - Pada kartu **Akunku**, label (`Email`) dan nilai alamat email disusun **bertumpuk ke bawah (vertikal)** selebar penuh kartu (`width: '100%'`, `minWidth: 0`), **tanpa `numberOfLines` (`baris` tidak diset)**, sehingga alamat email panjang pindah baris secara alami dan tampil **100% utuh** tanpa pernah terpotong elipsis.

---

## 5. Fungsi Pembersihan Saat Keluar Akun & Setelah Hapus Akun

Semua pembersihan terpusat di `providers/AuthProvider.tsx` dan dipakai ulang langsung oleh layar v2 (`useSesi().keluar` dan `useHapusAkun()` → `useSesi().selesaiHapusAkun`):

1. **Saat Keluar (`keluar()` di `AuthProvider.tsx:148-162`):**
   - Memanggil `authApi.keluar(token)` (`POST /auth/keluar` + `hapusSesiLokal()` yang membuang token dari penyimpanan aman & AsyncStorage serta menghapus `auth_pengguna`).
   - Memanggil `hapusDataAkun(queryClient)`:
     - Membuang seluruh 12 kunci cache React Query milik akun (`KUNCI_DATA_AKUN`: `kemajuan`, `butir_pribadi`, `kartu`, `sesi_latihan`, `persetujuan`, `modul`, `levelin`, `event_sekolah`, `pilihan_mapel`, `jalur_tujuan`, `discover`, `butir_bukti`).
     - Jika `PORTOFOLIO` aktif: memanggil `hapusFotoSementara()` (`ImagePicker`, `ImageManipulator`).
     - Jika `KELOLA_DATA_AKUN` aktif: memanggil `hapusEksporSementara()` (`EksporData`).
   - Mengosongkan state sesi (`setStatus('keluar')`) → penjaga `app/(app)/_layout.tsx` mengarahkan ke `/masuk`.
2. **Setelah Hapus Akun (`selesaiHapusAkun()` di `AuthProvider.tsx:165-175`, dipanggil oleh `useHapusAkun().onSuccess`):**
   - Memanggil `authApi.hapusSesiLokal()` (membuang token di penyimpanan aman & AsyncStorage + `auth_pengguna`).
   - Memanggil `authApi.hapusProfilLokalAkun(penggunaId)` (menghapus profil lokal akun dan tanda arah `lanjut.arah.v2:<id>`).
   - Memanggil `hapusDataAkun(queryClient)` (membuang seluruh 12 kunci cache React Query, foto sementara, dan berkas ekspor sementara).
   - Menyetel `setAlasanKeluar('akun_dihapus')` dan `setStatus('keluar')` → mengembalikan ke layar awal `/masuk` dengan pemberitahuan `"Akunmu sudah dihapus."`.
