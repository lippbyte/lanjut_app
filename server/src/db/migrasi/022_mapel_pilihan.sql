-- 022_mapel_pilihan.sql
-- Mapel pilihan akun (LANJUT_079): larik JSON berisi id mapel (mapel.id), mis.
-- ["matematika","fisika"], paling banyak 5 — divalidasi server
-- (pengguna.skema.js, pengguna.layanan.js). Satu kolom untuk semua kelas:
-- kelas 12 = "Pilih Mapel" per rumpun favorit, kelas 7–11 = "Mapel Saya".
-- Dipakai untuk urutan tampil mapel di Arsip dan Latihan.
--
-- Additive: kolom baru nullable, NULL = belum memilih.
-- IDEMPOTEN: kolom hanya ditambah bila belum ada, jadi berkas ini aman
-- dijalankan ulang tanpa galat. MySQL 8 tidak punya ADD COLUMN IF NOT EXISTS,
-- jadi lewat information_schema dan PREPARE (DO 0 = tidak melakukan apa pun).
SET @ada_mapel_pilihan := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pengguna' AND COLUMN_NAME = 'mapel_pilihan'
);

SET @sql_mapel_pilihan := IF(
  @ada_mapel_pilihan = 0,
  'ALTER TABLE pengguna ADD COLUMN mapel_pilihan JSON NULL AFTER minat_rumpun',
  'DO 0'
);

PREPARE langkah_mapel_pilihan FROM @sql_mapel_pilihan;

EXECUTE langkah_mapel_pilihan;

DEALLOCATE PREPARE langkah_mapel_pilihan;
