// LANJUT_014 seri v2: pemeriksa gerbang rilis, dan teks kebijakan yang sudah diselaraskan. Semua
// kasus memakai folder tiruan, jadi tes ini tidak bergantung pada apakah isian sungguhan sudah lengkap.

const { describe, test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { periksa, sidikTeks, teksDrafLain } = require('../tools/periksa-gerbang-rilis');
const { muatModulApp } = require('./muat-ts-app');

const AKAR_APP = path.join(__dirname, '..', '..');
const ALAT = path.join(__dirname, '..', 'tools', 'periksa-gerbang-rilis.js');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const folder = [];

afterEach(() => {
  while (folder.length) fs.rmSync(folder.pop(), { recursive: true, force: true });
});

/** Folder tiruan dalam keadaan bersih: kebijakan lengkap, teks bukan draf, saklar menyala di pilot. */
function tiruan() {
  const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjut-gerbang-'));
  folder.push(akar);
  const tulis = (rel, isi) => {
    fs.mkdirSync(path.dirname(path.join(akar, rel)), { recursive: true });
    fs.writeFileSync(path.join(akar, rel), typeof isi === 'string' ? isi : JSON.stringify(isi, null, 2));
  };
  const kebijakan = {
    versi: 1,
    status: 'Berlaku.',
    ringkasan: ['Kami menyimpan data akunmu.'],
    isi: [
      { judul: 'Yang tidak kami kumpulkan', butir: ['Lokasi dan kontak.', 'Foto, kecuali foto yang kamu pilih atau ambil sendiri untuk Portofolio.'] },
      { judul: 'Hak kamu', butir: ['Akun bisa kamu hapus sendiri di Data Akun.'] },
    ],
  };
  tulis('lib/kebijakan-privasi.json', kebijakan);
  tulis('eas.json', { build: { 'apk-sekolah': { environment: 'production' }, pilot: { env: { EXPO_PUBLIC_PORTOFOLIO: '1', EXPO_PUBLIC_KELOLA_DATA_AKUN: '1' } } } });
  tulis('lib/portofolio.ts', "export const A = 'Teks';\n");
  tulis('docs/draf-teks-portofolio.md', 'Teks portofolio.\n');
  tulis('lib/dataAkun.ts', "export const B = 'Teks';\n");
  tulis('docs/draf-teks-hapus-akun.md', 'Teks hapus akun.\n');
  return {
    akar,
    tulis,
    kebijakan,
    simpanKebijakan: () => tulis('lib/kebijakan-privasi.json', kebijakan),
    setujui: (daftar) => tulis('docs/persetujuan-teks-rilis.json', { disetujui: daftar }),
    matikanSaklar: () => tulis('eas.json', { build: { 'apk-sekolah': { environment: 'production' } } }),
  };
}

const jenis = (akar) => periksa(akar).map((m) => m.jenis);
const cli = (...argumen) => spawnSync(process.execPath, [ALAT, ...argumen], { encoding: 'utf8', timeout: 30000 });

describe('Pemeriksa gerbang rilis', () => {
  test('Keadaan bersih lolos, dengan kode keluar 0', () => {
    const t = tiruan();
    assert.deepEqual(periksa(t.akar), []);
    const r = cli(`--akar=${t.akar}`);
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /LOLOS/);
  });

  test('Penanda [ISI tertangkap, dan letaknya disebut', () => {
    const t = tiruan();
    t.kebijakan.isi[1].butir.push('[ISI: kontak resmi tim]');
    t.simpanKebijakan();
    const hasil = periksa(t.akar);
    assert.deepEqual(hasil, [{ jenis: 'isian', pesan: 'Hak kamu: kontak resmi tim' }]);
    const r = cli(`--akar=${t.akar}`);
    assert.equal(r.status, 1);
    assert.match(r.stdout, /BELUM BOLEH BUILD/);
    assert.match(r.stdout, /kontak resmi tim/);
  });

  test('Penanda di status dan judul bagian tertangkap, di catatan pengembang tidak', () => {
    const t = tiruan();
    t.kebijakan._catatan = 'Penanda [ISI] wajib diisi.';
    t.simpanKebijakan();
    assert.deepEqual(periksa(t.akar), []);
    t.kebijakan.status = '[ISI: status]';
    t.kebijakan.isi[1].judul = '[ISI: judul]';
    t.simpanKebijakan();
    assert.deepEqual(jenis(t.akar), ['isian', 'isian']);
  });

  test('Penanda yang tidak ditutup juga tertangkap', () => {
    const t = tiruan();
    t.kebijakan.ringkasan.push('[ISI tanpa penutup');
    t.simpanKebijakan();
    assert.deepEqual(jenis(t.akar), ['isian']);
  });

  test('Kalimat tidak mengumpulkan foto tertangkap bila Portofolio menyala', () => {
    for (const teks of ['Lokasi, kontak, foto, rekaman suara, dan nomor HP.', 'Foto.']) {
      const t = tiruan();
      t.kebijakan.isi[0].butir = [teks];
      t.simpanKebijakan();
      assert.deepEqual(jenis(t.akar), ['kalimat'], teks);
    }
    const t = tiruan();
    t.kebijakan.isi[1].butir = ['LANJUT tidak mengumpulkan lokasi atau foto.'];
    t.simpanKebijakan();
    assert.deepEqual(jenis(t.akar), ['kalimat']);
  });

  test('Kalimat foto yang sudah diganti tertangkap, di kebijakan dan di teks layar', () => {
    for (const teks of ['Pengelola tidak membukanya tanpa keperluan.', 'Fotomu hanya terlihat olehmu di aplikasi.', 'Hanya kamu yang bisa melihat foto ini.']) {
      const t = tiruan();
      t.kebijakan.isi[1].butir = [teks];
      t.simpanKebijakan();
      assert.deepEqual(jenis(t.akar), ['kalimat'], teks);
    }
    for (const rel of ['lib/portofolio.ts', 'lib/beranda.ts']) {
      const t = tiruan();
      t.tulis(rel, "export const A = 'tidak membukanya tanpa keperluan';\n");
      assert.deepEqual(periksa(t.akar), [{ jenis: 'kalimat', pesan: `${rel}: masih memuat kalimat foto yang sudah diganti (K29).` }], rel);
    }
  });

  test('Kalimat foto lama boleh ada bila Portofolio mati', () => {
    const t = tiruan();
    t.tulis('lib/portofolio.ts', "export const A = 'Hanya kamu yang bisa melihat foto ini.';\n");
    t.matikanSaklar();
    assert.deepEqual(periksa(t.akar), []);
  });

  test('Teks DRAF lain hanya jadi peringatan, dengan hitungan', () => {
    const t = tiruan();
    t.tulis('lib/ngobrol.ts', '// DRAF belum disetujui Khalifa.\n// DRAF\n');
    t.tulis('components/screens/Lain.tsx', '// Teks DRAF.\n');
    t.tulis('lib/polos.ts', 'const draf = 1;\n');
    t.tulis('lib/kebijakanPrivasi.ts', '// DRAF\n');
    assert.deepEqual(teksDrafLain(t.akar), [{ berkas: 'components/screens/Lain.tsx', jumlah: 1 }, { berkas: 'lib/ngobrol.ts', jumlah: 3 }]);
    assert.deepEqual(periksa(t.akar), [], 'peringatan bukan kegagalan');
    const r = cli(`--akar=${t.akar}`);
    assert.equal(r.status, 0, r.stdout);
    assert.match(r.stdout, /Peringatan, bukan kegagalan: 2 berkas lain masih memuat 4 tanda DRAF/);
  });

  test('Kalimat hapus akun belum ada tertangkap bila saklarnya menyala', () => {
    const t = tiruan();
    t.kebijakan.isi[1].butir = ['Untuk data lain, fitur hapus akun di aplikasi belum ada, jadi ajukan lewat kontak.'];
    t.simpanKebijakan();
    assert.deepEqual(jenis(t.akar), ['kalimat']);
  });

  test('Saat saklar mati di semua profil, kalimat lama boleh ada', () => {
    const t = tiruan();
    t.kebijakan.isi[0].butir = ['Lokasi, kontak, foto.'];
    t.kebijakan.isi[1].butir = ['Fitur hapus akun di aplikasi belum ada.'];
    t.simpanKebijakan();
    t.matikanSaklar();
    assert.deepEqual(periksa(t.akar), []);
  });

  test('Saklar bernilai selain 1 dianggap mati, sama seperti aplikasinya', () => {
    const t = tiruan();
    t.kebijakan.isi[0].butir = ['Lokasi, kontak, foto.'];
    t.simpanKebijakan();
    t.tulis('eas.json', { build: { pilot: { env: { EXPO_PUBLIC_PORTOFOLIO: '0' } } } });
    assert.deepEqual(periksa(t.akar), []);
  });

  test('Teks draf yang belum disetujui tertangkap, per fitur', () => {
    const t = tiruan();
    t.tulis('docs/draf-teks-portofolio.md', '**Status:** draf, menunggu persetujuan Khalifa.\n');
    assert.deepEqual(periksa(t.akar), [{ jenis: 'draf', pesan: 'Teks Portofolio: masih draf dan belum disetujui.' }]);
    t.tulis('lib/dataAkun.ts', '// Semua teks di sini DRAF.\n');
    assert.deepEqual(jenis(t.akar), ['draf', 'draf']);
  });

  test('Status DRAF di kebijakan ikut butuh persetujuan', () => {
    const t = tiruan();
    t.kebijakan.status = 'DRAF — belum berlaku.';
    t.simpanKebijakan();
    assert.deepEqual(periksa(t.akar), [{ jenis: 'draf', pesan: 'Kebijakan privasi: masih draf dan belum disetujui.' }]);
  });

  test('Teks draf boleh ada bila saklarnya mati', () => {
    const t = tiruan();
    t.tulis('docs/draf-teks-portofolio.md', 'draf\n');
    t.matikanSaklar();
    assert.deepEqual(periksa(t.akar), []);
  });

  test('Persetujuan dengan sidik yang benar meloloskan teks draf', () => {
    const t = tiruan();
    t.tulis('docs/draf-teks-portofolio.md', 'draf\n');
    t.setujui([{ teks: 'portofolio', sidik: sidikTeks(t.akar, 'portofolio'), tanggal: '2026-11-11', oleh: 'Khalifa' }]);
    assert.deepEqual(periksa(t.akar), []);
  });

  test('Persetujuan satu teks tidak berlaku untuk teks lain', () => {
    const t = tiruan();
    t.tulis('docs/draf-teks-portofolio.md', 'draf\n');
    t.tulis('docs/draf-teks-hapus-akun.md', 'draf\n');
    t.setujui([{ teks: 'portofolio', sidik: sidikTeks(t.akar, 'portofolio'), tanggal: '2026-11-11', oleh: 'Khalifa' }]);
    assert.deepEqual(periksa(t.akar), [{ jenis: 'draf', pesan: 'Teks unduh data dan hapus akun: masih draf dan belum disetujui.' }]);
  });

  test('Persetujuan gugur bila teksnya berubah sesudah disetujui', () => {
    const t = tiruan();
    t.tulis('docs/draf-teks-portofolio.md', 'draf\n');
    t.setujui([{ teks: 'portofolio', sidik: sidikTeks(t.akar, 'portofolio'), tanggal: '2026-11-11', oleh: 'Khalifa' }]);
    for (const [rel, isi] of [['lib/portofolio.ts', "export const A = 'Teks baru';\n"], ['docs/draf-teks-portofolio.md', 'draf baru\n']]) {
      const lama = fs.readFileSync(path.join(t.akar, rel), 'utf8');
      t.tulis(rel, isi);
      assert.deepEqual(periksa(t.akar), [{ jenis: 'draf', pesan: 'Teks Portofolio: persetujuannya gugur, karena teksnya berubah sesudah disetujui.' }], rel);
      t.tulis(rel, lama);
    }
  });

  test('Sidik tidak berubah hanya karena akhir baris Windows', () => {
    const t = tiruan();
    t.tulis('docs/draf-teks-portofolio.md', 'baris satu\nbaris dua\n');
    const sidik = sidikTeks(t.akar, 'portofolio');
    t.tulis('docs/draf-teks-portofolio.md', 'baris satu\r\nbaris dua\r\n');
    assert.equal(sidikTeks(t.akar, 'portofolio'), sidik);
  });

  test('Persetujuan tanpa tanggal yang sah atau tanpa nama ditolak', () => {
    for (const ubah of [{ tanggal: 'YYYY-MM-DD' }, { oleh: '  ' }]) {
      const t = tiruan();
      t.tulis('docs/draf-teks-portofolio.md', 'draf\n');
      t.setujui([{ teks: 'portofolio', sidik: sidikTeks(t.akar, 'portofolio'), tanggal: '2026-11-11', oleh: 'Khalifa', ...ubah }]);
      assert.deepEqual(jenis(t.akar), ['draf'], JSON.stringify(ubah));
    }
  });

  test('--sidik mencetak baris siap salin tanpa menilai', () => {
    const t = tiruan();
    const r = cli(`--akar=${t.akar}`, '--sidik');
    assert.equal(r.status, 0);
    assert.ok(r.stdout.includes(`"sidik":"${sidikTeks(t.akar, 'hapus-akun')}"`));
  });

  test('Argumen tak dikenal ditolak', () => {
    assert.equal(cli('--apa').status, 2);
  });

  test('Dipasang sebagai skrip, tetapi di luar npm test', () => {
    for (const rel of [['package.json'], ['server', 'package.json']]) {
      const { scripts } = JSON.parse(baca(...rel));
      assert.ok(scripts['periksa-gerbang-rilis'], rel.join('/'));
      assert.ok(!String(scripts.test ?? '').includes('periksa-gerbang-rilis'));
    }
  });

  test('Daftar uji mewajibkannya sebelum eas build', () => {
    assert.match(baca('docs', 'daftar-uji-hp-apk-v2.md'), /npm run periksa-gerbang-rilis/);
  });
});

describe('Teks kebijakan yang sudah diselaraskan', () => {
  const kebijakan = JSON.parse(baca('lib', 'kebijakan-privasi.json'));
  const bagian = (judul) => kebijakan.isi.find((b) => b.judul === judul);
  const semua = [...kebijakan.ringkasan, ...kebijakan.isi.flatMap((b) => [...(b.paragraf ?? []), ...(b.butir ?? [])])].join('\n');

  test('Tidak ada lagi kalimat yang bertentangan dengan fitur', () => {
    assert.deepEqual(periksa(AKAR_APP).filter((m) => m.jenis === 'kalimat'), []);
  });

  test('Rumusan K27 dipakai', () => {
    const teks = bagian('Berapa lama data disimpan').paragraf.join(' ');
    for (const kalimat of ['disimpan sampai kamu menghapus akunmu', 'tidak dihapus otomatis', 'seketika, tanpa masa tenggang', 'sampai cadangan itu tergantikan', 'Catatan teknis server']) {
      assert.ok(teks.includes(kalimat), kalimat);
    }
    assert.ok(semua.includes('masih tersimpan di server sampai akunmu dihapus'));
  });

  test('Menyebut Data Akun, bukan Jalur Saya', () => {
    assert.doesNotMatch(semua, /Jalur Saya/);
    assert.ok(semua.includes('Statusnya bisa kamu lihat di Data Akun.'));
    assert.ok(semua.includes('bisa kamu ubah sendiri di Data Akun.'));
  });

  test('Kalimat privasi foto tidak mutlak', () => {
    const porto = muatModulApp('lib/portofolio');
    const beranda = muatModulApp('lib/beranda');
    const teks = [porto.TEKS_PORTOFOLIO.privasiFoto, porto.TEKS_PORTOFOLIO.pengantar, beranda.KARTU_PORTOFOLIO.keterangan].join(' ');
    assert.doesNotMatch(teks, /Hanya kamu yang bisa/);
    assert.match(porto.TEKS_PORTOFOLIO.privasiFoto, /Pengelola layanan secara teknis/);
    assert.doesNotMatch(teks, /tanpa keperluan/);
    assert.doesNotMatch(semua, /tanpa keperluan|hanya terlihat olehmu/);
  });
});
