// Pagar sebelum skrip yang menulis ke basis data (LANJUT_022 seri v2): migrasi, migrasi-turun, benih,
// dan pulihkan-db. Tujuan selalu dicetak lebih dulu. Host yang bukan lokal butuh --ya yang eksplisit,
// dan pemulihan di NODE_ENV=production butuh --timpa-produksi.

const HOST_LOKAL = ['localhost', '127.0.0.1'];

const hostLokal = (host) => HOST_LOKAL.includes(String(host ?? '').trim().toLowerCase());

const teksTujuan = (env) => `host ${env.DB_HOST}, basis data ${env.DB_NAME}, NODE_ENV=${env.NODE_ENV}`;

/** Alasan menolak, atau null bila boleh jalan. */
function alasanTolak(env, argv, { tolakProduksi = false } = {}) {
  if (!hostLokal(env.DB_HOST) && !argv.includes('--ya')) {
    return `Host ${env.DB_HOST} bukan lokal. Tambahkan --ya hanya bila memang sengaja menulis ke sana.`;
  }
  if (tolakProduksi && env.NODE_ENV === 'production' && !argv.includes('--timpa-produksi')) {
    return 'NODE_ENV=production: pemulihan akan menimpa basis data produksi.';
  }
  return null;
}

/** Untuk skrip baris perintah: cetak tujuan, lalu hentikan proses bila ditolak. */
function pastikanTujuan(nama, env, argv = process.argv.slice(2), opsi = {}) {
  console.log(`[${nama}] Tujuan: ${teksTujuan(env)}`);
  const alasan = alasanTolak(env, argv, opsi);
  if (alasan) {
    console.error(`[${nama}] DIHENTIKAN. ${alasan}`);
    process.exit(1);
  }
}

module.exports = { HOST_LOKAL, hostLokal, teksTujuan, alasanTolak, pastikanTujuan };
