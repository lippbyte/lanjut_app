// LANJUT_042: Jejak Waktu jujur saat jadwal seleksi 2027 belum resmi, pemeriksa kesegaran 14 hari
// (peringatan non-gagal), dan Langkah Saya tidak buntu untuk semua jenjang (Opsi A — riset prodi
// memakai kontrak v1 POST /butir-pribadi tanpa perubahan server/API/skema).

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { muatModulApp } = require('./muat-ts-app');
const { simpanSkema } = require('../src/modul/butir-pribadi/butir-pribadi.skema');
const audit = require('../tools/audit-siap-tester');
const gerbang = require('../tools/periksa-gerbang-rilis');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const fitur = muatModulApp('lib/fiturApp');
const linimasa = muatModulApp('lib/linimasa');
const jejak = muatModulApp('lib/jejakWaktuV2');
const langkah = muatModulApp('lib/langkahSayaV2');
const daftarPeriksa = muatModulApp('lib/daftarPeriksa');
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

const DATA_LINIMASA = JSON.parse(baca('server/data-konten/linimasa.json'));
const DATA_PRODI = JSON.parse(baca('server/data-konten/prodi.json'));

// 2026-11-30 09:00:00 WIB = 2026-11-30T02:00:00.000Z (sehari sesudah entri susulan-tka berakhir 29 Nov 2026)
const TGL_30_NOV_2026_WIB = Date.parse('2026-11-30T02:00:00.000Z');
// 2026-11-27 09:00:00 WIB = 2026-11-27T02:00:00.000Z
const TGL_27_NOV_2026_WIB = Date.parse('2026-11-27T02:00:00.000Z');

// Simulasi isi `tahapan_linimasa` di lanjut_dev (3 TKA terverifikasi 2026-09-27, 3 mockup belum diverifikasi)
const TAHAPAN_DEV_SIMULASI = DATA_LINIMASA.data.map((d) => ({
  id: d.id,
  judul: d.judul,
  tanggal_mulai: d.tanggal_mulai,
  tanggal_selesai: d.tanggal_selesai,
  jalur_seleksi: d.jalur,
  sumber: DATA_LINIMASA.sumber,
  pemilik: DATA_LINIMASA.pemilik,
  status_verifikasi: d.asal === 'resmi' ? 'terverifikasi' : 'belum_diverifikasi',
  asal: d.asal,
  url_sumber: d.url_sumber,
  diperiksa_pada: d.asal === 'resmi' ? '2026-09-27' : null,
}));

// ---------------------------------------------------------------------------------------------
describe('LANJUT_042 — Saklar NAVIGASI_V2 mati & isolasi v1 (sabotase #10 & #12)', () => {
  test('Saklar NAVIGASI_V2 tetap mati bawaan dan layar v1 Jejak Waktu / Langkah Saya tidak berubah', () => {
    assert.equal(fitur.navigasiV2Aktif(undefined), false);
    assert.equal(muatKonfigApp({}).navigasiV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_NAVIGASI_V2: '0' }).navigasiV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_NAVIGASI_V2: '1' }).navigasiV2, true);

    assert.match(baca('app/(app)/linimasa.tsx'), /LinimasaScreen/);
    assert.match(baca('app/(app)/daftar-periksa.tsx'), /DaftarPeriksaScreen/);
    for (const v1 of [
      'components/screens/LinimasaScreen.tsx',
      'components/screens/DaftarPeriksaScreen.tsx',
      'components/screens/EksplorasiTujuanScreen.tsx',
    ]) {
      assert.doesNotMatch(baca(v1), /STATUS_JADWAL_BERIKUTNYA|keadaanKosongJejakWaktu|aksiTambahRisetProdi|ModalRisetProdiV2/, v1);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('LANJUT_042 — Jejak Waktu jujur per jenjang & fakta 2027 di sumber data (sabotase #1, #2, #3, #4)', () => {
  test('Sumber data linimasa memuat fakta 2027 belum resmi (snpmb.id, 2026-11-27) dan 0 tanggal perkiraan 2027 berstatus resmi', () => {
    const fakta = DATA_LINIMASA.status_jadwal_berikutnya;
    assert.ok(fakta, 'server/data-konten/linimasa.json harus memuat status_jadwal_berikutnya');
    assert.equal(fakta.status, 'belum_resmi');
    assert.equal(fakta.sumber, 'snpmb.id (beranda)');
    assert.equal(fakta.diperiksa_pada, '2026-11-27');

    // Tidak ada entri 2027 di linimasa.json yang ditandai resmi atau terverifikasi
    const entri2027Resmi = DATA_LINIMASA.data.filter(
      (d) =>
        (String(d.tanggal_mulai || '').startsWith('2027') || String(d.tanggal_selesai || '').startsWith('2027')) &&
        (d.asal === 'resmi' || d.diperiksa_pada !== null)
    );
    assert.deepEqual(entri2027Resmi, [], 'Tanggal 2027 yang belum resmi dilarang ditandai resmi/terverifikasi');

    // `lib/linimasa.ts` membaca dari berkas sumber tunggal, bukan hardcoded di komponen
    assert.deepEqual(linimasa.STATUS_JADWAL_BERIKUTNYA, fakta);
    const layarJejak = baca('components/screens/v2/JejakWaktuV2.tsx');
    const modulJejak = baca('lib/jejakWaktuV2.ts');
    assert.doesNotMatch(layarJejak, /2026-11-27|27 November 2026|snpmb\.id/i, 'Tanggal periksa/sumber tidak boleh ditulis tetap di JejakWaktuV2.tsx');
    assert.doesNotMatch(modulJejak, /2026-11-27|27 November 2026|snpmb\.id/i, 'Tanggal periksa/sumber harus dibaca dari data, bukan ditulis tetap di lib/jejakWaktuV2.ts');
  });

  test('Hari ini = 30 Nov 2026: kelas 12 tanpa jadwal aktif tampilkan keadaan kosong "belum resmi" + tanggal periksa dari data; 10–11 & SMP jujur ke Langkah Saya', () => {
    // 27 Nov 2026: susulan-tka masih aktif (Segera)
    const k12Nov27 = jejak.susunJejakWaktu({
      kelas: '12',
      tahapanLinimasa: TAHAPAN_DEV_SIMULASI,
      sekarangMs: TGL_27_NOV_2026_WIB,
    });
    assert.equal(jejak.adaJadwalAktif(k12Nov27), true);
    assert.equal(k12Nov27.segera.length, 1);
    assert.equal(k12Nov27.segera[0].id, 'linimasa:susulan-tka');

    // 30 Nov 2026: seluruh 3 TKA masuk Sudah lewat → 0 jadwal aktif → kartu kosong kelas 12 HARUS tampil!
    const k12Nov30 = jejak.susunJejakWaktu({
      kelas: '12',
      tahapanLinimasa: TAHAPAN_DEV_SIMULASI,
      sekarangMs: TGL_30_NOV_2026_WIB,
    });
    assert.equal(k12Nov30.segera.length, 0);
    assert.equal(k12Nov30.berikutnya.length, 0);
    assert.equal(k12Nov30.sudahLewat.length, 3);
    assert.equal(jejak.adaJadwalAktif(k12Nov30), false);

    // Pastikan JejakWaktuV2 memeriksa `!punyaJadwalAktif` (adaJadwalAktif), bukan `total === 0`
    const layar = baca('components/screens/v2/JejakWaktuV2.tsx');
    assert.match(layar, /const punyaJadwalAktif = adaJadwalAktif\(data\.jadwal\);/);
    assert.match(layar, /\{!punyaJadwalAktif \?/);
    assert.match(layar, /keadaanKosongJejakWaktu\(data\.kelas\)/);

    // Keadaan kosong kelas 12 membaca tanggal dari argumen data (bukti dinamis, bukan hardcoded)
    const kosong12 = jejak.keadaanKosongJejakWaktu('12');
    assert.match(kosong12.judul, /2027.*belum diumumkan/i);
    assert.match(kosong12.teks, /SNPMB.*belum.*2027/i);
    assert.match(kosong12.teks, /tidak.*tampilkan/i);
    assert.equal(kosong12.metaPeriksa, 'Dicek 27 November 2026 · snpmb.id (beranda)');
    assert.equal(kosong12.tombolHref, '/langkah-saya');
    // Tidak ada tanggal perkiraan (nama bulan + 2027) di teks kosong
    assert.doesNotMatch(
      `${kosong12.judul} ${kosong12.teks}`,
      /\b(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+2027\b/i
    );

    // Ubah objek data suntikan → metaPeriksa ikut berubah (membuktikan bukan hardcoded!)
    const kosong12Uji = jejak.keadaanKosongJejakWaktu('12', {
      judul: 'Jadwal seleksi 2027',
      status: 'belum_resmi',
      sumber: 'snpmb.id (uji)',
      diperiksa_pada: '2026-12-05',
    });
    assert.equal(kosong12Uji.metaPeriksa, 'Dicek 5 Desember 2026 · snpmb.id (uji)');

    // Kelas 10 & 11: jujur belum tersedia, TIDAK menunjuk /discover atau /jalur-tujuan
    for (const k of ['10', '11']) {
      const h = jejak.susunJejakWaktu({ kelas: k, tahapanLinimasa: TAHAPAN_DEV_SIMULASI, sekarangMs: TGL_30_NOV_2026_WIB });
      assert.equal(jejak.adaJadwalAktif(h), false);
      const ks = jejak.keadaanKosongJejakWaktu(k);
      assert.match(ks.judul, /10–11.*belum tersedia/i);
      assert.equal(ks.metaPeriksa, null);
      assert.equal(ks.tombolHref, '/langkah-saya');
      assert.doesNotMatch(`${ks.judul} ${ks.teks} ${ks.tombolLabel}`, /Jalur Saya|Jelajah|\/discover|\/jalur-tujuan/i);
    }

    // SMP 7, 8, 9: jujur belum tersedia, menunjuk Langkah Saya (bukan Jelajah/Jalur Saya)
    for (const k of ['7', '8', '9']) {
      const h = jejak.susunJejakWaktu({ kelas: k, tahapanLinimasa: TAHAPAN_DEV_SIMULASI, eventSekolah: [], sekarangMs: TGL_30_NOV_2026_WIB });
      assert.equal(jejak.adaJadwalAktif(h), false);
      const ks = jejak.keadaanKosongJejakWaktu(k);
      assert.match(ks.judul, /SMP.*belum tersedia/i);
      assert.equal(ks.metaPeriksa, null);
      assert.equal(ks.tombolHref, '/langkah-saya');
      assert.doesNotMatch(`${ks.judul} ${ks.teks} ${ks.tombolLabel}`, /Jalur Saya|Jelajah|\/discover|\/jalur-tujuan/i);
    }

    // `aksiKosongJejakWaktu` tidak lagi mengarah ke /discover walau discoverAktif = true
    assert.deepEqual(jejak.aksiKosongJejakWaktu(true), { label: 'Langkah Saya', href: '/langkah-saya' });
    assert.deepEqual(jejak.aksiKosongJejakWaktu(false), { label: 'Langkah Saya', href: '/langkah-saya' });
  });

  test('Entri dummy aktif di tes membuat keadaan kosong kelas 12 hilang sendiri', () => {
    const dummyAktif = [
      ...TAHAPAN_DEV_SIMULASI,
      {
        id: 'uji-resmi-2027',
        judul: 'Pengumuman resmi uji 2027',
        tanggal_mulai: '2027-01-10',
        tanggal_selesai: '2027-01-20',
        jalur_seleksi: 'SNBP',
        sumber: 'resmi',
        pemilik: 'tim',
        status_verifikasi: 'terverifikasi',
        asal: 'resmi',
        url_sumber: 'https://snpmb.id/',
        diperiksa_pada: '2026-12-01',
      },
    ];
    const hasil = jejak.susunJejakWaktu({
      kelas: '12',
      tahapanLinimasa: dummyAktif,
      sekarangMs: TGL_30_NOV_2026_WIB,
    });
    assert.equal(jejak.adaJadwalAktif(hasil), true);
    assert.equal(hasil.berikutnya.length, 1);
    assert.equal(hasil.berikutnya[0].id, 'linimasa:uji-resmi-2027');
  });
});

// ---------------------------------------------------------------------------------------------
describe('LANJUT_042 — Pemeriksa kesegaran 14 hari: peringatan non-gagal (sabotase #9)', () => {
  test('diperiksa_pada <= 14 hari → segar (tanpa peringatan); > 14 hari → "jadwal perlu diperiksa ulang" tanpa gagalkan CLI', () => {
    const tglHari14 = Date.parse('2026-12-11T02:00:00.000Z'); // tepat 14 hari sesudah 2026-11-27
    const tglHari15 = Date.parse('2026-12-12T02:00:00.000Z'); // 15 hari (> 14 hari)

    const segar = linimasa.periksaKesegaranJadwal(DATA_LINIMASA.status_jadwal_berikutnya, tglHari14);
    assert.equal(segar.segar, true);
    assert.equal(segar.umurHari, 14);
    assert.equal(segar.peringatan, null);

    const usang = linimasa.periksaKesegaranJadwal(DATA_LINIMASA.status_jadwal_berikutnya, tglHari15);
    assert.equal(usang.segar, false);
    assert.equal(usang.umurHari, 15);
    assert.equal(usang.peringatan, 'jadwal perlu diperiksa ulang');

    // Audit tool mengekspos hasil yang sama tanpa melempar galat
    const auditUsang = audit.auditKesegaranJadwal(tglHari15);
    assert.equal(auditUsang.segar, false);
    assert.equal(auditUsang.peringatan, 'jadwal perlu diperiksa ulang');

    // Jalankan CLI `audit-siap-tester.js --tanpa-db` secara nyata → WAJIB keluar 0 (tidak menggagalkan)
    const stdout = execFileSync(process.execPath, [path.join(AKAR_APP, 'server', 'tools', 'audit-siap-tester.js'), '--tanpa-db'], {
      cwd: path.join(AKAR_APP, 'server'),
      encoding: 'utf8',
    });
    const parsed = JSON.parse(stdout);
    assert.equal(parsed.kesegaranJadwal.batasHari, 14);
    assert.equal(parsed.kesegaranJadwal.diperiksaPada, '2026-11-27');
    assert.equal(parsed.kesegaranJadwal.sumber, 'snpmb.id (beranda)');
    // Pastikan kode audit-siap-tester.js tidak pernah memanggil process.exit(1) atau throw karena kesegaranJadwal
    const srcAudit = baca('server/tools/audit-siap-tester.js');
    assert.doesNotMatch(srcAudit, /kesegaranJadwal[\s\S]{0,160}(process\.exit|throw new Error)/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('LANJUT_042 — Langkah Saya Opsi A: tombol riset prodi & kontrak v1 POST /butir-pribadi (sabotase #5, #6, #7, #8)', () => {
  test('Tombol "Tambah langkah riset prodi" muncul untuk kelas 10, 11, 12 dan TIDAK muncul untuk SMP (7, 8, 9)', () => {
    for (const k of ['10', '11', '12']) {
      assert.equal(langkah.bolehTambahRisetProdi(k), true, `kelas ${k} harus boleh tambah riset prodi`);
      assert.deepEqual(langkah.aksiTambahRisetProdi(k), {
        jenis: 'riset_prodi',
        label: 'Tambah langkah riset prodi',
      });
    }
    for (const k of ['7', '8', '9', null, undefined]) {
      assert.equal(langkah.bolehTambahRisetProdi(k), false, `kelas ${k} tidak boleh munculkan tombol riset prodi`);
      assert.equal(langkah.aksiTambahRisetProdi(k), null);
    }

    // Tombol SMP "Tambah jadwal" tetap utuh
    assert.deepEqual(langkah.aksiKosongLangkahSaya({ kelas: '8', bisaEventSmp: true, alatBelajar: false }), {
      jenis: 'tambah_jadwal',
      label: 'Tambah jadwal',
    });

    // Layar LangkahSayaV2 memasang tombol riset prodi di keadaan kosong (fallback saat aksiKosong null) & di bawah daftar, membuka Modal v2 (BUKAN rute v1)
    const layar = baca('components/screens/v2/LangkahSayaV2.tsx');
    assert.match(layar, /const aksiRisetProdi = aksiTambahRisetProdi\(pengguna\?\.kelas\);/);
    assert.match(layar, /const labelTombolKosong = aksiKosong\?\.label \?\? aksiRisetProdi\?\.label;/);
    assert.match(layar, /\{aksiRisetProdi \? \([\s\S]*onPress=\{bukaModalRiset\}/);
    assert.match(layar, /function ModalRisetProdiV2/);
    // ModalRisetProdiV2 tidak boleh memanggil router.push ke rute v1 mana pun
    const bagianModal = layar.slice(layar.indexOf('function ModalRisetProdiV2'));
    assert.doesNotMatch(bagianModal, /router\.(push|replace)|\/pilih-mapel|\/eksplorasi-tujuan|\/daftar-periksa/);
  });

  test('Kontrak payload POST /butir-pribadi identik persis dengan v1 (EksplorasiTujuanScreen.tsx) dan lolos skema server tanpa jenis baru', () => {
    // Bandingkan langsung dengan pemanggilan v1 di EksplorasiTujuanScreen.tsx:243
    assert.match(
      baca('components/screens/EksplorasiTujuanScreen.tsx'),
      /simpan\.mutate\(\{\s*jenis:\s*'riset_kampus',\s*prodi_id:\s*prodiId\s*\}\)/
    );

    // Uji terhadap seluruh 19 prodi dari server/data-konten/prodi.json
    assert.equal(DATA_PRODI.data.length, 19);
    for (const p of DATA_PRODI.data) {
      const kiriman = langkah.bentukKirimanRisetProdi(p.id);
      assert.deepEqual(kiriman, { jenis: 'riset_kampus', prodi_id: p.id });
      assert.deepEqual(Object.keys(kiriman).sort(), ['jenis', 'prodi_id']);
      const hasilSkema = simpanSkema.safeParse(kiriman);
      assert.equal(hasilSkema.success, true, `skema server menolak prodi ${p.id}`);
      assert.deepEqual(hasilSkema.data, kiriman);
    }

    // Input kosong / > 64 karakter ditolak di klien
    assert.equal(langkah.bentukKirimanRisetProdi(''), null);
    assert.equal(langkah.bentukKirimanRisetProdi('   '), null);
    assert.equal(langkah.bentukKirimanRisetProdi('a'.repeat(65)), null);

    // Pastikan skema server tidak ditambah jenis baru selain mapel_tka dan riset_kampus
    assert.equal(simpanSkema.safeParse({ jenis: 'bebas', prodi_id: 'informatika' }).success, false);
    assert.equal(simpanSkema.safeParse({ jenis: 'riset_prodi', prodi_id: 'informatika' }).success, false);

    // Setelah tersimpan, butir riset_kampus masuk kategori Riset Kampus dan bisa dicentang/batal-centang
    const butirBaru = {
      id: 'bp-riset-1',
      jenis: 'riset_kampus',
      prodi_id: 'informatika',
      judul: 'Cari tahu lebih lanjut soal Informatika',
      kategori_id: 'riset-kampus',
      kategori_nama: 'Riset Kampus',
      selesai_pada: null,
      dibuat_pada: '2026-11-27T00:00:00.000Z',
    };
    const kategori = daftarPeriksa.gabungButirPribadi([], [butirBaru]);
    assert.equal(kategori.length, 1);
    assert.equal(kategori[0].id, 'riset-kampus');
    assert.equal(kategori[0].butir[0].judul, 'Cari tahu lebih lanjut soal Informatika');
    assert.deepEqual(
      langkah.rencanakanAlihButir({ butirId: 'bp-riset-1', pribadiIds: new Set(['bp-riset-1']), selesaiIds: new Set() }),
      { sasaran: 'butir_pribadi', id: 'bp-riset-1', selesai: true }
    );

    // Pencarian, pengelompokan rumpun, dan pesan galat 429 vs jaringan bekerja benar
    const cari = langkah.saringDaftarProdi(DATA_PRODI.data, 'informatika');
    assert.ok(cari.length >= 2 && cari.every((p) => /informatika/i.test(`${p.nama} ${p.rumpun}`)));
    const grup = langkah.kelompokkanProdiPerRumpun(DATA_PRODI.data);
    assert.equal(grup.length, 4);
    assert.equal(langkah.pesanGalatRisetProdi({ status: 429 }), langkah.TEKS_LANGKAH_SAYA.risetGalatBatasLaju);
    assert.equal(
      langkah.pesanGalatRisetProdi({ kode: 'TERLALU_BANYAK_PERMINTAAN' }),
      langkah.TEKS_LANGKAH_SAYA.risetGalatBatasLaju
    );
    assert.equal(langkah.pesanGalatRisetProdi({ status: 500 }), langkah.TEKS_LANGKAH_SAYA.risetGalatSimpan);
  });
});

// ---------------------------------------------------------------------------------------------
describe('LANJUT_042 — Batas 40 kata, token 0 HEX, kontras, dokumentasi, dan gerbang rilis (sabotase #11)', () => {
  test('Seluruh keadaan layar baru Jejak Waktu & Langkah Saya <= 40 kata dan kontras dua mode >= 4,5:1', () => {
    for (const kelas of ['7', '8', '9', '10', '11', '12', null]) {
      const teks = jejak.teksTetapJejakWaktu({
        keadaan: 'kosong',
        discoverAktif: true,
        kelas,
        adaSudahLewat: kelas === '12' || kelas === '8',
      });
      const jml = jejak.hitungKata(teks.join(' '));
      assert.ok(jml <= 40, `Jejak Waktu kosong kelas ${kelas}: ${jml} kata > 40`);
    }

    // Termasuk teks tanggal + sumber dari data pada kelas 12 masih <= 40 kata
    const ks12 = jejak.keadaanKosongJejakWaktu('12');
    const total12DenganData = jejak.hitungKata(
      [
        jejak.TEKS_JEJAK_WAKTU.judul,
        jejak.TEKS_JEJAK_WAKTU.ringkasan,
        ks12.judul,
        ks12.teks,
        ks12.metaPeriksa,
        ks12.tombolLabel,
        jejak.TEKS_JEJAK_WAKTU.sudahLewatJudul,
      ].join(' ')
    );
    assert.ok(total12DenganData <= 40, `Jejak Waktu kosong kelas 12 + data: ${total12DenganData} kata > 40`);

    for (const keadaan of [
      'kelas12_isi',
      'kelas12_pilih_jalur',
      'pribadi_isi',
      'kosong',
      'galat',
      'riset_pilih',
      'riset_kosong',
      'riset_cari_kosong',
      'riset_galat',
      'riset_konfirmasi',
    ]) {
      for (const kelas of ['8', '10', '11', '12']) {
        for (const adaGalatBatasLaju of [false, true]) {
          const teks = langkah.teksTetapLangkahSaya({
            keadaan,
            statusProgres: 'selesai',
            adaCatatanSnpmb: true,
            bisaEventSmp: kelas === '8',
            kelas,
            alatBelajar: false,
            adaGalatBatasLaju,
          });
          const jml = langkah.hitungKata(teks.join(' '));
          assert.ok(jml <= 40, `Langkah Saya (${keadaan}, kelas=${kelas}): ${jml} kata > 40`);
        }
      }
    }

    // Kontras token v2 di dua mode >= 4,5:1
    for (const [mode, w] of [
      ['terang', tema.warnaTerang],
      ['gelap', tema.warnaGelap],
    ]) {
      for (const [depan, latar] of [
        ['teks', 'permukaan'],
        ['teksSekunder', 'permukaan'],
        ['teks', 'halaman'],
        ['aksen', 'permukaan'],
        ['teksPadaAksen', 'aksen'],
      ]) {
        assert.ok(tema.lolos(w[depan], w[latar], 'teks'), `kontras gagal (${mode}): ${depan}/${latar}`);
      }
    }
  });

  test('0 HEX langsung & 0 ungu terlarang di berkas yang disentuh 042; dokumentasi, gerbang rilis, dan persetujuan utuh', () => {
    const POLA_WARNA = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(.*)$/i;
    const UNGU_TERLARANG = new RegExp('#' + '6a3dff', 'i');
    for (const rel of [
      'lib/linimasa.ts',
      'lib/jejakWaktuV2.ts',
      'lib/langkahSayaV2.ts',
      'hooks/useJejakWaktuV2.ts',
      'hooks/useLangkahSayaV2.ts',
      'components/screens/v2/JejakWaktuV2.tsx',
      'components/screens/v2/LangkahSayaV2.tsx',
    ]) {
      assert.doesNotMatch(baca(rel), UNGU_TERLARANG, `${rel}: ungu terlarang`);
      const sf = ast(rel);
      jelajah(sf, (n) => {
        if ((ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) && POLA_WARNA.test(n.text)) {
          assert.fail(`HEX langsung di ${rel}: "${n.text}"`);
        }
      });
    }

    // Semua berkas dokumen dan persetujuan tetap konsisten
    assert.ok(fs.existsSync(path.join(AKAR_APP, 'docs', 'rencana-042.md')));
    assert.match(baca('docs/uji-hp-expo-go.md'), /LANJUT_042/);
    assert.deepEqual(JSON.parse(baca('docs/persetujuan-teks-rilis.json')).disetujui, []);
    const entri = gerbang.TEKS.find((x) => x.id === 'navigasi-v2');
    for (const rel of ['lib/jejakWaktuV2.ts', 'lib/langkahSayaV2.ts', 'docs/draf-teks-jejak-waktu-v2.md']) {
      assert.ok(entri.berkas.includes(rel), `${rel} harus ada di entri navigasi-v2`);
    }
    // Kebijakan privasi tetap versi 1
    assert.equal(JSON.parse(baca('lib/kebijakan-privasi.json')).versi, 1);
  });
});
