// LANJUT_023 seri v2: rute Jalur & Tujuan Saya dengan saklar menyala.
// Isolasi antarsiswa, riwayat jalur, versi tujuan, perjalanan, ekspor, dan hapus akun.
// Saklar dinyalakan di sini saja, dan env dibaca saat modul dimuat, jadi harus diset sebelum require.

process.env.JALUR_TUJUAN_AKTIF = '1';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool, kunciKonfigurasiGlobal } = require('./bantuan');
const { buatUuid } = require('../src/util/id');
const { benihJalurMinat } = require('../src/db/benih/benih');
const butirRepo = require('../src/modul/butir-bukti/butir-bukti.repo');
const { kunciJalurAktif, jalurUjiDisetujui } = require('./kunci-jalur-aktif');

const SANDI = 'sandiujiaman1';
const WAKTU = '2026-11-13 08:00:00';
let server;
let baseUrl;
let versiKebijakan;
let lepasKunci;
let lepasKunciJalur;

// K37: memilih jalur dan menautkan tujuan atau bukti ke jalur hanya boleh ke jalur aktif yang
// disetujui. Teks jalur di data konten masih draf, jadi tes memakai tiga jalur uji sementara
// berstatus disetujui, dipasang saat pertama dibutuhkan (sesudah tes daftar kosong K37) dan
// dihapus di after(). Nama logis (melanjutkan, bekerja, wirausaha) dipetakan ke id jalur uji.
const UJI = jalurUjiDisetujui(pool, 'jt');
const JALUR_UJI = UJI.id;
const JALUR_UJI_MATI = UJI.idMati;
const siapkanJalurUji = () => UJI.siapkan();

async function panggil(metode, jalur, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${jalur}`, {
    method: metode,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function akun({ setuju = true } = {}) {
  const { json } = await daftarPenggunaBaru(baseUrl, setuju ? { versi_kebijakan: versiKebijakan } : {});
  return { id: json.data.pengguna.id, token: json.data.token };
}

async function pilihJalur(a, jalur) {
  await siapkanJalurUji();
  const res = await panggil('POST', '/jalur-minat/saya', a.token, { jalur_minat_id: UJI.peta(jalur) });
  assert.equal(res.status, 201, JSON.stringify(res.json));
  return res.json.data;
}

/** Nama logis jalur di badan dipetakan ke jalur uji yang disetujui. */
async function buatTujuan(a, badan) {
  if (badan.jalur_minat_id) await siapkanJalurUji();
  const res = await panggil('POST', '/tujuan', a.token, { ...badan, ...(badan.jalur_minat_id ? { jalur_minat_id: UJI.peta(badan.jalur_minat_id) } : {}) });
  assert.equal(res.status, 201, JSON.stringify(res.json));
  return res.json.data;
}

async function buatButir(a, judul = 'Bukti uji') {
  const id = buatUuid();
  assert.ok(await butirRepo.buat({ id, penggunaId: a.id, judul, jenis: 'karya', waktu: WAKTU }));
  return id;
}

const barisPilihan = async (id) => (await pool.query('SELECT * FROM pengguna_jalur_minat WHERE id = ?', [id]))[0][0];
const barisTujuan = async (id) => (await pool.query('SELECT * FROM tujuan WHERE id = ?', [id]))[0][0];

before(async () => {
  lepasKunci = await kunciKonfigurasiGlobal();
  lepasKunciJalur = await kunciJalurAktif(pool);
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  await benihJalurMinat();
  const [[baris]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'persetujuan_versi_kebijakan'");
  versiKebijakan = Number(baris.nilai);
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

// --- gerbang --------------------------------------------------------------------------

const ID = '11111111-1111-4111-8111-111111111111';
const SEMUA_RUTE = [
  ['GET', '/jalur-minat'],
  ['GET', '/jalur-minat/saya'],
  ['POST', '/jalur-minat/saya'],
  ['PATCH', `/jalur-minat/saya/${ID}`],
  ['GET', '/tujuan'],
  ['POST', '/tujuan'],
  ['GET', '/tujuan/perjalanan'],
  ['GET', `/tujuan/${ID}/riwayat`],
  ['POST', `/tujuan/${ID}/versi`],
  ['PATCH', `/tujuan/${ID}/status`],
  ['PATCH', `/tujuan/bukti/${ID}`],
];

test('Gerbang: 401 tanpa sesi, 403 bila kebijakan privasi belum diterima', async () => {
  const tanpaSetuju = await akun({ setuju: false });
  for (const [m, j] of SEMUA_RUTE) {
    assert.equal((await panggil(m, j)).status, 401, `${m} ${j}`);
    const res = await panggil(m, j, tanpaSetuju.token, m === 'GET' ? undefined : {});
    assert.equal(res.status, 403, `${m} ${j}`);
    assert.equal(res.json.galat.kode, 'AI_BELUM_DIIZINKAN');
  }
});

// --- jalur ----------------------------------------------------------------------------

// K37 (13 Nov 2026): daftar jalur hanya berisi jalur yang teksnya sudah disetujui.
test('K37: jalur draf tidak pernah terkirim; selama semua teks jalur masih draf, daftarnya kosong', async () => {
  const konten = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'data-konten', 'jalur-minat.json'), 'utf8'));
  assert.ok(konten.data.every((j) => j.status_teks === 'draf'), 'tes ini mengandaikan teks jalur di data konten masih draf');
  const [draf] = await pool.query("SELECT id, nama, deskripsi_singkat FROM jalur_minat WHERE status_teks <> 'disetujui'");
  assert.ok(draf.length >= 3);
  const a = await akun();
  const res = await panggil('GET', '/jalur-minat', a.token);
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.data, []);
  const teks = JSON.stringify(res.json);
  for (const j of draf) {
    assert.ok(!teks.includes(j.deskripsi_singkat), `deskripsi draf terkirim: ${j.id}`);
    assert.ok(!teks.includes(`"${j.id}"`), `id jalur draf terkirim: ${j.id}`);
  }
});

test('K37: jalur yang sudah disetujui terkirim, draf dan nonaktif tidak (SQL asli, dalam transaksi yang dibatalkan)', async () => {
  // Baris contoh hanya ada di dalam transaksi ini, jadi tidak pernah terlihat tes lain yang berjalan bersamaan.
  const jalurMinatRepo = require('../src/modul/jalur-minat/jalur-minat.repo');
  const akhiran = buatUuid().slice(0, 8);
  const koneksi = await pool.getConnection();
  try {
    await koneksi.beginTransaction();
    const sisip = (id, status, aktif) =>
      koneksi.query(
        "INSERT INTO jalur_minat (id, nama, deskripsi_singkat, status_teks, urutan, aktif, pemilik, asal) VALUES (?, ?, 'Teks uji K37.', ?, 0, ?, 'tim', 'uji')",
        [id, `Uji ${status}`, status, aktif]
      );
    await sisip(`uji-k37-setuju-${akhiran}`, 'disetujui', 1);
    await sisip(`uji-k37-mati-${akhiran}`, 'disetujui', 0);
    await sisip(`uji-k37-draf-${akhiran}`, 'draf', 1);
    const hasil = await jalurMinatRepo.daftarDisetujui(koneksi);
    assert.deepEqual(hasil.map((j) => j.id), [`uji-k37-setuju-${akhiran}`]);
    assert.ok(hasil.every((j) => j.status_teks === 'disetujui'));
  } finally {
    await koneksi.rollback();
    koneksi.release();
  }
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM jalur_minat WHERE id LIKE ?', [`uji-k37-%-${akhiran}`]);
  assert.equal(n, 0, 'baris contoh tidak boleh tertinggal');
});

test('Memilih dua jalur sekaligus, menjeda, lalu memilih lagi: riwayat tidak pernah hilang', async () => {
  const a = await akun();
  const lanjut = await pilihJalur(a, 'melanjutkan');
  const kerja = await pilihJalur(a, 'bekerja');
  assert.equal(lanjut.status, 'aktif');
  assert.equal(kerja.status, 'aktif');

  const ganda = await panggil('POST', '/jalur-minat/saya', a.token, { jalur_minat_id: JALUR_UJI.bekerja });
  assert.equal(ganda.status, 409);
  assert.equal(ganda.json.galat.kode, 'JALUR_SUDAH_DIPILIH');

  const jeda = await panggil('PATCH', `/jalur-minat/saya/${kerja.id}`, a.token, { status: 'dijeda' });
  assert.equal(jeda.status, 200);
  assert.equal(jeda.json.data.status, 'dijeda');
  assert.equal(jeda.json.data.berakhir_pada, null, 'berakhir_pada hanya untuk selesai dan ditinggalkan');
  const dijeda = await barisPilihan(kerja.id);

  const lagi = await pilihJalur(a, 'bekerja');
  assert.notEqual(lagi.id, kerja.id, 'memilih lagi membuat babak baru');

  const ubahLama = await panggil('PATCH', `/jalur-minat/saya/${kerja.id}`, a.token, { status: 'selesai' });
  assert.equal(ubahLama.status, 409);
  assert.equal(ubahLama.json.galat.kode, 'PILIHAN_SUDAH_BERAKHIR');
  assert.deepEqual(await barisPilihan(kerja.id), dijeda, 'babak yang berakhir tidak berubah');

  const selesai = await panggil('PATCH', `/jalur-minat/saya/${lanjut.id}`, a.token, { status: 'selesai' });
  assert.equal(selesai.json.data.status, 'selesai');
  assert.ok(selesai.json.data.berakhir_pada);

  const saya = (await panggil('GET', '/jalur-minat/saya', a.token)).json.data;
  assert.deepEqual(
    saya.map((p) => [p.jalur_minat_id, p.status]).sort(),
    [[JALUR_UJI.bekerja, 'aktif'], [JALUR_UJI.bekerja, 'dijeda'], [JALUR_UJI.melanjutkan, 'selesai']].sort()
  );
});

test('K37 lanjutan: jalur draf, nonaktif, atau tidak ada ditolak dengan jawaban yang sama, "Jalur belum tersedia"', async () => {
  await siapkanJalurUji();
  const a = await akun();
  const [[draf]] = await pool.query("SELECT id FROM jalur_minat WHERE id = 'melanjutkan' AND aktif = 1 AND status_teks = 'draf'");
  assert.ok(draf, 'jalur melanjutkan diharapkan masih draf di data konten');
  const jawaban = [];
  for (const id of ['melanjutkan', 'bekerja', 'wirausaha', JALUR_UJI_MATI, 'tidak-ada']) {
    const res = await panggil('POST', '/jalur-minat/saya', a.token, { jalur_minat_id: id });
    assert.equal(res.status, 400, id);
    assert.equal(res.json.galat.kode, 'JALUR_BELUM_TERSEDIA', id);
    assert.equal(res.json.galat.pesan, 'Jalur belum tersedia.', id);
    jawaban.push(JSON.stringify(res.json));
  }
  assert.equal(new Set(jawaban).size, 1, 'draf, nonaktif, dan tidak ada tidak boleh bisa dibedakan');
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM pengguna_jalur_minat WHERE pengguna_id = ?', [a.id]);
  assert.equal(n, 0, 'tidak ada babak yang tercatat untuk jalur yang ditolak');
  const ok = await panggil('POST', '/jalur-minat/saya', a.token, { jalur_minat_id: JALUR_UJI.wirausaha });
  assert.equal(ok.status, 201, 'jalur yang disetujui tetap bisa dipilih');
});

test('Jalur: status aktif tidak bisa dikirim lewat PATCH', async () => {
  const a = await akun();
  const p = await pilihJalur(a, 'wirausaha');
  const aktif = await panggil('PATCH', `/jalur-minat/saya/${p.id}`, a.token, { status: 'aktif' });
  assert.equal(aktif.status, 400);
  assert.equal((await panggil('PATCH', '/jalur-minat/saya/bukan-uuid', a.token, { status: 'dijeda' })).status, 404);
});

// --- tujuan ---------------------------------------------------------------------------

test('Memperbarui tujuan membuat versi baru; versi lama tetap ada dan isinya tidak berubah', async () => {
  const a = await akun();
  const v1 = await buatTujuan(a, { judul: 'Masuk prodi teknik', uraian: 'Mulai belajar fisika', target_pada: '2027-06-30', jalur_minat_id: 'melanjutkan' });
  const lamaSebelum = await barisTujuan(v1.id);

  const res = await panggil('POST', `/tujuan/${v1.id}/versi`, a.token, { judul: 'Masuk prodi teknik sipil' });
  assert.equal(res.status, 201);
  const v2 = res.json.data;
  assert.notEqual(v2.id, v1.id);
  assert.equal(v2.diubah_dari_id, v1.id);
  assert.equal(v2.status, 'aktif');
  assert.equal(v2.judul, 'Masuk prodi teknik sipil');
  assert.equal(v2.uraian, 'Mulai belajar fisika', 'medan yang tidak dikirim disalin');
  assert.equal(v2.target_pada, '2027-06-30');
  assert.equal(v2.jalur_minat_id, JALUR_UJI.melanjutkan);

  const lama = await barisTujuan(v1.id);
  assert.equal(lama.status, 'diubah');
  for (const k of ['judul', 'uraian', 'jalur_minat_id', 'diubah_dari_id', 'dibuat_pada']) {
    assert.deepEqual(lama[k], lamaSebelum[k], `versi lama ${k} tidak boleh berubah`);
  }

  const daftar = (await panggil('GET', '/tujuan', a.token)).json.data;
  assert.deepEqual(daftar.tujuan.map((t) => [t.id, t.jumlah_versi]), [[v2.id, 2]]);

  for (const id of [v1.id, v2.id]) {
    const riwayat = (await panggil('GET', `/tujuan/${id}/riwayat`, a.token)).json.data;
    assert.deepEqual(riwayat.map((t) => [t.id, t.status, t.judul]), [
      [v1.id, 'diubah', 'Masuk prodi teknik'],
      [v2.id, 'aktif', 'Masuk prodi teknik sipil'],
    ]);
  }

  const dariLama = await panggil('POST', `/tujuan/${v1.id}/versi`, a.token, { judul: 'Cabang dari versi lama' });
  assert.equal(dariLama.status, 409);
  assert.equal(dariLama.json.galat.kode, 'TUJUAN_BUKAN_TERKINI');

  const sama = await panggil('POST', `/tujuan/${v2.id}/versi`, a.token, { judul: 'Masuk prodi teknik sipil' });
  assert.equal(sama.status, 400, 'versi tanpa perubahan ditolak');

  const kosongkan = await panggil('POST', `/tujuan/${v2.id}/versi`, a.token, { uraian: null, jalur_minat_id: null });
  assert.equal(kosongkan.status, 201);
  assert.equal(kosongkan.json.data.uraian, null);
  assert.equal(kosongkan.json.data.jalur_minat_id, null);
  assert.equal((await panggil('GET', `/tujuan/${v1.id}/riwayat`, a.token)).json.data.length, 3);
});

test('Tujuan: tercapai dan ditinggalkan hanya untuk versi terkini, dan yang sudah berakhir tidak diperbarui', async () => {
  const a = await akun();
  const t = await buatTujuan(a, { judul: 'Ikut lomba desain' });
  const capai = await panggil('PATCH', `/tujuan/${t.id}/status`, a.token, { status: 'tercapai' });
  assert.equal(capai.status, 200);
  assert.equal(capai.json.data.status, 'tercapai');
  assert.equal((await panggil('PATCH', `/tujuan/${t.id}/status`, a.token, { status: 'ditinggalkan' })).status, 409);
  assert.equal((await panggil('POST', `/tujuan/${t.id}/versi`, a.token, { judul: 'Lain' })).status, 409);
  assert.equal((await panggil('PATCH', `/tujuan/${t.id}/status`, a.token, { status: 'diubah' })).status, 400);
});

test('Tujuan: medan dari klien yang tidak boleh diisi dibuang, dan isian dibatasi', async () => {
  const a = await akun();
  const b = await akun();
  const tb = await buatTujuan(b, { judul: 'Milik B' });
  const t = await buatTujuan(a, { judul: 'Tujuan A', status: 'tercapai', diubah_dari_id: tb.id, pengguna_id: b.id });
  assert.equal(t.status, 'aktif');
  assert.equal(t.diubah_dari_id, null);
  assert.equal((await barisTujuan(t.id)).pengguna_id, a.id);
  assert.equal((await panggil('POST', '/tujuan', a.token, { judul: '' })).status, 400);
  assert.equal((await panggil('POST', '/tujuan', a.token, { judul: 'x'.repeat(201) })).status, 400);
  assert.equal((await panggil('POST', '/tujuan', a.token, { judul: 'Tgl', target_pada: '2027-02-30' })).status, 400);
  assert.equal((await panggil('POST', '/tujuan', a.token, { judul: 'Jalur', jalur_minat_id: 'tidak-ada' })).status, 400);
});

test('Prodi impian dari Data Akun tampil sebagai salah satu tujuan, tanpa dipindah', async () => {
  const a = await akun();
  assert.equal((await panggil('GET', '/tujuan', a.token)).json.data.prodi_impian, null);
  const [[prodi]] = await pool.query('SELECT id, nama FROM prodi ORDER BY id LIMIT 1');
  assert.ok(prodi, 'tabel prodi kosong: jalankan benih');
  assert.equal((await panggil('PATCH', '/pengguna/saya', a.token, { prodi_impian: prodi.id })).status, 200);
  const data = (await panggil('GET', '/tujuan', a.token)).json.data;
  assert.deepEqual(data.prodi_impian, { prodi_id: prodi.id, nama: prodi.nama, sumber: 'data_akun' });
  assert.deepEqual(data.tujuan, [], 'tidak ada baris tujuan yang dibuat dari prodi impian');
  const [[p]] = await pool.query('SELECT prodi_tujuan FROM pengguna WHERE id = ?', [a.id]);
  assert.equal(p.prodi_tujuan, prodi.id);
  assert.equal((await panggil('GET', '/pengguna/saya', a.token)).json.data.prodi_impian, prodi.id);
});

test('Menautkan butir bukti ke jalur dan tujuan milik sendiri', async () => {
  const a = await akun();
  const t = await buatTujuan(a, { judul: 'Punya portofolio desain' });
  const butirId = await buatButir(a);
  await siapkanJalurUji();
  const res = await panggil('PATCH', `/tujuan/bukti/${butirId}`, a.token, { jalur_minat_id: JALUR_UJI.wirausaha, tujuan_id: t.id });
  assert.equal(res.status, 200, JSON.stringify(res.json));
  assert.deepEqual(res.json.data, { id: butirId, jalur_minat_id: JALUR_UJI.wirausaha, tujuan_id: t.id });
  const lepas = await panggil('PATCH', `/tujuan/bukti/${butirId}`, a.token, { tujuan_id: null });
  assert.deepEqual(lepas.json.data, { id: butirId, jalur_minat_id: JALUR_UJI.wirausaha, tujuan_id: null });
});

test('K37, penutupan celah: tujuan dan butir bukti hanya bisa ditautkan ke jalur yang disetujui', async () => {
  await siapkanJalurUji();
  const a = await akun();
  const t = await buatTujuan(a, { judul: 'Tujuan untuk ditautkan', jalur_minat_id: 'bekerja' });
  const butirId = await buatButir(a);
  const sebelum = { t: await barisTujuan(t.id), b: (await pool.query('SELECT jalur_minat_id, tujuan_id FROM butir_bukti WHERE id = ?', [butirId]))[0][0] };
  const [[{ jumlahTujuan }]] = await pool.query('SELECT COUNT(*) AS jumlahTujuan FROM tujuan WHERE pengguna_id = ?', [a.id]);

  const jawaban = [];
  for (const id of ['melanjutkan', 'bekerja', 'wirausaha', JALUR_UJI_MATI, 'tidak-ada']) {
    for (const [m, j, badan] of [
      ['POST', '/tujuan', { judul: 'Ke jalur draf', jalur_minat_id: id }],
      ['POST', `/tujuan/${t.id}/versi`, { jalur_minat_id: id }],
      ['PATCH', `/tujuan/bukti/${butirId}`, { jalur_minat_id: id }],
    ]) {
      const res = await panggil(m, j, a.token, badan);
      assert.equal(res.status, 400, `${m} ${j} ${id}`);
      assert.equal(res.json.galat.kode, 'JALUR_BELUM_TERSEDIA', `${m} ${j} ${id}`);
      assert.equal(res.json.galat.pesan, 'Jalur belum tersedia.', `${m} ${j} ${id}`);
      jawaban.push(JSON.stringify(res.json));
    }
  }
  assert.equal(new Set(jawaban).size, 1, 'draf, nonaktif, dan tidak ada dijawab sama persis di ketiga rute');

  assert.deepEqual(await barisTujuan(t.id), sebelum.t, 'tujuan tidak berubah');
  const [[{ jumlahSesudah }]] = await pool.query('SELECT COUNT(*) AS jumlahSesudah FROM tujuan WHERE pengguna_id = ?', [a.id]);
  assert.equal(jumlahSesudah, jumlahTujuan, 'tidak ada tujuan atau versi baru');
  const [[b]] = await pool.query('SELECT jalur_minat_id, tujuan_id FROM butir_bukti WHERE id = ?', [butirId]);
  assert.deepEqual({ ...b }, { ...sebelum.b }, 'butir tidak berubah');

  // Jalur yang disetujui dan null (melepas tautan) tetap boleh.
  assert.equal((await panggil('POST', `/tujuan/${t.id}/versi`, a.token, { jalur_minat_id: null })).status, 201);
  assert.equal((await panggil('PATCH', `/tujuan/bukti/${butirId}`, a.token, { jalur_minat_id: JALUR_UJI.melanjutkan })).status, 200);
  assert.equal((await panggil('PATCH', `/tujuan/bukti/${butirId}`, a.token, { jalur_minat_id: null })).status, 200);
});

// --- isolasi antarsiswa ------------------------------------------------------------------

test('Siswa A tidak bisa membaca atau mengubah jalur, tujuan, dan bukti siswa B', async () => {
  const a = await akun();
  const b = await akun();
  const pb = await pilihJalur(b, 'melanjutkan');
  const tb = await buatTujuan(b, { judul: 'Rahasia B', jalur_minat_id: 'melanjutkan' });
  const butirB = await buatButir(b, 'Bukti B');
  const butirA = await buatButir(a, 'Bukti A');
  const sebelum = { p: await barisPilihan(pb.id), t: await barisTujuan(tb.id) };

  const ubahJalur = await panggil('PATCH', `/jalur-minat/saya/${pb.id}`, a.token, { status: 'ditinggalkan' });
  assert.equal(ubahJalur.status, 404);
  assert.equal((await panggil('GET', `/tujuan/${tb.id}/riwayat`, a.token)).status, 404);
  assert.equal((await panggil('POST', `/tujuan/${tb.id}/versi`, a.token, { judul: 'Diambil A' })).status, 404);
  assert.equal((await panggil('PATCH', `/tujuan/${tb.id}/status`, a.token, { status: 'tercapai' })).status, 404);
  assert.equal((await panggil('PATCH', `/tujuan/bukti/${butirB}`, a.token, { jalur_minat_id: 'bekerja' })).status, 404);
  const keTujuanB = await panggil('PATCH', `/tujuan/bukti/${butirA}`, a.token, { tujuan_id: tb.id });
  assert.equal(keTujuanB.status, 400, 'bukti A tidak boleh menunjuk tujuan B');

  assert.deepEqual(await barisPilihan(pb.id), sebelum.p, 'pilihan B tidak berubah');
  assert.deepEqual(await barisTujuan(tb.id), sebelum.t, 'tujuan B tidak berubah');
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM tujuan WHERE diubah_dari_id = ?', [tb.id]);
  assert.equal(n, 0, 'tidak ada versi baru dari tujuan B');
  const [[bb]] = await pool.query('SELECT jalur_minat_id, tujuan_id FROM butir_bukti WHERE id = ?', [butirB]);
  assert.deepEqual({ ...bb }, { jalur_minat_id: null, tujuan_id: null });
  const [[ba]] = await pool.query('SELECT tujuan_id FROM butir_bukti WHERE id = ?', [butirA]);
  assert.equal(ba.tujuan_id, null);

  const teksA = JSON.stringify([
    (await panggil('GET', '/jalur-minat/saya', a.token)).json,
    (await panggil('GET', '/tujuan', a.token)).json,
    (await panggil('GET', '/tujuan/perjalanan', a.token)).json,
  ]);
  for (const rahasia of [pb.id, tb.id, 'Rahasia B', b.id]) assert.ok(!teksA.includes(rahasia), rahasia);
});

test('Repositori baru menolak data akun lain walau dipanggil langsung, tanpa lapisan layanan', async () => {
  const tujuanRepo = require('../src/modul/tujuan/tujuan.repo');
  const pilihanRepo = require('../src/modul/jalur-minat/pengguna-jalur-minat.repo');
  const a = await akun();
  const b = await akun();
  const pb = await pilihJalur(b, 'bekerja');
  const tb = await buatTujuan(b, { judul: 'Milik B' });
  const sebelum = { p: await barisPilihan(pb.id), t: await barisTujuan(tb.id) };

  const versi = await tujuanRepo.buatVersiMilikSendiri(a.id, tb.id, { id: buatUuid(), jalurMinatId: null, judul: 'Dari A', uraian: null, targetPada: null, waktu: WAKTU });
  assert.equal(versi, 'tidak_ada');
  assert.equal(await tujuanRepo.akhiriMilikSendiri(a.id, tb.id, 'tercapai', WAKTU), false);
  assert.equal(await pilihanRepo.akhiriAktifMilikSendiri(a.id, pb.id, 'ditinggalkan', WAKTU), false);

  assert.deepEqual(await barisPilihan(pb.id), sebelum.p);
  assert.deepEqual(await barisTujuan(tb.id), sebelum.t);
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM tujuan WHERE diubah_dari_id = ? OR (pengguna_id = ? AND judul = ?)', [tb.id, a.id, 'Dari A']);
  assert.equal(n, 0);
});

test('Repositori: versi lama tidak bisa dicabangkan walau dipanggil langsung, riwayat tetap satu garis', async () => {
  const tujuanRepo = require('../src/modul/tujuan/tujuan.repo');
  const a = await akun();
  const v1 = await buatTujuan(a, { judul: 'Versi satu' });
  const v2 = (await panggil('POST', `/tujuan/${v1.id}/versi`, a.token, { judul: 'Versi dua' })).json.data;
  const cabang = await tujuanRepo.buatVersiMilikSendiri(a.id, v1.id, { id: buatUuid(), jalurMinatId: null, judul: 'Cabang', uraian: null, targetPada: null, waktu: WAKTU });
  assert.equal(cabang, 'bukan_terkini');
  const [anak] = await pool.query('SELECT id FROM tujuan WHERE diubah_dari_id = ?', [v1.id]);
  assert.deepEqual(anak.map((r) => r.id), [v2.id]);
  assert.equal((await barisTujuan(v2.id)).status, 'aktif');
});

// --- perjalanan -------------------------------------------------------------------------

test('Perjalanan: babak jalur dan versi tujuan tersusun menurut waktu', async () => {
  const a = await akun();
  const p = await pilihJalur(a, 'bekerja');
  const t = await buatTujuan(a, { judul: 'Magang di bengkel', jalur_minat_id: 'bekerja' });
  await panggil('POST', `/tujuan/${t.id}/versi`, a.token, { judul: 'Magang di bengkel resmi' });
  await panggil('PATCH', `/jalur-minat/saya/${p.id}`, a.token, { status: 'dijeda' });
  const data = (await panggil('GET', '/tujuan/perjalanan', a.token)).json.data;
  const jenis = data.map((e) => e.jenis);
  for (const j of ['jalur_dipilih', 'tujuan_dibuat', 'tujuan_diperbarui', 'jalur_dijeda']) assert.ok(jenis.includes(j), j);
  const waktu = data.map((e) => e.pada);
  assert.deepEqual(waktu, [...waktu].sort(), 'urut menurut waktu');
  assert.ok(jenis.indexOf('tujuan_dibuat') < jenis.indexOf('tujuan_diperbarui'));
});

// --- ekspor dan hapus akun -----------------------------------------------------------------

test('Ekspor memuat semua babak jalur dan semua versi tujuan; hapus akun menghapus keduanya', async () => {
  const { json } = await daftarPenggunaBaru(baseUrl, { versi_kebijakan: versiKebijakan });
  const a = { id: json.data.pengguna.id, token: json.data.token };
  const p = await pilihJalur(a, 'melanjutkan');
  await panggil('PATCH', `/jalur-minat/saya/${p.id}`, a.token, { status: 'dijeda' });
  const p2 = await pilihJalur(a, 'melanjutkan');
  const t = await buatTujuan(a, { judul: 'Versi satu' });
  const t2 = (await panggil('POST', `/tujuan/${t.id}/versi`, a.token, { judul: 'Versi dua' })).json.data;
  const butirId = await buatButir(a);
  await panggil('PATCH', `/tujuan/bukti/${butirId}`, a.token, { tujuan_id: t2.id });

  const ekspor = await panggil('GET', '/pengguna/saya/ekspor', a.token);
  assert.equal(ekspor.status, 200);
  assert.deepEqual(ekspor.json.data.pengguna_jalur_minat.map((r) => r.id).sort(), [p.id, p2.id].sort());
  assert.deepEqual(ekspor.json.data.tujuan.map((r) => [r.id, r.status]).sort(), [[t.id, 'diubah'], [t2.id, 'aktif']].sort());

  const hapus = await panggil('DELETE', '/pengguna/saya', a.token, { penegasan: 'HAPUS AKUN SAYA', kata_sandi: SANDI });
  assert.equal(hapus.status, 200, JSON.stringify(hapus.json));
  for (const tabel of ['pengguna_jalur_minat', 'tujuan', 'butir_bukti']) {
    const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM ${tabel} WHERE pengguna_id = ?`, [a.id]);
    assert.equal(n, 0, `${tabel} masih ada sesudah hapus akun`);
  }
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM tujuan WHERE id IN (?, ?)', [t.id, t2.id]);
  assert.equal(n, 0);
});

// --- kompatibilitas ----------------------------------------------------------------------

test('Kontrak lama tidak berubah: medan /pengguna/saya sama sebelum dan sesudah memakai Jalur & Tujuan', async () => {
  const a = await akun();
  const sebelum = (await panggil('GET', '/pengguna/saya', a.token)).json.data;
  await pilihJalur(a, 'melanjutkan');
  await buatTujuan(a, { judul: 'Apa saja' });
  const sesudah = (await panggil('GET', '/pengguna/saya', a.token)).json.data;
  assert.deepEqual(Object.keys(sesudah).sort(), Object.keys(sebelum).sort());
  assert.ok('prodi_impian' in sesudah);
  assert.ok(!('jalur_minat' in sesudah) && !('tujuan' in sesudah), 'tidak ada medan baru di profil lama');
});
