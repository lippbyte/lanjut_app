-- 011_jenis_sekolah.sql
-- Jenis sekolah (LANJUT_038): bagian "Kalau kamu anak SMK" di Jenjang Saya
-- hanya untuk siswa SMK, dan `kelas` saja tidak bisa membedakan SMA/SMK/MA.
--
-- Additive: kolom baru nullable. Kelas 7–9 pasti SMP, jadi langsung diisi di
-- sini (siswa SMP tidak pernah ditanya). Kelas 10–12 dibiarkan NULL — app
-- menahan akun itu di gerbang sampai siswa memilih SMA, SMK, atau MA. Aturan
-- yang sama untuk akun baru ada di server/src/util/kelas.js.

ALTER TABLE pengguna
  ADD COLUMN jenis_sekolah ENUM('SMP', 'SMA', 'SMK', 'MA') NULL AFTER kelas;

UPDATE pengguna SET jenis_sekolah = 'SMP' WHERE kelas IN ('7', '8', '9');
