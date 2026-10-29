// tests/mapel-pilihan.test.js
// Pengujian otomatis LANJUT_079 — Pilih Mapel per rumpun favorit (kelas 12) dan
// Mapel Saya (kelas 7–11):
// - migrasi 022_mapel_pilihan (kolom JSON, idempoten)
// - GET/PATCH /pengguna/saya mapel_pilihan: id mapel yang ada, maks. 5 untuk semua
//   kelas, kelas 12 hanya dari rumpun favorit (400 VALIDASI_GAGAL medan mapel_pilihan),
//   rumpun kelas 12 maks. 3, tanpa gerbang AI, terisolasi per akun
// - GET /pengguna/saya/pilihan-mapel: kelas 12 tidak pernah mendapat daftar penuh
// - kelas 7–11: minat_rumpun tetap seperti sekarang (pilihan percakapan LANJUT_079)
// - app: bagian tab per kelas, urutan Arsip & Latihan, teks = salinan
// Memakai kunciKonfigurasiGlobal: rumpun hanya tersimpan bila kebijakan versi berlaku
// diterima, dan persetujuan.test.js sementara menaikkan versi itu.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { nyalakanServer, urlDari, daftarPenggunaBaru, kunciKonfigurasiGlobal, pool } = require('./bantuan');
const { muatModulApp } = require('./muat-ts-app');
const { pernyataanMigrasi, DIR_MIGRASI } = require('../src/db/jalankan-migrasi');
const { ambilKonfigurasi } = require('../src/modul/persetujuan/persetujuan.layanan');
const kontenRepo = require('../src/modul/konten/konten.repo');
const mapelPilihan = require('../src/modul/pengguna/mapel-pilihan');
const { pesanSistem } = require('../src/modul/ngobrol/ngobrol.layanan');

const AKAR_APP = path.join(__dirname, '..', '..');
const AKAR_REPO = path.join(AKAR_APP, '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const app = muatModulApp('lib/mapelPilihan');

const BERKAS_MIGRASI = '022_mapel_pilihan.sql';
const dataBenih = (n) => JSON.parse(fs.readFileSync(path.join(AKAR_REPO, 'MVP-PWA', 'data', n), 'utf8')).data;
const PRODI = dataBenih('prodi.json');
const PRODI_MAPEL = dataBenih('prodi-mapel.json');
const MAPEL = dataBenih('mapel.json');
const SEMUA_MAPEL = MAPEL.map((m) => m.id).sort();

/** Pemetaan yang diharapkan, dihitung sendiri dari data benih (bukan dari kode server). */
function harapanKelompok(rumpun) {
  return rumpun
    .slice()
    .sort()
    .map((r) => {
      const prodi = new Set(PRODI.filter((p) => p.rumpun === r).map((p) => p.id));
      const ids = new Set(PRODI_MAPEL.filter((x) => prodi.has(x.prodi_id) && x.bobot >= 2).map((x) => x.mapel_id));
      const mapel = MAPEL.filter((m) => ids.has(m.id))
        .map((m) => ({ id: m.id, nama: m.nama }))
        .sort((a, b) => a.nama.localeCompare(b.nama));
      return { rumpun: r, mapel };
    });
}
const idKelompok = (rumpun) => harapanKelompok(rumpun).flatMap((k) => k.mapel.map((m) => m.id));
const diLuar = (rumpun) => SEMUA_MAPEL.filter((id) => !idKelompok(rumpun).includes(id));

let server;
let baseUrl;
let lepasKunci;
let versiKebijakan;

before(async () => {
  lepasKunci = await kunciKonfigurasiGlobal();
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  versiKebijakan = (await ambilKonfigurasi()).versiKebijakan;
});

after(async () => {
  try {
    await new Promise((resolve) => server.close(resolve));
  } finally {
    await lepasKunci();
    await pool.end();
  }
});

async function panggil(metode, jalur, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${jalur}`, {
    method: metode,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function akun(kelas, { setuju = true } = {}) {
  const r = await daftarPenggunaBaru(baseUrl, {
    kelas,
    ...(['10', '11', '12'].includes(kelas) ? { jenis_sekolah: 'SMA' } : {}),
    ...(setuju ? { versi_kebijakan: versiKebijakan } : {}),
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return { token: r.json.data.token, pengguna: r.json.data.pengguna };
}

const ubah = (a, body) => panggil('PATCH', '/pengguna/saya', a.token, body);
const profil = async (a) => (await panggil('GET', '/pengguna/saya', a.token)).json.data;
const layar = async (a) => (await panggil('GET', '/pengguna/saya/pilihan-mapel', a.token)).json.data;
/**
 * 400 VALIDASI_GAGAL dengan galat { kode, pesan, medan }. LANJUT_079b: medan selalu
 * berbentuk sama — tepat satu kunci `mapel_pilihan` berisi teks — untuk id tak dikenal,
 * tipe per butir yang salah, lebih dari 5, ganda, dan di luar rumpun (tidak ada
 * `mapel_pilihan.0`).
 */
const tolakMapel = (r, pesan) => {
  assert.equal(r.status, 400, `${pesan}: ${JSON.stringify(r.json)}`);
  assert.deepEqual(Object.keys(r.json.galat).sort(), ['kode', 'medan', 'pesan'], pesan);
  assert.equal(r.json.galat.kode, 'VALIDASI_GAGAL', pesan);
  assert.equal(typeof r.json.galat.pesan, 'string', pesan);
  assert.deepEqual(Object.keys(r.json.galat.medan), ['mapel_pilihan'], `${pesan}: medan ${JSON.stringify(r.json.galat.medan)}`);
  assert.equal(typeof r.json.galat.medan.mapel_pilihan, 'string', pesan);
};

describe('LANJUT_079 §C: migrasi 022_mapel_pilihan', () => {
  test('Kolom mapel_pilihan ada (JSON, boleh NULL, sesudah minat_rumpun) dan migrasinya tercatat', async () => {
    const [kolom] = await pool.query(
      `SELECT COLUMN_NAME AS nama, DATA_TYPE AS tipe, IS_NULLABLE AS bolehNull
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pengguna'
        ORDER BY ORDINAL_POSITION`
    );
    const i = kolom.findIndex((k) => k.nama === 'mapel_pilihan');
    assert.ok(i >= 0, 'kolom mapel_pilihan belum ada — jalankan npm run migrasi');
    assert.equal(kolom[i].tipe, 'json');
    assert.equal(kolom[i].bolehNull, 'YES');
    assert.equal(kolom[i - 1].nama, 'minat_rumpun');
    const [catat] = await pool.query('SELECT nama FROM _migrasi WHERE nama = ?', [BERKAS_MIGRASI]);
    assert.equal(catat.length, 1);
  });

  test('Idempoten: isi berkas dijalankan dua kali lagi (seperti pelari migrasi) tanpa galat, kolom tetap satu', async () => {
    const pernyataan = pernyataanMigrasi(fs.readFileSync(path.join(DIR_MIGRASI, BERKAS_MIGRASI), 'utf8'));
    assert.ok(pernyataan.length >= 3, 'berkas harus memeriksa information_schema sebelum ALTER');
    assert.ok(!/ALTER TABLE pengguna ADD COLUMN mapel_pilihan/.test(pernyataan.filter((p) => !p.includes("'ALTER")).join('\n')), 'ALTER hanya lewat PREPARE bersyarat');
    const koneksi = await pool.getConnection();
    try {
      for (let ulang = 0; ulang < 2; ulang++) {
        for (const sql of pernyataan) await koneksi.query(sql);
      }
    } finally {
      koneksi.release();
    }
    const [[{ jumlah }]] = await pool.query(
      `SELECT COUNT(*) AS jumlah FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pengguna' AND COLUMN_NAME = 'mapel_pilihan'`
    );
    assert.equal(Number(jumlah), 1);
  });
});

describe('LANJUT_079 §C: GET/PATCH /pengguna/saya mapel_pilihan', () => {
  test('Akun baru: mapel_pilihan [] di jawaban daftar, GET /pengguna/saya, dan /auth/saya; tanpa login → 401', async () => {
    const a = await akun('8');
    assert.deepEqual(a.pengguna.mapel_pilihan, []);
    assert.deepEqual((await profil(a)).mapel_pilihan, []);
    assert.deepEqual((await panggil('GET', '/auth/saya', a.token)).json.data.mapel_pilihan, []);
    assert.equal((await panggil('GET', '/pengguna/saya', null)).status, 401);
    assert.equal((await panggil('GET', '/pengguna/saya/pilihan-mapel', null)).status, 401);
    assert.equal((await panggil('PATCH', '/pengguna/saya', null, { mapel_pilihan: ['matematika'] })).status, 401);
  });

  test('Kelas 7–11 (Mapel Saya): 5 mapel apa saja dari daftar sekolah → 200, urutan pilihan tetap; [] mengosongkan', async () => {
    for (const kelas of ['7', '9', '10', '11']) {
      const a = await akun(kelas);
      const lima = ['sosiologi', 'fisika', 'bahasa-inggris', 'geografi', 'informatika'];
      const r = await ubah(a, { mapel_pilihan: lima });
      assert.equal(r.status, 200, `kelas ${kelas}: ${JSON.stringify(r.json)}`);
      assert.deepEqual(r.json.data.mapel_pilihan, lima);
      assert.deepEqual((await profil(a)).mapel_pilihan, lima);
      assert.equal((await ubah(a, { mapel_pilihan: [] })).status, 200);
      assert.deepEqual((await profil(a)).mapel_pilihan, []);
    }
  });

  test('Maks. 5 untuk SEMUA kelas: 6 mapel → 400 VALIDASI_GAGAL medan mapel_pilihan; tidak ada yang tersimpan', async () => {
    const enam = ['sosiologi', 'fisika', 'bahasa-inggris', 'geografi', 'informatika', 'kimia'];
    for (const kelas of ['7', '11']) {
      const a = await akun(kelas);
      tolakMapel(await ubah(a, { mapel_pilihan: enam }), `kelas ${kelas}`);
      assert.deepEqual((await profil(a)).mapel_pilihan, []);
    }
    // Kelas 12 dengan tiga rumpun (lebih dari 5 mapel tersedia) juga dibatasi 5.
    const k12 = await akun('12');
    const tiga = ['Kesehatan', 'Sosial & Humaniora', 'Teknologi & Rekayasa'];
    assert.equal((await ubah(k12, { minat_rumpun: tiga })).status, 200);
    const tersedia = idKelompok(tiga);
    assert.ok(new Set(tersedia).size > 5, 'rumpun uji harus punya lebih dari 5 mapel');
    tolakMapel(await ubah(k12, { mapel_pilihan: [...new Set(tersedia)].slice(0, 6) }), 'kelas 12, 6 mapel');
    assert.deepEqual((await profil(k12)).mapel_pilihan, []);
  });

  test('Isi tidak sah → 400 VALIDASI_GAGAL medan mapel_pilihan: id tidak dikenal, ganda, bukan larik, bukan teks', async () => {
    const a = await akun('8');
    await ubah(a, { mapel_pilihan: ['matematika'] });
    for (const isi of [['matematika', 'MAPEL-TIDAK-ADA'], ['matematika', 'matematika'], 'matematika', null, [1], [''], ['matematika', 7]]) {
      tolakMapel(await ubah(a, { mapel_pilihan: isi }), JSON.stringify(isi));
    }
    assert.deepEqual((await profil(a)).mapel_pilihan, ['matematika']);
  });

  test('LANJUT_079b §D: id tidak valid, tipe salah, dan lebih dari 5 → bentuk medan SAMA ({ mapel_pilihan: teks }), tanpa kunci per butir', async () => {
    const a = await akun('10');
    const kasus = {
      id_tidak_valid: ['MAPEL-TIDAK-ADA'],
      tipe_salah: [42],
      tipe_salah_campur: ['fisika', { id: 'kimia' }],
      lebih_dari_5: ['sosiologi', 'fisika', 'bahasa-inggris', 'geografi', 'informatika', 'kimia'],
      lebih_dari_5_dan_tipe_salah: [1, 2, 3, 4, 5, 6],
    };
    const bentuk = [];
    for (const [nama, isi] of Object.entries(kasus)) {
      const r = await ubah(a, { mapel_pilihan: isi });
      tolakMapel(r, nama);
      bentuk.push(Object.keys(r.json.galat.medan).join(','));
    }
    assert.deepEqual(new Set(bentuk), new Set(['mapel_pilihan']));
    assert.deepEqual((await profil(a)).mapel_pilihan, []);
  });

  test('Kelas 7–11: minat_rumpun tetap seperti sekarang (diterima bila kebijakan diterima, 403 bila belum) dan TIDAK membatasi Mapel Saya', async () => {
    const a = await akun('8');
    assert.equal((await ubah(a, { minat_rumpun: ['Kesehatan'] })).status, 200);
    // sosiologi tidak termasuk kelompok Kesehatan — untuk kelas 7–11 tetap boleh.
    assert.ok(diLuar(['Kesehatan']).includes('sosiologi'));
    const r = await ubah(a, { mapel_pilihan: ['sosiologi'] });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const b = await akun('10', { setuju: false });
    const tolak = await ubah(b, { minat_rumpun: ['Kesehatan'] });
    assert.equal(tolak.status, 403);
    assert.equal(tolak.json.galat.kode, 'AI_BELUM_DIIZINKAN');
    // Kelas 10–11 (bukan kelas 12) masih boleh 4 rumpun seperti LANJUT_075.
    const c = await akun('11');
    assert.equal((await ubah(c, { minat_rumpun: ['Ekonomi & Bisnis', 'Kesehatan', 'Sosial & Humaniora', 'Teknologi & Rekayasa'] })).status, 200);
  });

  test('Tanpa gerbang AI: akun yang belum menerima kebijakan dan tanpa persetujuan ortu tetap bisa menyimpan Mapel Saya', async () => {
    const a = await akun('9', { setuju: false });
    const r = await ubah(a, { mapel_pilihan: ['matematika', 'biologi'] });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.deepEqual((await profil(a)).mapel_pilihan, ['matematika', 'biologi']);
  });

  test('Kelas 12: mapel dari rumpun favorit → 200; mapel di luar rumpun (sendiri atau campuran) → 400 medan mapel_pilihan, tidak tersimpan', async () => {
    const a = await akun('12');
    const rumpun = ['Kesehatan', 'Ekonomi & Bisnis'];
    assert.equal((await ubah(a, { minat_rumpun: rumpun })).status, 200);
    const boleh = idKelompok(rumpun).slice(0, 3);
    const r = await ubah(a, { mapel_pilihan: boleh });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    const luar = diLuar(rumpun);
    assert.ok(luar.length > 0);
    for (const isi of [[luar[0]], [boleh[0], luar[0]]]) {
      tolakMapel(await ubah(a, { mapel_pilihan: isi }), JSON.stringify(isi));
    }
    assert.deepEqual((await profil(a)).mapel_pilihan, boleh);
  });

  test('Kelas 12 tanpa rumpun favorit: mapel apa pun ditolak 400 medan mapel_pilihan', async () => {
    const a = await akun('12');
    tolakMapel(await ubah(a, { mapel_pilihan: ['matematika'] }), 'tanpa rumpun');
    assert.deepEqual((await profil(a)).mapel_pilihan, []);
  });

  test('Kelas 12: rumpun favorit 1–3 diterima; 4 → 400 VALIDASI_GAGAL medan minat_rumpun', async () => {
    const a = await akun('12');
    for (const n of [1, 2, 3]) {
      const isi = ['Ekonomi & Bisnis', 'Kesehatan', 'Sosial & Humaniora'].slice(0, n);
      assert.equal((await ubah(a, { minat_rumpun: isi })).status, 200, `${n} rumpun`);
    }
    const r = await ubah(a, { minat_rumpun: ['Ekonomi & Bisnis', 'Kesehatan', 'Sosial & Humaniora', 'Teknologi & Rekayasa'] });
    assert.equal(r.status, 400);
    assert.equal(r.json.galat.kode, 'VALIDASI_GAGAL');
    assert.ok('minat_rumpun' in r.json.galat.medan);
    assert.equal((await profil(a)).minat_rumpun.length, 3);
  });

  test('Kelas 12: rumpun dan mapel dalam satu permintaan dicek terhadap rumpun BARU; mengganti rumpun melepas mapel yang tidak lagi termasuk', async () => {
    const a = await akun('12');
    const r = await ubah(a, { minat_rumpun: ['Teknologi & Rekayasa'], mapel_pilihan: ['informatika', 'fisika'] });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    tolakMapel(await ubah(a, { minat_rumpun: ['Kesehatan'], mapel_pilihan: ['informatika'] }), 'informatika di luar Kesehatan');
    // Ganti rumpun ke Kesehatan saja: fisika masih termasuk, informatika dilepas.
    assert.ok(idKelompok(['Kesehatan']).includes('fisika') && !idKelompok(['Kesehatan']).includes('informatika'));
    const ganti = await ubah(a, { minat_rumpun: ['Kesehatan'] });
    assert.equal(ganti.status, 200);
    assert.deepEqual(ganti.json.data.mapel_pilihan, ['fisika']);
    // Kelas 11 → 12 tanpa rumpun: Mapel Saya lama dilepas (kelas 12 hanya dari rumpun).
    const b = await akun('11');
    await ubah(b, { mapel_pilihan: ['sosiologi'] });
    const naik = await ubah(b, { kelas: '12', jenis_sekolah: 'SMA' });
    assert.equal(naik.status, 200, JSON.stringify(naik.json));
    assert.deepEqual(naik.json.data.mapel_pilihan, []);
  });

  test('Lintas akun: mapel pilihan akun A tidak terlihat atau berubah lewat akun B', async () => {
    const a = await akun('7');
    const b = await akun('12');
    assert.equal((await ubah(a, { mapel_pilihan: ['geografi'] })).status, 200);
    assert.equal((await ubah(b, { minat_rumpun: ['Kesehatan'], mapel_pilihan: ['biologi'] })).status, 200);
    assert.deepEqual((await profil(a)).mapel_pilihan, ['geografi']);
    assert.deepEqual((await layar(a)).mapel_pilihan, ['geografi']);
    assert.deepEqual((await layar(b)).mapel_pilihan, ['biologi']);
    assert.equal((await ubah(b, { mapel_pilihan: [] })).status, 200);
    assert.deepEqual((await profil(a)).mapel_pilihan, ['geografi'], 'mengosongkan B tidak menyentuh A');
  });

  test('mapel_pilihan tidak ikut ke pesan sistem AI (chatbot belum boleh memakainya)', () => {
    const teks = pesanSistem({ kelas: '12', jenis_sekolah: 'SMA', gaya_belajar: 'visual', mapel_pilihan: ['MAPEL-UJI-079'] }, null);
    assert.ok(!teks.includes('MAPEL-UJI-079'));
    assert.ok(!baca('server', 'src', 'modul', 'ngobrol', 'ngobrol.layanan.js').includes('mapel_pilihan'));
  });
});

describe('LANJUT_079 §A/§B: GET /pengguna/saya/pilihan-mapel', () => {
  test('Pemetaan rumpun → mapel = data benih prodi_mapel bobot >= 2 (pengelompokan internal, belum terverifikasi)', async () => {
    const semuaRumpun = await kontenRepo.ambilDaftarRumpun();
    assert.deepEqual(semuaRumpun, ['Ekonomi & Bisnis', 'Kesehatan', 'Sosial & Humaniora', 'Teknologi & Rekayasa']);
    assert.equal(mapelPilihan.BOBOT_MIN_RUMPUN, 2);
    assert.deepEqual(await mapelPilihan.kelompokUntuk(semuaRumpun), harapanKelompok(semuaRumpun));
    const [[{ terverifikasi }]] = await pool.query("SELECT COUNT(*) AS terverifikasi FROM prodi WHERE status_verifikasi = 'terverifikasi'");
    assert.equal(Number(terverifikasi), 0, 'bila prodi mulai terverifikasi, tinjau ulang catatan "belum dicek"');
  });

  test('Kelas 12 tanpa rumpun: mode rumpun, kelompok kosong, TANPA daftar mapel (ajakan memilih rumpun dulu)', async () => {
    const a = await akun('12');
    const d = await layar(a);
    assert.equal(d.mode, 'rumpun');
    assert.deepEqual(d.kelompok, []);
    assert.equal(d.mapel, undefined);
    assert.equal(d.maks_mapel, 5);
    assert.equal(d.maks_rumpun, 3);
  });

  test('Kelas 12 dengan dua rumpun: hanya dua kelompok itu, per rumpun; bukan daftar penuh; pengelompokan bertanda belum terverifikasi', async () => {
    const a = await akun('12');
    const rumpun = ['Teknologi & Rekayasa', 'Ekonomi & Bisnis'];
    assert.equal((await ubah(a, { minat_rumpun: rumpun })).status, 200);
    const d = await layar(a);
    assert.equal(d.mode, 'rumpun');
    assert.equal(d.mapel, undefined, 'kelas 12 tidak pernah mendapat daftar semua mapel');
    assert.deepEqual(d.kelompok, harapanKelompok(rumpun));
    assert.deepEqual(d.kelompok.map((k) => k.rumpun), ['Ekonomi & Bisnis', 'Teknologi & Rekayasa']);
    const tampil = new Set(d.kelompok.flatMap((k) => k.mapel.map((m) => m.id)));
    assert.ok(tampil.size < SEMUA_MAPEL.length, `${tampil.size} dari ${SEMUA_MAPEL.length} mapel`);
    assert.ok(!tampil.has('biologi') && !tampil.has('sosiologi'));
    assert.equal(d.pengelompokan_terverifikasi, false);
  });

  test('Kelas 7–11: mode mapel_saya, semua mapel sekolah, tanpa rumpun/kelompok/prodi — walau minat_rumpun terisi', async () => {
    for (const kelas of ['7', '11']) {
      const a = await akun(kelas);
      await ubah(a, { minat_rumpun: ['Kesehatan'] });
      const d = await layar(a);
      assert.equal(d.mode, 'mapel_saya', kelas);
      assert.deepEqual(d.mapel.map((m) => m.id).sort(), SEMUA_MAPEL);
      for (const k of ['kelompok', 'minat_rumpun', 'maks_rumpun', 'prodi']) assert.equal(d[k], undefined, `${kelas}: ${k}`);
    }
  });
});

describe('LANJUT_079 app: tab Pilih Mapel, urutan Arsip & Latihan, teks', () => {
  test('Bagian tab per kelas: 12 = rumpun + F3; 10–11 = Mapel Saya + F3; 7–9 = Mapel Saya saja; tanpa kelas = F3', () => {
    assert.deepEqual(app.bagianPilihMapel('12'), ['rumpun', 'f3']);
    for (const k of ['10', '11']) assert.deepEqual(app.bagianPilihMapel(k), ['mapel_saya', 'f3']);
    for (const k of ['7', '8', '9']) assert.deepEqual(app.bagianPilihMapel(k), ['mapel_saya']);
    assert.deepEqual(app.bagianPilihMapel(null), ['f3']);
    const layarPilih = baca('components', 'screens', 'PilihMapelScreen.tsx');
    assert.ok(layarPilih.includes('bagianPilihMapel(pengguna?.kelas)'));
    assert.ok(/if \(!bagian\.includes\('f3'\)\)/.test(layarPilih), 'kelas 7–9 tidak melihat F3');
  });

  test('Kelas 12 di app hanya merender kelompok dari server (tidak memakai daftar mapel lengkap /konten/mapel)', () => {
    const komp = baca('components', 'screens', 'MapelPilihan.tsx');
    assert.ok(!komp.includes('useMapel'), 'MapelPilihan.tsx tidak boleh memuat daftar mapel lengkap');
    assert.ok(komp.includes("data.mode === 'rumpun' && data.kelompok.length === 0"), 'ajakan bila belum ada rumpun');
    // LANJUT_079b: kelompok dirender lewat kelompokDenganCatatan (catatan di setiap kelompok).
    assert.ok(komp.includes('kelompokDenganCatatan(data.kelompok, data.pengelompokan_terverifikasi).map('));
    assert.ok(!komp.includes('data.kelompok.map('), 'kelompok tidak boleh dirender tanpa catatan');
  });

  test('Urutan Arsip & Latihan: mapel pilihan lebih dulu (urut pilihan), sisanya tetap; daftar tidak bertambah/berkurang', () => {
    const daftar = ['biologi', 'ekonomi', 'fisika', 'kimia', 'matematika'].map((id) => ({ id, nama: id }));
    const hasil = app.urutkanMapelPilihan(daftar, ['matematika', 'TIDAK-ADA', 'biologi']).map((m) => m.id);
    assert.deepEqual(hasil, ['matematika', 'biologi', 'ekonomi', 'fisika', 'kimia']);
    assert.deepEqual(app.urutkanMapelPilihan(daftar, undefined).map((m) => m.id), daftar.map((m) => m.id));
    // Latihan: sejak 15 Okt 2026 mapelLatihan (kartu + potongan modul), urutannya tetap dari urutkanMapelPilihan.
    for (const [berkas, pola] of [
      ['ArsipScreen.tsx', /mapelBerkartu\(kartu, urutkanMapelPilihan\(/],
      ['LatihanScreen.tsx', /mapelLatihan\(kartu, modulPerMapel, urutkanMapelPilihan\(/],
    ]) {
      const isi = baca('components', 'screens', berkas);
      assert.ok(pola.test(isi), `${berkas} memakai urutkanMapelPilihan`);
    }
  });

  test('Batas di app sama dengan server: 5 mapel, 3 rumpun; pilihan ke-6 tidak bertambah', () => {
    assert.equal(app.MAKS_MAPEL_PILIHAN, mapelPilihan.MAKS_MAPEL_PILIHAN);
    assert.equal(app.MAKS_RUMPUN_KELAS12, mapelPilihan.MAKS_RUMPUN_KELAS12);
    let p = [];
    for (const id of ['a', 'b', 'c', 'd', 'e', 'f']) p = app.ubahPilihanMapel(p, id);
    assert.deepEqual(p, ['a', 'b', 'c', 'd', 'e']);
    assert.deepEqual(app.ubahPilihanMapel(p, 'c'), ['a', 'b', 'd', 'e']);
  });

  test('Teks DRAF di app = salinan §4.19; usulan kebijakan bertanda menunggu tinjauan hukum; kebijakan privasi tidak menyebut mapel_pilihan', () => {
    const salinan = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'), 'utf8');
    const T = app.TEKS_MAPEL_PILIHAN;
    for (const t of [
      T.kelas12.judul, T.kelas12.pengantar, T.kelas12.ajakanJudul, T.kelas12.ajakanTeks, T.kelas12.catatanKelompok,
      T.kelas12.ubahRumpun, T.mapelSaya.judul, T.mapelSaya.pengantar, T.rumpun.judul, T.rumpun.petunjuk, T.rumpun.tombol, T.tombol,
    ]) {
      assert.ok(salinan.includes(t), `belum di salinan: ${t}`);
    }
    assert.ok(/LANJUT_079 — usulan kalimat kebijakan privasi untuk mapel pilihan\. DRAF, menunggu\s+tinjauan hukum/.test(salinan));
    assert.ok(!baca('lib', 'kebijakan-privasi.json').includes('mapel_pilihan'));
  });
});

describe('LANJUT_079b §A: akun kelas 12 lama dengan lebih dari 3 rumpun', () => {
  const EMPAT = ['Ekonomi & Bisnis', 'Kesehatan', 'Sosial & Humaniora', 'Teknologi & Rekayasa'];

  /** Akun kelas 12 yang menyimpan 4 rumpun sebelum batas 3 (ditulis langsung ke DB, seperti data lama). */
  async function akunEmpatRumpun() {
    const a = await akun('12');
    await pool.query('UPDATE pengguna SET minat_rumpun = ? WHERE id = ?', [JSON.stringify(EMPAT), a.pengguna.id]);
    return a;
  }

  test('GET tanpa galat: /pengguna/saya, /auth/saya, dan pilihan-mapel tetap menampilkan keempat rumpun', async () => {
    const a = await akunEmpatRumpun();
    const p = await panggil('GET', '/pengguna/saya', a.token);
    assert.equal(p.status, 200, JSON.stringify(p.json));
    assert.deepEqual(p.json.data.minat_rumpun, EMPAT);
    assert.equal((await panggil('GET', '/auth/saya', a.token)).status, 200);
    const l = await panggil('GET', '/pengguna/saya/pilihan-mapel', a.token);
    assert.equal(l.status, 200, JSON.stringify(l.json));
    assert.deepEqual(l.json.data.minat_rumpun, EMPAT);
    assert.deepEqual(l.json.data.kelompok.map((k) => k.rumpun), EMPAT);
    assert.equal(l.json.data.maks_rumpun, 3);
  });

  test('PATCH 3 rumpun berhasil (mapel di luar rumpun baru dilepas); PATCH 4 tetap ditolak 400 — aturan tidak dilonggarkan', async () => {
    const a = await akunEmpatRumpun();
    // Selama masih 4 rumpun, mapel dari keempatnya boleh disimpan (tidak ada jalan buntu).
    assert.equal((await ubah(a, { mapel_pilihan: ['sosiologi', 'biologi'] })).status, 200);
    const tolak = await ubah(a, { minat_rumpun: EMPAT });
    assert.equal(tolak.status, 400);
    assert.equal(tolak.json.galat.kode, 'VALIDASI_GAGAL');
    assert.deepEqual(Object.keys(tolak.json.galat.medan), ['minat_rumpun']);
    const tiga = ['Ekonomi & Bisnis', 'Kesehatan', 'Teknologi & Rekayasa'];
    const r = await ubah(a, { minat_rumpun: tiga });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.deepEqual(r.json.data.minat_rumpun, tiga);
    assert.deepEqual(r.json.data.mapel_pilihan, ['biologi'], 'sosiologi hanya di Sosial & Humaniora → dilepas');
  });

  test('App: pilihan rumpun terbuka sendiri untuk akun > 3 rumpun; Simpan tampil begitu pilihan dikurangi menjadi 3', () => {
    assert.equal(app.rumpunPerluDikurangi(EMPAT), true);
    assert.equal(app.rumpunPerluDikurangi(EMPAT.slice(0, 3)), false);
    assert.equal(app.rumpunPerluDikurangi(undefined), false);
    // Mulai dari yang tersimpan (4): belum bisa disimpan.
    let pilihan = [...EMPAT];
    assert.equal(app.bolehSimpanRumpun(pilihan, EMPAT), false);
    // Satu dilepas → 3 → Simpan tampil, tanpa menekan "Ubah rumpun favorit" dulu.
    pilihan = pilihan.filter((r) => r !== 'Sosial & Humaniora');
    assert.equal(pilihan.length, 3);
    assert.equal(app.bolehSimpanRumpun(pilihan, EMPAT), true);
    // Akun biasa: kosong atau sama dengan yang tersimpan → tidak ada Simpan.
    assert.equal(app.bolehSimpanRumpun([], EMPAT.slice(0, 2)), false);
    assert.equal(app.bolehSimpanRumpun(EMPAT.slice(0, 2), EMPAT.slice(0, 2)), false);
    const komp = baca('components', 'screens', 'MapelPilihan.tsx');
    assert.ok(komp.includes('{perluKurangi ? <PilihRumpunFavorit /> : null}'), 'pilihan rumpun terbuka sendiri di Pilih Mapel');
    assert.ok(komp.includes('const boleh = bolehSimpanRumpun(pilihan, tersimpan, maks);'));
    assert.ok(baca('components', 'screens', 'CekPosisiScreen.tsx').includes('<PilihRumpunFavorit />'), 'Jalur Saya memakai komponen yang sama');
  });
});

describe('LANJUT_079b §B/§C: catatan per kelompok dan mapel SMP apa adanya', () => {
  test('Setiap kelompok rumpun memuat catatan "Belum dicek ke sumber resmi." (dari data server, keempat rumpun)', async () => {
    const a = await akun('12');
    await pool.query('UPDATE pengguna SET minat_rumpun = ? WHERE id = ?', [
      JSON.stringify(['Ekonomi & Bisnis', 'Kesehatan', 'Sosial & Humaniora', 'Teknologi & Rekayasa']),
      a.pengguna.id,
    ]);
    const d = await layar(a);
    assert.equal(d.pengelompokan_terverifikasi, false);
    const tampil = app.kelompokDenganCatatan(d.kelompok, d.pengelompokan_terverifikasi);
    assert.equal(tampil.length, 4);
    for (const k of tampil) assert.equal(k.catatan, 'Belum dicek ke sumber resmi.', k.rumpun);
    assert.equal(app.TEKS_MAPEL_PILIHAN.kelas12.catatanKelompok, 'Belum dicek ke sumber resmi.');
    const salinan = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'), 'utf8');
    assert.ok(salinan.includes('- **Pilih Mapel kelas 12 — catatan pengelompokan:** Belum dicek ke sumber resmi.'));
    const lembar = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'lembar-review-draf-teks.md'), 'utf8');
    assert.ok(lembar.includes('> **Pilih Mapel kelas 12 — catatan pengelompokan:** Belum dicek ke sumber resmi.'));
  });

  test('Tidak ada mapel baru: tabel mapel = 10 mapel benih; Mapel Saya kelas 7–9 menampilkan persis itu', async () => {
    const [baris] = await pool.query('SELECT id FROM mapel ORDER BY id');
    assert.deepEqual(baris.map((b) => b.id), SEMUA_MAPEL);
    assert.equal(SEMUA_MAPEL.length, 10);
    for (const kelas of ['7', '8', '9']) {
      const d = await layar(await akun(kelas));
      assert.deepEqual(d.mapel.map((m) => m.id).sort(), SEMUA_MAPEL, kelas);
    }
  });
});
