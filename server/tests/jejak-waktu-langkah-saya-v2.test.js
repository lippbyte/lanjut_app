// LANJUT_032: Jejak Waktu (/jejak-waktu) dan Langkah Saya (/langkah-saya) v2 di balik saklar
// EXPO_PUBLIC_NAVIGASI_V2 (mati bawaan), termasuk keputusan 24 Nov (maskot di lingkaran #B4E1EB
// pada kedua mode terang & gelap).

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { muatModulApp } = require('./muat-ts-app');
const gerbang = require('../tools/periksa-gerbang-rilis');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const fitur = muatModulApp('lib/fiturApp');
const navV2 = muatModulApp('lib/navigasiV2');
const arahSaya = muatModulApp('lib/arahSaya');
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

function aturanBlokir(nilai) {
  const env = { ...process.env };
  delete env.EXPO_PUBLIC_NAVIGASI_V2;
  if (nilai !== undefined) env.EXPO_PUBLIC_NAVIGASI_V2 = nilai;
  const skrip =
    "const c=require('./metro.config.js');console.log(JSON.stringify([].concat(c.resolver.blockList||[]).map(r=>[r.source,r.flags])))";
  const baris = execFileSync(process.execPath, ['-e', skrip], {
    cwd: AKAR_APP,
    env,
    encoding: 'utf8',
    timeout: 60000,
  })
    .trim()
    .split('\n')
    .pop();
  return JSON.parse(baris).map(([s, f]) => new RegExp(s, f));
}
const terblokir = (aturan, berkas) => aturan.some((r) => r.test(berkas));

const BERKAS_BARU_032 = [
  'lib/jejakWaktuV2.ts',
  'lib/langkahSayaV2.ts',
  'hooks/useJejakWaktuV2.ts',
  'hooks/useLangkahSayaV2.ts',
  'components/screens/v2/JejakWaktuV2.tsx',
  'components/screens/v2/LangkahSayaV2.tsx',
  'app/(app)/jejak-waktu.tsx',
  'app/(app)/langkah-saya.tsx',
];

// ---------------------------------------------------------------------------------------------
describe('Saklar mati vs menyala: isolasi v1 dan sambungan navigasi v2', () => {
  test('Saklar mati: Beranda v1 (/linimasa) dan Daftar Periksa v1 (/daftar-periksa) tidak disentuh; saklar bawaan mati', () => {
    assert.equal(fitur.navigasiV2Aktif(undefined), false);
    assert.equal(fitur.navigasiV2Aktif({}), false);
    assert.equal(muatKonfigApp({}).navigasiV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_NAVIGASI_V2: '0' }).navigasiV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_NAVIGASI_V2: '1' }).navigasiV2, true);

    for (const b of [
      'eas.json',
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.dev.yml',
      'server/.env.example',
      'server/.env.production.example',
      'server/.env.railway.contoh',
    ]) {
      assert.ok(!baca(b).includes('NAVIGASI_V2'), b);
    }

    // Rute & layar v1 sama sekali tidak mengimpor v2
    assert.match(baca('app/(app)/linimasa.tsx'), /LinimasaScreen/);
    assert.match(baca('app/(app)/daftar-periksa.tsx'), /DaftarPeriksaScreen/);
    for (const v1 of [
      'components/screens/LinimasaScreen.tsx',
      'components/screens/DaftarPeriksaScreen.tsx',
      'components/screens/PersiapanEvent.tsx',
    ]) {
      assert.doesNotMatch(baca(v1), /jejakWaktuV2|langkahSayaV2|JejakWaktuV2|LangkahSayaV2|useTemaV2/, v1);
    }

    // Saat saklar mati, /jejak-waktu dan /langkah-saya keluar dari bundel Metro
    const mati = aturanBlokir(undefined);
    assert.ok(terblokir(mati, '/repo/app/(app)/jejak-waktu.tsx'));
    assert.ok(terblokir(mati, '/repo/app/(app)/langkah-saya.tsx'));
    assert.ok(!terblokir(mati, '/repo/app/(app)/linimasa.tsx'));
    assert.ok(!terblokir(mati, '/repo/app/(app)/daftar-periksa.tsx'));
  });

  test('Saklar menyala: tab Jejak Waktu membuka /jejak-waktu (bukan /linimasa); pintu Langkah Saya ke /langkah-saya', () => {
    const tabJejak = navV2.KONFIGURASI_TAB_V2.find((t) => t.id === 'jejak_waktu');
    assert.ok(tabJejak);
    assert.equal(tabJejak.href, '/jejak-waktu');
    assert.notEqual(tabJejak.href, '/linimasa');

    for (const discover of [false, true]) {
      const aktif = navV2.daftarTabV2({ discover, jalurTujuan: false, portofolio: false });
      assert.equal(aktif.find((t) => t.id === 'jejak_waktu').href, '/jejak-waktu');
    }

    const pintuJejak = navV2.PINTU_TAB_V2.find((p) => p.diRute === '/jejak-waktu');
    assert.deepEqual(pintuJejak, { diRute: '/jejak-waktu', keHref: '/langkah-saya', label: 'Langkah Saya' });

    const pintuArah = arahSaya.daftarPintuArahSaya({ discover: false, jalurTujuan: false, portofolio: false });
    assert.equal(pintuArah.find((p) => p.id === 'langkah_saya').href, '/langkah-saya');

    // Peta navigasi dan RUTE_V1_DIGANTIKAN_V2 mencatat penggantian beserta alasan
    const peta = baca('docs/peta-navigasi-v2.md');
    assert.ok(peta.includes('`/jejak-waktu`') && peta.includes('`/langkah-saya`'));
    assert.ok(navV2.RUTE_V1_DIGANTIKAN_V2['/linimasa'].alasan.length > 20);
    assert.ok(navV2.RUTE_V1_DIGANTIKAN_V2['/daftar-periksa'].alasan.length > 20);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Jejak Waktu v2: pengelompokan waktu Asia/Jakarta, tanpa tanggal karangan, tanpa alarm', () => {
  // 2026-10-01 00:00:00 WIB = 2026-09-30T17:00:00.000Z
  const TENGAH_MALAM_1_OKT_WIB = Date.parse('2026-09-30T17:00:00.000Z');
  // 2026-10-01 23:59:59.999 WIB = 2026-10-01T16:59:59.999Z
  const AKHIR_HARI_1_OKT_WIB = Date.parse('2026-10-01T16:59:59.999Z');
  // 2026-10-02 00:00:00 WIB = 2026-10-01T17:00:00.000Z
  const TENGAH_MALAM_2_OKT_WIB = Date.parse('2026-10-01T17:00:00.000Z');

  const buatTahap = (id, judul, mulai, selesai, ekstra = {}) => ({
    id,
    judul,
    tanggal_mulai: mulai,
    tanggal_selesai: selesai,
    jalur_seleksi: 'TKA',
    sumber: 'resmi',
    pemilik: 'tim',
    status_verifikasi: 'terverifikasi',
    asal: 'resmi',
    url_sumber: 'https://www.kemendikdasmen.go.id/siaran-pers/15707',
    diperiksa_pada: '2026-09-27',
    ...ekstra,
  });

  test('Pengelompokan Segera (0..30 hari), Berikutnya (>30 hari), dan Sudah lewat dengan jam tetap & batas tengah malam WIB', () => {
    assert.equal(jejak.JENDELA_SEGERA_HARI, 30);
    const data = [
      buatTahap('lewat-kemarin', 'Pendaftaran akun TKA', '2026-09-01', '2026-09-30'),
      buatTahap('hari-ini', 'Pelaksanaan TKA hari H', '2026-10-01', '2026-10-01'),
      buatTahap('tepat-30', 'Pengisian PDSS sekolah', '2026-10-31', '2026-11-10'), // selisih tepat 30 hari dari 1 Okt
      buatTahap('hari-31', 'Pengumuman hasil seleksi', '2026-11-01', '2026-11-01'), // selisih 31 hari → Berikutnya
      buatTahap('belum-verif', 'Tahapan belum dicek', '2026-10-05', '2026-10-06', {
        status_verifikasi: 'belum_diverifikasi',
        diperiksa_pada: null,
      }),
    ];

    // Tepat tengah malam 1 Okt WIB
    const h1 = jejak.susunJejakWaktu({ kelas: '12', tahapanLinimasa: data, sekarangMs: TENGAH_MALAM_1_OKT_WIB });
    assert.deepEqual(h1.segera.map((b) => b.id), ['linimasa:hari-ini', 'linimasa:tepat-30']);
    assert.equal(h1.segera[0].jarakTeks, 'Hari ini');
    assert.equal(h1.segera[0].jenis, 'event');
    assert.equal(h1.segera[1].jarakTeks, '30 hari lagi');
    assert.equal(h1.segera[1].jenis, 'tenggat');

    assert.deepEqual(h1.berikutnya.map((b) => b.id), ['linimasa:hari-31']);
    assert.equal(h1.berikutnya[0].jarakTeks, '31 hari lagi');
    assert.equal(h1.berikutnya[0].jenis, 'pengumuman');

    assert.deepEqual(h1.sudahLewat.map((b) => b.id), ['linimasa:lewat-kemarin']);

    // Akhir hari 1 Okt WIB (23:59:59.999 WIB) → 'hari-ini' masih di Segera ("Hari ini")
    const hAkhir = jejak.susunJejakWaktu({ kelas: '12', tahapanLinimasa: data, sekarangMs: AKHIR_HARI_1_OKT_WIB });
    assert.ok(hAkhir.segera.some((b) => b.id === 'linimasa:hari-ini'));
    assert.ok(!hAkhir.sudahLewat.some((b) => b.id === 'linimasa:hari-ini'));

    // 1 milidetik kemudian (tengah malam 2 Okt WIB) → 'hari-ini' pindah ke Sudah lewat, dan 'hari-31' maju ke Segera (30 hari lagi)
    const h2 = jejak.susunJejakWaktu({ kelas: '12', tahapanLinimasa: data, sekarangMs: TENGAH_MALAM_2_OKT_WIB });
    assert.ok(h2.sudahLewat.some((b) => b.id === 'linimasa:hari-ini'));
    assert.ok(!h2.segera.some((b) => b.id === 'linimasa:hari-ini'));
    assert.ok(!h2.berikutnya.some((b) => b.id === 'linimasa:hari-ini'));
    assert.ok(h2.segera.some((b) => b.id === 'linimasa:hari-31' && b.jarakTeks === '30 hari lagi'));
  });

  test('Butir lewat tanggal TIDAK PERNAH muncul di Segera atau Berikutnya (kelas 12 maupun SMP)', () => {
    const k12 = jejak.susunJejakWaktu({
      kelas: '12',
      tahapanLinimasa: [
        buatTahap('l1', 'Tahap Lewat 1', '2026-07-27', '2026-09-27'),
        buatTahap('l2', 'Tahap Lewat 2', '2026-10-26', '2026-11-08'),
      ],
      sekarangMs: Date.parse('2026-11-24T02:00:00.000Z'),
    });
    assert.deepEqual(k12.segera, []);
    assert.deepEqual(k12.berikutnya, []);
    assert.equal(k12.sudahLewat.length, 2);

    const smp = jejak.susunJejakWaktu({
      kelas: '8',
      eventSekolah: [
        { id: 'e-lewat', jenis: 'UTS', tanggal: '2026-11-01', mapel_id: 'matematika', materi_teks: 'Bab 1', kartu_id: null, materi: null, dibuat_pada: '', diubah_pada: '' },
      ],
      namaMapel: { matematika: 'Matematika' },
      sekarangMs: Date.parse('2026-11-24T02:00:00.000Z'),
    });
    assert.deepEqual(smp.segera, []);
    assert.deepEqual(smp.berikutnya, []);
    assert.equal(smp.sudahLewat.length, 1);
    assert.equal(smp.sudahLewat[0].judul, 'UTS · Matematika');

    // Di layar JejakWaktuV2, bagian Sudah lewat terlipat secara bawaan.
    assert.match(baca('components/screens/v2/JejakWaktuV2.tsx'), /const \[lewatTerbuka, setLewatTerbuka\] = useState\(false\);/);
  });

  test('Butir tanpa tanggal resmi tampil "Tanggal resmi belum diumumkan" tanpa tanggal karangan', () => {
    const namaBulan = /\b(Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\b|\d{4}/i;
    for (const [mulai, selesai] of [
      ['', null],
      [null, null],
      [undefined, undefined],
      ['belum-diumumkan', ''],
      ['2026-02-30', null], // tanggal tidak ada di kalender
    ]) {
      const hasil = jejak.susunJejakWaktu({
        kelas: '12',
        tahapanLinimasa: [buatTahap('tanpa-tgl', 'Pendaftaran SNBP', mulai, selesai)],
        sekarangMs: TENGAH_MALAM_1_OKT_WIB,
      });
      assert.equal(hasil.segera.length, 0);
      assert.equal(hasil.sudahLewat.length, 0);
      assert.equal(hasil.berikutnya.length, 1);
      const b = hasil.berikutnya[0];
      assert.equal(b.tanggalTampil, 'Tanggal resmi belum diumumkan');
      assert.equal(b.tanggalResmiAda, false);
      assert.equal(b.jarakTeks, null);
      assert.equal(b.selisihHari, null);
      assert.doesNotMatch(b.tanggalTampil, namaBulan);
    }

    // Kelas 10–11 tidak dikarangkan jadwal
    const k11 = jejak.susunJejakWaktu({
      kelas: '11',
      tahapanLinimasa: [buatTahap('k12-saja', 'Pelaksanaan TKA', '2026-10-10', '2026-10-12')],
      sekarangMs: TENGAH_MALAM_1_OKT_WIB,
    });
    assert.equal(k11.total, 0);
  });

  test('Tanpa hitungan mundur berdetak (setInterval/detik) dan tanpa warna merah/oranye untuk tenggat', () => {
    for (const rel of ['lib/jejakWaktuV2.ts', 'hooks/useJejakWaktuV2.ts', 'components/screens/v2/JejakWaktuV2.tsx']) {
      const s = baca(rel);
      assert.doesNotMatch(s, /\b(setInterval|setTimeout|requestAnimationFrame)\b/, `${rel}: dilarang memakai pewaktu`);
      assert.doesNotMatch(s, /\b(detik|menit|jam lagi)\b/i, `${rel}: dilarang hitungan mundur detik/menit`);
    }
    const layar = baca('components/screens/v2/JejakWaktuV2.tsx');
    assert.doesNotMatch(layar, /warna\.(galat|galatLatar)|warna="(galat|galatLatar)"/, 'JejakWaktuV2 tidak boleh memakai warna galat/merah pada butir waktu');
    assert.match(layar, /TEKS_JEJAK_WAKTU\.lencanaSegera/, 'Segera dibedakan dengan penanda teks');
  });
});

// ---------------------------------------------------------------------------------------------
describe('Langkah Saya v2: kontrak API kemajuan, progres 0/sebagian/semua, dan butir pribadi', () => {
  test('Centang dan batal-centang memakai kontrak API yang sama seperti v1 (/kemajuan dan /butir-pribadi)', () => {
    const pribadiIds = new Set(['pribadi-1']);
    const selesaiAwal = new Set(['umum-2']);

    // Butir umum belum selesai → PUT /kemajuan/umum-1 (selesai: true)
    assert.deepEqual(
      langkah.rencanakanAlihButir({ butirId: 'umum-1', pribadiIds, selesaiIds: selesaiAwal }),
      { sasaran: 'kemajuan', butirId: 'umum-1', selesai: true }
    );
    // Butir umum sudah selesai → DELETE /kemajuan/umum-2 (selesai: false)
    assert.deepEqual(
      langkah.rencanakanAlihButir({ butirId: 'umum-2', pribadiIds, selesaiIds: selesaiAwal }),
      { sasaran: 'kemajuan', butirId: 'umum-2', selesai: false }
    );
    // Butir pribadi → /butir-pribadi/:id/selesai
    assert.deepEqual(
      langkah.rencanakanAlihButir({ butirId: 'pribadi-1', pribadiIds, selesaiIds: selesaiAwal }),
      { sasaran: 'butir_pribadi', id: 'pribadi-1', selesai: true }
    );

    const hook = baca('hooks/useLangkahSayaV2.ts');
    assert.match(hook, /import \{ useKemajuan, useTandaiKemajuan \} from '\.\/useKemajuan';/);
    assert.match(hook, /import \{ useButirPribadi, useHapusButirPribadi, useTandaiButirPribadi \} from '\.\/useButirPribadi';/);
    assert.match(hook, /tandaiKemajuan\.mutate\(\{ butirId: rencana\.butirId, selesai: rencana\.selesai \}\);/);
    assert.match(hook, /tandaiPribadi\.mutate\(\{ id: rencana\.id, selesai: rencana\.selesai \}\);/);
    assert.match(hook, /hapusPribadi\.mutate\(id\);/);

    // Pastikan useKemajuan & useButirPribadi tetap menembak endpoint v1 yang sama
    const uk = baca('hooks/useKemajuan.ts');
    assert.match(uk, /\/kemajuan\/\$\{encodeURIComponent\(butirId\)\}/);
    assert.match(uk, /method:\s*selesai\s*\?\s*'PUT'\s*:\s*'DELETE'/);
    const ubp = baca('hooks/useButirPribadi.ts');
    assert.match(ubp, /\/butir-pribadi\/\$\{encodeURIComponent\(id\)\}\/selesai/);
  });

  test('Progres benar pada 0, sebagian, dan semua selesai; butir pribadi tergabung dan bisa dihapus', () => {
    const umum = [
      {
        id: 'berkas',
        nama: 'Berkas',
        urutan: 1,
        butir: [
          { id: 'ktp', judul: 'Siapkan KTP', urutan: 1, berlaku_untuk_kelas: ['12'], berlaku_untuk_jalur_seleksi: ['SNBP'], sumber: 'resmi', pemilik: 'tim', status_verifikasi: 'belum_diverifikasi', asal: 'mockup', url_sumber: null, diperiksa_pada: null },
          { id: 'kk', judul: 'Siapkan KK', urutan: 2, berlaku_untuk_kelas: ['12'], berlaku_untuk_jalur_seleksi: ['SNBP'], sumber: 'resmi', pemilik: 'tim', status_verifikasi: 'belum_diverifikasi', asal: 'mockup', url_sumber: null, diperiksa_pada: null },
        ],
      },
    ];
    const pribadi = [
      {
        id: 'bp-1',
        jenis: 'riset_kampus',
        prodi_id: 'informatika',
        judul: 'Cek daya tampung Informatika',
        kategori_id: 'riset-kampus',
        kategori_nama: 'Riset Kampus',
        selesai_pada: null,
        dibuat_pada: '2026-10-01',
      },
    ];
    const gabungan = daftarPeriksa.gabungButirPribadi(umum, pribadi);
    assert.equal(gabungan.length, 2);

    // 0 selesai
    const p0 = daftarPeriksa.hitungProgres(gabungan, new Set());
    assert.deepEqual(p0, { selesai: 0, total: 3, status: 'kosong' });
    assert.equal(langkah.teksRingkasanProgres(p0), '0 dari 3 selesai');
    assert.equal(langkah.persenProgres(p0), 0);
    assert.equal(langkah.kalimatProgresLangkah(p0.status), langkah.TEKS_LANGKAH_SAYA.kalimatKosong);

    // Sebagian selesai (2 dari 3)
    const pSebagian = daftarPeriksa.hitungProgres(gabungan, new Set(['ktp', 'bp-1']));
    assert.deepEqual(pSebagian, { selesai: 2, total: 3, status: 'berjalan' });
    assert.equal(langkah.teksRingkasanProgres(pSebagian), '2 dari 3 selesai');
    assert.equal(langkah.persenProgres(pSebagian), 67);
    assert.equal(langkah.kalimatProgresLangkah(pSebagian.status), langkah.TEKS_LANGKAH_SAYA.kalimatBerjalan);

    // Semua selesai (3 dari 3)
    const pSemua = daftarPeriksa.hitungProgres(gabungan, new Set(['ktp', 'kk', 'bp-1']));
    assert.deepEqual(pSemua, { selesai: 3, total: 3, status: 'selesai' });
    assert.equal(langkah.teksRingkasanProgres(pSemua), '3 dari 3 selesai');
    assert.equal(langkah.persenProgres(pSemua), 100);
    assert.equal(langkah.kalimatProgresLangkah(pSemua.status), langkah.TEKS_LANGKAH_SAYA.kalimatSemuaSelesai);

    // Layar LangkahSayaV2 menampilkan tombol hapus untuk butir pribadi & tidak memakai line-through agresif
    const layar = baca('components/screens/v2/LangkahSayaV2.tsx');
    assert.match(layar, /labelHapusButirPribadi\(butir\.judul\)/);
    assert.doesNotMatch(layar, /line-through/, 'butir selesai tampil tenang, bukan dicoret agresif');
  });
});

// ---------------------------------------------------------------------------------------------
describe('Keadaan kosong (maskot #B4E1EB dua mode), memuat, galat, aksesibilitas, 40 kata, dan token', () => {
  test('Keputusan 24 Nov: token latarMaskot #B4E1EB di mode terang & gelap, dipakai di ArahSayaV2, JejakWaktuV2, dan LangkahSayaV2', () => {
    assert.equal(tema.warnaTerang.latarMaskot.toUpperCase(), '#B4E1EB');
    assert.equal(tema.warnaGelap.latarMaskot.toUpperCase(), '#B4E1EB');
    assert.ok('latarMaskot' in tema.WARNA_DEKORATIF);

    for (const rel of [
      'components/screens/v2/ArahSayaV2.tsx',
      'components/screens/v2/JejakWaktuV2.tsx',
      'components/screens/v2/LangkahSayaV2.tsx',
    ]) {
      const s = baca(rel);
      assert.match(s, /backgroundColor:\s*warna\.latarMaskot/, `${rel} wajib memakai warna.latarMaskot pada lingkaran maskot`);
      assert.match(s, /require\('\.\.\/\.\.\/\.\.\/assets\/mascot-blue\.png'\)/, `${rel} wajib memakai aset maskot asli`);
      assert.match(s, /<PlaceholderMemuat/, `${rel} wajib punya kerangka memuat`);
      assert.match(s, /<KeadaanGalat[\s\S]*onCobaLagi=\{data\.muatUlang\}/, `${rel} wajib punya KeadaanGalat + Coba lagi`);
    }
  });

  test('Maksimal 40 kata teks tetap per layar pada Jejak Waktu dan Langkah Saya di semua keadaan', () => {
    assert.equal(jejak.BATAS_KATA_JEJAK_WAKTU, 40);
    assert.equal(langkah.BATAS_KATA_LANGKAH_SAYA, 40);

    for (const discoverAktif of [false, true]) {
      for (const keadaan of ['isi', 'kosong', 'galat']) {
        const teks = jejak.teksTetapJejakWaktu({ keadaan, discoverAktif });
        const n = jejak.hitungKata(teks.join(' '));
        assert.ok(n <= 40, `Jejak Waktu (${keadaan}, discover=${discoverAktif}): ${n} kata > 40`);
      }
    }

    for (const keadaan of ['kelas12_isi', 'kelas12_pilih_jalur', 'pribadi_isi', 'kosong', 'galat']) {
      for (const statusProgres of ['kosong', 'berjalan', 'selesai']) {
        const teks = langkah.teksTetapLangkahSaya({
          keadaan,
          statusProgres,
          adaCatatanSnpmb: true,
          bisaEventSmp: true,
          kelas: '8',
        });
        const n = langkah.hitungKata(teks.join(' '));
        assert.ok(n <= 40, `Langkah Saya (${keadaan}, ${statusProgres}): ${n} kata > 40`);
      }
    }
  });

  test('Semua kontrol berlabel, target sentuh >= 44 pt (Sentuh), checkbox meneruskan checked, dan reduce motion dihormati', () => {
    assert.ok(tema.ukuran.sentuhMin >= 44);
    const sentuhSumber = baca('components/v2/Sentuh.tsx');
    assert.match(sentuhSumber, /accessibilityState=\{\{ disabled: mati, busy: sibuk, selected: terpilih, checked: dicentang, expanded: terbuka \}\}/);
    assert.match(sentuhSumber, /aria-checked=\{dicentang\}/);

    let jumlahCheckbox = 0;
    for (const rel of ['components/screens/v2/JejakWaktuV2.tsx', 'components/screens/v2/LangkahSayaV2.tsx']) {
      const s = baca(rel);
      assert.doesNotMatch(s, /\b(Pressable|TouchableOpacity|TouchableHighlight|TextInput)\b/, rel);
      jelajah(ast(rel), (n) => {
        if (!(ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n))) return;
        const tag = n.tagName.getText();
        const atribut = new Map(
          n.attributes.properties.filter(ts.isJsxAttribute).map((a) => [a.name.getText(), a])
        );
        if (tag === 'Sentuh') {
          assert.ok(atribut.has('peran') && atribut.has('label'), `${rel}: <Sentuh> tanpa peran atau label`);
          const peranAttr = atribut.get('peran');
          const nilaiPeran = peranAttr.initializer && ts.isStringLiteral(peranAttr.initializer) ? peranAttr.initializer.text : '';
          if (nilaiPeran === 'checkbox') {
            jumlahCheckbox += 1;
            assert.ok(atribut.has('dicentang'), `${rel}: <Sentuh peran="checkbox"> wajib meneruskan dicentang`);
          }
        }
        if (tag === 'Tombol' || tag === 'Isian') {
          assert.ok(atribut.has('label'), `${rel}: <${tag}> tanpa label`);
        }
      });
    }
    assert.ok(jumlahCheckbox >= 1, 'LangkahSayaV2 harus memiliki minimal satu kontrol checkbox');
  });

  test('0 HEX di luar berkas token pada seluruh berkas baru 032, dan tidak ada warna ungu terlarang', () => {
    const POLA_WARNA = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(.*)$/i;
    const UNGU_TERLARANG = new RegExp('#' + '6a3dff', 'i');
    const langgar = [];
    for (const rel of BERKAS_BARU_032) {
      const isi = baca(rel);
      assert.doesNotMatch(isi, UNGU_TERLARANG, `${rel}: ungu terlarang dilarang`);
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

  test('Gerbang rilis mendaftarkan berkas 032 di bawah EXPO_PUBLIC_NAVIGASI_V2, dokumen draf & peta data lengkap', () => {
    assert.ok(fs.existsSync(path.join(AKAR_APP, 'docs', 'peta-data-jejak-waktu-v2.md')));
    const draf = baca('docs/draf-teks-jejak-waktu-v2.md');
    assert.match(draf, /DRAF/);
    for (const teks of Object.values(jejak.TEKS_JEJAK_WAKTU)) {
      assert.ok(draf.includes(teks), `TEKS_JEJAK_WAKTU belum tercatat di draf: "${teks}"`);
    }
    for (const teks of Object.values(langkah.TEKS_LANGKAH_SAYA)) {
      assert.ok(draf.includes(teks), `TEKS_LANGKAH_SAYA belum tercatat di draf: "${teks}"`);
    }

    const entri = gerbang.TEKS.find((x) => x.id === 'navigasi-v2');
    for (const rel of ['lib/jejakWaktuV2.ts', 'lib/langkahSayaV2.ts', 'docs/draf-teks-jejak-waktu-v2.md']) {
      assert.ok(entri.berkas.includes(rel), `${rel} belum terdaftar di periksa-gerbang-rilis.js`);
    }
    assert.ok(!baca('docs/persetujuan-teks-rilis.json').includes('navigasi-v2'));

    // Bila hanya berkas 032 yang bertanda DRAF dan saklar dinyalakan di eas.json → tetap ditahan gerbang rilis
    const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'gerbang-032-'));
    try {
      const tulis = (rel, isi) => {
        fs.mkdirSync(path.dirname(path.join(akar, rel)), { recursive: true });
        fs.writeFileSync(path.join(akar, rel), typeof isi === 'string' ? isi : JSON.stringify(isi));
      };
      tulis('lib/kebijakan-privasi.json', { versi: 1, status: 'Berlaku.', ringkasan: ['Ringkas.'], isi: [] });
      tulis('lib/arahSaya.ts', 'export const A = 1;\n');
      tulis('lib/navigasiV2.ts', 'export const B = 1;\n');
      tulis('docs/draf-teks-navigasi-v2.md', 'Teks.\n');
      tulis('lib/jejakWaktuV2.ts', '// TEKS DRAF\n');
      tulis('lib/langkahSayaV2.ts', '// TEKS DRAF\n');
      tulis('lib/jalurSayaV2.ts', 'export const C = 1;\n');
      tulis('lib/jelajahV2.ts', 'export const E = 1;\n');
      tulis('lib/rekamJejakV2.ts', 'export const H = 1;\n');
      tulis('components/screens/v2/JalurSayaV2.tsx', 'export const D = 1;\n');
      tulis('components/screens/v2/JelajahV2.tsx', 'export const F = 1;\n');
      tulis('components/screens/v2/ProfilEksplorasiV2.tsx', 'export const G = 1;\n');
      tulis('components/screens/v2/RekamJejakV2.tsx', 'export const I = 1;\n');
      tulis('components/screens/v2/RekamJejakFotoV2.tsx', 'export const J = 1;\n');
      tulis('docs/draf-teks-jejak-waktu-v2.md', 'DRAF\n');
      tulis('docs/draf-teks-jalur-saya-v2.md', 'Teks.\n');
      tulis('docs/draf-teks-jelajah-v2.md', 'Teks.\n');
      tulis('docs/draf-teks-rekam-jejak-v2.md', 'Teks.\n');
      tulis('eas.json', { build: { coba: { env: { EXPO_PUBLIC_NAVIGASI_V2: '1' } } } });
      const pesan = gerbang.periksa(akar).map((m) => m.pesan);
      assert.ok(pesan.includes('Teks navigasi v2 dan Arah Saya: masih draf dan belum disetujui.'), pesan.join(' | '));
    } finally {
      fs.rmSync(akar, { recursive: true, force: true });
    }

    const ujiHp = baca('docs/uji-hp-expo-go.md');
    assert.match(ujiHp, /Jejak Waktu dan Langkah Saya v2 \(LANJUT_032\)/);
    assert.match(ujiHp, /--clear/);
  });
});
