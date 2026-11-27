// LANJUT_040 Bagian B: saklar `EXPO_PUBLIC_ALAT_BELAJAR` (mati bawaan) menyembunyikan
// bagian "Alat belajar" (10 rute v1 + 7 rute anak/alias) dari antarmuka v2 untuk APK penguji,
// dengan pengalihan ramah ke /arah-saya bila dibuka langsung. Saat EXPO_PUBLIC_NAVIGASI_V2
// mati, perilaku v1 100% utuh; rute dan berkas v1 tidak dihapus atau diubah.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { muatModulApp } = require('./muat-ts-app');
const audit = require('../tools/audit-siap-tester');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const fitur = muatModulApp('lib/fiturApp');
const navV2 = muatModulApp('lib/navigasiV2');
const navV1 = muatModulApp('lib/navigasi');
const arahSaya = muatModulApp('lib/arahSaya');
const langkahSaya = muatModulApp('lib/langkahSayaV2');

const ast = (rel) => ts.createSourceFile(rel, baca(rel), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
function jelajah(n, fn) {
  fn(n);
  ts.forEachChild(n, (c) => jelajah(c, fn));
}

function berkasDi(dir) {
  const hasil = [];
  const jalan = (d) => {
    const penuh = path.join(AKAR_APP, d);
    if (!fs.existsSync(penuh)) return;
    for (const e of fs.readdirSync(penuh, { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) jalan(rel);
      else if (/\.tsx?$/.test(e.name)) hasil.push(rel);
    }
  };
  jalan(dir);
  return hasil.sort();
}

const SEPULUH_ALAT_BELAJAR = [
  '/arsip',
  '/latihan',
  '/level-in',
  '/ngobrol',
  '/jenjang-saya',
  '/pilih-mapel',
  '/eksplorasi-tujuan',
  '/cek-posisi',
  '/gaya-belajar',
  '/cerita-alumni',
];

const TUJUH_ANAK_ALAT_BELAJAR = [
  '/arsip-tulis',
  '/arsip-kartu',
  '/arsip-modul',
  '/arsip-modul-unggah',
  '/latihan-riwayat',
  '/persetujuan-ortu',
  '/khusus-smk',
];

const SEMUA_17_TERTUTUP = [...SEPULUH_ALAT_BELAJAR, ...TUJUH_ANAK_ALAT_BELAJAR];

const RUTE_PENGECUALIAN = ['/terima-kebijakan', '/kebijakan-privasi', '/linimasa', '/daftar-periksa'];

const RUTE_SISWA_V2 = [
  '/arah-saya',
  '/jejak-waktu',
  '/langkah-saya',
  '/jalur-tujuan',
  '/jalur-tujuan-tulis',
  '/discover',
  '/discover-refleksi',
  '/discover-profil',
  '/portofolio',
  '/portofolio-tulis',
  '/portofolio-butir',
  '/akun',
  '/hapus-akun',
  '/terima-kebijakan',
  '/kebijakan-privasi',
];

/** Memeriksa apakah sebuah node AST berada di dalam cabang `truthy` ekspresi bersyarat yang menjaga saklar Alat belajar. */
function diDalamPenjagaAlatBelajar(node, sf) {
  let cur = node.parent;
  while (cur) {
    if (ts.isConditionalExpression(cur)) {
      const cond = cur.condition.getText(sf);
      if (/ALAT_BELAJAR|alatBelajar/.test(cond)) {
        // Pastikan node berada pada cabang whenTrue (bukan whenFalse)
        if (node.getStart(sf) >= cur.whenTrue.getStart(sf) && node.getEnd() <= cur.whenTrue.getEnd()) {
          return true;
        }
      }
    }
    if (ts.isBinaryExpression(cur) && cur.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) {
      if (/ALAT_BELAJAR|alatBelajar/.test(cur.left.getText(sf))) {
        return true;
      }
    }
    if (ts.isIfStatement(cur)) {
      if (/ALAT_BELAJAR|alatBelajar/.test(cur.expression.getText(sf))) {
        return true;
      }
    }
    cur = cur.parent;
  }
  return false;
}

// ---------------------------------------------------------------------------------------------
describe('Saklar EXPO_PUBLIC_ALAT_BELAJAR mati bawaan & v1 tidak berubah saat NAVIGASI_V2 mati', () => {
  test('alatBelajarAktif mati bawaan dan hanya menyala untuk extra.alatBelajar === true atau EXPO_PUBLIC_ALAT_BELAJAR === "1"', () => {
    const lama = process.env.EXPO_PUBLIC_ALAT_BELAJAR;
    delete process.env.EXPO_PUBLIC_ALAT_BELAJAR;
    try {
      assert.equal(fitur.alatBelajarAktif(), false);
      assert.equal(fitur.alatBelajarAktif(undefined), false);
      assert.equal(fitur.alatBelajarAktif(null), false);
      assert.equal(fitur.alatBelajarAktif({}), false);
    } finally {
      if (lama !== undefined) process.env.EXPO_PUBLIC_ALAT_BELAJAR = lama;
    }

    for (const extra of [{ alatBelajar: false }, { alatBelajar: '1' }, { alatBelajar: 1 }, { alatBelajar: null }]) {
      assert.equal(fitur.alatBelajarAktif(extra, { EXPO_PUBLIC_ALAT_BELAJAR: '1' }), false, JSON.stringify(extra));
    }
    assert.equal(fitur.alatBelajarAktif({ alatBelajar: true }, {}), true);

    for (const nilai of [undefined, '', '0', 'true', 'yes', '2']) {
      assert.equal(fitur.alatBelajarAktif({}, { EXPO_PUBLIC_ALAT_BELAJAR: nilai }), false, String(nilai));
    }
    assert.equal(fitur.alatBelajarAktif({}, { EXPO_PUBLIC_ALAT_BELAJAR: '1' }), true);

    // Pastikan tidak memagari process.env.EXPO_PUBLIC_ALAT_BELAJAR dengan `typeof process !== 'undefined'`
    // agar penyisipan statis babel-preset-expo di bundel web tetap menyala saat EXPO_PUBLIC_ALAT_BELAJAR=1.
    assert.doesNotMatch(
      baca('lib/fiturApp.ts'),
      /typeof process !== 'undefined'\s*&&\s*process\.env\.EXPO_PUBLIC_ALAT_BELAJAR/
    );

    // Pastikan tidak ada berkas build / Docker / server env yang menyalakan EXPO_PUBLIC_ALAT_BELAJAR
    for (const b of [
      'eas.json',
      'app.config.ts',
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.dev.yml',
      'server/.env.example',
      'server/.env.production.example',
      'server/.env.railway.contoh',
    ]) {
      assert.ok(!baca(b).includes('EXPO_PUBLIC_ALAT_BELAJAR'), `${b} tidak boleh menyalakan atau mengubah konfigurasi untuk ALAT_BELAJAR`);
    }
    // .env.example klien mencatat bawaan mati (=0)
    assert.match(baca('.env.example'), /^EXPO_PUBLIC_ALAT_BELAJAR=0$/m);
  });

  test('NAVIGASI_V2 mati: perilaku, tab, dan 17 rute/layar v1 sama sekali tidak berubah', () => {
    assert.equal(navV2.ruteAwalApp({}), '/linimasa');
    assert.equal(navV2.ruteAwalApp({ navigasiV2: false, alatBelajar: false }), '/linimasa');
    assert.deepEqual(
      navV1.TAB_BAWAH.map((t) => t.href),
      ['/linimasa', '/jenjang-saya', '/ngobrol', '/pilih-mapel', '/daftar-periksa']
    );
    // app/(app)/_layout.tsx memakai AppShell (v1) saat navigasiV2 mati, sehingga AppShellV2 tidak berjalan
    assert.match(
      baca('app/(app)/_layout.tsx'),
      /const Shell = navigasiV2Aktif\(Constants\.expoConfig\?\.extra\) \? AppShellV2 : AppShell;/
    );
    // Seluruh 17 berkas rute v1 di app/(app)/ masih ada dan tidak diubah untuk memeriksa ALAT_BELAJAR
    for (const r of SEMUA_17_TERTUTUP) {
      const berkas = `app/(app)/${r.slice(1)}.tsx`;
      assert.ok(fs.existsSync(path.join(AKAR_APP, berkas)), `rute v1 hilang: ${berkas}`);
      assert.doesNotMatch(baca(berkas), /alatBelajar|ALAT_BELAJAR|ruteAlatBelajarTertutup/, `${berkas} v1 tidak boleh diubah`);
    }
    // Layar v1 tidak mengenal saklar Alat belajar v2
    for (const v1 of [
      'components/layout/AppShell.tsx',
      'components/screens/LinimasaScreen.tsx',
      'components/screens/DaftarPeriksaScreen.tsx',
      'components/screens/LevelInScreen.tsx',
      'components/screens/NgobrolScreen.tsx',
      'components/screens/AkunScreen.tsx',
    ]) {
      assert.doesNotMatch(baca(v1), /alatBelajar|ALAT_BELAJAR|ruteAlatBelajarTertutup/, `${v1} (v1) tidak boleh disentuh`);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('NAVIGASI_V2 menyala + ALAT_BELAJAR mati: 0 tombol/tautan v2 ke 10 rute v1 (+7 anak)', () => {
  test('ArahSayaV2 membungkus bagian "Alat belajar" di balik SAKLAR.alatBelajar', () => {
    const src = baca('components/screens/v2/ArahSayaV2.tsx');
    assert.match(src, /alatBelajar:\s*alatBelajarAktif\(EXTRA\)/);
    assert.match(src, /\{SAKLAR\.alatBelajar \? \([\s\S]*TEKS_ARAH_SAYA\.alatBelajarJudul[\s\S]*ALAT_BELAJAR_V2\.map/);
  });

  test('Uji AST statis seluruh layar & komponen v2: tidak ada satu pun tautan/tombol tak terjaga menuju 17 rute Alat belajar v1', () => {
    const setTertutup = new Set(SEMUA_17_TERTUTUP);
    const berkasV2 = [...berkasDi('components/screens/v2'), ...berkasDi('components/v2')];
    assert.ok(berkasV2.length >= 15, 'harus memeriksa seluruh layar dan komponen v2');

    const pelanggaran = [];
    for (const rel of berkasV2) {
      const sf = ast(rel);
      const baris = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      jelajah(sf, (n) => {
        if (!ts.isStringLiteral(n) && !ts.isNoSubstitutionTemplateLiteral(n)) return;
        const teks = n.text;
        if (!setTertutup.has(teks)) return;

        // Pengecualian sah non-navigasi: daftar TANPA_GULIR_HALAMAN di AppShellV2
        if (rel === 'components/screens/v2/AppShellV2.tsx' && teks === '/ngobrol') {
          const barisKode = sf.getFullText().split('\n')[baris(n) - 1] || '';
          if (/TANPA_GULIR_HALAMAN/.test(barisKode)) return;
        }

        // Setiap rujukan ke rute Alat belajar di layar v2 WAJIB berada di dalam penjaga saklar ALAT_BELAJAR
        if (!diDalamPenjagaAlatBelajar(n, sf)) {
          pelanggaran.push(`${rel}:${baris(n)} merujuk "${teks}" tanpa penjaga saklar ALAT_BELAJAR`);
        }
      });

      // Pastikan juga ALAT_BELAJAR_V2 bila dipakai di layar v2 selalu di dalam penjaga saklar ALAT_BELAJAR
      jelajah(sf, (n) => {
        if (ts.isIdentifier(n) && n.text === 'ALAT_BELAJAR_V2') {
          if (ts.isImportSpecifier(n.parent)) return;
          if (!diDalamPenjagaAlatBelajar(n, sf)) {
            pelanggaran.push(`${rel}:${baris(n)} memakai ALAT_BELAJAR_V2 tanpa penjaga saklar ALAT_BELAJAR`);
          }
        }
      });
    }
    assert.deepEqual(pelanggaran, []);
  });

  test('LangkahSayaV2 & lib/langkahSayaV2 tidak mengarahkan keadaan kosong non-SMP ke /pilih-mapel saat ALAT_BELAJAR mati', () => {
    // Non-SMP + alatBelajar mati -> null (tidak menuju /pilih-mapel)
    assert.equal(langkahSaya.aksiKosongLangkahSaya({ kelas: '10', bisaEventSmp: false, alatBelajar: false }), null);
    assert.equal(langkahSaya.aksiKosongLangkahSaya({ kelas: '11', bisaEventSmp: false }), null);
    // SMP + bisaEventSmp tetap membuka formulir lokal tambah_jadwal (bukan rute v1)
    assert.equal(
      langkahSaya.aksiKosongLangkahSaya({ kelas: '8', bisaEventSmp: true, alatBelajar: false }).jenis,
      'tambah_jadwal'
    );
    // Saat alatBelajar menyala, non-SMP kembali mengarah ke /pilih-mapel seperti 032
    assert.deepEqual(
      langkahSaya.aksiKosongLangkahSaya({ kelas: '10', bisaEventSmp: false, alatBelajar: true }),
      { jenis: 'rute', label: langkahSaya.TEKS_LANGKAH_SAYA.kosongTombolMapel, href: '/pilih-mapel' }
    );

    // LangkahSayaV2 meneruskan ALAT_BELAJAR ke aksiKosongLangkahSaya & melindungi tombol bawah + materi arsip
    const src = baca('components/screens/v2/LangkahSayaV2.tsx');
    assert.match(src, /const ALAT_BELAJAR = alatBelajarAktif\(Constants\.expoConfig\?\.extra\);/);
    assert.match(src, /aksiKosongLangkahSaya\(\{[\s\S]*alatBelajar:\s*ALAT_BELAJAR/);
    assert.match(src, /\{ALAT_BELAJAR \? \([\s\S]*s\.barisPintuBawah/);
    assert.match(src, /\{ALAT_BELAJAR && materi\.buka === 'arsip' \?/);
  });

  test('Graf navigasi v2: 0 dari 17 rute Alat belajar terjangkau saat mati, 17 saat menyala; 15 rute siswa v2 utuh', () => {
    const dasar = { discover: true, jalurTujuan: true, portofolio: true, kelolaDataAkun: true };
    const mati = navV2.ruteTerjangkauV2({ ...dasar, alatBelajar: false }, arahSaya.daftarPintuArahSaya(dasar));
    const menyala = navV2.ruteTerjangkauV2({ ...dasar, alatBelajar: true }, arahSaya.daftarPintuArahSaya(dasar));

    assert.deepEqual(
      SEMUA_17_TERTUTUP.filter((r) => mati.has(r)),
      []
    );
    assert.deepEqual(
      SEMUA_17_TERTUTUP.filter((r) => menyala.has(r)).sort(),
      [...SEMUA_17_TERTUTUP].sort()
    );
    for (const r of RUTE_SISWA_V2) {
      assert.ok(mati.has(r), `rute siswa v2 ${r} tidak boleh hilang saat ALAT_BELAJAR mati`);
      assert.ok(menyala.has(r), `rute siswa v2 ${r} tidak boleh hilang saat ALAT_BELAJAR menyala`);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('Membuka langsung rute Alat belajar -> pengalihan ramah ke /arah-saya; pengecualian tetap terbuka', () => {
  test('ruteAlatBelajarTertutup menutup seluruh 17 rute saat ALAT_BELAJAR mati (termasuk query & garis miring akhir) dan membuka semua saat menyala', () => {
    assert.equal(navV2.RUTE_ALAT_BELAJAR_TERTUTUP.length, 17);
    for (const r of SEMUA_17_TERTUTUP) {
      assert.equal(navV2.ruteAlatBelajarTertutup(r, false), true, `${r} harus dialihkan saat mati`);
      assert.equal(navV2.ruteAlatBelajarTertutup(`${r}/`, false), true, `${r}/ harus dialihkan saat mati`);
      assert.equal(navV2.ruteAlatBelajarTertutup(`${r}?id=123`, false), true, `${r}?id=123 harus dialihkan saat mati`);
      assert.equal(navV2.ruteAlatBelajarTertutup(r, undefined), true, `${r} bawaan undefined harus dialihkan`);
      assert.equal(navV2.ruteAlatBelajarTertutup(r, true), false, `${r} harus terbuka saat ALAT_BELAJAR=1`);
    }
  });

  test('Rute pengecualian (/terima-kebijakan, /kebijakan-privasi, /linimasa, /daftar-periksa) dan seluruh rute v2 TIDAK dialihkan', () => {
    for (const r of [...RUTE_PENGECUALIAN, ...RUTE_SISWA_V2, '/masuk', '/daftar', '/']) {
      assert.equal(navV2.ruteAlatBelajarTertutup(r, false), false, `${r} tidak boleh dialihkan`);
      assert.equal(navV2.ruteAlatBelajarTertutup(r, undefined), false, `${r} tidak boleh dialihkan`);
    }
  });

  test('AppShellV2 sungguh mengalihkan rute tertutup ke /arah-saya tanpa melepas Slot (bukan layar kosong atau galat)', () => {
    const shell = baca('components/screens/v2/AppShellV2.tsx');
    assert.match(shell, /alatBelajar:\s*alatBelajarAktif\(EXTRA\)/);
    assert.match(shell, /const ruteTertutup = ruteAlatBelajarTertutup\(pathname, SAKLAR\.alatBelajar\);/);
    assert.match(shell, /if \(ruteTertutup\) \{\s*router\.replace\('\/arah-saya' as any\);\s*\}/);
    assert.match(shell, /\{ruteTertutup \? \([\s\S]*<View style=\{s\.tersembunyi\}>\{children\}<\/View>/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Token, batas kata, audit-siap-tester, dokumentasi, dan gerbang rilis', () => {
  test('0 HEX langsung dan 0 ungu terlarang di semua berkas yang disentuh LANJUT_040; batas 40 kata terjaga', () => {
    const POLA_WARNA = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(.*)$/i;
    const UNGU_TERLARANG = new RegExp('#' + '6a3dff', 'i');
    for (const rel of [
      'lib/fiturApp.ts',
      'lib/navigasiV2.ts',
      'lib/arahSaya.ts',
      'lib/langkahSayaV2.ts',
      'components/screens/v2/AppShellV2.tsx',
      'components/screens/v2/ArahSayaV2.tsx',
      'components/screens/v2/LangkahSayaV2.tsx',
    ]) {
      assert.doesNotMatch(baca(rel), UNGU_TERLARANG, `${rel}: ungu terlarang`);
      const sf = ast(rel);
      jelajah(sf, (n) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && POLA_WARNA.test(n.text)) {
          assert.fail(`HEX langsung di ${rel}: "${n.text}"`);
        }
      });
    }
    for (const alatBelajar of [false, true]) {
      const teksArah = arahSaya.teksTetapArahSaya({
        saklar: { discover: true, jalurTujuan: true, portofolio: true, kelolaDataAkun: true, alatBelajar },
        arahku: 'ada_jalur_draf',
        langkahKosong: true,
      });
      assert.ok(arahSaya.hitungKata(teksArah.join(' ')) <= 40);
      for (const keadaan of ['kelas12_isi', 'kosong', 'galat']) {
        const teksLangkah = langkahSaya.teksTetapLangkahSaya({
          keadaan,
          statusProgres: 'berjalan',
          adaCatatanSnpmb: true,
          bisaEventSmp: false,
          kelas: '10',
          alatBelajar,
        });
        assert.ok(langkahSaya.hitungKata(teksLangkah.join(' ')) <= 40);
      }
    }
  });

  test('audit-siap-tester, docs/rencana-040.md, dokumen saklar, dan persetujuan rilis konsisten', () => {
    const hasilAudit = audit.auditAlatBelajar();
    assert.equal(hasilAudit.totalRuteAlatBelajarV1, 17);
    assert.equal(hasilAudit.ruteV1TerjangkauSaatMati, 0);
    assert.equal(hasilAudit.ruteV1TerjangkauSaatMenyala, 17);
    assert.equal(hasilAudit.ruteSiswaV2TerjangkauSaatMati, 15);
    assert.equal(hasilAudit.totalRuteSiswaV2, 15);
    assert.equal(hasilAudit.semuaAlatDialihkanSaatMati, true);
    assert.equal(hasilAudit.pengecualianTetapTerbuka, true);

    assert.ok(fs.existsSync(path.join(AKAR_APP, 'docs', 'rencana-040.md')));
    assert.match(baca('docs/peta-navigasi-v2.md'), /EXPO_PUBLIC_ALAT_BELAJAR/);
    assert.match(baca('docs/profil-build-tester-v2.md'), /EXPO_PUBLIC_ALAT_BELAJAR/);
    assert.match(baca('docs/uji-hp-expo-go.md'), /LANJUT_040/);
    assert.match(baca('docs/uji-hp-expo-go.md'), /EXPO_PUBLIC_ALAT_BELAJAR/);
    assert.deepEqual(JSON.parse(baca('docs/persetujuan-teks-rilis.json')).disetujui, []);
  });
});
