// LANJUT_010 seri v2: saklar PORTOFOLIO_AKTIF mati, dan pemeriksaan saat server menyala.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const DIREKTORI = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjut-foto-mati-'));
process.env.PORTOFOLIO_AKTIF = '0';
process.env.DIREKTORI_BERKAS = DIREKTORI;

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const { sidikAkun, SUBFOLDER } = require('../src/modul/butir-bukti/penyimpanan-foto');

const AKAR_SERVER = path.join(__dirname, '..');
const ID = '11111111-1111-4111-8111-111111111111';
const SANDI = 'sandiujiaman1';
let server;
let baseUrl;

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
});

after(async () => {
  await new Promise((r) => server.close(r));
  await pool.end();
  fs.rmSync(DIREKTORI, { recursive: true, force: true });
});

async function jawaban(metode, jalur, token) {
  const res = await fetch(`${baseUrl}/api/v1${jalur}`, { method: metode, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return `${res.status} ${await res.text()}`;
}

test('Saklar mati: semua rute portofolio menjawab sama persis dengan jalur yang tidak ada', async () => {
  const { json } = await daftarPenggunaBaru(baseUrl);
  const token = json.data.token;
  for (const t of [undefined, token]) {
    const pembanding = await jawaban('GET', '/jalur-yang-tidak-pernah-ada', t);
    assert.match(pembanding, /^404 /);
    for (const [m, j] of [
      ['GET', '/butir-bukti'],
      ['POST', '/butir-bukti'],
      ['GET', `/butir-bukti/${ID}`],
      ['PATCH', `/butir-bukti/${ID}`],
      ['DELETE', `/butir-bukti/${ID}`],
      ['POST', `/butir-bukti/${ID}/foto`],
      ['GET', `/butir-bukti/${ID}/foto/${ID}`],
      ['DELETE', `/butir-bukti/${ID}/foto/${ID}`],
    ]) {
      assert.equal(await jawaban(m, j, t), pembanding, `${m} ${j}`);
    }
  }
});

test('Saklar mati: hapus akun tetap menghapus foto yang sudah tersimpan', async () => {
  const { json } = await daftarPenggunaBaru(baseUrl);
  const { token, pengguna } = json.data;
  const folder = path.join(DIREKTORI, SUBFOLDER, sidikAkun(pengguna.id));
  fs.mkdirSync(folder, { recursive: true });
  fs.writeFileSync(path.join(folder, '22222222-2222-4222-8222-222222222222.jpg'), 'x');

  const res = await fetch(`${baseUrl}/api/v1/pengguna/saya`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ penegasan: 'HAPUS AKUN SAYA', kata_sandi: SANDI }),
  });
  assert.equal(res.status, 200);
  assert.equal(fs.existsSync(folder), false);
});

function nyalakan(env) {
  return spawnSync(process.execPath, ['src/index.js'], {
    cwd: AKAR_SERVER,
    env: { ...process.env, PORT: '0', ...env },
    encoding: 'utf8',
    timeout: 30000,
  });
}

test('Saklar menyala tanpa folder yang sah: server menolak berjalan dengan pesan jelas', () => {
  const berkasBiasa = path.join(DIREKTORI, 'berkas-biasa');
  fs.writeFileSync(berkasBiasa, 'x');
  const kasus = [
    ['', /DIREKTORI_BERKAS kosong/],
    ['folder/relatif', /jalur lengkap/],
    [path.join(berkasBiasa, 'anak'), /tidak bisa ditulis/],
    [path.join(AKAR_SERVER, '..', 'dist', 'foto'), /statis/],
    [path.join(AKAR_SERVER, '..', 'public'), /statis/],
  ];
  for (const [folder, pola] of kasus) {
    const hasil = nyalakan({ PORTOFOLIO_AKTIF: '1', DIREKTORI_BERKAS: folder });
    assert.equal(hasil.status, 1, `${folder}: ${hasil.stderr}`);
    assert.match(hasil.stderr, pola);
  }
});
