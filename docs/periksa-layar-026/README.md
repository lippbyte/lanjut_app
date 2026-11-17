# Periksa ulang layar: profil, jalur draf, dan nomor versi (LANJUT_026)

**Semua isi di gambar ini dummy.** Setiap gambar diberi pita merah "DATA DUMMY · hanya dev". Kartu dan jalur bertanda `[DUMMY]` bukan konten nyata dan belum disetujui. Akunnya akun uji dari `npm run benih-dummy -- --akhiran=p26`, bukan siswa. Semua teks layar masih draf.

Ini hanya bukti di peramban, di komputer pengembang. **Belum** dicoba di HP, dan tidak membuktikan apa pun tentang Dokploy atau produksi.

## Cara dibuat (17 Nov 2026)

- Server API lokal di port 4100, basis data `lanjut_dev` (MySQL Docker di port 3309), `NODE_ENV=development`. Saklar `JALUR_TUJUAN_AKTIF=1` dan `DISCOVER_AKTIF=1` hanya lewat lingkungan proses. AI mati, dan kunci AI dikosongkan untuk proses ini.
- Build web lokal dengan `EXPO_PUBLIC_JALUR_TUJUAN=1` dan `EXPO_PUBLIC_DISCOVER=1`. Nilai bawaan di kode dan `eas.json` tidak diubah.
- Gambar 01 sampai 04 dengan `npm run benih-persetujuan-dummy` (satu jalur dan satu kartu dummy disetujui, hanya di `lanjut_dev`). Gambar 05 sampai 07 sesudah `npm run benih-persetujuan-dummy -- --cabut`, jadi jalur itu kembali draf.
- Edge headless, lebar 360 px, lewat Chrome DevTools Protocol. Permintaan ke luar `localhost` diblokir; jumlahnya 0. Galat di konsol peramban 0.
- Hasil cek otomatis: 31 dari 31. Sesudah `--cabut`, isi respons API yang diterima layar juga diperiksa: nama dan deskripsi jalur draf tidak ada di respons mana pun, dan id jalur draf tidak ada di respons pilihan jalur maupun perjalanan.

## Gambar

| Berkas | Keterangan |
|---|---|
| [01-tujuan-versi-bernomor.png](01-tujuan-versi-bernomor.png) | Tujuan diperbarui dua kali dalam beberapa detik. "Lihat perubahan" menampilkan "Versi ke-1" dan "Versi ke-2" dengan tanggal dan jam; versi ke-3 adalah kartu di atasnya. |
| [02-profil-tertarik-kedua-isian.png](02-profil-tertarik-kedua-isian.png) | Profil: pilihan "Tertarik" dengan kedua isian dikutip apa adanya, masing-masing berlabel. Di atasnya "Versi ke-1" dengan tanggal dan jam. |
| [03-profil-belum-yakin-dan-versi.png](03-profil-belum-yakin-dan-versi.png) | Pilihan diubah menjadi "Belum yakin": kedua isian tetap dikutip. Profil "Versi ke-2" di atas, "Versi ke-1" di riwayat. Keduanya dibuat pada menit yang sama, jadi yang membedakannya nomor versi. |
| [04-profil-isian-kosong.png](04-profil-isian-kosong.png) | Pilihan "Kurang tertarik", isian "apa yang menarik" dikosongkan: hanya isian yang ditulis yang tampil, tanpa teks pengganti. "Versi ke-3". |
| [05-jalur-kembali-draf.png](05-jalur-kembali-draf.png) | Sesudah `--cabut`: jalur yang dipilih akun ini kembali draf. Pilihannya tetap tampil dengan label netral dan tombol "Jeda dulu"; namanya tidak tampil. Perjalanan menulis "Memilih jalur (belum tersedia)". |
| [06-jalur-draf-dijeda.png](06-jalur-draf-dijeda.png) | Sesudah "Jeda dulu": kartu netral hilang, Perjalanan mencatat "Menjeda jalur (belum tersedia)". Memilih jalur itu lagi tetap tidak bisa (K37). |
| [07-demo-kelas12-jalur-draf.png](07-demo-kelas12-jalur-draf.png) | Akun `demo_kelas12_p26` dari benih-dummy, yang memilih jalur saat jalur itu masih draf: pilihannya tampil netral dan bisa dijeda. |

## Yang masih janggal (belum diubah)

1. Di gambar 05, kalimat "Pilihan jalur belum tersedia. Sementara itu, kamu tetap bisa menulis tujuan." tampil tepat di atas kartu "Jalur yang kamu pilih (belum tersedia)". Keduanya benar, tetapi bisa terbaca bertentangan.
2. Jam versi hanya sampai menit. Dua versi pada menit yang sama hanya terbedakan nomornya (gambar 03).
3. Id jalur draf (`melanjutkan`) masih ada di respons `GET /tujuan` untuk tujuan yang ditautkan ke jalur itu. Bukan nama atau teks, dan tidak tampil di layar, tetapi belum disamarkan. Lihat `docs/kontrak-data-v2.md` bagian 5.
