// LANJUT_083 — sisi app masuk Google (lib/googleMasuk.ts, dimuat lewat muat-ts-app).
// Tidak ada panggilan ke Google: hanya fungsi murni pembentuk URL & pembaca hasil.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { muatModulApp } = require('./muat-ts-app');

const g = muatModulApp('lib/googleMasuk');
const AKAR_APP = path.resolve(__dirname, '..', '..');

test('tombol Google tidak tampil bila Client ID kosong (konfigurasi null di semua platform)', () => {
  // `{}` dan null: di manifest dev web, null di app.config.ts terbaca sebagai `{}` (sempat membuat
  // layar Masuk crash: ".trim is not a function"). Nilai bukan string harus dianggap kosong.
  const bukanString = [{ googleClientId: {}, googleRedirectUri: {} }, { googleClientId: null }, { googleClientId: 123 }];
  for (const extra of [undefined, {}, { googleClientId: '' }, { googleClientId: '   ', googleRedirectUri: 'https://x.test/google-kembali.html' }, ...bukanString]) {
    assert.equal(g.konfigurasiGoogle(extra, 'web', 'http://localhost:8081'), null);
    assert.equal(g.konfigurasiGoogle(extra, 'android', null), null);
  }
  // TombolGoogle.tsx berhenti merender saat konfigurasi null.
  const sumber = fs.readFileSync(path.join(AKAR_APP, 'components/screens/auth/TombolGoogle.tsx'), 'utf8');
  assert.match(sumber, /if \(!konfig\) return null;/);
  const login = fs.readFileSync(path.join(AKAR_APP, 'components/screens/auth/LoginScreen.tsx'), 'utf8');
  assert.match(login, /<TombolGoogle \/>/);
});

test('Android/iOS butuh halaman penerus; web memakai asal web sendiri', () => {
  const extra = { googleClientId: 'klien.apps.googleusercontent.com' };
  assert.equal(g.konfigurasiGoogle(extra, 'android', null), null);
  assert.deepEqual(g.konfigurasiGoogle({ ...extra, googleRedirectUri: 'https://lanjut.test/google-kembali.html' }, 'android', null), {
    clientId: 'klien.apps.googleusercontent.com',
    redirectUri: 'https://lanjut.test/google-kembali.html',
  });
  assert.equal(g.konfigurasiGoogle(extra, 'web', 'http://localhost:8081/').redirectUri, 'http://localhost:8081/masuk-google');
});

test('URL Google: id_token + nonce + state, scope openid email, tanpa client secret', () => {
  const url = g.bangunUrlGoogle({ clientId: 'klien.apps.googleusercontent.com', redirectUri: 'https://lanjut.test/google-kembali.html' }, 'nonce-acak-123456');
  assert.ok(url.startsWith('https://accounts.google.com/o/oauth2/v2/auth?'));
  assert.match(url, /response_type=id_token/);
  assert.match(url, /scope=openid%20email/);
  assert.match(url, /nonce=nonce-acak-123456/);
  assert.match(url, /state=nonce-acak-123456/);
  assert.match(url, /redirect_uri=https%3A%2F%2Flanjut\.test%2Fgoogle-kembali\.html/);
  assert.doesNotMatch(url, /secret/i);
});

test('hasil dari Google hanya sah bila state sama dengan nonce yang disimpan app', () => {
  const dariFragmen = g.hasilDariFragmen('#state=abc&id_token=aaa.bbb.ccc&authuser=0');
  assert.equal(dariFragmen.idToken, 'aaa.bbb.ccc');
  assert.equal(g.hasilSah(dariFragmen, 'abc'), true);
  assert.equal(g.hasilSah(dariFragmen, 'lain'), false);
  assert.equal(g.hasilSah(dariFragmen, null), false);

  const dariParam = g.hasilDariParam({ id_token: 'aaa.bbb.ccc', state: 'abc' });
  assert.equal(g.hasilSah(dariParam, 'abc'), true);
  assert.equal(g.hasilSah(g.hasilDariParam({ error: 'access_denied', state: 'abc' }), 'abc'), false);
  assert.equal(g.hasilSah(g.hasilDariParam({ state: 'abc' }), 'abc'), false);
});
