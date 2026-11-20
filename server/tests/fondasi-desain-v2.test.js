// LANJUT_029: fondasi desain v2 (theme/v2, components/v2, galeri komponen dev). Modul murni dites
// langsung; komponen React Native dites dari sumbernya (TypeScript AST), karena tidak ada
// perender di repo dan task melarang menambah dependensi.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { muatModulApp } = require('./muat-ts-app');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const tema = muatModulApp('theme/v2/index');
const gerakLib = muatModulApp('lib/kurangiGerak');
const galeri = muatModulApp('lib/galeriKomponen');
const pilihan = muatModulApp('lib/pilihan');

function berkasDi(dir) {
  const hasil = [];
  const jalan = (d) => {
    for (const e of fs.readdirSync(path.join(AKAR_APP, d), { withFileTypes: true })) {
      const rel = `${d}/${e.name}`;
      if (e.isDirectory()) jalan(rel);
      else if (/\.tsx?$/.test(e.name)) hasil.push(rel);
    }
  };
  jalan(dir);
  return hasil.sort();
}
const KOMPONEN = berkasDi('components/v2');
const SEMUA_BARU = [...KOMPONEN, ...berkasDi('components/galeri')];
const ast = (rel) => ts.createSourceFile(rel, baca(rel), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
function jelajah(n, fn) {
  fn(n);
  ts.forEachChild(n, (c) => jelajah(c, fn));
}

describe('Kontras token v2', () => {
  test('Rumus kontras cocok dengan nilai acuan WCAG', () => {
    assert.equal(tema.rasioKontras('#FFFFFF', '#000000'), 21);
    assert.equal(tema.rasioTertulis('#777777', '#FFFFFF'), 4.47); // abu-abu #777 gagal AA tipis
    assert.equal(tema.rasioTertulis('#1A1A1A', '#FFFFFF'), 17.4);
    assert.equal(tema.rasioKontras('#456A8C', '#FFFFFF'), tema.rasioKontras('#FFFFFF', '#456A8C'));
    for (const salah of ['transparent', 'rgba(0,0,0,0.5)', '#FFF', 'putih']) assert.throws(() => tema.luminansi(salah), salah);
  });

  test('Warna inti design.md v3.1 tidak diubah', () => {
    assert.deepEqual(
      [tema.palet.biruMuda, tema.palet.biruSedang, tema.palet.biruBaja, tema.palet.putih, tema.palet.tinta],
      ['#B4E1EB', '#95BDD7', '#78A4CB', '#FFFFFF', '#1A1A1A']
    );
    // Alasan teks putih tidak dipakai di atas biru brand (task LANJUT_029 §3).
    assert.ok(tema.rasioKontras('#FFFFFF', tema.palet.biruBaja) < 3);
    assert.ok(tema.rasioKontras('#FFFFFF', tema.palet.biruMuda) < 1.5);
  });

  test('Semua pasangan yang dipakai komponen lolos: teks 4,5:1, teks besar dan kontrol 3:1', () => {
    assert.deepEqual({ ...tema.AMBANG }, { teks: 4.5, teksBesar: 3, kontrol: 3 });
    assert.ok(tema.PASANGAN.length >= 20);
    for (const p of tema.PASANGAN) {
      const a = tema.warna[p.depan];
      const b = tema.warna[p.latar];
      assert.ok(tema.lolos(a, b, p.jenis), `${p.depan} ${a} di ${p.latar} ${b}: ${tema.rasioTertulis(a, b)} < ${tema.AMBANG[p.jenis]}`);
    }
  });

  test('Opsi mana pun yang dipilih Khalifa, semua pasangan tetap lolos', () => {
    for (const bt of tema.OPSI_BIRU_TUA) {
      for (const su of tema.OPSI_SUKSES) {
        for (const ga of tema.OPSI_GALAT) {
          const w = { ...tema.warna, aksen: bt.hex, fokus: bt.hex, sukses: su.hex, suksesLatar: su.latar, galat: ga.hex, galatLatar: ga.latar };
          for (const p of tema.PASANGAN) {
            assert.ok(tema.lolos(w[p.depan], w[p.latar], p.jenis), `${bt.kode}/${su.kode}/${ga.kode}: ${p.depan} di ${p.latar}`);
          }
        }
      }
    }
  });

  // LANJUT_030: keputusan Khalifa 20 Nov 2026 menggantikan "opsi pertama, MENUNGGU KEPUTUSAN" (029).
  test('Biru tua, sukses, dan galat memakai keputusan 20 Nov, ditulis di satu tempat', () => {
    assert.equal(tema.warna.aksen, '#3B5F80');
    assert.equal(tema.warna.fokus, '#3B5F80');
    assert.equal(tema.warna.sukses, '#276749');
    assert.equal(tema.warna.galat, '#A33A3A');
    for (const o of [tema.OPSI_BIRU_TUA, tema.OPSI_SUKSES, tema.OPSI_GALAT]) assert.ok(o.length >= 2 && o.length <= 3);
    const sumber = baca('theme/v2/warna.ts');
    assert.equal((sumber.match(/\/\/ MENUNGGU KEPUTUSAN/g) || []).length, 0);
    assert.equal((sumber.match(/\/\/ KEPUTUSAN 20 NOV, dapat diubah/g) || []).length, 3);
    // Satu tempat: nilai HEX keputusan hanya tertulis di daftar opsi warna.ts, tidak di komponen atau layar.
    const lain = ['components', 'app', 'lib', 'hooks'].flatMap(berkasDi).filter((f) => f !== 'theme/v2/warna.ts');
    for (const f of lain) assert.doesNotMatch(baca(f), /#3B5F80|#276749|#A33A3A/i, f);
    // Anti-pattern design.md: tidak ada merah/oranye terang. Galat redup: kanal merah ≤ 0xB0.
    for (const o of tema.OPSI_GALAT) assert.ok(parseInt(o.hex.slice(1, 3), 16) <= 0xb0, o.hex);
  });

  test('Setiap peran warna yang dipakai komponen v2 punya pasangan kontras atau tercatat dekoratif', () => {
    const terdaftar = new Set([...tema.PASANGAN.flatMap((p) => [p.depan, p.latar]), ...Object.keys(tema.WARNA_DEKORATIF)]);
    const peran = new Set(Object.keys(tema.warna));
    for (const rel of SEMUA_BARU) {
      jelajah(ast(rel), (n) => {
        let nama;
        if (ts.isPropertyAccessExpression(n) && n.expression.getText() === 'warna') nama = n.name.text;
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && peran.has(n.text)) nama = n.text;
        if (nama) assert.ok(terdaftar.has(nama), `${rel}: warna.${nama} tidak punya pasangan kontras`);
      });
    }
  });

  test('Warna dekoratif tidak pernah dipakai untuk teks', () => {
    const dekor = Object.keys(tema.WARNA_DEKORATIF).join('|');
    for (const rel of SEMUA_BARU) {
      assert.doesNotMatch(baca(rel), new RegExp(`color:\\s*warna\\.(${dekor})\\b`), rel);
      assert.doesNotMatch(baca(rel), new RegExp(`warna="(${dekor})"`), rel);
    }
  });

  test('Skrip kontras di repo mencetak tabel dan lolos', () => {
    const keluar = execFileSync(process.execPath, ['tools/kontras-token.js'], { cwd: path.join(AKAR_APP, 'server'), encoding: 'utf8' });
    assert.match(keluar, new RegExp(`${tema.PASANGAN.length} pasangan, 0 gagal`));
  });
});

describe('Target sentuh dan aksesibilitas bawaan', () => {
  test('Target sentuh minimal 44 dan dipasang terakhir di Sentuh, jadi tidak bisa ditimpa', () => {
    assert.ok(tema.ukuran.sentuhMin >= 44);
    const s = baca('components/v2/Sentuh.tsx');
    assert.match(s, /dasar: \{ minHeight: ukuran\.sentuhMin, minWidth: ukuran\.sentuhMin \}/);
    assert.match(s, /StyleSheet\.flatten\(\[gaya\?\.\([^)]*\), s\.dasar, fokus && s\.fokus\]\)/);
    // Hanya komponen: galeri memakai maxWidth untuk kolom halaman, bukan untuk kontrol.
    for (const rel of KOMPONEN) assert.doesNotMatch(baca(rel), /\bmax(Height|Width)\b/, `${rel}: batas maksimal bisa mengecilkan target sentuh`);
  });

  test('Pressable hanya di Sentuh; tidak ada elemen bawaan yang bisa ditekan di luar itu', () => {
    for (const rel of SEMUA_BARU) {
      const sumber = baca(rel);
      if (rel !== 'components/v2/Sentuh.tsx') assert.doesNotMatch(sumber, /\b(Pressable|Touchable\w*|TouchableOpacity)\b/, rel);
      jelajah(ast(rel), (n) => {
        if (!(ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n))) return;
        const tag = n.tagName.getText();
        const tekan = n.attributes.properties.some((a) => ts.isJsxAttribute(a) && /^on(Press|LongPress)$/.test(a.name.getText()));
        if (tekan) assert.ok(/^[A-Z]/.test(tag) && !['Text', 'View', 'Image'].includes(tag), `${rel}: <${tag} onPress> tanpa Sentuh`);
      });
    }
  });

  test('Sentuh mewajibkan peran dan label, dan meneruskannya ke pembaca layar', () => {
    const s = baca('components/v2/Sentuh.tsx');
    assert.match(s, /\n  peran: PeranSentuh;\n  label: string;\n/);
    assert.match(s, /accessibilityRole=\{peran\}/);
    assert.match(s, /accessibilityLabel=\{label\}/);
    assert.match(s, /accessibilityState=\{\{ disabled: mati, busy: sibuk, selected: terpilih, checked: dicentang, expanded: terbuka \}\}/);
    // react-native-web 0.21 tidak membaca accessibilityState; keadaan harus juga lewat aria-*.
    for (const a of ['aria-disabled={mati}', 'aria-busy={sibuk}', 'aria-selected={terpilih}', 'aria-checked={dicentang}', 'aria-expanded={terbuka}']) assert.ok(s.includes(a), a);
    assert.match(s, /onFocus=\{\(\) => setFokus\(true\)\}/);
  });

  test('Setiap pemakaian Sentuh memberi peran dan label', () => {
    let jumlah = 0;
    for (const rel of SEMUA_BARU) {
      jelajah(ast(rel), (n) => {
        if (!(ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) || n.tagName.getText() !== 'Sentuh') return;
        jumlah += 1;
        const nama = n.attributes.properties.filter(ts.isJsxAttribute).map((a) => a.name.getText());
        assert.ok(nama.includes('peran') && nama.includes('label'), `${rel}: <Sentuh> tanpa peran atau label`);
      });
    }
    assert.ok(jumlah >= 6, `hanya ${jumlah} Sentuh ditemukan`);
  });

  test('Skala font sistem dihormati dan status tidak hanya warna', () => {
    for (const rel of SEMUA_BARU) {
      jelajah(ast(rel), (n) => {
        if (ts.isJsxAttribute(n) || ts.isPropertyAssignment(n)) {
          assert.doesNotMatch(n.name.getText(), /^(allowFontScaling|maxFontSizeMultiplier|adjustsFontSizeToFit)$/, `${rel}: skala font dibatasi`);
        }
      });
    }
    assert.match(baca('components/v2/Teks.tsx'), /accessibilityRole=\{judul \? 'header' : undefined\}/);
    const ps = baca('components/v2/PesanStatus.tsx');
    assert.match(ps, /nama=\{galat \? 'waspada' : 'centang'\}/, 'galat dan sukses dibedakan bentuk ikon');
    const pil = baca('components/v2/Pilihan.tsx');
    assert.match(pil, /\{pilih \? <Ikon nama="centang"/, 'terpilih ditandai centang, bukan hanya warna');
    assert.match(pil, /teksStatusPilihan\(terpilih\.length, mode\)/, 'jumlah terpilih juga ditulis');
  });
});

describe('Tanpa warna atau jarak yang ditulis langsung di komponen baru', () => {
  const KUNCI = /^(padding|margin)\w*$|^(gap|rowGap|columnGap|width|height|minWidth|minHeight|maxWidth|maxHeight|top|left|right|bottom|borderRadius|border\w*Width|fontSize|lineHeight|letterSpacing|outlineWidth|outlineOffset|opacity)$/;
  const WARNA = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(.*)$/i;
  const NAMA_WARNA = new Set(['white', 'black', 'red', 'green', 'blue', 'gray', 'grey', 'orange', 'yellow', 'transparent']);

  test('Semua nilai gaya dari theme/v2', () => {
    const langgar = [];
    for (const rel of SEMUA_BARU) {
      const sf = ast(rel);
      const baris = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      jelajah(sf, (n) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && (WARNA.test(n.text) || NAMA_WARNA.has(n.text))) langgar.push(`${rel}:${baris(n)} warna "${n.text}"`);
        if (ts.isPropertyAssignment(n) && KUNCI.test(n.name.getText())) {
          const v = n.initializer;
          // 0 bukan nilai desain (mis. minWidth: 0 supaya teks di baris flex bisa terbungkus).
          const angka = (ts.isNumericLiteral(v) && v.text !== '0') || (ts.isPrefixUnaryExpression(v) && ts.isNumericLiteral(v.operand));
          const teks = ts.isStringLiteral(v) && v.text !== '100%';
          if (angka || teks) langgar.push(`${rel}:${baris(n)} ${n.name.getText()}: ${v.getText()}`);
        }
        if (ts.isJsxAttribute(n) && /^(ukuran|size|width|height)$/.test(n.name.getText()) && n.initializer && ts.isJsxExpression(n.initializer) && n.initializer.expression && ts.isNumericLiteral(n.initializer.expression)) {
          langgar.push(`${rel}:${baris(n)} ${n.name.getText()}={${n.initializer.expression.text}}`);
        }
        if (ts.isPropertyAssignment(n) && n.name.getText() === 'fontFamily' && ts.isStringLiteral(n.initializer)) langgar.push(`${rel}:${baris(n)} fontFamily langsung`);
      });
      assert.doesNotMatch(baca(rel), /theme\/tokens/, `${rel} memakai token v1`);
    }
    assert.deepEqual(langgar, []);
  });

  test('Jarak kelipatan 8, radius dan ukuran sentuh dari token', () => {
    for (const [k, v] of Object.entries(tema.ruang)) assert.equal(v % 8, 0, `ruang.${k} = ${v}`);
    for (const [k, v] of Object.entries(tema.tipografi)) {
      assert.ok(v.fontSize >= 14 && v.lineHeight >= v.fontSize * 1.2, `tipografi.${k}`);
      // LANJUT_030: hanya huruf yang benar-benar dimuat app/_layout.tsx (Poppins, Source Sans 3).
      assert.ok(typeof v.fontFamily === 'string' && /^(Poppins|SourceSans3)_/.test(v.fontFamily), `tipografi.${k}: huruf yang belum dimuat`);
    }
    // Judul dan tombol Poppins, isi Source Sans 3 (keputusan 20 Nov).
    for (const k of ['h1', 'h2', 'judulKecil', 'tombol']) assert.match(tema.tipografi[k].fontFamily, /^Poppins_/, k);
    for (const k of ['badan', 'badanKecil', 'keterangan']) assert.match(tema.tipografi[k].fontFamily, /^SourceSans3_/, k);
  });
});

describe('Galeri komponen khusus dev, bawaan mati', () => {
  function aturanBlokir(env) {
    const e = { ...process.env };
    delete e.EXPO_PUBLIC_GALERI_KOMPONEN;
    delete e.NODE_ENV;
    Object.assign(e, env);
    const skrip = "const c=require('./metro.config.js');console.log(JSON.stringify([].concat(c.resolver.blockList||[]).map(r=>[r.source,r.flags])))";
    const baris = execFileSync(process.execPath, ['-e', skrip], { cwd: AKAR_APP, env: e, encoding: 'utf8', timeout: 60000 }).trim().split('\n').pop();
    return JSON.parse(baris).map(([s, f]) => new RegExp(s, f));
  }
  const terblokir = (aturan, berkas) => aturan.some((r) => r.test(berkas));
  const RUTE = ['C:\\repo\\app\\galeri-komponen.tsx', '/repo/app/galeri-komponen.tsx'];

  function muatKonfigApp(envTiruan) {
    const { outputText } = ts.transpileModule(baca('app.config.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
    const modul = { exports: {} };
    vm.runInNewContext(outputText, { exports: modul.exports, module: modul, require: () => ({}), process: { env: { ...envTiruan }, argv: ['node', 'expo', 'start'] }, console });
    return (modul.exports.default ?? modul.exports).extra;
  }

  test('Terdaftar hanya bila __DEV__ DAN saklar menyala', () => {
    assert.equal(galeri.galeriKomponenTerdaftar(true, { galeriKomponen: true }), true);
    for (const [dev, extra] of [
      [false, { galeriKomponen: true }],
      [undefined, { galeriKomponen: true }],
      ['true', { galeriKomponen: true }],
      [1, { galeriKomponen: true }],
      [true, {}],
      [true, null],
      [true, undefined],
      [true, { galeriKomponen: '1' }],
      [true, { galeriKomponen: 1 }],
      [true, { galeriKomponen: false }],
    ]) assert.equal(galeri.galeriKomponenTerdaftar(dev, extra), false, JSON.stringify([dev, extra]));
  });

  test('Saklar di app.config: bawaan mati, tidak pernah menyala di profil EAS rilis', () => {
    assert.equal(muatKonfigApp({}).galeriKomponen, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_GALERI_KOMPONEN: 'true' }).galeriKomponen, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_GALERI_KOMPONEN: '1' }).galeriKomponen, true);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_GALERI_KOMPONEN: '1', EAS_BUILD_PROFILE: 'development' }).galeriKomponen, true);
    for (const profil of ['preview', 'production', 'apk-sekolah', 'pilot']) {
      assert.equal(muatKonfigApp({ EXPO_PUBLIC_GALERI_KOMPONEN: '1', EAS_BUILD_PROFILE: profil, EXPO_PUBLIC_API_URL: 'https://contoh.invalid/api/v1' }).galeriKomponen, false, profil);
    }
    for (const b of ['eas.json', 'Dockerfile', 'docker-compose.yml', 'docker-compose.dev.yml', 'server/.env.example', 'server/.env.production.example', 'server/.env.railway.contoh']) {
      assert.ok(!baca(b).includes('GALERI'), b);
    }
  });

  test('Rute keluar dari bundel saat saklar mati atau bundel produksi; masuk hanya di dev dengan saklar', () => {
    for (const env of [{}, { EXPO_PUBLIC_GALERI_KOMPONEN: '0' }, { EXPO_PUBLIC_GALERI_KOMPONEN: 'true' }, { EXPO_PUBLIC_GALERI_KOMPONEN: '1', NODE_ENV: 'production' }]) {
      const aturan = aturanBlokir(env);
      for (const r of RUTE) assert.ok(terblokir(aturan, r), `${JSON.stringify(env)}: ${r}`);
      assert.ok(!terblokir(aturan, '/repo/app/kebijakan-privasi.tsx'));
      assert.ok(!terblokir(aturan, '/repo/app/(app)/linimasa.tsx'));
    }
    for (const env of [{ EXPO_PUBLIC_GALERI_KOMPONEN: '1' }, { EXPO_PUBLIC_GALERI_KOMPONEN: '1', NODE_ENV: 'development' }]) {
      const aturan = aturanBlokir(env);
      for (const r of RUTE) assert.ok(!terblokir(aturan, r), `${JSON.stringify(env)}: ${r}`);
    }
  });

  test('Berkas rute: __DEV__ di depan supaya galeri terbuang dari bundel rilis, dan dialihkan bila tidak terdaftar', () => {
    const r = baca('app/galeri-komponen.tsx');
    assert.match(r, /__DEV__ && galeriKomponenTerdaftar\(__DEV__, Constants\.expoConfig\?\.extra\)\n\s+\? require\('\.\.\/components\/galeri\/GaleriKomponen'\)\.GaleriKomponen\n\s+: null;/);
    assert.match(r, /if \(!Galeri\) return <Redirect href="\/" \/>;/);
    assert.doesNotMatch(r, /^import .*GaleriKomponen/m, 'impor statis akan memasukkan galeri ke bundel rilis');
  });

  test('Galeri tidak dirujuk dari layar, navigasi, atau penyedia mana pun', () => {
    // components/v2 dan komponen galeri sendiri dikecualikan: komentar di sana menyebut galeri.
    const lain = ['app', 'components', 'lib', 'hooks', 'providers', 'api']
      .flatMap(berkasDi)
      .filter((f) => !f.startsWith('components/galeri/') && !f.startsWith('components/v2/') && f !== 'app/galeri-komponen.tsx' && f !== 'lib/galeriKomponen.ts');
    for (const f of lain) assert.doesNotMatch(baca(f), /galeri-komponen|GaleriKomponen|galeriKomponen/, f);
  });

  test('Teks galeri bertanda contoh dan pita DEV', () => {
    const g = baca('components/galeri/GaleriKomponen.tsx');
    assert.match(g, /DEV · Galeri komponen v2/);
    const sf = ast('components/galeri/GaleriKomponen.tsx');
    let jumlah = 0;
    jelajah(sf, (n) => {
      if (!ts.isJsxAttribute(n) || !/^(label|judul|ringkasan|keterangan|teks|pesan|galat|isi|belumTahu)$/.test(n.name.getText())) return;
      if (n.parent.parent.tagName?.getText() === 'Bagian') return; // judul bagian = nama komponen
      const v = n.initializer;
      if (v && ts.isStringLiteral(v)) {
        jumlah += 1;
        assert.match(v.text, /contoh/i, `teks galeri tanpa tanda contoh: "${v.text}"`);
      }
    });
    jelajah(sf, (n) => {
      if (ts.isJsxText(n) && /[A-Za-z]/.test(n.text)) assert.match(n.text, /contoh|DEV|Bukan layar produksi|Kurangi gerakan/i, n.text.trim());
    });
    assert.ok(jumlah >= 30, `hanya ${jumlah} teks contoh`);
    assert.doesNotMatch(g, /from '\.\.\/\.\.\/(api|providers|hooks\/use(?!KurangiGerak))/, 'galeri tidak memakai data akun atau jaringan');
  });
});

describe('Kurangi gerakan', () => {
  function sumberTiruan(awal) {
    const s = { pendengar: null, dilepas: 0 };
    s.isReduceMotionEnabled = () => (awal instanceof Error ? Promise.reject(awal) : Promise.resolve(awal));
    s.addEventListener = (nama, fn) => {
      assert.equal(nama, 'reduceMotionChanged');
      s.pendengar = fn;
      return { remove: () => (s.dilepas += 1) };
    };
    return s;
  }
  const tunggu = () => new Promise((r) => setImmediate(r));

  test('Setelan awal dibaca, perubahan diikuti, dan berhenti melepas langganan', async () => {
    const s = sumberTiruan(true);
    const nilai = [];
    const berhenti = gerakLib.pantauKurangiGerak(s, (v) => nilai.push(v));
    await tunggu();
    assert.deepEqual(nilai, [true]);
    s.pendengar(false);
    s.pendengar(true);
    assert.deepEqual(nilai, [true, false, true]);
    berhenti();
    assert.equal(s.dilepas, 1);
    s.pendengar(false);
    assert.deepEqual(nilai, [true, false, true], 'tidak ada kabar sesudah berhenti');
  });

  test('Jawaban terlambat sesudah berhenti diabaikan; galat dianggap mati; sumber tanpa API aman', async () => {
    const nilai = [];
    gerakLib.pantauKurangiGerak(sumberTiruan(true), (v) => nilai.push(v))();
    await tunggu();
    assert.deepEqual(nilai, []);
    gerakLib.pantauKurangiGerak(sumberTiruan(new Error('tidak didukung')), (v) => nilai.push(v));
    await tunggu();
    assert.deepEqual(nilai, [false]);
    assert.doesNotThrow(() => gerakLib.pantauKurangiGerak({}, () => {})());
  });

  test('Gerak non-esensial mati bila diminta sistem; gerak esensial tetap', () => {
    assert.equal(gerakLib.durasiGerak(200, true), 0);
    assert.equal(gerakLib.durasiGerak(200, false), 200);
    assert.equal(gerakLib.durasiGerak(200, true, true), 200);
    assert.equal(gerakLib.gerakBoleh(true), false);
    assert.equal(gerakLib.gerakBoleh(false), true);
    assert.equal(gerakLib.gerakBoleh(true, true), true);
  });

  test('Hook memakai AccessibilityInfo; setiap animasi di komponen v2 tunduk pada setelan', () => {
    const h = baca('hooks/useKurangiGerak.ts');
    assert.match(h, /useEffect\(\(\) => pantauKurangiGerak\(AccessibilityInfo, setAktif\), \[\]\)/);
    for (const rel of SEMUA_BARU) {
      const s = baca(rel);
      if (/Animated\.(timing|loop|spring|decay)|LayoutAnimation/.test(s)) {
        assert.match(s, /useKurangiGerak\(\)/, `${rel}: animasi tanpa useKurangiGerak`);
        assert.match(s, /if \(!gerakBoleh\(kurangiGerak\)\)/, `${rel}: animasi tidak berhenti saat Kurangi gerakan`);
      }
    }
  });
});

describe('Pilihan: satu, banyak, dan "belum tahu"', () => {
  const { ubahPilihan, BELUM_TAHU, teksStatusPilihan } = pilihan;
  test('Mode satu mengganti; mode banyak menambah dan melepas', () => {
    assert.deepEqual(ubahPilihan(['a'], 'b', 'satu'), ['b']);
    assert.deepEqual(ubahPilihan(['a'], 'b', 'banyak'), ['a', 'b']);
    assert.deepEqual(ubahPilihan(['a', 'b'], 'a', 'banyak'), ['b']);
  });
  test('"Belum tahu" berdiri sendiri', () => {
    assert.deepEqual(ubahPilihan(['a', 'b'], BELUM_TAHU, 'banyak'), [BELUM_TAHU]);
    assert.deepEqual(ubahPilihan([BELUM_TAHU], 'a', 'banyak'), ['a']);
    assert.deepEqual(ubahPilihan([BELUM_TAHU], BELUM_TAHU, 'banyak'), []);
    assert.deepEqual(ubahPilihan(['a'], BELUM_TAHU, 'satu'), [BELUM_TAHU]);
  });
  test('Status tertulis', () => {
    assert.equal(teksStatusPilihan(0, 'banyak'), 'Belum ada yang dipilih');
    assert.equal(teksStatusPilihan(2, 'banyak'), '2 dipilih');
    assert.equal(teksStatusPilihan(1, 'satu'), '1 dipilih');
  });
});

describe('Layar yang ada tidak berubah', () => {
  test('Tidak ada layar, tata letak, penyedia, atau komponen v1 yang memakai tema atau komponen v2', () => {
    const lama = ['app', 'components/screens', 'components/layout', 'components/ui', 'providers', 'hooks', 'lib', 'api']
      .flatMap(berkasDi)
      .filter((f) => !['app/galeri-komponen.tsx', 'hooks/useKurangiGerak.ts', 'lib/kurangiGerak.ts', 'lib/galeriKomponen.ts', 'lib/pilihan.ts', 'lib/alurMasukV2.ts'].includes(f))
      // LANJUT_030: layar alur masuk v2 (di balik saklar) memang dibangun dari komponen v2.
      .filter((f) => !f.startsWith('components/screens/v2/'));
    for (const f of lama) assert.doesNotMatch(baca(f), /theme\/v2|components\/v2|\/v2'|useKurangiGerak/, f);
  });

  test('Alat audit UI membaca layar v1 tanpa galat', () => {
    const { jalankan } = require('../tools/audit-ui');
    const hasil = jalankan();
    const linimasa = hasil.find((r) => r.berkas === 'components/screens/LinimasaScreen.tsx');
    assert.ok(linimasa && linimasa.kontrol > 0);
    assert.ok(hasil.every((r) => r.penekanTanpaRole.length === 0), 'semua Pressable v1 punya role (temuan audit)');
  });
});
