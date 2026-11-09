// LANJUT_001 seri v2: migrasi 029 (jalur → jalur_seleksi) naik dan turun, pada DB
// bersih dan DB berisi. Memakai database sendiri, karena tes lain yang berjalan
// bersamaan membutuhkan kolom bernama baru di DB uji utama.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');
const pool = require('../src/db/koneksi');
const { jalankanSatu, pastikanTabelMigrasi, daftarBerkasMigrasi } = require('../src/db/jalankan-migrasi');
const { turunkanSatu } = require('../src/db/turunkan-migrasi');

const NAMA = '029_ganti_nama_jalur_seleksi.sql';
const DB_UJI = `${env.DB_NAME}_migrasi_jalur`;
const dasar = { host: env.DB_HOST, port: env.DB_PORT, user: env.DB_USER, password: env.DB_PASSWORD };

const KOLOM = [
  ['tahapan_linimasa', 'jalur', 'jalur_seleksi'],
  ['cerita_alumni', 'jalur', 'jalur_seleksi'],
  ['butir_daftar_periksa', 'berlaku_untuk_jalur', 'berlaku_untuk_jalur_seleksi'],
  ['profil_prodi', 'peminat_jalur', 'peminat_jalur_seleksi'],
];
const TABEL = ['tahapan_linimasa', 'cerita_alumni', 'butir_daftar_periksa', 'profil_prodi'];

let admin;
let c;

before(async () => {
  admin = await mysql.createConnection(dasar);
  await admin.query('DROP DATABASE IF EXISTS ??', [DB_UJI]);
  await admin.query('CREATE DATABASE ?? CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci', [DB_UJI]);
  c = await mysql.createConnection({ ...dasar, database: DB_UJI });
  await pastikanTabelMigrasi(c);
  for (const nama of daftarBerkasMigrasi().filter((n) => n < NAMA)) await jalankanSatu(c, nama);
});

after(async () => {
  await c.end();
  await admin.query('DROP DATABASE IF EXISTS ??', [DB_UJI]);
  await admin.end();
  await pool.end();
});

async function definisi(tabel, kolom) {
  const [[b]] = await c.query(
    `SELECT COLUMN_TYPE AS tipe, IS_NULLABLE AS boleh_null, ORDINAL_POSITION AS posisi
       FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [DB_UJI, tabel, kolom]
  );
  return b;
}

async function isiSemua() {
  const hasil = {};
  for (const t of TABEL) [hasil[t]] = await c.query('SELECT * FROM ?? ORDER BY id', [t]);
  return hasil;
}

test('DB bersih: naik mengganti nama tanpa mengubah definisi, turun mengembalikan', async () => {
  const awal = {};
  for (const [t, lama] of KOLOM) awal[t] = await definisi(t, lama);

  await jalankanSatu(c, NAMA);
  for (const [t, lama, baru] of KOLOM) {
    assert.equal(await definisi(t, lama), undefined, `${t}.${lama} masih ada`);
    assert.deepEqual(await definisi(t, baru), awal[t], `${t}.${baru}`);
  }

  await turunkanSatu(c, NAMA);
  for (const [t, lama, baru] of KOLOM) {
    assert.equal(await definisi(t, baru), undefined, `${t}.${baru} masih ada`);
    assert.deepEqual(await definisi(t, lama), awal[t], `${t}.${lama}`);
  }
  const [[catatan]] = await c.query('SELECT COUNT(*) AS n FROM _migrasi WHERE nama = ?', [NAMA]);
  assert.equal(catatan.n, 0, 'catatan migrasi harus terhapus supaya bisa dijalankan lagi');
});

test('DB berisi: jumlah baris, nilai, dan tanda verifikasi sama sebelum dan sesudah; hanya kunci JSON yang berganti', async () => {
  await c.query("INSERT INTO kategori_checklist (id, nama, urutan) VALUES ('k1', 'Kategori', 1)");
  await c.query(`INSERT INTO prodi (id, nama, rumpun, pemilik, asal) VALUES
    ('p1', 'Prodi Satu', 'R', 'tim', 'uji'), ('p2', 'Prodi Dua', 'R', 'tim', 'uji')`);
  await c.query(`INSERT INTO tahapan_linimasa (id, judul, tanggal_mulai, jalur, pemilik, status_verifikasi, asal, diperiksa_pada) VALUES
    ('t1', 'Satu', '2026-01-01', 'TKA', 'tim', 'terverifikasi', 'uji', '2026-09-27'),
    ('t2', 'Dua', '2026-01-02', 'SNBT', 'tim', 'belum_diverifikasi', 'uji', NULL)`);
  await c.query(`INSERT INTO cerita_alumni (id, nama, asal_smk, jurusan_smk, ptn, prodi, jalur, hambatan, yang_dilakukan, pemilik, asal)
    VALUES ('c1', 'A', 'S', 'J', 'P', 'Pr', 'SNBT (UTBK)', 'H', 'Y', 'tim', 'uji')`);
  await c.query(`INSERT INTO butir_daftar_periksa (id, judul, urutan, berlaku_untuk_kelas, berlaku_untuk_jalur, kategori_id, pemilik, asal)
    VALUES ('b1', 'Butir', 1, '11,12', 'SNBP,SNBT', 'k1', 'tim', 'uji')`);
  const kampus = (kunci) => JSON.stringify([{ nama: 'Kampus "jalur_masuk" Uji', jenis: 'PTN', [kunci]: ['SNBP', 'Mandiri'] }]);
  await c.query(
    `INSERT INTO profil_prodi (id, nama, jenjang, peminat_jumlah, peminat_jalur, mata_kuliah, profesi, kampus, status_sumber, pemilik, status_verifikasi, asal, diperiksa_pada)
     VALUES ('p1', 'Prodi Satu', 'S1', 10, 'SNBT', '[]', '[]', ?, '{}', 'tim', 'terverifikasi', 'uji', '2026-09-27'),
            ('p2', 'Prodi Dua', 'D4', NULL, NULL, '[]', '[]', '[]', '{}', 'tim', 'belum_diverifikasi', 'uji', NULL)`,
    [kampus('jalur_masuk')]
  );
  const sebelum = await isiSemua();

  await jalankanSatu(c, NAMA);
  const sesudah = await isiSemua();
  for (const t of TABEL) assert.equal(sesudah[t].length, sebelum[t].length, `jumlah baris ${t}`);
  for (const [t, lama, baru] of KOLOM) {
    sebelum[t].forEach((b, i) => {
      const { [lama]: nilaiLama, ...sisaLama } = b;
      const { [baru]: nilaiBaru, kampus: kBaru, ...sisaBaru } = sesudah[t][i];
      assert.equal(nilaiBaru, nilaiLama, `${t}/${b.id}`);
      assert.deepEqual(sisaBaru, t === 'profil_prodi' ? (({ kampus: _, ...r }) => r)(sisaLama) : sisaLama, `${t}/${b.id}`);
    });
  }
  assert.deepEqual(sesudah.profil_prodi[0].kampus, JSON.parse(kampus('jalur_seleksi')), 'kunci berganti, teks di dalam nilai tetap');
  assert.deepEqual(sesudah.profil_prodi[1].kampus, []);

  await turunkanSatu(c, NAMA);
  assert.deepEqual(await isiSemua(), sebelum, 'turun harus mengembalikan isi persis');
});

test('langkah turun ditolak bila migrasi belum tercatat atau bukan yang terakhir', async () => {
  await assert.rejects(turunkanSatu(c, NAMA), /bukan migrasi terakhir/);
  await assert.rejects(turunkanSatu(c, '../migrasi/001_pengguna_dan_sesi.sql'), /Tidak ada langkah turun/);

  await jalankanSatu(c, NAMA);
  await c.query("INSERT INTO _migrasi (nama, dijalankan_pada) VALUES ('999_uji.sql', NOW())");
  await assert.rejects(turunkanSatu(c, NAMA), /bukan migrasi terakhir/);
  assert.ok(await definisi('tahapan_linimasa', 'jalur_seleksi'), 'penolakan tidak boleh mengubah skema');
});
