// LANJUT_022 seri v2: benih-dummy menolak produksi dan host jarak jauh, dan hanya membuat akun
// berawalan uji_ atau demo_ dengan email contoh.test. Data yang dibuat di sini dihapus lagi.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, acak } = require('./bantuan');
const { jalankan, alasanTolakDummy, namaAkun, AKUN, DOMAIN_EMAIL } = require('../tools/benih-dummy');

const ALAT = path.join(__dirname, '..', 'tools', 'benih-dummy.js');
const dibuat = [];

after(async () => {
  if (dibuat.length) await pool.query('DELETE FROM pengguna WHERE nama_pengguna IN (?)', [dibuat]);
  await pool.end();
});

test('Menolak produksi, host jarak jauh, dan nama basis data produksi, tanpa jalan pintas', () => {
  const lokal = { NODE_ENV: 'development', DB_HOST: '127.0.0.1', DB_NAME: 'lanjut_dev' };
  assert.equal(alasanTolakDummy(lokal), null);
  assert.match(alasanTolakDummy({ ...lokal, NODE_ENV: 'production' }), /production/);
  assert.match(alasanTolakDummy({ ...lokal, DB_HOST: 'db.contoh.test' }), /bukan lokal/);
  assert.match(alasanTolakDummy({ ...lokal, DB_NAME: 'lanjut_db' }), /nama produksi/);
});

test('Baris perintah menolak NODE_ENV=production sebelum menyambung ke basis data', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjut-dummy-'));
  try {
    const r = spawnSync(process.execPath, [ALAT], {
      cwd: folder,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_ENV: 'production', DB_HOST: '127.0.0.1', DB_USER: 'uji', DB_NAME: 'lanjut_test_x', CORS_ORIGINS: 'https://app.contoh.test', TRUST_PROXY: '1' },
      encoding: 'utf8',
      timeout: 60000,
    });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /DIHENTIKAN\. NODE_ENV=production/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('Semua nama akun berawalan uji_ atau demo_, juga dengan akhiran', () => {
  for (const a of AKUN) {
    assert.match(namaAkun(a.nama, ''), /^(uji|demo)_/);
    assert.match(namaAkun(a.nama, 'x1'), /^(uji|demo)_.*_x1$/);
  }
  assert.throws(() => namaAkun('siswa', ''), /uji_ atau demo_/);
  assert.throws(() => namaAkun('demo_a', 'X!'), /akhiran/);
});

test('Membuat akun contoh lengkap dengan datanya, dan aman diulang', async () => {
  const akhiran = acak().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'a1';
  const hasil = await jalankan({ akhiran, kataSandi: 'sandiujiaman1', log: () => {} });
  dibuat.push(...hasil.dibuat);
  assert.equal(hasil.dibuat.length, AKUN.length);
  assert.ok(hasil.dibuat.every((n) => /^(uji|demo)_/.test(n)));
  const [akun] = await pool.query('SELECT id, nama_pengguna, email FROM pengguna WHERE nama_pengguna IN (?)', [hasil.dibuat]);
  assert.equal(akun.length, AKUN.length);
  assert.equal(DOMAIN_EMAIL, 'contoh.test', 'domain contoh, bukan alamat nyata');
  for (const a of akun) assert.equal(a.email, `${a.nama_pengguna}@contoh.test`);
  const id = akun.map((a) => a.id);
  for (const [tabel, kolom] of [['persetujuan', 'pengguna_id'], ['kartu', 'pemilik_id'], ['sesi_latihan', 'pengguna_id'], ['riwayat_latihan', 'pengguna_id'], ['tujuan', 'pengguna_id'], ['pengguna_jalur_minat', 'pengguna_id']]) {
    const [[{ n }]] = await pool.query(`SELECT COUNT(DISTINCT ${kolom}) AS n FROM ${tabel} WHERE ${kolom} IN (?)`, [id]);
    assert.equal(n, AKUN.length, tabel);
  }
  const ulang = await jalankan({ akhiran, kataSandi: 'sandiujiaman1', log: () => {} });
  assert.deepEqual(ulang.dibuat, []);
  assert.deepEqual(ulang.dilewati.sort(), [...hasil.dibuat].sort());
});
