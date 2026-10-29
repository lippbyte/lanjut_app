-- 012_persetujuan.sql
-- Pencatatan persetujuan per akun (LANJUT_047): kebijakan privasi (dicatat
-- siswa sendiri) dan persetujuan orang tua/wali (dicatat lewat sekolah,
-- UU PDP Pasal 25 untuk data anak). Pola tabel pribadi (butir_pribadi,
-- kartu): milik satu akun, FK ke pengguna.
--
-- RIWAYAT TIDAK DITIMPA: setiap persetujuan baru atau pencabutan menambah
-- baris. Status yang berlaku = baris terakhir per (pengguna, jenis), diurut
-- `id` (AUTO_INCREMENT, jadi urutan tetap pasti walau dua baris tercatat di
-- detik yang sama). Repositori tidak punya UPDATE maupun DELETE untuk tabel
-- ini. Baris hanya ikut hilang bila akunnya dihapus (ON DELETE CASCADE).
--
-- `versi` = versi kebijakan privasi yang disetujui. Versi yang berlaku dan
-- versi minimum persetujuan orang tua/wali TIDAK ditulis di kode: keduanya di
-- tabel konfigurasi yang sudah ada (konfigurasi_levelin), kunci berawalan
-- `persetujuan_`, diisi di bawah. Endpoint publik /konfigurasi/levelin hanya
-- mengirim kunci Level-In, jadi kunci ini tidak ikut ke sana.

CREATE TABLE persetujuan (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  pengguna_id CHAR(36) NOT NULL,
  jenis ENUM('kebijakan_privasi', 'ortu_wali') NOT NULL,
  versi SMALLINT UNSIGNED NOT NULL,
  status ENUM('setuju', 'cabut') NOT NULL,
  sumber ENUM('mandiri', 'surat_sekolah', 'admin') NOT NULL,
  catatan VARCHAR(500) NULL,
  dicatat_pada DATETIME NOT NULL,
  PRIMARY KEY (id),
  KEY idx_persetujuan_pengguna_jenis (pengguna_id, jenis, id),
  CONSTRAINT fk_persetujuan_pengguna
    FOREIGN KEY (pengguna_id) REFERENCES pengguna (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Nilai awal. Menaikkan versi kebijakan = teks baru di app (lib/kebijakanPrivasi.ts)
-- + migrasi baru yang mengubah nilai ini. Akun yang menyetujui versi lama
-- dianggap belum menerima versi yang berlaku.
INSERT INTO konfigurasi_levelin (kunci, nilai, versi, dasar, diubah_pada)
VALUES
  ('persetujuan_versi_kebijakan', '1', 1,
   'Versi kebijakan privasi yang berlaku (LANJUT_047). Harus sama dengan VERSI_KEBIJAKAN di LANJUT_App/lib/kebijakanPrivasi.ts. Teksnya masih DRAF, wajib direview ahli hukum.',
   UTC_TIMESTAMP()),
  ('persetujuan_versi_min_ortu', '1', 1,
   'Versi kebijakan minimum yang harus disetujui orang tua/wali supaya fitur AI boleh dipakai (LANJUT_047). Naikkan bila perubahan kebijakan butuh persetujuan ulang orang tua/wali.',
   UTC_TIMESTAMP())
ON DUPLICATE KEY UPDATE kunci = kunci;
