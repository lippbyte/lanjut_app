// Repositori `tujuan` (LANJUT_008 seri v2). SATU-SATUNYA tempat SQL untuk tabel ini.
// Setiap query WAJIB memfilter pengguna_id: tujuan akun lain menghasilkan "tidak
// ditemukan", bukan kebocoran. Query statis, nilai lewat placeholder `?`.

const pool = require('../../db/koneksi');

async function daftarMilikSendiri(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT id, jalur_minat_id, judul, uraian, target_pada, status, diubah_dari_id, dibuat_pada, diubah_pada
       FROM tujuan
      WHERE pengguna_id = ?
      ORDER BY dibuat_pada, id`,
    [penggunaId]
  );
  return baris;
}

async function ambilMilikSendiri(penggunaId, tujuanId) {
  const [baris] = await pool.execute(
    `SELECT id, jalur_minat_id, judul, uraian, target_pada, status, diubah_dari_id, dibuat_pada, diubah_pada
       FROM tujuan
      WHERE id = ? AND pengguna_id = ?
      LIMIT 1`,
    [tujuanId, penggunaId]
  );
  return baris[0] || null;
}

/**
 * `diubahDariId` hanya boleh menunjuk tujuan milik akun yang sama. Foreign key tidak
 * memeriksa pemilik, jadi pemeriksaannya ada di sini. Mengembalikan false bila ditolak.
 * Mengganti tujuan: buat yang baru dengan `diubahDariId`, lalu ubah status yang lama.
 */
async function buat({ id, penggunaId, jalurMinatId = null, judul, uraian = null, targetPada = null, status = 'aktif', diubahDariId = null, waktu }) {
  const [hasil] = await pool.query(
    `INSERT INTO tujuan
       (id, pengguna_id, jalur_minat_id, judul, uraian, target_pada, status, diubah_dari_id, dibuat_pada, diubah_pada)
     SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
       FROM DUAL
      WHERE ? IS NULL OR EXISTS (SELECT 1 FROM tujuan AS asal WHERE asal.id = ? AND asal.pengguna_id = ?)`,
    [id, penggunaId, jalurMinatId, judul, uraian, targetPada, status, diubahDariId, waktu, waktu, diubahDariId, diubahDariId, penggunaId]
  );
  return hasil.affectedRows > 0;
}

/**
 * Medan bernilai `undefined` berarti "jangan diubah", dibedakan dari `null` yang berarti
 * "kosongkan". `diubah_dari_id` tidak bisa diubah: riwayat ditetapkan saat tujuan dibuat.
 */
async function ubahMilikSendiri(penggunaId, tujuanId, { jalurMinatId, judul, uraian, targetPada, status, waktu }) {
  const [hasil] = await pool.execute(
    `UPDATE tujuan
        SET jalur_minat_id = CASE WHEN ? THEN ? ELSE jalur_minat_id END,
            judul = CASE WHEN ? THEN ? ELSE judul END,
            uraian = CASE WHEN ? THEN ? ELSE uraian END,
            target_pada = CASE WHEN ? THEN ? ELSE target_pada END,
            status = CASE WHEN ? THEN ? ELSE status END,
            diubah_pada = ?
      WHERE id = ? AND pengguna_id = ?`,
    [
      jalurMinatId !== undefined, jalurMinatId ?? null,
      judul !== undefined, judul ?? null,
      uraian !== undefined, uraian ?? null,
      targetPada !== undefined, targetPada ?? null,
      status !== undefined, status ?? null,
      waktu,
      tujuanId,
      penggunaId,
    ]
  );
  return hasil.affectedRows > 0;
}

/**
 * Memperbarui tujuan tanpa menimpa (LANJUT_023): versi baru dibuat dengan `diubah_dari_id`,
 * lalu versi lama menjadi `diubah`. Satu transaksi. Versi lama dikunci, dan harus milik akun
 * ini dan masih `aktif`, jadi riwayat selalu satu garis lurus.
 * Hasil: 'ok', 'tidak_ada' (bukan milik akun ini atau tidak ada), atau 'bukan_terkini'.
 */
async function buatVersiMilikSendiri(penggunaId, tujuanLamaId, { id, jalurMinatId, judul, uraian, targetPada, waktu }) {
  const koneksi = await pool.getConnection();
  try {
    await koneksi.beginTransaction();
    const [baris] = await koneksi.execute(
      'SELECT id, status FROM tujuan WHERE id = ? AND pengguna_id = ? FOR UPDATE',
      [tujuanLamaId, penggunaId]
    );
    const lama = baris[0];
    if (!lama || lama.status !== 'aktif') {
      await koneksi.rollback();
      return lama ? 'bukan_terkini' : 'tidak_ada';
    }
    await koneksi.execute(
      `INSERT INTO tujuan
         (id, pengguna_id, jalur_minat_id, judul, uraian, target_pada, status, diubah_dari_id, dibuat_pada, diubah_pada)
       VALUES (?, ?, ?, ?, ?, ?, 'aktif', ?, ?, ?)`,
      [id, penggunaId, jalurMinatId, judul, uraian, targetPada, tujuanLamaId, waktu, waktu]
    );
    await koneksi.execute("UPDATE tujuan SET status = 'diubah', diubah_pada = ? WHERE id = ? AND pengguna_id = ?", [
      waktu,
      tujuanLamaId,
      penggunaId,
    ]);
    await koneksi.commit();
    return 'ok';
  } catch (galat) {
    await koneksi.rollback();
    throw galat;
  } finally {
    koneksi.release();
  }
}

/** Menandai tujuan terkini tercapai atau ditinggalkan. Hanya dari `aktif`. False bila tidak berlaku. */
async function akhiriMilikSendiri(penggunaId, tujuanId, status, waktu) {
  const [hasil] = await pool.execute(
    "UPDATE tujuan SET status = ?, diubah_pada = ? WHERE id = ? AND pengguna_id = ? AND status = 'aktif'",
    [status, waktu, tujuanId, penggunaId]
  );
  return hasil.affectedRows > 0;
}

/** DELETE sungguhan. Butir bukti yang menunjuk tujuan ini tetap ada, tujuan_id menjadi NULL. */
async function hapusMilikSendiri(penggunaId, tujuanId) {
  const [hasil] = await pool.execute('DELETE FROM tujuan WHERE id = ? AND pengguna_id = ?', [tujuanId, penggunaId]);
  return hasil.affectedRows > 0;
}

module.exports = {
  daftarMilikSendiri,
  ambilMilikSendiri,
  buat,
  ubahMilikSendiri,
  buatVersiMilikSendiri,
  akhiriMilikSendiri,
  hapusMilikSendiri,
};
