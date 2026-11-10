-- Langkah turun untuk migrasi 030 (LANJUT_008 seri v2). Dijalankan lewat
-- `npm run migrasi-turun -- 030_model_data_v2.sql`.
-- Menghapus lima tabel baru beserta isinya. Tabel lama tidak disentuh.

DROP TABLE IF EXISTS lampiran_butir_bukti;

DROP TABLE IF EXISTS butir_bukti;

DROP TABLE IF EXISTS tujuan;

DROP TABLE IF EXISTS pengguna_jalur_minat;

DROP TABLE IF EXISTS jalur_minat;
