-- F10 Eksplorasi Tujuan: profil prodi (LANJUT_031). Sumber: MVP-PWA/data/profil-prodi.json.
--
-- Satu baris = satu profil prodi = SATU unit verifikasi. Daftar (mata kuliah,
-- profesi, kampus) dan status_sumber per kelompok disimpan sebagai kolom JSON
-- di baris yang sama, bukan tabel anak (beda dari usulan SDD-F10 §C.5).
-- Alasannya: tanda verifikasi berlaku untuk isi yang dicek, dan benih mereset
-- tanda itu bila SATU SAJA kolom konten berubah (LANJUT_020, perbandingan
-- `<=>` di ON DUPLICATE KEY UPDATE). Dengan tabel anak, perubahan satu nama
-- mata kuliah harus dilacak lintas empat tabel supaya tanda profilnya ikut
-- direset. Daftar ini tidak pernah dikueri per butir, jadi JSON cukup.
--
-- `id` = prodi.id (relasi 1–1). `nama` disalin dari berkas dan dicek sama
-- dengan prodi.nama saat benih; kolom `id` + `nama` membuat skrip
-- verifikasi-konten bisa dipakai apa adanya. Rumpun TIDAK disalin — dibaca
-- dari tabel prodi.
--
-- `rasio_keketatan` sengaja tidak jadi kolom (SDD-F10 §C.5): dihitung saat
-- tampil dari diterima / peminat_jumlah supaya tidak bisa basi. Tidak ada
-- kolom gaji (spec F10 §3).

CREATE TABLE profil_prodi (
  id VARCHAR(64) NOT NULL,
  nama VARCHAR(120) NOT NULL,
  urutan SMALLINT NOT NULL DEFAULT 0,
  jenjang VARCHAR(20) NOT NULL,
  badge_relevan_smk TINYINT(1) NOT NULL DEFAULT 0,
  peminat_jumlah INT UNSIGNED NULL,
  peminat_kampus VARCHAR(150) NULL,
  peminat_tahun SMALLINT UNSIGNED NULL,
  peminat_jalur VARCHAR(10) NULL,
  peminat_sumber VARCHAR(60) NULL,
  diterima INT UNSIGNED NULL,
  mata_kuliah JSON NOT NULL,
  profesi JSON NOT NULL,
  kampus JSON NOT NULL,
  status_sumber JSON NOT NULL,
  catatan_studi TEXT NULL,
  sumber ENUM('resmi', 'pengguna', 'mitra') NOT NULL DEFAULT 'resmi',
  pemilik VARCHAR(64) NOT NULL,
  status_verifikasi ENUM('belum_diverifikasi', 'terverifikasi') NOT NULL DEFAULT 'belum_diverifikasi',
  asal VARCHAR(32) NOT NULL,
  url_sumber VARCHAR(500) NULL,
  diperiksa_pada DATE NULL,
  PRIMARY KEY (id),
  KEY idx_profil_prodi_verifikasi (status_verifikasi, urutan),
  CONSTRAINT fk_profil_prodi_prodi
    FOREIGN KEY (id) REFERENCES prodi (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
