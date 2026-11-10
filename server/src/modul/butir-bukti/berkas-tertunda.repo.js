// Repositori `berkas_tertunda_hapus` (LANJUT_010 seri v2). SATU-SATUNYA tempat SQL untuk tabel ini.
// Tabel ini tidak memuat ID akun, jadi tidak ada filter pengguna.

const pool = require('../../db/koneksi');

/** Berkas yang sama gagal lagi: barisnya dipakai ulang, alasannya diperbarui. */
async function catat({ id, namaTersimpan, alasan, waktu }) {
  await pool.execute(
    `INSERT INTO berkas_tertunda_hapus (id, nama_tersimpan, alasan, dicatat_pada)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE alasan = VALUES(alasan), dicatat_pada = VALUES(dicatat_pada)`,
    [id, namaTersimpan, alasan, waktu]
  );
}

async function daftar() {
  const [baris] = await pool.query(
    'SELECT id, nama_tersimpan, alasan, dicatat_pada, jumlah_percobaan FROM berkas_tertunda_hapus ORDER BY dicatat_pada, id'
  );
  return baris;
}

async function hapus(id) {
  await pool.execute('DELETE FROM berkas_tertunda_hapus WHERE id = ?', [id]);
}

async function tambahPercobaan(id) {
  await pool.execute('UPDATE berkas_tertunda_hapus SET jumlah_percobaan = jumlah_percobaan + 1 WHERE id = ?', [id]);
}

module.exports = { catat, daftar, hapus, tambahPercobaan };
