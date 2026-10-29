-- 027_wajib_buat_sandi.sql
-- LANJUT_083d (keputusan PM, pilihan a): akun lama yang emailnya belum terverifikasi diambil
-- alih oleh pemilik email asli. Saat pemilik membuktikan email lewat kode email atau Google,
-- email ditandai terverifikasi, kata sandi lama dicabut (wajib_buat_sandi = 1), dan semua sesi
-- lain dicabut. Selama tanda ini aktif, masuk dengan kata sandi ditolak SANDI_PERLU_DIBUAT;
-- tanda dicabut saat kata sandi baru dibuat (POST /auth/sandi/buat). Tidak ada akun yang
-- dihapus atau diblokir; nilai bawaan 0 untuk semua akun yang ada.
ALTER TABLE pengguna
  ADD COLUMN wajib_buat_sandi TINYINT(1) NOT NULL DEFAULT 0 AFTER kata_sandi_hash;
