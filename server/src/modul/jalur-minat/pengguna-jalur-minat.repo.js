// Repositori `pengguna_jalur_minat` (LANJUT_008 seri v2). SATU-SATUNYA tempat SQL untuk
// tabel ini. Setiap query WAJIB memfilter pengguna_id: baris akun lain menghasilkan
// "tidak ditemukan", bukan kebocoran. Query statis, nilai lewat placeholder `?`.
//
// Berganti arah = ubah status, baris tetap ada, supaya riwayat tidak hilang.
// `hapusMilikSendiri` hanya untuk baris yang salah dibuat.

const pool = require('../../db/koneksi');

const STATUS_BERAKHIR = new Set(['selesai', 'ditinggalkan']);

async function daftarMilikSendiri(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT id, jalur_minat_id, status, mulai_pada, berakhir_pada, diubah_pada
       FROM pengguna_jalur_minat
      WHERE pengguna_id = ?
      ORDER BY mulai_pada, id`,
    [penggunaId]
  );
  return baris;
}

async function ambilMilikSendiri(penggunaId, id) {
  const [baris] = await pool.execute(
    `SELECT id, jalur_minat_id, status, mulai_pada, berakhir_pada, diubah_pada
       FROM pengguna_jalur_minat
      WHERE id = ? AND pengguna_id = ?
      LIMIT 1`,
    [id, penggunaId]
  );
  return baris[0] || null;
}

/** Mengembalikan false bila pengguna sudah punya baris aktif untuk jalur ini. */
async function buat({ id, penggunaId, jalurMinatId, waktu }) {
  try {
    await pool.execute(
      `INSERT INTO pengguna_jalur_minat (id, pengguna_id, jalur_minat_id, status, mulai_pada, diubah_pada)
       VALUES (?, ?, ?, 'aktif', ?, ?)`,
      [id, penggunaId, jalurMinatId, waktu, waktu]
    );
    return true;
  } catch (galat) {
    if (galat.code === 'ER_DUP_ENTRY') return false;
    throw galat;
  }
}

/**
 * `berakhir_pada` terisi hanya untuk status selesai dan ditinggalkan. Mengembalikan false
 * bila baris bukan milik akun ini, atau bila mengaktifkan lagi akan membuat dua baris aktif.
 */
async function ubahStatusMilikSendiri(penggunaId, id, status, waktu) {
  try {
    const [hasil] = await pool.execute(
      `UPDATE pengguna_jalur_minat
          SET status = ?, berakhir_pada = ?, diubah_pada = ?
        WHERE id = ? AND pengguna_id = ?`,
      [status, STATUS_BERAKHIR.has(status) ? waktu : null, waktu, id, penggunaId]
    );
    return hasil.affectedRows > 0;
  } catch (galat) {
    if (galat.code === 'ER_DUP_ENTRY') return false;
    throw galat;
  }
}

/**
 * Mengakhiri satu babak jalur (LANJUT_023): hanya baris `aktif` yang bisa dijeda, diselesaikan,
 * atau ditinggalkan. Baris yang sudah berakhir tidak pernah diubah lagi, jadi riwayatnya tetap.
 * Memilih jalur itu lagi membuat baris baru lewat `buat`. False bila bukan milik akun ini atau
 * sudah tidak aktif.
 */
async function akhiriAktifMilikSendiri(penggunaId, id, status, waktu) {
  const [hasil] = await pool.execute(
    `UPDATE pengguna_jalur_minat
        SET status = ?, berakhir_pada = ?, diubah_pada = ?
      WHERE id = ? AND pengguna_id = ? AND status = 'aktif'`,
    [status, STATUS_BERAKHIR.has(status) ? waktu : null, waktu, id, penggunaId]
  );
  return hasil.affectedRows > 0;
}

async function hapusMilikSendiri(penggunaId, id) {
  const [hasil] = await pool.execute('DELETE FROM pengguna_jalur_minat WHERE id = ? AND pengguna_id = ?', [
    id,
    penggunaId,
  ]);
  return hasil.affectedRows > 0;
}

module.exports = {
  daftarMilikSendiri,
  ambilMilikSendiri,
  buat,
  ubahStatusMilikSendiri,
  akhiriAktifMilikSendiri,
  hapusMilikSendiri,
};
