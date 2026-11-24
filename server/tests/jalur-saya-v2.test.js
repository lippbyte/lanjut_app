// LANJUT_033: Jalur Saya v2 (reskin /jalur-tujuan & /jalur-tujuan-tulis di balik saklar
// EXPO_PUBLIC_NAVIGASI_V2 bersama EXPO_PUBLIC_JALUR_TUJUAN, keduanya mati bawaan).
// Menguji isolasi saklar, penyamaran id mentah & teks draf (K37/K44/K47), multi-pilihan & jeda,
// tujuan berversi & riwayat bernomor+berjam, keadaan kosong maskot #B4E1EB dua mode, batas 40 kata,
// aksesibilitas & target sentuh, kebersihan token, gerbang rilis, dan keutuhan kompatibilitas APK 1.0.0.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { muatModulApp } = require('./muat-ts-app');
const { buatTujuanSkema, BATAS_TUJUAN: BATAS_SERVER } = require('../src/modul/tujuan/tujuan.skema');
const gerbang = require('../tools/periksa-gerbang-rilis');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const fitur = muatModulApp('lib/fiturApp');
const jalurSaya = muatModulApp('lib/jalurSayaV2');
const jalurV1 = muatModulApp('lib/jalurTujuan');
const arahSaya = muatModulApp('lib/arahSaya');
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

const BERKAS_033 = [
  'lib/jalurSayaV2.ts',
  'hooks/useJalurSayaV2.ts',
  'components/screens/v2/JalurSayaV2.tsx',
  'app/(app)/jalur-tujuan.tsx',
  'app/(app)/jalur-tujuan-tulis.tsx',
];

// ---------------------------------------------------------------------------------------------
describe('Saklar mati vs menyala: isolasi v1 dan bawaan mati', () => {
  test('Kedua saklar (EXPO_PUBLIC_JALUR_TUJUAN & EXPO_PUBLIC_NAVIGASI_V2) bawaan mati di app.config dan seluruh profil build', () => {
    const kosong = muatKonfigApp({});
    assert.equal(kosong.jalurTujuan, false);
    assert.equal(kosong.navigasiV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_JALUR_TUJUAN: '0', EXPO_PUBLIC_NAVIGASI_V2: '0' }).jalurTujuan, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_JALUR_TUJUAN: '0', EXPO_PUBLIC_NAVIGASI_V2: '0' }).navigasiV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_JALUR_TUJUAN: '1', EXPO_PUBLIC_NAVIGASI_V2: '1' }).jalurTujuan, true);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_JALUR_TUJUAN: '1', EXPO_PUBLIC_NAVIGASI_V2: '1' }).navigasiV2, true);

    for (const b of [
      'eas.json',
      'Dockerfile',
      'docker-compose.yml',
      'docker-compose.dev.yml',
      'server/.env.example',
      'server/.env.production.example',
      'server/.env.railway.contoh',
    ]) {
      const isi = baca(b);
      assert.ok(!isi.includes('EXPO_PUBLIC_NAVIGASI_V2'), `${b}: tidak boleh menyalakan EXPO_PUBLIC_NAVIGASI_V2`);
      assert.ok(!isi.includes('EXPO_PUBLIC_JALUR_TUJUAN'), `${b}: tidak boleh menyalakan EXPO_PUBLIC_JALUR_TUJUAN`);
    }
  });

  test('Saklar v2 mati merender komponen v1 utuh; saklar v2 menyala merender JalurSayaV2 & TujuanTulisV2', () => {
    const ruteUtama = baca('app/(app)/jalur-tujuan.tsx');
    assert.match(
      ruteUtama,
      /if \(!jalurTujuanAktif\(Constants\.expoConfig\?\.extra\)\) return <Redirect href="\/linimasa" \/>;/
    );
    assert.match(ruteUtama, /if \(navigasiV2Aktif\(extra\)\) return <JalurSayaV2 key=\{pengguna\?\.id\} \/>;/);
    assert.match(ruteUtama, /return <JalurTujuanScreen key=\{pengguna\?\.id\} \/>;/);

    const ruteTulis = baca('app/(app)/jalur-tujuan-tulis.tsx');
    assert.match(
      ruteTulis,
      /if \(!jalurTujuanAktif\(Constants\.expoConfig\?\.extra\)\) return <Redirect href="\/linimasa" \/>;/
    );
    assert.match(ruteTulis, /if \(navigasiV2Aktif\(extra\)\) return <TujuanTulisV2 key=\{pengguna\?\.id\} \/>;/);
    assert.match(ruteTulis, /return <TujuanTulisScreen key=\{pengguna\?\.id\} \/>;/);

    // Berkas v1 sama sekali tidak berubah ke tema/modul v2
    for (const v1 of ['components/screens/JalurTujuanScreens.tsx', 'hooks/useJalurTujuan.ts', 'lib/jalurTujuan.ts']) {
      assert.doesNotMatch(baca(v1), /jalurSayaV2|useJalurSayaV2|JalurSayaV2|useTemaV2|theme\/v2/, v1);
    }

    // Hook v2 hanya aktif bila kedua saklar menyala
    assert.match(
      baca('hooks/useJalurSayaV2.ts'),
      /const FITUR_AKTIF = jalurTujuanAktif\(EXTRA\) && navigasiV2Aktif\(EXTRA\);/
    );
  });
});

// ---------------------------------------------------------------------------------------------
describe('Penyamaran id mentah & pelarangan teks draf (K37 dan K44)', () => {
  const JALUR_CAMPUR = [
    {
      id: 'melanjutkan',
      nama: '[DUMMY] Melanjutkan',
      deskripsi_singkat: '[DUMMY] Satu kalimat ringkas.',
      status_teks: 'disetujui',
      urutan: 1,
    },
    {
      id: 'bekerja',
      nama: 'Bekerja Draf Rahasia',
      deskripsi_singkat: 'Kalimat draf rahasia bekerja yang belum disetujui.',
      status_teks: 'draf',
      urutan: 2,
    },
    {
      id: 'wirausaha',
      nama: 'Wirausaha Nonaktif Rahasia',
      deskripsi_singkat: 'Kalimat nonaktif rahasia.',
      status_teks: 'nonaktif',
      urutan: 3,
    },
  ];

  test('labelJalur adalah satu-satunya penentu label: mengembalikan nama hanya bila disetujui, netral bila draf/asing, dan tidak pernah id mentah', () => {
    assert.equal(jalurSaya.LABEL_JALUR_NETRAL, 'Jalur belum tersedia');
    assert.equal(jalurSaya.TEKS_JALUR_SAYA_V2.jalurBelumTersedia, 'Jalur belum tersedia');

    // Kosong -> null (tujuan tidak terkait jalur)
    assert.equal(jalurSaya.labelJalur(null, JALUR_CAMPUR), null);
    assert.equal(jalurSaya.labelJalur(undefined, JALUR_CAMPUR), null);
    assert.equal(jalurSaya.labelJalur('', JALUR_CAMPUR), null);

    // Jalur disetujui -> nama jalur (BUKAN id mentah 'melanjutkan')
    assert.equal(jalurSaya.labelJalur(JALUR_CAMPUR[0], JALUR_CAMPUR), '[DUMMY] Melanjutkan');
    assert.equal(jalurSaya.labelJalur('melanjutkan', JALUR_CAMPUR), '[DUMMY] Melanjutkan');
    assert.equal(
      jalurSaya.labelJalur({ jalur_minat_id: 'melanjutkan', jalur_belum_tersedia: false }, JALUR_CAMPUR),
      '[DUMMY] Melanjutkan'
    );

    // Jalur draf, nonaktif, jalur_belum_tersedia, atau string id mentah pada tujuan (mis. demo_kelas12_p26) -> 'Jalur belum tersedia'
    for (const masukan of [
      JALUR_CAMPUR[1],
      JALUR_CAMPUR[2],
      'bekerja',
      'wirausaha',
      'id_mentah_rahasia',
      { jalur_minat_id: null, jalur_belum_tersedia: true },
      { jalur_minat_id: 'bekerja', jalur_belum_tersedia: false },
      { jalur_minat_id: 'melanjutkan', jalur_belum_tersedia: true },
    ]) {
      const hasil = jalurSaya.labelJalur(masukan, JALUR_CAMPUR);
      assert.equal(hasil, 'Jalur belum tersedia', JSON.stringify(masukan));
      assert.doesNotMatch(hasil, /melanjutkan|bekerja|wirausaha|id_mentah_rahasia|Rahasia/);
    }
  });

  test('Jalur kembali draf tampil netral, bisa dijeda, serta id mentah dan teks drafnya tidak pernah lolos ke kartu, perjalanan, galat, atau Arahku', () => {
    const sah = jalurSaya.jalurDisetujuiSaja(JALUR_CAMPUR);
    assert.equal(sah.length, 1);
    assert.equal(sah[0].id, 'melanjutkan');

    const pilihanSiswa = [
      {
        id: 'pil-sah',
        jalur_minat_id: 'melanjutkan',
        jalur_belum_tersedia: false,
        status: 'aktif',
        mulai_pada: '2026-10-01',
        berakhir_pada: null,
        diubah_pada: '2026-10-01',
      },
      {
        id: 'pil-draf-server',
        jalur_minat_id: null,
        jalur_belum_tersedia: true,
        status: 'aktif',
        mulai_pada: '2026-10-02',
        berakhir_pada: null,
        diubah_pada: '2026-10-02',
      },
      {
        id: 'pil-draf-bocor',
        jalur_minat_id: 'bekerja',
        jalur_belum_tersedia: false,
        status: 'aktif',
        mulai_pada: '2026-10-03',
        berakhir_pada: null,
        diubah_pada: '2026-10-03',
      },
      {
        id: 'pil-draf-dijeda',
        jalur_minat_id: null,
        jalur_belum_tersedia: true,
        status: 'dijeda',
        mulai_pada: '2026-09-01',
        berakhir_pada: '2026-09-10',
        diubah_pada: '2026-09-10',
      },
    ];

    const kartu = jalurSaya.susunKartuJalurV2(JALUR_CAMPUR, pilihanSiswa);
    assert.equal(kartu.disetujui.length, 1);
    assert.equal(kartu.disetujui[0].judul, '[DUMMY] Melanjutkan');
    assert.notEqual(kartu.disetujui[0].judul, 'melanjutkan');
    assert.equal(kartu.disetujui[0].dipilih, true);
    assert.equal(kartu.disetujui[0].pilihanAktifId, 'pil-sah');

    // Hanya pilihan draf yang berstatus aktif yang masuk drafAktif (untuk tombol Jeda), semuanya berjudul netral
    assert.deepEqual(
      kartu.drafAktif.map((d) => [d.pilihanId, d.judul]),
      [
        ['pil-draf-server', 'Jalur belum tersedia'],
        ['pil-draf-bocor', 'Jalur belum tersedia'],
      ]
    );
    const jsonKartu = JSON.stringify(kartu);
    assert.doesNotMatch(jsonKartu, /bekerja|wirausaha|Draf Rahasia|Kalimat draf rahasia|Nonaktif Rahasia/);

    // Peristiwa perjalanan juga bebas id mentah untuk jalur draf (baik tersamar maupun bocor)
    for (const p of [
      { jenis: 'jalur_dipilih', pada: '2026-10-01', jalur_minat_id: null, jalur_belum_tersedia: true },
      { jenis: 'jalur_dipilih', pada: '2026-10-01', jalur_minat_id: 'bekerja', jalur_belum_tersedia: false },
      { jenis: 'jalur_dijeda', pada: '2026-10-02', jalur_minat_id: 'wirausaha', jalur_belum_tersedia: false },
    ]) {
      const kalimat = jalurSaya.teksPeristiwaAmanV2(p, JALUR_CAMPUR);
      assert.match(kalimat, /\(belum tersedia\)/);
      assert.doesNotMatch(kalimat, /bekerja|wirausaha|Rahasia/);
    }

    // Pesan galat tidak pernah memantulkan id mentah
    for (const kode of ['melanjutkan', 'bekerja', 'wirausaha', 'JALUR_BELUM_TERSEDIA', 'JALUR_SUDAH_DIPILIH', undefined]) {
      const galat = jalurSaya.pesanGalatJalurTujuan(kode);
      assert.doesNotMatch(galat, /\b(melanjutkan|bekerja|wirausaha)\b/);
    }

    // Chip Arahku di Arah Saya memakai pembantu labelJalur yang sama
    assert.match(baca('lib/arahSaya.ts'), /import \{ jalurDisetujuiSaja, labelJalur \} from '\.\/jalurSayaV2';/);
    const arahku = arahSaya.keadaanArahku({ pilihan: pilihanSiswa, daftarJalur: JALUR_CAMPUR, tanda: 'dijawab' });
    assert.deepEqual(
      arahku.chip.map((c) => c.label),
      ['[DUMMY] Melanjutkan', 'Jalur belum tersedia', 'Jalur belum tersedia']
    );
  });

  test('Layar JalurSayaV2 tidak pernah menyisipkan id mentah ke teks/label, memakai label netral + tombol Jeda, dan tidak menyalin teks draf konten', () => {
    const layar = baca('components/screens/v2/JalurSayaV2.tsx');

    // Menyaring daftar jalur lewat jalurDisetujuiSaja dan memakai labelJalur untuk tujuan & pil
    assert.match(layar, /const daftarJalurSah = jalurDisetujuiSaja\(jalur\.data\);/);
    assert.match(layar, /const labelJalurTerkait = labelJalur\(tujuan\.jalur_minat_id, daftarJalur\);/);

    // Tidak boleh merender idJalur atau jalur_minat_id langsung ke <Teks> atau atribut label/judul
    assert.doesNotMatch(layar, /<Teks[^>]*>\s*\{[^}]*\b(idJalur|jalur_minat_id)\b/);
    assert.doesNotMatch(layar, /\b(label|judul)=\{\s*(k|kartu)\.idJalur\s*\}/);
    assert.doesNotMatch(layar, /\b(label|judul)=\{\s*tujuan\.jalur_minat_id\s*\}/);

    // Kartu draf aktif WAJIB menampilkan judul netral d.judul dan satu tombol Jeda (sabotase #3 & #9)
    const blokDraf = /\{kartuJalur\.drafAktif\.map\(\(d\) => \([\s\S]*?\)\)\}/.exec(layar);
    assert.ok(blokDraf, 'blok kartuJalur.drafAktif.map harus ada di JalurSayaV2.tsx');
    assert.match(blokDraf[0], /\{d\.judul\}/, 'kartu draf wajib merender label netral d.judul');
    assert.match(
      blokDraf[0],
      /<Tombol[\s\S]*?label=\{T\.jeda\}[\s\S]*?petunjuk=\{T\.labelAksiJedaDraf\}[\s\S]*?onPress=\{\(\) => jedaKartuDraf\(d\.pilihanId\)\}/,
      'kartu draf wajib memiliki tombol Jeda berlabel'
    );
    assert.doesNotMatch(blokDraf[0], /pilihJalur\.mutate/, 'jalur draf tidak boleh bisa dipilih ulang');

    // Formulir tujuan saat tujuan lama terkait jalur draf menampilkan pil netral T.jalurBelumTersedia, bukan id mentah
    assert.match(layar, /awalJalurDraf && awal\?\.jalur_minat_id[\s\S]*?label=\{T\.jalurBelumTersedia\}/);

    // Teks draf dari server/data-konten/jalur-minat.json tidak disalin ke modul/dokumen v2
    const konten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data-konten', 'jalur-minat.json'), 'utf8'));
    for (const j of konten.data) {
      assert.equal(j.status_teks, 'draf');
      for (const rel of ['lib/jalurSayaV2.ts', 'components/screens/v2/JalurSayaV2.tsx', 'docs/draf-teks-jalur-saya-v2.md']) {
        assert.ok(!baca(rel).includes(j.deskripsi_singkat), `${rel} tidak boleh menyalin deskripsi_singkat draf (${j.id})`);
      }
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('Multi-pilihan jalur, penanda tertulis "Dipilih", tujuan berversi, dan kontrak API v1', () => {
  test('Boleh memilih lebih dari satu jalur sekaligus, penanda "Dipilih" tertulis (bukan hanya warna), dan ketuk ulang menjeda', () => {
    const duaDisetujui = [
      { id: 'melanjutkan', nama: '[DUMMY] Melanjutkan', deskripsi_singkat: 'Kalimat 1.', status_teks: 'disetujui', urutan: 1 },
      { id: 'bekerja', nama: '[DUMMY] Bekerja', deskripsi_singkat: 'Kalimat 2.', status_teks: 'disetujui', urutan: 2 },
    ];
    const duaAktif = [
      { id: 'p1', jalur_minat_id: 'melanjutkan', jalur_belum_tersedia: false, status: 'aktif', mulai_pada: 'x', berakhir_pada: null, diubah_pada: 'x' },
      { id: 'p2', jalur_minat_id: 'bekerja', jalur_belum_tersedia: false, status: 'aktif', mulai_pada: 'x', berakhir_pada: null, diubah_pada: 'x' },
    ];
    const susunan = jalurSaya.susunKartuJalurV2(duaDisetujui, duaAktif);
    assert.equal(susunan.disetujui.filter((k) => k.dipilih).length, 2, 'kedua jalur aktif secara bersamaan');

    // KartuPilihanJalurBesarV2 wajib menampilkan teks tertulis T.penandaDipilih ("Dipilih") + ikon centang + checkbox
    assert.equal(jalurSaya.TEKS_JALUR_SAYA_V2.penandaDipilih, 'Dipilih');
    const layar = baca('components/screens/v2/JalurSayaV2.tsx');
    const fnKartu = /function KartuPilihanJalurBesarV2\([\s\S]*?\n\}\n/.exec(layar);
    assert.ok(fnKartu, 'KartuPilihanJalurBesarV2 harus ada');
    assert.match(fnKartu[0], /<Sentuh[\s\S]*?peran="checkbox"[\s\S]*?label=\{kartu\.judul\}[\s\S]*?dicentang=\{kartu\.dipilih\}/);
    assert.match(fnKartu[0], /<Ikon nama="centang"/, 'kartu terpilih harus punya ikon centang');
    assert.match(fnKartu[0], /<Teks[^>]*>\s*\{T\.penandaDipilih\}\s*<\/Teks>/, 'kartu terpilih wajib menampilkan teks "Dipilih"');

    // Ketuk kartu terpilih menjeda (jedaJalur.mutate), ketuk kartu belum dipilih memilih (pilihJalur.mutate)
    const alih = /const alihKartuJalur =[\s\S]*?\n  \};/.exec(layar)[0];
    assert.match(alih, /if \(k\.dipilih && k\.pilihanAktifId\)[\s\S]*?jedaJalur\.mutate\(k\.pilihanAktifId/);
    assert.match(alih, /pilihJalur\.mutate\(k\.idJalur/);
  });

  test('Memilih, melepas/menjeda, menyimpan tujuan berversi, menandai tercapai, dan membaca riwayat memanggil API yang persis sama dengan v1', () => {
    const hookV2 = baca('hooks/useJalurSayaV2.ts');
    assert.ok(hookV2.includes("const KUNCI = ['jalur_tujuan'] as const;"));
    assert.doesNotMatch(hookV2, /method:\s*'DELETE'/i, 'tidak ada penghapusan jalur atau tujuan');

    assert.match(hookV2, /useAmbilV2<JalurMinat\[\]>\('jalur',\s*'\/jalur-minat'\)/);
    assert.match(hookV2, /useAmbilV2<PilihanJalur\[\]>\('pilihan',\s*'\/jalur-minat\/saya'\)/);
    assert.match(hookV2, /useAmbilV2<DaftarTujuan>\('tujuan',\s*'\/tujuan'\)/);
    assert.match(hookV2, /useAmbilV2<PeristiwaPerjalanan\[\]>\('perjalanan',\s*'\/tujuan\/perjalanan',\s*aktif\)/);
    assert.match(hookV2, /`\/tujuan\/\$\{encodeURIComponent\(id\)\}\/riwayat`/);

    assert.match(
      hookV2,
      /apiFetch\('\/jalur-minat\/saya',\s*\{\s*method:\s*'POST',\s*body:\s*\{\s*jalur_minat_id:\s*jalurMinatId\s*\},\s*token\s*\}\)/
    );
    assert.match(
      hookV2,
      /apiFetch\(`\/jalur-minat\/saya\/\$\{encodeURIComponent\(pilihanId\)\}`,\s*\{\s*method:\s*'PATCH',\s*body:\s*\{\s*status:\s*'dijeda'\s*\},\s*token,?\s*\}\)/
    );
    assert.match(
      hookV2,
      /apiFetch\(id \? `\/tujuan\/\$\{encodeURIComponent\(id\)\}\/versi` : '\/tujuan',\s*\{\s*method:\s*'POST',\s*body:\s*badan,\s*token,?\s*\}\)/
    );
    assert.match(
      hookV2,
      /apiFetch\(`\/tujuan\/\$\{encodeURIComponent\(id\)\}\/status`,\s*\{\s*method:\s*'PATCH',\s*body:\s*\{\s*status:\s*'tercapai'\s*\},\s*token,?\s*\}\)/
    );
  });

  test('Batas panjang tujuan (200 & 2000), validasi versi baru, dan riwayat bernomor + berjam tetap utuh', () => {
    assert.deepEqual({ ...jalurSaya.BATAS_TUJUAN }, BATAS_SERVER);
    assert.equal(jalurSaya.BATAS_TUJUAN.judul, 200);
    assert.equal(jalurSaya.BATAS_TUJUAN.uraian, 2000);

    const sah = { judul: 'j'.repeat(200), uraian: 'u'.repeat(2000), target: '2027-06-30', jalur: null };
    assert.deepEqual(jalurSaya.periksaIsianTujuan(sah), {});
    assert.ok(buatTujuanSkema.safeParse(jalurSaya.badanTujuan(sah)).success);

    assert.ok(jalurSaya.periksaIsianTujuan({ ...sah, judul: 'j'.repeat(201) }).judul);
    assert.ok(jalurSaya.periksaIsianTujuan({ ...sah, uraian: 'u'.repeat(2001) }).uraian);
    assert.ok(jalurSaya.periksaIsianTujuan({ ...sah, target: '2027-02-30' }).target_pada);

    // Formulir v2 wajib memasang maksPanjang={BATAS_TUJUAN.judul}, maksPanjang={BATAS_TUJUAN.uraian}, dan periksaIsianTujuan
    const layar = baca('components/screens/v2/JalurSayaV2.tsx');
    const fnForm = /function FormTujuanV2\([\s\S]*?\n\}\n/.exec(layar)[0];
    assert.match(fnForm, /const periksa = periksaIsianTujuan\(isian\);/);
    assert.match(fnForm, /const badan = badanTujuan\(isian, awal\);/);
    assert.match(fnForm, /maksPanjang=\{BATAS_TUJUAN\.judul\}/, 'Isian judul wajib dibatasi BATAS_TUJUAN.judul');
    assert.match(fnForm, /maksPanjang=\{BATAS_TUJUAN\.uraian\}/, 'Isian uraian wajib dibatasi BATAS_TUJUAN.uraian');
    assert.match(fnForm, /maksPanjang=\{10\}/, 'Isian target wajib dibatasi 10 karakter tanggal');

    // Riwayat versi terlipat secara bawaan ("Lihat perubahan") dan bernomor + berjam seperti 026
    assert.match(layar, /const \[bukaRiwayat, setBukaRiwayat\] = useState\(false\);/);
    assert.match(layar, /\{teksVersiTujuan\(v\)\}/);
    const contohVersi = jalurSaya.teksVersiTujuan({
      versi_ke: 2,
      dibuat_pada: '2026-11-24T03:15:00Z',
      judul: 'Masuk Informatika lewat SNBT',
    });
    assert.match(contohVersi, /^Versi ke-2 \(.*\d{1,2}[.:]15\): Masuk Informatika lewat SNBT$/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Keadaan kosong (#B4E1EB dua mode), memuat, galat, batas 40 kata, aksesibilitas, dan token', () => {
  test('Keadaan kosong memakai maskot di lingkaran latarMaskot (#B4E1EB kedua mode), memuat memakai kerangka, galat punya Coba lagi, dan simpan satu kalimat hangat', () => {
    assert.equal(tema.warnaTerang.latarMaskot.toUpperCase(), '#B4E1EB');
    assert.equal(tema.warnaGelap.latarMaskot.toUpperCase(), '#B4E1EB');
    assert.equal(jalurSaya.TEKS_JALUR_SAYA_V2.kosongJalurJudul, 'Pilihan jalur sedang disiapkan');

    const layar = baca('components/screens/v2/JalurSayaV2.tsx');
    assert.match(layar, /backgroundColor:\s*warna\.latarMaskot/);
    assert.match(layar, /require\('\.\.\/\.\.\/\.\.\/assets\/mascot-blue\.png'\)/);
    assert.match(layar, /<PlaceholderMemuat baris=\{2\} label=\{T\.memuatLabel\} \/>/);
    assert.match(layar, /<KeadaanGalat judul=\{T\.galatJudul\} pesan=\{T\.galatPesan\} onCobaLagi=\{onCobaLagi\} \/>/);
    assert.match(layar, /<PesanStatus jenis="sukses" berlatar>/);

    for (const k of ['berhasilSimpanJalur', 'berhasilJedaJalur', 'berhasilSimpanTujuan', 'berhasilTercapai']) {
      const kalimat = jalurSaya.TEKS_JALUR_SAYA_V2[k];
      assert.ok(jalurSaya.hitungKataJalurSaya(kalimat) <= 6, `${k} terlalu panjang: "${kalimat}"`);
    }
  });

  test('Maksimal 40 kata teks tetap per keadaan layar Jalur Saya v2', () => {
    assert.equal(jalurSaya.BATAS_KATA_JALUR_SAYA, 40);
    for (const keadaan of ['siap_isi', 'kosong_jalur', 'form_tujuan', 'galat', 'fitur_mati', 'perlu_kebijakan']) {
      const daftar = jalurSaya.teksTetapJalurSayaV2(keadaan);
      const jumlah = jalurSaya.hitungKataJalurSaya(daftar.join(' '));
      assert.ok(jumlah <= 40, `${keadaan}: ${jumlah} kata > 40`);
    }
  });

  test('Semua kontrol berlabel, target sentuh >= 44 pt, checkbox/radio meneruskan dicentang, Modal menghormati Kurangi gerakan, dan papan ketik aman', () => {
    assert.ok(tema.ukuran.sentuhMin >= 44);
    const rel = 'components/screens/v2/JalurSayaV2.tsx';
    const s = baca(rel);
    assert.doesNotMatch(s, /\b(Pressable|TouchableOpacity|TouchableHighlight|TextInput)\b/);
    assert.match(s, /const kurangiGerak = useKurangiGerak\(\);/);
    assert.match(s, /animationType=\{kurangiGerak \? 'none' : 'slide'\}/);
    assert.match(s, /<KeyboardAvoidingView/);
    assert.match(s, /keyboardShouldPersistTaps="handled"/);

    let jumlahCheckbox = 0;
    let jumlahRadio = 0;
    jelajah(ast(rel), (n) => {
      if (!(ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n))) return;
      const tag = n.tagName.getText();
      const atribut = new Map(
        n.attributes.properties.filter(ts.isJsxAttribute).map((a) => [a.name.getText(), a])
      );
      if (tag === 'Sentuh') {
        assert.ok(atribut.has('peran') && atribut.has('label'), '<Sentuh> wajib memiliki peran dan label');
        const peranAttr = atribut.get('peran');
        const nilaiPeran =
          peranAttr.initializer && ts.isStringLiteral(peranAttr.initializer) ? peranAttr.initializer.text : '';
        if (nilaiPeran === 'checkbox') {
          jumlahCheckbox += 1;
          assert.ok(atribut.has('dicentang'), '<Sentuh peran="checkbox"> wajib meneruskan dicentang');
        }
        if (nilaiPeran === 'radio') {
          jumlahRadio += 1;
          assert.ok(atribut.has('dicentang') && atribut.has('terpilih'), '<Sentuh peran="radio"> wajib meneruskan dicentang & terpilih');
        }
      }
      if (tag === 'Tombol' || tag === 'Isian') {
        assert.ok(atribut.has('label'), `<${tag}> wajib memiliki label`);
      }
    });
    assert.ok(jumlahCheckbox >= 1, 'Kartu jalur harus memakai peran checkbox');
    assert.ok(jumlahRadio >= 1, 'Pilihan jalur terkait tujuan harus memakai peran radio');
    assert.ok((s.match(/<PilihanRadioKecilV2\b/g) || []).length >= 3, 'FormTujuanV2 harus merender opsi radio jalur');
  });

  test('0 HEX langsung di seluruh berkas 033 dan tidak ada warna ungu terlarang', () => {
    const POLA_WARNA = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(.*)$/i;
    const NAMA_WARNA = new Set(['white', 'black', 'red', 'green', 'blue', 'gray', 'grey', 'orange', 'yellow', 'transparent']);
    const UNGU_TERLARANG = new RegExp('#' + '6a3dff', 'i');
    const langgar = [];

    for (const rel of BERKAS_033) {
      const isi = baca(rel);
      assert.doesNotMatch(isi, UNGU_TERLARANG, `${rel}: ungu terlarang dilarang`);
      const sf = ast(rel);
      const baris = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      jelajah(sf, (n) => {
        if (
          (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) &&
          (POLA_WARNA.test(n.text) || NAMA_WARNA.has(n.text.toLowerCase()))
        ) {
          langgar.push(`${rel}:${baris(n)} "${n.text}"`);
        }
        if (ts.isTemplateExpression(n)) {
          const gabung = n.head.text + n.templateSpans.map((sp) => sp.literal.text).join('');
          if (/#[0-9a-f]{3,8}|(rgb|hsl)a?\(/i.test(gabung)) {
            langgar.push(`${rel}:${baris(n)} template warna`);
          }
        }
      });
    }
    assert.deepEqual(langgar, []);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Gerbang rilis, dokumentasi, pengecualian sempit apk-v2, dan kompatibilitas APK 1.0.0', () => {
  test('Berkas 033 terdaftar di gerbang rilis navigasi-v2, belum disetujui, dan menahan build bila saklar dinyalakan', () => {
    assert.ok(fs.existsSync(path.join(AKAR_APP, 'docs', 'peta-jalur-saya-v2.md')));
    const draf = baca('docs/draf-teks-jalur-saya-v2.md');
    assert.match(draf, /DRAF/);
    for (const teks of Object.values(jalurSaya.TEKS_JALUR_SAYA_V2)) {
      assert.ok(draf.includes(teks), `TEKS_JALUR_SAYA_V2 belum tercatat di docs/draf-teks-jalur-saya-v2.md: "${teks}"`);
    }

    const entri = gerbang.TEKS.find((x) => x.id === 'navigasi-v2');
    for (const rel of ['lib/jalurSayaV2.ts', 'components/screens/v2/JalurSayaV2.tsx', 'docs/draf-teks-jalur-saya-v2.md']) {
      assert.ok(entri.berkas.includes(rel), `${rel} wajib terdaftar di periksa-gerbang-rilis.js`);
    }
    assert.ok(!baca('docs/persetujuan-teks-rilis.json').includes('navigasi-v2'));

    // Bila hanya berkas 033 yang masih DRAF dan EXPO_PUBLIC_NAVIGASI_V2=1 di eas.json -> ditahan gerbang rilis
    const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'gerbang-033-'));
    try {
      const tulis = (rel, isi) => {
        fs.mkdirSync(path.dirname(path.join(akar, rel)), { recursive: true });
        fs.writeFileSync(path.join(akar, rel), typeof isi === 'string' ? isi : JSON.stringify(isi));
      };
      tulis('lib/kebijakan-privasi.json', { versi: 1, status: 'Berlaku.', ringkasan: ['Ringkas.'], isi: [] });
      for (const rel of entri.berkas) {
        tulis(rel, rel === 'docs/draf-teks-jalur-saya-v2.md' ? 'DRAF\n' : 'export const X = 1;\n');
      }
      tulis('eas.json', { build: { coba: { env: { EXPO_PUBLIC_NAVIGASI_V2: '1' } } } });
      const pesan = gerbang.periksa(akar).map((m) => m.pesan);
      assert.ok(pesan.includes('Teks navigasi v2 dan Arah Saya: masih draf dan belum disetujui.'), pesan.join(' | '));
    } finally {
      fs.rmSync(akar, { recursive: true, force: true });
    }

    // Pengecualian "Jalur Saya" di apk-v2-app.test.js tetap sempit hanya 3 berkas lib v2
    assert.match(
      baca('server/tests/apk-v2-app.test.js'),
      /\['lib\/arahSaya\.ts', 'lib\/navigasiV2\.ts', 'lib\/jalurSayaV2\.ts'\]/
    );

    // Uji HP memuat bagian 14 dan pengingat --clear tanpa klaim sudah diuji di HP
    const ujiHp = baca('docs/uji-hp-expo-go.md');
    assert.match(ujiHp, /## 14\. Jalur Saya v2 \(LANJUT_033\)/);
    assert.match(ujiHp, /--clear/);

    // Berkas kompatibel-apk-lama.test.js sama sekali tidak disentuh oleh task ini
    const status = execFileSync('git', ['status', '--porcelain', 'server/tests/kompatibel-apk-lama.test.js'], {
      cwd: AKAR_APP,
      encoding: 'utf8',
    }).trim();
    assert.equal(status, '', 'server/tests/kompatibel-apk-lama.test.js tidak boleh diubah');
    assert.ok(crypto.createHash('sha256').update(baca('server/tests/kompatibel-apk-lama.test.js')).digest('hex').length === 64);
  });
});
