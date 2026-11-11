// LANJUT_017 seri v2: lembar isian bersama (docs/lembar-isian-fakta.md, repo induk). Setiap [ISI] di
// draf kebijakan dan surat orang tua harus punya baris. LANJUT_018: jawaban hanya boleh ada bila
// bersumber di docs/hasil-pengisian-fakta.md.

const fs = require('fs');
const { test: tesDasar } = require('node:test');
const assert = require('node:assert/strict');
const { jalurInduk, tesLuarRepo } = require('./luar-repo');

const DRAF = jalurInduk('docs', 'kebijakan-privasi-DRAF.md');
const SURAT = jalurInduk('docs', 'surat-persetujuan-ortu-wali-DRAF.md');
const LEMBAR = jalurInduk('docs', 'lembar-isian-fakta.md');
const HASIL = jalurInduk('docs', 'hasil-pengisian-fakta.md');
const test = tesLuarRepo(tesDasar, DRAF, SURAT, LEMBAR, HASIL);

const rata = (p) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n').replace(/\n\s*>?\s*/g, ' ');
const penanda = (teks) => new Set([...teks.matchAll(/\[ISI: [^\]]+\]/g)].map((m) => m[0]).filter((x) => x !== '[ISI: ...]'));
const baris = () => fs.readFileSync(LEMBAR, 'utf8').replace(/\r\n/g, '\n').split('\n').filter((b) => /^\| \d+ \|/.test(b));
const sel = (b) => b.split('|').slice(1, -1).map((s) => s.trim());

test('lembar isian: setiap [ISI] di draf dan surat punya baris', () => {
  const lembar = fs.readFileSync(LEMBAR, 'utf8');
  const semua = new Set([...penanda(rata(DRAF)), ...penanda(rata(SURAT))]);
  assert.ok(semua.size >= 27, `jumlah [ISI] unik: ${semua.size}`);
  for (const x of semua) assert.ok(lembar.includes(`\`${x}\``), `belum ada di lembar: ${x}`);
});

test('lembar isian: tidak ada penanda basi', () => {
  const semua = new Set([...penanda(rata(DRAF)), ...penanda(rata(SURAT))]);
  for (const x of penanda(baris().join('\n'))) assert.ok(semua.has(x), `basi: ${x}`);
});

const POLA_JAWABAN = /^(?:Sebagian terisi|Terjawab)\. Sumber: `docs\/hasil-pengisian-fakta\.md` butir (\d+), diperiksa \d{4}-\d{2}-\d{2}\.$/;
const barisHasil = () => fs.readFileSync(HASIL, 'utf8').replace(/\r\n/g, '\n').split('\n').filter((b) => /^\| \d+ \|/.test(b)).map(sel);
const terisi = (status) => /^terisi/.test(status);

test('lembar isian: nomor urut, jenis sah, dan jawaban hanya bila bersumber', () => {
  const daftar = baris().map(sel);
  assert.ok(daftar.length > 0);
  daftar.forEach((s, i) => {
    assert.equal(s.length, 5, s[0]);
    assert.equal(Number(s[0]), i + 1, 'nomor urut');
    assert.ok(s[1].length > 0 && s[2].length > 0, s[0]);
    assert.ok(['Fakta', 'Angka Dokploy', 'Pertimbangan hukum'].includes(s[3]), `${s[0]}: ${s[3]}`);
    if (s[4] === '') return;
    const m = POLA_JAWABAN.exec(s[4]);
    assert.ok(m, `${s[0]}: jawaban tanpa sumber dan tanggal`);
    assert.equal(Number(m[1]), Number(s[0]), 'butir sumber');
  });
});

test('hasil pengisian: 23 butir, golongan dan status sah, setiap butir punya bukti', () => {
  const daftar = barisHasil();
  assert.equal(daftar.length, baris().length);
  daftar.forEach((s, i) => {
    assert.equal(s.length, 5, s[0]);
    assert.equal(Number(s[0]), i + 1, 'nomor urut');
    assert.ok(['A', 'B', 'C', 'D', 'E'].includes(s[2]), `${s[0]}: golongan ${s[2]}`);
    assert.match(s[3], /^(terisi \(bersumber\)|terisi sebagian \(bersumber\)|`\[ISI\]` belum terverifikasi|`\[ISI\]` untuk Khalifa|`\[ISI\]` menunggu peninjau)$/, s[0]);
    assert.ok(s[4].length > 0, `${s[0]}: bukti kosong`);
  });
});

test('hasil pengisian: isian yang terisi punya sumber dan tanggal, dan cocok dengan lembar', () => {
  const lembar = baris().map(sel);
  barisHasil().forEach((s, i) => {
    assert.equal(terisi(s[3]), lembar[i][4] !== '', `${s[0]}: status berbeda dari lembar`);
    if (!terisi(s[3])) return;
    assert.match(s[4], /\d{4}-\d{2}-\d{2}/, `${s[0]}: tanpa tanggal pemeriksaan`);
    assert.match(s[4], /(https:\/\/\S+|`[^`]+\.[a-z]+[^`]*`).*?\d{4}-\d{2}-\d{2}/, `${s[0]}: sumber harus tertulis sebelum tanggal pemeriksaan`);
  });
});

test('hasil pengisian: golongan C, D, dan E tidak diisi', () => {
  for (const s of barisHasil()) if (['C', 'D', 'E'].includes(s[2])) assert.ok(!terisi(s[3]), `${s[0]}: golongan ${s[2]} terisi`);
});
