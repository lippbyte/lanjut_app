// Repositori `kartu_discover` (LANJUT_024 seri v2). SATU-SATUNYA tempat SQL untuk tabel ini.
// Data referensi, bukan milik pengguna. Lapisan ini hanya membaca: isinya ditulis `npm run benih`
// dari server/data-konten/discover.json. Yang keluar ke siswa hanya kartu aktif yang teksnya
// sudah disetujui (sama dengan jalur_minat, K37): kartu draf tidak pernah terkirim.

const pool = require('../../db/koneksi');

/** `db` hanya diganti tes (koneksi transaksi). */
async function daftarDisetujui(db = pool) {
  const [baris] = await db.execute(
    `SELECT id, jenis, judul, ringkasan, status_teks, urutan, url_sumber, diperiksa_pada
       FROM kartu_discover
      WHERE aktif = 1 AND status_teks = 'disetujui'
      ORDER BY urutan, id`
  );
  return baris;
}

/** Satu baris Discover yang boleh dipakai siswa (aktif dan disetujui), atau null. */
async function ambilDisetujui(kartuId) {
  const [baris] = await pool.execute(
    `SELECT id, jenis, judul, ringkasan, status_teks, urutan, url_sumber, diperiksa_pada
       FROM kartu_discover
      WHERE id = ? AND aktif = 1 AND status_teks = 'disetujui'
      LIMIT 1`,
    [kartuId]
  );
  return baris[0] || null;
}

module.exports = { daftarDisetujui, ambilDisetujui };
