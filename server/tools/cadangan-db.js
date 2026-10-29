#!/usr/bin/env node
// tools/cadangan-db.js
// Pencadangan basis data mandiri menggunakan mysqldump dengan rotasi 7 hari.
// Password diumpankan lewat environment variable MYSQL_PWD (tidak tampil di argumen/CLI).

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const env = require('../src/config/env');

const DIR_SERVER = path.join(__dirname, '..');
const FOLDER_CADANGAN = process.env.FOLDER_CADANGAN || path.join(DIR_SERVER, 'cadangan');

if (!fs.existsSync(FOLDER_CADANGAN)) {
  fs.mkdirSync(FOLDER_CADANGAN, { recursive: true });
}

const waktu = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
const namaBerkas = `cadangan_${env.DB_NAME}_${waktu}.sql`;
const jalurBerkas = path.join(FOLDER_CADANGAN, namaBerkas);

console.log(`[cadangan-db] Memulai pencadangan basis data '${env.DB_NAME}' ke '${namaBerkas}'...`);

const args = [
  `--host=${env.DB_HOST}`,
  `--port=${env.DB_PORT}`,
  `--user=${env.DB_USER}`,
  '--single-transaction',
  '--quick',
  '--routines',
  '--triggers',
  env.DB_NAME,
];

const envChild = {
  ...process.env,
  MYSQL_PWD: env.DB_PASSWORD,
};

const hasil = spawnSync('mysqldump', args, {
  env: envChild,
  encoding: 'utf-8',
  maxBuffer: 100 * 1024 * 1024, // 100 MB
});

if (hasil.error) {
  console.error('[cadangan-db] Galat eksekusi mysqldump:', hasil.error.message);
  process.exit(1);
}

if (hasil.status !== 0) {
  console.error('[cadangan-db] mysqldump gagal dengan status:', hasil.status);
  console.error(hasil.stderr);
  process.exit(1);
}

fs.writeFileSync(jalurBerkas, hasil.stdout, 'utf-8');
const stats = fs.statSync(jalurBerkas);
console.log(`[cadangan-db] Cadangan berhasil dibuat (${stats.size} bytes).`);

// Rotasi cadangan: simpan maksimal 7 file terbaru untuk database ini
try {
  const berkasSemua = fs
    .readdirSync(FOLDER_CADANGAN)
    .filter((f) => f.startsWith(`cadangan_${env.DB_NAME}_`) && f.endsWith('.sql'))
    .map((f) => ({
      nama: f,
      jalur: path.join(FOLDER_CADANGAN, f),
      mtime: fs.statSync(path.join(FOLDER_CADANGAN, f)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  if (berkasSemua.length > 7) {
    console.log(`[cadangan-db] Menjalankan rotasi: menghapus ${berkasSemua.length - 7} cadangan lama...`);
    for (let i = 7; i < berkasSemua.length; i++) {
      fs.unlinkSync(berkasSemua[i].jalur);
      console.log(`[cadangan-db] Dihapus: ${berkasSemua[i].nama}`);
    }
  }
} catch (rotasiErr) {
  console.warn('[cadangan-db] Peringatan rotasi:', rotasiErr.message);
}

console.log('[cadangan-db] Selesai.');
