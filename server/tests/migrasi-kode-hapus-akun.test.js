// LANJUT_009 seri v2: migrasi 031 naik dan turun, pada database sendiri.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const pool = require('../src/db/koneksi');
const { jalankanSatu, pastikanTabelMigrasi, daftarBerkasMigrasi } = require('../src/db/jalankan-migrasi');
const { turunkanSatu } = require('../src/db/turunkan-migrasi');

const NAMA = '031_kode_hapus_akun.sql';
const DB_UJI = `${env.DB_NAME}_migrasi_031`;
const dasar = { host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD };
const WAKTU = '2026-11-10 08:00:00';

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

async function kolomTujuan() {
  const [[b]] = await c.query(
    "SELECT COLUMN_TYPE AS tipe, COLUMN_DEFAULT AS bawaan, IS_NULLABLE AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'kode_otp_email' AND COLUMN_NAME = 'tujuan'",
    [DB_UJI]
  );
  return b;
}

const isiKode = async () => (await c.query('SELECT id, tujuan FROM kode_otp_email ORDER BY id'))[0];
const sisip = (id, tujuan) =>
  c.query(
    "INSERT INTO kode_otp_email (id, email_hash, tujuan, kode_hash, dibuat_pada, kedaluwarsa_pada) VALUES (?, 'hash', ?, 'x', ?, ?)",
    [id, tujuan, WAKTU, WAKTU]
  );

test('Naik menambah tujuan hapus_akun tanpa mengubah kode lama; turun mengembalikan bentuk kolom', async () => {
  const awal = await kolomTujuan();
  await sisip('11111111-1111-4111-8111-111111111111', 'masuk');
  await sisip('22222222-2222-4222-8222-222222222222', 'verifikasi');
  const kodeLama = await isiKode();

  await jalankanSatu(c, NAMA);
  assert.deepEqual(await kolomTujuan(), { tipe: "enum('masuk','daftar','verifikasi','hapus_akun')", bawaan: 'masuk', n: 'NO' });
  assert.deepEqual(await isiKode(), kodeLama);
  await sisip('33333333-3333-4333-8333-333333333333', 'hapus_akun');

  await turunkanSatu(c, NAMA);
  assert.deepEqual(await kolomTujuan(), awal);
  assert.deepEqual(await isiKode(), kodeLama, 'hanya kode hapus_akun yang dibuang');
});
