# Draf teks Discover

**Status:** draf, menunggu persetujuan Khalifa. **Task:** LANJUT_024 seri v2. DRAF, belum disetujui.

Teks ini belum tampil ke siswa. Layarnya tidak ada di aplikasi sampai build dibuat dengan `EXPO_PUBLIC_DISCOVER=1`, dan rutenya tidak ada di server sampai `DISCOVER_AKTIF=1`. Keduanya bawaannya mati, dan tidak ada profil `eas.json` yang menyalakannya. Fitur ini baru untuk lingkungan dev.

**Kolom "Terlihat di layar (LANJUT_025)"**: `ya` berarti teks itu tampil saat layar dicoba di peramban 360 px, di `lanjut_dev`, dengan data dummy (`docs/periksa-layar-025/`). `belum` berarti tidak muncul selama uji itu, misalnya pesan galat atau keadaan fitur mati. Kolom ini **bukan tanda disetujui**: semua teks tetap draf. Belum ada yang dicoba di HP.

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

Pada LANJUT_025, isi keenam kartu ini **belum** ditampilkan. Layar diperiksa dengan satu kartu (`bidang-kesehatan`) yang ditandai disetujui hanya di `lanjut_dev`, dengan judul "[DUMMY] Kesehatan" dan ringkasan serta sumber dummy (`npm run benih-persetujuan-dummy`). Berkas di atas tetap draf.

## Teks layar (`TEKS_DISCOVER`)

| Kunci | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| `judul` | Discover | ya |
| `pengantar` | Kenali bidang, profesi, dan usaha. Tulis apa yang menarik dan apa yang tidak, lalu lihat profil eksplorasimu. | ya |
| `labelDraf` | Teks draf | ya |
| `kosongJudul` | Kartu belum tersedia. | ya |
| `kosongTeks` | Kartu Discover sedang disiapkan. Sementara itu, kamu tetap bisa membuka profil eksplorasimu. | ya |
| `lihatProfil` | Lihat profil eksplorasimu | ya |
| `tulisRefleksi` | Tulis refleksi | ya |
| `ubahRefleksi` | Ubah refleksi | ya |
| `sudahDitulis` | Sudah kamu tulis | ya |
| `labelSumber` | Sumber | ya |
| `judulRefleksi` | Tulis Refleksi | ya |
| `tanyaKetertarikan` | Seberapa tertarik kamu? | ya |
| `labelMenarik` | Apa yang menarik buatmu? | ya |
| `labelKurangMenarik` | Apa yang kurang menarik buatmu? | ya |
| `labelOpsional` | (boleh kosong) | ya |
| `privasi` | Refleksi dan profilmu tersimpan di akunmu. Keduanya ikut saat kamu mengunduh data akunmu, dan ikut terhapus saat akunmu dihapus. | ya |
| `simpan` | Simpan | ya |
| `menyimpan` | Menyimpan… | belum |
| `judulProfil` | Profil Eksplorasi | ya |
| `pengantarProfil` | Profil ini hanya berisi apa yang kamu tulis dan pilih. LANJUT tidak menebak sifat atau kemampuanmu. | ya |
| `belumAdaProfil` | Profilmu belum disusun. | ya |
| `belumAdaProfilTeks` | Tulis refleksi di beberapa kartu, lalu susun profilmu di sini. | ya |
| `susunProfil` | Susun profilku | ya |
| `perbaruiProfil` | Perbarui profilku | ya |
| `labelCatatan` | Catatan untuk dirimu sendiri | ya |
| `catatanVersi` | Profil lama tetap tersimpan di riwayatmu. | ya |
| `bagianDataAkun` | Dari Data Akun | belum |
| `labelMinatRumpun` | Bidang minat | belum |
| `labelMapelPilihan` | Mapel pilihan | belum |
| `bagianJalurTujuan` | Jalur dan tujuanmu | ya |
| `labelJalur` | Jalur | ya |
| `labelTujuan` | Tujuan | ya |
| `lihatRiwayat` | Lihat versi sebelumnya | ya |
| `tutupRiwayat` | Tutup versi sebelumnya | ya |
| `versiPrefix` | Versi | ya |
| `fiturMatiJudul` | Fitur ini belum tersedia. | belum |
| `fiturMatiTeks` | Discover sedang disiapkan. Coba buka lagi nanti. | belum |
| `perluKebijakanJudul` | Terima kebijakan privasi dulu. | belum |
| `perluKebijakanTeks` | Setelah itu kamu bisa mulai menulis refleksi. | belum |
| `bacaKebijakan` | Baca dan terima | belum |
| `jaringan` | Tidak bisa terhubung ke server. Periksa sambunganmu, lalu coba lagi. | belum |
| `server` | Sedang ada gangguan di server. Coba lagi sebentar lagi. | belum |
| `cobaLagi` | Coba lagi | belum |
| `tidakDitemukanJudul` | Kartu ini tidak ditemukan. | belum |
| `tidakDitemukanTeks` | Mungkin sedang disiapkan. Buka lagi dari Discover. | belum |
| `kembali` | Kembali ke Discover | belum |

## Jenis kartu (`LABEL_JENIS_KARTU`)

| Jenis | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| `bidang` | Bidang | ya |
| `profesi` | Profesi | belum |
| `usaha` | Usaha | belum |

## Pilihan ketertarikan (`PILIHAN_KETERTARIKAN`)

| Nilai | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| `tertarik` | Tertarik | ya |
| `belum_yakin` | Belum yakin | ya |
| `tidak_tertarik` | Kurang tertarik | ya |

## Pesan isian (`GALAT_ISIAN_DISCOVER`)

| Kunci | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| `ketertarikan` | Pilih salah satu dulu. | belum |
| `refleksiPanjang` | Paling panjang 280 karakter. | belum |
| `catatanPanjang` | Catatan paling panjang 500 karakter. | belum |
| `tidakBerubah` | Belum ada yang berubah sejak profilmu terakhir disusun. | belum |

## Pesan galat dari server

| Kode | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| `KARTU_BELUM_TERSEDIA` | Kartu ini belum tersedia. | belum |
| `PROFIL_BUKAN_TERKINI` | Profilmu baru saja berubah. Muat ulang, lalu coba lagi. | belum |
| `AI_BELUM_DIIZINKAN` | Terima kebijakan privasi dulu supaya bisa menyimpan refleksi. | belum |
| `TIDAK_DITEMUKAN` | Data ini tidak ditemukan. Muat ulang, lalu coba lagi. | belum |
| `VALIDASI_GAGAL` | Ada isian yang belum sesuai. Coba periksa lagi. | belum |
| `TERLALU_SERING` | Terlalu banyak permintaan dalam waktu singkat. Coba lagi beberapa menit lagi. | belum |
| `JARINGAN` | Tidak bisa terhubung ke server. Periksa sambunganmu, lalu coba lagi. | belum |
| lainnya | Belum bisa disimpan. Coba lagi sebentar lagi. | belum |

## Kalimat profil (`kalimatProfil`, `teksDisembunyikan`)

Setiap kalimat hanya mengulang judul kartu dan tulisan siswa sendiri.

| Keadaan | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| tertarik, dengan tulisan | Kamu tertarik ke <judul kartu> karena kamu menulis: "<tulisan siswa>" | ya |
| tertarik, tanpa tulisan | Kamu tertarik ke <judul kartu>. | belum |
| belum yakin | Kamu masih memikirkan <judul kartu>. | belum |
| kurang tertarik, dengan tulisan | Kamu kurang tertarik ke <judul kartu> karena kamu menulis: "<tulisan siswa>" | belum |
| kurang tertarik, tanpa tulisan | Kamu kurang tertarik ke <judul kartu>. | belum |
| refleksi pada kartu yang belum disetujui | <jumlah> refleksi pada kartu yang sedang disiapkan belum ditampilkan. | ya |

## Kartu di Beranda (`KARTU_DISCOVER`)

| Tempat | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| Judul kartu | Discover | ya |
| Keterangan | Kenali bidang, profesi, dan usaha, lalu tulis apa yang menarik buatmu. | ya |

## Judul di bilah atas (`AppShell.tsx`)

| Layar | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| `/discover` | Discover | ya |
| `/discover-refleksi` | Tulis Refleksi | ya |
| `/discover-profil` | Profil Eksplorasi | ya |
