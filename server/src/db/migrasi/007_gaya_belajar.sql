-- Preferensi gaya belajar siswa (LANJUT_032).
--
-- Additive: kolom baru nullable. NULL = belum dipilih, jadi akun yang sudah
-- ada tidak perlu diubah. Nilainya pilihan siswa sendiri (bukan hasil tes)
-- dan hanya dipakai di dalam LANJUT — kolom ini TIDAK terkait integrasi AI.

ALTER TABLE pengguna
  ADD COLUMN gaya_belajar ENUM('visual', 'auditori', 'kinestetik', 'baca_tulis') NULL AFTER prodi_tujuan;
