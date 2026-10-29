// Uji `PATCH /pengguna/saya` — docs/SDD-Backend-Foundation.md §4.3.
// Fokus C-2b: prodi_impian yang tidak dikenal harus 400 VALIDASI_GAGAL,
// bukan 500 (pelanggaran FK prodi_tujuan).

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');

let server;
let baseUrl;

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('PATCH /pengguna/saya: prodi_impian valid -> 200, tersimpan', async () => {
  const { json: daftarJson } = await daftarPenggunaBaru(baseUrl);
  const token = daftarJson.data.token;

  const res = await fetch(`${baseUrl}/api/v1/pengguna/saya`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prodi_impian: 'farmasi' }),
  });
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.data.prodi_impian, 'farmasi');
});

test('PATCH /pengguna/saya: prodi_impian tidak dikenal -> 400 VALIDASI_GAGAL, bukan 500 (C-2b)', async () => {
  const { json: daftarJson } = await daftarPenggunaBaru(baseUrl);
  const token = daftarJson.data.token;

  const res = await fetch(`${baseUrl}/api/v1/pengguna/saya`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ prodi_impian: 'tidak-ada' }),
  });
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.galat.kode, 'VALIDASI_GAGAL');
  assert.ok(json.galat.medan.prodi_impian);
});
