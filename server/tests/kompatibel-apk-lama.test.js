// LANJUT_001 seri v2: APK 1.0.0 yang sudah terpasang masih memakai nama lama. Setelah
// server memakai `jalur_seleksi`, field dan kueri lama harus tetap berfungsi.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, pool } = require('./bantuan');
const kontenRepo = require('../src/modul/konten/konten.repo');

let server;
let baseUrl;

async function ambil(path) {
  const res = await fetch(`${baseUrl}/api/v1${path}`);
  return { status: res.status, json: await res.json() };
}

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

const semuaButir = (json) => json.data.kategori.flatMap((k) => k.butir);

test('checklist: ?jalur= lama menyaring sama dengan ?jalur_seleksi=, dan benar-benar menyaring', async () => {
  const lama = semuaButir((await ambil('/konten/checklist?kelas=12&jalur=TKA')).json).map((b) => b.id);
  const baru = semuaButir((await ambil('/konten/checklist?kelas=12&jalur_seleksi=TKA')).json).map((b) => b.id);
  const tanpa = semuaButir((await ambil('/konten/checklist?kelas=12')).json).map((b) => b.id);
  assert.ok(lama.length > 0);
  assert.deepEqual(lama, baru);
  assert.ok(lama.length < tanpa.length, 'kueri lama harus menyaring, bukan diabaikan');
});

test('checklist: nama baru didahulukan bila kedua kueri dikirim', async () => {
  const keduanya = semuaButir((await ambil('/konten/checklist?kelas=12&jalur=TKA&jalur_seleksi=SNBP')).json).map((b) => b.id);
  const baru = semuaButir((await ambil('/konten/checklist?kelas=12&jalur_seleksi=SNBP')).json).map((b) => b.id);
  assert.deepEqual(keduanya, baru);
});

test('checklist: tiap butir mengirim berlaku_untuk_jalur sama dengan nama baru', async () => {
  const butir = semuaButir((await ambil('/konten/checklist?kelas=12')).json);
  assert.ok(butir.length > 0);
  for (const b of butir) assert.deepEqual(b.berlaku_untuk_jalur, b.berlaku_untuk_jalur_seleksi, b.id);
});

test('linimasa: tiap tahapan mengirim jalur sama dengan jalur_seleksi', async () => {
  const { json } = await ambil('/konten/linimasa');
  assert.ok(json.data.length > 0);
  for (const t of json.data) assert.equal(t.jalur, t.jalur_seleksi, t.id);
});

test('cerita alumni: mengirim jalur sama dengan jalur_seleksi', async (t) => {
  t.mock.method(kontenRepo, 'ambilCeritaAlumniTayang', async () => [{ id: 'uji', jalur_seleksi: 'SNBT (UTBK)', diperiksa_pada: null }]);
  const { json } = await ambil('/konten/cerita-alumni');
  assert.equal(json.data[0].jalur, 'SNBT (UTBK)');
  assert.equal(json.data[0].jalur_seleksi, 'SNBT (UTBK)');
});

test('eksplorasi tujuan: kampus[].jalur_masuk dan peminat.jalur tetap ada, supaya layar APK lama tidak berhenti', async (t) => {
  t.mock.method(kontenRepo, 'ambilProfilProdiTerverifikasi', async () => [{
    id: 'uji', peminat_jumlah: 10, peminat_jalur_seleksi: 'SNBT',
    mata_kuliah: [], profesi: [], status_sumber: {},
    kampus: [{ nama: 'K', jenis: 'PTN', jalur_seleksi: ['SNBP', 'Mandiri'] }],
    diperiksa_pada: null,
  }]);
  const { json } = await ambil('/konten/eksplorasi-tujuan/uji');
  assert.equal(json.data.peminat.jalur, 'SNBT');
  assert.equal(json.data.peminat.jalur_seleksi, 'SNBT');
  assert.deepEqual(json.data.kampus[0].jalur_masuk, ['SNBP', 'Mandiri']);
  assert.deepEqual(json.data.kampus[0].jalur_seleksi, ['SNBP', 'Mandiri']);
});
