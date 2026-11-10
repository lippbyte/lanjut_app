// Bawaan folder data konten (K16, LANJUT_005 seri v2): tanpa LOKASI_DATA_KONTEN,
// benih membaca server/data-konten, bukan folder di repo induk.
// env dibaca saat modul dimuat, jadi harus dikosongkan sebelum require.
process.env.LOKASI_DATA_KONTEN = '';

const path = require('node:path');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/db/koneksi');
const { DIR_DATA } = require('../src/db/benih/benih');

after(() => pool.end());

test('tanpa LOKASI_DATA_KONTEN, benih membaca server/data-konten', () => {
  assert.equal(DIR_DATA, path.join(__dirname, '..', 'data-konten'));
});
