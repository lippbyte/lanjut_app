# Peta Persetujuan & Penelusuran LANJUT_041

> **Status:** Langkah 1 (peta persetujuan sebelum mengubah kode) dan Langkah 3 (penelusuran hanya-baca jalan buntu Langkah Saya + pemasangan tersembunyi rute v1).
> **Dasar pemeriksaan:** `LANJUT_App` di branch `lanjut-v2-dev` sejajar `origin/main` (`30e75bc`, memuat LANJUT_040 `c686b0d`), lingkungan dev `lanjut_dev` (`127.0.0.1:3309`, `NODE_ENV=development`).
> **Batasan tegas:** perubahan klien saja di balik `EXPO_PUBLIC_ALUR_MASUK_V2` (mati bawaan); tanpa perubahan server, API, skema, migrasi, kontrak pendaftaran, `lib/kebijakan-privasi.json`, kalimat persetujuan v1 yang disetujui, maupun konfigurasi build.

---

## Bagian 1 — Peta Persetujuan v1, v2, dan Kontrak Server (Langkah 1)

### 1.1 Apa yang v1 lakukan sekarang di Daftar dan Masuk

- **Layar Daftar v1 (`components/screens/auth/RegisterScreen.tsx`):**
  - **Tidak ada pertanyaan usia dan tidak ada kotak persetujuan orang tua/wali.**
  - Satu-satunya persetujuan pada layar Daftar v1 adalah persetujuan **kebijakan privasi oleh siswa sendiri** (baris 45–53, 92, 243–265), diletakkan di bagian bawah formulir tunggal sebelum tombol `Daftar` (`nonaktif={!sudahBaca}`, baris 261) dan **sebelum** akun dibuat di server.
  - Kutipan persis teks di `RegisterScreen.tsx`:
    - Baris 45–46 (**disetujui Khalifa 28 Sep 2026**, tidak boleh diubah):
      > `Kami menyimpan nama pengguna, nama tampilan, email (kalau kamu isi), kelas, prodi impian, dan centang Daftar Periksamu untuk menjalankan LANJUT, yaitu menampilkan jalur dan kemajuanmu.`
    - Baris 50–53 (DRAF LANJUT_047):
      - Judul: `Kebijakan privasi (ringkas)`
      - Tautan lengkap (modal `<IsiKebijakan />` dari `lib/kebijakan-privasi.json`, `versi: 1`): `Baca kebijakan privasi lengkap`
      - Label kotak centang: `Saya sudah membaca kebijakan privasi LANJUT.`
      - Petunjuk sebelum dicentang: `Centang kotak kebijakan privasi di atas dulu supaya bisa mendaftar.`
  - **Yang dikirim ke server (`RegisterScreen.tsx:109-114`):**
    - Tanpa email → `POST /api/v1/auth/daftar`; dengan email → `POST /api/v1/auth/daftar/kirim-kode` lalu `POST /api/v1/auth/daftar/verifikasi`.
    - Field persetujuan yang dikirim **hanya `versi_kebijakan: 1`** (`VERSI_KEBIJAKAN` dari `lib/kebijakanPrivasi.ts`).
  - **Yang diperiksa & disimpan server (`server/src/modul/auth/auth.skema.js:45-58`, `auth.layanan.js:97,130`, `persetujuan.layanan.js:88-118`):**
    - Server memeriksa `versi_kebijakan === konfigurasi_levelin.persetujuan_versi_kebijakan` (`1`) sebelum akun dibuat (ditolak `409 KEBIJAKAN_USANG` bila usang).
    - Setelah baris `pengguna` dibuat, server memanggil `persetujuanLayanan.terimaKebijakan(id, versi_kebijakan)` yang menulis 1 baris ke tabel `persetujuan`: `jenis = 'kebijakan_privasi'`, `versi = 1`, `status = 'setuju'`, `sumber = 'mandiri'`, `catatan = NULL`, `dicatat_pada = sekarangUntukDb()`.
    - Server **tidak** menerima, memeriksa, maupun menyimpan usia, tanggal lahir, atau status persetujuan orang tua/wali saat pendaftaran.
- **Layar Masuk v1 (`components/screens/auth/LoginScreen.tsx`):**
  - Tidak ada pertanyaan usia maupun kotak persetujuan; hanya masuk kata sandi, kode email, atau Google.
- **Di mana persetujuan orang tua/wali ada di v1 sekarang:**
  - Hanya di rute **`/persetujuan-ortu`** (`app/(app)/persetujuan-ortu.tsx` → `components/screens/KonfirmasiOrtuWali.tsx`, memanggil `POST /api/v1/persetujuan/ortu-wali` → `persetujuan.layanan.js:140-158`), **khusus untuk membuka fitur AI di Ngobrol** (`bolehPakaiAi`, bukan gerbang pendaftaran akun dasar).

### 1.2 Apa yang `DaftarV2` lakukan sekarang & apa yang hilang (pembuktian temuan 038)

- `DaftarV2` (`components/screens/v2/DaftarV2.tsx`, `lib/alurMasukV2.ts:137-145`) saat ini memiliki 7–8 langkah: `akun` → `email` → `persetujuan` (kebijakan privasi) → `jenjang` → `kelas` → (`jenis` untuk kelas 10–12) → `prodi` → `siap` (→ `kode` bila email diisi).
- **Pembuktian jujur atas temuan audit 038:**
  - `DaftarV2` **sudah** memuat seluruh persetujuan yang ada di Daftar v1 (ringkasan & teks lengkap `lib/kebijakan-privasi.json`, kalimat data pribadi v1 identik di `lib/alurMasukV2.ts:16-17`, kotak centang `Saya sudah membaca kebijakan privasi LANJUT.`, dan pengiriman `versi_kebijakan: 1` sebelum akun dibuat).
  - **Layar Daftar v1 sendiri memang belum pernah punya pertanyaan usia atau kotak orang tua/wali** (di v1 persetujuan orang tua baru ada di `/persetujuan-ortu` khusus fitur AI).
  - Yang hilang di `DaftarV2` adalah **gerbang persetujuan orang tua/wali untuk siswa di bawah 18 tahun pada alur daftar v2 sesuai keputusan K48 dan keputusan Khalifa 27 Nov (opsi a)**.

### 1.3 Field kontrak pendaftaran yang tersedia

- `daftarSkema` (`server/src/modul/auth/auth.skema.js:45-58`) memakai daftar putih ketat Zod tanpa `.passthrough()` dan hanya menerima: `nama_pengguna`, `kata_sandi`, `nama_tampilan?`, `email?`, `kelas?`, `jenis_sekolah?`, `prodi_impian?`, `versi_kebijakan?`.
- **Tidak ada field atau penanda** di kontrak pendaftaran maupun profil untuk pernyataan usia atau konfirmasi orang tua/wali.
- Oleh karena itu, sesuai keputusan Khalifa dan larangan perubahan server pada LANJUT_041, gerbang opsi a ini bersifat **gerbang di klien saja (hanya di state memori layar `DaftarV2`)**:
  - Tidak ada usia, tanggal lahir, atau status orang tua yang dikirim ke server maupun ditulis ke penyimpanan perangkat (`AsyncStorage`/`SecureStore`/`localStorage`).
  - Payload ke `/auth/daftar` dan `/auth/daftar/kirim-kode` **tetap 100% identik dengan Daftar v1**.
  - **Keterbatasan untuk peninjau hukum:** server tidak mencatat apakah pendaftar menyatakan ≥ 18 tahun atau mengonfirmasi persetujuan orang tua/wali di layar ini; untuk pilot, bukti persetujuan tertulis tetap dipegang Khalifa di luar aplikasi (T16). Pertanyaan ini dicatat di `docs/pertanyaan-peninjau-hukum-041.md`.

### 1.4 Penanganan akun lama di v1

- Untuk akun lama yang mendaftar sebelum LANJUT_047 (tanpa catatan `kebijakan_privasi`), v1 menampilkan `PromptKebijakan` yang tidak memblokir sesudah login (`app/(app)/_layout.tsx:57,73`, `components/screens/TerimaKebijakan.tsx:126-141`) serta rute `/terima-kebijakan`.
- Untuk persetujuan orang tua/wali pada akun lama, v1 tidak menanyakan ulang saat masuk (hanya di `/persetujuan-ortu` bila membuka Ngobrol terkunci). Sesuai aturan LANJUT_041 §2.4, akun lama **tidak** diminta ulang di task ini.

### 1.5 Keputusan posisi gerbang di alur `DaftarV2`

- **Posisi terpilih:** **Langkah 1 (`usia`) — dan Langkah 2 (`orang_tua`) bila menjawab `"Belum"` — tepat di awal `/daftar`, sebelum langkah `akun`, `email`, `persetujuan` (kebijakan privasi), `jenjang`, `kelas`, `jenis`, `prodi`, dan `siap`.**
- **Alasan:**
  1. Lebih awal dari titik persetujuan v1, lebih awal dari seluruh pertanyaan identitas (`akun`, `email`, `kelas`, `jenis`) dan preferensi (`prodi`), serta lebih awal dari persetujuan kebijakan.
  2. **Akun belum dibuat di server pada titik gerbang ini:** jika siswa menutup aplikasi, memuat ulang halaman, atau menekan kembali di tengah gerbang, **tidak ada akun yang terbuat di server** dan tidak ada data yang terkirim.
  3. Seluruh langkah pendaftaran berada di dalam satu rute `/daftar` tanpa rute URL terpisah per langkah, dan indeks langkah selalu dipagari fungsi murni `indeksLangkahAman(indeks, isian)` + `gerbangUsiaTerpenuhi(isian)` di `periksaLangkah` dan `bentukKirimanDaftar`, sehingga tidak ada jalan melewati gerbang lewat tombol kembali, muat ulang, maupun loncatan langkah.

---

## Bagian 2 — Penelusuran Jalan Buntu Langkah Saya (Langkah 3.1 & 3.2 — Hanya Baca)

### 2.1 Apakah siswa SMA/SMK dengan Langkah Saya kosong punya jalan menambah langkah saat `ALAT_BELAJAR` mati?

- **Kesimpulan: TIDAK ADA untuk kelas 10–11 SMA/SMK/MA (jalan buntu).** Untuk kelas 12, daftar periksa umum dari server masih tampil setelah memilih kelas & jalur seleksi, namun jalan menambah `butir_pribadi` baru juga tidak ada.
- **Bukti kode:**
  1. Satu-satunya hook tulis langkah pribadi adalah `useSimpanButirPribadi()` (`hooks/useButirPribadi.ts:22-30` → `POST /butir-pribadi`). Pemindaian seluruh `components/`, `hooks/`, dan `lib/` menunjukkan hook ini **hanya dipanggil di dua layar v1**:
     - `components/screens/PilihMapelScreen.tsx:8,254` (`/pilih-mapel`)
     - `components/screens/EksplorasiTujuanScreen.tsx:7,224` (`/eksplorasi-tujuan`)
     Keduanya termasuk 10 rute Alat belajar v1 yang disembunyikan saat `EXPO_PUBLIC_ALAT_BELAJAR` mati (LANJUT_040).
  2. Di seluruh antarmuka v2 (`ArahSayaV2`, `JejakWaktuV2`, `LangkahSayaV2`, `JalurSayaV2`, `RekamJejakV2`, `JelajahV2`, `ProfilEksplorasiV2`, `AkunPrivasiV2`), terdapat **0** panggilan ke `useSimpanButirPribadi` maupun `POST /butir-pribadi`.
  3. Di `hooks/useLangkahSayaV2.ts:71-114` dan `lib/langkahSayaV2.ts:117-132`:
     - Siswa kelas **7–9 (SMP)** memiliki `BagianJadwalSmpV2` (`event_sekolah`) dengan tombol lokal `"Tambah jadwal"` (`aksiKosongLangkahSaya` tetap mengembalikan `{ jenis: 'tambah_jadwal' }`).
     - Siswa kelas **12** mendapat daftar periksa umum (`/konten/checklist`) sesuai saringan kelas & jalur seleksi, tetapi tidak bisa menambah butir pribadi baru.
     - Siswa kelas **10–11 (SMA/SMK/MA)** masuk mode `'sma1011'` yang hanya membaca `useButirPribadi()`. Bila `butir_pribadi` kosong dan `ALAT_BELAJAR=0`, `aksiKosongLangkahSaya` mengembalikan `null` (`lib/langkahSayaV2.ts:125`) — siswa hanya melihat kartu kosong maskot `"Belum ada langkah"` tanpa tombol tambah maupun jalan keluar dari layar lain di v2.
  4. Tambahan catatan server (`server/src/modul/butir-pribadi/butir-pribadi.skema.js:9-25`): `POST /butir-pribadi` saat ini hanya menerima dua jenis terstruktur (`mapel_tka` dan `riset_kampus` yang butuh `prodi_id`), bukan langkah bebas.

### 2.2 Usulan perbaikan terkecil (belum dikerjakan — menunggu keputusan Khalifa)

1. **Opsi A (terkecil, klien saja, tanpa perubahan server):** tambahkan aksi lokal ringkas *"Tambah langkah riset prodi"* di `LangkahSayaV2` (keadaan kosong & bawah daftar untuk kelas 10–12 saat `ALAT_BELAJAR=0`) memakai `useProdi()` + `useSimpanButirPribadi()` yang sudah ada (`{ jenis: 'riset_kampus', prodi_id }`).
   - *Perkiraan berkas tersentuh:* 3 berkas klien (`lib/langkahSayaV2.ts`, `hooks/useLangkahSayaV2.ts`, `components/screens/v2/LangkahSayaV2.tsx`) + `docs/draf-teks-jejak-waktu-v2.md` + berkas tes.
2. **Opsi B (langkah tulis bebas mirip SMP, perlu tambahan kecil di server):** tambah jenis `'bebas'` (judul singkat) di `POST /butir-pribadi` + formulir 1 isian lokal *"Tambah langkah"* di `LangkahSayaV2`.
   - *Perkiraan berkas tersentuh:* 3–4 berkas server (`butir-pribadi.skema.js`, `butir-pribadi.layanan.js`, `butir-pribadi.repo.js` — cek apakah migrasi kolom `jenis` ENUM diperlukan) + 3 berkas klien + dokumen draf & tes.
3. **Opsi C (tanpa aksi tulis baru):** pada keadaan kosong kelas 10–11 saat `ALAT_BELAJAR=0`, beri satu tombol mengarah ke **Jalur Saya** (`/jalur-tujuan`, bila saklar menyala) atau **Jelajah** (`/discover`, bila saklar menyala) dengan penjelasan singkat bahwa daftar periksa resmi untuk kelas 12.
   - *Perkiraan berkas tersentuh:* 2 berkas klien (`lib/langkahSayaV2.ts`, `components/screens/v2/LangkahSayaV2.tsx`) + `docs/draf-teks-jejak-waktu-v2.md` + tes.

---

## Bagian 3 — Audit Statis Pemasangan Tersembunyi (`display: 'none'`) 17 Rute v1 Saat Dialihkan (Langkah 3.3 — Hanya Baca)

Di LANJUT_040, `AppShellV2.tsx:125-130` mempertahankan `<View style={s.tersembunyi}>{children}</View>` selama satu bingkai sebelum `useEffect` menjalankan `router.replace('/arah-saya')` agar `<Slot />` tidak terlepas. Hasil penelusuran statis pada seluruh 17 rute dalam `RUTE_ALAT_BELAJAR_TERTUTUP`:

| Rute | Komponen & baris kunci | Permintaan jaringan saat mount | Izin perangkat (mikrofon/kamera/galeri) | Efek samping / mutasi |
|---|---|---|---|---|
| `/ngobrol` | `NgobrolScreen.tsx:47, 58, 205–250, 282` | **Ya:** `GET /persetujuan/saya` (`usePersetujuan`); bila cache `boleh_pakai_ai` sudah `true`, `Obrolan` juga memanggil `GET /ngobrol/status` (`useStatusNgobrol`). Tidak memanggil AI (`POST /ngobrol`). | **Tidak.** `MIKROFON_NGOBROL` mati bawaan, dan `Pengenal.start()` hanya dipanggil saat tombol ditekan pengguna, tidak pernah saat mount. | 0 mutasi, 0 izin. |
| `/level-in` | `LevelInScreen.tsx:25–28` | **Ya (4 `GET`):** `useRingkasanLevelIn()`, `useSaranHarian()`, `useKonfigLevelIn()`, `useMapel()`. | Tidak | 0 mutasi. |
| `/arsip` | `ArsipScreen.tsx:26–27, 77` + `ModulScreens.tsx:34–35` | **Ya (3 `GET`):** `useKartuSaya()`, `useMapel()`, `useModulSaya()`. | Tidak | 0 mutasi. |
| `/arsip-tulis` | `ArsipTulisScreen.tsx:23–24` | **Ya (2 `GET`):** `useKartuSaya()`, `useMapel()`. | Tidak | 0 mutasi. |
| `/arsip-kartu` | `ArsipKartuScreen.tsx:20–21` | **Ya (2 `GET`):** `useKartuSaya()`, `useMapel()`. | Tidak | 0 mutasi. |
| `/arsip-modul` | `ModulScreens.tsx:161–162` | **Ya (1–2 `GET`):** `useModul(id)` (bila ada parameter `id`), `useMapel()`. | Tidak | 0 mutasi. |
| `/arsip-modul-unggah` | `ModulScreens.tsx:226` | **Ya (1 `GET`):** `useMapel()`. | Tidak (pemilih berkas hanya saat tombol diklik). | 0 mutasi. |
| `/latihan` | `LatihanScreen.tsx:55–57` | **Ya (3 `GET`):** `useKartuSaya()`, `useModulLatihan()`, `useMapel()`. | Tidak | 0 mutasi (`mulaiSesi` hanya saat tombol Mulai diklik). |
| `/latihan-riwayat` | `LatihanRiwayatScreen.tsx:21–22` | **Ya (2 `GET`):** `useRiwayatLatihan()`, `useMapel()`. | Tidak | 0 mutasi. |
| `/persetujuan-ortu` | `KonfirmasiOrtuWali.tsx:32` | **Ya (1 `GET`):** `usePersetujuan()`. | Tidak | 0 mutasi (`useKonfirmasiOrtuWali` hanya saat tombol diklik). |
| `/jenjang-saya` | `JenjangSayaScreen.tsx:96` | **Ya (0–1 `GET`):** `useButirKhususSmk()` (bila akun SMK). | Tidak | 0 mutasi. |
| `/khusus-smk` | `app/(app)/khusus-smk.tsx:7` | **Tidak (0 `GET`).** | Tidak | Memicu `<Redirect href="/jenjang-saya" />` (balapan ringan dengan `router.replace('/arah-saya')`, hasil akhir tetap mendarat di `/arah-saya`). |
| `/pilih-mapel` | `PilihMapelScreen.tsx:72, 223, 238` | **Ya (1–2 `GET`):** `useProdi()` (dan query mapel prodi bila ada). | Tidak | 0 mutasi. |
| `/eksplorasi-tujuan` | `EksplorasiKampusScreen.tsx:48` / `EksplorasiTujuanScreen.tsx:33, 223` | **Ya (1–2 `GET`):** `useProdi()` (kelas 7–11) atau `useEksplorasiTujuan()` + `useButirPribadi()` (kelas 12). | Tidak | 0 mutasi. |
| `/cek-posisi` | `CekPosisiScreen.tsx:31, 73` | **Ya (khusus kelas 12):** `usePosisi()` memicu `GET` kemajuan/daftar-periksa/prodi/butir-pribadi. Kelas 7–11: 0 `GET`. | Tidak | 0 mutasi. |
| `/gaya-belajar` | `GayaBelajarScreen.tsx:18–26` | **Tidak (0 `GET`).** | Tidak | 0 mutasi (`useUbahProfil` hanya saat Simpan diklik). |
| `/cerita-alumni` | `CeritaAlumniScreen.tsx:22` | **Ya (1 `GET`):** `useCeritaAlumni()`. | Tidak | 0 mutasi. |

- **Ringkasan risiko:** **0/17** rute memicu izin kamera/mikrofon/galeri, **0/17** memicu mutasi tulis atau penyimpanan lokal, tetapi **15/17** rute memicu 1–4 permintaan `GET` baca yang mubazir sesaat sebelum pengalihan (dan `/khusus-smk` memicu `<Redirect>` sementara).
- **Usulan perbaikan terkecil (belum dikerjakan — tidak mengubah kode di 041):**
  - Saat nanti aturan tidak menyentuh berkas rute v1 dicabut untuk perapihan kecil, atau lewat `metro.config.js`: **keluarkan 17 rute `app/(app)/*.tsx` tersebut dari bundel Metro saat `EXPO_PUBLIC_NAVIGASI_V2=1 && EXPO_PUBLIC_ALAT_BELAJAR !== '1'`** (persis seperti pola `metro.config.js` yang sudah dipakai 031/032 untuk `/arah-saya`, `/jejak-waktu`, `/langkah-saya`!), disertai fallback `app/+not-found.tsx` yang mengalihkan ke `/arah-saya`; **atau** jika ingin tetap di runtime tanpa `metro.config.js`, ganti `<Slot />` di `app/(app)/_layout.tsx` agar memakai `screenLayout` (Expo Router) yang mengembalikan `<Redirect href="/arah-saya" />` untuk rute tertutup sehingga komponen layar v1 **sama sekali tidak pernah dipasang** tanpa melepas navigator `<Slot />`!
