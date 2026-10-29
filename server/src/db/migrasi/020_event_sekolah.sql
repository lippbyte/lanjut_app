-- 020_event_sekolah.sql
-- Persiapan Event (LANJUT_076): ujian/ulangan sekolah yang dicatat siswa kelas
-- 7–11 sendiri (jenis, tanggal, mapel, materi singkat, kartu Arsip). Data anak di
-- bawah 18 tahun, jadi fiturnya DIMATIKAN secara bawaan lewat saklar
-- event_sekolah_aktif = 0 (pola ai_aktif). Saklar baru dinyalakan setelah
-- kebijakan privasi versi 2 ditinjau dan dirilis.
--
-- Hapus event = DELETE baris sungguhan (bukan hapus lunak). Akun dihapus →
-- event ikut terhapus (ON DELETE CASCADE). mapel/kartu hilang → kolomnya NULL.
--
-- IDEMPOTEN: CREATE TABLE IF NOT EXISTS dan INSERT ... ON DUPLICATE KEY UPDATE
-- kunci = kunci (nilai saklar yang sudah ada tidak ditimpa), jadi berkas ini
-- aman dijalankan ulang tanpa galat.
CREATE TABLE IF NOT EXISTS event_sekolah (
  id CHAR(36) NOT NULL,
  pengguna_id CHAR(36) NOT NULL,
  jenis ENUM('UTS', 'UAS', 'Ulangan', 'Lainnya') NOT NULL,
  tanggal DATE NOT NULL,
  mapel_id VARCHAR(64) NULL,
  materi_teks VARCHAR(200) NULL,
  kartu_id VARCHAR(64) NULL,
  dibuat_pada DATETIME NOT NULL,
  diubah_pada DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_event_sekolah_pengguna_tanggal (pengguna_id, tanggal),
  KEY idx_event_sekolah_mapel (mapel_id),
  KEY idx_event_sekolah_kartu (kartu_id),
  CONSTRAINT fk_event_sekolah_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE,
  CONSTRAINT fk_event_sekolah_mapel
    FOREIGN KEY (mapel_id) REFERENCES mapel (id) ON DELETE SET NULL,
  CONSTRAINT fk_event_sekolah_kartu
    FOREIGN KEY (kartu_id) REFERENCES kartu (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO konfigurasi_levelin (kunci, nilai, versi, dasar, diubah_pada)
VALUES
  ('event_sekolah_aktif', '0', 1,
   'Saklar Persiapan Event kelas 7–11 (LANJUT_076). 1 = aktif, 0 = fitur tidak tampil dan endpoint /pengguna/event menjawab 403 FITUR_BELUM_AKTIF. Bawaan 0: nyalakan hanya setelah kebijakan privasi versi 2 ditinjau dan dirilis (keputusan PM).',
   UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE kunci = kunci;
