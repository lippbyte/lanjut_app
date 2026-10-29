// LANJUT_083c — daftar dengan email: akun baru hanya dibuat setelah kode yang dikirim ke email
// itu benar; email terdaftar tidak bocor; akun lama tidak diblokir. Uji integrasi, MySQL nyata.
// Pengirim email TIRUAN (tests/bantuan.js); net/tls.connect diawasi: 0 koneksi keluar.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const net = require('net');
const tls = require('tls');

const { hashEmail } = require('../src/modul/auth/otp.layanan');
const { bersihkanPendaftaranKedaluwarsa } = require('../src/modul/auth/daftarEmail.layanan');
const { nyalakanServer, urlDari, pool, acak, suratTiruan, kodeTerakhir, kirimJson, daftarPenggunaBaru } = require('./bantuan');

let server;
let baseUrl;
const koneksiKeluar = [];
const asliConnect = { net: net.connect, tls: tls.connect };
const HOST_LOKAL = ['localhost', '127.0.0.1', '::1'];
const hostDari = (a) => (a[0] && typeof a[0] === 'object' ? a[0].host || 'localhost' : typeof a[1] === 'string' ? a[1] : 'localhost');

before(async () => {
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

const kirim = (jalur, body, token) => kirimJson(baseUrl, jalur, body, token);
const SANDI = 'sandiujiaman1';

function dataDaftar(override = {}) {
  const nama = `uji083c_${acak()}`;
  return { nama_pengguna: nama, kata_sandi: SANDI, email: `${nama}@contoh.test`, kelas: '12', jenis_sekolah: 'SMK', ...override };
}

const kodeLain = (kode) => String((Number(kode) + 1) % 1000000).padStart(6, '0');

async function jumlahAkun(kolom, nilai) {
  const [b] = await pool.execute(`SELECT COUNT(*) AS n FROM pengguna WHERE ${kolom === 'email' ? 'email' : 'nama_pengguna'} = ?`, [nilai]);
  return Number(b[0].n);
}

async function barisTertunda(email) {
  const [b] = await pool.execute('SELECT * FROM pendaftaran_tertunda WHERE email_hash = ?', [hashEmail(email)]);
  return b;
}

/** Akun lama (sebelum 083c): dibuat tanpa email lewat daftar langsung, lalu email diisi tanpa verifikasi. */
async function akunLama() {
  const nama = `uji083c_lama_${acak()}`;
  const email = `${nama}@contoh.test`;
  const { status, json } = await kirim('/auth/daftar', { nama_pengguna: nama, kata_sandi: SANDI });
  assert.equal(status, 201);
  await pool.execute('UPDATE pengguna SET email = ?, email_terverifikasi = 0 WHERE id = ?', [email, json.data.pengguna.id]);
  return { nama, email, id: json.data.pengguna.id, token: json.data.token };
}

test('kirim-kode: akun BELUM dibuat; data sementara tersimpan (email SHA-256, sandi bcrypt); kode daftar terkirim', async () => {
  const d = dataDaftar();
  const { status, json } = await kirim('/auth/daftar/kirim-kode', d);
  assert.equal(status, 200);
  assert.deepEqual(json.data, { diproses: true, berlaku_detik: 300 });

  assert.equal(await jumlahAkun('nama', d.nama_pengguna), 0);
  assert.equal(await jumlahAkun('email', d.email), 0);
  const masuk = await kirim('/auth/masuk', { nama_pengguna: d.nama_pengguna, kata_sandi: SANDI });
  assert.equal(masuk.status, 401);

  const tertunda = await barisTertunda(d.email);
  assert.equal(tertunda.length, 1);
  assert.match(tertunda[0].kata_sandi_hash, /^\$2[aby]\$/);
  assert.ok(!JSON.stringify(tertunda[0]).includes('@'), 'email tidak tersimpan sebagai teks');
  assert.ok(!JSON.stringify(tertunda[0]).includes(SANDI), 'kata sandi tidak tersimpan sebagai teks');
  assert.match(await kodeTerakhir(d.email, 'daftar'), /^\d{6}$/);
});

test('kode benar: akun dibuat dengan email_terverifikasi, data dari pendaftaran, sesi seperti login; data sementara dihapus', async () => {
  const d = dataDaftar({ nama_tampilan: 'Uji Daftar' });
  await kirim('/auth/daftar/kirim-kode', d);
  const { status, json } = await kirim('/auth/daftar/verifikasi', { email: d.email, kode: await kodeTerakhir(d.email, 'daftar') });
  assert.equal(status, 201);
  assert.ok(json.data.token && json.data.kedaluwarsa_pada);
  const p = json.data.pengguna;
  assert.equal(p.nama_pengguna, d.nama_pengguna);
  assert.equal(p.nama_tampilan, 'Uji Daftar');
  assert.equal(p.email, d.email);
  assert.equal(p.email_terverifikasi, true);
  assert.equal(p.kelas, '12');
  assert.equal(p.jenis_sekolah, 'SMK');
  assert.equal(p.kata_sandi_hash, undefined);

  const saya = await fetch(`${baseUrl}/api/v1/auth/saya`, { headers: { Authorization: `Bearer ${json.data.token}` } });
  assert.equal((await saya.json()).data.id, p.id);
  assert.equal((await barisTertunda(d.email)).length, 0);
  const masuk = await kirim('/auth/masuk', { nama_pengguna: d.nama_pengguna, kata_sandi: SANDI });
  assert.equal(masuk.status, 200);
  assert.equal(masuk.json.data.pengguna.id, p.id);
});

test('kode salah → 401 KODE_SALAH (galat.kode, pesan, medan); akun tidak dibuat', async () => {
  const d = dataDaftar();
  await kirim('/auth/daftar/kirim-kode', d);
  const { status, json } = await kirim('/auth/daftar/verifikasi', { email: d.email, kode: kodeLain(await kodeTerakhir(d.email, 'daftar')) });
  assert.equal(status, 401);
  assert.equal(json.galat.kode, 'KODE_SALAH');
  assert.ok(json.galat.pesan && json.galat.medan.kode);
  assert.equal(await jumlahAkun('email', d.email), 0);
});

test('kode kedaluwarsa (lewat 5 menit) → 401 KODE_KEDALUWARSA walau benar; akun tidak dibuat', async () => {
  const d = dataDaftar();
  await kirim('/auth/daftar/kirim-kode', d);
  const kode = await kodeTerakhir(d.email, 'daftar');
  await pool.execute(
    `UPDATE kode_otp_email SET kedaluwarsa_pada = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE)
      WHERE email_hash = ? AND tujuan = 'daftar' AND selesai_pada IS NULL`,
    [hashEmail(d.email)]
  );
  const { status, json } = await kirim('/auth/daftar/verifikasi', { email: d.email, kode });
  assert.equal(status, 401);
  assert.equal(json.galat.kode, 'KODE_KEDALUWARSA');
  assert.equal(await jumlahAkun('email', d.email), 0);
});

test('lima percobaan salah menghanguskan kode: kode benar pun ditolak, akun tidak dibuat', async () => {
  const d = dataDaftar();
  await kirim('/auth/daftar/kirim-kode', d);
  const kode = await kodeTerakhir(d.email, 'daftar');
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await kirim('/auth/daftar/verifikasi', { email: d.email, kode: kodeLain(kode) })).json.galat.kode, 'KODE_SALAH');
  }
  const benar = await kirim('/auth/daftar/verifikasi', { email: d.email, kode });
  assert.equal(benar.status, 401);
  assert.equal(benar.json.galat.kode, 'KODE_KEDALUWARSA');
  assert.equal(await jumlahAkun('email', d.email), 0);
});

test('batas kirim: 3 kode daftar per email per 15 menit, ke-4 → 429; sama untuk email yang sudah terdaftar', async () => {
  const baru = dataDaftar();
  // Akun lama: belum memakai jatah kode daftar untuk emailnya (akun lewat kode sudah memakai satu).
  const terdaftar = await akunLama();
  for (const email of [baru.email, terdaftar.email]) {
    for (let i = 0; i < 3; i += 1) {
      assert.equal((await kirim('/auth/daftar/kirim-kode', dataDaftar({ email }))).status, 200);
    }
    const keempat = await kirim('/auth/daftar/kirim-kode', dataDaftar({ email }));
    assert.equal(keempat.status, 429);
    assert.equal(keempat.json.galat.kode, 'TERLALU_SERING');
  }
});

test('email terdaftar tidak bocor: jawaban sama dengan email baru, tidak ada kode terkirim, tidak ada akun kedua', async () => {
  const lama = dataDaftar();
  assert.equal((await daftarPenggunaBaru(baseUrl, lama)).status, 201);
  const kodeSebelum = suratTiruan.filter((s) => s.email === lama.email && s.tujuan === 'daftar').length;

  const keEmailBaru = await kirim('/auth/daftar/kirim-kode', dataDaftar());
  const keEmailTerdaftar = await kirim('/auth/daftar/kirim-kode', dataDaftar({ email: lama.email }));
  assert.equal(keEmailTerdaftar.status, keEmailBaru.status);
  assert.deepEqual(keEmailTerdaftar.json, keEmailBaru.json);

  await new Promise((r) => setTimeout(r, 100));
  assert.equal(suratTiruan.filter((s) => s.email === lama.email && s.tujuan === 'daftar').length, kodeSebelum);
  const tebak = await kirim('/auth/daftar/verifikasi', { email: lama.email, kode: '123456' });
  assert.equal(tebak.status, 401);
  assert.equal(await jumlahAkun('email', lama.email), 1);
});

test('data sementara dihapus setelah 30 menit: verifikasi ditolak, dan pembersih berkala menghapusnya', async () => {
  const a = dataDaftar();
  await kirim('/auth/daftar/kirim-kode', a);
  const kodeA = await kodeTerakhir(a.email, 'daftar');
  await pool.execute('UPDATE pendaftaran_tertunda SET kedaluwarsa_pada = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) WHERE email_hash = ?', [hashEmail(a.email)]);
  const v = await kirim('/auth/daftar/verifikasi', { email: a.email, kode: kodeA });
  assert.equal(v.status, 401);
  assert.equal(v.json.galat.kode, 'KODE_KEDALUWARSA');
  assert.equal((await barisTertunda(a.email)).length, 0);
  assert.equal(await jumlahAkun('email', a.email), 0);

  // Pembersih berkala (index.js, tiap 5 menit) menghapus data yang lewat 30 menit tanpa permintaan baru.
  const b = dataDaftar();
  await kirim('/auth/daftar/kirim-kode', b);
  await pool.execute('UPDATE pendaftaran_tertunda SET kedaluwarsa_pada = DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 MINUTE) WHERE email_hash = ?', [hashEmail(b.email)]);
  assert.ok((await bersihkanPendaftaranKedaluwarsa()) >= 1);
  assert.equal((await barisTertunda(b.email)).length, 0);

  // Yang belum lewat 30 menit tidak ikut terhapus.
  const c = dataDaftar();
  await kirim('/auth/daftar/kirim-kode', c);
  await bersihkanPendaftaranKedaluwarsa();
  assert.equal((await barisTertunda(c.email)).length, 1);
});

test('akun lama dengan email belum terverifikasi tetap bisa masuk dengan kata sandi (tidak diblokir)', async () => {
  const lama = await akunLama();
  const masuk = await kirim('/auth/masuk', { nama_pengguna: lama.nama, kata_sandi: SANDI });
  assert.equal(masuk.status, 200);
  assert.equal(masuk.json.data.pengguna.id, lama.id);
  assert.equal(masuk.json.data.pengguna.email_terverifikasi, false);
  const [b] = await pool.execute('SELECT status FROM pengguna WHERE id = ?', [lama.id]);
  assert.equal(b[0].status, 'aktif');
});

test('verifikasi email akun lama: kode ke email akunnya sendiri; akun lain tidak bisa memakainya (lintas akun)', async () => {
  const a = await akunLama();
  const b = await akunLama();
  assert.equal((await kirim('/auth/email/kirim-kode', {})).status, 401, 'wajib masuk');

  const minta = await kirim('/auth/email/kirim-kode', {}, a.token);
  assert.equal(minta.status, 200);
  const kodeA = await kodeTerakhir(a.email, 'verifikasi');
  assert.match(kodeA, /^\d{6}$/);

  const silang = await kirim('/auth/email/verifikasi', { kode: kodeA }, b.token);
  assert.equal(silang.status, 401);
  const [bb] = await pool.execute('SELECT email_terverifikasi FROM pengguna WHERE id = ?', [b.id]);
  assert.equal(Number(bb[0].email_terverifikasi), 0);

  const v = await kirim('/auth/email/verifikasi', { kode: kodeA }, a.token);
  assert.equal(v.status, 200);
  assert.equal(v.json.data.id, a.id);
  assert.equal(v.json.data.email_terverifikasi, true);
  const lagi = await kirim('/auth/email/kirim-kode', {}, a.token);
  assert.deepEqual(lagi.json.data, { sudah_terverifikasi: true });
});

test('kode daftar tidak berlaku untuk masuk, dan kode masuk tidak berlaku untuk daftar', async () => {
  const d = dataDaftar();
  await kirim('/auth/daftar/kirim-kode', d);
  const kodeDaftar = await kodeTerakhir(d.email, 'daftar');
  assert.equal((await kirim('/auth/otp/verifikasi', { email: d.email, kode: kodeDaftar })).status, 401);

  const ada = dataDaftar();
  assert.equal((await daftarPenggunaBaru(baseUrl, ada)).status, 201);
  await kirim('/auth/otp/kirim', { email: ada.email });
  const kodeMasuk = await kodeTerakhir(ada.email, 'masuk');
  assert.equal((await kirim('/auth/daftar/verifikasi', { email: ada.email, kode: kodeMasuk })).status, 401);
  assert.equal(await jumlahAkun('email', ada.email), 1);
});

test('nama pengguna dipakai → 409 sebelum kode dikirim (tidak bergantung pada email); daftar tanpa email tetap langsung', async () => {
  const lama = await akunLama();
  const res = await kirim('/auth/daftar/kirim-kode', dataDaftar({ nama_pengguna: lama.nama }));
  assert.equal(res.status, 409);
  assert.equal(res.json.galat.kode, 'NAMA_PENGGUNA_DIPAKAI');

  const nama = `uji083c_${acak()}`;
  const tanpaEmail = await kirim('/auth/daftar', { nama_pengguna: nama, kata_sandi: SANDI });
  assert.equal(tanpaEmail.status, 201);
  assert.equal(tanpaEmail.json.data.pengguna.email, null);
  assert.equal(tanpaEmail.json.data.pengguna.email_terverifikasi, false);
});

test('kode dan kata sandi tidak tercatat di log selama daftar dengan email', async () => {
  const d = dataDaftar();
  const tercatat = [];
  const asli = { log: console.log, info: console.info, warn: console.warn, error: console.error };
  for (const n of Object.keys(asli)) {
    console[n] = (...a) => {
      tercatat.push(a.map(String).join(' '));
      asli[n].apply(console, a);
    };
  }
  let kode;
  try {
    await kirim('/auth/daftar/kirim-kode', d);
    kode = await kodeTerakhir(d.email, 'daftar');
    await kirim('/auth/daftar/verifikasi', { email: d.email, kode: kodeLain(kode) });
    await kirim('/auth/daftar/verifikasi', { email: d.email, kode });
  } finally {
    Object.assign(console, asli);
  }
  const semua = tercatat.join('\n');
  assert.ok(tercatat.length > 0);
  for (const rahasia of [kode, SANDI, d.email]) assert.equal(semua.includes(rahasia), false, rahasia === kode ? 'kode' : 'sandi/email');
});

test('bukti: tidak ada email sungguhan — semua kode lewat pengirim tiruan, 0 koneksi keluar', () => {
  assert.ok(suratTiruan.some((s) => s.tujuan === 'daftar'));
  assert.ok(suratTiruan.some((s) => s.tujuan === 'verifikasi'));
  assert.deepEqual(koneksiKeluar, []);
});
