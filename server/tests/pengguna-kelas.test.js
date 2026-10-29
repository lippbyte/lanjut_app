// Uji kelas SMP 7–9 (LANJUT_035, migrasi 010): daftar, PATCH /pengguna/saya,
// dan klaim sinkron menerima kelas 7–12; nilai di luar itu → 400. Daftar
// tanpa kelas tetap boleh (APK lama), dan akun kelas 10–12 tetap masuk.

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

async function panggil(metode, path, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method: metode,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

const saya = async (token) => (await panggil('GET', '/auth/saya', token)).json.data;

test('daftar dengan kelas 7–12: 201, kelas tersimpan dan ikut di /auth/saya', async () => {
  for (const kelas of ['7', '8', '9', '10', '11', '12']) {
    const { status, json } = await daftarPenggunaBaru(baseUrl, { kelas });
    assert.equal(status, 201, `kelas ${kelas}: ${JSON.stringify(json)}`);
    assert.equal(json.data.pengguna.kelas, kelas);
    assert.equal((await saya(json.data.token)).kelas, kelas);
  }
});

test('daftar tanpa kelas tetap 201 dengan kelas null (APK lama)', async () => {
  const { status, json } = await daftarPenggunaBaru(baseUrl);
  assert.equal(status, 201);
  assert.equal(json.data.pengguna.kelas, null);
});

test('daftar dengan kelas di luar 7–12 → 400 VALIDASI_GAGAL medan kelas, akun tidak dibuat', async () => {
  for (const kelas of ['6', '13', '0', 'SMP', '', 7, null]) {
    const { status, json, namaPengguna, kataSandi } = await daftarPenggunaBaru(baseUrl, { kelas });
    assert.equal(status, 400, `kelas ${JSON.stringify(kelas)}`);
    assert.equal(json.galat.kode, 'VALIDASI_GAGAL');
    assert.ok(json.galat.medan.kelas, `medan kelas untuk ${JSON.stringify(kelas)}`);
    const masuk = await panggil('POST', '/auth/masuk', null, { nama_pengguna: namaPengguna, kata_sandi: kataSandi });
    assert.equal(masuk.status, 401, 'akun tidak boleh terbuat');
  }
});

test('PATCH /pengguna/saya: kelas 12 → 9 → 12 → null, nilai lain → 400 dan kelas tidak berubah', async () => {
  const { json } = await daftarPenggunaBaru(baseUrl, { kelas: '12' });
  const token = json.data.token;

  for (const kelas of ['9', '12', null]) {
    const res = await panggil('PATCH', '/pengguna/saya', token, { kelas });
    assert.equal(res.status, 200, `kelas ${kelas}`);
    assert.equal(res.json.data.kelas, kelas);
    assert.equal((await saya(token)).kelas, kelas);
  }

  await panggil('PATCH', '/pengguna/saya', token, { kelas: '8' });
  for (const kelas of ['6', '13', 'SMA']) {
    const res = await panggil('PATCH', '/pengguna/saya', token, { kelas });
    assert.equal(res.status, 400, `kelas ${kelas}`);
    assert.ok(res.json.galat.medan.kelas);
  }
  assert.equal((await saya(token)).kelas, '8');
});

test('klaim sinkron menerima kelas SMP', async () => {
  const { json } = await daftarPenggunaBaru(baseUrl);
  const token = json.data.token;
  const res = await panggil('POST', '/sinkron/klaim', token, { profil: { kelas: '7' } });
  assert.equal(res.status, 200);
  assert.equal((await saya(token)).kelas, '7');

  const salah = await panggil('POST', '/sinkron/klaim', token, { profil: { kelas: '6' } });
  assert.equal(salah.status, 400);
  assert.equal((await saya(token)).kelas, '7');
});

test('akun kelas 10–12 tetap bisa masuk dan profilnya utuh', async () => {
  for (const kelas of ['10', '11', '12']) {
    const { namaPengguna, kataSandi } = await daftarPenggunaBaru(baseUrl, { kelas, prodi_impian: 'teknik-informatika' });
    const masuk = await panggil('POST', '/auth/masuk', null, { nama_pengguna: namaPengguna, kata_sandi: kataSandi });
    assert.equal(masuk.status, 200, `masuk kelas ${kelas}`);
    assert.equal(masuk.json.data.pengguna.kelas, kelas);
    assert.equal(masuk.json.data.pengguna.prodi_impian, 'teknik-informatika');
  }
});
