# Draf teks Discover

**Status:** draf, menunggu persetujuan Khalifa. **Task:** LANJUT_024 seri v2. DRAF, belum disetujui.

Teks ini belum tampil ke siapa pun. Layarnya tidak ada di aplikasi sampai build dibuat dengan `EXPO_PUBLIC_DISCOVER=1`, dan rutenya tidak ada di server sampai `DISCOVER_AKTIF=1`. Keduanya bawaannya mati, dan tidak ada profil `eas.json` yang menyalakannya. Fitur ini baru untuk lingkungan dev.

`docs/persetujuan-teks-rilis.json` sengaja tidak diubah, karena fitur ini belum masuk rilis. Teks kebijakan, surat, dan landing tidak diubah.

Sumber teks: `lib/discover.ts`, `lib/beranda.ts`, `components/layout/AppShell.tsx`, dan `server/data-konten/discover.json`. Tabel di bawah dibuat dari sumber itu. Tes `server/tests/discover-app.test.js` memastikan setiap teks layar tercatat di sini.

## Yang perlu diputuskan

1. **Isi enam kartu contoh** di `server/data-konten/discover.json`. Semuanya ditulis agen, berstatus `draf` dan `belum_diverifikasi`, dengan `url_sumber` masih `[ISI: sumber]`. Ringkasannya sengaja hanya menjelaskan apa bidang, profesi, atau usaha itu, tanpa angka gaji, prospek, atau peringkat. Server hanya mengirim kartu yang `disetujui` (sama dengan K37), dan benih menolak kartu `disetujui` yang belum punya sumber. Verifikasi sumbernya lewat `npm run verifikasi-konten -- --jenis=discover`.
2. **Batas panjang refleksi**: 280 karakter untuk "apa yang menarik" dan 280 untuk "apa yang kurang menarik". Catatan profil 500 karakter. Ini pilihan agen.
3. **Kalimat privasi**: "Refleksi dan profilmu tersimpan di akunmu. Keduanya ikut saat kamu mengunduh data akunmu, dan ikut terhapus saat akunmu dihapus." Kalimat ini sengaja tidak menjanjikan "hanya kamu yang bisa melihat", karena pengelola layanan secara teknis bisa mengakses basis data (K29).
4. **Semua teks layar di bawah.**

## Isi kartu contoh (`server/data-konten/discover.json`)

| `id` | Jenis | Judul | Ringkasan | Sumber |
|---|---|---|---|---|
| `bidang-kesehatan` | bidang | Kesehatan | Bidang yang berhubungan dengan menjaga, memeriksa, dan memulihkan kesehatan orang. | [ISI: sumber] |
| `bidang-teknologi-informasi` | bidang | Teknologi Informasi | Bidang yang berhubungan dengan membuat dan merawat perangkat lunak, jaringan komputer, dan data. | [ISI: sumber] |
| `profesi-guru` | profesi | Guru | Pekerjaan mendampingi orang lain belajar, di sekolah maupun di tempat lain. | [ISI: sumber] |
| `profesi-teknisi-listrik` | profesi | Teknisi Listrik | Pekerjaan memasang, memeriksa, dan memperbaiki instalasi listrik. | [ISI: sumber] |
| `usaha-kuliner` | usaha | Usaha Kuliner | Usaha membuat dan menjual makanan atau minuman. | [ISI: sumber] |
| `usaha-jasa-desain` | usaha | Jasa Desain Grafis | Usaha membuat desain untuk kebutuhan orang lain, misalnya logo atau poster. | [ISI: sumber] |

## Teks layar (`TEKS_DISCOVER`)

| Kunci | Teks |
|---|---|
| `judul` | Discover |
| `pengantar` | Kenali bidang, profesi, dan usaha. Tulis apa yang menarik dan apa yang tidak, lalu lihat profil eksplorasimu. |
| `labelDraf` | Teks draf |
| `kosongJudul` | Kartu belum tersedia. |
| `kosongTeks` | Kartu Discover sedang disiapkan. Sementara itu, kamu tetap bisa membuka profil eksplorasimu. |
| `lihatProfil` | Lihat profil eksplorasimu |
| `tulisRefleksi` | Tulis refleksi |
| `ubahRefleksi` | Ubah refleksi |
| `sudahDitulis` | Sudah kamu tulis |
| `labelSumber` | Sumber |
| `judulRefleksi` | Tulis Refleksi |
| `tanyaKetertarikan` | Seberapa tertarik kamu? |
| `labelMenarik` | Apa yang menarik buatmu? |
| `labelKurangMenarik` | Apa yang kurang menarik buatmu? |
| `labelOpsional` | (boleh kosong) |
| `privasi` | Refleksi dan profilmu tersimpan di akunmu. Keduanya ikut saat kamu mengunduh data akunmu, dan ikut terhapus saat akunmu dihapus. |
| `simpan` | Simpan |
| `menyimpan` | Menyimpan… |
| `judulProfil` | Profil Eksplorasi |
| `pengantarProfil` | Profil ini hanya berisi apa yang kamu tulis dan pilih. LANJUT tidak menebak sifat atau kemampuanmu. |
| `belumAdaProfil` | Profilmu belum disusun. |
| `belumAdaProfilTeks` | Tulis refleksi di beberapa kartu, lalu susun profilmu di sini. |
| `susunProfil` | Susun profilku |
| `perbaruiProfil` | Perbarui profilku |
| `labelCatatan` | Catatan untuk dirimu sendiri |
| `catatanVersi` | Profil lama tetap tersimpan di riwayatmu. |
| `bagianDataAkun` | Dari Data Akun |
| `labelMinatRumpun` | Bidang minat |
| `labelMapelPilihan` | Mapel pilihan |
| `bagianJalurTujuan` | Jalur dan tujuanmu |
| `labelJalur` | Jalur |
| `labelTujuan` | Tujuan |
| `lihatRiwayat` | Lihat versi sebelumnya |
| `tutupRiwayat` | Tutup versi sebelumnya |
| `versiPrefix` | Versi |
| `fiturMatiJudul` | Fitur ini belum tersedia. |
| `fiturMatiTeks` | Discover sedang disiapkan. Coba buka lagi nanti. |
| `perluKebijakanJudul` | Terima kebijakan privasi dulu. |
| `perluKebijakanTeks` | Setelah itu kamu bisa mulai menulis refleksi. |
| `bacaKebijakan` | Baca dan terima |
| `jaringan` | Tidak bisa terhubung ke server. Periksa sambunganmu, lalu coba lagi. |
| `server` | Sedang ada gangguan di server. Coba lagi sebentar lagi. |
| `cobaLagi` | Coba lagi |
| `tidakDitemukanJudul` | Kartu ini tidak ditemukan. |
| `tidakDitemukanTeks` | Mungkin sedang disiapkan. Buka lagi dari Discover. |
| `kembali` | Kembali ke Discover |

## Jenis kartu (`LABEL_JENIS_KARTU`)

| Jenis | Teks |
|---|---|
| `bidang` | Bidang |
| `profesi` | Profesi |
| `usaha` | Usaha |

## Pilihan ketertarikan (`PILIHAN_KETERTARIKAN`)

| Nilai | Teks |
|---|---|
| `tertarik` | Tertarik |
| `belum_yakin` | Belum yakin |
| `tidak_tertarik` | Kurang tertarik |

## Pesan isian (`GALAT_ISIAN_DISCOVER`)

| Kunci | Teks |
|---|---|
| `ketertarikan` | Pilih salah satu dulu. |
| `refleksiPanjang` | Paling panjang 280 karakter. |
| `catatanPanjang` | Catatan paling panjang 500 karakter. |
| `tidakBerubah` | Belum ada yang berubah sejak profilmu terakhir disusun. |

## Pesan galat dari server

| Kode | Teks |
|---|---|
| `KARTU_BELUM_TERSEDIA` | Kartu ini belum tersedia. |
| `PROFIL_BUKAN_TERKINI` | Profilmu baru saja berubah. Muat ulang, lalu coba lagi. |
| `AI_BELUM_DIIZINKAN` | Terima kebijakan privasi dulu supaya bisa menyimpan refleksi. |
| `TIDAK_DITEMUKAN` | Data ini tidak ditemukan. Muat ulang, lalu coba lagi. |
| `VALIDASI_GAGAL` | Ada isian yang belum sesuai. Coba periksa lagi. |
| `TERLALU_SERING` | Terlalu banyak permintaan dalam waktu singkat. Coba lagi beberapa menit lagi. |
| `JARINGAN` | Tidak bisa terhubung ke server. Periksa sambunganmu, lalu coba lagi. |
| lainnya | Belum bisa disimpan. Coba lagi sebentar lagi. |

## Kalimat profil (`kalimatProfil`, `teksDisembunyikan`)

Setiap kalimat hanya mengulang judul kartu dan tulisan siswa sendiri.

| Keadaan | Teks |
|---|---|
| tertarik, dengan tulisan | Kamu tertarik ke <judul kartu> karena kamu menulis: "<tulisan siswa>" |
| tertarik, tanpa tulisan | Kamu tertarik ke <judul kartu>. |
| belum yakin | Kamu masih memikirkan <judul kartu>. |
| kurang tertarik, dengan tulisan | Kamu kurang tertarik ke <judul kartu> karena kamu menulis: "<tulisan siswa>" |
| kurang tertarik, tanpa tulisan | Kamu kurang tertarik ke <judul kartu>. |
| refleksi pada kartu yang belum disetujui | <jumlah> refleksi pada kartu yang sedang disiapkan belum ditampilkan. |

## Kartu di Beranda (`KARTU_DISCOVER`)

| Tempat | Teks |
|---|---|
| Judul kartu | Discover |
| Keterangan | Kenali bidang, profesi, dan usaha, lalu tulis apa yang menarik buatmu. |

## Judul di bilah atas (`AppShell.tsx`)

| Layar | Teks |
|---|---|
| `/discover` | Discover |
| `/discover-refleksi` | Tulis Refleksi |
| `/discover-profil` | Profil Eksplorasi |
