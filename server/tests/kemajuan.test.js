// Uji `GET/PUT/DELETE /kemajuan` (LANJUT_030) — data pribadi, wajib login.
//
// Aturan (SDD §4.5, §8.4): setiap query memfilter pengguna_id, jadi centang
// akun A tidak pernah terbaca, terubah, atau terhapus oleh akun B. PUT
// idempoten; DELETE hanya mengosongkan `selesai_pada` (baris tetap ada,
// §6.4); PUT ke butir yang tidak ada → 404.
//
// Memakai butir checklist yang SUDAH ADA (bukan fixture): tes checklist lain
// membandingkan respons checklist utuh dan berjalan paralel, jadi menyisipkan
// butir di sini bisa membuat tes itu goyah. Tiap tes memakai akun baru.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');

let server;
let baseUrl;
let butirX; // dua butir daftar periksa yang ada di basis data
let butirY;

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;

async function panggil(metode, path, token) {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method: metode,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  return { status: res.status, json: await res.json() };
}

async function akunBaru() {
  const { status, json } = await daftarPenggunaBaru(baseUrl);
  assert.equal(status, 201, `daftar gagal: ${JSON.stringify(json)}`);
  return json.data.token;
}

async function kemajuanDari(token) {
  const { status, json } = await panggil('GET', '/kemajuan', token);
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  return json.data;
}

const cari = (data, butirId) => data.find((k) => k.butir_id === butirId);

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const { json } = await panggil('GET', '/konten/checklist');
  const ids = json.data.kategori.flatMap((k) => k.butir.map((b) => b.id));
  assert.ok(ids.length >= 2, 'butuh minimal 2 butir daftar periksa di basis data (jalankan npm run benih)');
  [butirX, butirY] = ids;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('kemajuan tanpa token → 401 TIDAK_MASUK untuk GET, PUT, dan DELETE', async () => {
  for (const [metode, path] of [['GET', '/kemajuan'], ['PUT', `/kemajuan/${butirX}`], ['DELETE', `/kemajuan/${butirX}`]]) {
    const { status, json } = await panggil(metode, path);
    assert.equal(status, 401, `${metode} ${path}`);
    assert.equal(json.galat.kode, 'TIDAK_MASUK');
  }
});

test('kemajuan dengan token palsu atau token yang sudah keluar → 401 TIDAK_MASUK', async () => {
  const palsu = await panggil('GET', '/kemajuan', 'token-palsu-bukan-sesi');
  assert.equal(palsu.status, 401);
  assert.equal(palsu.json.galat.kode, 'TIDAK_MASUK');

  const token = await akunBaru();
  const keluar = await panggil('POST', '/auth/keluar', token);
  assert.equal(keluar.status, 200);
  const sesudah = await panggil('PUT', `/kemajuan/${butirX}`, token);
  assert.equal(sesudah.status, 401);
  assert.equal(sesudah.json.galat.kode, 'TIDAK_MASUK');
});

test('kemajuan akun baru: kosong → 200 dengan data []', async () => {
  const token = await akunBaru();
  assert.deepEqual(await kemajuanDari(token), []);
});

test('PUT /kemajuan: menandai selesai, bentuk respons benar, dan idempoten', async () => {
  const token = await akunBaru();
  const pertama = await panggil('PUT', `/kemajuan/${butirX}`, token);
  assert.equal(pertama.status, 200);
  assert.equal(pertama.json.data.butir_id, butirX);
  assert.match(pertama.json.data.selesai_pada, ISO);

  const kedua = await panggil('PUT', `/kemajuan/${butirX}`, token);
  assert.equal(kedua.status, 200);

  const data = await kemajuanDari(token);
  assert.equal(data.filter((k) => k.butir_id === butirX).length, 1, 'PUT dua kali tidak boleh menggandakan baris');
  assert.deepEqual(Object.keys(cari(data, butirX)).sort(), ['butir_id', 'selesai_pada']);
  assert.match(cari(data, butirX).selesai_pada, ISO);
});

test('PUT /kemajuan ke butir yang tidak ada → 404 TIDAK_DITEMUKAN, bukan 500, dan tidak tersimpan', async () => {
  const token = await akunBaru();
  const aneh = ['butir-yang-tidak-ada', "x' OR '1'='1", 'a'.repeat(200)];
  for (const id of aneh) {
    const { status, json } = await panggil('PUT', `/kemajuan/${encodeURIComponent(id)}`, token);
    assert.equal(status, 404, `status untuk "${id.slice(0, 20)}"`);
    assert.equal(json.galat.kode, 'TIDAK_DITEMUKAN');
  }
  assert.deepEqual(await kemajuanDari(token), []);
});

test('DELETE /kemajuan: mengosongkan selesai_pada tanpa menghapus baris (§6.4)', async () => {
  const token = await akunBaru();
  await panggil('PUT', `/kemajuan/${butirX}`, token);
  const hapus = await panggil('DELETE', `/kemajuan/${butirX}`, token);
  assert.equal(hapus.status, 200);
  assert.deepEqual(hapus.json.data, { butir_id: butirX, selesai_pada: null });

  const data = await kemajuanDari(token);
  assert.deepEqual(cari(data, butirX), { butir_id: butirX, selesai_pada: null });

  // Centang lagi sesudah dibatalkan → selesai lagi.
  await panggil('PUT', `/kemajuan/${butirX}`, token);
  assert.match(cari(await kemajuanDari(token), butirX).selesai_pada, ISO);
});

test('DELETE /kemajuan untuk butir yang belum pernah dicentang: 200, tidak membuat baris', async () => {
  const token = await akunBaru();
  for (const id of [butirY, 'butir-yang-tidak-ada']) {
    const { status, json } = await panggil('DELETE', `/kemajuan/${encodeURIComponent(id)}`, token);
    assert.equal(status, 200);
    assert.equal(json.data.selesai_pada, null);
  }
  assert.deepEqual(await kemajuanDari(token), []);
});

test('kemajuan dua akun: centang A tidak terbaca B, dan tidak bisa diubah atau dibatalkan oleh B', async () => {
  const a = await akunBaru();
  const b = await akunBaru();

  await panggil('PUT', `/kemajuan/${butirX}`, a);
  assert.equal(cari(await kemajuanDari(b), butirX), undefined, 'centang A bocor ke GET B');

  // B membatalkan butir yang sama → hanya baris B (yang tidak ada) yang tersentuh.
  await panggil('DELETE', `/kemajuan/${butirX}`, b);
  assert.match(cari(await kemajuanDari(a), butirX).selesai_pada, ISO, 'DELETE oleh B membatalkan centang A');
  assert.deepEqual(await kemajuanDari(b), []);

  // B mencentang butir lain, lalu A membatalkannya → centang B tetap.
  await panggil('PUT', `/kemajuan/${butirY}`, b);
  await panggil('DELETE', `/kemajuan/${butirY}`, a);
  assert.match(cari(await kemajuanDari(b), butirY).selesai_pada, ISO, 'DELETE oleh A membatalkan centang B');

  // A tidak pernah mencentang Y → DELETE-nya tidak membuat baris di akun A.
  const dataA = await kemajuanDari(a);
  assert.match(cari(dataA, butirX).selesai_pada, ISO);
  assert.equal(cari(dataA, butirY), undefined);
  assert.equal(cari(await kemajuanDari(b), butirX), undefined);
});
