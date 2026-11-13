// Kunci antar-berkas tes untuk himpunan jalur_minat yang aktif (LANJUT_023, K37 lanjutan).
// `node --test` menjalankan berkas secara paralel. jalur-tujuan.test.js memasang jalur uji
// berstatus disetujui (hanya jalur seperti itu yang bisa dipilih), dan model-data-v2.test.js
// menghitung jalur aktif tepat tiga. Keduanya memegang kunci ini supaya tidak saling melihat.
// Mengembalikan fungsi pelepas.

const NAMA_KUNCI = 'lanjut_tes_jalur_minat_aktif';

async function kunciJalurAktif(pool) {
  const koneksi = await pool.getConnection();
  const [[{ dapat }]] = await koneksi.query('SELECT GET_LOCK(?, 600) AS dapat', [NAMA_KUNCI]);
  if (dapat !== 1) {
    koneksi.release();
    throw new Error('Tidak mendapat kunci jalur aktif dalam 10 menit.');
  }
  return async () => {
    await koneksi.query('SELECT RELEASE_LOCK(?)', [NAMA_KUNCI]);
    koneksi.release();
  };
}

module.exports = { kunciJalurAktif };
