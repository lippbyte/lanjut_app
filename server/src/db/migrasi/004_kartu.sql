-- 004_kartu.sql
-- kartu (F6 Arsip Belajar)
-- Sumber rancangan: docs/SDD-Backend-Foundation.md §3.4 (kartu)

CREATE TABLE kartu (
  id VARCHAR(64) NOT NULL,
  pemilik_id CHAR(36) NULL,
  mapel_id VARCHAR(64) NOT NULL,
  judul VARCHAR(200) NOT NULL,
  isi TEXT NOT NULL,
  jawaban TEXT NULL,
  sumber ENUM('resmi', 'pengguna', 'mitra') NOT NULL,
  penyedia VARCHAR(120) NULL,
  pemilik VARCHAR(64) NOT NULL,
  status_verifikasi ENUM('belum_diverifikasi', 'terverifikasi') NOT NULL DEFAULT 'belum_diverifikasi',
  asal VARCHAR(32) NOT NULL,
  url_sumber VARCHAR(500) NULL,
  diperiksa_pada DATE NULL,
  dibuat_pada DATETIME NOT NULL,
  diubah_pada DATETIME NOT NULL,
  dihapus_pada DATETIME NULL,
  PRIMARY KEY (id),
  KEY idx_kartu_pemilik_mapel (pemilik_id, mapel_id),
  KEY idx_kartu_sumber_mapel (sumber, mapel_id),
  KEY idx_kartu_pemilik_dihapus (pemilik_id, dihapus_pada),
  CONSTRAINT fk_kartu_pemilik
    FOREIGN KEY (pemilik_id) REFERENCES pengguna (id) ON DELETE CASCADE,
  CONSTRAINT fk_kartu_mapel
    FOREIGN KEY (mapel_id) REFERENCES mapel (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
