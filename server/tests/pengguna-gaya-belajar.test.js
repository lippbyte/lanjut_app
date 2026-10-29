// Uji preferensi gaya belajar di PATCH /pengguna/saya (LANJUT_032, migrasi 007).

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

async function ubah(token, body) {
  const res = await fetch(`${baseUrl}/api/v1/pengguna/saya`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function saya(token) {
  const res = await fetch(`${baseUrl}/api/v1/auth/saya`, { headers: { Authorization: `Bearer ${token}` } });
  return (await res.json()).data;
}

async function akunBaru() {
  const { json } = await daftarPenggunaBaru(baseUrl);
  return { token: json.data.token, profil: json.data.pengguna };
}

test('gaya_belajar: akun baru → null di profil daftar dan /auth/saya', async () => {
  const { token, profil } = await akunBaru();
  assert.equal(profil.gaya_belajar, null);
  assert.equal((await saya(token)).gaya_belajar, null);
});

test('gaya_belajar: keempat nilai bisa disimpan dan terbaca lagi dari /auth/saya', async () => {
  const { token } = await akunBaru();
  for (const nilai of ['visual', 'auditori', 'kinestetik', 'baca_tulis']) {
    const { status, json } = await ubah(token, { gaya_belajar: nilai });
    assert.equal(status, 200);
    assert.equal(json.data.gaya_belajar, nilai);
    assert.equal((await saya(token)).gaya_belajar, nilai);
  }
});

test('gaya_belajar: null mengosongkan; medan lain tidak ikut berubah', async () => {
  const { token } = await akunBaru();
  await ubah(token, { gaya_belajar: 'visual', kelas: '12' });
  const { status, json } = await ubah(token, { gaya_belajar: null });
  assert.equal(status, 200);
  assert.equal(json.data.gaya_belajar, null);
  assert.equal(json.data.kelas, '12');
});

test('gaya_belajar: mengubah medan lain tidak menghapus gaya belajar', async () => {
  const { token } = await akunBaru();
  await ubah(token, { gaya_belajar: 'kinestetik' });
  const { json } = await ubah(token, { nama_tampilan: 'Nama Baru' });
  assert.equal(json.data.gaya_belajar, 'kinestetik');
});

test('gaya_belajar: nilai tidak dikenal → 400 VALIDASI_GAGAL, bukan 500, dan tidak tersimpan', async () => {
  const { token } = await akunBaru();
  await ubah(token, { gaya_belajar: 'auditori' });
  for (const salah of ['VISUAL', 'musikal', '', 5]) {
    const { status, json } = await ubah(token, { gaya_belajar: salah });
    assert.equal(status, 400, `status untuk ${JSON.stringify(salah)}`);
    assert.equal(json.galat.kode, 'VALIDASI_GAGAL');
  }
  assert.equal((await saya(token)).gaya_belajar, 'auditori');
});

test('gaya_belajar: tanpa login → 401', async () => {
  const res = await fetch(`${baseUrl}/api/v1/pengguna/saya`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ gaya_belajar: 'visual' }),
  });
  assert.equal(res.status, 401);
});
