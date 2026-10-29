// Landing page (LANJUT_083, diubah LANJUT_083b). Sejak 083b landing dibangun dengan Vite + React
// dan pemeriksaan halamannya pindah ke landing/tests/landing.test.mjs (cd landing && npm test),
// dijalankan pada hasil build: isi halaman utama, DRAF/viewport/noindex, CSP dan tanpa skrip,
// font, atau pelacak dari luar, tanpa kunci/alamat internal, tautan antarhalaman, penerus Google,
// dan tombol APK. Yang tinggal di sini: data kebijakan yang ditulis alat server
// `npm run landing-kebijakan` (tools/landing-kebijakan.js).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const { hasilkan, DATA, SUMBER } = require('../tools/landing-kebijakan');

test('landing-kebijakan: data kebijakan di landing sama dengan lib/kebijakan-privasi.json (tidak basi)', () => {
  assert.equal(fs.readFileSync(DATA, 'utf8').replace(/\r\n/g, '\n'), hasilkan());
});

test('landing-kebijakan: hanya bagian yang tampil (status, versi, ringkasan, isi), isi dan urutan apa adanya', () => {
  const sumber = JSON.parse(fs.readFileSync(SUMBER, 'utf8'));
  const data = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  assert.deepEqual(Object.keys(data), ['status', 'versi', 'ringkasan', 'isi']);
  assert.deepEqual(data, { status: sumber.status, versi: sumber.versi, ringkasan: sumber.ringkasan, isi: sumber.isi });
  assert.match(data.status, /DRAF/);
});
