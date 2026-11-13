// LANJUT_022 seri v2: pagar lingkungan development. Setiap kasus berjalan di proses anak, di folder
// kosong tanpa .env, dengan variabel yang ditetapkan tes. Proses anak dipantau: koneksi jaringan dan
// pemuatan modul koneksi dicatat, dan fetch ditolak, jadi tidak ada yang tersambung ke mana pun.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const env = require('../src/config/env');
const { alasanTolak, hostLokal } = require('../src/db/pagar-tujuan');

const AKAR_SERVER = path.join(__dirname, '..');
const AKAR_APP = path.join(AKAR_SERVER, '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
let folder;
let pantau;

before(() => {
  folder = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjut-pagar-'));
  pantau = path.join(folder, 'pantau.js');
  fs.writeFileSync(
    pantau,
    `const net = require('net');
const Module = require('module');
const asli = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...a) {
  const o = Array.isArray(a[0]) ? a[0][0] : a[0];
  process.stderr.write('PANTAU-KONEKSI ' + JSON.stringify(o && typeof o === 'object' ? { host: o.host, port: o.port } : a) + '\\n');
  return asli.apply(this, a);
};
const muat = Module._load;
Module._load = function (permintaan, ...lain) {
  if (/db[\\\\/]koneksi(\\.js)?$/.test(permintaan)) process.stderr.write('PANTAU-MUAT-KONEKSI\\n');
  return muat.call(this, permintaan, ...lain);
};
globalThis.fetch = async () => { throw new Error('fetch diblokir tes'); };
`
  );
});

after(() => fs.rmSync(folder, { recursive: true, force: true }));

const LOKAL = { DB_HOST: '127.0.0.1', DB_USER: 'uji', DB_NAME: 'lanjut_dev', CORS_ORIGINS: 'http://localhost:8081' };
const PRODUKSI = { NODE_ENV: 'production', DB_HOST: 'db.contoh.test', DB_USER: 'uji', DB_NAME: 'lanjut_db', CORS_ORIGINS: 'https://app.contoh.test', TRUST_PROXY: '1' };

function anak(argumen, variabel) {
  const r = spawnSync(process.execPath, ['-r', pantau, ...argumen], {
    cwd: folder,
    env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...variabel },
    encoding: 'utf8',
    timeout: 60000,
  });
  return { ...r, koneksi: (r.stderr.match(/^PANTAU-KONEKSI .*$/gm) || []), muatKoneksi: /PANTAU-MUAT-KONEKSI/.test(r.stderr) };
}
const muatEnv = (variabel) => anak(['-e', `require(${JSON.stringify(path.join(AKAR_SERVER, 'src', 'config', 'env.js'))})`], variabel);

test('Tes ini sendiri berjalan di basis data lanjut_test dan host lokal', () => {
  assert.match(env.DB_NAME, /^lanjut_test/);
  assert.ok(hostLokal(env.DB_HOST));
});

test('env.js: di luar produksi, host jarak jauh ditolak', () => {
  for (const NODE_ENV of ['development', 'test', undefined]) {
    const r = muatEnv({ ...LOKAL, DB_HOST: 'db.contoh.test', ...(NODE_ENV ? { NODE_ENV } : {}) });
    assert.notEqual(r.status, 0, String(NODE_ENV));
    assert.match(r.stderr, /DB_HOST harus localhost atau 127\.0\.0\.1/, String(NODE_ENV));
  }
  assert.notEqual(muatEnv({ ...LOKAL, NODE_ENV: 'development', DB_HOST: '127.0.0.2' }).status, 0);
});

test('env.js: di luar produksi, nama basis data produksi ditolak', () => {
  for (const DB_NAME of ['lanjut_db', 'lanjut_db_salinan', 'LANJUT_DB']) {
    for (const NODE_ENV of ['development', 'test']) {
      const r = muatEnv({ ...LOKAL, NODE_ENV, DB_NAME });
      assert.notEqual(r.status, 0, `${NODE_ENV} ${DB_NAME}`);
      assert.match(r.stderr, /memakai nama produksi/);
    }
  }
});

test('env.js: lokal dengan nama dev atau tes diterima, dan produksi tidak terpengaruh', () => {
  for (const v of [{ ...LOKAL, NODE_ENV: 'development' }, { ...LOKAL, NODE_ENV: 'test', DB_NAME: 'lanjut_test' }, { ...LOKAL, DB_HOST: 'localhost' }, PRODUKSI]) {
    const r = muatEnv(v);
    assert.equal(r.status, 0, `${JSON.stringify(v)}\n${r.stderr}`);
  }
});

test('bantuan.js: tes menolak basis data yang tidak diawali lanjut_test', () => {
  const muatBantuan = (DB_NAME) => anak(['-e', `require(${JSON.stringify(path.join(__dirname, 'bantuan.js'))}); process.exit(0)`], { ...LOKAL, NODE_ENV: 'test', DB_NAME });
  for (const nama of ['lanjut_dev', 'lanjut', 'uji_lanjut_test']) {
    const r = muatBantuan(nama);
    assert.notEqual(r.status, 0, nama);
    assert.match(r.stderr, /lanjut_test/, nama);
  }
  assert.equal(muatBantuan('lanjut_test_contoh').status, 0);
});

test('koneksi.js: di bawah node --test, basis data selain lanjut_test ditolak', () => {
  const koneksi = JSON.stringify(path.join(AKAR_SERVER, 'src', 'db', 'koneksi.js'));
  const muat = (variabel) => anak(['-e', `require(${koneksi}); process.exit(0)`], { ...LOKAL, ...variabel });
  const r = muat({ NODE_TEST_CONTEXT: 'child', DB_NAME: 'lanjut_dev' });
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /lanjut_test/);
  assert.equal(muat({ NODE_TEST_CONTEXT: 'child', DB_NAME: 'lanjut_test' }).status, 0);
  assert.equal(muat({ DB_NAME: 'lanjut_dev' }).status, 0, 'di luar tes, lanjut_dev boleh');
});

test('Pagar skrip: aturan --ya dan --timpa-produksi', () => {
  const lokal = { DB_HOST: '127.0.0.1', NODE_ENV: 'development' };
  const jauh = { DB_HOST: 'db.contoh.test', NODE_ENV: 'production' };
  assert.equal(alasanTolak(lokal, []), null);
  assert.match(alasanTolak(jauh, []), /bukan lokal/);
  assert.equal(alasanTolak(jauh, ['--ya']), null);
  assert.equal(alasanTolak({ ...jauh, DB_HOST: 'LOCALHOST' }, []), null);
  assert.match(alasanTolak({ ...lokal, NODE_ENV: 'production' }, [], { tolakProduksi: true }), /menimpa basis data produksi/);
  assert.match(alasanTolak(jauh, ['--ya'], { tolakProduksi: true }), /menimpa basis data produksi/);
  assert.equal(alasanTolak(jauh, ['--ya', '--timpa-produksi'], { tolakProduksi: true }), null);
});

const SKRIP = [
  ['migrasi', ['src/db/jalankan-migrasi.js']],
  ['migrasi-turun', ['src/db/turunkan-migrasi.js', '032_berkas_tertunda_hapus.sql']],
  ['benih', ['src/db/benih/benih.js']],
  ['pulihkan-db', ['tools/pulihkan-db.js', 'cadangan.sql']],
];

test('Skrip berbahaya: mencetak tujuan, dan berhenti tanpa --ya untuk host jarak jauh, tanpa menyambung ke mana pun', () => {
  for (const [nama, [berkas, ...argumen]] of SKRIP) {
    const r = anak([path.join(AKAR_SERVER, berkas), ...argumen], PRODUKSI);
    assert.equal(r.status, 1, `${nama}: ${r.stdout}${r.stderr}`);
    assert.match(r.stdout, new RegExp(`\\[${nama}\\] Tujuan: host db\\.contoh\\.test, basis data lanjut_db`), nama);
    assert.match(r.stderr, /DIHENTIKAN\. Host db\.contoh\.test bukan lokal/, nama);
    assert.deepEqual(r.koneksi, [], nama);
  }
});

test('Skrip berbahaya: dipasang di package.json tanpa jalan pintas', () => {
  const { scripts } = JSON.parse(baca('server', 'package.json'));
  assert.equal(scripts.migrasi, 'node src/db/jalankan-migrasi.js');
  assert.equal(scripts['migrasi-turun'], 'node src/db/turunkan-migrasi.js');
  assert.equal(scripts.benih, 'node src/db/benih/benih.js');
  assert.equal(scripts['pulihkan-db'], 'node tools/pulihkan-db.js');
  for (const s of Object.values(scripts)) assert.doesNotMatch(s, /--ya|--timpa-produksi/);
});

test('pulihkan-db: produksi ditolak tanpa --timpa-produksi, juga di host lokal', () => {
  const berkas = path.join(AKAR_SERVER, 'tools', 'pulihkan-db.js');
  const prodLokal = { ...PRODUKSI, DB_HOST: '127.0.0.1' };
  const tolak = anak([berkas, 'cadangan.sql'], prodLokal);
  assert.equal(tolak.status, 1);
  assert.match(tolak.stderr, /menimpa basis data produksi/);
  const jauhYa = anak([berkas, 'cadangan.sql', '--ya'], PRODUKSI);
  assert.match(jauhYa.stderr, /menimpa basis data produksi/);
  // Dengan kedua tanda, pagar dilewati dan skrip berhenti karena berkasnya tidak ada.
  const lolos = anak([berkas, 'tidak-ada.sql', '--timpa-produksi'], prodLokal);
  assert.equal(lolos.status, 1);
  assert.match(lolos.stderr, /tidak ditemukan/);
  assert.deepEqual([...tolak.koneksi, ...jauhYa.koneksi, ...lolos.koneksi], []);
});

test('migrasi-turun: nama migrasi dibaca dari argumen yang bukan tanda', () => {
  const r = anak([path.join(AKAR_SERVER, 'src', 'db', 'turunkan-migrasi.js'), '--ya', 'bukan-migrasi.sql'], { ...PRODUKSI, DB_HOST: '127.0.0.9' });
  assert.match(r.stdout, /Tujuan: host 127\.0\.0\.9/);
});

test('smoke.js: hanya --url localhost yang memuat koneksi basis data', () => {
  const smoke = path.join(AKAR_SERVER, 'tools', 'smoke.js');
  const jauh = anak([smoke, '--url=https://api.contoh.test'], {});
  assert.equal(jauh.muatKoneksi, false, jauh.stderr);
  assert.deepEqual(jauh.koneksi, []);
  const lokal = anak([smoke, '--url=http://127.0.0.1:9'], { ...LOKAL, NODE_ENV: 'development' });
  assert.equal(lokal.muatKoneksi, true, 'kontrol: localhost memuat koneksi');
});

test('docker-compose.yml produksi memberi --ya pada migrasi dan benih, supaya deploy tidak tertahan pagar', () => {
  const compose = baca('docker-compose.yml');
  assert.match(compose, /npm run migrasi -- --ya &&/);
  assert.match(compose, /npm run benih -- --ya;/);
  assert.doesNotMatch(compose, /--timpa-produksi/);
});

test('docker-compose.dev.yml: hanya MySQL lokal, port hanya di 127.0.0.1, tanpa sandi bawaan', () => {
  const dev = baca('docker-compose.dev.yml');
  const layanan = dev.split('\nservices:\n')[1].split('\nvolumes:\n')[0];
  assert.deepEqual([...layanan.matchAll(/^ {2}([\w-]+):$/gm)].map((m) => m[1]), ['mysql-dev']);
  assert.match(layanan, /image: mysql:8\.0/);
  const port = [...layanan.matchAll(/^\s+- "([^"]+)"$/gm)].map((m) => m[1]).filter((p) => /:\d+$/.test(p));
  assert.ok(port.length > 0 && port.every((p) => p.startsWith('127.0.0.1:')), port.join());
  assert.match(layanan, /MYSQL_DATABASE: lanjut_dev/);
  for (const m of layanan.matchAll(/PASSWORD: (\S+)/g)) assert.match(m[1], /^\$\{[A-Z_]+:\?/, 'sandi harus dari variabel tanpa bawaan');
  assert.doesNotMatch(dev, /lanjut_db|NODE_ENV|api:|web:/);
  const init = baca('server', 'docker', 'dev-init', '01-lanjut-test.sql');
  assert.match(init, /CREATE DATABASE IF NOT EXISTS lanjut_test\b/);
});

test('server/.env.example: nilai development, tanpa nama atau domain produksi', () => {
  const contoh = baca('server', '.env.example');
  const nilai = (k) => (new RegExp(`^${k}=(.*)$`, 'm').exec(contoh) || [])[1];
  assert.equal(nilai('NODE_ENV'), 'development');
  assert.equal(nilai('DB_HOST'), '127.0.0.1');
  assert.equal(nilai('DB_NAME'), 'lanjut_dev');
  assert.doesNotMatch(contoh, /lanjut_db|GANTI-DOMAIN|https:\/\/app\./);
  for (const k of ['DB_PASSWORD', 'OPENROUTER_API_KEY', 'SMTP_PASSWORD']) assert.equal(nilai(k), '', k);
});

test('Dokumen: README tidak lagi menganjurkan basis data produksi, menunjuk ke lingkungan-dev, dan --timpa-produksi bukan langkah rutin', () => {
  const readme = baca('server', 'README.md');
  assert.doesNotMatch(readme, /staging\/produksi apa pun/);
  assert.match(readme, /docs\/lingkungan-dev\.md/);
  const dok = baca('docs', 'lingkungan-dev.md');
  for (const teks of [readme, dok]) assert.doesNotMatch(teks, /--timpa-produksi/);
  assert.doesNotMatch(dok, /^(DB_PASSWORD|DEV_DB_PASSWORD|DEV_DB_ROOT_PASSWORD|OPENROUTER_API_KEY)=\S/m, 'tanpa kredensial');
  assert.match(dok, /docker compose --env-file \.env\.dev\.local -f docker-compose\.dev\.yml up -d/);
});
