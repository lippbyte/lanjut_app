// LANJUT_019 seri v2: dengan ai_aktif = 0, tidak ada permintaan keluar ke penyedia AI maupun mesin
// pencari. Dua lapis: koneksi jaringan dipantau saat seluruh rute dipanggil, dan sumber dipindai
// supaya jalur keluar baru tidak masuk tanpa diperiksa. Alamat penyedia selalu tiruan di mesin ini.

const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');
const http = require('node:http');

// Dipasang sebelum modul server dimuat, supaya semua koneksi terpantau.
const koneksi = [];
const connectAsli = net.Socket.prototype.connect;
net.Socket.prototype.connect = function pantau(...args) {
  const a = Array.isArray(args[0]) ? args[0][0] : args[0];
  const o = a && typeof a === 'object' ? a : { port: a, host: args[1] };
  koneksi.push(o.path ? { path: o.path } : { host: o.host ?? 'localhost', port: Number(o.port) });
  return connectAsli.apply(this, args);
};

const { test: tesDasar, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { acak, nyalakanServer, urlDari, daftarPenggunaBaru, kunciKonfigurasiGlobal, pool } = require('./bantuan');
const { jalurInduk, tesLuarRepo } = require('./luar-repo');
const { muatModulApp } = require('./muat-ts-app');
const env = require('../src/config/env');
const app = require('../src/app');
const skrip = require('../src/db/persetujuan/persetujuan-ortu');

const test = tesDasar;
const AKAR_APP = path.join(__dirname, '..', '..');
const AKAR_SERVER = path.join(AKAR_APP, 'server');
const KUNCI = ['ai_aktif', 'ai_modul_aktif', 'ai_web_aktif', 'ai_web_mesin', 'event_sekolah_aktif', 'ngobrol_batas_5_menit', 'ngobrol_batas_24_jam'];
const ENV_ASLI = { kunci: env.OPENROUTER_API_KEY, url: env.OPENROUTER_BASE_URL };
const AI_MATI = { ai_aktif: '0', ai_modul_aktif: '1', ai_web_aktif: '1', ai_web_mesin: '', event_sekolah_aktif: '1', ngobrol_batas_5_menit: '100000', ngobrol_batas_24_jam: '100000' };
const PESAN = ['Halo', 'Apa itu fotosintesis?', 'Kapan ujian matematikaku?', 'Aku harus latihan apa hari ini?', 'Aku capek banget belajar', 'Aku ingin bunuh diri'];

const permintaanPenyedia = [];
const tiruan = http.createServer((req, res) => {
  let isi = '';
  req.on('data', (d) => { isi += d; });
  req.on('end', () => {
    permintaanPenyedia.push(JSON.parse(isi || '{}'));
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ choices: [{ message: { content: 'Balasan tiruan.' }, finish_reason: 'stop' }], usage: {} }));
  });
});

let server;
let baseUrl;
let portTiruan;
let lepasKunci;
let konfigAsli;
let versiKebijakan;

const aturKonfig = (k, v) => pool.query('UPDATE konfigurasi_levelin SET nilai = ? WHERE kunci = ?', [String(v), k]);
async function kembalikanKonfig(tujuan) {
  for (const [k, v] of Object.entries(tujuan)) await aturKonfig(k, v);
}
async function denganKonfig(perubahan, fn) {
  try {
    for (const [k, v] of Object.entries(perubahan)) await aturKonfig(k, v);
    return await fn();
  } finally {
    for (const k of Object.keys(perubahan)) await aturKonfig(k, konfigAsli[k]);
  }
}

before(async () => {
  lepasKunci = await kunciKonfigurasiGlobal();
  await new Promise((r) => tiruan.listen(0, '127.0.0.1', r));
  portTiruan = tiruan.address().port;
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const [baris] = await pool.query('SELECT kunci, nilai FROM konfigurasi_levelin WHERE kunci IN (?)', [KUNCI]);
  konfigAsli = Object.fromEntries(baris.map((b) => [b.kunci, b.nilai]));
  assert.equal(Object.keys(konfigAsli).length, KUNCI.length, 'jalankan npm run migrasi');
  const [[v]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'persetujuan_versi_kebijakan'");
  versiKebijakan = Number(v.nilai);
  env.OPENROUTER_API_KEY = `kunci-uji-${acak()}`;
  env.OPENROUTER_BASE_URL = `http://127.0.0.1:${portTiruan}/api/v1`;
});

after(async () => {
  try {
    env.OPENROUTER_API_KEY = ENV_ASLI.kunci;
    env.OPENROUTER_BASE_URL = ENV_ASLI.url;
    await new Promise((r) => server.close(r));
    await new Promise((r) => tiruan.close(r));
  } finally {
    if (konfigAsli) await kembalikanKonfig(konfigAsli);
    await lepasKunci?.();
    await pool.end();
    net.Socket.prototype.connect = connectAsli;
  }
});

async function akunDisetujui() {
  const nama = `uji019_${acak()}`;
  const r = await daftarPenggunaBaru(baseUrl, { nama_pengguna: nama, kelas: '8', versi_kebijakan: versiKebijakan });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const logAsli = console.log;
  console.log = () => {};
  try {
    await skrip.jalankan([`--pengguna=${nama}`, '--catatan=Surat uji LANJUT_019', '--ya']);
  } finally {
    console.log = logAsli;
  }
  return r.json.data.token;
}

const kirim = async (token, teks) => {
  const res = await fetch(`${baseUrl}/api/v1/ngobrol`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ pesan: [{ peran: 'pengguna', teks }] }) });
  return { status: res.status, json: await res.json() };
};

/** Koneksi selain ke basis data dan server uji ini. */
function koneksiAsing() {
  const izin = new Set([Number(env.DB_PORT), server.address().port]);
  return koneksi.filter((k) => !k.path && !(['127.0.0.1', 'localhost', '::1', env.DB_HOST].includes(k.host) && izin.has(k.port)));
}

/** Semua rute terdaftar, dari router Express. */
function semuaRute() {
  const hasil = [];
  const awalan = (l) => (l.regexp.fast_slash ? '' : l.regexp.source.replace('^', '').replace('\\/?(?=\\/|$)', '').replace(/\\\//g, '/'));
  const jelajah = (stack, dasar) => {
    for (const l of stack) {
      if (l.route) for (const m of Object.keys(l.route.methods)) hasil.push({ metode: m.toUpperCase(), jalur: dasar + l.route.path });
      else if (l.name === 'router' && l.handle.stack) jelajah(l.handle.stack, dasar + awalan(l));
    }
  };
  jelajah(app._router.stack, '');
  return hasil;
}

test('AI mati: pesan apa pun tidak memicu permintaan keluar, walau web dan modul menyala', async () => {
  const token = await akunDisetujui();
  await denganKonfig(AI_MATI, async () => {
    permintaanPenyedia.length = 0;
    koneksi.length = 0;
    for (const teks of PESAN) {
      const r = await kirim(token, teks);
      assert.equal(r.status, 200, `${teks}: ${JSON.stringify(r.json)}`);
    }
    assert.deepEqual(permintaanPenyedia, []);
    assert.deepEqual(koneksiAsing(), []);
  });
});

test('AI mati: balasannya pesan uji coba, dan kartu bantuan tetap ada', async () => {
  const token = await akunDisetujui();
  await denganKonfig(AI_MATI, async () => {
    assert.equal((await kirim(token, 'Halo')).json.data.uji_coba, true);
    assert.ok((await kirim(token, 'Aku ingin bunuh diri')).json.data.kartu_bantuan);
  });
});

test('AI mati: memanggil seluruh rute tidak memicu permintaan keluar', async () => {
  const token = await akunDisetujui();
  const rute = semuaRute().filter((r) => r.jalur.startsWith('/api/v1') && !r.jalur.startsWith('/api/v1/auth') && !/\/pengguna\/saya/.test(r.jalur));
  assert.ok(rute.length >= 30, `terlalu sedikit rute: ${rute.length}`);
  await denganKonfig(AI_MATI, async () => {
    permintaanPenyedia.length = 0;
    koneksi.length = 0;
    for (const { metode, jalur } of rute) {
      const alamat = jalur.replace(/:[A-Za-z]+/g, '11111111-1111-4111-8111-111111111111');
      const body = metode === 'GET' ? undefined : JSON.stringify(jalur.endsWith('/ngobrol') ? { pesan: [{ peran: 'pengguna', teks: 'Apa itu fotosintesis?' }] } : {});
      await (await fetch(`${baseUrl}${alamat}`, { method: metode, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body })).arrayBuffer();
    }
    assert.deepEqual(permintaanPenyedia, []);
    assert.deepEqual(koneksiAsing(), []);
  });
});

test('Kontrol: dengan AI menyala, permintaan keluar terdeteksi, termasuk pencarian web', async () => {
  const token = await akunDisetujui();
  await denganKonfig({ ...AI_MATI, ai_aktif: '1' }, async () => {
    permintaanPenyedia.length = 0;
    koneksi.length = 0;
    assert.equal((await kirim(token, 'Apa itu fotosintesis?')).status, 200);
    assert.ok(permintaanPenyedia.length >= 1, 'tiruan penyedia tidak terpanggil, jadi tes di atas tidak berarti');
    assert.ok(permintaanPenyedia.some((p) => p.plugins?.some((x) => x.id === 'web')), 'pencarian web tidak terdeteksi');
    assert.ok(koneksiAsing().some((k) => k.port === portTiruan), 'pemantau koneksi tidak menangkap penyedia');
  });
});

function berkasDi(akar, jenis) {
  return fs.readdirSync(akar, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(akar, e.name);
    if (e.isDirectory()) return e.name === 'node_modules' ? [] : berkasDi(p, jenis);
    return jenis.some((x) => e.name.endsWith(x)) ? [p] : [];
  });
}
const relatif = (p) => path.relative(AKAR_APP, p).replace(/\\/g, '/');
const tanpaKomentar = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

test('Sumber server: hanya berkas yang sudah diaudit yang membuka koneksi keluar', () => {
  const POLA = /\bfetch\(|require\(['"](?:node:)?(?:https?|http2|net|tls|dgram)['"]\)|from ['"](?:node:)?(?:https?|http2|net|tls|dgram)['"]|\baxios\b|\bundici\b/;
  const temuan = berkasDi(path.join(AKAR_SERVER, 'src'), ['.js', '.mjs']).filter((p) => POLA.test(tanpaKomentar(fs.readFileSync(p, 'utf8')))).map(relatif).sort();
  // ekstrak-pdf.worker.mjs memuat modul jaringan justru untuk mematikannya di worker.
  assert.deepEqual(temuan, ['server/src/modul/auth/tokenGoogle.js', 'server/src/modul/modul/ekstrak-pdf.worker.mjs', 'server/src/modul/ngobrol/penyedia-ai.js', 'server/src/util/surel.js']);
});

test('Sumber server: penyedia AI hanya dipanggil Ngobrol, dan saklar diperiksa lebih dulu', () => {
  const pemanggil = berkasDi(path.join(AKAR_SERVER, 'src'), ['.js']).filter((p) => /mintaBalasan\(/.test(tanpaKomentar(fs.readFileSync(p, 'utf8')))).map(relatif).sort();
  assert.deepEqual(pemanggil, ['server/src/modul/ngobrol/ngobrol.layanan.js', 'server/src/modul/ngobrol/penyedia-ai.js']);
  const sumber = fs.readFileSync(path.join(AKAR_SERVER, 'src', 'modul', 'ngobrol', 'ngobrol.layanan.js'), 'utf8');
  const balas = sumber.slice(sumber.indexOf('async function balas('));
  const saklar = balas.indexOf('if (!cfg.aiAktif)');
  assert.ok(saklar > 0);
  for (const panggilan of ['cariWeb(', 'penyedia.mintaBalasan(', 'kumpulkanKonteks(']) {
    const letak = balas.indexOf(panggilan);
    assert.ok(letak > saklar, `${panggilan} harus sesudah saklar`);
  }
});

test('Sumber aplikasi: hanya berkas yang sudah diaudit yang membuka koneksi', () => {
  const POLA = /\bfetch\(|XMLHttpRequest|new WebSocket|sendBeacon|SpeechRecognition\b/;
  const temuan = ['app', 'components', 'lib', 'hooks', 'providers', 'api']
    .flatMap((d) => berkasDi(path.join(AKAR_APP, d), ['.ts', '.tsx']))
    .filter((p) => POLA.test(tanpaKomentar(fs.readFileSync(p, 'utf8'))))
    .map(relatif)
    .sort();
  assert.deepEqual(temuan, ['api/client.ts', 'lib/portofolioFoto.ts', 'lib/suara.ts']);
});

test('Mikrofon Ngobrol mati di semua profil build', () => {
  const { build } = JSON.parse(fs.readFileSync(path.join(AKAR_APP, 'eas.json'), 'utf8'));
  for (const [nama, p] of Object.entries(build)) assert.notEqual(p.env?.EXPO_PUBLIC_MIKROFON_NGOBROL, '1', nama);
  assert.equal(muatModulApp('lib/fiturApp').mikrofonNgobrolAktif({}), false);
});

const DRAF = jalurInduk('docs', 'kebijakan-privasi-DRAF.md');
const SURAT = jalurInduk('docs', 'surat-persetujuan-ortu-wali-DRAF.md');
const USULAN = jalurInduk('docs', 'usulan-teks-pilot-tanpa-ai.md');
const RINGKASAN = jalurInduk('docs', 'ringkasan-teknis-untuk-peninjau.md');
const bacaTeks = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n');
const kebijakan = () => bacaTeks(path.join(AKAR_APP, 'lib', 'kebijakan-privasi.json'));
const tesDokumen = tesLuarRepo(tesDasar, DRAF, SURAT, USULAN, RINGKASAN);

tesDokumen('Usulan teks pilot belum dipasang, dan bertanda menunggu persetujuan', () => {
  assert.match(bacaTeks(USULAN), /menunggu persetujuan Khalifa/i);
  for (const teks of [kebijakan(), bacaTeks(DRAF), bacaTeks(SURAT)]) assert.doesNotMatch(teks, /belum aktif untuk pilot/i);
});

test('Butir tujuan lain sudah dihapus', () => {
  assert.doesNotMatch(kebijakan(), /tujuan lain kalau ada/);
});

tesDokumen('Ringkasan peninjau: paling panjang dua halaman, memuat yang belum diketahui, dan enam pertanyaan apa adanya', () => {
  const teks = bacaTeks(RINGKASAN);
  const kata = teks.split(/\s+/).filter((k) => /[\p{L}\d]/u.test(k)).length;
  assert.ok(kata <= 1000, `terlalu panjang untuk dua halaman: ${kata} kata`);
  assert.match(teks, /belum diketahui/i);
  assert.match(teks, /wajah/);
  const json = kebijakan();
  for (const tanya of [
    'apakah konfirmasi orang tua atau wali di aplikasi diterima sebagai persetujuan; menunggu tinjauan hukum.',
    'negara atau wilayah pemrosesan, dan dasar pengirimannya ke luar negeri.',
    'aturan untuk modul dari guru atau penerbit (hak cipta) yang potongannya dikirim ke penyedia AI.',
    'apakah akun dasar (tanpa AI) juga butuh persetujuan orang tua atau wali; menunggu tinjauan hukum.',
    'berapa lama permintaan ditanggapi, dan cara memastikan permintaan benar-benar datang dari orang tua atau wali.',
    'kapan persetujuan orang tua atau wali perlu diminta ulang saat kebijakan berubah.',
  ]) {
    assert.ok(json.includes(`[ISI: ${tanya}]`), `bukan penanda kebijakan: ${tanya}`);
    assert.ok(teks.includes(tanya), `belum dikutip: ${tanya}`);
  }
});
