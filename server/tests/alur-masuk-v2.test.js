// LANJUT_030: alur masuk dan onboarding v2 (saklar EXPO_PUBLIC_ALUR_MASUK_V2, mati bawaan), sesi
// tersimpan yang aman, dan kecenderungan arah. Modul murni dites langsung; layar React Native dites
// dari sumbernya, karena tidak ada perender di repo.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { muatModulApp } = require('./muat-ts-app');
const { daftarSkema, daftarKirimKodeSkema } = require('../src/modul/auth/auth.skema');
const gerbang = require('../tools/periksa-gerbang-rilis');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const fitur = muatModulApp('lib/fiturApp');
const alur = muatModulApp('lib/alurMasukV2');
const sesi = muatModulApp('lib/sesiAman');
const arah = muatModulApp('lib/tandaArah');
const pilihan = muatModulApp('lib/pilihan');
const pembuka = muatModulApp('lib/pembuka');

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
const LAYAR_V2 = berkasDi('components/screens/v2');
const KODE_V2 = [...LAYAR_V2, 'lib/alurMasukV2.ts', 'lib/tandaArah.ts', 'hooks/useArahV2.ts'];
const ast = (rel) => ts.createSourceFile(rel, baca(rel), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
function jelajah(n, fn) {
  fn(n);
  ts.forEachChild(n, (c) => jelajah(c, fn));
}
function muatKonfigApp(envTiruan) {
  const { outputText } = ts.transpileModule(baca('app.config.ts'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const modul = { exports: {} };
  vm.runInNewContext(outputText, { exports: modul.exports, module: modul, require: () => ({}), process: { env: { ...envTiruan }, argv: ['node', 'expo', 'start'] }, console });
  return (modul.exports.default ?? modul.exports).extra;
}

// ---------------------------------------------------------------------------------------------
describe('Saklar mati: alur v1 tidak berubah', () => {
  test('alurMasukV2Aktif hanya menyala untuk extra.alurMasukV2 === true', () => {
    for (const extra of [undefined, null, {}, 'ya', { alurMasukV2: false }, { alurMasukV2: '1' }, { alurMasukV2: 1 }]) {
      assert.equal(fitur.alurMasukV2Aktif(extra), false, JSON.stringify(extra));
    }
    assert.equal(fitur.alurMasukV2Aktif({ alurMasukV2: true }), true);
  });

  test('Bawaan mati di app.config; tidak ada profil build, Docker, atau contoh env yang menyalakan', () => {
    assert.equal(muatKonfigApp({}).alurMasukV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_ALUR_MASUK_V2: 'true' }).alurMasukV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_ALUR_MASUK_V2: '1' }).alurMasukV2, true);
    for (const b of ['eas.json', 'Dockerfile', 'docker-compose.yml', 'docker-compose.dev.yml', 'server/.env.example', 'server/.env.production.example', 'server/.env.railway.contoh']) {
      assert.ok(!baca(b).includes('ALUR_MASUK_V2'), b);
    }
  });

  test('Rute dan tata letak memilih v1 bila saklar mati, dan komponen v1 tidak disentuh', () => {
    const masuk = baca('app/(auth)/masuk.tsx');
    assert.match(masuk, /function MasukRoute\(\) \{\n  return <LoginScreen \/>;\n\}/);
    assert.match(masuk, /export default alurMasukV2Aktif\(Constants\.expoConfig\?\.extra\) \? MasukV2 : MasukRoute;/);
    const daftar = baca('app/(auth)/daftar.tsx');
    assert.match(daftar, /function DaftarRoute\(\) \{\n  return <RegisterScreen \/>;\n\}/);
    assert.match(daftar, /export default alurMasukV2Aktif\(Constants\.expoConfig\?\.extra\) \? DaftarV2 : DaftarRoute;/);
    const authLayout = baca('app/(auth)/_layout.tsx');
    assert.match(authLayout, /export default ALUR_MASUK_V2 \? AuthGroupLayoutV2 : AuthGroupLayout;/);
    assert.match(authLayout, /function AuthGroupLayout\(\) \{[\s\S]*<OnboardingScreen keluar=\{!perluOnboarding\}/, 'onboarding v1 tetap di tata letak v1');
    // Komponen layar v1 tidak memakai apa pun dari v2.
    for (const f of ['components/screens/auth/LoginScreen.tsx', 'components/screens/auth/RegisterScreen.tsx', 'components/screens/auth/OnboardingScreen.tsx', 'components/screens/auth/MasukKodeEmail.tsx']) {
      assert.doesNotMatch(baca(f), /\/v2|alurMasukV2|tetapMasuk/, f);
    }
  });

  test('Gerbang arah tidak membaca penyimpanan atau memanggil API saat saklar mati', () => {
    assert.equal(arah.keadaanTanyaArah({ aktif: false, tanda: undefined, daftar: undefined, pilihan: undefined }), 'tidak');
    const hook = baca('hooks/useArahV2.ts');
    assert.match(hook, /const aktif =\s+ALUR_V2 && !!pengguna/);
    assert.match(hook, /if \(!aktif \|\| !id\) return;/);
    assert.match(hook, /const perluData = aktif && /);
    assert.equal((hook.match(/enabled: perluData,/g) || []).length, 2);
    const app = baca('app/(app)/_layout.tsx');
    assert.match(app, /<View style=\{tertahan \|\| arah\.keadaan !== 'tidak' \? s\.tersembunyi : s\.penuh\}>/);
    assert.match(app, /pathname !== '\/terima-kebijakan' && arah\.keadaan === 'tidak';/);
  });

  test('Layar pembuka v1 tetap 2 detik; v2 minimal 800 ms', () => {
    assert.equal(pembuka.MIN_TAMPIL_MS, 2000);
    assert.equal(pembuka.minTampilMs(false), 2000);
    assert.equal(pembuka.MIN_TAMPIL_V2_MS, 800);
    assert.equal(pembuka.minTampilMs(true), 800);
    // Siap → boleh tutup tepat di 800 ms, tidak menahan lebih lama.
    assert.equal(pembuka.bolehTutup(true, 799, pembuka.MIN_TAMPIL_V2_MS), false);
    assert.equal(pembuka.bolehTutup(true, 800, pembuka.MIN_TAMPIL_V2_MS), true);
    assert.equal(pembuka.sisaSebelumTutup(true, 300, pembuka.MIN_TAMPIL_V2_MS), 500);
    // Bawaan fungsi tetap v1 sampai app/_layout.tsx mengaturnya.
    assert.equal(pembuka.bolehTutup(true, 800), false);
    pembuka.aturMinTampil(pembuka.minTampilMs(true));
    try {
      assert.equal(pembuka.bolehTutup(true, 800), true);
      assert.equal(pembuka.sisaSebelumTutup(true, 0), 800);
    } finally {
      pembuka.aturMinTampil(pembuka.MIN_TAMPIL_MS);
    }
    const root = baca('app/_layout.tsx');
    assert.match(root, /const ALUR_MASUK_V2 = alurMasukV2Aktif\(Constants\.expoConfig\?\.extra\);/);
    assert.match(root, /\naturMinTampil\(minTampilMs\(ALUR_MASUK_V2\)\);/);
    // Komponen pembuka memakai bawaan yang diatur itu (berkasnya tidak berubah dari v1).
    assert.match(baca('components/layout/PembukaKelinci.tsx'), /sisaSebelumTutup\(siap, Date\.now\(\) - mulaiMs\)/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Kontrak pendaftaran: payload v2 identik dengan v1', () => {
  // Potongan kode v1 (RegisterScreen.tsx) dijalankan apa adanya, lalu dibandingkan.
  function kirimanV1(isian) {
    const sumber = baca('components/screens/auth/RegisterScreen.tsx');
    const awal = sumber.indexOf('    const data: DataDaftar = {');
    const akhirTeks = '    else register(data);';
    const akhir = sumber.indexOf(akhirTeks);
    assert.ok(awal > 0 && akhir > awal, 'potongan pembentuk payload v1 tidak ditemukan');
    const potongan = ts.transpile(sumber.slice(awal, akhir + akhirTeks.length), { target: ts.ScriptTarget.ES2022 });
    const nama = isian.namaPengguna.trim().toLowerCase(); // RegisterScreen.tsx: const nama = namaPengguna.trim().toLowerCase();
    const tanyaJenis = ['10', '11', '12'].includes(isian.kelas);
    let hasil = null;
    const fn = new Function('nama', 'kataSandi', 'kelas', 'tanyaJenis', 'jenis', 'prodi', 'BELUM', 'VERSI_KEBIJAKAN', 'email', 'kirimKode', 'register', potongan);
    fn(nama, isian.kataSandi, isian.kelas, tanyaJenis, isian.jenis, isian.prodi, 'belum', 1, isian.email,
      (data) => (hasil = { jalur: 'kode', data }), (data) => (hasil = { jalur: 'langsung', data }));
    return hasil;
  }

  const MATRIKS = [];
  for (const kelas of ['7', '8', '9', '10', '11', '12']) {
    for (const jenis of [null, 'SMA', 'SMK', 'MA']) {
      for (const prodi of ['belum', 'informatika']) {
        for (const email of ['', '  siswa@contoh.com  ']) {
          MATRIKS.push({ namaPengguna: '  Budi.SMK_12 ', kataSandi: 'sandi-uji-1234', email, sudahBaca: true, kelas, jenis, prodi });
        }
      }
    }
  }

  test(`${MATRIKS.length} kombinasi: payload JSON sama persis (termasuk urutan medan)`, () => {
    for (const i of MATRIKS) {
      const v1 = kirimanV1(i);
      const v2 = alur.bentukKirimanDaftar(i, 1);
      assert.equal(JSON.stringify(v2), JSON.stringify(v1), JSON.stringify(i));
    }
  });

  test('Payload lolos skema server dan tidak memuat medan baru', () => {
    const IZIN = ['nama_pengguna', 'kata_sandi', 'kelas', 'versi_kebijakan', 'jenis_sekolah', 'prodi_impian', 'email'];
    for (const i of MATRIKS) {
      const k = alur.bentukKirimanDaftar(i, 1);
      for (const kunci of Object.keys(k.data)) assert.ok(IZIN.includes(kunci), kunci);
      assert.equal(k.data.versi_kebijakan, 1);
      const skema = k.jalur === 'kode' ? daftarKirimKodeSkema : daftarSkema;
      assert.ok(skema.safeParse(k.data).success, JSON.stringify(k.data));
    }
  });

  test('Layar v2 mengirim lewat fungsi yang sama dan rute yang sama dengan v1', () => {
    const d = baca('components/screens/v2/DaftarV2.tsx');
    assert.match(d, /const k = bentukKirimanDaftar\(isian, VERSI_KEBIJAKAN\);/);
    assert.match(d, /if \(k\.jalur === 'kode'\) void kirimKode\(k\.data, false\);\n\s+else register\(k\.data, \{ tetapMasuk \}\);/);
    assert.match(d, /await authApi\.kirimKodeDaftar\(data\);/);
    assert.match(d, /registerKode\(kiriman\.email, kode\.trim\(\), \{ tetapMasuk \}\);/);
    // Rute API tidak berubah.
    const auth = baca('api/auth.ts');
    for (const r of ["'/auth/daftar'", "'/auth/daftar/kirim-kode'", "'/auth/daftar/verifikasi'", "'/auth/masuk'", "'/auth/otp/verifikasi'"]) assert.ok(auth.includes(r), r);
  });

  test('Teks yang disalin dari v1 sama persis dengan sumbernya', () => {
    const reg = baca('components/screens/auth/RegisterScreen.tsx');
    const ambil = (nama) => {
      const m = new RegExp(`const ${nama} =\\s*'([^']+)';`).exec(reg);
      assert.ok(m, nama);
      return m[1];
    };
    assert.equal(alur.TEKS_V1.dataPribadi, ambil('KALIMAT_DATA_PRIBADI'));
    assert.equal(alur.TEKS_V1.sudahBaca, ambil('LABEL_SUDAH_BACA'));
    assert.equal(alur.TEKS_V1.belumCentang, ambil('PETUNJUK_BELUM_CENTANG'));
    assert.equal(alur.TEKS_V1.petunjukEmail, ambil('PETUNJUK_EMAIL'));
    const ui = baca('components/screens/auth/AuthUI.tsx');
    assert.ok(ui.includes(`export const BELUM = '${alur.BELUM_PRODI}';`));
    assert.ok(ui.includes(`label="${alur.TEKS_V1.belumProdi}"`));
    assert.equal(String(alur.NAMA_PENGGUNA_REGEX), String(/^[a-z0-9._]{3,32}$/));
    assert.ok(reg.includes('const NAMA_PENGGUNA_REGEX = /^[a-z0-9._]{3,32}$/;'));
  });
});

// ---------------------------------------------------------------------------------------------
describe('Sesi tersimpan yang aman', () => {
  function tempat({ gagalAmbil = false, gagalSimpan = false, gagalHapus = false, ubahNilai = false } = {}) {
    const isi = new Map();
    return {
      isi,
      ambil: async (k) => {
        if (gagalAmbil) throw new Error('tidak bisa dibaca');
        return isi.has(k) ? (ubahNilai ? `${isi.get(k)}x` : isi.get(k)) : null;
      },
      simpan: async (k, v) => {
        if (gagalSimpan) throw new Error('tidak bisa ditulis');
        isi.set(k, v);
      },
      hapus: async (k) => {
        if (gagalHapus) throw new Error('tidak bisa dihapus');
        isi.delete(k);
      },
    };
  }
  const TOKEN = 'token-rahasia-uji-0123456789abcdef';
  const pencatat = () => {
    const c = [];
    const catat = (p) => c.push(p);
    catat.catatan = c;
    return catat;
  };

  test('Migrasi sekali jalan: token lama pindah ke penyimpanan aman, yang lama terhapus, sesi tetap berlaku', async () => {
    const aman = tempat();
    const lama = tempat();
    lama.isi.set(sesi.KUNCI_TOKEN, TOKEN); // sesi dari APK 1.0.0 / sebelum LANJUT_030
    const catat = pencatat();
    const h = await sesi.bacaToken(aman, lama, catat);
    assert.deepEqual(h, { token: TOKEN, sumber: 'aman', dipindah: true });
    assert.equal(aman.isi.get(sesi.KUNCI_TOKEN), TOKEN);
    assert.equal(lama.isi.has(sesi.KUNCI_TOKEN), false);
    // Dibuka lagi: langsung dari penyimpanan aman, tanpa migrasi ulang.
    assert.deepEqual(await sesi.bacaToken(aman, lama, catat), { token: TOKEN, sumber: 'aman', dipindah: false });
    assert.deepEqual(catat.catatan, []);
    assert.equal(sesi.KUNCI_TOKEN, 'auth_token', 'kunci lama sama dengan APK 1.0.0');
  });

  test('Penyimpanan aman gagal: sesi tidak dibuang, tetap di penyimpanan lama, dan dicatat tanpa token', async () => {
    for (const rusak of [{ gagalAmbil: true }, { gagalSimpan: true }, { ubahNilai: true }]) {
      const aman = tempat(rusak);
      const lama = tempat();
      lama.isi.set(sesi.KUNCI_TOKEN, TOKEN);
      const catat = pencatat();
      const h = await sesi.bacaToken(aman, lama, catat);
      assert.equal(h.token, TOKEN, JSON.stringify(rusak));
      assert.equal(h.sumber, 'lama');
      assert.equal(lama.isi.get(sesi.KUNCI_TOKEN), TOKEN, 'token lama tidak dihapus');
      assert.equal(catat.catatan.length, 1);
      for (const c of catat.catatan) assert.ok(!c.includes(TOKEN) && Object.values(sesi.CATATAN).includes(c));
    }
  });

  test('Simpan: ke penyimpanan aman dan sisa lama dihapus; gagal → penyimpanan lama, dicatat', async () => {
    const aman = tempat();
    const lama = tempat();
    lama.isi.set(sesi.KUNCI_TOKEN, 'token-lama');
    assert.equal(await sesi.simpanToken(aman, lama, TOKEN, true, pencatat()), 'aman');
    assert.equal(aman.isi.get(sesi.KUNCI_TOKEN), TOKEN);
    assert.equal(lama.isi.size, 0);
    const amanRusak = tempat({ gagalSimpan: true });
    const lama2 = tempat();
    const catat = pencatat();
    assert.equal(await sesi.simpanToken(amanRusak, lama2, TOKEN, true, catat), 'lama');
    assert.equal(lama2.isi.get(sesi.KUNCI_TOKEN), TOKEN);
    assert.ok(catat.catatan.every((c) => !c.includes(TOKEN)));
  });

  test('Web (tanpa penyimpanan aman) memakai penyimpanan lama, seperti sebelum LANJUT_030', async () => {
    const lama = tempat();
    assert.equal(await sesi.simpanToken(null, lama, TOKEN, true, pencatat()), 'lama');
    assert.deepEqual(await sesi.bacaToken(null, lama, pencatat()), { token: TOKEN, sumber: 'lama', dipindah: false });
    assert.match(baca('api/penyimpananAman.web.ts'), /CADANGAN WEB/);
    assert.match(baca('api/penyimpananAman.web.ts'), /export const penyimpananAman: TempatSimpan \| null = null;/);
    const asli = baca('api/penyimpananAman.ts');
    for (const f of ['getItemAsync', 'setItemAsync', 'deleteItemAsync']) assert.ok(asli.includes(`SecureStore.${f}(`), f);
  });

  test('"Tetap masuk" mati: token tidak ditulis ke mana pun dan tidak bertahan setelah app ditutup', async () => {
    const aman = tempat();
    const lama = tempat();
    aman.isi.set(sesi.KUNCI_TOKEN, 'token-sesi-sebelumnya');
    lama.isi.set(sesi.KUNCI_TOKEN, 'token-lama');
    assert.equal(await sesi.simpanToken(aman, lama, TOKEN, false, pencatat()), 'memori');
    assert.equal(aman.isi.size + lama.isi.size, 0);
    // "Proses baru" (app dibuka lagi): tidak ada sesi.
    assert.deepEqual(await sesi.bacaToken(aman, lama, pencatat()), { token: null, sumber: 'kosong', dipindah: false });
    const auth = baca('api/auth.ts');
    assert.match(auth, /async function simpanSesi\(sesi: Sesi, \{ tetapMasuk = true \}: OpsiSesi = \{\}\) \{/);
    assert.match(auth, /if \(tetapMasuk\) await AsyncStorage\.setItem\(KUNCI_PENGGUNA, JSON\.stringify\(sesi\.pengguna\)\);\n\s+else await AsyncStorage\.removeItem\(KUNCI_PENGGUNA\);/);
    assert.match(auth, /export async function simpanPengguna\(pengguna: Pengguna\) \{\n\s+if \(sesiSementara\) return;/);
    // Pilihan terlihat jelas dan bawaannya aktif di Masuk dan Daftar v2.
    for (const f of ['components/screens/v2/MasukV2.tsx', 'components/screens/v2/DaftarV2.tsx']) {
      assert.match(baca(f), /const \[tetapMasuk, setTetapMasuk\] = useState\(true\);/, f);
      assert.match(baca(f), /<Centang label=\{TEKS_MASUK\.tetapMasuk\}/, f);
    }
  });

  test('Keluar menghapus token dari kedua tempat, juga bila penyimpanan aman galat', async () => {
    const aman = tempat({ gagalHapus: true });
    const lama = tempat();
    lama.isi.set(sesi.KUNCI_TOKEN, TOKEN);
    await sesi.hapusToken(aman, lama);
    assert.equal(lama.isi.size, 0);
    const auth = baca('api/auth.ts');
    assert.match(auth, /export async function hapusSesiLokal\(\) \{\n\s+sesiSementara = false;\n\s+await hapusToken\(penyimpananAman, penyimpananLama\);/);
    // Server tetap dicabut saat keluar (tidak berubah).
    assert.match(auth, /await apiFetch\('\/auth\/keluar', \{ method: 'POST', token \}\);/);
  });

  test('api/auth.ts hanya menyimpan token lewat lib/sesiAman; kata sandi tidak pernah disimpan atau dicatat', () => {
    const auth = baca('api/auth.ts');
    assert.match(auth, /const \{ token \} = await bacaToken\(penyimpananAman, penyimpananLama, catatSesi\);/);
    assert.match(auth, /await simpanToken\(penyimpananAman, penyimpananLama, sesi\.token, tetapMasuk, catatSesi\);/);
    assert.doesNotMatch(auth, /AsyncStorage\.\w+\(\s*\[?\s*KUNCI_TOKEN/, 'token tidak ditulis langsung ke AsyncStorage');
    assert.match(auth, /const catatSesi = \(pesan: string\) => console\.warn\(`\[sesi\] \$\{pesan\}`\);/);
    // Tidak ada penulisan ke penyimpanan yang menyentuh kata sandi, di mana pun di kode app.
    const SIMPAN = /(AsyncStorage\.(setItem|multiSet|mergeItem)|SecureStore\.setItemAsync|localStorage\.setItem|simpanToken|\.simpan\()\s*\(([^;]*)/g;
    for (const f of ['api', 'lib', 'hooks', 'providers', 'components', 'app'].flatMap(berkasDi)) {
      for (const m of baca(f).matchAll(SIMPAN)) assert.doesNotMatch(m[0], /sandi|password/i, `${f}: ${m[0].slice(0, 80)}`);
    }
    // Layar v2 tidak menyentuh penyimpanan sama sekali, dan tidak mencatat apa pun.
    for (const f of LAYAR_V2) assert.doesNotMatch(baca(f), /AsyncStorage|SecureStore|localStorage|console\./, f);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Persetujuan tidak bergeser dan tidak bisa dilewati', () => {
  const isianLengkap = { namaPengguna: 'budi.smk', kataSandi: 'sandi-uji-1234', email: '', sudahBaca: true, kelas: '12', jenis: 'SMK', prodi: 'belum' };

  test('Persetujuan diminta sebelum akun dibuat, di semua jenjang', () => {
    for (const kelas of [null, '7', '9', '10', '12']) {
      const l = alur.langkahDaftar(kelas);
      assert.ok(l.indexOf('persetujuan') >= 0 && l.indexOf('persetujuan') < l.indexOf('siap'), String(kelas));
      assert.equal(l.at(-1), 'siap');
    }
  });

  test('Tanpa centang, tidak ada payload dan tombol Buat akun ditolak', () => {
    assert.equal(alur.bentukKirimanDaftar({ ...isianLengkap, sudahBaca: false }, 1), null);
    assert.ok(alur.periksaLangkah('siap', { ...isianLengkap, sudahBaca: false }).versi_kebijakan);
    assert.ok(alur.periksaLangkah('persetujuan', { ...isianLengkap, sudahBaca: false }).versi_kebijakan);
    assert.deepEqual(alur.periksaLangkah('siap', isianLengkap), {});
    assert.equal(alur.bentukKirimanDaftar(isianLengkap, 1).data.versi_kebijakan, 1);
  });

  test('Ringkasan dan teks kebijakan lengkap berasal dari JSON yang sama, tanpa perubahan', () => {
    const d = baca('components/screens/v2/DaftarV2.tsx');
    assert.match(d, /import \{ RINGKASAN_KEBIJAKAN, VERSI_KEBIJAKAN \} from '\.\.\/\.\.\/\.\.\/lib\/kebijakanPrivasi';/);
    assert.match(d, /\{RINGKASAN_KEBIJAKAN\.map\(\(butir\) => \(/);
    assert.match(d, /import \{ IsiKebijakan \} from '\.\.\/KebijakanPrivasiScreen';/);
    assert.match(d, /<IsiKebijakan \/>/, 'teks lengkap = IsiKebijakan v1 dari lib/kebijakan-privasi.json');
    assert.match(d, /<Centang label=\{TEKS_V1\.sudahBaca\} dicentang=\{isian\.sudahBaca\}/, 'persetujuan tetap centang eksplisit');
    const json = JSON.parse(baca('lib/kebijakan-privasi.json'));
    assert.equal(json.versi, 1, 'versi kebijakan tetap 1');
    // Tidak ada kalimat kebijakan yang ditulis ulang di kode v2.
    const kalimat = [...json.ringkasan, ...json.isi.flatMap((b) => [...(b.paragraf ?? []), ...(b.butir ?? [])])];
    for (const f of KODE_V2) for (const k of kalimat) assert.ok(!baca(f).includes(k.slice(0, 40)), `${f} menyalin kalimat kebijakan`);
  });

  test('Persetujuan orang tua/wali tetap di gerbang v1; alur v2 tidak menyentuh rute persetujuan', () => {
    for (const f of KODE_V2) assert.doesNotMatch(baca(f), /\/persetujuan|ortu|bolehPakaiAi/i, f);
    assert.ok(fs.existsSync(path.join(AKAR_APP, 'app', '(app)', 'persetujuan-ortu.tsx')));
    assert.match(baca('server/src/modul/persetujuan/persetujuan.layanan.js'), /const nilaiGerbang = \(terakhir, cfg\) => ortuWaliAktif\(terakhir, cfg\) && kebijakanTerkini\(terakhir, cfg\);/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Kecenderungan arah', () => {
  const JALUR = [
    { id: 'bekerja', nama: 'Bekerja', deskripsi_singkat: 'B', status_teks: 'disetujui', urutan: 2 },
    { id: 'melanjutkan', nama: 'Melanjutkan', deskripsi_singkat: 'M', status_teks: 'disetujui', urutan: 1 },
    { id: 'wirausaha', nama: 'Wirausaha', deskripsi_singkat: 'W', status_teks: 'draf', urutan: 3 },
  ];

  test('Hanya jalur disetujui yang tampil; jalur draf tidak pernah terkirim', () => {
    const opsi = arah.opsiArah(JALUR);
    assert.deepEqual(opsi.map((o) => o.nilai), ['melanjutkan', 'bekerja']);
    assert.deepEqual(arah.jalurUntukDikirim(['wirausaha', 'bekerja', 'tidak-ada'], opsi), ['bekerja']);
  });

  test('Banyak pilihan boleh; "Belum tahu" eksklusif dan tidak mengirim apa pun', () => {
    let t = pilihan.ubahPilihan([], 'melanjutkan', 'banyak');
    t = pilihan.ubahPilihan(t, 'bekerja', 'banyak');
    assert.deepEqual(t, ['melanjutkan', 'bekerja']);
    t = pilihan.ubahPilihan(t, pilihan.BELUM_TAHU, 'banyak');
    assert.deepEqual(t, [pilihan.BELUM_TAHU]);
    assert.deepEqual(arah.jalurUntukDikirim(t, arah.opsiArah(JALUR)), []);
    t = pilihan.ubahPilihan(t, 'bekerja', 'banyak');
    assert.deepEqual(t, ['bekerja']);
    const layar = baca('components/screens/v2/KecenderunganV2.tsx');
    assert.match(layar, /mode="banyak"/);
    assert.match(layar, /belumTahu=\{TEKS_ARAH\.belumTahu\}/);
    assert.match(layar, /for \(const id of jalurUntukDikirim\(terpilih, arah\.opsi\)\)/);
    assert.match(layar, /await arah\.simpanTanda\('dijawab'\);/);
  });

  test('Daftar kosong atau gagal tidak memblokir; tanda lokal mencegah ditanya setiap kali', () => {
    const k = (tanda, daftar, pilih) => arah.keadaanTanyaArah({ aktif: true, tanda, daftar, pilihan: pilih });
    assert.equal(k(undefined, undefined, undefined), 'menunggu');
    assert.equal(k(null, undefined, []), 'menunggu');
    assert.equal(k(null, [], []), 'tanya', 'kosong → layar "sedang disiapkan" yang bisa dilewati');
    assert.equal(k(null, null, null), 'tanya', 'rute mati/gagal → tetap bisa dilewati');
    assert.equal(k('kosong', [], []), 'tidak');
    assert.equal(k('kosong', JALUR, []), 'tanya', 'jalur disetujui muncul kemudian → ditanya sekali lagi');
    assert.equal(k('dijawab', JALUR, []), 'tidak');
    assert.equal(k(null, JALUR, [{ id: 'p', jalur_minat_id: null, jalur_belum_tersedia: true, status: 'aktif' }]), 'tidak', 'sudah punya jalur aktif');
    assert.equal(k(null, JALUR, [{ id: 'p', jalur_minat_id: 'bekerja', jalur_belum_tersedia: false, status: 'dijeda' }]), 'tanya');
    const layar = baca('components/screens/v2/KecenderunganV2.tsx');
    assert.match(layar, /<KeadaanKosong judul=\{TEKS_ARAH\.kosongJudul\}/);
    assert.match(layar, /onPress=\{\(\) => void arah\.simpanTanda\('kosong'\)\}/);
    assert.match(layar, /onPress=\{arah\.lewatiSesiIni\}/);
    assert.equal(arah.uraiTandaArah('dijawab'), 'dijawab');
    assert.equal(arah.uraiTandaArah('lain'), null);
  });

  test('Tanpa migrasi dan tanpa rute baru: hanya rute Jalur & Tujuan yang sudah ada', () => {
    assert.equal(fs.readdirSync(path.join(AKAR_APP, 'server', 'src', 'db', 'migrasi')).length, 33);
    const panggilan = KODE_V2.flatMap((f) => [...baca(f).matchAll(/apiFetch(?:<[^>]+>)?\(\s*'([^']+)'/g)].map((m) => m[1]));
    assert.deepEqual([...new Set(panggilan)].sort(), ['/jalur-minat', '/jalur-minat/saya']);
    assert.match(baca('components/screens/v2/KecenderunganV2.tsx'), /const pilihJalur = usePilihJalur\(\);/);
    // Tanda lokal ikut dibuang saat akun dihapus.
    assert.match(baca('api/auth.ts'), /AsyncStorage\.multiRemove\(\[kunciProfilLokal\(penggunaId\), kunciTandaArah\(penggunaId\)\]\)/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Teks, aksesibilitas, dan tampilan', () => {
  test('Maksimal 60 kata per layar (di luar teks kebijakan) dan 25 kata per kartu pengantar', () => {
    for (const kelolaData of [false, true]) {
      for (const [layar, teks] of Object.entries(alur.teksPerLayar(kelolaData))) {
        const n = alur.hitungKata(teks.join(' '));
        assert.ok(n <= alur.BATAS_KATA_LAYAR, `${layar}: ${n} kata`);
      }
    }
    for (const kelolaData of [false, true]) {
      alur.TEKS_PENGANTAR.kartu.forEach((k, i) => {
        const isi = i === 2 && kelolaData ? `${k.isi} ${alur.TEKS_PENGANTAR.kelolaData}` : k.isi;
        assert.ok(alur.hitungKata(`${k.judul} ${isi}`) <= 25, `kartu ${i + 1}`);
      });
    }
    assert.equal(alur.BATAS_KATA_LAYAR, 60);
    const pil = baca('components/v2/Pilihan.tsx');
    assert.ok(pil.includes(`'${alur.LABEL_PILIHAN.satu}'`) && pil.includes(`'${alur.LABEL_PILIHAN.banyak}'`));
    assert.equal(pilihan.teksStatusPilihan(0, 'satu'), alur.LABEL_PILIHAN.belumAda);
  });

  test('Semua teks layar v2 berasal dari lib/alurMasukV2.ts (tidak ada teks tertulis langsung)', () => {
    for (const f of LAYAR_V2) {
      jelajah(ast(f), (n) => {
        if (ts.isJsxText(n)) assert.doesNotMatch(n.text, /[A-Za-z]/, `${f}: "${n.text.trim()}"`);
        if (ts.isJsxAttribute(n) && /^(label|judul|ringkasan|keterangan|teks|pesan|galat|petunjuk|belumTahu)$/.test(n.name.getText()) && n.initializer && ts.isStringLiteral(n.initializer)) {
          assert.fail(`${f}: ${n.name.getText()}="${n.initializer.text}"`);
        }
      });
    }
  });

  test('Kalimat kendali data hanya yang benar dan fiturnya menyala; tanpa klaim "hanya kamu"', () => {
    const p = baca('components/screens/v2/PengantarV2.tsx');
    assert.match(p, /const KELOLA_DATA = kelolaDataAkunAktif\(Constants\.expoConfig\?\.extra\);/);
    assert.match(p, /i === TEKS_PENGANTAR\.kartu\.length - 1 && kelolaData \?/);
    const semua = JSON.stringify(alur.teksPerLayar(true));
    assert.doesNotMatch(semua, /hanya kamu|hanya terlihat olehmu|tidak dibagikan|aman 100|pasti/i);
  });

  test('Target sentuh 44, semua isian berlabel, dan hanya komponen v2 yang dipakai', () => {
    const isian = baca('components/v2/Isian.tsx');
    assert.match(isian, /minHeight: ukuran\.sentuhMin,/);
    assert.match(isian, /accessibilityLabel=\{label\}/);
    assert.match(isian, /\n  label: string;\n/);
    assert.doesNotMatch(isian, /placeholder\w*=/i, 'tanpa placeholder berkontras rendah');
    for (const f of LAYAR_V2) {
      const s = baca(f);
      assert.doesNotMatch(s, /\b(Pressable|TouchableOpacity|TouchableHighlight|TextInput)\b/, `${f}: kontrol di luar komponen v2`);
      jelajah(ast(f), (n) => {
        if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && n.tagName.getText() === 'Isian') {
          assert.ok(n.attributes.properties.some((a) => ts.isJsxAttribute(a) && a.name.getText() === 'label'), `${f}: Isian tanpa label`);
        }
      });
    }
    assert.match(baca('components/v2/Centang.tsx'), /<Sentuh\s+peran="checkbox"\s+label=\{label\}/);
  });

  test('Gerak singkat dan tunduk pada "Kurangi gerakan"; fungsi tetap jalan tanpa animasi', () => {
    assert.match(baca('components/screens/v2/KerangkaV2.tsx'), /if \(!gerakBoleh\(kurangiGerak\)\) \{\n\s+muncul\.setValue\(1\);/);
    assert.match(baca('components/screens/v2/PengantarV2.tsx'), /animated: !kurangiGerak/);
    assert.match(baca('components/screens/v2/DaftarV2.tsx'), /animationType=\{kurangiGerak \? 'none' : 'slide'\}/);
    for (const f of LAYAR_V2) {
      const s = baca(f);
      if (/Animated\.(timing|loop|spring)/.test(s)) assert.match(s, /useKurangiGerak\(\)/, f);
    }
  });

  test('Tanpa warna atau jarak tertulis langsung di layar v2', () => {
    const KUNCI = /^(padding|margin)\w*$|^(gap|width|height|minWidth|minHeight|borderRadius|border\w*Width|fontSize|lineHeight)$/;
    for (const f of LAYAR_V2) {
      jelajah(ast(f), (n) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\()/i.test(n.text)) assert.fail(`${f}: warna "${n.text}"`);
        if (ts.isPropertyAssignment(n) && KUNCI.test(n.name.getText()) && ts.isNumericLiteral(n.initializer) && n.initializer.text !== '0') {
          assert.fail(`${f}: ${n.name.getText()}: ${n.initializer.text}`);
        }
      });
    }
  });

  test('Source Sans 3 lokal berlisensi OFL, dimuat hanya bila layar v2 atau galeri menyala', () => {
    for (const b of ['SourceSans3_400Regular.ttf', 'SourceSans3_600SemiBold.ttf']) {
      const ukuran = fs.statSync(path.join(AKAR_APP, 'assets', 'fonts', b)).size;
      assert.ok(ukuran > 300_000 && ukuran < 420_000, `${b}: ${ukuran}`);
    }
    assert.match(baca('assets/fonts/OFL-SourceSans3.txt'), /SIL Open Font License, Version 1\.1/);
    const root = baca('app/_layout.tsx');
    assert.match(root, /const HURUF_V2 = ALUR_MASUK_V2\n\s+\? \{/);
    assert.match(root, /\.\.\.HURUF_V2,/);
    assert.match(baca('components/galeri/GaleriKomponen.tsx'), /SourceSans3_400Regular: require\('\.\.\/\.\.\/assets\/fonts\/SourceSans3_400Regular\.ttf'\)/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Gerbang rilis', () => {
  test('Teks alur masuk v2 terdaftar dengan saklarnya; tidak ada yang ditandai disetujui', () => {
    const t = gerbang.TEKS.find((x) => x.id === 'alur-masuk-v2');
    assert.deepEqual(t.berkas, ['lib/alurMasukV2.ts', 'docs/draf-teks-alur-masuk-v2.md']);
    assert.equal(t.saklar, 'EXPO_PUBLIC_ALUR_MASUK_V2');
    assert.ok(gerbang.SEMUA_SAKLAR.includes('EXPO_PUBLIC_ALUR_MASUK_V2'));
    assert.ok(!baca('docs/persetujuan-teks-rilis.json').includes('alur-masuk-v2'));
    assert.match(baca('lib/alurMasukV2.ts'), /TEKS DRAF/);
    assert.match(baca('docs/draf-teks-alur-masuk-v2.md'), /DRAF/);
    // Repo sekarang: tidak ada profil yang menyalakan, jadi gerbang tidak menyebut teks ini.
    assert.ok(!gerbang.periksa(AKAR_APP).some((m) => m.pesan.includes('alur masuk v2')));
  });

  test('Profil build yang menyalakan saklar ditahan karena teks draf', () => {
    const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'gerbang-030-'));
    try {
      const tulis = (rel, isi) => {
        fs.mkdirSync(path.dirname(path.join(akar, rel)), { recursive: true });
        fs.writeFileSync(path.join(akar, rel), typeof isi === 'string' ? isi : JSON.stringify(isi));
      };
      tulis('lib/kebijakan-privasi.json', { versi: 1, status: 'Berlaku.', ringkasan: ['Ringkas.'], isi: [] });
      tulis('lib/alurMasukV2.ts', '// TEKS DRAF\n');
      tulis('docs/draf-teks-alur-masuk-v2.md', 'DRAF\n');
      tulis('eas.json', { build: { coba: { env: { EXPO_PUBLIC_ALUR_MASUK_V2: '1' } } } });
      const pesan = gerbang.periksa(akar).map((m) => m.pesan);
      assert.ok(pesan.includes('Teks alur masuk v2: masih draf dan belum disetujui.'), pesan.join(' | '));
      tulis('eas.json', { build: { coba: { env: {} } } });
      assert.ok(!gerbang.periksa(akar).some((m) => m.pesan.includes('alur masuk v2')));
    } finally {
      fs.rmSync(akar, { recursive: true, force: true });
    }
  });

  test('Dokumen draf memuat setiap teks yang tampil di layar v2', () => {
    const doc = baca('docs/draf-teks-alur-masuk-v2.md');
    for (const teks of Object.values(alur.teksPerLayar(true)).flat()) {
      if (teks.includes('nama@contoh.com') || /^Langkah \d|^Kartu \d/.test(teks)) continue;
      assert.ok(doc.includes(teks), `belum ada di dokumen: "${teks}"`);
    }
  });
});
