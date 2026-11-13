// LANJUT_023 seri v2: saklar JALUR_TUJUAN_AKTIF mati, dan bawaannya mati.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

process.env.JALUR_TUJUAN_AKTIF = '0';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');

const ENV_JS = path.join(__dirname, '..', 'src', 'config', 'env.js');
const ID = '11111111-1111-4111-8111-111111111111';
let server;
let baseUrl;

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
});

after(async () => {
  await new Promise((r) => server.close(r));
  await pool.end();
});

async function jawaban(metode, jalur, token) {
  const res = await fetch(`${baseUrl}/api/v1${jalur}`, { method: metode, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  return `${res.status} ${await res.text()}`;
}

test('Saklar mati: semua rute Jalur & Tujuan menjawab sama persis dengan jalur yang tidak ada', async () => {
  const { json } = await daftarPenggunaBaru(baseUrl);
  for (const t of [undefined, json.data.token]) {
    const pembanding = await jawaban('GET', '/jalur-yang-tidak-pernah-ada', t);
    assert.match(pembanding, /^404 /);
    for (const [m, j] of [
      ['GET', '/jalur-minat'],
      ['GET', '/jalur-minat/saya'],
      ['POST', '/jalur-minat/saya'],
      ['PATCH', `/jalur-minat/saya/${ID}`],
      ['GET', '/tujuan'],
      ['POST', '/tujuan'],
      ['GET', '/tujuan/perjalanan'],
      ['GET', `/tujuan/${ID}/riwayat`],
      ['POST', `/tujuan/${ID}/versi`],
      ['PATCH', `/tujuan/${ID}/status`],
      ['PATCH', `/tujuan/bukti/${ID}`],
    ]) {
      assert.equal(await jawaban(m, j, t), pembanding, `${m} ${j}`);
    }
  }
});

test('Bawaan mati: tanpa JALUR_TUJUAN_AKTIF, nilainya false; hanya "1" yang menyalakan', () => {
  // Folder kosong supaya tidak ada server/.env yang ikut terbaca.
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjut-saklar-jt-'));
  try {
    const dasar = {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      NODE_ENV: 'development',
      DB_HOST: '127.0.0.1',
      DB_USER: 'uji',
      DB_NAME: 'lanjut_test_saklar',
      CORS_ORIGINS: 'http://localhost:8081',
    };
    const baca = (tambahan) => {
      const r = spawnSync(process.execPath, ['-e', `console.log(require(${JSON.stringify(ENV_JS)}).JALUR_TUJUAN_AKTIF)`], {
        cwd: folder,
        env: { ...dasar, ...tambahan },
        encoding: 'utf8',
        timeout: 60000,
      });
      assert.equal(r.status, 0, r.stderr);
      return r.stdout.trim();
    };
    assert.equal(baca({}), 'false');
    for (const nilai of ['0', 'true', 'ya', '']) assert.equal(baca({ JALUR_TUJUAN_AKTIF: nilai }), 'false', nilai);
    assert.equal(baca({ JALUR_TUJUAN_AKTIF: '1' }), 'true');
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('Contoh .env tidak menyalakan Jalur & Tujuan', () => {
  for (const berkas of ['.env.example', '.env.production.example', '.env.railway.contoh']) {
    const isi = fs.readFileSync(path.join(__dirname, '..', berkas), 'utf8');
    assert.ok(!/^\s*JALUR_TUJUAN_AKTIF\s*=\s*1/m.test(isi), berkas);
  }
});
