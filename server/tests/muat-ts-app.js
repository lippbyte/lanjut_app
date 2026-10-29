// Memuat modul TypeScript murni dari LANJUT_App (mis. lib/beranda.ts) supaya
// tes server bisa MEMBANDINGKAN perilaku app dengan cerminnya di
// src/util/*.js (LANJUT_070). Ditranspilasi dengan TypeScript milik app
// (devDependency LANJUT_App) — tidak ada paket baru di server.
//
// Hanya untuk modul tanpa React Native: impor relatif ikut dimuat dengan cara
// yang sama, `import type` sudah dibuang transpiler, impor paket ditolak.

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const AKAR_APP = path.resolve(__dirname, '..', '..');
const cache = new Map();
let ts;

function typescriptApp() {
  if (!ts) {
    try {
      ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));
    } catch {
      throw new Error('TypeScript milik app tidak ditemukan. Jalankan "npm install" di LANJUT_App.');
    }
  }
  return ts;
}

/** `relatif` dari akar LANJUT_App, mis. 'lib/beranda' atau 'lib/beranda.ts'. */
function muatModulApp(relatif) {
  const berkas = path.resolve(AKAR_APP, relatif.endsWith('.ts') ? relatif : `${relatif}.ts`);
  if (cache.has(berkas)) return cache.get(berkas).exports;

  const t = typescriptApp();
  const { outputText } = t.transpileModule(fs.readFileSync(berkas, 'utf8'), {
    compilerOptions: { module: t.ModuleKind.CommonJS, target: t.ScriptTarget.ES2022 },
    fileName: berkas,
  });

  const modul = { exports: {} };
  cache.set(berkas, modul);
  const requireLokal = (nama) => {
    if (!nama.startsWith('.')) {
      throw new Error(`muatModulApp: impor paket "${nama}" dari ${relatif} tidak didukung`);
    }
    return muatModulApp(path.relative(AKAR_APP, path.resolve(path.dirname(berkas), nama)));
  };
  const fungsi = vm.runInThisContext(`(function (exports, require, module) {${outputText}\n})`, {
    filename: berkas,
  });
  fungsi(modul.exports, requireLokal, modul);
  return modul.exports;
}

module.exports = { muatModulApp };
