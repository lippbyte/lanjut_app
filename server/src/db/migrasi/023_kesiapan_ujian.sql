-- 023_kesiapan_ujian.sql
-- Kesiapan ujian akun (pilihan percakapan 15 Okt 2026, belum disetujui PM): jawaban
-- siswa sendiri atas "Seberapa siap kamu menghadapi ujian?" di Jalur Saya (kelas 12).
-- Bukan hasil tes. Hanya dipakai untuk menyesuaikan saran di Jalur Saya; TIDAK ikut
-- dikirim ke penyedia AI (ngobrol.layanan.js tidak membacanya).
--
-- Additive: kolom baru nullable, NULL = belum diisi.
-- IDEMPOTEN (pola 022): kolom hanya ditambah bila belum ada.
SET @ada_kesiapan_ujian := (
  SELECT COUNT(*) FROM information_schema.COLUMNS
   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pengguna' AND COLUMN_NAME = 'kesiapan_ujian'
);

SET @sql_kesiapan_ujian := IF(
  @ada_kesiapan_ujian = 0,
  'ALTER TABLE pengguna ADD COLUMN kesiapan_ujian ENUM(''belum'', ''sebagian'', ''hampir'', ''siap'') NULL AFTER mapel_pilihan',
  'DO 0'
);

PREPARE langkah_kesiapan_ujian FROM @sql_kesiapan_ujian;

EXECUTE langkah_kesiapan_ujian;

DEALLOCATE PREPARE langkah_kesiapan_ujian;
