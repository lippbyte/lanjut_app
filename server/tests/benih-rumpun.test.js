// Uji `npm run benih` untuk kolom berlaku_untuk_rumpun (LANJUT_008).
//
// Berkas berkas-contoh (tests/contoh/checklist-contoh-rumpun.json) dibenih ke
// database test lalu dihapus lagi. Semua butir contoh KHUSUS rumpun, dan
// rumpunnya bukan yang dipakai konten-checklist-rumpun.test.js (Teknologi),
// karena file test jalan paralel: butir umum atau butir Teknologi di sini akan
// mengubah respons yang dibandingkan persis oleh test itu.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { nyalakanServer, urlDari, pool } = require('./bantuan');
const { benihChecklist, DIR_DATA } = require('../src/db/benih/benih');

const CONTOH = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'contoh', 'checklist-contoh-rumpun.json'), 'utf8')
);
const ID_KATEGORI = CONTOH.kategori.map((k) => k.id);
const ID_CONTOH = CONTOH.kategori.flatMap((k) => k.butir.map((b) => b.id));
const ID_TYPO = 'contoh-rumpun-typo';

let server;
let baseUrl;

async function hapusContoh() {
  await pool.query('DELETE FROM butir_daftar_periksa WHERE id IN (?)', [[...ID_CONTOH, ID_TYPO]]);
  await pool.query('DELETE FROM kategori_checklist WHERE id IN (?)', [ID_KATEGORI]);
}

async function rumpunDiDb(ids) {
  const [baris] = await pool.query(
    'SELECT id, berlaku_untuk_rumpun FROM butir_daftar_periksa WHERE id IN (?)',
    [ids]
  );
  return Object.fromEntries(baris.map((b) => [b.id, b.berlaku_untuk_rumpun]));
}

// Tanpa kategori tambahan: cukup satu butir dengan rumpun salah ketik.
function berkasTypo(rumpun) {
  return {
    ...CONTOH,
    kategori: [
      {
        ...CONTOH.kategori[0],
        butir: [{ ...CONTOH.kategori[0].butir[0], id: ID_TYPO, berlaku_untuk_rumpun: rumpun }],
      },
    ],
  };
}

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  await hapusContoh(); // sisa run sebelumnya yang gagal di tengah
});

after(async () => {
  await hapusContoh();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

test('benih: butir tanpa berlaku_untuk_rumpun tetap NULL (berlaku umum)', async () => {
  // Data konten asli belum punya medan rumpun. Benih ulang (idempoten, isi
  // sama persis) harus tetap menyimpan NULL untuk semuanya.
  await benihChecklist();
  // Folder yang sama dengan yang dibaca benih (LOKASI_DATA_KONTEN / bawaan).
  const asli = JSON.parse(fs.readFileSync(path.join(DIR_DATA, 'checklist.json'), 'utf8'));
  const ids = asli.kategori.flatMap((k) => k.butir.map((b) => b.id));
  assert.ok(ids.length > 0);
  const rumpun = await rumpunDiDb(ids);
  assert.equal(Object.keys(rumpun).length, ids.length);
  for (const id of ids) assert.equal(rumpun[id], null, `${id} harus berlaku umum`);
});

test('benih: berlaku_untuk_rumpun dari berkas masuk ke kolom, satu atau beberapa rumpun', async () => {
  await benihChecklist(CONTOH);
  assert.deepEqual(await rumpunDiDb(ID_CONTOH), {
    'contoh-rumpun-kesehatan': 'Kesehatan',
    'contoh-rumpun-kes-soshum': 'Kesehatan,Sosial & Humaniora',
  });

  // Idempoten: benih ulang tidak menggandakan atau mengubah apa pun.
  await benihChecklist(CONTOH);
  const [[{ n }]] = await pool.query(
    'SELECT COUNT(*) n FROM butir_daftar_periksa WHERE id IN (?)',
    [ID_CONTOH]
  );
  assert.equal(n, ID_CONTOH.length);
});

test('benih: butir hasil benih tersaring rumpun di GET /konten/checklist', async () => {
  await benihChecklist(CONTOH);
  const ambilId = async (q) => {
    const res = await fetch(`${baseUrl}/api/v1/konten/checklist${q}`);
    const json = await res.json();
    return json.data.kategori.flatMap((k) => k.butir.map((b) => b.id));
  };

  const soshum = await ambilId(`?rumpun=${encodeURIComponent('Sosial & Humaniora')}`);
  assert.ok(soshum.includes('contoh-rumpun-kes-soshum'));
  assert.ok(!soshum.includes('contoh-rumpun-kesehatan'), 'butir rumpun lain tidak boleh ikut');

  const tanpaRumpun = await ambilId('');
  for (const id of ID_CONTOH) assert.ok(!tanpaRumpun.includes(id), `${id} bocor tanpa rumpun`);
});

test('benih: nama rumpun tidak dikenal ditolak dan tidak ada yang ditulis', async () => {
  await assert.rejects(
    benihChecklist(berkasTypo(['Teknologi dan Rekayasa'])),
    /rumpun "Teknologi dan Rekayasa" tidak dikenal/
  );
  await assert.rejects(benihChecklist(berkasTypo('Kesehatan')), /harus array/);
  assert.deepEqual(await rumpunDiDb([ID_TYPO]), {});
});
