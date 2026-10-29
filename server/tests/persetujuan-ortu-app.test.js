// Uji konfirmasi orang tua/wali di app (15 Okt 2026, migrasi 024): POST /persetujuan/ortu-wali.
// Pilihan percakapan, belum disetujui PM. Yang dijaga:
// - sumber & catatan ditentukan server (klien tidak bisa memilih);
// - butuh kebijakan versi berlaku sudah diterima (urutan sama dengan jalur surat);
// - pernyataan eksplisit `true` + versi berlaku; idempotent; antarakun terpisah;
// - setelah itu bolehPakaiAi benar dan GET /persetujuan/saya menyatakan boleh_pakai_ai;
// - POST /persetujuan jenis ortu_wali tetap 403 (jalur lama tidak dilonggarkan).

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const { bolehPakaiAi } = require('../src/modul/persetujuan/persetujuan.layanan');

let server;
let baseUrl;
let versi;

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const [[baris]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'persetujuan_versi_kebijakan'");
  versi = Number(baris.nilai);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

async function panggil(metode, p, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${p}`, {
    method: metode,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

async function akun(denganKebijakan) {
  const { status, json } = await daftarPenggunaBaru(baseUrl, denganKebijakan ? { versi_kebijakan: versi } : {});
  assert.equal(status, 201, JSON.stringify(json));
  return { id: json.data.pengguna.id, token: json.data.token };
}

const ortuDb = async (id) =>
  (await pool.query("SELECT versi, status, sumber, catatan FROM persetujuan WHERE pengguna_id = ? AND jenis = 'ortu_wali' ORDER BY id", [id]))[0];

test('migrasi 024: ENUM sumber memuat konfirmasi_di_app, nilai lama tetap', async () => {
  const [[kolom]] = await pool.query(
    "SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'persetujuan' AND COLUMN_NAME = 'sumber'"
  );
  assert.equal(kolom.t, "enum('mandiri','surat_sekolah','admin','konfirmasi_di_app')", 'jalankan npm run migrasi (024)');
});

test('tanpa login → 401', async () => {
  const { status } = await panggil('POST', '/persetujuan/ortu-wali', null, { versi, pernyataan: true });
  assert.equal(status, 401);
});

test('kebijakan belum diterima → 403 AI_BELUM_DIIZINKAN, tidak ada catatan', async () => {
  const a = await akun(false);
  const { status, json } = await panggil('POST', '/persetujuan/ortu-wali', a.token, { versi, pernyataan: true });
  assert.equal(status, 403);
  assert.equal(json.galat.kode, 'AI_BELUM_DIIZINKAN');
  assert.deepEqual(await ortuDb(a.id), []);
  assert.equal(await bolehPakaiAi(a.id), false);
});

test('pernyataan wajib true dan versi harus versi berlaku', async () => {
  const a = await akun(true);
  for (const body of [{ versi }, { versi, pernyataan: false }, { versi, pernyataan: 'true' }, { pernyataan: true }]) {
    const { status } = await panggil('POST', '/persetujuan/ortu-wali', a.token, body);
    assert.equal(status, 400, JSON.stringify(body));
  }
  const usang = await panggil('POST', '/persetujuan/ortu-wali', a.token, { versi: versi + 1, pernyataan: true });
  assert.equal(usang.status, 409);
  assert.equal(usang.json.galat.kode, 'KEBIJAKAN_USANG');
  assert.deepEqual(await ortuDb(a.id), []);
});

test('berhasil: sumber & catatan dari server, langsung boleh pakai AI, idempotent', async () => {
  const a = await akun(true);
  assert.equal(await bolehPakaiAi(a.id), false);

  // Klien mencoba memilih sumber/status/catatan sendiri: medan lain dibuang.
  const pertama = await panggil('POST', '/persetujuan/ortu-wali', a.token, {
    versi,
    pernyataan: true,
    sumber: 'surat_sekolah',
    status: 'cabut',
    catatan: 'dipalsukan',
  });
  assert.equal(pertama.status, 201, JSON.stringify(pertama.json));
  assert.equal(pertama.json.data.ortu_wali.sumber, 'konfirmasi_di_app');
  assert.equal(pertama.json.data.ortu_wali.status, 'setuju');
  assert.equal(pertama.json.data.ortu_wali_aktif, true);
  assert.equal(pertama.json.data.boleh_pakai_ai, true);
  assert.ok(!('catatan' in pertama.json.data.ortu_wali));

  const baris = await ortuDb(a.id);
  assert.equal(baris.length, 1);
  assert.equal(baris[0].sumber, 'konfirmasi_di_app');
  assert.equal(baris[0].status, 'setuju');
  assert.match(baris[0].catatan, /identitas tidak diverifikasi/);
  assert.equal(await bolehPakaiAi(a.id), true);

  const ulang = await panggil('POST', '/persetujuan/ortu-wali', a.token, { versi, pernyataan: true });
  assert.equal(ulang.status, 200);
  assert.equal((await ortuDb(a.id)).length, 1, 'tidak menambah baris');
});

test('antarakun: persetujuan satu akun tidak membuka AI akun lain', async () => {
  const a = await akun(true);
  const b = await akun(true);
  assert.equal((await panggil('POST', '/persetujuan/ortu-wali', a.token, { versi, pernyataan: true })).status, 201);
  assert.equal(await bolehPakaiAi(a.id), true);
  assert.equal(await bolehPakaiAi(b.id), false);
  assert.deepEqual(await ortuDb(b.id), []);
});

test('jalur lama tidak dilonggarkan: POST /persetujuan jenis ortu_wali tetap 403', async () => {
  const a = await akun(true);
  const { status, json } = await panggil('POST', '/persetujuan', a.token, { jenis: 'ortu_wali', versi });
  assert.equal(status, 403);
  assert.equal(json.galat.kode, 'TIDAK_BERHAK');
  assert.deepEqual(await ortuDb(a.id), []);
});
