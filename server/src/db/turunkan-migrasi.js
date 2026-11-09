// Membalik satu migrasi yang punya langkah turun di src/db/migrasi-turun/
// (nama berkas sama dengan migrasinya). Hanya migrasi TERAKHIR yang dijalankan
// yang boleh diturunkan, supaya urutan skema tidak melompat.
//
// Pelari utama (jalankan-migrasi.js) tetap hanya maju dan tidak membaca folder ini.
//
//   npm run migrasi-turun -- 029_ganti_nama_jalur_seleksi.sql

const fs = require('fs');
const path = require('path');
const pool = require('./koneksi');
const { pernyataanMigrasi } = require('./jalankan-migrasi');

const DIR_TURUN = path.join(__dirname, 'migrasi-turun');

async function turunkanSatu(koneksi, nama) {
  const berkas = path.join(DIR_TURUN, path.basename(String(nama)));
  if (path.basename(String(nama)) !== nama || !fs.existsSync(berkas)) {
    throw new Error(`Tidak ada langkah turun untuk "${nama}" di ${DIR_TURUN}.`);
  }

  const [terakhir] = await koneksi.query('SELECT nama FROM _migrasi ORDER BY nama DESC LIMIT 1');
  if (terakhir.length === 0 || terakhir[0].nama !== nama) {
    throw new Error(
      `"${nama}" bukan migrasi terakhir yang dijalankan (terakhir: ${terakhir[0]?.nama ?? 'tidak ada'}). ` +
        'Tidak ada yang diubah.'
    );
  }

  await koneksi.query('START TRANSACTION');
  try {
    for (const sql of pernyataanMigrasi(fs.readFileSync(berkas, 'utf8'))) {
      await koneksi.query(sql);
    }
    await koneksi.query('DELETE FROM _migrasi WHERE nama = ?', [nama]);
    await koneksi.query('COMMIT');
    console.log(`[migrasi-turun] dibalik: ${nama}`);
  } catch (galat) {
    await koneksi.query('ROLLBACK');
    throw new Error(`Langkah turun "${nama}" gagal: ${galat.message}`);
  }
}

if (require.main === module) {
  (async () => {
    const koneksi = await pool.getConnection();
    try {
      await turunkanSatu(koneksi, process.argv[2]);
    } finally {
      koneksi.release();
    }
  })()
    .then(() => process.exit(0))
    .catch((galat) => {
      console.error('[migrasi-turun] GAGAL:', galat.message);
      process.exit(1);
    });
}

module.exports = { turunkanSatu, DIR_TURUN };
