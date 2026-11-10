-- Langkah turun untuk migrasi 031 (LANJUT_009 seri v2). Dijalankan lewat
-- `npm run migrasi-turun -- 031_kode_hapus_akun.sql`.
-- Kode hapus akun yang tersisa hanya berlaku 5 menit, jadi aman dibuang.

DELETE FROM kode_otp_email WHERE tujuan = 'hapus_akun';

ALTER TABLE kode_otp_email
  MODIFY COLUMN tujuan ENUM('masuk', 'daftar', 'verifikasi') NOT NULL DEFAULT 'masuk';
