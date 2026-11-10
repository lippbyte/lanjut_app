// Repositori `jalur_minat` (LANJUT_008 seri v2). SATU-SATUNYA tempat SQL untuk tabel ini.
// Data referensi, bukan milik pengguna, jadi tidak ada filter pengguna_id. Lapisan ini
// hanya membaca: isinya ditulis `npm run benih` dari server/data-konten/jalur-minat.json.

const pool = require('../../db/koneksi');

async function daftarAktif() {
  const [baris] = await pool.execute(
    `SELECT id, nama, deskripsi_singkat, status_teks, urutan, aktif, sumber, pemilik,
            status_verifikasi, asal, url_sumber, diperiksa_pada
       FROM jalur_minat
      WHERE aktif = 1
      ORDER BY urutan, id`
  );
  return baris;
}

async function ambil(jalurMinatId) {
  const [baris] = await pool.execute(
    `SELECT id, nama, deskripsi_singkat, status_teks, urutan, aktif, sumber, pemilik,
            status_verifikasi, asal, url_sumber, diperiksa_pada
       FROM jalur_minat
      WHERE id = ?
      LIMIT 1`,
    [jalurMinatId]
  );
  return baris[0] || null;
}

module.exports = { daftarAktif, ambil };
