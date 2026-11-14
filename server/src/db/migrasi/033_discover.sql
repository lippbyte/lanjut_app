-- 033_discover.sql
-- Discover dan Profil Eksplorasi (LANJUT_024 seri v2). Belum dijalankan di produksi: migrasi ini
-- butuh persetujuan sebelum rilis. Kontraknya di docs/kontrak-data-v2.md bagian 6.
--
-- kartu_discover: konten terkurasi (bidang, profesi, usaha), dibenihkan dari
--   server/data-konten/discover.json. Hanya baris aktif dengan status_teks 'disetujui' yang
--   dikirim ke siswa atau bisa diberi refleksi (sama dengan jalur_minat, K37).
-- refleksi_discover: jawaban singkat siswa per kartu, satu baris per pasangan siswa dan kartu.
-- profil_eksplorasi: salinan jawaban siswa dan data akunnya pada satu waktu. Memperbarui profil
--   membuat versi baru lewat diubah_dari_id; versi lama menjadi 'diubah' dan isinya tidak berubah.
--   Profil tidak memuat kesimpulan tentang kepribadian, kemampuan, atau sifat siswa.
--
-- Akun dihapus: refleksi dan profil ikut terhapus (ON DELETE CASCADE).
-- profil_eksplorasi.penanda_aktif bernilai 1 hanya untuk status 'aktif', jadi indeks unik
-- membatasi satu versi aktif per siswa.
--
-- IDEMPOTEN: CREATE TABLE IF NOT EXISTS. Langkah turun ada di
-- src/db/migrasi-turun/033_discover.sql.
CREATE TABLE IF NOT EXISTS kartu_discover (
  id VARCHAR(64) NOT NULL,
  jenis ENUM('bidang', 'profesi', 'usaha') NOT NULL,
  judul VARCHAR(120) NOT NULL,
  ringkasan VARCHAR(500) NOT NULL,
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

CREATE TABLE IF NOT EXISTS refleksi_discover (
  id CHAR(36) NOT NULL,
  pengguna_id CHAR(36) NOT NULL,
  kartu_discover_id VARCHAR(64) NOT NULL,
  ketertarikan ENUM('tertarik', 'belum_yakin', 'tidak_tertarik') NOT NULL,
  yang_menarik VARCHAR(280) NULL,
  yang_kurang_menarik VARCHAR(280) NULL,
  dibuat_pada DATETIME NOT NULL,
  diubah_pada DATETIME NOT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_refleksi_discover_pengguna_kartu (pengguna_id, kartu_discover_id),
  KEY idx_refleksi_discover_kartu (kartu_discover_id),
  CONSTRAINT fk_refleksi_discover_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE,
  CONSTRAINT fk_refleksi_discover_kartu
    FOREIGN KEY (kartu_discover_id) REFERENCES kartu_discover (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS profil_eksplorasi (
  id CHAR(36) NOT NULL,
  pengguna_id CHAR(36) NOT NULL,
  isi JSON NOT NULL,
  catatan VARCHAR(500) NULL,
  status ENUM('aktif', 'diubah') NOT NULL DEFAULT 'aktif',
  diubah_dari_id CHAR(36) NULL,
  dibuat_pada DATETIME NOT NULL,
  diubah_pada DATETIME NOT NULL,
  penanda_aktif TINYINT GENERATED ALWAYS AS (IF(status = 'aktif', 1, NULL)) STORED,
  PRIMARY KEY (id),
  UNIQUE KEY uq_profil_eksplorasi_aktif (pengguna_id, penanda_aktif),
  KEY idx_profil_eksplorasi_diubah_dari (diubah_dari_id),
  CONSTRAINT fk_profil_eksplorasi_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE,
  CONSTRAINT fk_profil_eksplorasi_diubah_dari
    FOREIGN KEY (diubah_dari_id) REFERENCES profil_eksplorasi (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
