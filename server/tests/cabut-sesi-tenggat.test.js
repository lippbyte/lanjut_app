// LANJUT_086 — tools/cabut-sesi-tenggat.js: cabut sesi akun yang tenggat verifikasinya sudah
// lewat dan emailnya belum terverifikasi. Uji integrasi, MySQL nyata (DB tes terpisah).
//
// Supaya tidak menyentuh akun berkas tes lain yang berjalan paralel (tenggat-verifikasi membuat
// akun bertenggat lewat), "sekarang" tes ditetapkan 1 Jan 2001: hanya akun tes ini yang
// tenggatnya ≤ 2001. Angka dibandingkan sebagai selisih terhadap simulasi awal.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const { nyalakanServer, urlDari, pool, acak, kirimJson } = require('./bantuan');
const { cabutSesiTenggat, bacaArgumen } = require('../tools/cabut-sesi-tenggat');

const SEKARANG = new Date('2001-01-01T00:00:00Z');
const SANDI = 'sandiuji086aman';
const AKAR = path.join(__dirname, '..');

let server;
let baseUrl;
const akun = {};
let awal;

const kirim = (jalur, body) => kirimJson(baseUrl, jalur, body);

/** Akun dengan dua sesi aktif (daftar + masuk), lalu tenggat & status email diatur langsung. */
async function buatAkun(batas, terverifikasi) {
  const nama = `uji086_${acak()}`;
  const daftar = await kirim('/auth/daftar', { nama_pengguna: nama, kata_sandi: SANDI });
  assert.equal(daftar.status, 201);
  const masuk = await kirim('/auth/masuk', { nama_pengguna: nama, kata_sandi: SANDI });
  assert.equal(masuk.status, 200);
  const id = daftar.json.data.pengguna.id;
  await pool.execute('UPDATE pengguna SET email = ?, email_terverifikasi = ?, batas_verifikasi = ? WHERE id = ?', [
    `${nama}@contoh.test`,
    terverifikasi ? 1 : 0,
    batas,
    id,
  ]);
  return { id, token: masuk.json.data.token };
}

const sesiAktif = async ({ id }) =>
  Number((await pool.execute('SELECT COUNT(*) AS n FROM sesi_pengguna WHERE pengguna_id = ? AND dicabut_pada IS NULL', [id]))[0][0].n);

const saya = async ({ token }) =>
  (await fetch(`${baseUrl}/api/v1/auth/saya`, { headers: { Authorization: `Bearer ${token}` } })).status;

async function barisAkun({ id }) {
  const [[b]] = await pool.execute(
    'SELECT nama_pengguna, email, email_terverifikasi, batas_verifikasi, kata_sandi_hash, wajib_buat_sandi, status FROM pengguna WHERE id = ?',
    [id]
  );
  return b;
}

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  awal = await cabutSesiTenggat({ sekarang: SEKARANG });
  akun.lewat = await buatAkun('2000-12-31 00:00:00', false);
  akun.dalamTenggat = await buatAkun('2001-01-02 00:00:00', false);
  akun.terverifikasi = await buatAkun('2000-12-31 00:00:00', true);
  akun.tanpaTenggat = await buatAkun(null, false);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('mode simulasi (bawaan) menghitung tetapi tidak mencabut apa pun', async () => {
  const sebelum = await baris4();
  const h = await cabutSesiTenggat({ sekarang: SEKARANG });
  assert.equal(h.mode, 'simulasi');
  assert.equal(h.akun - awal.akun, 1, 'hanya akun lewat tenggat yang dihitung');
  assert.equal(h.sesi - awal.sesi, 2, 'dua sesi akun itu');
  for (const a of Object.values(akun)) assert.equal(await sesiAktif(a), 2, 'simulasi tidak mencabut');
  assert.deepEqual(await baris4(), sebelum);

  // Baris perintah tanpa argumen = simulasi (waktu sungguhan): sesi tetap aktif, tanpa ID akun.
  const r = spawnSync(process.execPath, ['tools/cabut-sesi-tenggat.js'], { cwd: AKAR, env: process.env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /mode: simulasi/);
  assert.match(r.stdout, /sesi yang akan dicabut: \d+/);
  assert.doesNotMatch(r.stdout, /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, 'tidak mencetak ID akun');
  for (const a of Object.values(akun)) assert.equal(await sesiAktif(a), 2, 'baris perintah bawaan tidak mencabut');
  assert.deepEqual(bacaArgumen([]), { jalankan: false });
  assert.deepEqual(bacaArgumen(['--simulasi']), { jalankan: false });
  assert.deepEqual(bacaArgumen(['--jalankan']), { jalankan: true });
  assert.throws(() => bacaArgumen(['--simulasi', '--jalankan']), /salah satu/);
  assert.throws(() => bacaArgumen(['--hapus']), /tidak dikenal/);
});

test('--jalankan: akun yang tenggatnya lewat dan email belum terverifikasi dicabut semua sesinya; kolom akun tidak berubah', async () => {
  const sebelum = await barisAkun(akun.lewat);
  const h = await cabutSesiTenggat({ jalankan: true, sekarang: SEKARANG });
  assert.equal(h.mode, 'jalankan');
  assert.ok(h.akun - awal.akun >= 1);
  assert.equal(await sesiAktif(akun.lewat), 0, 'sesi akun lewat tenggat dicabut');
  assert.equal(await saya(akun.lewat), 401, 'token lama akun itu tidak berlaku lagi');
  assert.deepEqual(await barisAkun(akun.lewat), sebelum, 'akun tidak dihapus dan kolomnya tidak diubah');
});

test('akun yang masih dalam tenggat tidak terpengaruh', async () => {
  assert.equal(await sesiAktif(akun.dalamTenggat), 2);
  assert.equal(await saya(akun.dalamTenggat), 200);
});

test('akun yang emailnya sudah terverifikasi (walau tenggat lewat) dan akun tanpa tenggat tidak terpengaruh', async () => {
  for (const a of [akun.terverifikasi, akun.tanpaTenggat]) {
    assert.equal(await sesiAktif(a), 2);
    assert.equal(await saya(a), 200);
  }
});

async function baris4() {
  return Promise.all(Object.values(akun).map(barisAkun));
}
