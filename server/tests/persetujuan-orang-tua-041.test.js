// LANJUT_041: gerbang pernyataan usia (>= 18 tahun) dan konfirmasi orang tua/wali di alur daftar v2
// (opsi a, hanya di klien, di balik EXPO_PUBLIC_ALUR_MASUK_V2 yang mati bawaan).
// Tidak mengubah server, API, skema, migrasi, kontrak pendaftaran, lib/kebijakan-privasi.json,
// maupun kalimat persetujuan v1 yang disetujui.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { muatModulApp } = require('./muat-ts-app');
const { daftarSkema, daftarKirimKodeSkema } = require('../src/modul/auth/auth.skema');
const gerbang = require('../tools/periksa-gerbang-rilis');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const fitur = muatModulApp('lib/fiturApp');
const alur = muatModulApp('lib/alurMasukV2');
const tema = muatModulApp('theme/v2/index');

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

const ISIAN_DASAR = {
  usia: 'ya',
  orangTuaSetuju: false,
  namaPengguna: 'siswa.uji041',
  kataSandi: 'sandi-uji-041!',
  email: '',
  sudahBaca: true,
  kelas: '10',
  jenis: 'SMA',
  prodi: 'belum',
};

// ---------------------------------------------------------------------------------------------
describe('Isolasi saklar ALUR_MASUK_V2 mati: Daftar v1 tidak berubah (sabotase #9 & #11)', () => {
  test('Saklar mati bawaan di app.config & eas.json; app/(auth)/daftar.tsx memakai RegisterScreen v1 saat mati', () => {
    assert.equal(fitur.alurMasukV2Aktif(undefined), false);
    assert.equal(fitur.alurMasukV2Aktif({}), false);
    assert.equal(muatKonfigApp({}).alurMasukV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_ALUR_MASUK_V2: '0' }).alurMasukV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_ALUR_MASUK_V2: '1' }).alurMasukV2, true);

    const eas = JSON.parse(baca('eas.json')).build;
    for (const [nama, p] of Object.entries(eas)) {
      assert.notEqual(p.env?.EXPO_PUBLIC_ALUR_MASUK_V2, '1', `eas.json:${nama} tidak boleh menyalakan ALUR_MASUK_V2`);
    }

    const daftarRute = baca('app/(auth)/daftar.tsx');
    assert.match(daftarRute, /function DaftarRoute\(\) \{\n  return <RegisterScreen \/>;\n\}/);
    assert.match(daftarRute, /export default alurMasukV2Aktif\(Constants\.expoConfig\?\.extra\) \? DaftarV2 : DaftarRoute;/);

    // RegisterScreen v1 dan LoginScreen v1 tidak punya layar usia / gerbang 041
    const regV1 = baca('components/screens/auth/RegisterScreen.tsx');
    assert.doesNotMatch(regV1, /Umurmu sudah 18|orangTuaSetuju|alurMasukV2|DaftarV2/);
    assert.doesNotMatch(baca('components/screens/auth/LoginScreen.tsx'), /Umurmu sudah 18|orangTuaSetuju|alurMasukV2/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Alur gerbang usia & konfirmasi orang tua/wali: "Ya" vs "Belum" dan anti-bypass (sabotase #1, #2, #3, #4)', () => {
  test('"Ya": lanjut langsung ke langkah akun tanpa layar tambahan; "Belum": wajib melewati layar orang_tua sebelum akun', () => {
    for (const kelas of [null, '7', '9', '10', '12']) {
      const alurYa = alur.langkahDaftar(kelas, 'ya');
      assert.equal(alurYa[0], 'usia');
      assert.equal(alurYa[1], 'akun');
      assert.ok(!alurYa.includes('orang_tua'), `alur Ya tidak boleh menampilkan layar orang_tua (${kelas})`);

      const alurBelum = alur.langkahDaftar(kelas, 'belum');
      assert.equal(alurBelum[0], 'usia');
      assert.equal(alurBelum[1], 'orang_tua');
      assert.equal(alurBelum[2], 'akun');
      assert.ok(alurBelum.indexOf('orang_tua') < alurBelum.indexOf('persetujuan'));
      assert.ok(alurBelum.indexOf('orang_tua') < alurBelum.indexOf('siap'));
    }
  });

  test('Tidak ada centang otomatis; tombol Lanjut nonaktif sampai pilihan/kotak dicentang secara eksplisit', () => {
    const src = baca('components/screens/v2/DaftarV2.tsx');
    // Bawaan selalu usia: null dan orangTuaSetuju: false (tidak pernah auto-centang)
    assert.match(src, /usia:\s*null,/);
    assert.match(src, /orangTuaSetuju:\s*false,/);
    // Mengubah pilihan usia selalu mengosongkan orangTuaSetuju menjadi false
    assert.match(src, /onUbah=\{\(\[u\]\) => ubah\(\{ usia: u as StatusUsia, orangTuaSetuju: false \}\)\}/);
    // Tombol Lanjut benar-benar nonaktif saat usia kosong atau orang_tua belum dicentang
    assert.match(
      src,
      /const tombolLanjutNonaktif =\s*\(langkah === 'usia' && !isian\.usia\) \|\| \(langkah === 'orang_tua' && !isian\.orangTuaSetuju\);/
    );
    assert.match(src, /<Tombol label=\{TEKS_DAFTAR\.lanjut\} penuh nonaktif=\{tombolLanjutNonaktif\} onPress=\{lanjut\} \/>/);
    // Kotak persetujuan memakai komponen Centang (accessibilityRole="checkbox", accessibilityState.checked)
    assert.match(
      src,
      /case 'orang_tua':[\s\S]*?<Centang[\s\S]*?label=\{t\.orangTua\.setuju\}[\s\S]*?dicentang=\{isian\.orangTuaSetuju\}/
    );
    // Ada tombol kembali ke Masuk di layar usia dan orang_tua
    assert.match(src, /label=\{TEKS_DAFTAR\.orangTua\.kembaliMasuk\}[\s\S]*?router\.replace\('\/masuk'\)/);
  });

  test('Tidak ada jalan melewati gerbang (indeks langsung, tombol kembali, muat ulang, periksaLangkah, bentukKirimanDaftar)', () => {
    // Belum memilih usia -> tidak bisa melompat ke langkah mana pun (selalu dijepit ke 0 = usia)
    const tanpaUsia = { ...ISIAN_DASAR, usia: null, orangTuaSetuju: false };
    assert.equal(alur.gerbangUsiaTerpenuhi(tanpaUsia), false);
    for (const target of [0, 1, 2, 3, 5, 8, 99]) {
      assert.equal(alur.indeksLangkahAman(target, tanpaUsia), 0, `tanpa usia loncat ke ${target}`);
    }
    assert.ok(alur.periksaLangkah('usia', tanpaUsia).usia);
    assert.ok(alur.periksaLangkah('siap', tanpaUsia).usia);
    assert.equal(alur.bentukKirimanDaftar(tanpaUsia, 1), null);

    // Memilih "Belum" tanpa mencentang persetujuan orang tua -> hanya boleh di 0 (usia) atau 1 (orang_tua), TIDAK PERNAH >= 2
    const belumTanpaCentang = { ...ISIAN_DASAR, usia: 'belum', orangTuaSetuju: false };
    assert.equal(alur.gerbangUsiaTerpenuhi(belumTanpaCentang), false);
    assert.equal(alur.indeksLangkahAman(0, belumTanpaCentang), 0);
    for (const target of [1, 2, 3, 4, 7, 9, 99]) {
      assert.equal(alur.indeksLangkahAman(target, belumTanpaCentang), 1, `belum tanpa centang loncat ke ${target}`);
    }
    assert.ok(alur.periksaLangkah('orang_tua', belumTanpaCentang).orang_tua);
    assert.ok(alur.periksaLangkah('siap', belumTanpaCentang).orang_tua);
    assert.equal(alur.bentukKirimanDaftar(belumTanpaCentang, 1), null);

    // Memilih "Belum" DAN mencentang persetujuan orang tua -> boleh lanjut penuh sampai siap
    const belumSetuju = { ...ISIAN_DASAR, usia: 'belum', orangTuaSetuju: true };
    assert.equal(alur.gerbangUsiaTerpenuhi(belumSetuju), true);
    const maks = alur.langkahDaftar(belumSetuju.kelas, belumSetuju.usia).length - 1;
    assert.equal(alur.indeksLangkahAman(maks, belumSetuju), maks);
    assert.deepEqual(alur.periksaLangkah('orang_tua', belumSetuju), {});
    assert.deepEqual(alur.periksaLangkah('siap', belumSetuju), {});
    assert.ok(alur.bentukKirimanDaftar(belumSetuju, 1) !== null);

    // DaftarV2 memakai indeksLangkahAman untuk menentukan langkah aktif & setiap perpindahan
    const src = baca('components/screens/v2/DaftarV2.tsx');
    assert.match(src, /const indeksAktif = indeksLangkahAman\(indeks, isian\);/);
    assert.match(src, /const langkah = daftarLangkah\[indeksAktif\];/);
    // Masuk ke app tanpa sesi tetap dialihkan ke /masuk (tidak ada jalan pintas ke /arah-saya)
    assert.match(baca('app/(app)/_layout.tsx'), /if \(status === 'keluar'\) return <Redirect href="\/masuk" \/>;/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Kontrak payload identik v1 & tanpa penyimpanan usia/orang tua (sabotase #5 & #6)', () => {
  test('Payload pendaftaran dari alur "Ya" dan "Belum"+setuju identik byte-per-byte dan tanpa field baru', () => {
    const kYa = alur.bentukKirimanDaftar({ ...ISIAN_DASAR, usia: 'ya', orangTuaSetuju: false }, 1);
    const kBelum = alur.bentukKirimanDaftar({ ...ISIAN_DASAR, usia: 'belum', orangTuaSetuju: true }, 1);
    assert.deepEqual(kYa, kBelum);
    assert.equal(JSON.stringify(kYa), JSON.stringify(kBelum));
    assert.deepEqual(Object.keys(kYa.data), ['nama_pengguna', 'kata_sandi', 'kelas', 'versi_kebijakan', 'jenis_sekolah']);
    assert.ok(daftarSkema.safeParse(kYa.data).success);

    // Dengan email juga identik & lolos daftarKirimKodeSkema
    const kEmailYa = alur.bentukKirimanDaftar({ ...ISIAN_DASAR, email: 'uji041@contoh.test', usia: 'ya', orangTuaSetuju: false }, 1);
    const kEmailBelum = alur.bentukKirimanDaftar({ ...ISIAN_DASAR, email: 'uji041@contoh.test', usia: 'belum', orangTuaSetuju: true }, 1);
    assert.equal(JSON.stringify(kEmailYa), JSON.stringify(kEmailBelum));
    assert.ok(daftarKirimKodeSkema.safeParse(kEmailBelum.data).success);
  });

  test('Tidak ada usia, tanggal lahir, atau penanda orang tua yang ditulis ke penyimpanan perangkat atau dikirim ke API', () => {
    for (const rel of ['components/screens/v2/DaftarV2.tsx', 'lib/alurMasukV2.ts']) {
      const s = baca(rel);
      assert.doesNotMatch(s, /AsyncStorage|SecureStore|localStorage|sessionStorage/, `${rel} tidak boleh menulis ke penyimpanan perangkat`);
      assert.doesNotMatch(s, /tanggal_lahir|tanggalLahir|tgl_lahir|birth/i, `${rel} tidak boleh menanyakan/menyimpan tanggal lahir`);
    }
    // Tidak ada klaim palsu bahwa persetujuan orang tua "tercatat" atau "disimpan" di teks baru 041
    const teksBaru = JSON.stringify([alur.TEKS_DAFTAR.usia, alur.TEKS_DAFTAR.orangTua]);
    assert.doesNotMatch(teksBaru, /tercatat|sah secara hukum|tidak dibagikan|hanya kamu/i);
    assert.doesNotMatch(alur.TEKS_DAFTAR.orangTua.ringkasan, /disimpan/i);
    assert.doesNotMatch(alur.TEKS_DAFTAR.orangTua.setuju, /disimpan/i);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Keutuhan kalimat v1 & kebijakan, batas 40 kata, aksesibilitas, kontras, token, dan gerbang rilis (sabotase #7, #8, #10)', () => {
  test('Kalimat persetujuan v1 (lib/alurMasukV2.ts:17) dan lib/kebijakan-privasi.json (versi 1) tidak berubah', () => {
    const reg = baca('components/screens/auth/RegisterScreen.tsx');
    const cocok = /const KALIMAT_DATA_PRIBADI =\s*'([^']+)';/.exec(reg);
    assert.ok(cocok);
    assert.equal(alur.TEKS_V1.dataPribadi, cocok[1]);
    assert.equal(
      alur.TEKS_V1.dataPribadi,
      'Kami menyimpan nama pengguna, nama tampilan, email (kalau kamu isi), kelas, prodi impian, dan centang Daftar Periksamu untuk menjalankan LANJUT, yaitu menampilkan jalur dan kemajuanmu.'
    );

    const keb = JSON.parse(baca('lib/kebijakan-privasi.json'));
    assert.equal(keb.versi, 1);
    const headKeb = execFileSync('git', ['show', 'HEAD:lib/kebijakan-privasi.json'], { cwd: AKAR_APP, encoding: 'utf8' }).replace(/\r\n/g, '\n');
    const hashHead = crypto.createHash('sha256').update(headKeb).digest('hex');
    const hashKini = crypto.createHash('sha256').update(baca('lib/kebijakan-privasi.json')).digest('hex');
    assert.equal(hashKini, hashHead, 'lib/kebijakan-privasi.json tidak boleh berubah sedikit pun');
  });

  test('Layar usia & konfirmasi orang tua <= 40 kata per keadaan layar, target >= 44 pt, kontras >= 4,5:1 dua mode, 0 HEX & 0 ungu', () => {
    assert.equal(alur.BATAS_KATA_GERBANG_USIA, 40);
    const semuaLayar = alur.teksPerLayar(true);
    for (const kunci of ['daftar-usia', 'daftar-orang-tua']) {
      assert.ok(Array.isArray(semuaLayar[kunci]), kunci);
      const n = alur.hitungKata(semuaLayar[kunci].join(' '));
      assert.ok(n <= 40, `${kunci}: ${n} kata > 40`);
    }
    // Termasuk keadaan galat pun tetap <= 40 kata
    assert.ok(
      alur.hitungKata([...semuaLayar['daftar-usia'], alur.TEKS_DAFTAR.usia.pilihDulu].join(' ')) <= 40
    );
    assert.ok(
      alur.hitungKata([...semuaLayar['daftar-orang-tua'], alur.TEKS_DAFTAR.orangTua.belumCentang].join(' ')) <= 40
    );

    // Target sentuh >= 44 pt & kontras >= 4,5:1 pada kedua mode terang & gelap
    assert.ok(tema.ukuran.sentuhMin >= 44);
    for (const [namaMode, w] of [
      ['terang', tema.warnaTerang],
      ['gelap', tema.warnaGelap],
    ]) {
      assert.ok(tema.lolos(w.teks, w.halaman, 'teks'), `${namaMode} teks/halaman`);
      assert.ok(tema.lolos(w.teksSekunder, w.halaman, 'teks'), `${namaMode} teksSekunder/halaman`);
      assert.ok(tema.lolos(w.teksPadaAksen, w.aksen, 'teks'), `${namaMode} tombol utama`);
      assert.ok(tema.lolos(w.nonaktifTeks, w.nonaktifLatar, 'teks'), `${namaMode} tombol nonaktif`);
    }

    // 0 HEX langsung dan 0 ungu EDILAKSO
    const POLA_WARNA = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(.*)$/i;
    const UNGU_TERLARANG = new RegExp('#' + '6a3dff', 'i');
    for (const rel of ['components/screens/v2/DaftarV2.tsx', 'lib/alurMasukV2.ts']) {
      assert.doesNotMatch(baca(rel), UNGU_TERLARANG, rel);
      const sf = ast(rel);
      jelajah(sf, (n) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && POLA_WARNA.test(n.text)) {
          assert.fail(`HEX langsung di ${rel}: "${n.text}"`);
        }
      });
    }
  });

  test('Dokumen draf, peta 041, pertanyaan hukum 041, uji HP, dan gerbang rilis lengkap (0 disetujui)', () => {
    const draf = baca('docs/draf-teks-alur-masuk-v2.md');
    for (const teks of [...Object.values(alur.TEKS_DAFTAR.usia), ...Object.values(alur.TEKS_DAFTAR.orangTua)]) {
      assert.ok(draf.includes(teks), `belum tercatat di draf-teks-alur-masuk-v2.md: "${teks}"`);
    }
    assert.ok(fs.existsSync(path.join(AKAR_APP, 'docs', 'peta-persetujuan-041.md')));
    const hukum = baca('docs/pertanyaan-peninjau-hukum-041.md');
    assert.ok(
      hukum.includes('Apakah pernyataan usia dan konfirmasi orang tua di aplikasi, tanpa penyimpanan di server, cukup untuk pilot? Apa batas usia dan bentuk bukti yang dibutuhkan?')
    );
    assert.match(baca('docs/uji-hp-expo-go.md'), /LANJUT_041/);

    // Teks baru ikut tercakup di entri gerbang alur-masuk-v2 dan tetap belum disetujui
    const entri = gerbang.TEKS.find((x) => x.id === 'alur-masuk-v2');
    assert.deepEqual(entri.berkas, ['lib/alurMasukV2.ts', 'docs/draf-teks-alur-masuk-v2.md']);
    assert.deepEqual(JSON.parse(baca('docs/persetujuan-teks-rilis.json')).disetujui, []);

    const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'gerbang-041-'));
    try {
      const tulis = (rel, isi) => {
        fs.mkdirSync(path.dirname(path.join(akar, rel)), { recursive: true });
        fs.writeFileSync(path.join(akar, rel), typeof isi === 'string' ? isi : JSON.stringify(isi));
      };
      tulis('lib/kebijakan-privasi.json', { versi: 1, status: 'Berlaku.', ringkasan: ['Ringkas.'], isi: [] });
      tulis('lib/alurMasukV2.ts', baca('lib/alurMasukV2.ts'));
      tulis('docs/draf-teks-alur-masuk-v2.md', baca('docs/draf-teks-alur-masuk-v2.md'));
      tulis('eas.json', { build: { coba: { env: { EXPO_PUBLIC_ALUR_MASUK_V2: '1' } } } });
      const pesan = gerbang.periksa(akar).map((m) => m.pesan);
      assert.ok(pesan.includes('Teks alur masuk v2: masih draf dan belum disetujui.'), pesan.join(' | '));
    } finally {
      fs.rmSync(akar, { recursive: true, force: true });
    }
  });
});
