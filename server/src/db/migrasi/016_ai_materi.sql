-- 016_ai_materi.sql
-- AI menjelaskan materi (LANJUT_055): potongan modul Arsip dan pencarian web.
-- Di tabel konfigurasi yang sudah ada; dibaca tiap permintaan, berlaku tanpa
-- restart. Endpoint publik /konfigurasi/levelin tidak mengirimnya.
--
--   ai_modul_aktif           1 = potongan modul siswa boleh dikirim ke AI
--   ai_modul_potongan_maks   potongan maksimal per pertanyaan
--   ai_modul_skor_min        ambang skor FULLTEXT (penyaring tahap 1)
--   ai_modul_kata_min        minimal kata bermakna yang sama (penyaring tahap 1)
--   ai_web_aktif             1 = pencarian web aktif (bawaan mati)
--   ai_web_batas_harian      pencarian web per akun per hari
--   ai_web_hasil_maks        hasil web maksimal per pencarian
INSERT INTO konfigurasi_levelin (kunci, nilai, versi, dasar, diubah_pada)
VALUES
  ('ai_modul_aktif', '1', 1,
   'Potongan modul Arsip siswa boleh dikirim ke AI untuk pertanyaan materi. 0 = tidak pernah. LANJUT_055.',
   UTC_TIMESTAMP()),
  ('ai_modul_potongan_maks', '3', 1,
   'Potongan modul maksimal per pertanyaan materi. LANJUT_055.',
   UTC_TIMESTAMP()),
  ('ai_modul_skor_min', '0.1', 1,
   'Ambang dasar skor FULLTEXT (tahap 1). Skor InnoDB bergantung pada frekuensi kata di SELURUH tabel potongan, jadi turun saat topik populer; penyaring utama adalah ai_modul_kata_min. LANJUT_055.',
   UTC_TIMESTAMP()),
  ('ai_modul_kata_min', '2', 1,
   'Minimal kata bermakna yang sama antara pertanyaan dan potongan (setelah imbuhan dipotong). LANJUT_055.',
   UTC_TIMESTAMP()),
  ('ai_web_aktif', '0', 1,
   'Pencarian web lewat OpenRouter untuk pertanyaan materi. Bawaan mati sampai dinyalakan Khalifa. LANJUT_055.',
   UTC_TIMESTAMP()),
  ('ai_web_batas_harian', '10', 1,
   'Pencarian web maksimal per akun per hari. Angka akhir ditentukan Khalifa. LANJUT_055.',
   UTC_TIMESTAMP()),
  ('ai_web_hasil_maks', '3', 1,
   'Hasil web maksimal per pencarian (plugins.web.max_results). LANJUT_055.',
   UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE kunci = kunci;
