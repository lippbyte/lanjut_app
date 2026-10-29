// Uji lembar review draf teks (LANJUT_046, tools/lembar-review-teks.js).
// Tanpa basis data: hanya membaca docs/salinan-teks-lanjut.md.
//
// Pembanding dihitung LANGSUNG dari berkas sumber dengan pemindai sederhana
// di berkas ini (bukan memakai parser pembuat lembar), lalu dicocokkan dengan
// lembar: jumlah blok DRAF, jumlah butir, dan bunyi tiap butir persis.

const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { susunLembarTeks, jalankan, SALINAN, PETA, PENGECUALIAN } = require('../tools/lembar-review-teks');

const sumber = fs.readFileSync(SALINAN, 'utf8');
const baris = sumber.split(/\r?\n/);
const BUTIR = /^\s*- /;

/** Hitung langsung: setiap paragraf ber-"DRAF" → baris butir sesudahnya sampai judul/---/paragraf baru. */
function hitungLangsung() {
  const blok = [];
  for (let i = 0; i < baris.length; i++) {
    if (BUTIR.test(baris[i]) || !/\bDRAF\b/.test(baris[i])) continue;
    let j = i + 1;
    while (j < baris.length && baris[j].trim() !== '' && !BUTIR.test(baris[j])) j++; // sisa paragraf kepala
    const kepalaSelesai = j - 1; // "DRAF" yang muncul lagi di paragraf yang sama bukan blok baru
    const butir = [];
    for (; j < baris.length; j++) {
      const b = baris[j];
      if (/^(#|---)/.test(b)) break;
      if (BUTIR.test(b)) butir.push(b.replace(BUTIR, ''));
      else if (b.trim() !== '' && !/^\s/.test(b) && butir.length) break;
    }
    blok.push({ baris: i + 1, butir });
    i = kepalaSelesai;
  }
  return blok;
}

test('lembar teks: jumlah blok & butir sama dengan hitungan langsung di salinan-teks-lanjut.md', () => {
  const langsung = hitungLangsung();
  const totalLangsung = langsung.reduce((a, k) => a + k.butir.length, 0);
  const hasil = susunLembarTeks();

  assert.equal(hasil.blok.length, langsung.length, 'jumlah blok DRAF');
  assert.ok(langsung.length >= 12, `blok DRAF terlalu sedikit: ${langsung.length}`);
  assert.equal(hasil.jumlahButir + hasil.dikecualikan.length, totalLangsung, 'butir keputusan + lampiran = semua baris butir di blok DRAF');
  assert.equal((hasil.md.match(/^\*\*Bunyi teks \(persis dari berkas\):\*\*$/gm) || []).length, hasil.jumlahButir);
  assert.equal((hasil.md.match(/^### \d+\. /gm) || []).length, hasil.jumlahButir);
  assert.equal((hasil.md.match(/^- \[ \] Setuju$/gm) || []).length, hasil.jumlahButir, 'setiap butir punya kotak keputusan');
  assert.match(hasil.md, new RegExp(`\\*\\*${hasil.jumlahButir} butir\\*\\* dari ${langsung.length} blok DRAF`));
});

test('lembar teks: bunyi setiap butir identik dengan baris sumbernya', () => {
  const { md } = susunLembarTeks();
  const kutipan = new Set(md.split('\n').filter((b) => b.startsWith('> ')).map((b) => b.slice(2)));
  for (const k of hitungLangsung()) {
    for (const teks of k.butir) assert.ok(kutipan.has(teks), `tidak ada persis di lembar: ${teks}`);
  }
});

test('lembar teks: yang sudah disetujui atau di luar blok DRAF tidak ikut', () => {
  const { md } = susunLembarTeks();
  // §4.10 keterangan data pribadi — disetujui Khalifa 28 Sep 2026.
  assert.ok(sumber.includes('Kami menyimpan nama pengguna'));
  assert.ok(!md.includes('Kami menyimpan nama pengguna'));
  // Teks yang dikecualikan di kepala blok LANJUT_039/041 (dipakai apa adanya), di luar daftar butir DRAF.
  for (const t of ['**Penanda kartu pengguna (tetap, tidak bisa disembunyikan):**', '**Ketika waktu mepet:**', '**Layar kosong:** Belum ada kartu.']) {
    assert.ok(sumber.includes(t), t);
    assert.ok(!md.includes(t), `ikut padahal bukan DRAF: ${t}`);
  }
});

test('lembar teks: setiap butir terpetakan; PETA & pengecualian tidak ada yang basi', () => {
  const hasil = susunLembarTeks();
  assert.deepEqual(hasil.belumDipetakan.map((b) => b.teks), [], 'butir DRAF tanpa letak/pembaca');
  const terpakai = hasil.kelompok.flatMap((g) => g.butir.map((b) => b.meta));
  for (const g of PETA) for (const m of g.butir) assert.equal(terpakai.filter((x) => x === m).length, 1, `PETA ${m.task} "${m.awal}"`);
  assert.equal(hasil.dikecualikan.length, PENGECUALIAN.length, 'setiap pengecualian cocok tepat satu baris');
  for (const b of hasil.kelompok.flatMap((g) => g.butir)) {
    assert.ok(b.meta.di && b.meta.oleh, `${b.meta.nama}: letak & pembaca wajib diisi`);
  }
});

test('lembar teks: butir klaim faktual terdaftar di bagian awal, sebelum butir pertama', () => {
  const { md, kelompok } = susunLembarTeks();
  const awal = md.slice(0, md.indexOf('\n### 1. '));
  const faktual = kelompok.flatMap((g) => g.butir).filter((b) => b.meta.faktual);
  assert.ok(faktual.length >= 5);
  for (const b of faktual) assert.ok(awal.includes(`| ${b.meta.nama} (§${b.bagian}, ${b.task}) |`), b.meta.nama);
});

test('lembar teks HANYA MEMBACA salinan-teks-lanjut.md; --keluar menulis berkas lain', () => {
  const sidik = () => crypto.createHash('sha256').update(fs.readFileSync(SALINAN)).digest('hex');
  const sebelum = sidik();
  const berkas = path.join(os.tmpdir(), `lembar-teks-uji-${process.pid}.md`);
  const logAsli = console.log;
  console.log = () => {};
  try {
    jalankan([`--keluar=${berkas}`]);
  } finally {
    console.log = logAsli;
  }
  try {
    assert.match(fs.readFileSync(berkas, 'utf8'), /^# Lembar Review Draf Teks LANJUT/);
  } finally {
    fs.rmSync(berkas, { force: true });
  }
  assert.equal(sidik(), sebelum, 'salinan-teks-lanjut.md berubah');
  assert.throws(() => jalankan(['--ya']), /tidak dikenal/);
});
