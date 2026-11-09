// LANJUT_001 seri v2: pilihan Daftar Periksa yang tersimpan di HP dengan kunci lama
// `jalur` harus tetap terbaca setelah penggantian nama.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { muatModulApp } = require('./muat-ts-app');

const { uraiProfilLokal, PROFIL_KOSONG } = muatModulApp('lib/profilLokal');

test('isi kosong: profil kosong', () => {
  assert.deepEqual(uraiProfilLokal(null), PROFIL_KOSONG);
});

test('isi perangkat lama: kunci jalur terbaca sebagai jalur_seleksi, kunci lama tidak tersisa', () => {
  assert.deepEqual(uraiProfilLokal(JSON.stringify({ kelas: '12', jalur: 'SNBP' })), { kelas: '12', jalur_seleksi: 'SNBP' });
});

test('isi baru: terbaca apa adanya, dan kunci baru menang bila keduanya ada', () => {
  assert.deepEqual(uraiProfilLokal(JSON.stringify({ kelas: '11', jalur_seleksi: 'TKA' })), { kelas: '11', jalur_seleksi: 'TKA' });
  assert.deepEqual(uraiProfilLokal(JSON.stringify({ kelas: '11', jalur: 'SNBP', jalur_seleksi: 'TKA' })), { kelas: '11', jalur_seleksi: 'TKA' });
});

test('isi rusak: melempar galat, supaya penangkap di useProfilLokal mengembalikan profil kosong', () => {
  assert.throws(() => uraiProfilLokal('{rusak'));
});
