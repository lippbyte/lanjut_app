-- 006_checklist_rumpun.sql
-- Butir Daftar Periksa bisa dibatasi ke rumpun prodi tertentu (LANJUT_007).
--
-- Additive: kolom baru nullable. NULL = berlaku untuk semua rumpun, jadi
-- butir yang sudah ada tidak perlu diubah dan tetap tampil untuk semua orang.
-- Isinya daftar dipisah koma seperti berlaku_untuk_kelas/_jalur, dengan
-- nilai yang sama persis dengan prodi.rumpun (mis. "Teknologi & Rekayasa").
-- Nama rumpun tidak memuat koma, jadi FIND_IN_SET aman dipakai.

ALTER TABLE butir_daftar_periksa
  ADD COLUMN berlaku_untuk_rumpun VARCHAR(255) NULL AFTER berlaku_untuk_jalur;
