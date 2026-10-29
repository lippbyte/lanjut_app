#!/usr/bin/env node
// tools/pulihkan-db.js
// Pemulihan basis data dari berkas dump SQL menggunakan mysql.
// Penggunaan: node tools/pulihkan-db.js <path/ke/cadangan.sql>

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const env = require('../src/config/env');

const berkasCadangan = process.argv[2];

if (!berkasCadangan) {
  console.error('Penggunaan: node tools/pulihkan-db.js <path/ke/cadangan.sql>');
  process.exit(1);
}

const jalurPenuh = path.resolve(process.cwd(), berkasCadangan);

if (!fs.existsSync(jalurPenuh)) {
  console.error(`[pulihkan-db] Galat: berkas '${jalurPenuh}' tidak ditemukan.`);
  process.exit(1);
}

console.log(`[pulihkan-db] Memulihkan basis data '${env.DB_NAME}' dari '${jalurPenuh}'...`);

const args = [
  `--host=${env.DB_HOST}`,
  `--port=${env.DB_PORT}`,
  `--user=${env.DB_USER}`,
  env.DB_NAME,
];

const envChild = {
  ...process.env,
  MYSQL_PWD: env.DB_PASSWORD,
};

const kontenSql = fs.readFileSync(jalurPenuh, 'utf-8');

const hasil = spawnSync('mysql', args, {
  input: kontenSql,
  env: envChild,
  encoding: 'utf-8',
  maxBuffer: 100 * 1024 * 1024,
});

if (hasil.error) {
  console.error('[pulihkan-db] Galat eksekusi mysql:', hasil.error.message);
  process.exit(1);
}

if (hasil.status !== 0) {
  console.error('[pulihkan-db] mysql gagal dengan status:', hasil.status);
  console.error(hasil.stderr);
  process.exit(1);
}

console.log('[pulihkan-db] Pemulihan basis data selesai dengan sukses.');
