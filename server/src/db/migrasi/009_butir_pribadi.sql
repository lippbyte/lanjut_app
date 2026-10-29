-- 009_butir_pribadi.sql
-- Butir Daftar Periksa milik satu akun (LANJUT_034) — hasil "Simpan ke
-- Daftar Periksa" di F3 Pilih Mapel dan F10 Eksplorasi Tujuan.
--
-- Additive: tabel baru. butir_daftar_periksa (butir umum) dan kemajuan
-- (centang butir umum) tidak disentuh. Centang butir pribadi disimpan di
-- baris ini sendiri (`selesai_pada`), karena kemajuan.butir_id ber-FK ke
-- butir umum.
--
-- Satu butir per (pengguna, jenis, prodi): menyimpan ulang untuk prodi yang
-- sama memperbarui baris itu, bukan menggandakan (pola PWA
-- ChecklistTambahan.tambah). Judul disusun server dari nama prodi & mapel,
-- bukan teks bebas dari klien.
--
-- Batal centang = selesai_pada NULL (pola kemajuan, §6.4). Hapus butir =
-- hapus lunak `dihapus_pada` (pola kartu, §6.4).

CREATE TABLE butir_pribadi (
  id CHAR(36) NOT NULL,
  pengguna_id CHAR(36) NOT NULL,
  jenis ENUM('mapel_tka', 'riset_kampus') NOT NULL,
  prodi_id VARCHAR(64) NOT NULL,
  judul VARCHAR(400) NOT NULL,
  selesai_pada DATETIME NULL,
  dibuat_pada DATETIME NOT NULL,
  diubah_pada DATETIME NOT NULL,
  dihapus_pada DATETIME NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uq_butir_pribadi_pengguna_jenis_prodi (pengguna_id, jenis, prodi_id),
  KEY idx_butir_pribadi_prodi (prodi_id),
  CONSTRAINT fk_butir_pribadi_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE,
  CONSTRAINT fk_butir_pribadi_prodi
    FOREIGN KEY (prodi_id) REFERENCES prodi (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
