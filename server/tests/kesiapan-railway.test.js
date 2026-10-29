// LANJUT_085 — kesiapan Railway (tanpa deploy). PORT, CORS, dan proxy dibaca dari lingkungan;
// batas laju auth memakai IP klien dari proxy tepercaya, bukan IP proxy; railway.json dan
// .env.railway.contoh. Uji integrasi (MySQL nyata untuk /health), 0 koneksi ke luar.
// env dibaca saat modul dimuat, jadi variabel diset SEBELUM require (berkas ini proses sendiri).
const ASAL_UJI = ['https://landing-085.contoh.test', 'https://web-085.contoh.test'];
process.env.CORS_ORIGINS = ASAL_UJI.join(',');
process.env.TRUST_PROXY = '1';
process.env.HEADER_IP_KLIEN = 'X-Real-IP';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn, spawnSync } = require('node:child_process');

const { nyalakanServer, urlDari, pool } = require('./bantuan');
const app = require('../src/app');
const { batasAuth } = require('../src/middleware/batasLaju');

const AKAR = path.join(__dirname, '..');
const BERKAS_ENV = path.join(AKAR, 'src', 'config', 'env.js');

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

/** Muat env.js di proses anak, di folder kosong tanpa .env, hanya dengan variabel ini. */
function envAnak(tambahan) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjut-085-'));
  try {
    const dasar = {
      PATH: process.env.PATH,
      SystemRoot: process.env.SystemRoot,
      DB_HOST: 'localhost',
      DB_USER: 'uji',
      DB_NAME: 'uji',
      CORS_ORIGINS: 'http://localhost:8081',
    };
    const kode = `const e = require(${JSON.stringify(BERKAS_ENV)}); console.log(JSON.stringify({ PORT: e.PORT, TRUST_PROXY: e.TRUST_PROXY, HEADER_IP_KLIEN: e.HEADER_IP_KLIEN, CORS_ORIGINS: e.CORS_ORIGINS }));`;
    const r = spawnSync(process.execPath, ['-e', kode], { cwd: folder, env: { ...dasar, ...tambahan }, encoding: 'utf8' });
    return { ok: r.status === 0, nilai: r.status === 0 ? JSON.parse(r.stdout) : null, galat: r.stderr };
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
}

function portBebas() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });
}

const masuk = (headers) =>
  fetch(`${baseUrl}/api/v1/auth/masuk`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: '{}' });

test('PORT dibaca dari process.env.PORT (bawaan 3000), dan src/index.js benar-benar mendengarkan di port itu', async () => {
  assert.equal(envAnak({ PORT: '5123' }).nilai.PORT, 5123);
  assert.equal(envAnak({}).nilai.PORT, 3000, 'bawaan lokal bila PORT kosong');

  const port = await portBebas();
  const anak = spawn(process.execPath, ['src/index.js'], { cwd: AKAR, env: { ...process.env, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
  try {
    await new Promise((resolve, reject) => {
      const batas = setTimeout(() => reject(new Error('server tidak menyala di PORT dalam 15 detik')), 15000);
      anak.stdout.on('data', (d) => {
        if (String(d).includes(`berjalan di port ${port} `)) {
          clearTimeout(batas);
          resolve();
        }
      });
      anak.on('exit', (kodeKeluar) => {
        clearTimeout(batas);
        reject(new Error(`server keluar (${kodeKeluar})`));
      });
    });
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { ok: true });
  } finally {
    anak.kill();
  }
});

test('CORS: daftar asal dibaca dari CORS_ORIGINS; asal lain tidak mendapat izin; tidak ada asal tertulis mati', async () => {
  for (const asal of ASAL_UJI) {
    const res = await fetch(`${baseUrl}/health`, { headers: { Origin: asal } });
    assert.equal(res.headers.get('access-control-allow-origin'), asal, asal);
  }
  for (const asal of ['https://bukan-085.contoh.test', 'http://localhost:8081']) {
    const res = await fetch(`${baseUrl}/health`, { headers: { Origin: asal } });
    assert.equal(res.headers.get('access-control-allow-origin'), null, `${asal} tidak boleh diizinkan`);
  }
  // Permintaan tanpa Origin (APK Android) tetap dilayani.
  assert.equal((await fetch(`${baseUrl}/health`)).status, 200);
  assert.deepEqual(envAnak({ CORS_ORIGINS: 'https://a.contoh.test, https://b.contoh.test' }).nilai.CORS_ORIGINS, ['https://a.contoh.test', 'https://b.contoh.test']);
  const sumber = fs.readFileSync(path.join(AKAR, 'src', 'app.js'), 'utf8');
  assert.match(sumber, /cors\(\{\s*origin:\s*env\.CORS_ORIGINS,/);
});

test('trust proxy aktif dari TRUST_PROXY: req.ip = IP klien dari X-Forwarded-For (satu proxy tepercaya)', async () => {
  assert.equal(app.get('trust proxy'), 1);
  assert.equal(envAnak({ TRUST_PROXY: '2' }).nilai.TRUST_PROXY, 2);
  const res = await masuk({ 'X-Forwarded-For': '203.0.113.85' });
  assert.equal(res.status, 400, 'badan kosong ditolak validasi, sesudah melewati batas laju');
  assert.equal((await batasAuth.getKey('203.0.113.85'))?.totalHits, 1, 'kuota dihitung untuk IP klien, bukan IP proxy');
});

test('batas auth: IP klien dari header proxy tepercaya (X-Real-IP), bukan IP proxy; tiap klien punya kuota sendiri', async () => {
  await masuk({ 'X-Real-IP': '198.51.100.85', 'X-Forwarded-For': '203.0.113.99' });
  await masuk({ 'X-Real-IP': '198.51.100.85' });
  await masuk({ 'X-Real-IP': '198.51.100.86' });
  assert.equal((await batasAuth.getKey('198.51.100.85'))?.totalHits, 2);
  assert.equal((await batasAuth.getKey('198.51.100.86'))?.totalHits, 1);
  assert.equal(await batasAuth.getKey('203.0.113.99'), undefined, 'X-Real-IP didahulukan');
  for (const ipProxy of ['127.0.0.1', '::1', '::ffff:127.0.0.1']) {
    assert.equal(await batasAuth.getKey(ipProxy), undefined, `kuota tidak jatuh ke IP proxy ${ipProxy}`);
  }
});

test('produksi: TRUST_PROXY wajib diisi dan bukan true; HEADER_IP_KLIEN harus nama header', () => {
  const prod = { NODE_ENV: 'production', CORS_ORIGINS: 'https://landing.contoh.test' };
  const tanpa = envAnak(prod);
  assert.equal(tanpa.ok, false);
  assert.match(tanpa.galat, /TRUST_PROXY/);
  assert.equal(envAnak({ ...prod, TRUST_PROXY: '1' }).nilai.TRUST_PROXY, 1);
  assert.equal(envAnak({ ...prod, TRUST_PROXY: '0' }).nilai.TRUST_PROXY, 0, '0 boleh bila sengaja tanpa proxy');
  assert.match(envAnak({ ...prod, TRUST_PROXY: 'true' }).galat, /TRUST_PROXY/);
  assert.equal(envAnak({ HEADER_IP_KLIEN: 'X-Real-IP' }).nilai.HEADER_IP_KLIEN, 'x-real-ip');
  assert.equal(envAnak({}).nilai.HEADER_IP_KLIEN, null);
  assert.match(envAnak({ HEADER_IP_KLIEN: 'x real ip!' }).galat, /HEADER_IP_KLIEN/);
});

test('railway.json: start "npm start", migrasi lewat preDeployCommand, health check /health yang benar-benar ada', async () => {
  const konfig = JSON.parse(fs.readFileSync(path.join(AKAR, 'railway.json'), 'utf8'));
  const paket = JSON.parse(fs.readFileSync(path.join(AKAR, 'package.json'), 'utf8'));
  assert.equal(konfig.$schema, 'https://railway.com/railway.schema.json');
  assert.equal(konfig.build.builder, 'RAILPACK', 'Dockerfile lama (port 4000 tertulis mati) tidak dipakai Railway');
  assert.equal(konfig.deploy.startCommand, 'npm start');
  assert.equal(paket.scripts.start, 'node src/index.js');
  assert.deepEqual(konfig.deploy.preDeployCommand, ['npm run migrasi']);
  assert.ok(paket.scripts.migrasi);
  assert.equal(konfig.deploy.healthcheckPath, '/health');
  const res = await fetch(`${baseUrl}${konfig.deploy.healthcheckPath}`);
  assert.equal(res.status, 200);
});

test('.env.railway.contoh: hanya nama variabel dan komentar, tanpa nilai; mencakup semua variabel yang dibaca server', () => {
  const contoh = fs.readFileSync(path.join(AKAR, '.env.railway.contoh'), 'utf8');
  const nama = [];
  for (const baris of contoh.split(/\r?\n/)) {
    if (baris.trim() === '' || baris.startsWith('#')) continue;
    const m = /^([A-Z][A-Z0-9_]*)=$/.exec(baris);
    assert.ok(m, `baris bukan "NAMA=" kosong: ${baris.slice(0, 20)}`);
    nama.push(m[1]);
  }
  const WAJIB = ['NODE_ENV', 'PORT', 'DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'CORS_ORIGINS', 'TRUST_PROXY', 'HEADER_IP_KLIEN', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_USER', 'SMTP_PASSWORD', 'SMTP_FROM', 'GOOGLE_CLIENT_ID', 'OPENROUTER_API_KEY'];
  for (const n of WAJIB) assert.ok(nama.includes(n), `${n} tidak ada di .env.railway.contoh`);
  // Semua variabel yang dibaca config/env.js ada, kecuali alias lama dan yang khusus lokal/uji.
  const KHUSUS_LOKAL = ['ASAL_DIIZINKAN', 'JUMLAH_PROXY', 'LOKASI_DATA_KONTEN', 'OPENROUTER_BASE_URL'];
  const sumber = fs.readFileSync(BERKAS_ENV, 'utf8');
  const dibaca = new Set([...sumber.matchAll(/(?:wajib|opsional|angka)\('([A-Z0-9_]+)'/g), ...sumber.matchAll(/process\.env\.([A-Z0-9_]+)/g)].map((m) => m[1]));
  for (const n of dibaca) if (!KHUSUS_LOKAL.includes(n)) assert.ok(nama.includes(n), `${n} dibaca server tetapi tidak ada di contoh`);
  assert.equal(new Set(nama).size, nama.length, 'nama ganda');
  // Ikut di-commit: dikecualikan dari pola .env.* di .gitignore.
  assert.match(fs.readFileSync(path.join(AKAR, '.gitignore'), 'utf8'), /^!\.env\.railway\.contoh$/m);
});
