# Peta Server LANJUT_035 — Hapus Sungguhan (Refleksi & Catatan Profil) dan Samarkan ID Jalur Draf

> **Tahap:** Langkah 1 (inventaris sebelum mengubah kode server maupun klien).
> **Dasar pemeriksaan:** kode nyata di `LANJUT_App/server/src` dan `LANJUT_App/server/src/db/migrasi/033_discover.sql` (commit dasar `c4a0ee2` di `lanjut-v2-dev`), serta pembuktian empiris langsung pada basis data `lanjut_test`.
> **Kesimpulan kelayakan skema:** **Tidak diperlukan migrasi baru maupun perubahan skema** untuk kedua penghapusan sungguhan maupun penyamaran id jalur draf.

---

## 1. Skema dan Repositori yang Terlibat

### 1.1 `refleksi_discover`
- **Migrasi:** `server/src/db/migrasi/033_discover.sql` (baris 36–52).
- **Kolom aktual:**
  - `id CHAR(36) NOT NULL` (`PRIMARY KEY`)
  - `pengguna_id CHAR(36) NOT NULL` (`FOREIGN KEY -> pengguna(id) ON DELETE CASCADE`)
  - `kartu_discover_id VARCHAR(64) NOT NULL` (`FOREIGN KEY -> kartu_discover(id) ON DELETE RESTRICT`)
  - `ketertarikan ENUM('tertarik', 'belum_yakin', 'tidak_tertarik') NOT NULL`
  - `yang_menarik VARCHAR(280) NULL`
  - `yang_kurang_menarik VARCHAR(280) NULL`
  - `dibuat_pada DATETIME NOT NULL`
  - `diubah_pada DATETIME NOT NULL`
- **Kunci unik & indeks:**
  - `UNIQUE KEY uq_refleksi_discover_pengguna_kartu (pengguna_id, kartu_discover_id)` (satu baris per pasangan siswa dan kartu).
  - `KEY idx_refleksi_discover_kartu (kartu_discover_id)`.
- **Keterkaitan FK dari tabel lain:** tidak ada tabel lain yang mengacu ke `refleksi_discover.id`.
- **Repositori:** `server/src/modul/discover/refleksi-discover.repo.js` (`daftarMilikSendiri`, `ambilMilikSendiri`, `simpanMilikSendiri`, `buatTanpaPeriksaKartu`). Semua query memfilter `pengguna_id = ?`.
- **Implikasi hapus sungguhan:** karena `ketertarikan NOT NULL`, jalan memutar `PUT` sebelumnya hanya bisa mengosongkan `yang_menarik` dan `yang_kurang_menarik` sementara baris dan `ketertarikan` tetap ada. Penghapusan sungguhan cukup menjalankan `DELETE FROM refleksi_discover WHERE pengguna_id = ? AND kartu_discover_id = ?` — tanpa perubahan skema.

### 1.2 `profil_eksplorasi`
- **Migrasi:** `server/src/db/migrasi/033_discover.sql` (baris 54–71).
- **Cara versi disimpan:** **satu tabel tunggal** (`profil_eksplorasi`), **tidak ada tabel riwayat terpisah**. Setiap pembaruan menambah satu baris baru dengan `status = 'aktif'` dan `diubah_dari_id` menunjuk `id` versi sebelumnya, sementara versi sebelumnya diubah statusnya menjadi `'diubah'`.
- **Kolom aktual:**
  - `id CHAR(36) NOT NULL` (`PRIMARY KEY`)
  - `pengguna_id CHAR(36) NOT NULL` (`FOREIGN KEY -> pengguna(id) ON DELETE CASCADE`)
  - `isi JSON NOT NULL` — hanya berisi `{ refleksi, minat_rumpun, mapel_pilihan, jalur_minat_id, tujuan }` (`discover.layanan.js:79-92`). **`catatan` TIDAK disimpan di dalam kolom `isi`.**
  - `catatan VARCHAR(500) NULL` — **disimpan langsung pada kolom `catatan` di setiap baris versi.**
  - `status ENUM('aktif', 'diubah') NOT NULL DEFAULT 'aktif'`
  - `diubah_dari_id CHAR(36) NULL` (`FOREIGN KEY -> profil_eksplorasi(id) ON DELETE SET NULL`)
  - `dibuat_pada DATETIME NOT NULL`, `diubah_pada DATETIME NOT NULL`
  - `penanda_aktif TINYINT GENERATED ALWAYS AS (IF(status = 'aktif', 1, NULL)) STORED` + `UNIQUE KEY uq_profil_eksplorasi_aktif (pengguna_id, penanda_aktif)` (menjamin maksimal satu versi aktif per akun).
- **Repositori:** `server/src/modul/discover/profil-eksplorasi.repo.js` (`ambilTerkiniMilikSendiri`, `daftarMilikSendiri`, `buatVersiMilikSendiri`). Semua query memfilter `pengguna_id = ?`.
- **Implikasi hapus sungguhan:** karena `catatan` bertipe `VARCHAR(500) NULL` dan terpisah dari `isi` JSON (serta tidak terikat constraint/indeks unik), mengosongkan `catatan` pada semua versi milik siswa cukup menjalankan `UPDATE profil_eksplorasi SET catatan = NULL WHERE pengguna_id = ? AND catatan IS NOT NULL` — tanpa menghapus baris riwayat, tanpa mengubah `isi`, tanpa membuat versi baru, dan tanpa migrasi.

---

## 2. Pembuktian Empiris pada `lanjut_test`: Apakah "Hapus catatan" Lewat `POST` Meninggalkan Catatan Lama di Riwayat?

**Jawaban: YA.**

Diperiksa langsung sebelum perubahan kode pada basis data `lanjut_test` (`NODE_ENV=test`, `DB_NAME=lanjut_test`, `DISCOVER_AKTIF=1`) dengan akun uji sementara yang menerima kebijakan privasi:

1. `POST /api/v1/discover/profil` dengan `{ "catatan": "Catatan lama sensitif siswa sebelum dihapus" }` → `201`, `versi_ke: 1`, `catatan: "Catatan lama sensitif siswa sebelum dihapus"`.
2. `POST /api/v1/discover/profil` dengan `{ "catatan": null }` (perilaku tombol "Hapus catatan" di LANJUT_034) → `201`, `versi_ke: 2`, `catatan: null`.
3. Pemeriksaan hasil sesudahnya:
   - `GET /api/v1/discover/profil`: `jumlah_versi: 2`, `profil.catatan: null` (versi bertambah dari 1 ke 2).
   - `GET /api/v1/discover/profil/riwayat`:
     - Versi ke-1 (`status: "diubah"`): **`catatan: "Catatan lama sensitif siswa sebelum dihapus"`** (masih ada utuh).
     - Versi ke-2 (`status: "aktif"`): `catatan: null`.
   - `GET /api/v1/pengguna/saya/ekspor` (`profil_eksplorasi`): memuat kedua baris, termasuk baris `status: "diubah"` dengan **`catatan: "Catatan lama sensitif siswa sebelum dihapus"`**.
   - Query SQL langsung pada `profil_eksplorasi`: baris lama masih menyimpan teks catatan asli.

Kesimpulan: jalan memutar `POST { catatan: null }` tidak menghapus catatan lama dari riwayat maupun ekspor, dan justru menambah versi baru. Oleh karena itu diperlukan endpoint khusus `DELETE /api/v1/discover/profil/catatan` yang mengosongkan kolom `catatan` menjadi `NULL` pada semua versi milik siswa tersebut tanpa membuat versi baru.

---

## 3. Ekspor Data (`/pengguna/saya/ekspor`) dan Hapus Akun (`DELETE /pengguna/saya`)

- **Ekspor data (`server/src/modul/data-pengguna/data-pengguna.layanan.js:35-41, 51-59`):**
  - `eksporDiscover(penggunaId)` memanggil `refleksiDiscoverRepo.daftarMilikSendiri(penggunaId)` dan `profilEksplorasiRepo.daftarMilikSendiri(penggunaId)`, lalu menggabungkan `refleksi_discover` dan `profil_eksplorasi` ke JSON ekspor.
  - `eksporDataV2(penggunaId)` (baris 24–32) membaca baris mentah `pengguna_jalur_minat`, `tujuan`, `butir_bukti`, `lampiran_butir_bukti` langsung dari repositori masing-masing (tidak melewati `bentukTujuan` / `bentukButir` sehingga ekspor tetap menyimpan baris mentah milik siswa, sesuai aturan LANJUT_035).
  - Konsistensi dengan perubahan 035:
    - Setelah `DELETE /discover/refleksi/:kartuId`, baris benar-benar hilang dari `refleksi_discover`, sehingga otomatis tidak lagi muncul di `GET /discover/refleksi` maupun `/pengguna/saya/ekspor`.
    - Setelah `DELETE /discover/profil/catatan`, semua baris milik siswa di `profil_eksplorasi` bernilai `catatan = NULL`, sehingga otomatis `catatan` bernilai `null` pada `GET /discover/profil`, `GET /discover/profil/riwayat`, maupun `/pengguna/saya/ekspor`.
- **Hapus akun (`server/src/modul/data-pengguna/data-pengguna.layanan.js:107-122`, `data-pengguna.repo.js:19-45`):**
  - Menghapus baris `pengguna` di dalam satu transaksi (`DELETE FROM pengguna WHERE id = ?`).
  - Kedua tabel Discover (`refleksi_discover` dan `profil_eksplorasi`) terhubung lewat `ON DELETE CASCADE` ke `pengguna(id)` (`033_discover.sql:48-49, 67-68`), begitu pula `tujuan` dan `butir_bukti`.
  - Perubahan 035 tidak menambah tabel, tidak menambah FK baru, dan tidak mengubah `data-pengguna.*`, sehingga hapus akun tetap menghapus semua data terkait secara penuh.

---

## 4. `samarkanJalur`, Tempat Pemakaiannya, dan Perilaku `tujuan.layanan.js:perbarui`

- **Definisi:** `server/src/modul/jalur-minat/jalur-minat.layanan.js` baris 39–42:
  ```js
  function samarkanJalur(jalurMinatId, tersedia) {
    const tersembunyi = jalurMinatId !== null && jalurMinatId !== undefined && !tersedia.has(jalurMinatId);
    return { jalur_minat_id: tersembunyi ? null : jalurMinatId ?? null, jalur_belum_tersedia: tersembunyi };
  }
  ```
  Didukung oleh `idJalurTersedia()` (baris 29–31) yang mengembalikan `Set` dari id jalur aktif berstatus `status_teks = 'disetujui'`.
- **Sudah dipakai sebelumnya di:**
  - `server/src/modul/jalur-minat/jalur-minat.layanan.js`: `bentukPilihan` (`GET /jalur-minat/saya`, `POST /jalur-minat/saya`, `PATCH /jalur-minat/saya/:id`).
  - `server/src/modul/tujuan/tujuan.layanan.js`: `perjalanan` (`GET /tujuan/perjalanan`, baris 163 & 173).
  - (Catatan: `discover.layanan.js:bentukProfil` baris 132 menyaring `isi.jalur_minat_id` hanya ke `rujukan.jalur` yang disetujui sehingga jalur draf tidak keluar di `/discover/profil*`.)
- **Belum memakai `samarkanJalur` (target perbaikan 035):**
  1. `server/src/modul/tujuan/tujuan.layanan.js:bentukTujuan` (baris 25–37) — dipakai oleh `daftar` (`GET /tujuan`), `riwayat` (`GET /tujuan/:id/riwayat`), `buat` (`POST /tujuan`), `perbarui` (`POST /tujuan/:id/versi`), dan `akhiri` (`PATCH /tujuan/:id/status`). `samarkanJalur` dan `idJalurTersedia` sebenarnya sudah diimpor di baris 17 berkas ini.
  2. `server/src/modul/butir-bukti/butir-bukti.layanan.js:bentukButir` (baris 34–49) — dipakai oleh `daftar` (`GET /butir-bukti`), `ambil` (`GET /butir-bukti/:id`), serta secara tidak langsung `buat` (`POST /butir-bukti`) dan `ubah` (`PATCH /butir-bukti/:id`) yang mengembalikan `ambil(...)`.
- **Perilaku `tujuan.layanan.js:perbarui` (baris 90–115):**
  - Membaca baris `lama` langsung dari `tujuanRepo.ambilMilikSendiri(penggunaId, id)` (nilai kolom `lama.jalur_minat_id` asli di tabel).
  - Saat `data.jalur_minat_id === undefined` (siswa hanya mengubah `judul`, `uraian`, atau `target_pada`), `pilih('jalur_minat_id', lama.jalur_minat_id)` menyalin `lama.jalur_minat_id` apa adanya ke baris versi baru di tabel `tujuan`.
  - Karena `samarkanJalur` hanya diterapkan pada lapisan pemformatan respons (`bentukTujuan`), data mentah di tabel `tujuan` tidak berubah dan `perbarui` tetap menjaga `jalur_minat_id` lama tanpa kehilangan data.
  - Di sisi klien v2 (`FormTujuanV2` di `components/screens/v2/JalurSayaV2.tsx` & `lib/jalurSayaV2.ts`), formulir ubah tujuan perlu mengenali `awal.jalur_belum_tersedia === true` (saat `awal.jalur_minat_id` kini bernilai `null` dari server) agar bila siswa hanya mengubah judul/uraian tanpa mengganti pilihan jalur, klien tetap tidak mengirim `jalur_minat_id` sehingga logika salin `perbarui` di server bekerja penuh.
