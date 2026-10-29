// tests/eksplorasi-kampus.test.js
// Pengujian otomatis LANJUT_075 — Eksplorasi Kampus untuk semua jenjang:
// - migrasi 019_minat_rumpun (kolom JSON, idempoten)
// - PATCH /pengguna/saya minat_rumpun: rumpun sah saja, maks. 5, tanpa ganda,
//   hanya akun yang sudah menerima kebijakan privasi versi berlaku (403
//   AI_BELUM_DIIZINKAN), tidak mengubah prodi_impian, terisolasi per akun
// - isi layar per jenjang (lib/eksplorasiKampus.ts, dijalankan langsung)
// - profil prodi belum terverifikasi tidak terkirim; grid Beranda; salinan teks
// Memakai kunciKonfigurasiGlobal: tes lain (persetujuan.test.js) sementara
// menaikkan versi kebijakan, dan tes di sini bergantung pada versi itu.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { nyalakanServer, urlDari, daftarPenggunaBaru, kunciKonfigurasiGlobal, pool } = require('./bantuan');
const { muatModulApp } = require('./muat-ts-app');
const { pernyataanMigrasi, DIR_MIGRASI } = require('../src/db/jalankan-migrasi');
const { ambilKonfigurasi } = require('../src/modul/persetujuan/persetujuan.layanan');
const kontenRepo = require('../src/modul/konten/konten.repo');
const { pesanSistem } = require('../src/modul/ngobrol/ngobrol.layanan');
const cermin = require('../src/util/beranda');

const AKAR_APP = path.join(__dirname, '..', '..');
const AKAR_REPO = path.join(AKAR_APP, '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8');
const eks = muatModulApp('lib/eksplorasiKampus');
const beranda = muatModulApp('lib/beranda');

const PRODI_JSON = JSON.parse(fs.readFileSync(path.join(AKAR_REPO, 'MVP-PWA', 'data', 'prodi.json'), 'utf8')).data;
const RUMPUN_DATA = [...new Set(PRODI_JSON.map((p) => p.rumpun))].sort();
const BERKAS_MIGRASI = '019_minat_rumpun.sql';

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
  await new Promise((resolve) => server.close(resolve));
  await lepasKunci();
  await pool.end();
});

async function panggil(metode, jalur, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${jalur}`, {
    method: metode,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

/** Akun baru; `setuju` = kebijakan privasi versi berlaku diterima saat daftar. */
async function akun(kelas, { setuju = true, lain = {} } = {}) {
  const r = await daftarPenggunaBaru(baseUrl, {
    kelas,
    ...(['10', '11', '12'].includes(kelas) ? { jenis_sekolah: 'SMA' } : {}),
    ...(setuju ? { versi_kebijakan: versiKebijakan } : {}),
    ...lain,
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return { token: r.json.data.token, pengguna: r.json.data.pengguna };
}

const ubahMinat = (token, minat_rumpun, lain = {}) => panggil('PATCH', '/pengguna/saya', token, { minat_rumpun, ...lain });
const profil = async (token) => (await panggil('GET', '/auth/saya', token)).json.data;

describe('LANJUT_075 §B: migrasi 019_minat_rumpun', () => {
  test('Kolom minat_rumpun ada (JSON, boleh NULL, sesudah gaya_belajar) dan migrasinya tercatat', async () => {
    const [kolom] = await pool.query(
      `SELECT COLUMN_NAME AS nama, DATA_TYPE AS tipe, IS_NULLABLE AS bolehNull
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pengguna'
        ORDER BY ORDINAL_POSITION`
    );
    const i = kolom.findIndex((k) => k.nama === 'minat_rumpun');
    assert.ok(i >= 0, 'kolom minat_rumpun belum ada — jalankan npm run migrasi');
    assert.equal(kolom[i].tipe, 'json');
    assert.equal(kolom[i].bolehNull, 'YES');
    assert.equal(kolom[i - 1].nama, 'gaya_belajar');
    const [catat] = await pool.query('SELECT nama FROM _migrasi WHERE nama = ?', [BERKAS_MIGRASI]);
    assert.equal(catat.length, 1);
  });

  test('Idempoten: isi berkas dijalankan dua kali lagi (seperti pelari migrasi) tanpa galat, kolom tetap satu', async () => {
    const pernyataan = pernyataanMigrasi(fs.readFileSync(path.join(DIR_MIGRASI, BERKAS_MIGRASI), 'utf8'));
    assert.ok(pernyataan.length >= 3, 'berkas harus memeriksa information_schema sebelum ALTER');
    assert.ok(!/ALTER TABLE pengguna ADD COLUMN minat_rumpun/.test(pernyataan.filter((p) => !p.includes("'ALTER")).join('\n')), 'ALTER hanya lewat PREPARE bersyarat');
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
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pengguna' AND COLUMN_NAME = 'minat_rumpun'`
    );
    assert.equal(Number(jumlah), 1);
  });
});

describe('LANJUT_075 §B: PATCH /pengguna/saya minat_rumpun', () => {
  test('Daftar rumpun yang sah = rumpun di data prodi yang sudah ada (tidak ada daftar baru)', async () => {
    assert.deepEqual(await kontenRepo.ambilDaftarRumpun(), RUMPUN_DATA);
    assert.deepEqual(RUMPUN_DATA, ['Ekonomi & Bisnis', 'Kesehatan', 'Sosial & Humaniora', 'Teknologi & Rekayasa']);
  });

  test('Akun baru: minat_rumpun [] di jawaban daftar dan /auth/saya', async () => {
    const a = await akun('8');
    assert.deepEqual(a.pengguna.minat_rumpun, []);
    assert.deepEqual((await profil(a.token)).minat_rumpun, []);
  });

  test('SMP yang sudah menerima kebijakan: simpan rumpun sah → 200; prodi_impian tidak berubah', async () => {
    const prodiId = PRODI_JSON[0].id;
    const a = await akun('7', { lain: { prodi_impian: prodiId } });
    const r = await ubahMinat(a.token, ['Kesehatan', 'Teknologi & Rekayasa']);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.deepEqual(r.json.data.minat_rumpun, ['Kesehatan', 'Teknologi & Rekayasa']);
    const p = await profil(a.token);
    assert.deepEqual(p.minat_rumpun, ['Kesehatan', 'Teknologi & Rekayasa']);
    assert.equal(p.prodi_impian, prodiId);
  });

  test('Kelas 10–11: semua (4) rumpun yang ada diterima; [] mengosongkan', async () => {
    for (const kelas of ['10', '11']) {
      const a = await akun(kelas);
      assert.equal((await ubahMinat(a.token, RUMPUN_DATA)).status, 200);
      assert.deepEqual((await profil(a.token)).minat_rumpun, RUMPUN_DATA);
      const kosong = await ubahMinat(a.token, []);
      assert.equal(kosong.status, 200);
      assert.deepEqual((await profil(a.token)).minat_rumpun, []);
    }
  });

  test('Nilai di luar daftar → 400 RUMPUN_TIDAK_SAH; campuran sah + tidak sah juga ditolak; tidak ada yang tersimpan', async () => {
    const a = await akun('9');
    await ubahMinat(a.token, ['Kesehatan']);
    for (const isi of [['Pertanian'], ['Kesehatan', 'Seni & Desain'], ['kesehatan'], ['Teknik Informatika']]) {
      const r = await ubahMinat(a.token, isi);
      assert.equal(r.status, 400, JSON.stringify(isi));
      assert.equal(r.json.galat.kode, 'RUMPUN_TIDAK_SAH', JSON.stringify(isi));
    }
    assert.deepEqual((await profil(a.token)).minat_rumpun, ['Kesehatan']);
  });

  test('Lebih dari 5, ganda, bukan larik, atau bukan teks → 400 VALIDASI_GAGAL', async () => {
    const a = await akun('10');
    for (const isi of [
      ['Kesehatan', 'Ekonomi & Bisnis', 'Sosial & Humaniora', 'Teknologi & Rekayasa', 'A', 'B'],
      ['Kesehatan', 'Kesehatan'],
      'Kesehatan',
      [1, 2],
      [''],
      null,
    ]) {
      const r = await ubahMinat(a.token, isi);
      assert.equal(r.status, 400, JSON.stringify(isi));
      assert.equal(r.json.galat.kode, 'VALIDASI_GAGAL', JSON.stringify(isi));
    }
    assert.deepEqual((await profil(a.token)).minat_rumpun, []);
  });

  test('Akun SMP & 10–11 yang belum menerima kebijakan → 403 AI_BELUM_DIIZINKAN; medan lain di permintaan itu tidak berubah', async () => {
    for (const kelas of ['7', '11']) {
      const a = await akun(kelas, { setuju: false });
      const r = await ubahMinat(a.token, ['Kesehatan'], { nama_tampilan: 'Nama Baru Uji' });
      assert.equal(r.status, 403);
      assert.equal(r.json.galat.kode, 'AI_BELUM_DIIZINKAN');
      const p = await profil(a.token);
      assert.deepEqual(p.minat_rumpun, []);
      assert.notEqual(p.nama_tampilan, 'Nama Baru Uji');
      // Medan profil lain tanpa minat_rumpun tetap bisa diubah seperti biasa.
      assert.equal((await panggil('PATCH', '/pengguna/saya', a.token, { nama_tampilan: 'Nama Baru Uji' })).status, 200);
    }
  });

  test('Gerbang lebih dulu: akun tanpa kebijakan + rumpun tidak sah → 403, bukan petunjuk 400', async () => {
    const a = await akun('8', { setuju: false });
    const r = await ubahMinat(a.token, ['Pertanian']);
    assert.equal(r.status, 403);
    assert.equal(r.json.galat.kode, 'AI_BELUM_DIIZINKAN');
  });

  test('Tanpa login → 401', async () => {
    const r = await ubahMinat(null, ['Kesehatan']);
    assert.equal(r.status, 401);
  });

  test('Lintas akun: minat akun A tidak terlihat atau berubah lewat akun B', async () => {
    const a = await akun('7');
    const b = await akun('10');
    assert.equal((await ubahMinat(a.token, ['Kesehatan'])).status, 200);
    assert.equal((await ubahMinat(b.token, ['Ekonomi & Bisnis', 'Sosial & Humaniora'])).status, 200);
    assert.deepEqual((await profil(a.token)).minat_rumpun, ['Kesehatan']);
    assert.deepEqual((await profil(b.token)).minat_rumpun, ['Ekonomi & Bisnis', 'Sosial & Humaniora']);
    assert.equal((await ubahMinat(b.token, [])).status, 200);
    assert.deepEqual((await profil(a.token)).minat_rumpun, ['Kesehatan'], 'mengosongkan B tidak menyentuh A');
  });

  test('minat_rumpun tidak ikut ke pesan sistem AI (belum ada di kebijakan privasi)', () => {
    const teks = pesanSistem({ kelas: '9', jenis_sekolah: 'SMP', gaya_belajar: 'visual', minat_rumpun: ['RUMPUN-UJI-075'] }, null);
    assert.ok(!teks.includes('RUMPUN-UJI-075'));
  });
});

describe('LANJUT_075 §A: isi layar per jenjang (lib/eksplorasiKampus.ts)', () => {
  test('Versi & judul per jenjang: SMP Kenali Minatmu, 10–11 Jalur dan Bidangmu, 12/tanpa kelas F10', () => {
    for (const k of ['7', '8', '9']) assert.equal(eks.versiEksplorasi(k), 'smp');
    for (const k of ['10', '11']) assert.equal(eks.versiEksplorasi(k), 'kelas10_11');
    for (const k of ['12', null, undefined, '']) assert.equal(eks.versiEksplorasi(k), 'f10');
    assert.equal(eks.judulEksplorasi('7'), 'Kenali Minatmu');
    assert.equal(eks.judulEksplorasi('11'), 'Jalur dan Bidangmu');
    assert.equal(eks.judulEksplorasi('12'), 'Eksplorasi Tujuan');
  });

  test('SMP: tanpa jalur masuk dan tanpa tanggal; ada bidang, tombol Simpan minatku, dan kalimat penutup', () => {
    const b = eks.BAGIAN_EKSPLORASI.smp;
    assert.deepEqual([...b], ['pengantar', 'bidang', 'simpan', 'penutup']);
    assert.ok(!b.includes('jalur') && !b.includes('prodi_nanti'));
    assert.equal(eks.TEKS_EKSPLORASI.smp.tombol, 'Simpan minatku');
    assert.equal(eks.TEKS_EKSPLORASI.smp.penutup, 'Ini baru gambaran awal. Kamu masih punya waktu untuk menentukan.');
    assert.equal(eks.MAKS_MINAT.smp, 5);
    const teksSmp = [eks.TEKS_EKSPLORASI.smp.pengantar, eks.TEKS_EKSPLORASI.smp.penutup].join(' ');
    assert.ok(!/SNBP|SNBT|mandiri|jalur/i.test(teksSmp));
  });

  test('Kelas 10–11: jalur umum (SNBP, SNBT, mandiri), bidang maks. 3, tombol Simpan bidangku, kalimat pengganti daftar prodi', () => {
    assert.deepEqual([...eks.BAGIAN_EKSPLORASI.kelas10_11], ['pengantar', 'jalur', 'bidang', 'simpan', 'prodi_nanti']);
    assert.deepEqual(eks.JALUR_MASUK.map((j) => j.nama), ['SNBP', 'SNBT', 'Seleksi mandiri']);
    assert.equal(eks.MAKS_MINAT.kelas10_11, 3);
    assert.equal(eks.TEKS_EKSPLORASI.kelas10_11.tombol, 'Simpan bidangku');
    assert.equal(eks.TEKS_EKSPLORASI.kelas10_11.prodiNanti, 'Daftar prodi dan syaratnya akan muncul setelah dicek ke sumber resmi.');
  });

  test('Tidak ada tanggal, angka, biaya, daya tampung, atau peluang di teks jalur dan bidang', () => {
    const BULAN = /januari|februari|maret|april|mei|juni|juli|agustus|september|oktober|november|desember/i;
    const semua = [
      ...eks.JALUR_MASUK.map((j) => j.penjelasan),
      ...Object.values(eks.PENJELASAN_BIDANG).flatMap((p) => [p.belajar, p.pekerjaan]),
      eks.TEKS_EKSPLORASI.smp.pengantar,
      eks.TEKS_EKSPLORASI.kelas10_11.pengantar,
    ];
    for (const t of semua) {
      assert.ok(!/\d/.test(t), `angka: ${t}`);
      assert.ok(!BULAN.test(t), `tanggal: ${t}`);
      assert.ok(!/gaji|biaya|daya tampung|peluang|kuota|rupiah|Rp/i.test(t), `angka/klaim: ${t}`);
    }
  });

  test('Penjelasan bidang: semua rumpun yang ada punya penjelasan, tanpa nama prodi', () => {
    assert.deepEqual(Object.keys(eks.PENJELASAN_BIDANG).sort(), RUMPUN_DATA);
    // Nama prodi dari prodi.json, juga bagian sebelum tanda kurung (mis. "Kedokteran").
    const namaProdi = PRODI_JSON.flatMap((p) => [p.nama, p.nama.split(' (')[0]]);
    for (const [rumpun, p] of Object.entries(eks.PENJELASAN_BIDANG)) {
      for (const teks of [p.belajar, p.pekerjaan]) {
        for (const nama of namaProdi) assert.ok(!teks.toLowerCase().includes(nama.toLowerCase()), `${rumpun}: memuat "${nama}"`);
      }
    }
    assert.equal(eks.penjelasanBidang('Rumpun Baru Tanpa Penjelasan'), null);
    assert.equal(eks.penjelasanBidang('toString'), null);
  });

  test('daftarRumpun dari data prodi = daftar server; ubahPilihan & bolehSimpan menghormati batas jenjang', () => {
    assert.deepEqual(eks.daftarRumpun(PRODI_JSON), RUMPUN_DATA);
    assert.deepEqual(eks.daftarRumpun(null), []);
    let p = [];
    for (const r of RUMPUN_DATA) p = eks.ubahPilihan(p, r, 3);
    assert.equal(p.length, 3, 'tambahan ke-4 tidak masuk saat batas 3');
    assert.deepEqual(eks.ubahPilihan(p, p[0], 3), p.slice(1), 'melepas selalu bisa');
    assert.equal(eks.bolehSimpan(['Kesehatan'], [], 3), true);
    assert.equal(eks.bolehSimpan(['Kesehatan'], ['Kesehatan'], 3), false, 'tanpa perubahan');
    assert.equal(eks.bolehSimpan(RUMPUN_DATA, [], 3), false, 'melebihi batas 10–11');
    assert.equal(eks.bolehSimpan(RUMPUN_DATA, [], 5), true);
    assert.equal(eks.samaPilihan(['A', 'B'], ['B', 'A']), true);
  });

  test('Layar: SMP & 10–11 merender dari BAGIAN_EKSPLORASI, tanpa data prodi/tanggal; kelas 12 tetap F10', () => {
    const layar = baca('components', 'screens', 'EksplorasiKampusScreen.tsx');
    assert.ok(layar.includes("if (versi === 'f10') return <EksplorasiTujuanScreen />;"));
    assert.ok(layar.includes('BAGIAN_EKSPLORASI[versi].map('));
    for (const pola of [/useEksplorasiTujuan/, /useTahapanLinimasa/, /formatTanggal/, /formatRentang/, /prodi_impian/]) {
      assert.ok(!pola.test(layar), `layar minat memuat ${pola}`);
    }
    // Data prodi hanya dipakai untuk menurunkan nama rumpun, tidak pernah dirender.
    assert.equal((layar.match(/prodiQuery\.data/g) || []).length, 1);
    assert.ok(layar.includes('daftarRumpun(prodiQuery.data)'));
    assert.ok(layar.includes('<Lencana varian="neutral">Perkiraan</Lencana>'));
    assert.ok(layar.includes('simpan.mutate({ minat_rumpun: pilihan })'), 'yang dikirim hanya minat_rumpun');
    assert.ok(baca('app', '(app)', 'eksplorasi-tujuan.tsx').includes('<EksplorasiKampusScreen />'));
    assert.ok(baca('components', 'layout', 'AppShell.tsx').includes("pathname === '/eksplorasi-tujuan' ? judulEksplorasi(pengguna?.kelas)"));
  });
});

describe('LANJUT_075: data prodi terverifikasi, grid Beranda, salinan teks', () => {
  test('Profil prodi yang belum terverifikasi tidak terkirim (endpoint F10, dipakai kelas 12)', async () => {
    const [[{ belum }]] = await pool.query(
      "SELECT COUNT(*) AS belum FROM profil_prodi WHERE NOT (status_verifikasi = 'terverifikasi' AND diperiksa_pada IS NOT NULL)"
    );
    assert.ok(Number(belum) > 0, 'butuh profil belum terverifikasi di basis data uji');
    const { status, json } = await panggil('GET', '/konten/eksplorasi-tujuan');
    assert.equal(status, 200);
    for (const p of json.data) {
      assert.equal(p.status_verifikasi, 'terverifikasi', `${p.id} belum terverifikasi tapi terkirim`);
      assert.ok(p.diperiksa_pada);
    }
  });

  test('Grid Beranda: satu kartu "Eksplorasi Kampus" ke /eksplorasi-tujuan untuk SMP, 10–11, dan 12 (app & cermin server)', () => {
    for (const daftar of [beranda.daftarKartuBeranda, cermin.daftarKartuBeranda]) {
      for (const kelas of ['7', '8', '9', '10', '11', '12']) {
        const kartu = daftar(kelas).filter((k) => k.href === '/eksplorasi-tujuan');
        assert.equal(kartu.length, 1, `kelas ${kelas}`);
        assert.equal(kartu[0].labelPendek, 'Eksplorasi Kampus');
      }
      assert.ok(daftar(null).every((k) => k.href !== '/eksplorasi-tujuan'), 'akun tanpa kelas tidak berubah');
      assert.ok(daftar('10').length <= 8, 'grid 10–11 tidak bertambah ikon');
    }
  });

  test('Teks baru tercatat DRAF di salinan-teks-lanjut.md', () => {
    const sumber = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'), 'utf8');
    const awal = sumber.indexOf('**LANJUT_App (LANJUT_075)');
    assert.ok(awal >= 0, 'blok LANJUT_075 harus ada');
    const sisa = sumber.slice(awal + 1);
    const blok = sumber.slice(awal, awal + 1 + sisa.search(/\n(?:### |\*\*LANJUT_App \()/));
    assert.match(blok.slice(0, blok.indexOf('\n\n')), /\bDRAF\b/);
    const wajib = [
      'Kenali Minatmu',
      'Jalur dan Bidangmu',
      'Eksplorasi Kampus',
      eks.TEKS_EKSPLORASI.smp.tombol,
      eks.TEKS_EKSPLORASI.kelas10_11.tombol,
      eks.TEKS_EKSPLORASI.smp.penutup,
      eks.TEKS_EKSPLORASI.kelas10_11.prodiNanti,
      eks.TEKS_EKSPLORASI.smp.pengantar,
      eks.TEKS_EKSPLORASI.kelas10_11.pengantar,
      eks.TEKS_EKSPLORASI.kelas10_11.judulJalur,
      eks.TEKS_EKSPLORASI.tersimpan,
      eks.TEKS_EKSPLORASI.perluKebijakan,
      ...eks.JALUR_MASUK.map((j) => j.penjelasan),
      ...Object.values(eks.PENJELASAN_BIDANG).flatMap((p) => [p.belajar, p.pekerjaan]),
    ];
    for (const t of wajib) assert.ok(blok.includes(t), `belum tercatat: ${t}`);
  });
});
