# Draf teks Jalur & Tujuan

**Status:** draf, menunggu persetujuan Khalifa. **Task:** LANJUT_023 seri v2. DRAF, belum disetujui.

Teks ini belum tampil ke siapa pun. Layarnya tidak ada di aplikasi sampai build dibuat dengan `EXPO_PUBLIC_JALUR_TUJUAN=1`, dan rutenya tidak ada di server sampai `JALUR_TUJUAN_AKTIF=1`. Keduanya bawaannya mati, dan tidak ada profil `eas.json` yang menyalakannya. Fitur ini baru untuk lingkungan dev.

`docs/persetujuan-teks-rilis.json` sengaja tidak diubah, karena fitur ini belum masuk rilis. Setelah teksnya disetujui, teksnya dipindahkan ke `docs/salinan-teks-lanjut.md` di repo induk dan dicatat di berkas persetujuan rilis.

Sumber teks: `lib/jalurTujuan.ts`, `lib/beranda.ts`, `components/layout/AppShell.tsx`, dan `server/data-konten/jalur-minat.json`. Tabel di bawah dibuat dari sumber itu. Tes `server/tests/jalur-tujuan-app.test.js` memastikan setiap teks layar tercatat di sini.

Nama fitur sengaja "Jalur & Tujuan", bukan "Jalur Saya", karena "Jalur Saya" sudah dipakai layar posisi kelas 12 sejak LANJUT_074. Ini pilihan agen, bisa diganti.

## Yang perlu diputuskan

1. **Nama dan deskripsi tiga jalur** di `server/data-konten/jalur-minat.json` (`status_teks: draf`). Isi berkas itu sendiri menulis "Jangan ditampilkan ke siswa sebelum disetujui".
2. **Semua teks layar di bawah.**

**Sudah diputuskan (K37, 13 Nov 2026):** server hanya mengirim jalur yang teksnya `disetujui`. Selama ketiga jalur masih draf, daftar jalur kosong, dan layar menampilkan "Pilihan jalur belum tersedia". Menulis tujuan tetap bisa. Nama fitur "Jalur & Tujuan" juga sudah diputuskan (K36).

## Teks jalur dari server (`server/data-konten/jalur-minat.json`)

| `id` | Nama | Deskripsi singkat |
|---|---|---|
| `melanjutkan` | Melanjutkan | Jalur untuk kamu yang ingin meneruskan pendidikan setelah lulus sekolah. |
| `bekerja` | Bekerja | Jalur untuk kamu yang ingin masuk ke dunia kerja setelah lulus sekolah. |
| `wirausaha` | Wirausaha | Jalur untuk kamu yang ingin merintis usaha sendiri. |

## Teks layar (`TEKS_JALUR_TUJUAN`)

| Kunci | Teks |
|---|---|
| `judul` | Jalur & Tujuan |
| `pengantar` | Jalur yang sedang kamu jalani dan tujuan yang ingin kamu capai. Boleh lebih dari satu, dan boleh berubah. |
| `labelDraf` | Teks draf |
| `bagianJalur` | Jalurmu |
| `petunjukJalur` | Pilih satu atau lebih. Kamu bisa menjedanya dan memilihnya lagi kapan saja. |
| `jalurBelumTersedia` | Pilihan jalur belum tersedia. Sementara itu, kamu tetap bisa menulis tujuan. |
| `pilih` | Pilih jalur ini |
| `pilihLagi` | Pilih lagi |
| `jeda` | Jeda dulu |
| `sedangDijalani` | Sedang kamu jalani |
| `bagianTujuan` | Tujuanmu |
| `tambahTujuan` | Tambah tujuan |
| `kosongTujuan` | Belum ada tujuan. Tulis satu hal yang ingin kamu capai. |
| `prodiImpian` | Prodi impian |
| `dariDataAkun` | Dari Data Akun |
| `ubahDiDataAkun` | Untuk mengubahnya, buka Data Akun. |
| `perbarui` | Perbarui |
| `tandaiTercapai` | Tandai tercapai |
| `lihatRiwayat` | Lihat perubahan |
| `tutupRiwayat` | Tutup perubahan |
| `sebelumnya` | Sebelumnya |
| `targetPrefix` | Target |
| `bagianPerjalanan` | Perjalananmu |
| `kosongPerjalanan` | Pilihan jalur dan tujuanmu akan tercatat di sini. |
| `judulTulis` | Tulis Tujuan |
| `labelJudul` | Tujuan |
| `labelUraian` | Cerita singkat |
| `labelTarget` | Target waktu |
| `labelJalur` | Jalur |
| `tanpaJalur` | Belum terkait jalur |
| `labelOpsional` | (boleh kosong) |
| `petunjukTanggal` | Tulis seperti ini: 2027-06-30 |
| `catatanVersi` | Tujuan yang lama tetap tersimpan di riwayatmu. |
| `simpan` | Simpan |
| `menyimpan` | Menyimpan… |
| `fiturMatiJudul` | Fitur ini belum tersedia. |
| `fiturMatiTeks` | Jalur & Tujuan sedang disiapkan. Coba buka lagi nanti. |
| `perluKebijakanJudul` | Terima kebijakan privasi dulu. |
| `perluKebijakanTeks` | Setelah itu kamu bisa mulai memilih jalur dan menulis tujuan. |
| `bacaKebijakan` | Baca dan terima |
| `jaringan` | Tidak bisa terhubung ke server. Periksa sambunganmu, lalu coba lagi. |
| `server` | Sedang ada gangguan di server. Coba lagi sebentar lagi. |
| `cobaLagi` | Coba lagi |
| `tidakDitemukanJudul` | Tujuan ini tidak ditemukan. |
| `tidakDitemukanTeks` | Mungkin sudah diperbarui. Buka lagi dari Jalur & Tujuan. |
| `kembali` | Kembali ke Jalur & Tujuan |

## Status jalur (`LABEL_STATUS_PILIHAN`)

| Status | Teks |
|---|---|
| `aktif` | Sedang dijalani |
| `dijeda` | Dijeda |
| `selesai` | Selesai |
| `ditinggalkan` | Ditinggalkan |

## Status tujuan (`LABEL_STATUS_TUJUAN`)

| Status | Teks |
|---|---|
| `aktif` | Sedang dikejar |
| `tercapai` | Tercapai |
| `diubah` | Sudah diperbarui |
| `ditinggalkan` | Ditinggalkan |

## Pesan isian (`GALAT_ISIAN_TUJUAN`)

| Kunci | Teks |
|---|---|
| `judulKosong` | Tujuannya belum diisi. |
| `judulPanjang` | Tujuan paling panjang 200 karakter. |
| `uraianPanjang` | Cerita singkat paling panjang 2000 karakter. |
| `tanggalFormat` | Tulis tanggal seperti ini: 2027-06-30. |
| `tanggalKalender` | Tanggal ini tidak ada di kalender. |
| `tidakBerubah` | Belum ada yang berubah dari tujuan sebelumnya. |

## Pesan galat dari server

| Kode | Teks |
|---|---|
| `JALUR_SUDAH_DIPILIH` | Jalur ini sudah kamu pilih. |
| `PILIHAN_SUDAH_BERAKHIR` | Jalur ini sudah tidak aktif. Pilih lagi untuk memulainya kembali. |
| `TUJUAN_BUKAN_TERKINI` | Tujuan ini sudah diperbarui. Muat ulang untuk melihat yang terbaru. |
| `AI_BELUM_DIIZINKAN` | Terima kebijakan privasi dulu supaya bisa menyimpan jalur dan tujuan. |
| `TIDAK_DITEMUKAN` | Data ini tidak ditemukan. Muat ulang, lalu coba lagi. |
| `VALIDASI_GAGAL` | Ada isian yang belum sesuai. Coba periksa lagi. |
| `TERLALU_SERING` | Terlalu banyak permintaan dalam waktu singkat. Coba lagi beberapa menit lagi. |
| `JARINGAN` | Tidak bisa terhubung ke server. Periksa sambunganmu, lalu coba lagi. |
| lainnya | Belum bisa disimpan. Coba lagi sebentar lagi. |

## Kalimat perjalanan (`teksPeristiwa`)

| Peristiwa | Teks |
|---|---|
| `jalur_dipilih` | Memilih jalur <nama jalur> |
| `jalur_dijeda` | Menjeda jalur <nama jalur> |
| `jalur_selesai` | Menyelesaikan jalur <nama jalur> |
| `jalur_ditinggalkan` | Meninggalkan jalur <nama jalur> |
| `tujuan_dibuat` | Menulis tujuan "<judul tujuan>" |
| `tujuan_diperbarui` | Memperbarui tujuan menjadi "<judul tujuan>" |
| `tujuan_tercapai` | Mencapai tujuan "<judul tujuan>" |
| `tujuan_ditinggalkan` | Meninggalkan tujuan "<judul tujuan>" |

## Kartu di Beranda (`KARTU_JALUR_TUJUAN`)

| Tempat | Teks |
|---|---|
| Judul kartu | Jalur & Tujuan |
| Keterangan | Pilih jalur yang sedang kamu jalani dan tulis tujuanmu. Boleh berubah kapan saja. |

## Judul di bilah atas (`AppShell.tsx`)

| Layar | Teks |
|---|---|
| `/jalur-tujuan` | Jalur & Tujuan |
| `/jalur-tujuan-tulis` | Tulis Tujuan |
