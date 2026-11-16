# Draf teks Jalur & Tujuan

**Status:** draf, menunggu persetujuan Khalifa. **Task:** LANJUT_023 seri v2. DRAF, belum disetujui.

Teks ini belum tampil ke siswa. Layarnya tidak ada di aplikasi sampai build dibuat dengan `EXPO_PUBLIC_JALUR_TUJUAN=1`, dan rutenya tidak ada di server sampai `JALUR_TUJUAN_AKTIF=1`. Keduanya bawaannya mati, dan tidak ada profil `eas.json` yang menyalakannya. Fitur ini baru untuk lingkungan dev.

**Kolom "Terlihat di layar (LANJUT_025)"**: `ya` berarti teks itu tampil saat layar dicoba di peramban 360 px, di `lanjut_dev`, dengan data dummy (`docs/periksa-layar-025/`). `belum` berarti tidak muncul selama uji itu, misalnya pesan galat atau keadaan fitur mati. Kolom ini **bukan tanda disetujui**: semua teks tetap draf. Belum ada yang dicoba di HP.

`docs/persetujuan-teks-rilis.json` sengaja tidak diubah, karena fitur ini belum masuk rilis. Setelah teksnya disetujui, teksnya dipindahkan ke `docs/salinan-teks-lanjut.md` di repo induk dan dicatat di berkas persetujuan rilis.

Sumber teks: `lib/jalurTujuan.ts`, `lib/beranda.ts`, `components/layout/AppShell.tsx`, dan `server/data-konten/jalur-minat.json`. Tabel di bawah dibuat dari sumber itu. Tes `server/tests/jalur-tujuan-app.test.js` memastikan setiap teks layar tercatat di sini.

Nama fitur sengaja "Jalur & Tujuan", bukan "Jalur Saya", karena "Jalur Saya" sudah dipakai layar posisi kelas 12 sejak LANJUT_074. Ini pilihan agen, bisa diganti.

## Yang perlu diputuskan

1. **Nama dan deskripsi tiga jalur** di `server/data-konten/jalur-minat.json` (`status_teks: draf`). Isi berkas itu sendiri menulis "Jangan ditampilkan ke siswa sebelum disetujui".
2. **Semua teks layar di bawah.**

**Sudah diputuskan (K37, 13 Nov 2026):** server hanya mengirim jalur yang teksnya `disetujui`. Selama ketiga jalur masih draf, daftar jalur kosong, dan layar menampilkan "Pilihan jalur belum tersedia". Memilih jalur lewat API juga hanya menerima jalur yang disetujui (K37 lanjutan): jalur draf, nonaktif, atau yang tidak ada dijawab "Jalur belum tersedia". Menulis tujuan tetap bisa. Nama fitur "Jalur & Tujuan" juga sudah diputuskan (K36).

## Teks jalur dari server (`server/data-konten/jalur-minat.json`)

| `id` | Nama | Deskripsi singkat |
|---|---|---|
| `melanjutkan` | Melanjutkan | Jalur untuk kamu yang ingin meneruskan pendidikan setelah lulus sekolah. |
| `bekerja` | Bekerja | Jalur untuk kamu yang ingin masuk ke dunia kerja setelah lulus sekolah. |
| `wirausaha` | Wirausaha | Jalur untuk kamu yang ingin merintis usaha sendiri. |

Pada LANJUT_025, isi ketiga jalur ini **belum** ditampilkan. Layar diperiksa dengan satu jalur (`melanjutkan`) yang ditandai disetujui hanya di `lanjut_dev`, dengan nama "[DUMMY] Melanjutkan" dan deskripsi dummy (`npm run benih-persetujuan-dummy`). Berkas di atas tetap draf.

Status jalur di tabel `LABEL_STATUS_PILIHAN` di bawah tidak dipakai layar mana pun saat ini. Layar memakai "Sedang kamu jalani" (`sedangDijalani`) untuk jalur aktif.

## Teks layar (`TEKS_JALUR_TUJUAN`)

| Kunci | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| `judul` | Jalur & Tujuan | ya |
| `pengantar` | Jalur yang sedang kamu jalani dan tujuan yang ingin kamu capai. Boleh lebih dari satu, dan boleh berubah. | ya |
| `labelDraf` | Teks draf | ya |
| `bagianJalur` | Jalurmu | ya |
| `petunjukJalur` | Pilih satu atau lebih. Kamu bisa menjedanya dan memilihnya lagi kapan saja. | ya |
| `jalurBelumTersedia` | Pilihan jalur belum tersedia. Sementara itu, kamu tetap bisa menulis tujuan. | ya |
| `pilih` | Pilih jalur ini | ya |
| `pilihLagi` | Pilih lagi | ya |
| `jeda` | Jeda dulu | ya |
| `sedangDijalani` | Sedang kamu jalani | ya |
| `bagianTujuan` | Tujuanmu | ya |
| `tambahTujuan` | Tambah tujuan | ya |
| `kosongTujuan` | Belum ada tujuan. Tulis satu hal yang ingin kamu capai. | ya |
| `prodiImpian` | Prodi impian | belum |
| `dariDataAkun` | Dari Data Akun | belum |
| `ubahDiDataAkun` | Untuk mengubahnya, buka Data Akun. | belum |
| `perbarui` | Perbarui | ya |
| `tandaiTercapai` | Tandai tercapai | ya |
| `lihatRiwayat` | Lihat perubahan | ya |
| `tutupRiwayat` | Tutup perubahan | ya |
| `sebelumnya` | Sebelumnya | ya |
| `targetPrefix` | Target | ya |
| `bagianPerjalanan` | Perjalananmu | ya |
| `kosongPerjalanan` | Pilihan jalur dan tujuanmu akan tercatat di sini. | ya |
| `judulTulis` | Tulis Tujuan | ya |
| `labelJudul` | Tujuan | ya |
| `labelUraian` | Cerita singkat | ya |
| `labelTarget` | Target waktu | ya |
| `labelJalur` | Jalur | ya |
| `tanpaJalur` | Belum terkait jalur | ya |
| `labelOpsional` | (boleh kosong) | ya |
| `petunjukTanggal` | Tulis seperti ini: 2027-06-30 | ya |
| `catatanVersi` | Tujuan yang lama tetap tersimpan di riwayatmu. | ya |
| `simpan` | Simpan | ya |
| `menyimpan` | Menyimpan… | belum |
| `fiturMatiJudul` | Fitur ini belum tersedia. | belum |
| `fiturMatiTeks` | Jalur & Tujuan sedang disiapkan. Coba buka lagi nanti. | belum |
| `perluKebijakanJudul` | Terima kebijakan privasi dulu. | belum |
| `perluKebijakanTeks` | Setelah itu kamu bisa mulai memilih jalur dan menulis tujuan. | belum |
| `bacaKebijakan` | Baca dan terima | belum |
| `jaringan` | Tidak bisa terhubung ke server. Periksa sambunganmu, lalu coba lagi. | belum |
| `server` | Sedang ada gangguan di server. Coba lagi sebentar lagi. | belum |
| `cobaLagi` | Coba lagi | belum |
| `tidakDitemukanJudul` | Tujuan ini tidak ditemukan. | belum |
| `tidakDitemukanTeks` | Mungkin sudah diperbarui. Buka lagi dari Jalur & Tujuan. | belum |
| `kembali` | Kembali ke Jalur & Tujuan | belum |

## Status jalur (`LABEL_STATUS_PILIHAN`)

| Status | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| `aktif` | Sedang dijalani | belum |
| `dijeda` | Dijeda | belum |
| `selesai` | Selesai | belum |
| `ditinggalkan` | Ditinggalkan | belum |

## Status tujuan (`LABEL_STATUS_TUJUAN`)

| Status | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| `aktif` | Sedang dikejar | ya |
| `tercapai` | Tercapai | belum |
| `diubah` | Sudah diperbarui | belum |
| `ditinggalkan` | Ditinggalkan | belum |

## Pesan isian (`GALAT_ISIAN_TUJUAN`)

| Kunci | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| `judulKosong` | Tujuannya belum diisi. | belum |
| `judulPanjang` | Tujuan paling panjang 200 karakter. | belum |
| `uraianPanjang` | Cerita singkat paling panjang 2000 karakter. | belum |
| `tanggalFormat` | Tulis tanggal seperti ini: 2027-06-30. | belum |
| `tanggalKalender` | Tanggal ini tidak ada di kalender. | belum |
| `tidakBerubah` | Belum ada yang berubah dari tujuan sebelumnya. | belum |

## Pesan galat dari server

| Kode | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| `JALUR_SUDAH_DIPILIH` | Jalur ini sudah kamu pilih. | belum |
| `JALUR_BELUM_TERSEDIA` | Jalur ini belum tersedia. | belum |
| `PILIHAN_SUDAH_BERAKHIR` | Jalur ini sudah tidak aktif. Pilih lagi untuk memulainya kembali. | belum |
| `TUJUAN_BUKAN_TERKINI` | Tujuan ini sudah diperbarui. Muat ulang untuk melihat yang terbaru. | belum |
| `AI_BELUM_DIIZINKAN` | Terima kebijakan privasi dulu supaya bisa menyimpan jalur dan tujuan. | belum |
| `TIDAK_DITEMUKAN` | Data ini tidak ditemukan. Muat ulang, lalu coba lagi. | belum |
| `VALIDASI_GAGAL` | Ada isian yang belum sesuai. Coba periksa lagi. | belum |
| `TERLALU_SERING` | Terlalu banyak permintaan dalam waktu singkat. Coba lagi beberapa menit lagi. | belum |
| `JARINGAN` | Tidak bisa terhubung ke server. Periksa sambunganmu, lalu coba lagi. | belum |
| lainnya | Belum bisa disimpan. Coba lagi sebentar lagi. | belum |

## Kalimat perjalanan (`teksPeristiwa`)

| Peristiwa | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| `jalur_dipilih` | Memilih jalur <nama jalur> | ya |
| `jalur_dijeda` | Menjeda jalur <nama jalur> | ya |
| `jalur_selesai` | Menyelesaikan jalur <nama jalur> | belum |
| `jalur_ditinggalkan` | Meninggalkan jalur <nama jalur> | belum |
| `tujuan_dibuat` | Menulis tujuan "<judul tujuan>" | ya |
| `tujuan_diperbarui` | Memperbarui tujuan menjadi "<judul tujuan>" | ya |
| `tujuan_tercapai` | Mencapai tujuan "<judul tujuan>" | belum |
| `tujuan_ditinggalkan` | Meninggalkan tujuan "<judul tujuan>" | belum |

## Kartu di Beranda (`KARTU_JALUR_TUJUAN`)

| Tempat | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| Judul kartu | Jalur & Tujuan | ya |
| Keterangan | Pilih jalur yang sedang kamu jalani dan tulis tujuanmu. Boleh berubah kapan saja. | ya |

## Judul di bilah atas (`AppShell.tsx`)

| Layar | Teks | Terlihat di layar (LANJUT_025) |
|---|---|---|
| `/jalur-tujuan` | Jalur & Tujuan | ya |
| `/jalur-tujuan-tulis` | Tulis Tujuan | ya |
