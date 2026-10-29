// tests/pilih-mapel-rangkuman.test.js
// Pengujian otomatis LANJUT_071 §B — opsi "rangkuman umum" di Pilih Mapel
// (yang mencentang butir umum `mapel-tka`) tidak untuk kelas 10–11:
// - klien: tampilkanRangkumanUmum di lib/pilihMapel.ts (dijalankan langsung
//   lewat muat-ts-app.js), dipakai PilihMapelScreen untuk menyembunyikan opsi
// - server: PUT /kemajuan/mapel-tka dari akun kelas 10–11 ditolak dengan kode
//   yang sudah dipakai rute itu (404 TIDAK_DITEMUKAN) dan tidak tersimpan;
//   kelas 12 tetap bisa. Kelas dibaca dari akun saat permintaan, bukan dari token.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const { muatModulApp } = require('./muat-ts-app');

const { tampilkanRangkumanUmum, BUTIR_MAPEL_TKA } = muatModulApp('lib/pilihMapel');

describe('LANJUT_071 §B: klien — opsi "rangkuman umum" per kelas', () => {
  test('Kelas 10 dan 11 tidak melihat opsi "rangkuman umum"', () => {
    assert.equal(tampilkanRangkumanUmum('10'), false);
    assert.equal(tampilkanRangkumanUmum('11'), false);
  });

  test('Kelas 12 tetap melihatnya; kelas lain tidak berubah', () => {
    assert.equal(tampilkanRangkumanUmum('12'), true);
    for (const kelas of ['7', '8', '9', null, undefined]) assert.equal(tampilkanRangkumanUmum(kelas), true, `kelas ${kelas}`);
  });

  test('Butir yang dijaga sama dengan yang dicentang Pilih Mapel', () => {
    assert.equal(BUTIR_MAPEL_TKA, 'mapel-tka');
  });
});

describe('LANJUT_071 §B: server — centang mapel-tka dari klien lama', () => {
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
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json() };
  }

  async function akunBaru(kelas, jenis) {
    const { status, json } = await daftarPenggunaBaru(baseUrl, { kelas, ...(jenis ? { jenis_sekolah: jenis } : {}) });
    assert.equal(status, 201, JSON.stringify(json));
    return json.data.token;
  }

  const centangMapelTka = async (token) =>
    (await panggil('GET', '/kemajuan', token)).json.data.filter((k) => k.butir_id === 'mapel-tka' && k.selesai_pada);

  test('Kelas 10 dan 11: PUT /kemajuan/mapel-tka ditolak 404 TIDAK_DITEMUKAN dan tidak tersimpan', async () => {
    for (const kelas of ['10', '11']) {
      const token = await akunBaru(kelas, 'SMA');
      const res = await panggil('PUT', '/kemajuan/mapel-tka', token);
      assert.equal(res.status, 404, `kelas ${kelas}`);
      assert.equal(res.json.ok, false);
      assert.equal(res.json.galat.kode, 'TIDAK_DITEMUKAN');
      assert.deepEqual(await centangMapelTka(token), [], `kelas ${kelas}: centang mapel-tka tidak boleh tersimpan`);

      // Butir umum lain dan batal centang tidak ikut dijaga (perilaku lama tetap).
      assert.equal((await panggil('PUT', '/kemajuan/ktp', token)).status, 200);
      assert.equal((await panggil('DELETE', '/kemajuan/mapel-tka', token)).status, 200);
    }
  });

  test('Kelas 12 tetap bisa mencentang mapel-tka; kelas 7 tidak berubah', async () => {
    for (const [kelas, jenis] of [['12', 'SMA'], ['7', null]]) {
      const token = await akunBaru(kelas, jenis);
      const res = await panggil('PUT', '/kemajuan/mapel-tka', token);
      assert.equal(res.status, 200, `kelas ${kelas}`);
      assert.equal((await centangMapelTka(token)).length, 1, `kelas ${kelas}`);
    }
  });

  test('Kelas dibaca dari akun saat permintaan: pindah dari kelas 12 ke kelas 10 langsung ditolak', async () => {
    const token = await akunBaru('12', 'SMA');
    assert.equal((await panggil('PUT', '/kemajuan/mapel-tka', token)).status, 200);
    assert.equal((await panggil('DELETE', '/kemajuan/mapel-tka', token)).status, 200);
    assert.equal((await panggil('PATCH', '/pengguna/saya', token, { kelas: '10' })).status, 200);
    assert.equal((await panggil('PUT', '/kemajuan/mapel-tka', token)).status, 404);
    assert.deepEqual(await centangMapelTka(token), []);
  });

  test('Lintas akun: centang mapel-tka akun kelas 12 tidak muncul di akun kelas 10, dan sebaliknya ditolak', async () => {
    const tokenA = await akunBaru('12', 'SMA');
    const tokenB = await akunBaru('10', 'SMA');
    assert.equal((await panggil('PUT', '/kemajuan/mapel-tka', tokenA)).status, 200);
    assert.equal((await panggil('PUT', '/kemajuan/mapel-tka', tokenB)).status, 404);
    assert.equal((await centangMapelTka(tokenA)).length, 1);
    assert.deepEqual(await centangMapelTka(tokenB), []);
  });
});
