-- 013_modul.sql
-- Modul di Arsip Belajar (LANJUT_049): teks materi yang diunggah siswa
-- (berkas .txt/.md/PDF berteks, atau teks yang ditempel). Pola tabel pribadi
-- (kartu, butir_pribadi): milik satu akun, FK ke pengguna.
--
-- Yang disimpan HANYA teks hasil ekstraksi. Berkas asli tidak pernah ditulis
-- ke disk maupun basis data (`nama_berkas` hanya untuk tampilan).
--
-- HAPUS PERMANEN, bukan hapus lunak: tidak ada kolom dihapus_pada. Menghapus
-- modul menghapus barisnya, dan potongannya ikut hilang (ON DELETE CASCADE).
--
-- `potongan_modul` = teks dibelah ±800–1.200 karakter (potong.js) dengan
-- indeks FULLTEXT MySQL untuk pencarian di modul sendiri. Tidak ada embedding
-- atau layanan pencarian eksternal: isi modul tidak pernah keluar dari
-- server. `pengguna_id` disalin ke potongan supaya setiap pencarian
-- memfilter pemilik langsung di tabel yang dicari.

CREATE TABLE modul (
  id CHAR(36) NOT NULL,
  pengguna_id CHAR(36) NOT NULL,
  mapel_id VARCHAR(64) NOT NULL,
  judul VARCHAR(200) NOT NULL,
  isi MEDIUMTEXT NOT NULL,
  jumlah_karakter INT UNSIGNED NOT NULL,
  jenis ENUM('txt', 'md', 'pdf', 'tempel') NOT NULL,
  nama_berkas VARCHAR(255) NULL,
  diunggah_pada DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_modul_pengguna (pengguna_id, diunggah_pada),
  CONSTRAINT fk_modul_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE,
  CONSTRAINT fk_modul_mapel
    FOREIGN KEY (mapel_id) REFERENCES mapel (id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE potongan_modul (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  modul_id CHAR(36) NOT NULL,
  pengguna_id CHAR(36) NOT NULL,
  urutan SMALLINT UNSIGNED NOT NULL,
  isi TEXT NOT NULL,
  PRIMARY KEY (id),
  KEY idx_potongan_modul_modul (modul_id, urutan),
  KEY idx_potongan_modul_pengguna (pengguna_id),
  FULLTEXT KEY ft_potongan_modul_isi (isi),
  CONSTRAINT fk_potongan_modul_modul
    FOREIGN KEY (modul_id) REFERENCES modul (id) ON DELETE CASCADE,
  CONSTRAINT fk_potongan_modul_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Batas unggahan di tabel konfigurasi yang sudah ada (kunci modul_*), bukan
-- di kode. Endpoint publik /konfigurasi/levelin hanya mengirim kunci Level-In.
-- Ubah nilainya langsung di tabel; berlaku di unggahan berikutnya tanpa
-- mengubah kode maupun menyalakan ulang server.
INSERT INTO konfigurasi_levelin (kunci, nilai, versi, dasar, diubah_pada)
VALUES
  ('modul_ukuran_maks_byte', '5242880', 1,
   'Ukuran berkas modul maksimal dalam byte (5 MB). Nilai awal konservatif LANJUT_049, bisa diubah Khalifa.',
   UTC_TIMESTAMP()),
  ('modul_karakter_maks', '200000', 1,
   'Jumlah karakter maksimal teks hasil ekstraksi per modul. Nilai awal konservatif LANJUT_049.',
   UTC_TIMESTAMP()),
  ('modul_jumlah_maks', '10', 1,
   'Jumlah modul maksimal per akun. Nilai awal konservatif LANJUT_049.',
   UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE kunci = kunci;
