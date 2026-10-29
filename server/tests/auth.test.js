// Uji integrasi auth — docs/SDD-Backend-Foundation.md §9.4.
// Butuh MySQL nyata (§3.6 migrasi sudah dijalankan). Lihat server/README.md.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool, acak } = require('./bantuan');

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

test('daftar: sukses membuat akun baru dan langsung mengembalikan token', async () => {
  const { status, json, namaPengguna } = await daftarPenggunaBaru(baseUrl);
  assert.equal(status, 201);
  assert.equal(json.ok, true);
  assert.ok(json.data.token);
  assert.equal(json.data.pengguna.nama_pengguna, namaPengguna);
  // Kata sandi TIDAK PERNAH ikut di objek pengguna (§8.1).
  assert.equal(json.data.pengguna.kata_sandi_hash, undefined);
  assert.equal(json.data.pengguna.kata_sandi, undefined);
});

test('daftar: nama_pengguna yang sudah dipakai ditolak 409', async () => {
  const pertama = await daftarPenggunaBaru(baseUrl);
  const res = await fetch(`${baseUrl}/api/v1/auth/daftar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nama_pengguna: pertama.namaPengguna,
      kata_sandi: 'sandilainnya1',
    }),
  });
  const json = await res.json();
  assert.equal(res.status, 409);
  assert.equal(json.galat.kode, 'NAMA_PENGGUNA_DIPAKAI');
});

// LANJUT_083c: dulu "email dipakai → 400 EMAIL_DIPAKAI" (C-3). Jawaban itu membocorkan email
// yang terdaftar dan akunnya dibuat tanpa bukti email. Kini daftar dengan email hanya lewat kode
// (tests/daftar-email.test.js, termasuk: email terdaftar tidak dibuatkan akun kedua).
test('daftar langsung dengan email ditolak 400 tanpa membuat akun (LANJUT_083c)', async () => {
  const nama = `uji_${acak()}`;
  const res = await fetch(`${baseUrl}/api/v1/auth/daftar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama_pengguna: nama, kata_sandi: 'sandiujiaman1', email: `${nama}@contoh.test` }),
  });
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.galat.kode, 'VALIDASI_GAGAL');
  assert.ok(json.galat.medan.email);
  const [baris] = await pool.execute('SELECT id FROM pengguna WHERE nama_pengguna = ?', [nama]);
  assert.equal(baris.length, 0);
});

test('daftar: kata sandi terlalu pendek ditolak VALIDASI_GAGAL', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/daftar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama_pengguna: `uji_${acak()}`, kata_sandi: '123' }),
  });
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.galat.kode, 'VALIDASI_GAGAL');
  assert.ok(json.galat.medan.kata_sandi);
});

test('daftar: prodi_impian valid -> 201, dan medan respons bernama prodi_impian (C-1)', async () => {
  const { status, json } = await daftarPenggunaBaru(baseUrl, { prodi_impian: 'farmasi' });
  assert.equal(status, 201);
  assert.equal(json.data.pengguna.prodi_impian, 'farmasi');
  assert.equal(json.data.pengguna.prodi_tujuan, undefined);
});

test('daftar: prodi_impian "belum" -> 201, tersimpan sebagai null (bukan galat validasi)', async () => {
  const { status, json } = await daftarPenggunaBaru(baseUrl, { prodi_impian: 'belum' });
  assert.equal(status, 201);
  assert.equal(json.data.pengguna.prodi_impian, null);
});

test('daftar: prodi_impian tidak dikenal -> 400 VALIDASI_GAGAL, bukan 500 (C-2)', async () => {
  const namaPengguna = `uji_${acak()}`;
  const res = await fetch(`${baseUrl}/api/v1/auth/daftar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nama_pengguna: namaPengguna,
      kata_sandi: 'sandiujiaman1',
      prodi_impian: 'tidak-ada',
    }),
  });
  const json = await res.json();
  assert.equal(res.status, 400);
  assert.equal(json.galat.kode, 'VALIDASI_GAGAL');
  assert.ok(json.galat.medan.prodi_impian);
});

test('GET /auth/saya: medan prodi_impian (bukan prodi_tujuan) muncul di profil (C-1)', async () => {
  const { json: daftarJson } = await daftarPenggunaBaru(baseUrl, { prodi_impian: 'akuntansi' });
  const token = daftarJson.data.token;
  const res = await fetch(`${baseUrl}/api/v1/auth/saya`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.data.prodi_impian, 'akuntansi');
  assert.equal(json.data.prodi_tujuan, undefined);
});

test('daftar: nama_pengguna disimpan huruf kecil semua', async () => {
  const namaAsli = `UJI_${acak().toUpperCase()}`;
  const res = await fetch(`${baseUrl}/api/v1/auth/daftar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama_pengguna: namaAsli, kata_sandi: 'sandiujiaman1' }),
  });
  const json = await res.json();
  assert.equal(res.status, 201);
  assert.equal(json.data.pengguna.nama_pengguna, namaAsli.toLowerCase());
});

test('masuk: sukses dengan kredensial benar', async () => {
  const { namaPengguna, kataSandi } = await daftarPenggunaBaru(baseUrl);
  const res = await fetch(`${baseUrl}/api/v1/auth/masuk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama_pengguna: namaPengguna, kata_sandi: kataSandi }),
  });
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.ok(json.data.token);
});

test('masuk: kata sandi salah -> 401 KREDENSIAL_SALAH', async () => {
  const { namaPengguna } = await daftarPenggunaBaru(baseUrl);
  const res = await fetch(`${baseUrl}/api/v1/auth/masuk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama_pengguna: namaPengguna, kata_sandi: 'salahtotal1' }),
  });
  const json = await res.json();
  assert.equal(res.status, 401);
  assert.equal(json.galat.kode, 'KREDENSIAL_SALAH');
});

test('masuk: akun tidak ada -> juga 401 KREDENSIAL_SALAH (bukan info lain)', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/masuk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama_pengguna: `tidak_ada_${acak()}`, kata_sandi: 'apasaja123' }),
  });
  const json = await res.json();
  assert.equal(res.status, 401);
  assert.equal(json.galat.kode, 'KREDENSIAL_SALAH');
});

test('GET /auth/saya tanpa token -> 401 TIDAK_MASUK', async () => {
  const res = await fetch(`${baseUrl}/api/v1/auth/saya`);
  const json = await res.json();
  assert.equal(res.status, 401);
  assert.equal(json.galat.kode, 'TIDAK_MASUK');
});

test('GET /auth/saya dengan token valid -> profil tanpa hash sandi', async () => {
  const { json: daftarJson } = await daftarPenggunaBaru(baseUrl);
  const token = daftarJson.data.token;
  const res = await fetch(`${baseUrl}/api/v1/auth/saya`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await res.json();
  assert.equal(res.status, 200);
  assert.equal(json.data.nama_pengguna, daftarJson.data.pengguna.nama_pengguna);
  assert.equal(json.data.kata_sandi_hash, undefined);
});

test('keluar: mencabut token yang dipakai, permintaan berikutnya 401', async () => {
  const { json: daftarJson } = await daftarPenggunaBaru(baseUrl);
  const token = daftarJson.data.token;

  const keluar = await fetch(`${baseUrl}/api/v1/auth/keluar`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(keluar.status, 200);

  const setelahKeluar = await fetch(`${baseUrl}/api/v1/auth/saya`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const json = await setelahKeluar.json();
  assert.equal(setelahKeluar.status, 401);
  assert.equal(json.galat.kode, 'TIDAK_MASUK');
});

test('ubah-sandi: sandi lama salah ditolak, tidak mencabut sesi', async () => {
  const { json: daftarJson } = await daftarPenggunaBaru(baseUrl);
  const token = daftarJson.data.token;

  const res = await fetch(`${baseUrl}/api/v1/auth/ubah-sandi`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ kata_sandi_lama: 'salahsandi1', kata_sandi_baru: 'sandibaruaman1' }),
  });
  const json = await res.json();
  assert.equal(res.status, 401);
  assert.equal(json.galat.kode, 'KREDENSIAL_SALAH');
});

test('ubah-sandi: sukses -> sesi lama ikut tercabut', async () => {
  const { json: daftarJson, kataSandi } = await daftarPenggunaBaru(baseUrl);
  const token = daftarJson.data.token;

  const res = await fetch(`${baseUrl}/api/v1/auth/ubah-sandi`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ kata_sandi_lama: kataSandi, kata_sandi_baru: 'sandibaruaman1' }),
  });
  assert.equal(res.status, 200);

  const cekTokenLama = await fetch(`${baseUrl}/api/v1/auth/saya`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.equal(cekTokenLama.status, 401);
});

test('percobaan_masuk: 5 kali gagal berturut -> akun terkunci sementara (429)', async () => {
  const { namaPengguna } = await daftarPenggunaBaru(baseUrl);

  let terakhir;
  for (let i = 0; i < 5; i += 1) {
    terakhir = await fetch(`${baseUrl}/api/v1/auth/masuk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nama_pengguna: namaPengguna, kata_sandi: 'salahterus1' }),
    });
  }
  // Percobaan ke-6, walau sandinya benar sekalipun, harus tetap terkunci.
  const percobaanKe6 = await fetch(`${baseUrl}/api/v1/auth/masuk`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nama_pengguna: namaPengguna, kata_sandi: 'sandiujiaman1' }),
  });
  const json = await percobaanKe6.json();
  assert.equal(percobaanKe6.status, 429);
  assert.equal(json.galat.kode, 'TERLALU_SERING');
});
