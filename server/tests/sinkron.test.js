// Uji `POST /sinkron/klaim` — docs/SDD-Backend-Foundation.md §6.3, §9.4:
// idempoten (klaim yang diulang tidak menggandakan), dan baris yang sudah
// dimiliki pengguna lain ditolak (TIDAK_BERHAK per baris), tidak pernah
// memindahkan kepemilikan.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool, acak } = require('./bantuan');

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

async function klaim(token, body) {
  const res = await fetch(`${baseUrl}/api/v1/sinkron/klaim`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

test('klaim: kartu & kemajuan tamu diterima dan idempoten saat diulang', async () => {
  const { json: daftarJson } = await daftarPenggunaBaru(baseUrl);
  const token = daftarJson.data.token;

  const kartuId = `local-${acak()}`;
  const body = {
    profil: { kelas: '12', prodi_impian: 'teknik-informatika' },
    kemajuan: [{ butir_id: 'ktp', selesai_pada: new Date().toISOString() }],
    kartu: [
      {
        id: kartuId,
        mapel_id: 'matematika',
        judul: 'Kartu dari perangkat tamu',
        isi: 'Isi kartu tamu',
      },
    ],
  };

  const pertama = await klaim(token, body);
  assert.equal(pertama.status, 200);
  assert.equal(pertama.json.data.kartu.diterima, 1);
  assert.equal(pertama.json.data.kartu.ditolak.length, 0);

  // Ulangi persis — TIDAK boleh menggandakan.
  const kedua = await klaim(token, body);
  assert.equal(kedua.status, 200);
  assert.equal(kedua.json.data.kartu.diterima, 1);

  const [barisKartu] = await pool.execute('SELECT COUNT(*) AS n FROM kartu WHERE id = ?', [
    kartuId,
  ]);
  assert.equal(barisKartu[0].n, 1);

  const cekKartu = await fetch(`${baseUrl}/api/v1/kartu`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const cekJson = await cekKartu.json();
  assert.ok(cekJson.data.some((k) => k.id === kartuId));
});

test('klaim: kartu dengan id yang sudah dimiliki pengguna LAIN ditolak, kepemilikan tidak pindah', async () => {
  const pemilikAsli = await daftarPenggunaBaru(baseUrl);
  const penuntut = await daftarPenggunaBaru(baseUrl);
  const tokenAsli = pemilikAsli.json.data.token;
  const tokenPenuntut = penuntut.json.data.token;

  const kartuId = `rebutan-${acak()}`;
  const buatAwal = await klaim(tokenAsli, {
    kartu: [{ id: kartuId, mapel_id: 'matematika', judul: 'Punya asli', isi: 'isi asli' }],
  });
  assert.equal(buatAwal.json.data.kartu.diterima, 1);

  const rebutan = await klaim(tokenPenuntut, {
    kartu: [{ id: kartuId, mapel_id: 'matematika', judul: 'Coba rebut', isi: 'isi rebutan' }],
  });
  assert.equal(rebutan.json.data.kartu.diterima, 0);
  assert.equal(rebutan.json.data.kartu.ditolak.length, 1);
  assert.equal(rebutan.json.data.kartu.ditolak[0].alasan, 'TIDAK_BERHAK');

  const [baris] = await pool.execute('SELECT pemilik_id, judul FROM kartu WHERE id = ?', [
    kartuId,
  ]);
  assert.equal(baris[0].judul, 'Punya asli');
  assert.equal(baris[0].pemilik_id, pemilikAsli.json.data.pengguna.id);
});

test('klaim: profil (kelas/prodi) tersimpan ke akun', async () => {
  const { json: daftarJson } = await daftarPenggunaBaru(baseUrl);
  const token = daftarJson.data.token;

  await klaim(token, { profil: { kelas: '11', prodi_impian: 'farmasi' } });

  const saya = await fetch(`${baseUrl}/api/v1/auth/saya`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const sayaJson = await saya.json();
  assert.equal(sayaJson.data.kelas, '11');
  assert.equal(sayaJson.data.prodi_impian, 'farmasi');
});

test('klaim: prodi_impian tidak dikenal -> diabaikan diam-diam, bukan 500 (C-2b)', async () => {
  const { json: daftarJson } = await daftarPenggunaBaru(baseUrl);
  const token = daftarJson.data.token;

  const hasil = await klaim(token, { profil: { kelas: '11', prodi_impian: 'tidak-ada' } });
  assert.equal(hasil.status, 200);

  const saya = await fetch(`${baseUrl}/api/v1/auth/saya`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const sayaJson = await saya.json();
  // kelas tetap tersimpan; prodi yang tidak dikenal diabaikan (tetap null).
  assert.equal(sayaJson.data.kelas, '11');
  assert.equal(sayaJson.data.prodi_impian, null);
});

test('klaim tanpa login -> 401 TIDAK_MASUK', async () => {
  const res = await fetch(`${baseUrl}/api/v1/sinkron/klaim`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  assert.equal(res.status, 401);
});
