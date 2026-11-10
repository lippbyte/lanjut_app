-- 032_berkas_tertunda_hapus.sql
-- Jejak penghapusan berkas yang gagal (LANJUT_010 seri v2). Baris dibuat setiap kali menghapus
-- berkas di disk gagal, dan diselesaikan `npm run bersihkan-berkas`. Log server bisa berputar,
-- tabel ini tidak.
--
-- nama_tersimpan berisi jalur relatif di folder foto: <sidik akun>/<nama acak>. Sidik itu hash
-- satu arah, jadi tabel ini tidak memuat ID akun, nama, atau email, dan tidak perlu foreign key.
--
-- IDEMPOTEN: CREATE TABLE IF NOT EXISTS. Langkah turun ada di
-- src/db/migrasi-turun/032_berkas_tertunda_hapus.sql.
CREATE TABLE IF NOT EXISTS berkas_tertunda_hapus (
  id CHAR(36) NOT NULL,
  nama_tersimpan VARCHAR(128) NOT NULL,
  alasan VARCHAR(255) NOT NULL,
  dicatat_pada DATETIME NOT NULL,
  jumlah_percobaan INT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  UNIQUE KEY uq_berkas_tertunda_hapus_nama (nama_tersimpan)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
