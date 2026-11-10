// LANJUT_010 seri v2: migrasi 032 naik dan turun, pada database bersih dan berisi.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const pool = require('../src/db/koneksi');
const { jalankanSatu, pastikanTabelMigrasi, daftarBerkasMigrasi } = require('../src/db/jalankan-migrasi');
const { turunkanSatu } = require('../src/db/turunkan-migrasi');

const NAMA = '032_berkas_tertunda_hapus.sql';
const DB_UJI = `${env.DB_NAME}_migrasi_032`;
const dasar = { host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD };
const WAKTU = '2026-11-10 08:00:00';
const ID_A = '11111111-1111-4111-8111-111111111111';

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

const adaTabel = async () =>
  (await c.query("SELECT COUNT(*) AS n FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'berkas_tertunda_hapus'", [DB_UJI]))[0][0].n === 1;

async function isiLama() {
  const [t] = await c.query("SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME NOT IN ('berkas_tertunda_hapus', '_migrasi')", [DB_UJI]);
  const hasil = {};
  for (const { t: nama } of t) {
    const [baris] = await c.query('SELECT * FROM ??', [nama]);
    hasil[nama] = baris.map((b) => JSON.stringify(b)).sort();
  }
  return hasil;
}

test('DB bersih: naik membuat tabel sesuai konvensi, tanpa kolom identitas; turun menghapusnya', async () => {
  assert.equal(await adaTabel(), false);
  await jalankanSatu(c, NAMA);
  assert.equal(await adaTabel(), true);
  const [kolom] = await c.query("SELECT COLUMN_NAME AS k FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'berkas_tertunda_hapus' ORDER BY ORDINAL_POSITION", [DB_UJI]);
  assert.deepEqual(kolom.map((x) => x.k), ['id', 'nama_tersimpan', 'alasan', 'dicatat_pada', 'jumlah_percobaan']);
  const [[t]] = await c.query("SELECT ENGINE AS e, TABLE_COLLATION AS k FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'berkas_tertunda_hapus'", [DB_UJI]);
  assert.deepEqual(t, { e: 'InnoDB', k: 'utf8mb4_unicode_ci' });
  const [fk] = await c.query("SELECT 1 FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'berkas_tertunda_hapus' AND REFERENCED_TABLE_NAME IS NOT NULL", [DB_UJI]);
  assert.equal(fk.length, 0);
  await turunkanSatu(c, NAMA);
  assert.equal(await adaTabel(), false);
});

test('DB berisi: data lama tidak berubah saat naik dan turun', async () => {
  await c.query("INSERT INTO pengguna (id, nama_pengguna, kata_sandi_hash, dibuat_pada) VALUES (?, 'akun_lama', 'x', ?)", [ID_A, WAKTU]);
  await c.query("INSERT INTO jalur_minat (id, nama, deskripsi_singkat, urutan, pemilik, asal) VALUES ('bekerja', 'Bekerja', 'x', 1, 'tim', 'contoh')");
  await c.query("INSERT INTO butir_bukti (id, pengguna_id, jalur_minat_id, judul, jenis, dibuat_pada, diubah_pada) VALUES ('33333333-3333-4333-8333-333333333333', ?, 'bekerja', 'Karya', 'karya', ?, ?)", [ID_A, WAKTU, WAKTU]);
  const awal = await isiLama();

  await jalankanSatu(c, NAMA);
  assert.deepEqual(await isiLama(), awal);
  await c.query("INSERT INTO berkas_tertunda_hapus (id, nama_tersimpan, alasan, dicatat_pada) VALUES ('44444444-4444-4444-8444-444444444444', 'a/b.jpg', 'uji', ?)", [WAKTU]);
  assert.deepEqual(await isiLama(), awal);

  await turunkanSatu(c, NAMA);
  assert.deepEqual(await isiLama(), awal);
  await jalankanSatu(c, NAMA);
  assert.deepEqual(await isiLama(), awal);
});
