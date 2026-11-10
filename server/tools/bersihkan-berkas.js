#!/usr/bin/env node
// tools/bersihkan-berkas.js (LANJUT_010 seri v2). Mencoba ulang penghapusan berkas yang tertunda,
// dan melaporkan berkas yatim (ada di disk, tidak ada di basis data). Berkas yatim tidak pernah
// dihapus otomatis.
//
//   npm run bersihkan-berkas            mencoba ulang dan menghapus baris yang berhasil
//   npm run bersihkan-berkas -- --cek   hanya melaporkan, tidak menghapus apa pun

const env = require('../src/config/env');
const pool = require('../src/db/koneksi');
const penyimpanan = require('../src/modul/butir-bukti/penyimpanan-foto');

async function jalankan() {
  if (!env.DIREKTORI_BERKAS) throw new Error('DIREKTORI_BERKAS kosong.');
  const cek = process.argv.slice(2).includes('--cek');
  const hasil = await penyimpanan.bersihkanTertunda({ cek });
  const [baris] = await pool.query('SELECT nama_tersimpan FROM lampiran_butir_bukti');
  const yatim = await penyimpanan.daftarBerkasYatim(new Set(baris.map((b) => b.nama_tersimpan)));

  console.log(`Mode: ${cek ? 'periksa saja' : 'bersihkan'}`);
  console.log(`Tertunda: ${hasil.tertunda}`);
  console.log(`Berhasil dihapus: ${hasil.berhasil}`);
  console.log(`Gagal: ${hasil.gagal}`);
  console.log(`Berkas yatim: ${yatim.length}`);
  for (const y of yatim) console.log(`  ${y}`);
}

jalankan()
  .catch((galat) => {
    console.error(`[bersihkan-berkas] GAGAL: ${galat.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
