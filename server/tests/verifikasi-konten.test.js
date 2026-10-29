// Uji skrip `npm run verifikasi-konten` (LANJUT_010,
// src/db/verifikasi/verifikasi-konten.js). Memakai baris Linimasa
// sungguhan, lalu mengembalikan status aslinya di `after`.
//
// LANJUT_043: jenis `kartu` (HANYA kartu kurasi tim) dan konfirmasi wajib
// (`--ya` / `konfirmasi: true`). Uji kartu memakai fixture sendiri; 12 kartu
// kurasi asli dari benih tidak pernah ditandai. Kartu kurasi terverifikasi
// langsung terlihat oleh semua akun, dan file test lain berjalan paralel
// (kartu-kurasi.test.js mencatat himpunan kurasi "belum" di awal lalu
// memastikan tidak satu pun muncul). Karena itu fixture kurasi dibuat SUDAH
// terverifikasi (pola FIX_SAH di sana) dan hanya pernah turun ke "belum",
// tidak pernah naik dari "belum" ke "terverifikasi".

const fs = require('fs');
const path = require('path');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { acak, nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const { DIR_DATA } = require('../src/db/benih/benih');
const { daftarBelum, ubahStatus, jalankan, GalatPakai, PerluKonfirmasi } = require('../src/db/verifikasi/verifikasi-konten');

const ID = 'sosialisasi';
const ID_KEDUA = 'pdss';
let asli;

const KURASI = `uji-verif-kurasi-${acak()}`; // resmi, sudah terverifikasi (2026-01-15)
const KURASI_DIHAPUS = `uji-verif-dihapus-${acak()}`; // resmi, dihapus lunak
let kartuSiswa; // kartu buatan akun uji lewat API (sumber 'pengguna')

async function ambilBaris(ids) {
  const [baris] = await pool.query('SELECT * FROM tahapan_linimasa WHERE id IN (?) ORDER BY id', [ids]);
  return baris;
}

async function ambilKartu(id) {
  const [[b]] = await pool.query('SELECT * FROM kartu WHERE id = ?', [id]);
  return b;
}

async function sisipKurasi(id, status, diperiksaPada, dihapusPada) {
  await pool.execute(
    `INSERT INTO kartu
       (id, pemilik_id, mapel_id, judul, isi, jawaban, sumber, penyedia, pemilik,
        status_verifikasi, asal, url_sumber, diperiksa_pada, dibuat_pada, diubah_pada, dihapus_pada)
     VALUES (?, NULL, 'matematika', ?, 'Isi kurasi uji', NULL, 'resmi', NULL, 'tim', ?, 'uji', NULL, ?, NOW(), NOW(), ?)`,
    [id, `Kurasi ${id}`, status, diperiksaPada, dihapusPada]
  );
}

before(async () => {
  asli = await ambilBaris([ID, ID_KEDUA]);
  assert.equal(asli.length, 2, 'baris uji Linimasa belum dibenih');

  await sisipKurasi(KURASI, 'terverifikasi', '2026-01-15', null);
  await sisipKurasi(KURASI_DIHAPUS, 'belum_diverifikasi', null, '2026-01-15 00:00:00');
  const server = await nyalakanServer();
  try {
    const baseUrl = urlDari(server);
    const { json } = await daftarPenggunaBaru(baseUrl);
    const res = await fetch(`${baseUrl}/api/v1/kartu`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${json.data.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mapel_id: 'matematika', judul: 'Kartu siswa (uji verifikasi)', isi: 'Draf' }),
    });
    assert.equal(res.status, 201);
    kartuSiswa = (await res.json()).data.id;
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

after(async () => {
  for (const b of asli) {
    await pool.query('UPDATE tahapan_linimasa SET status_verifikasi = ?, diperiksa_pada = ? WHERE id = ?', [
      b.status_verifikasi,
      b.diperiksa_pada,
      b.id,
    ]);
  }
  await pool.query('DELETE FROM kartu WHERE id IN (?)', [[KURASI, KURASI_DIHAPUS, kartuSiswa].filter(Boolean)]);
  await pool.end();
});

const tanpaVerifikasi = ({ status_verifikasi, diperiksa_pada, ...isi }) => isi;

test('verifikasi-konten: tandai hanya mengubah status_verifikasi & diperiksa_pada', async () => {
  await ubahStatus({ jenis: 'linimasa', ids: [ID], tanggal: '2026-09-27', batal: false, konfirmasi: true });
  const [sesudah] = await ambilBaris([ID]);
  assert.equal(sesudah.status_verifikasi, 'terverifikasi');
  assert.equal(new Date(sesudah.diperiksa_pada).toISOString().slice(0, 10), '2026-09-27');
  assert.deepEqual(tanpaVerifikasi(sesudah), tanpaVerifikasi(asli.find((b) => b.id === ID)));

  const linimasa = (await daftarBelum('linimasa'))[0].baris.map((b) => b.id);
  assert.ok(!linimasa.includes(ID), 'baris terverifikasi masih muncul di --list');
});

test('verifikasi-konten: batal mengosongkan lagi status verifikasi', async () => {
  await ubahStatus({ jenis: 'linimasa', ids: [ID], tanggal: null, batal: true, konfirmasi: true });
  const [sesudah] = await ambilBaris([ID]);
  assert.equal(sesudah.status_verifikasi, 'belum_diverifikasi');
  assert.equal(sesudah.diperiksa_pada, null);
  assert.deepEqual(tanpaVerifikasi(sesudah), tanpaVerifikasi(asli.find((b) => b.id === ID)));
});

test('verifikasi-konten: satu ID salah → galat, dan ID yang benar pun tidak diubah', async () => {
  const sebelum = await ambilBaris([ID_KEDUA]);
  await assert.rejects(
    ubahStatus({ jenis: 'linimasa', ids: [ID_KEDUA, 'tidak-ada-id-ini'], tanggal: '2026-09-27', batal: false, konfirmasi: true }),
    (galat) => galat instanceof GalatPakai && /tidak-ada-id-ini/.test(galat.message)
  );
  assert.deepEqual(await ambilBaris([ID_KEDUA]), sebelum);
});

test('verifikasi-konten: jenis tidak dikenal & ID kosong ditolak', async () => {
  await assert.rejects(ubahStatus({ jenis: 'pengguna', ids: ['x'], tanggal: '2026-09-27' }), GalatPakai);
  await assert.rejects(ubahStatus({ jenis: 'linimasa', ids: [' ', ''], tanggal: '2026-09-27' }), GalatPakai);
  // Tabel pribadi tidak pernah jadi jenis (kartu dikenal sejak LANJUT_043, tetapi hanya kurasi).
  await assert.rejects(daftarBelum('sesi_latihan'), GalatPakai);
  await assert.rejects(daftarBelum('pengguna'), GalatPakai);
});

const tanggalDb = (nilai) => nilai && new Date(nilai).toISOString().slice(0, 10);

test('kartu (LANJUT_043): --list hanya kartu kurasi belum terverifikasi — tanpa kartu siswa & kurasi terhapus', async () => {
  const [{ jenis, baris }] = await daftarBelum('kartu');
  assert.equal(jenis, 'kartu');
  const ids = baris.map((b) => b.id);
  assert.ok(ids.length > 0, 'butuh kartu kurasi belum terverifikasi dari benih (npm run benih)');
  assert.equal(ids.includes(kartuSiswa), false, 'kartu siswa ikut terdaftar');
  assert.equal(ids.includes(KURASI_DIHAPUS), false, 'kurasi terhapus ikut terdaftar');
  assert.equal(ids.includes(KURASI), false, 'kurasi terverifikasi ikut terdaftar');

  const [rinci] = await pool.query('SELECT id, sumber, dihapus_pada FROM kartu WHERE id IN (?)', [ids]);
  assert.deepEqual(rinci.filter((b) => b.sumber !== 'resmi' || b.dihapus_pada !== null), [], 'ada yang bukan kurasi aktif');

  // Pembanding dari berkas benih: setiap kartu kurasi arsip.json yang belum terverifikasi ada di daftar.
  const benih = JSON.parse(fs.readFileSync(path.join(DIR_DATA, 'arsip.json'), 'utf8')).data.map((k) => k.id);
  const [belumBenih] = await pool.query(
    "SELECT id FROM kartu WHERE id IN (?) AND (status_verifikasi <> 'terverifikasi' OR diperiksa_pada IS NULL)",
    [benih]
  );
  assert.deepEqual(belumBenih.map((b) => b.id).filter((id) => !ids.includes(id)), []);
});

test('konfirmasi wajib (LANJUT_043): tanpa konfirmasi: true → PerluKonfirmasi berisi pratinjau, tidak ada yang berubah', async () => {
  const kurasiSebelum = await ambilKartu(KURASI);
  const linimasaSebelum = await ambilBaris([ID_KEDUA]);
  for (const perintah of [
    { jenis: 'kartu', ids: [KURASI], tanggal: '2026-10-02' },
    { jenis: 'kartu', ids: [KURASI], tanggal: '2026-10-02', konfirmasi: 'ya' }, // hanya `true` yang dihitung
    { jenis: 'kartu', ids: [KURASI], tanggal: null, batal: true },
    { jenis: 'linimasa', ids: [ID_KEDUA], tanggal: '2026-10-02' }, // berlaku untuk semua jenis
  ]) {
    await assert.rejects(ubahStatus(perintah), (galat) => {
      assert.ok(galat instanceof PerluKonfirmasi, galat.message);
      assert.deepEqual(galat.pratinjau.map((b) => b.id), perintah.ids);
      assert.match(galat.message, /--ya/);
      return true;
    });
  }
  assert.deepEqual(await ambilKartu(KURASI), kurasiSebelum);
  assert.deepEqual(await ambilBaris([ID_KEDUA]), linimasaSebelum);
});

test('kartu (LANJUT_043): id kartu siswa / kurasi terhapus → tidak ditemukan; campuran → tidak ada yang berubah', async () => {
  const semua = [KURASI, KURASI_DIHAPUS, kartuSiswa];
  const sebelum = await Promise.all(semua.map(ambilKartu));
  for (const ids of [[kartuSiswa], [KURASI_DIHAPUS], [KURASI, kartuSiswa]]) {
    for (const batal of [false, true]) {
      await assert.rejects(
        ubahStatus({ jenis: 'kartu', ids, tanggal: '2026-10-02', batal, konfirmasi: true }),
        (galat) => !(galat instanceof PerluKonfirmasi) && galat instanceof GalatPakai && /tidak ditemukan/.test(galat.message)
      );
    }
  }
  assert.deepEqual(await Promise.all(semua.map(ambilKartu)), sebelum);
});

test('CLI (LANJUT_043): tanpa --ya hanya pratinjau lalu ditolak; --ya=… tidak dihitung sebagai konfirmasi', async () => {
  const sebelum = await ambilKartu(KURASI);
  const tercetak = [];
  const logAsli = console.log;
  console.log = (...isi) => tercetak.push(isi.join(' '));
  try {
    for (const argv of [
      ['--jenis=kartu', `--id=${KURASI}`, '--oleh=Uji'],
      ['--jenis=kartu', `--id=${KURASI}`, '--ya=ya'],
      ['--jenis=kartu', `--id=${KURASI}`, '--batal'],
    ]) {
      await assert.rejects(jalankan(argv), PerluKonfirmasi);
    }
  } finally {
    console.log = logAsli;
  }
  assert.equal(tercetak.length, 3, tercetak.join('\n'));
  assert.ok(tercetak.every((t) => t.startsWith(`[pratinjau] kartu/${KURASI} `)), tercetak.join('\n'));
  assert.deepEqual(await ambilKartu(KURASI), sebelum);
});

// Terakhir: fixture turun ke "belum" dan tidak pernah dinaikkan lagi (lihat kepala berkas).
test('kartu (LANJUT_043): dengan konfirmasi hanya status_verifikasi & diperiksa_pada kurasi yang berubah; batal mengembalikan', async () => {
  const awal = await ambilKartu(KURASI);
  const dicek = await ubahStatus({ jenis: 'kartu', ids: [KURASI], tanggal: '2026-10-02', batal: false, konfirmasi: true });
  assert.deepEqual(dicek.map((b) => b.id), [KURASI]);
  const ditandai = await ambilKartu(KURASI);
  assert.equal(ditandai.status_verifikasi, 'terverifikasi');
  assert.equal(tanggalDb(ditandai.diperiksa_pada), '2026-10-02');
  assert.deepEqual(tanpaVerifikasi(ditandai), tanpaVerifikasi(awal));

  await ubahStatus({ jenis: 'kartu', ids: [KURASI], tanggal: null, batal: true, konfirmasi: true });
  const dibatalkan = await ambilKartu(KURASI);
  assert.equal(dibatalkan.status_verifikasi, 'belum_diverifikasi');
  assert.equal(dibatalkan.diperiksa_pada, null);
  assert.deepEqual(tanpaVerifikasi(dibatalkan), tanpaVerifikasi(awal));
  assert.ok((await daftarBelum('kartu'))[0].baris.some((b) => b.id === KURASI), 'kurasi yang dibatalkan tidak kembali ke --list');
});
