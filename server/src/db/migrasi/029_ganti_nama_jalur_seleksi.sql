-- LANJUT_001 seri v2: kata "jalur" untuk SNBP/SNBT/TKA menjadi `jalur_seleksi`, supaya
-- tidak bentrok dengan `jalur_minat` (jalur pengembangan, entitasnya belum dibuat).
-- Murni penggantian nama: definisi kolom sama persis, nilai tidak berubah.
-- Langkah turun: src/db/migrasi-turun/029_ganti_nama_jalur_seleksi.sql
--
-- CHANGE COLUMN dipakai (bukan RENAME COLUMN) supaya jalan di MySQL dan MariaDB.
-- Kolom status_verifikasi dan diperiksa_pada tidak disentuh.

ALTER TABLE tahapan_linimasa
  CHANGE COLUMN jalur jalur_seleksi ENUM('TKA', 'SNBP', 'SNBT') NOT NULL;

ALTER TABLE cerita_alumni
  CHANGE COLUMN jalur jalur_seleksi VARCHAR(30) NOT NULL;

ALTER TABLE butir_daftar_periksa
  CHANGE COLUMN berlaku_untuk_jalur berlaku_untuk_jalur_seleksi VARCHAR(30) NOT NULL;

ALTER TABLE profil_prodi
  CHANGE COLUMN peminat_jalur peminat_jalur_seleksi VARCHAR(10) NULL;

-- Kunci di dalam kolom JSON ikut diganti. Tanpa ini, benih berikutnya melihat isi
-- `kampus` berbeda dan mereset tanda verifikasi profil. Pola memuat tanda kutip
-- sehingga hanya kunci yang cocok, bukan kata yang sama di dalam nilai teks.
UPDATE profil_prodi
  SET kampus = REPLACE(kampus, '"jalur_masuk"', '"jalur_seleksi"');
