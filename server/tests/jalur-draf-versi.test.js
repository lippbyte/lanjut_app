// LANJUT_026 seri v2: (1) pilihan jalur yang jalurnya kembali draf tetap milik siswa, tampil netral,
// dan bisa dijeda, tanpa nama, id, atau teks draf yang terkirim (K37); (2) riwayat versi tujuan dan
// profil eksplorasi bernomor, menurut rantai versi, bukan menurut waktu.
// Saklar dinyalakan di sini saja, dan env dibaca saat modul dimuat, jadi harus diset sebelum require.

process.env.JALUR_TUJUAN_AKTIF = '1';
process.env.DISCOVER_AKTIF = '1';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool, kunciKonfigurasiGlobal } = require('./bantuan');
const tujuanRepo = require('../src/modul/tujuan/tujuan.repo');
const profilRepo = require('../src/modul/discover/profil-eksplorasi.repo');
const { susunIsiProfil } = require('../src/modul/discover/discover.layanan');
const { kunciJalurAktif, jalurUjiDisetujui } = require('./kunci-jalur-aktif');

const SANDI = 'sandiujiaman1';
const WAKTU = '2026-11-17 08:00:00';
const UJI = jalurUjiDisetujui(pool, 'jd');
const NAMA_DRAF = 'Nama Draf Rahasia Jd';
const TEKS_DRAF = 'Deskripsi draf rahasia yang tidak boleh terkirim.';
let server;
let baseUrl;
let versiKebijakan;
let lepasKunci;
let lepasKunciJalur;

async function panggil(metode, jalur, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${jalur}`, {
    method: metode,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function akun() {
  const { json } = await daftarPenggunaBaru(baseUrl, { versi_kebijakan: versiKebijakan });
  return { id: json.data.pengguna.id, token: json.data.token };
}

before(async () => {
  lepasKunci = await kunciKonfigurasiGlobal();
  lepasKunciJalur = await kunciJalurAktif(pool);
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const [[baris]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'persetujuan_versi_kebijakan'");
  versiKebijakan = Number(baris.nilai);
  // Sisa run yang gagal di tengah jalan (id versi di bawah tetap).
  await pool.query('DELETE FROM tujuan WHERE id IN (?)', [ID_VERSI]);
  await pool.query('DELETE FROM profil_eksplorasi WHERE id IN (?)', [ID_VERSI]);
  await UJI.siapkan();
});

after(async () => {
  await new Promise((r) => server.close(r));
  try {
    await UJI.hapus();
  } finally {
    if (lepasKunciJalur) await lepasKunciJalur();
  }
  if (lepasKunci) await lepasKunci();
  await pool.end();
});

/** Tidak ada nama, id, atau deskripsi jalur draf di dalam respons. */
function tanpaJejakDraf(json, idDraf, pesan) {
  const teks = JSON.stringify(json);
  for (const x of [idDraf, NAMA_DRAF, TEKS_DRAF]) assert.ok(!teks.includes(x), `${pesan}: "${x}" terkirim`);
}

test('Jalur yang kembali draf: pilihan tetap ada dengan tanda netral, bisa dijeda, dan tidak membocorkan nama, id, atau teks draf', async () => {
  const a = await akun();
  const b = await akun();
  const idDraf = UJI.id.melanjutkan;
  const idTetap = UJI.id.bekerja;
  const pDraf = (await panggil('POST', '/jalur-minat/saya', a.token, { jalur_minat_id: idDraf })).json.data;
  const pTetap = (await panggil('POST', '/jalur-minat/saya', a.token, { jalur_minat_id: idTetap })).json.data;
  assert.equal(pDraf.jalur_minat_id, idDraf, 'selagi disetujui, id jalur terkirim seperti biasa');
  assert.equal(pDraf.jalur_belum_tersedia, false);

  // Jalur itu kembali draf, dengan nama dan teks draf yang khas.
  await pool.query("UPDATE jalur_minat SET status_teks = 'draf', nama = ?, deskripsi_singkat = ? WHERE id = ?", [NAMA_DRAF, TEKS_DRAF, idDraf]);

  const daftar = await panggil('GET', '/jalur-minat/saya', a.token);
  assert.equal(daftar.status, 200);
  tanpaJejakDraf(daftar.json, idDraf, 'GET /jalur-minat/saya');
  const draf = daftar.json.data.find((p) => p.id === pDraf.id);
  const tetap = daftar.json.data.find((p) => p.id === pTetap.id);
  assert.deepEqual(
    { jalur_minat_id: draf.jalur_minat_id, jalur_belum_tersedia: draf.jalur_belum_tersedia, status: draf.status },
    { jalur_minat_id: null, jalur_belum_tersedia: true, status: 'aktif' },
    'pilihan milik siswa tetap ada, hanya dengan tanda netral dan status'
  );
  assert.deepEqual({ id: tetap.jalur_minat_id, tanda: tetap.jalur_belum_tersedia }, { id: idTetap, tanda: false }, 'jalur yang masih disetujui tidak ikut disamarkan');
  tanpaJejakDraf((await panggil('GET', '/jalur-minat', a.token)).json, idDraf, 'GET /jalur-minat');

  const jalan = await panggil('GET', '/tujuan/perjalanan', a.token);
  tanpaJejakDraf(jalan.json, idDraf, 'GET /tujuan/perjalanan');
  const dipilih = jalan.json.data.find((p) => p.pilihan_id === pDraf.id);
  assert.deepEqual({ jenis: dipilih.jenis, id: dipilih.jalur_minat_id, tanda: dipilih.jalur_belum_tersedia }, { jenis: 'jalur_dipilih', id: null, tanda: true });

  // K37 tetap utuh: jalur draf tidak bisa dipilih lagi, jawabannya sama dengan jalur yang tidak ada.
  for (const id of [idDraf, 'jalur-yang-tidak-pernah-ada']) {
    const pilih = await panggil('POST', '/jalur-minat/saya', b.token, { jalur_minat_id: id });
    assert.equal(pilih.status, 400, id);
    assert.deepEqual([pilih.json.galat.kode, pilih.json.galat.pesan], ['JALUR_BELUM_TERSEDIA', 'Jalur belum tersedia.'], id);
  }

  // Siswa lain tidak bisa melihat atau menjeda pilihan itu.
  const lihatB = await panggil('GET', '/jalur-minat/saya', b.token);
  assert.ok(!JSON.stringify(lihatB.json).includes(pDraf.id), 'B melihat pilihan A');
  const jedaB = await panggil('PATCH', `/jalur-minat/saya/${pDraf.id}`, b.token, { status: 'dijeda' });
  assert.equal(jedaB.status, 404);
  assert.equal((await pool.query('SELECT status FROM pengguna_jalur_minat WHERE id = ?', [pDraf.id]))[0][0].status, 'aktif', 'B mengubah pilihan A');

  // Pemiliknya bisa menjeda.
  const jeda = await panggil('PATCH', `/jalur-minat/saya/${pDraf.id}`, a.token, { status: 'dijeda' });
  assert.equal(jeda.status, 200, JSON.stringify(jeda.json));
  tanpaJejakDraf(jeda.json, idDraf, 'PATCH jeda');
  assert.deepEqual({ status: jeda.json.data.status, id: jeda.json.data.jalur_minat_id, tanda: jeda.json.data.jalur_belum_tersedia }, { status: 'dijeda', id: null, tanda: true });
  const sesudah = await panggil('GET', '/tujuan/perjalanan', a.token);
  tanpaJejakDraf(sesudah.json, idDraf, 'perjalanan sesudah jeda');
  assert.ok(sesudah.json.data.some((p) => p.pilihan_id === pDraf.id && p.jenis === 'jalur_dijeda' && p.jalur_belum_tersedia === true));

  // Ekspor memuat pilihan itu apa adanya (salinan data milik siswa); hapus akun menghapusnya.
  const ekspor = await panggil('GET', '/pengguna/saya/ekspor', a.token);
  assert.equal(ekspor.status, 200);
  const baris = ekspor.json.data.pengguna_jalur_minat.find((r) => r.id === pDraf.id);
  assert.ok(baris, 'ekspor tidak memuat pilihan jalur draf');
  assert.equal(baris.status, 'dijeda');
  const hapus = await panggil('DELETE', '/pengguna/saya', a.token, { penegasan: 'HAPUS AKUN SAYA', kata_sandi: SANDI });
  assert.equal(hapus.status, 200, JSON.stringify(hapus.json));
  assert.equal((await pool.query('SELECT COUNT(*) AS n FROM pengguna_jalur_minat WHERE pengguna_id = ?', [a.id]))[0][0].n, 0);
});

// Id dipilih supaya urutan id berlawanan dengan urutan versi: mengurutkan menurut waktu lalu id
// (atau menurut id saja) memberi urutan yang salah.
const ID_VERSI = ['cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'];

test('Riwayat tujuan bernomor menurut rantai versi: tiga versi pada detik yang sama tetap 1, 2, 3, stabil, dan versi lama utuh', async () => {
  const a = await akun();
  const judul = ['Tujuan versi satu', 'Tujuan versi dua', 'Tujuan versi tiga'];
  await tujuanRepo.buat({ id: ID_VERSI[0], penggunaId: a.id, judul: judul[0], waktu: WAKTU });
  for (let i = 1; i < 3; i += 1) {
    const hasil = await tujuanRepo.buatVersiMilikSendiri(a.id, ID_VERSI[i - 1], { id: ID_VERSI[i], judul: judul[i], uraian: null, targetPada: null, jalurMinatId: null, waktu: WAKTU });
    assert.equal(hasil, 'ok');
  }
  const r1 = await panggil('GET', `/tujuan/${ID_VERSI[2]}/riwayat`, a.token);
  assert.equal(r1.status, 200);
  assert.deepEqual(r1.json.data.map((t) => [t.versi_ke, t.id, t.judul]), [1, 2, 3].map((n) => [n, ID_VERSI[n - 1], judul[n - 1]]));
  assert.equal(new Set(r1.json.data.map((t) => t.dibuat_pada)).size, 1, 'ketiga versi memang dibuat pada detik yang sama');
  // Nomor sama dari versi mana pun riwayat dibuka, dan dari panggilan ke panggilan.
  for (const id of ID_VERSI) assert.deepEqual((await panggil('GET', `/tujuan/${id}/riwayat`, a.token)).json.data, r1.json.data, id);
  const [lama] = await pool.query('SELECT id, judul, status FROM tujuan WHERE pengguna_id = ? ORDER BY judul', [a.id]);
  assert.deepEqual(lama.map((t) => [t.id, t.judul, t.status]).sort(), [
    [ID_VERSI[0], judul[0], 'diubah'],
    [ID_VERSI[1], judul[1], 'diubah'],
    [ID_VERSI[2], judul[2], 'aktif'],
  ].sort(), 'versi lama tidak ditimpa');
  await pool.query('DELETE FROM pengguna WHERE id = ?', [a.id]);
});

test('Riwayat profil eksplorasi bernomor menurut rantai versi, dan profil terkini membawa nomornya', async () => {
  const a = await akun();
  const isi = susunIsiProfil({ refleksi: [], minatRumpun: [], mapelPilihan: [], jalurAktif: [], tujuanAktif: [] });
  const catatan = ['Catatan versi satu', 'Catatan versi dua', 'Catatan versi tiga'];
  for (let i = 0; i < 3; i += 1) {
    const hasil = await profilRepo.buatVersiMilikSendiri(a.id, { id: ID_VERSI[i], indukId: i ? ID_VERSI[i - 1] : null, isi, catatan: catatan[i], waktu: WAKTU });
    assert.equal(hasil, 'ok');
  }
  const riwayat = await panggil('GET', '/discover/profil/riwayat', a.token);
  assert.equal(riwayat.status, 200);
  assert.deepEqual(riwayat.json.data.map((v) => [v.versi_ke, v.id, v.catatan, v.status]), [
    [1, ID_VERSI[0], catatan[0], 'diubah'],
    [2, ID_VERSI[1], catatan[1], 'diubah'],
    [3, ID_VERSI[2], catatan[2], 'aktif'],
  ]);
  assert.deepEqual((await panggil('GET', '/discover/profil/riwayat', a.token)).json.data, riwayat.json.data, 'stabil antarpanggilan');
  const terkini = (await panggil('GET', '/discover/profil', a.token)).json.data;
  assert.deepEqual([terkini.profil.versi_ke, terkini.profil.id, terkini.jumlah_versi], [3, ID_VERSI[2], 3]);

  // Versi baru lewat API menjadi ke-4; versi lama tidak berubah.
  const baru = await panggil('POST', '/discover/profil', a.token, { catatan: 'Catatan versi empat' });
  assert.equal(baru.status, 201, JSON.stringify(baru.json));
  assert.equal(baru.json.data.versi_ke, 4);
  const [lama] = await pool.query('SELECT id, catatan FROM profil_eksplorasi WHERE pengguna_id = ? AND id IN (?)', [a.id, ID_VERSI]);
  assert.deepEqual(lama.map((v) => [v.id, v.catatan]).sort(), ID_VERSI.map((id, i) => [id, catatan[i]]).sort(), 'versi lama tidak ditimpa');
  await pool.query('DELETE FROM pengguna WHERE id = ?', [a.id]);
});
