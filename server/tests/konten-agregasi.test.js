// Uji `GET /konten/mapel/agregasi-lintas-prodi` (F3, jalur "belum tahu
// prodi") — docs/prd-sdd-lanjut.md §13, §6 F3.
//
// Regresi wajib: hasil endpoint baru (satu query SQL, JOIN prodi_mapel +
// GROUP BY mapel_id — konten.repo.js `ambilAgregasiMapelLintasProdi`) harus
// IDENTIK dengan hasil agregasi client-side lama, yang dulu dihitung dengan
// memanggil `/konten/prodi/:id/mapel` untuk SETIAP prodi lalu menjumlahkan
// lewat LANJUT_App/lib/pilihMapel.ts `agregasiMapelLintasProdi` (fungsi itu
// masih ada, dipertahankan sebagai fallback/util tes — direplikasi di sini
// karena file itu TypeScript/ESM dan test ini CommonJS).
//
// Dua lapis dibandingkan:
//  1. Skala kecil (3 prodi fixture lintas rumpun: teknik-informatika,
//     keperawatan, akuntansi) — cocok untuk uji regresi manual/tercatat.
//  2. Skala penuh (SEMUA prodi) — ini yang benar-benar dipanggil produksi
//     (PilihMapelScreen "belum tahu prodi" selalu mengirim seluruh id prodi,
//     lihat components/screens/PilihMapelScreen.tsx `HasilBelumTahu`).

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, pool } = require('./bantuan');

let server;
let baseUrl;

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

async function ambil(path) {
  const res = await fetch(`${baseUrl}/api/v1${path}`);
  const json = await res.json();
  assert.equal(res.status, 200, `GET ${path} gagal: ${JSON.stringify(json)}`);
  assert.equal(json.ok, true);
  return json.data;
}

// Replikasi PERSIS LANJUT_App/lib/pilihMapel.ts `agregasiMapelLintasProdi` —
// logika lama yang dihitung di klien, sebelum dipindah ke backend.
function agregasiLamaAlaKlien(semuaMapelPerProdi) {
  const map = new Map();
  for (const daftarMapel of semuaMapelPerProdi) {
    for (const m of daftarMapel) {
      const ada = map.get(m.id);
      if (ada) {
        ada.jumlah_prodi += 1;
      } else {
        map.set(m.id, { id: m.id, nama: m.nama, tersedia_di_smk: m.tersedia_di_smk, jumlah_prodi: 1 });
      }
    }
  }
  return Array.from(map.values()).sort((a, b) => b.jumlah_prodi - a.jumlah_prodi);
}

function urutkanUntukBanding(daftar) {
  // Endpoint baru mengurutkan `jumlah_prodi DESC, nama ASC`; agregasi lama
  // hanya `jumlahProdi DESC` (urutan dalam grup sama tidak dijamin). Supaya
  // pembandingan deterministik, urutkan ulang KEDUA sisi dengan kunci yang
  // sama sebelum dibandingkan sebagai himpunan, bukan sebagai array berurutan.
  return daftar
    .map((b) => ({ id: b.id, nama: b.nama, tersedia_di_smk: b.tersedia_di_smk, jumlah_prodi: b.jumlah_prodi }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

test('agregasi-lintas-prodi: identik dengan agregasi client-side lama untuk 3 prodi fixture', async () => {
  const fixtureProdiIds = ['teknik-informatika', 'keperawatan', 'akuntansi'];

  const semuaMapelPerProdi = await Promise.all(
    fixtureProdiIds.map((id) => ambil(`/konten/prodi/${id}/mapel`))
  );
  const lamaScoped = agregasiLamaAlaKlien(semuaMapelPerProdi);

  // Endpoint baru itu sendiri global (semua prodi) — untuk membandingkan
  // dengan agregasi lama yang DIBATASI ke 3 prodi fixture, jalankan query
  // yang sama tapi dibatasi ke 3 prodi itu langsung lewat pool (bukan lewat
  // endpoint produksi, yang memang tidak menerima filter prodi).
  const [baruScopedBaris] = await pool.query(
    `SELECT m.id, m.nama, m.tersedia_di_smk, COUNT(DISTINCT pm.prodi_id) AS jumlah_prodi
       FROM mapel m
       JOIN prodi_mapel pm ON pm.mapel_id = m.id
      WHERE pm.prodi_id IN (?, ?, ?)
      GROUP BY m.id, m.nama, m.tersedia_di_smk`,
    fixtureProdiIds
  );
  const baruScoped = baruScopedBaris.map((b) => ({
    id: b.id,
    nama: b.nama,
    tersedia_di_smk: !!b.tersedia_di_smk,
    jumlah_prodi: Number(b.jumlah_prodi),
  }));

  assert.deepEqual(urutkanUntukBanding(baruScoped), urutkanUntukBanding(lamaScoped));
});

test('agregasi-lintas-prodi: endpoint produksi identik dengan agregasi client-side lama untuk SEMUA prodi', async () => {
  // Ini skenario nyata: PilihMapelScreen "belum tahu prodi" selalu memanggil
  // dengan SELURUH id prodi (lihat HasilBelumTahu di PilihMapelScreen.tsx).
  const daftarProdi = await ambil('/konten/prodi');
  const semuaMapelPerProdi = await Promise.all(
    daftarProdi.map((p) => ambil(`/konten/prodi/${p.id}/mapel`))
  );
  const lama = agregasiLamaAlaKlien(semuaMapelPerProdi);

  const baru = await ambil('/konten/mapel/agregasi-lintas-prodi');

  assert.deepEqual(urutkanUntukBanding(baru), urutkanUntukBanding(lama));
});

test('agregasi-lintas-prodi: bentuk respons sesuai kontrak (id, nama, tersedia_di_smk, jumlah_prodi)', async () => {
  const baris = await ambil('/konten/mapel/agregasi-lintas-prodi');
  assert.ok(baris.length > 0);
  for (const b of baris) {
    assert.equal(typeof b.id, 'string');
    assert.equal(typeof b.nama, 'string');
    assert.equal(typeof b.tersedia_di_smk, 'boolean');
    assert.equal(typeof b.jumlah_prodi, 'number');
    assert.ok(b.jumlah_prodi >= 1);
  }
  // Terurut jumlah_prodi DESC (kontrak endpoint, bukan urutan acak).
  for (let i = 1; i < baris.length; i += 1) {
    assert.ok(baris[i - 1].jumlah_prodi >= baris[i].jumlah_prodi);
  }
});
