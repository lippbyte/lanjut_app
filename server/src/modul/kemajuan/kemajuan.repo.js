// Repositori `kemajuan` (F5 — centang checklist per pengguna). SATU-SATUNYA
// tempat SQL untuk tabel ini. Setiap query WAJIB memfilter pengguna_id (§8.4).

const pool = require('../../db/koneksi');

async function ambilMilikSendiri(penggunaId) {
  const [baris] = await pool.execute(
    'SELECT butir_id, selesai_pada FROM kemajuan WHERE pengguna_id = ?',
    [penggunaId]
  );
  return baris;
}

async function butirAda(butirId) {
  const [baris] = await pool.execute(
    'SELECT id FROM butir_daftar_periksa WHERE id = ? LIMIT 1',
    [butirId]
  );
  return baris.length > 0;
}

/** Idempoten: ON DUPLICATE KEY UPDATE (§4.1). */
async function tandaiSelesai(penggunaId, butirId, selesaiPada) {
  await pool.execute(
    `INSERT INTO kemajuan (pengguna_id, butir_id, selesai_pada)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE selesai_pada = VALUES(selesai_pada)`,
    [penggunaId, butirId, selesaiPada]
  );
}

/** Membatalkan centang — TIDAK menghapus baris (§4.5, §6.4). */
async function batalkanSelesai(penggunaId, butirId) {
  await pool.execute(
    `UPDATE kemajuan SET selesai_pada = NULL WHERE pengguna_id = ? AND butir_id = ?`,
    [penggunaId, butirId]
  );
}

module.exports = { ambilMilikSendiri, butirAda, tandaiSelesai, batalkanSelesai };
