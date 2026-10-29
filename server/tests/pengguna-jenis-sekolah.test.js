// Uji jenis sekolah (LANJUT_038, migrasi 011, util/kelas.js
// tentukanJenisSekolah): kelas 7–9 selalu SMP tanpa ditanya; kelas 10–12
// SMA/SMK/MA atau null; kombinasi bertentangan → 400; jenis sekolah ikut
// diselaraskan setiap kelas berubah (daftar, PATCH, klaim sinkron).

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
const ubah = (token, body) => panggil('PATCH', '/pengguna/saya', token, body);

async function akun(override) {
  const { status, json } = await daftarPenggunaBaru(baseUrl, override);
  assert.equal(status, 201, JSON.stringify(json));
  return { token: json.data.token, profil: json.data.pengguna };
}

test('daftar kelas 7–9 tanpa jenis sekolah → otomatis SMP', async () => {
  for (const kelas of ['7', '8', '9']) {
    const { token, profil } = await akun({ kelas });
    assert.equal(profil.jenis_sekolah, 'SMP', `kelas ${kelas}`);
    assert.equal((await saya(token)).jenis_sekolah, 'SMP');
  }
});

test('daftar kelas 10–12 dengan SMA/SMK/MA → tersimpan; tanpa jenis sekolah → null', async () => {
  for (const [kelas, jenis] of [['10', 'SMA'], ['11', 'SMK'], ['12', 'MA']]) {
    const { token, profil } = await akun({ kelas, jenis_sekolah: jenis });
    assert.equal(profil.jenis_sekolah, jenis);
    assert.equal((await saya(token)).jenis_sekolah, jenis);
  }
  const { profil } = await akun({ kelas: '11' });
  assert.equal(profil.jenis_sekolah, null, 'klien lama tanpa jenis sekolah → gerbang app bertanya');
});

test('daftar tanpa kelas maupun jenis sekolah → keduanya null', async () => {
  const { profil } = await akun();
  assert.equal(profil.kelas, null);
  assert.equal(profil.jenis_sekolah, null);
});

test('daftar dengan kombinasi bertentangan atau nilai tak dikenal → 400 medan jenis_sekolah, akun tidak dibuat', async () => {
  for (const body of [
    { kelas: '8', jenis_sekolah: 'SMA' },
    { kelas: '9', jenis_sekolah: 'SMK' },
    { kelas: '11', jenis_sekolah: 'SMP' },
    { kelas: '12', jenis_sekolah: 'SD' },
    { kelas: '10', jenis_sekolah: 'smk' },
  ]) {
    const { status, json, namaPengguna, kataSandi } = await daftarPenggunaBaru(baseUrl, body);
    assert.equal(status, 400, JSON.stringify(body));
    assert.equal(json.galat.kode, 'VALIDASI_GAGAL');
    assert.ok(json.galat.medan.jenis_sekolah, JSON.stringify(json.galat));
    const masuk = await panggil('POST', '/auth/masuk', null, { nama_pengguna: namaPengguna, kata_sandi: kataSandi });
    assert.equal(masuk.status, 401, 'akun tidak boleh terbuat');
  }
});

test('PATCH jenis sekolah untuk kelas 11: null → SMK → SMA → null', async () => {
  const { token } = await akun({ kelas: '11' });
  for (const jenis of ['SMK', 'SMA', null]) {
    const res = await ubah(token, { jenis_sekolah: jenis });
    assert.equal(res.status, 200);
    assert.equal(res.json.data.jenis_sekolah, jenis);
    assert.equal((await saya(token)).jenis_sekolah, jenis);
  }
});

test('PATCH kelas menyelaraskan jenis sekolah: 8 (SMP) → 11 (null) → SMK → 12 (tetap SMK) → 9 (SMP)', async () => {
  const { token } = await akun({ kelas: '8' });
  const langkah = [
    [{ kelas: '11' }, '11', null],
    [{ jenis_sekolah: 'SMK' }, '11', 'SMK'],
    [{ kelas: '12' }, '12', 'SMK'],
    [{ kelas: '9' }, '9', 'SMP'],
    [{ kelas: '10', jenis_sekolah: 'MA' }, '10', 'MA'],
  ];
  for (const [body, kelas, jenis] of langkah) {
    const res = await ubah(token, body);
    assert.equal(res.status, 200, JSON.stringify(body));
    const p = await saya(token);
    assert.equal(p.kelas, kelas, JSON.stringify(body));
    assert.equal(p.jenis_sekolah, jenis, JSON.stringify(body));
  }
});

test('PATCH bertentangan → 400 dan profil tidak berubah', async () => {
  const { token } = await akun({ kelas: '11', jenis_sekolah: 'SMK' });
  for (const body of [{ jenis_sekolah: 'SMP' }, { kelas: '8', jenis_sekolah: 'SMA' }, { kelas: '12', jenis_sekolah: 'SMP' }]) {
    const res = await ubah(token, body);
    assert.equal(res.status, 400, JSON.stringify(body));
    assert.ok(res.json.galat.medan.jenis_sekolah);
  }
  const p = await saya(token);
  assert.equal(p.kelas, '11');
  assert.equal(p.jenis_sekolah, 'SMK');

  const smp = await akun({ kelas: '7' });
  assert.equal((await ubah(smp.token, { jenis_sekolah: 'SMK' })).status, 400);
  assert.equal((await saya(smp.token)).jenis_sekolah, 'SMP');
});

test('PATCH medan lain tidak menyentuh jenis sekolah', async () => {
  const { token } = await akun({ kelas: '12', jenis_sekolah: 'MA' });
  await ubah(token, { nama_tampilan: 'Nama Baru', gaya_belajar: 'visual' });
  assert.equal((await saya(token)).jenis_sekolah, 'MA');
});

test('klaim sinkron kelas: 9 → SMP; 11 dari SMP → null; 12 mempertahankan SMK', async () => {
  const a = await akun();
  await panggil('POST', '/sinkron/klaim', a.token, { profil: { kelas: '9' } });
  assert.equal((await saya(a.token)).jenis_sekolah, 'SMP');
  await panggil('POST', '/sinkron/klaim', a.token, { profil: { kelas: '11' } });
  assert.equal((await saya(a.token)).jenis_sekolah, null);

  const b = await akun({ kelas: '11', jenis_sekolah: 'SMK' });
  await panggil('POST', '/sinkron/klaim', b.token, { profil: { kelas: '12' } });
  const p = await saya(b.token);
  assert.equal(p.kelas, '12');
  assert.equal(p.jenis_sekolah, 'SMK');
});
