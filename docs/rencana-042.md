# Peta & Rencana LANJUT_042 — Jejak Waktu Jujur & Langkah Saya Semua Jenjang

> **Status:** Langkah 1 (peta dan rencana sebelum mengubah kode).
> **Dasar pemeriksaan:** `LANJUT_App` pada cabang tetap `lanjut-v2-dev` sejajar `origin/main` (`6eff750`, memuat LANJUT_041 `500ed00`), lingkungan dev `lanjut_dev` (`127.0.0.1:3309`, `NODE_ENV=development`).
> **Batasan tegas:** perubahan **klien saja** di balik saklar `EXPO_PUBLIC_NAVIGASI_V2` (mati bawaan), tanpa perubahan server (`server/src`), API, skema, migrasi, `eas.json`, `app.config.ts`, `lib/kebijakan-privasi.json`, `docs/persetujuan-teks-rilis.json`, `kompatibel-apk-lama.test.js`, maupun perilaku layar v1 saat saklar mati.

---

## 1. Peta Jejak Waktu per Jenjang × Kelas (Sebelum LANJUT_042)

Sumber data saat ini:
- **Kelas 12:** `GET /konten/linimasa` (`hooks/useTahapanLinimasa.ts`) → `tahapan_linimasa` (biji dari `server/data-konten/linimasa.json`). Disaring ketat di `lib/jejakWaktuV2.ts:337` hanya yang `status_verifikasi === 'terverifikasi'` dan `diperiksa_pada != null`.
- **SMP (7–9):** `GET /pengguna/event` (`hooks/useEventSekolah.ts`), hanya bila saklar server `event_sekolah_aktif = 1` (di `lanjut_dev` saat ini `0`, dan `event_sekolah` berjumlah `0` baris).
- **Kelas 10–11:** tidak ada tabel jadwal di server; `susunJejakWaktu()` mengembalikan `total: 0`.

### Entri 29 November 2026 (rincian persis dari sumber)
- **ID:** `susulan-tka` (`server/data-konten/linimasa.json:42-51`)
- **Judul:** `Pelaksanaan susulan TKA`
- **Rentang tanggal:** `2026-11-16` s.d. `2026-11-29` (`16 – 29 November 2026`)
- **Jalur seleksi:** `TKA`
- **Asal:** `resmi` (siaran pers Kemendikdasmen 7 Juli 2026)
- **URL sumber:** `https://www.kemendikdasmen.go.id/siaran-pers/15707-kemendikdasmen-tetapkan-pendaftaran-tka-2026-dimulai-pada-27-juli-2026` (`lembagaSumber` → `"laman resmi Kemendikdasmen"`)
- **Status di `lanjut_dev` (tercatat pada `docs/audit-siap-tester.md:219,225`):** `status_verifikasi = 'terverifikasi'`, **`diperiksa_pada = '2026-09-27'`** (sumber dan tanggal periksa tercatat di basis data).
- *Catatan:* dua entri setelahnya di `linimasa.json` (`pdss` 1–31 Des 2026 & `daftar-snbp` 4–18 Feb 2027) ber-`asal: "mockup"` dan `status_verifikasi = 'belum_diverifikasi'` (`diperiksa_pada = null`), sehingga **disembunyikan** oleh klien dan **tidak diubah**.

### Tabel Jejak Waktu per Jenjang × Kelas (Sebelum LANJUT_042)

| Jenjang | Kelas | Tampil sekarang (27 Nov 2026, data `lanjut_dev`) | Tampil bila hari ini = **30 Nov 2026** (sebelum 042) | Keadaan kosong sebelum 042 |
|---|---|---|---|---|
| **SMP** | 7 | Kosong (`event_sekolah_aktif=0`, 0 event) | Kosong (0 entri) | Maskot `#B4E1EB` + *"Belum ada jadwal saat ini"* / *"Siapkan langkahmu pelan saja."* + tombol ke **Jelajah** (`/discover`, kosong bagi penguji!) bila `DISCOVER=1`, atau **Langkah Saya** bila mati |
| **SMP** | 8 | Sama seperti kelas 7 | Sama seperti kelas 7 | Sama seperti kelas 7 |
| **SMP** | 9 | Sama seperti kelas 7 | Sama seperti kelas 7 | Sama seperti kelas 7 |
| **SMA/SMK/MA** | 10 | Kosong (tidak ada sumber jadwal kelas 10–11) | Kosong (0 entri) | Sama: mengarah ke **Jelajah** (`/discover`) saat `DISCOVER=1` |
| **SMA/SMK/MA** | 11 | Kosong (tidak ada sumber jadwal kelas 10–11) | Kosong (0 entri) | Sama: mengarah ke **Jelajah** (`/discover`) saat `DISCOVER=1` |
| **SMA/SMK/MA** | 12 | **Segera (1):** `Pelaksanaan susulan TKA` (16–29 Nov 2026, `2 hari lagi`, `Sedang berlangsung`, sumber Kemendikdasmen, dicek `27 September 2026`); **Berikutnya (0)**; **Sudah lewat (2, terlipat):** `Pendaftaran akun TKA` (27 Jul–27 Sep 2026) & `Pelaksanaan TKA` (26 Okt–8 Nov 2026) | **Bug tampilan kosong:** `segera = 0`, `berikutnya = 0`, `sudahLewat = 3` (`total = 3`). Karena `JejakWaktuV2.tsx:54` hanya memeriksa `total === 0`, layar **tidak menampilkan kartu kosong apa pun**, hanya tombol terlipat *"Sudah lewat (3)"* tanpa penjelasan kenapa jadwal 2027 belum muncul! | Sama generik (hanya muncul bila `total === 0`, tidak menyebut jadwal seleksi 2027 belum resmi maupun tanggal periksa) |

---

## 2. Peta Langkah Saya per Jenjang × Kelas saat `ALAT_BELAJAR` Mati (Sebelum LANJUT_042)

Saat `EXPO_PUBLIC_NAVIGASI_V2=1` dan `EXPO_PUBLIC_ALAT_BELAJAR=0` (keadaan APK penguji setelah LANJUT_040):

| Jenjang | Kelas | Mode (`modeLangkahSaya`) | Keadaan kosong (sebelum 042) | Keadaan terisi (sebelum 042) |
|---|---|---|---|---|
| **SMP** | 7 | `smp` | Bila `event_sekolah_aktif=1`: maskot + tombol lokal **"Tambah jadwal"** (`FormJadwalSmpV2`). Bila `event_sekolah_aktif=0` (`lanjut_dev` bawaan): maskot tanpa tombol. | Daftar `butir_pribadi` (bila ada: progres + centang + hapus) dan/atau seksi **"Jadwal sekolah"** (`Tambah jadwal`, ubah, hapus). Tanpa tombol ke rute v1. |
| **SMP** | 8 | `smp` | Sama seperti kelas 7 | Sama seperti kelas 7 |
| **SMP** | 9 | `smp` | Sama seperti kelas 7 | Sama seperti kelas 7 |
| **SMA/SMK/MA** | 10 | `sma1011` | **JALAN BUNTU:** maskot *"Belum ada langkah tersimpan"* tanpa tombol apa pun (`aksiKosongLangkahSaya` mengembalikan `null`). Tidak ada jalan menambah langkah di seluruh v2. | Progres + kelompok `butir_pribadi` (centang, batal-centang, hapus), tanpa tombol tambah langkah baru. |
| **SMA/SMK/MA** | 11 | `sma1011` | **JALAN BUNTU:** sama seperti kelas 10. | Sama seperti kelas 10. |
| **SMA/SMK/MA** | 12 | `kelas12` | Saring Kelas (`10`/`11`/`12`) & Jalur (`TKA`/`SNBP`/`SNBT`); sebelum pilih jalur tampil kartu *"Pilih jalur seleksimu dulu"*. Tanpa tombol tambah langkah pribadi. | Saring Kelas & Jalur + kartu progres + kelompok butir umum (`/konten/checklist`) + `butir_pribadi` (bila ada). Kedua pintu bawah v1 (`Tambah dari Pilih Mapel`, `Eksplorasi Kampus`) disembunyikan saat `ALAT_BELAJAR=0`, sehingga tidak ada tombol tambah langkah pribadi. |

---

## 3. Kontrak v1 Pembuatan Butir Pribadi "Riset Prodi"

Hasil penelusuran kode pada `components/screens/EksplorasiTujuanScreen.tsx:221-247`, `hooks/useButirPribadi.ts:22-30`, `hooks/useProdi.ts:1-12`, `server/src/modul/butir-pribadi/butir-pribadi.skema.js:7-25`, dan `server/src/modul/butir-pribadi/butir-pribadi.layanan.js:12-70`:

- **Hook daftar prodi:** `useProdi()` → `GET /api/v1/konten/prodi`. Mengembalikan **19 prodi** (`server/data-konten/prodi.json`) dalam 4 rumpun (`Teknologi & Rekayasa`: 6, `Kesehatan`: 5, `Ekonomi & Bisnis`: 5, `Sosial & Humaniora`: 3). Di v1 (`PilihMapelScreen.tsx:153-195`, `EksplorasiTujuanScreen.tsx:68-102`), prodi dikelompokkan per rumpun tanpa kolom pencarian; di v2 kita tambahkan pengelompokan per rumpun **dan** pencarian opsional ringan agar 19 prodi tetap ringkas dan nyaman pada lebar 360 px.
- **Hook simpan butir:** `useSimpanButirPribadi()` → `POST /api/v1/butir-pribadi` (memerlukan token `Bearer`, menginvalidasi `KUNCI_BUTIR_PRIBADI = ['butir_pribadi']` saat berhasil).
- **Payload persis v1:**
  ```json
  { "jenis": "riset_kampus", "prodi_id": "<id-prodi>" }
  ```
- **Validasi & batas panjang (`butir-pribadi.skema.js:7,21-24`):**
  - `jenis`: literal `'riset_kampus'` (bukan jenis baru).
  - `prodi_id`: `string`, di-trim, panjang `1..64` karakter, harus ada di tabel `prodi`.
  - Tidak ada field lain (medan lain dibuang Zod; judul tidak dikirim dari klien).
- **Perilaku server (`butir-pribadi.layanan.js:14,40,56-70`):**
  - Menyusun judul otomatis: `"Cari tahu lebih lanjut soal ${namaProdi}"`.
  - Kategori: `kategori_id: 'riset-kampus'`, `kategori_nama: 'Riset Kampus'`.
  - Status awal: `selesai_pada: null` (belum tercentang — bisa dicentang/batal-centang lewat `PUT/DELETE /butir-pribadi/:id/selesai` dan dihapus lewat `DELETE /butir-pribadi/:id`).
  - Idempoten untuk pasangan `(pengguna_id, 'riset_kampus', prodi_id)`: simpan ulang mengembalikan `200` dengan ID yang sama tanpa menggandakan baris.
  - Galat server yang mungkin terjadi: `429` batas laju (`TERLALU_BANYAK_PERMINTAAN`), `400/422` validasi (`VALIDASI_GAGAL`), atau galat jaringan (`ApiError` / gagal fetch).

---

## 4. Pendekatan, Berkas yang Disentuh, dan Risiko Tes Lama

### Pendekatan
1. **Sumber tunggal fakta jadwal 2027 (Langkah 2A):**
   - Tambahkan satu blok fakta pada **`server/data-konten/linimasa.json`** (tanpa mengubah satu pun dari 6 butir di `data[]` dan tanpa menyentuh `server/src/`):
     ```json
     "status_jadwal_berikutnya": {
       "judul": "Jadwal seleksi 2027",
       "status": "belum_resmi",
       "sumber": "snpmb.id (beranda)",
       "diperiksa_pada": "2026-11-27"
     }
     ```
   - `lib/linimasa.ts` mengimpor `server/data-konten/linimasa.json` dan mengekspor `STATUS_JADWAL_BERIKUTNYA` serta fungsi murni pemeriksa kesegaran `periksaKesegaranJadwal(status, sekarangMs)` (peringatan `"jadwal perlu diperiksa ulang"` bila `diperiksa_pada` lebih tua dari **14 hari** kalender WIB).
   - `server/tools/audit-siap-tester.js` memanggil pemeriksa kesegaran tersebut dan mencetaknya sebagai peringatan non-gagal (tidak pernah mengembalikan exit code gagal).
   - `lib/jejakWaktuV2.ts` & `JejakWaktuV2.tsx`:
     - Memisahkan **`adaJadwalAktif = jadwal.segera.length > 0 || jadwal.berikutnya.length > 0`**. Bila `!adaJadwalAktif`, kartu keadaan kosong jujur per jenjang **selalu tampil** (sekalipun `sudahLewat.length > 0`, seperti kelas 12 pada 30 Nov 2026 — lipatan `Sudah lewat` tetap muncul rapi di bawahnya).
     - **Kelas 12 tanpa jadwal aktif:** membaca `status_jadwal_berikutnya` dari data (tidak pernah menulis tanggal tetap di komponen), menyatakan jadwal resmi seleksi 2027 belum diumumkan SNPMB, tanggal belum resmi tidak ditampilkan, dan menampilkan tanggal periksa + sumber dari data (`Dicek 27 November 2026 · snpmb.id (beranda)`). Begitu ada entri aktif di `segera` atau `berikutnya`, kartu kosong ini hilang otomatis.
     - **Kelas 10–11 & SMP tanpa jadwal aktif:** menyatakan jujur bahwa jadwal resmi untuk jenjang tersebut belum tersedia di LANJUT, tanpa mengarang tanggal, dan **tombol tunggal selalu menuju `Langkah Saya` (`/langkah-saya`), tidak pernah menuju `Jelajah` (`/discover`) atau `Jalur Saya` (`/jalur-tujuan`)**.
2. **Langkah Saya tidak buntu — Opsi A (Langkah 2B):**
   - Tambahkan fungsi murni baru di `lib/langkahSayaV2.ts`:
     - `aksiTambahRisetProdi(kelas)`: mengembalikan `{ jenis: 'riset_prodi', label: TEKS_LANGKAH_SAYA.tambahRisetProdi }` untuk kelas `'10' | '11' | '12'`, dan `null` untuk SMP (`'7' | '8' | '9'`) maupun kelas kosong.
     - `bentukKirimanRisetProdi(prodiId)`: menyusun payload persis v1 `{ jenis: 'riset_kampus', prodi_id }`.
     - `saringDaftarProdi(daftar, kataKunci)` & `kelompokkanProdiPerRumpun(daftar)` serta `pesanGalatRisetProdi(galat)` (termasuk batas laju `429` dan jaringan).
   - Tambahkan alur modal 2 langkah v2 (`ModalRisetProdiV2`) di dalam `LangkahSayaV2.tsx` (pola sama dengan `JalurSayaV2.tsx`, menghormati `useKurangiGerak()`, tanpa menambah rute baru, tanpa menyentuh 17 rute v1):
     - **Langkah 1:** pilih prodi (pencarian opsional + daftar per rumpun, penanda teks *"Sudah ada"* bila sudah tersimpan, keadaan memuat/kosong/galat dengan ikon & kalimat).
     - **Langkah 2:** satu layar konfirmasi menampilkan prodi terpilih + tombol *"Simpan langkah"* (`useSimpanButirPribadi`) dan *"Pilih prodi lain"*. Setelah tersimpan, modal menutup dan langkah langsung muncul di Langkah Saya (dapat dicentang & dihapus).
   - Tombol **"Tambah langkah riset prodi"** tampil untuk:
     - Kelas 10–11 pada keadaan kosong **dan** di bawah daftar saat sudah terisi.
     - Kelas 12 di bawah daftar (dan saat keadaan kosong / sebelum pilih jalur).
     - **Tidak pernah tampil untuk SMP (7–9)**; tombol lokal **"Tambah jadwal"** SMP tetap utuh.

### Berkas yang Disentuh
- `server/data-konten/linimasa.json` (hanya tambah blok `status_jadwal_berikutnya`, 0 perubahan pada `data[]`)
- `lib/linimasa.ts` (ekspor `STATUS_JADWAL_BERIKUTNYA` & `periksaKesegaranJadwal`)
- `lib/jejakWaktuV2.ts`, `hooks/useJejakWaktuV2.ts`, `components/screens/v2/JejakWaktuV2.tsx`
- `lib/langkahSayaV2.ts`, `hooks/useLangkahSayaV2.ts`, `components/screens/v2/LangkahSayaV2.tsx`
- `server/tools/audit-siap-tester.js` (pemeriksa kesegaran 14 hari non-gagal)
- `server/tests/muat-ts-app.js` (dukungan 2 baris untuk impor `.json` agar `muatModulApp('lib/linimasa')` berjalan)
- `docs/rencana-042.md`, `docs/draf-teks-jejak-waktu-v2.md`, `docs/uji-hp-expo-go.md`, `docs/periksa-layar-042/`
- `server/tests/jejak-waktu-langkah-saya-042.test.js` (tes baru + sabotase)

### Risiko pada Tes Lama & Cara Menghindarinya (0 Tes Lama Dilonggarkan)
1. **`alat-belajar-saklar-040.test.js:246-265`:** mengunci `aksiKosongLangkahSaya({ kelas: '10', bisaEventSmp: false, alatBelajar: false }) === null` serta regex `ALAT_BELAJAR ? (... s.barisPintuBawah ...)` dan `ALAT_BELAJAR && materi.buka === 'arsip'` di `LangkahSayaV2.tsx`. **Solusi:** pertahankan `aksiKosongLangkahSaya` persis seperti 040, dan kenalkan fungsi terpisah `aksiTambahRisetProdi(kelas)` sehingga tombol riset prodi tidak melanggar kontrak 040 dan tetap 0 rujukan ke 17 rute v1.
2. **`alat-belajar-saklar-040.test.js:364-365`:** mengunci `totalRuteSiswaV2 === 15`. **Solusi:** gunakan `Modal` v2 di dalam `LangkahSayaV2.tsx` (tanpa menambah berkas rute baru di `app/(app)/`).
3. **`jejak-waktu-langkah-saya-v2.test.js:272-279`:** melarang `setInterval`/`setTimeout`/`requestAnimationFrame`, kata `detik`/`menit`/`jam lagi`, dan `warna.galat` pada `JejakWaktuV2.tsx`. **Solusi:** tidak memakai pewaktu maupun warna galat di `JejakWaktuV2`.
4. **`jejak-waktu-langkah-saya-v2.test.js:399-419,477-482`:** memanggil `teksTetapJejakWaktu` & `teksTetapLangkahSaya` dengan argumen lama dan memeriksa setiap nilai `Object.values(TEKS_JEJAK_WAKTU)` serta `Object.values(TEKS_LANGKAH_SAYA)` tercantum di `docs/draf-teks-jejak-waktu-v2.md`. **Solusi:** semua nilai di kedua objek teks tetap berupa string datar dan dicatat persis di dokumen draf, serta semua parameter tambahan pada fungsi `teksTetap*` bersifat opsional dan ≤ 40 kata.
5. **`jejak-waktu-langkah-saya-v2.test.js:429-450`:** uji AST melarang `Pressable`/`TouchableOpacity`/`TextInput` langsung di `JejakWaktuV2.tsx` & `LangkahSayaV2.tsx` dan mewajibkan `label` pada semua `<Sentuh>`, `<Tombol>`, `<Isian>`. **Solusi:** hanya memakai komponen `components/v2` dengan label lengkap.
6. **`perbaikan-mode-gelap-039.test.js:290` & `rekam-jejak-v2.test.js:470`:** memeriksa `git status` pada `server/src`, `kompatibel-apk-lama.test.js`, `docs/persetujuan-teks-rilis.json`, `eas.json`, `app.config.ts`. **Solusi:** berkas-berkas tersebut 0 perubahan, dan suite penuh dijalankan setelah commit.
