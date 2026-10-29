-- 024_persetujuan_konfirmasi_di_app.sql
-- Sumber baru untuk persetujuan orang tua/wali: 'konfirmasi_di_app' (15 Okt 2026 —
-- pilihan percakapan, belum disetujui PM). Orang tua/wali menyatakan persetujuan langsung di
-- app (POST /persetujuan/ortu-wali) di perangkat siswa. Identitasnya TIDAK diverifikasi,
-- jadi sumbernya dibedakan dari 'surat_sekolah' supaya bisa disaring/ditinjau ulang.
--
-- Additive dan IDEMPOTEN: MODIFY ke daftar nilai yang sama bila dijalankan ulang tidak
-- mengubah apa pun (nilai lama tetap di posisi semula).
ALTER TABLE persetujuan
  MODIFY COLUMN sumber ENUM('mandiri', 'surat_sekolah', 'admin', 'konfirmasi_di_app') NOT NULL;
