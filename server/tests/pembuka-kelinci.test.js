// tests/pembuka-kelinci.test.js
// Animasi pembuka app dengan kelinci LANJUT (15 Okt 2026 — pilihan percakapan, belum disetujui PM).
// Aturan waktu (lib/pembuka.ts) dijalankan langsung lewat muat-ts-app.js; komponen dan
// root layout dicek dari sumbernya.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { muatModulApp } = require('./muat-ts-app');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8');

const pembuka = muatModulApp('lib/pembuka');
const { MIN_TAMPIL_MS, MAKS_TAMPIL_MS, bolehTutup, sisaSebelumTutup } = pembuka;

describe('aturan waktu layar pembuka', () => {
  test('app siap: menunggu waktu tampil minimum dulu, lalu boleh tutup', () => {
    assert.equal(bolehTutup(true, 0), false);
    assert.equal(bolehTutup(true, MIN_TAMPIL_MS - 1), false);
    assert.equal(bolehTutup(true, MIN_TAMPIL_MS), true);
    assert.equal(sisaSebelumTutup(true, 300), MIN_TAMPIL_MS - 300);
    assert.equal(sisaSebelumTutup(true, MIN_TAMPIL_MS + 50), 0);
  });

  test('app belum siap: tetap tampil melewati minimum, tidak menutup sebelum waktunya', () => {
    for (const ms of [0, MIN_TAMPIL_MS, MIN_TAMPIL_MS + 500, MAKS_TAMPIL_MS - 1]) {
      assert.equal(bolehTutup(false, ms), false, `belum siap, ${ms} ms`);
    }
    assert.equal(sisaSebelumTutup(false, 300), MAKS_TAMPIL_MS - 300);
  });

  test('pengaman: paling lama MAKS_TAMPIL_MS walau app belum siap', () => {
    assert.equal(bolehTutup(false, MAKS_TAMPIL_MS), true);
    assert.equal(bolehTutup(false, MAKS_TAMPIL_MS + 10_000), true);
    assert.equal(sisaSebelumTutup(false, MAKS_TAMPIL_MS), 0);
  });

  test('sisa waktu tidak pernah negatif dan tidak melebihi batas atas', () => {
    for (const siap of [true, false]) {
      for (let ms = 0; ms <= MAKS_TAMPIL_MS + 1000; ms += 50) {
        const sisa = sisaSebelumTutup(siap, ms);
        assert.ok(sisa >= 0 && sisa <= MAKS_TAMPIL_MS, `siap=${siap}, ${ms} ms → ${sisa}`);
        assert.equal(sisa === 0, bolehTutup(siap, ms), `siap=${siap}, ${ms} ms`);
      }
    }
  });

  // Revisi 15 Okt (pilihan percakapan): versi 0,9 detik terasa "terlalu sekilas" dan kurang halus.
  test('tidak sekilas, tetapi tetap tidak menahan app', () => {
    assert.ok(MIN_TAMPIL_MS >= 1500 && MIN_TAMPIL_MS <= 2500, `minimum tampil ${MIN_TAMPIL_MS} ms`);
    assert.ok(MAKS_TAMPIL_MS <= 5000, 'tidak menahan app lebih dari 5 detik');
    assert.ok(MIN_TAMPIL_MS < MAKS_TAMPIL_MS);
    assert.ok(pembuka.TUNGGU_GAMBAR_MS <= 500, 'menunggu gambar kelinci sebentar saja');
    const wordmarkSelesai = pembuka.JEDA_WORDMARK_MS + pembuka.DURASI_WORDMARK_MS;
    assert.ok(pembuka.DURASI_MASUK_MS < MIN_TAMPIL_MS && wordmarkSelesai < MIN_TAMPIL_MS, 'animasi masuk selesai sebelum boleh tutup');
    assert.ok(pembuka.DURASI_MASUK_MS >= 600, 'masuk tidak tergesa');
    assert.ok(pembuka.DURASI_KELUAR_MS >= 400 && pembuka.DURASI_KELUAR_MS <= 700, 'pudar keluar terlihat, tidak berlarut');
    assert.ok(pembuka.DURASI_KELUAR_TANPA_GERAK_MS < pembuka.DURASI_KELUAR_MS);
    assert.ok(pembuka.DURASI_MENGAMBANG_MS >= 2000, 'mengambang pelan');
  });

  test('gerakannya tetap kecil ("tipis")', () => {
    assert.ok(pembuka.SKALA_AWAL >= 0.8 && pembuka.SKALA_AWAL < 1);
    assert.ok(pembuka.SKALA_KELUAR > 1 && pembuka.SKALA_KELUAR <= 1.1);
    assert.ok(pembuka.GESER_AWAL_PX > 0 && pembuka.GESER_AWAL_PX <= 16);
    assert.ok(pembuka.AMBANG_MENGAMBANG_PX > 0 && pembuka.AMBANG_MENGAMBANG_PX <= 6);
  });

  test('kurva masuk & keluar: titik kendali cubic-bezier yang sah, masuk melambat di akhir', () => {
    for (const kurva of [pembuka.KURVA_MASUK, pembuka.KURVA_KELUAR]) {
      assert.equal(kurva.length, 4);
      assert.ok(kurva[0] >= 0 && kurva[0] <= 1 && kurva[2] >= 0 && kurva[2] <= 1, `x1/x2 di [0,1]: ${kurva}`);
    }
    // ease-out: lereng awal (y1/x1) curam, mendarat mendatar (y2 = 1).
    assert.ok(pembuka.KURVA_MASUK[1] / pembuka.KURVA_MASUK[0] > 3);
    assert.equal(pembuka.KURVA_MASUK[3], 1);
  });
});

describe('lintasan mengambang', () => {
  const { lintasanMengambang, AMBANG_MENGAMBANG_PX } = pembuka;

  test('mulai dan berakhir di 0, puncak −amplitudo di tengah: putaran bersambung tanpa lompatan', () => {
    const { inputRange, outputRange } = lintasanMengambang();
    assert.equal(inputRange[0], 0);
    assert.equal(inputRange.at(-1), 1);
    assert.equal(outputRange[0], 0);
    assert.ok(Math.abs(outputRange.at(-1)) < 1e-9);
    assert.equal(Math.min(...outputRange), -AMBANG_MENGAMBANG_PX);
    assert.equal(outputRange[inputRange.indexOf(0.5)], -AMBANG_MENGAMBANG_PX);
  });

  test('inputRange naik tegas (syarat interpolate) dan langkahnya kecil (halus)', () => {
    const { inputRange, outputRange } = lintasanMengambang(5, 16);
    assert.equal(inputRange.length, outputRange.length);
    for (let i = 1; i < inputRange.length; i++) {
      assert.ok(inputRange[i] > inputRange[i - 1]);
      assert.ok(Math.abs(outputRange[i] - outputRange[i - 1]) <= 1.1, `lompatan ${i}`);
    }
  });

  test('kecepatan nol di sambungan putaran: langkah pertama & terakhir paling kecil', () => {
    const { outputRange } = lintasanMengambang(5, 16);
    const langkah = outputRange.slice(1).map((v, i) => Math.abs(v - outputRange[i]));
    assert.ok(langkah[0] - Math.min(...langkah) < 1e-9);
    assert.ok(Math.abs(langkah.at(-1) - langkah[0]) < 1e-9);
    assert.ok(langkah[0] < langkah[4] / 3, 'jauh lebih pelan di ujung daripada di tengah naik');
  });
});

describe('komponen PembukaKelinci', () => {
  const sumber = baca('components', 'layout', 'PembukaKelinci.tsx');

  test('memakai kelinci LANJUT (berkas ada) dan wordmark', () => {
    assert.match(sumber, /require\('\.\.\/\.\.\/assets\/maskot-ai-biru\.png'\)/);
    assert.match(sumber, /require\('\.\.\/\.\.\/assets\/lanjut-wordmark\.png'\)/);
    assert.ok(fs.existsSync(path.join(AKAR_APP, 'assets', 'maskot-ai-biru.png')));
    assert.ok(fs.existsSync(path.join(AKAR_APP, 'assets', 'lanjut-wordmark.png')));
  });

  test('hiasan saja: tidak menangkap sentuhan dan tersembunyi dari pembaca layar', () => {
    assert.match(sumber, /pointerEvents="none"/);
    assert.match(sumber, /aria-hidden/);
    assert.match(sumber, /importantForAccessibility="no-hide-descendants"/);
  });

  test('menghormati "kurangi gerakan" di perangkat', () => {
    assert.match(sumber, /AccessibilityInfo\.isReduceMotionEnabled\?\.\(\)/);
    assert.match(sumber, /if \(tanpaGerak\) \{/);
  });

  test('jadwal tutup memakai aturan lib/pembuka, dihitung sejak animasi masuk dimulai, dan dilepas sesudah selesai', () => {
    assert.match(sumber, /sisaSebelumTutup\(siap, Date\.now\(\) - mulaiMs\)/);
    assert.match(sumber, /if \(menutup\.current \|\| mulaiMs === null\) return;/);
    assert.match(sumber, /if \(selesai\) return null;/);
  });

  test('halus: masuk menunggu gambar kelinci (dengan batas), mengambang dimulai bersamaan, simpul animasi dibuat sekali', () => {
    assert.match(sumber, /onLoad=\{\(\) => setGambarSiap\(true\)\}/);
    assert.match(sumber, /setTimeout\(\(\) => setGambarSiap\(true\), TUNGGU_GAMBAR_MS\)/);
    assert.match(sumber, /if \(selesai \|\| !gambarSiap\) return;/);
    // Satu Animated.parallel: masuk, wordmark, dan loop mengambang (bukan masuk.start(() => mengambang.start())).
    assert.match(sumber, /Animated\.parallel\(\[[\s\S]*Animated\.loop\(\s*Animated\.timing\(ambang/);
    assert.doesNotMatch(sumber, /\.start\(\(\) => \w+\.start\(\)\)/);
    assert.match(sumber, /ambang\.interpolate\(MENGAMBANG\)/);
    assert.match(sumber, /const \[gerak\] = useState\(\(\) => \(\{/);
    assert.doesNotMatch(sumber.slice(sumber.indexOf('if (selesai) return null;')), /\.interpolate\(/, 'tanpa interpolate baru di render');
  });

  test('memberi sinyal saat mulai memudar keluar (untuk onboarding di bawahnya)', () => {
    assert.match(sumber, /menutup\.current = true;\s*tandaiMenutup\(\);/);
    assert.match(sumber, /export function usePembukaMenutup\(\): boolean/);
  });

  test('tanpa paket baru: hanya react, react-native, dan berkas lokal', () => {
    const impor = [...sumber.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    for (const asal of impor) {
      assert.ok(asal === 'react' || asal === 'react-native' || asal.startsWith('.'), `impor ${asal}`);
    }
  });
});

describe('root layout memasang pembuka sekali', () => {
  const sumber = baca('app', '_layout.tsx');

  test('menunggu huruf DAN sesi, dipasang sesudah isi (di atasnya)', () => {
    assert.match(sumber, /<PembukaKelinci siap=\{hurufBeres && sesiSiap\} \/>\r?\n\s*<\/View>/);
    assert.match(sumber, /<Slot \/>\r?\n\s*<TandaSesiSiap onSiap=\{setSesiSiap\} \/>\r?\n\s*<\/AuthProvider>/);
  });

  test('galat muat huruf tetap tidak mengunci app', () => {
    assert.match(sumber, /const hurufBeres = hurufSiap \|\| !!galatHuruf;/);
  });
});
