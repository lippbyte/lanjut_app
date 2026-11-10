// Repositori `butir_bukti` (LANJUT_008 seri v2). SATU-SATUNYA tempat SQL untuk tabel ini.
// Setiap query WAJIB memfilter pengguna_id: butir akun lain menghasilkan "tidak
// ditemukan", bukan kebocoran. Query statis, nilai lewat placeholder `?`.
//
// `visibilitas` sengaja tidak bisa diisi lewat lapisan ini (K18): kolomnya selalu 'privat'.
// `rujukan_jenis` + `rujukan_id` adalah rujukan eksternal (K11), sengaja bukan foreign key.

const pool = require('../../db/koneksi');

async function daftarMilikSendiri(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT id, jalur_minat_id, tujuan_id, judul, uraian, tautan, jenis, tanggal_karya, visibilitas,
            rujukan_jenis, rujukan_id, dibuat_pada, diubah_pada
       FROM butir_bukti
      WHERE pengguna_id = ?
      ORDER BY dibuat_pada DESC, id`,
    [penggunaId]
  );
  return baris;
}

async function ambilMilikSendiri(penggunaId, butirId) {
  const [baris] = await pool.execute(
    `SELECT id, jalur_minat_id, tujuan_id, judul, uraian, tautan, jenis, tanggal_karya, visibilitas,
            rujukan_jenis, rujukan_id, dibuat_pada, diubah_pada
       FROM butir_bukti
      WHERE id = ? AND pengguna_id = ?
      LIMIT 1`,
    [butirId, penggunaId]
  );
  return baris[0] || null;
}

/**
 * `tujuanId` hanya boleh menunjuk tujuan milik akun yang sama. Foreign key tidak memeriksa
 * pemilik, jadi pemeriksaannya ada di sini. Mengembalikan false bila ditolak.
 * `rujukan` berbentuk { jenis, id }, atau null bila tidak ada.
 */
async function buat({ id, penggunaId, jalurMinatId = null, tujuanId = null, judul, uraian = null, tautan = null, jenis, tanggalKarya = null, rujukan = null, waktu }) {
  const [hasil] = await pool.query(
    `INSERT INTO butir_bukti
       (id, pengguna_id, jalur_minat_id, tujuan_id, judul, uraian, tautan, jenis, tanggal_karya,
        rujukan_jenis, rujukan_id, dibuat_pada, diubah_pada)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       FROM DUAL
      WHERE ? IS NULL OR EXISTS (SELECT 1 FROM tujuan AS t WHERE t.id = ? AND t.pengguna_id = ?)`,
    [
      id, penggunaId, jalurMinatId, tujuanId, judul, uraian, tautan, jenis, tanggalKarya,
      rujukan ? rujukan.jenis : null, rujukan ? rujukan.id : null, waktu, waktu,
      tujuanId, tujuanId, penggunaId,
    ]
  );
  return hasil.affectedRows > 0;
}

/**
 * Mengubah isi butir. Medan bernilai `undefined` berarti "jangan diubah", dibedakan dari
 * `null` yang berarti "kosongkan". Mengembalikan false bila butir bukan milik akun ini.
 */
async function ubahMilikSendiri(penggunaId, butirId, { judul, uraian, tautan, jenis, tanggalKarya, waktu }) {
  const [hasil] = await pool.execute(
    `UPDATE butir_bukti
        SET judul = CASE WHEN ? THEN ? ELSE judul END,
            uraian = CASE WHEN ? THEN ? ELSE uraian END,
            tautan = CASE WHEN ? THEN ? ELSE tautan END,
            jenis = CASE WHEN ? THEN ? ELSE jenis END,
            tanggal_karya = CASE WHEN ? THEN ? ELSE tanggal_karya END,
            diubah_pada = ?
      WHERE id = ? AND pengguna_id = ?`,
    [
      judul !== undefined, judul ?? null,
      uraian !== undefined, uraian ?? null,
      tautan !== undefined, tautan ?? null,
      jenis !== undefined, jenis ?? null,
      tanggalKarya !== undefined, tanggalKarya ?? null,
      waktu,
      butirId,
      penggunaId,
    ]
  );
  return hasil.affectedRows > 0;
}

/**
 * Mengubah kaitan butir ke jalur, tujuan, dan rujukan eksternal. Aturan `undefined` dan `null`
 * sama dengan di atas. Mengembalikan false bila butir bukan milik akun ini, atau `tujuanId`
 * menunjuk tujuan akun lain.
 */
async function ubahKaitanMilikSendiri(penggunaId, butirId, { jalurMinatId, tujuanId, rujukan, waktu }) {
  const tujuanBaru = tujuanId ?? null;
  const [hasil] = await pool.execute(
    `UPDATE butir_bukti
        SET jalur_minat_id = CASE WHEN ? THEN ? ELSE jalur_minat_id END,
            tujuan_id = CASE WHEN ? THEN ? ELSE tujuan_id END,
            rujukan_jenis = CASE WHEN ? THEN ? ELSE rujukan_jenis END,
            rujukan_id = CASE WHEN ? THEN ? ELSE rujukan_id END,
            diubah_pada = ?
      WHERE id = ? AND pengguna_id = ?
        AND (? IS NULL OR EXISTS (SELECT 1 FROM tujuan AS t WHERE t.id = ? AND t.pengguna_id = ?))`,
    [
      jalurMinatId !== undefined, jalurMinatId ?? null,
      tujuanId !== undefined, tujuanBaru,
      rujukan !== undefined, rujukan ? rujukan.jenis : null,
      rujukan !== undefined, rujukan ? rujukan.id : null,
      waktu,
      butirId,
      penggunaId,
      tujuanBaru,
      tujuanBaru,
      penggunaId,
    ]
  );
  return hasil.affectedRows > 0;
}

/** DELETE sungguhan, bukan tanda. Lampirannya ikut terhapus lewat ON DELETE CASCADE. */
async function hapusMilikSendiri(penggunaId, butirId) {
  const [hasil] = await pool.execute('DELETE FROM butir_bukti WHERE id = ? AND pengguna_id = ?', [butirId, penggunaId]);
  return hasil.affectedRows > 0;
}

module.exports = { daftarMilikSendiri, ambilMilikSendiri, buat, ubahMilikSendiri, ubahKaitanMilikSendiri, hapusMilikSendiri };
