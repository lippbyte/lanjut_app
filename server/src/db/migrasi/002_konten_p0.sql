-- 002_konten_p0.sql
-- tahapan_linimasa, butir_khusus_smk, prodi, mapel, prodi_mapel,
-- cerita_alumni, butir_daftar_periksa (+ kategori_checklist)
-- Sumber rancangan: docs/SDD-Backend-Foundation.md §3.4
--
-- CATATAN PENYIMPANGAN KECIL (dilaporkan di server/README.md juga):
-- tabel `kategori_checklist` DITAMBAHKAN di luar §3.4. app/data/checklist.json
-- mengelompokkan butir ke dalam kategori ("Berkas Pendaftaran", dst.) dan
-- catatan di berkas itu sendiri menyarankan "kalau nanti masuk basis data,
-- kategori sebaiknya jadi tabel sendiri, bukan teks bebas". §3.4 SDD-Backend
-- tidak menyebut tabel ini sama sekali (kemungkinan luput dicatat), jadi
-- tabel ini ditambahkan seminimal mungkin (2 kolom + FK) supaya endpoint
-- checklist F5 bisa mengembalikan pengelompokan yang sama seperti JSON
-- sekarang, tanpa mengubah bentuk 5 kolom inti `butir_daftar_periksa` yang
-- memang dikunci §3.4.

CREATE TABLE kategori_checklist (
  id VARCHAR(64) NOT NULL,
  nama VARCHAR(120) NOT NULL,
  urutan SMALLINT NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tahapan_linimasa (
  id VARCHAR(64) NOT NULL,
  judul VARCHAR(200) NOT NULL,
  tanggal_mulai DATE NOT NULL,
  tanggal_selesai DATE NULL,
  jalur ENUM('TKA', 'SNBP', 'SNBT') NOT NULL,
  sumber ENUM('resmi', 'pengguna', 'mitra') NOT NULL DEFAULT 'resmi',
  pemilik VARCHAR(64) NOT NULL,
  status_verifikasi ENUM('belum_diverifikasi', 'terverifikasi') NOT NULL DEFAULT 'belum_diverifikasi',
  asal VARCHAR(32) NOT NULL,
  url_sumber VARCHAR(500) NULL,
  diperiksa_pada DATE NULL,
  PRIMARY KEY (id),
  KEY idx_tahapan_linimasa_tanggal_mulai (tanggal_mulai)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE butir_khusus_smk (
  id VARCHAR(64) NOT NULL,
  judul VARCHAR(200) NOT NULL,
  apa_yang_beda TEXT NOT NULL,
  apa_yang_bisa_dilakukan TEXT NOT NULL,
  urutan SMALLINT NULL,
  sumber ENUM('resmi', 'pengguna', 'mitra') NOT NULL DEFAULT 'resmi',
  pemilik VARCHAR(64) NOT NULL,
  status_verifikasi ENUM('belum_diverifikasi', 'terverifikasi') NOT NULL DEFAULT 'belum_diverifikasi',
  asal VARCHAR(32) NOT NULL,
  url_sumber VARCHAR(500) NULL,
  diperiksa_pada DATE NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prodi (
  id VARCHAR(64) NOT NULL,
  nama VARCHAR(120) NOT NULL,
  rumpun VARCHAR(60) NOT NULL,
  sumber ENUM('resmi', 'pengguna', 'mitra') NOT NULL DEFAULT 'resmi',
  pemilik VARCHAR(64) NOT NULL,
  status_verifikasi ENUM('belum_diverifikasi', 'terverifikasi') NOT NULL DEFAULT 'belum_diverifikasi',
  asal VARCHAR(32) NOT NULL,
  url_sumber VARCHAR(500) NULL,
  diperiksa_pada DATE NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE mapel (
  id VARCHAR(64) NOT NULL,
  nama VARCHAR(120) NOT NULL,
  tersedia_di_smk TINYINT(1) NOT NULL DEFAULT 0,
  sumber ENUM('resmi', 'pengguna', 'mitra') NOT NULL DEFAULT 'resmi',
  pemilik VARCHAR(64) NOT NULL,
  status_verifikasi ENUM('belum_diverifikasi', 'terverifikasi') NOT NULL DEFAULT 'belum_diverifikasi',
  asal VARCHAR(32) NOT NULL,
  url_sumber VARCHAR(500) NULL,
  diperiksa_pada DATE NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prodi_mapel (
  prodi_id VARCHAR(64) NOT NULL,
  mapel_id VARCHAR(64) NOT NULL,
  bobot TINYINT NOT NULL,
  PRIMARY KEY (prodi_id, mapel_id),
  KEY idx_prodi_mapel_mapel (mapel_id),
  CONSTRAINT fk_prodi_mapel_prodi
    FOREIGN KEY (prodi_id) REFERENCES prodi (id) ON DELETE CASCADE,
  CONSTRAINT fk_prodi_mapel_mapel
    FOREIGN KEY (mapel_id) REFERENCES mapel (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE cerita_alumni (
  id VARCHAR(64) NOT NULL,
  nama VARCHAR(120) NOT NULL,
  asal_smk VARCHAR(150) NOT NULL,
  jurusan_smk VARCHAR(150) NOT NULL,
  ptn VARCHAR(150) NOT NULL,
  prodi VARCHAR(120) NOT NULL,
  jalur VARCHAR(30) NOT NULL,
  hambatan TEXT NOT NULL,
  yang_dilakukan TEXT NOT NULL,
  izin_tayang TINYINT(1) NOT NULL DEFAULT 0,
  tayang TINYINT(1) NOT NULL DEFAULT 0,
  sumber ENUM('resmi', 'pengguna', 'mitra') NOT NULL DEFAULT 'resmi',
  pemilik VARCHAR(64) NOT NULL,
  status_verifikasi ENUM('belum_diverifikasi', 'terverifikasi') NOT NULL DEFAULT 'belum_diverifikasi',
  asal VARCHAR(32) NOT NULL,
  url_sumber VARCHAR(500) NULL,
  diperiksa_pada DATE NULL,
  PRIMARY KEY (id),
  KEY idx_cerita_alumni_tayang (izin_tayang, tayang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE butir_daftar_periksa (
  id VARCHAR(64) NOT NULL,
  judul VARCHAR(200) NOT NULL,
  urutan SMALLINT NOT NULL,
  berlaku_untuk_kelas VARCHAR(20) NOT NULL,
  berlaku_untuk_jalur VARCHAR(30) NOT NULL,
  kategori_id VARCHAR(64) NOT NULL,
  sumber ENUM('resmi', 'pengguna', 'mitra') NOT NULL DEFAULT 'resmi',
  pemilik VARCHAR(64) NOT NULL,
  status_verifikasi ENUM('belum_diverifikasi', 'terverifikasi') NOT NULL DEFAULT 'belum_diverifikasi',
  asal VARCHAR(32) NOT NULL,
  url_sumber VARCHAR(500) NULL,
  diperiksa_pada DATE NULL,
  PRIMARY KEY (id),
  KEY idx_butir_daftar_periksa_kategori (kategori_id),
  CONSTRAINT fk_butir_daftar_periksa_kategori
    FOREIGN KEY (kategori_id) REFERENCES kategori_checklist (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- prodi_tujuan baru bisa diberi FK sekarang karena tabel `prodi` baru dibuat
-- di migrasi ini (pengguna dibuat lebih dulu di 001).
ALTER TABLE pengguna
  ADD CONSTRAINT fk_pengguna_prodi_tujuan
  FOREIGN KEY (prodi_tujuan) REFERENCES prodi (id) ON DELETE SET NULL;
