-- 003_kemajuan.sql
-- kemajuan (F5)
-- Sumber rancangan: docs/SDD-Backend-Foundation.md §3.4

CREATE TABLE kemajuan (
  pengguna_id CHAR(36) NOT NULL,
  butir_id VARCHAR(64) NOT NULL,
  selesai_pada DATETIME NULL,
  PRIMARY KEY (pengguna_id, butir_id),
  CONSTRAINT fk_kemajuan_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE,
  CONSTRAINT fk_kemajuan_butir
    FOREIGN KEY (butir_id) REFERENCES butir_daftar_periksa (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
