-- Langkah turun untuk migrasi 032 (LANJUT_010 seri v2). Dijalankan lewat
-- `npm run migrasi-turun -- 032_berkas_tertunda_hapus.sql`.
-- Baris yang masih tertunda ikut hilang. Jalankan `npm run bersihkan-berkas` lebih dulu.

DROP TABLE IF EXISTS berkas_tertunda_hapus;
