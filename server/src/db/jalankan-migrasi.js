// Pelari migrasi buatan sendiri (± 60 baris, docs/SDD-Backend-Foundation.md §2.1).
// Menjalankan berkas SQL bernomor di src/db/migrasi/ secara berurutan, hanya
// sekali per berkas, dicatat di tabel `_migrasi`.
//
// Migrasi hanya MAJU — jangan menyunting berkas yang sudah pernah dijalankan
// di server tayang. Perbaikan = berkas baru bernomor lebih tinggi (§3.6).

const fs = require('fs');
const path = require('path');
const pool = require('./koneksi');
const { sekarangUntukDb } = require('../util/waktu');

const DIR_MIGRASI = path.join(__dirname, 'migrasi');

async function pastikanTabelMigrasi(koneksi) {
  await koneksi.query(`
    CREATE TABLE IF NOT EXISTS _migrasi (
      nama VARCHAR(255) PRIMARY KEY,
      dijalankan_pada DATETIME NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ambilYangSudahJalan(koneksi) {
  const [baris] = await koneksi.query('SELECT nama FROM _migrasi');
  return new Set(baris.map((b) => b.nama));
}

function daftarBerkasMigrasi() {
  return fs
    .readdirSync(DIR_MIGRASI)
    .filter((nama) => nama.endsWith('.sql'))
    .sort(); // "001_..." < "002_..." secara leksikografis
}

// Pisah per pernyataan pada ";" akhir baris — cukup untuk migrasi DDL kita
// yang tidak memuat ";" di dalam string/komentar. Diekspor supaya tes bisa
// menjalankan ulang satu berkas persis seperti pelari ini (LANJUT_075).
function pernyataanMigrasi(isi) {
  return isi
    .split(/;\s*(?:\n|$)/)
    .map((p) => p.trim())
    .filter(Boolean);
}

async function jalankanSatu(koneksi, nama) {
  const pernyataan = pernyataanMigrasi(fs.readFileSync(path.join(DIR_MIGRASI, nama), 'utf8'));

  await koneksi.query('START TRANSACTION');
  try {
    for (const sql of pernyataan) {
      await koneksi.query(sql);
    }
    await koneksi.query('INSERT INTO _migrasi (nama, dijalankan_pada) VALUES (?, ?)', [
      nama,
      sekarangUntukDb(),
    ]);
    await koneksi.query('COMMIT');
    console.log(`[migrasi] dijalankan: ${nama}`);
  } catch (galat) {
    await koneksi.query('ROLLBACK');
    throw new Error(`Migrasi "${nama}" gagal: ${galat.message}`);
  }
}

async function jalankanMigrasi() {
  const koneksi = await pool.getConnection();
  try {
    await pastikanTabelMigrasi(koneksi);
    const sudahJalan = await ambilYangSudahJalan(koneksi);
    const semuaBerkas = daftarBerkasMigrasi();
    const belumJalan = semuaBerkas.filter((n) => !sudahJalan.has(n));

    if (belumJalan.length === 0) {
      console.log('[migrasi] tidak ada migrasi baru.');
      return;
    }

    for (const nama of belumJalan) {
      await jalankanSatu(koneksi, nama);
    }
    console.log(`[migrasi] selesai. ${belumJalan.length} migrasi dijalankan.`);
  } finally {
    koneksi.release();
  }
}

if (require.main === module) {
  jalankanMigrasi()
    .then(() => process.exit(0))
    .catch((galat) => {
      console.error('[migrasi] GAGAL:', galat.message);
      process.exit(1);
    });
}

module.exports = { jalankanMigrasi, pernyataanMigrasi, DIR_MIGRASI };
