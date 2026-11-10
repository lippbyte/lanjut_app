// LANJUT_010 seri v2: rute Portofolio & Bukti, foto, penghapusan berkas, dan dua skrip operasional.
// Saklar dinyalakan di sini saja, dan env dibaca saat modul dimuat, jadi harus diset sebelum require.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const fsp = require('node:fs/promises');
const crypto = require('node:crypto');
const http = require('node:http');
const { execFileSync } = require('node:child_process');

const DIREKTORI = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjut-foto-'));
process.env.PORTOFOLIO_AKTIF = '1';
process.env.DIREKTORI_BERKAS = DIREKTORI;

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool, kunciKonfigurasiGlobal } = require('./bantuan');
const { buatUuid } = require('../src/util/id');
const { benihJalurMinat } = require('../src/db/benih/benih');
const { sidikAkun, SUBFOLDER } = require('../src/modul/butir-bukti/penyimpanan-foto');
const pilihan = require('../src/modul/jalur-minat/pengguna-jalur-minat.repo');
const foto = require('./contoh/foto-uji');

const WAKTU = '2026-11-10 08:00:00';
const SANDI = 'sandiujiaman1';
const AKAR_SERVER = path.join(__dirname, '..');
const POLA_NAMA = /^[0-9a-f-]{36}\.(jpg|png|webp)$/;
let server;
let baseUrl;
let versiKebijakan;
let lepasKunci;

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
  return { id: json.data.pengguna.id, nama: json.data.pengguna.nama_pengguna, token: json.data.token };
}

const buatButir = async (a, tambahan = {}) => {
  const res = await panggil('POST', '/butir-bukti', a.token, { judul: 'Karya uji', jenis: 'karya', ...tambahan });
  assert.equal(res.status, 201, JSON.stringify(res.json));
  return res.json.data;
};

async function unggah(a, butirId, isi, nama = 'foto.jpg', tipe = 'image/jpeg') {
  const form = new FormData();
  form.append('foto', new Blob([isi], { type: tipe }), nama);
  const res = await fetch(`${baseUrl}/api/v1/butir-bukti/${butirId}/foto`, { method: 'POST', headers: { Authorization: `Bearer ${a.token}` }, body: form });
  return { status: res.status, json: await res.json() };
}

const ambilFoto = (a, butirId, fotoId) =>
  fetch(`${baseUrl}/api/v1/butir-bukti/${butirId}/foto/${fotoId}`, { headers: a ? { Authorization: `Bearer ${a.token}` } : {} });

const folderAkun = (a) => path.join(DIREKTORI, SUBFOLDER, sidikAkun(a.id));
const berkasAkun = (a) => (fs.existsSync(folderAkun(a)) ? fs.readdirSync(folderAkun(a)) : []);
const barisTertunda = async () => (await pool.query('SELECT * FROM berkas_tertunda_hapus'))[0];

function jalankanAlat(nama, ...argumen) {
  return execFileSync(process.execPath, [`tools/${nama}.js`, ...argumen], { cwd: AKAR_SERVER, env: process.env, encoding: 'utf8' });
}
const angkaDari = (teks, label) => Number(new RegExp(`${label}: (\\d+)`).exec(teks)[1]);

before(async () => {
  lepasKunci = await kunciKonfigurasiGlobal();
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  await benihJalurMinat();
  const [[baris]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'persetujuan_versi_kebijakan'");
  versiKebijakan = Number(baris.nilai);
});

after(async () => {
  await new Promise((r) => server.close(r));
  if (lepasKunci) await lepasKunci();
  await pool.end();
  fs.rmSync(DIREKTORI, { recursive: true, force: true });
});

// --- gerbang --------------------------------------------------------------------------

const ID = '11111111-1111-4111-8111-111111111111';
const SEMUA_RUTE = [
  ['GET', '/butir-bukti'],
  ['POST', '/butir-bukti'],
  ['GET', `/butir-bukti/${ID}`],
  ['PATCH', `/butir-bukti/${ID}`],
  ['DELETE', `/butir-bukti/${ID}`],
  ['POST', `/butir-bukti/${ID}/foto`],
  ['GET', `/butir-bukti/${ID}/foto/${ID}`],
  ['DELETE', `/butir-bukti/${ID}/foto/${ID}`],
];

test('Gerbang: tanpa login 401 di semua rute', async () => {
  for (const [m, j] of SEMUA_RUTE) assert.equal((await panggil(m, j)).status, 401, `${m} ${j}`);
});

test('Gerbang: kebijakan privasi belum diterima ditolak di semua rute, seperti rute data pribadi lain', async () => {
  const a = await akun({ setuju: false });
  for (const [m, j] of SEMUA_RUTE) {
    const res = await panggil(m, j, a.token);
    assert.equal(res.status, 403, `${m} ${j}`);
    assert.equal(res.json.galat.kode, 'AI_BELUM_DIIZINKAN');
  }
});

// --- butir ----------------------------------------------------------------------------

test('Butir: buat, daftar, baca, ubah, hapus', async () => {
  const a = await akun();
  const b = await buatButir(a, { uraian: 'Uraian', tautan: 'https://contoh.test/karya', tanggal_karya: '2026-10-01', jalur_minat_id: 'bekerja' });
  assert.equal(b.visibilitas, 'privat');
  assert.equal(b.tanggal_karya, '2026-10-01');
  assert.equal(b.jalur_minat_id, 'bekerja');
  assert.deepEqual(b.foto, []);

  assert.deepEqual((await panggil('GET', '/butir-bukti', a.token)).json.data.map((x) => x.id), [b.id]);
  assert.equal((await panggil('GET', `/butir-bukti/${b.id}`, a.token)).json.data.judul, 'Karya uji');

  const ubah = await panggil('PATCH', `/butir-bukti/${b.id}`, a.token, { judul: 'Baru', jenis: 'refleksi', tautan: null, jalur_minat_id: 'wirausaha' });
  assert.equal(ubah.status, 200);
  assert.equal(ubah.json.data.judul, 'Baru');
  assert.equal(ubah.json.data.jenis, 'refleksi');
  assert.equal(ubah.json.data.tautan, null);
  assert.equal(ubah.json.data.jalur_minat_id, 'wirausaha');
  assert.equal(ubah.json.data.uraian, 'Uraian', 'medan yang tidak dikirim tidak berubah');

  assert.equal((await panggil('DELETE', `/butir-bukti/${b.id}`, a.token)).status, 200);
  assert.equal((await panggil('GET', `/butir-bukti/${b.id}`, a.token)).status, 404);
});

test('Validasi: tautan hanya http dan https', async () => {
  const a = await akun();
  for (const tautan of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'ftp://contoh.test', 'bukan tautan', 'http://']) {
    const res = await panggil('POST', '/butir-bukti', a.token, { judul: 'x', jenis: 'karya', tautan });
    assert.equal(res.status, 400, tautan);
  }
  assert.equal((await panggil('GET', '/butir-bukti', a.token)).json.data.length, 0);
  assert.equal((await buatButir(a, { tautan: 'http://contoh.test' })).tautan, 'http://contoh.test');
});

test('Validasi: judul, uraian, jenis, dan tanggal', async () => {
  const a = await akun();
  const salah = [
    {},
    { judul: 'x' },
    { jenis: 'karya' },
    { judul: '   ', jenis: 'karya' },
    { judul: 'x'.repeat(201), jenis: 'karya' },
    { judul: 'x', jenis: 'lainnya' },
    { judul: 'x', jenis: 'karya', uraian: 'x'.repeat(5001) },
    { judul: 'x', jenis: 'karya', tanggal_karya: '2026-13-40' },
  ];
  for (const badan of salah) assert.equal((await panggil('POST', '/butir-bukti', a.token, badan)).status, 400, JSON.stringify(badan).slice(0, 60));
});

test('Klien tidak bisa mengatur visibilitas atau rujukan eksternal', async () => {
  const a = await akun();
  const b = await buatButir(a, { visibilitas: 'publik', rujukan_jenis: 'kartu', rujukan_id: 'k-1', pengguna_id: buatUuid() });
  await panggil('PATCH', `/butir-bukti/${b.id}`, a.token, { judul: 'Baru', visibilitas: 'publik', rujukan_jenis: 'modul', rujukan_id: 'm-1' });
  const [[baris]] = await pool.query('SELECT pengguna_id, visibilitas, rujukan_jenis, rujukan_id FROM butir_bukti WHERE id = ?', [b.id]);
  assert.deepEqual(baris, { pengguna_id: a.id, visibilitas: 'privat', rujukan_jenis: null, rujukan_id: null });
});

test('jalur_minat: jalur aktif mana pun boleh; id tak dikenal, tidak aktif, dan baris pilihan akun lain ditolak', async () => {
  const a = await akun();
  const b = await akun();
  for (const id of ['melanjutkan', 'bekerja', 'wirausaha']) assert.equal((await buatButir(a, { jalur_minat_id: id })).jalur_minat_id, id);

  const idPilihanB = buatUuid();
  await pilihan.buat({ id: idPilihanB, penggunaId: b.id, jalurMinatId: 'bekerja', waktu: WAKTU });
  const idTidakAktif = `uji-mati-${crypto.randomUUID().slice(0, 8)}`;
  await pool.query("INSERT INTO jalur_minat (id, nama, deskripsi_singkat, urutan, aktif, pemilik, asal) VALUES (?, 'Mati', 'x', 99, 0, 'tim', 'contoh')", [idTidakAktif]);
  try {
    for (const id of ['tidak-ada', idTidakAktif, idPilihanB]) {
      const res = await panggil('POST', '/butir-bukti', a.token, { judul: 'x', jenis: 'karya', jalur_minat_id: id });
      assert.equal(res.status, 400, id);
      assert.ok(res.json.galat.medan.jalur_minat_id);
    }
    const milikA = await buatButir(a);
    assert.equal((await panggil('PATCH', `/butir-bukti/${milikA.id}`, a.token, { jalur_minat_id: idPilihanB })).status, 400);
  } finally {
    await pool.query('DELETE FROM jalur_minat WHERE id = ?', [idTidakAktif]);
  }
});

test('tujuan: harus milik sendiri', async () => {
  const a = await akun();
  const b = await akun();
  const idTujuan = (async (p) => {
    const id = buatUuid();
    await pool.query("INSERT INTO tujuan (id, pengguna_id, judul, dibuat_pada, diubah_pada) VALUES (?, ?, 'Tujuan', ?, ?)", [id, p.id, WAKTU, WAKTU]);
    return id;
  });
  const tujuanA = await idTujuan(a);
  const tujuanB = await idTujuan(b);

  assert.equal((await buatButir(a, { tujuan_id: tujuanA })).tujuan_id, tujuanA);
  const tolak = await panggil('POST', '/butir-bukti', a.token, { judul: 'x', jenis: 'karya', tujuan_id: tujuanB });
  assert.equal(tolak.status, 400);
  assert.ok(tolak.json.galat.medan.tujuan_id);

  const milikA = await buatButir(a);
  assert.equal((await panggil('PATCH', `/butir-bukti/${milikA.id}`, a.token, { tujuan_id: tujuanB })).status, 400);
  assert.equal((await panggil('GET', `/butir-bukti/${milikA.id}`, a.token)).json.data.tujuan_id, null);
});

test('Isolasi: akun A mendapat 404 untuk butir dan foto akun B, dan milik B tetap utuh', async () => {
  const a = await akun();
  const b = await akun();
  const butirB = await buatButir(b, { uraian: 'Rahasia B' });
  const fotoB = (await unggah(b, butirB.id, foto.JPEG)).json.data;

  assert.deepEqual((await panggil('GET', '/butir-bukti', a.token)).json.data, []);
  assert.equal((await panggil('GET', `/butir-bukti/${butirB.id}`, a.token)).status, 404);
  assert.equal((await panggil('PATCH', `/butir-bukti/${butirB.id}`, a.token, { judul: 'Dibajak' })).status, 404);
  assert.equal((await panggil('DELETE', `/butir-bukti/${butirB.id}`, a.token)).status, 404);
  assert.equal((await unggah(a, butirB.id, foto.JPEG)).status, 404);
  assert.equal((await ambilFoto(a, butirB.id, fotoB.id)).status, 404);
  assert.equal((await panggil('DELETE', `/butir-bukti/${butirB.id}/foto/${fotoB.id}`, a.token)).status, 404);

  // Id foto milik B di bawah butir milik A pun tidak terbaca.
  const butirA = await buatButir(a);
  assert.equal((await ambilFoto(a, butirA.id, fotoB.id)).status, 404);
  assert.equal((await ambilFoto(b, butirA.id, fotoB.id)).status, 404);

  const utuh = (await panggil('GET', `/butir-bukti/${butirB.id}`, b.token)).json.data;
  assert.equal(utuh.judul, 'Karya uji');
  assert.equal(utuh.foto.length, 1);
  assert.equal(berkasAkun(a).length, 0);
  assert.equal(berkasAkun(b).length, 1);
});

// --- foto -----------------------------------------------------------------------------

test('Foto: JPEG, PNG, dan WebP diterima; jenisnya dari isi berkas', async () => {
  const a = await akun();
  const b = await buatButir(a);
  for (const [isi, mime] of [[foto.JPEG, 'image/jpeg'], [foto.PNG, 'image/png'], [foto.WEBP, 'image/webp']]) {
    // Content-Type dari klien sengaja salah.
    const res = await unggah(a, b.id, isi, 'apa-saja.bin', 'text/plain');
    assert.equal(res.status, 201);
    assert.equal(res.json.data.jenis_berkas, mime);
    const ambil = await ambilFoto(a, b.id, res.json.data.id);
    assert.equal(ambil.headers.get('content-type'), mime);
  }
});

test('Foto: berkas teks berekstensi .jpg, HEIC, dan berkas rusak ditolak dan tidak tersimpan', async () => {
  const a = await akun();
  const b = await buatButir(a);

  const teks = await unggah(a, b.id, Buffer.from('ini bukan foto'), 'foto.jpg', 'image/jpeg');
  assert.equal(teks.status, 415);
  assert.equal(teks.json.galat.kode, 'FOTO_JENIS_DITOLAK');

  const heic = await unggah(a, b.id, foto.heic(), 'IMG_0001.HEIC', 'image/heic');
  assert.equal(heic.status, 415);
  assert.equal(heic.json.galat.kode, 'FOTO_HEIC_DITOLAK');
  assert.match(heic.json.galat.pesan, /HEIC/);

  const rusak = await unggah(a, b.id, foto.JPEG.subarray(0, 40));
  assert.equal(rusak.status, 422);
  assert.equal(rusak.json.galat.kode, 'FOTO_RUSAK');

  assert.equal(berkasAkun(a).length, 0);
  assert.equal((await panggil('GET', `/butir-bukti/${b.id}`, a.token)).json.data.foto.length, 0);
});

test('Foto: EXIF dan GPS hilang dari berkas di disk dan dari yang disajikan', async () => {
  const a = await akun();
  const b = await buatButir(a);
  for (const [isi, nama] of [[foto.jpegDenganMetadata(), 'gps.jpg'], [foto.pngDenganMetadata(), 'gps.png'], [foto.webpDenganMetadata(), 'gps.webp']]) {
    assert.ok(isi.includes('GPS-LOKASI-RUMAH'), 'gambar uji harus memuat GPS');
    const res = await unggah(a, b.id, isi, nama);
    assert.equal(res.status, 201);
    const disajikan = Buffer.from(await (await ambilFoto(a, b.id, res.json.data.id)).arrayBuffer());
    for (const p of foto.SEMUA_PENANDA) assert.ok(!disajikan.includes(p), `${nama}: ${p}`);
  }
  for (const n of berkasAkun(a)) {
    const diDisk = fs.readFileSync(path.join(folderAkun(a), n));
    for (const p of foto.SEMUA_PENANDA) assert.ok(!diDisk.includes(p), `${n}: ${p}`);
  }
});

test('Foto: batas ukuran 5 MB, dihitung dari berkas yang dikirim', async () => {
  const a = await akun();
  const b = await buatButir(a);
  const terlaluBesar = Buffer.concat([foto.JPEG, Buffer.alloc(5 * 1024 * 1024 - foto.JPEG.length + 1)]);
  const tolak = await unggah(a, b.id, terlaluBesar);
  assert.equal(tolak.status, 413);
  assert.equal(tolak.json.galat.kode, 'FOTO_TERLALU_BESAR');

  // Hampir 5 MB, sebagian besar komentar: diterima, dan yang tersimpan jauh lebih kecil.
  const komentar = Array.from({ length: 80 }, () => foto.segmenJpeg(0xfe, Buffer.alloc(65000, 0x41)));
  const besar = Buffer.concat([foto.JPEG.subarray(0, 2), ...komentar, foto.JPEG.subarray(2)]);
  assert.ok(besar.length > 4.8 * 1024 * 1024 && besar.length < 5 * 1024 * 1024);
  const terima = await unggah(a, b.id, besar);
  assert.equal(terima.status, 201);
  assert.ok(terima.json.data.ukuran_byte < 2000);
});

test('Foto: unggah tanpa berkas dan dengan medan lain ditolak', async () => {
  const a = await akun();
  const b = await buatButir(a);
  const kosong = await fetch(`${baseUrl}/api/v1/butir-bukti/${b.id}/foto`, { method: 'POST', headers: { Authorization: `Bearer ${a.token}` }, body: new FormData() });
  assert.equal(kosong.status, 400);
  const form = new FormData();
  form.append('berkas', new Blob([foto.JPEG]), 'a.jpg');
  const salahMedan = await fetch(`${baseUrl}/api/v1/butir-bukti/${b.id}/foto`, { method: 'POST', headers: { Authorization: `Bearer ${a.token}` }, body: form });
  assert.equal(salahMedan.status, 400);
});

test('Foto: batas 3 per butir, juga untuk lima unggahan serentak', async () => {
  const a = await akun();
  const b = await buatButir(a);
  const hasil = await Promise.all(Array.from({ length: 5 }, () => unggah(a, b.id, foto.JPEG)));
  assert.equal(hasil.filter((r) => r.status === 201).length, 3);
  const ditolak = hasil.filter((r) => r.status === 409);
  assert.equal(ditolak.length, 2);
  for (const r of ditolak) assert.equal(r.json.galat.kode, 'BATAS_FOTO_BUTIR');
  assert.equal(berkasAkun(a).length, 3, 'berkas unggahan yang ditolak tidak boleh tertinggal');
});

test('Foto: batas 30 per akun, juga untuk dua unggahan serentak', async () => {
  const a = await akun();
  const penuh = [];
  for (let i = 0; i < 10; i += 1) penuh.push(await buatButir(a));
  for (let i = 0; i < 29; i += 1) {
    await pool.query(
      "INSERT INTO lampiran_butir_bukti (id, butir_bukti_id, jenis_berkas, ukuran_byte, nama_tersimpan, nama_asli, dibuat_pada) VALUES (?, ?, 'image/jpeg', 1, ?, 'a.jpg', ?)",
      [buatUuid(), penuh[i % 10].id, `${buatUuid()}.jpg`, WAKTU]
    );
  }
  const b = await buatButir(a);
  const hasil = await Promise.all([unggah(a, b.id, foto.JPEG), unggah(a, b.id, foto.JPEG)]);
  assert.deepEqual(hasil.map((r) => r.status).sort(), [201, 409]);
  assert.equal(hasil.find((r) => r.status === 409).json.galat.kode, 'BATAS_FOTO_AKUN');
  assert.equal(berkasAkun(a).length, 1);
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM lampiran_butir_bukti l JOIN butir_bukti b ON b.id = l.butir_bukti_id WHERE b.pengguna_id = ?', [a.id]);
  assert.equal(n, 30);
});

test('Nama berkas tidak pernah memuat masukan pengguna', async () => {
  const a = await akun();
  const b = await buatButir(a);
  const res = await unggah(a, b.id, foto.JPEG, `${'../'.repeat(3)}jahat\\foto-saya.jpg`);
  assert.equal(res.status, 201);
  assert.equal(res.json.data.nama_asli, 'foto-saya.jpg');
  assert.ok(!('nama_tersimpan' in res.json.data));

  const [[baris]] = await pool.query('SELECT nama_tersimpan, nama_asli FROM lampiran_butir_bukti WHERE id = ?', [res.json.data.id]);
  assert.match(baris.nama_tersimpan, POLA_NAMA);
  assert.deepEqual(berkasAkun(a), [baris.nama_tersimpan]);
  assert.ok(!fs.existsSync(path.join(DIREKTORI, '..', 'jahat')));

  const panjang = await unggah(a, b.id, foto.JPEG, `${'a'.repeat(300)}.jpg`);
  assert.equal(panjang.status, 201, 'nama yang terlalu panjang dipotong, unggahan tetap berhasil');
  assert.equal(panjang.json.data.nama_asli.length, 255);

  // Karakter kendali hanya lolos pengurai lewat bentuk filename*, jadi badannya dirakit sendiri.
  const batas = 'batas-uji-kendali';
  const badan = Buffer.concat([
    Buffer.from(`--${batas}\r\nContent-Disposition: form-data; name="foto"; filename*=UTF-8''a%07b.jpg\r\nContent-Type: image/jpeg\r\n\r\n`),
    foto.JPEG,
    Buffer.from(`\r\n--${batas}--\r\n`),
  ]);
  const kendali = await fetch(`${baseUrl}/api/v1/butir-bukti/${b.id}/foto`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${a.token}`, 'Content-Type': `multipart/form-data; boundary=${batas}` },
    body: badan,
  });
  assert.equal(kendali.status, 201);
  assert.equal((await kendali.json()).data.nama_asli, 'ab.jpg');
});

test('Percobaan menembus jalur gagal', async () => {
  const a = await akun();
  const b = await buatButir(a);
  // Lewat http.request, karena fetch merapikan `..` sebelum permintaannya terkirim.
  const { hostname, port } = new URL(baseUrl);
  const statusMentah = (jalur) =>
    new Promise((selesai, gagal) => {
      http
        .get({ hostname, port, path: jalur, headers: { Authorization: `Bearer ${a.token}` } }, (res) => {
          res.resume();
          res.on('end', () => selesai(res.statusCode));
        })
        .on('error', gagal);
    });
  const dasar = `/api/v1/butir-bukti/${b.id}/foto`;
  for (const j of [`${dasar}/..%2F..%2F..%2Fetc%2Fpasswd`, `${dasar}/%2e%2e`, `${dasar}/..`, `${dasar}/${'../'.repeat(4)}etc/passwd`, '/api/v1/butir-bukti/..%2F..%2Fetc']) {
    assert.equal(await statusMentah(j), 404, j);
  }
});

test('Penyajian: hanya pemilik, header aman, dan isi sesuai', async () => {
  const a = await akun();
  const b = await buatButir(a);
  const f = (await unggah(a, b.id, foto.PNG, 'a.png', 'image/png')).json.data;

  const res = await ambilFoto(a, b.id, f.id);
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('content-type'), 'image/png');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.equal(res.headers.get('cache-control'), 'private, no-store');
  assert.ok(Buffer.from(await res.arrayBuffer()).equals(foto.PNG));

  assert.equal((await ambilFoto(null, b.id, f.id)).status, 401);
  assert.equal((await ambilFoto(await akun(), b.id, f.id)).status, 404);
});

test('Tidak ada jalur publik ke berkas', async () => {
  const a = await akun();
  const b = await buatButir(a);
  await unggah(a, b.id, foto.JPEG);
  const nama = berkasAkun(a)[0];
  const relatif = `${sidikAkun(a.id)}/${nama}`;
  for (const j of [`/${SUBFOLDER}/${relatif}`, `/data/berkas/${SUBFOLDER}/${relatif}`, `/${nama}`, `/api/v1/${SUBFOLDER}/${relatif}`]) {
    const res = await fetch(`${baseUrl}${j}`, { headers: { Authorization: `Bearer ${a.token}` } });
    assert.equal(res.status, 404, j);
  }
});

// --- penghapusan ----------------------------------------------------------------------

test('Hapus foto dan hapus butir menghilangkan berkas dari disk', async () => {
  const a = await akun();
  const b = await buatButir(a);
  const f1 = (await unggah(a, b.id, foto.JPEG)).json.data;
  await unggah(a, b.id, foto.PNG, 'a.png', 'image/png');
  assert.equal(berkasAkun(a).length, 2);

  assert.equal((await panggil('DELETE', `/butir-bukti/${b.id}/foto/${f1.id}`, a.token)).status, 200);
  assert.equal(berkasAkun(a).length, 1);
  assert.equal((await panggil('GET', `/butir-bukti/${b.id}`, a.token)).json.data.foto.length, 1);

  assert.equal((await panggil('DELETE', `/butir-bukti/${b.id}`, a.token)).status, 200);
  assert.equal(berkasAkun(a).length, 0);
  const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM lampiran_butir_bukti WHERE butir_bukti_id = ?', [b.id]);
  assert.equal(n, 0);
});

test('Hapus akun menghapus semua foto akun itu, dan foto akun lain utuh', async () => {
  const a = await akun();
  const lain = await akun();
  const b = await buatButir(a);
  await unggah(a, b.id, foto.JPEG);
  await unggah(a, b.id, foto.PNG, 'a.png', 'image/png');
  await unggah(lain, (await buatButir(lain)).id, foto.JPEG);

  const res = await panggil('DELETE', '/pengguna/saya', a.token, { penegasan: 'HAPUS AKUN SAYA', kata_sandi: SANDI });
  assert.equal(res.status, 200);
  assert.equal(fs.existsSync(folderAkun(a)), false);
  assert.equal(berkasAkun(lain).length, 1);
});

test('Ekspor memuat data lampiran foto', async () => {
  const a = await akun();
  const b = await buatButir(a);
  await unggah(a, b.id, foto.JPEG);
  const data = (await panggil('GET', '/pengguna/saya/ekspor', a.token)).json.data;
  assert.equal(data.butir_bukti.length, 1);
  assert.equal(data.lampiran_butir_bukti.length, 1);
});

test('Gagal hapus tercatat di berkas_tertunda_hapus, lalu bersihkan-berkas menyelesaikannya', async (t) => {
  const a = await akun();
  const b = await buatButir(a);
  const f1 = (await unggah(a, b.id, foto.JPEG)).json.data;
  const f2 = (await unggah(a, b.id, foto.PNG, 'a.png', 'image/png')).json.data;
  await unggah(a, (await buatButir(a)).id, foto.WEBP, 'a.webp', 'image/webp');
  assert.equal(berkasAkun(a).length, 3);
  assert.equal(f2.jenis_berkas, 'image/png');

  const unlinkAsli = fsp.unlink;
  fsp.unlink = async () => {
    const galat = new Error('berkas sedang dipakai');
    galat.code = 'EBUSY';
    throw galat;
  };
  t.mock.method(console, 'error', () => {});
  const sidik = sidikAkun(a.id);
  const milikA = async () => (await barisTertunda()).filter((r) => r.nama_tersimpan.startsWith(sidik));
  const alasan = (baris) => baris.map((r) => r.alasan.split(':')[0]).sort();
  try {
    assert.equal((await panggil('DELETE', `/butir-bukti/${b.id}/foto/${f1.id}`, a.token)).status, 200, 'siswa tetap berhasil');
    assert.deepEqual(alasan(await milikA()), ['hapus_foto']);
    assert.equal((await panggil('DELETE', `/butir-bukti/${b.id}`, a.token)).status, 200);
    assert.deepEqual(alasan(await milikA()), ['hapus_butir', 'hapus_foto']);
    const hapusAkun = await panggil('DELETE', '/pengguna/saya', a.token, { penegasan: 'HAPUS AKUN SAYA', kata_sandi: SANDI });
    assert.equal(hapusAkun.status, 200);
  } finally {
    fsp.unlink = unlinkAsli;
  }

  // Satu baris per berkas. Berkas yang gagal lagi memperbarui barisnya, jadi alasannya yang terakhir.
  const tertunda = await milikA();
  assert.deepEqual(alasan(tertunda), ['hapus_akun', 'hapus_akun', 'hapus_akun']);
  for (const r of tertunda) assert.ok(!r.nama_tersimpan.includes(a.id), 'jalur tidak memuat ID akun');
  assert.equal(berkasAkun(a).length, 3, 'berkasnya memang belum terhapus');

  // Mode --cek hanya melaporkan.
  const cek = jalankanAlat('bersihkan-berkas', '--cek');
  assert.ok(angkaDari(cek, 'Tertunda') >= 3);
  assert.equal(angkaDari(cek, 'Berhasil dihapus'), 0);
  assert.equal(berkasAkun(a).length, 3);
  assert.equal((await barisTertunda()).filter((r) => r.nama_tersimpan.startsWith(sidik)).length, 3);

  const bersih = jalankanAlat('bersihkan-berkas');
  assert.ok(angkaDari(bersih, 'Berhasil dihapus') >= 3);
  assert.equal(angkaDari(bersih, 'Gagal'), 0);
  assert.equal(berkasAkun(a).length, 0);
  assert.equal((await barisTertunda()).filter((r) => r.nama_tersimpan.startsWith(sidik)).length, 0);
});

test('bersihkan-berkas melaporkan berkas yatim tanpa menghapusnya', async () => {
  const folder = path.join(DIREKTORI, SUBFOLDER, 'a'.repeat(32));
  fs.mkdirSync(folder, { recursive: true });
  const yatim = `${crypto.randomUUID()}.jpg`;
  fs.writeFileSync(path.join(folder, yatim), 'x');

  const a = await akun();
  const b = await buatButir(a);
  await unggah(a, b.id, foto.JPEG);
  const namaTerdaftar = berkasAkun(a)[0];

  const keluaran = jalankanAlat('bersihkan-berkas', '--cek');
  assert.ok(keluaran.includes(yatim), 'berkas yatim harus dilaporkan');
  assert.ok(!keluaran.includes(namaTerdaftar), 'berkas yang terdaftar bukan yatim');
  const keluaranBersih = jalankanAlat('bersihkan-berkas');
  assert.ok(keluaranBersih.includes(yatim));
  assert.ok(fs.existsSync(path.join(folder, yatim)), 'berkas yatim tidak dihapus otomatis');
  fs.rmSync(folder, { recursive: true, force: true });
});

test('Batas laju unggah: permintaan ke-21 dalam 15 menit ditolak, dan akun lain tidak ikut tertahan', async () => {
  // Di mode uji batasnya dilonggarkan, jadi aplikasi utuh dijalankan terpisah dengan angka produksi.
  const a = await akun();
  const lain = await akun();
  const butirA = await buatButir(a);
  const butirLain = await buatButir(lain);
  const skrip = `
    const app = require('./src/app');
    const pool = require('./src/db/koneksi');
    const uji = JSON.parse(process.env.UJI_AKUN);
    const s = app.listen(0, async () => {
      const kirim = (x) => fetch('http://127.0.0.1:' + s.address().port + '/api/v1/butir-bukti/' + x.id + '/foto', { method: 'POST', headers: { Authorization: 'Bearer ' + x.token } }).then((r) => r.status);
      const a = [];
      for (let i = 0; i < 21; i += 1) a.push(await kirim(uji.a));
      const lain = await kirim(uji.lain);
      console.log(JSON.stringify({ a, lain }));
      s.close();
      await pool.end();
    });`;
  const keluaran = execFileSync(process.execPath, ['-e', skrip], {
    cwd: AKAR_SERVER,
    encoding: 'utf8',
    timeout: 30000,
    env: {
      ...process.env,
      NODE_ENV: 'production',
      CORS_ORIGINS: 'https://uji.test',
      ASAL_DIIZINKAN: 'https://uji.test',
      TRUST_PROXY: '0',
      UJI_AKUN: JSON.stringify({ a: { id: butirA.id, token: a.token }, lain: { id: butirLain.id, token: lain.token } }),
    },
  });
  const hasil = JSON.parse(keluaran.trim().split('\n').pop());
  assert.deepEqual(hasil.a.slice(0, 20), Array(20).fill(400), 'badan kosong ditolak validasi, tetapi tetap terhitung');
  assert.equal(hasil.a[20], 429);
  assert.equal(hasil.lain, 400);
});

// --- pengukuran -----------------------------------------------------------------------

test('metrik-portofolio: hanya butir bermakna yang dihitung, dan akun uji bisa dikecualikan', async () => {
  const uraian30 = 'x'.repeat(30);
  const kosong = await akun();
  await buatButir(kosong);
  const pendek = await akun();
  await buatButir(pendek, { uraian: 'x'.repeat(29) });
  const spasi = await akun();
  const butirSpasi = await buatButir(spasi, { uraian: 'pendek' });
  // Rute sudah merapikan spasi, jadi isian berspasi hanya bisa masuk dari luar rute.
  await pool.query('UPDATE butir_bukti SET uraian = ? WHERE id = ?', [`${' '.repeat(40)}pendek${' '.repeat(40)}`, butirSpasi.id]);
  const denganUraian = await akun();
  await buatButir(denganUraian, { uraian: uraian30 });
  const denganTautan = await akun();
  await buatButir(denganTautan, { tautan: 'https://contoh.test' });
  const denganFoto = await akun();
  await unggah(denganFoto, (await buatButir(denganFoto)).id, foto.JPEG);
  const lama = await akun();
  const butirLama = await buatButir(lama, { uraian: uraian30 });
  await pool.query('UPDATE butir_bukti SET dibuat_pada = UTC_TIMESTAMP() - INTERVAL 20 DAY WHERE id = ?', [butirLama.id]);

  const keluaran = jalankanAlat('metrik-portofolio', '--daftar');
  assert.equal(angkaDari(keluaran, 'Jendela'), 14);
  for (const x of [denganUraian, denganTautan, denganFoto]) assert.ok(keluaran.includes(x.id), 'butir bermakna harus terhitung');
  for (const x of [kosong, pendek, spasi, lama]) assert.ok(!keluaran.includes(x.id), 'butir tidak bermakna atau di luar jendela tidak terhitung');
  assert.ok(!keluaran.includes(denganUraian.nama), 'keluaran tidak boleh memuat nama');

  const dua = jalankanAlat('metrik-portofolio', '--daftar', `--kecualikan=${denganUraian.id},${denganFoto.id}`);
  assert.ok(!dua.includes(denganUraian.id));
  assert.ok(dua.includes(denganTautan.id));
  assert.equal(angkaDari(keluaran, 'Siswa dengan butir bermakna') - angkaDari(dua, 'Siswa dengan butir bermakna'), 2);

  assert.ok(jalankanAlat('metrik-portofolio', '--hari=30', '--daftar').includes(lama.id), 'jendela bisa diatur');
  assert.ok(!/\d+ Siswa/.test(jalankanAlat('metrik-portofolio')) && !jalankanAlat('metrik-portofolio').includes(denganUraian.id), 'tanpa --daftar hanya angka');
});
