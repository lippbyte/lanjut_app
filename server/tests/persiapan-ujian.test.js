// tests/persiapan-ujian.test.js
// Persiapan Ujian di Daftar Periksa + Kesiapan Ujian di Jalur Saya
// (15 Okt 2026 — pilihan percakapan, belum disetujui PM):
// - data: kategori "Persiapan Ujian" (tryout, simulasi/gladi, Level-In), saran tim,
//   bukan isi laman SNPMB (asal 'tim', url_sumber null — benih menimpa nilai berkas)
// - GET /konten/checklist: butirnya tersaring kelas & jalur seperti butir lain
// - migrasi 023 + PATCH /pengguna/saya kesiapan_ujian: nilai tertutup, gerbang kebijakan,
//   null mengosongkan, tidak ikut dikirim ke penyedia AI
// - app: ringkasan & saran (lib/kesiapanUjian.ts), catatan kategori (lib/daftarPeriksa.ts),
//   seksi di Jalur Saya yang tidak mengubah tahap
// Memakai kunciKonfigurasiGlobal: kesiapan hanya tersimpan bila kebijakan versi berlaku
// diterima, dan persetujuan.test.js sementara menaikkan versi itu.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { nyalakanServer, urlDari, daftarPenggunaBaru, kunciKonfigurasiGlobal, pool } = require('./bantuan');
const { muatModulApp } = require('./muat-ts-app');
const { pernyataanMigrasi, DIR_MIGRASI } = require('../src/db/jalankan-migrasi');
const { benihChecklist } = require('../src/db/benih/benih');
const { ambilKonfigurasi } = require('../src/modul/persetujuan/persetujuan.layanan');
const { KESIAPAN_UJIAN: KESIAPAN_SERVER } = require('../src/modul/pengguna/pengguna.skema');
const { pesanSistem } = require('../src/modul/ngobrol/ngobrol.layanan');

const AKAR_APP = path.join(__dirname, '..', '..');
const AKAR_REPO = path.join(AKAR_APP, '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const kesiapan = muatModulApp('lib/kesiapanUjian');
const daftarPeriksa = muatModulApp('lib/daftarPeriksa');

const BERKAS_MIGRASI = '023_kesiapan_ujian.sql';
const CHECKLIST = JSON.parse(fs.readFileSync(path.join(AKAR_REPO, 'MVP-PWA', 'data', 'checklist.json'), 'utf8'));
const KATEGORI = CHECKLIST.kategori.find((k) => k.id === 'persiapan-ujian');

let server;
let baseUrl;
let lepasKunci;
let versiKebijakan;

before(async () => {
  lepasKunci = await kunciKonfigurasiGlobal();
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  versiKebijakan = (await ambilKonfigurasi()).versiKebijakan;
  await benihChecklist(); // idempoten: isi berkas asli, nilai yang sama
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

async function akun({ setuju = true } = {}) {
  const r = await daftarPenggunaBaru(baseUrl, {
    kelas: '12',
    jenis_sekolah: 'SMA',
    ...(setuju ? { versi_kebijakan: versiKebijakan } : {}),
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return { token: r.json.data.token };
}

const ubah = (a, body) => panggil('PATCH', '/pengguna/saya', a.token, body);
const profil = async (a) => (await panggil('GET', '/pengguna/saya', a.token)).json.data;
const idButir = (data) => data.kategori.flatMap((k) => k.butir.map((b) => b.id));
const ujianDi = async (q) => {
  const r = await panggil('GET', `/konten/checklist${q}`);
  assert.equal(r.status, 200);
  return r.json.data.kategori.find((k) => k.id === 'persiapan-ujian')?.butir.map((b) => b.id) ?? [];
};

describe('Persiapan Ujian: data checklist.json', () => {
  test('Kategori baru di akhir: tryout TKA, simulasi/gladi TKA, Level-In mapel TKA, tryout UTBK-SNBT', () => {
    assert.ok(KATEGORI, 'kategori persiapan-ujian tidak ada');
    assert.equal(KATEGORI.nama, 'Persiapan Ujian');
    assert.equal(CHECKLIST.kategori.at(-1).id, 'persiapan-ujian');
    assert.deepEqual(
      KATEGORI.butir.map((b) => [b.id, b.berlaku_untuk_kelas.join(','), b.berlaku_untuk_jalur.join(',')]),
      [
        ['tryout-tka', '12', 'TKA'],
        ['simulasi-tka', '12', 'TKA'],
        ['levelin-mapel-tka', '11,12', 'TKA'],
        ['tryout-snbt', '12', 'SNBT'],
      ]
    );
    // Butir lama tidak berubah urutannya; butir baru menyambung di belakang.
    const semua = CHECKLIST.kategori.flatMap((k) => k.butir);
    assert.deepEqual(semua.map((b) => b.urutan), semua.map((_, i) => i + 1));
    assert.equal(CHECKLIST.total_butir, semua.length);
  });

  test('Saran tim, bukan isi laman resmi: asal tim, tanpa url_sumber, tanpa tanggal, gladi bersyarat', () => {
    assert.equal(KATEGORI.asal, 'tim');
    assert.equal(KATEGORI.url_sumber, null);
    for (const b of KATEGORI.butir) assert.doesNotMatch(b.judul, /\d/, `tanpa tanggal/angka: ${b.judul}`);
    assert.match(KATEGORI.butir.find((b) => b.id === 'simulasi-tka').judul, /kalau sekolahmu mengadakannya$/);
  });

  test('Benih: kategori saran menimpa asal & url_sumber; kategori lain tetap memakai nilai berkas', async () => {
    const [baris] = await pool.query(
      'SELECT id, kategori_id, asal, url_sumber FROM butir_daftar_periksa WHERE kategori_id IN (?, ?) ORDER BY urutan',
      ['persiapan-ujian', 'berkas']
    );
    const ujian = baris.filter((b) => b.kategori_id === 'persiapan-ujian');
    assert.deepEqual(ujian.map((b) => b.id), KATEGORI.butir.map((b) => b.id));
    for (const b of ujian) assert.deepEqual([b.asal, b.url_sumber], ['tim', null], b.id);
    for (const b of baris.filter((x) => x.kategori_id === 'berkas')) {
      assert.deepEqual([b.asal, b.url_sumber], [CHECKLIST.asal, CHECKLIST.url_sumber], b.id);
    }
  });
});

describe('Persiapan Ujian: GET /konten/checklist tersaring kelas & jalur', () => {
  test('Kelas 12: TKA mendapat tryout, simulasi, Level-In; SNBT hanya tryout UTBK-SNBT; SNBP tidak ada', async () => {
    assert.deepEqual(await ujianDi('?kelas=12&jalur=TKA'), ['tryout-tka', 'simulasi-tka', 'levelin-mapel-tka']);
    assert.deepEqual(await ujianDi('?kelas=12&jalur=SNBT'), ['tryout-snbt']);
    assert.deepEqual(await ujianDi('?kelas=12&jalur=SNBP'), []);
  });

  test('Kelas 11 jalur TKA: hanya cek Level-In; butir lama tetap tampil seperti sebelumnya', async () => {
    assert.deepEqual(await ujianDi('?kelas=11&jalur=TKA'), ['levelin-mapel-tka']);
    const r = await panggil('GET', '/konten/checklist?kelas=12&jalur=SNBP');
    const lama = CHECKLIST.kategori
      .filter((k) => k.id !== 'persiapan-ujian')
      .flatMap((k) => k.butir)
      .filter((b) => b.berlaku_untuk_kelas.includes('12') && b.berlaku_untuk_jalur.includes('SNBP'))
      .map((b) => b.id);
    assert.deepEqual(idButir(r.json.data), lama);
  });
});

describe('Kesiapan ujian: migrasi 023', () => {
  test('Kolom kesiapan_ujian ENUM tertutup, boleh NULL, sesudah mapel_pilihan; migrasi tercatat', async () => {
    const [kolom] = await pool.query(
      `SELECT COLUMN_NAME AS nama, COLUMN_TYPE AS tipe, IS_NULLABLE AS bolehNull
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pengguna'
        ORDER BY ORDINAL_POSITION`
    );
    const i = kolom.findIndex((k) => k.nama === 'kesiapan_ujian');
    assert.ok(i >= 0, 'kolom kesiapan_ujian belum ada — jalankan npm run migrasi');
    assert.equal(kolom[i].tipe, `enum(${KESIAPAN_SERVER.map((k) => `'${k}'`).join(',')})`);
    assert.equal(kolom[i].bolehNull, 'YES');
    assert.equal(kolom[i - 1].nama, 'mapel_pilihan');
    const [catat] = await pool.query('SELECT nama FROM _migrasi WHERE nama = ?', [BERKAS_MIGRASI]);
    assert.equal(catat.length, 1);
  });

  test('Idempoten: isi berkas dijalankan dua kali lagi tanpa galat, kolom tetap satu', async () => {
    const pernyataan = pernyataanMigrasi(fs.readFileSync(path.join(DIR_MIGRASI, BERKAS_MIGRASI), 'utf8'));
    assert.ok(pernyataan.length >= 3, 'berkas harus memeriksa information_schema sebelum ALTER');
    const koneksi = await pool.getConnection();
    try {
      for (let ulang = 0; ulang < 2; ulang++) for (const sql of pernyataan) await koneksi.query(sql);
    } finally {
      koneksi.release();
    }
    const [[{ jumlah }]] = await pool.query(
      `SELECT COUNT(*) AS jumlah FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pengguna' AND COLUMN_NAME = 'kesiapan_ujian'`
    );
    assert.equal(Number(jumlah), 1);
  });
});

describe('Kesiapan ujian: PATCH /pengguna/saya', () => {
  test('Akun baru: null; simpan, ganti, lalu kosongkan dengan null; ikut di /auth/saya', async () => {
    const a = await akun();
    assert.equal((await profil(a)).kesiapan_ujian, null);
    for (const nilai of ['hampir', 'belum', 'siap']) {
      const r = await ubah(a, { kesiapan_ujian: nilai });
      assert.equal(r.status, 200, JSON.stringify(r.json));
      assert.equal(r.json.data.kesiapan_ujian, nilai);
    }
    assert.equal((await panggil('GET', '/auth/saya', a.token)).json.data.kesiapan_ujian, 'siap');
    const kosong = await ubah(a, { kesiapan_ujian: null });
    assert.equal(kosong.status, 200);
    assert.equal(kosong.json.data.kesiapan_ujian, null);
    // Medan lain yang tidak dikirim tidak berubah.
    const r = await ubah(a, { nama_tampilan: 'Uji Kesiapan' });
    assert.equal(r.json.data.kesiapan_ujian, null);
  });

  test('Nilai di luar daftar ditolak 400 VALIDASI_GAGAL di medan kesiapan_ujian, tanpa menyimpan', async () => {
    const a = await akun();
    await ubah(a, { kesiapan_ujian: 'sebagian' });
    for (const salah of ['yakin', '', 'SIAP', 3, ['siap'], { nilai: 'siap' }]) {
      const r = await ubah(a, { kesiapan_ujian: salah });
      assert.equal(r.status, 400, JSON.stringify(salah));
      assert.equal(r.json.galat.kode, 'VALIDASI_GAGAL');
      assert.deepEqual(Object.keys(r.json.galat.medan), ['kesiapan_ujian'], JSON.stringify(r.json.galat.medan));
    }
    assert.equal((await profil(a)).kesiapan_ujian, 'sebagian');
  });

  test('Kebijakan belum diterima: 403 AI_BELUM_DIIZINKAN, tidak ada yang tersimpan (medan lain ikut batal)', async () => {
    const a = await akun({ setuju: false });
    const sebelum = await profil(a);
    const r = await ubah(a, { kesiapan_ujian: 'siap', nama_tampilan: 'Tidak Boleh Tersimpan' });
    assert.equal(r.status, 403, JSON.stringify(r.json));
    assert.equal(r.json.galat.kode, 'AI_BELUM_DIIZINKAN');
    const sesudah = await profil(a);
    assert.equal(sesudah.kesiapan_ujian, null);
    assert.equal(sesudah.nama_tampilan, sebelum.nama_tampilan);
    // Mengosongkan tidak menyimpan penilaian apa pun, jadi tidak perlu gerbang.
    assert.equal((await ubah(a, { kesiapan_ujian: null })).status, 200);
  });

  test('Terisolasi per akun', async () => {
    const a = await akun();
    const b = await akun();
    await ubah(a, { kesiapan_ujian: 'siap' });
    assert.equal((await profil(b)).kesiapan_ujian, null);
  });

  test('Tidak ikut dikirim ke penyedia AI: instruksi sistem identik dengan atau tanpa kesiapan_ujian', () => {
    const dasar = { kelas: '12', jenis_sekolah: 'SMA', prodi_tujuan: null, gaya_belajar: 'visual' };
    for (const k of KESIAPAN_SERVER) {
      assert.equal(pesanSistem({ ...dasar, kesiapan_ujian: k }, null), pesanSistem(dasar, null), k);
    }
  });
});

describe('Kesiapan ujian: logika app (lib/kesiapanUjian.ts)', () => {
  const { ringkasPersiapanUjian, saranKesiapan, KESIAPAN_UJIAN, KATEGORI_PERSIAPAN_UJIAN } = kesiapan;
  const kategori = (ids) => [
    { id: 'pendaftaran', nama: 'Pendaftaran', urutan: 5, butir: [{ id: 'akun-tka' }] },
    { id: KATEGORI_PERSIAPAN_UJIAN, nama: 'Persiapan Ujian', urutan: 12, butir: ids.map((id) => ({ id })) },
  ];
  const TKA = ['tryout-tka', 'simulasi-tka', 'levelin-mapel-tka'];

  test('Pilihan sama persis dengan server (skema) dan ENUM migrasi', () => {
    assert.deepEqual(KESIAPAN_UJIAN.map((k) => k.id), KESIAPAN_SERVER);
    const sql = fs.readFileSync(path.join(DIR_MIGRASI, BERKAS_MIGRASI), 'utf8');
    assert.ok(sql.includes(`ENUM(${KESIAPAN_SERVER.map((k) => `''${k}''`).join(', ')})`));
  });

  test('ringkasPersiapanUjian: hitungan dari kategori Persiapan Ujian saja; null bila jalur tanpa butirnya', () => {
    assert.deepEqual(ringkasPersiapanUjian(kategori(TKA), new Set(['akun-tka'])), { selesai: 0, total: 3, tryout: false, simulasi: false });
    assert.deepEqual(ringkasPersiapanUjian(kategori(TKA), new Set(['tryout-tka'])), { selesai: 1, total: 3, tryout: true, simulasi: false });
    assert.deepEqual(ringkasPersiapanUjian(kategori(['tryout-snbt']), new Set(['tryout-snbt'])), { selesai: 1, total: 1, tryout: true, simulasi: null });
    assert.deepEqual(ringkasPersiapanUjian(kategori([]).slice(0, 1), new Set()), { selesai: 0, total: 0, tryout: null, simulasi: null });
  });

  test('saranKesiapan: belum menjawab → null; belum/sebagian → latihan & Level-In', () => {
    const r = ringkasPersiapanUjian(kategori(TKA), new Set());
    assert.equal(saranKesiapan(null, r), null);
    assert.equal(saranKesiapan(undefined, r), null);
    assert.equal(saranKesiapan('belum', r).langkah.tujuan, '/arsip');
    assert.equal(saranKesiapan('sebagian', r).langkah.tujuan, '/level-in');
  });

  test('saranKesiapan: merasa hampir/sudah siap tapi belum tryout → ditawari tryout dulu, lalu simulasi', () => {
    const belumApaApa = ringkasPersiapanUjian(kategori(TKA), new Set());
    const sudahTryout = ringkasPersiapanUjian(kategori(TKA), new Set(['tryout-tka']));
    const semua = ringkasPersiapanUjian(kategori(TKA), new Set(TKA));
    for (const k of ['hampir', 'siap']) {
      assert.match(saranKesiapan(k, belumApaApa).teks, /tryout/, k);
      assert.match(saranKesiapan(k, sudahTryout).teks, /simulasi atau gladi TKA/, k);
      assert.equal(saranKesiapan(k, sudahTryout).langkah.tujuan, '/daftar-periksa', k);
      assert.doesNotMatch(saranKesiapan(k, semua).teks, /tryout|simulasi/, k);
    }
    assert.equal(saranKesiapan('hampir', semua).langkah.tujuan, '/level-in');
    assert.equal(saranKesiapan('siap', semua).langkah, null);
    // Jalur tanpa butir ujian (SNBP): tidak menawarkan tryout/simulasi yang tidak ada di daftarnya.
    const snbp = ringkasPersiapanUjian([], new Set());
    assert.doesNotMatch(saranKesiapan('siap', snbp).teks, /tryout|simulasi/);
  });

  test('Setiap tujuan tombol saran adalah rute app yang ada', () => {
    const tujuan = new Set();
    for (const k of KESIAPAN_UJIAN) {
      for (const sel of [new Set(), new Set(['tryout-tka']), new Set(TKA)]) {
        const s = saranKesiapan(k.id, ringkasPersiapanUjian(kategori(TKA), sel));
        if (s.langkah) tujuan.add(s.langkah.tujuan);
      }
    }
    assert.deepEqual([...tujuan].sort(), ['/arsip', '/daftar-periksa', '/level-in']);
    for (const t of tujuan) assert.ok(fs.existsSync(path.join(AKAR_APP, 'app', '(app)', `${t.slice(1)}.tsx`)), t);
  });
});

describe('Persiapan Ujian & Kesiapan: layar', () => {
  const { perluCatatanSnpmb, CATATAN_KATEGORI } = daftarPeriksa;
  const kat = (id, butir) => ({ id, nama: id, urutan: 1, butir });

  test('Catatan "Perlu dicek ke laman resmi SNPMB" tidak dipicu kategori saran atau butir pribadi', () => {
    const belum = { id: 'x', diperiksa_pada: null };
    const sudah = { id: 'y', diperiksa_pada: '2026-10-01' };
    assert.equal(perluCatatanSnpmb([kat('persiapan-ujian', [belum])], new Set()), false);
    assert.equal(perluCatatanSnpmb([kat('berkas', [sudah]), kat('persiapan-ujian', [belum])], new Set()), false);
    assert.equal(perluCatatanSnpmb([kat('berkas', [belum])], new Set()), true);
    assert.equal(perluCatatanSnpmb([kat('pendaftaran', [{ id: 'p1', diperiksa_pada: null }])], new Set(['p1'])), false);
    assert.equal(CATATAN_KATEGORI['persiapan-ujian'], kesiapan.TEKS_KESIAPAN.catatanKategori);
  });

  test('Daftar Periksa menampilkan catatan kategori; Jalur Saya memasang seksi Kesiapan Ujian', () => {
    const dp = baca('components', 'screens', 'DaftarPeriksaScreen.tsx');
    assert.match(dp, /const catatan = CATATAN_KATEGORI\[kategori\.id\];/);
    assert.match(dp, /\{catatan \? <Text style=\{s\.catatan\}>\{catatan\}<\/Text> : null\}/);
    assert.match(dp, /const adaBelumTerverifikasi = perluCatatanSnpmb\(kategori, pribadiIds\);/);
    const cp = baca('components', 'screens', 'CekPosisiScreen.tsx');
    assert.match(cp, /<SeksiKesiapanUjian ujian=\{ujian\} \/>/);
    assert.match(cp, /Jawaban kesiapanmu hanya mengubah saran, bukan tahapmu\./);
  });

  test('Tahap Jalur Saya tidak membaca jawaban kesiapan (hanya data Daftar Periksa)', () => {
    assert.doesNotMatch(baca('lib', 'cekPosisi.ts'), /kesiapan/i);
    assert.match(baca('hooks', 'usePosisi.ts'), /const ujian = ringkasPersiapanUjian\(hasil\.data\?\.kategori \?\? \[\], hasil\.data\?\.selesai \?\? new Set\(\)\);/);
  });

  test('Pilihan yang aktif = yang tersimpan di akun; ketukan menyimpan kesiapan_ujian', () => {
    const sumber = baca('components', 'screens', 'KesiapanUjian.tsx');
    assert.match(sumber, /aktif=\{tersimpan === k\.id\}/);
    assert.match(sumber, /simpan\.mutate\(\{ kesiapan_ujian: k\.id \}\)/);
    assert.match(sumber, /simpan\.error\.kode === 'AI_BELUM_DIIZINKAN'/);
  });
});
