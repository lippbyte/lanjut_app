-- 025_kode_otp_email.sql
-- LANJUT_083: kode masuk sekali pakai (OTP) lewat email.
--
-- Email TIDAK disimpan sebagai teks: hanya SHA-256 dari email huruf kecil. Baris
-- juga dibuat untuk email yang tidak terdaftar (kodenya tidak pernah dikirim), supaya
-- batas kirim 3 kode/15 menit berlaku sama untuk semua email dan tidak membocorkan
-- email mana yang terdaftar. Kode disimpan sebagai hash bcrypt, tidak pernah teks biasa.
--
-- jumlah_percobaan: dinaikkan SEBELUM kode dibandingkan; kode hangus setelah 5.
-- selesai_pada: diisi saat kode dipakai, hangus, atau digantikan kode yang lebih baru.
CREATE TABLE kode_otp_email (
  id CHAR(36) NOT NULL,
  email_hash CHAR(64) NOT NULL,
  kode_hash VARCHAR(255) NOT NULL,
  dibuat_pada DATETIME NOT NULL,
  kedaluwarsa_pada DATETIME NOT NULL,
  jumlah_percobaan TINYINT UNSIGNED NOT NULL DEFAULT 0,
  selesai_pada DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_kode_otp_email_email_dibuat (email_hash, dibuat_pada)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
