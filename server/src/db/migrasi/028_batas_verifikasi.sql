-- 028_batas_verifikasi.sql
-- LANJUT_084 (keputusan PM 22 Okt 2026): akun lama yang emailnya belum terverifikasi diberi
-- tenggat 7 hari. Setelah batas_verifikasi lewat dan email masih belum terverifikasi, masuk
-- dengan kata sandi ditolak EMAIL_BELUM_DIVERIFIKASI. Masuk dengan kode email atau Google tetap
-- bisa dan mengambil alih akun seperti LANJUT_083d. NULL = tanpa tenggat (semua akun lain).
-- Tidak ada akun yang dihapus atau diblokir, dan tidak ada email yang dikirim.
--
-- Tenggat diisi sekali di sini untuk akun non-uji (bukan demo_... atau uji...) yang punya email
-- dan emailnya belum terverifikasi. Waktu disimpan dalam UTC seperti kolom DATETIME lain (pool
-- memakai timezone 'Z'), jadi dipakai UTC_TIMESTAMP(), bukan NOW() yang ikut zona waktu MySQL.
ALTER TABLE pengguna
  ADD COLUMN batas_verifikasi DATETIME NULL AFTER email_terverifikasi;

UPDATE pengguna
   SET batas_verifikasi = UTC_TIMESTAMP() + INTERVAL 7 DAY
 WHERE email IS NOT NULL
   AND email_terverifikasi = 0
   AND batas_verifikasi IS NULL
   AND nama_pengguna NOT LIKE 'demo\_%'
   AND nama_pengguna NOT LIKE 'uji%';
