// LANJUT_022 seri v2: benih-dummy menolak produksi dan host jarak jauh, dan hanya membuat akun
// berawalan uji_ atau demo_ dengan email contoh.test. Data yang dibuat di sini dihapus lagi.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, acak } = require('./bantuan');
const { jalankan, alasanTolakDummy, namaAkun, AKUN, DOMAIN_EMAIL } = require('../tools/benih-dummy');

const ALAT = path.join(__dirname, '..', 'tools', 'benih-dummy.js');
const dibuat = [];

after(async () => {
  if (dibuat.length) await pool.query('DELETE FROM pengguna WHERE nama_pengguna IN (?)', [dibuat]);
  await pool.end();
});

test('Menolak produksi, host jarak jauh, dan nama basis data produksi, tanpa jalan pintas', () => {
  const lokal = { NODE_ENV: 'development', DB_HOST: '127.0.0.1', DB_NAME: 'lanjut_dev' };
  assert.equal(alasanTolakDummy(lokal), null);
  assert.match(alasanTolakDummy({ ...lokal, NODE_ENV: 'production' }), /production/);
  assert.match(alasanTolakDummy({ ...lokal, DB_HOST: 'db.contoh.test' }), /bukan lokal/);
  assert.match(alasanTolakDummy({ ...lokal, DB_NAME: 'lanjut_db' }), /nama produksi/);
});

test('Baris perintah menolak NODE_ENV=production sebelum menyambung ke basis data', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjut-dummy-'));
  try {
    const r = spawnSync(process.execPath, [ALAT], {
      cwd: folder,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, NODE_ENV: 'production', DB_HOST: '127.0.0.1', DB_USER: 'uji', DB_NAME: 'lanjut_test_x', CORS_ORIGINS: 'https://app.contoh.test', TRUST_PROXY: '1' },
      encoding: 'utf8',
      timeout: 60000,
    });
    assert.equal(r.status, 1, r.stdout + r.stderr);
    assert.match(r.stderr, /DIHENTIKAN\. NODE_ENV=production/);
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('Semua nama akun berawalan uji_ atau demo_, juga dengan akhiran', () => {
  for (const a of AKUN) {
    assert.match(namaAkun(a.nama, ''), /^(uji|demo)_/);
    assert.match(namaAkun(a.nama, 'x1'), /^(uji|demo)_.*_x1$/);
  }
  assert.throws(() => namaAkun('siswa', ''), /uji_ atau demo_/);
  assert.throws(() => namaAkun('demo_a', 'X!'), /akhiran/);
});

test('Membuat akun contoh lengkap dengan datanya, dan aman diulang', async () => {
  const akhiran = acak().replace(/[^a-z0-9]/g, '').slice(0, 6) || 'a1';
  const hasil = await jalankan({ akhiran, kataSandi: 'sandiujiaman1', log: () => {} });
  dibuat.push(...hasil.dibuat);
  assert.equal(hasil.dibuat.length, AKUN.length);
  assert.ok(hasil.dibuat.every((n) => /^(uji|demo)_/.test(n)));
  const [akun] = await pool.query('SELECT id, nama_pengguna, email FROM pengguna WHERE nama_pengguna IN (?)', [hasil.dibuat]);
  assert.equal(akun.length, AKUN.length);
  assert.equal(DOMAIN_EMAIL, 'contoh.test', 'domain contoh, bukan alamat nyata');
  for (const a of akun) assert.equal(a.email, `${a.nama_pengguna}@contoh.test`);
  const id = akun.map((a) => a.id);
  for (const [tabel, kolom] of [['persetujuan', 'pengguna_id'], ['kartu', 'pemilik_id'], ['sesi_latihan', 'pengguna_id'], ['riwayat_latihan', 'pengguna_id']]) {
    const [[{ n }]] = await pool.query(`SELECT COUNT(DISTINCT ${kolom}) AS n FROM ${tabel} WHERE ${kolom} IN (?)`, [id]);
    assert.equal(n, AKUN.length, tabel);
  }
  // LANJUT_023: satu akun sengaja belum memilih jalur maupun tujuan.
  for (const [tabel, medan] of [['tujuan', 'tujuan'], ['pengguna_jalur_minat', 'jalur']]) {
    const [[{ n }]] = await pool.query(`SELECT COUNT(DISTINCT pengguna_id) AS n FROM ${tabel} WHERE pengguna_id IN (?)`, [id]);
    assert.equal(n, AKUN.filter((a) => a[medan].length > 0).length, tabel);
  }
  const ulang = await jalankan({ akhiran, kataSandi: 'sandiujiaman1', log: () => {} });
  assert.deepEqual(ulang.dibuat, []);
  assert.deepEqual(ulang.dilewati.sort(), [...hasil.dibuat].sort());
});

test('Jalur & Tujuan dummy (LANJUT_023): dua jalur, tujuan dua versi, akun kosong, dan tidak menulis di luar akun dummy', async (t) => {
  assert.ok(AKUN.some((a) => a.jalur.length >= 2), 'ada akun yang memilih dua jalur');
  assert.ok(AKUN.some((a) => a.tujuan.length === 2), 'ada akun dengan tujuan dua versi');
  assert.ok(AKUN.some((a) => a.jalur.length === 0 && a.tujuan.length === 0), 'ada akun yang belum memilih apa pun');

  // Setiap fungsi tulis yang dipakai benih-dummy disadap: akun yang ditulisnya harus akun dummy yang baru
  // dibuat. Menghitung baris seluruh tabel tidak bisa dipakai, karena berkas tes lain berjalan bersamaan.
  const ditulis = [];
  const akunBaru = new Set();
  const sadap = (modul, fungsi, ambilId) => {
    const objek = require(modul);
    const asli = objek[fungsi];
    t.mock.method(objek, fungsi, async (...arg) => {
      ditulis.push([fungsi, ambilId(...arg)]);
      return asli.apply(objek, arg);
    });
  };
  const penggunaRepo = require('../src/modul/pengguna/pengguna.repo');
  const buatPenggunaAsli = penggunaRepo.buatPengguna;
  t.mock.method(penggunaRepo, 'buatPengguna', async (data) => {
    assert.match(data.namaPengguna, /^(uji|demo)_/);
    assert.ok(data.email.endsWith('@contoh.test'));
    akunBaru.add(data.id);
    return buatPenggunaAsli.call(penggunaRepo, data);
  });
  sadap('../src/modul/persetujuan/persetujuan.repo', 'tambah', (d) => d.penggunaId);
  sadap('../src/modul/kartu/kartu.repo', 'buatKartu', (d) => d.pemilikId);
  sadap('../src/modul/levelin/levelin.repo', 'buatSesiLatihan', (d) => d.penggunaId);
  sadap('../src/modul/levelin/levelin.repo', 'simpanSatuRiwayat', (id) => id);
  sadap('../src/modul/levelin/levelin.repo', 'tutupSesiLatihan', (id) => id);
  sadap('../src/modul/jalur-minat/pengguna-jalur-minat.repo', 'buat', (d) => d.penggunaId);
  sadap('../src/modul/tujuan/tujuan.repo', 'buat', (d) => d.penggunaId);
  sadap('../src/modul/tujuan/tujuan.repo', 'buatVersiMilikSendiri', (id) => id);

  const akhiran = `j${acak().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'a1'}`;
  const hasil = await jalankan({ akhiran, kataSandi: 'sandiujiaman1', log: () => {} });
  dibuat.push(...hasil.dibuat);
  assert.equal(akunBaru.size, AKUN.length);
  assert.ok(ditulis.length > 0);
  for (const [fungsi, id] of ditulis) assert.ok(akunBaru.has(id), `${fungsi} menulis ke akun yang bukan dummy: ${id}`);
  assert.ok(ditulis.some(([f]) => f === 'buatVersiMilikSendiri'), 'tujuan diperbarui lewat versi, bukan ditimpa');

  for (const a of AKUN) {
    const nama = namaAkun(a.nama, akhiran);
    const [[p]] = await pool.query('SELECT id FROM pengguna WHERE nama_pengguna = ?', [nama]);
    const [jalur] = await pool.query("SELECT jalur_minat_id FROM pengguna_jalur_minat WHERE pengguna_id = ? AND status = 'aktif' ORDER BY jalur_minat_id", [p.id]);
    assert.deepEqual(jalur.map((r) => r.jalur_minat_id), [...a.jalur].sort(), nama);
    const [tujuan] = await pool.query('SELECT id, judul, status, diubah_dari_id FROM tujuan WHERE pengguna_id = ?', [p.id]);
    assert.equal(tujuan.length, a.tujuan.length, nama);
    if (a.tujuan.length === 2) {
      const lama = tujuan.find((t) => t.judul === a.tujuan[0]);
      const baru = tujuan.find((t) => t.judul === a.tujuan[1]);
      assert.equal(lama.status, 'diubah');
      assert.equal(baru.status, 'aktif');
      assert.equal(baru.diubah_dari_id, lama.id);
    }
  }
});
