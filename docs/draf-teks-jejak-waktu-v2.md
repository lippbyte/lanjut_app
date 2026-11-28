# Draf Teks Jejak Waktu dan Langkah Saya v2 (LANJUT_032)

> **Status: DRAF — belum disetujui Khalifa.**
> **Saklar:** `EXPO_PUBLIC_NAVIGASI_V2` (mati bawaan). Terdaftar di `server/tools/periksa-gerbang-rilis.js` pada entri `navigasi-v2`; build profil mana pun di `eas.json` yang menyalakan saklar ini akan ditahan selama teks masih bertanda DRAF.
> **Nada:** mengikuti `docs/draf-teks-alur-masuk-v2.md` dan `salinan-teks-lanjut.md` §0 — pendek, menenangkan, jujur tanpa menebak tanggal, tanpa tekanan tenggat, dan tanpa janji hasil.
> **Batas kata:** maksimal **40 kata teks tetap per layar** (di luar data konten/siswa).

---

## 1. Jejak Waktu (`/jejak-waktu` — `lib/jejakWaktuV2.ts`)

### Aturan jendela & tampilan waktu
- **Jendela "Segera":** `JENDELA_SEGERA_HARI = 30` hari kalender ke depan dari tengah malam `Asia/Jakarta` (`hariIniWib`), termasuk tahapan rentang tanggal yang sedang berlangsung hari ini.
- **Jarak waktu:** bilangan hari statis (`Hari ini`, `N hari lagi`), tanpa hitungan mundur berdetak.
- **Tanpa tanggal resmi:** selalu menampilkan `Tanggal resmi belum diumumkan` (tidak pernah menebak tanggal).

### Daftar salinan teks (`TEKS_JEJAK_WAKTU`)

| Kunci | Teks DRAF | Keterangan pemakaian |
|---|---|---|
| `judul` | `Jejak Waktu` | Judul layar H1 |
| `ringkasan` | `Jadwal pentingmu, tenang tanpa buru-buru.` | Subjudul layar |
| `segeraJudul` | `Segera` | Judul kelompok jadwal 0–30 hari ke depan / sedang berlangsung |
| `berikutnyaJudul` | `Berikutnya` | Judul kelompok jadwal > 30 hari ke depan atau belum bertanggal resmi |
| `sudahLewatJudul` | `Sudah lewat` | Judul kelompok terlipat untuk butir yang tanggal akhirnya sudah lewat |
| `lencanaSegera` | `Segera` | Penanda teks pada butir kelompok Segera (bukan warna merah/oranye) |
| `tanggalBelumAda` | `Tanggal resmi belum diumumkan` | Ditampilkan saat data belum memuat tanggal sah `YYYY-MM-DD` |
| `hariIni` | `Hari ini` | Jarak waktu saat selisih 0 hari |
| `hariLagiAkhiran` | `hari lagi` | Akhiran jarak waktu statis, mis. `24 hari lagi` |
| `sedangBerlangsung` | `Sedang berlangsung` | Keterangan rincian untuk rentang tanggal yang sudah mulai dan belum tutup |
| `jenisTenggat` | `Tenggat` | Label jenis butir tenggat pendaftaran/pengisian |
| `jenisEvent` | `Event` | Label jenis butir pelaksanaan/jadwal sekolah |
| `jenisPengumuman` | `Pengumuman` | Label jenis butir pengumuman hasil |
| `labelTerverifikasi` | `Terverifikasi` | Penanda bahwa baris berasal dari konten `terverifikasi` |
| `awalanSumber` | `Sumber:` | Awalan nama lembaga sumber resmi pada rincian |
| `awalanDicek` | `Dicek` | Awalan tanggal pemeriksaan sumber, mis. `Dicek 27 September 2026` |
| `awalanJalurSeleksi` | `Jalur seleksi:` | Awalan informasi `TKA` / `SNBP` / `SNBT` pada rincian |
| `bukaLangkah` | `Buka Langkah Saya` | Tautan di rincian butir menuju `/langkah-saya` |
| `tutupRincian` | `Sembunyikan rincian` | Petunjuk pembaca layar saat rincian terbuka |
| `lihatRincian` | `Lihat rincian` | Petunjuk pembaca layar saat rincian tertutup |
| `kosongJudul` | `Belum ada jadwal saat ini` | Judul keadaan kosong bawaan (kelas belum terisi) |
| `kosongTeks` | `Siapkan langkahmu pelan saja.` | Kalimat penjelas keadaan kosong bawaan |
| `kosongKelas12Judul` | `Jadwal seleksi 2027 belum diumumkan` | Judul keadaan kosong kelas 12 saat tidak ada jadwal aktif (LANJUT_042) |
| `kosongKelas12Teks` | `SNPMB belum merilis jadwal resmi 2027. Tanggal yang belum resmi tidak kami tampilkan.` | Kalimat jujur kelas 12; didampingi tanggal periksa & sumber dari `server/data-konten/linimasa.json` (`Dicek … · snpmb.id (beranda)`) |
| `kosongSma1011Judul` | `Jadwal kelas 10–11 belum tersedia` | Judul keadaan kosong kelas 10–11 (LANJUT_042) |
| `kosongSma1011Teks` | `Jadwal resmi untuk jenjangmu belum tersedia di LANJUT. Kamu bisa mulai dari Langkah Saya.` | Kalimat jujur kelas 10–11; tidak menunjuk layar kosong Jalur Saya / Jelajah |
| `kosongSmpJudul` | `Jadwal SMP belum tersedia` | Judul keadaan kosong SMP kelas 7–9 (LANJUT_042) |
| `kosongSmpTeks` | `Jadwal resmi untuk SMP belum tersedia di LANJUT. Kamu bisa mulai dari Langkah Saya.` | Kalimat jujur SMP kelas 7–9; menunjuk ke Langkah Saya |
| `kosongTombolLangkah` | `Langkah Saya` | Tombol tunggal keadaan kosong Jejak Waktu menuju `/langkah-saya` |
| `memuatLabel` | `Memuat Jejak Waktu` | Label pembaca layar pada kerangka memuat |
| `galatJudul` | `Belum bisa memuat jadwal` | Judul `KeadaanGalat` |
| `galatPesan` | `Periksa sambunganmu, lalu coba lagi.` | Pesan `KeadaanGalat` |
| `cobaLagi` | `Coba lagi` | Label tombol muat ulang |

### Hitungan kata teks tetap Jejak Waktu
- **Keadaan berisi (ketiga kelompok tampil):** `11 kata` (`≤ 40`).
- **Keadaan kosong kelas 12 (termasuk label `Dicek` & lipatan `Sudah lewat`):** `30 kata` teks tetap (`35 kata` termasuk tanggal & sumber data, `≤ 40`).
- **Keadaan kosong kelas 10–11:** `28 kata` (`≤ 40`).
- **Keadaan kosong SMP (termasuk `Sudah lewat` bila ada):** `29 kata` (`≤ 40`).
- **Keadaan galat:** `18 kata` (`≤ 40`).

---

## 2. Langkah Saya (`/langkah-saya` — `lib/langkahSayaV2.ts`)

### Daftar salinan teks (`TEKS_LANGKAH_SAYA`)

| Kunci | Teks DRAF | Keterangan pemakaian |
|---|---|---|
| `judul` | `Langkah Saya` | Judul layar H1 & bilah atas |
| `ringkasan` | `Satu per satu, sesuai ritmemu.` | Subjudul layar |
| `saringKelasLabel` | `Kelas` | Label baris pil kelas pada kelas 12 |
| `saringJalurLabel` | `Jalur` | Label baris pil jalur seleksi (`TKA`, `SNBP`, `SNBT`) pada kelas 12 |
| `awalanKelas` | `Kelas` | Awalan label pil kelas (`Kelas 10`, `Kelas 11`, `Kelas 12`) |
| `pilihJalurJudul` | `Pilih jalur seleksimu dulu` | Judul pengarah saat `jalur_seleksi` belum dipilih di perangkat (kelas 12) |
| `pilihJalurTeks` | `Supaya daftar langkah sesuai kebutuhanmu.` | Kalimat pengarah pemilihan jalur seleksi |
| `progresLabelAkses` | `Progres langkah selesai` | Label pembaca layar pada batang progres |
| `progresDari` | `dari` | Kata penghubung ringkasan progres (`3 dari 8 selesai`) |
| `progresSelesai` | `selesai` | Kata penutup ringkasan progres (`3 dari 8 selesai`) |
| `kalimatKosong` | `Mulai dari satu langkah yang paling ringan.` | Kalimat progres saat `0` selesai |
| `kalimatBerjalan` | `Pelan-pelan, langkahmu terus bertambah.` | Kalimat progres saat sebagian selesai |
| `kalimatSemuaSelesai` | `Semua langkah di daftar ini sudah siap. Istirahat sejenak juga boleh.` | Kalimat hangat singkat saat seluruh butir selesai |
| `lencanaSelesai` | `Selesai` | Label pendamping ikon centang saat semua selesai |
| `hapus` | `Hapus` | Tombol hapus butir pribadi |
| `awalanHapusButir` | `Hapus langkah:` | Awalan label aksesibilitas tombol hapus butir pribadi |
| `konfirmasiHapusButir` | `Hapus langkah pribadi ini?` | Pertanyaan konfirmasi sebelum menghapus butir pribadi |
| `yaHapus` | `Ya, hapus` | Tombol konfirmasi hapus |
| `batal` | `Batal` | Tombol batal konfirmasi |
| `galatSimpan` | `Perubahan belum tersimpan. Coba lagi.` | Pesan galat mutasi centang/hapus |
| `catatanSnpmbRingkas` | `Perlu dicek ke laman resmi SNPMB · belum diverifikasi.` | Penanda jujur saat butir umum SNPMB belum terverifikasi |
| `pintuTambahPribadi` | `Tambah dari Pilih Mapel` | Tautan ke `/pilih-mapel` untuk menambah butir pribadi |
| `pintuEksplorasi` | `Eksplorasi Kampus` | Tautan ke `/eksplorasi-tujuan` untuk menambah butir riset kampus |
| `kosongJudul` | `Belum ada langkah tersimpan` | Judul keadaan kosong (bersama maskot di lingkaran `#B4E1EB`) |
| `kosongTeks` | `Simpan langkah saat kamu siap.` | Kalimat penjelas keadaan kosong |
| `kosongTombolMapel` | `Pilih Mapel` | Tombol keadaan kosong menuju `/pilih-mapel` |
| `kosongTombolTambahJadwal` | `Tambah jadwal` | Tombol keadaan kosong SMP saat fitur `event_sekolah_aktif` menyala |
| `jadwalSmpJudul` | `Jadwal sekolah` | Judul seksi pengelolaan `event_sekolah` SMP (memakai ulang `TEKS_EVENT` untuk formulir) |
| `tambahJadwal` | `Tambah jadwal` | Tombol membuka formulir tambah jadwal SMP |
| `tambahRisetProdi` | `Tambah langkah riset prodi` | Tombol lokal kelas 10–11 (kosong & bawah daftar) serta kelas 12 (bawah daftar) (LANJUT_042 — DRAF) |
| `risetJudulPilih` | `Pilih prodi` | Judul bilah atas langkah 1 modal riset prodi (LANJUT_042 — DRAF) |
| `risetRingkasPilih` | `Pilih prodi yang ingin kamu cari tahu.` | Pengantar singkat langkah pilih prodi (LANJUT_042 — DRAF) |
| `risetCariLabel` | `Cari prodi` | Label kolom pencarian daftar prodi (LANJUT_042 — DRAF) |
| `risetCariPetunjuk` | `Ketik nama prodi atau bidang.` | Petunjuk kolom pencarian prodi (LANJUT_042 — DRAF) |
| `risetSudahAda` | `Sudah ada` | Penanda tertulis bila prodi sudah tersimpan sebagai langkah riset (LANJUT_042 — DRAF) |
| `risetKosongJudul` | `Prodi belum tersedia` | Judul keadaan kosong bila daftar prodi kosong (LANJUT_042 — DRAF) |
| `risetKosongTeks` | `Coba lagi nanti.` | Keterangan keadaan kosong daftar prodi (LANJUT_042 — DRAF) |
| `risetCariKosongJudul` | `Prodi tidak ditemukan` | Judul saat kata pencarian tidak cocok (LANJUT_042 — DRAF) |
| `risetCariKosongTeks` | `Coba kata kunci lain.` | Keterangan saat kata pencarian tidak cocok (LANJUT_042 — DRAF) |
| `risetMemuatLabel` | `Memuat daftar prodi` | Label pembaca layar saat daftar prodi dimuat (LANJUT_042 — DRAF) |
| `risetGalatMuatJudul` | `Daftar prodi belum bisa dimuat` | Judul galat muat daftar prodi (LANJUT_042 — DRAF) |
| `risetGalatMuatPesan` | `Periksa sambunganmu, lalu coba lagi.` | Pesan galat muat daftar prodi (LANJUT_042 — DRAF) |
| `risetKonfirmasiJudul` | `Tambah ke Langkah Saya?` | Judul bilah atas langkah 2 konfirmasi riset prodi (LANJUT_042 — DRAF) |
| `risetKonfirmasiTeks` | `Langkah riset ini akan masuk ke daftarmu.` | Kalimat konfirmasi singkat sebelum menyimpan (LANJUT_042 — DRAF) |
| `risetSimpan` | `Simpan langkah` | Tombol utama konfirmasi menyimpan ke `POST /butir-pribadi` (LANJUT_042 — DRAF) |
| `risetGantiProdi` | `Pilih prodi lain` | Tombol kembali memilih prodi lain (LANJUT_042 — DRAF) |
| `risetGalatBatasLaju` | `Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.` | Pesan galat batas laju (`429`) saat menyimpan (LANJUT_042 — DRAF) |
| `risetGalatSimpan` | `Langkah belum tersimpan. Periksa sambunganmu, lalu coba lagi.` | Pesan galat jaringan saat menyimpan (LANJUT_042 — DRAF) |
| `memuatLabel` | `Memuat Langkah Saya` | Label pembaca layar pada kerangka memuat |
| `galatJudul` | `Belum bisa memuat langkah` | Judul `KeadaanGalat` |
| `galatPesan` | `Periksa sambunganmu, lalu coba lagi.` | Pesan `KeadaanGalat` |
| `cobaLagi` | `Coba lagi` | Label tombol muat ulang |

### Hitungan kata teks tetap Langkah Saya
- **Kelas 12 berisi (kasus terpanjang: semua selesai + catatan SNPMB + tombol riset prodi):** `36 kata` (`≤ 40`).
- **Kelas 12 belum memilih jalur seleksi (+ tombol riset prodi):** `20 kata` (`≤ 40`).
- **Butir pribadi saja (+ tombol riset prodi):** `26 kata` (`≤ 40`).
- **Keadaan kosong kelas 10–11 (+ tombol riset prodi):** `18 kata` (`≤ 40`).
- **Modal riset prodi — pilih prodi:** `19 kata` (`≤ 40`); **kosong:** `9 kata`; **cari kosong:** `17 kata`; **galat muat:** `15 kata`; **konfirmasi (+ galat):** `25 kata` (`≤ 40`).
- **Keadaan galat:** `16 kata` (`≤ 40`).
