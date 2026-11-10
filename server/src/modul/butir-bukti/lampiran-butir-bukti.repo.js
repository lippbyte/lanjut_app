// Repositori `lampiran_butir_bukti` (LANJUT_008 seri v2). SATU-SATUNYA tempat SQL untuk tabel
// ini. Hanya metadata (K19): belum ada kode unggah atau penyajian berkas. Tabel ini tidak
// punya pengguna_id, jadi setiap query memeriksa pemilik lewat butir_bukti.
//
// `nama_tersimpan` dibuat server. Jangan pernah memakai `nama_asli` sebagai jalur berkas.

const pool = require('../../db/koneksi');

async function daftarUntukButirMilikSendiri(penggunaId, butirBuktiId) {
  const [baris] = await pool.execute(
    `SELECT l.id, l.butir_bukti_id, l.jenis_berkas, l.ukuran_byte, l.nama_tersimpan, l.nama_asli, l.dibuat_pada
       FROM lampiran_butir_bukti AS l
       JOIN butir_bukti AS b ON b.id = l.butir_bukti_id
      WHERE l.butir_bukti_id = ? AND b.pengguna_id = ?
      ORDER BY l.dibuat_pada, l.id`,
    [butirBuktiId, penggunaId]
  );
  return baris;
}

async function daftarSemuaMilikSendiri(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT l.id, l.butir_bukti_id, l.jenis_berkas, l.ukuran_byte, l.nama_tersimpan, l.nama_asli, l.dibuat_pada
       FROM lampiran_butir_bukti AS l
       JOIN butir_bukti AS b ON b.id = l.butir_bukti_id
      WHERE b.pengguna_id = ?
      ORDER BY l.dibuat_pada, l.id`,
    [penggunaId]
  );
  return baris;
}

async function ambilMilikSendiri(penggunaId, lampiranId) {
  const [baris] = await pool.execute(
    `SELECT l.id, l.butir_bukti_id, l.jenis_berkas, l.ukuran_byte, l.nama_tersimpan, l.nama_asli, l.dibuat_pada
       FROM lampiran_butir_bukti AS l
       JOIN butir_bukti AS b ON b.id = l.butir_bukti_id
      WHERE l.id = ? AND b.pengguna_id = ?
      LIMIT 1`,
    [lampiranId, penggunaId]
  );
  return baris[0] || null;
}

/** Mengembalikan false bila butir bukti bukan milik akun ini. */
async function buat({ id, penggunaId, butirBuktiId, jenisBerkas, ukuranByte, namaTersimpan, namaAsli, waktu }) {
  const [hasil] = await pool.query(
    `INSERT INTO lampiran_butir_bukti
       (id, butir_bukti_id, jenis_berkas, ukuran_byte, nama_tersimpan, nama_asli, dibuat_pada)
     SELECT ?, b.id, ?, ?, ?, ?, ?
       FROM butir_bukti AS b
      WHERE b.id = ? AND b.pengguna_id = ?`,
    [id, jenisBerkas, ukuranByte, namaTersimpan, namaAsli, waktu, butirBuktiId, penggunaId]
  );
  return hasil.affectedRows > 0;
}

/** Hanya nama tampilan yang bisa diubah. Metadata berkas tetap seperti saat disimpan. */
async function ubahNamaAsliMilikSendiri(penggunaId, lampiranId, namaAsli) {
  const [hasil] = await pool.execute(
    `UPDATE lampiran_butir_bukti AS l
       JOIN butir_bukti AS b ON b.id = l.butir_bukti_id
        SET l.nama_asli = ?
      WHERE l.id = ? AND b.pengguna_id = ?`,
    [namaAsli, lampiranId, penggunaId]
  );
  return hasil.affectedRows > 0;
}

async function hapusMilikSendiri(penggunaId, lampiranId) {
  const [hasil] = await pool.execute(
    `DELETE l
       FROM lampiran_butir_bukti AS l
       JOIN butir_bukti AS b ON b.id = l.butir_bukti_id
      WHERE l.id = ? AND b.pengguna_id = ?`,
    [lampiranId, penggunaId]
  );
  return hasil.affectedRows > 0;
}

module.exports = {
  daftarUntukButirMilikSendiri,
  daftarSemuaMilikSendiri,
  ambilMilikSendiri,
  buat,
  ubahNamaAsliMilikSendiri,
  hapusMilikSendiri,
};
