# Rencana LANJUT_040 — Samarkan Jalur Draf di `PATCH` dan Sembunyikan "Alat belajar"

> **Status:** Langkah 1 (peta dan rencana sebelum mengubah kode).
> **Dasar pemeriksaan:** `LANJUT_App` pada branch `lanjut-v2-dev` (sejajar `origin/main` di `f1e0fe9`, memuat LANJUT_039 `6063a25`), lingkungan dev `lanjut_dev` (`127.0.0.1:3309`, `NODE_ENV=development`).
> **Batasan tegas:** tanpa migrasi/perubahan skema/perubahan data konten, tanpa mengubah `app.config.ts`, `eas.json`, `docker-compose.yml`, `railway.json`, `docs/persetujuan-teks-rilis.json`, `server/tests/kompatibel-apk-lama.test.js`, maupun berkas/rute layar v1.

---

## Bagian A — Peta Semua Endpoint Server yang Mengembalikan `jalur_minat_id` (atau Turunannya)

Diperiksa menyeluruh di seluruh berkas `LANJUT_App/server/src/**/*.js`:

| Endpoint | Berkas & Fungsi | Mengembalikan apa | Sudah lewat `samarkanJalur` / penyaringan disetujui? | Pemilik saja? | Status di LANJUT_040 |
|---|---|---|---|---|---|
| `GET /api/v1/jalur-minat` | `jalur-minat.layanan.js:daftarJalur` | Daftar katalog jalur minat (`id`, `nama`, `deskripsi_singkat`, `status_teks`, `urutan`) | Ya — hanya membaca `daftarDisetujui()` (`aktif=1 AND status_teks='disetujui'`); jalur draf tidak pernah keluar | Tidak (katalog publik setelah login + kebijakan) | Utuh (aman) |
| `GET /api/v1/jalur-minat/saya` | `jalur-minat.layanan.js:daftarPilihan -> bentukPilihan` | Daftar babak jalur siswa (`jalur_minat_id`, `jalur_belum_tersedia`) | Ya — `samarkanJalur(p.jalur_minat_id, tersedia)` | Ya (`pengguna_id = ?` di SQL) | Utuh (aman) |
| `POST /api/v1/jalur-minat/saya` | `jalur-minat.layanan.js:pilih -> bentukPilihan` | Babak jalur baru siswa | Ya — `pastikanJalurTersedia` + `samarkanJalur` | Ya | Utuh (aman) |
| `PATCH /api/v1/jalur-minat/saya/:id` | `jalur-minat.layanan.js:akhiri -> bentukPilihan` | Babak jalur yang dijeda/selesai/ditinggalkan | Ya — `samarkanJalur` | Ya | Utuh (aman) |
| `GET /api/v1/tujuan` | `tujuan.layanan.js:daftar -> bentukTujuan` | Tujuan terkini siswa + `prodi_impian` | Ya — `samarkanJalur(t.jalur_minat_id, tersedia)` | Ya | Utuh (aman) |
| `POST /api/v1/tujuan` | `tujuan.layanan.js:buat -> bentukTujuan` | Tujuan baru siswa | Ya — `pastikanJalurTersedia` + `samarkanJalur` | Ya | Utuh (aman) |
| `POST /api/v1/tujuan/:id/versi` | `tujuan.layanan.js:perbarui -> bentukTujuan` | Versi baru tujuan (menyalin kolom `jalur_minat_id` mentah di DB bila tidak dikirim, lalu menyamarkan respons) | Ya — `samarkanJalur` | Ya | Utuh (aman) |
| `PATCH /api/v1/tujuan/:id/status` | `tujuan.layanan.js:akhiri -> bentukTujuan` | Tujuan yang diakhiri (`tercapai`/`ditinggalkan`) | Ya — `samarkanJalur` | Ya | Utuh (aman) |
| `GET /api/v1/tujuan/:id/riwayat` | `tujuan.layanan.js:riwayat -> bentukTujuan` | Semua versi satu tujuan (`versi_ke`) | Ya — `samarkanJalur` | Ya | Utuh (aman) |
| `GET /api/v1/tujuan/perjalanan` | `tujuan.layanan.js:perjalanan` | Linimasa peristiwa jalur & tujuan | Ya — `samarkanJalur` (baris 167 & 177) | Ya | Utuh (aman) |
| **`PATCH /api/v1/tujuan/bukti/:butirId`** | **`tujuan.layanan.js:tautkanBukti` (baris 150–151)** | `{ id, jalur_minat_id, tujuan_id }` hasil menautkan butir bukti | **BELUM — mengirim `b.jalur_minat_id` mentah** (bocor bila `butir_bukti` masih terkait jalur yang kembali draf lalu siswa mengirim `{ tujuan_id }` tanpa `jalur_minat_id`) | Ya (`ambilMilikSendiri`) | **DIPERBAIKI DI 040** (`...samarkanJalur(b.jalur_minat_id, tersedia)`) |
| `GET /api/v1/butir-bukti` | `butir-bukti.layanan.js:daftar -> bentukButir` | Daftar butir bukti Rekam Jejak | Ya — `samarkanJalur(b.jalur_minat_id, tersedia)` | Ya | Utuh (aman) |
| `GET /api/v1/butir-bukti/:id` | `butir-bukti.layanan.js:ambil -> bentukButir` | Rincian satu butir bukti | Ya — `samarkanJalur` | Ya | Utuh (aman) |
| `POST /api/v1/butir-bukti` | `butir-bukti.layanan.js:buat -> ambil -> bentukButir` | Butir bukti baru | Ya — `pastikanJalurTersedia` + `samarkanJalur` | Ya | Utuh (aman) |
| `PATCH /api/v1/butir-bukti/:id` | `butir-bukti.layanan.js:ubah -> ambil -> bentukButir` | Butir bukti setelah diubah | Ya — `pastikanJalurTersedia` + `samarkanJalur` | Ya | Utuh (aman) |
| `GET /api/v1/discover/profil`, `GET /api/v1/discover/profil/riwayat`, `POST /api/v1/discover/profil` | `discover.layanan.js:bentukProfil` (baris 152) | Profil eksplorasi (`isi.jalur_minat_id`, daftar nama jalur aktif) | Ya — `isi.jalur_minat_id` hanya menyertakan id yang ada di `rujukan.jalur` (`daftarDisetujui()`), tidak pernah memuat jalur draf | Ya | Utuh (aman) |
| `GET /api/v1/pengguna/saya/ekspor` | `data-pengguna.layanan.js:eksporDataV2`, `eksporDiscover` | Salinan utuh data milik akun (`pengguna_jalur_minat`, `tujuan`, `butir_bukti`, `profil_eksplorasi`) | Sengaja tidak disamarkan (salinan data mentah pemilik sendiri sesuai K37 & LANJUT_035) | Ya | Utuh (sengaja tidak diubah) |

**Kesimpulan Bagian A:** Selain `PATCH /api/v1/tujuan/bukti/:butirId`, **tidak ditemukan endpoint lain** yang membocorkan `jalur_minat_id` draf. Perbaikan cukup 2 baris di `tujuan.layanan.js:tautkanBukti` memakai `idJalurTersedia()` + `samarkanJalur(b.jalur_minat_id, tersedia)`, sehingga butir berjalur draf mengembalikan `jalur_minat_id: null` dan `jalur_belum_tersedia: true` sementara kolom `butir_bukti.jalur_minat_id` di basis data tetap utuh.

---

## Bagian B — Peta Semua Jalan Masuk v2 ke 10 Rute v1 "Alat belajar" (+ Rute Anaknya)

Sepuluh rute v1 "Alat belajar" (`ALAT_BELAJAR_V2`): `/arsip`, `/latihan`, `/level-in`, `/ngobrol`, `/jenjang-saya`, `/pilih-mapel`, `/eksplorasi-tujuan`, `/cek-posisi`, `/gaya-belajar`, `/cerita-alumni` — beserta 7 rute anak/aliasnya (`/arsip-tulis`, `/arsip-kartu`, `/arsip-modul`, `/arsip-modul-unggah`, `/latihan-riwayat`, `/persetujuan-ortu`, `/khusus-smk`, total 17 rute).

Rute pengecualian yang **tidak** ikut disembunyikan: `/terima-kebijakan`, `/kebijakan-privasi`, `/linimasa`, `/daftar-periksa`, serta seluruh 15 rute siswa v2.

### 1. Inventaris jalan masuk di seluruh antarmuka v2

| Layar / Bagian v2 | Berkas | Apa yang tampil saat ini | Terkait 10 rute v1? | Apa yang terjadi saat `EXPO_PUBLIC_ALAT_BELAJAR` mati |
|---|---|---|---|---|
| **Arah Saya** (`/arah-saya`) | `components/screens/v2/ArahSayaV2.tsx` (baris 187–222) | Bagian lipat **"Alat belajar"** berisi 10 tombol (`ALAT_BELAJAR_V2`) | **Ya (10 rute)** | Seluruh bagian lipat **"Alat belajar"** tidak dirender (`SAKLAR.alatBelajar ? ... : null`). |
| **Langkah Saya** (`/langkah-saya`) — tombol bawah | `components/screens/v2/LangkahSayaV2.tsx` (baris 178–189) | Dua tombol teks di bawah daftar: `"Tambah dari Pilih Mapel"` (`/pilih-mapel`) dan `"Eksplorasi Kampus"` (`/eksplorasi-tujuan`) | **Ya (2 rute)** | Baris tombol bawah tidak dirender saat `ALAT_BELAJAR` mati. |
| **Langkah Saya** (`/langkah-saya`) — keadaan kosong non-SMP | `lib/langkahSayaV2.ts` (baris 117–125) & `LangkahSayaV2.tsx` (baris 69–80, 129–134) | Tombol keadaan kosong `"Pilih Mapel"` (`/pilih-mapel`) untuk kelas non-SMP tanpa butir | **Ya (1 rute)** | `aksiKosongLangkahSaya` mengembalikan `null` saat `alatBelajar` mati (non-SMP), sehingga kartu kosong maskot tampil tenang tanpa tombol ke `/pilih-mapel`. (Aksi SMP `tambah_jadwal` tetap berjalan karena membuka formulir lokal, bukan rute v1.) |
| **Langkah Saya** (`/langkah-saya`) — materi event SMP | `components/screens/v2/LangkahSayaV2.tsx` (baris 655–661) | Tombol `"Buka materi"` ke `/arsip-kartu` bila event SMP menautkan kartu arsip | **Ya (rute anak `/arsip`)** | Tombol `"Buka materi"` ke `/arsip-kartu` disembunyikan saat `ALAT_BELAJAR` mati; panel materi terkurasi inline (`materi.buka === 'panel'`) tetap berjalan. |
| **Jejak Waktu** (`/jejak-waktu`) | `components/screens/v2/JejakWaktuV2.tsx` | Tautan hanya ke `/discover` dan `/langkah-saya` | Tidak (0) | Tidak berubah. |
| **Jalur Saya** (`/jalur-tujuan`, `/jalur-tujuan-tulis`) | `components/screens/v2/JalurSayaV2.tsx` | Tautan hanya ke `/akun` dan `/jalur-tujuan` | Tidak (0) | Tidak berubah. |
| **Jelajah & Profil Eksplorasi** (`/discover`, `/discover-refleksi`, `/discover-profil`) | `JelajahV2.tsx`, `ProfilEksplorasiV2.tsx` | Tautan hanya ke `/discover-refleksi`, `/discover-profil`, `/akun` | Tidak (0) | Tidak berubah. |
| **Rekam Jejak** (`/portofolio`, `/portofolio-tulis`, `/portofolio-butir`) | `RekamJejakV2.tsx` | Tautan hanya ke `/portofolio*` dan `/jalur-tujuan` | Tidak (0) | Tidak berubah. |
| **Akun & Privasi v2** (`/akun`, `/hapus-akun`) | `AkunPrivasiV2.tsx`, `HapusAkunV2.tsx` | Tautan hanya ke `/terima-kebijakan`, `/kebijakan-privasi`, `/hapus-akun` | Tidak (0) | Tidak berubah. *(Catatan: bila `KELOLA_DATA_AKUN` mati, `/akun` jatuh ke `AkunScreen` v1 yang punya tombol `/cek-posisi`; bila diketuk saat `ALAT_BELAJAR` mati, pengalihan langsung di `AppShellV2` mengembalikan siswa dengan ramah ke `/arah-saya` tanpa mengubah berkas v1.)* |
| **Alur Masuk v2** (`/masuk`, `/daftar`, Pengantar, Kecenderungan) | `MasukV2.tsx`, `DaftarV2.tsx`, `PengantarV2.tsx`, `KecenderunganV2.tsx` | Tautan hanya ke `/masuk`, `/daftar`, `/kebijakan-privasi`, `/arah-saya` | Tidak (0) | Tidak berubah. |
| **Bilah tab bawah & pintu tab** | `lib/navigasiV2.ts`, `TabBarV2.tsx`, `AppShellV2.tsx` | 4 tab (`/arah-saya`, `/discover`, `/jejak-waktu`, `/discover-profil` atau `/akun`) + pintu `/langkah-saya` & `/akun` | Tidak (0) | Tidak berubah. |

### 2. Perilaku membuka langsung (deep link / bookmark / URL langsung)

- **Pendekatan terpilih (paling kecil dan bersih):** pengalihan langsung lewat `router.replace('/arah-saya')` di `components/screens/v2/AppShellV2.tsx` memakai fungsi murni `ruteAlatBelajarTertutup(pathname, SAKLAR.alatBelajar)` di `lib/navigasiV2.ts`, sembari menyembunyikan `{children}` (`display: 'none'`) agar `<Slot />` tetap terpasang dan navigator Expo Router tidak kehilangan state (sama dengan pola `app/(app)/_layout.tsx`).
- **Alasan pemilihan:**
  1. **0 perubahan pada 17 berkas rute/layar v1** — tidak ada berkas di `app/(app)/*` v1 atau `components/screens/*` v1 yang disentuh atau dihapus.
  2. **0 pengaruh saat `EXPO_PUBLIC_NAVIGASI_V2` mati** — saat `NAVIGASI_V2` mati, `app/(app)/_layout.tsx` merender `AppShell` v1 (bukan `AppShellV2`), sehingga perilaku v1 100% identik.
  3. **0 teks draf baru** — pengalihan langsung ke Arah Saya tidak memerlukan layar/kalimat baru, tidak menambah beban gerbang rilis, dan menghindari layar kosong, layar putih v1, atau galat.
  4. **Pengecualian tetap terbuka** — `/terima-kebijakan`, `/kebijakan-privasi`, `/linimasa`, `/daftar-periksa`, dan seluruh rute v2 tidak masuk daftar `RUTE_ALAT_BELAJAR_TERTUTUP` sehingga tetap bisa dibuka langsung.

---

## Pendekatan Saklar, Dokumentasi, dan Risiko pada Tes Lama

1. **Saklar baru `EXPO_PUBLIC_ALAT_BELAJAR` tanpa mengubah `app.config.ts` / `eas.json`:**
   - Ditambahkan di `lib/fiturApp.ts` sebagai `alatBelajarAktif(extra?, env?)` dengan nilai bawaan **mati** (`false`).
   - Karena `app.config.ts` dilarang diubah pada 040, fungsi memeriksa `extra.alatBelajar === true` bila tersedia, dan bila tidak ada di `extra`, membaca ekspresi literal `process.env.EXPO_PUBLIC_ALAT_BELAJAR === '1'` (yang disisipkan statis oleh Metro/Expo saat bundel dibangun).
   - Nilai bawaan `EXPO_PUBLIC_ALAT_BELAJAR=0` dicatat di `LANJUT_App/.env.example` (contoh variabel klien terpisah agar `server/.env.example` tetap khusus server sesuai tes 030/031/031b), `docs/peta-navigasi-v2.md`, `docs/profil-build-tester-v2.md` (rencana profil `tester-v2`), dan `docs/uji-hp-expo-go.md`.
2. **Dampak & mitigasi pada tes lama (tanpa melonggarkan apa pun):**
   - `server/tests/jalur-tujuan.test.js:322,324`: `assert.deepEqual` pada respons `PATCH /tujuan/bukti/:butirId` diperbarui untuk turut memeriksa `jalur_belum_tersedia: false` (lebih ketat, selaras kontrak `samarkanJalur`).
   - `server/tests/navigasi-v2.test.js:255-289`: uji graf `ruteTerjangkauV2` sebelumnya mengasumsikan `Alat belajar` selalu menyala. Diperbarui agar menguji penuh kedua keadaan: `alatBelajar: true` (semua rute v1 kecuali 2 rute yang digantikan terjangkau) DAN `alatBelajar: false` (0 rute Alat belajar terjangkau, seluruh rute inti v2 tetap terjangkau).
   - Baris terkunci tes 031, 031b, 032, dan 039 (`const tampilPilihMode = modeGelap && pathname === '/akun';`, `[PERLU DIKONFIRMASI]`, `RUTE_V1_DI_SHELL_V2.length === 18`, `ruteV1Terang`, `auditKontras().ruteV1DalamShellGelap`, `useKurangiGerak`, `GerbangArahV2`) dijaga tetap utuh.
   - Catatan `server/tests/perbaikan-mode-gelap-039.test.js:290`: tes itu memeriksa `git status --porcelain server/src` (akan kosong setelah perubahan `server/src` di-commit); tidak diubah agar tes 039 tidak dilonggarkan.
