// LANJUT_027 seri v2: opsi DEV_DENGAN_JARINGAN_LOKAL untuk uji HP lewat Expo Go.
// Bawaannya mati (server dev hanya 127.0.0.1), ditolak di produksi, di host basis data yang bukan
// lokal, dan di basis data yang bukan lanjut_dev. Batas laju tidak berubah saat opsi menyala.
// Aplikasi tidak memakai alamat LAN bila EXPO_PUBLIC_API_URL tidak diset.
//
// Server anak dijalankan dengan DB_PORT=1: tidak ada basis data yang disentuh, dan bila pagar
// jebol, sambungan basis data gagal, bukan menulis ke mana pun.

const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { spawn, spawnSync } = require('node:child_process');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { alasanTolakJaringanLokal, alamatDengar, alamatLan } = require('../src/config/jaringan-lokal');

const AKAR_SERVER = path.join(__dirname, '..');
const AKAR_APP = path.join(AKAR_SERVER, '..');
const INDEX = path.join(AKAR_SERVER, 'src', 'index.js');
const DEV = { NODE_ENV: 'development', DB_HOST: '127.0.0.1', DB_NAME: 'lanjut_dev' };

/** Lingkungan bersih untuk server anak: tanpa .env (cwd folder sementara) dan tanpa konteks tes. */
function envAnak(tambahan) {
  return {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    DB_HOST: '127.0.0.1',
    DB_PORT: '1',
    DB_USER: 'uji',
    DB_PASSWORD: 'x',
    CORS_ORIGINS: 'http://localhost:8081',
    ...tambahan,
  };
}

const portBebas = () =>
  new Promise((resolve, reject) => {
    const s = net.createServer();
    s.once('error', reject);
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
  });

/** Menyalakan src/index.js dan menunggu baris siap. Mengembalikan { anak, log }. */
async function nyalakan(tambahan) {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjut-jaringan-'));
  const port = await portBebas();
  const anak = spawn(process.execPath, [INDEX], { cwd: folder, env: envAnak({ PORT: String(port), ...tambahan }), stdio: ['ignore', 'pipe', 'pipe'] });
  let log = '';
  anak.stdout.on('data', (d) => { log += d; });
  anak.stderr.on('data', (d) => { log += d; });
  await new Promise((resolve, reject) => {
    const batas = setTimeout(() => reject(new Error(`server tidak siap dalam 20 detik:\n${log}`)), 20000);
    const cek = setInterval(() => {
      if (/Hanya untuk komputer ini|TERBUKA DI JARINGAN LOKAL/.test(log)) {
        clearInterval(cek);
        clearTimeout(batas);
        resolve();
      }
    }, 50);
    anak.on('exit', (k) => {
      clearInterval(cek);
      clearTimeout(batas);
      reject(new Error(`server keluar (${k}):\n${log}`));
    });
  });
  const selesai = async () => {
    if (anak.exitCode === null) {
      const keluar = new Promise((r) => anak.once('exit', r));
      anak.kill();
      await keluar;
    }
    fs.rmSync(folder, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  };
  return { anak, port, log: () => log, selesai };
}

/** true bila port bisa disambung di alamat itu. */
const bisaSambung = (host, port) =>
  new Promise((resolve) => {
    const s = net.connect({ host, port, timeout: 2000 });
    s.once('connect', () => { s.destroy(); resolve(true); });
    s.once('error', () => resolve(false));
    s.once('timeout', () => { s.destroy(); resolve(false); });
  });

test('Pagar: ditolak di produksi, host basis data yang bukan lokal, dan basis data yang bukan lanjut_dev', () => {
  assert.equal(alasanTolakJaringanLokal(DEV), null);
  assert.equal(alasanTolakJaringanLokal({ ...DEV, DB_NAME: 'lanjut_dev_khalifa' }), null);
  assert.match(alasanTolakJaringanLokal({ ...DEV, NODE_ENV: 'production' }), /production/);
  for (const host of ['db', 'db.contoh.test', '10.0.0.5', '', undefined]) assert.match(alasanTolakJaringanLokal({ ...DEV, DB_HOST: host }), /bukan lokal/, String(host));
  for (const nama of ['lanjut_test', 'lanjut_db', 'lanjut_devel', 'lanjut', '', undefined]) assert.match(alasanTolakJaringanLokal({ ...DEV, DB_NAME: nama }), /bukan basis data dev/, String(nama));
});

test('Bawaan mati: di luar produksi hanya 127.0.0.1; produksi tetap semua antarmuka; opsi hanya membuka di dev', () => {
  assert.equal(alamatDengar({ ...DEV, DEV_DENGAN_JARINGAN_LOKAL: false }), '127.0.0.1');
  assert.equal(alamatDengar({ ...DEV, NODE_ENV: 'test', DB_NAME: 'lanjut_test', DEV_DENGAN_JARINGAN_LOKAL: false }), '127.0.0.1');
  assert.equal(alamatDengar({ ...DEV, NODE_ENV: 'production', DB_HOST: 'db', DB_NAME: 'lanjut_db', DEV_DENGAN_JARINGAN_LOKAL: false }), undefined, 'produksi tidak berubah');
  assert.equal(alamatDengar({ ...DEV, DEV_DENGAN_JARINGAN_LOKAL: true }), '0.0.0.0');
  assert.throws(() => alamatDengar({ ...DEV, NODE_ENV: 'production', DEV_DENGAN_JARINGAN_LOKAL: true }), /production/);
  assert.throws(() => alamatDengar({ ...DEV, DB_NAME: 'lanjut_test', DEV_DENGAN_JARINGAN_LOKAL: true }), /bukan basis data dev/);

  // Nilai bawaan di env.js, dan tidak ada berkas contoh atau konfigurasi rilis yang menyalakannya.
  const env = require('../src/config/env');
  assert.equal(env.DEV_DENGAN_JARINGAN_LOKAL, false);
  const berkas = [
    path.join(AKAR_SERVER, '.env.example'),
    path.join(AKAR_SERVER, '.env.production.example'),
    path.join(AKAR_SERVER, '.env.railway.contoh'),
    path.join(AKAR_SERVER, 'railway.json'),
    path.join(AKAR_SERVER, 'Dockerfile'),
    path.join(AKAR_APP, 'Dockerfile'),
    path.join(AKAR_APP, 'docker-compose.yml'),
    path.join(AKAR_APP, 'eas.json'),
  ];
  for (const b of berkas.filter((x) => fs.existsSync(x))) {
    assert.doesNotMatch(fs.readFileSync(b, 'utf8'), /DEV_DENGAN_JARINGAN_LOKAL\s*[:=]\s*["']?(1|true)/i, b);
  }
});

test('Baris perintah: server menolak menyala dengan opsi jaringan lokal di produksi dan di basis data yang bukan dev', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjut-jaringan-'));
  try {
    for (const [tambahan, pola] of [
      [{ NODE_ENV: 'production', DB_NAME: 'lanjut_dev', TRUST_PROXY: '1' }, /DIHENTIKAN\. DEV_DENGAN_JARINGAN_LOKAL tidak boleh dipakai di NODE_ENV=production/],
      [{ NODE_ENV: 'development', DB_NAME: 'lanjut_test_x' }, /DIHENTIKAN\. DEV_DENGAN_JARINGAN_LOKAL ditolak: basis data lanjut_test_x bukan basis data dev/],
    ]) {
      const r = spawnSync(process.execPath, [INDEX], { cwd: folder, env: envAnak({ PORT: '0', DEV_DENGAN_JARINGAN_LOKAL: '1', ...tambahan }), encoding: 'utf8', timeout: 20000 });
      assert.equal(r.status, 1, `${r.stdout}${r.stderr}`);
      assert.match(r.stderr, pola);
      assert.doesNotMatch(r.stdout, /berjalan di port/, 'port sempat dibuka');
    }
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('Server dev tanpa opsi hanya bisa disambung dari komputer ini; dengan opsi, dari alamat LAN juga', async () => {
  const lan = alamatLan()[0];
  const tutup = await nyalakan({ NODE_ENV: 'development', DB_NAME: 'lanjut_dev' });
  try {
    assert.match(tutup.log(), /Hanya untuk komputer ini \(127\.0\.0\.1\)/);
    assert.equal(await bisaSambung('127.0.0.1', tutup.port), true);
    if (lan) assert.equal(await bisaSambung(lan, tutup.port), false, `tanpa opsi, server terjangkau di ${lan}`);
  } finally {
    await tutup.selesai();
  }
  const buka = await nyalakan({ NODE_ENV: 'development', DB_NAME: 'lanjut_dev', DEV_DENGAN_JARINGAN_LOKAL: '1' });
  try {
    assert.match(buka.log(), /TERBUKA DI JARINGAN LOKAL \(DEV_DENGAN_JARINGAN_LOKAL=1\), basis data lanjut_dev/);
    if (lan) {
      assert.equal(await bisaSambung(lan, buka.port), true, `dengan opsi, server tidak terjangkau di ${lan}`);
      assert.match(buka.log(), new RegExp(`http://${lan.replace(/\./g, '\\.')}:${buka.port}`));
    }
  } finally {
    await buka.selesai();
  }
});

test('Batas laju tidak berubah saat opsi menyala: permintaan ke-301 dalam 15 menit ditolak 429', async () => {
  const s = await nyalakan({ NODE_ENV: 'development', DB_NAME: 'lanjut_dev', DEV_DENGAN_JARINGAN_LOKAL: '1' });
  try {
    const status = [];
    for (let i = 0; i < 301; i += 1) {
      const res = await fetch(`http://127.0.0.1:${s.port}/api/v1/rute-yang-tidak-ada`);
      status.push(res.status);
      await res.arrayBuffer();
    }
    assert.ok(status.slice(0, 300).every((x) => x !== 429), `ditolak sebelum 300: ${status.indexOf(429) + 1}`);
    assert.equal(status[300], 429, 'permintaan ke-301 tidak ditolak');
  } finally {
    await s.selesai();
  }
});

/** Memuat app.config.ts dengan lingkungan tiruan (tanpa .env lokal apa pun). */
function muatKonfigApp(envTiruan) {
  const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));
  const sumber = fs.readFileSync(path.join(AKAR_APP, 'app.config.ts'), 'utf8');
  const { outputText } = ts.transpileModule(sumber, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const modul = { exports: {} };
  const prosesTiruan = { env: { ...envTiruan }, argv: ['node', 'expo', 'start'] };
  vm.runInNewContext(outputText, { exports: modul.exports, module: modul, require: () => ({}), process: prosesTiruan, console });
  return (modul.exports.default ?? modul.exports).extra;
}

test('Aplikasi tidak memakai alamat LAN bila EXPO_PUBLIC_API_URL tidak diset; alamat LAN hanya lewat variabel sesi', () => {
  // Alamat sungguhan saja (angka); contoh di komentar seperti "192.168.x.x" tidak dihitung.
  const POLA_LAN = /\/\/(192\.168\.\d|172\.(1[6-9]|2\d|3[01])\.\d|10\.(?!0\.2\.2[:/])\d)/;
  const tanpa = muatKonfigApp({});
  assert.equal(tanpa.apiUrl, undefined);
  assert.equal(tanpa.apiUrlDevWeb, 'http://localhost:4000/api/v1');
  assert.equal(tanpa.apiUrlDevAndroid, 'http://10.0.2.2:4000/api/v1', 'emulator Android, bukan alamat LAN');
  for (const k of ['apiUrl', 'apiUrlProd', 'apiUrlDevWeb', 'apiUrlDevAndroid']) assert.doesNotMatch(String(tanpa[k] ?? ''), POLA_LAN, k);
  assert.deepEqual([tanpa.jalurTujuan, tanpa.discover, tanpa.kelolaDataAkun], [false, false, false], 'saklar layar bawaan mati');

  const dengan = muatKonfigApp({ EXPO_PUBLIC_API_URL: 'http://192.168.1.20:4000/api/v1', EXPO_PUBLIC_JALUR_TUJUAN: '1', EXPO_PUBLIC_DISCOVER: '1' });
  assert.equal(dengan.apiUrl, 'http://192.168.1.20:4000/api/v1');
  assert.deepEqual([dengan.jalurTujuan, dengan.discover], [true, true]);

  // Tidak ada alamat LAN yang tertulis di kode aplikasi atau konfigurasi.
  for (const b of ['app.config.ts', 'api/client.ts', 'eas.json']) assert.doesNotMatch(fs.readFileSync(path.join(AKAR_APP, b), 'utf8'), POLA_LAN, b);
});
