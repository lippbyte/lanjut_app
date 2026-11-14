// LANJUT_024 seri v2: Discover tidak membuka koneksi keluar. Pola sama dengan pilot-tanpa-ai.test.js
// (LANJUT_019): koneksi jaringan dipantau saat semua rute Discover dipanggil, dengan saklar Discover
// menyala dan ai_aktif = 0, lalu sumber modul dipindai. Profil eksplorasi disusun dengan aturan,
// tanpa AI, OpenRouter, atau mesin pencari.

const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

// Dipasang sebelum modul server dimuat, supaya semua koneksi terpantau.
const koneksi = [];
const connectAsli = net.Socket.prototype.connect;
net.Socket.prototype.connect = function pantau(...args) {
  const a = Array.isArray(args[0]) ? args[0][0] : args[0];
  const o = a && typeof a === 'object' ? a : { port: a, host: args[1] };
  koneksi.push(o.path ? { path: o.path } : { host: o.host ?? 'localhost', port: Number(o.port) });
  return connectAsli.apply(this, args);
};

process.env.DISCOVER_AKTIF = '1';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { acak, nyalakanServer, urlDari, daftarPenggunaBaru, kunciKonfigurasiGlobal, pool } = require('./bantuan');
const { kunciKartuDiscover, kartuUjiDisetujui } = require('./kartu-discover-uji');
const env = require('../src/config/env');

const KUNCI = ['ai_aktif', 'ai_modul_aktif', 'ai_web_aktif', 'ai_web_mesin'];
const AI_MATI = { ai_aktif: '0', ai_modul_aktif: '1', ai_web_aktif: '1', ai_web_mesin: '' };
const ENV_ASLI = { kunci: env.OPENROUTER_API_KEY, url: env.OPENROUTER_BASE_URL };
const UJI = kartuUjiDisetujui(pool, 'dta');

let server;
let baseUrl;
let lepasKunci;
let lepasKunciKartu;
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
  lepasKunciKartu = await kunciKartuDiscover(pool);
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const [baris] = await pool.query('SELECT kunci, nilai FROM konfigurasi_levelin WHERE kunci IN (?)', [KUNCI]);
  konfigAsli = Object.fromEntries(baris.map((b) => [b.kunci, b.nilai]));
  assert.equal(Object.keys(konfigAsli).length, KUNCI.length, 'jalankan npm run migrasi');
  const [[v]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'persetujuan_versi_kebijakan'");
  versiKebijakan = Number(v.nilai);
  // Kunci tiruan: bila modul ini sampai memanggil penyedia, koneksinya terlihat sebagai koneksi asing.
  env.OPENROUTER_API_KEY = `kunci-uji-${acak()}`;
  env.OPENROUTER_BASE_URL = 'http://192.0.2.1:9/api/v1';
  await UJI.siapkan();
});

after(async () => {
  try {
    env.OPENROUTER_API_KEY = ENV_ASLI.kunci;
    env.OPENROUTER_BASE_URL = ENV_ASLI.url;
    await new Promise((r) => server.close(r));
    await UJI.hapus();
  } finally {
    if (konfigAsli) await kembalikanKonfig(konfigAsli);
    await lepasKunciKartu?.();
    await lepasKunci?.();
    await pool.end();
    net.Socket.prototype.connect = connectAsli;
  }
});

/** Koneksi selain ke basis data dan server uji ini. */
function koneksiAsing() {
  const izin = new Set([Number(env.DB_PORT), server.address().port]);
  return koneksi.filter((k) => !k.path && !(['127.0.0.1', 'localhost', '::1', env.DB_HOST].includes(k.host) && izin.has(k.port)));
}

async function panggil(metode, jalur, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${jalur}`, {
    method: metode,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

test('Saklar Discover menyala, AI mati: semua rute Discover tidak memicu koneksi keluar', async () => {
  const r = await daftarPenggunaBaru(baseUrl, { versi_kebijakan: versiKebijakan });
  const token = r.json.data.token;
  await denganKonfig(AI_MATI, async () => {
    koneksi.length = 0;
    const [bidang, profesi] = UJI.kartu;
    const hasil = [
      await panggil('GET', '/discover/kartu', token),
      await panggil('PUT', `/discover/refleksi/${bidang.id}`, token, { ketertarikan: 'tertarik', yang_menarik: 'Apa itu fotosintesis?' }),
      await panggil('PUT', `/discover/refleksi/${profesi.id}`, token, { ketertarikan: 'tidak_tertarik', yang_kurang_menarik: 'Aku capek banget belajar' }),
      await panggil('PUT', '/discover/refleksi/bidang-kesehatan', token, { ketertarikan: 'tertarik' }),
      await panggil('GET', '/discover/refleksi', token),
      await panggil('POST', '/discover/profil', token, { catatan: 'Versi satu' }),
      await panggil('POST', '/discover/profil', token, { catatan: 'Versi dua' }),
      await panggil('GET', '/discover/profil', token),
      await panggil('GET', '/discover/profil/riwayat', token),
    ];
    assert.deepEqual(hasil.map((h) => h.status), [200, 200, 200, 400, 200, 201, 201, 200, 200], JSON.stringify(hasil.map((h) => h.json)));
    assert.equal(hasil[7].json.data.jumlah_versi, 2, 'rute benar-benar bekerja, bukan sekadar menolak');
    assert.deepEqual(koneksiAsing(), []);
  });
});

test('Kontrol: pemantau koneksi menangkap koneksi keluar, jadi tes di atas berarti', async () => {
  koneksi.length = 0;
  await new Promise((selesai) => {
    const s = net.connect({ host: '192.0.2.1', port: 9 });
    s.on('error', selesai);
    s.on('connect', () => s.destroy());
    setTimeout(() => {
      s.destroy();
      selesai();
    }, 200);
  });
  assert.ok(koneksiAsing().some((k) => k.host === '192.0.2.1'), 'pemantau tidak menangkap koneksi keluar');
});

test('Sumber modul Discover: tanpa kode jaringan, tanpa penyedia AI, tanpa mesin pencari', () => {
  const folder = path.join(__dirname, '..', 'src', 'modul', 'discover');
  const berkas = fs.readdirSync(folder).filter((n) => n.endsWith('.js'));
  assert.ok(berkas.length >= 5);
  const POLA = /\bfetch\(|require\(['"](?:node:)?(?:https?|http2|net|tls|dgram)['"]\)|\baxios\b|\bundici\b|penyedia-ai|mintaBalasan|cariWeb|openrouter|ngobrol/i;
  for (const n of berkas) {
    const isi = fs.readFileSync(path.join(folder, n), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.doesNotMatch(isi, POLA, n);
  }
});
