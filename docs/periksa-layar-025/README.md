# Periksa layar Jalur & Tujuan dan Discover (LANJUT_025)

**Semua isi di gambar ini dummy.** Setiap gambar diberi pita merah "DATA DUMMY · hanya dev". Kartu dan jalur bertanda `[DUMMY]` bukan konten nyata dan belum disetujui. Akunnya akun uji dari `npm run benih-dummy` (`uji_…`/`demo_…`, email `@contoh.test`), bukan siswa.

Ini hanya bukti di peramban, di komputer pengembang. **Belum** dicoba di HP, dan tidak membuktikan apa pun tentang Dokploy atau produksi.

## Cara dibuat (16 Nov 2026)

- Server API lokal di port 4100, basis data `lanjut_dev`, `NODE_ENV=development`. Saklar `JALUR_TUJUAN_AKTIF=1` dan `DISCOVER_AKTIF=1` hanya lewat lingkungan proses. AI mati (`ai_aktif = 0`), dan kunci AI dikosongkan untuk proses ini.
- Satu jalur (`melanjutkan`) dan satu kartu (`bidang-kesehatan`) ditandai disetujui hanya di `lanjut_dev` dengan `npm run benih-persetujuan-dummy`. Berkas di `server/data-konten` tidak berubah.
- Build web lokal dengan `EXPO_PUBLIC_JALUR_TUJUAN=1`, `EXPO_PUBLIC_DISCOVER=1`, dan `EXPO_PUBLIC_KELOLA_DATA_AKUN=1`. Saklar ketiga dibutuhkan untuk mencoba unduh data dan hapus akun di layar. Nilai bawaan di kode, `eas.json`, dan `.env.railway.contoh` tidak diubah.
- Edge headless, lebar 360 px, digerakkan lewat Chrome DevTools Protocol. Setiap permintaan ke luar `localhost` diblokir dan dicatat; jumlahnya 0. Galat di konsol peramban juga 0.
- Hasil cek otomatis: 58 dari 58 (dengan konten dummy) dan 5 dari 5 (sesudah `--cabut`, semua draf).

## Batas panjang

| Isian | Di layar | Di server |
|---|---|---|
| Refleksi, 280 karakter | Masuk utuh, tersimpan 280 | Diterima (200) |
| Refleksi, 281 karakter | Isian berhenti di 280; karakter ke-281 tidak bisa diketik | Ditolak (400 `VALIDASI_GAGAL`) |
| Catatan profil, 500 karakter | Masuk utuh, tersimpan 500 | Diterima |
| Catatan profil, 501 karakter | Isian berhenti di 500 | Ditolak (400 `VALIDASI_GAGAL`) |

Spasi di ujung catatan dibuang sebelum disimpan, jadi catatan 500 karakter yang berakhir dengan spasi tersimpan 499.

## Unduh data dan hapus akun

Akun `uji_belum_memilih_p25` mengisi jalur, tujuan, refleksi, dan profil lewat layar, lalu menekan "Unduh data saya". Berkas JSON yang dibuat layar memuat `refleksi_discover` (1), `profil_eksplorasi` (2 versi), `pengguna_jalur_minat` (2 babak), dan `tujuan` (2 versi). Sesudah "Hapus akun permanen", basis data tidak lagi memuat baris akun itu di `pengguna`, `refleksi_discover`, `profil_eksplorasi`, `pengguna_jalur_minat`, maupun `tujuan`.

## Gambar

| Berkas | Keterangan |
|---|---|
| [01-beranda-pintu.png](01-beranda-pintu.png) | Beranda akun uji `uji_belum_memilih_p25`: pintu Jalur & Tujuan dan Discover tampil karena saklar dinyalakan di build lokal ini. |
| [02-jalur-tujuan-awal.png](02-jalur-tujuan-awal.png) | Akun tanpa isian. Hanya satu jalur tampil, yaitu jalur yang ditandai disetujui oleh skrip dummy. Belum ada tujuan dan perjalanan. |
| [03-jalur-dipilih.png](03-jalur-dipilih.png) | Sesudah menekan "Pilih jalur ini". |
| [04-tulis-tujuan.png](04-tulis-tujuan.png) | Formulir tujuan baru, dengan jalur dummy dipilih. |
| [05-tujuan-diperbarui.png](05-tujuan-diperbarui.png) | Tujuan diperbarui sekali. "Lihat perubahan" menampilkan versi lama, yang tetap tersimpan. |
| [06-jalur-dijeda.png](06-jalur-dijeda.png) | Jalur dijeda. Karena hanya satu jalur yang disetujui, mengganti jalur dicoba sebagai jeda lalu pilih lagi. |
| [07-jalur-dipilih-lagi.png](07-jalur-dipilih-lagi.png) | Jalur dipilih lagi. Bagian Perjalananmu mencatat semua langkah, terbaru di atas. |
| [08-discover-daftar.png](08-discover-daftar.png) | Discover: hanya kartu yang ditandai disetujui oleh skrip dummy. Judul, ringkasan, dan sumbernya terbaca palsu. |
| [09-refleksi-280-281.png](09-refleksi-280-281.png) | Isian pertama berisi tepat 280 karakter. Ke isian kedua dicoba 281 karakter, tetapi isian berhenti di 280 (huruf Z terakhir tidak masuk). |
| [10-discover-sudah-ditulis.png](10-discover-sudah-ditulis.png) | Sesudah refleksi disimpan. |
| [11-profil-belum-disusun.png](11-profil-belum-disusun.png) | Profil Eksplorasi sebelum disusun. |
| [12-profil-disusun-500.png](12-profil-disusun-500.png) | Profil disusun dengan catatan 500 karakter. Isinya hanya salinan yang ditulis dan dipilih akun ini. |
| [13-profil-versi.png](13-profil-versi.png) | Catatan dicoba 501 karakter (berhenti di 500), lalu profil diperbarui. "Lihat versi sebelumnya" menampilkan versi lama. |
| [14-akun-unduh-data.png](14-akun-unduh-data.png) | Data Akun sesudah "Unduh data saya". |
| [15-hapus-akun-form.png](15-hapus-akun-form.png) | Formulir hapus akun (kata sandi tersamar). |
| [16-akun-dihapus.png](16-akun-dihapus.png) | Sesudah akun uji dihapus. |
| [17-demo-kelas12-jalur-tujuan.png](17-demo-kelas12-jalur-tujuan.png) | Akun `demo_kelas12_dc` dari benih-dummy: jalur dan tujuan dua versi. |
| [18-demo-kelas12-discover.png](18-demo-kelas12-discover.png) | Akun `demo_kelas12_dc`: refleksinya di kartu dummy tampil sebagai "Sudah kamu tulis". |
| [19-demo-kelas12-profil.png](19-demo-kelas12-profil.png) | Akun `demo_kelas12_dc`: profil dua versi. Refleksi di kartu yang masih draf tidak ditampilkan. |
| [20-akun-kosong-discover.png](20-akun-kosong-discover.png) | Akun `uji_belum_memilih` (tanpa isian): Discover. |
| [21-akun-kosong-profil.png](21-akun-kosong-profil.png) | Akun `uji_belum_memilih`: Profil Eksplorasi kosong. |
| [22-semua-draf-jalur-tujuan.png](22-semua-draf-jalur-tujuan.png) | Sesudah `--cabut`: semua jalur draf, daftar jalur kosong. |
| [23-semua-draf-discover.png](23-semua-draf-discover.png) | Sesudah `--cabut`: semua kartu draf, daftar kartu kosong. |
| [24-semua-draf-demo-kelas12-jalur-tujuan.png](24-semua-draf-demo-kelas12-jalur-tujuan.png) | Sesudah `--cabut`, akun `demo_kelas12_dc`: pilihan jalurnya yang kini draf tidak tampil, tujuannya tetap ada. |
| [25-semua-draf-demo-kelas12-profil.png](25-semua-draf-demo-kelas12-profil.png) | Sesudah `--cabut`, akun `demo_kelas12_dc`: profil tetap ada; refleksi di kartu draf disembunyikan. |

## Yang janggal (belum diubah, menunggu keputusan)

1. **Kalimat profil tidak memuat semua tulisan siswa.** Bila siswa memilih "Tertarik", hanya isian "Apa yang menarik" yang dikutip; isian "Apa yang kurang menarik" tersimpan dan ikut diunduh, tetapi tidak tampil di profil (gambar 12). Untuk "Belum yakin", kedua isian tidak dikutip. Pengantar profil berbunyi "Profil ini hanya berisi apa yang kamu tulis dan pilih", yang tetap benar, tetapi siswa bisa mengira tulisannya hilang.
2. **Jalur yang kembali draf meninggalkan jejak tanpa nama.** Sesudah `--cabut`, Perjalanan akun `demo_kelas12_dc` menampilkan "Memilih jalur" tanpa nama jalur, dan pilihannya yang masih aktif tidak bisa dijeda dari layar karena jalurnya tidak lagi ditampilkan (gambar 24). Di produksi ini terjadi bila jalur yang sudah disetujui kelak ditarik atau dinonaktifkan.
3. **Versi hanya bertanggal.** Riwayat tujuan dan versi profil hanya menampilkan tanggal, jadi dua versi di hari yang sama tampak bertanggal sama (gambar 05 dan 13).
4. **Di luar fitur ini:** di layar Data Akun, email panjang (`uji_belum_memilih_p25@contoh.test`) terpotong di tepi kartu (gambar 14).
