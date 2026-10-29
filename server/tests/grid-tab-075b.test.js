// tests/grid-tab-075b.test.js
// Pengujian otomatis LANJUT_075b:
// - grid Beranda: "Eksplorasi Kampus" untuk SMP & 10–11 (jumlah kartu tidak
//   bertambah), kartu Ngobrol hilang dari grid semua jenjang, kartu tambahan
//   kelas 12 tetap (menunggu keputusan PM) — app (lib/beranda.ts) & cermin server
// - pintu Ngobrol: tab tengah dan Jenjang Saya tetap ada
// - tab aktif di /eksplorasi-tujuan (lib/navigasi.ts tabAktif)
// - DRAF kalimat kebijakan untuk minat_rumpun: tercatat, tidak dipakai di layar,
//   kebijakan-privasi.json tidak menyebutnya
// Modul murni app dijalankan langsung (muat-ts-app.js); tanpa server/basis data.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { muatModulApp } = require('./muat-ts-app');
const cermin = require('../src/util/beranda');

const AKAR_APP = path.join(__dirname, '..', '..');
const AKAR_REPO = path.join(AKAR_APP, '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8');

const beranda = muatModulApp('lib/beranda');
const navigasi = muatModulApp('lib/navigasi');
const jenjangSaya = muatModulApp('lib/jenjangSaya');

const label = (daftar) => daftar.map((k) => k.labelPendek);

describe('LANJUT_075b: grid Beranda per jenjang', () => {
  // Sesudah 075b, urutan kartu lain tetap seperti 075 (hanya kartu Ngobrol yang hilang).
  const HARAPAN = {
    smp: ['Eksplorasi Kampus', 'Gaya Belajar', 'Arsip Belajar', 'Level-In', 'Cerita Alumni'],
    kelas10_11: ['Pilih Mapel', 'Eksplorasi Kampus', 'Gaya Belajar', 'Arsip Belajar', 'Level-In', 'Daftar Periksa', 'Cerita Alumni'],
    kelas12: ['Jalur Saya', 'Eksplorasi Kampus', 'Arsip Belajar', 'Level-In', 'Cerita Alumni'],
    tanpaKelas: ['Arsip Belajar', 'Level-In', 'Cerita Alumni'],
  };
  const KELAS = { smp: ['7', '8', '9'], kelas10_11: ['10', '11'], kelas12: ['12'], tanpaKelas: [null, undefined, ''] };

  for (const [nama, daftar] of [['app', beranda.daftarKartuBeranda], ['cermin server', cermin.daftarKartuBeranda]]) {
    test(`Isi & urutan grid tiap jenjang (${nama}): tanpa kartu Ngobrol`, () => {
      for (const [kelompok, daftarKelas] of Object.entries(KELAS)) {
        for (const kelas of daftarKelas) {
          const kartu = daftar(kelas);
          assert.deepEqual(label(kartu), HARAPAN[kelompok], `kelas ${kelas}`);
          assert.ok(kartu.every((k) => k.href !== '/ngobrol' && k.id !== 'ngobrol'), `kelas ${kelas} masih punya kartu Ngobrol`);
        }
      }
    });
  }

  test('SMP & 10–11: kartu ke /eksplorasi-tujuan berlabel "Eksplorasi Kampus", ikon tetap, tidak ada kartu tambahan', () => {
    for (const kelas of ['7', '8', '9', '10', '11']) {
      const ke = beranda.daftarKartuBeranda(kelas).filter((k) => k.href === '/eksplorasi-tujuan');
      assert.equal(ke.length, 1, `kelas ${kelas}`);
      assert.equal(ke[0].labelPendek, 'Eksplorasi Kampus');
      assert.equal(ke[0].judul, 'Eksplorasi Kampus');
      assert.equal(ke[0].ikon, 'posisi', 'ikon kartu tidak berubah');
    }
    // 075: SMP 6, 10–11 8 (dengan Ngobrol). Ganti nama tidak menambah; 075b mengurangi satu (Ngobrol).
    assert.equal(beranda.daftarKartuBeranda('7').length, 5);
    assert.equal(beranda.daftarKartuBeranda('10').length, 7);
  });

  test('Kelas 12: kartu tambahan "Eksplorasi Kampus" dipertahankan (menunggu keputusan PM)', () => {
    const kartu = beranda.daftarKartuBeranda('12');
    assert.equal(kartu.filter((k) => k.href === '/eksplorasi-tujuan').length, 1);
    assert.equal(kartu.length, 5);
  });
});

describe('LANJUT_075c: keterangan kartu Eksplorasi Kampus', () => {
  const kartuEksplorasi = (daftar, kelas) => daftar(kelas).find((k) => k.href === '/eksplorasi-tujuan');

  for (const [nama, daftar] of [['app', beranda.daftarKartuBeranda], ['cermin server', cermin.daftarKartuBeranda]]) {
    test(`SMP & kelas 10–11 (${nama}): keterangan kartu tidak memuat kata "prodi"`, () => {
      for (const kelas of ['7', '8', '9', '10', '11']) {
        const k = kartuEksplorasi(daftar, kelas);
        assert.ok(k.keterangan.trim(), `kelas ${kelas}: keterangan kosong`);
        assert.ok(!/prodi/i.test(k.keterangan), `kelas ${kelas}: "${k.keterangan}"`);
        assert.equal(k.keterangan, 'Kenali bidang yang cocok untukmu.');
      }
    });

    test(`Kelas 12 (${nama}): kartu tambahan tidak diubah (menunggu keputusan PM)`, () => {
      const k = kartuEksplorasi(daftar, '12');
      assert.equal(k.labelPendek, 'Eksplorasi Kampus');
      assert.equal(k.keterangan, 'Intip prodi kuliah: belajar apa dan lulusannya kerja di mana.');
    });
  }

  test('Keterangan baru tercatat DRAF di salinan teks', () => {
    const salinan = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'), 'utf8');
    const awal = salinan.indexOf('**LANJUT_App (LANJUT_075c)');
    assert.ok(awal >= 0, 'blok LANJUT_075c harus ada');
    const blok = salinan.slice(awal, salinan.indexOf('\n### ', awal));
    assert.match(blok.slice(0, blok.indexOf('\n\n')), /\bDRAF\b/);
    assert.ok(blok.includes('Kenali bidang yang cocok untukmu.'));
  });
});

describe('LANJUT_075b: pintu Ngobrol yang tersisa', () => {
  test('Tab tengah tetap membuka /ngobrol; layar terkunci tetap untuk akun tanpa persetujuan', () => {
    const tengah = navigasi.TAB_BAWAH.filter((t) => t.tengah);
    assert.equal(tengah.length, 1);
    assert.equal(tengah[0].href, '/ngobrol');
    assert.ok(baca('components', 'screens', 'NgobrolScreen.tsx').includes('if (!persetujuan.boleh_pakai_ai) return <Terkunci />;'));
  });

  test('Pintu Ngobrol di Jenjang Saya tidak diubah: SMP dan akun tanpa kelas; kelas 10–11 & 12 tidak punya', () => {
    const pintuNgobrol = (kelas) => jenjangSaya.isiJenjangSaya(kelas).pintu.filter((p) => p.href === '/ngobrol');
    for (const kelas of ['7', '8', '9', null]) assert.equal(pintuNgobrol(kelas).length, 1, `kelas ${kelas}`);
    for (const kelas of ['10', '11', '12']) assert.equal(pintuNgobrol(kelas).length, 0, `kelas ${kelas}`);
    assert.equal(pintuNgobrol('7')[0].judul, 'Ngobrol Bareng LANJUT');
  });
});

describe('LANJUT_075b: tab aktif di /eksplorasi-tujuan', () => {
  test('SMP & kelas 10–11 (layar minat): tab Pilih Mapel TIDAK aktif — tidak ada tab yang menyala', () => {
    for (const kelas of ['7', '8', '9', '10', '11']) {
      const aktif = navigasi.tabAktif('/eksplorasi-tujuan', kelas, true);
      assert.notEqual(aktif, '/pilih-mapel', `kelas ${kelas}`);
      assert.equal(aktif, null, `kelas ${kelas}`);
    }
  });

  test('Kelas 12 & akun tanpa kelas (layar F10): aturan F10 tetap — Pilih Mapel (SDD-F10 §E.1)', () => {
    for (const kelas of ['12', null, undefined]) assert.equal(navigasi.tabAktif('/eksplorasi-tujuan', kelas, true), '/pilih-mapel');
  });

  test('Halaman lain tidak berubah: tab utama, halaman anak (Beranda), Ngobrol (tab tengah)', () => {
    for (const kelas of ['7', '10', '12']) {
      assert.equal(navigasi.tabAktif('/linimasa', kelas, false), '/linimasa');
      assert.equal(navigasi.tabAktif('/pilih-mapel', kelas, false), '/pilih-mapel');
      assert.equal(navigasi.tabAktif('/jenjang-saya', kelas, false), '/jenjang-saya');
      assert.equal(navigasi.tabAktif('/daftar-periksa', kelas, false), '/daftar-periksa');
      assert.equal(navigasi.tabAktif('/cerita-alumni', kelas, true), '/linimasa');
      assert.equal(navigasi.tabAktif('/akun', kelas, true), '/linimasa');
      assert.equal(navigasi.tabAktif('/ngobrol', kelas, true), '/ngobrol');
    }
  });

  test('AppShell memakai tabAktif dari lib/navigasi.ts dengan kelas akun; TabBar menerima "tidak ada tab"', () => {
    const shell = baca('components', 'layout', 'AppShell.tsx');
    assert.ok(shell.includes('<TabBar aktif={tabAktif(pathname, pengguna?.kelas, pathname in HALAMAN_ANAK)} />'));
    assert.ok(shell.includes('function TabBar({ aktif }: { aktif: HrefTab | null })'));
    assert.ok(!/const TAB_INDUK/.test(shell), 'TAB_INDUK hanya di lib/navigasi.ts');
  });
});

describe('LANJUT_075b: DRAF kebijakan privasi untuk minat_rumpun', () => {
  const salinan = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'), 'utf8');
  const awal = salinan.indexOf('**LANJUT_075b — usulan kalimat kebijakan privasi');
  const blok = awal >= 0 ? salinan.slice(awal, salinan.indexOf('\n### ', awal)) : '';
  const kalimat = (blok.match(/- \*\*Usulan — bidang minat yang disimpan:\*\* (.+)/) || [])[1];

  test('Tercatat DRAF di salinan teks dan lembar review', () => {
    assert.ok(awal >= 0, 'blok LANJUT_075b harus ada');
    assert.match(blok.slice(0, blok.indexOf('\n\n')), /\bDRAF\b/);
    assert.ok(kalimat && /bidang minat/i.test(kalimat) && kalimat.includes('Eksplorasi Kampus'));
    const lembar = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'lembar-review-draf-teks.md'), 'utf8');
    assert.ok(lembar.includes(kalimat), 'kalimat usulan belum ada di lembar review');
  });

  test('Tidak dipakai di layar dan kebijakan-privasi.json tidak menyebut minat_rumpun', () => {
    const kebijakan = baca('lib', 'kebijakan-privasi.json');
    assert.ok(!/minat_rumpun|bidang minat/i.test(kebijakan), 'kebijakan-privasi.json tidak boleh diubah di 075b');
    for (const dir of ['app', 'components', 'lib', 'hooks', 'providers']) {
      const berkasDi = (akar) =>
        fs.readdirSync(akar, { withFileTypes: true }).flatMap((e) => {
          const p = path.join(akar, e.name);
          return e.isDirectory() ? berkasDi(p) : /\.(ts|tsx|json)$/.test(e.name) ? [p] : [];
        });
      for (const p of berkasDi(path.join(AKAR_APP, dir))) {
        assert.ok(!fs.readFileSync(p, 'utf8').includes('Kami menyimpan bidang minat'), `${path.relative(AKAR_APP, p)} memakai kalimat DRAF`);
      }
    }
  });
});
