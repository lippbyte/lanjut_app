# Peta Rekam Jejak v2 — Inventaris Portofolio & Bukti Sebelum Reskin (LANJUT_036)

> **Tahap:** Langkah 1 (inventaris terverifikasi terhadap kode aktual di `LANJUT_App` pada commit `5a3821b`, sebelum mengubah layar).
> **Batasan task:** reskin klien v2 saja di balik `EXPO_PUBLIC_NAVIGASI_V2` bersama `EXPO_PUBLIC_PORTOFOLIO` (keduanya mati bawaan). **Tanpa perubahan server, API, skema, migrasi, atau dependensi baru.**

---

## 1. Inventaris Lengkap Portofolio v1 di Kode

### 1.1 Rute Expo Router (3 berkas datar, diblokir di `metro.config.js` saat `EXPO_PUBLIC_PORTOFOLIO !== '1'`)
| Rute | Berkas | Komponen v1 | Penjaga lapis kedua |
|---|---|---|---|
| `/portofolio` | `app/(app)/portofolio.tsx` | `PortofolioDaftarScreen` | `if (!portofolioAktif(Constants.expoConfig?.extra)) return <Redirect href="/linimasa" />;` |
| `/portofolio-tulis` | `app/(app)/portofolio-tulis.tsx` | `PortofolioTulisScreen` (buat baru atau ubah `?id=`) | sama |
| `/portofolio-butir` | `app/(app)/portofolio-butir.tsx` | `PortofolioDetailScreen` (detail `?id=` + foto) | sama |

### 1.2 Modul, Hook, dan Komponen v1
- **`lib/portofolio.ts`** (modul murni):
  - `JENIS_BUTIR`: `karya` (`Karya`), `proses` (`Proses`), `refleksi` (`Refleksi`).
  - `BATAS_ISIAN`: `judul: 200`, `uraian: 5000`, `tautan: 500`.
  - `BATAS_FOTO`: `ukuranByte: 5 * 1024 * 1024` (5 MB), `perButir: 3`, `perAkun: 30`, `sisiTerpanjang: 1600`, `kualitas: 0.8`.
  - Validasi: `tautanSah` (hanya `http://` atau `https://`, menolak `javascript:`, `data:`, `file:`, `ftp:`), `periksaIsianButir`, `galatMedanServer`, `badanButir` (tepat 5 medan: `judul`, `jenis`, `uraian`, `tautan`, `tanggal_karya` — tidak mengirim `jalur_minat_id`, `tujuan_id`, atau `visibilitas`).
  - Keadaan & foto: `keadaanDaftar` (`memuat`, `fitur_mati` untuk 404, `perlu_kebijakan` untuk `AI_BELUM_DIIZINKAN`, `jaringan`, `server`, `kosong`, `ada`), `hitungFotoAkun`, `batasFoto`, `teksJumlahFoto`, `rencanaUkuran`, `adalahHeic`, `bisaCobaLagi` (`JARINGAN`, `TERLALU_SERING`, atau `status >= 500`), `pesanGalatPortofolio` (termasuk status `413` → `FOTO_TERLALU_BESAR`).
- **`lib/portofolioFoto.ts`**:
  - Memuat malas `expo-image-picker`, `expo-image-manipulator`, `expo-file-system` (build lama tanpa modul native menjawab `PEMILIH_TIDAK_TERSEDIA` tanpa crash).
  - Izin kamera (`requestCameraPermissionsAsync`) diminta **hanya saat kamera dipakai**; galeri tidak meminta izin. Bila izin kamera ditolak, mengembalikan `{ status: 'izin_ditolak', bisaTanyaLagi }`.
  - Konversi & pengecilan: setiap foto (termasuk HEIC/HEIF) dikodekan ulang menjadi JPEG kualitas `0.8`, sisi terpanjang maksimal `1600 px` (tanpa memperbesar gambar kecil), dengan `exif: false`. Bila ukuran hasil olahan masih `> 5 MB`, berkas sementara langsung dihapus dan mengembalikan `FOTO_TERLALU_BESAR`. Di web, HEIC yang gagal dibuka memberi kode khusus `FOTO_HEIC_PERAMBAN`.
  - Berkas asal dari pemilih langsung dibersihkan lewat `hapusBerkasSementara(aset.uri)` di blok `finally`.
- **`lib/fotoSementara.ts`**:
  - `FOLDER_FOTO_SEMENTARA = ['ImagePicker', 'ImageManipulator']`.
  - `hapusFotoSementara()` menghapus kedua folder cache sementara di perangkat (tidak melempar galat agar tidak menahan logout).
  - `hapusBerkasSementara(uri)` mencabut `blob:` URL di web atau menghapus berkas `file:` di perangkat.
- **`hooks/usePortofolio.ts`** (kunci React Query: `['butir_bukti']`):
  - `useDaftarButir()` → `GET /butir-bukti`
  - `useFotoButir(butirId, fotoId)` → `apiAmbilDataUri('/butir-bukti/:id/foto/:fotoId', token)` (`cache: 'no-store'`, `staleTime: Infinity`, `gcTime: 60_000`, kunci `['butir_bukti', 'foto', fotoId]`, disimpan di memori saja — bukan URL publik dan bukan cache disk Fresco).
  - `useSimpanButir()` → `POST /butir-bukti` atau `PATCH /butir-bukti/:id` (menyegarkan `['butir_bukti']` dengan `exact: true`).
  - `useHapusButir()` → `DELETE /butir-bukti/:id` (menghapus semua query foto butir dari cache memori + menyegarkan daftar).
  - `useHapusFoto(butirId)` → `DELETE /butir-bukti/:id/foto/:fotoId` (menghapus query foto dari cache memori + menyegarkan daftar).
  - `useUnggahFoto(butirId)` → `apiUnggah('/butir-bukti/:id/foto', { token, body: FormData, onKemajuan })` memakai `XMLHttpRequest` untuk kemajuan unggah (%).
- **`components/screens/PortofolioScreens.tsx` & `PortofolioFoto.tsx`**:
  - Daftar (`PortofolioDaftarScreen`), formulir satu layar satu tombol Simpan (`PortofolioTulisScreen` / `FormButir`), detail dengan konfirmasi hapus butir yang menyebut foto ikut terhapus (`PortofolioDetailScreen`), serta bagian foto (`BagianFoto`, `FotoTerlindung`, `SatuFoto`) dengan peringatan privasi K29, penghitung batas sebelum dilanggar, tombol galeri & kamera, penjelasan izin kamera, jalan keluar `Buka Pengaturan` saat izin ditolak, bilah kemajuan unggah, `Coba lagi` tanpa mengisi ulang butir, konfirmasi hapus satu foto, dan pembersihan berkas sementara saat unmount/selesai unggah.
- **Pembersihan saat keluar akun (`providers/AuthProvider.tsx`):**
  - `KUNCI_DATA_AKUN` memuat `['butir_bukti']`.
  - `hapusDataAkun(queryClient)` memanggil `queryClient.removeQueries({ queryKey })` dan `if (PORTOFOLIO) hapusFotoSementara();`, dijalankan pada `akhiriSesi` (401), `terapkanSesi` (ganti akun), `keluar`, dan `selesaiHapusAkun`.
- **Catatan isolasi tes v1 (`server/tests/portofolio-app.test.js:95-113`):**
  - Tes v1 memeriksa bahwa di folder `app`, `components`, `hooks`, `providers`, `api`, hanya 6 berkas v1 yang boleh mengimpor langsung dari `PortofolioScreens`, `PortofolioFoto`, `usePortofolio`, `lib/portofolio`, atau `lib/portofolioFoto`. Karena itu, kode v2 memakai `lib/rekamJejakV2.ts` (yang berada di `lib/` dan membungkus fungsi murni dari `lib/portofolio.ts` & `lib/portofolioFoto.ts`) serta hook v2 tersendiri (`hooks/useRekamJejakV2.ts`) dengan kunci cache identik `['butir_bukti']`, sehingga tes v1 tetap 100% utuh tanpa dilonggarkan.

---

## 2. Kartu Pintu Rekam Jejak di Arah Saya v2

- **Lokasi kode:** `lib/arahSaya.ts` (`daftarPintuArahSaya`, baris 223–233) dan `components/screens/v2/ArahSayaV2.tsx` (baris 22–30, 164–185).
- **Perilaku saat `EXPO_PUBLIC_PORTOFOLIO=1`:**
  - `daftarPintuArahSaya` menempatkan kartu **`Rekam Jejak`** (`judul: 'Rekam Jejak'`, `keterangan: 'Catat karya dan prosesmu.'`, `href: '/portofolio'`, `bobot: 'utama'`) di urutan pertama dengan bobot visual terbesar (`varian="brand"` + bingkai `warna.aksen`).
- **Perilaku saat `EXPO_PUBLIC_PORTOFOLIO` mati (`0` / tidak diset):**
  - `SAKLAR.portofolio` bernilai `false` → `daftarPintuArahSaya` tidak memasukkan entri `rekam_jejak` sama sekali (tidak ada kartu di Arah Saya).
  - `metro.config.js` mengeluarkan `portofolio.tsx`, `portofolio-tulis.tsx`, dan `portofolio-butir.tsx` dari bundel, ditambah penjaga `<Redirect href="/linimasa" />` di masing-masing berkas rute.
  - `lib/navigasiV2.ts`: Rekam Jejak memang bukan tab bawah; di `RUTE_ANAK_DARI_LAYAR`, rute anak `/portofolio-tulis` dan `/portofolio-butir` terikat `saklar: 'portofolio'`.
  - Label pada kartu di Arah Saya sudah `"Rekam Jejak"`, sehingga kartu di `ArahSayaV2.tsx` tidak perlu diubah.

---

## 3. Hubungan Butir dengan Jalur dan Tujuan — Temuan Audit Respons `PATCH /tujuan/bukti/:butirId`

Diperiksa langsung pada kode server aktual (tanpa mengubah server sesuai larangan LANJUT_036 §6):

1. **Keterkaitan butir ke jalur dan tujuan:**
   - Tabel `butir_bukti` memiliki kolom opsional `jalur_minat_id` dan `tujuan_id`.
   - Siswa dapat menautkan butir ke jalur dan/atau tujuan lewat **`PATCH /api/v1/tujuan/bukti/:butirId`** (`server/src/modul/tujuan/tujuan.rute.js:55`, layanan `tautkanBukti` di `server/src/modul/tujuan/tujuan.layanan.js:135-148`, skema `kaitanBuktiSkema` di `server/src/modul/tujuan/tujuan.skema.js:33-38`) — maupun lewat `POST /butir-bukti` / `PATCH /butir-bukti/:id`.
2. **Bidang pada respons butir (`bentukButir` di `butir-bukti.layanan.js:34-49`, sesudah LANJUT_035):**
   - `GET /butir-bukti`, `GET /butir-bukti/:id`, `POST /butir-bukti`, dan `PATCH /butir-bukti/:id` seluruhnya melewati `bentukButir(b, foto, tersedia)` yang memanggil `samarkanJalur(b.jalur_minat_id, tersedia)`:
     `{ id, jalur_minat_id, jalur_belum_tersedia, tujuan_id, judul, uraian, tautan, jenis, tanggal_karya, visibilitas, dibuat_pada, diubah_pada, foto }`.
   - Pada keempat rute ini, bila `jalur_minat_id` menunjuk jalur berstatus `draf` atau `nonaktif`, server mengirim `jalur_minat_id: null` dan `jalur_belum_tersedia: true`. **Tidak ada kebocoran id jalur draf di rute `/butir-bukti*`.**
3. **TEMUAN KEBOCORAN pada respons `PATCH /api/v1/tujuan/bukti/:butirId` (`tujuan.layanan.js:135-148`):**
   - Bidang respons saat ini: `{ id: b.id, jalur_minat_id: b.jalur_minat_id, tujuan_id: b.tujuan_id }` (tanpa `jalur_belum_tersedia` dan **tidak memanggil `samarkanJalur`**).
   - **Apakah masih bisa membocorkan id jalur draf? YA.**
   - **Skenario kebocoran nyata:**
     1. Sebuah `butir_bukti` sudah tertaut ke jalur yang semula disetujui (mis. `jalur_minat_id = 'melanjutkan'`), lalu jalur tersebut kembali berstatus `draf` atau `nonaktif`.
     2. Siswa memanggil `PATCH /api/v1/tujuan/bukti/:butirId` dengan body hanya `{ tujuan_id: "<uuid>" }` atau `{ tujuan_id: null }` (sah menurut `kaitanBuktiSkema` karena `jalur_minat_id` bersifat `.optional()`).
     3. Di `tautkanBukti`: `pastikanJalurTersedia(undefined)` langsung lolos, `butirRepo.ubahKaitanMilikSendiri` mempertahankan kolom `jalur_minat_id` lama (`'melanjutkan'`) di tabel, lalu baris 146–147 membaca kembali baris `b` dan mengembalikan **`{ id: b.id, jalur_minat_id: "melanjutkan", tujuan_id: ... }`** mentah ke klien.
   - **Catatan & usulan perbaikan (untuk task server kecil terpisah, tidak dilakukan di 036):**
     - Terapkan `...samarkanJalur(b.jalur_minat_id, await idJalurTersedia())` di `tujuan.layanan.js:147` agar respons `PATCH /tujuan/bukti/:butirId` konsisten mengembalikan `{ id, jalur_minat_id: null, jalur_belum_tersedia: true, tujuan_id }` saat jalurnya draf (dan `jalur_belum_tersedia: false` saat disetujui/null), sekaligus memperbarui `assert.deepEqual` 3-medan pada `server/tests/jalur-tujuan.test.js:322,324`.
     - Sebagai perlindungan sisi klien, layar Rekam Jejak v2 tetap selalu melewati `labelJalur(butir, daftarJalur)` dan tidak memanggil `PATCH /tujuan/bukti/:butirId`.

---

## 4. Pola Layar v2 yang Diikuti (dari 031–035)

1. **Komponen & token:** hanya memakai `components/v2` (`Teks`, `Tombol`, `Isian`, `Kartu`, `Sentuh`, `Ikon` Phosphor, `KeadaanKosong`, `KeadaanGalat`, `PesanStatus`, `PlaceholderMemuat`) dan `theme/v2` (`useTemaV2`, `ruang`, `radius`, `garis`, `elevasi`, `ukuran`, `keluargaHuruf`, `tataLetak`) — **0 kode HEX langsung**, tanpa warna ungu EDILAKSO, tanpa `Pressable`/`TouchableOpacity`/`TextInput` mentah di layar v2.
2. **Dua mode (terang & gelap):** bayangan kartu hanya di mode terang (`mode === 'terang' ? elevasi.angkat : elevasi.datar`); keadaan kosong memakai maskot kelinci (`assets/mascot-blue.png`) di dalam lingkaran `warna.latarMaskot` (`#B4E1EB` di kedua mode).
3. **Aksesibilitas & gerak:** target sentuh minimal `44 pt` (lewat `Sentuh`/`Tombol`/`Isian`), setiap kontrol berlabel (`peran`, `label`, `terpilih`/`dicentang` pada radio), penanda status selalu tertulis + ikon (bukan warna saja), menghormati `useKurangiGerak()`, dan `KeyboardAvoidingView` pada formulir agar papan ketik tidak menutup isian.
4. **Penamaan jalur & privasi:** semua penamaan jalur lewat `labelJalur` (`lib/jalurSayaV2.ts`), teks tetap `≤ 40` kata per keadaan layar, semua teks draf tercatat di `docs/draf-teks-rekam-jejak-v2.md` dan terdaftar di `server/tools/periksa-gerbang-rilis.js` di bawah entri `navigasi-v2`.
