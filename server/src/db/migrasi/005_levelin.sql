-- 005_levelin.sql
-- sesi_latihan, riwayat_latihan, konfigurasi_levelin
-- Skema dari docs/SDD-LevelIn.md §3.2, dipakai apa adanya (lihat
-- docs/SDD-Backend-Foundation.md §3.5) — tidak ada keputusan baru di sini.

CREATE TABLE sesi_latihan (
  id CHAR(36) NOT NULL,
  pengguna_id CHAR(36) NOT NULL,
  dimulai_pada DATETIME NOT NULL,
  selesai_pada DATETIME NULL,
  jumlah_kartu_direncanakan SMALLINT NOT NULL,
  mapel_fokus_id VARCHAR(64) NULL,
  asal_mula ENUM('beranda_saran', 'arsip', 'arsip_detail') NOT NULL,
  PRIMARY KEY (id),
  KEY idx_sesi_latihan_pengguna (pengguna_id),
  CONSTRAINT fk_sesi_latihan_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE,
  CONSTRAINT fk_sesi_latihan_mapel_fokus
    FOREIGN KEY (mapel_fokus_id) REFERENCES mapel (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE riwayat_latihan (
  id CHAR(36) NOT NULL,
  pengguna_id CHAR(36) NOT NULL,
  kartu_id VARCHAR(64) NULL,
  benar TINYINT(1) NOT NULL,
  dijawab_pada DATETIME NOT NULL,
  sesi_id CHAR(36) NULL,
  keyakinan TINYINT NULL,
  mapel_id VARCHAR(64) NULL,
  gap_numerik DECIMAL(3, 2) NULL,
  kelas_gap ENUM('overconfident', 'underconfident', 'selaras', 'netral') NULL,
  aturan_versi SMALLINT NULL,
  PRIMARY KEY (id),
  KEY idx_riwayat_latihan_pengguna_mapel_waktu (pengguna_id, mapel_id, dijawab_pada DESC),
  KEY idx_riwayat_latihan_sesi (sesi_id),
  CONSTRAINT fk_riwayat_latihan_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE,
  CONSTRAINT fk_riwayat_latihan_kartu
    FOREIGN KEY (kartu_id) REFERENCES kartu (id) ON DELETE SET NULL,
  CONSTRAINT fk_riwayat_latihan_sesi
    FOREIGN KEY (sesi_id) REFERENCES sesi_latihan (id) ON DELETE SET NULL,
  CONSTRAINT fk_riwayat_latihan_mapel
    FOREIGN KEY (mapel_id) REFERENCES mapel (id) ON DELETE SET NULL,
  CONSTRAINT chk_riwayat_latihan_keyakinan CHECK (keyakinan IS NULL OR keyakinan BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE konfigurasi_levelin (
  kunci VARCHAR(64) NOT NULL,
  nilai VARCHAR(120) NOT NULL,
  versi SMALLINT NOT NULL DEFAULT 1,
  dasar TEXT NOT NULL,
  diubah_pada DATETIME NOT NULL,
  PRIMARY KEY (kunci)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
