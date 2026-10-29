// LANJUT_083 — masuk dengan Google. Uji integrasi dengan MySQL nyata.
// Tanpa layanan luar: kunci publik Google diganti kunci RSA buatan tes ini
// (`sumberKunci.ambil`), lalu ID token ditandatangani sendiri. Seluruh pemeriksaan
// tanda tangan & klaim berjalan di kode sungguhan (tokenGoogle.js).

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const env = require('../src/config/env');
const tokenGoogle = require('../src/modul/auth/tokenGoogle');
const { nyalakanServer, urlDari, pool, acak, daftarPenggunaBaru } = require('./bantuan');

const CLIENT_ID = 'uji083-klien.apps.googleusercontent.com';
const KID = 'kunci-uji-083';
const kunciUji = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const kunciLain = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwkUji = { ...kunciUji.publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' };

let server;
let baseUrl;
const ambilAsli = tokenGoogle.sumberKunci.ambil;
const clientIdAsli = env.GOOGLE_CLIENT_ID;

before(async () => {
  env.GOOGLE_CLIENT_ID = CLIENT_ID;
  tokenGoogle.sumberKunci.ambil = async () => [jwkUji];
  server = await nyalakanServer();
  baseUrl = urlDari(server);
});

after(async () => {
  tokenGoogle.sumberKunci.ambil = ambilAsli;
  env.GOOGLE_CLIENT_ID = clientIdAsli;
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');

function buatToken(klaim = {}, { kunci = kunciUji.privateKey, kid = KID } = {}) {
  const sekarang = Math.floor(Date.now() / 1000);
  const kepala = b64({ alg: 'RS256', kid, typ: 'JWT' });
  const isi = b64({
    iss: 'https://accounts.google.com',
    aud: CLIENT_ID,
    sub: `sub-${acak()}`,
    iat: sekarang,
    exp: sekarang + 3600,
    email_verified: true,
    ...klaim,
  });
  const ttd = crypto.sign('RSA-SHA256', Buffer.from(`${kepala}.${isi}`), kunci).toString('base64url');
  return `${kepala}.${isi}.${ttd}`;
}

async function ambilNonce() {
  const res = await fetch(`${baseUrl}/api/v1/auth/google/nonce`);
  assert.equal(res.status, 200);
  return (await res.json()).data.nonce;
}

async function masukGoogle(klaim, opsi) {
  const nonce = await ambilNonce();
  const idToken = buatToken({ nonce, ...klaim }, opsi);
  const res = await fetch(`${baseUrl}/api/v1/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: idToken, nonce }),
  });
  return { status: res.status, json: await res.json() };
}

function emailUji() {
  return `uji083_g_${acak()}@contoh.test`;
}

async function jumlahAkunDenganEmail(email) {
  const [baris] = await pool.execute('SELECT COUNT(*) AS n FROM pengguna WHERE email = ?', [email]);
  return Number(baris[0].n);
}

test('token bertanda tangan kunci lain (bukan Google) → 401 GOOGLE_TIDAK_SAH, tidak ada akun dibuat', async () => {
  const email = emailUji();
  const { status, json } = await masukGoogle({ email }, { kunci: kunciLain.privateKey });
  assert.equal(status, 401);
  assert.equal(json.galat.kode, 'GOOGLE_TIDAK_SAH');
  assert.equal(await jumlahAkunDenganEmail(email), 0);
});

test('token rusak, kid tak dikenal, aud lain, penerbit lain, kedaluwarsa, nonce beda → semua 401', async () => {
  const email = emailUji();
  const kasus = [
    { klaim: { email }, opsi: { kid: 'kid-tak-dikenal' } },
    { klaim: { email, aud: 'klien-lain.apps.googleusercontent.com' } },
    { klaim: { email, iss: 'https://penipu.contoh' } },
    { klaim: { email, exp: Math.floor(Date.now() / 1000) - 3600 } },
  ];
  for (const k of kasus) {
    const { status, json } = await masukGoogle(k.klaim, k.opsi);
    assert.equal(status, 401, JSON.stringify(k));
    assert.equal(json.galat.kode, 'GOOGLE_TIDAK_SAH');
  }

  const nonce = await ambilNonce();
  const lainNonce = await fetch(`${baseUrl}/api/v1/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: buatToken({ email, nonce: 'nonce-yang-lain-sama-sekali' }), nonce }),
  });
  assert.equal(lainNonce.status, 401);

  const rusak = await fetch(`${baseUrl}/api/v1/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token: 'ini.bukan.token-google-yang-sah', nonce }),
  });
  assert.equal(rusak.status, 401);
  assert.equal(await jumlahAkunDenganEmail(email), 0);
});

test('email yang belum diverifikasi Google ditolak (401 EMAIL_BELUM_TERVERIFIKASI), tanpa akun', async () => {
  for (const email_verified of [false, 'false', undefined]) {
    const email = emailUji();
    const { status, json } = await masukGoogle({ email, email_verified });
    assert.equal(status, 401);
    assert.equal(json.galat.kode, 'EMAIL_BELUM_TERVERIFIKASI');
    assert.equal(await jumlahAkunDenganEmail(email), 0);
  }
});

test('email baru → akun siswa baru dibuat dan langsung masuk', async () => {
  const email = emailUji();
  const { status, json } = await masukGoogle({ email });
  assert.equal(status, 200);
  assert.equal(json.data.akun_baru, true);
  assert.ok(json.data.token);
  assert.equal(json.data.pengguna.email, email);
  // LANJUT_083c: Google sudah memverifikasi email ini.
  assert.equal(json.data.pengguna.email_terverifikasi, true);
  assert.equal(json.data.pengguna.peran, 'siswa');
  assert.equal(json.data.pengguna.kelas, null);
  assert.match(json.data.pengguna.nama_pengguna, /^[a-z0-9._]{3,32}$/);
  assert.equal(await jumlahAkunDenganEmail(email), 1);

  const saya = await fetch(`${baseUrl}/api/v1/auth/saya`, { headers: { Authorization: `Bearer ${json.data.token}` } });
  assert.equal(saya.status, 200);
  assert.equal((await saya.json()).data.id, json.data.pengguna.id);
});

test('email yang sudah ada → akun lama dipakai (tidak membuat akun kedua)', async () => {
  const nama = `uji083_${acak()}`;
  const email = `${nama}@contoh.test`;
  // LANJUT_083c: akun dengan email dibuat lewat kode email (pengirim tiruan di bantuan.js).
  const daftar = await daftarPenggunaBaru(baseUrl, { nama_pengguna: nama, kata_sandi: 'sandiujiaman1', email, kelas: '11', jenis_sekolah: 'SMA' });
  assert.equal(daftar.status, 201);
  const idLama = daftar.json.data.pengguna.id;

  // Huruf besar di email Google tetap cocok.
  const { status, json } = await masukGoogle({ email: email.toUpperCase() });
  assert.equal(status, 200);
  assert.equal(json.data.akun_baru, false);
  assert.equal(json.data.pengguna.id, idLama);
  assert.equal(json.data.pengguna.nama_pengguna, nama);
  assert.equal(json.data.pengguna.kelas, '11');
  assert.equal(await jumlahAkunDenganEmail(email), 1);

  // Masuk Google kedua kali untuk akun yang dibuat lewat Google: akun yang sama.
  const emailG = emailUji();
  const pertama = await masukGoogle({ email: emailG });
  const kedua = await masukGoogle({ email: emailG });
  assert.equal(kedua.json.data.akun_baru, false);
  assert.equal(kedua.json.data.pengguna.id, pertama.json.data.pengguna.id);
});

test('lintas akun: token Google untuk email A selalu masuk ke akun A, bukan akun B', async () => {
  const a = emailUji();
  const b = emailUji();
  const akunA = await masukGoogle({ email: a });
  const akunB = await masukGoogle({ email: b });
  assert.notEqual(akunA.json.data.pengguna.id, akunB.json.data.pengguna.id);
  const lagiA = await masukGoogle({ email: a });
  assert.equal(lagiA.json.data.pengguna.id, akunA.json.data.pengguna.id);
});

test('GOOGLE_CLIENT_ID kosong → 503 GOOGLE_TIDAK_TERSEDIA', async () => {
  env.GOOGLE_CLIENT_ID = null;
  try {
    const { status, json } = await masukGoogle({ email: emailUji() });
    assert.equal(status, 503);
    assert.equal(json.galat.kode, 'GOOGLE_TIDAK_TERSEDIA');
  } finally {
    env.GOOGLE_CLIENT_ID = CLIENT_ID;
  }
});

test('tanpa tiruan, pengambil kunci Google menolak berjalan di tes (tidak ada fetch keluar) → 503', async () => {
  const fetchAsli = globalThis.fetch;
  const dipanggil = [];
  tokenGoogle.sumberKunci.ambil = ambilAsli;
  try {
    const nonce = await ambilNonce();
    const badan = JSON.stringify({ id_token: buatToken({ email: emailUji(), nonce }), nonce });
    globalThis.fetch = async (url, ...rest) => {
      if (!String(url).startsWith('http://127.0.0.1')) dipanggil.push(String(url));
      return fetchAsli(url, ...rest);
    };
    const res = await fetchAsli(`${baseUrl}/api/v1/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: badan,
    });
    assert.equal(res.status, 503);
    assert.equal((await res.json()).galat.kode, 'GOOGLE_TIDAK_TERSEDIA');
  } finally {
    globalThis.fetch = fetchAsli;
    tokenGoogle.sumberKunci.ambil = async () => [jwkUji];
  }
  assert.deepEqual(dipanggil, []);
});

test('nonce: acak dan berbeda tiap permintaan', async () => {
  const a = await ambilNonce();
  const b = await ambilNonce();
  assert.notEqual(a, b);
  assert.ok(a.length >= 16);
});
