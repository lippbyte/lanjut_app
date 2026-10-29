-- 021_event_sekolah_jenis_smp.sql
-- LANJUT_076b: jenis event untuk SMP. Pilihan di app: UTS, UAS/PAS, Ulangan
-- Harian, TKA (kelas 9), Lainnya. Nilai yang disimpan: 'UAS' (label "UAS/PAS"),
-- 'Ulangan' (label "Ulangan Harian"), ditambah dua nilai baru 'PAS' dan 'TKA'.
-- Nilai lama tetap sah. Tidak ada baris yang diubah atau dihapus.
--
-- Berkas baru, bukan suntingan 020: 020 sudah dijalankan di basis data uji
-- (pilihan percakapan LANJUT_076b, belum disetujui PM — DoD menyebut "migrasi
-- tidak ditambahkan", tetapi ENUM tidak bisa diperluas tanpa DDL).
--
-- Nilai baru ditaruh di AKHIR daftar ENUM: urutan nilai lama tidak berubah,
-- jadi isi kolom yang sudah tersimpan tetap sama persis.
--
-- IDEMPOTEN: MODIFY ke definisi yang sama boleh dijalankan berulang tanpa galat.
ALTER TABLE event_sekolah
  MODIFY COLUMN jenis ENUM('UTS', 'UAS', 'Ulangan', 'Lainnya', 'PAS', 'TKA') NOT NULL;
