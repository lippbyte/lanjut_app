// tests/progres-butir-pribadi.test.js
// Pengujian otomatis LANJUT_070:
// - Langkah centang_daftar_periksa dan penanda "sudah punya kemajuan"
//   menghitung /kemajuan DAN butir pribadi (hitungJumlahCentang)
// - Perilaku lib/beranda.ts (app) dibandingkan langsung dengan cerminnya
//   src/util/beranda.js, lewat muat-ts-app.js
// - Jalur butir pribadi lewat /butir-pribadi/:id/selesai, TANPA PUT /kemajuan
//   (jalur yang dipakai siswa kelas 7–11 di app)
// - Lintas akun: butir pribadi akun A tidak menaikkan progres akun B
//
// Tes 068 (progres-beranda.test.js) hanya membuktikan jalur API /kemajuan,
// yang di app hanya terjangkau kelas 12.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const { muatModulApp } = require('./muat-ts-app');
const cermin = require('../src/util/beranda');

const { hitungJumlahCentang, hitungProgresBeranda, apakahPunyaKemajuan } = cermin;

let server;
let baseUrl;
let prodiId;

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const prodi = await panggil('GET', '/konten/prodi');
  assert.equal(prodi.status, 200);
  assert.ok(prodi.json.data.length > 0, 'butuh minimal satu prodi di basis data uji');
  prodiId = prodi.json.data[0].id;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

async function panggil(metode, path, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method: metode,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

async function akunBaru(kelas, jenis) {
  const { status, json } = await daftarPenggunaBaru(baseUrl, { kelas, ...(jenis ? { jenis_sekolah: jenis } : {}) });
  assert.equal(status, 201, `daftar gagal: ${JSON.stringify(json)}`);
  return json.data.token;
}

const idSelesai = (p) => p.langkah.filter((l) => l.selesai).map((l) => l.id);

// Keadaan Beranda dihitung dari data server dengan cara yang sama seperti
// LinimasaScreen (LANJUT_070): profil, /kemajuan, /butir-pribadi,
// /sesi-latihan, dan /kartu?sumber=pengguna.
async function keadaanBeranda(token) {
  const [profil, kemajuan, pribadi, sesi, kartu] = await Promise.all([
    panggil('GET', '/auth/saya', token),
    panggil('GET', '/kemajuan', token),
    panggil('GET', '/butir-pribadi', token),
    panggil('GET', '/sesi-latihan', token),
    panggil('GET', '/kartu?sumber=pengguna', token),
  ]);
  for (const r of [profil, kemajuan, pribadi, sesi, kartu]) assert.equal(r.status, 200);
  const jumlahCentang = hitungJumlahCentang({ kemajuan: kemajuan.json.data, butirPribadi: pribadi.json.data });
  const jumlahLatihan = sesi.json.data.length;
  return {
    centangKemajuan: kemajuan.json.data.filter((k) => k.selesai_pada).length,
    butirPribadi: pribadi.json.data,
    jumlahCentang,
    progres: hitungProgresBeranda({ prodiImpian: profil.json.data.prodi_impian, jumlahCentang, jumlahLatihan }),
    punyaKemajuan: apakahPunyaKemajuan({ jumlahCentang, jumlahLatihan, jumlahKartu: kartu.json.data.length }),
  };
}

// "Simpan ke Daftar Periksa" dari Eksplorasi Tujuan: butir riset_kampus, belum tercentang.
async function simpanRisetKampus(token) {
  const res = await panggil('POST', '/butir-pribadi', token, { jenis: 'riset_kampus', prodi_id: prodiId });
  assert.equal(res.status, 201, JSON.stringify(res.json));
  assert.equal(res.json.data.selesai_pada, null);
  return res.json.data.id;
}

async function cobaLatihan(token) {
  const sesiId = 'sesi-070-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
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

describe('LANJUT_070 §A: hitungJumlahCentang membaca kemajuan DAN butir pribadi', () => {
  const SELESAI = { selesai_pada: '2026-10-13T08:00:00.000Z' };
  const BELUM = { selesai_pada: null };

  test('Tanpa data: 0', () => {
    assert.equal(hitungJumlahCentang({}), 0);
    assert.equal(hitungJumlahCentang({ kemajuan: null, butirPribadi: undefined }), 0);
    assert.equal(hitungJumlahCentang({ kemajuan: [BELUM], butirPribadi: [BELUM, BELUM] }), 0);
  });

  test('Hanya kemajuan (jalur kelas 12): tetap dihitung', () => {
    assert.equal(hitungJumlahCentang({ kemajuan: [SELESAI, BELUM], butirPribadi: [] }), 1);
  });

  test('Hanya butir pribadi (jalur kelas 7–11): dihitung', () => {
    assert.equal(hitungJumlahCentang({ kemajuan: [], butirPribadi: [BELUM, SELESAI] }), 1);
  });

  test('Keduanya dijumlah', () => {
    assert.equal(hitungJumlahCentang({ kemajuan: [SELESAI], butirPribadi: [SELESAI, SELESAI] }), 3);
  });

  test('Centang butir pribadi saja + prodi: 2 dari 3, dan kartu "Mulai dari Sini" hilang', () => {
    const jumlahCentang = hitungJumlahCentang({ kemajuan: [], butirPribadi: [SELESAI] });
    const p = hitungProgresBeranda({ prodiImpian: 'farmasi', jumlahCentang, jumlahLatihan: 0 });
    assert.equal(p.selesai, 2);
    assert.equal(p.total, 3);
    assert.deepEqual(idSelesai(p), ['isi_prodi_impian', 'centang_daftar_periksa']);
    assert.equal(apakahPunyaKemajuan({ jumlahCentang, jumlahLatihan: 0, jumlahKartu: 0 }), true);
  });
});

describe('LANJUT_070 §A: lib/beranda.ts (app) berperilaku sama dengan cermin server', () => {
  const app = muatModulApp('lib/beranda');
  const BARIS = [
    null,
    undefined,
    [],
    [{ selesai_pada: null }],
    [{ selesai_pada: '2026-10-13T08:00:00.000Z' }],
    [{ selesai_pada: 'a' }, { selesai_pada: null }, { selesai_pada: 'b' }],
  ];

  test('Fungsi progres ada di kedua sisi', () => {
    for (const nama of ['hitungJumlahCentang', 'hitungProgresBeranda', 'apakahPunyaKemajuan']) {
      assert.equal(typeof app[nama], 'function', `${nama} harus ada di lib/beranda.ts`);
      assert.equal(typeof cermin[nama], 'function', `${nama} harus ada di src/util/beranda.js`);
    }
  });

  test('App menghitung centang butir pribadi', () => {
    assert.equal(app.hitungJumlahCentang({ kemajuan: [], butirPribadi: [{ selesai_pada: 'x' }] }), 1);
    assert.equal(app.hitungJumlahCentang({ kemajuan: [{ selesai_pada: 'x' }], butirPribadi: [] }), 1);
  });

  test('hitungJumlahCentang sama untuk semua kombinasi kemajuan × butir pribadi', () => {
    for (const kemajuan of BARIS) {
      for (const butirPribadi of BARIS) {
        assert.equal(
          app.hitungJumlahCentang({ kemajuan, butirPribadi }),
          cermin.hitungJumlahCentang({ kemajuan, butirPribadi }),
          `beda untuk kemajuan=${JSON.stringify(kemajuan)} butirPribadi=${JSON.stringify(butirPribadi)}`
        );
      }
    }
  });

  test('hitungProgresBeranda dan apakahPunyaKemajuan sama untuk semua kombinasi', () => {
    for (const prodiImpian of [null, '', '  ', 'farmasi']) {
      for (const jumlahCentang of [0, 1, 2]) {
        for (const jumlahLatihan of [0, 1]) {
          const masukan = { prodiImpian, jumlahCentang, jumlahLatihan };
          assert.deepEqual(app.hitungProgresBeranda(masukan), cermin.hitungProgresBeranda(masukan));
          for (const jumlahKartu of [0, 1]) {
            const m = { jumlahCentang, jumlahLatihan, jumlahKartu };
            assert.equal(app.apakahPunyaKemajuan(m), cermin.apakahPunyaKemajuan(m));
          }
        }
      }
    }
    assert.equal(app.apakahPunyaKemajuan({}), cermin.apakahPunyaKemajuan({}));
  });
});

describe('LANJUT_070 §B: jalur butir pribadi lewat server (tanpa PUT /kemajuan)', () => {
  test('Akun kelas 10: 0 -> 1 -> 2 -> 3 dari 3 hanya lewat endpoint yang dipakai app', async () => {
    const token = await akunBaru('10', 'SMA');

    const s0 = await keadaanBeranda(token);
    assert.equal(s0.progres.selesai, 0, 'akun baru harus 0 dari 3');
    assert.equal(s0.progres.total, 3);
    assert.equal(s0.punyaKemajuan, false, 'akun baru melihat "Mulai dari Sini"');

    // Data Akun: isi prodi impian -> 1 dari 3
    const ubah = await panggil('PATCH', '/pengguna/saya', token, { prodi_impian: 'farmasi' });
    assert.equal(ubah.status, 200);
    const s1 = await keadaanBeranda(token);
    assert.equal(s1.progres.selesai, 1);
    assert.equal(s1.punyaKemajuan, false);

    // Eksplorasi Tujuan: "Simpan" -> butir pribadi belum tercentang, progres tetap
    const butirId = await simpanRisetKampus(token);
    const s1b = await keadaanBeranda(token);
    assert.equal(s1b.progres.selesai, 1, 'butir pribadi yang belum dicentang tidak dihitung');
    assert.equal(s1b.punyaKemajuan, false);

    // Daftar Periksa: centang butir pribadi -> 2 dari 3, "Mulai dari Sini" hilang
    const centang = await panggil('PUT', `/butir-pribadi/${encodeURIComponent(butirId)}/selesai`, token);
    assert.equal(centang.status, 200);
    const s2 = await keadaanBeranda(token);
    assert.equal(s2.centangKemajuan, 0, '/kemajuan tidak boleh tersentuh di jalur ini');
    assert.equal(s2.jumlahCentang, 1);
    assert.equal(s2.progres.selesai, 2, 'centang butir pribadi harus menaikkan progres ke 2 dari 3');
    assert.deepEqual(idSelesai(s2.progres), ['isi_prodi_impian', 'centang_daftar_periksa']);
    assert.equal(s2.punyaKemajuan, true, 'kartu "Mulai dari Sini" harus hilang');

    // Latihan -> 3 dari 3
    await cobaLatihan(token);
    const s3 = await keadaanBeranda(token);
    assert.equal(s3.progres.selesai, 3, 'akun kelas 10 harus bisa mencapai 3 dari 3');
    assert.deepEqual(idSelesai(s3.progres), ['isi_prodi_impian', 'centang_daftar_periksa', 'coba_latihan']);
    assert.equal(s3.centangKemajuan, 0);

    // Batal centang -> langkah centang tidak terpenuhi lagi
    const batal = await panggil('DELETE', `/butir-pribadi/${encodeURIComponent(butirId)}/selesai`, token);
    assert.equal(batal.status, 200);
    const s4 = await keadaanBeranda(token);
    assert.equal(s4.progres.selesai, 2);
    assert.deepEqual(idSelesai(s4.progres), ['isi_prodi_impian', 'coba_latihan']);

    // Butir tercentang yang dihapus (hapus lunak) tidak ikut dihitung
    assert.equal((await panggil('PUT', `/butir-pribadi/${encodeURIComponent(butirId)}/selesai`, token)).status, 200);
    assert.equal((await keadaanBeranda(token)).jumlahCentang, 1);
    assert.equal((await panggil('DELETE', `/butir-pribadi/${encodeURIComponent(butirId)}`, token)).status, 200);
    const s5 = await keadaanBeranda(token);
    assert.equal(s5.jumlahCentang, 0);
    assert.equal(s5.progres.selesai, 2);
  });
});

describe('LANJUT_070 §B: lintas akun butir pribadi', () => {
  test('Butir pribadi akun A tidak menaikkan progres akun B, dan B tidak bisa mencentangnya', async () => {
    const tokenA = await akunBaru('10', 'SMA');
    const tokenB = await akunBaru('7');

    const butirA = await simpanRisetKampus(tokenA);
    assert.equal((await panggil('PUT', `/butir-pribadi/${encodeURIComponent(butirA)}/selesai`, tokenA)).status, 200);
    const a = await keadaanBeranda(tokenA);
    assert.equal(a.jumlahCentang, 1);
    assert.equal(a.progres.selesai, 1);

    const b = await keadaanBeranda(tokenB);
    assert.equal(b.butirPribadi.length, 0, 'butir pribadi A tidak boleh terlihat di B');
    assert.equal(b.jumlahCentang, 0);
    assert.equal(b.progres.selesai, 0, 'progres B harus tetap 0 dari 3');
    assert.equal(b.punyaKemajuan, false);

    // B mencoba mencentang / membatalkan butir A: 404, keadaan A tidak berubah
    assert.equal((await panggil('DELETE', `/butir-pribadi/${encodeURIComponent(butirA)}/selesai`, tokenB)).status, 404);
    assert.equal((await panggil('PUT', `/butir-pribadi/${encodeURIComponent(butirA)}/selesai`, tokenB)).status, 404);
    const bSetelah = await keadaanBeranda(tokenB);
    assert.equal(bSetelah.jumlahCentang, 0);
    assert.equal(bSetelah.progres.selesai, 0);
    const aSetelah = await keadaanBeranda(tokenA);
    assert.equal(aSetelah.jumlahCentang, 1, 'centang A tidak boleh dibatalkan oleh B');
    assert.equal(aSetelah.progres.selesai, 1);
  });
});
