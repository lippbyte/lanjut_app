// LANJUT_024 seri v2: sisi aplikasi Discover. Pola sama dengan jalur-tujuan-app.test.js: modul murni
// dites langsung, dan susunan layar dites dari sumbernya.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { muatModulApp } = require('./muat-ts-app');
const { refleksiSkema, BATAS_DISCOVER } = require('../src/modul/discover/discover.skema');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const fitur = muatModulApp('lib/fiturApp');
const beranda = muatModulApp('lib/beranda');
const dc = muatModulApp('lib/discover');

const RUTE = ['discover.tsx', 'discover-refleksi.tsx', 'discover-profil.tsx'];

function aturanBlokir(nilai) {
  const env = { ...process.env };
  delete env.EXPO_PUBLIC_DISCOVER;
  if (nilai !== undefined) env.EXPO_PUBLIC_DISCOVER = nilai;
  const skrip = "const c=require('./metro.config.js');console.log(JSON.stringify([].concat(c.resolver.blockList||[]).map(r=>[r.source,r.flags])))";
  const baris = execFileSync(process.execPath, ['-e', skrip], { cwd: AKAR_APP, env, encoding: 'utf8', timeout: 60000 }).trim().split('\n').pop();
  return JSON.parse(baris).map(([s, f]) => new RegExp(s, f));
}
const terblokir = (aturan, berkas) => aturan.some((r) => r.test(berkas));

// Kata yang menyimpulkan kepribadian, kemampuan, atau sifat. Kalimat profil tidak boleh memuatnya.
const KATA_LABEL = /kepribadian|introver|ekstrover|kreatif|analitis|logis|artistik|berbakat|\bbakat|cerdas|pintar|jenius|\btipe\b|MBTI|RIASEC|Holland|cocok (jadi|untuk)|kamu (adalah|termasuk)|potensi/i;

describe('Saklar build: mati berarti tidak ada jejak, APK lama tidak berubah', () => {
  test('discoverAktif hanya menyala untuk extra.discover === true', () => {
    for (const extra of [undefined, null, {}, 'ya', { discover: false }, { discover: '1' }, { discover: 1 }]) {
      assert.equal(fitur.discoverAktif(extra), false, JSON.stringify(extra));
    }
    assert.equal(fitur.discoverAktif({ discover: true }), true);
  });

  test('Bawaan mati di app.config; tidak ada profil eas.json, Dockerfile, atau docker-compose yang menyalakan', () => {
    assert.ok(baca('app.config.ts').includes("discover: process.env.EXPO_PUBLIC_DISCOVER === '1',"));
    for (const berkas of ['eas.json', 'Dockerfile', 'docker-compose.yml', 'docker-compose.dev.yml']) {
      assert.ok(!baca(berkas).includes('DISCOVER'), berkas);
    }
  });

  test('Saat mati, berkas rute tidak masuk bundel, jadi rutenya tidak terdaftar', () => {
    for (const nilai of [undefined, '0', 'true']) {
      const aturan = aturanBlokir(nilai);
      for (const nama of RUTE) {
        assert.ok(terblokir(aturan, `C:\\repo\\app\\(app)\\${nama}`), `${nilai}: ${nama} (Windows)`);
        assert.ok(terblokir(aturan, `/repo/app/(app)/${nama}`), `${nilai}: ${nama} (Linux)`);
      }
      assert.ok(!terblokir(aturan, '/repo/app/(app)/linimasa.tsx'));
      assert.ok(!terblokir(aturan, '/repo/app/(app)/eksplorasi-tujuan.tsx'));
    }
  });

  test('Saat menyala, berkas rute masuk bundel', () => {
    const aturan = aturanBlokir('1');
    for (const nama of RUTE) assert.ok(!terblokir(aturan, `/repo/app/(app)/${nama}`), nama);
  });

  test('Daftar berkas rute lengkap, dan setiap rute punya lapis kedua', () => {
    const ada = fs.readdirSync(path.join(AKAR_APP, 'app', '(app)')).filter((n) => /^discover/i.test(n));
    assert.deepEqual(ada.sort(), [...RUTE].sort());
    for (const nama of RUTE) {
      assert.match(baca('app', '(app)', nama), /if \(!discoverAktif\(Constants\.expoConfig\?\.extra\)\) return <Redirect href="\/linimasa" \/>;/, nama);
    }
  });

  test('Kartu Beranda hanya ada bila diminta, dan urutan lama tidak berubah', () => {
    for (const kelas of ['8', '11', '12']) {
      const dasar = { kelas, tampilMulaiDariSini: false, tampilJalurTujuan: true, tampilPortofolio: true };
      assert.ok(!beranda.urutanBeranda(dasar).includes('discover'));
      const menyala = beranda.urutanBeranda({ ...dasar, tampilDiscover: true });
      assert.equal(menyala.indexOf('discover'), menyala.indexOf('jalur_tujuan') + 1);
      assert.deepEqual(menyala.filter((b) => b !== 'discover'), beranda.urutanBeranda(dasar));
    }
    const layar = baca('components', 'screens', 'LinimasaScreen.tsx');
    assert.ok(layar.includes('const DISCOVER = discoverAktif(Constants.expoConfig?.extra);'));
    assert.ok(layar.includes('tampilDiscover: DISCOVER,'));
  });

  test('Judul bilah atas tunduk pada saklar', () => {
    assert.match(baca('components', 'layout', 'AppShell.tsx'), /\.\.\.\(discoverAktif\(Constants\.expoConfig\?\.extra\) \? \{ '\/discover'/);
  });

  test('Layar dan permintaan jaringan hanya terjangkau dari berkas rute', () => {
    const pengimpor = [];
    const jelajah = (folder) => {
      for (const e of fs.readdirSync(path.join(AKAR_APP, folder), { withFileTypes: true })) {
        const rel = path.join(folder, e.name);
        if (e.isDirectory()) jelajah(rel);
        else if (/\.tsx?$/.test(e.name) && /from '[^']*(DiscoverScreens|useDiscover)'/.test(baca(rel))) pengimpor.push(rel.replace(/\\/g, '/'));
      }
    };
    for (const f of ['app', 'components', 'hooks', 'providers', 'api', 'lib']) jelajah(f);
    assert.deepEqual(pengimpor.sort(), ['app/(app)/discover-profil.tsx', 'app/(app)/discover-refleksi.tsx', 'app/(app)/discover.tsx', 'components/screens/DiscoverScreens.tsx']);
  });

  test('Data Discover ikut dibuang saat sesi berganti', () => {
    assert.match(baca('providers', 'AuthProvider.tsx'), /const KUNCI_DATA_AKUN = \[.*\['discover'\].*\] as const;/);
    assert.ok(baca('hooks', 'useDiscover.ts').includes("const KUNCI = ['discover'] as const;"));
  });

  test('Formulir refleksi satu tombol Simpan; tidak ada permintaan hapus', () => {
    const layar = baca('components', 'screens', 'DiscoverScreens.tsx');
    const form = /function FormRefleksi[\s\S]*?\n\}\n/.exec(layar)[0];
    assert.equal(form.match(/<Tombol /g).length, 1);
    assert.ok(!/method: 'DELETE'/.test(baca('hooks', 'useDiscover.ts')));
  });
});

describe('Aturan di aplikasi', () => {
  test('Kalimat profil hanya mengulang judul kartu dan tulisan siswa, tanpa label', () => {
    const profil = {
      tertarik: [{ kartu_discover_id: 'a', judul: 'Usaha Kuliner', jenis: 'usaha', alasan: 'Aku senang memasak.' }],
      belum_yakin: [{ kartu_discover_id: 'b', judul: 'Guru', jenis: 'profesi' }],
      kurang_tertarik: [{ kartu_discover_id: 'c', judul: 'Kesehatan', jenis: 'bidang', alasan: null }],
    };
    const kalimat = dc.kalimatProfil(profil);
    assert.deepEqual(kalimat, [
      'Kamu tertarik ke Usaha Kuliner karena kamu menulis: "Aku senang memasak."',
      'Kamu masih memikirkan Guru.',
      'Kamu kurang tertarik ke Kesehatan.',
    ]);
    for (const k of kalimat) assert.doesNotMatch(k, KATA_LABEL);
    // Tanpa isian siswa, tidak ada kalimat: tidak ada yang ditebak.
    assert.deepEqual(dc.kalimatProfil({ tertarik: [], belum_yakin: [], kurang_tertarik: [] }), []);
  });

  test('Isian yang diterima aplikasi selalu diterima server, dan batasnya sama', () => {
    assert.deepEqual({ ...dc.BATAS_DISCOVER }, BATAS_DISCOVER);
    for (const isi of [{ menarik: 'x'.repeat(280), kurang: '' }, { menarik: '', kurang: 'y'.repeat(280) }, { menarik: '', kurang: '' }]) {
      const gabung = { ketertarikan: 'tertarik', ...isi };
      assert.deepEqual(dc.periksaIsianRefleksi(gabung), {});
      assert.ok(refleksiSkema.safeParse(dc.badanRefleksi(gabung)).success);
    }
    assert.ok(dc.periksaIsianRefleksi({ ketertarikan: null, menarik: '', kurang: '' }).ketertarikan);
    assert.ok(dc.periksaIsianRefleksi({ ketertarikan: 'tertarik', menarik: 'x'.repeat(281), kurang: '' }).yang_menarik);
    for (const p of dc.PILIHAN_KETERTARIKAN) assert.ok(refleksiSkema.safeParse({ ketertarikan: p.id }).success, p.id);
  });

  test('keadaanData: 404 berarti saklar server mati', () => {
    assert.equal(dc.keadaanData({ isPending: false, galat: { status: 404 } }), 'fitur_mati');
    assert.equal(dc.keadaanData({ isPending: false, galat: { status: 403, kode: 'AI_BELUM_DIIZINKAN' } }), 'perlu_kebijakan');
    assert.equal(dc.keadaanData({ isPending: true }), 'memuat');
    assert.equal(dc.keadaanData({ isPending: false }), 'siap');
  });

  test('Setiap kode galat server punya pesan sendiri', () => {
    for (const kode of ['KARTU_BELUM_TERSEDIA', 'PROFIL_BUKAN_TERKINI']) assert.notEqual(dc.pesanGalatDiscover(kode), dc.GALAT_UMUM_DISCOVER, kode);
  });
});

describe('Teks baru berstatus draf dan jujur', () => {
  const draf = baca('docs', 'draf-teks-discover.md');

  test('Kode dan dokumen menandai teksnya draf, belum disetujui', () => {
    assert.match(draf, /draf, menunggu persetujuan Khalifa/);
    for (const berkas of [['lib', 'discover.ts'], ['components', 'screens', 'DiscoverScreens.tsx']]) {
      assert.match(baca(...berkas), /DRAF, belum disetujui/, berkas.join('/'));
    }
    assert.match(baca('lib', 'beranda.ts'), /LANJUT_024 \(DRAF, belum disetujui[^\n]*\n\s*export const KARTU_DISCOVER/);
  });

  test('Setiap teks layar dan isi kartu tercatat di dokumen draf', () => {
    const semua = [
      ...Object.values(dc.TEKS_DISCOVER),
      ...Object.values(dc.LABEL_JENIS_KARTU),
      ...dc.PILIHAN_KETERTARIKAN.map((p) => p.label),
      ...Object.values(dc.GALAT_ISIAN_DISCOVER),
      dc.GALAT_UMUM_DISCOVER,
      beranda.KARTU_DISCOVER.judul,
      beranda.KARTU_DISCOVER.keterangan,
      'Tulis Refleksi',
      'Profil Eksplorasi',
    ];
    for (const teks of semua) assert.ok(draf.includes(teks), teks);
    for (const kode of ['KARTU_BELUM_TERSEDIA', 'PROFIL_BUKAN_TERKINI', 'AI_BELUM_DIIZINKAN', 'TIDAK_DITEMUKAN', 'VALIDASI_GAGAL', 'TERLALU_SERING']) {
      assert.ok(draf.includes(dc.pesanGalatDiscover(kode)), kode);
    }
    const konten = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data-konten', 'discover.json'), 'utf8'));
    for (const k of konten.data) assert.ok(draf.includes(k.judul) && draf.includes(k.ringkasan), k.id);
  });

  test('Kalimat privasi jujur: bisa diunduh dan ikut terhapus, tanpa janji "hanya kamu yang bisa melihat"', () => {
    assert.match(dc.TEKS_DISCOVER.privasi, /mengunduh data akunmu/);
    assert.match(dc.TEKS_DISCOVER.privasi, /terhapus saat akunmu dihapus/);
    const semua = Object.values(dc.TEKS_DISCOVER).join(' ') + beranda.KARTU_DISCOVER.keterangan;
    assert.doesNotMatch(semua, /hanya kamu yang bisa|hanya terlihat olehmu|rahasia|aman sepenuhnya|tidak ada yang bisa/i);
  });

  test('Belum masuk persetujuan rilis', () => {
    const rilis = baca('docs', 'persetujuan-teks-rilis.json');
    for (const teks of [dc.TEKS_DISCOVER.pengantar, dc.TEKS_DISCOVER.privasi, beranda.KARTU_DISCOVER.keterangan]) assert.ok(!rilis.includes(teks), teks);
  });
});
