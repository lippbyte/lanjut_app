// LANJUT_030b: kata yang diketik siswa di pencarian Arsip Belajar (GET /api/v1/modul/cari?q=...)
// tidak pernah masuk log server, termasuk pada permintaan yang gagal (400, 401, 500). Semua keluaran
// proses (console, stdout, stderr) ditangkap selama permintaan, lalu diperiksa.

const fs = require('fs');
const path = require('path');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { acak, nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const modulLayanan = require('../src/modul/modul/modul.layanan');
const { jalurUntukLog } = require('../src/util/jalurLog');

const AKAR_SERVER = path.join(__dirname, '..');
let server;
let baseUrl;
let akun;

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const { json } = await daftarPenggunaBaru(baseUrl);
  akun = { id: json.data.pengguna.id, token: json.data.token };
  const teks =
    'Inflasi adalah kenaikan harga barang dan jasa secara umum dan terus-menerus. Bank sentral dapat menaikkan suku bunga acuan untuk menekan inflasi, karena pinjaman menjadi lebih mahal dan permintaan berkurang.';
  const res = await fetch(`${baseUrl}/api/v1/modul`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${akun.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ judul: 'Ekonomi: Inflasi', mapel_id: 'ekonomi', teks }),
  });
  assert.equal(res.status, 201);
  await modulLayanan.rapikanIndeksSekarang();
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

/** Jalankan `fn` sambil menangkap SEMUA keluaran proses; keluaran tetap diteruskan. */
async function tangkapLog(fn) {
  const tertangkap = [];
  const asli = {
    out: process.stdout.write,
    err: process.stderr.write,
    con: Object.fromEntries(['log', 'info', 'warn', 'error', 'debug'].map((k) => [k, console[k]])),
  };
  process.stdout.write = function (potong, ...sisa) {
    tertangkap.push(String(potong));
    return asli.out.call(this, potong, ...sisa);
  };
  process.stderr.write = function (potong, ...sisa) {
    tertangkap.push(String(potong));
    return asli.err.call(this, potong, ...sisa);
  };
  for (const k of Object.keys(asli.con)) {
    console[k] = (...argumen) => {
      tertangkap.push(argumen.map((a) => (a instanceof Error ? a.stack : typeof a === 'string' ? a : JSON.stringify(a))).join(' '));
      return asli.con[k](...argumen);
    };
  }
  try {
    await fn();
    // Log akses ditulis saat respons selesai ('finish'); beri waktu satu putaran.
    await new Promise((r) => setTimeout(r, 50));
  } finally {
    process.stdout.write = asli.out;
    process.stderr.write = asli.err;
    Object.assign(console, asli.con);
  }
  return tertangkap.join('\n');
}

const kataUnik = () => `KATA-RAHASIA-123-${acak()}`;
const cari = (jalur, q, token = akun.token) =>
  fetch(`${baseUrl}${jalur}?q=${encodeURIComponent(q)}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });

function tanpaKata(log, kata) {
  assert.ok(!log.includes(kata), `kata pencarian muncul di log:\n${log.split('\n').filter((b) => b.includes(kata)).join('\n')}`);
  assert.ok(!log.includes(encodeURIComponent(kata)), 'kata pencarian (ter-encode) muncul di log');
  assert.ok(!log.toLowerCase().includes(kata.toLowerCase()), 'kata pencarian (huruf lain) muncul di log');
}

test('Pencarian berhasil (200): kata tidak masuk log; log akses tetap mencatat metode, jalur, status', async () => {
  const kata = kataUnik();
  let status;
  const log = await tangkapLog(async () => {
    status = (await cari('/api/v1/modul/cari', `inflasi ${kata}`)).status;
  });
  assert.equal(status, 200);
  tanpaKata(log, kata);
  assert.match(log, /GET \/api\/v1\/modul\/cari 200 \d+ms pengguna=[0-9a-f-]{36}/, 'baris log akses tetap ada, tanpa string kueri');
});

test('Permintaan gagal: 400 (kata terlalu panjang) dan 401 (tanpa token): kata tidak masuk log', async () => {
  const kata = kataUnik();
  const hasil = {};
  const log = await tangkapLog(async () => {
    hasil.panjang = (await cari('/api/v1/modul/cari', `${kata} ${'x'.repeat(220)}`)).status;
    hasil.tanpaToken = (await cari('/api/v1/modul/cari', kata, null)).status;
  });
  assert.deepEqual(hasil, { panjang: 400, tanpaToken: 401 });
  tanpaKata(log, kata);
  assert.match(log, /GET \/api\/v1\/modul\/cari 400 /);
  assert.match(log, /GET \/api\/v1\/modul\/cari 401 /);
});

test('Galat server (500) di jalur pencarian: kata tidak masuk log galat maupun log akses', async () => {
  const kata = kataUnik();
  const asli = modulLayanan.cari;
  modulLayanan.cari = async () => {
    throw new Error('galat uji LANJUT_030b');
  };
  let res;
  let log;
  try {
    log = await tangkapLog(async () => {
      res = await cari('/api/v1/modul/cari', kata);
    });
  } finally {
    modulLayanan.cari = asli;
  }
  assert.equal(res.status, 500);
  const badan = await res.json();
  assert.equal(badan.galat.kode, 'GALAT_SERVER');
  tanpaKata(log, kata);
  assert.match(log, /\[galat\] GET \/api\/v1\/modul\/cari - Error: galat uji LANJUT_030b/, 'galat tetap tercatat, tanpa string kueri');
  assert.match(log, /GET \/api\/v1\/modul\/cari 500 /);
});

test('Jalur dengan huruf besar atau garis miring di akhir juga sampai ke pencarian, dan tetap tidak tercatat', async () => {
  const kata = kataUnik();
  const status = [];
  const log = await tangkapLog(async () => {
    for (const j of ['/API/v1/Modul/CARI', '/api/v1/modul/cari/']) status.push((await cari(j, `inflasi ${kata}`)).status);
  });
  assert.deepEqual(status, [200, 200]);
  tanpaKata(log, kata);
});

test('Pencarian tetap berfungsi sama: bentuk respons dan hasil tidak berubah', async () => {
  const q = 'inflasi suku bunga';
  const res = await cari('/api/v1/modul/cari', q);
  assert.equal(res.status, 200);
  const badan = await res.json();
  assert.deepEqual(Object.keys(badan.data).sort(), ['hasil', 'q']);
  assert.equal(badan.data.q, q, 'q tetap dikembalikan ke app (kontrak APK 1.0.0)');
  assert.deepEqual(badan.data.hasil, await modulLayanan.cari(akun.id, q));
  assert.equal(badan.data.hasil[0].judul, 'Ekonomi: Inflasi');
  assert.deepEqual(Object.keys(badan.data.hasil[0]).sort(), ['judul', 'mapel_id', 'modul_id', 'potongan', 'skor', 'urutan']);
});

test('Perubahan sempit: hanya jalur pencarian yang kehilangan string kueri', () => {
  const r = (originalUrl) => ({ originalUrl });
  assert.equal(jalurUntukLog(r('/api/v1/modul/cari?q=rahasia')), '/api/v1/modul/cari');
  assert.equal(jalurUntukLog(r('/API/V1/MODUL/CARI/?q=rahasia')), '/API/V1/MODUL/CARI/');
  assert.equal(jalurUntukLog(r('/api/v1/modul/c%61ri?q=rahasia')), '/api/v1/modul/c%61ri');
  // Jalur lain tidak berubah (log yang tidak terkait tetap sama).
  for (const u of ['/api/v1/kartu?mapel=biologi', '/api/v1/konten/checklist?kelas=12&jalur=snbp', '/api/v1/modul?semua=ya', '/api/v1/modul/cariku?q=x', '/api/v1/auth/masuk']) {
    assert.equal(jalurUntukLog(r(u)), u);
  }
});

test('Tidak ada pencatat lain yang mencetak string kueri, URL lengkap, atau req.query', () => {
  const berkas = [];
  const jalan = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) jalan(p);
      else if (e.name.endsWith('.js')) berkas.push(p);
    }
  };
  jalan(path.join(AKAR_SERVER, 'src'));
  for (const f of berkas) {
    const teks = fs.readFileSync(f, 'utf8');
    for (const m of teks.matchAll(/console\.(log|info|warn|error|debug)\(([^;]*)\);/g)) {
      const isi = m[2];
      if (/req\.(query|url|originalUrl)/.test(isi)) {
        // Satu-satunya yang boleh: originalUrl yang sudah dipotong sebelum '?' (JSON rusak, LANJUT_053).
        assert.ok(/req\.originalUrl\.split\('\?'\)\[0\]/.test(isi) && !/req\.(query|url)\b/.test(isi), `${path.relative(AKAR_SERVER, f)}: ${m[0].slice(0, 120)}`);
      }
    }
  }
  assert.match(fs.readFileSync(path.join(AKAR_SERVER, 'src', 'app.js'), 'utf8'), /console\.log\(`\$\{req\.method\} \$\{jalurUntukLog\(req\)\} \$\{res\.statusCode\}/);
  assert.match(fs.readFileSync(path.join(AKAR_SERVER, 'src', 'middleware', 'penangananGalat.js'), 'utf8'), /console\.error\('\[galat\]', req\.method, jalurUntukLog\(req\), '-', err && err\.stack\);/);
});
