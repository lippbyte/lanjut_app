-- 001_pengguna_dan_sesi.sql
-- pengguna, sesi_pengguna, percobaan_masuk, _migrasi
-- Sumber rancangan: docs/SDD-Backend-Foundation.md §3.3

CREATE TABLE IF NOT EXISTS _migrasi (
  nama VARCHAR(255) PRIMARY KEY,
  dijalankan_pada DATETIME NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pengguna (
  id CHAR(36) NOT NULL,
  nama_pengguna VARCHAR(32) NOT NULL,
  nama_tampilan VARCHAR(60) NULL,
  email VARCHAR(190) NULL,
  kata_sandi_hash VARCHAR(255) NOT NULL,
  peran ENUM('siswa', 'tim') NOT NULL DEFAULT 'siswa',
  status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
  kelas ENUM('10', '11', '12') NULL,
  prodi_tujuan VARCHAR(64) NULL,
  dibuat_pada DATETIME NOT NULL,
  terakhir_masuk_pada DATETIME NULL,
  disetel_ulang_oleh CHAR(36) NULL,
  disetel_ulang_pada DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pengguna_nama_pengguna (nama_pengguna),
  UNIQUE KEY uq_pengguna_email (email),
  KEY idx_pengguna_peran_status (peran, status),
  CONSTRAINT fk_pengguna_disetel_ulang_oleh
    FOREIGN KEY (disetel_ulang_oleh) REFERENCES pengguna (id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE sesi_pengguna (
  id CHAR(36) NOT NULL,
  pengguna_id CHAR(36) NOT NULL,
  token_hash CHAR(64) NOT NULL,
  dibuat_pada DATETIME NOT NULL,
  kedaluwarsa_pada DATETIME NOT NULL,
  terakhir_dipakai_pada DATETIME NOT NULL,
  dicabut_pada DATETIME NULL,
  perangkat VARCHAR(120) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_sesi_pengguna_token_hash (token_hash),
  KEY idx_sesi_pengguna_pengguna_dicabut (pengguna_id, dicabut_pada),
  CONSTRAINT fk_sesi_pengguna_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE percobaan_masuk (
  nama_pengguna VARCHAR(32) NOT NULL,
  jumlah_gagal SMALLINT NOT NULL DEFAULT 0,
  terkunci_sampai DATETIME NULL,
  terakhir_gagal_pada DATETIME NULL,
  PRIMARY KEY (nama_pengguna)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
