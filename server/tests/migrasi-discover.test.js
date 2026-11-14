// LANJUT_024 seri v2: migrasi 033 naik dan turun pada database bersih, dan konvensinya.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const pool = require('../src/db/koneksi');
const { jalankanSatu, pastikanTabelMigrasi, daftarBerkasMigrasi } = require('../src/db/jalankan-migrasi');
const { turunkanSatu } = require('../src/db/turunkan-migrasi');

const NAMA = '033_discover.sql';
const TABEL = ['kartu_discover', 'refleksi_discover', 'profil_eksplorasi'];
const DB_UJI = `${env.DB_NAME}_migrasi_033`;
const dasar = { host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD };
const WAKTU = '2026-11-14 08:00:00';
const ID_A = '11111111-1111-4111-8111-111111111111';
const ID_P1 = '22222222-2222-4222-8222-222222222222';
const ID_P2 = '33333333-3333-4333-8333-333333333333';

let admin;
let c;

before(async () => {
  admin = await mysql.createConnection(dasar);
  await admin.query('DROP DATABASE IF EXISTS ??', [DB_UJI]);
  await admin.query('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', [DB_UJI]);
  c = await mysql.createConnection({ ...dasar, database: DB_UJI, dateStrings: true });
  await pastikanTabelMigrasi(c);
  for (const nama of daftarBerkasMigrasi().filter((n) => n < NAMA)) await jalankanSatu(c, nama);
});

after(async () => {
  try {
    await c.end();
    await admin.query('DROP DATABASE IF EXISTS ??', [DB_UJI]);
  } finally {
    await admin.end();
    await pool.end();
  }
});

const tabelAda = async () =>
  (await c.query('SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?) ORDER BY TABLE_NAME', [DB_UJI, TABEL]))[0].map((r) => r.t);

test('Naik: tiga tabel, InnoDB utf8mb4, hapus berantai dari pengguna, refleksi unik per siswa dan kartu, satu profil aktif', async () => {
  assert.deepEqual(await tabelAda(), []);
  await jalankanSatu(c, NAMA);
  assert.deepEqual(await tabelAda(), [...TABEL].sort());
  const [t] = await c.query('SELECT TABLE_NAME AS n, ENGINE AS e, TABLE_COLLATION AS k FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?)', [DB_UJI, TABEL]);
  for (const r of t) assert.deepEqual({ e: r.e, k: r.k }, { e: 'InnoDB', k: 'utf8mb4_unicode_ci' }, r.n);

  const [fk] = await c.query(
    `SELECT k.TABLE_NAME AS t, k.REFERENCED_TABLE_NAME AS ke, r.DELETE_RULE AS aturan
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r ON r.CONSTRAINT_SCHEMA = k.TABLE_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      WHERE k.TABLE_SCHEMA = ? AND k.TABLE_NAME IN (?) ORDER BY k.TABLE_NAME, k.REFERENCED_TABLE_NAME`,
    [DB_UJI, TABEL]
  );
  assert.deepEqual(fk.map((f) => [f.t, f.ke, f.aturan]), [
    ['profil_eksplorasi', 'pengguna', 'CASCADE'],
    ['profil_eksplorasi', 'profil_eksplorasi', 'SET NULL'],
    ['refleksi_discover', 'kartu_discover', 'RESTRICT'],
    ['refleksi_discover', 'pengguna', 'CASCADE'],
  ]);

  await c.query("INSERT INTO pengguna (id, nama_pengguna, kata_sandi_hash, dibuat_pada) VALUES (?, 'uji033', 'x', ?)", [ID_A, WAKTU]);
  await c.query("INSERT INTO kartu_discover (id, jenis, judul, ringkasan, urutan, pemilik, asal) VALUES ('k1', 'bidang', 'K', 'R', 1, 'tim', 'uji')");
  const sisipRefleksi = (id) =>
    c.query("INSERT INTO refleksi_discover (id, pengguna_id, kartu_discover_id, ketertarikan, dibuat_pada, diubah_pada) VALUES (?, ?, 'k1', 'tertarik', ?, ?)", [id, ID_A, WAKTU, WAKTU]);
  await sisipRefleksi(ID_P1);
  await assert.rejects(sisipRefleksi(ID_P2), { code: 'ER_DUP_ENTRY' }, 'satu refleksi per siswa dan kartu');
  await assert.rejects(c.query("INSERT INTO refleksi_discover (id, pengguna_id, kartu_discover_id, ketertarikan, yang_menarik, dibuat_pada, diubah_pada) VALUES (?, ?, 'k1', 'tertarik', ?, ?, ?)", [ID_P2, ID_A, 'x'.repeat(281), WAKTU, WAKTU]));

  const sisipProfil = (id, status, induk = null) =>
    c.query("INSERT INTO profil_eksplorasi (id, pengguna_id, isi, status, diubah_dari_id, dibuat_pada, diubah_pada) VALUES (?, ?, '{}', ?, ?, ?, ?)", [id, ID_A, status, induk, WAKTU, WAKTU]);
  await sisipProfil(ID_P1, 'aktif');
  await assert.rejects(sisipProfil(ID_P2, 'aktif'), { code: 'ER_DUP_ENTRY' }, 'hanya satu versi aktif');
  await sisipProfil(ID_P2, 'diubah', ID_P1);

  await assert.rejects(c.query("DELETE FROM kartu_discover WHERE id = 'k1'"), { code: 'ER_ROW_IS_REFERENCED_2' }, 'kartu yang masih punya refleksi tidak bisa dihapus');
  await c.query('DELETE FROM pengguna WHERE id = ?', [ID_A]);
  for (const t2 of ['refleksi_discover', 'profil_eksplorasi']) {
    assert.equal((await c.query('SELECT COUNT(*) AS n FROM ??', [t2]))[0][0].n, 0, `${t2} ikut terhapus bersama akun`);
  }
});

test('Naik lagi tidak mengubah apa pun (idempoten), lalu turun menghapus ketiga tabel', async () => {
  const sql = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'src', 'db', 'migrasi', NAMA), 'utf8');
  for (const t of TABEL) assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${t} `));
  await turunkanSatu(c, NAMA);
  assert.deepEqual(await tabelAda(), []);
  await jalankanSatu(c, NAMA);
  assert.deepEqual(await tabelAda(), [...TABEL].sort());
});
