// Repositori `profil_eksplorasi` (LANJUT_024 seri v2). SATU-SATUNYA tempat SQL untuk tabel ini.
// Setiap query WAJIB memfilter pengguna_id. Profil tidak pernah ditimpa: memperbarui berarti
// membuat versi baru (diubah_dari_id), dan versi lama menjadi 'diubah' tanpa isinya berubah.

const pool = require('../../db/koneksi');

async function ambilTerkiniMilikSendiri(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT id, isi, catatan, status, diubah_dari_id, dibuat_pada, diubah_pada
       FROM profil_eksplorasi
      WHERE pengguna_id = ? AND status = 'aktif'
      LIMIT 1`,
    [penggunaId]
  );
  return baris[0] || null;
}

/** Semua versi, lama ke baru. */
async function daftarMilikSendiri(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT id, isi, catatan, status, diubah_dari_id, dibuat_pada, diubah_pada
       FROM profil_eksplorasi
      WHERE pengguna_id = ?
      ORDER BY dibuat_pada, id`,
    [penggunaId]
  );
  return baris;
}

/**
 * Versi baru dalam satu transaksi. `indukId` adalah versi terkini yang dilihat layanan (null bila
 * belum ada profil). Versi terkini dikunci dan dicocokkan di SQL, milik akun ini; bila sudah
 * berganti, tidak ada yang ditulis. Hasil: 'ok' atau 'bukan_terkini'.
 */
async function buatVersiMilikSendiri(penggunaId, { id, indukId, isi, catatan, waktu }) {
  const koneksi = await pool.getConnection();
  try {
    await koneksi.beginTransaction();
    const [baris] = await koneksi.execute(
      "SELECT id FROM profil_eksplorasi WHERE pengguna_id = ? AND status = 'aktif' FOR UPDATE",
      [penggunaId]
    );
    const terkini = baris[0] ? baris[0].id : null;
    if (terkini !== (indukId ?? null)) {
      await koneksi.rollback();
      return 'bukan_terkini';
    }
    if (terkini) {
      await koneksi.execute(
        "UPDATE profil_eksplorasi SET status = 'diubah', diubah_pada = ? WHERE id = ? AND pengguna_id = ? AND status = 'aktif'",
        [waktu, terkini, penggunaId]
      );
    }
    await koneksi.execute(
      `INSERT INTO profil_eksplorasi (id, pengguna_id, isi, catatan, status, diubah_dari_id, dibuat_pada, diubah_pada)
       VALUES (?, ?, ?, ?, 'aktif', ?, ?, ?)`,
      [id, penggunaId, JSON.stringify(isi), catatan, terkini, waktu, waktu]
    );
    await koneksi.commit();
    return 'ok';
  } catch (galat) {
    await koneksi.rollback();
    throw galat;
  } finally {
    koneksi.release();
  }
}

/**
 * Mengosongkan `catatan` pada semua versi profil milik siswa (termasuk riwayat), tanpa menghapus
 * baris, tanpa mengubah `isi`, dan tanpa membuat versi baru (LANJUT_035). Idempoten.
 */
async function kosongkanCatatanMilikSendiri(penggunaId) {
  const [hasil] = await pool.execute(
    'UPDATE profil_eksplorasi SET catatan = NULL WHERE pengguna_id = ? AND catatan IS NOT NULL',
    [penggunaId]
  );
  return hasil.affectedRows;
}

module.exports = { ambilTerkiniMilikSendiri, daftarMilikSendiri, buatVersiMilikSendiri, kosongkanCatatanMilikSendiri };
