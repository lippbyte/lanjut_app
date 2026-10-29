// Uji `GET /konten/khusus-smk` (LANJUT_030).
//
// Kontrak: semua butir dikirim (terverifikasi maupun belum — label "dicek"
// ditentukan klien dari `diperiksa_pada`), urut `urutan ASC, id ASC`.
// Fixture ber-id `uji-030-smk-` dengan urutan 900-an supaya berada di akhir
// daftar; dihapus lagi di after(). Kondisi kosong & galat DB diuji dengan
// mengganti fungsi repositori sementara, bukan mengosongkan tabel.

const { test, before, after, mock } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, pool } = require('./bantuan');
const kontenRepo = require('../src/modul/konten/konten.repo');

const KUNCI = [
  'id', 'judul', 'apa_yang_beda', 'apa_yang_bisa_dilakukan', 'urutan',
  'sumber', 'pemilik', 'status_verifikasi', 'asal', 'url_sumber', 'diperiksa_pada',
].sort();

// Dua butir berurutan sama → penentu kedua adalah id (a sebelum b).
const FIXTURE = [
  { id: 'uji-030-smk-b', urutan: 900, status: 'terverifikasi', diperiksa: '2099-01-15', url: 'https://contoh.invalid/smk' },
  { id: 'uji-030-smk-a', urutan: 900, status: 'belum_diverifikasi', diperiksa: null, url: null },
  { id: 'uji-030-smk-c', urutan: 901, status: 'belum_diverifikasi', diperiksa: null, url: null },
];
const ID_FIXTURE = FIXTURE.map((f) => f.id);

let server;
let baseUrl;

async function ambil(path) {
  const res = await fetch(`${baseUrl}/api/v1${path}`);
  return { status: res.status, json: await res.json() };
}

async function hapusFixture() {
  await pool.query('DELETE FROM butir_khusus_smk WHERE id IN (?)', [ID_FIXTURE]);
}

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  await hapusFixture();
  for (const f of FIXTURE) {
    await pool.query(
      `INSERT INTO butir_khusus_smk
         (id, judul, apa_yang_beda, apa_yang_bisa_dilakukan, urutan, pemilik,
          status_verifikasi, asal, url_sumber, diperiksa_pada)
       VALUES (?, ?, ?, ?, ?, 'tim', ?, 'uji', ?, ?)`,
      [f.id, `Judul ${f.id}`, `Beda ${f.id}`, `Lakukan ${f.id}`, f.urutan, f.status, f.url, f.diperiksa]
    );
  }
});

after(async () => {
  mock.restoreAll();
  await hapusFixture();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('khusus-smk: 200, tiap butir berbentuk benar dan berpasangan (beda + bisa dilakukan)', async () => {
  const { status, json } = await ambil('/konten/khusus-smk');
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  assert.ok(Array.isArray(json.data) && json.data.length >= FIXTURE.length);
  for (const b of json.data) {
    assert.deepEqual(Object.keys(b).sort(), KUNCI, `kunci ${b.id} berbeda`);
    assert.equal(typeof b.apa_yang_beda, 'string');
    assert.equal(typeof b.apa_yang_bisa_dilakukan, 'string');
    if (b.diperiksa_pada !== null) assert.match(b.diperiksa_pada, /^\d{4}-\d{2}-\d{2}$/);
  }
});

test('khusus-smk: urut urutan ASC lalu id ASC; butir belum dicek tetap dikirim', async () => {
  const { json } = await ambil('/konten/khusus-smk');
  const fixture = json.data.filter((b) => ID_FIXTURE.includes(b.id));
  assert.deepEqual(fixture.map((b) => b.id), ['uji-030-smk-a', 'uji-030-smk-b', 'uji-030-smk-c']);

  const a = fixture[0];
  const b = fixture[1];
  assert.equal(a.status_verifikasi, 'belum_diverifikasi');
  assert.equal(a.diperiksa_pada, null);
  assert.equal(b.status_verifikasi, 'terverifikasi');
  assert.equal(b.diperiksa_pada, '2099-01-15');
  assert.equal(b.url_sumber, 'https://contoh.invalid/smk');
  assert.equal(b.apa_yang_beda, 'Beda uji-030-smk-b');
  assert.equal(b.apa_yang_bisa_dilakukan, 'Lakukan uji-030-smk-b');

  // Fixture berurutan 900-an → tidak ada butir non-null lain yang lebih besar
  // sesudahnya; seluruh daftar juga tidak pernah turun urutannya.
  const urutan = json.data.map((x) => x.urutan).filter((u) => u !== null);
  assert.deepEqual(urutan, [...urutan].sort((p, q) => p - q), 'urutan tidak ASC');
});

test('khusus-smk: kueri yang tidak dikenal diabaikan, bukan galat', async () => {
  const { status, json } = await ambil('/konten/khusus-smk?id=uji-030-smk-a&urutan[]=1');
  assert.equal(status, 200);
  const ids = json.data.map((b) => b.id);
  for (const id of ID_FIXTURE) assert.ok(ids.includes(id), `${id} hilang — kueri tidak boleh menyaring`);
});

test('khusus-smk: tabel kosong → 200 dengan data []', async (t) => {
  t.mock.method(kontenRepo, 'ambilKhususSmk', async () => []);
  const { status, json } = await ambil('/konten/khusus-smk');
  assert.equal(status, 200);
  assert.deepEqual(json, { ok: true, data: [] });
});

test('khusus-smk: galat basis data → 500 GALAT_SERVER tanpa membocorkan detail', async (t) => {
  t.mock.method(kontenRepo, 'ambilKhususSmk', async () => {
    throw new Error('ER_NO_SUCH_TABLE: butir_khusus_smk');
  });
  t.mock.method(console, 'error', () => {});
  const res = await fetch(`${baseUrl}/api/v1/konten/khusus-smk`);
  const teks = await res.text();
  assert.equal(res.status, 500);
  assert.equal(JSON.parse(teks).galat.kode, 'GALAT_SERVER');
  assert.ok(!/ER_NO_SUCH_TABLE|butir_khusus_smk/.test(teks));
});
