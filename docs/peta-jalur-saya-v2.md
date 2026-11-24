# Peta Jalur Saya v2 — Inventaris Pra-Perubahan (LANJUT_033)

> **Status:** inventaris faktual sebelum reskin **Jalur Saya** v2 (`/jalur-tujuan`, di balik saklar `EXPO_PUBLIC_JALUR_TUJUAN` dan `EXPO_PUBLIC_NAVIGASI_V2`, keduanya mati bawaan).
> **Aturan keras:** **tanpa perubahan server, skema, migrasi, `server/data-konten`, atau respons server.** Saat `EXPO_PUBLIC_NAVIGASI_V2` mati, layar v1 (`JalurTujuanScreens.tsx`) berjalan utuh seperti sekarang.

---

## 1. Semua layar, komponen, hook, rute API, dan fungsi v1 yang benar-benar ada di kode

### 1.1 Berkas rute & penjaga bundel
- `app/(app)/jalur-tujuan.tsx`: merender `JalurTujuanScreen` dengan penjaga lapis kedua `if (!jalurTujuanAktif(Constants.expoConfig?.extra)) return <Redirect href="/linimasa" />;`. Dikeluarkan dari bundel Metro di `metro.config.js` (`/[\\/]app[\\/]\(app\)[\\/]jalur-tujuan(-[a-z]+)?\.tsx$/`) saat `EXPO_PUBLIC_JALUR_TUJUAN !== '1'`.
- `app/(app)/jalur-tujuan-tulis.tsx`: merender `TujuanTulisScreen` (menerima parameter query opsional `?id=<tujuanId>` untuk pembaruan versi tujuan aktif) dengan penjaga bundel dan `<Redirect href="/linimasa" />` yang sama.
- **Catatan isolasi (`server/tests/jalur-tujuan-app.test.js:87-98`):** tes mengunci bahwa pengimpor `JalurTujuanScreens` dan `useJalurTujuan` di seluruh kode aplikasi hanya berkas rute `jalur-tujuan*.tsx` dan berkas layar Jalur & Tujuan sendiri, supaya permintaan jaringan fitur ini tidak pernah bocor ke luar rute bersaklar.

### 1.2 Komponen layar v1 (`components/screens/JalurTujuanScreens.tsx`)
1. `JalurTujuanScreen`: layar utama yang memuat daftar jalur disetujui (`useDaftarJalur`), semua babak pilihan siswa (`usePilihanJalur`), daftar tujuan terkini + prodi impian (`useDaftarTujuan`), serta linimasa perjalanan (`usePerjalanan`).
2. `BagianJalur`:
   - Menampilkan setiap jalur disetujui (`susunJalur`) sebagai kartu berisi `j.nama`, `j.deskripsi_singkat`, lencana `Sedang kamu jalani` bila punya babak `aktif`, tombol `Pilih jalur ini` (atau `Pilih lagi` bila `jumlahBabak > 0`) untuk memilih **satu atau lebih jalur sekaligus**, serta tombol `Jeda dulu` bila sedang aktif.
   - Menampilkan kartu netral `Jalur yang kamu pilih (belum tersedia)` (`pilihanTersembunyiAktif`) untuk setiap babak berstatus `aktif` yang `jalur_belum_tersedia === true`, lengkap dengan satu tombol `Jeda dulu` tanpa tombol pilih ulang.
   - Menampilkan pesan kosong `Pilihan jalur belum tersedia. Sementara itu, kamu tetap bisa menulis tujuan.` bila daftar jalur dari server kosong (`jalur.length === 0`).
3. `DaftarTujuanSaya`, `KartuTujuan`, dan `RiwayatTujuan`:
   - Menampilkan `prodi_impian` dari Data Akun (bila terisi di profil siswa, hanya-baca dengan keterangan `Dari Data Akun`).
   - Menampilkan daftar tujuan terkini (`status !== 'diubah'`): judul, nama jalur terkait (bila jalur tersebut ada di daftar jalur disetujui) + tanggal `Target` (bila ada), uraian (`cerita singkat`), dan status (`Sedang dikejar` / `Tercapai` / `Ditinggalkan`).
   - Untuk tujuan berstatus `aktif`: tombol `Perbarui` (membuka `/jalur-tujuan-tulis?id=<id>`) dan tombol `Tandai tercapai`. Tidak ada tombol hapus.
   - Bila `jumlah_versi > 1`: tombol lipat `Lihat perubahan` / `Tutup perubahan` yang memanggil `useRiwayatTujuan(id, true)` dan menampilkan versi-versi sebelumnya dalam format bernomor dan berjam `Versi ke-<nomor> (<tanggal> pukul <jam>): <judul>` (`teksVersiTujuan`, sejak LANJUT_026).
4. `Perjalanan`: menampilkan riwayat gabungan peristiwa jalur dan tujuan dari `GET /tujuan/perjalanan` (terbaru di atas) memakai `teksPeristiwa`, dengan sisipan netral `(belum tersedia)` untuk peristiwa yang `jalur_belum_tersedia === true`.
5. `TujuanTulisScreen`, `FormTujuan`, dan `TidakDitemukan`:
   - Formulir satu tombol `Simpan` dengan 4 medan: `judul` (wajib, maks `200` karakter), `jalur` (opsional, hanya dari daftar jalur disetujui atau `Belum terkait jalur`), `uraian` (opsional, maks `2000` karakter), dan `target` (`YYYY-MM-DD` opsional, tanggal kalender sah).
   - Untuk tujuan baru: mengirim keempat medan (`POST /tujuan`). Untuk pembaruan versi (`awal` ada): `badanTujuan(isian, awal)` hanya mengirim medan yang berubah (`POST /tujuan/:id/versi`); bila tidak ada perubahan sama sekali, menolak di klien dengan `GALAT_ISIAN_TUJUAN.tidakBerubah`. Bila `id` di URL tidak ditemukan atau bukan berstatus `aktif`, merender `TidakDitemukan`.
6. `KeadaanLayar`: menangani lima keadaan non-siap berdasarkan `keadaanData`: `memuat` (`Memuat`), `fitur_mati` (`404` saat `JALUR_TUJUAN_AKTIF=0` di server), `perlu_kebijakan` (`403 AI_BELUM_DIIZINKAN` menuju `/terima-kebijakan`), serta `jaringan` / `server` dengan tombol `Coba lagi`.

### 1.3 Hook & rute API yang dipanggil (`hooks/useJalurTujuan.ts`)

| Hook klien | Metode & rute API | Kunci cache React Query | Fungsi |
|---|---|---|---|
| `useDaftarJalur` | `GET /jalur-minat` | `['jalur_tujuan', 'jalur']` | Mengambil daftar jalur aktif yang teksnya `disetujui` |
| `usePilihanJalur` | `GET /jalur-minat/saya` | `['jalur_tujuan', 'pilihan']` | Mengambil seluruh babak pilihan jalur milik siswa sendiri |
| `usePilihJalur` | `POST /jalur-minat/saya` (`{ jalur_minat_id }`) | invalidasi `['jalur_tujuan']` | Memulai babak `aktif` baru untuk satu jalur disetujui |
| `useJedaJalur` | `PATCH /jalur-minat/saya/:pilihanId` (`{ status: 'dijeda' }`) | invalidasi `['jalur_tujuan']` | Menjeda babak `aktif` milik sendiri (termasuk jalur yang kembali draf) |
| `useDaftarTujuan` | `GET /tujuan` | `['jalur_tujuan', 'tujuan']` | Mengambil tujuan terkini (`jumlah_versi`) + `prodi_impian` dari Data Akun |
| `useSimpanTujuan` | `POST /tujuan` atau `POST /tujuan/:id/versi` | invalidasi `['jalur_tujuan']` | Membuat tujuan baru atau membuat versi baru tanpa menimpa versi lama |
| `useTandaiTercapai` | `PATCH /tujuan/:id/status` (`{ status: 'tercapai' }`) | invalidasi `['jalur_tujuan']` | Menandai tujuan `aktif` sebagai `tercapai` |
| `useRiwayatTujuan` | `GET /tujuan/:id/riwayat` | `['jalur_tujuan', 'riwayat:<id>']` | Mengambil seluruh rantai versi tujuan beserta `versi_ke` (1..N) |
| `usePerjalanan` | `GET /tujuan/perjalanan` | `['jalur_tujuan', 'perjalanan']` | Mengambil urutan peristiwa pilihan jalur & versi tujuan |

*(Catatan: kunci `['jalur_tujuan']` terdaftar di `KUNCI_DATA_AKUN` pada `providers/AuthProvider.tsx` sehingga otomatis dibersihkan saat keluar atau berganti akun. Selain itu, `hooks/useArahV2.ts` dan `hooks/useArahSaya.ts` memanggil `/jalur-minat` dan `/jalur-minat/saya` langsung lewat `apiFetch` di bawah kunci cache yang sama agar isolasi `useJalurTujuan` tetap terjaga.)*

---

## 2. Audit tempat id jalur mentah dipakai, tampil, atau dikirim server

### 2.1 Di kode klien saat ini (`app/`, `components/`, `lib/`, `hooks/`)
1. **Tampilan kartu Jalur & Tujuan v1 (`JalurTujuanScreens.tsx`):**
   - `BagianJalur`: memakai `j.nama` untuk jalur disetujui dan `T.jalurTersembunyi` untuk `pilihanTersembunyiAktif`. Id `j.id` hanya dipakai sebagai `key={j.id}` React dan argumen `pilih.mutate(j.id)` (tidak tampil sebagai teks).
   - `KartuTujuan` (baris 185): memanggil `namaJalur(tujuan.jalur_minat_id)` yang mencari di `daftarJalur`. Bila `tujuan.jalur_minat_id` berisi id jalur yang kini kembali draf, `namaJalur` mengembalikan `''` (kosong — tidak membocorkan id mentah, tetapi juga belum menampilkan penanda netral bahwa tujuan tersebut terkait jalur yang belum tersedia).
   - `DaftarTujuanSaya` (baris 168): `data.prodi_impian.nama ?? data.prodi_impian.prodi_id` — cadangan `prodi_id` dapat menampilkan id prodi mentah bila baris prodi tidak ditemukan di tabel `prodi`. Di layar v2 cadangan id mentah ini tidak dipakai.
2. **Formulir tujuan v1 (`JalurTujuanScreens.tsx:276-308`):**
   - `jalurId` diisi dari `awal?.jalur_minat_id ?? null`. Hanya jalur di `daftarJalur` (disetujui) yang dirender sebagai `OpsiPil` (`label={j.nama}`). Bila `awal.jalur_minat_id` menunjuk ke jalur yang kembali draf, tidak ada pil yang tampak terpilih di v1, tetapi nilai `jalurId` tetap bertahan di state sehingga `badanTujuan(isian, awal)` tidak mengirim ulang `jalur_minat_id` draf ke server saat pengguna hanya memperbarui judul/uraian/target.
3. **Layar Arah Saya v2 (`lib/arahSaya.ts:98-116` & `components/screens/v2/ArahSayaV2.tsx:79-98`):**
   - `keadaanArahku` membangun `Map` hanya dari jalur dengan `j.status_teks === 'disetujui'`. Bila `b.jalur_belum_tersedia`, `!b.jalur_minat_id`, atau id tidak ditemukan di `Map` disetujui, fungsi mengembalikan `TEKS_ARAH_SAYA.jalurBelumTersedia` (`'Jalur belum tersedia'`). Pada `LANJUT_033`, logika penyamaran nama/label jalur ini disatukan ke satu fungsi pembantu murni `labelJalur(...)` agar dipakai bersama oleh **Jalur Saya v2** dan **Arah Saya v2**.
4. **Layar Kecenderungan Arah v2 (`lib/tandaArah.ts:36-47`):**
   - `opsiArah` menyaring `j.status_teks === 'disetujui'` dan memakai `nilai: j.id` hanya di memori untuk `jalurUntukDikirim`; yang tampil dan menjadi `accessibilityLabel` di `Pilihan` adalah `judul: j.nama`.
5. **Pesan galat (`lib/jalurTujuan.ts:109-123`):**
   - Semua kode galat server (`JALUR_SUDAH_DIPILIH`, `JALUR_BELUM_TERSEDIA`, `PILIHAN_SUDAH_BERAKHIR`, dll.) dipetakan ke kalimat statis bahasa Indonesia tanpa menyisipkan `jalur_minat_id`.
6. **Penanda berkas / penyimpanan lokal:**
   - Tidak ada berkas lokal atau kunci `AsyncStorage` yang menyisipkan `jalur_minat_id` (tanda kecenderungan memakai `lanjut.arah.v2:<penggunaId>` dengan nilai `'dijawab' | 'kosong'`).

### 2.2 Apakah server mengirim id jalur draf, dan kepada siapa?

Hasil pemeriksaan seluruh layanan server di `server/src/modul/`:

| Endpoint server | Berkas layanan | Apakah id jalur draf (`melanjutkan`/`bekerja`/`wirausaha`) terkirim? | Kepada siapa? |
|---|---|---|---|
| `GET /api/v1/jalur-minat` | `jalur-minat.layanan.js:daftarJalur` | **Tidak.** Hanya mengambil `WHERE aktif = 1 AND status_teks = 'disetujui'`. | — |
| `GET /api/v1/jalur-minat/saya`, `POST /saya`, `PATCH /saya/:id` | `jalur-minat.layanan.js:samarkanJalur` | **Tidak.** Sejak LANJUT_026 disamarkan menjadi `jalur_minat_id: null, jalur_belum_tersedia: true`. | — |
| `GET /api/v1/tujuan/perjalanan` | `tujuan.layanan.js:perjalanan` | **Tidak.** Memakai `samarkanJalur(...)` pada peristiwa pilihan jalur maupun peristiwa tujuan. | — |
| `GET /api/v1/discover/profil` & `/profil/riwayat` | `discover.layanan.js:bentukProfil` | **Tidak.** Menyaring `isi.jalur_minat_id.filter((id) => rujukan.jalur.has(id))` (hanya jalur disetujui). | — |
| **`GET /api/v1/tujuan` & `GET /api/v1/tujuan/:id/riwayat`** | **`tujuan.layanan.js:bentukTujuan` (baris 25–37)** | **YA — id mentah terkirim** pada medan `jalur_minat_id` (tanpa nama atau teks draf) bila tujuan dulu ditautkan ke jalur yang kini kembali draf/nonaktif. | **Hanya kepada siswa pemilik tujuan itu sendiri** (diisolasi `WHERE pengguna_id = ?`). Contoh nyata di dev: `demo_kelas12_p26` / `demo_kelas12` dari `benih-dummy.js`. |
| **`GET /api/v1/butir-bukti`, `GET /butir-bukti/:id`, `PATCH /tujuan/bukti/:butirId`** | **`butir-bukti.layanan.js:bentukButir` (baris 34–49)** | **YA — id mentah terkirim** pada medan `jalur_minat_id` (tanpa nama/teks draf) bila catatan bukti dulu ditautkan ke jalur yang kini kembali draf. | **Hanya kepada siswa pemilik butir bukti itu sendiri.** |
| `GET /api/v1/pengguna/saya/ekspor` | `data-pengguna.layanan.js:eksporDataV2` | **Ya (disengaja oleh desain LANJUT_026).** Menyertakan salinan baris tabel milik siswa apa adanya. | **Hanya kepada siswa pemilik akun saat mengunduh datanya sendiri.** |

**Usulan untuk server (dicatat saja, server TIDAK diubah pada task ini):**
- Pada task backend tersendiri, samakan `bentukTujuan` di `server/src/modul/tujuan/tujuan.layanan.js` dan `bentukButir` di `server/src/modul/butir-bukti/butir-bukti.layanan.js` supaya ikut memanggil `samarkanJalur(baris.jalur_minat_id, tersedia)` (mengirim `jalur_minat_id: null` + `jalur_belum_tersedia: true` ketika jalur sedang draf/nonaktif), sementara logika `perbarui` di `tujuan.layanan.js` tetap menyalin `lama.jalur_minat_id` di basis data bila klien tidak mengirim perubahan `jalur_minat_id`, dan `/pengguna/saya/ekspor` tetap dibiarkan utuh sebagai salinan data mentah milik siswa.
- **Penanganan di klien pada LANJUT_033:** fungsi tunggal `labelJalur(input, daftarDisetujui)` di `lib/jalurSayaV2.ts` tidak pernah meneruskan string id mentah ke layar, label aksesibilitas, maupun pesan galat — bila `jalur_minat_id` dari `GET /tujuan` tidak ditemukan di himpunan jalur berstatus `status_teks === 'disetujui'`, klien selalu mengembalikan label netral `'Jalur belum tersedia'`.

---

## 3. Cara jalur disetujui dikenali di klien

1. **Sumber server (`GET /api/v1/jalur-minat`):** repositori `server/src/modul/jalur-minat/jalur-minat.repo.js` (`daftarDisetujui`) menjalankan query `SELECT id, nama, deskripsi_singkat, status_teks, urutan FROM jalur_minat WHERE aktif = 1 AND status_teks = 'disetujui' ORDER BY urutan, id`.
2. **Pemeriksaan ganda di klien (`lib/jalurSayaV2.ts` & `lib/arahSaya.ts`):**
   - Tipe `JalurMinat` di `api/types.ts` (baris 385–391) memiliki medan `status_teks: StatusTeks` (`'draf' | 'disetujui'`).
   - Di klien, sebuah jalur hanya diakui sebagai **disetujui** apabila objeknya hadir di daftar `JalurMinat` **dan** `jalur.status_teks === 'disetujui'` (serta `jalur.nama.trim().length > 0`). Seandainya ada objek dengan `status_teks !== 'disetujui'` masuk ke klien, penyaring klien membuangnya sehingga nama, id mentah, dan `deskripsi_singkat` draf tidak pernah dirender.
   - Untuk pilihan siswa di `GET /api/v1/jalur-minat/saya` (`PilihanJalur`), pilihan pada jalur yang kembali draf dikenali lewat `pilihan.jalur_belum_tersedia === true` atau `pilihan.jalur_minat_id` yang tidak ada di peta jalur disetujui; keduanya ditampilkan sebagai kartu netral `'Jalur belum tersedia'` dengan tombol `'Jeda'`.
