// Audit UI statis (LANJUT_029): membaca berkas TSX layar dengan TypeScript milik app, lalu
// menghitung per berkas kata teks yang ditulis di kode, kontrol interaktif, warna/jarak yang
// ditulis langsung versus lewat token, atribut aksesibilitas, dan target sentuh yang ukurannya
// tertulis di bawah 44. Hanya membaca; tidak ada berkas yang diubah.
//
//   node tools/audit-ui.js            → tabel ringkas
//   node tools/audit-ui.js --json     → semua angka dan nomor baris (JSON)
//
// Batasan (ditulis juga di docs/audit-ui-v1.md): teks dari lib/*.ts, server, atau konten DB
// tidak terhitung (jumlah kata = batas bawah); elemen dalam .map() dihitung sekali; ukuran yang
// berasal dari konstanta atau hitungan tidak bisa dinilai ("tidak pasti").

const fs = require('node:fs');
const path = require('node:path');

const AKAR_APP = path.resolve(__dirname, '..', '..');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const FOLDER = ['app', 'components/screens', 'components/layout', 'components/ui'];
const MIN_SENTUH = 44;

// Atribut yang nilainya bukan teks tampilan.
const BUKAN_TEKS = new Set([
  'style', 'contentContainerStyle', 'role', 'testID', 'nativeID', 'id', 'key', 'href', 'nama', 'ikon', 'warna',
  'varian', 'ukuran', 'mode', 'type', 'source', 'resizeMode', 'pointerEvents', 'importantForAccessibility',
  'keyboardType', 'autoComplete', 'textContentType', 'autoCapitalize', 'returnKeyType', 'inputMode',
  'enterKeyHint', 'autoCorrect', 'tujuan', 'numberOfLines', 'accessibilityLabel', 'accessibilityHint',
  'accessibilityRole', 'accessibilityLanguage', 'barStyle', 'behavior', 'color', 'placeholderTextColor',
  'selectionColor', 'name', 'rel', 'target', 'lang', 'charSet', 'content', 'httpEquiv',
  // Atribut SVG (components/ui/Ikon.tsx).
  'd', 'viewBox', 'fill', 'stroke', 'strokeWidth', 'strokeLinecap', 'strokeLinejoin', 'points', 'transform',
  'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'x2', 'y1', 'y2', 'width', 'height', 'fillRule', 'clipRule',
]);
const INTERAKTIF = new Set(['Pressable', 'TouchableOpacity', 'TouchableHighlight', 'TextInput', 'Switch', 'Link', 'Tombol', 'KartuPintu', 'TombolUtama', 'TombolGoogle']);
const PENEKAN_MENTAH = new Set(['Pressable', 'TouchableOpacity', 'TouchableHighlight']);
const AKSI = new Set(['onPress', 'onLongPress', 'onChangeText', 'onValueChange']);
const SPASI = /^(padding|margin)(Top|Bottom|Left|Right|Horizontal|Vertical|Start|End)?$|^(gap|rowGap|columnGap)$/;
const WARNA = /^(#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})|(rgb|hsl)a?\(.*\))$/i;
const WARNA_NAMA = new Set(['white', 'black', 'red', 'green', 'blue', 'gray', 'grey', 'orange', 'yellow']);

function daftarBerkas() {
  const hasil = [];
  const jalan = (dir) => {
    for (const e of fs.readdirSync(path.join(AKAR_APP, dir), { withFileTypes: true })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) jalan(rel);
      else if (/\.tsx$/.test(e.name)) hasil.push(rel);
    }
  };
  FOLDER.forEach(jalan);
  return hasil.sort();
}

const hitungKata = (s) => s.split(/\s+/).filter((w) => /[A-Za-zÀ-ÿ0-9]/.test(w)).length;

function teksLiteral(n) {
  if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) return n.text;
  if (ts.isTemplateExpression(n)) return [n.head.text, ...n.templateSpans.map((s) => s.literal.text)].join(' ');
  if (ts.isConditionalExpression(n)) return [teksLiteral(n.whenTrue), teksLiteral(n.whenFalse)].filter(Boolean).join(' ');
  if (ts.isParenthesizedExpression(n)) return teksLiteral(n.expression);
  return '';
}

function namaTag(n) {
  const t = n.tagName;
  return ts.isIdentifier(t) ? t.text : t.getText();
}

function atribut(el) {
  const peta = new Map();
  for (const a of el.attributes.properties) if (ts.isJsxAttribute(a)) peta.set(a.name.getText(), a);
  return peta;
}

function angka(n) {
  if (!n) return undefined;
  if (ts.isNumericLiteral(n)) return Number(n.text);
  if (ts.isPrefixUnaryExpression(n) && n.operator === ts.SyntaxKind.MinusToken && ts.isNumericLiteral(n.operand)) return -Number(n.operand.text);
  return undefined;
}

function periksa(rel) {
  const teks = fs.readFileSync(path.join(AKAR_APP, rel), 'utf8');
  const sf = ts.createSourceFile(rel, teks, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
  const baris = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
  const r = {
    berkas: rel, kata: 0, kontrol: 0, kontrolBaris: [], warnaLangsung: [], spasiLangsung: [], spasiToken: 0,
    hurufLangsung: [], a11y: { role: 0, label: 0, state: 0 }, penekanTanpaRole: [], sentuhKecil: [], sentuhTidakPasti: [],
    komponenLokal: [], animasi: [],
  };

  // Lembar gaya: nama variabel → kunci → { height, minHeight, width, minWidth }.
  const lembar = new Map();
  const kunjungiGaya = (n) => {
    if (ts.isVariableDeclaration(n) && n.initializer && ts.isCallExpression(n.initializer) && /StyleSheet\.create$/.test(n.initializer.expression.getText())) {
      const obj = n.initializer.arguments[0];
      const peta = new Map();
      if (obj && ts.isObjectLiteralExpression(obj)) {
        for (const p of obj.properties) {
          if (!ts.isPropertyAssignment(p) || !ts.isObjectLiteralExpression(p.initializer)) continue;
          const ukuran = {};
          for (const q of p.initializer.properties) {
            if (!ts.isPropertyAssignment(q)) continue;
            const k = q.name.getText();
            if (['height', 'minHeight', 'width', 'minWidth'].includes(k)) ukuran[k] = angka(q.initializer) ?? 'ekspresi';
          }
          peta.set(p.name.getText(), ukuran);
        }
      }
      lembar.set(n.name.getText(), peta);
    }
    ts.forEachChild(n, kunjungiGaya);
  };
  kunjungiGaya(sf);

  const nilaiUkuran = (styleTeks) => {
    const ditemukan = [];
    for (const [nama, peta] of lembar) {
      const pola = new RegExp(`\\b${nama}\\.([A-Za-z0-9_]+)`, 'g');
      let m;
      while ((m = pola.exec(styleTeks))) if (peta.has(m[1])) ditemukan.push(peta.get(m[1]));
    }
    return ditemukan;
  };

  const kunjungi = (n) => {
    if (ts.isJsxText(n)) r.kata += hitungKata(n.text);
    if (ts.isJsxExpression(n) && n.expression && (ts.isJsxElement(n.parent) || ts.isJsxFragment(n.parent))) {
      r.kata += hitungKata(teksLiteral(n.expression));
    }
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
      const tag = namaTag(n);
      const at = atribut(n);
      for (const [nama, a] of at) {
        if (BUKAN_TEKS.has(nama) || nama.startsWith('aria-') || nama.startsWith('on') || !a.initializer) continue;
        const ini = ts.isJsxExpression(a.initializer) ? a.initializer.expression : a.initializer;
        if (ini) r.kata += hitungKata(teksLiteral(ini));
      }
      const interaktif = INTERAKTIF.has(tag) || [...at.keys()].some((k) => AKSI.has(k));
      if (interaktif) { r.kontrol += 1; r.kontrolBaris.push(baris(n)); }
      if (at.has('accessibilityRole') || at.has('role')) r.a11y.role += 1;
      if (at.has('accessibilityLabel') || at.has('aria-label')) r.a11y.label += 1;
      if (at.has('accessibilityState') || [...at.keys()].some((k) => /^aria-(checked|selected|disabled|expanded|current|busy)$/.test(k))) r.a11y.state += 1;
      if (PENEKAN_MENTAH.has(tag)) {
        if (!at.has('accessibilityRole') && !at.has('role')) r.penekanTanpaRole.push(baris(n));
        const gaya = at.get('style');
        const ukuran = gaya ? nilaiUkuran(gaya.getText()) : [];
        const tinggi = ukuran.flatMap((u) => [u.minHeight, u.height]).filter((v) => typeof v === 'number');
        const lebar = ukuran.flatMap((u) => [u.minWidth, u.width]).filter((v) => typeof v === 'number');
        const kecil = (tinggi.length && Math.max(...tinggi) < MIN_SENTUH) || (lebar.length && Math.max(...lebar) < MIN_SENTUH);
        if (kecil && !at.has('hitSlop')) r.sentuhKecil.push(`${baris(n)} (${tag}: tinggi ${tinggi.join('/') || '?'}, lebar ${lebar.join('/') || '?'})`);
        else if (!tinggi.length && !at.has('hitSlop')) r.sentuhTidakPasti.push(baris(n));
      }
      if (tag === 'Tombol' && at.has('kecil')) r.sentuhKecil.push(`${baris(n)} (Tombol kecil: minHeight 36)`);
    }
    if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) {
      if (WARNA.test(n.text) || WARNA_NAMA.has(n.text)) r.warnaLangsung.push(`${baris(n)} ${n.text}`);
    }
    if (ts.isPropertyAssignment(n)) {
      const k = n.name.getText();
      if (SPASI.test(k)) {
        const v = angka(n.initializer);
        if (v !== undefined && v !== 0) r.spasiLangsung.push(`${baris(n)} ${k}: ${v}`);
        else if (/\bspacing\./.test(n.initializer.getText())) r.spasiToken += 1;
      }
      if ((k === 'fontSize' || k === 'lineHeight') && angka(n.initializer) !== undefined) r.hurufLangsung.push(`${baris(n)} ${k}: ${angka(n.initializer)}`);
    }
    if (ts.isFunctionDeclaration(n) && n.name && /^[A-Z]/.test(n.name.text)) r.komponenLokal.push(n.name.text);
    if (ts.isPropertyAccessExpression(n) && /^Animated\.(timing|spring|decay|loop|sequence|parallel)$/.test(n.getText())) r.animasi.push(baris(n));
    ts.forEachChild(n, kunjungi);
  };
  kunjungi(sf);
  return r;
}

function jalankan() {
  return daftarBerkas().map(periksa);
}

if (require.main === module) {
  const hasil = jalankan();
  if (process.argv.includes('--json')) {
    console.log(JSON.stringify(hasil, null, 1));
  } else {
    console.log('berkas | kata | kontrol | sentuh<44 | tanpa role | warna langsung | spasi langsung/token | huruf langsung');
    for (const r of hasil) {
      console.log(`${r.berkas} | ${r.kata} | ${r.kontrol} | ${r.sentuhKecil.length} | ${r.penekanTanpaRole.length} | ${r.warnaLangsung.length} | ${r.spasiLangsung.length}/${r.spasiToken} | ${r.hurufLangsung.length}`);
    }
  }
}

module.exports = { jalankan, periksa, MIN_SENTUH };
