// Uji `/butir-pribadi` (LANJUT_034) — butir Daftar Periksa milik akun.
//
// Aturan: setiap query memfilter pengguna_id, jadi butir akun A tidak pernah
// terbaca, tercentang, atau terhapus oleh akun B (404, bukan 403 — §8.4).
// Judul disusun server dari nama prodi & mapel. Simpan ulang (jenis, prodi)
// yang sama memperbarui butir lama. Batal centang = selesai_pada NULL (baris
// tetap); hapus = hapus lunak.
//
// Memakai prodi & mapel yang SUDAH ADA (bukan fixture), seperti
// kemajuan.test.js — tabel konten dipakai paralel oleh tes lain. Tiap tes
// memakai akun baru, jadi tidak ada data yang saling bertabrakan.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');

let server;
let baseUrl;
let prodiA; // { id, nama, mapel: [{ id, nama }, ...] } — minimal 2 mapel
let prodiB;
let mapelLain; // mapel yang TIDAK terkait prodiA

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

async function panggil(metode, path, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method: metode,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

async function akunBaru() {
  const { status, json } = await daftarPenggunaBaru(baseUrl);
  assert.equal(status, 201, `daftar gagal: ${JSON.stringify(json)}`);
  return json.data.token;
}

async function butirDari(token) {
  const { status, json } = await panggil('GET', '/butir-pribadi', token);
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  return json.data;
}

const simpanMapel = (token, prodi, mapel = prodi.mapel.slice(0, 2)) =>
  panggil('POST', '/butir-pribadi', token, { jenis: 'mapel_tka', prodi_id: prodi.id, mapel_ids: mapel.map((m) => m.id) });
const simpanRiset = (token, prodi) => panggil('POST', '/butir-pribadi', token, { jenis: 'riset_kampus', prodi_id: prodi.id });

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);

  const { json } = await panggil('GET', '/konten/prodi');
  const denganMapel = [];
  for (const p of json.data) {
    const m = await panggil('GET', `/konten/prodi/${encodeURIComponent(p.id)}/mapel`);
    if (m.json.data.length >= 2) denganMapel.push({ id: p.id, nama: p.nama, mapel: m.json.data });
    if (denganMapel.length === 2) break;
  }
  assert.equal(denganMapel.length, 2, 'butuh 2 prodi dengan minimal 2 mapel (jalankan npm run benih)');
  [prodiA, prodiB] = denganMapel;

  const semuaMapel = (await panggil('GET', '/konten/mapel')).json.data;
  mapelLain = semuaMapel.find((m) => !prodiA.mapel.some((pm) => pm.id === m.id));
  assert.ok(mapelLain, 'butuh satu mapel yang tidak terkait prodiA');
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('butir-pribadi tanpa token → 401 TIDAK_MASUK di semua rute', async () => {
  const rute = [
    ['GET', '/butir-pribadi'],
    ['POST', '/butir-pribadi'],
    ['PUT', '/butir-pribadi/x/selesai'],
    ['DELETE', '/butir-pribadi/x/selesai'],
    ['DELETE', '/butir-pribadi/x'],
  ];
  for (const [metode, path] of rute) {
    const { status, json } = await panggil(metode, path, null, metode === 'POST' ? { jenis: 'riset_kampus', prodi_id: prodiA.id } : undefined);
    assert.equal(status, 401, `${metode} ${path}`);
    assert.equal(json.galat.kode, 'TIDAK_MASUK');
  }
});

test('akun baru: GET → 200 dengan data []', async () => {
  assert.deepEqual(await butirDari(await akunBaru()), []);
});

test('simpan dari F3 (mapel_tka): 201, judul dari data server, langsung dicentang, masuk kategori Pendaftaran', async () => {
  const token = await akunBaru();
  const [m1, m2] = prodiA.mapel;
  const { status, json } = await simpanMapel(token, prodiA, [m1, m2]);
  assert.equal(status, 201);
  const b = json.data;
  assert.match(b.id, UUID);
  assert.deepEqual(
    { ...b, id: null, selesai_pada: null, dibuat_pada: null },
    {
      id: null,
      jenis: 'mapel_tka',
      prodi_id: prodiA.id,
      judul: `Pilih ${m1.nama} & ${m2.nama} sebagai mapel TKA — untuk ${prodiA.nama}`,
      kategori_id: 'pendaftaran',
      kategori_nama: 'Pendaftaran',
      selesai_pada: null,
      dibuat_pada: null,
    }
  );
  assert.match(b.selesai_pada, ISO);
  assert.match(b.dibuat_pada, ISO);
  assert.deepEqual(await butirDari(token), [b]);
});

test('simpan dari F3 dengan satu mapel saja: judul tanpa "&"', async () => {
  const token = await akunBaru();
  const { status, json } = await simpanMapel(token, prodiA, [prodiA.mapel[0]]);
  assert.equal(status, 201);
  assert.equal(json.data.judul, `Pilih ${prodiA.mapel[0].nama} sebagai mapel TKA — untuk ${prodiA.nama}`);
});

test('simpan dari F10 (riset_kampus): 201, belum dicentang, kategori Riset Kampus', async () => {
  const token = await akunBaru();
  const { status, json } = await simpanRiset(token, prodiA);
  assert.equal(status, 201);
  assert.equal(json.data.jenis, 'riset_kampus');
  assert.equal(json.data.judul, `Cari tahu lebih lanjut soal ${prodiA.nama}`);
  assert.equal(json.data.kategori_id, 'riset-kampus');
  assert.equal(json.data.kategori_nama, 'Riset Kampus');
  assert.equal(json.data.selesai_pada, null);
});

test('simpan ulang prodi & jenis yang sama: 200, id sama, tidak menggandakan; judul ikut mapel terbaru', async () => {
  const token = await akunBaru();
  const pertama = await simpanMapel(token, prodiA, prodiA.mapel.slice(0, 2));
  const kedua = await simpanMapel(token, prodiA, [prodiA.mapel[1], prodiA.mapel[0]]);
  assert.equal(kedua.status, 200);
  assert.equal(kedua.json.data.id, pertama.json.data.id);
  assert.match(kedua.json.data.judul, new RegExp(`^Pilih ${prodiA.mapel[1].nama} & ${prodiA.mapel[0].nama}`));

  // Jenis lain & prodi lain = butir lain.
  await simpanRiset(token, prodiA);
  await simpanMapel(token, prodiB);
  const data = await butirDari(token);
  assert.equal(data.length, 3);
  assert.equal(data.filter((b) => b.jenis === 'mapel_tka' && b.prodi_id === prodiA.id).length, 1);
});

test('simpan ulang riset_kampus mempertahankan centang yang sudah ada', async () => {
  const token = await akunBaru();
  const { json } = await simpanRiset(token, prodiA);
  await panggil('PUT', `/butir-pribadi/${json.data.id}/selesai`, token);
  const ulang = await simpanRiset(token, prodiA);
  assert.equal(ulang.status, 200);
  assert.match(ulang.json.data.selesai_pada, ISO);
});

test('validasi simpan → 400 VALIDASI_GAGAL dan tidak ada yang tersimpan', async () => {
  const token = await akunBaru();
  const salah = [
    [{ jenis: 'mapel_tka', prodi_id: 'prodi-yang-tidak-ada', mapel_ids: [prodiA.mapel[0].id] }, 'prodi_id'],
    [{ jenis: 'riset_kampus', prodi_id: "x' OR '1'='1" }, 'prodi_id'],
    [{ jenis: 'mapel_tka', prodi_id: prodiA.id, mapel_ids: [mapelLain.id] }, 'mapel_ids'],
    [{ jenis: 'mapel_tka', prodi_id: prodiA.id, mapel_ids: [prodiA.mapel[0].id, 'mapel-tidak-ada'] }, 'mapel_ids'],
    [{ jenis: 'mapel_tka', prodi_id: prodiA.id, mapel_ids: [prodiA.mapel[0].id, prodiA.mapel[0].id] }, 'mapel_ids'],
    [{ jenis: 'mapel_tka', prodi_id: prodiA.id, mapel_ids: [] }, 'mapel_ids'],
    [{ jenis: 'mapel_tka', prodi_id: prodiA.id, mapel_ids: ['a', 'b', 'c'] }, 'mapel_ids'],
    [{ jenis: 'mapel_tka', prodi_id: prodiA.id }, 'mapel_ids'],
    [{ jenis: 'tulisan_bebas', prodi_id: prodiA.id }, 'jenis'],
    [{ prodi_id: prodiA.id }, 'jenis'],
  ];
  for (const [body, medan] of salah) {
    const { status, json } = await panggil('POST', '/butir-pribadi', token, body);
    assert.equal(status, 400, JSON.stringify(body));
    assert.equal(json.galat.kode, 'VALIDASI_GAGAL');
    assert.ok(json.galat.medan[medan], `medan ${medan} untuk ${JSON.stringify(body)}: ${JSON.stringify(json.galat.medan)}`);
  }
  assert.deepEqual(await butirDari(token), []);
});

test('medan kiriman klien di luar daftar putih diabaikan (judul, pengguna_id, selesai_pada)', async () => {
  const token = await akunBaru();
  const { status, json } = await panggil('POST', '/butir-pribadi', token, {
    jenis: 'riset_kampus',
    prodi_id: prodiA.id,
    judul: '<script>teks bebas</script>',
    pengguna_id: '00000000-0000-0000-0000-000000000000',
    selesai_pada: '2020-01-01T00:00:00Z',
  });
  assert.equal(status, 201);
  assert.equal(json.data.judul, `Cari tahu lebih lanjut soal ${prodiA.nama}`);
  assert.equal(json.data.selesai_pada, null);
  assert.equal((await butirDari(token)).length, 1);
});

test('centang & batal centang: DELETE /:id/selesai mengosongkan selesai_pada, butir tetap ada', async () => {
  const token = await akunBaru();
  const { json } = await simpanRiset(token, prodiA);
  const id = json.data.id;

  const centang = await panggil('PUT', `/butir-pribadi/${id}/selesai`, token);
  assert.equal(centang.status, 200);
  assert.match(centang.json.data.selesai_pada, ISO);

  const batal = await panggil('DELETE', `/butir-pribadi/${id}/selesai`, token);
  assert.equal(batal.status, 200);
  assert.equal(batal.json.data.selesai_pada, null);

  const data = await butirDari(token);
  assert.equal(data.length, 1);
  assert.equal(data[0].id, id);
  assert.equal(data[0].selesai_pada, null);

  // Butir F3 yang langsung dicentang juga bisa dibatalkan.
  const f3 = await simpanMapel(token, prodiA);
  const batalF3 = await panggil('DELETE', `/butir-pribadi/${f3.json.data.id}/selesai`, token);
  assert.equal(batalF3.json.data.selesai_pada, null);
});

test('hapus butir: hilang dari GET, hapus kedua → 404, simpan lagi menghidupkan butir dalam keadaan bersih', async () => {
  const token = await akunBaru();
  const { json } = await simpanRiset(token, prodiA);
  await panggil('PUT', `/butir-pribadi/${json.data.id}/selesai`, token);

  const hapus = await panggil('DELETE', `/butir-pribadi/${json.data.id}`, token);
  assert.equal(hapus.status, 200);
  assert.deepEqual(hapus.json.data, { dihapus: true });
  assert.deepEqual(await butirDari(token), []);

  const lagi = await panggil('DELETE', `/butir-pribadi/${json.data.id}`, token);
  assert.equal(lagi.status, 404);
  assert.equal((await panggil('PUT', `/butir-pribadi/${json.data.id}/selesai`, token)).status, 404);

  const hidup = await simpanRiset(token, prodiA);
  assert.equal(hidup.status, 201, 'butir yang sudah dihapus dihitung baru lagi');
  assert.equal(hidup.json.data.selesai_pada, null, 'centang lama tidak ikut hidup lagi');
  assert.equal((await butirDari(token)).length, 1);
});

test('id tidak dikenal atau aneh → 404 TIDAK_DITEMUKAN, bukan 500', async () => {
  const token = await akunBaru();
  for (const id of ['tidak-ada', "x' OR '1'='1", 'a'.repeat(300), '00000000-0000-0000-0000-000000000000']) {
    for (const [metode, akhiran] of [['PUT', '/selesai'], ['DELETE', '/selesai'], ['DELETE', '']]) {
      const { status, json } = await panggil(metode, `/butir-pribadi/${encodeURIComponent(id)}${akhiran}`, token);
      assert.equal(status, 404, `${metode} ${id.slice(0, 20)}${akhiran}`);
      assert.equal(json.galat.kode, 'TIDAK_DITEMUKAN');
    }
  }
});

test('LINTAS AKUN: butir A tidak terbaca, tercentang, terbatal, maupun terhapus oleh B', async () => {
  const a = await akunBaru();
  const b = await akunBaru();

  const butirA = (await simpanRiset(a, prodiA)).json.data;
  const butirA2 = (await simpanMapel(a, prodiA)).json.data; // sudah dicentang

  // B tidak melihat apa pun.
  assert.deepEqual(await butirDari(b), [], 'butir A bocor ke GET B');

  // B mencoba mengubah butir A memakai id-nya → 404, dan A tidak berubah.
  for (const [metode, path] of [
    ['PUT', `/butir-pribadi/${butirA.id}/selesai`],
    ['DELETE', `/butir-pribadi/${butirA2.id}/selesai`],
    ['DELETE', `/butir-pribadi/${butirA.id}`],
    ['DELETE', `/butir-pribadi/${butirA2.id}`],
  ]) {
    const { status, json } = await panggil(metode, path, b);
    assert.equal(status, 404, `${metode} ${path} oleh B`);
    assert.equal(json.galat.kode, 'TIDAK_DITEMUKAN');
  }
  const dataA = await butirDari(a);
  assert.equal(dataA.length, 2, 'B menghapus butir A');
  assert.equal(dataA.find((x) => x.id === butirA.id).selesai_pada, null, 'B mencentang butir A');
  assert.match(dataA.find((x) => x.id === butirA2.id).selesai_pada, ISO, 'B membatalkan centang A');

  // B menyimpan prodi & jenis yang sama → butir B sendiri, id lain; A tidak tersentuh.
  const butirB = (await simpanRiset(b, prodiA)).json.data;
  assert.notEqual(butirB.id, butirA.id);
  await panggil('PUT', `/butir-pribadi/${butirB.id}/selesai`, b);
  await panggil('DELETE', `/butir-pribadi/${butirB.id}`, b);
  assert.deepEqual(await butirDari(a), dataA, 'aksi B atas butirnya sendiri mengubah butir A');
  assert.deepEqual(await butirDari(b), []);

  // A juga tidak bisa menyentuh butir B.
  const butirB2 = (await simpanMapel(b, prodiB)).json.data;
  assert.equal((await panggil('DELETE', `/butir-pribadi/${butirB2.id}`, a)).status, 404);
  assert.deepEqual((await butirDari(b)).map((x) => x.id), [butirB2.id]);
  assert.equal((await butirDari(a)).some((x) => x.id === butirB2.id), false, 'butir B bocor ke GET A');
});

test('LINTAS AKUN: butir pribadi tidak masuk /konten/checklist (butir umum), dengan atau tanpa token', async () => {
  const a = await akunBaru();
  const { json } = await simpanRiset(a, prodiA);
  for (const token of [null, a, await akunBaru()]) {
    const res = await panggil('GET', '/konten/checklist', token);
    assert.equal(res.status, 200);
    const ids = res.json.data.kategori.flatMap((k) => k.butir.map((x) => x.id));
    assert.equal(ids.includes(json.data.id), false);
    assert.equal(res.json.data.kategori.some((k) => k.id === 'riset-kampus'), false);
  }
});
