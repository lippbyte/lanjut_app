// tests/progres-beranda.test.js
// Pengujian otomatis LANJUT_067 / LANJUT_068:
// - Progres Beranda 3 langkah (tanpa isi_kelas)
// - Skenario bertahap: 0 dari 3 -> 1 dari 3 -> 2 dari 3 -> 3 dari 3
// - Cermin: daftar langkah di LANJUT_App/lib/beranda.ts (yang dipakai app)
//   sama dengan src/util/beranda.js (yang diuji di sini)
// - Isolasi lintas akun: progres Akun A tidak berubah oleh aktivitas Akun B
//
// Uji mutasi dilakukan pada kode sumber (cabut langkah coba_latihan di
// src/util/beranda.js, jalankan berkas ini, kembalikan), bukan dengan
// fungsi tiruan di dalam tes. Hasilnya dicatat di laporan LANJUT_068.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const { hitungJumlahCentang, hitungProgresBeranda } = require('../src/util/beranda');

const LANGKAH = ['isi_prodi_impian', 'centang_daftar_periksa', 'coba_latihan'];

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

function idSelesai(p) {
  return p.langkah.filter((l) => l.selesai).map((l) => l.id);
}

// Progres dihitung dari data server dengan cara yang sama seperti
// LinimasaScreen: prodi dari /auth/saya, centang = butir /kemajuan dan butir
// pribadi yang punya selesai_pada (LANJUT_070), latihan = jumlah sesi di
// /sesi-latihan. Tes di berkas ini memakai jalur PUT /kemajuan (kelas 12);
// jalur butir pribadi ada di progres-butir-pribadi.test.js.
async function progresDariServer(token) {
  const profil = await panggil('GET', '/auth/saya', token);
  const kemajuan = await panggil('GET', '/kemajuan', token);
  const pribadi = await panggil('GET', '/butir-pribadi', token);
  const sesi = await panggil('GET', '/sesi-latihan', token);
  assert.equal(profil.status, 200);
  assert.equal(kemajuan.status, 200);
  assert.equal(pribadi.status, 200);
  assert.equal(sesi.status, 200);
  const jumlahCentang = hitungJumlahCentang({ kemajuan: kemajuan.json.data, butirPribadi: pribadi.json.data });
  const jumlahLatihan = sesi.json.data.length;
  return {
    jumlahCentang,
    jumlahLatihan,
    progres: hitungProgresBeranda({
      prodiImpian: profil.json.data.prodi_impian,
      jumlahCentang,
      jumlahLatihan,
    }),
  };
}

async function isiProdi(token, prodi) {
  const res = await panggil('PATCH', '/pengguna/saya', token, { prodi_impian: prodi });
  assert.equal(res.status, 200);
}

async function centangSatu(token) {
  const checklist = await panggil('GET', '/konten/checklist?kelas=12&jalur=SNBP');
  assert.equal(checklist.status, 200);
  const butirId = checklist.json.data.kategori[0].butir[0].id;
  const res = await panggil('PUT', `/kemajuan/${encodeURIComponent(butirId)}`, token);
  assert.equal(res.status, 200);
}

async function cobaLatihan(token) {
  const sesiId = 'sesi-068-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  const mulai = await panggil('POST', '/sesi-latihan', token, {
    id: sesiId,
    mapel_fokus_id: 'matematika',
    jumlah_kartu_direncanakan: 5,
    dimulai_pada: new Date().toISOString(),
    asal_mula: 'arsip',
  });
  assert.equal(mulai.status, 201);
  const selesai = await panggil('PATCH', `/sesi-latihan/${encodeURIComponent(sesiId)}`, token, {
    selesai_pada: new Date().toISOString(),
  });
  assert.equal(selesai.status, 200);
}

describe('LANJUT_067 §A: Skenario Bertahap Progres (0, 1, 2, 3 dari 3)', () => {
  test('Pengguna baru tampil 0 dari 3 (bukan 1 dari 4)', () => {
    const p = hitungProgresBeranda({
      prodiImpian: null,
      jumlahCentang: 0,
      jumlahLatihan: 0,
      kelas: '10', // meskipun kelas terisi dari onboarding, tidak lagi dihitung
    });
    assert.equal(p.selesai, 0);
    assert.equal(p.total, 3);
    assert.deepEqual(p.langkah.map((l) => l.id), LANGKAH);
    assert.ok(!p.langkah.some((l) => l.id === 'isi_kelas'), 'isi_kelas tidak boleh ada');
  });

  test('Setelah mengisi prodi impian: 1 dari 3', () => {
    const p = hitungProgresBeranda({ prodiImpian: 'kedokteran', jumlahCentang: 0, jumlahLatihan: 0 });
    assert.equal(p.selesai, 1);
    assert.equal(p.total, 3);
    assert.deepEqual(idSelesai(p), ['isi_prodi_impian']);
  });

  test('Setelah centang daftar periksa: 2 dari 3', () => {
    const p = hitungProgresBeranda({ prodiImpian: 'kedokteran', jumlahCentang: 1, jumlahLatihan: 0 });
    assert.equal(p.selesai, 2);
    assert.equal(p.total, 3);
    assert.deepEqual(idSelesai(p), ['isi_prodi_impian', 'centang_daftar_periksa']);
  });

  test('Setelah latihan: 3 dari 3', () => {
    const p = hitungProgresBeranda({ prodiImpian: 'kedokteran', jumlahCentang: 2, jumlahLatihan: 1 });
    assert.equal(p.selesai, 3);
    assert.equal(p.total, 3);
    assert.deepEqual(idSelesai(p), LANGKAH);
  });

  test('Latihan saja tanpa langkah lain: 1 dari 3, hanya coba_latihan', () => {
    const p = hitungProgresBeranda({ prodiImpian: '  ', jumlahCentang: 0, jumlahLatihan: 1 });
    assert.equal(p.selesai, 1);
    assert.equal(p.total, 3);
    assert.deepEqual(idSelesai(p), ['coba_latihan']);
  });
});

describe('LANJUT_068: Cermin langkah progres di app (lib/beranda.ts)', () => {
  test('Daftar id langkah di lib/beranda.ts sama dengan src/util/beranda.js', () => {
    const sumber = fs.readFileSync(path.join(__dirname, '../../lib/beranda.ts'), 'utf8');
    const awal = sumber.indexOf('export function hitungProgresBeranda');
    assert.ok(awal >= 0, 'hitungProgresBeranda harus ada di lib/beranda.ts');
    const akhir = sumber.indexOf('\n}\n', awal);
    const badan = sumber.slice(awal, akhir === -1 ? undefined : akhir);
    const idApp = [...badan.matchAll(/id:\s*'([a-z_]+)'/g)].map((m) => m[1]);
    assert.deepEqual(idApp, LANGKAH);
    assert.deepEqual(hitungProgresBeranda({}).langkah.map((l) => l.id), idApp);
  });
});

describe('LANJUT_067 §A: Tes Integrasi Lintas Akun Nyata di Server', () => {
  test('Alur bertahap Akun A (0 -> 1 -> 2 -> 3) dan progres A tidak berubah oleh Akun B', async () => {
    const { json: daftarA } = await daftarPenggunaBaru(baseUrl, { kelas: '12' });
    const { json: daftarB } = await daftarPenggunaBaru(baseUrl, { kelas: '10' });
    const tokenA = daftarA.data.token;
    const tokenB = daftarB.data.token;

    // Tahap 0: pengguna baru -> 0 dari 3, untuk kedua akun
    const a0 = await progresDariServer(tokenA);
    assert.equal(a0.progres.selesai, 0, 'Akun A baru harus 0 dari 3');
    assert.equal(a0.progres.total, 3);
    const b0 = await progresDariServer(tokenB);
    assert.equal(b0.progres.selesai, 0, 'Akun B baru harus 0 dari 3');

    // Tahap 1: A mengisi prodi impian -> 1 dari 3
    await isiProdi(tokenA, 'farmasi');
    const a1 = await progresDariServer(tokenA);
    assert.equal(a1.progres.selesai, 1, 'Setelah isi prodi harus 1 dari 3');
    assert.deepEqual(idSelesai(a1.progres), ['isi_prodi_impian']);

    // B menyelesaikan ketiga langkah -> B 3 dari 3
    await isiProdi(tokenB, 'kedokteran');
    await centangSatu(tokenB);
    await cobaLatihan(tokenB);
    const b3 = await progresDariServer(tokenB);
    assert.equal(b3.progres.selesai, 3, 'Akun B harus 3 dari 3');

    // A dibaca ulang dari server: tetap 1 dari 3, tanpa centang/latihan B
    const a1Ulang = await progresDariServer(tokenA);
    assert.equal(a1Ulang.progres.selesai, 1, 'Progres Akun A tidak boleh berubah oleh Akun B');
    assert.deepEqual(idSelesai(a1Ulang.progres), ['isi_prodi_impian']);
    assert.equal(a1Ulang.jumlahCentang, 0, 'Centang Akun B tidak boleh bocor ke Akun A');
    assert.equal(a1Ulang.jumlahLatihan, 0, 'Latihan Akun B tidak boleh bocor ke Akun A');

    // Tahap 2: A mencentang -> 2 dari 3
    await centangSatu(tokenA);
    const a2 = await progresDariServer(tokenA);
    assert.equal(a2.progres.selesai, 2, 'Setelah centang harus 2 dari 3');
    assert.deepEqual(idSelesai(a2.progres), ['isi_prodi_impian', 'centang_daftar_periksa']);

    // Tahap 3: A mencoba latihan -> 3 dari 3
    await cobaLatihan(tokenA);
    const a3 = await progresDariServer(tokenA);
    assert.equal(a3.progres.selesai, 3, 'Setelah latihan harus 3 dari 3');
    assert.deepEqual(idSelesai(a3.progres), LANGKAH);
    assert.equal(a3.jumlahLatihan, 1, 'Akun A hanya punya sesi latihannya sendiri');

    // Data B tidak bertambah oleh aktivitas A
    const b3Ulang = await progresDariServer(tokenB);
    assert.equal(b3Ulang.jumlahCentang, 1);
    assert.equal(b3Ulang.jumlahLatihan, 1);
  });
});
