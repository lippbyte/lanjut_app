// LANJUT_013 seri v2: persiapan build APK v2. Nama "Profil Saya", unduh data lewat expo-sharing,
// profil build pilot, dan versi. Tanpa basis data.

const { describe, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { muatModulApp } = require('./muat-ts-app');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const beranda = muatModulApp('lib/beranda');
const jenjangSaya = muatModulApp('lib/jenjangSaya');
const dataAkun = muatModulApp('lib/dataAkun');
const ekspor = muatModulApp('lib/eksporSementara');

/** Isi berkas tanpa komentar, supaya yang diperiksa hanya teks yang bisa tampil. */
const tanpaKomentar = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|\s)\/\/.*$/gm, '$1').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

function berkasDi(dir, akhiran) {
  return fs.readdirSync(path.join(AKAR_APP, dir), { withFileTypes: true }).flatMap((e) => {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) return berkasDi(rel, akhiran);
    return akhiran.some((a) => e.name.endsWith(a)) ? [rel] : [];
  });
}

describe('Nama "Profil Saya" (K15)', () => {
  test('Tampil di kartu Beranda, Mulai dari Sini, Jenjang Saya, bilah atas, dan Data Akun', () => {
    const kartu = beranda.daftarKartuBeranda('12').find((k) => k.href === '/cek-posisi');
    assert.equal(kartu.judul, 'Profil Saya');
    assert.equal(kartu.labelPendek, 'Profil Saya');
    assert.equal(beranda.infoMulaiDariSini('12').labelTombol, 'Profil Saya');
    assert.equal(jenjangSaya.isiJenjangSaya('12').pintu.find((p) => p.href === '/cek-posisi').judul, 'Profil Saya');
    assert.ok(baca('components', 'layout', 'AppShell.tsx').includes("'/cek-posisi': 'Profil Saya'"));
    assert.ok(baca('components', 'screens', 'AkunScreen.tsx').includes('judul="Profil Saya"'));
  });

  test('"Jalur Saya" tidak ada di teks yang tampil', () => {
    const berkas = ['app', 'components', 'lib', 'hooks', 'providers', 'api'].flatMap((d) => berkasDi(d, ['.ts', '.tsx', '.json']));
    // Dua kalimat kebijakan menunggu penyelarasan JSON dengan draf kebijakan di repo induk (LANJUT_012).
    const diperiksa = berkas.filter((b) => !b.endsWith('kebijakan-privasi.json'));
    assert.ok(diperiksa.length > 50, `terlalu sedikit berkas: ${diperiksa.length}`);
    const temuan = diperiksa.filter((b) => /Jalur Saya/.test(tanpaKomentar(baca(b))));
    assert.deepEqual(temuan, []);
  });

  test('Panduan chatbot memakai nama baru, dan hanya menyebut nama lama untuk aplikasi versi lama', () => {
    const panduan = baca('server', 'config', 'panduan-fitur.json');
    assert.ok(panduan.includes('"nama": "Profil Saya"'));
    assert.equal(panduan.split('Jalur Saya').length - 1, 1);
    assert.ok(panduan.includes('di aplikasi versi lama bernama Jalur Saya'));
  });

  test('Yang berubah hanya tampilan: rute, id, dan pengenal tetap', () => {
    assert.ok(fs.existsSync(path.join(AKAR_APP, 'app', '(app)', 'cek-posisi.tsx')));
    assert.ok(beranda.daftarKartuBeranda('12').some((k) => k.href === '/cek-posisi'));
    assert.ok(baca('lib', 'jenjangSaya.ts').includes("id: 'cek-posisi'"));
    assert.equal(typeof jenjangSaya.tampilPintuJalurSaya, 'function');
  });
});

describe('Unduh data lewat expo-sharing', () => {
  function alatTiruan(ubah = {}) {
    const urutan = [];
    const alat = {
      tersedia: async () => ubah.tersedia ?? true,
      tulis: (nama, isi) => {
        urutan.push(`tulis:${nama}:${isi.length}`);
        if (ubah.gagalTulis) throw new Error('disk penuh');
        return `file:///cache/EksporData/${nama}`;
      },
      bagikan: async (uri) => {
        urutan.push(`bagikan:${uri}`);
        if (ubah.gagalBagikan) throw new Error('dibatalkan');
      },
      hapusFolder: () => {
        urutan.push('hapus');
        if (ubah.gagalHapus) throw new Error('sibuk');
      },
    };
    return { alat, urutan };
  }

  test('Berkas ditulis, dibagikan, lalu dibuang', async () => {
    const { alat, urutan } = alatTiruan();
    assert.equal(await ekspor.bagikanEkspor('a.json', '{}', alat), 'ok');
    assert.deepEqual(urutan, ['hapus', 'tulis:a.json:2', 'bagikan:file:///cache/EksporData/a.json', 'hapus']);
  });

  test('Tidak ada batas 400 KB di aplikasi', async () => {
    const { alat, urutan } = alatTiruan();
    const besar = 'x'.repeat(5 * 1024 * 1024);
    assert.equal(await ekspor.bagikanEkspor('a.json', besar, alat), 'ok');
    assert.ok(urutan.includes(`tulis:a.json:${besar.length}`));
    assert.ok(!/BATAS_BAGIKAN_HP|TERLALU_BESAR_HP|400000/.test(baca('lib', 'dataAkun.ts') + baca('hooks', 'useDataAkun.ts')));
  });

  test('Gagal membagikan: berkas tetap dibuang, dan galatnya sampai ke pemanggil', async () => {
    const { alat, urutan } = alatTiruan({ gagalBagikan: true });
    await assert.rejects(ekspor.bagikanEkspor('a.json', '{}', alat), /dibatalkan/);
    assert.equal(urutan.at(-1), 'hapus');
  });

  test('Gagal menulis: tetap membersihkan', async () => {
    const { alat, urutan } = alatTiruan({ gagalTulis: true });
    await assert.rejects(ekspor.bagikanEkspor('a.json', '{}', alat), /disk penuh/);
    assert.equal(urutan.at(-1), 'hapus');
  });

  test('Tidak tersedia: berkas tidak ditulis', async () => {
    const { alat, urutan } = alatTiruan({ tersedia: false });
    assert.equal(await ekspor.bagikanEkspor('a.json', '{}', alat), 'tidak_tersedia');
    assert.deepEqual(urutan, []);
    assert.equal(await ekspor.bagikanEkspor('a.json', '{}', null), 'tidak_tersedia');
  });

  test('Kegagalan membersihkan tidak menahan siswa keluar akun', () => {
    assert.doesNotThrow(() => ekspor.hapusEksporSementara(alatTiruan({ gagalHapus: true }).alat));
    assert.doesNotThrow(() => ekspor.hapusEksporSementara(null));
  });

  test('Hook memakai expo-sharing, jalur web tetap, dan lembar bagikan teks tidak dipakai lagi', () => {
    const hook = baca('hooks', 'useDataAkun.ts');
    assert.ok(hook.includes('await bagikanEkspor(namaBerkas, isi)'));
    assert.ok(hook.includes("if (Platform.OS === 'web') {"));
    assert.ok(hook.includes('tautan.download = namaBerkas;'));
    assert.ok(!/\bShare\b/.test(hook));
    assert.ok(baca('package.json').includes('"expo-sharing"'));
  });

  test('Berkas dibuang saat keluar akun, sesi berakhir, ganti akun, dan hapus akun', () => {
    const penyedia = baca('providers', 'AuthProvider.tsx');
    const fungsi = /function hapusDataAkun\(queryClient: QueryClient\) \{([\s\S]*?)\n\}/.exec(penyedia)[1];
    assert.ok(fungsi.includes('if (KELOLA_DATA_AKUN) hapusEksporSementara();'));
    assert.ok(penyedia.includes('const KELOLA_DATA_AKUN = kelolaDataAkunAktif(Constants.expoConfig?.extra);'));
  });

  test('Teks jujur: isi foto tidak ikut', () => {
    assert.match(dataAkun.TEKS_DATA_AKUN.penjelasUnduh, /Isi foto juga tidak ikut, hanya data fotonya/);
    assert.match(dataAkun.TEKS_DATA_AKUN.saranUnduh, /Isi foto tidak ikut/);
    const draf = baca('docs', 'draf-teks-hapus-akun.md');
    assert.match(draf, /draf, menunggu persetujuan Khalifa/);
    assert.ok(draf.includes(dataAkun.TEKS_DATA_AKUN.penjelasUnduh));
    assert.ok(draf.includes(dataAkun.TEKS_DATA_AKUN.saranUnduh));
  });

  test('Data yang ditolak server tetap menyuruh menghubungi tim', () => {
    assert.match(dataAkun.pesanGalatUnduh('EKSPOR_TERLALU_BESAR'), /Hubungi tim LANJUT/);
    assert.match(dataAkun.pesanGalatUnduh('BAGIKAN_TIDAK_TERSEDIA'), /peramban/);
    assert.equal(dataAkun.pesanGalatUnduh('BAGIKAN_GAGAL'), dataAkun.GALAT_UNDUH_UMUM);
  });

  test('expo-sharing tidak meminta izin Android', () => {
    assert.ok(!baca('node_modules', 'expo-sharing', 'android', 'src', 'main', 'AndroidManifest.xml').includes('uses-permission'));
  });
});

describe('Profil build dan versi', () => {
  const eas = () => JSON.parse(baca('eas.json')).build;

  test('Profil pilot menyalakan kedua saklar, internal, berupa APK', () => {
    const { pilot } = eas();
    assert.deepEqual(pilot.env, { EXPO_PUBLIC_PORTOFOLIO: '1', EXPO_PUBLIC_KELOLA_DATA_AKUN: '1' });
    assert.equal(pilot.distribution, 'internal');
    assert.equal(pilot.android.buildType, 'apk');
    assert.equal(pilot.environment, 'production');
  });

  test('Profil lain tidak berubah dan keduanya tetap mati', () => {
    const { pilot, ...lain } = eas();
    assert.ok(pilot);
    assert.deepEqual(lain, {
      development: { developmentClient: true, distribution: 'internal', android: { buildType: 'apk' } },
      preview: { distribution: 'internal', environment: 'preview', android: { buildType: 'apk' } },
      production: { environment: 'production', android: { buildType: 'app-bundle' } },
      'apk-sekolah': { environment: 'production', android: { buildType: 'apk' } },
    });
    assert.ok(!/PORTOFOLIO|KELOLA_DATA_AKUN/.test(JSON.stringify(lain)));
  });

  test('Profil pilot wajib https, sama dengan profil rilis', () => {
    assert.ok(baca('app.config.ts').includes("const PROFIL_UJI = ['development', 'preview'];"));
  });

  test('Saklar server tidak diatur dari profil build', () => {
    assert.ok(!baca('eas.json').includes('PORTOFOLIO_AKTIF'));
  });

  test('versionCode lebih besar dari APK 1.0.0', () => {
    assert.ok(Number(/versionCode: (\d+),/.exec(baca('app.config.ts'))[1]) > 2);
  });
});

describe('Dokumen', () => {
  test('Daftar uji memuat prosedur mundur dan penanda yang belum terbukti', () => {
    const d = baca('docs', 'daftar-uji-hp-apk-v2.md');
    for (const kata of ['Prosedur mundur', 'Belum terbukti', 'migrasi-turun', 'lanjut_berkas', 'PORTOFOLIO_AKTIF', 'metrik-portofolio', 'bersihkan-berkas -- --cek', 'Gerbang jalan']) {
      assert.ok(d.includes(kata), kata);
    }
  });

  test('Audit kerentanan tidak menerapkan perbaikan', () => {
    assert.match(baca('docs', 'audit-kerentanan-npm.md'), /tidak ada perbaikan yang diterapkan/i);
  });
});
