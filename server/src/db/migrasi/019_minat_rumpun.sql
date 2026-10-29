-- 019_minat_rumpun.sql
-- Bidang minat akun untuk Eksplorasi Kampus (LANJUT_075): larik JSON berisi
-- nama rumpun persis seperti prodi.rumpun (mis. ["Kesehatan"]), paling banyak
-- 5 — divalidasi server (pengguna.skema.js, pengguna.layanan.js). Hanya
-- rumpun, bukan daftar prodi, dan tidak mengubah prodi_tujuan.
--
-- Additive: kolom baru nullable, NULL = belum memilih.
-- IDEMPOTEN: kolom hanya ditambah bila belum ada, jadi berkas ini aman
-- dijalankan ulang tanpa galat. MySQL 8 tidak punya ADD COLUMN IF NOT EXISTS,
-- jadi lewat information_schema dan PREPARE (DO 0 = tidak melakukan apa pun).
SET @ada_minat_rumpun := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pengguna' AND COLUMN_NAME = 'minat_rumpun'
);

SET @sql_minat_rumpun := IF(
  @ada_minat_rumpun = 0,
  'ALTER TABLE pengguna ADD COLUMN minat_rumpun JSON NULL AFTER gaya_belajar',
  'DO 0'
);

PREPARE langkah_minat_rumpun FROM @sql_minat_rumpun;

EXECUTE langkah_minat_rumpun;

DEALLOCATE PREPARE langkah_minat_rumpun;
