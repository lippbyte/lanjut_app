-- 018_pemakaian_ai.sql
-- Pemantauan agregat Ngobrol untuk pilot (LANJUT_060): SATU baris per tanggal
-- (WIB) berisi hitungan gabungan semua pengguna. SENGAJA tanpa id akun, tanpa
-- isi pesan, tanpa kueri, dan tanpa kolom teks selain tanggal: tabel ini
-- tidak bisa memuat data pribadi. Ditambah atomik oleh server
-- (src/modul/ngobrol/pemakaian.js); dibaca dengan `npm run pemakaian-ai`.
--
--   panggilan_ai     permintaan ke penyedia AI yang berhasil (jawaban + pencarian web)
--   token_masuk      jumlah token masuk (usage.prompt_tokens; 0 bila tidak ada)
--   token_keluar     jumlah token keluar (usage.completion_tokens; 0 bila tidak ada)
--   balasan_stub     balasan uji coba karena ai_aktif = 0
--   tanda_akut       pesan bertanda bahaya akut (dijawab server + kartu)
--   tanda_ringan     pesan bertanda tekanan ringan
--   tanda_model      balasan yang ditandai model butuh kartu bantuan ([[BANTUAN]])
--   galat_penyedia   permintaan ke penyedia AI yang gagal
--   web_dipakai      pencarian web yang berhasil dijalankan
--   web_kuota_habis  pertanyaan materi yang tidak dicarikan web karena kuota akun habis
--   modul_dipakai    jawaban yang memakai minimal satu potongan modul
CREATE TABLE pemakaian_ai_harian (
  tanggal DATE NOT NULL,
  panggilan_ai INT UNSIGNED NOT NULL DEFAULT 0,
  token_masuk BIGINT UNSIGNED NOT NULL DEFAULT 0,
  token_keluar BIGINT UNSIGNED NOT NULL DEFAULT 0,
  balasan_stub INT UNSIGNED NOT NULL DEFAULT 0,
  tanda_akut INT UNSIGNED NOT NULL DEFAULT 0,
  tanda_ringan INT UNSIGNED NOT NULL DEFAULT 0,
  tanda_model INT UNSIGNED NOT NULL DEFAULT 0,
  galat_penyedia INT UNSIGNED NOT NULL DEFAULT 0,
  web_dipakai INT UNSIGNED NOT NULL DEFAULT 0,
  web_kuota_habis INT UNSIGNED NOT NULL DEFAULT 0,
  modul_dipakai INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (tanggal)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tarif untuk perkiraan biaya di `npm run pemakaian-ai` (US$ per sejuta
-- token). Kosong = biaya tidak dihitung. Hanya dibaca skrip itu, bukan oleh
-- jalur jawaban.
INSERT INTO konfigurasi_levelin (kunci, nilai, versi, dasar, diubah_pada)
VALUES
  ('ai_tarif_masuk_per_juta', '', 1,
   'Tarif token masuk (US$ per sejuta token) untuk perkiraan biaya npm run pemakaian-ai. Kosong = tidak menghitung biaya. Isi dari halaman harga model di OpenRouter. LANJUT_060.',
   UTC_TIMESTAMP()),
  ('ai_tarif_keluar_per_juta', '', 1,
   'Tarif token keluar (US$ per sejuta token) untuk perkiraan biaya npm run pemakaian-ai. Kosong = tidak menghitung biaya. LANJUT_060.',
   UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE kunci = kunci;
