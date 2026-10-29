// Uji pemotong teks modul (LANJUT_049, src/modul/modul/potong.js). Tanpa basis data.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { potongTeks, MIN_POTONGAN, MAKS_POTONGAN } = require('../src/modul/modul/potong');

const kalimat = (i) => `Kalimat nomor ${i} menjelaskan satu gagasan tentang materi pelajaran yang sedang dibahas.`;
const paragraf = (awal, n) => Array.from({ length: n }, (_, k) => kalimat(awal + k)).join(' ');
const rapat = (t) => t.replace(/\s+/g, ' ').trim();

test('teks pendek → satu potongan utuh', () => {
  assert.deepEqual(potongTeks('Fotosintesis terjadi di kloroplas.'), ['Fotosintesis terjadi di kloroplas.']);
  assert.deepEqual(potongTeks(''), []);
});

test('banyak paragraf → potongan ≤ 1.200 karakter, semua kecuali yang terakhir ≥ 800, isi utuh', () => {
  const teks = Array.from({ length: 12 }, (_, i) => paragraf(i * 10, 4)).join('\n\n');
  const hasil = potongTeks(teks);
  assert.ok(hasil.length >= 3, `hanya ${hasil.length} potongan`);
  for (const p of hasil) assert.ok(p.length <= MAKS_POTONGAN, `potongan ${p.length} karakter`);
  for (const p of hasil.slice(0, -1)) assert.ok(p.length >= MIN_POTONGAN, `potongan pendek di tengah: ${p.length}`);
  assert.equal(rapat(hasil.join(' ')), rapat(teks), 'ada isi yang hilang atau berubah');
  // Dibelah di batas paragraf: setiap potongan diawali "Kalimat nomor" dan diakhiri titik.
  for (const p of hasil) assert.match(p, /^Kalimat nomor \d+[\s\S]*\.$/);
});

test('paragraf yang lebih panjang dari 1.200 karakter dibelah di batas kalimat', () => {
  const teks = paragraf(0, 40); // satu paragraf ±3.600 karakter
  const hasil = potongTeks(teks);
  assert.ok(hasil.length >= 3);
  for (const p of hasil) {
    assert.ok(p.length <= MAKS_POTONGAN);
    assert.match(p, /^Kalimat nomor \d+ .*dibahas\.$/s, 'potongan tidak diawali/diakhiri batas kalimat');
  }
  assert.equal(rapat(hasil.join(' ')), rapat(teks));
});

test('kalimat tanpa tanda baca yang sangat panjang dibelah di spasi, tidak di tengah kata', () => {
  const kata = Array.from({ length: 600 }, (_, i) => `kata${i}`);
  const hasil = potongTeks(kata.join(' '));
  for (const p of hasil) assert.ok(p.length <= MAKS_POTONGAN);
  assert.deepEqual(hasil.join(' ').split(' '), kata, 'ada kata yang terbelah');
});
