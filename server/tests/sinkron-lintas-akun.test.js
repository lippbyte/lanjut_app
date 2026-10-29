// Audit POST /sinkron/klaim (LANJUT_042 bagian B) — tes lintas akun eksplisit,
// pola butir-pribadi / kartu-arsip / latihan.test.js.
//
// Klaim memakai penolakan PER BARIS (§6.3: "gagal sebagian, bisa dicoba
// lagi"), bukan menggagalkan seluruh permintaan. Aturan yang diuji:
//   - riwayat/kartu yang id-nya milik akun lain → ditolak TIDAK_BERHAK, baris
//     akun lain tidak berubah (sudah benar sebelum LANJUT_042);
//   - sesi_id / kartu_id yang BUKAN milik pengklaim (milik akun lain, kurasi
//     belum terverifikasi, atau tidak ada) → tautannya dilepas (NULL), jawaban
//     tetap tersimpan, dihitung di `tautan_dilepas`. Klaim tidak membawa sesi,
//     jadi sesi tamu memang tidak pernah ada di server; perlakuan yang sama
//     untuk "milik akun lain" dan "tidak ada" tidak membocorkan keberadaan id;
//   - mapel_id / butir_id tak dikenal → baris ditolak VALIDASI_GAGAL (dulu
//     pelanggaran FK → 500 setelah sebagian baris tertulis);
//   - kartu diproses sebelum peristiwa, jadi catatan boleh merujuk kartu yang
//     diklaim di permintaan yang sama.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { acak, nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');

let server;
let baseUrl;
let kurasiBelumTerverifikasi;
let butirUmum;

const id = () => crypto.randomUUID();
const kini = () => new Date().toISOString();

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const [k] = await pool.execute("SELECT id FROM kartu WHERE sumber = 'resmi' AND status_verifikasi <> 'terverifikasi' LIMIT 1");
  assert.ok(k.length, 'butuh kartu kurasi belum terverifikasi dari benih (npm run benih)');
  kurasiBelumTerverifikasi = k[0].id;
  const [b] = await pool.execute('SELECT id FROM butir_daftar_periksa LIMIT 1');
  butirUmum = b[0].id;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

async function panggil(metode, path, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method: metode,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

async function akunBaru() {
  const { status, json } = await daftarPenggunaBaru(baseUrl);
  assert.equal(status, 201);
  return { token: json.data.token, id: json.data.pengguna.id };
}

const klaim = (token, body) => panggil('POST', '/sinkron/klaim', token, body);
const catatan = (o) => ({ id: id(), benar: true, waktu: kini(), ...o });

async function barisRiwayat(riwayatId) {
  const [b] = await pool.execute(
    'SELECT pengguna_id, sesi_id, kartu_id, mapel_id, benar, keyakinan, kelas_gap, aturan_versi FROM riwayat_latihan WHERE id = ?',
    [riwayatId]
  );
  return b[0];
}

/** Akun A dengan satu kartu pribadi, satu sesi, dan satu jawaban di sesi itu. */
async function akunADenganData() {
  const a = await akunBaru();
  const kartu = (await panggil('POST', '/kartu', a.token, { mapel_id: 'fisika', judul: 'Rahasia A', isi: 'Isi A' })).json.data.id;
  const sesi = id();
  assert.equal((await panggil('POST', '/sesi-latihan', a.token, {
    id: sesi, dimulai_pada: kini(), mapel_fokus_id: 'fisika', asal_mula: 'arsip', jumlah_kartu_direncanakan: 1,
  })).status, 201);
  const riwayat = catatan({ sesi_id: sesi, kartu_id: kartu, benar: true });
  assert.equal((await panggil('POST', '/riwayat-latihan', a.token, [riwayat])).status, 201);
  return { ...a, kartu, sesi, riwayat: riwayat.id };
}

const sesiA = async (a) => (await panggil('GET', '/sesi-latihan', a.token)).json.data.find((s) => s.id === a.sesi);

test('LINTAS AKUN: B tidak bisa menautkan riwayatnya ke sesi atau kartu pribadi milik A', async () => {
  const a = await akunADenganData();
  const b = await akunBaru();
  const nyusup = catatan({ sesi_id: a.sesi, kartu_id: a.kartu, mapel_id: 'kimia', benar: false });

  const res = await klaim(b.token, { peristiwa: [nyusup] });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.equal(res.json.data.peristiwa.diterima, 1);
  assert.equal(res.json.data.peristiwa.tautan_dilepas, 1);

  const baris = await barisRiwayat(nyusup.id);
  assert.equal(baris.pengguna_id, b.id);
  assert.equal(baris.sesi_id, null, 'riwayat B tertaut ke sesi A');
  assert.equal(baris.kartu_id, null, 'riwayat B tertaut ke kartu A');
  assert.equal(baris.mapel_id, 'kimia', 'tanpa kartu yang sah, mapel kiriman (dikenal) dipakai');

  const s = await sesiA(a);
  assert.equal(s.jumlah_dijawab, 1, 'hitungan sesi A berubah');
});

test('LINTAS AKUN: id riwayat & id kartu milik A → TIDAK_BERHAK; data A utuh dan tidak terlihat oleh B', async () => {
  const a = await akunADenganData();
  const b = await akunBaru();
  const res = await klaim(b.token, {
    peristiwa: [catatan({ id: a.riwayat, benar: false })],
    kartu: [{ id: a.kartu, mapel_id: 'fisika', judul: 'Rebutan', isi: 'Rebutan' }],
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.data.peristiwa.ditolak, [{ id: a.riwayat, alasan: 'TIDAK_BERHAK' }]);
  assert.deepEqual(res.json.data.kartu.ditolak, [{ id: a.kartu, alasan: 'TIDAK_BERHAK' }]);

  const baris = await barisRiwayat(a.riwayat);
  assert.equal(baris.pengguna_id, a.id);
  assert.equal(baris.benar, 1, 'jawaban A tertimpa');
  const kartuB = (await panggil('GET', '/kartu', b.token)).json.data;
  assert.equal(kartuB.some((k) => k.id === a.kartu), false, 'kartu A muncul di akun B');
  const kartuA = (await panggil('GET', '/kartu?sumber=pengguna', a.token)).json.data.find((k) => k.id === a.kartu);
  assert.equal(kartuA.judul, 'Rahasia A');
});

test('LINTAS AKUN: kemajuan klaim B hanya mengenai akun B', async () => {
  const a = await akunBaru();
  const b = await akunBaru();
  const res = await klaim(b.token, { kemajuan: [{ butir_id: butirUmum, selesai_pada: kini() }] });
  assert.equal(res.status, 200);
  const kemajuanA = (await panggil('GET', '/kemajuan', a.token)).json.data;
  assert.deepEqual(kemajuanA, []);
  const kemajuanB = (await panggil('GET', '/kemajuan', b.token)).json.data;
  assert.equal(kemajuanB.some((k) => k.butir_id === butirUmum && k.selesai_pada), true);
});

test('kartu kurasi: id kurasi tidak bisa diklaim; kurasi belum terverifikasi tidak bisa jadi rujukan riwayat', async () => {
  const b = await akunBaru();
  const res = await klaim(b.token, {
    kartu: [{ id: kurasiBelumTerverifikasi, mapel_id: 'matematika', judul: 'x', isi: 'x' }],
    peristiwa: [catatan({ kartu_id: kurasiBelumTerverifikasi })],
  });
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.data.kartu.ditolak, [{ id: kurasiBelumTerverifikasi, alasan: 'TIDAK_BERHAK' }]);
  assert.equal(res.json.data.peristiwa.tautan_dilepas, 1);
});

test('rujukan tak dikenal: bukan 500 — tautan sesi/kartu dilepas, mapel/butir tak dikenal ditolak per baris', async () => {
  const b = await akunBaru();
  const sah = catatan({ mapel_id: 'biologi' });
  const sesiTamu = catatan({ sesi_id: id(), mapel_id: 'biologi' });
  const kartuTamu = catatan({ kartu_id: `kartu-tamu-${acak()}`, mapel_id: 'biologi' });
  const mapelAneh = catatan({ mapel_id: 'astrologi' });
  const res = await klaim(b.token, {
    kemajuan: [
      { butir_id: butirUmum, selesai_pada: kini() },
      { butir_id: 'butir-tidak-ada', selesai_pada: kini() },
    ],
    peristiwa: [sah, sesiTamu, kartuTamu, mapelAneh],
  });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.deepEqual(res.json.data.kemajuan, { diterima: 1, ditolak: [{ butir_id: 'butir-tidak-ada', alasan: 'VALIDASI_GAGAL' }] });
  assert.equal(res.json.data.peristiwa.diterima, 3);
  assert.equal(res.json.data.peristiwa.tautan_dilepas, 2);
  assert.deepEqual(res.json.data.peristiwa.ditolak, [{ id: mapelAneh.id, alasan: 'VALIDASI_GAGAL' }]);
  assert.equal((await barisRiwayat(sesiTamu.id)).sesi_id, null);
  assert.equal((await barisRiwayat(kartuTamu.id)).kartu_id, null);
  assert.equal(await barisRiwayat(mapelAneh.id), undefined, 'baris ditolak tetap tertulis');
});

test('kartu yang diklaim di permintaan yang sama boleh dirujuk catatan; mapel diambil dari kartunya; idempoten', async () => {
  const b = await akunBaru();
  const kartuId = `kartu-tamu-${acak()}`;
  const c = catatan({ kartu_id: kartuId, mapel_id: 'kimia', keyakinan: 5, benar: false });
  const body = {
    peristiwa: [c],
    kartu: [{ id: kartuId, mapel_id: 'fisika', judul: 'Kartu tamu', isi: 'Isi tamu' }],
  };
  const res = await klaim(b.token, body);
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.equal(res.json.data.kartu.diterima, 1);
  assert.equal(res.json.data.peristiwa.tautan_dilepas, 0);

  const baris = await barisRiwayat(c.id);
  assert.equal(baris.kartu_id, kartuId);
  assert.equal(baris.mapel_id, 'fisika', 'mapel dari kartu, bukan kiriman');
  assert.equal(baris.kelas_gap, 'overconfident', 'keyakinan dinilai server');
  assert.equal(baris.aturan_versi, 1);

  const ulang = await klaim(b.token, body);
  assert.equal(ulang.status, 200);
  const [[n]] = await pool.query('SELECT COUNT(*) AS n FROM riwayat_latihan WHERE pengguna_id = ?', [b.id]);
  assert.equal(Number(n.n), 1, 'klaim ulang menggandakan');
});
