// LOKASI_DATA_KONTEN salah (LANJUT_023): benih berhenti SEBELUM menulis apa
// pun, dengan pesan yang menyebut folder yang dicari dan nama env-nya.
// env dibaca saat modul dimuat, jadi harus diset sebelum require.
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const LOKASI_SALAH = path.join(os.tmpdir(), `lanjut-data-tidak-ada-${process.pid}`);
process.env.LOKASI_DATA_KONTEN = LOKASI_SALAH;

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/db/koneksi');
const { jalankanBenih, DIR_DATA } = require('../src/db/benih/benih');

// Hitung setiap query ke basis data selama benih dicoba.
let jumlahQuery = 0;
for (const nama of ['execute', 'query']) {
  const asli = pool[nama].bind(pool);
  pool[nama] = (...arg) => {
    jumlahQuery += 1;
    return asli(...arg);
  };
}

after(async () => {
  fs.rmSync(LOKASI_SALAH, { recursive: true, force: true });
  await pool.end();
});

test('LOKASI_DATA_KONTEN dipakai apa adanya (path absolut)', () => {
  assert.equal(DIR_DATA, LOKASI_SALAH);
});

test('folder tidak ada → galat jelas, tidak ada yang ditulis', async () => {
  jumlahQuery = 0;
  await assert.rejects(jalankanBenih(), (err) => {
    assert.match(err.message, /Folder data konten tidak ditemukan/);
    assert.ok(err.message.includes(LOKASI_SALAH), 'pesan harus menyebut folder yang dicari');
    assert.match(err.message, /LOKASI_DATA_KONTEN/);
    return true;
  });
  assert.equal(jumlahQuery, 0, 'benih menulis ke basis data padahal folder salah');
});

test('folder ada tapi kosong → galat menyebut berkas yang hilang, tidak ada yang ditulis', async () => {
  fs.mkdirSync(LOKASI_SALAH, { recursive: true });
  jumlahQuery = 0;
  await assert.rejects(jalankanBenih(), (err) => {
    assert.match(err.message, /tidak lengkap/);
    assert.match(err.message, /prodi\.json/);
    assert.match(err.message, /arsip\.json/);
    return true;
  });
  assert.equal(jumlahQuery, 0);
});
