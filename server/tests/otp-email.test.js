// LANJUT_083 — masuk dengan kode email (OTP). Uji integrasi dengan MySQL nyata.
// Pengirim email SELALU tiruan (dipasang tests/bantuan.js sebelum server menyala; sejak
// LANJUT_083c dipakai bersama semua tes), dan net/tls.connect diawasi — tidak boleh ada satu
// pun koneksi keluar selama berkas ini. Akun uji dibuat lewat daftar dengan kode email (083c).

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const net = require('net');
const tls = require('tls');
const bcrypt = require('bcryptjs');

const pengirimOtp = require('../src/modul/auth/pengirimOtp');
const { hashEmail } = require('../src/modul/auth/otp.layanan');
const { nyalakanServer, urlDari, pool, acak, daftarPenggunaBaru, suratTiruan } = require('./bantuan');

let server;
let baseUrl;
/** Email kode MASUK yang "terkirim" (kode daftar dari pembuatan akun uji tidak dihitung). */
const terkirimMasuk = () => suratTiruan.filter((s) => s.tujuan === 'masuk');
const koneksiKeluar = [];
const asliConnect = { net: net.connect, tls: tls.connect };

// Host tujuan dari argumen net/tls.connect: (opsi) atau (port, host, ...).
function hostDari(arg) {
  if (arg[0] && typeof arg[0] === 'object') return arg[0].host || 'localhost';
  return typeof arg[1] === 'string' ? arg[1] : 'localhost';
}
const HOST_LOKAL = ['localhost', '127.0.0.1', '::1'];

before(async () => {
  assert.equal(pengirimOtp.siap(), true, 'pengirim tiruan dari bantuan.js terpasang');
  // MySQL & fetch tes ke 127.0.0.1 boleh; selain itu dicatat sebagai koneksi keluar.
  net.connect = (...a) => {
    if (!HOST_LOKAL.includes(hostDari(a))) koneksiKeluar.push(`net:${hostDari(a)}`);
    return asliConnect.net(...a);
  };
  tls.connect = (...a) => {
    if (!HOST_LOKAL.includes(hostDari(a))) koneksiKeluar.push(`tls:${hostDari(a)}`);
    return asliConnect.tls(...a);
  };
  server = await nyalakanServer();
  baseUrl = urlDari(server);
});

after(async () => {
  net.connect = asliConnect.net;
  tls.connect = asliConnect.tls;
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

async function kirim(jalur, body) {
  const res = await fetch(`${baseUrl}/api/v1/auth/${jalur}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

/** Akun uji083_ dengan email (dibuat lewat kode email, LANJUT_083c); mengembalikan nama, sandi, email, id. */
async function akunBaru() {
  const nama = `uji083_${acak()}`;
  const email = `${nama}@contoh.test`;
  const { status, json } = await daftarPenggunaBaru(baseUrl, { nama_pengguna: nama, kata_sandi: 'sandiujiaman1', email });
  assert.equal(status, 201);
  return { nama, email, kataSandi: 'sandiujiaman1', id: json.data.pengguna.id };
}

function emailAsing() {
  return `uji083_tidakada_${acak()}@contoh.test`;
}

/** Kode terakhir yang "terkirim" ke email ini lewat pengirim tiruan. */
async function kodeUntuk(email) {
  for (let i = 0; i < 50; i += 1) {
    const ada = terkirimMasuk().filter((t) => t.email === email);
    if (ada.length > 0) return ada[ada.length - 1].kode;
    await new Promise((r) => setTimeout(r, 20));
  }
  return null;
}

function kodeLain(kode) {
  return String((Number(kode) + 1) % 1000000).padStart(6, '0');
}

test('kirim: email terdaftar → 200, satu email berisi kode 6 angka dikirim ke alamat itu', async () => {
  const akun = await akunBaru();
  const { status, json } = await kirim('otp/kirim', { email: akun.email });
  assert.equal(status, 200);
  assert.deepEqual(json.data, { diproses: true, berlaku_detik: 300 });
  const kode = await kodeUntuk(akun.email);
  assert.match(kode, /^\d{6}$/);
  assert.equal(terkirimMasuk().filter((t) => t.email === akun.email).length, 1);
});

test('kirim: email tidak terdaftar → respons identik, tetapi tidak ada email yang dikirim', async () => {
  const akun = await akunBaru();
  const asing = emailAsing();
  const terdaftar = await kirim('otp/kirim', { email: akun.email });
  const tidak = await kirim('otp/kirim', { email: asing });
  assert.equal(tidak.status, terdaftar.status);
  assert.deepEqual(tidak.json, terdaftar.json);
  await new Promise((r) => setTimeout(r, 100));
  assert.equal(suratTiruan.some((t) => t.email === asing), false);
});

test('kode disimpan sebagai hash bcrypt (bukan teks), email sebagai SHA-256, berlaku 5 menit', async () => {
  const akun = await akunBaru();
  await kirim('otp/kirim', { email: akun.email });
  const kode = await kodeUntuk(akun.email);
  const [baris] = await pool.execute(
    `SELECT kode_hash, email_hash, TIMESTAMPDIFF(SECOND, dibuat_pada, kedaluwarsa_pada) AS umur
       FROM kode_otp_email WHERE email_hash = ? AND tujuan = 'masuk'`,
    [hashEmail(akun.email)]
  );
  assert.equal(baris.length, 1);
  assert.notEqual(baris[0].kode_hash, kode);
  assert.ok(!baris[0].kode_hash.includes(kode));
  assert.match(baris[0].kode_hash, /^\$2[aby]\$/);
  assert.equal(await bcrypt.compare(kode, baris[0].kode_hash), true);
  assert.ok(!baris[0].email_hash.includes('@'));
  assert.equal(Number(baris[0].umur), 300);
});

test('verifikasi: kode benar → token sesi yang sama bentuknya dengan login kata sandi', async () => {
  const akun = await akunBaru();
  await kirim('otp/kirim', { email: akun.email });
  const { status, json } = await kirim('otp/verifikasi', { email: akun.email, kode: await kodeUntuk(akun.email) });
  assert.equal(status, 200);
  assert.ok(json.data.token);
  assert.ok(json.data.kedaluwarsa_pada);
  assert.equal(json.data.pengguna.id, akun.id);
  assert.equal(json.data.pengguna.kata_sandi_hash, undefined);

  const saya = await fetch(`${baseUrl}/api/v1/auth/saya`, { headers: { Authorization: `Bearer ${json.data.token}` } });
  assert.equal(saya.status, 200);
  assert.equal((await saya.json()).data.id, akun.id);
});

test('verifikasi: kode hanya bisa dipakai sekali', async () => {
  const akun = await akunBaru();
  await kirim('otp/kirim', { email: akun.email });
  const kode = await kodeUntuk(akun.email);
  assert.equal((await kirim('otp/verifikasi', { email: akun.email, kode })).status, 200);
  const kedua = await kirim('otp/verifikasi', { email: akun.email, kode });
  assert.equal(kedua.status, 401);
  assert.equal(kedua.json.galat.kode, 'KODE_KEDALUWARSA');
});

test('verifikasi: kode salah → 401 KODE_SALAH dengan galat.kode, pesan, medan', async () => {
  const akun = await akunBaru();
  await kirim('otp/kirim', { email: akun.email });
  const kode = await kodeUntuk(akun.email);
  const { status, json } = await kirim('otp/verifikasi', { email: akun.email, kode: kodeLain(kode) });
  assert.equal(status, 401);
  assert.equal(json.ok, false);
  assert.equal(json.galat.kode, 'KODE_SALAH');
  assert.equal(typeof json.galat.pesan, 'string');
  assert.ok(json.galat.medan.kode);
  assert.equal(json.data, undefined);
});

test('verifikasi: kode kedaluwarsa (lewat 5 menit) → 401 KODE_KEDALUWARSA walau kodenya benar', async () => {
  const akun = await akunBaru();
  await kirim('otp/kirim', { email: akun.email });
  const kode = await kodeUntuk(akun.email);
  await pool.execute(
    `UPDATE kode_otp_email SET kedaluwarsa_pada = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE)
      WHERE email_hash = ? AND selesai_pada IS NULL`,
    [hashEmail(akun.email)]
  );
  const { status, json } = await kirim('otp/verifikasi', { email: akun.email, kode });
  assert.equal(status, 401);
  assert.equal(json.galat.kode, 'KODE_KEDALUWARSA');
  assert.ok(json.galat.medan.kode);
});

test('lima percobaan salah → kode hangus; kode yang benar pun ditolak sesudahnya', async () => {
  const akun = await akunBaru();
  await kirim('otp/kirim', { email: akun.email });
  const kode = await kodeUntuk(akun.email);
  for (let i = 0; i < 5; i += 1) {
    const salah = await kirim('otp/verifikasi', { email: akun.email, kode: kodeLain(kode) });
    assert.equal(salah.status, 401);
    assert.equal(salah.json.galat.kode, 'KODE_SALAH');
  }
  const benar = await kirim('otp/verifikasi', { email: akun.email, kode });
  assert.equal(benar.status, 401);
  assert.equal(benar.json.galat.kode, 'KODE_KEDALUWARSA');
  assert.equal(benar.json.data, undefined);
});

test('empat percobaan salah lalu kode benar → masih bisa masuk (batasnya 5)', async () => {
  const akun = await akunBaru();
  await kirim('otp/kirim', { email: akun.email });
  const kode = await kodeUntuk(akun.email);
  for (let i = 0; i < 4; i += 1) await kirim('otp/verifikasi', { email: akun.email, kode: kodeLain(kode) });
  const benar = await kirim('otp/verifikasi', { email: akun.email, kode });
  assert.equal(benar.status, 200);
  assert.ok(benar.json.data.token);
});

test('batas kirim: 3 kode per email per 15 menit; ke-4 → 429, sama untuk email tidak terdaftar', async () => {
  const akun = await akunBaru();
  const asing = emailAsing();
  for (const email of [akun.email, asing]) {
    for (let i = 0; i < 3; i += 1) assert.equal((await kirim('otp/kirim', { email })).status, 200);
    const keempat = await kirim('otp/kirim', { email });
    assert.equal(keempat.status, 429);
    assert.equal(keempat.json.galat.kode, 'TERLALU_SERING');
    assert.ok(keempat.json.galat.medan.email);
  }
  assert.equal(terkirimMasuk().filter((t) => t.email === akun.email).length, 3);
  assert.equal(suratTiruan.filter((t) => t.email === asing).length, 0);
});

test('kode baru menggantikan kode lama: kode lama tidak berlaku lagi', async () => {
  const akun = await akunBaru();
  await kirim('otp/kirim', { email: akun.email });
  const lama = await kodeUntuk(akun.email);
  await kirim('otp/kirim', { email: akun.email });
  const baru = terkirimMasuk().filter((t) => t.email === akun.email)[1].kode;
  if (lama !== baru) {
    const pakaiLama = await kirim('otp/verifikasi', { email: akun.email, kode: lama });
    assert.equal(pakaiLama.status, 401);
  }
  assert.equal((await kirim('otp/verifikasi', { email: akun.email, kode: baru })).status, 200);
});

test('email tidak terdaftar: jawaban verifikasi sama persis dengan kode salah untuk email terdaftar', async () => {
  const akun = await akunBaru();
  const asing = emailAsing();
  await kirim('otp/kirim', { email: akun.email });
  await kirim('otp/kirim', { email: asing });
  const kode = await kodeUntuk(akun.email);
  const terdaftar = await kirim('otp/verifikasi', { email: akun.email, kode: kodeLain(kode) });
  const tidak = await kirim('otp/verifikasi', { email: asing, kode: kodeLain(kode) });
  assert.equal(tidak.status, terdaftar.status);
  assert.deepEqual(tidak.json, terdaftar.json);

  // Tanpa permintaan kode sama sekali: sama dengan kode terdaftar yang sudah tidak berlaku.
  const tanpaKode = await kirim('otp/verifikasi', { email: emailAsing(), kode: '123456' });
  assert.equal(tanpaKode.status, 401);
  assert.equal(tanpaKode.json.galat.kode, 'KODE_KEDALUWARSA');
});

test('lintas akun: kode milik email A tidak bisa dipakai untuk masuk ke akun B', async () => {
  const a = await akunBaru();
  const b = await akunBaru();
  await kirim('otp/kirim', { email: a.email });
  await kirim('otp/kirim', { email: b.email });
  const kodeA = await kodeUntuk(a.email);
  const kodeB = await kodeUntuk(b.email);
  if (kodeA !== kodeB) {
    const silang = await kirim('otp/verifikasi', { email: b.email, kode: kodeA });
    assert.equal(silang.status, 401);
    assert.equal(silang.json.data, undefined);
  }
  const milikA = await kirim('otp/verifikasi', { email: a.email, kode: kodeA });
  assert.equal(milikA.json.data.pengguna.id, a.id);
});

test('kode tidak pernah tercatat di log (console & stdout/stderr) selama kirim dan verifikasi', async () => {
  const akun = await akunBaru();
  const tercatat = [];
  const asli = {
    log: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
    debug: console.debug,
    out: process.stdout.write,
    err: process.stderr.write,
  };
  for (const nama of ['log', 'info', 'warn', 'error', 'debug']) {
    console[nama] = (...a) => {
      tercatat.push(a.map(String).join(' '));
      asli[nama].apply(console, a);
    };
  }
  process.stdout.write = function (chunk, ...rest) {
    tercatat.push(String(chunk));
    return asli.out.call(this, chunk, ...rest);
  };
  process.stderr.write = function (chunk, ...rest) {
    tercatat.push(String(chunk));
    return asli.err.call(this, chunk, ...rest);
  };
  let kode;
  try {
    await kirim('otp/kirim', { email: akun.email });
    kode = await kodeUntuk(akun.email);
    await kirim('otp/verifikasi', { email: akun.email, kode: kodeLain(kode) });
    await kirim('otp/verifikasi', { email: akun.email, kode });
  } finally {
    Object.assign(console, { log: asli.log, info: asli.info, warn: asli.warn, error: asli.error, debug: asli.debug });
    process.stdout.write = asli.out;
    process.stderr.write = asli.err;
  }
  assert.ok(tercatat.length > 0, 'log akses seharusnya tertangkap');
  const semua = tercatat.join('\n');
  assert.equal(semua.includes(kode), false);
  assert.equal(semua.includes(akun.email), false);
});

test('login kata sandi tetap berfungsi untuk akun yang juga memakai kode email', async () => {
  const akun = await akunBaru();
  await kirim('otp/kirim', { email: akun.email });
  assert.equal((await kirim('otp/verifikasi', { email: akun.email, kode: await kodeUntuk(akun.email) })).status, 200);
  const masuk = await kirim('masuk', { nama_pengguna: akun.nama, kata_sandi: akun.kataSandi });
  assert.equal(masuk.status, 200);
  assert.equal(masuk.json.data.pengguna.id, akun.id);
  const salah = await kirim('masuk', { nama_pengguna: akun.nama, kata_sandi: 'bukansandinya1' });
  assert.equal(salah.status, 401);
  assert.equal(salah.json.galat.kode, 'KREDENSIAL_SALAH');
});

test('email ditulis dengan huruf besar tetap cocok dengan akun yang sama', async () => {
  const akun = await akunBaru();
  await kirim('otp/kirim', { email: akun.email.toUpperCase() });
  const kode = await kodeUntuk(akun.email);
  assert.match(kode, /^\d{6}$/);
  const { status, json } = await kirim('otp/verifikasi', { email: `  ${akun.email.toUpperCase()} `, kode });
  assert.equal(status, 200);
  assert.equal(json.data.pengguna.id, akun.id);
});

test('validasi: email tidak valid dan kode bukan 6 angka → 400 VALIDASI_GAGAL dengan medan', async () => {
  const a = await kirim('otp/kirim', { email: 'bukan-email' });
  assert.equal(a.status, 400);
  assert.equal(a.json.galat.kode, 'VALIDASI_GAGAL');
  assert.ok(a.json.galat.medan.email);
  const b = await kirim('otp/verifikasi', { email: 'a@contoh.test', kode: '12ab' });
  assert.equal(b.status, 400);
  assert.ok(b.json.galat.medan.kode);
});

test('SMTP belum diisi → 503 OTP_TIDAK_TERSEDIA untuk email apa pun, tanpa menyimpan kode', async () => {
  const akun = await akunBaru();
  const siapAsli = pengirimOtp.siap;
  pengirimOtp.siap = () => false;
  try {
    for (const email of [akun.email, emailAsing()]) {
      const { status, json } = await kirim('otp/kirim', { email });
      assert.equal(status, 503);
      assert.equal(json.galat.kode, 'OTP_TIDAK_TERSEDIA');
    }
  } finally {
    pengirimOtp.siap = siapAsli;
  }
  const [baris] = await pool.execute("SELECT id FROM kode_otp_email WHERE email_hash = ? AND tujuan = 'masuk'", [hashEmail(akun.email)]);
  assert.equal(baris.length, 0);
});

test('bukti: tidak ada email sungguhan — pengirim tiruan dipakai dan tidak ada koneksi SMTP keluar', async () => {
  assert.ok(terkirimMasuk().length > 0);
  assert.deepEqual(koneksiKeluar, []);
});
