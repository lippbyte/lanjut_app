// Uji skrip ringkasan pemakaian AI (LANJUT_060), TANPA basis data: susunan
// laporan, perkiraan biaya hanya bila kedua tarif terisi, dan argumen.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { susunLaporan, bacaArgumen, tarifAngka } = require('../tools/pemakaian-ai');

// Memuat repo membuka pool basis data (tanpa query); tutup supaya proses selesai.
after(() => require('../src/db/koneksi').end());

const BARIS = [
  { tanggal: '2026-10-08', panggilan_ai: 12, token_masuk: 24000, token_keluar: 3000, balasan_stub: 0, tanda_akut: 1, tanda_ringan: 2, tanda_model: 0, galat_penyedia: 1, web_dipakai: 0, web_kuota_habis: 0, modul_dipakai: 3 },
  { tanggal: '2026-10-09', panggilan_ai: 8, token_masuk: 16000, token_keluar: 2000, balasan_stub: 4, tanda_akut: 0, tanda_ringan: 1, tanda_model: 1, galat_penyedia: 0, web_dipakai: 2, web_kuota_habis: 1, modul_dipakai: 1 },
];
const RENTANG = { hari: 7, dari: '2026-10-03', sampai: '2026-10-09' };

test('laporan: baris per tanggal + jumlah; tanpa tarif → biaya tidak dihitung', () => {
  const teks = susunLaporan(BARIS, { ai_tarif_masuk_per_juta: '', ai_tarif_keluar_per_juta: '' }, RENTANG);
  assert.match(teks, /Pemakaian AI 7 hari \(2026-10-03 s\.d\. 2026-10-09, WIB\)/);
  assert.match(teks, /^2026-10-08\s+12\s+24000\s+3000\s+0\s+1\s+2\s+0\s+1\s+0\s+0\s+3$/m);
  assert.match(teks, /^Jumlah\s+20\s+40000\s+5000\s+4\s+1\s+3\s+1\s+1\s+2\s+1\s+4$/m);
  assert.match(teks, /Perkiraan biaya: tidak dihitung/);
  assert.doesNotMatch(teks, /Biaya \(US\$\)/);
});

test('laporan: kedua tarif terisi → biaya per hari dan total', () => {
  const teks = susunLaporan(BARIS, { ai_tarif_masuk_per_juta: '2', ai_tarif_keluar_per_juta: '10' }, RENTANG);
  // 24000/1e6*2 + 3000/1e6*10 = 0.048 + 0.03 = 0.078; total 40000/1e6*2 + 5000/1e6*10 = 0.13
  assert.match(teks, /Biaya \(US\$\)/);
  assert.match(teks, /^2026-10-08 .* 0\.0780$/m);
  assert.match(teks, /Perkiraan biaya: US\$0\.1300 \(tarif masuk US\$2\/juta, keluar US\$10\/juta token\)/);
});

test('laporan: satu tarif kosong atau tidak sah → biaya tidak dihitung; tanpa baris → keterangan kosong', () => {
  assert.match(susunLaporan(BARIS, { ai_tarif_masuk_per_juta: '2', ai_tarif_keluar_per_juta: '' }, RENTANG), /tidak dihitung/);
  assert.match(susunLaporan(BARIS, { ai_tarif_masuk_per_juta: 'mahal', ai_tarif_keluar_per_juta: '10' }, RENTANG), /tidak dihitung/);
  assert.match(susunLaporan([], {}, RENTANG), /belum ada pemakaian di rentang ini/);
  assert.equal(tarifAngka(' 3.5 '), 3.5);
  assert.equal(tarifAngka('-1'), null);
});

test('argumen: --hari bawaan 7, 1–366; selain itu ditolak', () => {
  assert.deepEqual(bacaArgumen([]), { hari: 7 });
  assert.deepEqual(bacaArgumen(['--hari=30']), { hari: 30 });
  for (const salah of [['--hari=0'], ['--hari=400'], ['--minggu=2'], ['--hari=abc']]) assert.throws(() => bacaArgumen(salah), String(salah));
});
