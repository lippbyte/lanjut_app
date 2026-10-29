// LANJUT_083d (keputusan PM, pilihan a) — akun lama dengan email belum terverifikasi diambil alih
// oleh pemilik email asli lewat kode email atau Google: email terverifikasi, kata sandi lama
// dicabut, sesi lain dicabut, dan kata sandi baru wajib dibuat. Uji integrasi, MySQL nyata.
// Pengirim email TIRUAN (bantuan.js); kunci Google buatan tes; 0 koneksi keluar.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const net = require('net');
const tls = require('tls');

const env = require('../src/config/env');
const tokenGoogle = require('../src/modul/auth/tokenGoogle');
const { nyalakanServer, urlDari, pool, acak, kodeTerakhir, kirimJson, daftarPenggunaBaru } = require('./bantuan');

const CLIENT_ID = 'uji083d-klien.apps.googleusercontent.com';
const KID = 'kunci-uji-083d';
const kunciUji = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwkUji = { ...kunciUji.publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' };
const SANDI_LAMA = 'sandilamaorangitu1';
const SANDI_BARU = 'sandibarupemilik1';

let server;
let baseUrl;
const koneksiKeluar = [];
const asli = { net: net.connect, tls: tls.connect, ambil: tokenGoogle.sumberKunci.ambil, clientId: env.GOOGLE_CLIENT_ID };
const HOST_LOKAL = ['localhost', '127.0.0.1', '::1'];
const hostDari = (a) => (a[0] && typeof a[0] === 'object' ? a[0].host || 'localhost' : typeof a[1] === 'string' ? a[1] : 'localhost');

before(async () => {
  env.GOOGLE_CLIENT_ID = CLIENT_ID;
  tokenGoogle.sumberKunci.ambil = async () => [jwkUji];
  net.connect = (...a) => {
    if (!HOST_LOKAL.includes(hostDari(a))) koneksiKeluar.push(`net:${hostDari(a)}`);
    return asli.net(...a);
  };
  tls.connect = (...a) => {
    if (!HOST_LOKAL.includes(hostDari(a))) koneksiKeluar.push(`tls:${hostDari(a)}`);
    return asli.tls(...a);
  };
  server = await nyalakanServer();
  baseUrl = urlDari(server);
});

after(async () => {
  net.connect = asli.net;
  tls.connect = asli.tls;
  tokenGoogle.sumberKunci.ambil = asli.ambil;
  env.GOOGLE_CLIENT_ID = asli.clientId;
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

const kirim = (jalur, body, token) => kirimJson(baseUrl, jalur, body, token);

async function saya(token) {
  const res = await fetch(`${baseUrl}/api/v1/auth/saya`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, json: await res.json() };
}

async function bendera(id) {
  const [b] = await pool.execute('SELECT email_terverifikasi, wajib_buat_sandi FROM pengguna WHERE id = ?', [id]);
  return { terverifikasi: Number(b[0].email_terverifikasi), wajibBuatSandi: Number(b[0].wajib_buat_sandi) };
}

/**
 * Akun lama (sebelum 083c): dibuat orang lain memakai email pemilik, tanpa verifikasi. Sesi
 * `tokenPembuat` = sesi orang itu, yang harus dicabut saat pemilik email mengambil alih.
 */
async function akunLama() {
  const nama = `uji083d_${acak()}`;
  const email = `${nama}@contoh.test`;
  const { status, json } = await kirim('/auth/daftar', { nama_pengguna: nama, kata_sandi: SANDI_LAMA });
  assert.equal(status, 201);
  await pool.execute('UPDATE pengguna SET email = ?, email_terverifikasi = 0 WHERE id = ?', [email, json.data.pengguna.id]);
  return { nama, email, id: json.data.pengguna.id, tokenPembuat: json.data.token };
}

async function masukKodeEmail(email) {
  await kirim('/auth/otp/kirim', { email });
  return kirim('/auth/otp/verifikasi', { email, kode: await kodeTerakhir(email, 'masuk') });
}

const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
async function masukGoogle(email) {
  const nonce = (await (await fetch(`${baseUrl}/api/v1/auth/google/nonce`)).json()).data.nonce;
  const sekarang = Math.floor(Date.now() / 1000);
  const kepala = b64({ alg: 'RS256', kid: KID, typ: 'JWT' });
  const isi = b64({ iss: 'https://accounts.google.com', aud: CLIENT_ID, sub: `sub-${acak()}`, iat: sekarang, exp: sekarang + 3600, email, email_verified: true, nonce });
  const ttd = crypto.sign('RSA-SHA256', Buffer.from(`${kepala}.${isi}`), kunciUji.privateKey).toString('base64url');
  return kirim('/auth/google', { id_token: `${kepala}.${isi}.${ttd}`, nonce });
}

test('login kode email untuk akun belum terverifikasi: email terverifikasi, sandi lama dicabut, perlu_sandi_baru', async () => {
  const a = await akunLama();
  const { status, json } = await masukKodeEmail(a.email);
  assert.equal(status, 200);
  assert.equal(json.data.perlu_sandi_baru, true);
  assert.equal(json.data.pengguna.id, a.id);
  assert.equal(json.data.pengguna.email_terverifikasi, true);
  assert.equal(json.data.pengguna.perlu_sandi_baru, true);
  assert.deepEqual(await bendera(a.id), { terverifikasi: 1, wajibBuatSandi: 1 });
});

test('sesi lain milik akun itu dicabut; sesi baru pemilik email berlaku', async () => {
  const a = await akunLama();
  assert.equal((await saya(a.tokenPembuat)).status, 200);
  const { json } = await masukKodeEmail(a.email);
  assert.equal((await saya(a.tokenPembuat)).status, 401);
  const baru = await saya(json.data.token);
  assert.equal(baru.status, 200);
  assert.equal(baru.json.data.perlu_sandi_baru, true);
});

test('login kata sandi lama ditolak SANDI_PERLU_DIBUAT; tebakan salah tetap KREDENSIAL_SALAH', async () => {
  const a = await akunLama();
  await masukKodeEmail(a.email);
  const lama = await kirim('/auth/masuk', { nama_pengguna: a.nama, kata_sandi: SANDI_LAMA });
  assert.equal(lama.status, 403);
  assert.equal(lama.json.galat.kode, 'SANDI_PERLU_DIBUAT');
  assert.equal(lama.json.galat.pesan, 'Masuk dengan kode email dulu, lalu buat kata sandi baru.');
  assert.equal(lama.json.data, undefined);
  const salah = await kirim('/auth/masuk', { nama_pengguna: a.nama, kata_sandi: 'bukansandinya1' });
  assert.equal(salah.status, 401);
  assert.equal(salah.json.galat.kode, 'KREDENSIAL_SALAH');
});

test('login Google untuk akun belum terverifikasi berperilaku sama (ambil alih, sesi lain dicabut, sandi ditolak)', async () => {
  const a = await akunLama();
  const { status, json } = await masukGoogle(a.email);
  assert.equal(status, 200);
  assert.equal(json.data.akun_baru, false);
  assert.equal(json.data.pengguna.id, a.id);
  assert.equal(json.data.perlu_sandi_baru, true);
  assert.deepEqual(await bendera(a.id), { terverifikasi: 1, wajibBuatSandi: 1 });
  assert.equal((await saya(a.tokenPembuat)).status, 401);
  assert.equal((await kirim('/auth/masuk', { nama_pengguna: a.nama, kata_sandi: SANDI_LAMA })).json.galat.kode, 'SANDI_PERLU_DIBUAT');

  // Akun baru dari Google tidak berubah: terverifikasi, tanpa wajib sandi.
  const baru = await masukGoogle(`uji083d_g_${acak()}@contoh.test`);
  assert.equal(baru.json.data.akun_baru, true);
  assert.equal(baru.json.data.perlu_sandi_baru, false);
  assert.deepEqual(await bendera(baru.json.data.pengguna.id), { terverifikasi: 1, wajibBuatSandi: 0 });
});

test('akun yang emailnya sudah terverifikasi tidak terpengaruh (kode email & Google)', async () => {
  const nama = `uji083d_v_${acak()}`;
  const email = `${nama}@contoh.test`;
  const daftar = await daftarPenggunaBaru(baseUrl, { nama_pengguna: nama, kata_sandi: SANDI_LAMA, email });
  assert.equal(daftar.status, 201);
  const tokenAwal = daftar.json.data.token;

  const lewatKode = await masukKodeEmail(email);
  assert.equal(lewatKode.json.data.perlu_sandi_baru, false);
  const lewatGoogle = await masukGoogle(email);
  assert.equal(lewatGoogle.json.data.perlu_sandi_baru, false);
  assert.deepEqual(await bendera(daftar.json.data.pengguna.id), { terverifikasi: 1, wajibBuatSandi: 0 });
  assert.equal((await saya(tokenAwal)).status, 200, 'sesi lain tidak dicabut');
  assert.equal((await kirim('/auth/masuk', { nama_pengguna: nama, kata_sandi: SANDI_LAMA })).status, 200);
});

test('buat sandi baru menghapus tanda: sandi baru bisa dipakai, sandi lama tidak', async () => {
  const a = await akunLama();
  const { json } = await masukKodeEmail(a.email);
  const buat = await kirim('/auth/sandi/buat', { kata_sandi_baru: SANDI_BARU }, json.data.token);
  assert.equal(buat.status, 200);
  assert.equal(buat.json.data.id, a.id);
  assert.equal(buat.json.data.perlu_sandi_baru, false);
  assert.deepEqual(await bendera(a.id), { terverifikasi: 1, wajibBuatSandi: 0 });

  const pakaiBaru = await kirim('/auth/masuk', { nama_pengguna: a.nama, kata_sandi: SANDI_BARU });
  assert.equal(pakaiBaru.status, 200);
  assert.equal(pakaiBaru.json.data.pengguna.perlu_sandi_baru, false);
  const pakaiLama = await kirim('/auth/masuk', { nama_pengguna: a.nama, kata_sandi: SANDI_LAMA });
  assert.equal(pakaiLama.status, 401);
  assert.equal(pakaiLama.json.galat.kode, 'KREDENSIAL_SALAH');
});

test('buat sandi tanpa sesi ditolak (tanpa token, atau token pembuat yang sudah dicabut)', async () => {
  const a = await akunLama();
  await masukKodeEmail(a.email);
  const tanpaToken = await kirim('/auth/sandi/buat', { kata_sandi_baru: SANDI_BARU });
  assert.equal(tanpaToken.status, 401);
  assert.equal(tanpaToken.json.galat.kode, 'TIDAK_MASUK');
  const tokenDicabut = await kirim('/auth/sandi/buat', { kata_sandi_baru: SANDI_BARU }, a.tokenPembuat);
  assert.equal(tokenDicabut.status, 401);
  assert.deepEqual(await bendera(a.id), { terverifikasi: 1, wajibBuatSandi: 1 });
});

test('buat sandi saat tanda tidak aktif ditolak; kata sandi tidak berubah', async () => {
  const nama = `uji083d_n_${acak()}`;
  const daftar = await kirim('/auth/daftar', { nama_pengguna: nama, kata_sandi: SANDI_LAMA });
  const res = await kirim('/auth/sandi/buat', { kata_sandi_baru: SANDI_BARU }, daftar.json.data.token);
  assert.equal(res.status, 403);
  assert.equal(res.json.galat.kode, 'TIDAK_BERHAK');
  assert.equal((await kirim('/auth/masuk', { nama_pengguna: nama, kata_sandi: SANDI_LAMA })).status, 200);
  assert.equal((await kirim('/auth/masuk', { nama_pengguna: nama, kata_sandi: SANDI_BARU })).status, 401);
});

test('masuk kode email lagi sebelum sandi dibuat: tetap perlu_sandi_baru, sesi pertama tidak dicabut lagi', async () => {
  const a = await akunLama();
  const pertama = await masukKodeEmail(a.email);
  const kedua = await masukKodeEmail(a.email);
  assert.equal(kedua.json.data.perlu_sandi_baru, true);
  assert.equal((await saya(pertama.json.data.token)).status, 200);
});

test('sandi baru memakai aturan daftar (minimal 8, bukan sandi umum)', async () => {
  const a = await akunLama();
  const { json } = await masukKodeEmail(a.email);
  for (const sandi of ['pendek1', '12345678']) {
    const res = await kirim('/auth/sandi/buat', { kata_sandi_baru: sandi }, json.data.token);
    assert.equal(res.status, 400);
    assert.equal(res.json.galat.kode, 'VALIDASI_GAGAL');
    assert.ok(res.json.galat.medan.kata_sandi_baru);
  }
  assert.deepEqual(await bendera(a.id), { terverifikasi: 1, wajibBuatSandi: 1 });
});

test('lintas akun: mengambil alih akun A tidak menyentuh akun B', async () => {
  const a = await akunLama();
  const b = await akunLama();
  await masukKodeEmail(a.email);
  assert.deepEqual(await bendera(b.id), { terverifikasi: 0, wajibBuatSandi: 0 });
  assert.equal((await saya(b.tokenPembuat)).status, 200);
  assert.equal((await kirim('/auth/masuk', { nama_pengguna: b.nama, kata_sandi: SANDI_LAMA })).status, 200);
});

test('bukti: tidak ada email sungguhan dan tidak ada koneksi keluar', () => {
  assert.deepEqual(koneksiKeluar, []);
});
