// LANJUT_024 seri v2: rute Discover dengan saklar menyala. Konten draf tidak pernah terkirim,
// isolasi antarsiswa, versi profil, profil tanpa label kepribadian, ekspor, dan hapus akun.
// Saklar dinyalakan di sini saja, dan env dibaca saat modul dimuat, jadi harus diset sebelum require.

process.env.DISCOVER_AKTIF = '1';

const fs = require('node:fs');
const path = require('node:path');
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool, kunciKonfigurasiGlobal } = require('./bantuan');
const { buatUuid } = require('../src/util/id');
const { benihDiscover, periksaBerkasDiscover } = require('../src/db/benih/benih');
const { kunciKartuDiscover, kartuUjiDisetujui } = require('./kartu-discover-uji');

const SANDI = 'sandiujiaman1';
const WAKTU = '2026-11-14 08:00:00';
const KONTEN = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data-konten', 'discover.json'), 'utf8'));
let server;
let baseUrl;
let versiKebijakan;
let lepasKunci;
let lepasKunciKartu;

// Kartu di data konten masih draf, jadi refleksi memakai kartu uji sementara berstatus disetujui,
// dipasang saat pertama dibutuhkan (sesudah tes daftar kosong) dan dihapus di after().
const UJI = kartuUjiDisetujui(pool, 'dc');
const [BIDANG, PROFESI, USAHA] = UJI.kartu;

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

async function refleksi(a, kartu, badan) {
  await UJI.siapkan();
  const res = await panggil('PUT', `/discover/refleksi/${kartu.id}`, a.token, badan);
  assert.equal(res.status, 200, JSON.stringify(res.json));
  return res.json.data;
}

async function perbaruiProfil(a, badan = {}) {
  const res = await panggil('POST', '/discover/profil', a.token, badan);
  assert.equal(res.status, 201, JSON.stringify(res.json));
  return res.json.data;
}

before(async () => {
  lepasKunci = await kunciKonfigurasiGlobal();
  lepasKunciKartu = await kunciKartuDiscover(pool);
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  await benihDiscover();
  const [[baris]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'persetujuan_versi_kebijakan'");
  versiKebijakan = Number(baris.nilai);
});

after(async () => {
  await new Promise((r) => server.close(r));
  try {
    await UJI.hapus();
  } finally {
    if (lepasKunciKartu) await lepasKunciKartu();
  }
  if (lepasKunci) await lepasKunci();
  await pool.end();
});

// --- gerbang --------------------------------------------------------------------------

const SEMUA_RUTE = [
  ['GET', '/discover/kartu'],
  ['GET', '/discover/refleksi'],
  ['PUT', '/discover/refleksi/bidang-kesehatan'],
  ['GET', '/discover/profil'],
  ['POST', '/discover/profil'],
  ['GET', '/discover/profil/riwayat'],
];

test('Gerbang: 401 tanpa sesi, 403 bila kebijakan privasi belum diterima', async () => {
  const tanpaSetuju = await akun({ setuju: false });
  for (const [m, j] of SEMUA_RUTE) {
    assert.equal((await panggil(m, j)).status, 401, `${m} ${j}`);
    const res = await panggil(m, j, tanpaSetuju.token, m === 'GET' ? undefined : { ketertarikan: 'tertarik' });
    assert.equal(res.status, 403, `${m} ${j}`);
    assert.equal(res.json.galat.kode, 'AI_BELUM_DIIZINKAN');
  }
});

// --- konten ---------------------------------------------------------------------------

test('Konten draf tidak pernah terkirim; selama semua kartu masih draf, daftarnya kosong', async () => {
  assert.ok(KONTEN.data.length >= 3 && KONTEN.data.every((k) => k.status_teks === 'draf'), 'tes ini mengandaikan semua kartu di data konten masih draf');
  const a = await akun();
  const res = await panggil('GET', '/discover/kartu', a.token);
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.data, []);
  const teks = JSON.stringify(res.json);
  for (const k of KONTEN.data) {
    assert.ok(!teks.includes(k.ringkasan) && !teks.includes(`"${k.id}"`), k.id);
  }
});

test('Kartu yang disetujui terkirim, draf dan nonaktif tidak (SQL asli, dalam transaksi yang dibatalkan)', async () => {
  const kartuRepo = require('../src/modul/discover/kartu-discover.repo');
  const akhiran = buatUuid().slice(0, 8);
  const koneksi = await pool.getConnection();
  try {
    await koneksi.beginTransaction();
    const sisip = (id, status, aktif) =>
      koneksi.query("INSERT INTO kartu_discover (id, jenis, judul, ringkasan, status_teks, urutan, aktif, pemilik, asal) VALUES (?, 'profesi', 'J', 'R', ?, 0, ?, 'tim', 'uji')", [id, status, aktif]);
    await sisip(`uji-tr-setuju-${akhiran}`, 'disetujui', 1);
    await sisip(`uji-tr-mati-${akhiran}`, 'disetujui', 0);
    await sisip(`uji-tr-draf-${akhiran}`, 'draf', 1);
    const hasil = await kartuRepo.daftarDisetujui(koneksi);
    assert.deepEqual(hasil.map((k) => k.id), [`uji-tr-setuju-${akhiran}`]);
  } finally {
    await koneksi.rollback();
    koneksi.release();
  }
});

test('Kartu draf, nonaktif, atau tidak ada tidak bisa diberi refleksi; jawabannya sama', async () => {
  await UJI.siapkan();
  const a = await akun();
  const jawaban = [];
  for (const id of ['bidang-kesehatan', 'profesi-guru', UJI.idMati, 'tidak-ada', 'BUKAN_ID']) {
    const res = await panggil('PUT', `/discover/refleksi/${id}`, a.token, { ketertarikan: 'tertarik', yang_menarik: 'x' });
    assert.equal(res.status, 400, id);
    assert.equal(res.json.galat.kode, 'KARTU_BELUM_TERSEDIA', id);
    assert.equal(res.json.galat.pesan, 'Kartu belum tersedia.', id);
    jawaban.push(JSON.stringify(res.json));
  }
  assert.equal(new Set(jawaban).size, 1);
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM refleksi_discover WHERE pengguna_id = ?', [a.id]);
  assert.equal(n, 0);
});

test('Benih menolak kartu yang disetujui tanpa sumber', () => {
  const contoh = (ubahan) => ({ ...KONTEN, data: [{ ...KONTEN.data[0], ...ubahan }] });
  assert.doesNotThrow(() => periksaBerkasDiscover(contoh({})));
  assert.throws(() => periksaBerkasDiscover(contoh({ status_teks: 'disetujui' })), /sumbernya belum diisi/);
  assert.throws(() => periksaBerkasDiscover(contoh({ status_teks: 'disetujui', url_sumber: null })), /sumbernya belum diisi/);
  assert.doesNotThrow(() => periksaBerkasDiscover(contoh({ status_teks: 'disetujui', url_sumber: 'https://contoh.test/sumber' })));
  assert.throws(() => periksaBerkasDiscover(contoh({ jenis: 'kepribadian' })), /jenis/);
});

test('Konten: tanpa angka gaji, prospek, atau peringkat, dan setiap kartu bersumber atau bertanda [ISI]', () => {
  for (const k of KONTEN.data) {
    assert.doesNotMatch(`${k.judul} ${k.ringkasan}`, /\d|gaji|prospek|peringkat|terbaik|paling dicari|penghasilan|Rp/i, k.id);
    assert.ok(k.url_sumber === '[ISI: sumber]' || /^https:\/\//.test(k.url_sumber), k.id);
    if (k.url_sumber === '[ISI: sumber]') assert.equal(k.diperiksa_pada, null, k.id);
  }
  assert.doesNotMatch(JSON.stringify(KONTEN.data), /alumni/i, 'Cerita Alumni tetap ditunda (K13)');
});

// --- refleksi -------------------------------------------------------------------------

test('Refleksi: simpan, perbarui, dan batas panjang 280 karakter', async () => {
  const a = await akun();
  const r1 = await refleksi(a, BIDANG, { ketertarikan: 'tertarik', yang_menarik: '  Aku suka merawat orang.  ' });
  assert.equal(r1.yang_menarik, 'Aku suka merawat orang.');
  assert.equal(r1.yang_kurang_menarik, null);
  const r2 = await refleksi(a, BIDANG, { ketertarikan: 'belum_yakin', yang_menarik: '', yang_kurang_menarik: 'Jam kerjanya panjang.' });
  assert.deepEqual([r2.ketertarikan, r2.yang_menarik, r2.yang_kurang_menarik], ['belum_yakin', null, 'Jam kerjanya panjang.']);
  const daftar = (await panggil('GET', '/discover/refleksi', a.token)).json.data;
  assert.equal(daftar.length, 1, 'satu refleksi per kartu');
  assert.equal((await panggil('PUT', `/discover/refleksi/${BIDANG.id}`, a.token, { ketertarikan: 'tertarik', yang_menarik: 'x'.repeat(281) })).status, 400);
  assert.equal((await panggil('PUT', `/discover/refleksi/${BIDANG.id}`, a.token, { ketertarikan: 'tertarik', yang_menarik: 'x'.repeat(280) })).status, 200);
  assert.equal((await panggil('PUT', `/discover/refleksi/${BIDANG.id}`, a.token, { ketertarikan: 'suka sekali' })).status, 400);
});

// --- isolasi antarsiswa ------------------------------------------------------------------

test('Siswa A tidak bisa membaca atau mengubah refleksi atau profil siswa B', async () => {
  const a = await akun();
  const b = await akun();
  await refleksi(b, PROFESI, { ketertarikan: 'tertarik', yang_menarik: 'Rahasia B: aku ingin mengajar.' });
  const profilB = await perbaruiProfil(b, { catatan: 'Catatan rahasia B' });
  const sebelum = (await pool.query('SELECT * FROM refleksi_discover WHERE pengguna_id = ?', [b.id]))[0];

  await refleksi(a, PROFESI, { ketertarikan: 'tidak_tertarik', yang_kurang_menarik: 'Milik A' });
  const profilA = await perbaruiProfil(a, { catatan: 'Catatan A' });
  assert.notEqual(profilA.id, profilB.id);

  assert.deepEqual((await pool.query('SELECT * FROM refleksi_discover WHERE pengguna_id = ?', [b.id]))[0], sebelum, 'refleksi B tidak berubah');
  const [[pb]] = await pool.query('SELECT status, catatan FROM profil_eksplorasi WHERE id = ?', [profilB.id]);
  assert.deepEqual({ ...pb }, { status: 'aktif', catatan: 'Catatan rahasia B' }, 'profil B tetap aktif dan utuh');

  const teksA = JSON.stringify([
    (await panggil('GET', '/discover/refleksi', a.token)).json,
    (await panggil('GET', '/discover/profil', a.token)).json,
    (await panggil('GET', '/discover/profil/riwayat', a.token)).json,
  ]);
  for (const rahasia of ['Rahasia B', 'Catatan rahasia B', profilB.id, b.id]) assert.ok(!teksA.includes(rahasia), rahasia);
});

test('Repositori menolak akun lain walau dipanggil langsung, tanpa lapisan layanan', async () => {
  const refleksiRepo = require('../src/modul/discover/refleksi-discover.repo');
  const profilRepo = require('../src/modul/discover/profil-eksplorasi.repo');
  const a = await akun();
  const b = await akun();
  await refleksi(b, USAHA, { ketertarikan: 'tertarik', yang_menarik: 'Milik B' });
  const profilB = await perbaruiProfil(b);

  assert.deepEqual(await refleksiRepo.daftarMilikSendiri(a.id), []);
  assert.equal(await refleksiRepo.ambilMilikSendiri(a.id, USAHA.id), null);
  assert.equal(await profilRepo.ambilTerkiniMilikSendiri(a.id), null);
  assert.deepEqual(await profilRepo.daftarMilikSendiri(a.id), []);
  // Versi baru untuk A yang mengaku berinduk profil B: ditolak, profil B tidak berubah.
  const hasil = await profilRepo.buatVersiMilikSendiri(a.id, { id: buatUuid(), indukId: profilB.id, isi: {}, catatan: null, waktu: WAKTU });
  assert.equal(hasil, 'bukan_terkini');
  const [[pb]] = await pool.query('SELECT status FROM profil_eksplorasi WHERE id = ?', [profilB.id]);
  assert.equal(pb.status, 'aktif');
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM profil_eksplorasi WHERE pengguna_id = ?', [a.id]);
  assert.equal(n, 0);
  // Refleksi lewat repositori untuk kartu draf: pemeriksaan kedua di SQL menolaknya.
  assert.equal(await refleksiRepo.simpanMilikSendiri({ id: buatUuid(), penggunaId: a.id, kartuId: 'bidang-kesehatan', ketertarikan: 'tertarik', yangMenarik: null, yangKurangMenarik: null, waktu: WAKTU }), false);
  assert.equal(await refleksiRepo.ambilMilikSendiri(a.id, 'bidang-kesehatan'), null);
});

// --- profil ---------------------------------------------------------------------------

test('Memperbarui profil membuat versi baru; versi lama tetap ada dan isinya tidak berubah', async () => {
  const a = await akun();
  assert.deepEqual((await panggil('GET', '/discover/profil', a.token)).json.data, { profil: null, jumlah_versi: 0 });
  await refleksi(a, BIDANG, { ketertarikan: 'tertarik', yang_menarik: 'Aku suka biologi.' });
  const v1 = await perbaruiProfil(a, { catatan: 'Versi satu' });
  const lamaSebelum = (await pool.query('SELECT isi, catatan, dibuat_pada FROM profil_eksplorasi WHERE id = ?', [v1.id]))[0][0];

  assert.equal((await panggil('POST', '/discover/profil', a.token, {})).status, 400, 'tanpa perubahan ditolak');
  await refleksi(a, USAHA, { ketertarikan: 'tidak_tertarik', yang_kurang_menarik: 'Aku kurang suka berjualan.' });
  const v2 = await perbaruiProfil(a);
  assert.notEqual(v2.id, v1.id);
  assert.equal(v2.diubah_dari_id, v1.id);
  assert.equal(v2.catatan, 'Versi satu', 'catatan yang tidak dikirim disalin');
  assert.equal(v2.kurang_tertarik.length, 1);

  const [[lama]] = await pool.query('SELECT status, isi, catatan, dibuat_pada FROM profil_eksplorasi WHERE id = ?', [v1.id]);
  assert.equal(lama.status, 'diubah');
  assert.deepEqual([lama.isi, lama.catatan, lama.dibuat_pada], [lamaSebelum.isi, lamaSebelum.catatan, lamaSebelum.dibuat_pada]);

  const riwayat = (await panggil('GET', '/discover/profil/riwayat', a.token)).json.data;
  assert.deepEqual(riwayat.map((v) => [v.id, v.status]), [[v1.id, 'diubah'], [v2.id, 'aktif']]);
  assert.equal(riwayat[0].kurang_tertarik.length, 0, 'versi lama tetap seperti saat dibuat');
  assert.equal((await panggil('GET', '/discover/profil', a.token)).json.data.jumlah_versi, 2);

  const v3 = await perbaruiProfil(a, { catatan: null });
  assert.equal(v3.catatan, null);
  assert.equal((await panggil('POST', '/discover/profil', a.token, { catatan: 'y'.repeat(501) })).status, 400);
});

test('Profil disusun dari jawaban siswa dan data akunnya, terhubung ke jalur dan tujuan', async () => {
  const a = await akun();
  const [[mapel]] = await pool.query('SELECT id, nama FROM mapel ORDER BY id LIMIT 1');
  await pool.query('UPDATE pengguna SET minat_rumpun = ?, mapel_pilihan = ? WHERE id = ?', [JSON.stringify(['Kesehatan']), JSON.stringify([mapel.id]), a.id]);
  const tujuanRepo = require('../src/modul/tujuan/tujuan.repo');
  const pilihanRepo = require('../src/modul/jalur-minat/pengguna-jalur-minat.repo');
  const idTujuan = buatUuid();
  await tujuanRepo.buat({ id: idTujuan, penggunaId: a.id, judul: 'Masuk prodi keperawatan', waktu: WAKTU });
  await pilihanRepo.buat({ id: buatUuid(), penggunaId: a.id, jalurMinatId: 'melanjutkan', waktu: WAKTU });
  await refleksi(a, BIDANG, { ketertarikan: 'tertarik', yang_menarik: 'Aku suka membantu orang.' });
  await refleksi(a, PROFESI, { ketertarikan: 'belum_yakin' });
  const p = await perbaruiProfil(a);

  assert.deepEqual(p.tertarik, [{ kartu_discover_id: BIDANG.id, judul: BIDANG.judul, jenis: 'bidang', alasan: 'Aku suka membantu orang.' }]);
  assert.deepEqual(p.belum_yakin, [{ kartu_discover_id: PROFESI.id, judul: PROFESI.judul, jenis: 'profesi' }]);
  assert.deepEqual(p.minat_rumpun, ['Kesehatan']);
  assert.deepEqual(p.mapel_pilihan, [{ id: mapel.id, nama: mapel.nama }]);
  assert.deepEqual(p.tujuan, [{ id: idTujuan, judul: 'Masuk prodi keperawatan' }]);
  assert.deepEqual(p.jalur, [], 'jalur draf tidak disebut namanya (K37)');
  const [[baris]] = await pool.query('SELECT isi FROM profil_eksplorasi WHERE id = ?', [p.id]);
  const isi = typeof baris.isi === 'string' ? JSON.parse(baris.isi) : baris.isi;
  assert.deepEqual(isi.jalur_minat_id, ['melanjutkan'], 'jalur aktif tersimpan sebagai salinan');
});

// Kata yang menyimpulkan kepribadian, kemampuan, atau sifat. Profil tidak boleh memuatnya,
// kecuali siswa sendiri yang menulisnya (dan siswa di tes ini tidak menulisnya).
const KATA_LABEL = /kepribadian|introver|ekstrover|kreatif|analitis|logis|artistik|sosial|realistis|investigatif|konvensional|giat|berbakat|\bbakat|cerdas|pintar|jenius|sifat|karakter|\btipe\b|MBTI|RIASEC|Holland|cocok (jadi|untuk)|kamu (adalah|termasuk)|potensi|kemampuan/i;

test('Profil hanya memuat yang siswa tulis dan pilih: tanpa label kepribadian, kemampuan, atau sifat', async () => {
  const a = await akun();
  const tulisan = { menarik: 'Aku senang memasak untuk keluarga.', kurang: 'Aku belum suka menghitung uang.', catatan: 'Aku mau coba ikut bazar sekolah.' };
  await pool.query('UPDATE pengguna SET minat_rumpun = ? WHERE id = ?', [JSON.stringify(['Teknik']), a.id]);
  await refleksi(a, USAHA, { ketertarikan: 'tertarik', yang_menarik: tulisan.menarik, yang_kurang_menarik: tulisan.kurang });
  await refleksi(a, BIDANG, { ketertarikan: 'tidak_tertarik', yang_kurang_menarik: tulisan.kurang });
  const p = await perbaruiProfil(a, { catatan: tulisan.catatan });

  // Medan tetap, tidak ada medan tambahan.
  assert.deepEqual(Object.keys(p).sort(), ['belum_yakin', 'catatan', 'dibuat_pada', 'diubah_dari_id', 'id', 'jalur', 'kurang_tertarik', 'mapel_pilihan', 'minat_rumpun', 'refleksi_disembunyikan', 'status', 'tertarik', 'tujuan']);
  for (const b of [...p.tertarik, ...p.kurang_tertarik]) assert.deepEqual(Object.keys(b).sort(), ['alasan', 'jenis', 'judul', 'kartu_discover_id']);

  // Setiap teks di profil berasal dari siswa, dari kartu, atau dari data akunnya.
  const boleh = new Set([...Object.values(tulisan), USAHA.judul, BIDANG.judul, USAHA.id, BIDANG.id, 'usaha', 'bidang', 'Teknik', 'aktif', p.id]);
  const teks = [];
  const kumpul = (nilai, kunci) => {
    if (typeof nilai === 'string' && kunci !== 'dibuat_pada') teks.push(nilai);
    else if (nilai && typeof nilai === 'object') for (const [k, v] of Object.entries(nilai)) kumpul(v, k);
  };
  kumpul(p);
  for (const t of teks) assert.ok(boleh.has(t), `teks tidak berasal dari siswa: "${t}"`);
  assert.doesNotMatch(JSON.stringify(p), KATA_LABEL);

  const [[baris]] = await pool.query('SELECT isi FROM profil_eksplorasi WHERE id = ?', [p.id]);
  const isi = typeof baris.isi === 'string' ? JSON.parse(baris.isi) : baris.isi;
  assert.deepEqual(Object.keys(isi).sort(), ['jalur_minat_id', 'mapel_pilihan', 'minat_rumpun', 'refleksi', 'tujuan']);
  assert.doesNotMatch(JSON.stringify(isi), KATA_LABEL);
});

test('Refleksi pada kartu yang belum disetujui tersimpan, tetapi judul kartunya tidak pernah terkirim', async () => {
  const a = await akun();
  const refleksiRepo = require('../src/modul/discover/refleksi-discover.repo');
  await refleksiRepo.buatTanpaPeriksaKartu({ id: buatUuid(), penggunaId: a.id, kartuId: 'profesi-guru', ketertarikan: 'tertarik', yangMenarik: 'Dari benih dummy', waktu: WAKTU });
  const p = await perbaruiProfil(a);
  assert.deepEqual(p.tertarik, []);
  assert.equal(p.refleksi_disembunyikan, 1);
  const guru = KONTEN.data.find((k) => k.id === 'profesi-guru');
  const teks = JSON.stringify(p);
  assert.ok(!teks.includes(`"${guru.judul}"`) && !teks.includes(guru.ringkasan), 'judul dan ringkasan kartu draf tidak terkirim');
});

// --- ekspor dan hapus akun -----------------------------------------------------------------

test('Ekspor memuat refleksi dan semua versi profil; hapus akun menghapus keduanya', async () => {
  const a = await akun();
  await refleksi(a, BIDANG, { ketertarikan: 'tertarik', yang_menarik: 'Untuk ekspor' });
  const v1 = await perbaruiProfil(a, { catatan: 'satu' });
  const v2 = await perbaruiProfil(a, { catatan: 'dua' });

  const ekspor = await panggil('GET', '/pengguna/saya/ekspor', a.token);
  assert.equal(ekspor.status, 200);
  assert.deepEqual(ekspor.json.data.refleksi_discover.map((r) => [r.kartu_discover_id, r.yang_menarik]), [[BIDANG.id, 'Untuk ekspor']]);
  assert.deepEqual(ekspor.json.data.profil_eksplorasi.map((p) => p.id).sort(), [v1.id, v2.id].sort());

  const hapus = await panggil('DELETE', '/pengguna/saya', a.token, { penegasan: 'HAPUS AKUN SAYA', kata_sandi: SANDI });
  assert.equal(hapus.status, 200, JSON.stringify(hapus.json));
  for (const tabel of ['refleksi_discover', 'profil_eksplorasi']) {
    const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM ${tabel} WHERE pengguna_id = ?`, [a.id]);
    assert.equal(n, 0, `${tabel} masih ada sesudah hapus akun`);
  }
});

// --- kompatibilitas ----------------------------------------------------------------------

test('Kontrak lama tidak berubah: medan /pengguna/saya sama sebelum dan sesudah memakai Discover', async () => {
  const a = await akun();
  const sebelum = (await panggil('GET', '/pengguna/saya', a.token)).json.data;
  await refleksi(a, BIDANG, { ketertarikan: 'tertarik' });
  await perbaruiProfil(a);
  const sesudah = (await panggil('GET', '/pengguna/saya', a.token)).json.data;
  assert.deepEqual(Object.keys(sesudah).sort(), Object.keys(sebelum).sort());
});
