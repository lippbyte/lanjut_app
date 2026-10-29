-- 010_kelas_smp.sql
-- Kelas SMP 7–9 (LANJUT_035). SMP dan SMA/SMK memakai fitur yang sama.
--
-- Additive: hanya menambah nilai ENUM. MODIFY COLUMN memetakan nilai lama
-- menurut teksnya ('10', '11', '12' tetap '10', '11', '12'), dan NULL tetap
-- NULL. Kolom tetap nullable: akun lama tanpa kelas tidak diubah — app
-- menganggapnya bukan kelas 12 sampai siswa mengisinya.

ALTER TABLE pengguna
  MODIFY COLUMN kelas ENUM('7', '8', '9', '10', '11', '12') NULL;
