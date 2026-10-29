// Uji lembar review tim konten (LANJUT_043, src/db/verifikasi/lembar-review.js).
//   - semua butir yang belum terverifikasi (versi skrip verifikasi-konten,
//     semua jenis) ada di lembar, dengan perintah menandai yang benar;
//   - profil prodi F10 paling atas; prodi tanpa profil disebut;
//   - hanya kartu kurasi tim, tidak pernah kartu buatan siswa;
//   - HANYA MEMBACA: setiap query yang dikirim penyusun lembar adalah SELECT.
//
// File test lain berjalan paralel dan menyisipkan/menghapus fixture, jadi
// pembanding diambil sebelum DAN sesudah lembar disusun; yang wajib ada
// hanyalah baris yang belum terverifikasi di kedua saat itu.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { acak, pool } = require('./bantuan');
const { daftarBelum } = require('../src/db/verifikasi/verifikasi-konten');
const { susunLembar, jalankan, STANDAR_PEMERIKSAAN } = require('../src/db/verifikasi/lembar-review');

after(async () => {
  await pool.end();
});

/** Map "jenis/id" → true untuk semua baris belum terverifikasi saat ini. */
async function belumSekarang() {
  const kunci = new Set();
  for (const k of await daftarBelum()) for (const b of k.baris) kunci.add(`${k.jenis}/${b.id}`);
  return kunci;
}

/** Semua butir di lembar: [{ jenis, id, posisi }] dari baris "**ID:** `id` · **jenis:** `jenis`". */
function butirDiLembar(md) {
  return [...md.matchAll(/^\*\*ID:\*\* `([^`]+)` · \*\*jenis:\*\* `([^`]+)`$/gm)].map((m) => ({
    id: m[1],
    jenis: m[2],
    posisi: m.index,
  }));
}

/** Susun lembar sambil mencatat setiap SQL yang dikirim ke pool. */
async function susunSambilMencatat() {
  const tercatat = [];
  const asli = { query: pool.query, execute: pool.execute, getConnection: pool.getConnection };
  pool.query = function (sql, ...sisa) {
    tercatat.push(typeof sql === 'string' ? sql : sql.sql);
    return asli.query.call(this, sql, ...sisa);
  };
  pool.execute = function (sql, ...sisa) {
    tercatat.push(typeof sql === 'string' ? sql : sql.sql);
    return asli.execute.call(this, sql, ...sisa);
  };
  pool.getConnection = () => {
    throw new Error('lembar-review tidak boleh membuka koneksi/transaksi sendiri');
  };
  try {
    return { md: await susunLembar(), tercatat };
  } finally {
    Object.assign(pool, asli);
  }
}

test('lembar review: setiap butir yang belum terverifikasi (semua jenis) ada, lengkap dengan perintah menandai', async () => {
  const sebelum = await belumSekarang();
  const { md } = await susunSambilMencatat();
  const sesudah = await belumSekarang();
  const stabil = [...sebelum].filter((k) => sesudah.has(k));
  assert.ok(stabil.length >= 70, `jumlah butir belum terverifikasi tidak wajar: ${stabil.length}`);

  const diLembar = new Set(butirDiLembar(md).map((b) => `${b.jenis}/${b.id}`));
  const hilang = stabil.filter((k) => !diLembar.has(k));
  assert.deepEqual(hilang, [], 'butir belum terverifikasi tidak ada di lembar');

  for (const k of stabil) {
    const [jenis, id] = k.split('/');
    if (jenis === 'cerita-alumni') continue; // contoh fiktif: sengaja tanpa perintah menandai
    assert.ok(
      md.includes(`\`npm run verifikasi-konten -- --jenis=${jenis} --id=${id} --oleh="Nama Pemeriksa"\``),
      `perintah menandai ${k} tidak ada`
    );
  }
});

test('lembar review: profil prodi F10 di bagian paling atas; prodi tanpa profil disebut', async () => {
  const { md } = await susunSambilMencatat();
  const butir = butirDiLembar(md);
  const profil = butir.filter((b) => b.jenis === 'eksplorasi-tujuan');
  const lain = butir.filter((b) => b.jenis !== 'eksplorasi-tujuan');
  assert.ok(profil.length > 0);
  assert.ok(Math.max(...profil.map((b) => b.posisi)) < Math.min(...lain.map((b) => b.posisi)), 'ada butir lain di atas profil F10');
  assert.equal(butir[0].jenis, 'eksplorasi-tujuan');

  const [tanpaProfil] = await pool.query(
    'SELECT p.id FROM prodi p LEFT JOIN profil_prodi pp ON pp.id = p.id WHERE pp.id IS NULL'
  );
  const bagianProfil = md.slice(md.indexOf('## 1. '), md.indexOf('## 2. '));
  for (const { id } of tanpaProfil) assert.ok(bagianProfil.includes(`\`${id}\``), `prodi tanpa profil ${id} tidak disebut`);
});

test('lembar review: jenis kartu hanya kartu kurasi tim — tidak pernah kartu buatan siswa', async () => {
  const { md } = await susunSambilMencatat();
  const idKartu = butirDiLembar(md)
    .filter((b) => b.jenis === 'kartu')
    .map((b) => b.id);
  assert.ok(idKartu.length > 0);
  const [rinci] = await pool.query('SELECT id, sumber FROM kartu WHERE id IN (?)', [idKartu]);
  assert.deepEqual(rinci.filter((k) => k.sumber !== 'resmi'), []);
  const [siswa] = await pool.query("SELECT id FROM kartu WHERE sumber <> 'resmi' LIMIT 50");
  assert.equal(siswa.some((k) => md.includes(`\`${k.id}\``)), false, 'id kartu siswa muncul di lembar');
});

test('lembar review HANYA MEMBACA: setiap query adalah SELECT, tanpa transaksi; sumbernya tanpa perintah tulis', async () => {
  const { tercatat } = await susunSambilMencatat();
  assert.ok(tercatat.length >= 8);
  for (const sql of tercatat) assert.match(sql.trim(), /^SELECT\b/i, sql);

  const sumber = fs.readFileSync(path.join(__dirname, '../src/db/verifikasi/lembar-review.js'), 'utf8');
  const tanpaKomentar = sumber.replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(tanpaKomentar, /\b(INSERT|UPDATE|DELETE|REPLACE|ALTER|DROP|TRUNCATE)\b/);
});

test('lembar review: --keluar menulis berkas Markdown; argumen tak dikenal ditolak', async () => {
  const berkas = path.join(os.tmpdir(), `lembar-review-uji-${acak()}.md`);
  const logAsli = console.log;
  console.log = () => {};
  try {
    await jalankan([`--keluar=${berkas}`]);
  } finally {
    console.log = logAsli;
  }
  try {
    const isi = fs.readFileSync(berkas, 'utf8');
    assert.match(isi, /^# Lembar Review Konten LANJUT/);
    assert.ok(butirDiLembar(isi).length > 0);
    assert.ok(isi.includes(STANDAR_PEMERIKSAAN.join('\n')), 'standar pemeriksaan hilang dari berkas hasil buat ulang');
  } finally {
    fs.rmSync(berkas, { force: true });
  }
  await assert.rejects(jalankan(['--ya']), /tidak dikenal/);
});

// LANJUT_046 (Bagian B): usulan standar pemeriksaan, DRAF, di AWAL lembar.
test('lembar review: bagian "Standar pemeriksaan" (DRAF) ada di awal, sebelum cara pakai & butir pertama', async () => {
  const { md } = await susunSambilMencatat();
  const posisi = md.indexOf('## Standar pemeriksaan');
  assert.ok(posisi > 0, 'bagian Standar pemeriksaan tidak ada');
  assert.ok(posisi < md.indexOf('## Cara memakai lembar ini'));
  assert.ok(posisi < md.indexOf('**ID:**'));
  assert.ok(md.includes(STANDAR_PEMERIKSAAN.join('\n')));
  const bagian = md.slice(posisi, md.indexOf('## Cara memakai lembar ini'));
  assert.match(bagian, /\*\*DRAF — menunggu persetujuan Khalifa\.\*\*/);
  for (const frasa of [
    'SNPMB, laman PMB atau akademik kampus yang bersangkutan, PDDikti, dokumen kurikulum resmi prodi, dan sumber pemerintah lain yang setara',
    'blog, artikel media, video, forum, dan ringkasan pihak ketiga',
    'kalau pemeriksa bisa menunjuk sumber resminya (cantumkan di kolom catatan)',
    'Bagian yang tidak bisa dicek ke sumber resmi tetap "Perkiraan"',
  ]) {
    assert.ok(bagian.includes(frasa), frasa);
  }
  assert.equal((bagian.match(/^\d+\. /gm) || []).length, 4, 'tepat empat butir usulan, tanpa aturan tambahan');
});
