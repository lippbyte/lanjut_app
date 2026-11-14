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

/**
 * K37 (13 Nov 2026): yang dikirim ke siswa hanya jalur aktif yang teksnya sudah DISETUJUI.
 * Selama teks jalur masih draf, hasilnya kosong. `db` hanya diganti tes (koneksi transaksi).
 */
async function daftarDisetujui(db = pool) {
  const [baris] = await db.execute(
    `SELECT id, nama, deskripsi_singkat, status_teks, urutan
       FROM jalur_minat
      WHERE aktif = 1 AND status_teks = 'disetujui'
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

/** K37 lanjutan: satu jalur yang boleh dipilih siswa (aktif dan teksnya disetujui), atau null. */
async function ambilDisetujui(jalurMinatId) {
  const [baris] = await pool.execute(
    `SELECT id, nama, deskripsi_singkat, status_teks, urutan
       FROM jalur_minat
      WHERE id = ? AND aktif = 1 AND status_teks = 'disetujui'
      LIMIT 1`,
    [jalurMinatId]
  );
  return baris[0] || null;
}

module.exports = { daftarAktif, daftarDisetujui, ambil, ambilDisetujui };
