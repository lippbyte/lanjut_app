// Repositori `persetujuan` (LANJUT_047). SATU-SATUNYA tempat SQL untuk tabel
// ini. Tabel pribadi: setiap query memfilter pengguna_id (B-K4, §8.4).
//
// Hanya membaca dan menambah baris. Riwayat tidak pernah ditimpa: setuju
// baru dan pencabutan sama-sama baris baru, jadi berkas ini tidak punya
// pernyataan pengubah atau penghapus (dijaga tests/persetujuan.test.js).
//
// `eksekutor` = pool (bawaan) atau koneksi transaksi (skrip admin).

const pool = require('../../db/koneksi');

const KUNCI_KONFIG = ['persetujuan_versi_kebijakan', 'persetujuan_versi_min_ortu'];

/** Semua catatan satu akun, terbaru dulu (urutan `id`). Jumlahnya kecil per akun. */
async function catatanAkun(penggunaId, eksekutor = pool) {
  const [baris] = await eksekutor.query(
    `SELECT id, jenis, versi, status, sumber, catatan, dicatat_pada
       FROM persetujuan
      WHERE pengguna_id = ?
      ORDER BY id DESC`,
    [penggunaId]
  );
  return baris;
}

async function tambah({ penggunaId, jenis, versi, status, sumber, catatan, dicatatPada }, eksekutor = pool) {
  await eksekutor.query(
    `INSERT INTO persetujuan (pengguna_id, jenis, versi, status, sumber, catatan, dicatat_pada)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [penggunaId, jenis, versi, status, sumber, catatan ?? null, dicatatPada]
  );
}

/** Baris konfigurasi persetujuan dari tabel konfigurasi yang sudah ada (konfigurasi_levelin). */
async function ambilKonfigurasi() {
  const [baris] = await pool.query('SELECT kunci, nilai FROM konfigurasi_levelin WHERE kunci IN (?)', [KUNCI_KONFIG]);
  return baris;
}

module.exports = { catatanAkun, tambah, ambilKonfigurasi };
