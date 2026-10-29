// Uji otorisasi kepemilikan kartu — WAJIB per docs/SDD-Backend-Foundation.md
// §8.4, §9.4: pengguna A tidak bisa membaca/menyunting/menghapus kartu
// pengguna B, dan hasilnya 404 (bukan 403).

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');

let server;
let baseUrl;
let a; // { token, ... }
let b;

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);

  const daftarA = await daftarPenggunaBaru(baseUrl);
  const daftarB = await daftarPenggunaBaru(baseUrl);
  a = { token: daftarA.json.data.token, id: daftarA.json.data.pengguna.id };
  b = { token: daftarB.json.data.token, id: daftarB.json.data.pengguna.id };
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

async function buatKartu(token, override) {
  const res = await fetch(`${baseUrl}/api/v1/kartu`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(
      Object.assign(
        { mapel_id: 'matematika', judul: 'Kartu uji', isi: 'Isi uji', jawaban: '42' },
        override || {}
      )
    ),
  });
  return { status: res.status, json: await res.json() };
}

test('POST /kartu memaksa sumber=pengguna dan pemilik_id=pengguna berjalan, mengabaikan body', async () => {
  const { status, json } = await buatKartu(a.token, {
    sumber: 'mitra', // HARUS diabaikan
    pemilik_id: b.id, // HARUS diabaikan
  });
  assert.equal(status, 201);
  assert.equal(json.data.sumber, 'pengguna');
  assert.equal(json.data.pemilik_id, a.id);
});

test('GET /kartu milik A tidak pernah memuat kartu privat B', async () => {
  const kartuB = await buatKartu(b.token, { judul: 'Rahasia B' });
  const res = await fetch(`${baseUrl}/api/v1/kartu`, {
    headers: { Authorization: `Bearer ${a.token}` },
  });
  const json = await res.json();
  const idKartuB = kartuB.json.data.id;
  assert.ok(!json.data.some((k) => k.id === idKartuB));
});

test('PATCH kartu milik orang lain -> 404 TIDAK_DITEMUKAN (bukan 403)', async () => {
  const kartuA = await buatKartu(a.token, { judul: 'Punya A' });
  const res = await fetch(`${baseUrl}/api/v1/kartu/${kartuA.json.data.id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${b.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ judul: 'diretas oleh B' }),
  });
  const json = await res.json();
  assert.equal(res.status, 404);
  assert.equal(json.galat.kode, 'TIDAK_DITEMUKAN');

  // Pastikan kartu A benar-benar tidak berubah.
  const cek = await fetch(`${baseUrl}/api/v1/kartu`, {
    headers: { Authorization: `Bearer ${a.token}` },
  });
  const cekJson = await cek.json();
  const masihUtuh = cekJson.data.find((k) => k.id === kartuA.json.data.id);
  assert.equal(masihUtuh.judul, 'Punya A');
});

test('DELETE kartu milik orang lain -> 404 TIDAK_DITEMUKAN, kartu tidak terhapus', async () => {
  const kartuA = await buatKartu(a.token, { judul: 'Punya A lagi' });
  const res = await fetch(`${baseUrl}/api/v1/kartu/${kartuA.json.data.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${b.token}` },
  });
  const json = await res.json();
  assert.equal(res.status, 404);
  assert.equal(json.galat.kode, 'TIDAK_DITEMUKAN');

  const cek = await fetch(`${baseUrl}/api/v1/kartu`, {
    headers: { Authorization: `Bearer ${a.token}` },
  });
  const cekJson = await cek.json();
  assert.ok(cekJson.data.some((k) => k.id === kartuA.json.data.id));
});

test('PATCH/DELETE kartu dengan id yang sama sekali tidak ada -> 404', async () => {
  const patch = await fetch(`${baseUrl}/api/v1/kartu/tidak-ada-id-ini`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${a.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ judul: 'apa saja' }),
  });
  assert.equal(patch.status, 404);

  const hapus = await fetch(`${baseUrl}/api/v1/kartu/tidak-ada-id-ini`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${a.token}` },
  });
  assert.equal(hapus.status, 404);
});

// LANJUT_040: kartu resmi hanya terlihat bila sudah terverifikasi penuh. Benih
// berisi 12 kartu kurasi yang belum diverifikasi, jadi yang dicek di sini:
// apa pun yang dikirim untuk ?sumber=resmi adalah kartu resmi terverifikasi.
// Kasus "terverifikasi tampil ke semua akun" ada di kartu-kurasi.test.js.
// Himpunan terverifikasi dibaca sebelum DAN sesudah permintaan: file test lain
// (kartu-kurasi, verifikasi-konten) menyisipkan lalu menghapus/membatalkan
// kurasi terverifikasi sementara secara paralel.
test('kartu resmi (sumber=resmi) yang tampil hanya yang terverifikasi', async () => {
  const kurasiTerverifikasi = async () => {
    const [baris] = await pool.execute(
      `SELECT id FROM kartu WHERE sumber = 'resmi' AND status_verifikasi = 'terverifikasi' AND diperiksa_pada IS NOT NULL`
    );
    return baris.map((t) => t.id);
  };
  const sebelum = await kurasiTerverifikasi();
  const res = await fetch(`${baseUrl}/api/v1/kartu?sumber=resmi`, {
    headers: { Authorization: `Bearer ${b.token}` },
  });
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.ok(json.data.every((k) => k.sumber === 'resmi'));
  const sah = new Set([...sebelum, ...(await kurasiTerverifikasi())]);
  assert.ok(json.data.every((k) => sah.has(k.id)), 'kartu resmi belum terverifikasi terkirim');
});

test('kartu & data pribadi tanpa token -> 401 TIDAK_MASUK', async () => {
  const res = await fetch(`${baseUrl}/api/v1/kartu`);
  const json = await res.json();
  assert.equal(res.status, 401);
  assert.equal(json.galat.kode, 'TIDAK_MASUK');
});
