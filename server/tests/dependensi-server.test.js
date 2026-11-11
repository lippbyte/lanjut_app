// LANJUT_016 seri v2: perilaku yang bergantung pada body-parser, proxy-addr, dan multer.
// env dibaca saat modul dimuat, jadi harus diset sebelum require.

const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const zlib = require('node:zlib');

const DIREKTORI = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjut-dep-'));
process.env.JUMLAH_PROXY = '1';
process.env.PORTOFOLIO_AKTIF = '1';
process.env.DIREKTORI_BERKAS = DIREKTORI;

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool, acak, kunciKonfigurasiGlobal } = require('./bantuan');
const foto = require('./contoh/foto-uji');

const AKAR = path.join(__dirname, '..');
const MASUK = '/api/v1/auth/masuk';
const JSON_H = { 'Content-Type': 'application/json' };
const SATU_MB = 1024 * 1024;
const kredensial = () => JSON.stringify({ nama_pengguna: `tidak_ada_${acak()}`, kata_sandi: 'sandiujiaman1' });
const semuaBerkas = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? semuaBerkas(path.join(d, e.name)) : [e.name]));

let server;
let baseUrl;
let lepasKunci;
let versiKebijakan;

async function kirim(headers, body) {
  const res = await fetch(`${baseUrl}${MASUK}`, { method: 'POST', headers, body });
  const teks = await res.text();
  return { status: res.status, kode: JSON.parse(teks).galat?.kode, teks };
}

async function sisaKuota(xff) {
  const res = await fetch(`${baseUrl}/api/v1/sehat`, { headers: { 'X-Forwarded-For': xff } });
  assert.equal(res.status, 200);
  return Number(res.headers.get('ratelimit-remaining'));
}

before(async () => {
  lepasKunci = await kunciKonfigurasiGlobal();
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const [[baris]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'persetujuan_versi_kebijakan'");
  versiKebijakan = Number(baris.nilai);
});

after(async () => {
  await new Promise((r) => server.close(r));
  if (lepasKunci) await lepasKunci();
  await pool.end();
  fs.rmSync(DIREKTORI, { recursive: true, force: true });
});

test('Versi terpasang sudah memuat perbaikan keamanan', () => {
  const { packages } = JSON.parse(fs.readFileSync(path.join(AKAR, 'package-lock.json'), 'utf8'));
  const angka = (v) => v.split('.').map(Number);
  const tidakLebihLama = (v, batas) => {
    const [a, b] = [angka(v), angka(batas)];
    for (let i = 0; i < 3; i += 1) if (a[i] !== b[i]) return a[i] > b[i];
    return true;
  };
  for (const [paket, batas] of [['body-parser', '1.20.9'], ['proxy-addr', '2.0.8'], ['multer', '2.5.0']]) {
    const { version } = packages[`node_modules/${paket}`];
    assert.ok(tidakLebihLama(version, batas), `${paket} ${version} lebih lama dari ${batas}`);
  }
});

test('Badan JSON di atas 1 MB ditolak 413, dan yang di bawahnya tetap dibaca', async () => {
  const lebih = await kirim(JSON_H, JSON.stringify({ nama_pengguna: 'x', isi: 'a'.repeat(SATU_MB) }));
  assert.equal(lebih.status, 413);
  assert.equal(lebih.kode, 'BERKAS_TERLALU_BESAR');
  const kurang = await kirim(JSON_H, JSON.stringify({ nama_pengguna: `tidak_ada_${acak()}`, kata_sandi: 'sandiujiaman1', isi: 'a'.repeat(SATU_MB - 300) }));
  assert.notEqual(kurang.status, 413);
});

test('Badan formulir di atas 1 MB ditolak 413', async () => {
  const hasil = await kirim({ 'Content-Type': 'application/x-www-form-urlencoded' }, `a=${'b'.repeat(SATU_MB + 10)}`);
  assert.equal(hasil.status, 413);
  assert.equal(hasil.kode, 'BERKAS_TERLALU_BESAR');
});

test('JSON rusak ditolak 400, dan isinya tidak dipantulkan', async () => {
  const hasil = await kirim(JSON_H, '{"kata_sandi":"RAHASIA016"');
  assert.equal(hasil.status, 400);
  assert.equal(hasil.kode, 'VALIDASI_GAGAL');
  assert.ok(!hasil.teks.includes('RAHASIA016'));
});

test('Jenis konten tak dikenal tidak dibaca sebagai JSON', async () => {
  const hasil = await kirim({ 'Content-Type': 'text/plain' }, kredensial());
  assert.equal(hasil.status, 400);
  assert.equal(hasil.kode, 'VALIDASI_GAGAL');
});

test('Badan gzip dan deflate tetap dibaca', async () => {
  for (const [encoding, kompres] of [['gzip', zlib.gzipSync], ['deflate', zlib.deflateSync]]) {
    const hasil = await kirim({ ...JSON_H, 'Content-Encoding': encoding }, kompres(kredensial()));
    assert.equal(hasil.status, 401, encoding);
    assert.equal(hasil.kode, 'KREDENSIAL_SALAH', encoding);
  }
});

test('Sisa byte yang datang sesudah badan terkompresi tidak menjatuhkan server', async () => {
  const status = await new Promise((selesai, gagal) => {
    // Nol sesudah gzip membuat dekompresor berakhir lebih dulu. Sisa berikutnya tiba di dekompresor yang sudah selesai.
    const req = http.request(`${baseUrl}${MASUK}`, { method: 'POST', headers: { ...JSON_H, 'Content-Encoding': 'gzip', 'Transfer-Encoding': 'chunked' } }, (res) => {
      res.resume();
      res.on('end', () => selesai(res.statusCode));
    });
    req.on('error', gagal);
    req.write(Buffer.concat([zlib.gzipSync(kredensial()), Buffer.alloc(16)]));
    setTimeout(() => {
      req.write(Buffer.alloc(4096, 0x41));
      req.end();
    }, 150);
  });
  assert.equal(status, 401);
  await new Promise((r) => setTimeout(r, 150));
  assert.equal((await fetch(`${baseUrl}/api/v1/sehat`)).status, 200);
});

test('Di balik satu proxy, kuota mengikuti IP yang dicatat proxy, bukan yang dikarang klien', async () => {
  const a1 = await sisaKuota('198.51.100.1, 203.0.113.30');
  const a2 = await sisaKuota('198.51.100.2, 203.0.113.30');
  assert.equal(a2, a1 - 1, 'alamat karangan di depan tidak boleh memberi kuota baru');
  const b1 = await sisaKuota('198.51.100.1, 203.0.113.31');
  assert.equal(b1, a1, 'klien lain punya kuota sendiri');
  const c1 = await sisaKuota('2001:db8::1');
  assert.equal(c1, a1, 'klien IPv6 punya kuota sendiri');
});

test('Unggahan hanya di memori, dan yang ditolak tidak meninggalkan berkas', async () => {
  for (const rel of ['src/modul/butir-bukti/butir-bukti.rute.js', 'src/modul/modul/modul.rute.js']) {
    const sumber = fs.readFileSync(path.join(AKAR, rel), 'utf8');
    assert.ok(sumber.includes('storage: multer.memoryStorage()'), rel);
    assert.doesNotMatch(sumber, /\bdest:/, rel);
  }

  const { json } = await daftarPenggunaBaru(baseUrl, { versi_kebijakan: versiKebijakan });
  const auth = { Authorization: `Bearer ${json.data.token}` };
  const buat = await fetch(`${baseUrl}/api/v1/butir-bukti`, { method: 'POST', headers: { ...auth, ...JSON_H }, body: JSON.stringify({ judul: 'Karya uji', jenis: 'karya' }) });
  const butirId = (await buat.json()).data.id;
  const unggah = async (isi, nama, tipe) => {
    const form = new FormData();
    form.append('foto', new Blob([isi], { type: tipe }), nama);
    return (await fetch(`${baseUrl}/api/v1/butir-bukti/${butirId}/foto`, { method: 'POST', headers: auth, body: form })).status;
  };
  assert.equal(await unggah(Buffer.concat([foto.JPEG, Buffer.alloc(5 * SATU_MB - foto.JPEG.length + 1)]), 'besar.jpg', 'image/jpeg'), 413);
  assert.equal(await unggah(foto.heic(), 'IMG.HEIC', 'image/heic'), 415);
  assert.equal(await unggah(Buffer.from('ini bukan foto'), 'foto.jpg', 'image/jpeg'), 415);
  assert.deepEqual(semuaBerkas(DIREKTORI), []);
});
