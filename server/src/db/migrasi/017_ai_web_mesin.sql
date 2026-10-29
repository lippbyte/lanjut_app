-- 017_ai_web_mesin.sql
-- Mesin pencari untuk pencarian web AI (LANJUT_057). Di tabel konfigurasi
-- yang sudah ada; dibaca tiap permintaan, berlaku tanpa restart. Endpoint
-- publik /konfigurasi/levelin tidak mengirimnya.
--
--   ai_web_mesin   '' (kosong) = mesin bawaan OpenRouter (pencarian bawaan
--                  penyedia model bila didukung, selain itu Exa); 'exa' =
--                  paksa Exa lewat plugins.web.engine. Nilai lain = pencarian
--                  web tidak dipakai (gagal-tertutup).
INSERT INTO konfigurasi_levelin (kunci, nilai, versi, dasar, diubah_pada)
VALUES
  ('ai_web_mesin', '', 1,
   'Mesin pencari web: kosong = bawaan OpenRouter, exa = paksa Exa (plugins.web.engine). Nilai lain mematikan pencarian web. LANJUT_057.',
   UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE kunci = kunci;
