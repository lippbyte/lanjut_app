// LANJUT_031b: mode terang dan gelap (token dua mode) untuk layar v2, di balik saklar
// EXPO_PUBLIC_MODE_GELAP (mati bawaan). Modul murni dites langsung; komponen & layar RN dites
// dari sumber (TypeScript AST), mengikuti pola fondasi-desain-v2, alur-masuk-v2, dan navigasi-v2.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { muatModulApp } = require('./muat-ts-app');
const kontrasSkrip = require('../tools/kontras-token');
const gerbang = require('../tools/periksa-gerbang-rilis');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const tema = muatModulApp('theme/v2/index');
const fitur = muatModulApp('lib/fiturApp');
const modeLib = muatModulApp('lib/modeTampilan');

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
  return modul.exports.default ?? modul.exports;
}

const BERKAS_V2 = [
  ...berkasDi('components/v2'),
  ...berkasDi('components/screens/v2'),
  ...berkasDi('components/galeri'),
];

// ---------------------------------------------------------------------------------------------
describe('Kontras dua mode (terang dan gelap)', () => {
  test('Semua pasangan semantik §3.B lolos di mode terang dan mode gelap', () => {
    const { warnaTerang, warnaGelap, PETA_TOKEN_SEMANTIK, AMBANG, lolos, rasioTertulis } = tema;
    assert.equal(kontrasSkrip.PASANGAN_RINGKAS_031B.length, 14);
    for (const [namaMode, setWarna] of [
      ['terang', warnaTerang],
      ['gelap', warnaGelap],
    ]) {
      for (const p of kontrasSkrip.PASANGAN_RINGKAS_031B) {
        const a = setWarna[PETA_TOKEN_SEMANTIK[p.depan]];
        const b = setWarna[PETA_TOKEN_SEMANTIK[p.latar]];
        assert.ok(
          lolos(a, b, p.jenis),
          `${namaMode}: ${p.depan} (${a}) di ${p.latar} (${b}) = ${rasioTertulis(a, b)}:1 < ${AMBANG[p.jenis]}:1`
        );
      }
    }
  });

  test('Semua pasangan komponen (PASANGAN) lolos di mode terang DAN mode gelap', () => {
    const { warnaTerang, warnaGelap, PASANGAN, AMBANG, lolos, rasioTertulis } = tema;
    assert.deepEqual(Object.keys(warnaGelap).sort(), Object.keys(warnaTerang).sort());
    for (const [namaMode, setWarna] of [
      ['terang', warnaTerang],
      ['gelap', warnaGelap],
    ]) {
      for (const p of PASANGAN) {
        const a = setWarna[p.depan];
        const b = setWarna[p.latar];
        assert.ok(
          lolos(a, b, p.jenis),
          `${namaMode}: ${p.depan} (${a}) di ${p.latar} (${b}) = ${rasioTertulis(a, b)}:1 < ${AMBANG[p.jenis]}:1`
        );
      }
    }
  });

  test('onAccent mode gelap adalah teks gelap (#0C1B33), bukan putih, dengan kontras >= 4,5:1', () => {
    const { warnaGelap, warnaTerang, lolos, rasioTertulis } = tema;
    assert.equal(warnaGelap.teksPadaAksen.toUpperCase(), '#0C1B33');
    assert.notEqual(warnaGelap.teksPadaAksen.toUpperCase(), '#FFFFFF');
    assert.equal(warnaGelap.aksen.toUpperCase(), '#95BDD7');
    assert.ok(lolos(warnaGelap.teksPadaAksen, warnaGelap.aksen, 'teks'), `gelap onAccent/accent: ${rasioTertulis(warnaGelap.teksPadaAksen, warnaGelap.aksen)}:1`);
    // Mode terang tetap putih di atas biru tua #3B5F80.
    assert.equal(warnaTerang.teksPadaAksen.toUpperCase(), '#FFFFFF');
    assert.ok(lolos(warnaTerang.teksPadaAksen, warnaTerang.aksen, 'teks'));
    // Putih di atas aksen gelap (#95BDD7) memang gagal (< 4,5:1), alasan onAccent gelap wajib gelap.
    assert.ok(!lolos('#FFFFFF', warnaGelap.aksen, 'teks'));
  });

  test('Skrip kontras-token.js lulus untuk mode terang dan gelap', () => {
    const keluar = execFileSync(process.execPath, ['tools/kontras-token.js'], {
      cwd: path.join(AKAR_APP, 'server'),
      encoding: 'utf8',
    });
    assert.match(keluar, new RegExp(`Mode terang: ${tema.PASANGAN.length} pasangan, 0 gagal\\.`));
    assert.match(keluar, new RegExp(`Mode gelap: ${tema.PASANGAN.length} pasangan, 0 gagal\\.`));
  });
});

// ---------------------------------------------------------------------------------------------
describe('Saklar EXPO_PUBLIC_MODE_GELAP: mati bawaan, hidup sesuai pilihan lokal', () => {
  test('modeGelapAktif hanya menyala untuk extra.modeGelap === true', () => {
    for (const extra of [undefined, null, {}, 'ya', { modeGelap: false }, { modeGelap: '1' }, { modeGelap: 1 }]) {
      assert.equal(fitur.modeGelapAktif(extra), false, JSON.stringify(extra));
    }
    assert.equal(fitur.modeGelapAktif({ modeGelap: true }), true);
  });

  test('Bawaan mati di app.config; userInterfaceStyle tetap light saat mati dan tidak dinyalakan di profil build', () => {
    const mati = muatKonfigApp({});
    assert.equal(mati.extra.modeGelap, false);
    assert.equal(mati.userInterfaceStyle, 'light');
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_MODE_GELAP: '0' }).extra.modeGelap, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_MODE_GELAP: 'true' }).extra.modeGelap, false);

    const menyala = muatKonfigApp({ EXPO_PUBLIC_MODE_GELAP: '1' });
    assert.equal(menyala.extra.modeGelap, true);
    assert.equal(menyala.userInterfaceStyle, 'automatic');

    for (const b of [
      'eas.json',
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.dev.yml',
      'server/.env.example',
      'server/.env.production.example',
      'server/.env.railway.contoh',
    ]) {
      assert.ok(!baca(b).includes('MODE_GELAP'), `${b} tidak boleh menyalakan EXPO_PUBLIC_MODE_GELAP`);
    }
  });

  test('Saklar mati: selalu terang, mengabaikan pengaturan sistem dan pilihan, tanpa tombol mode', () => {
    for (const pilihan of ['sistem', 'terang', 'gelap']) {
      for (const skemaSistem of ['light', 'dark', null, undefined]) {
        assert.equal(
          modeLib.tentukanModeAktif({ saklarAktif: false, pilihan, skemaSistem }),
          'terang',
          JSON.stringify({ pilihan, skemaSistem })
        );
      }
    }
    assert.match(baca('components/screens/v2/PilihModeTampilanV2.tsx'), /if \(!saklarAktif\) return null;/);
    assert.match(baca('components/screens/v2/AppShellV2.tsx'), /const tampilPilihMode = modeGelap && pathname === '\/akun';/);
    const penyedia = baca('components/screens/v2/TemaV2Provider.tsx');
    assert.match(penyedia, /const SAKLAR_MODE_GELAP = modeGelapAktif\(Constants\.expoConfig\?\.extra\);/);
    assert.match(penyedia, /if \(!SAKLAR_MODE_GELAP\) return;/);
  });

  test('Saklar menyala: sistem ikuti useColorScheme (null -> terang); terang & gelap menimpa sistem', () => {
    // sistem mengikuti pengaturan HP
    assert.equal(modeLib.tentukanModeAktif({ saklarAktif: true, pilihan: 'sistem', skemaSistem: 'dark' }), 'gelap');
    assert.equal(modeLib.tentukanModeAktif({ saklarAktif: true, pilihan: 'sistem', skemaSistem: 'light' }), 'terang');
    assert.equal(modeLib.tentukanModeAktif({ saklarAktif: true, pilihan: 'sistem', skemaSistem: null }), 'terang');
    assert.equal(modeLib.tentukanModeAktif({ saklarAktif: true, pilihan: 'sistem', skemaSistem: undefined }), 'terang');
    // terang dan gelap menimpa pengaturan sistem
    assert.equal(modeLib.tentukanModeAktif({ saklarAktif: true, pilihan: 'terang', skemaSistem: 'dark' }), 'terang');
    assert.equal(modeLib.tentukanModeAktif({ saklarAktif: true, pilihan: 'gelap', skemaSistem: 'light' }), 'gelap');
    assert.equal(modeLib.tentukanModeAktif({ saklarAktif: true, pilihan: 'gelap', skemaSistem: null }), 'gelap');
    // TemaV2Provider benar-benar memakai useColorScheme()
    const penyedia = baca('components/screens/v2/TemaV2Provider.tsx');
    assert.match(penyedia, /useColorScheme\(\)/);
    assert.match(penyedia, /tentukanModeAktif\(\{\s*saklarAktif: SAKLAR_MODE_GELAP,\s*pilihan,\s*skemaSistem,\s*\}\)/);
  });

  test('Pilihan mode bertahan sesudah aplikasi dibuka ulang (lokal saja, tanpa jaringan)', async () => {
    const peta = new Map();
    const penyimpanan = {
      async getItem(k) {
        return peta.has(k) ? peta.get(k) : null;
      },
      async setItem(k, v) {
        peta.set(k, v);
      },
    };
    // Bawaan sebelum pernah dipilih: sistem
    assert.equal(await modeLib.bacaPilihanMode(penyimpanan), 'sistem');
    // Simpan 'gelap', lalu baca ulang (simulasi app dibuka ulang)
    await modeLib.simpanPilihanMode(penyimpanan, 'gelap');
    assert.equal(peta.get(modeLib.KUNCI_MODE_TAMPILAN), 'gelap');
    assert.equal(await modeLib.bacaPilihanMode(penyimpanan), 'gelap');
    // Simpan 'terang'
    await modeLib.simpanPilihanMode(penyimpanan, 'terang');
    assert.equal(await modeLib.bacaPilihanMode(penyimpanan), 'terang');
    // Nilai rusak / penyimpanan gagal -> aman jatuh ke 'sistem'
    peta.set(modeLib.KUNCI_MODE_TAMPILAN, 'ungu-asing');
    assert.equal(await modeLib.bacaPilihanMode(penyimpanan), 'sistem');
    const rusak = {
      async getItem() {
        throw new Error('storage error');
      },
      async setItem() {
        throw new Error('storage error');
      },
    };
    assert.equal(await modeLib.bacaPilihanMode(rusak), 'sistem');
    await assert.doesNotReject(() => modeLib.simpanPilihanMode(rusak, 'gelap'));

    // Tidak ada kode mode tampilan yang mengirim ke jaringan atau memakai SecureStore
    for (const rel of [
      'lib/modeTampilan.ts',
      'lib/simpanModeTampilan.ts',
      'theme/v2/konteks.tsx',
      'components/screens/v2/TemaV2Provider.tsx',
      'components/screens/v2/PilihModeTampilanV2.tsx',
    ]) {
      const s = baca(rel);
      assert.doesNotMatch(s, /\bfetch\s*\(|apiFetch|XMLHttpRequest|axios|https?:\/\/|SecureStore|from ['"][^'"]*\/api\//, `${rel} tidak boleh menyentuh jaringan/SecureStore`);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('Kebersihan token, larangan HEX langsung, ungu EDILAKSO, dan kata acuan asing', () => {
  test('Tidak ada kode HEX di luar berkas token pada seluruh berkas v2', () => {
    const POLA_WARNA = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(.*)$/i;
    const langgar = [];
    for (const rel of [...BERKAS_V2, 'theme/v2/konteks.tsx', 'lib/modeTampilan.ts', 'lib/simpanModeTampilan.ts']) {
      const sf = ast(rel);
      const baris = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      jelajah(sf, (n) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && POLA_WARNA.test(n.text)) {
          langgar.push(`${rel}:${baris(n)} "${n.text}"`);
        }
      });
    }
    assert.deepEqual(langgar, []);
  });

  test('Tidak ada ungu EDILAKSO (#6A3DFF) di mana pun di LANJUT_App (kecuali berkas tes ini)', () => {
    const LEWATI_DIR = new Set(['node_modules', '.git', '.expo', 'dist', 'build', 'android', 'ios']);
    const EKST_TEKS = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|css|html|yml|yaml|txt)$/i;
    const sendiri = path.resolve(__filename);
    const temuan = [];

    const jalan = (dir) => {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        const penuh = path.join(dir, e.name);
        if (e.isDirectory()) {
          if (!LEWATI_DIR.has(e.name)) jalan(penuh);
          continue;
        }
        if (path.resolve(penuh) === sendiri) continue;
        if (!EKST_TEKS.test(e.name)) continue;
        const isi = fs.readFileSync(penuh, 'utf8');
        if (/#6a3dff/i.test(isi)) temuan.push(path.relative(AKAR_APP, penuh));
      }
    };
    jalan(AKAR_APP);
    assert.deepEqual(temuan, []);
  });

  test('Tidak ada kata dari gambar acuan ("Nova", "TEPERCAYA", "Keuangan bisnismu") di kode sumber aplikasi', () => {
    const POLA_ACUAN = /\bNova\b|TEPERCAYA|Keuangan bisnismu/i;
    const temuan = [];
    for (const folder of ['app', 'components', 'lib', 'hooks', 'providers', 'api', 'theme']) {
      for (const rel of berkasDi(folder)) {
        if (POLA_ACUAN.test(baca(rel))) temuan.push(rel);
      }
    }
    assert.deepEqual(temuan, []);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Aksesibilitas, tautan bergaris bawah, status non-warna, Phosphor Icons, dan logo', () => {
  test('Tombol ganti mode berlabel, target minimal 44 pt (lewat Sentuh), dan accessibilityState terpilih', () => {
    const s = baca('components/screens/v2/PilihModeTampilanV2.tsx');
    assert.doesNotMatch(s, /\b(Pressable|Touchable\w*)\b/);
    assert.match(s, /accessibilityRole="radiogroup"/);
    assert.match(s, /<Sentuh[\s\S]*peran="radio"[\s\S]*label=\{o\.label\}[\s\S]*terpilih=\{aktif\}[\s\S]*dicentang=\{aktif\}/);
    assert.match(s, /\{aktif \? <Ikon nama="centang"/);
    assert.deepEqual(
      modeLib.TEKS_MODE_TAMPILAN.opsi.map((o) => ({ nilai: o.nilai, label: o.label })),
      [
        { nilai: 'sistem', label: 'Ikuti sistem' },
        { nilai: 'terang', label: 'Terang' },
        { nilai: 'gelap', label: 'Gelap' },
      ]
    );
  });

  test('Tautan bergaris bawah di kedua mode; tombol sekunder transparan; bayangan kartu hanya di terang', () => {
    const teks = baca('components/v2/Teks.tsx');
    assert.match(teks, /textDecorationLine:\s*'underline'/);
    assert.match(teks, /garisBawah\s*\?\s*s\.garisBawah\s*:\s*null/);

    const tombol = baca('components/v2/Tombol.tsx');
    assert.match(tombol, /sekunder:\s*\{\s*latar:\s*'transparan',\s*latarTekan:\s*'permukaanLembut',\s*garis:\s*'aksen',\s*teks:\s*'aksen'\s*\}/);
    assert.match(tombol, /garisBawah=\{varian === 'teks'\}/);

    const ringkas = baca('components/v2/RingkasanSelengkapnya.tsx');
    assert.match(ringkas, /<Teks[^>]*garisBawah/);

    const kartu = baca('components/v2/Kartu.tsx');
    assert.match(kartu, /mode === 'terang' && !nonaktif \? elevasi\.angkat : elevasi\.datar/);
    assert.match(kartu, /varian === 'brand' \? 'teks' : 'teksSekunder'/);
  });

  test('Status tidak pernah hanya warna: galat dan sukses selalu punya ikon dan teks', () => {
    const ps = baca('components/v2/PesanStatus.tsx');
    assert.match(ps, /<Ikon nama=\{galat \? 'waspada' : 'centang'\}/);
    assert.match(ps, /<Teks[\s\S]*>\{children\}<\/Teks>|<Teks[\s\S]*>\s*\{children\}\s*<\/Teks>/);

    const kg = baca('components/v2/KeadaanGalat.tsx');
    assert.match(kg, /<Ikon nama="waspada"/);
    assert.match(kg, /<Teks[^>]*>\s*\{judul\}\s*<\/Teks>/);
    assert.match(kg, /<Teks[^>]*>\{pesan\}<\/Teks>/);
  });

  test('Bilah status dan papan ketik mengikuti mode aktif', () => {
    const penyedia = baca('components/screens/v2/TemaV2Provider.tsx');
    assert.match(penyedia, /style=\{mode === 'gelap' \? 'light' : 'dark'\}/);
    assert.match(baca('app/_layout.tsx'), /<TemaV2Provider>[\s\S]*<StatusBarV2 \/>[\s\S]*<\/TemaV2Provider>/);
    assert.match(baca('components/v2/Isian.tsx'), /keyboardAppearance=\{mode === 'gelap' \? 'dark' : 'light'\}/);
  });

  test('Komponen dan layar v2 memakai Phosphor Icons (bukan SVG v1) dan wordmark ditandai [PERLU DIKONFIRMASI]', () => {
    assert.match(baca('components/v2/IkonV2.tsx'), /from 'phosphor-react-native'/);
    for (const rel of [...berkasDi('components/v2'), ...berkasDi('components/screens/v2')]) {
      assert.doesNotMatch(baca(rel), /from '\.\.\/ui\/Ikon'|from '\.\.\/\.\.\/ui\/Ikon'/, `${rel} masih memakai Ikon v1`);
    }
    assert.match(baca('components/screens/v2/TabBarV2.tsx'), /bobot=\{terisi \? 'fill' : 'regular'\}/);
    assert.match(baca('theme/v2/warna.ts'), /\[PERLU DIKONFIRMASI\][\s\S]*badgeLogo:\s*palet\.biruBaja/);
    assert.match(baca('components/screens/v2/AppShellV2.tsx'), /\[PERLU DIKONFIRMASI\][\s\S]*mode === 'terang' \? \{ backgroundColor: warna\.badgeLogo \} : null/);
    // Layar v1 tidak di-reskin
    for (const rel of ['components/screens/AkunScreen.tsx', 'components/screens/LinimasaScreen.tsx', 'components/layout/AppShell.tsx']) {
      assert.doesNotMatch(baca(rel), /useTemaV2|TemaV2Provider|modeGelapAktif/, `${rel} (v1) tidak boleh disentuh`);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('Gerbang rilis dan dokumentasi draf mode tampilan v2', () => {
  test('EXPO_PUBLIC_MODE_GELAP terdaftar, tidak disetujui, dan menahan profil build yang menyalakannya', () => {
    const t = gerbang.TEKS.find((x) => x.id === 'mode-gelap-v2');
    assert.ok(t);
    assert.equal(t.saklar, 'EXPO_PUBLIC_MODE_GELAP');
    assert.deepEqual(t.berkas, ['lib/modeTampilan.ts', 'docs/draf-teks-mode-tampilan-v2.md']);
    assert.ok(gerbang.SEMUA_SAKLAR.includes('EXPO_PUBLIC_MODE_GELAP'));
    assert.ok(!baca('docs/persetujuan-teks-rilis.json').includes('mode-gelap-v2'));
    assert.match(baca('lib/modeTampilan.ts'), /TEKS DRAF/);
    assert.match(baca('docs/draf-teks-mode-tampilan-v2.md'), /DRAF/);

    const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'gerbang-031b-'));
    try {
      const tulis = (rel, isi) => {
        fs.mkdirSync(path.dirname(path.join(akar, rel)), { recursive: true });
        fs.writeFileSync(path.join(akar, rel), typeof isi === 'string' ? isi : JSON.stringify(isi));
      };
      tulis('lib/kebijakan-privasi.json', { versi: 1, status: 'Berlaku.', ringkasan: ['Ringkas.'], isi: [] });
      tulis('lib/modeTampilan.ts', '// TEKS DRAF\n');
      tulis('docs/draf-teks-mode-tampilan-v2.md', 'DRAF\n');
      tulis('eas.json', { build: { coba: { env: { EXPO_PUBLIC_MODE_GELAP: '1' } } } });
      const pesan = gerbang.periksa(akar).map((m) => m.pesan);
      assert.ok(pesan.includes('Teks mode tampilan v2: masih draf dan belum disetujui.'), pesan.join(' | '));
      tulis('eas.json', { build: { coba: { env: {} } } });
      assert.deepEqual(gerbang.periksa(akar), []);
    } finally {
      fs.rmSync(akar, { recursive: true, force: true });
    }
  });

  test('Dokumen draf memuat setiap teks mode tampilan; uji HP memuat langkah 031b dan --clear', () => {
    const doc = baca('docs/draf-teks-mode-tampilan-v2.md');
    assert.ok(doc.includes(modeLib.TEKS_MODE_TAMPILAN.judul));
    assert.ok(doc.includes(modeLib.TEKS_MODE_TAMPILAN.ringkasan));
    for (const o of modeLib.TEKS_MODE_TAMPILAN.opsi) {
      assert.ok(doc.includes(o.label), `label belum ada di draf: ${o.label}`);
    }
    const uji = baca('docs/uji-hp-expo-go.md');
    assert.match(uji, /EXPO_PUBLIC_MODE_GELAP/);
    assert.match(uji, /--clear/);
  });
});
