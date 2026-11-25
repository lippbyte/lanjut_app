// LANJUT_034: Jelajah v2 (/discover, /discover-refleksi) dan Profil Eksplorasi v2 (/discover-profil,
// tab "Profil Saya") di balik saklar EXPO_PUBLIC_NAVIGASI_V2 bersama EXPO_PUBLIC_DISCOVER (keduanya
// mati bawaan), ditambah perbaikan kecil label "Aktif" khusus di Jalur Saya v2.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { muatModulApp } = require('./muat-ts-app');
const { refleksiSkema, profilSkema, BATAS_DISCOVER: BATAS_SERVER } = require('../src/modul/discover/discover.skema');
const gerbang = require('../tools/periksa-gerbang-rilis');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const jelajah = muatModulApp('lib/jelajahV2');
const discoverV1 = muatModulApp('lib/discover');
const jalurSayaV2 = muatModulApp('lib/jalurSayaV2');
const jalurV1 = muatModulApp('lib/jalurTujuan');
const navV2 = muatModulApp('lib/navigasiV2');
const tema = muatModulApp('theme/v2/index');

const ast = (rel) => ts.createSourceFile(rel, baca(rel), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
function jelajahAst(n, fn) {
  fn(n);
  ts.forEachChild(n, (c) => jelajahAst(c, fn));
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

const BERKAS_034 = [
  'lib/jelajahV2.ts',
  'hooks/useJelajahV2.ts',
  'components/screens/v2/JelajahV2.tsx',
  'components/screens/v2/ProfilEksplorasiV2.tsx',
  'app/(app)/discover.tsx',
  'app/(app)/discover-refleksi.tsx',
  'app/(app)/discover-profil.tsx',
];

// ---------------------------------------------------------------------------------------------
describe('Saklar mati vs menyala, isolasi v1, dan muara tab Profil Saya', () => {
  test('Kedua saklar (EXPO_PUBLIC_DISCOVER & EXPO_PUBLIC_NAVIGASI_V2) bawaan mati di app.config dan profil build', () => {
    const kosong = muatKonfigApp({});
    assert.equal(kosong.discover, false);
    assert.equal(kosong.navigasiV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_DISCOVER: '0', EXPO_PUBLIC_NAVIGASI_V2: '0' }).discover, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_DISCOVER: '0', EXPO_PUBLIC_NAVIGASI_V2: '0' }).navigasiV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_DISCOVER: '1', EXPO_PUBLIC_NAVIGASI_V2: '1' }).discover, true);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_DISCOVER: '1', EXPO_PUBLIC_NAVIGASI_V2: '1' }).navigasiV2, true);

    for (const b of [
      'eas.json',
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.dev.yml',
      'server/.env.example',
      'server/.env.production.example',
      'server/.env.railway.contoh',
    ]) {
      const isi = baca(b);
      assert.ok(!isi.includes('EXPO_PUBLIC_DISCOVER'), `${b}: tidak boleh menyalakan EXPO_PUBLIC_DISCOVER`);
      assert.ok(!isi.includes('EXPO_PUBLIC_NAVIGASI_V2'), `${b}: tidak boleh menyalakan EXPO_PUBLIC_NAVIGASI_V2`);
    }
  });

  test('Saklar v2 mati merender layar Discover v1 utuh; menyala merender komponen v2; tab Profil Saya tetap bermuara ke /discover-profil (atau /akun saat Jelajah mati)', () => {
    const pasangan = [
      ['app/(app)/discover.tsx', 'JelajahV2', 'DiscoverScreen'],
      ['app/(app)/discover-refleksi.tsx', 'RefleksiJelajahV2', 'RefleksiScreen'],
      ['app/(app)/discover-profil.tsx', 'ProfilEksplorasiV2', 'ProfilEksplorasiScreen'],
    ];
    for (const [rel, kompV2, kompV1] of pasangan) {
      const s = baca(rel);
      assert.match(s, /if \(!discoverAktif\(Constants\.expoConfig\?\.extra\)\) return <Redirect href="\/linimasa" \/>;/, rel);
      assert.match(s, new RegExp(`if \\(navigasiV2Aktif\\(extra\\)\\) return <${kompV2} key=\\{pengguna\\?\\.id\\} \\/>;`), rel);
      assert.match(s, new RegExp(`return <${kompV1} key=\\{pengguna\\?\\.id\\} \\/>;`), rel);
    }

    // Berkas v1 Discover sama sekali tidak mengimpor modul/tema v2
    for (const v1 of ['components/screens/DiscoverScreens.tsx', 'hooks/useDiscover.ts', 'lib/discover.ts']) {
      assert.doesNotMatch(baca(v1), /jelajahV2|useJelajahV2|JelajahV2|ProfilEksplorasiV2|useTemaV2|theme\/v2/, v1);
    }

    // Hook v2 hanya aktif bila kedua saklar menyala
    assert.match(
      baca('hooks/useJelajahV2.ts'),
      /const FITUR_AKTIF = discoverAktif\(EXTRA\) && navigasiV2Aktif\(EXTRA\);/
    );

    // Tab Profil Saya tetap membuka /discover-profil saat Discover menyala dan /akun saat Discover mati (sabotase #8)
    const tabPenuh = navV2.daftarTabV2({ discover: true, jalurTujuan: true, portofolio: true });
    assert.equal(tabPenuh.find((t) => t.id === 'jelajah')?.href, '/discover');
    assert.equal(tabPenuh.find((t) => t.id === 'profil_saya')?.href, '/discover-profil');

    const tabMati = navV2.daftarTabV2({ discover: false, jalurTujuan: true, portofolio: true });
    assert.equal(tabMati.find((t) => t.id === 'jelajah'), undefined);
    assert.equal(tabMati.find((t) => t.id === 'profil_saya')?.href, '/akun');

    // Kartu pintu Akun & Privasi di /discover-profil tetap disediakan AppShellV2 dari LANJUT_031
    assert.deepEqual(
      navV2.PINTU_TAB_V2.find((p) => p.diRute === '/discover-profil'),
      { diRute: '/discover-profil', keHref: '/akun', label: 'Akun & Privasi' }
    );
  });
});

// ---------------------------------------------------------------------------------------------
describe('Kartu draf tidak pernah dirender, id jalur mentah tersamar, dan tanpa "Cara belajar" karangan', () => {
  const KONTEN_DISCOVER = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data-konten', 'discover.json'), 'utf8'));

  test('kartuDisetujuiSaja menolak kartu draf, nonaktif, dan sumber [ISI; teks kartu draf tidak disalin ke kode/dokumen v2', () => {
    const campur = [
      {
        id: 'bidang-kesehatan',
        jenis: 'bidang',
        judul: '[DUMMY] Kesehatan',
        ringkasan: '[DUMMY] Ringkasan contoh.',
        url_sumber: '[DUMMY – bukan sumber nyata]',
        diperiksa_pada: null,
        status_teks: 'disetujui',
        aktif: 1,
      },
      {
        id: 'profesi-guru',
        jenis: 'profesi',
        judul: 'Guru Draf Rahasia',
        ringkasan: 'Ringkasan draf rahasia.',
        url_sumber: null,
        diperiksa_pada: null,
        status_teks: 'draf',
        aktif: 1,
      },
      {
        id: 'usaha-kuliner',
        jenis: 'usaha',
        judul: 'Kuliner Nonaktif',
        ringkasan: 'Ringkasan nonaktif.',
        url_sumber: null,
        diperiksa_pada: null,
        status_teks: 'disetujui',
        aktif: 0,
      },
      ...KONTEN_DISCOVER.data,
    ];

    const sah = jelajah.kartuDisetujuiSaja(campur);
    assert.deepEqual(sah.map((k) => k.id), ['bidang-kesehatan']);
    const jsonSah = JSON.stringify(sah);
    assert.doesNotMatch(jsonSah, /Guru Draf Rahasia|Ringkasan draf rahasia|Kuliner Nonaktif/);

    // Tidak ada teks ringkasan kartu draf di discover.json yang disalin ke berkas v2 034
    for (const k of KONTEN_DISCOVER.data) {
      assert.equal(k.status_teks, 'draf');
      for (const rel of ['lib/jelajahV2.ts', 'components/screens/v2/JelajahV2.tsx', 'components/screens/v2/ProfilEksplorasiV2.tsx', 'docs/draf-teks-jelajah-v2.md']) {
        assert.ok(!baca(rel).includes(k.ringkasan), `${rel} tidak boleh menyalin ringkasan draf (${k.id})`);
      }
    }

    // Layar JelajahV2 dan RefleksiJelajahV2 selalu menyaring melalui kartuDisetujuiSaja
    const layar = baca('components/screens/v2/JelajahV2.tsx');
    assert.match(layar, /const daftarKartuSah = useMemo\(\(\) => kartuDisetujuiSaja\(kartu\.data\), \[kartu\.data\]\);/);
    assert.match(layar, /const daftarKartuSah = kartuDisetujuiSaja\(kartu\.data\);/);
  });

  test('Id jalur mentah tidak pernah tampil di Profil Eksplorasi maupun penyaring kartu (memakai labelJalur dari 033)', () => {
    assert.match(baca('lib/jelajahV2.ts'), /import \{ LABEL_JALUR_NETRAL, labelJalur \} from '\.\/jalurSayaV2';/);

    // Jalur disetujui -> nama jalur; id mentah atau draf -> 'Jalur belum tersedia'
    assert.equal(jelajah.labelJalurProfilV2({ id: 'melanjutkan', nama: '[DUMMY] Melanjutkan' }), '[DUMMY] Melanjutkan');
    for (const bocor of [
      'melanjutkan',
      'bekerja',
      'wirausaha',
      { id: 'melanjutkan', nama: 'melanjutkan' },
      { id: 'bekerja', nama: '' },
      { id: 'wirausaha', nama: 'Wirausaha Draf Rahasia', status_teks: 'draf' },
    ]) {
      const hasil = jelajah.labelJalurProfilV2(bocor);
      assert.equal(hasil, 'Jalur belum tersedia', JSON.stringify(bocor));
      assert.doesNotMatch(hasil, /melanjutkan|bekerja|wirausaha|Rahasia/i);
    }

    const daftar = jelajah.daftarLabelJalurProfilV2([
      { id: 'melanjutkan', nama: '[DUMMY] Melanjutkan' },
      { id: 'bekerja', nama: 'bekerja' },
    ]);
    assert.deepEqual(daftar, ['[DUMMY] Melanjutkan', 'Jalur belum tersedia']);

    // ProfilEksplorasiV2 memakai daftarLabelJalurProfilV2 dan tidak pernah merender j.id langsung
    const layarProfil = baca('components/screens/v2/ProfilEksplorasiV2.tsx');
    assert.match(layarProfil, /const jalurAman = daftarLabelJalurProfilV2\(profil\.jalur\);/);
    assert.doesNotMatch(layarProfil, /profil\.jalur\.map\(\([^)]*\)\s*=>\s*[^)]*\.id/);

    // Kartu saat ini tidak punya penanda jalur -> jalurPenyaringKartu kosong (tidak memetakan jenis -> jalur sendiri)
    assert.deepEqual(jelajah.jalurPenyaringKartu(KONTEN_DISCOVER.data), []);
    assert.deepEqual(
      jelajah.jalurPenyaringKartu([
        { id: 'bidang-kesehatan', jenis: 'bidang', judul: '[DUMMY] Kesehatan', ringkasan: 'R.', url_sumber: null, diperiksa_pada: null },
      ]),
      []
    );
  });

  test('Bagian "Cara belajar" tidak tampil bila data tidak mendukung dan tidak ada teks karangan', () => {
    for (const k of KONTEN_DISCOVER.data) {
      assert.equal(jelajah.caraBelajarKartu(k), null, k.id);
    }
    assert.equal(
      jelajah.caraBelajarKartu({
        id: 'bidang-kesehatan',
        jenis: 'bidang',
        judul: '[DUMMY] Kesehatan',
        ringkasan: '[DUMMY] Contoh.',
        url_sumber: '[DUMMY – bukan sumber nyata]',
        diperiksa_pada: null,
      }),
      null
    );
    assert.equal(
      jelajah.caraBelajarKartu({
        id: 'a',
        jenis: 'bidang',
        judul: 'A',
        ringkasan: 'R',
        url_sumber: null,
        diperiksa_pada: null,
        cara_belajar: ['  '],
      }),
      null
    );
    assert.deepEqual(
      jelajah.caraBelajarKartu({
        id: 'a',
        jenis: 'bidang',
        judul: 'A',
        ringkasan: 'R',
        url_sumber: null,
        diperiksa_pada: null,
        cara_belajar: ['Tips nyata dari server'],
      }),
      ['Tips nyata dari server']
    );

    const layar = baca('components/screens/v2/JelajahV2.tsx');
    assert.match(layar, /const tipsCaraBelajar = caraBelajarKartu\(kartu\);/);
    assert.match(layar, /\{tipsCaraBelajar \? \([\s\S]*?\{T\.labelCaraBelajar\}[\s\S]*?\) : null\}/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Refleksi (280), catatan profil (500), penghitung karakter, kontrak API v1, privasi jujur, dan riwayat profil', () => {
  test('Batas 280 dan 500 karakter ditegakkan konsisten dengan skema server, penghitung karakter benar', () => {
    assert.deepEqual({ ...jelajah.BATAS_DISCOVER }, BATAS_SERVER);
    assert.equal(jelajah.BATAS_DISCOVER.refleksi, 280);
    assert.equal(jelajah.BATAS_DISCOVER.catatan, 500);

    // Penghitung karakter 280
    assert.deepEqual(jelajah.hitungBatasKarakter('', 280), {
      panjang: 0,
      batas: 280,
      sisa: 280,
      melewati: false,
      teksRingkas: 'Sisa 280',
      teksAkses: 'Sisa 280 karakter',
    });
    assert.equal(jelajah.hitungBatasKarakter('a'.repeat(280), 280).sisa, 0);
    assert.equal(jelajah.hitungBatasKarakter('a'.repeat(280), 280).melewati, false);
    const lebihRefleksi = jelajah.hitungBatasKarakter('a'.repeat(285), 280);
    assert.equal(lebihRefleksi.sisa, -5);
    assert.equal(lebihRefleksi.melewati, true);
    assert.equal(lebihRefleksi.teksRingkas, 'Melebihi 5');

    // Validasi 280 cocok dengan refleksiSkema server
    const valid280 = { ketertarikan: 'tertarik', menarik: 'a'.repeat(280), kurang: 'b'.repeat(280) };
    assert.deepEqual(jelajah.periksaIsianRefleksi(valid280), {});
    assert.ok(refleksiSkema.safeParse(jelajah.badanRefleksi(valid280)).success);
    assert.ok(jelajah.periksaIsianRefleksi({ ...valid280, menarik: 'a'.repeat(281) }).yang_menarik);
    assert.ok(jelajah.periksaIsianRefleksi({ ...valid280, kurang: 'b'.repeat(281) }).yang_kurang_menarik);

    // Jalan memutar kosongkan tulisan lewat PUT sudah diganti DELETE sungguhan di LANJUT_035
    assert.equal(jelajah.badanKosongkanTulisanRefleksi, undefined);
    assert.equal(jelajah.TEKS_JELAJAH_V2.hapusRefleksi, 'Hapus refleksi');
    assert.equal(jelajah.TEKS_JELAJAH_V2.hapusCatatan, 'Hapus catatan');

    // Penghitung & validasi 500 cocok dengan profilSkema server
    assert.equal(jelajah.periksaCatatanProfilV2('c'.repeat(500)), null);
    assert.ok(profilSkema.safeParse({ catatan: 'c'.repeat(500) }).success);
    assert.equal(jelajah.periksaCatatanProfilV2('c'.repeat(501)), jelajah.GALAT_ISIAN_DISCOVER.catatanPanjang);
    assert.equal(jelajah.hitungBatasKarakter('c'.repeat(503), 500).melewati, true);
    assert.equal(jelajah.hitungBatasKarakter('c'.repeat(503), 500).teksRingkas, 'Melebihi 3');

    // FormRefleksiV2 dan FormProfilV2 benar-benar menegakkan batas 280 & 500
    const layarJelajah = baca('components/screens/v2/JelajahV2.tsx');
    const fnRefleksi = /function FormRefleksiV2\([\s\S]*?\n\}\n/.exec(layarJelajah)[0];
    assert.match(fnRefleksi, /hitungBatasKarakter\(menarik, BATAS_DISCOVER\.refleksi\)/);
    assert.match(fnRefleksi, /hitungBatasKarakter\(kurang, BATAS_DISCOVER\.refleksi\)/);
    assert.match(fnRefleksi, /const periksa = periksaIsianRefleksi\(isian\);/);
    assert.match(fnRefleksi, /if \(Object\.keys\(periksa\)\.length \|\| !ketertarikan\) return;/);

    const layarProfil = baca('components/screens/v2/ProfilEksplorasiV2.tsx');
    const fnProfil = /function FormProfilV2\([\s\S]*?\n\}\n/.exec(layarProfil)[0];
    assert.match(fnProfil, /hitungBatasKarakter\(catatan, BATAS_DISCOVER\.catatan\)/);
    assert.match(fnProfil, /const salah = periksaCatatanProfilV2\(catatan\);/);
    assert.match(fnProfil, /if \(salah\) \{\n\s+setGalat\(salah\);\n\s+return;\n\s+\}/);
  });

  test('Simpan, ubah, hapus sungguhan refleksi/catatan (LANJUT_035), dan profil berversi memanggil endpoint yang tepat', () => {
    const hookV2 = baca('hooks/useJelajahV2.ts');
    assert.ok(hookV2.includes("const KUNCI = ['discover'] as const;"));

    assert.match(hookV2, /useAmbilV2<KartuDiscover\[\]>\('kartu',\s*'\/discover\/kartu'\)/);
    assert.match(hookV2, /useAmbilV2<RefleksiDiscover\[\]>\('refleksi',\s*'\/discover\/refleksi'\)/);
    assert.match(hookV2, /useAmbilV2<ProfilEksplorasiSaya>\('profil',\s*'\/discover\/profil'\)/);
    assert.match(hookV2, /useAmbilV2<ProfilEksplorasi\[\]>\('riwayat',\s*'\/discover\/profil\/riwayat',\s*aktif\)/);
    assert.match(
      hookV2,
      /apiFetch\(`\/discover\/refleksi\/\$\{encodeURIComponent\(kartuId\)\}`,\s*\{\s*method:\s*'PUT',\s*body:\s*badan,\s*token,?\s*\}\)/
    );
    assert.match(
      hookV2,
      /apiFetch\(`\/discover\/refleksi\/\$\{encodeURIComponent\(kartuId\)\}`,\s*\{\s*method:\s*'DELETE',\s*token,?\s*\}\)/
    );
    assert.match(
      hookV2,
      /apiFetch\('\/discover\/profil',\s*\{\s*method:\s*'POST',\s*body:\s*badan,\s*token,?\s*\}\)/
    );
    assert.match(
      hookV2,
      /apiFetch\('\/discover\/profil\/catatan',\s*\{\s*method:\s*'DELETE',\s*token,?\s*\}\)/
    );

    // Riwayat profil terlipat secara bawaan dan bernomor + berjam seperti 026
    const layarProfil = baca('components/screens/v2/ProfilEksplorasiV2.tsx');
    assert.match(layarProfil, /const \[bukaRiwayat, setBukaRiwayat\] = useState\(false\);/);
    assert.match(layarProfil, /\{teksVersi\(terkini\.versi_ke, terkini\.dibuat_pada\)\}/);
    assert.match(layarProfil, /\{teksVersi\(v\.versi_ke, v\.dibuat_pada\)\}/);
    assert.match(jelajah.teksVersi(2, '2026-11-17T01:06:00Z'), /^Versi ke-2 · .*\d{1,2}[.:]06/);
  });

  test('Kalimat privasi sama persis dengan draf teks Discover v1 dan tidak ada klaim privasi baru', () => {
    assert.equal(jelajah.TEKS_PRIVASI_JELAJAH, discoverV1.TEKS_DISCOVER.privasi);
    assert.ok(baca('docs/draf-teks-discover.md').includes(jelajah.TEKS_PRIVASI_JELAJAH));
    assert.ok(baca('docs/draf-teks-jelajah-v2.md').includes(jelajah.TEKS_PRIVASI_JELAJAH));

    const KLAIM_TERLARANG = /hanya kamu yang bisa|hanya terlihat olehmu|rahasia|aman sepenuhnya|tidak ada yang bisa melihat|tidak dapat dilihat siapa pun/i;
    for (const rel of [
      'lib/jelajahV2.ts',
      'components/screens/v2/JelajahV2.tsx',
      'components/screens/v2/ProfilEksplorasiV2.tsx',
      'docs/draf-teks-jelajah-v2.md',
    ]) {
      assert.doesNotMatch(baca(rel), KLAIM_TERLARANG, `${rel} memuat klaim privasi baru yang dilarang`);
    }
    assert.match(baca('components/screens/v2/JelajahV2.tsx'), /\{TEKS_PRIVASI_JELAJAH\}/);
    assert.match(baca('components/screens/v2/ProfilEksplorasiV2.tsx'), /\{TEKS_PRIVASI_JELAJAH\}/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Keadaan kosong (#B4E1EB dua mode), penanda tertulis non-warna, label Aktif 033, 40 kata, aksesibilitas, dan token', () => {
  test('Penanda kartu tertulis + ikon centang (bukan hanya warna), keadaan kosong maskot #B4E1EB, memuat, galat + Coba lagi', () => {
    assert.equal(tema.warnaTerang.latarMaskot.toUpperCase(), '#B4E1EB');
    assert.equal(tema.warnaGelap.latarMaskot.toUpperCase(), '#B4E1EB');
    assert.equal(jelajah.TEKS_JELAJAH_V2.kosongJudul, 'Kartu sedang disiapkan');
    assert.equal(jelajah.TEKS_JELAJAH_V2.penandaSudahDitulis, 'Sudah ditulis');
    assert.equal(jelajah.TEKS_JELAJAH_V2.penandaSudahDibaca, 'Sudah dibaca');

    const layarJelajah = baca('components/screens/v2/JelajahV2.tsx');
    const fnKartu = /function KartuJelajahBesarV2\([\s\S]*?\n\}\n/.exec(layarJelajah)[0];
    assert.match(fnKartu, /<Ikon nama="centang"/, 'penanda kartu wajib memuat ikon centang');
    assert.match(fnKartu, /<Teks[^>]*>\s*\{teksStatus\}\s*<\/Teks>/, 'penanda kartu wajib tertulis, bukan hanya warna');

    assert.match(layarJelajah, /backgroundColor:\s*warna\.latarMaskot/);
    assert.match(layarJelajah, /require\('\.\.\/\.\.\/\.\.\/assets\/mascot-blue\.png'\)/);
    assert.match(layarJelajah, /<PlaceholderMemuat baris=\{2\} label=\{labelMemuat\} \/>/);
    assert.match(layarJelajah, /<KeadaanGalat judul=\{T\.galatJudul\} pesan=\{T\.galatPesan\} onCobaLagi=\{onCobaLagi\} \/>/);
  });

  test('Perbaikan kecil 033: label status tujuan aktif di Jalur Saya v2 adalah "Aktif", sedangkan v1 tetap "Sedang dikejar"', () => {
    assert.equal(jalurSayaV2.LABEL_STATUS_TUJUAN_V2.aktif, 'Aktif');
    assert.equal(jalurV1.LABEL_STATUS_TUJUAN.aktif, 'Sedang dikejar');
    assert.match(baca('components/screens/v2/JalurSayaV2.tsx'), /\{LABEL_STATUS_TUJUAN_V2\[tujuan\.status\]\}/);
    assert.match(baca('components/screens/JalurTujuanScreens.tsx'), /LABEL_STATUS_TUJUAN\[tujuan\.status\]/);
    assert.match(baca('docs/draf-teks-jalur-saya-v2.md'), /Aktif/);
  });

  test('Maksimal 40 kata teks tetap pada semua keadaan layar Jelajah dan Profil Eksplorasi v2', () => {
    assert.equal(jelajah.BATAS_KATA_JELAJAH, 40);
    for (const keadaan of [
      'jelajah_daftar',
      'jelajah_kosong',
      'jelajah_rincian',
      'jelajah_refleksi',
      'profil_isi',
      'profil_kosong',
      'profil_form',
      'galat',
      'fitur_mati',
      'perlu_kebijakan',
    ]) {
      const daftar = jelajah.teksTetapJelajahV2(keadaan);
      const jumlah = jelajah.hitungKataJelajah(daftar.join(' '));
      assert.ok(jumlah <= 40, `${keadaan}: ${jumlah} kata > 40`);
    }
  });

  test('Semua kontrol berlabel, target sentuh >= 44 pt, radio meneruskan dicentang/terpilih, Modal hormati Kurangi gerakan, dan papan ketik aman', () => {
    assert.ok(tema.ukuran.sentuhMin >= 44);
    for (const rel of ['components/screens/v2/JelajahV2.tsx', 'components/screens/v2/ProfilEksplorasiV2.tsx']) {
      const s = baca(rel);
      assert.doesNotMatch(s, /\b(Pressable|TouchableOpacity|TouchableHighlight|TextInput)\b/, rel);
      assert.match(s, /const kurangiGerak = useKurangiGerak\(\);/, rel);
      assert.match(s, /animationType=\{kurangiGerak \? 'none' : 'slide'\}/, rel);
      assert.match(s, /<KeyboardAvoidingView/, rel);

      jelajahAst(ast(rel), (n) => {
        if (!(ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n))) return;
        const tag = n.tagName.getText();
        const atribut = new Map(
          n.attributes.properties.filter(ts.isJsxAttribute).map((a) => [a.name.getText(), a])
        );
        if (tag === 'Sentuh') {
          assert.ok(atribut.has('peran') && atribut.has('label'), `${rel}: <Sentuh> tanpa peran/label`);
          const peranAttr = atribut.get('peran');
          const nilaiPeran =
            peranAttr.initializer && ts.isStringLiteral(peranAttr.initializer) ? peranAttr.initializer.text : '';
          if (nilaiPeran === 'radio') {
            assert.ok(atribut.has('dicentang') && atribut.has('terpilih'), `${rel}: radio wajib dicentang & terpilih`);
          }
        }
        if (tag === 'Tombol' || tag === 'Isian') {
          assert.ok(atribut.has('label'), `${rel}: <${tag}> tanpa label`);
        }
      });
    }
  });

  test('0 HEX langsung di seluruh berkas 034 dan tidak ada warna ungu terlarang', () => {
    const POLA_WARNA = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(.*)$/i;
    const NAMA_WARNA = new Set(['white', 'black', 'red', 'green', 'blue', 'gray', 'grey', 'orange', 'yellow', 'transparent']);
    const UNGU_TERLARANG = new RegExp('#' + '6a3dff', 'i');
    const langgar = [];

    for (const rel of BERKAS_034) {
      const isi = baca(rel);
      assert.doesNotMatch(isi, UNGU_TERLARANG, `${rel}: ungu terlarang dilarang`);
      const sf = ast(rel);
      const baris = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      jelajahAst(sf, (n) => {
        if (
          (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) &&
          (POLA_WARNA.test(n.text) || NAMA_WARNA.has(n.text.toLowerCase()))
        ) {
          langgar.push(`${rel}:${baris(n)} "${n.text}"`);
        }
        if (ts.isTemplateExpression(n)) {
          const gabung = n.head.text + n.templateSpans.map((sp) => sp.literal.text).join('');
          if (/#[0-9a-f]{3,8}|(rgb|hsl)a?\(/i.test(gabung)) {
            langgar.push(`${rel}:${baris(n)} template warna`);
          }
        }
      });
    }
    assert.deepEqual(langgar, []);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Gerbang rilis, dokumentasi, dan kompatibilitas APK 1.0.0', () => {
  test('Berkas 034 terdaftar di gerbang rilis navigasi-v2, belum disetujui, menahan build saat saklar menyala, dan kompatibel-apk-lama utuh', () => {
    assert.ok(fs.existsSync(path.join(AKAR_APP, 'docs', 'peta-jelajah-v2.md')));
    const draf = baca('docs/draf-teks-jelajah-v2.md');
    assert.match(draf, /DRAF/);
    for (const teks of Object.values(jelajah.TEKS_JELAJAH_V2)) {
      assert.ok(draf.includes(teks), `TEKS_JELAJAH_V2 belum tercatat di docs/draf-teks-jelajah-v2.md: "${teks}"`);
    }

    const entri = gerbang.TEKS.find((x) => x.id === 'navigasi-v2');
    for (const rel of [
      'lib/jelajahV2.ts',
      'components/screens/v2/JelajahV2.tsx',
      'components/screens/v2/ProfilEksplorasiV2.tsx',
      'docs/draf-teks-jelajah-v2.md',
    ]) {
      assert.ok(entri.berkas.includes(rel), `${rel} wajib terdaftar di periksa-gerbang-rilis.js`);
    }
    assert.ok(!baca('docs/persetujuan-teks-rilis.json').includes('navigasi-v2'));

    const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'gerbang-034-'));
    try {
      const tulis = (rel, isi) => {
        fs.mkdirSync(path.dirname(path.join(akar, rel)), { recursive: true });
        fs.writeFileSync(path.join(akar, rel), typeof isi === 'string' ? isi : JSON.stringify(isi));
      };
      tulis('lib/kebijakan-privasi.json', { versi: 1, status: 'Berlaku.', ringkasan: ['Ringkas.'], isi: [] });
      for (const rel of entri.berkas) {
        tulis(rel, rel === 'docs/draf-teks-jelajah-v2.md' ? 'DRAF\n' : 'export const X = 1;\n');
      }
      tulis('eas.json', { build: { coba: { env: { EXPO_PUBLIC_NAVIGASI_V2: '1' } } } });
      const pesan = gerbang.periksa(akar).map((m) => m.pesan);
      assert.ok(pesan.includes('Teks navigasi v2 dan Arah Saya: masih draf dan belum disetujui.'), pesan.join(' | '));
    } finally {
      fs.rmSync(akar, { recursive: true, force: true });
    }

    const ujiHp = baca('docs/uji-hp-expo-go.md');
    assert.match(ujiHp, /## 15\. Jelajah dan Profil Eksplorasi v2 \(LANJUT_034\)/);
    assert.match(ujiHp, /--clear/);

    const status = execFileSync('git', ['status', '--porcelain', 'server/tests/kompatibel-apk-lama.test.js'], {
      cwd: AKAR_APP,
      encoding: 'utf8',
    }).trim();
    assert.equal(status, '', 'server/tests/kompatibel-apk-lama.test.js tidak boleh diubah');
    assert.ok(crypto.createHash('sha256').update(baca('server/tests/kompatibel-apk-lama.test.js')).digest('hex').length === 64);
  });
});
