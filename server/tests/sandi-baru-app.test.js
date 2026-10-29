// LANJUT_083d — sisi app: layar "Buat kata sandi baru" wajib, tanpa tombol lewati.
// lib/sandiBaru.ts dimuat lewat muat-ts-app; gerbang dan layarnya diperiksa dari kode sumber
// (app tidak punya runner tes komponen; bukti tampilan 360 px dibuat terpisah).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const { muatModulApp } = require('./muat-ts-app');

const s = muatModulApp('lib/sandiBaru');
const AKAR_APP = path.resolve(__dirname, '..', '..');
const baca = (relatif) => fs.readFileSync(path.join(AKAR_APP, relatif), 'utf8');

test('gerbang hanya aktif bila server menyatakan perlu_sandi_baru', () => {
  assert.equal(s.perluBuatSandiBaru({ perlu_sandi_baru: true }), true);
  for (const p of [{ perlu_sandi_baru: false }, {}, null, undefined]) assert.equal(s.perluBuatSandiBaru(p), false);
  assert.equal(s.galatSandiBaru('pendek1'), 'Kata sandi minimal 8 karakter.');
  assert.equal(s.galatSandiBaru('cukuppanjang1'), null);
});

test('layar "Buat kata sandi baru" wajib: menutup semua rute, sebelum gerbang lain dan prompt kebijakan', () => {
  const layout = baca('app/(app)/_layout.tsx');
  assert.match(layout, /const perluSandi = perluBuatSandiBaru\(pengguna\);/);
  // Tidak dibatasi rute (gerbang kelas punya pengecualian /akun; gerbang sandi tidak).
  assert.match(layout, /const tertahan = perluSandi \|\| \(\(tanpaKelas \|\| tanpaJenis\) && pathname !== TERBUKA_TANPA_KELAS\);/);
  assert.match(layout, /\{perluSandi \? <BuatSandiBaruScreen \/> : tertahan \?/);
  assert.match(layout, /const bolehPromptKebijakan = !!pengguna && !perluSandi &&/);
});

test('layar tanpa tombol lewati: jalan keluar hanya Simpan kata sandi atau Keluar, tanpa pindah rute', () => {
  // Tanpa komentar: komentar boleh menyebut "tidak ada tombol lewati".
  const layar = baca('components/screens/BuatSandiBaruScreen.tsx').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  assert.match(layar, /judul="Buat kata sandi baru"/);
  assert.match(layar, /authApi\.buatSandiBaru\(token, sandi\)/);
  assert.doesNotMatch(layar, /Lewati|Nanti saja|Lain kali|useRouter|router\.|<Redirect/i);
  // Satu-satunya tombol: Simpan; satu-satunya tautan: Keluar. Tidak ada <Tombol>/<Pressable> lain.
  assert.deepEqual([...layar.matchAll(/<TombolUtama label="([^"]+)"/g)].map((m) => m[1]), ['Simpan kata sandi']);
  assert.deepEqual([...layar.matchAll(/tautan="([^"]+)"/g)].map((m) => m[1]), ['Keluar']);
  assert.doesNotMatch(layar, /<Tombol\s|<Pressable|onPress=\{\(\) => router/);
});
