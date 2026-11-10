-- 031_kode_hapus_akun.sql
-- Hapus akun (LANJUT_009 seri v2): akun yang masuk lewat Google tidak punya kata sandi yang
-- diketahui pemiliknya, jadi identitasnya ditegaskan ulang lewat kode email. Kode ini punya
-- tujuan sendiri, supaya kode masuk tidak bisa dipakai untuk menghapus akun, dan emailnya
-- menyebut dengan jelas untuk apa kode itu diminta.
--
-- Tidak ada tabel baru. Langkah turun ada di src/db/migrasi-turun/031_kode_hapus_akun.sql.
ALTER TABLE kode_otp_email
  MODIFY COLUMN tujuan ENUM('masuk', 'daftar', 'verifikasi', 'hapus_akun') NOT NULL DEFAULT 'masuk';
