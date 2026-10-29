// Uji persetujuan & gerbang AI (LANJUT_047): tabel `persetujuan`,
// GET /persetujuan/saya, POST /persetujuan, daftar dengan versi_kebijakan,
// skrip admin `npm run persetujuan-ortu`, dan bolehPakaiAi().
//
// Konfigurasi versi (kunci persetujuan_* di konfigurasi_levelin) diubah di
// beberapa tes lalu SELALU dikembalikan; hanya berkas ini yang membacanya.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { acak, nyalakanServer, urlDari, daftarPenggunaBaru, kunciKonfigurasiGlobal, pool } = require('./bantuan');
const repo = require('../src/modul/persetujuan/persetujuan.repo');
const { bolehPakaiAi } = require('../src/modul/persetujuan/persetujuan.layanan');
const skrip = require('../src/db/persetujuan/persetujuan-ortu');

let server;
let baseUrl;
let konfigAsli;
let lepasKunci;

const KUNCI_VERSI = 'persetujuan_versi_kebijakan';
const KUNCI_MIN = 'persetujuan_versi_min_ortu';

async function aturKonfig(kunci, nilai) {
  await pool.query('UPDATE konfigurasi_levelin SET nilai = ? WHERE kunci = ?', [String(nilai), kunci]);
}

async function denganKonfig(perubahan, fn) {
  try {
    for (const [k, v] of Object.entries(perubahan)) await aturKonfig(k, v);
    await fn();
  } finally {
    for (const k of Object.keys(perubahan)) await aturKonfig(k, konfigAsli[k]);
  }
}

before(async () => {
  // Versi persetujuan diubah sementara di beberapa tes; tes Ngobrol bergantung padanya.
  lepasKunci = await kunciKonfigurasiGlobal();
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const [baris] = await pool.query('SELECT kunci, nilai FROM konfigurasi_levelin WHERE kunci IN (?, ?)', [KUNCI_VERSI, KUNCI_MIN]);
  konfigAsli = Object.fromEntries(baris.map((b) => [b.kunci, b.nilai]));
  assert.deepEqual(Object.keys(konfigAsli).sort(), [KUNCI_VERSI, KUNCI_MIN].sort(), 'jalankan npm run migrasi (012_persetujuan)');
});

after(async () => {
  for (const [k, v] of Object.entries(konfigAsli)) await aturKonfig(k, v);
  await new Promise((resolve) => server.close(resolve));
  await lepasKunci();
  await pool.end();
});

async function panggil(metode, p, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${p}`, {
    method: metode,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

/** Akun baru: { id, nama, token }. `kebijakan` = versi yang diterima saat daftar (atau tanpa). */
async function akun(kebijakan) {
  const { status, json, namaPengguna } = await daftarPenggunaBaru(baseUrl, kebijakan ? { versi_kebijakan: kebijakan } : {});
  assert.equal(status, 201, JSON.stringify(json));
  return { id: json.data.pengguna.id, nama: namaPengguna, token: json.data.token };
}

const versiBerlaku = () => Number(konfigAsli[KUNCI_VERSI]);
const catatanDb = async (id) => (await pool.query('SELECT jenis, versi, status, sumber, catatan FROM persetujuan WHERE pengguna_id = ? ORDER BY id', [id]))[0];

/** Jalankan skrip admin tanpa mencetak ke keluaran tes. */
async function skripAdmin(argv) {
  const logAsli = console.log;
  const tercetak = [];
  console.log = (...isi) => tercetak.push(isi.join(' '));
  try {
    return { hasil: await skrip.jalankan(argv), tercetak };
  } finally {
    console.log = logAsli;
  }
}
const setujuOrtu = (a, ...lain) => skripAdmin([`--pengguna=${a.nama}`, '--catatan=Surat uji 001/X/2026', '--ya', ...lain]);
const cabutOrtu = (a) => skripAdmin([`--pengguna=${a.nama}`, '--cabut', '--catatan=Surat pencabutan uji', '--ya']);

// --- gerbang AI ---------------------------------------------------------------

test('gerbang: akun tanpa catatan apa pun → bolehPakaiAi salah; GET /persetujuan/saya kosong', async () => {
  const a = await akun();
  assert.equal(await bolehPakaiAi(a.id), false);
  assert.equal(await bolehPakaiAi(null), false);
  const { status, json } = await panggil('GET', '/persetujuan/saya', a.token);
  assert.equal(status, 200);
  assert.deepEqual(json.data, {
    kebijakan_privasi: null,
    ortu_wali: null,
    versi_kebijakan_berlaku: versiBerlaku(),
    kebijakan_terkini: false,
    ortu_wali_aktif: false,
    boleh_pakai_ai: false,
  });
});

test('gerbang: hanya kebijakan diterima, tanpa orang tua/wali → salah', async () => {
  const a = await akun(versiBerlaku());
  assert.equal(await bolehPakaiAi(a.id), false);
  const { json } = await panggil('GET', '/persetujuan/saya', a.token);
  assert.equal(json.data.kebijakan_terkini, true);
  assert.equal(json.data.ortu_wali_aktif, false);
});

test('gerbang: hanya orang tua/wali, tanpa kebijakan → salah', async () => {
  const a = await akun();
  await setujuOrtu(a);
  assert.equal(await bolehPakaiAi(a.id), false);
});

test('gerbang: orang tua/wali + kebijakan versi berlaku → benar', async () => {
  const a = await akun(versiBerlaku());
  await setujuOrtu(a);
  assert.equal(await bolehPakaiAi(a.id), true);
  const { json } = await panggil('GET', '/persetujuan/saya', a.token);
  assert.equal(json.data.boleh_pakai_ai, true);
  assert.equal(json.data.ortu_wali.sumber, 'surat_sekolah');
  assert.equal(json.data.ortu_wali.status, 'setuju');
  assert.ok(!('catatan' in json.data.ortu_wali), 'catatan internal sekolah tidak dikirim ke app');
});

test('gerbang: --cabut → salah lagi; setuju lagi → benar; riwayat bertambah, tidak ditimpa', async () => {
  const a = await akun(versiBerlaku());
  await setujuOrtu(a);
  await cabutOrtu(a);
  assert.equal(await bolehPakaiAi(a.id), false);
  assert.equal((await panggil('GET', '/persetujuan/saya', a.token)).json.data.ortu_wali.status, 'cabut');
  await setujuOrtu(a);
  assert.equal(await bolehPakaiAi(a.id), true);
  assert.deepEqual(
    (await catatanDb(a.id)).map((c) => `${c.jenis}:${c.status}:${c.sumber}`),
    ['kebijakan_privasi:setuju:mandiri', 'ortu_wali:setuju:surat_sekolah', 'ortu_wali:cabut:surat_sekolah', 'ortu_wali:setuju:surat_sekolah']
  );
});

test('gerbang: versi persetujuan orang tua di bawah minimum (konfigurasi dinaikkan) → salah', async () => {
  const a = await akun(versiBerlaku());
  await setujuOrtu(a);
  assert.equal(await bolehPakaiAi(a.id), true);
  await denganKonfig({ [KUNCI_MIN]: versiBerlaku() + 1 }, async () => {
    assert.equal(await bolehPakaiAi(a.id), false);
    assert.equal((await panggil('GET', '/persetujuan/saya', a.token)).json.data.ortu_wali_aktif, false);
  });
  assert.equal(await bolehPakaiAi(a.id), true, 'kembali benar setelah konfigurasi dikembalikan');
});

test('gerbang: versi kebijakan berlaku dinaikkan → salah sampai siswa menerima versi baru', async () => {
  const a = await akun(versiBerlaku());
  await setujuOrtu(a);
  const baru = versiBerlaku() + 1;
  await denganKonfig({ [KUNCI_VERSI]: baru }, async () => {
    assert.equal(await bolehPakaiAi(a.id), false);
    const usang = await panggil('POST', '/persetujuan', a.token, { jenis: 'kebijakan_privasi', versi: versiBerlaku() });
    assert.equal(usang.status, 409);
    assert.equal(usang.json.galat.kode, 'KEBIJAKAN_USANG');
    const terima = await panggil('POST', '/persetujuan', a.token, { jenis: 'kebijakan_privasi', versi: baru });
    assert.equal(terima.status, 201);
    assert.equal(await bolehPakaiAi(a.id), true);
  });
});

test('gerbang gagal-tertutup: konfigurasi hilang atau tidak sah → salah', async (t) => {
  const a = await akun(versiBerlaku());
  await setujuOrtu(a);
  assert.equal(await bolehPakaiAi(a.id), true);
  // Satu mock saja (mock kedua atas metode yang sama tidak pulih ke aslinya).
  const tiruan = t.mock.method(repo, 'ambilKonfigurasi', async () => []);
  assert.equal(await bolehPakaiAi(a.id), false);
  tiruan.mock.mockImplementation(async () => [
    { kunci: KUNCI_VERSI, nilai: 'abc' },
    { kunci: KUNCI_MIN, nilai: '1' },
  ]);
  assert.equal(await bolehPakaiAi(a.id), false);
  tiruan.mock.restore();
  assert.equal(await bolehPakaiAi(a.id), true);
});

// --- API siswa ------------------------------------------------------------------

test('API: akun siswa tidak bisa membuat catatan ortu_wali (403), juga tidak bisa memilih sumber/status', async () => {
  const a = await akun();
  for (const body of [
    { jenis: 'ortu_wali', versi: versiBerlaku() },
    { jenis: 'ortu_wali', versi: versiBerlaku(), sumber: 'surat_sekolah', status: 'setuju' },
  ]) {
    const { status, json } = await panggil('POST', '/persetujuan', a.token, body);
    assert.equal(status, 403);
    assert.equal(json.galat.kode, 'TIDAK_BERHAK');
  }
  assert.deepEqual(await catatanDb(a.id), [], 'ada baris tertulis dari permintaan yang ditolak');

  const sisip = await panggil('POST', '/persetujuan', a.token, {
    jenis: 'kebijakan_privasi',
    versi: versiBerlaku(),
    sumber: 'surat_sekolah',
    status: 'cabut',
    catatan: 'palsu',
  });
  assert.equal(sisip.status, 201);
  assert.deepEqual(await catatanDb(a.id), [{ jenis: 'kebijakan_privasi', versi: versiBerlaku(), status: 'setuju', sumber: 'mandiri', catatan: null }]);
  assert.equal(await bolehPakaiAi(a.id), false);
});

test('API: versi usang → 409; versi sama dua kali → 200 tanpa baris baru; tanpa token → 401', async () => {
  const a = await akun();
  const usang = await panggil('POST', '/persetujuan', a.token, { jenis: 'kebijakan_privasi', versi: versiBerlaku() + 5 });
  assert.equal(usang.status, 409);
  assert.equal((await panggil('POST', '/persetujuan', a.token, { jenis: 'kebijakan_privasi', versi: versiBerlaku() })).status, 201);
  assert.equal((await panggil('POST', '/persetujuan', a.token, { jenis: 'kebijakan_privasi', versi: versiBerlaku() })).status, 200);
  assert.equal((await catatanDb(a.id)).length, 1);
  for (const [m, p, b] of [['GET', '/persetujuan/saya'], ['POST', '/persetujuan', { jenis: 'kebijakan_privasi', versi: 1 }]]) {
    const r = await panggil(m, p, null, b);
    assert.equal(r.status, 401, p);
  }
  const salah = await panggil('POST', '/persetujuan', a.token, { jenis: 'lainnya', versi: 1 });
  assert.equal(salah.status, 400);
});

test('lintas akun: persetujuan A tidak terlihat dan tidak berpengaruh ke B', async () => {
  const a = await akun(versiBerlaku());
  const b = await akun();
  await setujuOrtu(a);
  assert.equal(await bolehPakaiAi(a.id), true);
  assert.equal(await bolehPakaiAi(b.id), false);
  for (const p of ['/persetujuan/saya', `/persetujuan/saya?pengguna_id=${a.id}`]) {
    const { json } = await panggil('GET', p, b.token);
    assert.equal(json.data.ortu_wali, null, p);
    assert.equal(json.data.kebijakan_privasi, null, p);
    assert.equal(json.data.boleh_pakai_ai, false, p);
  }
  await panggil('POST', '/persetujuan', b.token, { jenis: 'kebijakan_privasi', versi: versiBerlaku() });
  assert.equal((await catatanDb(a.id)).length, 2, 'catatan B masuk ke A');
});

test('daftar: versi_kebijakan dicatat sebagai kebijakan mandiri; versi usang → 409 dan akun TIDAK dibuat', async () => {
  const a = await akun(versiBerlaku());
  assert.deepEqual(await catatanDb(a.id), [{ jenis: 'kebijakan_privasi', versi: versiBerlaku(), status: 'setuju', sumber: 'mandiri', catatan: null }]);

  const nama = `uji_${acak()}`;
  const { status, json } = await daftarPenggunaBaru(baseUrl, { nama_pengguna: nama, versi_kebijakan: versiBerlaku() + 3 });
  assert.equal(status, 409);
  assert.equal(json.galat.kode, 'KEBIJAKAN_USANG');
  const [ada] = await pool.query('SELECT id FROM pengguna WHERE nama_pengguna = ?', [nama]);
  assert.deepEqual(ada, [], 'akun terbuat padahal versi kebijakan usang');

  const tanpa = await akun();
  assert.deepEqual(await catatanDb(tanpa.id), [], 'daftar tanpa versi_kebijakan (APK lama) tidak mencatat apa pun');
});

// --- skrip admin ------------------------------------------------------------------

test('skrip: tanpa --ya hanya pratinjau; nama tak dikenal atau tanpa --catatan → tidak ada yang diubah', async () => {
  const a = await akun(versiBerlaku());
  const b = await akun();
  await assert.rejects(skripAdmin([`--pengguna=${a.nama},${b.nama}`, '--catatan=Surat uji']), (g) => {
    assert.ok(g instanceof skrip.PerluKonfirmasi, g.message);
    assert.deepEqual(g.rencana.map((r) => [r.nama, r.aksi]), [[a.nama, 'setuju'], [b.nama, 'setuju']]);
    return true;
  });
  await assert.rejects(skripAdmin([`--pengguna=${a.nama}`, '--catatan=Surat uji', '--ya=ya']), skrip.PerluKonfirmasi);
  await assert.rejects(skripAdmin([`--pengguna=${a.nama},tidak_ada_${acak()}`, '--catatan=Surat uji', '--ya']), /tidak ditemukan/);
  await assert.rejects(skripAdmin([`--pengguna=${a.nama}`, '--ya']), /--catatan/);
  await assert.rejects(skripAdmin([`--pengguna=${a.nama}`, '--catatan=x', '--sumber=mandiri', '--ya']), /--sumber/);
  for (const x of [a, b]) assert.equal((await catatanDb(x.id)).filter((c) => c.jenis === 'ortu_wali').length, 0);
  assert.equal(await bolehPakaiAi(a.id), false);
});

test('skrip: --berkas (komentar & baris kosong diabaikan), --sumber=admin, yang sudah setuju dilewati, --status hanya membaca', async () => {
  const a = await akun(versiBerlaku());
  const b = await akun(versiBerlaku());
  const berkas = path.join(os.tmpdir(), `persetujuan-uji-${acak()}.txt`);
  fs.writeFileSync(berkas, `# kelas uji\n${a.nama}\n\n  ${b.nama.toUpperCase()}  \n`);
  try {
    await setujuOrtu(a);
    const { hasil } = await skripAdmin([`--berkas=${berkas}`, '--catatan=Rekap admin', '--sumber=admin', '--ya']);
    assert.deepEqual(hasil.map((r) => [r.nama, r.aksi]), [[a.nama, null], [b.nama, 'setuju']]);
  } finally {
    fs.rmSync(berkas, { force: true });
  }
  assert.deepEqual((await catatanDb(b.id)).filter((c) => c.jenis === 'ortu_wali'), [
    { jenis: 'ortu_wali', versi: versiBerlaku(), status: 'setuju', sumber: 'admin', catatan: 'Rekap admin' },
  ]);
  assert.equal((await catatanDb(a.id)).filter((c) => c.jenis === 'ortu_wali').length, 1, 'yang sudah setuju tidak ditulis ulang');

  const sebelum = await catatanDb(a.id);
  const { tercetak } = await skripAdmin(['--status', `--pengguna=${a.nama}`]);
  assert.match(tercetak.join('\n'), /boleh AI: ya/);
  assert.deepEqual(await catatanDb(a.id), sebelum);

  const tanpaAktif = await akun();
  const { hasil } = await skripAdmin([`--pengguna=${tanpaAktif.nama}`, '--cabut', '--catatan=x', '--ya']);
  assert.equal(hasil[0].aksi, null, '--cabut tanpa persetujuan aktif dilewati');
  assert.deepEqual(await catatanDb(tanpaAktif.id), []);
});

// LANJUT_048: akun lama (tanpa catatan) menerima lewat POST /persetujuan;
// versi naik di konfigurasi → diminta menerima ulang; akun lain tidak terpengaruh.
test('terima ulang: akun lama menerima; versi naik → diminta ulang; akun B tidak terpengaruh; ortu_wali tetap 403', async () => {
  const a = await akun(); // akun lama: daftar tanpa versi_kebijakan
  const b = await akun();
  const status = async (x) => (await panggil('GET', '/persetujuan/saya', x.token)).json.data;
  assert.equal((await status(a)).kebijakan_terkini, false);

  assert.equal((await panggil('POST', '/persetujuan', a.token, { jenis: 'kebijakan_privasi', versi: versiBerlaku() })).status, 201);
  assert.equal((await status(a)).kebijakan_terkini, true);
  assert.equal((await status(b)).kebijakan_privasi, null, 'penerimaan A terlihat di B');

  const baru = versiBerlaku() + 1;
  await denganKonfig({ [KUNCI_VERSI]: baru }, async () => {
    const sa = await status(a);
    assert.equal(sa.kebijakan_terkini, false, 'A tidak diminta menerima ulang');
    assert.equal(sa.versi_kebijakan_berlaku, baru);
    assert.deepEqual([sa.kebijakan_privasi.status, sa.kebijakan_privasi.versi], ['setuju', versiBerlaku()]);
    assert.equal((await panggil('POST', '/persetujuan', a.token, { jenis: 'kebijakan_privasi', versi: versiBerlaku() })).status, 409, 'versi lama diterima lagi');
    assert.equal((await panggil('POST', '/persetujuan', a.token, { jenis: 'kebijakan_privasi', versi: baru })).status, 201);
    assert.equal((await status(a)).kebijakan_terkini, true);
    assert.equal((await status(b)).kebijakan_terkini, false);
  });
  assert.equal((await status(a)).kebijakan_terkini, true, 'versi diterima ≥ berlaku setelah konfigurasi dikembalikan');
  assert.deepEqual((await catatanDb(a.id)).map((c) => `${c.jenis}:v${c.versi}`), [`kebijakan_privasi:v${versiBerlaku()}`, `kebijakan_privasi:v${baru}`]);
  assert.deepEqual(await catatanDb(b.id), []);

  const ortu = await panggil('POST', '/persetujuan', a.token, { jenis: 'ortu_wali', versi: versiBerlaku() });
  assert.equal(ortu.status, 403);
  assert.equal((await catatanDb(a.id)).filter((c) => c.jenis === 'ortu_wali').length, 0);
});

// --- penjaga struktural -------------------------------------------------------------

test('versi kebijakan di app (lib/kebijakan-privasi.json) = versi yang berlaku di konfigurasi server', () => {
  const app = JSON.parse(fs.readFileSync(path.join(__dirname, '../../lib/kebijakan-privasi.json'), 'utf8'));
  assert.equal(app.versi, versiBerlaku(), 'app akan mengirim versi_kebijakan yang ditolak server (409)');
});

test('repo persetujuan hanya membaca & menambah; endpoint publik Level-In tidak memuat kunci persetujuan', async () => {
  const sumber = fs.readFileSync(path.join(__dirname, '../src/modul/persetujuan/persetujuan.repo.js'), 'utf8');
  const kodeSaja = sumber.replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(kodeSaja, /\b(UPDATE|DELETE|REPLACE|TRUNCATE)\b/i);
  const { json } = await panggil('GET', '/konfigurasi/levelin');
  assert.equal(Object.keys(json.data).some((k) => k.startsWith('persetujuan')), false);
});
