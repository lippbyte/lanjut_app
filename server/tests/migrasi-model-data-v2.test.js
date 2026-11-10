// LANJUT_008 seri v2: migrasi 030 naik dan turun, pada DB bersih dan DB berisi. Memakai
// database sendiri, karena tes lain yang berjalan bersamaan membutuhkan tabelnya di DB uji utama.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const pool = require('../src/db/koneksi');
const { jalankanSatu, pastikanTabelMigrasi, daftarBerkasMigrasi } = require('../src/db/jalankan-migrasi');
const { turunkanSatu } = require('../src/db/turunkan-migrasi');

const NAMA = '030_model_data_v2.sql';
const DB_UJI = `${env.DB_NAME}_migrasi_v2`;
const dasar = { host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD };
const TABEL_BARU = ['butir_bukti', 'jalur_minat', 'lampiran_butir_bukti', 'pengguna_jalur_minat', 'tujuan'];

const ID_A = '11111111-1111-4111-8111-111111111111';
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

async function tabelYangAda() {
  const [baris] = await c.query(
    'SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME',
    [DB_UJI]
  );
  return baris.map((b) => b.t);
}

const tabelLama = async () => (await tabelYangAda()).filter((t) => !TABEL_BARU.includes(t) && t !== '_migrasi');

/** Definisi kolom semua tabel lama, untuk membuktikan skemanya tidak bergeser. */
async function skemaLama() {
  const nama = await tabelLama();
  const [baris] = await c.query(
    `SELECT TABLE_NAME, COLUMN_NAME, ORDINAL_POSITION, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?)
      ORDER BY TABLE_NAME, ORDINAL_POSITION`,
    [DB_UJI, nama]
  );
  return baris;
}

async function isiLama() {
  const hasil = {};
  for (const t of await tabelLama()) {
    const [baris] = await c.query('SELECT * FROM ??', [t]);
    hasil[t] = baris.map((b) => JSON.stringify(b)).sort();
  }
  return hasil;
}

async function foreignKeyBaru() {
  const [baris] = await c.query(
    `SELECT k.TABLE_NAME AS tabel, k.COLUMN_NAME AS kolom, k.REFERENCED_TABLE_NAME AS ke, r.DELETE_RULE AS hapus
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      WHERE k.TABLE_SCHEMA = ? AND k.TABLE_NAME IN (?) AND k.REFERENCED_TABLE_NAME IS NOT NULL
      ORDER BY k.TABLE_NAME, k.COLUMN_NAME`,
    [DB_UJI, TABEL_BARU]
  );
  return baris;
}

test('DB bersih: naik membuat lima tabel, turun menghapusnya, skema lama tidak bergeser', async () => {
  const skemaAwal = await skemaLama();
  assert.deepEqual((await tabelYangAda()).filter((t) => TABEL_BARU.includes(t)), []);

  await jalankanSatu(c, NAMA);
  assert.deepEqual((await tabelYangAda()).filter((t) => TABEL_BARU.includes(t)), TABEL_BARU);
  assert.deepEqual(await skemaLama(), skemaAwal);

  await turunkanSatu(c, NAMA);
  assert.deepEqual((await tabelYangAda()).filter((t) => TABEL_BARU.includes(t)), []);
  assert.deepEqual(await skemaLama(), skemaAwal);
  const [catat] = await c.query('SELECT nama FROM _migrasi WHERE nama = ?', [NAMA]);
  assert.equal(catat.length, 0);
});

test('Tabel baru mengikuti konvensi: InnoDB, utf8mb4_unicode_ci', async () => {
  await jalankanSatu(c, NAMA);
  const [baris] = await c.query(
    'SELECT TABLE_NAME AS t, ENGINE AS e, TABLE_COLLATION AS k FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME IN (?)',
    [DB_UJI, TABEL_BARU]
  );
  assert.equal(baris.length, 5);
  for (const b of baris) {
    assert.equal(b.e, 'InnoDB', b.t);
    assert.equal(b.k, 'utf8mb4_unicode_ci', b.t);
  }
  await turunkanSatu(c, NAMA);
});

test('Foreign key tabel baru hanya menuju pengguna, jalur_minat, tujuan, atau butir_bukti', async () => {
  await jalankanSatu(c, NAMA);
  assert.deepEqual(await foreignKeyBaru(), [
    { tabel: 'butir_bukti', kolom: 'jalur_minat_id', ke: 'jalur_minat', hapus: 'SET NULL' },
    { tabel: 'butir_bukti', kolom: 'pengguna_id', ke: 'pengguna', hapus: 'CASCADE' },
    { tabel: 'butir_bukti', kolom: 'tujuan_id', ke: 'tujuan', hapus: 'SET NULL' },
    { tabel: 'lampiran_butir_bukti', kolom: 'butir_bukti_id', ke: 'butir_bukti', hapus: 'CASCADE' },
    { tabel: 'pengguna_jalur_minat', kolom: 'jalur_minat_id', ke: 'jalur_minat', hapus: 'RESTRICT' },
    { tabel: 'pengguna_jalur_minat', kolom: 'pengguna_id', ke: 'pengguna', hapus: 'CASCADE' },
    { tabel: 'tujuan', kolom: 'diubah_dari_id', ke: 'tujuan', hapus: 'SET NULL' },
    { tabel: 'tujuan', kolom: 'jalur_minat_id', ke: 'jalur_minat', hapus: 'SET NULL' },
    { tabel: 'tujuan', kolom: 'pengguna_id', ke: 'pengguna', hapus: 'CASCADE' },
  ]);
  await turunkanSatu(c, NAMA);
});

test('Rujukan eksternal tanpa foreign key dan tanpa indeks; visibilitas hanya privat', async () => {
  await jalankanSatu(c, NAMA);
  const [indeks] = await c.query(
    "SELECT INDEX_NAME AS i FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'butir_bukti' AND COLUMN_NAME IN ('rujukan_jenis', 'rujukan_id')",
    [DB_UJI]
  );
  assert.deepEqual(indeks, []);
  assert.equal((await foreignKeyBaru()).some((f) => f.kolom.startsWith('rujukan_')), false);
  const [[v]] = await c.query(
    "SELECT COLUMN_TYPE AS t, COLUMN_DEFAULT AS d, IS_NULLABLE AS n FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'butir_bukti' AND COLUMN_NAME = 'visibilitas'",
    [DB_UJI]
  );
  assert.deepEqual(v, { t: "enum('privat')", d: 'privat', n: 'NO' });
  await turunkanSatu(c, NAMA);
});

test('DB berisi: data lama tidak berubah saat naik dan turun, dan bisa naik lagi', async () => {
  await c.query("INSERT INTO prodi (id, nama, rumpun, pemilik, asal) VALUES ('informatika', 'Informatika', 'Teknologi', 'tim', 'contoh')");
  await c.query(
    "INSERT INTO pengguna (id, nama_pengguna, kata_sandi_hash, kelas, prodi_tujuan, dibuat_pada) VALUES (?, 'akun_lama', 'x', '12', 'informatika', ?)",
    [ID_A, WAKTU]
  );
  await c.query(
    "INSERT INTO mapel (id, nama, tersedia_di_smk, pemilik, asal) VALUES ('uji-mapel', 'Mapel Uji', 1, 'tim', 'contoh')"
  );
  await c.query(
    `INSERT INTO kartu (id, pemilik_id, mapel_id, judul, isi, sumber, pemilik, status_verifikasi, asal, dibuat_pada, diubah_pada)
     VALUES ('uji-kartu', ?, 'uji-mapel', 'Judul', 'Isi', 'pengguna', 'pengguna', 'belum_diverifikasi', 'pengguna', ?, ?)`,
    [ID_A, WAKTU, WAKTU]
  );
  await c.query(
    "INSERT INTO event_sekolah (id, pengguna_id, jenis, tanggal, mapel_id, dibuat_pada, diubah_pada) VALUES ('22222222-2222-4222-8222-222222222222', ?, 'UTS', '2026-12-01', 'uji-mapel', ?, ?)",
    [ID_A, WAKTU, WAKTU]
  );
  const awal = await isiLama();

  await jalankanSatu(c, NAMA);
  assert.deepEqual(await isiLama(), awal, 'naik mengubah data lama');

  // Baris v2 milik akun lama, supaya turun benar-benar menghapus tabel yang berisi.
  await c.query(
    "INSERT INTO jalur_minat (id, nama, deskripsi_singkat, urutan, pemilik, asal) VALUES ('melanjutkan', 'Melanjutkan', 'Draf.', 1, 'tim', 'contoh')"
  );
  await c.query(
    "INSERT INTO butir_bukti (id, pengguna_id, jalur_minat_id, judul, jenis, dibuat_pada, diubah_pada) VALUES ('33333333-3333-4333-8333-333333333333', ?, 'melanjutkan', 'Karya', 'karya', ?, ?)",
    [ID_A, WAKTU, WAKTU]
  );
  assert.deepEqual(await isiLama(), awal, 'mengisi tabel baru mengubah data lama');

  await turunkanSatu(c, NAMA);
  assert.deepEqual(await isiLama(), awal, 'turun mengubah data lama');

  await jalankanSatu(c, NAMA);
  assert.deepEqual(await isiLama(), awal, 'naik kedua mengubah data lama');
  const [[akun]] = await c.query('SELECT prodi_tujuan FROM pengguna WHERE id = ?', [ID_A]);
  assert.equal(akun.prodi_tujuan, 'informatika');
});
