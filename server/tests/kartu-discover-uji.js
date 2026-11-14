// Kartu Discover uji berstatus disetujui, dan kuncinya (LANJUT_024). Kartu di data konten masih
// draf, padahal refleksi hanya bisa disimpan untuk kartu aktif yang disetujui. Tes yang butuh kartu
// seperti itu memasang kartu uji sementara. discover.test.js juga memeriksa bahwa daftar kartu
// kosong selama semuanya draf, jadi setiap berkas yang memasang kartu uji memegang kunci ini.

const crypto = require('node:crypto');

const NAMA_KUNCI = 'lanjut_tes_kartu_discover';

/** Mengembalikan fungsi pelepas. */
async function kunciKartuDiscover(pool) {
  const koneksi = await pool.getConnection();
  const [[{ dapat }]] = await koneksi.query('SELECT GET_LOCK(?, 600) AS dapat', [NAMA_KUNCI]);
  if (dapat !== 1) {
    koneksi.release();
    throw new Error('Tidak mendapat kunci kartu Discover dalam 10 menit.');
  }
  return async () => {
    await koneksi.query('SELECT RELEASE_LOCK(?)', [NAMA_KUNCI]);
    koneksi.release();
  };
}

/**
 * Tiga kartu uji disetujui (bidang, profesi, usaha) dan satu kartu uji disetujui yang nonaktif.
 * `siapkan()` memasangnya sekali, saat pertama dibutuhkan. `hapus()` membuang refleksi yang
 * menunjuknya, lalu barisnya.
 */
function kartuUjiDisetujui(pool, awalan) {
  const akhiran = crypto.randomUUID().slice(0, 8);
  const kartu = [
    { id: `uji-${awalan}-bidang-${akhiran}`, jenis: 'bidang', judul: `Bidang Uji ${akhiran}`, aktif: 1 },
    { id: `uji-${awalan}-profesi-${akhiran}`, jenis: 'profesi', judul: `Profesi Uji ${akhiran}`, aktif: 1 },
    { id: `uji-${awalan}-usaha-${akhiran}`, jenis: 'usaha', judul: `Usaha Uji ${akhiran}`, aktif: 1 },
  ];
  const mati = { id: `uji-${awalan}-mati-${akhiran}`, jenis: 'bidang', judul: `Mati Uji ${akhiran}`, aktif: 0 };
  const semua = [...kartu, mati];
  let siap = null;
  return {
    kartu,
    idMati: mati.id,
    siapkan() {
      siap ??= (async () => {
        for (const k of semua) {
          await pool.query(
            "INSERT INTO kartu_discover (id, jenis, judul, ringkasan, status_teks, urutan, aktif, pemilik, asal, url_sumber) VALUES (?, ?, ?, 'Ringkasan uji.', 'disetujui', 90, ?, 'tim', 'uji', 'https://contoh.test/sumber')",
            [k.id, k.jenis, k.judul, k.aktif]
          );
        }
      })();
      return siap;
    },
    async hapus() {
      const id = semua.map((k) => k.id);
      await pool.query('DELETE FROM refleksi_discover WHERE kartu_discover_id IN (?)', [id]);
      await pool.query('DELETE FROM kartu_discover WHERE id IN (?)', [id]);
    },
  };
}

module.exports = { kunciKartuDiscover, kartuUjiDisetujui };
