// LANJUT_084 (keputusan PM 22 Okt 2026) — tenggat 7 hari untuk akun lama yang emailnya belum
// terverifikasi (migrasi 028, kolom batas_verifikasi). Setelah tenggat lewat, masuk dengan kata
// sandi ditolak EMAIL_BELUM_DIVERIFIKASI; kode email dan Google tetap mengambil alih (083d).
// Uji integrasi, MySQL nyata. Pengirim email TIRUAN (bantuan.js); kunci Google buatan tes;
// 0 koneksi keluar. Akun buatan tes memakai awalan uji084_.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const path = require('path');
const tls = require('tls');

const env = require('../src/config/env');
const tokenGoogle = require('../src/modul/auth/tokenGoogle');
const { pernyataanMigrasi, DIR_MIGRASI } = require('../src/db/jalankan-migrasi');
const { nyalakanServer, urlDari, pool, acak, kodeTerakhir, kirimJson, daftarPenggunaBaru } = require('./bantuan');

const BERKAS_MIGRASI = '028_batas_verifikasi.sql';
const PESAN = 'Akun ini perlu diverifikasi dulu. Masuk dengan kode email untuk melanjutkan.';
const CLIENT_ID = 'uji084-klien.apps.googleusercontent.com';
const KID = 'kunci-uji-084';
const kunciUji = crypto.generateKeyPairSync('rsa', { modulusLength: 2048 });
const jwkUji = { ...kunciUji.publicKey.export({ format: 'jwk' }), kid: KID, alg: 'RS256', use: 'sig' };
const SANDI_LAMA = 'sandilamaorangitu1';
const SANDI_BARU = 'sandibarupemilik1';
const UJI = "(nama_pengguna LIKE 'demo\\_%' OR nama_pengguna LIKE 'uji%')";

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
const masukSandi = (nama, kata_sandi) => kirim('/auth/masuk', { nama_pengguna: nama, kata_sandi });

async function saya(token) {
  const res = await fetch(`${baseUrl}/api/v1/auth/saya`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: res.status, json: await res.json() };
}

async function keadaan(id) {
  const [b] = await pool.execute(
    'SELECT email_terverifikasi, wajib_buat_sandi, batas_verifikasi, kata_sandi_hash FROM pengguna WHERE id = ?',
    [id]
  );
  return {
    terverifikasi: Number(b[0].email_terverifikasi),
    wajibBuatSandi: Number(b[0].wajib_buat_sandi),
    batas: b[0].batas_verifikasi ? b[0].batas_verifikasi.toISOString() : null,
    hash: b[0].kata_sandi_hash,
  };
}

async function jumlahSesi(id) {
  const [[b]] = await pool.execute('SELECT COUNT(*) AS n FROM sesi_pengguna WHERE pengguna_id = ?', [id]);
  return Number(b.n);
}

/**
 * Akun lama (sebelum 083c) dengan email belum terverifikasi dan tenggat `menitDariSekarang`
 * (negatif = sudah lewat; null = tanpa tenggat). `tokenPembuat` = sesi orang yang membuatnya.
 */
async function akunLama(menitDariSekarang) {
  const nama = `uji084_${acak()}`;
  const email = `${nama}@contoh.test`;
  const { status, json } = await kirim('/auth/daftar', { nama_pengguna: nama, kata_sandi: SANDI_LAMA });
  assert.equal(status, 201);
  const id = json.data.pengguna.id;
  await pool.execute('UPDATE pengguna SET email = ?, email_terverifikasi = 0 WHERE id = ?', [email, id]);
  if (menitDariSekarang !== null) {
    await pool.execute('UPDATE pengguna SET batas_verifikasi = UTC_TIMESTAMP() + INTERVAL ? MINUTE WHERE id = ?', [
      menitDariSekarang,
      id,
    ]);
  }
  return { nama, email, id, tokenPembuat: json.data.token };
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

// ── Migrasi 028 ────────────────────────────────────────────────────────────────────────────

test('migrasi 028: kolom batas_verifikasi DATETIME nullable, diisi UTC + 7 hari hanya untuk akun non-uji', async () => {
  const isi = fs.readFileSync(path.join(DIR_MIGRASI, BERKAS_MIGRASI), 'utf8');
  assert.match(isi, /ADD COLUMN batas_verifikasi DATETIME NULL/);
  assert.match(isi, /SET batas_verifikasi = UTC_TIMESTAMP\(\) \+ INTERVAL 7 DAY/);
  assert.doesNotMatch(isi.replace(/^--.*$/gm, ''), /NOW\(\)|DELETE|status\s*=/i, 'tidak ada NOW(), hapus, atau blokir');

  const [kolom] = await pool.query(
    "SELECT DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pengguna' AND COLUMN_NAME = 'batas_verifikasi'"
  );
  assert.equal(kolom.length, 1);
  assert.equal(kolom[0].DATA_TYPE, 'datetime');
  assert.equal(kolom[0].IS_NULLABLE, 'YES');
  assert.equal(kolom[0].COLUMN_DEFAULT, null);
});

test('migrasi 028: UPDATE di berkas memilih akun yang benar (dijalankan pada akun tes dalam transaksi, lalu dibatalkan)', async () => {
  const pernyataan = pernyataanMigrasi(fs.readFileSync(path.join(DIR_MIGRASI, BERKAS_MIGRASI), 'utf8'));
  const isiUpdate = pernyataan.find((p) => p.startsWith('UPDATE pengguna'));
  assert.ok(isiUpdate, 'berkas harus mengisi tenggat');

  const buat = async () => (await kirim('/auth/daftar', { nama_pengguna: `uji084_${acak()}`, kata_sandi: SANDI_LAMA })).json.data.pengguna.id;
  const id = { target: await buat(), uji: await buat(), demo: await buat(), terverifikasi: await buat(), tanpaEmail: await buat(), sudahAda: await buat() };
  const koneksi = await pool.getConnection();
  try {
    await koneksi.query('START TRANSACTION');
    const atur = (kunci, nama, email, terverifikasi, batas = null) =>
      koneksi.query('UPDATE pengguna SET nama_pengguna = ?, email = ?, email_terverifikasi = ?, batas_verifikasi = ? WHERE id = ?', [
        nama, email, terverifikasi, batas, id[kunci],
      ]);
    const s = acak();
    await atur('target', `lama084_${s}`, `lama084_${s}@contoh.test`, 0);
    await atur('uji', `uji084_u_${s}`, `uji084_u_${s}@contoh.test`, 0);
    await atur('demo', `demo_084_${s}`, `demo_084_${s}@contoh.test`, 0);
    await atur('terverifikasi', `lama084_v_${s}`, `lama084_v_${s}@contoh.test`, 1);
    await atur('tanpaEmail', `lama084_n_${s}`, null, 0);
    await atur('sudahAda', `lama084_a_${s}`, `lama084_a_${s}@contoh.test`, 0, '2030-01-01 00:00:00');

    const semua = Object.values(id);
    const [[{ waktu }]] = await koneksi.query('SELECT UTC_TIMESTAMP() AS waktu');
    await koneksi.query(`${isiUpdate} AND id IN (${semua.map(() => '?').join(', ')})`, semua);
    const [baris] = await koneksi.query(`SELECT id, batas_verifikasi FROM pengguna WHERE id IN (${semua.map(() => '?').join(', ')})`, semua);
    const batas = Object.fromEntries(baris.map((b) => [b.id, b.batas_verifikasi]));

    const selisihHari = (batas[id.target] - waktu) / 86400e3;
    assert.ok(selisihHari > 6.999 && selisihHari < 7.001, `tenggat = sekarang (UTC) + 7 hari, dapat ${selisihHari} hari`);
    assert.equal(batas[id.uji], null, 'akun uji... tidak diberi tenggat');
    assert.equal(batas[id.demo], null, 'akun demo_ tidak diberi tenggat');
    assert.equal(batas[id.terverifikasi], null, 'email terverifikasi tidak diberi tenggat');
    assert.equal(batas[id.tanpaEmail], null, 'akun tanpa email tidak diberi tenggat');
    assert.equal(batas[id.sudahAda].toISOString(), '2030-01-01T00:00:00.000Z', 'tenggat yang sudah ada tidak ditimpa');
  } finally {
    await koneksi.query('ROLLBACK');
    koneksi.release();
  }
});

test('basis data: setiap akun non-uji dengan email belum terverifikasi sudah punya tenggat', async () => {
  const [[b]] = await pool.query(
    `SELECT COUNT(*) AS n FROM pengguna
      WHERE email IS NOT NULL AND email_terverifikasi = 0 AND batas_verifikasi IS NULL AND NOT ${UJI}`
  );
  assert.equal(Number(b.n), 0);
});

// ── Login kata sandi ───────────────────────────────────────────────────────────────────────

test('tenggat lewat: kata sandi yang benar ditolak EMAIL_BELUM_DIVERIFIKASI tanpa sesi; tebakan salah tetap KREDENSIAL_SALAH', async () => {
  const a = await akunLama(-1);
  const sebelum = await keadaan(a.id);
  const sesiSebelum = await jumlahSesi(a.id);

  const benar = await masukSandi(a.nama, SANDI_LAMA);
  assert.equal(benar.status, 403);
  assert.equal(benar.json.galat.kode, 'EMAIL_BELUM_DIVERIFIKASI');
  assert.equal(benar.json.galat.pesan, PESAN);
  assert.equal(benar.json.data, undefined);
  assert.equal(await jumlahSesi(a.id), sesiSebelum, 'tidak ada sesi baru');

  const salah = await masukSandi(a.nama, 'bukansandinya1');
  assert.equal(salah.status, 401);
  assert.equal(salah.json.galat.kode, 'KREDENSIAL_SALAH');
  assert.deepEqual(await keadaan(a.id), sebelum, 'akun tidak dihapus, diblokir, atau diubah');
});

test('masih dalam tenggat: masuk dengan kata sandi berhasil seperti biasa, akun tidak berubah', async () => {
  for (const menit of [7 * 24 * 60, 1]) {
    const a = await akunLama(menit);
    const sebelum = await keadaan(a.id);
    const res = await masukSandi(a.nama, SANDI_LAMA);
    assert.equal(res.status, 200, `tenggat +${menit} menit`);
    assert.equal(res.json.data.pengguna.id, a.id);
    assert.equal(res.json.data.pengguna.email_terverifikasi, false);
    assert.equal(res.json.data.pengguna.perlu_sandi_baru, false);
    assert.deepEqual(await keadaan(a.id), sebelum);
    assert.equal((await saya(a.tokenPembuat)).status, 200, 'sesi yang ada tidak dicabut');
  }
});

test('tanpa tenggat (NULL): akun belum terverifikasi tetap bisa masuk dengan kata sandi', async () => {
  const a = await akunLama(null);
  const res = await masukSandi(a.nama, SANDI_LAMA);
  assert.equal(res.status, 200);
  assert.equal((await keadaan(a.id)).batas, null);
});

test('email sudah terverifikasi: tenggat yang lewat tidak berpengaruh', async () => {
  const nama = `uji084_v_${acak()}`;
  const daftar = await daftarPenggunaBaru(baseUrl, { nama_pengguna: nama, kata_sandi: SANDI_LAMA, email: `${nama}@contoh.test` });
  assert.equal(daftar.status, 201);
  await pool.execute('UPDATE pengguna SET batas_verifikasi = UTC_TIMESTAMP() - INTERVAL 1 DAY WHERE id = ?', [daftar.json.data.pengguna.id]);
  assert.equal((await masukSandi(nama, SANDI_LAMA)).status, 200);
});

// ── Kode email dan Google tidak berubah ─────────────────────────────────────────────────────

test('tenggat lewat: masuk kode email tetap mengambil alih (083d); setelah sandi baru dibuat, kata sandi baru bisa dipakai', async () => {
  const a = await akunLama(-60);
  const { status, json } = await masukKodeEmail(a.email);
  assert.equal(status, 200);
  assert.equal(json.data.pengguna.id, a.id);
  assert.equal(json.data.perlu_sandi_baru, true);
  assert.equal(json.data.pengguna.email_terverifikasi, true);
  assert.equal((await saya(a.tokenPembuat)).status, 401, 'sesi pembuat dicabut seperti 083d');

  // Sebelum sandi baru: kata sandi lama → SANDI_PERLU_DIBUAT (083d), bukan galat tenggat.
  assert.equal((await masukSandi(a.nama, SANDI_LAMA)).json.galat.kode, 'SANDI_PERLU_DIBUAT');

  const buat = await kirim('/auth/sandi/buat', { kata_sandi_baru: SANDI_BARU }, json.data.token);
  assert.equal(buat.status, 200);
  const baru = await masukSandi(a.nama, SANDI_BARU);
  assert.equal(baru.status, 200, 'email sudah terverifikasi, tenggat tidak berlaku lagi');
  assert.equal((await masukSandi(a.nama, SANDI_LAMA)).json.galat.kode, 'KREDENSIAL_SALAH');
});

test('tenggat lewat: masuk Google tetap mengambil alih (083d)', async () => {
  const a = await akunLama(-60);
  const { status, json } = await masukGoogle(a.email);
  assert.equal(status, 200);
  assert.equal(json.data.akun_baru, false);
  assert.equal(json.data.pengguna.id, a.id);
  assert.equal(json.data.perlu_sandi_baru, true);
  const k = await keadaan(a.id);
  assert.equal(k.terverifikasi, 1);
  assert.equal(k.wajibBuatSandi, 1);
  assert.equal((await saya(a.tokenPembuat)).status, 401);
});

test('lintas akun: tenggat akun A yang lewat tidak menyentuh akun B yang masih dalam tenggat', async () => {
  const a = await akunLama(-1);
  const b = await akunLama(60);
  assert.equal((await masukSandi(a.nama, SANDI_LAMA)).json.galat.kode, 'EMAIL_BELUM_DIVERIFIKASI');
  assert.equal((await masukSandi(b.nama, SANDI_LAMA)).status, 200);
});

// ── Teks app ───────────────────────────────────────────────────────────────────────────────

test('app: pesan EMAIL_BELUM_DIVERIFIKASI sama dengan teks DRAF dari task', () => {
  const auth = fs.readFileSync(path.join(__dirname, '..', '..', 'api', 'auth.ts'), 'utf8');
  assert.ok(auth.includes(`EMAIL_BELUM_DIVERIFIKASI: '${PESAN}',`));
});

test('bukti: tidak ada email sungguhan dan tidak ada koneksi keluar', () => {
  assert.deepEqual(koneksiKeluar, []);
});
