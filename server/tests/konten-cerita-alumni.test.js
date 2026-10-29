// Uji `GET /konten/cerita-alumni` (LANJUT_030).
//
// Aturan (PRD F4, SDD §4.4): endpoint publik WAJIB hanya mengirim cerita
// dengan `izin_tayang = 1 AND tayang = 1`; penyaringannya di repositori
// (konten.repo.js `ambilCeritaAlumniTayang`). Cerita tanpa izin tertulis
// tidak boleh keluar lewat jalan apa pun — termasuk lewat parameter kueri.
//
// Fixture ber-id `uji-030-alumni-` (keempat kombinasi izin × tayang),
// dihapus lagi di after(). Kondisi kosong & galat DB diuji dengan mengganti
// fungsi repositori sementara.

const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, pool } = require('./bantuan');
const kontenRepo = require('../src/modul/konten/konten.repo');

const KUNCI = [
  'id', 'nama', 'asal_smk', 'jurusan_smk', 'ptn', 'prodi', 'jalur', 'hambatan', 'yang_dilakukan',
  'sumber', 'pemilik', 'status_verifikasi', 'asal', 'url_sumber', 'diperiksa_pada',
].sort();

const FIXTURE = [
  { id: 'uji-030-alumni-tayang', izin: 1, tayang: 1 },
  { id: 'uji-030-alumni-izin-saja', izin: 1, tayang: 0 },
  { id: 'uji-030-alumni-tayang-tanpa-izin', izin: 0, tayang: 1 },
  { id: 'uji-030-alumni-tanpa-keduanya', izin: 0, tayang: 0 },
];
const ID_FIXTURE = FIXTURE.map((f) => f.id);
const TERLARANG = ID_FIXTURE.filter((id) => id !== 'uji-030-alumni-tayang');

let server;
let baseUrl;

async function ambil(path) {
  const res = await fetch(`${baseUrl}/api/v1${path}`);
  return { status: res.status, json: await res.json() };
}

async function hapusFixture() {
  await pool.query('DELETE FROM cerita_alumni WHERE id IN (?)', [ID_FIXTURE]);
}

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  await hapusFixture();
  for (const f of FIXTURE) {
    await pool.query(
      `INSERT INTO cerita_alumni
         (id, nama, asal_smk, jurusan_smk, ptn, prodi, jalur, hambatan, yang_dilakukan,
          izin_tayang, tayang, pemilik, asal)
       VALUES (?, ?, 'SMK Uji', 'RPL', 'PTN Uji', 'Prodi Uji', 'SNBP', 'Hambatan uji', 'Yang dilakukan uji',
               ?, ?, 'tim', 'uji')`,
      [f.id, `Alumni ${f.id}`, f.izin, f.tayang]
    );
  }
});

after(async () => {
  mock.restoreAll();
  await hapusFixture();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('cerita-alumni: hanya cerita izin_tayang=1 DAN tayang=1 yang dikirim', async () => {
  const { status, json } = await ambil('/konten/cerita-alumni');
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  const ids = json.data.map((c) => c.id);
  assert.ok(ids.includes('uji-030-alumni-tayang'), 'cerita berizin & tayang harus muncul');
  for (const id of TERLARANG) assert.ok(!ids.includes(id), `${id} bocor ke respons publik`);
});

test('cerita-alumni: tidak ada satu pun cerita tanpa izin/tayang di basis data yang ikut terkirim', async () => {
  const [tertahan] = await pool.query('SELECT id FROM cerita_alumni WHERE izin_tayang = 0 OR tayang = 0');
  assert.ok(tertahan.length >= TERLARANG.length);
  const { json } = await ambil('/konten/cerita-alumni');
  const ids = new Set(json.data.map((c) => c.id));
  for (const { id } of tertahan) assert.ok(!ids.has(id), `${id} (belum boleh tayang) ikut terkirim`);
});

test('cerita-alumni: parameter kueri tidak bisa membuka cerita yang belum boleh tayang', async () => {
  for (const q of ['?izin_tayang=0', '?tayang=0', '?semua=1', '?izin_tayang=0&tayang=0', `?id=${TERLARANG[0]}`]) {
    const { status, json } = await ambil(`/konten/cerita-alumni${q}`);
    assert.equal(status, 200, `status untuk ${q}`);
    const ids = json.data.map((c) => c.id);
    for (const id of TERLARANG) assert.ok(!ids.includes(id), `${id} bocor lewat ${q}`);
  }
});

test('cerita-alumni: bentuk data tanpa kolom internal (izin_tayang/tayang tidak dikirim)', async () => {
  const { json } = await ambil('/konten/cerita-alumni');
  const c = json.data.find((x) => x.id === 'uji-030-alumni-tayang');
  assert.deepEqual(Object.keys(c).sort(), KUNCI);
  assert.equal(c.nama, 'Alumni uji-030-alumni-tayang');
  assert.equal(c.jalur, 'SNBP');
  assert.equal(c.diperiksa_pada, null);
  for (const x of json.data) assert.deepEqual(Object.keys(x).sort(), KUNCI, `kunci ${x.id} berbeda`);
});

test('cerita-alumni: tidak ada cerita tayang → 200 dengan data [] (layar kosong di klien)', async (t) => {
  t.mock.method(kontenRepo, 'ambilCeritaAlumniTayang', async () => []);
  const { status, json } = await ambil('/konten/cerita-alumni');
  assert.equal(status, 200);
  assert.deepEqual(json, { ok: true, data: [] });
});

test('cerita-alumni: galat basis data → 500 GALAT_SERVER tanpa membocorkan detail', async (t) => {
  t.mock.method(kontenRepo, 'ambilCeritaAlumniTayang', async () => {
    throw new Error('ER_PARSE_ERROR near izin_tayang');
  });
  t.mock.method(console, 'error', () => {});
  const res = await fetch(`${baseUrl}/api/v1/konten/cerita-alumni`);
  const teks = await res.text();
  assert.equal(res.status, 500);
  assert.equal(JSON.parse(teks).galat.kode, 'GALAT_SERVER');
  assert.ok(!/ER_PARSE_ERROR|izin_tayang/.test(teks));
});
