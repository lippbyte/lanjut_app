// Uji fungsi keputusan Level-In (LANJUT_042) — RB5 / SDD-Backend-Foundation
// §9.4: server dan PWA wajib memakai logika yang SAMA.
//
// 1. Teks badan kelima fungsi Lapisan 2 dibandingkan langsung dengan
//    MVP-PWA/assets/levelin.js (dijalankan di vm dengan shim window, pola
//    MVP-PWA/tools/test-levelin.js).
// 2. Keluarannya dibandingkan pada ratusan masukan acak (seed tetap).
// 3. levelAkurasiPerMapel (khusus server, tabel fallback) diuji terpisah,
//    termasuk batas 50% / 75% dan ambang yang dibaca dari konfigurasi.
// 4. Pemetaan konfigurasi_levelin <-> objek konfigurasi (konfigurasi.js).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const keputusan = require('../src/modul/levelin/keputusan');
const { bentukKonfig, rataKonfig } = require('../src/modul/levelin/konfigurasi');

const BERKAS_PWA = path.join(__dirname, '..', '..', '..', 'MVP-PWA', 'assets', 'levelin.js');
const BERKAS_KONFIG = path.join(__dirname, '..', '..', '..', 'MVP-PWA', 'data', 'levelin-konfig.json');
const ADA_PWA = fs.existsSync(BERKAS_PWA);
const LEWATI = ADA_PWA ? false : 'MVP-PWA/assets/levelin.js tidak ada di lingkungan ini';

const FUNGSI = ['gapNumerik', 'klasifikasiKartu', 'agregatPerMapel', 'ringkasSesi', 'saranHarian'];

function muatPwa() {
  const simpanan = new Map();
  const storage = {
    getItem: (k) => (simpanan.has(k) ? simpanan.get(k) : null),
    setItem: (k, v) => simpanan.set(k, String(v)),
    removeItem: (k) => simpanan.delete(k),
    clear: () => simpanan.clear(),
  };
  const win = {
    localStorage: storage,
    sessionStorage: storage,
    crypto: { randomUUID: () => null },
    location: { href: '', replace() {} },
    setTimeout: () => 0,
    clearTimeout: () => {},
    Math: global.Math,
  };
  win.window = win;
  win.document = {
    readyState: 'complete',
    body: { getAttribute: () => null },
    addEventListener: () => {},
    querySelector: () => null,
    querySelectorAll: () => [],
  };
  vm.createContext(win);
  vm.runInContext(fs.readFileSync(BERKAS_PWA, 'utf8'), win);
  return win.LANJUT_LEVELIN;
}

// Objek dari realm vm punya prototype lain — bandingkan lewat JSON.
const json = (x) => JSON.parse(JSON.stringify(x === undefined ? null : x));
const normal = (fn) => fn.toString().split(/\r?\n/).map((b) => b.trim()).filter(Boolean).join('\n');

// PRNG ber-seed (mulberry32) supaya kasus acak sama di setiap jalan.
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const MAPEL = ['matematika', 'fisika', 'biologi', 'kimia'];

function peristiwaAcak(r, n) {
  return Array.from({ length: n }, () => ({
    mapel_id: MAPEL[Math.floor(r() * MAPEL.length)],
    keyakinan: r() < 0.15 ? null : 1 + Math.floor(r() * 5),
    benar: r() < 0.5,
  }));
}

test('teks badan kelima fungsi Lapisan 2 identik dengan PWA', { skip: LEWATI }, () => {
  const pwa = muatPwa();
  for (const nama of FUNGSI) {
    assert.equal(normal(keputusan[nama]), normal(pwa[nama]), `${nama} menyimpang dari MVP-PWA/assets/levelin.js`);
  }
  assert.deepEqual(json(keputusan.KONFIG_BAWAAN), json(pwa.KONFIG_BAWAAN), 'KONFIG_BAWAAN menyimpang');
});

test('keluaran sama dengan PWA pada ratusan masukan acak (seed tetap)', { skip: LEWATI }, () => {
  const pwa = muatPwa();
  const r = prng(42);
  const cfg = json(keputusan.KONFIG_BAWAAN);

  for (const k of [null, undefined, 1, 2, 3, 4, 5]) {
    for (const benar of [true, false]) {
      assert.equal(keputusan.gapNumerik(k, benar), pwa.gapNumerik(k, benar));
      assert.equal(keputusan.klasifikasiKartu(k, benar, cfg), pwa.klasifikasiKartu(k, benar, cfg));
    }
  }

  for (let i = 0; i < 300; i++) {
    const varian = json(cfg);
    varian.ambang.minimum_kartu = 1 + Math.floor(r() * 8);
    varian.ambang.jendela_per_mapel = 1 + Math.floor(r() * 30);
    varian.ambang.ambang_overconfident = Math.round(r() * 100) / 100;
    const peristiwa = peristiwaAcak(r, Math.floor(r() * 60));
    const semua = r() < 0.5 ? MAPEL : MAPEL.slice(0, 2);

    const aggServer = keputusan.agregatPerMapel(peristiwa, varian, semua);
    const aggPwa = pwa.agregatPerMapel(json(peristiwa), json(varian), json(semua));
    assert.deepEqual(json(aggServer), json(aggPwa), `agregatPerMapel kasus ${i}`);

    const sesi = peristiwa.filter((p) => p.keyakinan !== null).slice(0, 12);
    assert.deepEqual(json(keputusan.ringkasSesi(sesi)), json(pwa.ringkasSesi(json(sesi))), `ringkasSesi kasus ${i}`);

    const ketersediaan = {};
    for (const m of MAPEL) if (r() < 0.6) ketersediaan[m] = Math.floor(r() * 5);
    assert.deepEqual(
      json(keputusan.saranHarian(aggServer, ketersediaan, varian)),
      json(pwa.saranHarian(json(aggServer), json(ketersediaan), json(varian))),
      `saranHarian kasus ${i}`
    );
  }
});

test('gapNumerik & klasifikasiKartu: nilai acuan SDD §6.1a/b', () => {
  const cfg = keputusan.KONFIG_BAWAAN;
  assert.equal(keputusan.gapNumerik(1, true), -1);
  assert.equal(keputusan.gapNumerik(5, true), 0);
  assert.equal(keputusan.gapNumerik(3, false), 0.5);
  assert.equal(keputusan.gapNumerik(null, true), null);
  assert.equal(keputusan.klasifikasiKartu(5, false, cfg), 'overconfident');
  assert.equal(keputusan.klasifikasiKartu(2, true, cfg), 'underconfident');
  assert.equal(keputusan.klasifikasiKartu(3, false, cfg), 'netral');
  assert.equal(keputusan.klasifikasiKartu(4, true, cfg), 'selaras');
});

// --- levelAkurasiPerMapel (khusus server) ------------------------------------

const jawaban = (mapel, benar, salah) => [
  ...Array.from({ length: benar }, () => ({ mapel_id: mapel, benar: true })),
  ...Array.from({ length: salah }, () => ({ mapel_id: mapel, benar: false })),
];
const CFG = () => bentukKonfig([]);

test('level akurasi: < 10 jawaban → belum_cukup_data (tanpa level), walau semuanya benar', () => {
  const h = keputusan.levelAkurasiPerMapel(jawaban('fisika', 9, 0), CFG(), []);
  assert.deepEqual(h.fisika, { kartu_dijawab: 9, n_benar: 9, rate_benar: 1, level: 'belum_cukup_data' });
});

test('level akurasi: tabel fallback termasuk batas 50% dan 75%', () => {
  const kasus = [
    [4, 6, 'perlu_penguatan_dasar'], // 40%
    [24, 26, 'perlu_penguatan_dasar'], // 48%
    [5, 5, 'cukup_lanjut_latihan'], // tepat 50%
    [6, 4, 'cukup_lanjut_latihan'], // 60%
    [15, 5, 'cukup_lanjut_latihan'], // tepat 75%
    [8, 2, 'sudah_kuat'], // 80%
    [10, 0, 'sudah_kuat'], // 100%
    [0, 10, 'perlu_penguatan_dasar'], // 0%
  ];
  for (const [b, s, level] of kasus) {
    const h = keputusan.levelAkurasiPerMapel(jawaban('kimia', b, s), CFG(), []).kimia;
    assert.equal(h.level, level, `${b} benar / ${s} salah`);
    assert.equal(h.kartu_dijawab, b + s);
  }
});

test('level akurasi: hanya jendela terbaru per mapel yang dihitung', () => {
  // 30 salah lama, lalu 50 benar terbaru → jendela 50 hanya melihat yang benar.
  const h = keputusan.levelAkurasiPerMapel([...jawaban('fisika', 0, 30), ...jawaban('fisika', 50, 0)], CFG(), []).fisika;
  assert.equal(h.kartu_dijawab, 50);
  assert.equal(h.level, 'sudah_kuat');
});

test('level akurasi: mapel tanpa jawaban tetap muncul eksplisit', () => {
  const h = keputusan.levelAkurasiPerMapel([], CFG(), ['biologi']);
  assert.deepEqual(h.biologi, { kartu_dijawab: 0, n_benar: 0, rate_benar: null, level: 'belum_cukup_data' });
});

test('level akurasi: ambang dibaca dari konfigurasi, bukan angka di kode', () => {
  const cfg = bentukKonfig([
    { kunci: 'level_minimum_kartu', nilai: '4' },
    { kunci: 'level_batas_bawah', nilai: '0.6' },
    { kunci: 'level_batas_atas', nilai: '0.9' },
  ]);
  const h = keputusan.levelAkurasiPerMapel([...jawaban('a', 5, 5), ...jawaban('b', 3, 1), ...jawaban('c', 3, 0)], cfg, []);
  assert.equal(h.a.level, 'perlu_penguatan_dasar', '50% < 60%');
  assert.equal(h.b.level, 'cukup_lanjut_latihan', '75% di antara 60–90%');
  assert.equal(h.c.level, 'belum_cukup_data', '3 < minimum 4');
});

// --- konfigurasi.js ----------------------------------------------------------

test('konfigurasi: data/levelin-konfig.json → baris → objek konfigurasi', { skip: fs.existsSync(BERKAS_KONFIG) ? false : 'berkas konfigurasi tidak ada' }, () => {
  const baris = rataKonfig(JSON.parse(fs.readFileSync(BERKAS_KONFIG, 'utf8')));
  assert.equal(baris.length, 11);
  assert.ok(baris.every((b) => typeof b.nilai === 'string' && b.dasar));
  assert.deepEqual(json(bentukKonfig(baris)), {
    versi: 1,
    aturan_versi: 1,
    ambang: { ambang_overconfident: 0.4, minimum_kartu: 5, jendela_per_mapel: 50 },
    klasifikasi: { keyakinan_tinggi_minimal: 4, keyakinan_rendah_maksimal: 2 },
    akses: { ringkasan_kalibrasi_sesi: 'gratis', tampilan_agregat_mapel: 'gratis' },
    level_akurasi: { minimum_kartu: 10, batas_bawah: 0.5, batas_atas: 0.75 },
  });
});

test('konfigurasi: tabel kosong → bawaan; kunci asing & angka tak sah diabaikan per kunci', () => {
  assert.deepEqual(json(bentukKonfig([])).ambang, { ambang_overconfident: 0.4, minimum_kartu: 5, jendela_per_mapel: 50 });
  const cfg = bentukKonfig([
    { kunci: 'minimum_kartu', nilai: 'bukan-angka' },
    { kunci: 'kunci_tak_dikenal', nilai: '9' },
    { kunci: 'ambang_overconfident', nilai: '0.5' },
  ]);
  assert.equal(cfg.ambang.minimum_kartu, 5);
  assert.equal(cfg.ambang.ambang_overconfident, 0.5);
  assert.equal(cfg.kunci_tak_dikenal, undefined);
});
