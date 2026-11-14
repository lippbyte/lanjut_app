// Repositori `refleksi_discover` (LANJUT_024 seri v2). SATU-SATUNYA tempat SQL untuk tabel ini.
// Setiap query WAJIB memfilter pengguna_id: refleksi akun lain tidak pernah terbaca atau berubah.
// Satu baris per pasangan siswa dan kartu (indeks unik), jadi menyimpan lagi memperbarui baris
// milik siswa itu sendiri. Query statis, nilai lewat placeholder `?`.

const pool = require('../../db/koneksi');

async function daftarMilikSendiri(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT id, kartu_discover_id, ketertarikan, yang_menarik, yang_kurang_menarik, dibuat_pada, diubah_pada
       FROM refleksi_discover
      WHERE pengguna_id = ?
      ORDER BY dibuat_pada, id`,
    [penggunaId]
  );
  return baris;
}

async function ambilMilikSendiri(penggunaId, kartuId) {
  const [baris] = await pool.execute(
    `SELECT id, kartu_discover_id, ketertarikan, yang_menarik, yang_kurang_menarik, dibuat_pada, diubah_pada
       FROM refleksi_discover
      WHERE pengguna_id = ? AND kartu_discover_id = ?
      LIMIT 1`,
    [penggunaId, kartuId]
  );
  return baris[0] || null;
}

/**
 * Membuat atau memperbarui refleksi siswa untuk satu kartu. Pemeriksaan kedua di SQL: baris
 * hanya ditulis bila kartunya aktif dan disetujui. Mengembalikan false bila kartu tidak tersedia
 * (atau isinya persis sama dengan yang tersimpan).
 */
async function simpanMilikSendiri({ id, penggunaId, kartuId, ketertarikan, yangMenarik, yangKurangMenarik, waktu }) {
  const [hasil] = await pool.execute(
    `INSERT INTO refleksi_discover
       (id, pengguna_id, kartu_discover_id, ketertarikan, yang_menarik, yang_kurang_menarik, dibuat_pada, diubah_pada)
     SELECT ?, ?, k.id, ?, ?, ?, ?, ?
       FROM kartu_discover AS k
      WHERE k.id = ? AND k.aktif = 1 AND k.status_teks = 'disetujui'
     ON DUPLICATE KEY UPDATE
       ketertarikan = VALUES(ketertarikan),
       yang_menarik = VALUES(yang_menarik),
       yang_kurang_menarik = VALUES(yang_kurang_menarik),
       diubah_pada = VALUES(diubah_pada)`,
    [id, penggunaId, ketertarikan, yangMenarik, yangKurangMenarik, waktu, waktu, kartuId]
  );
  return hasil.affectedRows > 0;
}

/**
 * Hanya untuk benih-dummy dan tes: menulis refleksi tanpa memeriksa status kartu. Rute tidak
 * pernah memanggilnya.
 */
async function buatTanpaPeriksaKartu({ id, penggunaId, kartuId, ketertarikan, yangMenarik = null, yangKurangMenarik = null, waktu }) {
  await pool.execute(
    `INSERT INTO refleksi_discover
       (id, pengguna_id, kartu_discover_id, ketertarikan, yang_menarik, yang_kurang_menarik, dibuat_pada, diubah_pada)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, penggunaId, kartuId, ketertarikan, yangMenarik, yangKurangMenarik, waktu, waktu]
  );
}

module.exports = { daftarMilikSendiri, ambilMilikSendiri, simpanMilikSendiri, buatTanpaPeriksaKartu };
