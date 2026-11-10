-- 030_model_data_v2.sql
-- Model data v2 (LANJUT_008 seri v2, Bagian 2): fondasi Portofolio & Bukti dan
-- Jalur & Tujuan. Belum ada rute atau layar yang memakai tabel ini.
-- Kontraknya ada di docs/kontrak-data-v2.md.
--
-- Tidak ada foreign key ke tabel Level-In (K7). Rujukan ke hal milik Level-In
-- memakai butir_bukti.rujukan_jenis + rujukan_id, yang SENGAJA bukan foreign key
-- dan sengaja tanpa indeks (K11).
--
-- Akun dihapus: semua baris milik akun ikut terhapus (ON DELETE CASCADE).
-- Butir bukti dihapus: lampirannya ikut terhapus. Hapus butir = DELETE sungguhan.
--
-- pengguna_jalur_minat.penanda_aktif bernilai 1 hanya untuk status 'aktif', dan
-- NULL untuk status lain. Indeks unik menganggap setiap NULL berbeda, jadi hanya
-- baris aktif yang dibatasi satu per pasangan pengguna dan jalur.
--
-- IDEMPOTEN: CREATE TABLE IF NOT EXISTS. Langkah turun ada di
-- src/db/migrasi-turun/030_model_data_v2.sql.
CREATE TABLE IF NOT EXISTS jalur_minat (
  id VARCHAR(64) NOT NULL,
  nama VARCHAR(120) NOT NULL,
  deskripsi_singkat VARCHAR(255) NOT NULL,
  status_teks ENUM('draf', 'disetujui') NOT NULL DEFAULT 'draf',
  urutan SMALLINT NOT NULL,
  aktif TINYINT(1) NOT NULL DEFAULT 1,
  sumber ENUM('resmi', 'pengguna', 'mitra') NOT NULL DEFAULT 'resmi',
  pemilik VARCHAR(64) NOT NULL,
  status_verifikasi ENUM('belum_diverifikasi', 'terverifikasi') NOT NULL DEFAULT 'belum_diverifikasi',
  asal VARCHAR(32) NOT NULL,
  url_sumber VARCHAR(500) NULL,
  diperiksa_pada DATE NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS pengguna_jalur_minat (
  id CHAR(36) NOT NULL,
  pengguna_id CHAR(36) NOT NULL,
  jalur_minat_id VARCHAR(64) NOT NULL,
  status ENUM('aktif', 'dijeda', 'selesai', 'ditinggalkan') NOT NULL DEFAULT 'aktif',
  mulai_pada DATETIME NOT NULL,
  berakhir_pada DATETIME NULL,
  diubah_pada DATETIME NOT NULL,
  penanda_aktif TINYINT GENERATED ALWAYS AS (IF(status = 'aktif', 1, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_pengguna_jalur_minat_aktif (pengguna_id, jalur_minat_id, penanda_aktif),
  KEY idx_pengguna_jalur_minat_jalur (jalur_minat_id),
  CONSTRAINT fk_pengguna_jalur_minat_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE,
  CONSTRAINT fk_pengguna_jalur_minat_jalur
    FOREIGN KEY (jalur_minat_id) REFERENCES jalur_minat (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS tujuan (
  id CHAR(36) NOT NULL,
  pengguna_id CHAR(36) NOT NULL,
  jalur_minat_id VARCHAR(64) NULL,
  judul VARCHAR(200) NOT NULL,
  uraian TEXT NULL,
  target_pada DATE NULL,
  status ENUM('aktif', 'tercapai', 'diubah', 'ditinggalkan') NOT NULL DEFAULT 'aktif',
  diubah_dari_id CHAR(36) NULL,
  dibuat_pada DATETIME NOT NULL,
  diubah_pada DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_tujuan_pengguna_status (pengguna_id, status),
  KEY idx_tujuan_jalur_minat (jalur_minat_id),
  KEY idx_tujuan_diubah_dari (diubah_dari_id),
  CONSTRAINT fk_tujuan_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE,
  CONSTRAINT fk_tujuan_jalur_minat
    FOREIGN KEY (jalur_minat_id) REFERENCES jalur_minat (id) ON DELETE SET NULL,
  CONSTRAINT fk_tujuan_diubah_dari
    FOREIGN KEY (diubah_dari_id) REFERENCES tujuan (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS butir_bukti (
  id CHAR(36) NOT NULL,
  pengguna_id CHAR(36) NOT NULL,
  jalur_minat_id VARCHAR(64) NULL,
  tujuan_id CHAR(36) NULL,
  judul VARCHAR(200) NOT NULL,
  uraian TEXT NULL,
  tautan VARCHAR(500) NULL,
  jenis ENUM('karya', 'proses', 'refleksi') NOT NULL,
  tanggal_karya DATE NULL,
  visibilitas ENUM('privat') NOT NULL DEFAULT 'privat',
  rujukan_jenis VARCHAR(32) NULL,
  rujukan_id VARCHAR(64) NULL,
  dibuat_pada DATETIME NOT NULL,
  diubah_pada DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_butir_bukti_pengguna_dibuat (pengguna_id, dibuat_pada),
  KEY idx_butir_bukti_jalur_minat (jalur_minat_id),
  KEY idx_butir_bukti_tujuan (tujuan_id),
  CONSTRAINT fk_butir_bukti_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE,
  CONSTRAINT fk_butir_bukti_jalur_minat
    FOREIGN KEY (jalur_minat_id) REFERENCES jalur_minat (id) ON DELETE SET NULL,
  CONSTRAINT fk_butir_bukti_tujuan
    FOREIGN KEY (tujuan_id) REFERENCES tujuan (id) ON DELETE SET NULL,
  CONSTRAINT chk_butir_bukti_rujukan_berpasangan
    CHECK ((rujukan_jenis IS NULL) = (rujukan_id IS NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS lampiran_butir_bukti (
  id CHAR(36) NOT NULL,
  butir_bukti_id CHAR(36) NOT NULL,
  jenis_berkas VARCHAR(100) NOT NULL,
  ukuran_byte INT UNSIGNED NOT NULL,
  nama_tersimpan VARCHAR(128) NOT NULL,
  nama_asli VARCHAR(255) NOT NULL,
  dibuat_pada DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_lampiran_butir_bukti_nama_tersimpan (nama_tersimpan),
  KEY idx_lampiran_butir_bukti_butir (butir_bukti_id),
  CONSTRAINT fk_lampiran_butir_bukti_butir
    FOREIGN KEY (butir_bukti_id) REFERENCES butir_bukti (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
