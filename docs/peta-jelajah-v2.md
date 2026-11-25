# Peta Inventaris Jelajah dan Profil Eksplorasi v2 (LANJUT_034)

> **Status:** inventaris faktual sebelum perubahan kode, diperiksa langsung dari kode sumber di `LANJUT_App` (`app/`, `components/`, `hooks/`, `lib/`, `api/`, `server/src/modul/discover/`, `server/src/db/migrasi/`, dan `server/data-konten/`).
> **Aturan nama (K47):** nama rute (`/discover`, `/discover-refleksi`, `/discover-profil`), saklar (`EXPO_PUBLIC_DISCOVER`, `EXPO_PUBLIC_NAVIGASI_V2`), kunci API, dan tabel basis data **tidak berubah**. Hanya label tampilan v2 yang memakai **Jelajah** dan tab **Profil Saya**.

---

## 1. Inventaris Lengkap v1 Discover dan Profil Eksplorasi

### 1.1 Rute aplikasi (`app/(app)/`)

Semua rute berikut berada di balik saklar build `EXPO_PUBLIC_DISCOVER` (mati bawaan di `app.config.ts`, diblokir dari bundel oleh `metro.config.js` saat mati, dan dijaga lapis kedua `<Redirect href="/linimasa" />`):

| Rute | Berkas | Komponen v1 | Catatan parameter |
|---|---|---|---|
| `/discover` | `app/(app)/discover.tsx` | `DiscoverScreen` | Daftar kartu + tombol ke profil |
| `/discover-refleksi` | `app/(app)/discover-refleksi.tsx` | `RefleksiScreen` | Query `?kartu=<id>` untuk refleksi satu kartu |
| `/discover-profil` | `app/(app)/discover-profil.tsx` | `ProfilEksplorasiScreen` | Profil eksplorasi berversi + riwayat versi |

### 1.2 Komponen, hook, dan logika murni v1

- **Layar v1 (`components/screens/DiscoverScreens.tsx`):**
  - `KeadaanLayar`: menangani `memuat` (`<Memuat />`), `fitur_mati` (`404`), `perlu_kebijakan` (`403 AI_BELUM_DIIZINKAN` + tombol `/terima-kebijakan`), `jaringan`, dan `server` (+ tombol `Coba lagi`).
  - `DiscoverScreen` & `BarisKartu`: menampilkan judul/pengantar, lencana `Teks draf`, tombol `Lihat profil eksplorasimu` → `/discover-profil`, keadaan kosong `Kartu belum tersedia.`, atau daftar kartu (`LABEL_JENIS_KARTU[kartu.jenis]`, lencana `Sudah kamu tulis` bila kartu ada di `refleksi.data`, `kartu.judul`, `kartu.ringkasan`, `Sumber: <url_sumber>` bila ada, dan tautan `Tulis refleksi` / `Ubah refleksi`). **Di v1 belum ada layar rincian terpisah**: mengetuk kartu langsung membuka `/discover-refleksi?kartu=<id>`.
  - `RefleksiScreen`, `TidakDitemukan`, & `FormRefleksi`: menampilkan `kartu.judul`, `kartu.ringkasan`, pilihan 3 ketertarikan (`Tertarik`, `Belum yakin`, `Kurang tertarik`), dua kolom `multiline` (`Apa yang menarik buatmu?` dan `Apa yang kurang menarik buatmu?`, masing-masing `maxLength={280}`), kalimat privasi `TEKS_DISCOVER.privasi`, pesan galat, dan 1 tombol `Simpan`.
  - `ProfilEksplorasiScreen`, `IsiProfil`, `BlokKartu`, `FormProfil`, & `Riwayat`: menampilkan versi terkini (`Versi ke-<nomor> · <tanggal> pukul <jam>`), blok per kartu (`blokProfil` mengutip kedua isian siswa apa adanya tanpa tafsiran), hitungan `refleksi_disembunyikan` bila ada refleksi pada kartu yang kembali draf, `catatan` pribadi, bagian `Dari Data Akun` (`minat_rumpun`, `mapel_pilihan`), bagian `Jalur dan tujuanmu` (`jalur`, `tujuan`), formulir catatan (`maxLength={500}`) dengan tombol `Susun profilku` / `Perbarui profilku`, serta bagian lipat `Lihat versi sebelumnya` (`GET /discover/profil/riwayat`).
- **Hook v1 (`hooks/useDiscover.ts`):** memakai kunci React Query `['discover']` (ikut dibersihkan `providers/AuthProvider.tsx` saat keluar/ganti sesi):
  - `useKartuDiscover()` → `GET /discover/kartu`
  - `useRefleksiSaya()` → `GET /discover/refleksi`
  - `useProfilEksplorasi()` → `GET /discover/profil`
  - `useRiwayatProfil(aktif)` → `GET /discover/profil/riwayat`
  - `useSimpanRefleksi()` → `PUT /discover/refleksi/:kartuId` (`{ ketertarikan, yang_menarik, yang_kurang_menarik }`)
  - `usePerbaruiProfil()` → `POST /discover/profil` (`{ catatan?: string | null }`)
  - *Catatan kunci isolasi:* `server/tests/discover-app.test.js:90-101` mengunci bahwa `DiscoverScreens` dan `useDiscover` hanya boleh diimpor dari keempat berkas v1 (`app/(app)/discover*.tsx` dan `DiscoverScreens.tsx`). Oleh karena itu layar v2 memakai hook sendiri (`hooks/useJelajahV2.ts`) dengan endpoint API dan kunci cache `['discover']` yang **persis sama**.
- **Logika murni v1 (`lib/discover.ts`):** `BATAS_DISCOVER = { refleksi: 280, catatan: 500 }`, `TEKS_DISCOVER`, `LABEL_JENIS_KARTU`, `PILIHAN_KETERTARIKAN`, `GALAT_ISIAN_DISCOVER`, `GALAT_UMUM_DISCOVER`, `pesanGalatDiscover`, `teksDisembunyikan`, `blokProfil`, `teksVersi`, `keadaanData`, `periksaIsianRefleksi`, `badanRefleksi`.

### 1.3 Rute API server dan fakta tentang fungsi "hapus"

Seluruh rute Discover pada `server/src/modul/discover/discover.rute.js` (hanya aktif saat `DISCOVER_AKTIF=1`, dijaga `wajibLogin` + `pastikanBoleh` kebijakan privasi):

| Metode | Rute API | Fungsi aktual di server |
|---|---|---|
| `GET` | `/api/v1/discover/kartu` | Daftar kartu aktif yang `status_teks = 'disetujui'` |
| `GET` | `/api/v1/discover/refleksi` | Daftar refleksi milik pengguna yang sedang masuk |
| `PUT` | `/api/v1/discover/refleksi/:kartuId` | Simpan baru atau perbarui refleksi satu kartu disetujui (`ON DUPLICATE KEY UPDATE`); teks kosong diubah menjadi `NULL` |
| `GET` | `/api/v1/discover/profil` | Versi aktif profil eksplorasi terkini + `jumlah_versi` |
| `POST` | `/api/v1/discover/profil` | Membuat versi baru profil eksplorasi (`catatan` maks 500 / `null`; `400 VALIDASI_GAGAL` bila tidak ada perubahan) |
| `GET` | `/api/v1/discover/profil/riwayat` | Seluruh versi profil lama ke baru (`versi_ke` 1..N menurut rantai `diubah_dari_id`) |

**Fakta aktual tentang "hapus" di kode v1 & server:**
1. **Server tidak memiliki endpoint `DELETE /api/v1/discover/refleksi/:kartuId` maupun `DELETE /api/v1/discover/profil`** (`server/src/modul/discover/discover.rute.js`, `refleksi-discover.repo.js`, `profil-eksplorasi.repo.js`), dan `server/tests/discover-app.test.js:108-113` memang menguji bahwa `useDiscover.ts` tidak memanggil `method: 'DELETE'`.
2. Di tabel `refleksi_discover` (`033_discover.sql`), kolom `ketertarikan` bertipe `NOT NULL`, sedangkan `yang_menarik` dan `yang_kurang_menarik` nullable (`VARCHAR(280) NULL`). Jadi lewat API v1 yang ada, **menghapus/mengosongkan tulisan refleksi** dilakukan dengan `PUT /api/v1/discover/refleksi/:kartuId` membawa `{ ketertarikan, yang_menarik: null, yang_kurang_menarik: null }`, dan **menghapus/mengosongkan catatan profil** dilakukan dengan `POST /api/v1/discover/profil` membawa `{ catatan: null }`.
3. **Penghapusan seluruh baris refleksi dan profil eksplorasi** terjadi secara penuh lewat `ON DELETE CASCADE` saat akun dihapus (`DELETE /api/v1/pengguna/saya`), dan keduanya juga ikut diekspor pada `GET /api/v1/pengguna/saya/ekspor` (`server/src/modul/data-pengguna/data-pengguna.layanan.js:35-41`).

---

## 2. Apakah Data Kartu atau Jalur Sudah Punya Bidang "Cara Belajar" / Tips per Jalur? (K51)

**Jawaban faktual: BELUM ADA.**

Diperiksa langsung dari skema basis data, repositori, layanan, dan data konten:
1. **`kartu_discover` (`server/src/db/migrasi/033_discover.sql`, `server/data-konten/discover.json`, `kartu-discover.repo.js`, `discover.layanan.js`):**
   - Kolom tabel hanya: `id`, `jenis` (`'bidang' | 'profesi' | 'usaha'`), `judul`, `ringkasan`, `status_teks`, `urutan`, `aktif`, `sumber`, `pemilik`, `status_verifikasi`, `asal`, `url_sumber`, `diperiksa_pada`.
   - Respons `GET /discover/kartu` (`bentukKartu`) hanya mengirim: `{ id, jenis, judul, ringkasan, url_sumber, diperiksa_pada }`.
   - **Tidak ada** kolom `cara_belajar`, `tips`, maupun `jalur_minat_id`.
2. **`jalur_minat` (`server/src/db/migrasi/030_model_data_v2.sql`, `server/data-konten/jalur-minat.json`, `jalur-minat.repo.js`):**
   - Kolom tabel hanya: `id`, `nama`, `deskripsi_singkat`, `status_teks`, `urutan`, `aktif`, `sumber`, `pemilik`, `status_verifikasi`, `asal`, `url_sumber`, `diperiksa_pada`.
   - Respons `GET /jalur-minat` hanya mengirim: `{ id, nama, deskripsi_singkat, status_teks, urutan }`.
   - **Tidak ada** kolom `cara_belajar` atau tips belajar per jalur.

**Implikasi langsung untuk layar Jelajah v2 (LANJUT_034 §2–§3):**
- Bagian **"Cara belajar"** **tidak ditampilkan** di layar selama data belum mendukung (tidak ada teks karangan atau placeholder palsu).
- **Tidak ada chip penyaringan menurut jalur** pada daftar kartu Jelajah, dan klien **tidak memetakan sendiri** `jenis` (`bidang`/`profesi`/`usaha`) ke `jalur_minat_id`.
- Usulan model data dan konten untuk K51 dicatat terpisah pada laporan untuk Khalifa (tidak dibangun pada task ini).

---

## 3. Pengenalan Kartu Disetujui di Klien & Keterkaitan ke Jalur

### 3.1 Bagaimana kartu disetujui dikenali
- **Di server (sumber kebenaran utama):** `kartu-discover.repo.js` (`daftarDisetujui` dan `ambilDisetujui`) menyaring `WHERE aktif = 1 AND status_teks = 'disetujui'`, lalu `discover.layanan.js:33-35` (`bentukKartu`) membentuk respons `{ id, jenis, judul, ringkasan, url_sumber, diperiksa_pada }`.
- **Perbedaan penting dengan `jalur_minat`:** payload `GET /discover/kartu` **tidak** menyertakan kolom `status_teks` maupun `aktif` (berbeda dari `GET /jalur-minat` yang menyertakan `status_teks: 'disetujui'`). Keenam kartu di `server/data-konten/discover.json` saat ini berstatus `draf`, sehingga di dev daftar kartu kosong sampai `npm run benih-persetujuan-dummy` dijalankan di `lanjut_dev` (menandai `bidang-kesehatan` sebagai `[DUMMY] Kesehatan`).
- **Penjaga lapis kedua di klien (`lib/jelajahV2.ts`):** fungsi `kartuDisetujuiSaja` tetap memeriksa apabila objek kartu membawa properti `status_teks` selain `'disetujui'` atau `aktif === false / 0`, maka kartu dibuang dan tidak pernah dirender.

### 3.2 Keterkaitan ke jalur dan penyamaran id mentah
- Tabel `kartu_discover` **tidak** memiliki kaitan ke `jalur_minat`.
- Jalur hanya muncul pada respons `GET /discover/profil` dan `GET /discover/profil/riwayat` melalui medan `profil.jalur: { id: string; nama: string }[]`. Di server (`discover.layanan.js:132,138`), `profil.jalur` sudah disaring hanya ke `rujukan.jalur` (daftar jalur `disetujui` dari `jalurMinatRepo.daftarDisetujui()`).
- Di klien v2 (`lib/jelajahV2.ts`), setiap entri `profil.jalur` tetap dilewatkan pembantu yang memanggil **`labelJalur` dari `lib/jalurSayaV2.ts`** sehingga id mentah jalur (`melanjutkan`, `bekerja`, `wirausaha`, dsb.) maupun teks draf tidak pernah tampil di layar atau label aksesibilitas.

---

## 4. Muara Tab "Profil Saya" dan Perilakunya Saat Jelajah Mati

Dikonfigurasi di satu tempat pada `KONFIGURASI_TAB_V2` (`lib/navigasiV2.ts:63-71`) dan `PINTU_TAB_V2` (`lib/navigasiV2.ts:127-130`):
- **Saat `EXPO_PUBLIC_DISCOVER=1`:**
  - Bilah bawah menampilkan 4 tab (`Arah Saya`, `Jelajah` → `/discover`, `Jejak Waktu`, `Profil Saya` → `/discover-profil`).
  - Saat berada di `/discover-profil`, `AppShellV2` (`components/screens/v2/AppShellV2.tsx:64,162-170`) otomatis menampilkan kartu pintu **`Akun & Privasi`** (`/akun`) di atas isi layar. Kartu pintu dari `LANJUT_031` ini dipertahankan utuh tanpa diubah.
- **Saat `EXPO_PUBLIC_DISCOVER` mati:**
  - `daftarTabV2` menyembunyikan tab `Jelajah` dan mengalihkan `href` tab `Profil Saya` ke `hrefCadangan: '/akun'`.
  - Bilah bawah menampilkan 3 tab merata (`Arah Saya`, `Jejak Waktu`, `Profil Saya` → `/akun`), dan rute `/discover*` keluar dari bundel Metro.
- Perilaku `lib/navigasiV2.ts` dan `AppShellV2.tsx` **tidak diubah** pada `LANJUT_034`.
