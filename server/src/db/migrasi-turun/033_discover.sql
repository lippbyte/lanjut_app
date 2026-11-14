-- Langkah turun untuk migrasi 033 (LANJUT_024 seri v2). Dijalankan lewat
-- `npm run migrasi-turun -- 033_discover.sql`.
-- Refleksi dan profil eksplorasi semua siswa ikut hilang. Ekspor dulu bila masih dibutuhkan.

DROP TABLE IF EXISTS profil_eksplorasi;
DROP TABLE IF EXISTS refleksi_discover;
DROP TABLE IF EXISTS kartu_discover;
