// Uji `GET /konten/linimasa` (LANJUT_030).
//
// Kontrak (SDD §4.4): urut `tanggal_mulai ASC`, dan server mengirim SEMUA
// tahapan — terverifikasi maupun belum — lengkap dengan `status_verifikasi`
// & `diperiksa_pada`. Penyaringan "hanya yang sudah dicek" ada di klien
// (LANJUT_App/lib/linimasa.ts), jadi di sini yang dikunci justru bahwa
// server TIDAK diam-diam membuang tahapan yang belum dicek.
//
// Fixture ber-id `uji-030-lini-` bertanggal 2099 supaya tidak bercampur
// dengan data konten; dihapus lagi di after(). Kondisi kosong & galat DB
// diuji dengan mengganti fungsi repositori sementara (bukan mengosongkan
// tabel — itu akan menghapus tanda verifikasi tim konten).

const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, pool } = require('./bantuan');
const kontenRepo = require('../src/modul/konten/konten.repo');

const KUNCI = [
  'id', 'judul', 'tanggal_mulai', 'tanggal_selesai', 'jalur',
  'sumber', 'pemilik', 'status_verifikasi', 'asal', 'url_sumber', 'diperiksa_pada',
].sort();

const FIXTURE = [
  {
    id: 'uji-030-lini-dicek', judul: 'Tahapan uji dicek', tanggal_mulai: '2099-03-02',
    tanggal_selesai: '2099-03-09', jalur: 'SNBT', status_verifikasi: 'terverifikasi',
    asal: 'resmi', url_sumber: 'https://contoh.invalid/jadwal', diperiksa_pada: '2099-01-15',
  },
  {
    id: 'uji-030-lini-belum', judul: 'Tahapan uji belum dicek', tanggal_mulai: '2099-03-01',
    tanggal_selesai: null, jalur: 'SNBP', status_verifikasi: 'belum_diverifikasi',
    asal: 'uji', url_sumber: null, diperiksa_pada: null,
  },
];
const ID_FIXTURE = FIXTURE.map((f) => f.id);

let server;
let baseUrl;

async function ambil(path) {
  const res = await fetch(`${baseUrl}/api/v1${path}`);
  return { status: res.status, json: await res.json() };
}

async function hapusFixture() {
  await pool.query('DELETE FROM tahapan_linimasa WHERE id IN (?)', [ID_FIXTURE]);
}

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  await hapusFixture(); // sisa run sebelumnya yang gagal di tengah
  for (const f of FIXTURE) {
    await pool.query(
      `INSERT INTO tahapan_linimasa
         (id, judul, tanggal_mulai, tanggal_selesai, jalur, pemilik,
          status_verifikasi, asal, url_sumber, diperiksa_pada)
       VALUES (?, ?, ?, ?, ?, 'tim', ?, ?, ?, ?)`,
      [f.id, f.judul, f.tanggal_mulai, f.tanggal_selesai, f.jalur,
        f.status_verifikasi, f.asal, f.url_sumber, f.diperiksa_pada]
    );
  }
});

after(async () => {
  mock.restoreAll();
  await hapusFixture();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('linimasa: 200, tiap butir berbentuk benar, tanggal YYYY-MM-DD, urut tanggal_mulai ASC', async () => {
  const { status, json } = await ambil('/konten/linimasa');
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  assert.ok(Array.isArray(json.data) && json.data.length >= FIXTURE.length);

  const tanggal = /^\d{4}-\d{2}-\d{2}$/;
  for (const t of json.data) {
    assert.deepEqual(Object.keys(t).sort(), KUNCI, `kunci ${t.id} berbeda`);
    assert.match(t.tanggal_mulai, tanggal);
    if (t.tanggal_selesai !== null) assert.match(t.tanggal_selesai, tanggal);
    if (t.diperiksa_pada !== null) assert.match(t.diperiksa_pada, tanggal);
  }
  const mulai = json.data.map((t) => t.tanggal_mulai);
  assert.deepEqual(mulai, [...mulai].sort(), 'tidak terurut tanggal_mulai ASC');
});

test('linimasa: tahapan terverifikasi DAN belum sama-sama dikirim, tanggal persis tanpa geser zona waktu', async () => {
  const { json } = await ambil('/konten/linimasa');
  const dariServer = json.data.filter((t) => ID_FIXTURE.includes(t.id));

  // Urutan: 1 Maret (belum dicek) sebelum 2 Maret (dicek).
  assert.deepEqual(dariServer.map((t) => t.id), ['uji-030-lini-belum', 'uji-030-lini-dicek']);
  for (const f of FIXTURE) {
    const t = dariServer.find((x) => x.id === f.id);
    assert.deepEqual(
      {
        judul: t.judul, tanggal_mulai: t.tanggal_mulai, tanggal_selesai: t.tanggal_selesai,
        jalur: t.jalur, status_verifikasi: t.status_verifikasi, asal: t.asal,
        url_sumber: t.url_sumber, diperiksa_pada: t.diperiksa_pada, sumber: t.sumber,
      },
      {
        judul: f.judul, tanggal_mulai: f.tanggal_mulai, tanggal_selesai: f.tanggal_selesai,
        jalur: f.jalur, status_verifikasi: f.status_verifikasi, asal: f.asal,
        url_sumber: f.url_sumber, diperiksa_pada: f.diperiksa_pada, sumber: 'resmi',
      }
    );
  }
});

test('linimasa: kueri yang tidak dikenal diabaikan, bukan galat dan bukan penyaring', async () => {
  const { status, json } = await ambil('/konten/linimasa?jalur=TKA&status=terverifikasi&x[]=1');
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  const ids = json.data.map((t) => t.id);
  for (const id of ID_FIXTURE) assert.ok(ids.includes(id), `${id} hilang — kueri tidak boleh menyaring`);
});

test('linimasa: tabel kosong → 200 dengan data [] (bukan galat)', async (t) => {
  t.mock.method(kontenRepo, 'ambilLinimasa', async () => []);
  const { status, json } = await ambil('/konten/linimasa');
  assert.equal(status, 200);
  assert.deepEqual(json, { ok: true, data: [] });
});

test('linimasa: galat basis data → 500 GALAT_SERVER tanpa membocorkan detail', async (t) => {
  t.mock.method(kontenRepo, 'ambilLinimasa', async () => {
    throw new Error('ER_ACCESS_DENIED: SELECT rahasia FROM tahapan_linimasa');
  });
  t.mock.method(console, 'error', () => {}); // penangananGalat tetap mencatat; senyapkan di output tes
  const res = await fetch(`${baseUrl}/api/v1/konten/linimasa`);
  const teks = await res.text();
  assert.equal(res.status, 500);
  assert.deepEqual(JSON.parse(teks), {
    ok: false,
    galat: { kode: 'GALAT_SERVER', pesan: 'Terjadi kesalahan pada server.' },
  });
  assert.ok(!/SELECT|rahasia|ER_ACCESS/.test(teks));
});
