// Repositori sesi_pengguna. SATU-SATUNYA tempat SQL untuk tabel ini.
// docs/SDD-Backend-Foundation.md §3.3, §9.2.

const pool = require('../../db/koneksi');
const { buatUuid } = require('../../util/id');
const { sekarangUntukDb, tambahHariDb } = require('../../util/waktu');

/** Buat sesi baru untuk pengguna. Mengembalikan { id, tokenHash, kedaluwarsaPada }. */
async function buatSesi(penggunaId, tokenHash, umurHari, perangkat) {
  const id = buatUuid();
  const sekarang = sekarangUntukDb();
  const kedaluwarsa = tambahHariDb(umurHari);
  await pool.execute(
    `INSERT INTO sesi_pengguna
       (id, pengguna_id, token_hash, dibuat_pada, kedaluwarsa_pada, terakhir_dipakai_pada, perangkat)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, penggunaId, tokenHash, sekarang, kedaluwarsa, sekarang, perangkat || null]
  );
  return { id, kedaluwarsaPada: kedaluwarsa };
}

/**
 * Cari sesi AKTIF (belum dicabut, belum kedaluwarsa) berdasarkan hash token.
 * -- lookup-kepemilikan: ini titik masuk autentikasi itu sendiri — pengguna_id
 * BELUM diketahui sebelum baris ini ditemukan, jadi memang tidak ada yang bisa
 * difilter. token_hash (UNIQUE, 32 byte acak) berperan sebagai kuncinya.
 */
async function cariSesiAktifByTokenHash(tokenHash) {
  const [baris] = await pool.execute(
    `SELECT s.id, s.pengguna_id, s.kedaluwarsa_pada, p.peran, p.status
       FROM sesi_pengguna s
       JOIN pengguna p ON p.id = s.pengguna_id
      WHERE s.token_hash = ?
        AND s.dicabut_pada IS NULL
        AND s.kedaluwarsa_pada > UTC_TIMESTAMP()
      LIMIT 1`,
    [tokenHash]
  );
  return baris[0] || null;
}

/**
 * Perpanjang sesi (sliding expiration) setiap kali dipakai.
 * -- lookup-kepemilikan: sesiId di sini SUDAH divalidasi milik pengguna yang
 * sedang login lewat cariSesiAktifByTokenHash() pada permintaan yang sama
 * (middleware/autentikasi.js) — bukan input mentah dari klien.
 */
async function perpanjangSesi(sesiId, umurHari) {
  const sekarang = sekarangUntukDb();
  const kedaluwarsaBaru = tambahHariDb(umurHari);
  await pool.execute(
    `UPDATE sesi_pengguna
        SET terakhir_dipakai_pada = ?, kedaluwarsa_pada = ?
      WHERE id = ?`,
    [sekarang, kedaluwarsaBaru, sesiId]
  );
}

/** Cabut satu sesi berdasarkan hash token (dipakai saat "keluar"). */
async function cabutSesiByTokenHash(tokenHash, penggunaId) {
  const [hasil] = await pool.execute(
    `UPDATE sesi_pengguna
        SET dicabut_pada = ?
      WHERE token_hash = ? AND pengguna_id = ? AND dicabut_pada IS NULL`,
    [sekarangUntukDb(), tokenHash, penggunaId]
  );
  return hasil.affectedRows > 0;
}

/**
 * Cabut SELURUH sesi milik pengguna (dipakai "keluar-semua", setelah ganti sandi, dan
 * LANJUT_086 cabut-sesi-tenggat). Mengembalikan jumlah sesi yang dicabut.
 */
async function cabutSemuaSesiPengguna(penggunaId) {
  const [hasil] = await pool.execute(
    `UPDATE sesi_pengguna
        SET dicabut_pada = ?
      WHERE pengguna_id = ? AND dicabut_pada IS NULL`,
    [sekarangUntukDb(), penggunaId]
  );
  return hasil.affectedRows;
}

/** LANJUT_086: jumlah sesi pengguna yang belum dicabut (yang akan kena cabutSemuaSesiPengguna). */
async function hitungSesiBelumDicabut(penggunaId) {
  const [[b]] = await pool.execute(
    'SELECT COUNT(*) AS n FROM sesi_pengguna WHERE pengguna_id = ? AND dicabut_pada IS NULL',
    [penggunaId]
  );
  return Number(b.n);
}

module.exports = {
  buatSesi,
  cariSesiAktifByTokenHash,
  perpanjangSesi,
  cabutSesiByTokenHash,
  cabutSemuaSesiPengguna,
  hitungSesiBelumDicabut,
};
