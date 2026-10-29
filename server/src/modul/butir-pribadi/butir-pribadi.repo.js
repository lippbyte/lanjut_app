// Repositori `butir_pribadi` (LANJUT_034). SATU-SATUNYA tempat SQL untuk
// tabel ini. Setiap query atas butir WAJIB memfilter pengguna_id (§8.4) —
// butir milik akun lain menghasilkan "tidak ditemukan", bukan kebocoran.
// Seluruh query statis, nilai lewat placeholder `?` (§2.2 aturan 2).

const pool = require('../../db/koneksi');

async function daftarMilikSendiri(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT id, jenis, prodi_id, judul, selesai_pada, dibuat_pada, diubah_pada
       FROM butir_pribadi
      WHERE pengguna_id = ? AND dihapus_pada IS NULL
      ORDER BY dibuat_pada, id`,
    [penggunaId]
  );
  return baris;
}

async function ambilMilikSendiri(penggunaId, butirId) {
  const [baris] = await pool.execute(
    `SELECT id, jenis, prodi_id, judul, selesai_pada, dibuat_pada, diubah_pada
       FROM butir_pribadi
      WHERE id = ? AND pengguna_id = ? AND dihapus_pada IS NULL
      LIMIT 1`,
    [butirId, penggunaId]
  );
  return baris[0] || null;
}

async function ambilMenurutKunci(penggunaId, jenis, prodiId) {
  const [baris] = await pool.execute(
    `SELECT id, jenis, prodi_id, judul, selesai_pada, dibuat_pada, diubah_pada
       FROM butir_pribadi
      WHERE pengguna_id = ? AND jenis = ? AND prodi_id = ? AND dihapus_pada IS NULL
      LIMIT 1`,
    [penggunaId, jenis, prodiId]
  );
  return baris[0] || null;
}

async function namaProdi(prodiId) {
  const [baris] = await pool.execute('SELECT nama FROM prodi WHERE id = ? LIMIT 1', [prodiId]);
  return baris[0] ? baris[0].nama : null;
}

/** Mapel yang memang terkait prodi itu (prodi_mapel). Id lain tidak ikut kembali. */
async function mapelUntukProdi(prodiId, mapelIds) {
  const [baris] = await pool.execute(
    `SELECT m.id, m.nama
       FROM prodi_mapel pm
       JOIN mapel m ON m.id = pm.mapel_id
      WHERE pm.prodi_id = ? AND pm.mapel_id IN (?, ?)`,
    [prodiId, mapelIds[0], mapelIds[1] ?? mapelIds[0]]
  );
  return baris;
}

/**
 * Buat, atau perbarui butir (pengguna, jenis, prodi) yang sudah ada — juga
 * yang sudah dihapus lunak (dihidupkan lagi). `tandaiSelesai` true →
 * selesai_pada = waktu (F3: memilih mapel = langkahnya sudah dikerjakan).
 * false → butir baru belum dicentang; butir lama mempertahankan centangnya,
 * kecuali butir yang dihidupkan lagi (mulai bersih).
 *
 * Urutan SET penting: MySQL menilai penugasan dari kiri, jadi selesai_pada
 * dibaca sebelum dihapus_pada dikosongkan.
 */
async function simpan({ id, penggunaId, jenis, prodiId, judul, tandaiSelesai, waktu }) {
  await pool.execute(
    `INSERT INTO butir_pribadi
       (id, pengguna_id, jenis, prodi_id, judul, selesai_pada, dibuat_pada, diubah_pada)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       selesai_pada = CASE WHEN ? THEN ? WHEN dihapus_pada IS NOT NULL THEN NULL ELSE selesai_pada END,
       dibuat_pada = CASE WHEN dihapus_pada IS NOT NULL THEN ? ELSE dibuat_pada END,
       judul = ?,
       diubah_pada = ?,
       dihapus_pada = NULL`,
    [
      id, penggunaId, jenis, prodiId, judul, tandaiSelesai ? waktu : null, waktu, waktu,
      tandaiSelesai, waktu,
      waktu,
      judul,
      waktu,
    ]
  );
}

/** `selesaiPada` null = batal centang — baris tetap ada (pola kemajuan, §6.4). */
async function aturSelesaiMilikSendiri(penggunaId, butirId, selesaiPada, waktu) {
  const [hasil] = await pool.execute(
    `UPDATE butir_pribadi SET selesai_pada = ?, diubah_pada = ?
      WHERE id = ? AND pengguna_id = ? AND dihapus_pada IS NULL`,
    [selesaiPada, waktu, butirId, penggunaId]
  );
  return hasil.affectedRows > 0;
}

/** Hapus lunak. WHERE id = ? AND pengguna_id = ? (pola kartu, §6.4). */
async function hapusLunakMilikSendiri(penggunaId, butirId, waktu) {
  const [hasil] = await pool.execute(
    `UPDATE butir_pribadi SET dihapus_pada = ?, diubah_pada = ?
      WHERE id = ? AND pengguna_id = ? AND dihapus_pada IS NULL`,
    [waktu, waktu, butirId, penggunaId]
  );
  return hasil.affectedRows > 0;
}

module.exports = {
  daftarMilikSendiri,
  ambilMilikSendiri,
  ambilMenurutKunci,
  namaProdi,
  mapelUntukProdi,
  simpan,
  aturSelesaiMilikSendiri,
  hapusLunakMilikSendiri,
};
