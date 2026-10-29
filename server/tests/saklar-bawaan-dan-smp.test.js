// tests/saklar-bawaan-dan-smp.test.js
// Pengujian otomatis LANJUT_077b:
// - §A saklar: bawaan ai_aktif (dan event_sekolah_aktif) = '0' di migrasi DAN di basis
//   data uji; setiap berkas tes yang mengubah saklar itu memakai kunci tes dan
//   memulihkan nilai awalnya di blok finally
// - §B halaman yang bisa dibuka dari Data Akun SMP tidak memuat placeholder kelas 12
//   (pintu Jalur Saya /cek-posisi disembunyikan untuk kelas 7–9; kelas 10–12 tetap)
// - §C teks Level-In tanpa angka ambang tetap; angka di layar Latihan hanya ukuran sesi
// Tes ini hanya MEMBACA basis data (di bawah kunciKonfigurasiGlobal, supaya tidak
// membaca nilai sementara milik tes AI/event yang sedang berjalan).

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { kunciKonfigurasiGlobal, pool } = require('./bantuan');
const { muatModulApp } = require('./muat-ts-app');
const { DIR_MIGRASI } = require('../src/db/jalankan-migrasi');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const tanpaKomentar = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const jenjangSaya = muatModulApp('lib/jenjangSaya');
const levelin = muatModulApp('lib/levelin');
const latihan = muatModulApp('lib/latihan');

const SAKLAR = ['ai_aktif', 'event_sekolah_aktif'];
const TERLARANG = ['Bagian ini untuk kelas 12', 'Versi untuk kelas'];

let lepasKunci;
before(async () => {
  lepasKunci = await kunciKonfigurasiGlobal();
});
after(async () => {
  try {
    await lepasKunci?.();
  } finally {
    await pool.end();
  }
});

describe('LANJUT_077b §A: saklar AI bawaan 0', () => {
  test("Bawaan '0' di berkas migrasi: ai_aktif (015) dan event_sekolah_aktif (020); tidak ditimpa saat migrasi diulang", () => {
    const m015 = fs.readFileSync(path.join(DIR_MIGRASI, '015_ai_pengaturan.sql'), 'utf8');
    const m020 = fs.readFileSync(path.join(DIR_MIGRASI, '020_event_sekolah.sql'), 'utf8');
    assert.match(m015, /\(\s*'ai_aktif',\s*'0',/);
    assert.match(m020, /\(\s*'event_sekolah_aktif',\s*'0',/);
    for (const isi of [m015, m020]) assert.match(isi, /ON DUPLICATE KEY UPDATE kunci = kunci;/);
  });

  test("Nilai di basis data uji: ai_aktif = '0' dan event_sekolah_aktif = '0' (dikunci; menyalakan = keputusan PM)", async () => {
    const [baris] = await pool.query('SELECT kunci, nilai FROM konfigurasi_levelin WHERE kunci IN (?)', [SAKLAR]);
    assert.deepEqual(
      Object.fromEntries(baris.map((b) => [b.kunci, b.nilai])),
      { ai_aktif: '0', event_sekolah_aktif: '0' },
      'saklar menyala di basis data uji — kembalikan ke 0 (LANJUT_077b) atau tunggu izin PM'
    );
  });

  test('Saklar AI gagal-tertutup: hanya nilai "1" yang menyalakan AI', () => {
    const layanan = fs.readFileSync(path.join(__dirname, '..', 'src', 'modul', 'ngobrol', 'ngobrol.layanan.js'), 'utf8');
    assert.ok(layanan.includes("aiAktif: String(nilai.ai_aktif ?? '').trim() === '1',"));
  });

  test('Setiap berkas tes yang mengubah saklar memakai kunci tes dan memulihkan nilai awal di blok finally', () => {
    const dir = __dirname;
    const pengubah = fs
      .readdirSync(dir)
      .filter((n) => n.endsWith('.test.js') && path.join(dir, n) !== __filename)
      .filter((n) => {
        const isi = fs.readFileSync(path.join(dir, n), 'utf8');
        return /UPDATE konfigurasi_levelin/.test(isi) && SAKLAR.some((k) => isi.includes(`'${k}'`) || isi.includes(`${k}:`));
      })
      .sort();
    // Daftar ini dicek tangan di LANJUT_077b. Berkas baru yang mengubah saklar harus ditambahkan di sini.
    // LANJUT_078: + ngobrol-penghubung.test.js (menyalakan saklar hanya lewat denganSaklar, try/finally).
    assert.deepEqual(pengubah, ['event-sekolah-smp.test.js', 'event-sekolah.test.js', 'ngobrol-materi.test.js', 'ngobrol-penghubung.test.js', 'ngobrol.test.js', 'skenario-ai.test.js']);
    for (const n of pengubah) {
      const isi = fs.readFileSync(path.join(dir, n), 'utf8').replace(/\r\n/g, '\n');
      assert.ok(isi.includes('await kunciKonfigurasiGlobal()'), `${n}: tanpa kunci tes`);
      const blokAfter = isi.slice(isi.indexOf('\nafter(async () => {'));
      const akhir = blokAfter.indexOf('\n});\n');
      const tubuh = blokAfter.slice(0, akhir);
      const finallyDi = tubuh.indexOf('} finally {');
      assert.ok(finallyDi > 0, `${n}: after() tanpa blok finally`);
      const isiFinally = tubuh.slice(finallyDi);
      assert.match(isiFinally, /kembalikanKonfig\(konfigAsli\)|aturSaklar\(saklarSemula\)/, `${n}: nilai awal tidak dipulihkan di finally`);
      // Perubahan saklar di dalam tes: setiap pemanggilan diikuti blok finally sebelum tes berikutnya.
      const baris = isi.split('\n');
      baris.forEach((b, i) => {
        if (!/^\s{4,}await (aturKonfig\('ai_aktif'|aturSaklar\()/.test(b)) return;
        if (/\} finally \{/.test(baris[i - 1] || '')) return; // pemulihan itu sendiri

        const sisa = baris.slice(i + 1).join('\n');
        const finallyBerikut = sisa.search(/\} finally \{/);
        const tesBerikut = sisa.search(/\n\s*test\(/);
        assert.ok(finallyBerikut >= 0 && (tesBerikut < 0 || finallyBerikut < tesBerikut), `${n}:${i + 1} perubahan saklar tanpa finally`);
      });
    }
  });
});

describe('LANJUT_077b §B: halaman yang bisa dibuka dari Data Akun SMP', () => {
  const layarAkun = baca('components', 'screens', 'AkunScreen.tsx');

  /** Rute yang bisa dibuka dari Data Akun untuk kelas `k` (pintu Jalur Saya hanya bila tampilPintuJalurSaya). */
  function ruteDariDataAkun(k) {
    const semua = [...new Set([...tanpaKomentar(layarAkun).matchAll(/router\.(?:push|replace)\('([^']+)'\)/g)].map((m) => m[1]))];
    return semua.filter((r) => r !== '/cek-posisi' || jenjangSaya.tampilPintuJalurSaya(k));
  }

  /** Berkas layar yang dirender sebuah rute (app/(app)/x.tsx atau app/x.tsx + layar yang diimpornya). */
  function kodeLayar(rute) {
    const nama = rute.slice(1);
    const kandidat = [path.join('app', '(app)', `${nama}.tsx`), path.join('app', `${nama}.tsx`)].find((p) => fs.existsSync(path.join(AKAR_APP, p)));
    assert.ok(kandidat, `berkas rute ${rute} tidak ditemukan`);
    const isiRute = baca(kandidat);
    const impor = [...isiRute.matchAll(/from '\.\.\/(?:\.\.\/)?components\/screens\/([^']+)'/g)].map((m) => baca('components', 'screens', `${m[1]}.tsx`));
    return [isiRute, ...impor].join('\n');
  }

  test('Pintu Jalur Saya tidak tampil untuk kelas 7–9; tampil untuk kelas 10–12 dan akun tanpa kelas (tidak berubah)', () => {
    for (const k of ['7', '8', '9']) assert.equal(jenjangSaya.tampilPintuJalurSaya(k), false, `kelas ${k}`);
    for (const k of ['10', '11', '12', null, undefined]) assert.equal(jenjangSaya.tampilPintuJalurSaya(k), true, `kelas ${k}`);
    // Pintu dirender hanya lewat fungsi itu, isinya sama seperti sebelumnya.
    assert.ok(layarAkun.includes("{tampilPintuJalurSaya(pengguna.kelas) ? (\n        <KartuPintu\n          ikon=\"posisi\"\n          judul=\"Jalur Saya\""));
    assert.ok(layarAkun.includes('keterangan="Tahap kamu sekarang, dihitung dari jalur dan kemajuanmu."'));
    assert.equal((layarAkun.match(/router\.push\('\/cek-posisi'\)/g) || []).length, 1);
  });

  test('Kelas 7–9: tidak ada halaman dari Data Akun yang memuat "Bagian ini untuk kelas 12" atau "Versi untuk kelas 7"', () => {
    // Kalimat itu hanya ada (di luar komentar) di placeholder BukanKelas12.
    for (const dir of ['app', 'components', 'lib']) {
      const berkas = fs.readdirSync(path.join(AKAR_APP, dir), { recursive: true }).filter((n) => /\.(tsx?|json)$/.test(n));
      for (const b of berkas) {
        const isi = b.endsWith('.json') ? baca(dir, b) : tanpaKomentar(baca(dir, b));
        if (TERLARANG.some((t) => isi.includes(t))) assert.equal(path.join(dir, b), path.join('components', 'screens', 'KhususKelas12.tsx'));
      }
    }
    for (const k of ['7', '8', '9']) {
      const rute = ruteDariDataAkun(k);
      assert.ok(!rute.includes('/cek-posisi'), `kelas ${k} masih bisa membuka /cek-posisi`);
      assert.ok(rute.includes('/daftar-periksa') && rute.includes('/kebijakan-privasi'), JSON.stringify(rute));
      for (const r of rute) {
        const kode = tanpaKomentar(kodeLayar(r));
        if (r === '/daftar-periksa') {
          // Daftar Periksa merender placeholder hanya bila tidak ada kalimat netral (LANJUT_076b).
          assert.ok(kode.includes('{teksNetral ? <Text style={gaya.teksBody}>{teksNetral}</Text> : <BukanKelas12 />}'));
          assert.ok(jenjangSaya.teksDaftarPeriksaBukanKelas12(k), `kelas ${k}: Daftar Periksa memakai placeholder kelas 12`);
          continue;
        }
        assert.ok(!/BukanKelas12|<KhususKelas12/.test(kode), `kelas ${k}: ${r} merender placeholder kelas 12`);
        for (const t of TERLARANG) assert.ok(!kode.includes(t), `kelas ${k}: ${r} memuat "${t}"`);
      }
    }
    // Kelas 10–11 tidak berubah: pintu tetap ada, dan /cek-posisi tetap placeholder (menunggu konten).
    for (const k of ['10', '11']) assert.ok(ruteDariDataAkun(k).includes('/cek-posisi'));
    assert.ok(kodeLayar('/cek-posisi').includes('<BukanKelas12 />'));
  });
});

describe('LANJUT_077b §C: teks Level-In dan Latihan tanpa angka ambang tetap', () => {
  test('Teks Level-In tanpa angka tetap; "Mulai dari 5 kartu saja." sudah tidak ada di kode app', () => {
    assert.equal(levelin.TEKS_LEVELIN.kosongIsi, 'Level-In muncul setelah kamu menjawab kartu di Latihan. Mulai dari sedikit kartu dulu saja.');
    for (const [kunci, nilai] of Object.entries(levelin.TEKS_LEVELIN)) {
      if (typeof nilai === 'string') assert.ok(!/\d/.test(nilai), `TEKS_LEVELIN.${kunci} memuat angka: ${nilai}`);
    }
    for (const dir of ['app', 'components', 'lib']) {
      for (const b of fs.readdirSync(path.join(AKAR_APP, dir), { recursive: true }).filter((n) => /\.tsx?$/.test(n))) {
        assert.ok(!tanpaKomentar(baca(dir, b)).includes('Mulai dari 5 kartu'), `${dir}/${b}`);
      }
    }
  });

  test('Layar Latihan & Level-In: angka di teks hanya ukuran/durasi sesi (§4.7, disetujui), bukan ambang Level-In', () => {
    const teksBerangka = (kode) => {
      const k = tanpaKomentar(kode).replace(/const s = StyleSheet\.create\([\s\S]*$/, '');
      const prop = [...k.matchAll(/\b(?:label|teks|judul|pengantar|placeholder)="([^"]*\d[^"]*)"/g)].map((m) => m[1]);
      const jsx = [...k.matchAll(/>([^<>{}]*\d[^<>{}]*)</g)].map((m) => m[1].trim()).filter(Boolean);
      return [...prop, ...jsx];
    };
    const IZIN = new Set(['15 menit cukup.', 'Lagi padat? Ambil 5 kartu saja. Lebih baik sedikit daripada tidak sama sekali.', 'Ambil 5 kartu']);
    for (const berkas of ['LatihanScreen.tsx', 'LatihanRiwayatScreen.tsx', 'LevelInScreen.tsx']) {
      for (const t of teksBerangka(baca('components', 'screens', berkas))) assert.ok(IZIN.has(t), `${berkas}: angka tetap di teks "${t}"`);
    }
    // "5" di teks itu = jumlah kartu sesi singkat (BATAS_SINGKAT), bukan ambang konfigurasi_levelin.
    assert.equal(latihan.BATAS_SINGKAT, 5);
    // Ambang Level-In di layar selalu dari /konfigurasi/levelin (angkaKonfig), tidak ditulis.
    const layarLevelIn = baca('components', 'screens', 'LevelInScreen.tsx');
    for (const kunci of ['level_minimum_kartu', 'minimum_kartu', 'level_batas_bawah', 'level_batas_atas']) {
      assert.ok(layarLevelIn.includes(`angkaKonfig(konfig.data, '${kunci}')`), kunci);
    }
  });
});
