-- 015_ai_pengaturan.sql
-- Saklar dan pengaturan penyedia AI Ngobrol (LANJUT_053), di tabel
-- konfigurasi yang sudah ada. Dibaca tiap permintaan: berlaku tanpa restart.
-- Endpoint publik /konfigurasi/levelin tidak mengirimnya.
--
--   ai_aktif            1 = AI aktif, 0 = semua akun mendapat balasan uji coba
--                       tanpa memanggil penyedia (saklar mati seketika)
--   ai_model            model OpenRouter
--   ai_data_collection  provider.data_collection OpenRouter (allow atau deny)
--   ai_zdr              provider.zdr OpenRouter (1 = hanya endpoint ZDR)
--   ai_penyedia_only    provider.only OpenRouter, slug dipisah koma
--                       (kosong = tidak dibatasi)
--
-- LANJUT_060: bawaan ai_aktif diubah 1 → 0 (gagal-aman) untuk INSTALASI BARU.
-- Basis data yang sudah menjalankan migrasi ini tidak tersentuh (migrasi hanya
-- jalan sekali, tercatat di _migrasi; ON DUPLICATE KEY UPDATE kunci = kunci),
-- jadi nilai 1 di instalasi lama tetap 1 sampai diubah sendiri dengan SQL.
INSERT INTO konfigurasi_levelin (kunci, nilai, versi, dasar, diubah_pada)
VALUES
  ('ai_aktif', '0', 1,
   'Saklar AI Ngobrol. 1 = aktif, 0 = semua akun mendapat balasan uji coba tanpa AI. Bawaan 0 sejak LANJUT_060: nyalakan hanya setelah daftar periksa keselamatan di docs/kesiapan-rilis-uji.md terpenuhi. LANJUT_053.',
   UTC_TIMESTAMP()),
  ('ai_model', 'anthropic/claude-sonnet-5.5', 1,
   'Model OpenRouter untuk Ngobrol. LANJUT_053.',
   UTC_TIMESTAMP()),
  ('ai_data_collection', 'deny', 1,
   'provider.data_collection OpenRouter. deny = tanpa penyedia yang menyimpan data dan bisa melatih model darinya. LANJUT_053.',
   UTC_TIMESTAMP()),
  ('ai_zdr', '0', 1,
   'provider.zdr OpenRouter. 1 = hanya endpoint tanpa penyimpanan data. Mati sampai ketersediaannya untuk model dicek. LANJUT_053.',
   UTC_TIMESTAMP()),
  ('ai_penyedia_only', '', 1,
   'provider.only OpenRouter, slug penyedia dipisah koma. Kosong = tidak dibatasi. LANJUT_053.',
   UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE kunci = kunci;
