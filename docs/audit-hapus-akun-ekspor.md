# Audit hapus akun dan ekspor data

**Task:** LANJUT_009 seri v2, Bagian 2b.
**Dasar:** commit `cd30d39`, skema sampai migrasi 030 (31 tabel).
**Sifat:** catatan pembacaan kode dan skema. Kebijakan privasi di repo induk hanya dibaca.

## 1. Semua tempat data pribadi satu pengguna

### Tabel dengan foreign key ke `pengguna`

Semua memakai `ON DELETE CASCADE`, jadi ikut terhapus saat baris `pengguna` dihapus. Tidak perlu penghapusan eksplisit.

| Tabel | Kolom pemilik | Catatan |
|---|---|---|
| `sesi_pengguna` | `pengguna_id` | Semua sesi hilang, jadi token lama langsung tidak berlaku |
| `kemajuan` | `pengguna_id` | |
| `butir_pribadi` | `pengguna_id` | Termasuk baris yang sudah dihapus lunak |
| `kartu` | `pemilik_id` | Termasuk baris yang sudah dihapus lunak. Kartu kurasi tim (`pemilik_id` kosong) tidak tersentuh |
| `sesi_latihan` | `pengguna_id` | |
| `riwayat_latihan` | `pengguna_id` | |
| `persetujuan` | `pengguna_id` | Lihat bagian 4 |
| `modul` | `pengguna_id` | Isinya teks di basis data |
| `potongan_modul` | `pengguna_id` | Juga berantai dari `modul` |
| `event_sekolah` | `pengguna_id` | |
| `pengguna_jalur_minat` | `pengguna_id` | Tabel v2 |
| `tujuan` | `pengguna_id` | Tabel v2 |
| `butir_bukti` | `pengguna_id` | Tabel v2 |
| `lampiran_butir_bukti` | lewat `butir_bukti` | Tabel v2, berantai dari `butir_bukti` |

`pengguna.disetel_ulang_oleh` memakai `SET NULL`, jadi menghapus akun tim hanya mengosongkan kolom itu di akun lain.

Task memperkirakan 25 tabel lama dan 4 tabel baru. Dari 31 tabel, sisanya adalah data referensi dan konten umum, yang tidak memuat data pribadi: konten (`prodi`, `mapel`, dan lainnya), konfigurasi, dan `_migrasi`.

### Tabel tanpa foreign key yang memuat jejak akun

| Tabel | Dicari lewat | Tindakan |
|---|---|---|
| `percobaan_masuk` | `nama_pengguna` | Dihapus eksplisit dalam transaksi |
| `kode_otp_email` | `email_hash` | Dihapus eksplisit dalam transaksi |
| `pendaftaran_tertunda` | `email_hash` | Dihapus eksplisit dalam transaksi |
| `pemakaian_ai_harian` | Tidak ada, hanya hitungan per hari | Dipertahankan, lihat bagian 4 |

### Berkas di disk

**Saat ini tidak ada berkas milik pengguna di disk.** Unggah modul memakai `multer.memoryStorage`, dan hanya teks hasil ekstraksinya yang masuk basis data. `tests/modul.test.js` sudah menjaga hal ini. Pencarian `writeFile`, `createWriteStream`, dan `diskStorage` di `server/src` hanya menemukan alat lembar review dan log verifikasi konten, yang bukan data siswa.

Karena itu `hapusBerkasPengguna` saat ini belum punya penyedia. Bagian 3 cukup mendaftarkan penyedia foto.

### Indeks FULLTEXT

Kata dari modul yang dihapus tertinggal di indeks `potongan_modul` sampai tabelnya dirapikan. Hapus akun menjadwalkan perapian yang sama dengan hapus modul, bila akunnya punya modul. Ini titik sambung baru dari data akun ke modul Unggah (Level-In), lewat fungsi layanannya.

### Sesi, perangkat, log, cadangan, dan pihak luar

| Tempat | Isi | Ikut terhapus? |
|---|---|---|
| Token sesi di server | `sesi_pengguna` | Ya, berantai |
| Perangkat: `auth_token`, `auth_pengguna`, profil lokal per akun, cache kueri | Salinan akun | Ya, dibuang aplikasi setelah server berhasil menghapus |
| Perangkat: `lanjut.kebijakan.ditunda.v1` | Penanda sesi, bukan data pribadi | Tidak, sama seperti saat keluar biasa |
| Riwayat Ngobrol | Hanya di memori aplikasi | Hilang saat keluar |
| Log permintaan server | Metode, jalur, status, dan ID akun | **Tidak bisa dihapus aplikasi.** Berisi ID, bukan nama. ID itu tidak lagi merujuk siapa pun setelah barisnya hilang. Masa simpan tergantung server |
| Alamat IP | Memori proses pembatas laju | Hilang sendiri dalam 15–60 menit |
| Cadangan basis data (`npm run cadangan-db`) | Salinan seluruh basis data, 7 berkas terbaru | **Tidak.** Hilang saat cadangan lama terganti. Memulihkan cadangan lama mengembalikan akun yang sudah dihapus |
| OpenRouter dan penyedia model | Pesan Ngobrol yang pernah dikirim | **Tidak bisa dihapus dari sini.** Tidak ada permintaan hapus ke penyedia |
| Penyedia SMTP | Email kode yang sudah terkirim | **Tidak bisa dihapus dari sini** |
| Google | Identitas saat masuk lewat Google | **Tidak bisa dihapus dari sini.** Dikelola akun Google pengguna |

## 2. Cara masuk, sesi, dan konfirmasi ulang

| Cara masuk | Kata sandi diketahui pemilik? |
|---|---|
| Nama pengguna dan kata sandi | Ya |
| Kode email | Ya, bila akunnya pernah membuat kata sandi. Akun yang sandinya dicabut wajib membuat sandi baru lebih dulu |
| Google | **Tidak.** Akun baru mendapat hash dari nilai acak yang dibuang |

Tidak ada kolom yang membedakan akun Google dari akun biasa, jadi server tidak bisa tahu siapa yang tidak punya kata sandi. Karena itu ada dua cara konfirmasi: kata sandi, atau kode email ke alamat yang sudah terverifikasi. Kode memakai tujuan baru `hapus_akun` (migrasi 031), supaya kode masuk biasa tidak bisa dipakai, dan emailnya menyebut untuk apa kode itu diminta.

Sesi berupa token acak yang disimpan sebagai hash SHA-256, berumur 90 hari dan bergulir.

Batas laju yang dipakai:

- Per akun, tabel `percobaan_masuk`: kunci 5 menit setelah 5 gagal, 30 menit setelah 10 gagal. Rute hapus akun memakai pola yang sama.
- Baru, `batasDataAkun`: 10 permintaan per 15 menit **per akun**. Bukan per IP, karena siswa satu sekolah sering berbagi IP.
- Kode email: 3 kode per email per 15 menit, 5 percobaan per kode, berlaku 5 menit.

## 3. Pernyataan di kebijakan privasi

`docs/salinan-teks-lanjut.md` belum memuat teks tentang hapus akun atau unduh data. Yang dijanjikan `docs/kebijakan-privasi-DRAF.md`:

| Baris | Pernyataan | Keadaan setelah task ini |
|---|---|---|
| 55, 183 | Berhak melihat, membetulkan, dan meminta penghapusan | Terpenuhi lewat Unduh data dan Hapus akun, setelah saklar dinyalakan |
| 183 | "fitur hapus akun di aplikasi belum ada, jadi ajukan lewat kontak" | **Akan menjadi tidak benar** begitu saklar dinyalakan |
| 74 | Kartu dan butir yang dihapus "masih tersimpan", dengan `[ISI: kapan ... dihapus permanen]` | Hapus akun menghapusnya permanen. Hapus satu kartu tetap lunak, dan isian ini masih terbuka |
| 73 | Catatan teknis server memuat ID akun | Sesuai kenyataan. Masa simpan masih `[ISI]` |
| 188–192 | Masa simpan data | Masih `[ISI]` |
| Lampiran A | Daftar tabel dan data | Belum memuat empat tabel v2, dan masih menyebut endpoint klaim data tamu yang sudah dihapus di LANJUT_004 |
| Lampiran A | Tidak menyebut cadangan basis data | **Perlu ditambah.** Data di cadangan bertahan setelah akun dihapus |
| Lampiran C, butir 4 | Pertanyaan terbuka: apakah bukti persetujuan perlu disimpan setelah akun dihapus | Masih terbuka, lihat bagian 4 |

**Tidak ada janji masa tenggang,** jadi penghapusan berlaku seketika.

## 4. Data yang dipertahankan setelah akun dihapus

| Data | Keputusan sekarang | Alasan |
|---|---|---|
| `pemakaian_ai_harian` | Dipertahankan | Hanya hitungan per hari, tanpa ID akun |
| Log server | Tetap ada | Di luar kendali aplikasi, dan hanya berisi ID yang sudah tidak merujuk siapa pun |
| Cadangan basis data | Tetap ada sampai terganti | Tidak bisa disunting per akun |
| Catatan persetujuan (`persetujuan`) | **Ikut terhapus** | Belum ada alasan kuat yang diputuskan. Bila bukti persetujuan orang tua perlu disimpan, ini perlu keputusan dan perubahan rancangan |

## 5. Yang berbeda dari perkiraan task

- Berkas Unggah modul tidak ada di disk, jadi uji "berkas pengguna hilang" dilakukan dengan penyedia tiruan, dan uji modul memeriksa baris basis data.
- Layar baru bisa terlihat tanpa APK, karena `web` di `docker-compose.yml` ikut dibangun saat deploy. Karena teksnya masih draf, layar ditutup saklar build `EXPO_PUBLIC_KELOLA_DATA_AKUN`.
- Saat audit ini ditulis, aplikasi belum punya modul penyimpanan berkas di HP, jadi Unduh memakai lembar bagikan bawaan dengan batas 400 KB. Sejak LANJUT_013, Unduh di HP memakai `expo-sharing` tanpa batas itu. Di peramban, berkas langsung terunduh.
