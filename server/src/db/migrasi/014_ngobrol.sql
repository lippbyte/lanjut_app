-- 014_ngobrol.sql
-- Ngobrol Bareng LANJUT dengan AI lewat OpenRouter (LANJUT_051).
--
-- TIDAK ada tabel baru: isi obrolan tidak disimpan di server. Riwayat hanya
-- ada di memori app dan dikirim ulang tiap permintaan.
--
-- Yang ditambah hanya batas pemakaian per akun, di tabel konfigurasi yang
-- sudah ada (awalan `ngobrol_`), supaya biaya AI terkendali dan batasnya bisa
-- diubah tanpa deploy. Endpoint publik /konfigurasi/levelin tidak
-- mengirimnya.
INSERT INTO konfigurasi_levelin (kunci, nilai, versi, dasar, diubah_pada)
VALUES
  ('ngobrol_batas_5_menit', '10', 1,
   'Pesan AI maksimal per akun dalam 5 menit. Nilai awal LANJUT_051, bisa diubah.',
   UTC_TIMESTAMP()),
  ('ngobrol_batas_24_jam', '50', 1,
   'Pesan AI maksimal per akun dalam 24 jam, untuk mengendalikan biaya. Nilai awal LANJUT_051, bisa diubah.',
   UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE kunci = kunci;
