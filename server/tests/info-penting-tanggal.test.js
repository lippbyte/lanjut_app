// tests/info-penting-tanggal.test.js
// Pengujian otomatis LANJUT_072b — Info Penting tidak menampilkan tahapan yang
// tanggal selesainya sudah lewat (zona waktu Asia/Jakarta). Menjalankan
// lib/linimasa.ts milik app langsung (muat-ts-app.js), lalu membandingkannya
// dengan cermin server src/util/linimasa.js. Tanpa basis data.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { muatModulApp } = require('./muat-ts-app');
const cermin = require('../src/util/linimasa');

const app = muatModulApp('lib/linimasa');
const { hariIniWib, infoPentingLinimasa, turunkanLinimasa, tampilanInfoPenting, KALIMAT_INFO_PENTING_KOSONG } = app;

const AKAR_REPO = path.join(__dirname, '..', '..', '..');
const HARI = Date.UTC(2026, 9, 13); // 13 Oktober 2026
const SEHARI = 86400000;

function tahap(id, mulai, selesai, lain = {}) {
  return {
    id,
    judul: `Tahap ${id}`,
    tanggal_mulai: mulai,
    tanggal_selesai: selesai,
    jalur: 'TKA',
    status_verifikasi: 'terverifikasi',
    diperiksa_pada: '2026-09-27',
    url_sumber: 'https://www.kemendikdasmen.go.id/',
    ...lain,
  };
}

const LEWAT = tahap('lewat', '2026-07-27', '2026-09-27');
const KEMARIN = tahap('kemarin', '2026-10-01', '2026-10-12');
const HARI_INI = tahap('hari-ini', '2026-10-05', '2026-10-13');
const BERJALAN = tahap('berjalan', '2026-10-10', '2026-10-20');
const MENDATANG = tahap('mendatang', '2026-10-26', '2026-11-08');
const TANPA_SELESAI = tahap('tanpa-selesai', '2026-09-01', null);
const SELESAI_KOSONG = tahap('selesai-kosong', '2026-09-02', '');
const BELUM_DICEK = tahap('belum-dicek', '2026-10-15', '2026-10-30', { status_verifikasi: 'belum_diverifikasi', diperiksa_pada: null });

const id = (daftar) => daftar.map((b) => b.id);

describe('LANJUT_072b: penyaringan tanggal Info Penting', () => {
  test('Tahapan yang tanggal selesainya sudah lewat disaring', () => {
    assert.deepEqual(id(infoPentingLinimasa([LEWAT, KEMARIN, MENDATANG], '12', HARI)), ['mendatang']);
  });

  test('Tahapan yang sedang berjalan tetap tampil', () => {
    assert.deepEqual(id(infoPentingLinimasa([LEWAT, BERJALAN], '12', HARI)), ['berjalan']);
  });

  test('Tahapan yang selesai hari ini tetap tampil sampai akhir hari, lalu hilang besoknya', () => {
    assert.deepEqual(id(infoPentingLinimasa([HARI_INI], '12', HARI)), ['hari-ini']);
    assert.deepEqual(id(infoPentingLinimasa([HARI_INI], '12', HARI + SEHARI)), []);
  });

  test('Tahapan tanpa tanggal selesai tetap tampil, walau tanggal mulainya sudah lewat', () => {
    assert.deepEqual(id(infoPentingLinimasa([TANPA_SELESAI, SELESAI_KOSONG], '12', HARI)), ['tanpa-selesai', 'selesai-kosong']);
  });

  test('Paling banyak tiga, urut tanggal mulai, dihitung SESUDAH disaring', () => {
    const data = [MENDATANG, BERJALAN, LEWAT, HARI_INI, KEMARIN, TANPA_SELESAI];
    assert.deepEqual(id(infoPentingLinimasa(data, '12', HARI)), ['tanpa-selesai', 'hari-ini', 'berjalan']);
  });

  test('Yang belum diverifikasi tetap tidak tampil (aturan LANJUT_066)', () => {
    assert.deepEqual(id(infoPentingLinimasa([BELUM_DICEK, MENDATANG], '12', HARI)), ['mendatang']);
  });

  test('Data tidak dihapus: tahapan lewat tetap ada di turunkanLinimasa, hanya tidak diambil Info Penting', () => {
    const { butir } = turunkanLinimasa([LEWAT, MENDATANG], HARI);
    assert.deepEqual(id(butir), ['lewat', 'mendatang']);
    assert.equal(butir.find((b) => b.id === 'lewat').status, 'done');
  });
});

describe('LANJUT_072b: "hari ini" menurut Asia/Jakarta (WIB)', () => {
  test('Batas tengah malam WIB (UTC+7)', () => {
    assert.equal(hariIniWib(Date.UTC(2026, 9, 12, 17, 0, 0)), HARI, '00.00 WIB 13 Okt');
    assert.equal(hariIniWib(Date.UTC(2026, 9, 13, 16, 59, 59)), HARI, '23.59 WIB 13 Okt');
    assert.equal(hariIniWib(Date.UTC(2026, 9, 13, 17, 0, 0)), HARI + SEHARI, '00.00 WIB 14 Okt');
  });

  test('Tahapan yang selesai 13 Okt: tampil pukul 23.59 WIB, hilang pukul 00.00 WIB 14 Okt', () => {
    assert.deepEqual(id(infoPentingLinimasa([HARI_INI], '12', hariIniWib(Date.UTC(2026, 9, 13, 16, 59, 59)))), ['hari-ini']);
    assert.deepEqual(id(infoPentingLinimasa([HARI_INI], '12', hariIniWib(Date.UTC(2026, 9, 13, 17, 0, 0)))), []);
  });

  test('Tidak bergantung pada zona waktu perangkat', () => {
    const tzAsli = process.env.TZ;
    // 16.30 UTC 13 Okt = 23.30 WIB 13 Okt.
    const saat = Date.UTC(2026, 9, 13, 16, 30, 0);
    try {
      for (const tz of ['America/Los_Angeles', 'UTC', 'Pacific/Kiritimati', 'Asia/Jayapura']) {
        process.env.TZ = tz;
        // Kalau dihitung dari tanggal LOKAL perangkat, hasilnya berbeda-beda per zona:
        const tanggalLokal = new Date(saat).getDate();
        if (tz === 'Pacific/Kiritimati' || tz === 'Asia/Jayapura') assert.equal(tanggalLokal, 14, `${tz}: TZ belum berlaku`);
        assert.equal(hariIniWib(saat), HARI, `hariIniWib berubah di zona ${tz}`);
      }
    } finally {
      if (tzAsli === undefined) delete process.env.TZ;
      else process.env.TZ = tzAsli;
    }
  });
});

describe('LANJUT_072b: kalimat bila semua tersaring', () => {
  test('Semua tahapan terverifikasi sudah lewat → "Belum ada info penting untuk saat ini."', () => {
    const t = tampilanInfoPenting([LEWAT, KEMARIN], '12', HARI);
    assert.deepEqual(t, { jenis: 'kosong', kalimat: 'Belum ada info penting untuk saat ini.' });
    assert.equal(KALIMAT_INFO_PENTING_KOSONG, 'Belum ada info penting untuk saat ini.');
  });

  test('Ada yang belum lewat → kartu, bukan kalimat', () => {
    const t = tampilanInfoPenting([LEWAT, MENDATANG], '12', HARI);
    assert.equal(t.jenis, 'kartu');
    assert.deepEqual(id(t.butir), ['mendatang']);
  });

  test('Tidak ada data terverifikasi sama sekali → seksi tetap hilang (aturan LANJUT_066)', () => {
    assert.deepEqual(tampilanInfoPenting([], '12', HARI), { jenis: 'sembunyi' });
    assert.deepEqual(tampilanInfoPenting([BELUM_DICEK], '12', HARI), { jenis: 'sembunyi' });
  });

  test('Bukan kelas 12 → seksi tidak tampil, apa pun datanya', () => {
    for (const kelas of ['7', '10', '11', null]) {
      assert.deepEqual(tampilanInfoPenting([LEWAT], kelas, HARI), { jenis: 'sembunyi' }, `kelas ${kelas}`);
      assert.deepEqual(tampilanInfoPenting([MENDATANG], kelas, HARI), { jenis: 'sembunyi' }, `kelas ${kelas}`);
    }
  });

  test('Kalimat tercatat DRAF di salinan-teks-lanjut.md', () => {
    const sumber = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'), 'utf8');
    const awal = sumber.indexOf('**LANJUT_App (LANJUT_072b)');
    assert.ok(awal >= 0, 'blok LANJUT_072b harus ada');
    const blok = sumber.slice(awal, sumber.indexOf('\n### ', awal));
    assert.match(blok.slice(0, blok.indexOf('\n\n')), /\bDRAF\b/);
    assert.ok(blok.includes(`:** ${KALIMAT_INFO_PENTING_KOSONG}`));
  });
});

describe('LANJUT_072b: satu tempat untuk logika tanggal', () => {
  test('Kartu tenggat (hero), Info Penting, dan Jalur Saya (/cek-posisi) memakai "hari ini" yang sama (default = hariIniWib)', () => {
    const data = [LEWAT, KEMARIN, HARI_INI, BERJALAN, MENDATANG];
    assert.deepEqual(turunkanLinimasa(data), turunkanLinimasa(data, hariIniWib()));
    assert.deepEqual(infoPentingLinimasa(data, '12'), infoPentingLinimasa(data, '12', hariIniWib()));
    assert.deepEqual(tampilanInfoPenting(data, '12'), tampilanInfoPenting(data, '12', hariIniWib()));
  });

  test('Yang dianggap lewat oleh tenggat sama persis dengan yang disaring Info Penting', () => {
    const data = [LEWAT, KEMARIN, HARI_INI, BERJALAN];
    const { butir, terdekat } = turunkanLinimasa(data, HARI);
    const lewat = butir.filter((b) => b.status === 'done').map((b) => b.id);
    const info = id(infoPentingLinimasa(data, '12', HARI));
    assert.deepEqual(lewat, ['lewat', 'kemarin']);
    for (const x of lewat) assert.ok(!info.includes(x), `${x} lewat tetapi tampil di Info Penting`);
    assert.ok(terdekat && !lewat.includes(terdekat.id), 'tenggat terdekat tidak boleh tahapan yang sudah lewat');
  });

  test('Layar Beranda tidak menulis logika tanggal sendiri', () => {
    const layar = fs.readFileSync(path.join(AKAR_REPO, 'LANJUT_App', 'components', 'screens', 'LinimasaScreen.tsx'), 'utf8');
    assert.ok(layar.includes('tampilanInfoPenting('), 'Info Penting harus lewat tampilanInfoPenting');
    for (const pola of [/new Date\(/, /Date\.now\(/, /Date\.UTC\(/, /getDate\(/]) {
      assert.ok(!pola.test(layar), `LinimasaScreen.tsx memuat ${pola}`);
    }
  });
});

describe('LANJUT_072b: cermin server sama dengan app', () => {
  test('hariIniWib, infoPentingLinimasa, dan tampilanInfoPenting identik untuk banyak tanggal', () => {
    const data = [LEWAT, KEMARIN, HARI_INI, BERJALAN, MENDATANG, TANPA_SELESAI, SELESAI_KOSONG, BELUM_DICEK];
    const saat = [Date.UTC(2026, 6, 1), Date.UTC(2026, 9, 12, 17), Date.UTC(2026, 9, 13, 16, 59), Date.UTC(2026, 9, 13, 17), Date.UTC(2026, 11, 1)];
    for (const ms of saat) {
      assert.equal(app.hariIniWib(ms), cermin.hariIniWib(ms));
      const hari = app.hariIniWib(ms);
      for (const kelas of ['7', '10', '12', null]) {
        assert.deepEqual(app.infoPentingLinimasa(data, kelas, hari), cermin.infoPentingLinimasa(data, kelas, hari));
        assert.deepEqual(app.tampilanInfoPenting(data, kelas, hari), cermin.tampilanInfoPenting(data, kelas, hari));
      }
    }
    assert.equal(app.KALIMAT_INFO_PENTING_KOSONG, cermin.KALIMAT_INFO_PENTING_KOSONG);
  });
});
