// tests/onboarding.test.js
// Onboarding cerita sebelum Masuk/Daftar (15 Okt 2026 — pilihan percakapan, belum disetujui PM).
// Isi & aturan murni (lib/onboarding.ts) dijalankan langsung lewat muat-ts-app.js; AuthProvider,
// layout (auth), dan komponen dicek dari sumbernya.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { muatModulApp } = require('./muat-ts-app');

const AKAR_APP = path.join(__dirname, '..', '..');
const AKAR_REPO = path.join(AKAR_APP, '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8');

const onboarding = muatModulApp('lib/onboarding');
const { color, gradient } = muatModulApp('theme/tokens');
const { LAYAR_ONBOARDING, layarTerakhir, indeksDariGeser, letakWarnaDalam } = onboarding;

/** Rasio kontras WCAG dua warna #RRGGBB. */
function kontras(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
  };
  const [t, g] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (t + 0.05) / (g + 0.05);
}

/** rgba(r,g,b,a) di atas latar #RRGGBB → #RRGGBB. */
function campur(rgba, latar) {
  const [r, g, b, a] = rgba.match(/[\d.]+/g).map(Number);
  const dasar = [1, 3, 5].map((i) => parseInt(latar.slice(i, i + 2), 16));
  return '#' + [r, g, b].map((c, i) => Math.round(c * a + dasar[i] * (1 - a)).toString(16).padStart(2, '0')).join('');
}

describe('isi onboarding = salinan teks §3 (seperti MVP-PWA/onboarding.html)', () => {
  const pwa = fs.readFileSync(path.join(AKAR_REPO, 'MVP-PWA', 'onboarding.html'), 'utf8');
  const salinan = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'), 'utf8');

  test('empat layar cerita, urutan sama dengan PWA', () => {
    assert.equal(LAYAR_ONBOARDING.length, 4);
    let sebelum = -1;
    for (const layar of LAYAR_ONBOARDING) {
      const letak = pwa.indexOf(layar.judul);
      assert.ok(letak > sebelum, `judul "${layar.judul}" ada di PWA, berurutan`);
      sebelum = letak;
    }
  });

  test('setiap teks persis ada di PWA dan di salinan teks (kecuali ejaan "sarannya")', () => {
    for (const layar of LAYAR_ONBOARDING) {
      for (const teks of [layar.judul, layar.isi, ...(layar.butir ?? [])].filter(Boolean)) {
        assert.ok(pwa.includes(teks), `PWA: ${teks}`);
        assert.ok(salinan.includes(teks.replace('sarannya', 'saranya')), `salinan: ${teks}`);
      }
    }
  });

  test('setiap layar punya isi atau butir; label tombol sesuai salinan ("Mulai" di layar terakhir)', () => {
    for (const layar of LAYAR_ONBOARDING) assert.ok(layar.isi || layar.butir?.length, layar.judul);
    assert.match(salinan, /`\[ Mulai \]`/);
    assert.equal(onboarding.TEKS_ONBOARDING.mulai, 'Mulai');
    assert.equal(onboarding.TEKS_ONBOARDING.lanjut, 'Lanjut');
    assert.equal(onboarding.TEKS_ONBOARDING.lewati, 'Lewati');
    // Sama dengan tautan bawah form Daftar.
    assert.ok(baca('components', 'screens', 'auth', 'RegisterScreen.tsx').includes('teks="Sudah punya akun?" tautan="Masuk"'));
  });
});

describe('aturan murni', () => {
  test('layarTerakhir hanya layar ke-4', () => {
    assert.deepEqual([0, 1, 2, 3].map(layarTerakhir), [false, false, false, true]);
  });

  test('indeksDariGeser: membulatkan ke layar terdekat dan dijepit ke rentang', () => {
    assert.equal(indeksDariGeser(0, 360), 0);
    assert.equal(indeksDariGeser(179, 360), 0);
    assert.equal(indeksDariGeser(181, 360), 1);
    assert.equal(indeksDariGeser(360 * 3, 360), 3);
    assert.equal(indeksDariGeser(360 * 9, 360), 3, 'pantulan geser di ujung');
    assert.equal(indeksDariGeser(-40, 360), 0, 'pantulan geser di awal');
    assert.equal(indeksDariGeser(500, 0), 0, 'lebar belum terukur');
    assert.equal(indeksDariGeser(Number.NaN, 360), 0);
  });

  test('letakWarnaDalam: tepat di atas teks, dijepit, bawaan sebelum terukur', () => {
    assert.equal(letakWarnaDalam(320, 800), 0.4);
    assert.equal(letakWarnaDalam(0, 800), 0.6);
    assert.equal(letakWarnaDalam(320, 0), 0.6);
    assert.equal(letakWarnaDalam(50, 800), 0.3);
    assert.equal(letakWarnaDalam(790, 800), 0.95);
  });
});

describe('kontras: teks putih hanya di atas warna terdalam gradasi', () => {
  test('warna terdalam blue600; putih ≥ 4,5:1, teks isi (onDarkText) ≥ 4,5:1', () => {
    const dalam = gradient.onboarding.colors.at(-1);
    assert.equal(dalam, color.blue600);
    assert.ok(kontras(color.white, dalam) >= 4.5, kontras(color.white, dalam).toFixed(2));
    const isi = campur(color.onDarkText, dalam);
    assert.ok(kontras(isi, dalam) >= 4.5, `${isi}: ${kontras(isi, dalam).toFixed(2)}`);
    // Pembanding: ujung gradasi cover PWA (blue400) tidak cukup untuk teks putih.
    assert.ok(kontras(color.white, gradient.cover.colors.at(-1)) < 3);
  });

  test('tombol: blue600 di putih ≥ 4,5:1', () => {
    assert.ok(kontras(color.blue600, color.white) >= 4.5);
  });

  test('komponen menaruh warna terdalam tepat di atas teks yang terukur', () => {
    const sumber = baca('components', 'screens', 'auth', 'OnboardingScreen.tsx');
    assert.match(sumber, /const dalam = letakWarnaDalam\(atasTeks, tinggi\);/);
    assert.match(sumber, /locations=\{\[0, dalam \* 0\.55, dalam\]\}/);
    assert.match(sumber, /colors=\{gradient\.onboarding\.colors\}/);
    assert.match(sumber, /onLayout=\{\(e\) => setAtasTeks\(e\.nativeEvent\.layout\.y\)\}/);
    // Semua teks (judul, isi, titik, tombol) ada di dalam blok yang diukur itu.
    const blokTeks = sumber.slice(sumber.indexOf('setAtasTeks(e.nativeEvent.layout.y)'));
    for (const bagian of ['s.judul', 's.isi', 's.tombolTeks', 's.lewatiTeks', 's.tautanBaris']) {
      assert.ok(blokTeks.includes(bagian), bagian);
    }
  });
});

describe('kapan onboarding tampil (AuthProvider)', () => {
  const sumber = baca('providers', 'AuthProvider.tsx');

  test('hanya saat app dibuka tanpa sesi tersimpan', () => {
    assert.match(sumber, /if \(!tersimpan\) \{\s*setPerluOnboarding\(true\);\s*setStatus\('keluar'\);\s*return;\s*\}/);
    assert.equal(sumber.match(/setPerluOnboarding\(true\)/g).length, 1, 'tidak ada tempat lain yang menyalakannya');
    assert.match(sumber, /useState\(false\);\s*const queryClient/, 'bawaan: tidak tampil');
  });

  test('keluar dan sesi berakhir tidak memunculkan onboarding', () => {
    for (const nama of ['akhiriSesi', 'keluar', 'terapkanSesi']) {
      const awal = sumber.indexOf(`const ${nama} = useCallback(`);
      assert.ok(awal >= 0, nama);
      const isi = sumber.slice(awal, sumber.indexOf('}, [', awal));
      assert.doesNotMatch(isi, /setPerluOnboarding/, nama);
    }
  });

  test('perluOnboarding & selesaikanOnboarding ada di nilai konteks', () => {
    assert.match(sumber, /perluOnboarding: boolean;\s*selesaikanOnboarding: \(\) => void;/);
    assert.match(sumber, /const selesaikanOnboarding = useCallback\(\(\) => setPerluOnboarding\(false\), \[\]\);/);
    assert.match(sumber, /\(\{ status, token, pengguna, alasanKeluar, perluOnboarding, selesaikanOnboarding,/);
  });
});

describe('layout (auth) memasang onboarding di atas Masuk/Daftar', () => {
  const sumber = baca('app', '(auth)', '_layout.tsx');

  test('sudah masuk → Linimasa; sesi masih dipulihkan → memuat (onboarding tidak berkedip)', () => {
    const iMemuat = sumber.indexOf("if (status === 'memuat') return <LayarMemuat />;");
    const iMasuk = sumber.indexOf("if (status === 'masuk') return <Redirect href=\"/linimasa\" />;");
    const iOnboarding = sumber.indexOf('<OnboardingScreen');
    assert.ok(iMemuat > 0 && iMasuk > iMemuat && iOnboarding > iMasuk);
  });

  test('Masuk/Daftar belum dipasang selama onboarding; dipasang saat onboarding memudar', () => {
    assert.match(sumber, /\{perluOnboarding \? null : <Slot \/>\}/);
    assert.match(sumber, /\{perluOnboarding \|\| memudar \? \(\s*<OnboardingScreen keluar=\{!perluOnboarding\}/);
    assert.match(sumber, /onHilang=\{\(\) => setMemudar\(false\)\}/);
  });

  test('tujuan: Mulai → Daftar, Masuk → Masuk, Lewati → layar yang dituju', () => {
    assert.match(sumber, /if \(tujuan === 'daftar' && pathname !== '\/daftar'\) router\.replace\('\/daftar'\);/);
    assert.match(sumber, /if \(tujuan === 'masuk' && pathname !== '\/masuk'\) router\.replace\('\/masuk'\);/);
    assert.match(sumber, /setMemudar\(true\);\s*selesaikanOnboarding\(\);/);
    const komponen = baca('components', 'screens', 'auth', 'OnboardingScreen.tsx');
    assert.match(komponen, /const lanjut = \(\) => \(terakhir \? onPilih\('daftar'\) : keLayar\(indeks \+ 1\)\);/);
    assert.match(komponen, /onPress=\{\(\) => onPilih\('masuk'\)\}/);
    assert.match(komponen, /onPress=\{\(\) => onPilih\('semula'\)\}/);
  });
});

describe('komponen OnboardingScreen', () => {
  const sumber = baca('components', 'screens', 'auth', 'OnboardingScreen.tsx');

  test('kelinci putih PWA (berkas ada), tanpa paket baru', () => {
    assert.match(sumber, /require\('\.\.\/\.\.\/\.\.\/assets\/mascot-white\.png'\)/);
    assert.ok(fs.existsSync(path.join(AKAR_APP, 'assets', 'mascot-white.png')));
    const impor = [...sumber.matchAll(/from '([^']+)'/g)].map((m) => m[1]);
    const boleh = new Set(['react', 'react-native', 'expo-linear-gradient', 'react-native-safe-area-context']);
    for (const asal of impor) assert.ok(boleh.has(asal) || asal.startsWith('.'), `impor ${asal}`);
  });

  test('geser ke samping (paging) dan titik langkah mengikuti geseran', () => {
    assert.match(sumber, /horizontal\s+pagingEnabled/);
    assert.match(sumber, /Animated\.event\(\[\{ nativeEvent: \{ contentOffset: \{ x: gerak\.geser \} \} \}\]/);
    assert.match(sumber, /setIndeks\(indeksDariGeser\(e\.nativeEvent\.contentOffset\.x, lebar\)\)/);
  });

  test('tombol kembali Android mundur satu layar, tidak di layar pertama', () => {
    assert.match(sumber, /if \(keluar \|\| indeks === 0\) return;\s*const langganan = BackHandler\.addEventListener\('hardwareBackPress'/);
    assert.match(sumber, /return \(\) => langganan\.remove\(\);/);
  });

  test('muncul bersamaan dengan memudarnya layar pembuka, dengan batas tunggu', () => {
    assert.match(sumber, /const pembukaMenutup = usePembukaMenutup\(\);/);
    assert.match(sumber, /setTimeout\(\(\) => setBolehMasuk\(true\), BATAS_TUNGGU_PEMBUKA_MS\)/);
    assert.ok(onboarding.BATAS_TUNGGU_PEMBUKA_MS > muatModulApp('lib/pembuka').MAKS_TAMPIL_MS);
  });

  test('"kurangi gerakan": tanpa animasi masuk/mengambang dan tanpa geser beranimasi', () => {
    assert.match(sumber, /AccessibilityInfo\.isReduceMotionEnabled\?\.\(\)/);
    assert.match(sumber, /if \(tanpaGerak\) \{\s*gerak\.muncul\.setValue\(1\);/);
    assert.match(sumber, /animated: !tanpaGerak/);
  });

  test('aksesibilitas: halaman tak aktif disembunyikan dari pembaca layar; judul = header', () => {
    assert.match(sumber, /aria-hidden=\{i !== indeks\}/);
    assert.match(sumber, /importantForAccessibility=\{i === indeks \? 'auto' : 'no-hide-descendants'\}/);
    assert.match(sumber, /accessibilityRole="header"/);
    assert.match(sumber, /pointerEvents=\{keluar \? 'none' : 'auto'\}/);
  });
});
