# Draf Teks Jelajah dan Profil Eksplorasi v2 (LANJUT_034)

> **Status: DRAF — belum disetujui Khalifa.**
> **Saklar:** `EXPO_PUBLIC_NAVIGASI_V2` (mati bawaan) bersama `EXPO_PUBLIC_DISCOVER` (mati bawaan). Terdaftar di `server/tools/periksa-gerbang-rilis.js` pada entri `navigasi-v2`; profil build mana pun di `eas.json` yang menyalakan `EXPO_PUBLIC_NAVIGASI_V2` akan ditahan selama berkas ini dan `lib/jelajahV2.ts` masih bertanda DRAF.
> **Nada:** mengikuti `docs/draf-teks-alur-masuk-v2.md` — pendek, menenangkan, tanpa janji hasil, tanpa tekanan, tanpa menyalin isi kartu draf dari `server/data-konten/discover.json`, tanpa mengarang sumber/tips "Cara belajar", dan tanpa klaim privasi baru.
> **Batas kata:** maksimal **40 kata teks tetap per keadaan layar** (di luar data kartu dari server dan isian siswa).

---

## 1. Kalimat Privasi Jujur (`TEKS_PRIVASI_JELAJAH`)

Menggunakan kalimat yang **sama persis** dengan `TEKS_DISCOVER.privasi` di `docs/draf-teks-discover.md` (K29, K40) — **tanpa klaim privasi baru**:

> `Refleksi dan profilmu tersimpan di akunmu. Keduanya ikut saat kamu mengunduh data akunmu, dan ikut terhapus saat akunmu dihapus.`

---

## 2. Daftar Salinan Teks (`TEKS_JELAJAH_V2` di `lib/jelajahV2.ts`)

| Kunci | Teks DRAF | Keterangan pemakaian |
|---|---|---|
| `judul` | `Jelajah` | Judul layar daftar kartu `/discover` (K47) |
| `ringkasan` | `Kenali bidang, profesi, dan usaha.` | Subjudul tenang di bawah judul Jelajah |
| `penandaSudahDitulis` | `Sudah ditulis` | Penanda tertulis + ikon centang pada kartu yang sudah memiliki refleksi |
| `penandaSudahDibaca` | `Sudah dibaca` | Penanda tertulis + ikon centang pada kartu yang sudah dibuka rinciannya pada sesi ini |
| `lihatDetail` | `Lihat detail` | Tautan/petunjuk pada kartu besar untuk membuka rincian |
| `kosongJudul` | `Kartu sedang disiapkan` | Judul keadaan kosong saat belum ada kartu disetujui (dengan maskot di lingkaran `latarMaskot`) |
| `kosongTeks` | `Sementara itu, buka Profil Saya.` | Kalimat penjelas keadaan kosong Jelajah |
| `bukaProfil` | `Buka Profil Saya` | Tombol menuju `/discover-profil` pada keadaan kosong Jelajah |
| `rincianJudul` | `Rincian` | Judul bilah atas modal rincian kartu |
| `tutup` | `Tutup` | Tombol menutup modal rincian kartu |
| `labelSumber` | `Sumber` | Awalan URL/penanda sumber (hanya tampil bila `url_sumber` ada di data) |
| `labelDiperiksa` | `Diperiksa` | Awalan tanggal pemeriksaan (hanya tampil bila `diperiksa_pada` ada di data) |
| `tulisRefleksi` | `Tulis refleksi` | Tombol pada rincian kartu bila belum ada refleksi |
| `ubahRefleksi` | `Ubah refleksi` | Tombol pada rincian kartu bila refleksi sudah ada |
| `labelCaraBelajar` | `Cara belajar` | Judul bagian tips (hanya dirender bila data server sungguh memuat bidang `cara_belajar`; saat ini tidak tampil) |
| `judulRefleksi` | `Tulis Refleksi` | Judul layar `/discover-refleksi` |
| `tanyaKetertarikan` | `Pilihanmu` | Label kelompok radio ketertarikan (`Tertarik`, `Belum yakin`, `Kurang tertarik`) |
| `labelMenarik` | `Yang menarik` | Label kolom refleksi pertama (maks 280 karakter) |
| `labelKurangMenarik` | `Kurang menarik` | Label kolom refleksi kedua (maks 280 karakter) |
| `simpan` | `Simpan` | Tombol simpan refleksi / profil |
| `hapusTulisan` | `Hapus tulisan` | Tombol mengosongkan kedua teks refleksi lewat `PUT /discover/refleksi/:kartuId` |
| `berhasilSimpanRefleksi` | `Refleksi tersimpan.` | Umpan balik 1 kalimat hangat setelah menyimpan refleksi |
| `berhasilHapusTulisan` | `Tulisan refleksi dihapus.` | Umpan balik 1 kalimat hangat setelah mengosongkan tulisan refleksi |
| `sisaAwalan` | `Sisa` | Awalan penghitung sisa karakter, mis. `Sisa 280` / `Sisa 500` |
| `melebihiAwalan` | `Melebihi` | Awalan penghitung saat teks melewati batas, mis. `Melebihi 5` |
| `satuanKarakter` | `karakter` | Satuan aksesibilitas penghitung karakter |
| `judulProfil` | `Profil Saya` | Judul layar `/discover-profil` (tab Profil Saya) |
| `ringkasanProfil` | `Isianmu apa adanya, tanpa tebakan.` | Subjudul tenang yang menegaskan tanpa AI/tafsiran (K44) |
| `belumAdaProfilJudul` | `Profil belum disusun` | Judul keadaan kosong Profil Eksplorasi (dengan maskot di lingkaran `latarMaskot`) |
| `belumAdaProfilTeks` | `Tulis refleksi dulu, lalu susun di sini.` | Kalimat penjelas keadaan kosong Profil Eksplorasi |
| `susunProfil` | `Susun profil` | Tombol membuka formulir penyusunan profil pertama |
| `ubahProfil` | `Ubah` | Tombol membuka formulir pembaruan profil / catatan |
| `lihatRiwayat` | `Lihat perubahan` | Tombol membuka riwayat versi lama profil (bernomor & berjam seperti 026) |
| `tutupRiwayat` | `Tutup perubahan` | Tombol menutup riwayat versi lama profil |
| `bagianDataAkun` | `Data Akun` | Judul bagian ringkasan `minat_rumpun` & `mapel_pilihan` |
| `labelMinatRumpun` | `Minat` | Awalan bidang minat pada profil |
| `labelMapelPilihan` | `Mapel` | Awalan mapel pilihan pada profil |
| `bagianJalurTujuan` | `Jalur & tujuan` | Judul bagian jalur aktif & tujuan aktif pada profil |
| `labelJalur` | `Jalur` | Awalan jalur aktif pada profil (selalu melalui `labelJalur`) |
| `labelTujuan` | `Tujuan` | Awalan judul tujuan pada profil |
| `labelCatatanRingkas` | `Catatan` | Label catatan pribadi di dalam kartu profil |
| `formProfilJudulBaru` | `Susun Profil` | Judul modal saat menyusun profil pertama |
| `formProfilJudulUbah` | `Ubah Profil` | Judul modal saat memperbarui profil |
| `formProfilCatatanVersi` | `Versi lama tetap tersimpan.` | Catatan singkat bahwa versi lama tidak tertimpa |
| `labelCatatan` | `Catatan pribadi` | Label kolom catatan profil (maks 500 karakter) |
| `hapusCatatan` | `Hapus catatan` | Tombol mengosongkan catatan lewat `POST /discover/profil` (`catatan: null`) |
| `batal` | `Batal` | Tombol menutup modal tanpa menyimpan |
| `berhasilSimpanProfil` | `Profil tersimpan.` | Umpan balik 1 kalimat hangat setelah menyimpan profil |
| `berhasilHapusCatatan` | `Catatan dihapus.` | Umpan balik 1 kalimat hangat setelah mengosongkan catatan |
| `memuatJelajah` | `Memuat Jelajah` | Label pembaca layar kerangka memuat Jelajah |
| `memuatProfil` | `Memuat Profil Saya` | Label pembaca layar kerangka memuat Profil Eksplorasi |
| `fiturMatiJudul` | `Fitur ini belum tersedia` | Judul saat server mengembalikan 404 (`DISCOVER_AKTIF` mati) |
| `fiturMatiTeks` | `Coba buka kembali nanti.` | Keterangan saat fitur server mati |
| `perluKebijakanJudul` | `Terima kebijakan privasi dulu` | Judul saat kebijakan privasi terkini belum diterima |
| `perluKebijakanTeks` | `Setelah itu kamu bisa memakai fitur ini.` | Keterangan pengarah penerimaan kebijakan |
| `bacaKebijakan` | `Baca kebijakan` | Tombol menuju `/terima-kebijakan` |
| `galatJudul` | `Belum bisa memuat data` | Judul `KeadaanGalat` |
| `galatPesan` | `Periksa sambunganmu, lalu coba lagi.` | Pesan `KeadaanGalat` |
| `cobaLagi` | `Coba lagi` | Tombol muat ulang pada `KeadaanGalat` |
| `tidakDitemukanJudul` | `Kartu tidak ditemukan` | Judul di `/discover-refleksi` bila kartu tidak ditemukan / kembali draf |
| `tidakDitemukanTeks` | `Mungkin sedang disiapkan kembali.` | Keterangan tenang saat kartu tidak ditemukan |
| `kembaliKeJelajah` | `Kembali` | Tombol kembali ke `/discover` |

> **Catatan teks bersama v1 (`lib/discover.ts`):** label jenis kartu (`Bidang`, `Profesi`, `Usaha`), pilihan ketertarikan (`Tertarik`, `Belum yakin`, `Kurang tertarik`), format versi (`Versi ke-<nomor> · <tanggal> pukul <jam>`), blok isi profil per kartu (`blokProfil`), kalimat refleksi disembunyikan (`teksDisembunyikan`), serta pesan validasi dan kode galat server (`GALAT_ISIAN_DISCOVER`, `pesanGalatDiscover`) memakai ulang fungsi yang sudah tercatat DRAF di `docs/draf-teks-discover.md`.

---

## 3. Hitungan Kata Teks Tetap per Keadaan Layar (`teksTetapJelajahV2`)

- **Daftar kartu Jelajah (`jelajah_daftar`):** `11 kata` (`≤ 40`).
- **Jelajah kosong (`jelajah_kosong`):** `17 kata` (`≤ 40`).
- **Rincian kartu (`jelajah_rincian`):** `11 kata` (`≤ 40`).
- **Formulir refleksi (`jelajah_refleksi`, sudah termasuk 19 kata kalimat privasi penuh):** `38 kata` (`≤ 40`).
- **Profil Eksplorasi berisi (`profil_isi`):** `20 kata` (`≤ 40`).
- **Profil Eksplorasi kosong (`profil_kosong`):** `19 kata` (`≤ 40`).
- **Formulir profil (`profil_form`, sudah termasuk 19 kata kalimat privasi penuh):** `33 kata` (`≤ 40`).
- **Keadaan galat (`galat`):** `13 kata` (`≤ 40`).
- **Keadaan perlu kebijakan (`perlu_kebijakan`):** `14 kata` (`≤ 40`).
- **Keadaan fitur mati (`fitur_mati`):** `9 kata` (`≤ 40`).
