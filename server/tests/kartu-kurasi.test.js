// Uji saringan kartu kurasi di server (LANJUT_040). GET /kartu harus aman
// TANPA parameter apa pun: kartu kurasi (sumber 'resmi') hanya tampil bila
// status_verifikasi = 'terverifikasi' DAN diperiksa_pada terisi — syarat
// yang sama dengan konten lain (F10). Kartu milik sendiri selalu tampil;
// `?sumber=` hanya menyaring lebih lanjut.
//
// Fixture: dua kartu resmi disisipkan langsung ke DB uji (satu terverifikasi
// penuh, satu bertanda terverifikasi tetapi tanpa diperiksa_pada) lalu
// dihapus lagi. 12 kartu kurasi dari benih (belum diverifikasi) jadi
// pembanding yang tidak boleh pernah muncul.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { acak, nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');

let server;
let baseUrl;
const FIX_SAH = `uji-kurasi-sah-${acak()}`;
const FIX_SETENGAH = `uji-kurasi-setengah-${acak()}`;
let belumTerverifikasi; // id kartu resmi dari benih yang belum diverifikasi

async function sisipResmi(id, status, diperiksaPada) {
  await pool.execute(
    `INSERT INTO kartu
       (id, pemilik_id, mapel_id, judul, isi, jawaban, sumber, penyedia, pemilik,
        status_verifikasi, asal, url_sumber, diperiksa_pada, dibuat_pada, diubah_pada)
     VALUES (?, NULL, 'matematika', ?, 'Isi kurasi uji', NULL, 'resmi', NULL, 'tim', ?, 'uji', NULL, ?, NOW(), NOW())`,
    [id, `Kurasi ${id}`, status, diperiksaPada]
  );
}

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  await sisipResmi(FIX_SAH, 'terverifikasi', '2026-10-01');
  await sisipResmi(FIX_SETENGAH, 'terverifikasi', null);
  const [baris] = await pool.execute(
    `SELECT id FROM kartu
      WHERE sumber = 'resmi' AND dihapus_pada IS NULL
        AND (status_verifikasi <> 'terverifikasi' OR diperiksa_pada IS NULL)`
  );
  belumTerverifikasi = new Set(baris.map((b) => b.id));
  assert.ok(belumTerverifikasi.size >= 12, 'butuh 12 kartu kurasi belum diverifikasi dari benih (npm run benih)');
});

after(async () => {
  await pool.execute('DELETE FROM kartu WHERE id IN (?, ?)', [FIX_SAH, FIX_SETENGAH]);
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

async function panggil(path, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

async function akunDenganKartu() {
  const { json } = await daftarPenggunaBaru(baseUrl);
  const token = json.data.token;
  const kartu = await panggil('/kartu', token, { mapel_id: 'matematika', judul: 'Milik sendiri', isi: 'Draf' });
  assert.equal(kartu.status, 201);
  return { token, idSendiri: kartu.json.data.id };
}

const ids = async (path, token) => {
  const { status, json } = await panggil(path, token);
  assert.equal(status, 200);
  return json.data.map((k) => k.id);
};

test('GET /kartu TANPA parameter: tidak ada satu pun kartu kurasi yang belum terverifikasi', async () => {
  const { token, idSendiri } = await akunDenganKartu();
  const hasil = await ids('/kartu', token);
  const bocor = hasil.filter((id) => belumTerverifikasi.has(id));
  assert.deepEqual(bocor, [], 'kartu kurasi belum terverifikasi bocor');
  assert.equal(hasil.includes(FIX_SETENGAH), false, 'terverifikasi tanpa diperiksa_pada tidak boleh tampil');
  assert.ok(hasil.includes(idSendiri), 'kartu milik sendiri harus tetap tampil');
  assert.ok(hasil.includes(FIX_SAH), 'kartu kurasi terverifikasi penuh tampil');
});

test('kartu kurasi terverifikasi terlihat oleh semua akun; yang belum, oleh tidak satu pun', async () => {
  for (let i = 0; i < 2; i++) {
    const { token } = await akunDenganKartu();
    const hasil = await ids('/kartu', token);
    assert.ok(hasil.includes(FIX_SAH));
    assert.equal(hasil.some((id) => belumTerverifikasi.has(id) || id === FIX_SETENGAH), false);
  }
});

test('GET /kartu?sumber=pengguna tetap: hanya kartu milik sendiri', async () => {
  const { token, idSendiri } = await akunDenganKartu();
  assert.deepEqual(await ids('/kartu?sumber=pengguna', token), [idSendiri]);
});

test('GET /kartu?sumber=resmi: hanya kurasi terverifikasi penuh', async () => {
  const { token } = await akunDenganKartu();
  const hasil = await ids('/kartu?sumber=resmi', token);
  assert.ok(hasil.includes(FIX_SAH));
  assert.equal(hasil.some((id) => belumTerverifikasi.has(id) || id === FIX_SETENGAH), false);
});

test('saringan mapel tetap aman: ?mapel=matematika tanpa kurasi belum terverifikasi', async () => {
  const { token, idSendiri } = await akunDenganKartu();
  const hasil = await ids('/kartu?mapel=matematika', token);
  assert.ok(hasil.includes(idSendiri));
  assert.ok(hasil.includes(FIX_SAH));
  assert.equal(hasil.some((id) => belumTerverifikasi.has(id) || id === FIX_SETENGAH), false);
});

test('bentuk respons tidak berubah (kontrak yang dipakai app)', async () => {
  const { token } = await akunDenganKartu();
  const { json } = await panggil('/kartu', token);
  for (const k of json.data) {
    assert.deepEqual(Object.keys(k).sort(), [
      'dibuat_pada', 'diubah_pada', 'id', 'isi', 'jawaban', 'judul', 'mapel_id', 'pemilik_id', 'penyedia', 'sumber',
    ]);
  }
});
