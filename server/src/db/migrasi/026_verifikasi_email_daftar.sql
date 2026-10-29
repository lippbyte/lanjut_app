-- 026_verifikasi_email_daftar.sql
-- LANJUT_083c: akun dengan email hanya dibuat setelah email terbukti milik pendaftar.
--
-- 1. pengguna.email_terverifikasi: 1 bila email terbukti lewat kode (daftar 083c atau
--    verifikasi akun lama) atau lewat Google (email_verified). Akun yang sudah ada tetap 0;
--    tidak ada akun yang dihapus atau diblokir (keputusan menunggu PM).
-- 2. kode_otp_email.tujuan: kode masuk, daftar, dan verifikasi email akun tidak bisa saling
--    dipakai. Batas 3 kode/email/15 menit dihitung per tujuan.
-- 3. pendaftaran_tertunda: data daftar sementara sampai kode benar. Email hanya SHA-256 (email
--    asli dikirim lagi saat verifikasi), kata sandi hanya hash bcrypt. Dihapus saat akun dibuat
--    atau setelah 30 menit.
ALTER TABLE pengguna
  ADD COLUMN email_terverifikasi TINYINT(1) NOT NULL DEFAULT 0 AFTER email;

ALTER TABLE kode_otp_email
  ADD COLUMN tujuan ENUM('masuk', 'daftar', 'verifikasi') NOT NULL DEFAULT 'masuk' AFTER email_hash;

CREATE TABLE pendaftaran_tertunda (
  id CHAR(36) NOT NULL,
  email_hash CHAR(64) NOT NULL,
  nama_pengguna VARCHAR(32) NOT NULL,
  nama_tampilan VARCHAR(60) NULL,
  kata_sandi_hash VARCHAR(255) NOT NULL,
  kelas ENUM('7', '8', '9', '10', '11', '12') NULL,
  jenis_sekolah ENUM('SMP', 'SMA', 'SMK', 'MA') NULL,
  prodi_tujuan VARCHAR(64) NULL,
  versi_kebijakan INT NULL,
  dibuat_pada DATETIME NOT NULL,
  kedaluwarsa_pada DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_pendaftaran_tertunda_email (email_hash),
  KEY idx_pendaftaran_tertunda_kedaluwarsa (kedaluwarsa_pada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
