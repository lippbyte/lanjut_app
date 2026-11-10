// LANJUT_008 seri v2: benih jalur_minat dari server/data-konten/jalur-minat.json.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const pool = require('../src/db/koneksi');
const { benihJalurMinat } = require('../src/db/benih/benih');

const BERKAS = require(path.join(__dirname, '..', 'data-konten', 'jalur-minat.json'));
// Baris contoh sengaja tidak aktif, supaya tidak terbaca tes lain yang berjalan bersamaan.
const ID_FIXTURE = 'uji-jalur-minat-fixture';

const fixture = (ubahan = {}) => ({
  ...BERKAS,
  data: [{ id: ID_FIXTURE, nama: 'Fixture', deskripsi_singkat: 'Teks uji.', status_teks: 'draf', urutan: 99, aktif: false, ...ubahan }],
});

const barisAsli = async () =>
  (await pool.query('SELECT * FROM jalur_minat WHERE id IN (?) ORDER BY urutan', [BERKAS.data.map((d) => d.id)]))[0];
const barisFixture = async () => (await pool.query('SELECT * FROM jalur_minat WHERE id = ?', [ID_FIXTURE]))[0][0];

before(async () => {
  await pool.query('DELETE FROM jalur_minat WHERE id = ?', [ID_FIXTURE]);
});

after(async () => {
  try {
    await pool.query('DELETE FROM jalur_minat WHERE id = ?', [ID_FIXTURE]);
  } finally {
    await pool.end();
  }
});

test('Berkas memuat tiga jalur, semua deskripsi bertanda draf, satu kalimat, dan metadata lengkap', () => {
  assert.deepEqual(BERKAS.data.map((d) => d.id), ['melanjutkan', 'bekerja', 'wirausaha']);
  assert.match(BERKAS._peringatan, /DRAF/);
  assert.equal(BERKAS.asal, 'Product Strategy v2.1');
  assert.equal(BERKAS.sumber, 'resmi');
  assert.equal(BERKAS.pemilik, 'tim');
  assert.ok('diperiksa_pada' in BERKAS);
  for (const d of BERKAS.data) {
    assert.equal(d.status_teks, 'draf', d.id);
    assert.equal(d.deskripsi_singkat.match(/\./g).length, 1, `${d.id}: satu kalimat`);
  }
});

test('Benih dua kali: tiga baris dari berkas, tanpa duplikat, isi sama', async () => {
  await benihJalurMinat();
  const pertama = await barisAsli();
  assert.equal(pertama.length, 3);

  await benihJalurMinat();
  const kedua = await barisAsli();
  assert.deepEqual(kedua, pertama);

  for (const [i, b] of kedua.entries()) {
    const d = BERKAS.data[i];
    assert.equal(b.id, d.id);
    assert.equal(b.nama, d.nama);
    assert.equal(b.deskripsi_singkat, d.deskripsi_singkat);
    assert.equal(b.status_teks, 'draf');
    assert.equal(b.urutan, d.urutan);
    assert.equal(b.aktif, 1);
    assert.equal(b.sumber, 'resmi');
    assert.equal(b.pemilik, 'tim');
    assert.equal(b.asal, 'Product Strategy v2.1');
    assert.equal(b.status_verifikasi, 'belum_diverifikasi');
    assert.equal(b.diperiksa_pada, null);
  }
});

test('Benih ulang: tanda verifikasi bertahan selama isi sama, dan direset bila isi berubah', async () => {
  await benihJalurMinat(fixture());
  await pool.query("UPDATE jalur_minat SET status_verifikasi = 'terverifikasi', diperiksa_pada = '2026-11-01' WHERE id = ?", [ID_FIXTURE]);

  await benihJalurMinat(fixture());
  assert.equal((await barisFixture()).status_verifikasi, 'terverifikasi');

  await benihJalurMinat(fixture({ deskripsi_singkat: 'Teks uji yang berubah.' }));
  const berubah = await barisFixture();
  assert.equal(berubah.deskripsi_singkat, 'Teks uji yang berubah.');
  assert.equal(berubah.status_verifikasi, 'belum_diverifikasi');
  assert.equal(berubah.diperiksa_pada, null);
});
