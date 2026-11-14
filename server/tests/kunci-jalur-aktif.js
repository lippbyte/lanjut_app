// Kunci antar-berkas tes untuk himpunan jalur_minat yang aktif, dan jalur uji berstatus disetujui
// (LANJUT_023, K37). `node --test` menjalankan berkas secara paralel. Memilih jalur dan menautkan
// tujuan atau butir bukti ke jalur hanya boleh ke jalur aktif yang disetujui, padahal teks jalur di
// data konten masih draf. Tes yang butuh jalur seperti itu memasang jalur uji sementara, sehingga
// jalur aktif lebih dari tiga. model-data-v2.test.js menghitung tepat tiga, jadi semua berkas itu
// memegang kunci yang sama selama jalur uji ada.

const crypto = require('node:crypto');

const NAMA_KUNCI = 'lanjut_tes_jalur_minat_aktif';

/** Mengembalikan fungsi pelepas. */
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

/**
 * Tiga jalur uji berstatus disetujui (nama logis melanjutkan, bekerja, wirausaha) dan satu jalur
 * uji disetujui yang nonaktif. `siapkan()` memasangnya sekali, saat pertama dibutuhkan. `hapus()`
 * membuang pilihan yang menunjuknya, lalu barisnya. Pegang kunciJalurAktif selama jalur uji ada.
 */
function jalurUjiDisetujui(pool, awalan) {
  const akhiran = crypto.randomUUID().slice(0, 8);
  const id = {
    melanjutkan: `uji-${awalan}-lanjut-${akhiran}`,
    bekerja: `uji-${awalan}-kerja-${akhiran}`,
    wirausaha: `uji-${awalan}-usaha-${akhiran}`,
  };
  const idMati = `uji-${awalan}-mati-${akhiran}`;
  const semua = [...Object.values(id), idMati];
  let siap = null;
  return {
    id,
    idMati,
    /** Id jalur uji untuk nama logis; nilai lain dikembalikan apa adanya. */
    peta: (nama) => (nama in id ? id[nama] : nama),
    siapkan() {
      siap ??= (async () => {
        for (const j of semua) {
          await pool.query(
            "INSERT INTO jalur_minat (id, nama, deskripsi_singkat, status_teks, urutan, aktif, pemilik, asal) VALUES (?, ?, 'Teks uji jalur.', 'disetujui', 90, ?, 'tim', 'uji')",
            [j, `Uji ${j}`, j === idMati ? 0 : 1]
          );
        }
      })();
      return siap;
    },
    async hapus() {
      await pool.query('DELETE FROM pengguna_jalur_minat WHERE jalur_minat_id IN (?)', [semua]);
      await pool.query('DELETE FROM jalur_minat WHERE id IN (?)', [semua]);
    },
  };
}

module.exports = { kunciJalurAktif, jalurUjiDisetujui };
