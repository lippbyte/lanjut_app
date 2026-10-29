// LANJUT_086 — build rilis Android tidak memakai debug.keystore. Plugin konfigurasi
// LANJUT_App/plugins/withKeystoreRilis.js diuji pada potongan app/build.gradle template Expo SDK 57
// (android/ dibuat ulang oleh `expo prebuild`, tidak ada di repo). Tanpa basis data.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { tambahkanTandaTanganRilis, PENANDA } = require('../../plugins/withKeystoreRilis');

const AKAR_APP = path.join(__dirname, '..', '..');
const AKAR_REPO = path.join(AKAR_APP, '..');

// Potongan app/build.gradle hasil `expo prebuild` (SDK 57) sebelum plugin.
const TEMPLATE = [
  'apply plugin: "com.android.application"',
  '',
  "def jscFlavor = 'io.github.react-native-community:jsc-android:2026004.+'",
  '',
  'android {',
  '    ndkVersion rootProject.ext.ndkVersion',
  '    defaultConfig {',
  "        applicationId 'com.edilakso.lanjut'",
  '        versionCode 1',
  '        versionName "1.0"',
  '    }',
  '    signingConfigs {',
  '        debug {',
  "            storeFile file('debug.keystore')",
  "            storePassword 'android'",
  "            keyAlias 'androiddebugkey'",
  "            keyPassword 'android'",
  '        }',
  '    }',
  '    buildTypes {',
  '        debug {',
  '            signingConfig signingConfigs.debug',
  '        }',
  '        release {',
  '            // Caution! In production, you need to generate your own keystore file.',
  '            // see https://reactnative.dev/docs/signed-apk-android.',
  '            signingConfig signingConfigs.debug',
  "            def enableShrinkResources = findProperty('android.enableShrinkResourcesInReleaseBuilds') ?: 'false'",
  '            shrinkResources enableShrinkResources.toBoolean()',
  '        }',
  '    }',
  '}',
  '',
  'dependencies {',
  '    implementation("com.facebook.react:react-android")',
  '}',
  '',
].join('\n');

/** Isi satu blok `nama {` pada indentasi tertentu, sampai kurung tutupnya. */
function blok(isi, kepala) {
  const i = isi.indexOf(`${kepala} {\n`);
  assert.ok(i >= 0, `blok "${kepala.trim()}" tidak ada`);
  const indent = /^ */.exec(kepala)[0];
  return isi.slice(i, isi.indexOf(`\n${indent}}\n`, i) + indent.length + 2);
}

test('release ditandatangani signingConfigs.release dari keystore.properties di luar repo, bukan debug.keystore', () => {
  const hasil = tambahkanTandaTanganRilis(TEMPLATE);
  const buildTypes = blok(hasil, '    buildTypes');
  const rilis = blok(buildTypes.slice(buildTypes.indexOf('        release {')), '        release');
  assert.match(rilis, /signingConfig signingConfigs\.release\n/);
  assert.doesNotMatch(rilis, /signingConfigs\.debug|debug\.keystore|Caution! In production/);
  assert.match(blok(buildTypes, '        debug'), /signingConfig signingConfigs\.debug/, 'build debug tetap debug key');

  const konfigRilis = blok(blok(hasil, '    signingConfigs'), '        release');
  assert.match(konfigRilis, /if \(lanjutKeystoreAda\)/);
  for (const k of ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']) {
    assert.ok(konfigRilis.includes(`lanjutKeystoreProps['${k}']`), k);
  }
  assert.doesNotMatch(konfigRilis, /'android'|debug\.keystore/, 'tanpa sandi atau berkas tertulis mati');
  assert.match(hasil, /System\.getenv\('LANJUT_KEYSTORE_PROPS'\)/);
  assert.ok(hasil.indexOf('LANJUT_KEYSTORE_PROPS') < hasil.indexOf('\nandroid {'), 'properti dibaca sebelum blok android');
});

test('tanpa keystore.properties, tugas rilis :app gagal (GradleException), tidak jatuh ke debug key', () => {
  const hasil = tambahkanTandaTanganRilis(TEMPLATE);
  const penjaga = hasil.slice(hasil.lastIndexOf(PENANDA));
  assert.match(penjaga, /gradle\.taskGraph\.whenReady/);
  assert.match(penjaga, /it\.name\.toLowerCase\(\)\.contains\('release'\)/);
  assert.match(penjaga, /if \(!tugasRilis\.isEmpty\(\) && !lanjutKeystoreAda\) \{\n\s+throw new GradleException\(/);
});

test('idempoten, menjaga CRLF, dan menolak template yang berubah (prebuild berhenti, bukan diam-diam memakai debug key)', () => {
  const sekali = tambahkanTandaTanganRilis(TEMPLATE);
  assert.equal(tambahkanTandaTanganRilis(sekali), sekali);
  const crlf = tambahkanTandaTanganRilis(TEMPLATE.replace(/\n/g, '\r\n'));
  assert.equal(crlf, sekali.replace(/\n/g, '\r\n'));
  assert.throws(() => tambahkanTandaTanganRilis(TEMPLATE.replace('            signingConfig signingConfigs.debug\n            def', '            def')), /release/);
  assert.throws(() => tambahkanTandaTanganRilis(TEMPLATE.replace('    signingConfigs {', '    signingKonfig {')), /signingConfigs/);
});

test('app.config.ts memakai plugin; versionName 1.0 dan versionCode 1', () => {
  const konfig = fs.readFileSync(path.join(AKAR_APP, 'app.config.ts'), 'utf8');
  assert.match(konfig, /'\.\/plugins\/withKeystoreRilis'/);
  assert.match(konfig, /version: '1\.0',/);
  assert.match(konfig, /versionCode: 1,/);
});

test('tidak ada keystore atau keystore.properties di repo (di luar folder hasil build yang diabaikan git)', () => {
  const LEWATI = new Set(['node_modules', '.git', 'android', 'ios', 'dist', '.expo', '.uji-build', '.uji-ssr', 'cadangan']);
  const temuan = [];
  const jelajah = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (LEWATI.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) jelajah(p);
      else if (/\.(jks|keystore|p12|pfx)$/i.test(e.name) || /^keystore\.properties$/i.test(e.name)) temuan.push(path.relative(AKAR_REPO, p));
    }
  };
  jelajah(AKAR_REPO);
  assert.deepEqual(temuan, []);
});
