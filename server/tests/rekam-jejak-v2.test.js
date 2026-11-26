// LANJUT_036: Rekam Jejak v2 (reskin Portofolio & Bukti di /portofolio, /portofolio-tulis,
// /portofolio-butir di balik EXPO_PUBLIC_PORTOFOLIO bersama EXPO_PUBLIC_NAVIGASI_V2, keduanya
// mati bawaan). Tanpa perubahan server, skema, migrasi, atau dependensi baru.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const { muatModulApp } = require('./muat-ts-app');
const { buatButirSkema, ubahButirSkema } = require('../src/modul/butir-bukti/butir-bukti.skema');
const gerbang = require('../tools/periksa-gerbang-rilis');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));

const fitur = muatModulApp('lib/fiturApp');
const rekam = muatModulApp('lib/rekamJejakV2');
const arahSaya = muatModulApp('lib/arahSaya');
const tema = muatModulApp('theme/v2/index');

const ast = (rel) => ts.createSourceFile(rel, baca(rel), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
function jelajahAst(n, fn) {
  fn(n);
  ts.forEachChild(n, (c) => jelajahAst(c, fn));
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

function aturanBlokirPortofolio(nilai) {
  const env = { ...process.env };
  delete env.EXPO_PUBLIC_PORTOFOLIO;
  if (nilai !== undefined) env.EXPO_PUBLIC_PORTOFOLIO = nilai;
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

const BERKAS_036 = [
  'lib/rekamJejakV2.ts',
  'hooks/useRekamJejakV2.ts',
  'components/screens/v2/RekamJejakV2.tsx',
  'components/screens/v2/RekamJejakFotoV2.tsx',
  'app/(app)/portofolio.tsx',
  'app/(app)/portofolio-tulis.tsx',
  'app/(app)/portofolio-butir.tsx',
];

// ---------------------------------------------------------------------------------------------
describe('Saklar mati vs menyala, isolasi v1, dan ketiadaan jejak saat portofolio mati', () => {
  test('Kedua saklar (EXPO_PUBLIC_PORTOFOLIO & EXPO_PUBLIC_NAVIGASI_V2) bawaan mati di app.config (sabotase #9)', () => {
    const kosong = muatKonfigApp({});
    assert.equal(kosong.portofolio, false);
    assert.equal(kosong.navigasiV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_PORTOFOLIO: '0', EXPO_PUBLIC_NAVIGASI_V2: '0' }).portofolio, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_PORTOFOLIO: '0', EXPO_PUBLIC_NAVIGASI_V2: '0' }).navigasiV2, false);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_PORTOFOLIO: '1', EXPO_PUBLIC_NAVIGASI_V2: '1' }).portofolio, true);
    assert.equal(muatKonfigApp({ EXPO_PUBLIC_PORTOFOLIO: '1', EXPO_PUBLIC_NAVIGASI_V2: '1' }).navigasiV2, true);
    assert.equal(fitur.portofolioAktif({ portofolio: true }), true);
    assert.equal(fitur.portofolioAktif({}), false);
  });

  test('EXPO_PUBLIC_PORTOFOLIO mati: tidak ada kartu pintu di Arah Saya, rute terblokir, dan tidak ada permintaan jaringan (sabotase #12)', () => {
    const pintuMati = arahSaya.daftarPintuArahSaya({ discover: true, jalurTujuan: true, portofolio: false });
    assert.ok(!pintuMati.some((p) => p.id === 'rekam_jejak' || p.href === '/portofolio'));
    const pintuNyala = arahSaya.daftarPintuArahSaya({ discover: true, jalurTujuan: true, portofolio: true });
    assert.equal(pintuNyala[0].id, 'rekam_jejak');
    assert.equal(pintuNyala[0].judul, 'Rekam Jejak');
    assert.equal(pintuNyala[0].href, '/portofolio');
    assert.equal(pintuNyala[0].bobot, 'utama');

    // Rute terblokir di Metro saat saklar portofolio mati
    const blokir = aturanBlokirPortofolio('0');
    for (const nama of ['portofolio.tsx', 'portofolio-tulis.tsx', 'portofolio-butir.tsx']) {
      assert.ok(blokir.some((r) => r.test(`/repo/app/(app)/${nama}`)), nama);
    }

    // Hook v2 hanya aktif bila kedua saklar menyala
    const hookV2 = baca('hooks/useRekamJejakV2.ts');
    assert.match(hookV2, /const FITUR_AKTIF = portofolioAktif\(EXTRA\) && navigasiV2Aktif\(EXTRA\);/);
    assert.match(hookV2, /enabled:\s*FITUR_AKTIF && !!token/);
  });

  test('Saklar v2 mati merender Portofolio v1 utuh; menyala merender Rekam Jejak v2 (daftar, tulis, detail, foto)', () => {
    const pasangan = [
      ['app/(app)/portofolio.tsx', 'RekamJejakDaftarV2', 'PortofolioDaftarScreen'],
      ['app/(app)/portofolio-tulis.tsx', 'RekamJejakTulisV2', 'PortofolioTulisScreen'],
      ['app/(app)/portofolio-butir.tsx', 'RekamJejakDetailV2', 'PortofolioDetailScreen'],
    ];
    for (const [rel, kompV2, kompV1] of pasangan) {
      const s = baca(rel);
      assert.match(s, /if \(!portofolioAktif\(Constants\.expoConfig\?\.extra\)\) return <Redirect href="\/linimasa" \/>;/, rel);
      assert.match(s, new RegExp(`if \\(navigasiV2Aktif\\(extra\\)\\) return <${kompV2} key=\\{pengguna\\?\\.id\\} \\/>;`), rel);
      assert.match(s, new RegExp(`return <${kompV1} key=\\{pengguna\\?\\.id\\} \\/>;`), rel);
    }

    // Berkas v1 Portofolio tidak diubah dan tidak mengimpor tema/modul v2
    for (const v1 of ['components/screens/PortofolioScreens.tsx', 'components/screens/PortofolioFoto.tsx', 'hooks/usePortofolio.ts', 'lib/portofolio.ts']) {
      assert.doesNotMatch(baca(v1), /rekamJejakV2|useRekamJejakV2|RekamJejak|useTemaV2|theme\/v2/, v1);
      const st = execFileSync('git', ['status', '--porcelain', v1], { cwd: AKAR_APP, encoding: 'utf8' }).trim();
      assert.equal(st, '', `${v1} (v1) tidak boleh diubah`);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('Penyamaran id jalur, larangan berbagi/penilaian, kontrak API butir, dan formulir satu tombol', () => {
  const JALUR_CAMPUR = [
    { id: 'melanjutkan', nama: '[DUMMY] Melanjutkan', deskripsi_singkat: 'S.', status_teks: 'disetujui', urutan: 1 },
    { id: 'bekerja', nama: 'Bekerja Draf Rahasia', deskripsi_singkat: 'Draf.', status_teks: 'draf', urutan: 2 },
  ];

  test('Id jalur mentah tidak pernah tampil; jalur draf tampil netral lewat labelJalur (sabotase #1)', () => {
    assert.match(baca('lib/rekamJejakV2.ts'), /import \{ LABEL_JALUR_NETRAL, labelJalur \} from '\.\/jalurSayaV2';/);

    // Tanpa jalur -> null (chip tidak tampil)
    assert.equal(rekam.labelJalurButirV2({ jalur_minat_id: null, jalur_belum_tersedia: false }, JALUR_CAMPUR), null);
    assert.equal(rekam.labelJalurButirV2({ jalur_minat_id: null }, JALUR_CAMPUR), null);
    // Jalur disetujui -> nama jalur
    assert.equal(rekam.labelJalurButirV2({ jalur_minat_id: 'melanjutkan', jalur_belum_tersedia: false }, JALUR_CAMPUR), '[DUMMY] Melanjutkan');
    // Jalur draf tersamar atau id mentah tak dikenal -> netral, BUKAN id mentah
    for (const masukan of [
      { jalur_minat_id: null, jalur_belum_tersedia: true },
      { jalur_minat_id: 'bekerja', jalur_belum_tersedia: false },
      { jalur_minat_id: 'wirausaha', jalur_belum_tersedia: false },
      { jalur_minat_id: 'melanjutkan', jalur_belum_tersedia: true },
    ]) {
      const lbl = rekam.labelJalurButirV2(masukan, JALUR_CAMPUR);
      assert.equal(lbl, 'Jalur belum tersedia', JSON.stringify(masukan));
      assert.doesNotMatch(lbl, /melanjutkan|bekerja|wirausaha|Rahasia/i);
    }

    // RekamJejakV2 selalu memakai labelJalurButirV2 dan tidak pernah merender butir.jalur_minat_id langsung
    const layar = baca('components/screens/v2/RekamJejakV2.tsx');
    assert.match(layar, /const labelJalurTerkait = labelJalurButirV2\(butir, daftarJalur\);/);
    assert.match(layar, /const labelJalurTerkait = labelJalurButirV2\(butir, jalur\.data\);/);
    assert.doesNotMatch(layar, /butir\.jalur_minat_id/);
  });

  test('Hanya privat: tidak ada teks atau ikon berbagi, penilaian, peringkat, lomba, atau perbandingan (sabotase #2)', () => {
    const POLA_TERLARANG = /bagikan|share|publik|penilaian|skor|peringkat|ranking|lomba|juara|terbaik|bandingkan|teman|leaderboard/i;
    const nilaiTeks = Object.values(rekam.TEKS_REKAM_JEJAK_V2).join(' ');
    assert.doesNotMatch(nilaiTeks, POLA_TERLARANG);
    assert.doesNotMatch(nilaiTeks, /\bbagi\b|\bnilai\b/i);

    for (const rel of [
      'lib/rekamJejakV2.ts',
      'components/screens/v2/RekamJejakV2.tsx',
      'components/screens/v2/RekamJejakFotoV2.tsx',
      'docs/draf-teks-rekam-jejak-v2.md',
    ]) {
      const isi = baca(rel);
      const tanpaKomentar = isi
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|\s)\/\/.*$/gm, '$1')
        .replace(/^>.*$/gm, '');
      assert.doesNotMatch(tanpaKomentar, POLA_TERLARANG, `${rel} memuat kata berbagi/penilaian/lomba terlarang`);
      assert.doesNotMatch(isi, /\b(ShareNetwork|ShareFat|Trophy|Medal|Crown|Star)\b/, `${rel} memuat ikon berbagi/lomba terlarang`);
    }
  });

  test('Rute API butir dan foto tetap sama persis dengan v1 (sabotase #7)', () => {
    const hookV2 = baca('hooks/useRekamJejakV2.ts');
    assert.match(hookV2, /apiFetch<ButirBukti\[\]>\('\/butir-bukti',/);
    assert.match(hookV2, /apiAmbilDataUri\(`\/butir-bukti\/\$\{butirId\}\/foto\/\$\{fotoId\}`,\s*token!\)/);
    assert.match(hookV2, /apiFetch<ButirBukti>\(id \? `\/butir-bukti\/\$\{id\}` : '\/butir-bukti',/);
    assert.match(hookV2, /method:\s*id \? 'PATCH' : 'POST'/);
    assert.match(hookV2, /apiFetch\(`\/butir-bukti\/\$\{butir\.id\}`,\s*\{\s*method:\s*'DELETE'/);
    assert.match(hookV2, /apiFetch\(`\/butir-bukti\/\$\{butirId\}\/foto\/\$\{fotoId\}`,\s*\{\s*method:\s*'DELETE'/);
    assert.match(hookV2, /apiUnggah<FotoButir>\(`\/butir-bukti\/\$\{butirId\}\/foto`,/);
    assert.doesNotMatch(hookV2, /\/tujuan\/bukti\/|jalur_minat_id:|tujuan_id:|visibilitas:/);
  });

  test('Formulir satu layar satu tombol Simpan tanpa wizard; validasi judul wajib & tautan http/https sama dengan server (sabotase #4 & #8)', () => {
    const dasar = { judul: 'Poster projek', jenis: 'karya', uraian: '', tautan: '', tanggal: '' };
    assert.deepEqual(rekam.periksaIsianButir(dasar), {});
    assert.ok(rekam.periksaIsianButir({ ...dasar, judul: '   ' }).judul);
    assert.ok(buatButirSkema.safeParse(rekam.badanButir(dasar)).success);
    assert.ok(ubahButirSkema.safeParse(rekam.badanButir(dasar)).success);

    // Tautan berbahaya ditolak
    for (const buruk of ['javascript:alert(1)', 'data:text/html,x', 'file:///etc/passwd', 'ftp://x.test', 'bukan-tautan']) {
      assert.equal(rekam.tautanSah(buruk), false, buruk);
      assert.ok(rekam.periksaIsianButir({ ...dasar, tautan: buruk }).tautan, buruk);
    }
    assert.equal(rekam.tautanSah('https://contoh.test/karya'), true);
    assert.equal(rekam.tautanSah('http://contoh.test/karya'), true);

    // Urutan terbaru di atas
    const urut = rekam.urutkanButirTerbaru([
      { id: '1', dibuat_pada: '2026-11-20T08:00:00Z' },
      { id: '2', dibuat_pada: '2026-11-26T09:00:00Z' },
      { id: '3', dibuat_pada: '2026-11-23T08:00:00Z' },
    ]);
    assert.deepEqual(urut.map((b) => b.id), ['2', '3', '1']);

    // FormButirV2: tepat satu tombol Simpan, tanpa wizard/langkah ganda, validasi periksaIsianButir
    const layar = baca('components/screens/v2/RekamJejakV2.tsx');
    const fnForm = /function FormButirV2\([\s\S]*?\n\}\n/.exec(layar)?.[0];
    assert.ok(fnForm, 'FormButirV2 harus ada');
    const tombolForm = fnForm.match(/<Tombol\b/g) ?? [];
    assert.equal(tombolForm.length, 1, 'FormButirV2 wajib hanya punya satu tombol Simpan (tanpa wizard)');
    assert.match(fnForm, /<Tombol\b[^>]*label=\{T\.simpan\}/);
    assert.doesNotMatch(fnForm, /setLangkah|langkah\s*===|Berikutnya|Lanjut/);
    assert.match(fnForm, /const periksa = periksaIsianButir\(isian\);/);
    assert.match(fnForm, /if \(Object\.keys\(periksa\)\.length\) return;/);

    // Detail hanya membuka tautan yang lolos tautanSah
    assert.match(layar, /\{butir\.tautan && tautanSah\(butir\.tautan\) \?/);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Foto: batas (3/30/5 MB), HEIC, Coba lagi, privasi K29, tanpa cache disk, bersih saat keluar akun', () => {
  test('Batas foto 3/butir, 30/akun, 5 MB, HEIC ke JPEG, Coba lagi, dan peringatan privasi K29 (sabotase #3 & #5)', async () => {
    assert.equal(rekam.BATAS_FOTO.ukuranByte, 5 * 1024 * 1024);
    assert.equal(rekam.BATAS_FOTO.perButir, 3);
    assert.equal(rekam.BATAS_FOTO.perAkun, 30);
    assert.deepEqual(rekam.batasFoto(3, 10), { bolehTambah: false, alasan: 'butir' });
    assert.deepEqual(rekam.batasFoto(0, 30), { bolehTambah: false, alasan: 'akun' });
    assert.match(rekam.teksBatasFotoV2(1, 12), /1\/3 foto, 12\/30 akun \(maks 5 MB\)/);

    // HEIC dikonversi ke JPEG dan ukuran > 5 MB ditolak
    const catatan = { simpan: [] };
    const buatAlat = (ukuran) => ({
      web: false,
      formatJpeg: 'jpeg',
      mintaIzinKamera: async () => ({ granted: true, canAskAgain: true }),
      bukaGaleri: async () => ({
        canceled: false,
        assets: [{ uri: 'asal.heic', width: 2400, height: 1800, mimeType: 'image/heic', fileName: 'IMG.HEIC' }],
      }),
      bukaKamera: async () => ({ canceled: true, assets: null }),
      olah: () => ({
        resize() {},
        renderAsync: async () => ({
          width: 2400,
          height: 1800,
          saveAsync: async (o) => {
            catatan.simpan.push(o);
            return { uri: 'hasil.jpg' };
          },
        }),
      }),
      ukuran: async () => ({ ukuran }),
    });
    const ok = await rekam.siapkanFoto('galeri', undefined, buatAlat(500_000));
    assert.equal(ok.status, 'siap');
    assert.equal(ok.foto.mime, 'image/jpeg');
    assert.deepEqual(catatan.simpan, [{ format: 'jpeg', compress: 0.8 }]);
    const kebesaran = await rekam.siapkanFoto('galeri', undefined, buatAlat(5 * 1024 * 1024 + 1));
    assert.deepEqual(kebesaran, { status: 'gagal', kode: 'FOTO_TERLALU_BESAR' });

    // Layar foto menampilkan batas sebelum dicoba, peringatan privasi K29, dan Coba lagi tanpa isi ulang
    const layarFoto = baca('components/screens/v2/RekamJejakFotoV2.tsx');
    assert.match(layarFoto, /\{T\.privasiFoto\}/);
    assert.match(layarFoto, /\{teksBatasFotoV2\(butir\.foto\.length, jumlahAkun\)\}/);
    assert.match(layarFoto, /!batas\.bolehTambah \?/);
    assert.match(layarFoto, /<Tombol varian="utama" label=\{T\.cobaLagi\} onPress=\{\(\) => void kirim\(tahap\.foto\)\} \/>/);
    assert.match(layarFoto, /accessibilityLabel=\{T\.altFoto\}/);
    assert.doesNotMatch(layarFoto, /foto\.nama_asli/);

    // Peringatan privasi memuat inti K29 dan bebas kalimat lama K29 / klaim privasi baru
    for (const kata of ['akunmu', 'pengelola secara teknis', 'dokumen pribadi', 'KTP', 'rapor', 'wajah orang', 'tanpa izin']) {
      assert.ok(rekam.TEKS_REKAM_JEJAK_V2.privasiFoto.includes(kata), kata);
    }
    assert.doesNotMatch(
      rekam.TEKS_REKAM_JEJAK_V2.privasiFoto,
      /tanpa keperluan|hanya terlihat olehmu|hanya kamu yang bisa melihat|aman sepenuhnya/i
    );
  });

  test('Tanpa cache disk dan pembersihan saat keluar akun serta unmount tetap utuh (sabotase #6)', () => {
    const hookV2 = baca('hooks/useRekamJejakV2.ts');
    const layarFoto = baca('components/screens/v2/RekamJejakFotoV2.tsx');
    const auth = baca('providers/AuthProvider.tsx');

    assert.ok(hookV2.includes("const KUNCI = ['butir_bukti'] as const;"));
    assert.ok(hookV2.includes("queryKey: [...KUNCI, 'foto', fotoId]"));
    assert.ok(hookV2.includes('apiAmbilDataUri('));
    assert.ok(layarFoto.includes('source={{ uri: foto.data }}'));
    assert.doesNotMatch(layarFoto + hookV2, /headers:|AsyncStorage|writeAsString|\.write\(/);
    assert.match(layarFoto, /await unggah\(foto, [^\n]*\);\n\s*buang\(foto\);/);
    assert.match(layarFoto, /if \(belumTerkirim\.current\) hapusBerkasSementara\(belumTerkirim\.current\.uri\);/);

    assert.match(auth, /KUNCI_DATA_AKUN = \[[\s\S]*\['butir_bukti'\]\] as const/);
    const fnHapusData = /function hapusDataAkun\(queryClient: QueryClient\) \{([\s\S]*?)\n\}/.exec(auth)?.[1];
    assert.ok(fnHapusData && fnHapusData.includes('if (PORTOFOLIO) hapusFotoSementara();'));
    for (const jalurKeluar of ['akhiriSesi', 'terapkanSesi', 'keluar', 'selesaiHapusAkun']) {
      const isi = new RegExp(`const ${jalurKeluar} = useCallback\\(([\\s\\S]*?)\\n  \\}, \\[`).exec(auth)?.[1];
      assert.ok(isi && isi.includes('hapusDataAkun(queryClient)'), jalurKeluar);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('Keadaan layar, penanda teks non-warna, batas 40 kata, aksesibilitas, token 0 HEX, dan gerbang rilis', () => {
  test('Keadaan kosong (#B4E1EB dua mode), memuat, galat + Coba lagi, 404 Fitur belum tersedia, konfirmasi hapus, dan penanda tertulis (sabotase #10)', () => {
    assert.equal(tema.warnaTerang.latarMaskot.toUpperCase(), '#B4E1EB');
    assert.equal(tema.warnaGelap.latarMaskot.toUpperCase(), '#B4E1EB');
    assert.equal(rekam.keadaanDaftar({ isPending: false, galat: { status: 404 } }), 'fitur_mati');
    assert.equal(rekam.TEKS_REKAM_JEJAK_V2.fiturMatiJudul, 'Fitur belum tersedia');
    assert.match(rekam.TEKS_REKAM_JEJAK_V2.yakinHapus, /foto.*ikut terhapus/i);

    const layar = baca('components/screens/v2/RekamJejakV2.tsx');
    assert.match(layar, /backgroundColor:\s*warna\.latarMaskot/);
    assert.match(layar, /require\('\.\.\/\.\.\/\.\.\/assets\/mascot-blue\.png'\)/);
    assert.match(layar, /<PlaceholderMemuat baris=\{2\} label=\{T\.memuatDaftar\} \/>/);
    assert.match(layar, /<KeadaanKosong judul=\{T\.fiturMatiJudul\} teks=\{T\.fiturMatiTeks\} \/>/);
    assert.match(layar, /<KeadaanGalat[\s\S]*?onCobaLagi=\{onCobaLagi\}/);
    assert.match(layar, /\{T\.yakinHapus\}/);

    // Penanda jenis pada kartu & detail berupa teks tertulis, bukan warna saja (sabotase #10)
    const fnKartu = /function KartuButirV2\([\s\S]*?\n\}\n/.exec(layar)?.[0];
    assert.ok(fnKartu);
    assert.match(fnKartu, /<Teks[^>]*>\s*\{labelJenis\}\s*<\/Teks>/, 'penanda jenis pada kartu wajib tertulis');
    const fnDetail = /export function RekamJejakDetailV2\([\s\S]*?\n\}\n/.exec(layar)?.[0];
    assert.ok(fnDetail);
    assert.match(fnDetail, /<Teks[^>]*>\s*\{labelJenisButir\(butir\.jenis\)\}\s*<\/Teks>/, 'penanda jenis pada detail wajib tertulis');
  });

  test('Maksimal 40 kata teks tetap pada semua keadaan layar Rekam Jejak v2', () => {
    assert.equal(rekam.BATAS_KATA_REKAM_JEJAK, 40);
    for (const keadaan of [
      'daftar_kosong',
      'daftar_isi',
      'formulir',
      'detail',
      'detail_batas_penuh',
      'detail_konfirmasi_hapus',
      'galat',
      'fitur_mati',
      'perlu_kebijakan',
      'tidak_ditemukan',
    ]) {
      const daftar = rekam.teksTetapRekamJejakV2(keadaan);
      const jumlah = rekam.hitungKataRekamJejak(daftar.join(' '));
      assert.ok(jumlah <= 40, `${keadaan}: ${jumlah} kata > 40`);
    }
  });

  test('Semua kontrol berlabel, target sentuh >= 44 pt, radio dicentang/terpilih, papan ketik aman, dan Phosphor Icons', () => {
    assert.ok(tema.ukuran.sentuhMin >= 44);
    for (const rel of ['components/screens/v2/RekamJejakV2.tsx', 'components/screens/v2/RekamJejakFotoV2.tsx']) {
      const s = baca(rel);
      assert.doesNotMatch(s, /\b(Pressable|TouchableOpacity|TouchableHighlight|TextInput)\b/, rel);
      assert.doesNotMatch(s, /from '\.\.\/\.\.\/ui\/Ikon'/, `${rel} wajib memakai Ikon Phosphor v2`);

      jelajahAst(ast(rel), (n) => {
        if (!(ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n))) return;
        const tag = n.tagName.getText();
        const atribut = new Map(
          n.attributes.properties.filter(ts.isJsxAttribute).map((a) => [a.name.getText(), a])
        );
        if (tag === 'Sentuh') {
          assert.ok(atribut.has('peran') && atribut.has('label'), `${rel}: <Sentuh> tanpa peran/label`);
          const peranAttr = atribut.get('peran');
          const nilaiPeran =
            peranAttr.initializer && ts.isStringLiteral(peranAttr.initializer) ? peranAttr.initializer.text : '';
          if (nilaiPeran === 'radio') {
            assert.ok(atribut.has('dicentang') && atribut.has('terpilih'), `${rel}: radio wajib dicentang & terpilih`);
          }
        }
        if (tag === 'Tombol' || tag === 'Isian') {
          assert.ok(atribut.has('label'), `${rel}: <${tag}> tanpa label`);
        }
      });
    }
    assert.match(baca('components/screens/v2/RekamJejakV2.tsx'), /<KeyboardAvoidingView/);
  });

  test('0 HEX langsung di seluruh berkas 036 dan tidak ada warna ungu terlarang (sabotase #11)', () => {
    const POLA_WARNA = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\(.*)$/i;
    const NAMA_WARNA = new Set(['white', 'black', 'red', 'green', 'blue', 'gray', 'grey', 'orange', 'yellow', 'transparent']);
    const UNGU_TERLARANG = new RegExp('#' + '6a3dff', 'i');
    const langgar = [];

    for (const rel of BERKAS_036) {
      const isi = baca(rel);
      assert.doesNotMatch(isi, UNGU_TERLARANG, `${rel}: ungu terlarang dilarang`);
      const sf = ast(rel);
      const baris = (n) => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
      jelajahAst(sf, (n) => {
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

  test('Gerbang rilis menahan teks DRAF 036, dokumen lengkap, server tidak berubah, dan kompatibel-apk-lama utuh', () => {
    assert.ok(fs.existsSync(path.join(AKAR_APP, 'docs', 'peta-rekam-jejak-v2.md')));
    const draf = baca('docs/draf-teks-rekam-jejak-v2.md');
    assert.match(draf, /DRAF/);
    for (const teks of Object.values(rekam.TEKS_REKAM_JEJAK_V2)) {
      assert.ok(draf.includes(teks), `TEKS_REKAM_JEJAK_V2 belum tercatat di docs/draf-teks-rekam-jejak-v2.md: "${teks}"`);
    }

    const entri = gerbang.TEKS.find((x) => x.id === 'navigasi-v2');
    for (const rel of [
      'lib/rekamJejakV2.ts',
      'components/screens/v2/RekamJejakV2.tsx',
      'components/screens/v2/RekamJejakFotoV2.tsx',
      'docs/draf-teks-rekam-jejak-v2.md',
    ]) {
      assert.ok(entri.berkas.includes(rel), `${rel} wajib terdaftar di periksa-gerbang-rilis.js`);
    }
    assert.ok(!baca('docs/persetujuan-teks-rilis.json').includes('navigasi-v2'));

    const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'gerbang-036-'));
    try {
      const tulis = (rel, isi) => {
        fs.mkdirSync(path.dirname(path.join(akar, rel)), { recursive: true });
        fs.writeFileSync(path.join(akar, rel), typeof isi === 'string' ? isi : JSON.stringify(isi));
      };
      tulis('lib/kebijakan-privasi.json', { versi: 1, status: 'Berlaku.', ringkasan: ['Ringkas.'], isi: [] });
      for (const rel of entri.berkas) {
        tulis(rel, rel === 'docs/draf-teks-rekam-jejak-v2.md' ? 'DRAF\n' : 'export const X = 1;\n');
      }
      tulis('eas.json', { build: { coba: { env: { EXPO_PUBLIC_NAVIGASI_V2: '1' } } } });
      const pesan = gerbang.periksa(akar).map((m) => m.pesan);
      assert.ok(pesan.includes('Teks navigasi v2 dan Arah Saya: masih draf dan belum disetujui.'), pesan.join(' | '));
    } finally {
      fs.rmSync(akar, { recursive: true, force: true });
    }

    const ujiHp = baca('docs/uji-hp-expo-go.md');
    assert.match(ujiHp, /## 16\. Rekam Jejak v2 \(LANJUT_036\)/);
    assert.match(ujiHp, /HEIC/);
    assert.match(ujiHp, /--clear/);

    // Server, migrasi, persetujuan rilis, dan kompatibel-apk-lama.test.js tidak diubah
    for (const rel of [
      'server/src',
      'server/tests/kompatibel-apk-lama.test.js',
      'docs/persetujuan-teks-rilis.json',
      'eas.json',
    ]) {
      const st = execFileSync('git', ['status', '--porcelain', rel], { cwd: AKAR_APP, encoding: 'utf8' }).trim();
      assert.equal(st, '', `${rel} tidak boleh diubah oleh LANJUT_036`);
    }
    assert.equal(crypto.createHash('sha256').update(baca('server/tests/kompatibel-apk-lama.test.js')).digest('hex').length, 64);
  });
});
