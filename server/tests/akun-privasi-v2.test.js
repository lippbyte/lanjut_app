// LANJUT_037: Akun & Privasi v2 (reskin /akun dan /hapus-akun di balik EXPO_PUBLIC_NAVIGASI_V2
// bersama EXPO_PUBLIC_KELOLA_DATA_AKUN — keduanya mati bawaan). Modul murni dites langsung;
// komponen & layar RN dites lewat TypeScript AST dan pembacaan sumber (pola 030–036).

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { muatModulApp } = require('./muat-ts-app');
const gerbang = require('../tools/periksa-gerbang-rilis');
const { PENEGASAN_HAPUS_AKUN } = require('../src/modul/data-pengguna/data-pengguna.skema');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const akunV2 = muatModulApp('lib/akunPrivasiV2');
const navV2 = muatModulApp('lib/navigasiV2');
const fitur = muatModulApp('lib/fiturApp');
const modeLib = muatModulApp('lib/modeTampilan');

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

const BERKAS_BARU_037 = [
  'lib/akunPrivasiV2.ts',
  'components/screens/v2/AkunPrivasiV2.tsx',
  'components/screens/v2/HapusAkunV2.tsx',
];

const KOMPONEN_037 = [
  'components/screens/v2/AkunPrivasiV2.tsx',
  'components/screens/v2/HapusAkunV2.tsx',
];

// ---------------------------------------------------------------------------------------------
describe('Saklar mati vs menyala, isolasi v1, dan dua jalan menuju Akun & Privasi', () => {
  test('Saklar bawaan mati di app.config, tanpa dinyalakan diam-diam di profil produksi/rilis (sabotase #8)', () => {
    const mati = muatKonfigApp({});
    assert.equal(mati.extra.navigasiV2, false);
    assert.equal(mati.extra.kelolaDataAkun, false);
    assert.equal(mati.extra.modeGelap, false);

    assert.equal(fitur.kelolaDataAkunAktif(mati.extra), false);
    assert.equal(fitur.navigasiV2Aktif(mati.extra), false);

    const nyala = muatKonfigApp({ EXPO_PUBLIC_NAVIGASI_V2: '1', EXPO_PUBLIC_KELOLA_DATA_AKUN: '1' });
    assert.equal(nyala.extra.navigasiV2, true);
    assert.equal(nyala.extra.kelolaDataAkun, true);

    const eas = JSON.parse(baca('eas.json')).build;
    for (const [nama, profil] of Object.entries(eas)) {
      assert.notEqual(profil.env?.EXPO_PUBLIC_NAVIGASI_V2, '1', `eas.json:${nama} tidak boleh menyalakan navigasi v2`);
      if (nama !== 'pilot') {
        assert.notEqual(profil.env?.EXPO_PUBLIC_KELOLA_DATA_AKUN, '1', `eas.json:${nama} tidak boleh menyalakan kelola data akun`);
      }
    }
  });

  test('Rute /akun dan /hapus-akun memilih v2 hanya saat kedua saklar menyala; v1 utuh saat mati (sabotase #11)', () => {
    const rAkun = baca('app/(app)/akun.tsx');
    assert.match(rAkun, /if \(navigasiV2Aktif\(extra\) && kelolaDataAkunAktif\(extra\)\) return <AkunPrivasiV2 \/>;/);
    assert.match(rAkun, /return <AkunScreen \/>;/);

    const rHapus = baca('app/(app)/hapus-akun.tsx');
    assert.match(rHapus, /if \(!kelolaDataAkunAktif\(Constants\.expoConfig\?\.extra\)\) return <Redirect href="\/akun" \/>;/);
    assert.match(rHapus, /if \(navigasiV2Aktif\(extra\)\) return <HapusAkunV2 key=\{pengguna\?\.id\} \/>;/);
    assert.match(rHapus, /return <HapusAkunScreen key=\{pengguna\?\.id\} \/>;/);

    // Penjaga lapis kedua di dalam AkunPrivasiV2: kartu Datamu dan Hapus akun wajib di balik KELOLA_DATA_AKUN
    const akunSrc = baca('components/screens/v2/AkunPrivasiV2.tsx');
    assert.match(akunSrc, /const KELOLA_DATA_AKUN = kelolaDataAkunAktif\(Constants\.expoConfig\?\.extra\);/);
    const blokKelola = akunSrc.match(/\{KELOLA_DATA_AKUN \?/g) ?? [];
    assert.equal(blokKelola.length, 2, 'Baik kartu Datamu maupun kartu Hapus akun harus berada di balik KELOLA_DATA_AKUN');
    assert.match(akunSrc, /\{KELOLA_DATA_AKUN \? \([\s\S]*T\.kartuDatamu[\s\S]*T\.unduh[\s\S]*\) : null\}/);
    assert.match(akunSrc, /\{KELOLA_DATA_AKUN \? \([\s\S]*T\.tandaPermanen[\s\S]*T\.kartuHapus[\s\S]*T\.bukaHapus[\s\S]*\) : null\}/);

    // Layar v1 tidak disentuh
    assert.doesNotMatch(baca('components/screens/AkunScreen.tsx'), /AkunPrivasiV2|useTemaV2|navigasiV2Aktif/);
    assert.doesNotMatch(baca('components/screens/HapusAkunScreen.tsx'), /HapusAkunV2|useTemaV2|navigasiV2Aktif/);

    // AppShellV2 tidak menggandakan kartu PilihModeTampilanV2 saat AkunPrivasiV2 aktif
    const shell = baca('components/screens/v2/AppShellV2.tsx');
    assert.match(shell, /const tampilPilihMode = modeGelap && pathname === '\/akun';/);
    assert.match(shell, /\{tampilPilihMode && !SAKLAR\.kelolaDataAkun \?/);
  });

  test('Dua jalan menuju Akun & Privasi bekerja: pintu dari Profil Eksplorasi (Jelajah menyala) & tab Profil Saya langsung (Jelajah mati)', () => {
    // Jalan 1: Jelajah menyala -> tab Profil Saya ke /discover-profil + pintu AppShellV2 ke /akun
    const tabPenuh = navV2.daftarTabV2({ discover: true, jalurTujuan: true, portofolio: true, kelolaDataAkun: true });
    const tabProfilPenuh = tabPenuh.find((t) => t.id === 'profil_saya');
    assert.equal(tabProfilPenuh.href, '/discover-profil');
    const pintuAkun = navV2.PINTU_TAB_V2.find((p) => p.diRute === '/discover-profil' && p.keHref === '/akun');
    assert.ok(pintuAkun, 'Pintu dari Profil Eksplorasi ke /akun wajib ada');
    assert.equal(pintuAkun.label, 'Akun & Privasi');

    // Jalan 2: Jelajah mati -> tab Profil Saya langsung membuka /akun (3 tab merata)
    const tabTanpaJelajah = navV2.daftarTabV2({ discover: false, jalurTujuan: true, portofolio: true, kelolaDataAkun: true });
    assert.equal(tabTanpaJelajah.length, 3);
    const tabProfilCadangan = tabTanpaJelajah.find((t) => t.id === 'profil_saya');
    assert.equal(tabProfilCadangan.href, '/akun');

    // Rute anak dari /akun tetap memuat /hapus-akun (berdasar saklar), /kebijakan-privasi, /terima-kebijakan
    const anak = navV2.RUTE_ANAK_DARI_LAYAR['/akun'];
    assert.ok(anak.some((a) => a.href === '/hapus-akun' && a.saklar === 'kelolaDataAkun'));
    assert.ok(anak.some((a) => a.href === '/kebijakan-privasi'));
    assert.ok(anak.some((a) => a.href === '/terima-kebijakan'));
  });
});

// ---------------------------------------------------------------------------------------------
describe('Email utuh, mode tampilan lokal berpenanda teks, dan kontrak unduh data v1', () => {
  test('Email panjang tampil utuh tanpa potongan/numberOfLines (sabotase #5)', () => {
    const emailPanjang = 'siswa.percobaan.nama.sangat.panjang.sekali.2026@sekolahmenengahatas.sch.id';
    assert.equal(akunV2.emailTampilV2(emailPanjang), emailPanjang);
    assert.equal(akunV2.emailTampilV2('   '), akunV2.TEKS_AKUN_PRIVASI_V2.emailKosong);
    assert.equal(akunV2.emailTampilV2(null), akunV2.TEKS_AKUN_PRIVASI_V2.emailKosong);

    const akunSrc = baca('components/screens/v2/AkunPrivasiV2.tsx');
    // Teks email tidak boleh punya prop baris / numberOfLines maupun ellipsizeMode
    assert.match(akunSrc, /<Teks\s+varian="badanKecil"\s+gaya=\{s\.emailUtuh\}>\s*\{emailTampilV2\(pengguna\.email\)\}\s*<\/Teks>/);
    const barisEmail = /<Teks[^>]*>[\s\S]{0,60}emailTampilV2\(pengguna\.email\)/.exec(akunSrc);
    assert.ok(barisEmail, 'Elemen Teks email harus ada');
    assert.doesNotMatch(barisEmail[0], /baris=|numberOfLines=|ellipsizeMode=/);
    assert.doesNotMatch(akunSrc, /numberOfLines=/);
  });

  test('Mode tampilan: tiga pilihan, penanda tertulis (bukan hanya warna), hanya lokal di perangkat (sabotase #6 & #10)', () => {
    assert.deepEqual(
      modeLib.TEKS_MODE_TAMPILAN.opsi.map((o) => ({ nilai: o.nilai, label: o.label })),
      [
        { nilai: 'sistem', label: 'Ikuti sistem' },
        { nilai: 'terang', label: 'Terang' },
        { nilai: 'gelap', label: 'Gelap' },
      ]
    );

    const akunSrc = baca('components/screens/v2/AkunPrivasiV2.tsx');
    assert.match(akunSrc, /accessibilityRole="radiogroup"/);
    assert.match(akunSrc, /peran="radio"/);
    assert.match(akunSrc, /label=\{aktif \? `\$\{o\.label\}, \$\{T\.modeAktif\}` : o\.label\}/);
    assert.match(akunSrc, /terpilih=\{aktif\}/);
    assert.match(akunSrc, /dicentang=\{aktif\}/);
    assert.match(akunSrc, /onPress=\{\(\) => ubahPilihan\(o\.nilai\)\}/);
    // Wajib ada penanda teks tertulis `T.modeAktif` ("Aktif") selain ikon centang
    assert.match(akunSrc, /\{aktif \? \([\s\S]*?<Ikon nama="centang"[\s\S]*?<Teks[^>]*>\s*\{T\.modeAktif\}\s*<\/Teks>[\s\S]*?\) : null\}/);
    assert.equal(akunV2.TEKS_AKUN_PRIVASI_V2.modeAktif, 'Aktif');

    // Tidak boleh mengirim pilihan mode ke server/jaringan
    assert.doesNotMatch(akunSrc, /\b(fetch|apiFetch|XMLHttpRequest|axios)\s*\(/);
    assert.doesNotMatch(baca('lib/simpanModeTampilan.ts'), /\b(fetch|apiFetch|XMLHttpRequest|axios)\s*\(|https?:\/\//);
  });

  test('Unduh data memanggil rute v1 (GET /pengguna/saya/ekspor) dengan keadaan memuat, berhasil, dan galat + Coba lagi (sabotase #3)', () => {
    const akunSrc = baca('components/screens/v2/AkunPrivasiV2.tsx');
    assert.match(akunSrc, /import \{ useUnduhDataSaya \} from '\.\.\/\.\.\/\.\.\/hooks\/useDataAkun';/);
    assert.match(akunSrc, /const unduh = useUnduhDataSaya\(\);/);
    assert.match(akunSrc, /unduh\.isPending \? T\.unduhProses : T\.unduh/);
    assert.match(akunSrc, /\{unduh\.isSuccess \?[\s\S]*\{T\.unduhSelesai\}/);
    assert.match(akunSrc, /\{unduh\.isError \?[\s\S]*pesanGalatUnduhV2\(unduh\.error\.kode\)[\s\S]*label=\{T\.cobaLagi\}[\s\S]*onPress=\{\(\) => unduh\.mutate\(\)\}/);

    // Rute API v1 tidak berubah
    assert.match(baca('hooks/useDataAkun.ts'), /const data = await eksporDataSaya\(token!\);/);
    assert.match(baca('api/auth.ts'), /apiFetch<unknown>\('\/pengguna\/saya\/ekspor', \{ token \}\)/);

    assert.match(akunV2.pesanGalatUnduhV2('JARINGAN'), /Gagal terhubung/);
    assert.match(akunV2.pesanGalatUnduhV2('EKSPOR_TERLALU_BESAR'), /Hubungi tim LANJUT/);
    assert.equal(akunV2.bisaCobaLagiUnduh('JARINGAN'), true);
    assert.equal(akunV2.bisaCobaLagiUnduh('EKSPOR_TERLALU_BESAR'), false);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Hapus akun: keamanan identitas ulang, penegasan eksplisit, gaya tenang terpisah, dan pembersihan v1', () => {
  test('Tidak mengirim apa pun tanpa kata sandi DAN penegasan eksplisit; rute & pembersihan identik v1 (sabotase #1, #2, #3, #4)', () => {
    assert.equal(akunV2.PENEGASAN_HAPUS_AKUN, PENEGASAN_HAPUS_AKUN);
    assert.equal(akunV2.siapHapus({ paham: false, metode: 'sandi', kataSandi: 'rahasia', kodeEmail: '' }), false);
    assert.equal(akunV2.siapHapus({ paham: true, metode: 'sandi', kataSandi: '', kodeEmail: '' }), false);
    assert.equal(akunV2.siapHapus({ paham: true, metode: 'sandi', kataSandi: 'rahasia', kodeEmail: '' }), true);
    assert.equal(akunV2.siapHapus({ paham: true, metode: 'kode', kataSandi: '', kodeEmail: '12345' }), false);
    assert.equal(akunV2.siapHapus({ paham: true, metode: 'kode', kataSandi: '', kodeEmail: '123456' }), true);
    assert.deepEqual(akunV2.badanHapusAkun({ metode: 'sandi', kataSandi: 'abc', kodeEmail: '' }), {
      penegasan: PENEGASAN_HAPUS_AKUN,
      kata_sandi: 'abc',
    });

    const hapusSrc = baca('components/screens/v2/HapusAkunV2.tsx');
    // Memakai hook v1 (yang memanggil DELETE /pengguna/saya + selesaiHapusAkun())
    assert.match(hapusSrc, /import \{ useHapusAkun, useKirimKodeHapus \} from '\.\.\/\.\.\/\.\.\/hooks\/useDataAkun';/);
    assert.match(hapusSrc, /const hapus = useHapusAkun\(\);/);
    // Guard ketat sebelum mutate: wajib siapHapus({ paham, metode, kataSandi, kodeEmail })
    assert.match(
      hapusSrc,
      /const kirim = \(\) => \{\s*if \(!siapHapus\(\{ paham, metode, kataSandi, kodeEmail \}\)\) \{\s*setBelumLengkap\(true\);\s*return;\s*\}\s*setBelumLengkap\(false\);\s*hapus\.mutate\(\{ metode, kataSandi, kodeEmail \}\);\s*\};/
    );
    // Kotak centang penegasan eksplisit + input kata sandi tersembunyi (jenis="sandi")
    assert.match(hapusSrc, /<Sentuh[\s\S]*peran="checkbox"[\s\S]*label=\{T\.paham\}[\s\S]*dicentang=\{paham\}/);
    assert.match(hapusSrc, /<Isian[\s\S]*label=\{T\.labelSandi\}[\s\S]*jenis="sandi"[\s\S]*nilai=\{kataSandi\}/);
    assert.match(hapusSrc, /pesanGalatHapusV2\(hapus\.error\.kode\)/);
    assert.match(hapusSrc, /<KeyboardAvoidingView/);

    // Kontrak API DELETE /pengguna/saya dan pembersihan AuthProvider utuh
    const hookData = baca('hooks/useDataAkun.ts');
    assert.match(hookData, /mutationFn: \(isian\) => hapusAkunSaya\(token!, badanHapusAkun\(isian\)\),/);
    assert.match(hookData, /onSuccess: \(\) => selesaiHapusAkun\(\),/);
    assert.match(baca('api/auth.ts'), /apiFetch\('\/pengguna\/saya', \{ method: 'DELETE', body: data, token \}\)/);
    const auth = baca('providers/AuthProvider.tsx');
    assert.match(auth, /const selesaiHapusAkun = useCallback[\s\S]*authApi\.hapusSesiLokal\(\)[\s\S]*authApi\.hapusProfilLokalAkun\(penggunaId\)[\s\S]*hapusDataAkun\(queryClient\)[\s\S]*setAlasanKeluar\('akun_dihapus'\)[\s\S]*setStatus\('keluar'\)/);
  });

  test('Kartu & tombol hapus akun terpisah dengan pemisah visual, tanda bahaya tertulis, dan bukan tombol utama (sabotase #7)', () => {
    const akunSrc = baca('components/screens/v2/AkunPrivasiV2.tsx');
    const hapusSrc = baca('components/screens/v2/HapusAkunV2.tsx');

    // Pemisah visual di kedua layar
    assert.match(akunSrc, /s\.pemisahBahaya/);
    assert.match(hapusSrc, /s\.pemisahBahaya/);
    // Tanda bahaya tertulis + ikon waspada (bukan hanya warna merah)
    assert.match(akunSrc, /<Ikon nama="waspada"[\s\S]*\{T\.tandaPermanen\}/);
    assert.match(hapusSrc, /<Ikon nama="waspada"[\s\S]*\{T\.tidakBisaBatal\}/);
    // Tombol hapus TIDAK BOLEH memakai <Tombol varian="utama" ... />
    assert.doesNotMatch(akunSrc, /<Tombol[^>]*varian="utama"[^>]*label=\{T\.bukaHapus\}|<Tombol[^>]*label=\{T\.bukaHapus\}[^>]*varian="utama"/);
    assert.doesNotMatch(hapusSrc, /<Tombol[^>]*varian="utama"/);
    assert.match(akunSrc, /s\.tombolBahaya[\s\S]*warna\.galatLatar[\s\S]*\{T\.bukaHapus\}/);
    assert.match(hapusSrc, /s\.tombolBahaya[\s\S]*warna\.galatLatar[\s\S]*T\.tombolHapus/);
    // Urutan susunan kartu di /akun: Akunku -> Tampilan -> Datamu -> Hapus akun -> Keluar
    const idxAkunku = akunSrc.indexOf('T.kartuAkunku');
    const idxTampilan = akunSrc.indexOf('TEKS_MODE_TAMPILAN.judul');
    const idxDatamu = akunSrc.indexOf('T.kartuDatamu');
    const idxHapus = akunSrc.indexOf('T.kartuHapus');
    const idxKeluar = akunSrc.indexOf('T.keluarProses');
    assert.ok(idxAkunku < idxTampilan && idxTampilan < idxDatamu && idxDatamu < idxHapus && idxHapus < idxKeluar, 'Urutan kartu harus: Akunku -> Tampilan -> Datamu -> Hapus akun -> Keluar');
  });

  test('Nada tenang, tanpa membujuk atau menakut-nakuti, dan tanpa klaim privasi baru', () => {
    const semuaTeks = [
      ...Object.values(akunV2.TEKS_AKUN_PRIVASI_V2),
      ...akunV2.YANG_IKUT_TERHAPUS_V2,
      akunV2.GALAT_UNDUH_UMUM_V2,
      akunV2.GALAT_HAPUS_UMUM_V2,
      akunV2.pesanGalatHapusV2('KREDENSIAL_SALAH'),
      akunV2.pesanGalatHapusV2('JARINGAN'),
      akunV2.pesanGalatUnduhV2('JARINGAN'),
    ].join(' ');

    assert.doesNotMatch(semuaTeks, /\b(yakin|sayang|jangan pergi|pikirkan lagi|menyesal|rugi|kehilangan segalanya)\b/i);
    assert.doesNotMatch(semuaTeks, /enkripsi end-to-end|hanya kamu yang bisa|tidak pernah dilihat siapa pun|cadangan dihapus segera|masa tenggang|dipulihkan dalam \d+/i);
    assert.doesNotMatch(semuaTeks, /Jalur Saya/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Batas 40 kata, aksesibilitas 44 pt, token 0 HEX, gerbang rilis, dan perbaikan kecil 036', () => {
  test('Maksimal 40 kata teks tetap pada setiap keadaan layar /akun dan /hapus-akun', () => {
    assert.equal(akunV2.BATAS_KATA_AKUN_PRIVASI, 40);
    for (const [keadaan, daftar] of Object.entries(akunV2.teksTetapAkunPrivasiV2)) {
      const jumlah = akunV2.hitungKataAkunPrivasi(daftar.join(' '));
      assert.ok(jumlah <= 40, `Keadaan "${keadaan}" memuat ${jumlah} kata (> 40): ${daftar.join(' | ')}`);
    }
  });

  test('Semua kontrol berlabel, target sentuh >= 44 pt (lewat Sentuh/Tombol/Isian), dan ikon Phosphor', () => {
    for (const rel of KOMPONEN_037) {
      const isi = baca(rel);
      assert.doesNotMatch(isi, /\b(Pressable|Touchable\w*|TextInput)\b/, `${rel} harus memakai Sentuh/Tombol/Isian v2`);
      assert.doesNotMatch(isi, /from '[^']*\/ui\/Ikon'/, `${rel} harus memakai Ikon Phosphor v2`);
    }
    assert.match(baca('components/v2/IkonV2.tsx'), /DownloadSimple/);
    assert.match(baca('components/v2/IkonV2.tsx'), /SignOut/);
  });

  test('0 HEX langsung di seluruh berkas 037 dan tidak ada warna ungu terlarang (sabotase #9)', () => {
    const POLA_WARNA = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(.*)$/i;
    const unguTerlarang = new RegExp('#' + '6a3dff', 'i');
    for (const rel of BERKAS_BARU_037) {
      const sf = ast(rel);
      jelajah(sf, (n) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && POLA_WARNA.test(n.text)) {
          assert.fail(`Kode warna langsung ditemukan di ${rel}: "${n.text}"`);
        }
      });
      assert.doesNotMatch(baca(rel), unguTerlarang);
    }
    for (const rel of ['docs/peta-akun-privasi-v2.md', 'docs/draf-teks-akun-privasi-v2.md']) {
      assert.doesNotMatch(baca(rel), unguTerlarang);
    }
  });

  test('Perbaikan kecil dari 036: tombol Tambah catatan di keadaan kosong Rekam Jejak v2 rata/selebar kartu', () => {
    const rj = baca('components/screens/v2/RekamJejakV2.tsx');
    assert.match(rj, /\{T\.kosongTeks\}[\s\S]*?<Tombol varian="utama" label=\{T\.tambah\} penuh onPress=\{tulis\} \/>/);
  });

  test('Gerbang rilis menahan teks DRAF 037 di bawah navigasi-v2, dokumen lengkap, server & kompatibilitas utuh', () => {
    const entri = gerbang.TEKS.find((t) => t.id === 'navigasi-v2');
    assert.ok(entri);
    for (const rel of [
      'lib/akunPrivasiV2.ts',
      'components/screens/v2/AkunPrivasiV2.tsx',
      'components/screens/v2/HapusAkunV2.tsx',
      'docs/draf-teks-akun-privasi-v2.md',
    ]) {
      assert.ok(entri.berkas.includes(rel), `${rel} belum terdaftar di periksa-gerbang-rilis.js`);
    }
    assert.ok(!baca('docs/persetujuan-teks-rilis.json').includes('navigasi-v2'));

    // Dokumen draf memuat setiap teks v2
    const docDraf = baca('docs/draf-teks-akun-privasi-v2.md');
    assert.match(docDraf, /DRAF/);
    for (const teks of Object.values(akunV2.TEKS_AKUN_PRIVASI_V2)) {
      assert.ok(docDraf.includes(teks), `Teks "${teks}" belum tercatat di docs/draf-teks-akun-privasi-v2.md`);
    }
    for (const butir of akunV2.YANG_IKUT_TERHAPUS_V2) {
      assert.ok(docDraf.includes(butir), `Butir "${butir}" belum tercatat di docs/draf-teks-akun-privasi-v2.md`);
    }

    // Simulasi gerbang rilis: profil build yang menyalakan EXPO_PUBLIC_NAVIGASI_V2 saat teks 037 DRAF tertahan
    const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'gerbang-037-'));
    try {
      const tulis = (rel, isi) => {
        fs.mkdirSync(path.dirname(path.join(akar, rel)), { recursive: true });
        fs.writeFileSync(path.join(akar, rel), typeof isi === 'string' ? isi : JSON.stringify(isi));
      };
      tulis('lib/kebijakan-privasi.json', { versi: 1, status: 'Berlaku.', ringkasan: ['Ringkas.'], isi: [] });
      for (const rel of entri.berkas) {
        tulis(rel, rel.includes('akunPrivasiV2') || rel.includes('draf-teks-akun-privasi-v2') ? '// TEKS DRAF\n' : 'export const X = 1;\n');
      }
      tulis('eas.json', { build: { coba: { env: { EXPO_PUBLIC_NAVIGASI_V2: '1' } } } });
      const pesan = gerbang.periksa(akar).map((m) => m.pesan);
      assert.ok(pesan.includes('Teks navigasi v2 dan Arah Saya: masih draf dan belum disetujui.'), pesan.join(' | '));
    } finally {
      fs.rmSync(akar, { recursive: true, force: true });
    }

    // Dokumen peta & uji HP lengkap
    const peta = baca('docs/peta-akun-privasi-v2.md');
    assert.match(peta, /Penyebab Email Terpotong/);
    assert.match(peta, /selesaiHapusAkun/);
    const ujiHp = baca('docs/uji-hp-expo-go.md');
    assert.match(ujiHp, /Akun & Privasi v2 \(LANJUT_037\)/);
    assert.match(ujiHp, /--clear/);
  });
});
