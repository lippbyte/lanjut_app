// tests/beranda-hero-navigasi.test.js
// Pengujian otomatis LANJUT_074 — Beranda gaya hero, carousel banner, tab bar
// lima tab dengan tab tengah Ngobrol, nama "Jalur Saya" / "Data Akun", dan
// tombol mikrofon (ucapan → teks). Modul murni app dijalankan langsung
// (muat-ts-app.js); layar React dicek dari sumbernya.

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { muatModulApp } = require('./muat-ts-app');
const cermin = require('../src/util/beranda');
const bannerModul = require('../src/modul/konten/banner');
const { kirimSkema } = require('../src/modul/ngobrol/ngobrol.skema');

const AKAR_APP = path.join(__dirname, '..', '..');
const AKAR_REPO = path.join(AKAR_APP, '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8');

const beranda = muatModulApp('lib/beranda');
const navigasi = muatModulApp('lib/navigasi');
const jenjangSaya = muatModulApp('lib/jenjangSaya');
const suara = muatModulApp('lib/suara');
const { color, gradient } = muatModulApp('theme/tokens');

// Label lama /cek-posisi dirakit dari potongan supaya berkas ini sendiri tidak memuatnya.
const LABEL_LAMA = ['Cek', 'Posisi', 'Gue'].join(' ');

/** Isi satu fungsi komponen di berkas sumber: dari `function Nama(` sampai fungsi tingkat atas berikutnya. */
function fungsi(sumber, nama) {
  const awal = sumber.indexOf(`function ${nama}(`);
  assert.ok(awal >= 0, `function ${nama} tidak ditemukan`);
  const akhir = sumber.slice(awal + 1).search(/\n(?:export )?(?:function |const s = )/);
  return akhir < 0 ? sumber.slice(awal) : sumber.slice(awal, awal + 1 + akhir);
}

/** Rasio kontras WCAG dua warna #RRGGBB. */
function kontras(a, b) {
  const lum = (hex) => {
    const [r, g, bl] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(bl);
  };
  const [t, g] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (t + 0.05) / (g + 0.05);
}

describe('LANJUT_074 §A–B: urutan Beranda', () => {
  test('Kelas 12: sapaan, hero, progres, grid, Info Penting, carousel — berurutan, bersebelahan', () => {
    const u = beranda.urutanBeranda({ kelas: '12', tampilMulaiDariSini: true, tampilBanner: true });
    assert.deepEqual(u.slice(0, 6), ['sapaan', 'hero', 'progres', 'grid', 'info_penting', 'banner']);
    // Sisanya (kalimat K1, "Mulai dari Sini") di paling bawah — pilihan percakapan, belum disetujui PM.
    assert.deepEqual(u.slice(6), ['judul', 'mulai_dari_sini']);
  });

  test('Hero hanya untuk kelas 12, selalu tepat di bawah sapaan', () => {
    for (const tampilMulaiDariSini of [true, false]) {
      for (const tampilBanner of [true, false]) {
        const u12 = beranda.urutanBeranda({ kelas: '12', tampilMulaiDariSini, tampilBanner });
        assert.equal(u12[1], 'hero');
        assert.equal(u12.indexOf('progres'), 2, 'progres tepat di bawah hero');
        for (const kelas of ['7', '8', '9', '10', '11', null, undefined, '']) {
          const u = beranda.urutanBeranda({ kelas, tampilMulaiDariSini, tampilBanner });
          assert.ok(!u.includes('hero'), `kelas ${kelas} tidak boleh melihat hero`);
          assert.ok(!u.includes('info_penting'), `kelas ${kelas} tidak boleh melihat Info Penting`);
          assert.equal(u[1], 'progres', `kelas ${kelas}: progres tepat di bawah sapaan`);
        }
      }
    }
  });

  test('Kelas 10: tanpa hero; carousel tepat di bawah grid', () => {
    const u = beranda.urutanBeranda({ kelas: '10', tampilMulaiDariSini: false, tampilBanner: true });
    assert.deepEqual(u, ['sapaan', 'progres', 'grid', 'banner', 'judul']);
  });

  test('Bagian "tenggat" lama sudah tidak ada: tenggat hanya tampil sebagai hero', () => {
    for (const kelas of ['7', '10', '12', null]) {
      const u = beranda.urutanBeranda({ kelas, tampilMulaiDariSini: true, tampilBanner: true });
      assert.ok(!u.includes('tenggat'), `kelas ${kelas}: ${u}`);
    }
    const layar = baca('components', 'screens', 'LinimasaScreen.tsx');
    assert.ok(!layar.includes('TenggatTerdekat'));
    assert.ok(layar.includes('hero: <KartuHero />'));
  });

  test('Hero: teks sama dengan kartu tenggat lama, memuat/galat → tidak tampil tanpa pesan', () => {
    const layar = baca('components', 'screens', 'LinimasaScreen.tsx');
    const hero = fungsi(layar, 'KartuHero');
    assert.ok(hero.includes('if (isPending || isError) return null;'));
    assert.ok(!/Memuat|KeadaanGalat|Peringatan/.test(hero), 'hero tidak boleh menampilkan pesan memuat/galat');
    assert.ok(hero.includes('{sisaHari} hari'));
    assert.ok(hero.includes("menuju {terdekat.judul} {momen === 'mulai' ? 'dimulai' : 'ditutup'},{' '}"));
    assert.ok(hero.includes('{formatTanggal(tanggalMomen(terdekat, momen))}.'));
    assert.ok(hero.includes('turunkanLinimasa(data ?? [])'), 'tenggat tetap dari data terverifikasi (LANJUT_066)');
  });

  // Pilihan di percakapan (belum disetujui PM): warna kartu tenggat lama, menyatu dengan app bar.
  test('Hero: di kepala bergradasi token kartu tenggat yang menyatu dengan app bar; teks gelap kontras tinggi', () => {
    const layar = baca('components', 'screens', 'LinimasaScreen.tsx');
    const gaya = (nama) => layar.match(new RegExp(`\\n  ${nama}: \\{([^}]*)\\}`))?.[1] ?? '';
    // Gradasi = warna kartu tenggat lama (gradient.tile), tegak lurus supaya tepi atas = warna app bar.
    assert.deepEqual([...gradient.kepala.colors], [...gradient.tile.colors]);
    assert.deepEqual([...gradient.kepala.colors], [color.blue200, color.blue300]);
    assert.equal(gradient.kepala.start.y, 0);
    assert.equal(gradient.kepala.start.x, gradient.kepala.end.x);
    assert.ok(layar.includes('colors={gradient.kepala.colors}'));
    const shell = baca('components', 'layout', 'AppShell.tsx');
    assert.ok(shell.includes("menyatu={pathname === '/linimasa'}"));
    assert.ok(shell.includes('appbarMenyatu: { backgroundColor: gradient.kepala.colors[0] }'));
    assert.ok(!/borderBottom|boxShadow/.test(shell.match(/appbarMenyatu: \{[^}]*\}/)[0]), 'tanpa garis/bayangan di Beranda');
    // Teks gelap seperti kartu tenggat lama; kontras dihitung di kedua ujung gradasi.
    assert.match(gaya('sapaan'), /color: color\.textBody/);
    assert.match(gaya('heroAngka'), /color: color\.textBody/);
    assert.match(gaya('heroTeks'), /color: color\.textMuted/);
    for (const latar of gradient.kepala.colors) {
      for (const teks of [color.textBody, color.textMuted]) {
        assert.ok(kontras(teks, latar) >= 4.5, `${teks} di ${latar}: ${kontras(teks, latar).toFixed(2)}:1`);
      }
    }
    // Angka hero 40 px; kartu lain di Beranda paling besar memakai teks.title.
    assert.match(gaya('heroAngka'), /fontSize: 40/);
  });

  test('Kepala (menyatu dengan app bar) = sapaan + hero kelas 12, sapaan saja kelas lain; urutan tidak berubah', () => {
    for (const kelas of ['7', '10', '12', null]) {
      for (const tampilBanner of [true, false]) {
        const u = beranda.urutanBeranda({ kelas, tampilMulaiDariSini: true, tampilBanner });
        const { kepala, badan } = beranda.pisahKepalaBeranda(u);
        assert.deepEqual([...kepala, ...badan], u, `kelas ${kelas}`);
        assert.deepEqual(kepala, kelas === '12' ? ['sapaan', 'hero'] : ['sapaan']);
        assert.equal(badan[0], 'progres', 'progres paling atas di lembar putih, tepat di bawah hero');
      }
    }
    const layar = baca('components', 'screens', 'LinimasaScreen.tsx');
    assert.ok(layar.includes('const { kepala, badan } = pisahKepalaBeranda(urutan);'));
    assert.ok(layar.includes('{kepala.map((b) => ('));
    assert.ok(layar.includes('{badan.map((b) => ('));
  });
});

describe('LANJUT_074 §C: carousel banner', () => {
  const B = { id: 'a', judul: 'J', isi: 'I', sumber: 'S', url_sumber: 'https://contoh.invalid', tanggal_selesai: '2026-10-20' };

  test('Paling banyak tiga, di app maupun server', () => {
    const empat = ['a', 'b', 'c', 'd'].map((id) => ({ ...B, id }));
    assert.deepEqual(beranda.bannerBeranda(empat, Date.UTC(2026, 9, 13)).map((b) => b.id), ['a', 'b', 'c']);
    assert.equal(beranda.MAKS_BANNER_BERANDA, 3);
    assert.equal(bannerModul.MAKS_BANNER, 3);
  });

  test('Layar: geser horizontal per halaman, titik penanda bila lebih dari satu, tanpa tombol tutup', () => {
    const layar = baca('components', 'screens', 'LinimasaScreen.tsx');
    const karousel = fungsi(layar, 'KarouselBanner');
    const kartu = fungsi(layar, 'KartuBanner');
    assert.ok(karousel.includes('horizontal') && karousel.includes('pagingEnabled'));
    assert.ok(karousel.includes('daftar.length > 1 ?'), 'titik hanya bila lebih dari satu banner');
    assert.ok(karousel.includes('<KartuBanner banner={b} />'));
    assert.ok(kartu.includes('{banner.judul}') && kartu.includes('{banner.isi}') && kartu.includes('Sumber: {banner.sumber}'));
    for (const teks of [karousel, kartu]) assert.ok(!/tutup|close|silang/i.test(teks), 'tidak boleh ada tombol tutup');
    assert.ok(layar.includes('banner: banner.length ? <KarouselBanner daftar={banner} /> : null'));
  });
});

describe('LANJUT_074 §D: tab bar lima tab', () => {
  const { TAB_BAWAH, IKON_TAB_TENGAH, IKON_AVATAR_AI, UKURAN_IKON_TAB_TENGAH, TINGGI_IKON_TAB, UKURAN_TAB_TENGAH } = navigasi;
  /** PNG sungguhan dengan kanal alfa (tipe warna 6 = RGBA), lebar & tinggi dari header IHDR. */
  const infoPng = (nama) => {
    const b = fs.readFileSync(path.join(AKAR_APP, 'assets', nama));
    assert.equal(b.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', `${nama} bukan PNG`);
    return { lebar: b.readUInt32BE(16), tinggi: b.readUInt32BE(20), tipeWarna: b[25] };
  };

  test('Lima tab; tab tengah Ngobrol di posisi ketiga', () => {
    assert.equal(TAB_BAWAH.length, 5);
    assert.equal(TAB_BAWAH[2].href, '/ngobrol');
    assert.equal(TAB_BAWAH[2].label, 'Ngobrol');
    assert.equal(TAB_BAWAH[2].tengah, true);
    assert.deepEqual(TAB_BAWAH.map((t) => Boolean(t.tengah)), [false, false, true, false, false]);
  });

  test('Empat tab lama tetap: dua kiri, dua kanan, dengan label & ikon yang sama', () => {
    assert.deepEqual(
      TAB_BAWAH.map((t) => [t.href, t.label, t.ikon ?? null]),
      [
        ['/linimasa', 'Beranda', 'beranda'],
        ['/jenjang-saya', 'Jenjang Saya', 'smk'],
        ['/ngobrol', 'Ngobrol', null],
        ['/pilih-mapel', 'Pilih Mapel', 'mapel'],
        ['/daftar-periksa', 'Daftar Periksa', 'checklist'],
      ]
    );
  });

  // Pilihan percakapan (15 Okt 2026, belum disetujui PM): placeholder "L" diganti ikon kelinci LANJUT.
  test('Tab tengah lebih besar dari ikon tab biasa, batas sentuh minimal 44 px, ikon kelinci LANJUT muat di lingkaran', () => {
    assert.ok(UKURAN_TAB_TENGAH >= 44);
    assert.ok(UKURAN_TAB_TENGAH > TINGGI_IKON_TAB);
    assert.ok(UKURAN_IKON_TAB_TENGAH < UKURAN_TAB_TENGAH, 'ikon di dalam lingkaran');
    assert.ok(kontras(color.blue600, color.white) >= 4.5, 'kelinci putih di lingkaran blue600');
    for (const nama of [IKON_TAB_TENGAH, IKON_AVATAR_AI]) {
      const png = infoPng(nama);
      assert.equal(png.tipeWarna, 6, `${nama} harus RGBA (latar transparan)`);
      assert.equal(png.lebar, png.tinggi, `${nama} persegi`);
      assert.ok(png.lebar >= 3 * UKURAN_IKON_TAB_TENGAH, `${nama} cukup tajam untuk layar 3x`);
    }
  });

  test('AppShell menggambar tab dari TAB_BAWAH; tab tengah memakai ikon kelinci LANJUT, bukan gambar sendiri', () => {
    const shell = baca('components', 'layout', 'AppShell.tsx');
    assert.ok(shell.includes("from '../../lib/navigasi'"));
    assert.ok(shell.includes('TAB_BAWAH.map('));
    assert.ok(shell.includes('{t.tengah ? ('));
    assert.ok(!/const TAB\s*[:=]/.test(shell), 'daftar tab hanya di lib/navigasi.ts');
    assert.match(shell, /width: UKURAN_TAB_TENGAH,\s*height: UKURAN_TAB_TENGAH/);
    const tabBar = fungsi(shell, 'TabBar');
    assert.ok(tabBar.includes(`<Image source={require('../../assets/${IKON_TAB_TENGAH}')} style={s.tengahIkon}`), 'tab tengah memakai ikon kelinci');
    assert.ok(!/<Svg|<Path/.test(tabBar), 'tab tengah tidak menggambar ikon sendiri');
    assert.ok(!/>\s*L\s*</.test(tabBar), 'huruf placeholder "L" sudah tidak ada');
    // Ikon hiasan: lingkaran disembunyikan dari pembaca layar; nama tab tetap "Ngobrol".
    assert.ok(tabBar.includes('aria-hidden') && tabBar.includes('accessible={false}'));
    // Lima tab di 360 px: label panjang boleh dua baris supaya nama tab lama tidak terpotong.
    assert.ok(tabBar.includes('numberOfLines={2}'));
    // Di /ngobrol tab tengah yang menyala (aturan tab di lib/navigasi.ts sejak LANJUT_075b);
    // page bar "Ngobrol Bareng LANJUT" tetap ada.
    assert.equal(navigasi.tabAktif('/ngobrol', '12', true), '/ngobrol');
    assert.equal(navigasi.tabAktif('/ngobrol', '7', true), '/ngobrol');
    assert.ok(shell.includes("'/ngobrol': 'Ngobrol Bareng LANJUT'"));
  });

  test('Tab tengah membuka layar Ngobrol yang sudah ada; layar terkunci tetap untuk akun tanpa izin', () => {
    const rute = baca('app', '(app)', 'ngobrol.tsx');
    assert.ok(rute.includes('NgobrolScreen'));
    const ngobrol = baca('components', 'screens', 'NgobrolScreen.tsx');
    assert.ok(ngobrol.includes('if (!persetujuan.boleh_pakai_ai) return <Terkunci />;'));
  });

  test('Balasan bot (dan "sedang mengetik") memakai avatar kelinci AI LANJUT; pesan siswa dan galat tidak', () => {
    const ngobrol = baca('components', 'screens', 'NgobrolScreen.tsx');
    const avatar = fungsi(ngobrol, 'AvatarAi');
    assert.ok(avatar.includes(`require('../../assets/${IKON_AVATAR_AI}')`));
    assert.ok(avatar.includes('aria-hidden') && avatar.includes('accessible={false}'), 'avatar hanya hiasan');
    // Dua tempat: gelembung balasan bot dan indikator mengetik.
    assert.equal(ngobrol.split('<AvatarAi />').length - 1, 2);
    const cabangPengguna = ngobrol.slice(ngobrol.indexOf("{m.dari === 'pengguna' ? ("), ngobrol.indexOf('<AvatarAi />'));
    assert.ok(cabangPengguna.includes('s.gelembungPengguna') && !cabangPengguna.includes('AvatarAi'), 'pesan siswa tanpa avatar');
    const galat = ngobrol.slice(ngobrol.indexOf("m.dari === 'galat' ?"), ngobrol.indexOf("{m.dari === 'pengguna' ? ("));
    assert.ok(!galat.includes('AvatarAi'), 'gelembung galat tanpa avatar');
  });
});

describe('LANJUT_074 §E: "Jalur Saya" dan "Data Akun"', () => {
  test('Fitur /cek-posisi berlabel "Jalur Saya" di grid, Mulai dari Sini, Jenjang Saya, Data Akun, page bar, dan cermin server', () => {
    for (const k of [beranda.KARTU_CEK_POSISI, cermin.KARTU_CEK_POSISI]) {
      assert.equal(k.judul, 'Jalur Saya');
      assert.equal(k.labelPendek, 'Jalur Saya');
      assert.equal(k.href, '/cek-posisi');
    }
    assert.equal(beranda.daftarKartuBeranda('12')[0].labelPendek, 'Jalur Saya');
    assert.equal(beranda.infoMulaiDariSini('12').labelTombol, 'Jalur Saya');
    assert.equal(cermin.infoMulaiDariSini('12').labelTombol, 'Jalur Saya');
    assert.equal(jenjangSaya.isiJenjangSaya('12').pintu.find((p) => p.href === '/cek-posisi').judul, 'Jalur Saya');
    assert.ok(baca('components', 'layout', 'AppShell.tsx').includes("'/cek-posisi': 'Jalur Saya'"));
    assert.ok(baca('components', 'screens', 'AkunScreen.tsx').includes('judul="Jalur Saya"'));
  });

  test('Halaman akun bernama "Data Akun": page bar, judul bagian, form ubah, dan semua tombol/teks yang menunjuk ke sana', () => {
    assert.ok(baca('components', 'layout', 'AppShell.tsx').includes("'/akun': 'Data Akun'"));
    const akun = baca('components', 'screens', 'AkunScreen.tsx');
    assert.ok(akun.includes('<Text style={s.eyebrow}>Data Akun</Text>'));
    assert.ok(akun.includes('<Text style={s.eyebrow}>Ubah Data Akun</Text>'));
    // Isi bagian tidak dihapus.
    for (const baris of ['label="Kelas"', 'label="Sekolah"', 'label="Target prodi"', 'label="Gaya belajar"']) assert.ok(akun.includes(baris));
    const khusus = baca('components', 'screens', 'KhususKelas12.tsx');
    assert.ok(khusus.includes('Isi kelas di Data Akun, ya.') && khusus.includes('label="Isi kelas di Data Akun"'));
    const gerbang = baca('components', 'screens', 'IsiKelasScreen.tsx');
    assert.ok(gerbang.includes('label="Buka Data Akun"'));
    assert.equal(gerbang.split('Nanti bisa diubah di Data Akun.').length - 1, 2);
    assert.equal(jenjangSaya.isiJenjangSaya(null).pengantar, 'Isi kelasmu di Data Akun supaya isi halaman ini pas buat kamu.');
    assert.ok(baca('lib', 'cekPosisi.ts').includes('tercatat di Data Akun'));
    assert.ok(baca('components', 'screens', 'CekPosisiScreen.tsx').includes('target prodi di Data Akun'));
  });

  // Semua berkas teks di folder-folder ini (tanpa node_modules).
  function berkasDi(akar, ekstensi) {
    const hasil = [];
    for (const nama of fs.readdirSync(akar, { withFileTypes: true })) {
      const p = path.join(akar, nama.name);
      if (nama.isDirectory()) {
        if (nama.name !== 'node_modules') hasil.push(...berkasDi(p, ekstensi));
      } else if (ekstensi.includes(path.extname(nama.name))) {
        hasil.push(p);
      }
    }
    return hasil;
  }

  test('Label lama tidak ada lagi di kode app, server, README, salinan teks, dan lembar review', () => {
    const berkas = [
      ...['app', 'components', 'lib', 'hooks', 'providers', 'api', 'theme'].flatMap((d) => berkasDi(path.join(AKAR_APP, d), ['.ts', '.tsx', '.json'])),
      ...['src', 'tools', 'config'].flatMap((d) => berkasDi(path.join(AKAR_APP, 'server', d), ['.js', '.json'])),
      path.join(AKAR_APP, 'README.md'),
      path.join(AKAR_APP, 'server', 'README.md'),
      path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'),
      path.join(AKAR_REPO, 'docs', 'lembar-review-draf-teks.md'),
    ];
    assert.ok(berkas.length > 50, `berkas yang diperiksa terlalu sedikit (${berkas.length})`);
    const pola = new RegExp(LABEL_LAMA.replace(/ /g, '\\s+'), 'i');
    const temuan = berkas.filter((p) => pola.test(fs.readFileSync(p, 'utf8'))).map((p) => path.relative(AKAR_REPO, p));
    assert.deepEqual(temuan, []);
  });

  test('Tidak ada lagi teks app yang menyebut halaman akun "Jalur Saya" (kecuali kebijakan privasi, menunggu review hukum)', () => {
    const berkas = ['app', 'components', 'lib', 'hooks', 'providers'].flatMap((d) => berkasDi(path.join(AKAR_APP, d), ['.ts', '.tsx']));
    const pola = /\b(di|Buka|Ubah|dari) Jalur Saya/;
    const temuan = berkas.filter((p) => pola.test(fs.readFileSync(p, 'utf8'))).map((p) => path.relative(AKAR_APP, p));
    assert.deepEqual(temuan, []);
  });
});

describe('LANJUT_074 §F: ucapan → teks', () => {
  const { cariPengenalSuara, teksDariHasil, gabungDraf, BAHASA_PENGENALAN } = suara;

  test('cariPengenalSuara: SpeechRecognition / webkitSpeechRecognition, atau null tanpa melempar', () => {
    function Standar() {}
    function Webkit() {}
    assert.equal(cariPengenalSuara({ SpeechRecognition: Standar }), Standar);
    assert.equal(cariPengenalSuara({ webkitSpeechRecognition: Webkit }), Webkit);
    assert.equal(cariPengenalSuara({ SpeechRecognition: Standar, webkitSpeechRecognition: Webkit }), Standar);
    for (const lingkungan of [{}, null, undefined, { SpeechRecognition: 'bukan fungsi' }, { webkitSpeechRecognition: {} }]) {
      assert.equal(cariPengenalSuara(lingkungan), null, JSON.stringify(lingkungan));
    }
    const melempar = Object.defineProperty({}, 'SpeechRecognition', {
      get() {
        throw new Error('diblokir');
      },
    });
    assert.equal(cariPengenalSuara(melempar), null);
    // Node (seperti Android/iOS) tidak punya pengenal suara.
    assert.equal(cariPengenalSuara(), null);
  });

  test('teksDariHasil: hanya hasil final, mulai dari resultIndex, dirapikan', () => {
    const hasil = (teks, isFinal = true) => Object.assign([{ transcript: teks }], { isFinal });
    assert.equal(teksDariHasil({ resultIndex: 0, results: [hasil(' aku mau kuliah ')] }), 'aku mau kuliah');
    assert.equal(teksDariHasil({ resultIndex: 0, results: [hasil('aku'), hasil('mau', false), hasil('kuliah')] }), 'aku kuliah');
    assert.equal(teksDariHasil({ resultIndex: 1, results: [hasil('lama'), hasil('baru')] }), 'baru');
    assert.equal(teksDariHasil({ results: [hasil('tanpa indeks')] }), 'tanpa indeks');
    for (const kosong of [null, undefined, {}, { results: [] }, { results: [hasil('   ')] }, { results: [[]] }]) {
      assert.equal(teksDariHasil(kosong), '', JSON.stringify(kosong));
    }
  });

  test('gabungDraf: menambah ke draf dengan satu spasi, tidak menimpa, dipotong ke batas pesan', () => {
    assert.equal(gabungDraf('', 'halo', 1000), 'halo');
    assert.equal(gabungDraf('aku', ' mau kuliah ', 1000), 'aku mau kuliah');
    assert.equal(gabungDraf('aku ', 'mau', 1000), 'aku mau');
    assert.equal(gabungDraf('aku', '   ', 1000), 'aku');
    assert.equal(gabungDraf('abc', 'defgh', 6), 'abc de');
    assert.equal(BAHASA_PENGENALAN, 'id-ID');
  });

  test('Layar: tombol hanya bila didukung (web), mikrofon hanya hidup setelah ditekan, teks masuk draf', () => {
    const ng = baca('components', 'screens', 'NgobrolScreen.tsx');
    const hook = fungsi(ng, 'useUcapan');
    assert.ok(hook.includes("Platform.OS === 'web' ? cariPengenalSuara() : null"));
    assert.ok(ng.includes('{ucapan.didukung ? ('), 'tombol hanya bila pengenal suara ada');
    assert.ok(ng.includes('onPress={ucapan.tekan}'));
    // start() hanya sekali di seluruh layar, di dalam mulai() yang dipanggil dari tekan().
    assert.equal(ng.split('.start()').length - 1, 1);
    const mulai = hook.slice(hook.indexOf('const mulai = () => {'), hook.indexOf('const batal = () => {'));
    assert.ok(mulai.includes('p.start();'));
    assert.ok(hook.slice(hook.indexOf('const tekan = () => {')).includes('return mulai();'));
    assert.ok(hook.includes('p.lang = BAHASA_PENGENALAN'));
    assert.ok(hook.includes('p.abort()'), 'berhenti saat layar ditutup / pesan dikirim');
    // Hasil hanya masuk draf; pengiriman tetap lewat tombol Kirim.
    assert.ok(ng.includes('useUcapan((t) => setDraf((d) => gabungDraf(d, t, PANJANG_PESAN_MAKS)))'));
    assert.ok(!hook.includes('kirimPesan'), 'ucapan tidak boleh terkirim otomatis');
    // Tidak ada pesan galat: galat hanya mengembalikan tombol ke keadaan awal.
    assert.ok(hook.includes('p.onerror = () => selesai(p);'));
  });

  test('Tanpa audio: app tidak merekam/mengunggah suara, server /ngobrol hanya menyimpan teks', () => {
    for (const berkas of [
      ['components', 'screens', 'NgobrolScreen.tsx'],
      ['lib', 'suara.ts'],
      ['providers', 'ObrolanProvider.tsx'],
    ]) {
      const isi = baca(...berkas);
      for (const pola of [/getUserMedia/, /MediaRecorder/, /AudioContext/, /new Blob/, /FormData/, /audio\//i]) {
        assert.ok(!pola.test(isi), `${berkas.join('/')} memuat ${pola}`);
      }
    }
    const penyedia = baca('providers', 'ObrolanProvider.tsx');
    assert.ok(penyedia.includes("body: { pesan: dikirim }"));
    assert.ok(penyedia.includes('.map((m) => ({ peran: m.dari, teks: m.teks }))'));
    // Medan lain (mis. audio) dibuang skema server sebelum sampai ke layanan.
    const hasil = kirimSkema.parse({ audio: 'xxx', pesan: [{ peran: 'pengguna', teks: 'halo', audio: 'yyy' }] });
    assert.deepEqual(hasil, { pesan: [{ peran: 'pengguna', teks: 'halo' }] });
  });

  test('Tanpa paket baru untuk suara', () => {
    const pkg = JSON.parse(baca('package.json'));
    const semua = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    for (const nama of semua) assert.ok(!/speech|voice|suara/i.test(nama), `paket ${nama}`);
  });
});

describe('LANJUT_074: salinan teks', () => {
  const sumber = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'), 'utf8');
  /** Semua blok yang kepalanya "**LANJUT_App (LANJUT_0xx)", sampai judul bagian berikutnya atau blok lain. */
  function blokTask(task) {
    const hasil = [];
    let awal = sumber.indexOf(`**LANJUT_App (${task})`);
    while (awal >= 0) {
      const sisa = sumber.slice(awal + 1);
      const akhir = sisa.search(/\n(?:### |\*\*LANJUT_App \()/);
      hasil.push(akhir < 0 ? sumber.slice(awal) : sumber.slice(awal, awal + 1 + akhir));
      awal = sumber.indexOf(`**LANJUT_App (${task})`, awal + 1);
    }
    return hasil;
  }

  test('Teks baru LANJUT_074 tercatat DRAF (Beranda & navigasi, dan tombol mikrofon Ngobrol)', () => {
    const blok = blokTask('LANJUT_074');
    assert.equal(blok.length, 2, 'dua blok: §4.1 (Beranda, tab, nama) dan §4.15 (mikrofon)');
    for (const b of blok) assert.match(b.slice(0, b.indexOf('\n\n')), /\bDRAF\b/);
    const semua = blok.join('\n');
    for (const teks of [
      '**Tab tengah — label:** Ngobrol',
      '**Nama fitur `/cek-posisi`:** Jalur Saya',
      '**Nama halaman akun `/akun`:** Data Akun',
      '**Data Akun — judul form ubah:** Ubah Data Akun',
      '**Ngobrol — tombol mikrofon (label pembaca layar):** Ucapkan pesan',
      '**Ngobrol — petunjuk di kotak pesan saat mendengarkan:** Mendengarkan…',
    ]) {
      assert.ok(semua.includes(teks), `blok LANJUT_074 belum memuat "${teks}"`);
    }
  });

  test('Teks lama yang menunjuk ke halaman akun ikut diganti "Data Akun"; "Sumber:" carousel tetap tercatat', () => {
    for (const baru of ['Isi kelas di Data Akun, ya.', 'Isi kelas di Data Akun · Buka Jenjang Saya', 'Buka Data Akun · Keluar', 'Nanti bisa diubah di Data Akun.', 'Isi kelasmu di Data Akun', '**Data Akun — baris:**', '**Data Akun, kartu Kemajuan:**']) {
      assert.ok(sumber.includes(baru), `salinan belum memuat "${baru}"`);
    }
    assert.ok(!/\b(di|Buka|Ubah) Jalur Saya\b|\*\*Jalur Saya[ ,:—]/.test(sumber), 'masih ada teks yang menyebut halaman akun "Jalur Saya"');
    const [blok073] = blokTask('LANJUT_073');
    assert.ok(blok073.includes('Sumber: [sumber]'));
  });
});
