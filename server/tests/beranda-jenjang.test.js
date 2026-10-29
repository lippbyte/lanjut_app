// tests/beranda-jenjang.test.js
// Pengujian otomatis Beranda per jenjang, judul netral Cerita Alumni,
// dan tes lintas akun wajib (LANJUT_064).

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const {
  kelompokJenjang,
  daftarKartuBeranda,
} = require('../src/util/beranda');

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

async function panggil(metode, path, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method: metode,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

describe('LANJUT_064: Logika Kartu Beranda per Jenjang', () => {
  // LANJUT_075: kartu /eksplorasi-tujuan di grid bernama "Eksplorasi Kampus".
  // LANJUT_075b: kartu Ngobrol dihapus dari grid semua jenjang (tab tengah).
  test('SMP (kelas 7–9): Jalur Saya disembunyikan, diganti kartu Jenjang Saya (Eksplorasi Kampus, Gaya Belajar) + kartu umum', () => {
    for (const k of ['7', '8', '9']) {
      const kartu = daftarKartuBeranda(k);
      const judul = kartu.map((x) => x.judul);

      assert.deepEqual(judul, [
        'Eksplorasi Kampus',
        'Gaya Belajar',
        'Arsip Belajar',
        'Level-In',
        'Cerita Alumni',
      ]);

      // Verifikasi eksplisit: kartu kelas 12 TIDAK boleh muncul
      assert.ok(!judul.includes('Jalur Saya'), `kelas ${k} tidak boleh melihat Jalur Saya`);
      assert.ok(!judul.includes('Pilih Mapel'), `kelas ${k} tidak boleh melihat Pilih Mapel di Beranda`);
      assert.ok(!judul.includes('Daftar Periksa'), `kelas ${k} tidak boleh melihat Daftar Periksa di Beranda`);
      assert.ok(!judul.includes('Cerita Alumni SMK'), 'judul harus netral');

      // Tidak ada kartu kosong
      for (const item of kartu) {
        assert.ok(item.judul && item.keterangan && item.ikon && item.href);
      }
    }
  });

  test('Kelas 10–11: kartu Jenjang Saya (Pilih Mapel, Eksplorasi Kampus, Gaya Belajar) + kartu umum (Arsip, Level-In, Daftar Periksa, Cerita Alumni)', () => {
    for (const k of ['10', '11']) {
      const kartu = daftarKartuBeranda(k);
      const judul = kartu.map((x) => x.judul);

      assert.deepEqual(judul, [
        'Pilih Mapel',
        'Eksplorasi Kampus',
        'Gaya Belajar',
        'Arsip Belajar',
        'Level-In',
        'Daftar Periksa',
        'Cerita Alumni',
      ]);

      // Verifikasi eksplisit: Jalur Saya TIDAK boleh muncul
      assert.ok(!judul.includes('Jalur Saya'), `kelas ${k} tidak boleh melihat Jalur Saya`);
      assert.ok(!judul.includes('Cerita Alumni SMK'), 'judul harus netral');

      // Tidak ada kartu kosong
      for (const item of kartu) {
        assert.ok(item.judul && item.keterangan && item.ikon && item.href);
      }
    }
  });

  // LANJUT_074: kartu /cek-posisi kini berlabel "Jalur Saya". LANJUT_075: Eksplorasi
  // Kampus ditambah sesudahnya; urutan & isi lain tetap.
  test('Kelas 12: Jalur Saya, Eksplorasi Kampus, Arsip, Level-In, Cerita Alumni netral', () => {
    const kartu = daftarKartuBeranda('12');
    const judul = kartu.map((x) => x.judul);

    assert.deepEqual(judul, [
      'Jalur Saya',
      'Eksplorasi Kampus',
      'Arsip Belajar',
      'Level-In',
      'Cerita Alumni',
    ]);

    // Verifikasi Jalur Saya ADA untuk kelas 12, dan tetap menuju /cek-posisi
    assert.ok(judul.includes('Jalur Saya'));
    assert.equal(kartu.find((x) => x.judul === 'Jalur Saya').href, '/cek-posisi');
    assert.ok(!judul.includes('Cerita Alumni SMK'), 'judul harus netral');
  });

  test('Akun tanpa kelas / fallback: hanya kartu umum tanpa galat', () => {
    for (const k of [null, undefined, '']) {
      const kartu = daftarKartuBeranda(k);
      const judul = kartu.map((x) => x.judul);

      assert.deepEqual(judul, [
        'Arsip Belajar',
        'Level-In',
        'Cerita Alumni',
      ]);
    }
  });
});

describe('LANJUT_064: Endpoint Cerita Alumni & Cek Ketersediaan Filter', () => {
  test('GET /konten/cerita-alumni: mengembalikan data tayang 200 OK', async () => {
    const { status, json } = await panggil('GET', '/konten/cerita-alumni');
    assert.equal(status, 200);
    assert.equal(json.ok, true);
    assert.ok(Array.isArray(json.data));
  });

  test('Filter per jenjang / jenis_sekolah di endpoint cerita-alumni belum tersedia (sesuai LANJUT_064 §B, tidak dibuat baru)', async () => {
    const { json: tanpaFilter } = await panggil('GET', '/konten/cerita-alumni');
    const { json: denganFilterSmp } = await panggil('GET', '/konten/cerita-alumni?jenjang=SMP');
    const { json: denganFilterKelas } = await panggil('GET', '/konten/cerita-alumni?kelas=7');

    // Endpoint mengabaikan query param asing dan mengembalikan baris yang sama persis
    assert.equal(tanpaFilter.data.length, denganFilterSmp.data.length);
    assert.equal(tanpaFilter.data.length, denganFilterKelas.data.length);
  });
});

describe('LANJUT_064: Tes Lintas Akun (Cross-Account Isolation)', () => {
  test('Akun Kelas 7 vs Akun Kelas 12: Akun kelas 7 tidak melihat data kelas 12, sesi dan kartu terisolasi', async () => {
    // 1. Daftarkan akun SMP kelas 7
    const { json: daftarA } = await daftarPenggunaBaru(baseUrl, { kelas: '7' });
    const tokenA = daftarA.data.token;
    const profilA = (await panggil('GET', '/auth/saya', tokenA)).json.data;
    assert.equal(profilA.kelas, '7');
    assert.equal(profilA.jenis_sekolah, 'SMP');

    // 2. Daftarkan akun SMA/SMK kelas 12
    const { json: daftarB } = await daftarPenggunaBaru(baseUrl, { kelas: '12', jenis_sekolah: 'SMA' });
    const tokenB = daftarB.data.token;
    const profilB = (await panggil('GET', '/auth/saya', tokenB)).json.data;
    assert.equal(profilB.kelas, '12');
    assert.equal(profilB.jenis_sekolah, 'SMA');

    // 3. Verifikasi Beranda untuk Akun A (kelas 7)
    const kartuA = daftarKartuBeranda(profilA.kelas);
    const judulA = kartuA.map((x) => x.judul);
    assert.ok(!judulA.includes('Jalur Saya'), 'Akun A kelas 7 TIDAK boleh memiliki kartu Jalur Saya');
    assert.equal(kelompokJenjang(profilA.kelas), 'smp', 'Kelompok jenjang Akun A harus smp (bukan kelas12)');

    // 4. Verifikasi Beranda untuk Akun B (kelas 12)
    const kartuB = daftarKartuBeranda(profilB.kelas);
    const judulB = kartuB.map((x) => x.judul);
    assert.ok(judulB.includes('Jalur Saya'), 'Akun B kelas 12 memiliki kartu Jalur Saya');
    assert.equal(kelompokJenjang(profilB.kelas), 'kelas12', 'Kelompok jenjang Akun B harus kelas12');

    // 5. Isolasi modifikasi profil: Ubah kelas Akun A tidak merusak Akun B
    await panggil('PATCH', '/pengguna/saya', tokenA, { kelas: '8' });
    const profilASetelah = (await panggil('GET', '/auth/saya', tokenA)).json.data;
    const profilBSetelah = (await panggil('GET', '/auth/saya', tokenB)).json.data;

    assert.equal(profilASetelah.kelas, '8');
    assert.equal(profilBSetelah.kelas, '12', 'Akun B tetap kelas 12 tanpa terpengaruh Akun A');

    // 6. Kartu Akun A tetap SMP dan tidak melihat data kelas 12
    const kartuASetelah = daftarKartuBeranda(profilASetelah.kelas);
    assert.ok(!kartuASetelah.map((x) => x.judul).includes('Jalur Saya'));
  });
});
