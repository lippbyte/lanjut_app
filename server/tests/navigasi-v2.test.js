// LANJUT_031: navigasi v2 dan Arah Saya (saklar EXPO_PUBLIC_NAVIGASI_V2, mati bawaan).
// Modul murni dites langsung; layar & bilah tab React Native dites dari sumber (TypeScript AST),
// mengikuti pola alur-masuk-v2.test.js dan fondasi-desain-v2.test.js.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { muatModulApp } = require('./muat-ts-app');
const gerbang = require('../tools/periksa-gerbang-rilis');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const fitur = muatModulApp('lib/fiturApp');
const navV2 = muatModulApp('lib/navigasiV2');
const arahSaya = muatModulApp('lib/arahSaya');
const navV1 = muatModulApp('lib/navigasi');

const ast = (rel) => ts.createSourceFile(rel, baca(rel), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
function jelajah(n, fn) {
  fn(n);
  ts.forEachChild(n, (c) => jelajah(c, fn));
}

function muatKonfigApp(envTiruan) {
  const { outputText } = ts.transpileModule(baca('app.config.ts'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const modul = { exports: {} };
  vm.runInNewContext(outputText, {
    exports: modul.exports,
    module: modul,
    require: () => ({}),
    process: { env: { ...envTiruan }, argv: ['node', 'expo', 'start'] },
    console,
  });
  return (modul.exports.default ?? modul.exports).extra;
}

function aturanBlokir(nilai) {
  const env = { ...process.env };
  delete env.EXPO_PUBLIC_NAVIGASI_V2;
  if (nilai !== undefined) env.EXPO_PUBLIC_NAVIGASI_V2 = nilai;
  const skrip =
    "const c=require('./metro.config.js');console.log(JSON.stringify([].concat(c.resolver.blockList||[]).map(r=>[r.source,r.flags])))";
  const baris = execFileSync(process.execPath, ['-e', skrip], {
    cwd: AKAR_APP,
    env,
    encoding: 'utf8',
    timeout: 60000,
  })
    .trim()
    .split('\n')
    .pop();
  return JSON.parse(baris).map(([s, f]) => new RegExp(s, f));
}
const terblokir = (aturan, berkas) => aturan.some((r) => r.test(berkas));

const KOMBINASI_SAKLAR = [];
for (const discover of [false, true]) {
  for (const jalurTujuan of [false, true]) {
    for (const portofolio of [false, true]) {
      for (const kelolaDataAkun of [false, true]) {
        KOMBINASI_SAKLAR.push({ discover, jalurTujuan, portofolio, kelolaDataAkun });
      }
    }
  }
}

// ---------------------------------------------------------------------------------------------
describe('Saklar mati: navigasi v1 tidak berubah', () => {
  test('navigasiV2Aktif hanya menyala untuk extra.navigasiV2 === true', () => {
    for (const extra of [undefined, null, {}, 'ya', { navigasiV2: false }, { navigasiV2: '1' }, { navigasiV2: 1 }]) {
      assert.equal(fitur.navigasiV2Aktif(extra), false, JSON.stringify(extra));
    }
    assert.equal(fitur.navigasiV2Aktif({ navigasiV2: true }), true);
  });

  test('Bawaan mati di app.config; tidak ada profil build, Docker, atau contoh env yang menyalakan', () => {
    assert.equal(muatKonfigApp({}).navigasiV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_NAVIGASI_V2: '0' }).navigasiV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_NAVIGASI_V2: 'true' }).navigasiV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_NAVIGASI_V2: '1' }).navigasiV2, true);
    for (const b of [
      'eas.json',
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.dev.yml',
      'server/.env.example',
      'server/.env.production.example',
      'server/.env.railway.contoh',
    ]) {
      assert.ok(!baca(b).includes('NAVIGASI_V2'), b);
    }
  });

  test('Saat mati, /arah-saya, /jejak-waktu, dan /langkah-saya keluar dari bundel Metro dan punya penjaga lapis kedua', () => {
    for (const nilai of [undefined, '0', 'true']) {
      const aturan = aturanBlokir(nilai);
      for (const nama of ['arah-saya.tsx', 'jejak-waktu.tsx', 'langkah-saya.tsx']) {
        assert.ok(terblokir(aturan, `C:\\repo\\app\\(app)\\${nama}`), `${nilai} ${nama} (Windows)`);
        assert.ok(terblokir(aturan, `/repo/app/(app)/${nama}`), `${nilai} ${nama} (Linux)`);
      }
      assert.ok(!terblokir(aturan, '/repo/app/(app)/linimasa.tsx'));
      assert.ok(!terblokir(aturan, '/repo/app/(app)/daftar-periksa.tsx'));
    }
    const aktif = aturanBlokir('1');
    for (const nama of ['arah-saya.tsx', 'jejak-waktu.tsx', 'langkah-saya.tsx']) {
      assert.ok(!terblokir(aktif, `/repo/app/(app)/${nama}`), nama);
    }
    assert.match(
      baca('app/(app)/arah-saya.tsx'),
      /if \(!navigasiV2Aktif\(Constants\.expoConfig\?\.extra\)\) return <Redirect href="\/linimasa" \/>;/
    );
    assert.match(
      baca('app/(app)/jejak-waktu.tsx'),
      /if \(!navigasiV2Aktif\(Constants\.expoConfig\?\.extra\)\) return <Redirect href="\/linimasa" \/>;/
    );
    assert.match(
      baca('app/(app)/langkah-saya.tsx'),
      /if \(!navigasiV2Aktif\(Constants\.expoConfig\?\.extra\)\) return <Redirect href="\/daftar-periksa" \/>;/
    );
  });

  test('Rute awal, tata letak, dan tab v1 utuh saat saklar mati', () => {
    assert.equal(navV2.ruteAwalApp({}), '/linimasa');
    assert.equal(navV2.ruteAwalApp({ navigasiV2: false }), '/linimasa');
    assert.equal(navV2.ruteAwalApp({ navigasiV2: true }), '/arah-saya');
    assert.deepEqual(
      navV1.TAB_BAWAH.map((t) => t.href),
      ['/linimasa', '/jenjang-saya', '/ngobrol', '/pilih-mapel', '/daftar-periksa']
    );
    assert.match(baca('app/(app)/_layout.tsx'), /const Shell = navigasiV2Aktif\(Constants\.expoConfig\?\.extra\) \? AppShellV2 : AppShell;/);
    assert.match(baca('app/index.tsx'), /<Redirect href=\{ruteAwalApp\(Constants\.expoConfig\?\.extra\)\} \/>/);
    assert.match(baca('app/(auth)/_layout.tsx'), /const TUJUAN_MASUK = ruteAwalApp\(Constants\.expoConfig\?\.extra\);/);
    // Komponen v1 tidak memuat rujukan navigasi v2.
    for (const f of ['components/layout/AppShell.tsx', 'components/screens/LinimasaScreen.tsx', 'components/screens/LevelInScreen.tsx']) {
      assert.doesNotMatch(baca(f), /navigasiV2|ArahSaya|AppShellV2/, f);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('Konfigurasi tab dari satu berkas', () => {
  test('4 tab pada saklar penuh, 3 tab saat Jelajah mati, tidak pernah kurang dari wajib dan tanpa celah', () => {
    const penuh = navV2.daftarTabV2({ discover: true, jalurTujuan: true, portofolio: true });
    assert.deepEqual(
      penuh.map((t) => ({ id: t.id, label: t.label, href: t.href })),
      [
        { id: 'arah_saya', label: 'Arah Saya', href: '/arah-saya' },
        { id: 'jelajah', label: 'Jelajah', href: '/discover' },
        { id: 'jejak_waktu', label: 'Jejak Waktu', href: '/jejak-waktu' },
        { id: 'profil_saya', label: 'Profil Saya', href: '/discover-profil' },
      ]
    );
    const tanpaJelajah = navV2.daftarTabV2({ discover: false, jalurTujuan: true, portofolio: true });
    assert.deepEqual(
      tanpaJelajah.map((t) => ({ id: t.id, label: t.label, href: t.href })),
      [
        { id: 'arah_saya', label: 'Arah Saya', href: '/arah-saya' },
        { id: 'jejak_waktu', label: 'Jejak Waktu', href: '/jejak-waktu' },
        { id: 'profil_saya', label: 'Profil Saya', href: '/akun' },
      ]
    );

    for (const s of KOMBINASI_SAKLAR) {
      const tabs = navV2.daftarTabV2(s);
      assert.ok(tabs.length >= navV2.JUMLAH_TAB_WAJIB, JSON.stringify(s));
      assert.equal(tabs.length, s.discover ? 4 : 3, JSON.stringify(s));
      // Tidak ada celah/entri kosong atau rute Discover saat Discover mati.
      for (const t of tabs) {
        assert.ok(t && t.id && t.href.startsWith('/') && t.label.trim().length > 0 && t.ikon);
        if (!s.discover) assert.ok(!t.href.startsWith('/discover'), t.href);
      }
      // Rekam Jejak bukan tab.
      assert.ok(!tabs.some((t) => t.href === '/portofolio'));
    }
  });

  test('TabBarV2 hanya merender dari daftar `tabs` (satu berkas konfigurasi), bukan daftar tab sendiri', () => {
    const tb = baca('components/screens/v2/TabBarV2.tsx');
    assert.match(tb, /\{tabs\.map\(\(t\) => \{/);
    assert.doesNotMatch(tb, /\/arah-saya|\/discover|\/linimasa|\/akun|\/portofolio/);
    const shell = baca('components/screens/v2/AppShellV2.tsx');
    assert.match(shell, /const tabs = useMemo\(\(\) => daftarTabV2\(SAKLAR\), \[\]\);/);
    assert.match(shell, /<TabBarV2 tabs=\{tabs\} aktif=\{aktif\} onPilih=\{pilihTab\} \/>/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Inventaris dan keterjangkauan seluruh rute v1 di v2', () => {
  const RUTE_KHUSUS_V2 = new Set(['arah-saya.tsx', 'jejak-waktu.tsx', 'langkah-saya.tsx']);
  const RUTE_APP_DI_DISK = fs
    .readdirSync(path.join(AKAR_APP, 'app', '(app)'))
    .filter((n) => n.endsWith('.tsx') && n !== '_layout.tsx' && !RUTE_KHUSUS_V2.has(n))
    .map((n) => `/${n.replace(/\.tsx$/, '')}`)
    .sort();

  const RUTE_LUAR_SESI = ['/', '/masuk', '/masuk-google', '/daftar', '/kebijakan-privasi'];

  test('Semua 35 rute v1 tetap ada dengan nama aslinya (tidak ada nama rute lama diubah)', () => {
    assert.equal(RUTE_APP_DI_DISK.length, 30);
    for (const r of [
      '/linimasa',
      '/jenjang-saya',
      '/khusus-smk',
      '/ngobrol',
      '/persetujuan-ortu',
      '/pilih-mapel',
      '/daftar-periksa',
      '/eksplorasi-tujuan',
      '/cek-posisi',
      '/gaya-belajar',
      '/cerita-alumni',
      '/arsip',
      '/arsip-tulis',
      '/arsip-kartu',
      '/arsip-modul',
      '/arsip-modul-unggah',
      '/latihan',
      '/latihan-riwayat',
      '/level-in',
      '/akun',
      '/hapus-akun',
      '/terima-kebijakan',
      '/portofolio',
      '/portofolio-tulis',
      '/portofolio-butir',
      '/jalur-tujuan',
      '/jalur-tujuan-tulis',
      '/discover',
      '/discover-refleksi',
      '/discover-profil',
    ]) {
      assert.ok(RUTE_APP_DI_DISK.includes(r), `rute v1 hilang: ${r}`);
    }
    for (const berkas of ['app/index.tsx', 'app/(auth)/masuk.tsx', 'app/(auth)/daftar.tsx', 'app/masuk-google.tsx', 'app/kebijakan-privasi.tsx']) {
      assert.ok(fs.existsSync(path.join(AKAR_APP, berkas)), berkas);
    }
  });

  test('docs/peta-navigasi-v2.md memuat setiap rute v1 dan v2 di kode', () => {
    const peta = baca('docs/peta-navigasi-v2.md');
    for (const r of [...RUTE_LUAR_SESI, ...RUTE_APP_DI_DISK, '/arah-saya', '/jejak-waktu', '/langkah-saya', '/galeri-komponen']) {
      assert.ok(peta.includes(`\`${r}\``), `rute ${r} belum tercatat di docs/peta-navigasi-v2.md`);
    }
  });

  test('Setiap rute dalam sesi v1 dapat dijangkau di graf navigasi v2 atau tercatat eksplisit digantikan beserta alasan', () => {
    const penuh = { discover: true, jalurTujuan: true, portofolio: true, kelolaDataAkun: true };
    const terjangkau = navV2.ruteTerjangkauV2(penuh, arahSaya.daftarPintuArahSaya(penuh));
    const digantikan = navV2.RUTE_V1_DIGANTIKAN_V2;
    assert.deepEqual(Object.keys(digantikan).sort(), ['/daftar-periksa', '/linimasa']);

    const peta = baca('docs/peta-navigasi-v2.md');
    for (const [ruteLama, info] of Object.entries(digantikan)) {
      assert.ok(info.alasan && info.alasan.trim().length >= 20, `alasan penggantian kosong: ${ruteLama}`);
      assert.ok(Array.isArray(info.digantikanOleh) && info.digantikanOleh.length > 0, ruteLama);
      for (const pengganti of info.digantikanOleh) {
        assert.ok(terjangkau.has(pengganti), `rute pengganti ${pengganti} untuk ${ruteLama} tidak terjangkau`);
        assert.ok(peta.includes(`\`${pengganti}\``), `pengganti ${pengganti} tidak tercatat di peta-navigasi-v2.md`);
      }
      assert.ok(!terjangkau.has(ruteLama), `rute v1 yang sudah digantikan (${ruteLama}) masih dibuka dari navigasi v2`);
    }

    const hilang = RUTE_APP_DI_DISK.filter((r) => !(r in digantikan) && !terjangkau.has(r));
    assert.deepEqual(hilang, [], `rute v1 tak terjangkau tanpa alasan penggantian: ${hilang.join(', ')}`);

    // Saat saklar fitur mati, rute fitur bersaklar tidak terjangkau; semua rute inti tetap terjangkau.
    const inti = { discover: false, jalurTujuan: false, portofolio: false, kelolaDataAkun: false };
    const terjangkauInti = navV2.ruteTerjangkauV2(inti, arahSaya.daftarPintuArahSaya(inti));
    for (const r of ['/portofolio', '/portofolio-tulis', '/portofolio-butir', '/discover', '/discover-refleksi', '/discover-profil', '/jalur-tujuan', '/jalur-tujuan-tulis', '/hapus-akun']) {
      assert.ok(!terjangkauInti.has(r), `rute bersaklar mati malah terjangkau: ${r}`);
    }
    const ruteInti = RUTE_APP_DI_DISK.filter(
      (r) => !(r in digantikan) && !/^\/(portofolio|discover|jalur-tujuan|hapus-akun)/.test(r)
    );
    for (const r of ruteInti) {
      assert.ok(terjangkauInti.has(r), `rute inti tak terjangkau saat saklar lain mati: ${r}`);
    }
    assert.ok(terjangkauInti.has('/arah-saya'));
    assert.ok(terjangkauInti.has('/jejak-waktu'));
    assert.ok(terjangkauInti.has('/langkah-saya'));
  });
});

// ---------------------------------------------------------------------------------------------
describe('Arah Saya: pintu besar, tiga keadaan Arahku, jalur draf, langkah berikutnya', () => {
  test('Rekam Jejak hanya tampil bila portofolio menyala (bobot utama); Jelajah & Jalur Saya ikuti saklarnya', () => {
    for (const s of KOMBINASI_SAKLAR) {
      const pintu = arahSaya.daftarPintuArahSaya(s);
      const ada = (id) => pintu.some((p) => p.id === id);
      assert.equal(ada('rekam_jejak'), s.portofolio, JSON.stringify(s));
      assert.equal(ada('jelajah'), s.discover, JSON.stringify(s));
      assert.equal(ada('jalur_saya'), s.jalurTujuan, JSON.stringify(s));
      assert.equal(ada('langkah_saya'), true, JSON.stringify(s));
      if (s.portofolio) {
        assert.equal(pintu[0].id, 'rekam_jejak');
        assert.equal(pintu[0].bobot, 'utama');
        assert.ok(pintu.slice(1).every((p) => p.bobot === 'biasa'));
      }
    }
    // Layar ArahSayaV2 memberi bobot visual terbesar (varian="brand" + kartuUtamaWadah) hanya untuk bobot === 'utama'.
    const layar = baca('components/screens/v2/ArahSayaV2.tsx');
    assert.match(layar, /p\.bobot === 'utama' \? \([\s\S]*?<Kartu\s+varian="brand"/);
    assert.doesNotMatch(layar, /href: '\/portofolio'|router\.push\('\/portofolio'/);
  });

  test('Tiga keadaan Arahku: ada jalur, belum memilih, dan Belum tahu', () => {
    const daftarDisetujui = [
      { id: 'melanjutkan', nama: 'Melanjutkan', deskripsi_singkat: 'Kuliah.', status_teks: 'disetujui', urutan: 1 },
      { id: 'bekerja', nama: 'Bekerja', deskripsi_singkat: 'Kerja.', status_teks: 'disetujui', urutan: 2 },
    ];
    // 1. Ada jalur dipilih
    const ada = arahSaya.keadaanArahku({
      pilihan: [{ id: 'p1', jalur_minat_id: 'melanjutkan', jalur_belum_tersedia: false, status: 'aktif' }],
      daftarJalur: daftarDisetujui,
      tanda: 'dijawab',
    });
    assert.equal(ada.keadaan, 'ada_jalur');
    assert.deepEqual(ada.chip, [{ id: 'p1', label: 'Melanjutkan', tersembunyi: false }]);
    assert.equal(ada.adaIdDrafTerbuang, false);

    // 2. Belum memilih dan belum menjawab
    for (const tanda of [null, undefined, 'kosong']) {
      const belum = arahSaya.keadaanArahku({ pilihan: [], daftarJalur: daftarDisetujui, tanda });
      assert.equal(belum.keadaan, 'belum_memilih', String(tanda));
    }

    // 3. Belum tahu (tanda lokal 'dijawab', tanpa jalur aktif)
    const belumTahu = arahSaya.keadaanArahku({
      pilihan: [{ id: 'p2', jalur_minat_id: 'bekerja', jalur_belum_tersedia: false, status: 'dijeda' }],
      daftarJalur: daftarDisetujui,
      tanda: 'dijawab',
    });
    assert.equal(belumTahu.keadaan, 'belum_tahu');

    // Layar memakai ulang GerbangArahV2 dari 030 (tidak menulis ulang).
    const layar = baca('components/screens/v2/ArahSayaV2.tsx');
    assert.match(layar, /import \{ GerbangArahV2 \} from '\.\/KecenderunganV2';/);
    assert.match(layar, /<GerbangArahV2 arah=\{data\.arahModal\} \/>/);
  });

  test('Jalur draf tidak pernah tampil dengan id mentah atau teks draf', () => {
    const daftarKosong = [];
    const daftarDrafSaja = [
      { id: 'wirausaha', nama: 'Wirausaha Draf Rahasia', deskripsi_singkat: 'Draf.', status_teks: 'draf', urutan: 3 },
    ];
    // Kasus A: server menyamarkan sesuai 026 (jalur_minat_id: null, jalur_belum_tersedia: true)
    const samaran = arahSaya.keadaanArahku({
      pilihan: [{ id: 'b1', jalur_minat_id: null, jalur_belum_tersedia: true, status: 'aktif' }],
      daftarJalur: daftarKosong,
      tanda: 'dijawab',
    });
    assert.equal(samaran.keadaan, 'ada_jalur');
    assert.deepEqual(samaran.chip, [{ id: 'b1', label: arahSaya.TEKS_ARAH_SAYA.jalurBelumTersedia, tersembunyi: true }]);

    // Kasus B: seandainya id draf masih muncul di data, TIDAK ditampilkan dan ditandai.
    const bocor = arahSaya.keadaanArahku({
      pilihan: [{ id: 'b2', jalur_minat_id: 'wirausaha', jalur_belum_tersedia: false, status: 'aktif' }],
      daftarJalur: daftarDrafSaja,
      tanda: 'dijawab',
    });
    assert.equal(bocor.keadaan, 'ada_jalur');
    assert.equal(bocor.adaIdDrafTerbuang, true);
    assert.equal(bocor.chip[0].label, arahSaya.TEKS_ARAH_SAYA.jalurBelumTersedia);
    assert.ok(!bocor.chip[0].label.includes('wirausaha'));
    assert.ok(!bocor.chip[0].label.includes('Draf Rahasia'));
  });

  test('Langkah berikutnya hanya dari data nyata; tidak mengarang tanggal/butir; keadaan kosong ramah dengan maskot', () => {
    const hariIni = Date.UTC(2026, 9, 10); // 10 Okt 2026
    // Kosong → null (tidak mengarang data)
    assert.equal(
      arahSaya.pilihLangkahBerikutnya({
        kelas: '10',
        butirPribadi: [],
        butirUmum: [{ id: 'u1', judul: 'Butir kelas 12', urutan: 1 }],
        kemajuan: [],
        eventSekolah: [],
        tahapanLinimasa: [],
        hariIniMs: hariIni,
      }),
      null
    );

    // 1. Butir pribadi belum selesai diprioritaskan
    const dariPribadi = arahSaya.pilihLangkahBerikutnya({
      kelas: '10',
      butirPribadi: [
        { id: 'bp1', judul: 'Sudah beres', selesai_pada: '2026-10-01T00:00:00Z' },
        { id: 'bp2', judul: 'Riset kampus tujuan', selesai_pada: null },
      ],
      hariIniMs: hariIni,
    });
    assert.deepEqual(dariPribadi, { judul: 'Riset kampus tujuan', href: '/langkah-saya', sumber: 'butir_pribadi' });

    // 2. Butir daftar periksa umum (kelas 12) yang belum dicentang
    const dariUmum = arahSaya.pilihLangkahBerikutnya({
      kelas: '12',
      butirPribadi: [],
      butirUmum: [
        { id: 'b1', judul: 'Butir 1', urutan: 1 },
        { id: 'b2', judul: 'Siapkan rapor semester 1-5', urutan: 2 },
      ],
      kemajuan: [{ butir_id: 'b1', selesai_pada: '2026-10-01T00:00:00Z' }],
      hariIniMs: hariIni,
    });
    assert.deepEqual(dariUmum, { judul: 'Siapkan rapor semester 1-5', href: '/langkah-saya', sumber: 'butir_daftar_periksa' });

    // 3. Tahapan linimasa yang belum terverifikasi TIDAK dipakai; yang terverifikasi dipakai
    const belumVerif = arahSaya.pilihLangkahBerikutnya({
      kelas: '12',
      butirPribadi: [],
      butirUmum: [],
      kemajuan: [],
      tahapanLinimasa: [
        {
          id: 't1',
          judul: 'Tanggal Belum Verif',
          tanggal_mulai: '2026-10-20',
          tanggal_selesai: '2026-10-30',
          status_verifikasi: 'belum_diverifikasi',
          diperiksa_pada: null,
        },
      ],
      hariIniMs: hariIni,
    });
    assert.equal(belumVerif, null);

    const terverif = arahSaya.pilihLangkahBerikutnya({
      kelas: '12',
      butirPribadi: [],
      butirUmum: [],
      kemajuan: [],
      tahapanLinimasa: [
        {
          id: 't2',
          judul: 'Pendaftaran TKA',
          tanggal_mulai: '2026-10-20',
          tanggal_selesai: '2026-10-30',
          status_verifikasi: 'terverifikasi',
          diperiksa_pada: '2026-09-01',
        },
      ],
      hariIniMs: hariIni,
    });
    assert.equal(terverif.judul, 'Pendaftaran TKA');
    assert.equal(terverif.href, '/jejak-waktu');
    assert.equal(terverif.sumber, 'tahapan_linimasa');

    // Keadaan kosong, memuat, galat + tombol Coba lagi di layar ArahSayaV2
    const layar = baca('components/screens/v2/ArahSayaV2.tsx');
    assert.match(layar, /<PlaceholderMemuat/);
    assert.match(layar, /<KeadaanGalat[\s\S]*onCobaLagi=\{data\.muatUlang\}/);
    assert.match(layar, /require\('\.\.\/\.\.\/\.\.\/assets\/mascot-blue\.png'\)/);
    assert.equal(arahSaya.aksiKosongLangkah(true).href, '/discover');
    assert.equal(arahSaya.aksiKosongLangkah(false).href, '/langkah-saya');
  });

  test('Sapaan memakai nama profil; tanpa nama tetap sopan tanpa koma', () => {
    assert.equal(arahSaya.teksSapaanV2({ nama_tampilan: 'Budi', nama_pengguna: 'budi12' }), 'Halo, Budi');
    assert.equal(arahSaya.teksSapaanV2({ nama_tampilan: '', nama_pengguna: 'budi12' }), 'Halo, budi12');
    assert.equal(arahSaya.teksSapaanV2({ nama_tampilan: ' ', nama_pengguna: '' }), 'Halo');
    assert.equal(arahSaya.teksSapaanV2(null), 'Halo');
  });
});

// ---------------------------------------------------------------------------------------------
describe('Teks, aksesibilitas, reduce motion, dan tombol kembali', () => {
  test('Maksimal 40 kata teks tetap per layar Arah Saya pada semua kombinasi saklar & keadaan', () => {
    assert.equal(arahSaya.BATAS_KATA_ARAH_SAYA, 40);
    for (const saklar of KOMBINASI_SAKLAR) {
      for (const arahku of ['ada_jalur', 'ada_jalur_draf', 'belum_tahu', 'belum_memilih']) {
        for (const langkahKosong of [false, true]) {
          const daftar = arahSaya.teksTetapArahSaya({ saklar, arahku, langkahKosong });
          const jumlah = arahSaya.hitungKata(daftar.join(' '));
          assert.ok(
            jumlah <= arahSaya.BATAS_KATA_ARAH_SAYA,
            `${JSON.stringify({ saklar, arahku, langkahKosong })}: ${jumlah} kata > 40`
          );
        }
      }
    }
    const galatKata = arahSaya.hitungKata(
      [arahSaya.TEKS_ARAH_SAYA.sapaanKosong, arahSaya.TEKS_ARAH_SAYA.galatJudul, arahSaya.TEKS_ARAH_SAYA.galatPesan, arahSaya.TEKS_ARAH_SAYA.cobaLagi].join(' ')
    );
    assert.ok(galatKata <= arahSaya.BATAS_KATA_ARAH_SAYA, `galat: ${galatKata} kata`);
  });

  test('Bilah tab: ikon + label, target 44 pt, peran tab + selected, status aktif bukan hanya warna', () => {
    const tb = baca('components/screens/v2/TabBarV2.tsx');
    assert.match(tb, /<Sentuh[\s\S]*peran="tab"[\s\S]*label=\{t\.label\}[\s\S]*terpilih=\{sedang\}/);
    assert.match(tb, /<IkonTab nama=\{t\.ikon\} terisi=\{sedang\} warnaIkon=\{warnaIkon\} \/>/);
    assert.match(tb, /<Teks[\s\S]*?>\s*\{t\.label\}\s*<\/Teks>/, 'tab harus menampilkan label teks, bukan hanya ikon');
    assert.match(tb, /fontFamily: keluargaHuruf\.badanTebal/);
    assert.match(tb, /pilAktif/);
    assert.doesNotMatch(tb, /\b(Pressable|TouchableOpacity|TouchableHighlight)\b/);
    // Hanya satu <Sentuh peran="tab"> (di dalam tabs.map), bukan tab tambahan di luar konfigurasi.
    assert.equal((tb.match(/peran="tab"/g) || []).length, 1);
  });

  test('Semua kontrol berlabel, target sentuh 44 pt, dan reduce motion diikuti', () => {
    for (const rel of ['components/screens/v2/ArahSayaV2.tsx', 'components/screens/v2/AppShellV2.tsx', 'components/screens/v2/TabBarV2.tsx']) {
      const s = baca(rel);
      assert.doesNotMatch(s, /\b(Pressable|TouchableOpacity|TouchableHighlight|TextInput)\b/, rel);
      jelajah(ast(rel), (n) => {
        if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && n.tagName.getText() === 'Sentuh') {
          const nama = n.attributes.properties.filter(ts.isJsxAttribute).map((a) => a.name.getText());
          assert.ok(nama.includes('peran') && nama.includes('label'), `${rel}: Sentuh tanpa peran/label`);
        }
      });
    }
    const shell = baca('components/screens/v2/AppShellV2.tsx');
    assert.match(shell, /const kurangiGerak = useKurangiGerak\(\);/);
    assert.match(shell, /if \(!gerakBoleh\(kurangiGerak\)\) \{\n\s+muncul\.setValue\(1\);/);
    const arah = baca('components/screens/v2/ArahSayaV2.tsx');
    assert.match(arah, /animationType=\{kurangiGerak \? 'none' : 'slide'\}/);
  });

  test('Tombol kembali wajar dan tidak membuat perulangan antar-tab', () => {
    const tabs = navV2.daftarTabV2({ discover: true, jalurTujuan: true, portofolio: true });
    // Tab pertama → keluar aplikasi seperti biasa
    assert.deepEqual(navV2.tujuanKembaliV2({ pathname: '/arah-saya', canGoBack: true, tabs }), { aksi: 'keluar' });
    // Tab lain → kembali sekali ke tab pertama (tanpa bolak-balik antar-tab)
    for (const href of ['/discover', '/jejak-waktu', '/discover-profil']) {
      assert.deepEqual(navV2.tujuanKembaliV2({ pathname: href, canGoBack: true, tabs }), { aksi: 'ganti', href: '/arah-saya' }, href);
    }
    // Layar anak dengan riwayat → kembali ke asalnya
    assert.deepEqual(navV2.tujuanKembaliV2({ pathname: '/arsip', canGoBack: true, tabs }), { aksi: 'kembali' });
    // Layar anak tanpa riwayat → kembali ke tab induknya
    assert.deepEqual(navV2.tujuanKembaliV2({ pathname: '/akun', canGoBack: false, tabs }), { aksi: 'ganti', href: '/discover-profil' });
    assert.deepEqual(navV2.tujuanKembaliV2({ pathname: '/discover-refleksi', canGoBack: false, tabs }), { aksi: 'ganti', href: '/discover' });

    // AppShellV2 memakai router.replace saat berpindah tab dan memasang BackHandler di Android.
    const shell = baca('components/screens/v2/AppShellV2.tsx');
    assert.match(shell, /router\.replace\(href as any\);/);
    assert.match(shell, /BackHandler\.addEventListener\('hardwareBackPress'/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Gerbang rilis dan dokumen draf', () => {
  test('Kedua saklar v2 (030 dan 031) terdaftar, tidak disetujui, dan menahan profil build yang menyalakannya', () => {
    for (const [id, saklar] of [
      ['alur-masuk-v2', 'EXPO_PUBLIC_ALUR_MASUK_V2'],
      ['navigasi-v2', 'EXPO_PUBLIC_NAVIGASI_V2'],
    ]) {
      const t = gerbang.TEKS.find((x) => x.id === id);
      assert.ok(t, id);
      assert.equal(t.saklar, saklar);
      assert.ok(gerbang.SEMUA_SAKLAR.includes(saklar), saklar);
      assert.ok(!baca('docs/persetujuan-teks-rilis.json').includes(id), `${id} tidak boleh ditandai disetujui`);
    }

    const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'gerbang-031-'));
    try {
      const tulis = (rel, isi) => {
        fs.mkdirSync(path.dirname(path.join(akar, rel)), { recursive: true });
        fs.writeFileSync(path.join(akar, rel), typeof isi === 'string' ? isi : JSON.stringify(isi));
      };
      tulis('lib/kebijakan-privasi.json', { versi: 1, status: 'Berlaku.', ringkasan: ['Ringkas.'], isi: [] });
      tulis('lib/alurMasukV2.ts', '// TEKS DRAF\n');
      tulis('docs/draf-teks-alur-masuk-v2.md', 'DRAF\n');
      tulis('lib/arahSaya.ts', '// TEKS DRAF\n');
      tulis('lib/navigasiV2.ts', '// TEKS DRAF\n');
      tulis('lib/jejakWaktuV2.ts', '// TEKS DRAF\n');
      tulis('lib/langkahSayaV2.ts', '// TEKS DRAF\n');
      tulis('lib/jalurSayaV2.ts', '// TEKS DRAF\n');
      tulis('lib/jelajahV2.ts', '// TEKS DRAF\n');
      tulis('components/screens/v2/JalurSayaV2.tsx', '// komponen v2\n');
      tulis('components/screens/v2/JelajahV2.tsx', '// komponen v2\n');
      tulis('components/screens/v2/ProfilEksplorasiV2.tsx', '// komponen v2\n');
      tulis('docs/draf-teks-navigasi-v2.md', 'DRAF\n');
      tulis('docs/draf-teks-jejak-waktu-v2.md', 'DRAF\n');
      tulis('docs/draf-teks-jalur-saya-v2.md', 'DRAF\n');
      tulis('docs/draf-teks-jelajah-v2.md', 'DRAF\n');

      // Keduanya menyala → keduanya tertahan
      tulis('eas.json', {
        build: { coba: { env: { EXPO_PUBLIC_ALUR_MASUK_V2: '1', EXPO_PUBLIC_NAVIGASI_V2: '1' } } },
      });
      const pesan = gerbang.periksa(akar).map((m) => m.pesan);
      assert.ok(pesan.includes('Teks alur masuk v2: masih draf dan belum disetujui.'), pesan.join(' | '));
      assert.ok(pesan.includes('Teks navigasi v2 dan Arah Saya: masih draf dan belum disetujui.'), pesan.join(' | '));

      // Keduanya mati → tidak tertahan
      tulis('eas.json', { build: { coba: { env: {} } } });
      assert.deepEqual(gerbang.periksa(akar), []);
    } finally {
      fs.rmSync(akar, { recursive: true, force: true });
    }
  });

  test('Dokumen draf memuat setiap teks di TEKS_ARAH_SAYA dan label tab; uji HP mengingatkan --clear', () => {
    const doc = baca('docs/draf-teks-navigasi-v2.md');
    for (const teks of Object.values(arahSaya.TEKS_ARAH_SAYA)) {
      assert.ok(doc.includes(teks), `belum ada di docs/draf-teks-navigasi-v2.md: "${teks}"`);
    }
    for (const t of navV2.KONFIGURASI_TAB_V2) {
      assert.ok(doc.includes(t.label), `label tab belum ada di dokumen draf: "${t.label}"`);
    }
    assert.match(baca('docs/uji-hp-expo-go.md'), /--clear/);
  });
});
