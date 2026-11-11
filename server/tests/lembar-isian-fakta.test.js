// LANJUT_017 seri v2: lembar isian bersama (docs/lembar-isian-fakta.md, repo induk). Setiap [ISI] di
// draf kebijakan dan surat orang tua harus punya baris, dan kolom jawaban tidak diisi lewat kode.

const fs = require('fs');
const { test: tesDasar } = require('node:test');
const assert = require('node:assert/strict');
const { jalurInduk, tesLuarRepo } = require('./luar-repo');

const DRAF = jalurInduk('docs', 'kebijakan-privasi-DRAF.md');
const SURAT = jalurInduk('docs', 'surat-persetujuan-ortu-wali-DRAF.md');
const LEMBAR = jalurInduk('docs', 'lembar-isian-fakta.md');
const test = tesLuarRepo(tesDasar, DRAF, SURAT, LEMBAR);

const rata = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/\n\s*>?\s*/g, ' ');
const penanda = (teks) => new Set([...teks.matchAll(/\[ISI: [^\]]+\]/g)].map((m) => m[0]).filter((x) => x !== '[ISI: ...]'));
const baris = () => fs.readFileSync(LEMBAR, 'utf8').replace(/\r\n/g, '\n').split('\n').filter((b) => /^\| \d+ \|/.test(b));
const sel = (b) => b.split('|').slice(1, -1).map((s) => s.trim());

test('lembar isian: setiap [ISI] di draf dan surat punya baris', () => {
  const lembar = fs.readFileSync(LEMBAR, 'utf8');
  const semua = new Set([...penanda(rata(DRAF)), ...penanda(rata(SURAT))]);
  assert.ok(semua.size >= 28, `jumlah [ISI] unik: ${semua.size}`);
  for (const x of semua) assert.ok(lembar.includes(`\`${x}\``), `belum ada di lembar: ${x}`);
});

test('lembar isian: tidak ada penanda basi', () => {
  const semua = new Set([...penanda(rata(DRAF)), ...penanda(rata(SURAT))]);
  for (const x of penanda(baris().join('\n'))) assert.ok(semua.has(x), `basi: ${x}`);
});

test('lembar isian: nomor urut, jenis sah, dan jawaban kosong', () => {
  const daftar = baris().map(sel);
  assert.ok(daftar.length > 0);
  daftar.forEach((s, i) => {
    assert.equal(s.length, 5, s[0]);
    assert.equal(Number(s[0]), i + 1, 'nomor urut');
    assert.ok(s[1].length > 0 && s[2].length > 0, s[0]);
    assert.ok(['Fakta', 'Angka Dokploy', 'Pertimbangan hukum'].includes(s[3]), `${s[0]}: ${s[3]}`);
    assert.equal(s[4], '', `${s[0]}: jawaban harus diisi Khalifa, bukan kode`);
  });
});
