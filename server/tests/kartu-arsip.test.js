// Uji alur Arsip Belajar (LANJUT_039) di atas /kartu — kategori kartu =
// mapel_id (tabel `mapel`, 10 mapel yang sama dengan F3 Pilih Mapel).
//
// App meminta GET /kartu?sumber=pengguna, jadi 12 kartu kurasi (sumber
// 'resmi', belum diverifikasi) tidak pernah dikirim ke layar Arsip. Pola
// lintas akun mengikuti butir-pribadi.test.js (LANJUT_034): kartu akun A
// tidak terbaca, terubah, maupun terhapus oleh akun B — 404, bukan 403.

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
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

async function akunBaru() {
  const { status, json } = await daftarPenggunaBaru(baseUrl);
  assert.equal(status, 201);
  return json.data.token;
}

const buat = (token, override) =>
  panggil('POST', '/kartu', token, { mapel_id: 'fisika', judul: 'Hukum Newton', isi: 'F = m × a', ...override });
const arsip = async (token, query = '') => {
  const { status, json } = await panggil('GET', `/kartu?sumber=pengguna${query}`, token);
  assert.equal(status, 200);
  return json.data;
};

test('GET /kartu?sumber=pengguna hanya kartu milik sendiri — tanpa satu pun kartu kurasi', async () => {
  const token = await akunBaru();
  // Pembanding: kartu kurasi memang ada di basis data (sejak LANJUT_040 GET
  // /kartu tanpa saringan pun tidak lagi mengirim yang belum terverifikasi).
  const [kurasi] = await pool.execute("SELECT COUNT(*) AS n FROM kartu WHERE sumber = 'resmi' AND dihapus_pada IS NULL");
  assert.ok(kurasi[0].n > 0, 'butuh kartu kurasi di DB (npm run benih)');

  assert.deepEqual(await arsip(token), []);
  await buat(token);
  const data = await arsip(token);
  assert.equal(data.length, 1);
  assert.ok(data.every((k) => k.sumber === 'pengguna'));
});

test('tambah kartu dengan kategori (mapel): 201, tersimpan, dan saringan per mapel bekerja', async () => {
  const token = await akunBaru();
  const fisika = await buat(token, { mapel_id: 'fisika', jawaban: 'Newton' });
  assert.equal(fisika.status, 201);
  assert.equal(fisika.json.data.mapel_id, 'fisika');
  await buat(token, { mapel_id: 'biologi', judul: 'Sel', isi: 'Unit terkecil kehidupan' });
  await buat(token, { mapel_id: 'biologi', judul: 'Fotosintesis', isi: 'Cahaya → glukosa' });

  assert.equal((await arsip(token)).length, 3);
  const bio = await arsip(token, '&mapel=biologi');
  assert.deepEqual(bio.map((k) => k.judul).sort(), ['Fotosintesis', 'Sel']);
  assert.deepEqual((await arsip(token, '&mapel=fisika')).map((k) => k.id), [fisika.json.data.id]);
  assert.deepEqual(await arsip(token, '&mapel=kimia'), []);
});

test('tambah kartu dengan mapel di luar daftar → 400 medan mapel_id', async () => {
  const token = await akunBaru();
  const { status, json } = await buat(token, { mapel_id: 'astrologi' });
  assert.equal(status, 400);
  assert.ok(json.galat.medan.mapel_id);
  assert.deepEqual(await arsip(token), []);
});

test('ubah kartu sendiri: judul, isi, jawaban, dan mapel (kategori) tersimpan', async () => {
  const token = await akunBaru();
  const { json } = await buat(token, { jawaban: 'lama' });
  const id = json.data.id;

  const res = await panggil('PATCH', `/kartu/${id}`, token, { mapel_id: 'kimia', judul: 'Judul baru', isi: 'Isi baru', jawaban: null });
  assert.equal(res.status, 200);
  assert.equal(res.json.data.mapel_id, 'kimia');
  assert.equal(res.json.data.judul, 'Judul baru');
  assert.equal(res.json.data.isi, 'Isi baru');
  assert.equal(res.json.data.jawaban, null);

  const [k] = await arsip(token);
  assert.equal(k.mapel_id, 'kimia');
  assert.deepEqual((await arsip(token, '&mapel=fisika')), []);

  // Medan yang tidak dikirim tidak berubah.
  await panggil('PATCH', `/kartu/${id}`, token, { jawaban: 'baru' });
  const [k2] = await arsip(token);
  assert.equal(k2.mapel_id, 'kimia');
  assert.equal(k2.judul, 'Judul baru');
  assert.equal(k2.jawaban, 'baru');
});

test('ubah mapel ke yang tidak ada → 400, kartu tidak berubah', async () => {
  const token = await akunBaru();
  const { json } = await buat(token);
  const res = await panggil('PATCH', `/kartu/${json.data.id}`, token, { mapel_id: 'astrologi', judul: 'Tidak boleh' });
  assert.equal(res.status, 400);
  assert.ok(res.json.galat.medan.mapel_id);
  const [k] = await arsip(token);
  assert.equal(k.mapel_id, 'fisika');
  assert.equal(k.judul, 'Hukum Newton');
});

test('hapus kartu sendiri → hilang dari arsip; hapus kedua → 404', async () => {
  const token = await akunBaru();
  const { json } = await buat(token);
  const hapus = await panggil('DELETE', `/kartu/${json.data.id}`, token);
  assert.equal(hapus.status, 200);
  assert.deepEqual(await arsip(token), []);
  assert.equal((await panggil('DELETE', `/kartu/${json.data.id}`, token)).status, 404);
  assert.equal((await panggil('PATCH', `/kartu/${json.data.id}`, token, { judul: 'x' })).status, 404);
});

test('LINTAS AKUN: kartu A tidak terbaca, terubah (termasuk mapel), maupun terhapus oleh B', async () => {
  const a = await akunBaru();
  const b = await akunBaru();
  const kartuA = (await buat(a, { mapel_id: 'ekonomi', judul: 'Rahasia A', jawaban: 'jawaban A' })).json.data;

  for (const query of ['', '&mapel=ekonomi']) {
    assert.deepEqual(await arsip(b, query), [], `kartu A bocor ke arsip B (${query || 'semua'})`);
  }
  const semuaB = (await panggil('GET', '/kartu', b)).json.data;
  assert.equal(semuaB.some((k) => k.id === kartuA.id), false, 'kartu A bocor ke GET /kartu B tanpa saringan');

  for (const body of [{ judul: 'Diubah B' }, { mapel_id: 'kimia' }, { jawaban: null }]) {
    const res = await panggil('PATCH', `/kartu/${kartuA.id}`, b, body);
    assert.equal(res.status, 404, JSON.stringify(body));
    assert.equal(res.json.galat.kode, 'TIDAK_DITEMUKAN');
  }
  const hapus = await panggil('DELETE', `/kartu/${kartuA.id}`, b);
  assert.equal(hapus.status, 404);

  const [masihA] = await arsip(a);
  assert.deepEqual(
    { id: masihA.id, mapel_id: masihA.mapel_id, judul: masihA.judul, jawaban: masihA.jawaban },
    { id: kartuA.id, mapel_id: 'ekonomi', judul: 'Rahasia A', jawaban: 'jawaban A' },
    'aksi B mengubah kartu A'
  );

  // Sebaliknya: kartu B tidak terlihat dan tidak bisa dihapus A.
  const kartuB = (await buat(b, { judul: 'Milik B' })).json.data;
  assert.equal((await arsip(a)).some((k) => k.id === kartuB.id), false);
  assert.equal((await panggil('DELETE', `/kartu/${kartuB.id}`, a)).status, 404);
  assert.equal((await arsip(b)).length, 1);
});
