// Repositori khusus untuk pemeriksaan kepemilikan sebelum klaim (§6.3).
// SQL untuk PENULISAN kemajuan/kartu/riwayat memakai kembali repositori modul
// masing-masing (kemajuan.repo, kartu.repo, levelin.repo) — bukan duplikasi.

const pool = require('../../db/koneksi');

// Dua fungsi di bawah SENGAJA tidak memfilter pengguna_id/pemilik_id —
// tugasnya justru MENENTUKAN siapa pemilik baris ini (lintas semua
// pengguna), dipakai layanan untuk memutuskan tolak/terima sebelum menulis
// apa pun (§6.3 aturan 3: tidak pernah memindahkan kepemilikan). Layanan
// pemanggil (sinkron.layanan.js) yang menegakkan aturan otorisasinya,
// berdasarkan nilai yang dikembalikan di sini.

/* -- lookup-kepemilikan */
async function pemilikKartu(id) {
  const [baris] = await pool.execute('SELECT pemilik_id FROM kartu WHERE id = ? LIMIT 1', [id]);
  return baris.length ? baris[0].pemilik_id : undefined; // undefined = belum ada baris
}

/* -- lookup-kepemilikan */
async function pemilikRiwayat(id) {
  const [baris] = await pool.execute(
    'SELECT pengguna_id FROM riwayat_latihan WHERE id = ? LIMIT 1',
    [id]
  );
  return baris.length ? baris[0].pengguna_id : undefined;
}

module.exports = { pemilikKartu, pemilikRiwayat };
