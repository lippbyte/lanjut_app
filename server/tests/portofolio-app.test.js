// LANJUT_011 seri v2: sisi aplikasi Portofolio. Pola layar lain: modul murni dites langsung, dan
// susunan layar dites dari sumbernya. Alur di layar diuji lewat peramban, lihat laporan task.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { muatModulApp } = require('./muat-ts-app');
const { buatButirSkema } = require('../src/modul/butir-bukti/butir-bukti.skema');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const fitur = muatModulApp('lib/fiturApp');
const beranda = muatModulApp('lib/beranda');
const porto = muatModulApp('lib/portofolio');
const { siapkanFoto } = muatModulApp('lib/portofolioFoto');
const sementara = muatModulApp('lib/fotoSementara');

const RUTE = ['portofolio.tsx', 'portofolio-tulis.tsx', 'portofolio-butir.tsx'];

function aturanBlokir(nilai) {
  const env = { ...process.env };
  delete env.EXPO_PUBLIC_PORTOFOLIO;
  if (nilai !== undefined) env.EXPO_PUBLIC_PORTOFOLIO = nilai;
  const skrip = "const c=require('./metro.config.js');console.log(JSON.stringify([].concat(c.resolver.blockList||[]).map(r=>[r.source,r.flags])))";
  const baris = execFileSync(process.execPath, ['-e', skrip], { cwd: AKAR_APP, env, encoding: 'utf8', timeout: 60000 }).trim().split('\n').pop();
  return JSON.parse(baris).map(([s, f]) => new RegExp(s, f));
}
const terblokir = (aturan, berkas) => aturan.some((r) => r.test(berkas));

describe('Saklar build: mati berarti tidak ada jejak', () => {
  test('portofolioAktif hanya menyala untuk extra.portofolio === true', () => {
    for (const extra of [undefined, null, {}, 'ya', { portofolio: false }, { portofolio: '1' }, { portofolio: 1 }]) {
      assert.equal(fitur.portofolioAktif(extra), false, JSON.stringify(extra));
    }
    assert.equal(fitur.portofolioAktif({ portofolio: true }), true);
  });

  test('Bawaan mati di app.config, Dockerfile, dan docker-compose; eas.json tidak menyalakan', () => {
    assert.ok(baca('app.config.ts').includes("const PORTOFOLIO_AKTIF = process.env.EXPO_PUBLIC_PORTOFOLIO === '1';"));
    assert.ok(baca('app.config.ts').includes('portofolio: PORTOFOLIO_AKTIF,'));
    assert.ok(baca('Dockerfile').includes('ARG EXPO_PUBLIC_PORTOFOLIO=0'));
    assert.ok(baca('docker-compose.yml').includes('EXPO_PUBLIC_PORTOFOLIO: ${EXPO_PUBLIC_PORTOFOLIO:-0}'));
    assert.ok(!baca('eas.json').includes('EXPO_PUBLIC_PORTOFOLIO'));
  });

  test('Saat mati, berkas rute tidak masuk bundel, jadi rutenya tidak terdaftar', () => {
    for (const nilai of [undefined, '0', 'true']) {
      const aturan = aturanBlokir(nilai);
      for (const nama of RUTE) {
        assert.ok(terblokir(aturan, `C:\\repo\\app\\(app)\\${nama}`), `${nilai}: ${nama} (Windows)`);
        assert.ok(terblokir(aturan, `/repo/app/(app)/${nama}`), `${nilai}: ${nama} (Linux)`);
      }
      assert.ok(!terblokir(aturan, '/repo/app/(app)/linimasa.tsx'));
      assert.ok(!terblokir(aturan, '/repo/app/(app)/akun.tsx'));
    }
  });

  test('Saat menyala, berkas rute masuk bundel', () => {
    const aturan = aturanBlokir('1');
    for (const nama of RUTE) assert.ok(!terblokir(aturan, `/repo/app/(app)/${nama}`), nama);
  });

  test('Daftar berkas rute lengkap: tidak ada rute portofolio yang lolos dari aturan', () => {
    const aturan = aturanBlokir(undefined);
    const ada = fs.readdirSync(path.join(AKAR_APP, 'app', '(app)')).filter((n) => /portofolio/i.test(n));
    assert.deepEqual(ada.sort(), [...RUTE].sort());
    for (const nama of ada) assert.ok(terblokir(aturan, `/repo/app/(app)/${nama}`), nama);
  });

  test('Setiap rute punya penjaga lapis kedua', () => {
    for (const nama of RUTE) {
      assert.match(baca('app', '(app)', nama), /if \(!portofolioAktif\(Constants\.expoConfig\?\.extra\)\) return <Redirect href="\/linimasa" \/>;/, nama);
    }
  });

  test('Kartu Beranda hanya ada bila diminta, dan urutan lama tidak berubah', () => {
    const dasar = { kelas: '11', tampilMulaiDariSini: false };
    assert.ok(!beranda.urutanBeranda(dasar).includes('portofolio'));
    const menyala = beranda.urutanBeranda({ ...dasar, tampilPortofolio: true });
    assert.equal(menyala.indexOf('portofolio'), menyala.indexOf('grid') + 1);
    assert.deepEqual(menyala.filter((b) => b !== 'portofolio'), beranda.urutanBeranda(dasar));
    const layar = baca('components', 'screens', 'LinimasaScreen.tsx');
    assert.ok(layar.includes('const PORTOFOLIO = portofolioAktif(Constants.expoConfig?.extra);'));
    assert.ok(layar.includes('tampilPortofolio: PORTOFOLIO,'));
  });

  test('Judul bilah atas tunduk pada saklar', () => {
    assert.match(baca('components', 'layout', 'AppShell.tsx'), /\.\.\.\(portofolioAktif\(Constants\.expoConfig\?\.extra\)\s*\? \{ '\/portofolio'/);
  });

  test('Layar dan permintaan jaringan hanya terjangkau dari berkas rute', () => {
    const pengimpor = [];
    const jelajah = (folder) => {
      for (const e of fs.readdirSync(path.join(AKAR_APP, folder), { withFileTypes: true })) {
        const rel = path.join(folder, e.name);
        if (e.isDirectory()) jelajah(rel);
        else if (/\.tsx?$/.test(e.name) && /from '[^']*(PortofolioScreens|PortofolioFoto|usePortofolio|lib\/portofolio(Foto)?)'/.test(baca(rel))) pengimpor.push(rel.replace(/\\/g, '/'));
      }
    };
    for (const f of ['app', 'components', 'hooks', 'providers', 'api']) jelajah(f);
    assert.deepEqual(pengimpor.sort(), [
      'app/(app)/portofolio-butir.tsx',
      'app/(app)/portofolio-tulis.tsx',
      'app/(app)/portofolio.tsx',
      'components/screens/PortofolioFoto.tsx',
      'components/screens/PortofolioScreens.tsx',
      'hooks/usePortofolio.ts',
    ]);
  });

  test('Saat mati, APK tidak meminta izin kamera; saat menyala, mikrofon tetap dicabut', () => {
    const config = baca('app.config.ts');
    assert.ok(config.includes("...(PORTOFOLIO_AKTIF ? {} : { blockedPermissions: ['android.permission.CAMERA'] }),"));
    assert.match(config, /\.\.\.\(PORTOFOLIO_AKTIF\s*\? \[\s*\[\s*'expo-image-picker'/);
    assert.ok(config.includes('microphonePermission: false'));
  });
});

describe('Validasi sama dengan server', () => {
  const server = (isi) => buatButirSkema.safeParse({ judul: 'x', jenis: 'karya', ...isi }).success;
  const dasar = { judul: 'x', jenis: 'karya', uraian: '', tautan: '', tanggal: '' };
  const klien = (isi) => Object.keys(porto.periksaIsianButir({ ...dasar, ...isi })).length === 0;

  test('Tautan berbahaya ditolak keduanya', () => {
    for (const tautan of ['javascript:alert(1)', 'JaVaScRiPt:alert(1)', ' javascript:alert(1)', "javascript:alert('https://contoh.test')", 'data:text/html,x', 'file:///etc/passwd', 'ftp://contoh.test', 'bukan tautan', 'http://']) {
      assert.equal(porto.tautanSah(tautan), false, tautan);
      assert.equal(server({ tautan }), false, `server: ${tautan}`);
    }
  });

  test('Tautan hanya bisa dibuka bila lolos pemeriksaan, juga untuk data lama', () => {
    assert.ok(baca('components', 'screens', 'PortofolioScreens.tsx').includes('{butir.tautan && tautanSah(butir.tautan) ? ('));
  });

  test('Tautan yang diterima aplikasi selalu diterima server', () => {
    for (const tautan of ['https://contoh.test', 'http://contoh.test/a?b=1#c', 'HTTP://CONTOH.TEST', '  https://contoh.test  ', 'https://contoh.test/a b']) {
      assert.equal(porto.tautanSah(tautan), true, tautan);
      assert.equal(server({ tautan }), true, `server: ${tautan}`);
    }
  });

  test('Batas panjang dan tanggal sama persis di kedua sisi', () => {
    const kasus = [
      [{ judul: 'x'.repeat(200) }, true],
      [{ judul: 'x'.repeat(201) }, false],
      [{ judul: '   ' }, false],
      [{ uraian: 'x'.repeat(5000) }, true],
      [{ uraian: 'x'.repeat(5001) }, false],
      [{ tautan: `https://c.test/${'x'.repeat(485)}` }, true],
      [{ tautan: `https://c.test/${'x'.repeat(486)}` }, false],
    ];
    for (const [isi, hasil] of kasus) {
      assert.equal(klien(isi), hasil, JSON.stringify(isi).slice(0, 40));
      assert.equal(server(isi), hasil, `server ${JSON.stringify(isi).slice(0, 40)}`);
    }
    for (const [tanggal, hasil] of [['2026-11-30', true], ['2026-13-40', false], ['2026-02-30', false], ['30-11-2026', false]]) {
      assert.equal(klien({ tanggal }), hasil, tanggal);
      assert.equal(server({ tanggal_karya: tanggal }), hasil, `server ${tanggal}`);
    }
    assert.equal(klien({ jenis: null }), false);
  });

  test('Batas foto sama dengan server', () => {
    assert.match(baca('server', 'src', 'modul', 'butir-bukti', 'butir-bukti.layanan.js'), /BATAS_FOTO = \{ ukuranByte: 5 \* 1024 \* 1024, perButir: 3, perAkun: 30 \}/);
    assert.equal(porto.BATAS_FOTO.ukuranByte, 5 * 1024 * 1024);
    assert.equal(porto.BATAS_FOTO.perButir, 3);
    assert.equal(porto.BATAS_FOTO.perAkun, 30);
  });

  test('Yang dikirim tepat lima medan: jalur, tujuan, dan visibilitas tidak ikut', () => {
    const badan = porto.badanButir({ ...dasar, judul: '  Judul  ', uraian: '  ', tautan: ' https://a.test ', tanggal: '2026-11-30' });
    assert.deepEqual(badan, { judul: 'Judul', jenis: 'karya', uraian: null, tautan: 'https://a.test', tanggal_karya: '2026-11-30' });
    for (const berkas of [baca('components', 'screens', 'PortofolioScreens.tsx'), baca('hooks', 'usePortofolio.ts')]) {
      assert.ok(!/jalur_minat_id:|tujuan_id:|visibilitas:|prodi_tujuan/.test(berkas));
    }
  });

  test('Pesan teknis dari server diganti kalimat sederhana', () => {
    const galat = porto.galatMedanServer({ judul: 'String must contain at most 200 character(s)', tautan: 'Invalid' });
    assert.equal(galat.judul, porto.GALAT_ISIAN.judulPanjang);
    assert.equal(galat.tautan, porto.GALAT_ISIAN.tautan);
    assert.deepEqual(porto.galatMedanServer(undefined), {});
  });
});

describe('Keadaan layar', () => {
  test('keadaanDaftar', () => {
    const k = porto.keadaanDaftar;
    assert.equal(k({ isPending: true }), 'memuat');
    assert.equal(k({ isPending: false, jumlah: 0 }), 'kosong');
    assert.equal(k({ isPending: false, jumlah: 2 }), 'ada');
    assert.equal(k({ isPending: false, galat: { status: 404, kode: 'TIDAK_DITEMUKAN' } }), 'fitur_mati');
    assert.equal(k({ isPending: false, galat: { status: 403, kode: 'AI_BELUM_DIIZINKAN' } }), 'perlu_kebijakan');
    assert.equal(k({ isPending: false, galat: { status: 0, kode: 'JARINGAN' } }), 'jaringan');
    assert.equal(k({ isPending: false, galat: { status: 500, kode: 'GALAT_SERVER' } }), 'server');
  });

  test('Batas foto tampil sebelum dicoba', () => {
    assert.deepEqual(porto.batasFoto(2, 29), { bolehTambah: true, alasan: null });
    assert.deepEqual(porto.batasFoto(3, 10), { bolehTambah: false, alasan: 'butir' });
    assert.deepEqual(porto.batasFoto(0, 30), { bolehTambah: false, alasan: 'akun' });
    assert.equal(porto.hitungFotoAkun([{ foto: [1, 2] }, { foto: [] }, { foto: [3] }]), 3);
    assert.match(porto.teksJumlahFoto(1, 12), /1 dari 3.*12 dari 30/);
    const layar = baca('components', 'screens', 'PortofolioFoto.tsx');
    assert.ok(layar.includes('!batas.bolehTambah ?'));
    assert.ok(layar.includes('teksJumlahFoto(butir.foto.length, jumlahAkun)'));
  });

  test('Coba lagi hanya untuk kegagalan yang bisa hilang sendiri', () => {
    assert.equal(porto.bisaCobaLagi('JARINGAN', 0), true);
    assert.equal(porto.bisaCobaLagi('GALAT_SERVER', 500), true);
    assert.equal(porto.bisaCobaLagi('TERLALU_SERING', 429), true);
    for (const kode of ['BATAS_FOTO_BUTIR', 'BATAS_FOTO_AKUN', 'FOTO_RUSAK']) assert.equal(porto.bisaCobaLagi(kode, 409), false, kode);
  });

  test('Setiap kode galat foto punya kalimat sendiri', () => {
    for (const kode of ['FOTO_TERLALU_BESAR', 'FOTO_JENIS_DITOLAK', 'FOTO_HEIC_DITOLAK', 'FOTO_HEIC_PERAMBAN', 'FOTO_RUSAK', 'BATAS_FOTO_BUTIR', 'BATAS_FOTO_AKUN', 'TERLALU_SERING', 'JARINGAN', 'AI_BELUM_DIIZINKAN']) {
      assert.notEqual(porto.pesanGalatPortofolio(kode), porto.GALAT_UMUM, kode);
    }
    assert.equal(porto.pesanGalatPortofolio('LAINNYA'), porto.GALAT_UMUM);
    assert.equal(porto.pesanGalatPortofolio(undefined, 413), porto.pesanGalatPortofolio('FOTO_TERLALU_BESAR'));
  });
});

describe('Menyiapkan foto', () => {
  function alatTiruan(ubah = {}) {
    const catatan = { resize: [], simpan: [], kamera: 0, galeri: 0 };
    const aset = ubah.aset ?? { uri: 'asal.heic', width: 4032, height: 3024, mimeType: 'image/heic', fileName: 'IMG_1.HEIC' };
    const alat = {
      web: false,
      formatJpeg: 'jpeg',
      mintaIzinKamera: async () => ubah.izin ?? { granted: true, canAskAgain: true },
      bukaGaleri: async () => {
        catatan.galeri += 1;
        return ubah.pilihan ?? { canceled: false, assets: [aset] };
      },
      bukaKamera: async () => {
        catatan.kamera += 1;
        return { canceled: false, assets: [aset] };
      },
      olah: () => ({
        resize: (u) => catatan.resize.push(u),
        renderAsync: async () => {
          if (ubah.gagalOlah) throw new Error('tidak terbaca');
          return {
            width: ubah.lebarNyata ?? 4032,
            height: ubah.tinggiNyata ?? 3024,
            saveAsync: async (o) => {
              catatan.simpan.push(o);
              return { uri: 'hasil.jpg' };
            },
          };
        },
      }),
      ukuran: async () => ({ ukuran: ubah.ukuran ?? 900000 }),
      ...ubah.alat,
    };
    return { alat, catatan };
  }

  test('HEIC dikodekan ulang menjadi JPEG, diperkecil, dan berkas aslinya tidak terkirim', async () => {
    const { alat, catatan } = alatTiruan();
    const hasil = await siapkanFoto('galeri', undefined, alat);
    assert.equal(hasil.status, 'siap');
    assert.deepEqual(catatan.simpan, [{ format: 'jpeg', compress: 0.8 }]);
    assert.deepEqual(catatan.resize, [{ width: 1600 }]);
    assert.deepEqual({ uri: hasil.foto.uri, nama: hasil.foto.nama, mime: hasil.foto.mime }, { uri: 'hasil.jpg', nama: 'foto.jpg', mime: 'image/jpeg' });
  });

  test('Foto kecil tidak diperbesar, tetapi tetap dikodekan ulang', async () => {
    const { alat, catatan } = alatTiruan({ aset: { uri: 'a.png', width: 800, height: 600, mimeType: 'image/png' } });
    assert.equal((await siapkanFoto('galeri', undefined, alat)).status, 'siap');
    assert.deepEqual(catatan.resize, []);
    assert.equal(catatan.simpan.length, 1);
  });

  test('Foto tegak diperkecil menurut tingginya', () => {
    assert.deepEqual(porto.rencanaUkuran(3024, 4032), { height: 1600 });
    assert.deepEqual(porto.rencanaUkuran(4032, 3024), { width: 1600 });
    assert.equal(porto.rencanaUkuran(1600, 1200), null);
  });

  test('Sistem tidak memberi ukuran: gambar dibuka dulu dan tetap diperkecil', async () => {
    const { alat, catatan } = alatTiruan({ aset: { uri: 'a.jpg', width: 0, height: 0 } });
    assert.equal((await siapkanFoto('galeri', undefined, alat)).status, 'siap');
    assert.deepEqual(catatan.resize, [{ width: 1600 }]);
  });

  test('Tetap di atas 5 MB sesudah diolah: ditolak dengan kode sendiri', async () => {
    const { alat } = alatTiruan({ ukuran: 5 * 1024 * 1024 + 1 });
    assert.deepEqual(await siapkanFoto('galeri', undefined, alat), { status: 'gagal', kode: 'FOTO_TERLALU_BESAR' });
    const pas = alatTiruan({ ukuran: 5 * 1024 * 1024 });
    assert.equal((await siapkanFoto('galeri', undefined, pas.alat)).status, 'siap');
  });

  test('Izin kamera ditolak: kamera tidak dibuka', async () => {
    const { alat, catatan } = alatTiruan({ izin: { granted: false, canAskAgain: false } });
    assert.deepEqual(await siapkanFoto('kamera', undefined, alat), { status: 'izin_ditolak', bisaTanyaLagi: false });
    assert.equal(catatan.kamera, 0);
  });

  test('Galeri tidak meminta izin', async () => {
    let diminta = 0;
    const { alat } = alatTiruan({ alat: { mintaIzinKamera: async () => { diminta += 1; return { granted: false, canAskAgain: false }; } } });
    assert.equal((await siapkanFoto('galeri', undefined, alat)).status, 'siap');
    assert.equal(diminta, 0);
  });

  test('Dibatalkan: tidak ada pesan galat', async () => {
    const { alat } = alatTiruan({ pilihan: { canceled: true, assets: null } });
    assert.deepEqual(await siapkanFoto('galeri', undefined, alat), { status: 'batal' });
  });

  test('Gagal dibuka: pesan HEIC khusus peramban, pesan umum di HP', async () => {
    const hp = alatTiruan({ gagalOlah: true });
    assert.deepEqual(await siapkanFoto('galeri', undefined, hp.alat), { status: 'gagal', kode: 'FOTO_RUSAK' });
    const web = alatTiruan({ gagalOlah: true, alat: { web: true } });
    assert.deepEqual(await siapkanFoto('galeri', undefined, web.alat), { status: 'gagal', kode: 'FOTO_HEIC_PERAMBAN' });
  });

  test('Yang terkirim selalu hasil olahan, dan berkas sementaranya dibuang', async (t) => {
    const dicabut = [];
    t.mock.method(URL, 'revokeObjectURL', (u) => dicabut.push(u));
    const siap = alatTiruan({ aset: { uri: 'blob:asal', width: 800, height: 600 } });
    const hasil = await siapkanFoto('galeri', undefined, siap.alat);
    assert.notEqual(hasil.foto.uri, 'blob:asal');
    assert.deepEqual(dicabut, ['blob:asal'], 'berkas asal dibuang sesudah diolah');

    dicabut.length = 0;
    const besar = alatTiruan({ aset: { uri: 'blob:asal', width: 800, height: 600 }, ukuran: 6 * 1024 * 1024 });
    besar.alat.olah = () => ({ resize() {}, renderAsync: async () => ({ width: 800, height: 600, saveAsync: async () => ({ uri: 'blob:hasil' }) }) });
    await siapkanFoto('galeri', undefined, besar.alat);
    assert.deepEqual(dicabut, ['blob:asal', 'blob:hasil'], 'hasil yang ditolak ikut dibuang');
  });

  test('Build tanpa modul native: tidak crash', async () => {
    assert.deepEqual(await siapkanFoto('galeri', undefined, null), { status: 'gagal', kode: 'PEMILIH_TIDAK_TERSEDIA' });
  });
});

describe('Foto tidak tertinggal di perangkat', () => {
  function alatBerkas({ gagal = false } = {}) {
    const terhapus = [];
    class Folder {
      constructor(_induk, nama) { this.nama = nama; this.exists = true; }
      delete() { if (gagal) throw new Error('sibuk'); terhapus.push(this.nama); }
    }
    class Berkas {
      constructor(uri) { this.nama = uri; this.exists = true; }
      delete() { terhapus.push(this.nama); }
    }
    return { alat: { Paths: { cache: 'cache' }, Directory: Folder, File: Berkas }, terhapus };
  }

  test('Folder pemilih dan pengolah dibersihkan', () => {
    const { alat, terhapus } = alatBerkas();
    sementara.hapusFotoSementara(alat);
    assert.deepEqual(terhapus, ['ImagePicker', 'ImageManipulator']);
  });

  test('Nama folder sama dengan yang dipakai kode native', () => {
    const picker = baca('node_modules', 'expo-image-picker', 'android', 'src', 'main', 'java', 'expo', 'modules', 'imagepicker', 'ImagePickerConstants.kt');
    assert.ok(picker.includes('CACHE_DIR_NAME = "ImagePicker"'));
    const manipulator = baca('node_modules', 'expo-image-manipulator', 'android', 'src', 'main', 'java', 'expo', 'modules', 'imagemanipulator', 'FileUtils.kt');
    assert.ok(manipulator.includes('File(cacheDirectory, "ImageManipulator")'));
    assert.deepEqual([...sementara.FOLDER_FOTO_SEMENTARA], ['ImagePicker', 'ImageManipulator']);
  });

  test('Kegagalan membersihkan tidak menahan siswa keluar akun', () => {
    assert.doesNotThrow(() => sementara.hapusFotoSementara(alatBerkas({ gagal: true }).alat));
    assert.doesNotThrow(() => sementara.hapusFotoSementara(null));
  });

  test('Berkas sesudah unggah dihapus; alamat lain tidak disentuh', () => {
    const { alat, terhapus } = alatBerkas();
    sementara.hapusBerkasSementara('file:///cache/ImageManipulator/a.jpg', alat);
    sementara.hapusBerkasSementara('content://media/1', alat);
    assert.deepEqual(terhapus, ['file:///cache/ImageManipulator/a.jpg']);
  });

  test('Keluar akun, sesi berakhir, ganti akun, dan hapus akun semuanya membersihkan', () => {
    const penyedia = baca('providers', 'AuthProvider.tsx');
    assert.ok(/KUNCI_DATA_AKUN = \[.*\['butir_bukti'\]\] as const/.test(penyedia));
    const fungsi = /function hapusDataAkun\(queryClient: QueryClient\) \{([\s\S]*?)\n\}/.exec(penyedia)[1];
    assert.ok(fungsi.includes('queryClient.removeQueries({ queryKey })'));
    assert.ok(fungsi.includes('if (PORTOFOLIO) hapusFotoSementara();'));
    for (const nama of ['akhiriSesi', 'terapkanSesi', 'keluar', 'selesaiHapusAkun']) {
      const isi = new RegExp(`const ${nama} = useCallback\\(([\\s\\S]*?)\\n  \\}, \\[`).exec(penyedia)[1];
      assert.ok(isi.includes('hapusDataAkun(queryClient)'), nama);
    }
  });

  test('Foto diambil lewat token ke memori, bukan lewat komponen gambar atau penyimpanan perangkat', () => {
    const hook = baca('hooks', 'usePortofolio.ts');
    assert.ok(hook.includes("queryKey: [...KUNCI, 'foto', fotoId]"));
    assert.ok(hook.includes('apiAmbilDataUri('));
    const layar = baca('components', 'screens', 'PortofolioFoto.tsx');
    assert.ok(layar.includes('source={{ uri: foto.data }}'));
    assert.ok(!/headers|AsyncStorage|writeAsString|\.write\(/.test(layar + hook));
    assert.ok(baca('api', 'client.ts').includes("cache: 'no-store'"));
  });

  test('Sesudah unggah berhasil dan saat layar ditinggalkan, berkas sementara dibuang', () => {
    const layar = baca('components', 'screens', 'PortofolioFoto.tsx');
    assert.match(layar, /await unggah\(foto, [^\n]*\);\n\s*buang\(foto\);/);
    assert.match(layar, /if \(belumTerkirim\.current\) hapusBerkasSementara\(belumTerkirim\.current\.uri\);/);
  });
});

describe('Isi layar', () => {
  const semuaLayar = () => baca('components', 'screens', 'PortofolioFoto.tsx') + baca('components', 'screens', 'PortofolioScreens.tsx');

  test('Peringatan privasi ada di bagian foto', () => {
    assert.ok(baca('components', 'screens', 'PortofolioFoto.tsx').includes('<Peringatan>{T.privasiFoto}</Peringatan>'));
    for (const kata of ['KTP', 'kartu pelajar', 'rapor', 'wajah orang lain', 'Hanya kamu']) assert.ok(porto.TEKS_PORTOFOLIO.privasiFoto.includes(kata), kata);
  });

  test('Hapus menuntut konfirmasi; hapus catatan menjelaskan fotonya ikut terhapus', () => {
    assert.match(porto.TEKS_PORTOFOLIO.yakinHapus, /foto.*ikut terhapus/i);
    const layar = semuaLayar();
    assert.ok(layar.includes('<Text style={gaya.teksBody}>{T.yakinHapus}</Text>'));
    assert.ok(layar.includes('<Text style={gaya.teksBody}>{T.yakinHapusFoto}</Text>'));
  });

  test('Satu tombol Simpan di formulir', () => {
    const form = /function FormButir[\s\S]*?\n\}\n/.exec(baca('components', 'screens', 'PortofolioScreens.tsx'))[0];
    assert.equal(form.match(/<Tombol /g).length, 1);
  });

  test('Coba lagi tersedia tanpa mengisi ulang', () => {
    assert.ok(baca('components', 'screens', 'PortofolioFoto.tsx').includes('<Tombol label={T.cobaLagi} onPress={() => kirim(tahap.foto)} />'));
  });

  test('Tidak ada kata berbagi, penilaian, lomba, atau perbandingan', () => {
    const teks = [
      ...Object.values(porto.TEKS_PORTOFOLIO),
      ...Object.values(porto.GALAT_ISIAN),
      porto.GALAT_UMUM,
      beranda.KARTU_PORTOFOLIO.judul,
      beranda.KARTU_PORTOFOLIO.keterangan,
    ].join(' ');
    assert.ok(!/bagi|share|publik|nilai|skor|peringkat|ranking|lomba|juara|terbaik|bandingkan|teman/i.test(teks), teks.match(/bagi|share|publik|nilai|skor|peringkat|ranking|lomba|juara|terbaik|bandingkan|teman/i)?.[0]);
    assert.ok(!/share|bagikan/i.test(semuaLayar()));
  });
});

describe('Teks baru berstatus draf', () => {
  const draf = baca('docs', 'draf-teks-portofolio.md');

  test('Dokumen menandai teksnya draf, menunggu persetujuan Khalifa', () => {
    assert.match(draf, /draf, menunggu persetujuan Khalifa/);
  });

  test('Setiap teks layar tercatat di dokumen draf', () => {
    const semua = [
      ...Object.values(porto.TEKS_PORTOFOLIO),
      ...Object.values(porto.GALAT_ISIAN),
      ...porto.JENIS_BUTIR.map((j) => j.label),
      porto.GALAT_UMUM,
      beranda.KARTU_PORTOFOLIO.judul,
      beranda.KARTU_PORTOFOLIO.keterangan,
      'Tulis Catatan',
    ];
    for (const teks of semua) assert.ok(draf.includes(teks), teks);
    for (const kode of ['FOTO_TERLALU_BESAR', 'FOTO_JENIS_DITOLAK', 'FOTO_HEIC_DITOLAK', 'FOTO_HEIC_PERAMBAN', 'FOTO_RUSAK', 'PEMILIH_TIDAK_TERSEDIA', 'TERLALU_SERING', 'AI_BELUM_DIIZINKAN', 'TIDAK_DITEMUKAN', 'VALIDASI_GAGAL']) {
      assert.ok(draf.includes(porto.pesanGalatPortofolio(kode)), kode);
    }
  });

  test('Teks izin di sistem operasi juga tercatat', () => {
    for (const teks of /photosPermission: '([^']+)'[\s\S]*?cameraPermission: '([^']+)'/.exec(baca('app.config.ts')).slice(1)) assert.ok(draf.includes(teks), teks);
  });
});
