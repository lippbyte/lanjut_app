// LANJUT_039: perbaikan mode gelap dan aksesibilitas klien v2 dari temuan audit 038:
//   1. 18 rute v1 di dalam AppShellV2 pada mode gelap terbaca (kontras >= 4,5:1) tanpa mereskin layar v1
//   2. Modal kebijakan DaftarV2, /kebijakan-privasi, /terima-kebijakan, dan LayarMemuat ikut mode dua warna
//      tanpa mengubah satu karakter pun isi teks kebijakan
//   3. Lingkaran maskot PengantarV2 memakai warna.latarMaskot (#B4E1EB) di kedua mode
//   4. Label TabBarV2 turun dua baris (tidak terpotong pada 1,3x dan 2,0x), target >= 44 pt & label lengkap
//   5. Tiga istilah v1 "Data Akun" di teks v2 -> "Akun & Privasi"; kalimat persetujuan v1 utuh

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { muatModulApp } = require('./muat-ts-app');
const audit = require('../tools/audit-siap-tester');
const gerbang = require('../tools/periksa-gerbang-rilis');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const navV2 = muatModulApp('lib/navigasiV2');
const alurV2 = muatModulApp('lib/alurMasukV2');
const jalurV2 = muatModulApp('lib/jalurSayaV2');
const jelajahV2 = muatModulApp('lib/jelajahV2');
const tema = muatModulApp('theme/v2/index');
const { warnaTerang, warnaGelap, lolos, rasioTertulis, AMBANG } = tema;

const ast = (rel) => ts.createSourceFile(rel, baca(rel), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
function jelajah(n, fn) {
  fn(n);
  ts.forEachChild(n, (c) => jelajah(c, fn));
}

// ---------------------------------------------------------------------------------------------
describe('Isolasi saklar mati dan keutuhan layar v1 (sabotase #8 & #10)', () => {
  test('Rute /kebijakan-privasi dan /terima-kebijakan memilih v1 saat saklar mati dan v2 saat saklar menyala', () => {
    const keb = baca('app/kebijakan-privasi.tsx');
    assert.match(keb, /const PAKAI_V2 = modeGelapAktif\(EXTRA\) \|\| navigasiV2Aktif\(EXTRA\);/);
    assert.match(keb, /return PAKAI_V2 \? <KebijakanPrivasiV2 \/> : <KebijakanPrivasiScreen \/>;/);

    const terima = baca('app/(app)/terima-kebijakan.tsx');
    assert.match(terima, /const PAKAI_V2 = modeGelapAktif\(EXTRA\) \|\| navigasiV2Aktif\(EXTRA\);/);
    assert.match(terima, /return PAKAI_V2 \? <TerimaKebijakanV2 \/> : <TerimaKebijakanScreen \/>;/);

    const memuat = baca('components/layout/LayarMemuat.tsx');
    assert.match(memuat, /const \{ mode, warna, saklarAktif \} = useTemaV2\(\);/);
    assert.match(memuat, /const gelap = saklarAktif && mode === 'gelap';/);
    assert.match(memuat, /gelap && \{ backgroundColor: warna\.halaman \}/);
    assert.match(memuat, /color=\{gelap \? warna\.aksen : color\.blue500\}/);
  });

  test('Layar v1 (KebijakanPrivasiScreen, TerimaKebijakan, LevelIn, Ngobrol, Arsip, Akun, Linimasa, AppShell) tidak diubah', () => {
    for (const rel of [
      'components/screens/KebijakanPrivasiScreen.tsx',
      'components/screens/TerimaKebijakan.tsx',
      'components/screens/LevelInScreen.tsx',
      'components/screens/NgobrolScreen.tsx',
      'components/screens/AkunScreen.tsx',
      'components/screens/LinimasaScreen.tsx',
      'components/layout/AppShell.tsx',
    ]) {
      assert.doesNotMatch(baca(rel), /useTemaV2|TemaV2Provider|KebijakanV2|theme\/v2/, `${rel} (v1) tidak boleh memakai tema v2`);
    }
    // Saklar tetap mati bawaan di app.config.ts dan eas.json
    const appCfg = baca('app.config.ts');
    assert.match(appCfg, /modeGelap:\s*MODE_GELAP_AKTIF/);
    assert.match(appCfg, /const MODE_GELAP_AKTIF = process\.env\.EXPO_PUBLIC_MODE_GELAP === '1';/);
    assert.match(appCfg, /navigasiV2:\s*process\.env\.EXPO_PUBLIC_NAVIGASI_V2 === '1'/);
    const eas = JSON.parse(baca('eas.json')).build;
    for (const [nama, p] of Object.entries(eas)) {
      assert.notEqual(p.env?.EXPO_PUBLIC_MODE_GELAP, '1', `eas.json:${nama} tidak boleh menyalakan MODE_GELAP`);
      assert.notEqual(p.env?.EXPO_PUBLIC_NAVIGASI_V2, '1', `eas.json:${nama} tidak boleh menyalakan NAVIGASI_V2`);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('Kontras >= 4,5:1 untuk 18 rute v1 di shell gelap, ModalKebijakanV2, dan /kebijakan-privasi (sabotase #1 & #2)', () => {
  const SAKLAR_PENUH = { discover: true, jalurTujuan: true, portofolio: true, kelolaDataAkun: true };
  const TINTA_V1 = [
    ['color.textBody', '#1A1A1A'],
    ['color.ink700', '#3D4450'],
    ['color.ink500', '#6B7480'],
    ['color.textLink', '#456A8C'],
    ['color.statusOkFg', '#2F6B5C'],
  ];

  test('Semua 18 rute v1 aktif terdaftar dan terlindungi kontras >= 4,5:1 di kedua mode', () => {
    assert.equal(navV2.RUTE_V1_DI_SHELL_V2.length, 18);
    for (const rute of navV2.RUTE_V1_DI_SHELL_V2) {
      if (rute === '/terima-kebijakan') {
        assert.equal(navV2.butuhWadahTerangV1(rute, SAKLAR_PENUH), false, '/terima-kebijakan memakai TerimaKebijakanV2 dua mode');
      } else {
        assert.equal(navV2.butuhWadahTerangV1(rute, SAKLAR_PENUH), true, `${rute} wajib dibungkus wadah terang di mode gelap`);
      }
    }
    // Rute v2 aktif TIDAK dibungkus wadah terang saat saklarnya menyala
    for (const ruteV2 of [
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
    ]) {
      assert.equal(navV2.butuhWadahTerangV1(ruteV2, SAKLAR_PENUH), false, `${ruteV2} adalah layar v2 gelap`);
    }
    // Jika saklar kelolaDataAkun mati, /akun merender AkunScreen v1 -> wajib wadah terang
    assert.equal(navV2.butuhWadahTerangV1('/akun', { ...SAKLAR_PENUH, kelolaDataAkun: false }), true);

    // AppShellV2 sungguh membungkus ScrollView dan kolomPenuh (/ngobrol) dengan warnaTerang.halaman saat gelap
    const shell = baca('components/screens/v2/AppShellV2.tsx');
    assert.match(shell, /const ruteV1Terang = mode === 'gelap' && butuhWadahTerangV1\(pathname, SAKLAR\);/);
    assert.match(shell, /const latarIsi = ruteV1Terang \? warnaTerang\.halaman : warna\.halaman;/);
    assert.match(shell, /const latarPenuh = ruteV1Terang \? warnaTerang\.halaman : warna\.permukaan;/);
    assert.match(shell, /<Main style=\{StyleSheet\.flatten\(\[s\.main, \{ backgroundColor: latarIsi \}\]\)\}>/);
    assert.match(shell, /backgroundColor: latarPenuh/);
    // Baris 031b yang dikunci tetap utuh
    assert.match(shell, /const tampilPilihMode = modeGelap && pathname === '\/akun';/);

    // Semua tinta v1 di atas warnaTerang.halaman (#FFFFFF) lolos >= 4,5:1
    for (const [nama, hex] of TINTA_V1) {
      assert.ok(
        lolos(hex, warnaTerang.halaman, 'teks'),
        `${nama} (${hex}) di atas ${warnaTerang.halaman} = ${rasioTertulis(hex, warnaTerang.halaman)}:1 < ${AMBANG.teks}:1`
      );
    }

    // Skrip audit 038 melaporkan 0 gagal untuk seluruh 18 rute v1 di shell gelap
    const hasilAudit = audit.auditKontras();
    assert.equal(hasilAudit.ruteV1DalamShellGelap.total, 18);
    assert.equal(hasilAudit.ruteV1DalamShellGelap.gagal, 0);
  });

  test('ModalKebijakanV2, /kebijakan-privasi, dan /terima-kebijakan lolos kontras >= 4,5:1 di terang dan gelap', () => {
    const daftar = baca('components/screens/v2/DaftarV2.tsx');
    assert.match(daftar, /import \{ IsiKebijakanV2 \} from '\.\/KebijakanV2';/);
    assert.match(daftar, /\{mode === 'gelap' \? <IsiKebijakanV2 \/> : <IsiKebijakan \/>\}/);

    const kebV2 = baca('components/screens/v2/KebijakanV2.tsx');
    assert.match(kebV2, /backgroundColor: warna\.halaman/);
    assert.match(kebV2, /backgroundColor: warna\.permukaan/);
    assert.match(kebV2, /<Teks varian="badanKecil">/);
    assert.match(kebV2, /<Teks varian="keterangan" warna="teksSekunder">/);

    // Periksa kontras aktual di kedua mode
    for (const [namaMode, w] of [
      ['terang', warnaTerang],
      ['gelap', warnaGelap],
    ]) {
      assert.ok(lolos(w.teks, w.halaman, 'teks'), `${namaMode} teks/halaman`);
      assert.ok(lolos(w.teks, w.permukaan, 'teks'), `${namaMode} teks/permukaan`);
      assert.ok(lolos(w.teksSekunder, w.halaman, 'teks'), `${namaMode} teksSekunder/halaman`);
      assert.ok(lolos(w.teksSekunder, w.permukaan, 'teks'), `${namaMode} teksSekunder/permukaan`);
      assert.ok(lolos(w.teksPadaAksen, w.aksen, 'teks'), `${namaMode} tombol utama`);
    }

    const hasilAudit = audit.auditKontras();
    assert.equal(hasilAudit.kebijakanPrivasiDuaMode, true);
    assert.ok(
      hasilAudit.kebocoranV1DiModalGelap.every((x) => x.lolos),
      `Modal kebijakan gelap masih gagal kontras: ${JSON.stringify(hasilAudit.kebocoranV1DiModalGelap)}`
    );
  });
});

// ---------------------------------------------------------------------------------------------
describe('Isi teks kebijakan identik tanpa perubahan satu karakter pun (sabotase #3)', () => {
  test('lib/kebijakan-privasi.json tidak berubah dari HEAD dan KebijakanV2 membacanya langsung', () => {
    const statusKeb = execFileSync('git', ['status', '--porcelain', 'lib/kebijakan-privasi.json'], {
      cwd: AKAR_APP,
      encoding: 'utf8',
    }).trim();
    assert.equal(statusKeb, '', 'lib/kebijakan-privasi.json tidak boleh berubah sedikit pun');

    const headIsi = execFileSync('git', ['show', 'HEAD:lib/kebijakan-privasi.json'], {
      cwd: AKAR_APP,
      encoding: 'utf8',
    }).replace(/\r\n/g, '\n');
    const kiniIsi = baca('lib/kebijakan-privasi.json');
    const hashHead = crypto.createHash('sha256').update(headIsi).digest('hex');
    const hashKini = crypto.createHash('sha256').update(kiniIsi).digest('hex');
    assert.equal(hashKini, hashHead, 'Hash isi lib/kebijakan-privasi.json wajib identik');

    const kebV2 = baca('components/screens/v2/KebijakanV2.tsx');
    assert.match(kebV2, /ISI_KEBIJAKAN,\s*RINGKASAN_KEBIJAKAN,\s*STATUS_KEBIJAKAN,\s*VERSI_KEBIJAKAN/);
    assert.match(kebV2, /\{STATUS_KEBIJAKAN\}/);
    assert.match(kebV2, /\{ISI_KEBIJAKAN\.map\(/);
    assert.match(kebV2, /\{RINGKASAN_KEBIJAKAN\.map\(/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Maskot PengantarV2, label TabBarV2 font besar, dan kebocoran istilah v1 (sabotase #4, #5, #6, #7)', () => {
  test('Lingkaran maskot PengantarV2 memakai warna.latarMaskot (#B4E1EB) di kedua mode', () => {
    const pengantar = baca('components/screens/v2/PengantarV2.tsx');
    assert.match(pengantar, /s\.maskotWadah,\s*\{\s*backgroundColor:\s*warna\.latarMaskot\s*\}/);
    assert.doesNotMatch(pengantar, /s\.maskotWadah,\s*\{\s*backgroundColor:\s*warna\.brand\s*\}/);
    assert.equal(warnaTerang.latarMaskot.toUpperCase(), '#B4E1EB');
    assert.equal(warnaGelap.latarMaskot.toUpperCase(), '#B4E1EB');
    assert.equal(audit.auditKontras().maskotPengantarPakaiLatarMaskot, true);
  });

  test('TabBarV2 tidak memotong label 1 baris (baris={2}), paddingHorizontal 0, target >= 44 pt, nama aksesibel lengkap', () => {
    const tb = baca('components/screens/v2/TabBarV2.tsx');
    assert.match(tb, /baris=\{2\}/);
    assert.doesNotMatch(tb, /baris=\{1\}|numberOfLines=\{1\}/);
    assert.match(tb, /paddingHorizontal:\s*0/);
    assert.match(tb, /labelTab:\s*\{\s*width:\s*'100%',?\s*\}/);
    assert.match(tb, /<Sentuh[\s\S]*peran="tab"[\s\S]*label=\{t\.label\}[\s\S]*terpilih=\{sedang\}/);
    assert.match(tb, /<IkonTab nama=\{t\.ikon\} terisi=\{sedang\} warnaIkon=\{warnaIkon\} \/>/);
    assert.equal(audit.auditKontras().tabBarDuaBaris, true);
    assert.ok(tema.ukuran.sentuhMin >= 44);
    // Skala font sistem pada komponen teks isi (Teks.tsx) tetap dihormati (pemeriksaan AST atribut JSX)
    jelajah(ast('components/v2/Teks.tsx'), (n) => {
      if (ts.isJsxAttribute(n)) {
        assert.doesNotMatch(n.name.getText(), /^(allowFontScaling|maxFontSizeMultiplier|adjustsFontSizeToFit)$/);
      }
    });
  });

  test('Tiga istilah "Data Akun" di teks v2 menjadi "Akun & Privasi"; kalimat persetujuan v1 utuh', () => {
    assert.equal(alurV2.TEKS_PENGANTAR.kelolaData, 'Data bisa diunduh atau dihapus di Akun & Privasi.');
    assert.equal(jalurV2.TEKS_JALUR_SAYA_V2.prodiKeterangan, 'Prodi impian · Akun & Privasi');
    assert.equal(jelajahV2.TEKS_JELAJAH_V2.bagianDataAkun, 'Akun & Privasi');

    // Tidak ada kebocoran "Data Akun" di hasil audit bahasa v2
    const bahasa = audit.auditBahasaDanTeks();
    const bocorDataAkun = bahasa.istilahV1Bocor.filter((x) => /Data Akun/i.test(x.teks));
    assert.deepEqual(bocorDataAkun, [], `Masih ada istilah "Data Akun" di teks v2: ${JSON.stringify(bocorDataAkun)}`);
    assert.deepEqual(bahasa.batasKataGagal, []);
    assert.deepEqual(bahasa.kataTerlarang, []);
    assert.deepEqual(bahasa.unguDitemukan, []);

    // Dokumen draf yang terkait ikut selaras
    assert.ok(baca('docs/draf-teks-alur-masuk-v2.md').includes('Data bisa diunduh atau dihapus di Akun & Privasi.'));
    assert.ok(baca('docs/draf-teks-jalur-saya-v2.md').includes('Prodi impian · Akun & Privasi'));
    assert.ok(baca('docs/draf-teks-jelajah-v2.md').includes('| `bagianDataAkun` | `Akun & Privasi` |'));

    // Kalimat persetujuan v1 yang sudah disetujui TIDAK diubah (tetap memuat "Daftar Periksamu")
    assert.ok(alurV2.TEKS_V1.dataPribadi.includes('Daftar Periksamu'));
    const reg = baca('components/screens/auth/RegisterScreen.tsx');
    const cocok = /const KALIMAT_DATA_PRIBADI =\s*'([^']+)';/.exec(reg);
    assert.ok(cocok);
    assert.equal(alurV2.TEKS_V1.dataPribadi, cocok[1]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Kebersihan token (0 HEX, 0 ungu EDILAKSO), gerbang rilis, dan kompatibilitas APK 1.0.0 (sabotase #9)', () => {
  test('0 HEX langsung dan 0 ungu terlarang di seluruh berkas v2 yang disentuh 039', () => {
    const POLA_WARNA = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(.*)$/i;
    const UNGU_TERLARANG = new RegExp('#' + '6a3dff', 'i');
    const berkas = [
      'components/screens/v2/KebijakanV2.tsx',
      'components/screens/v2/AppShellV2.tsx',
      'components/screens/v2/DaftarV2.tsx',
      'components/screens/v2/PengantarV2.tsx',
      'components/screens/v2/TabBarV2.tsx',
      'components/screens/v2/TemaV2Provider.tsx',
    ];
    for (const rel of berkas) {
      assert.doesNotMatch(baca(rel), UNGU_TERLARANG, `${rel}: ungu terlarang`);
      const sf = ast(rel);
      jelajah(sf, (n) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && POLA_WARNA.test(n.text)) {
          assert.fail(`HEX langsung di ${rel}: "${n.text}"`);
        }
      });
    }
  });

  test('KebijakanV2 terdaftar di gerbang rilis navigasi-v2; persetujuan rilis, server, dan kompatibel-apk-lama utuh', () => {
    const entri = gerbang.TEKS.find((t) => t.id === 'navigasi-v2');
    assert.ok(entri && entri.berkas.includes('components/screens/v2/KebijakanV2.tsx'));
    assert.deepEqual(JSON.parse(baca('docs/persetujuan-teks-rilis.json')).disetujui, []);
    assert.ok(fs.existsSync(path.join(AKAR_APP, 'docs', 'rencana-039.md')));
    assert.match(baca('docs/uji-hp-expo-go.md'), /LANJUT_039/);

    for (const rel of [
      'server/src',
      'server/tests/kompatibel-apk-lama.test.js',
      'docs/persetujuan-teks-rilis.json',
      'eas.json',
      'app.config.ts',
    ]) {
      const st = execFileSync('git', ['status', '--porcelain', rel], { cwd: AKAR_APP, encoding: 'utf8' }).trim();
      assert.equal(st, '', `${rel} tidak boleh diubah oleh LANJUT_039`);
    }
  });
});
