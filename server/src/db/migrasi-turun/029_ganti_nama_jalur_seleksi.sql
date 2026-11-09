-- Langkah turun untuk migrasi 029 (LANJUT_001 seri v2). Dijalankan lewat
-- `npm run migrasi-turun -- 029_ganti_nama_jalur_seleksi.sql`.

UPDATE profil_prodi
  SET kampus = REPLACE(kampus, '"jalur_seleksi"', '"jalur_masuk"');

ALTER TABLE profil_prodi
  CHANGE COLUMN peminat_jalur_seleksi peminat_jalur VARCHAR(10) NULL;

ALTER TABLE butir_daftar_periksa
  CHANGE COLUMN berlaku_untuk_jalur_seleksi berlaku_untuk_jalur VARCHAR(30) NOT NULL;

ALTER TABLE cerita_alumni
  CHANGE COLUMN jalur_seleksi jalur VARCHAR(30) NOT NULL;

ALTER TABLE tahapan_linimasa
  CHANGE COLUMN jalur_seleksi jalur ENUM('TKA', 'SNBP', 'SNBT') NOT NULL;
