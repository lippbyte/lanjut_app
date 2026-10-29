// Repositori tabel `percobaan_masuk` — pembatasan laju per akun (§8.2).
// Tidak disebut eksplisit sebagai berkas terpisah di §9.2, ditambahkan di sini
// karena SQL wajib hanya hidup di berkas `*.repo.js` (§2.2 aturan 1); folder
// tetap `modul/auth/` sesuai rancangan.

const pool = require('../../db/koneksi');
const { sekarangUntukDb } = require('../../util/waktu');

async function ambil(namaPengguna) {
  const [baris] = await pool.execute(
    'SELECT nama_pengguna, jumlah_gagal, terkunci_sampai, terakhir_gagal_pada FROM percobaan_masuk WHERE nama_pengguna = ?',
    [namaPengguna]
  );
  return baris[0] || null;
}

async function catatGagal(namaPengguna) {
  const ada = await ambil(namaPengguna);
  const jumlahBaru = (ada ? ada.jumlah_gagal : 0) + 1;
  let terkunciSampai = null;
  if (jumlahBaru >= 10) {
    terkunciSampai = tambahMenitDb(30);
  } else if (jumlahBaru >= 5) {
    terkunciSampai = tambahMenitDb(5);
  }
  await pool.execute(
    `INSERT INTO percobaan_masuk (nama_pengguna, jumlah_gagal, terkunci_sampai, terakhir_gagal_pada)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       jumlah_gagal = VALUES(jumlah_gagal),
       terkunci_sampai = VALUES(terkunci_sampai),
       terakhir_gagal_pada = VALUES(terakhir_gagal_pada)`,
    [namaPengguna, jumlahBaru, terkunciSampai, sekarangUntukDb()]
  );
}

async function resetSetelahBerhasil(namaPengguna) {
  await pool.execute(
    `INSERT INTO percobaan_masuk (nama_pengguna, jumlah_gagal, terkunci_sampai, terakhir_gagal_pada)
     VALUES (?, 0, NULL, NULL)
     ON DUPLICATE KEY UPDATE jumlah_gagal = 0, terkunci_sampai = NULL`,
    [namaPengguna]
  );
}

function tambahMenitDb(menit) {
  const d = new Date();
  d.setUTCMinutes(d.getUTCMinutes() + menit);
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

module.exports = { ambil, catatGagal, resetSetelahBerhasil };
