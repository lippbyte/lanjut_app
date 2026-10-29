// Uji `GET /konten/checklist?rumpun=` (LANJUT_007, migrasi 006).
//
// Butir khusus rumpun belum ada di data konten, jadi test ini menyisipkan
// butir fixture sementara (id berawalan `uji-rumpun-`) lalu menghapusnya
// lagi. Regresi utama: request TANPA `rumpun` harus identik dengan sebelum
// butir khusus rumpun ada — dibandingkan dengan respons yang diambil sebelum
// fixture disisipkan.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, pool } = require('./bantuan');

const TEK = 'Teknologi & Rekayasa';
const KES = 'Kesehatan';

// Kategori 'berkas' sudah ada dari benih checklist.
const FIXTURE = [
  { id: 'uji-rumpun-tek', rumpun: TEK, kelas: '12', jalur: 'SNBP,SNBT' },
  { id: 'uji-rumpun-tek-kes', rumpun: `${TEK},${KES}`, kelas: '11,12', jalur: 'SNBP,SNBT' },
  { id: 'uji-rumpun-eko', rumpun: 'Ekonomi & Bisnis', kelas: '12', jalur: 'SNBP,SNBT' },
];
const ID_FIXTURE = FIXTURE.map((f) => f.id);

const KUERI_LAMA = ['', '?kelas=12', '?kelas=12&jalur=SNBP', '?kelas=11&jalur=TKA', '?jalur=SNBT'];

let server;
let baseUrl;
const sebelumFixture = new Map();

async function ambil(path) {
  const res = await fetch(`${baseUrl}/api/v1${path}`);
  const json = await res.json();
  assert.equal(res.status, 200, `GET ${path} gagal: ${JSON.stringify(json)}`);
  assert.equal(json.ok, true);
  return json.data;
}

const idButir = (data) => data.kategori.flatMap((k) => k.butir.map((b) => b.id));

async function hapusFixture() {
  await pool.query('DELETE FROM butir_daftar_periksa WHERE id IN (?)', [ID_FIXTURE]);
}

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  await hapusFixture(); // sisa run sebelumnya yang gagal di tengah

  for (const q of KUERI_LAMA) sebelumFixture.set(q, await ambil(`/konten/checklist${q}`));

  for (const [i, f] of FIXTURE.entries()) {
    await pool.query(
      `INSERT INTO butir_daftar_periksa
         (id, judul, urutan, berlaku_untuk_kelas, berlaku_untuk_jalur, berlaku_untuk_rumpun,
          kategori_id, pemilik, asal)
       VALUES (?, ?, ?, ?, ?, ?, 'berkas', 'tim', 'uji')`,
      [f.id, `Butir uji ${f.id}`, 90 + i, f.kelas, f.jalur, f.rumpun]
    );
  }
});

after(async () => {
  await hapusFixture();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('checklist tanpa rumpun: identik dengan sebelum ada butir khusus rumpun', async () => {
  for (const q of KUERI_LAMA) {
    const sekarang = await ambil(`/konten/checklist${q}`);
    assert.deepEqual(sekarang, sebelumFixture.get(q), `respons berubah untuk "${q || '(tanpa kueri)'}"`);
    for (const id of ID_FIXTURE) assert.ok(!idButir(sekarang).includes(id), `${id} bocor ke "${q}"`);
  }
});

test('checklist tanpa rumpun: semua butir yang ada sekarang adalah butir umum (rumpun null)', async () => {
  const data = await ambil('/konten/checklist');
  assert.ok(data.total_butir > 0);
  for (const k of data.kategori) {
    for (const b of k.butir) assert.equal(b.berlaku_untuk_rumpun, null, `${b.id} bukan butir umum`);
  }
});

test('checklist ?rumpun= kosong diperlakukan sama dengan tanpa rumpun', async () => {
  assert.deepEqual(await ambil('/konten/checklist?rumpun='), sebelumFixture.get(''));
});

test('checklist dengan rumpun: butir umum + butir khusus rumpun itu, tanpa rumpun lain', async () => {
  const umum = idButir(sebelumFixture.get(''));
  const data = await ambil(`/konten/checklist?rumpun=${encodeURIComponent(TEK)}`);
  const ids = idButir(data);

  for (const id of umum) assert.ok(ids.includes(id), `butir umum ${id} hilang`);
  assert.ok(ids.includes('uji-rumpun-tek'));
  assert.ok(ids.includes('uji-rumpun-tek-kes'), 'butir dengan beberapa rumpun harus cocok');
  assert.ok(!ids.includes('uji-rumpun-eko'), 'butir rumpun lain tidak boleh ikut');
  assert.equal(data.total_butir, umum.length + 2);

  const tekKes = data.kategori.flatMap((k) => k.butir).find((b) => b.id === 'uji-rumpun-tek-kes');
  assert.deepEqual(tekKes.berlaku_untuk_rumpun, [TEK, KES]);
});

test('checklist dengan rumpun: filter kelas & jalur tetap berlaku', async () => {
  const r = encodeURIComponent(TEK);
  const kelas11 = idButir(await ambil(`/konten/checklist?kelas=11&rumpun=${r}`));
  assert.ok(!kelas11.includes('uji-rumpun-tek'), 'butir kelas 12 tidak boleh tampil di kelas 11');
  assert.ok(kelas11.includes('uji-rumpun-tek-kes'));

  const tka = idButir(await ambil(`/konten/checklist?jalur=TKA&rumpun=${r}`));
  assert.ok(!tka.includes('uji-rumpun-tek') && !tka.includes('uji-rumpun-tek-kes'));
});

test('checklist dengan rumpun yang tidak cocok butir mana pun: hanya butir umum, bukan galat', async () => {
  const data = await ambil(`/konten/checklist?rumpun=${encodeURIComponent('Rumpun Tidak Ada')}`);
  assert.deepEqual(data, sebelumFixture.get(''));
});

test('checklist: rumpun dari /konten/prodi bisa dipakai apa adanya', async () => {
  const prodi = await ambil('/konten/prodi');
  const ti = prodi.find((p) => p.id === 'teknik-informatika');
  assert.equal(ti.rumpun, TEK);
  const ids = idButir(await ambil(`/konten/checklist?rumpun=${encodeURIComponent(ti.rumpun)}`));
  assert.ok(ids.includes('uji-rumpun-tek'));
});

test('checklist: rumpun dikirim ganda (array) tidak bikin 500', async () => {
  const data = await ambil('/konten/checklist?rumpun=a&rumpun=b');
  assert.deepEqual(data, sebelumFixture.get(''));
});
