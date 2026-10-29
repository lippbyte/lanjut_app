// tests/ngobrol-optimasi.test.js
// Optimasi chatbot Ngobrol (15 Okt 2026, lanjutan LANJUT_082; pilihan percakapan, belum disetujui PM).
// Tanpa jaringan dan tanpa basis data: penyedia AI tidak dipanggil di berkas ini.
// - panduan fitur per jenjang (config/panduan-fitur.json): hanya fitur yang ada untuk kelasnya,
//   nama tombol/layar cocok dengan app, fitur bersaklar mati tidak disebut
// - instruksi sistem memuat panduan jenjang itu dan tidak lagi memuat nama menu lama
// - balasan terpotong batas token dipangkas ke kalimat utuh terakhir
// - balasan uji coba saat AI mati memakai nama menu yang benar

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const panduan = require('../src/modul/ngobrol/panduan-fitur');
const layanan = require('../src/modul/ngobrol/ngobrol.layanan');
const penyedia = require('../src/modul/ngobrol/penyedia-ai');
const { TEKS } = require('../src/modul/ngobrol/keselamatan');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8');
const nama = (kelas) => panduan.fiturUntuk(kelas).map((f) => f.nama);
const NAMA_MENU_LAMA = /menu Jenjang\b|Checklist/;

/** Semua teks sumber app (.ts/.tsx) di app/, components/, lib/ — tempat label layar & tombol. */
function sumberApp() {
  let isi = '';
  const jalan = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) jalan(p);
      else if (/\.(ts|tsx)$/.test(e.name)) isi += fs.readFileSync(p, 'utf8');
    }
  };
  for (const d of ['app', 'components', 'lib']) jalan(path.join(AKAR_APP, d));
  return isi;
}

describe('Panduan fitur per jenjang', () => {
  test('Kelompok jenjang dari kelas akun', () => {
    for (const k of ['7', '8', '9']) assert.equal(panduan.kelompokKelas(k), 'smp');
    for (const k of ['10', '11']) assert.equal(panduan.kelompokKelas(k), 'kelas10_11');
    assert.equal(panduan.kelompokKelas('12'), 'kelas12');
    for (const k of [null, undefined, '', '13']) assert.equal(panduan.kelompokKelas(k), 'umum');
  });

  test('SMP: fitur SMP saja — tanpa Jalur Saya, Daftar Periksa, Pilih Mapel prodi, Info Penting, atau SNBP', () => {
    const n = nama('8');
    for (const ada of ['Jenjang Saya', 'Eksplorasi Kampus', 'Gaya Belajar', 'Mapel Saya', 'Arsip Belajar', 'Latihan', 'Level-In', 'Ngobrol Bareng LANJUT']) {
      assert.ok(n.includes(ada), `SMP tanpa ${ada}`);
    }
    for (const tidak of ['Jalur Saya', 'Daftar Periksa', 'Pilih Mapel', 'Info Penting']) assert.ok(!n.includes(tidak), `SMP mendapat ${tidak}`);
    const teks = panduan.bagianPanduan('8');
    assert.ok(!/SNBP|SNBT|TKA|Penolong Pilih Mapel|Jalur Saya/.test(teks), teks);
    assert.ok(teks.includes('Kenali Minatmu'));
  });

  test('Kelas 10–11: Pilih Mapel (Mapel Saya + Penolong) dan Daftar Periksa; tanpa Jalur Saya dan Info Penting', () => {
    for (const k of ['10', '11']) {
      const n = nama(k);
      for (const ada of ['Pilih Mapel', 'Eksplorasi Kampus', 'Daftar Periksa', 'Gaya Belajar', 'Jenjang Saya']) assert.ok(n.includes(ada), `${k} tanpa ${ada}`);
      for (const tidak of ['Jalur Saya', 'Info Penting', 'Mapel Saya']) assert.ok(!n.includes(tidak), `${k} mendapat ${tidak}`);
      assert.ok(panduan.bagianPanduan(k).includes('Jalur dan Bidangmu'));
    }
  });

  test('Kelas 12: Jalur Saya, Daftar Periksa, Pilih Mapel, Eksplorasi Kampus, Info Penting', () => {
    const n = nama('12');
    for (const ada of ['Jalur Saya', 'Daftar Periksa', 'Pilih Mapel', 'Eksplorasi Kampus', 'Info Penting', 'Arsip Belajar', 'Latihan', 'Level-In']) {
      assert.ok(n.includes(ada), `kelas 12 tanpa ${ada}`);
    }
    assert.ok(!n.includes('Mapel Saya'));
  });

  test('Akun tanpa kelas: hanya fitur umum', () => {
    assert.deepEqual(nama(null), ['Ngobrol Bareng LANJUT', 'Arsip Belajar', 'Latihan', 'Level-In', 'Data Akun', 'Cerita Alumni']);
  });

  test('Nama fitur, layar, dan tombol di panduan benar-benar ada di app (tidak mengarang menu)', () => {
    const app = sumberApp();
    const data = panduan.muat();
    const kutip = new Set();
    for (const f of data.fitur) {
      assert.ok(app.includes(f.nama), `nama fitur tidak ada di app: ${f.nama}`);
      for (const m of `${f.letak} ${f.guna}`.matchAll(/"([^"]+)"/g)) kutip.add(m[1]);
    }
    assert.ok(kutip.size >= 10, `label tombol/layar terkutip: ${kutip.size}`);
    for (const k of kutip) assert.ok(app.includes(k), `label "${k}" tidak ada di app`);
  });

  test('Fitur bersaklar mati atau yang tidak dipakai uji rilis tidak disebut; tanpa nama menu lama', () => {
    const semua = ['8', '11', '12', null].map((k) => panduan.bagianPanduan(k)).join('\n');
    assert.ok(!/Persiapan Event|mikrofon|pencarian web/i.test(semua));
    assert.ok(!NAMA_MENU_LAMA.test(semua));
  });

  test('Berkas panduan rusak ditolak saat dimuat (server gagal menyala, tidak diam-diam)', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'panduan-'));
    const tulis = (isi) => {
      const p = path.join(tmp, `p${Math.random().toString(36).slice(2)}.json`);
      fs.writeFileSync(p, JSON.stringify(isi));
      return p;
    };
    const dasar = panduan.muat();
    assert.throws(() => panduan.muat(tulis({ ...dasar, fitur: [{ ...dasar.fitur[0], untuk: ['kelas13'] }] })), /untuk/);
    assert.throws(() => panduan.muat(tulis({ ...dasar, fitur: [{ ...dasar.fitur[0], guna: '' }] })), /guna/);
    assert.throws(() => panduan.muat(tulis({ ...dasar, jenjang: { ...dasar.jenjang, smp: '' } })), /jenjang/);
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});

describe('Instruksi sistem', () => {
  test('Memuat PANDUAN FITUR jenjang siswa; SMP tidak pernah mendapat Jalur Saya', () => {
    const smp = layanan.pesanSistem({ kelas: '8', jenis_sekolah: 'SMP' }, null);
    assert.ok(smp.includes('PANDUAN FITUR LANJUT untuk siswa ini (SMP'));
    assert.ok(smp.includes(panduan.bagianPanduan('8')));
    assert.ok(!smp.includes('Jalur Saya'), 'SMP tidak boleh diarahkan ke Jalur Saya');
    const k12 = layanan.pesanSistem({ kelas: '12', jenis_sekolah: 'SMA' }, null);
    assert.ok(k12.includes(panduan.bagianPanduan('12')));
    assert.ok(k12.includes('Jalur Saya'));
  });

  test('Aturan memandu fitur: hanya fitur di panduan, nama persis, tanpa nama menu lama', () => {
    const s = layanan.pesanSistem({ kelas: '11' }, null);
    assert.ok(s.includes('Hanya sebut fitur, tab, menu, dan tombol yang ada di PANDUAN FITUR LANJUT'));
    assert.ok(s.includes('Jangan mengarang fitur, nama menu, atau tombol lain'));
    assert.ok(!NAMA_MENU_LAMA.test(s), 'nama menu lama "menu Jenjang"/"Checklist" masih ada');
    // Arsip Belajar hanya disebut untuk pertanyaan materi (bukan di setiap jawaban).
    assert.ok(s.includes('HANYA kalau pertanyaan siswa memang tentang isi materi pelajaran'));
    // Aturan keselamatan & kalimat tetap tidak berubah.
    assert.ok(s.includes(TEKS.tolak_luar_topik) && s.includes(TEKS.tolak_abaikan_aturan));
  });
});

describe('Balasan terpotong batas token', () => {
  test('Dipangkas ke kalimat utuh terakhir; tanpa akhir kalimat yang wajar → potong di spasi + "…"', () => {
    assert.equal(layanan.rapikanTerpotong('Kalimat satu selesai. Kalimat dua juga. Sekolah fav'), 'Kalimat satu selesai. Kalimat dua juga.');
    assert.equal(layanan.rapikanTerpotong('Pertama?\n- butir satu\n- butir du'), 'Pertama?\n- butir satu');
    assert.equal(layanan.rapikanTerpotong('Nggak ada kampus yang paling gampang, karena tiap prodi pun jalur'), 'Nggak ada kampus yang paling gampang, karena tiap prodi pun…');
    assert.equal(layanan.rapikanTerpotong('Satu. Dua.'), 'Satu. Dua.');
  });

  test('balas() memangkas hanya bila penyedia menandai terpotong', () => {
    const src = baca('server', 'src', 'modul', 'ngobrol', 'ngobrol.layanan.js');
    assert.ok(src.includes('({ teks, token, terpotong } = await penyedia.mintaBalasan(pesan, cfg.penyedia));'));
    assert.ok(src.includes('if (terpotong) teks = rapikanTerpotong(teks);'));
  });

  test('Permintaan ke penyedia: ruang token cukup untuk penalaran + jawaban, penalaran secukupnya', () => {
    assert.ok(penyedia.TOKEN_BALASAN_MAKS >= 1500, `${penyedia.TOKEN_BALASAN_MAKS}`);
    assert.deepEqual(penyedia.PENALARAN, { effort: 'low' });
    assert.ok(Object.isFrozen(penyedia.PENALARAN));
  });
});

describe('Balasan uji coba saat AI dimatikan', () => {
  test('Memakai nama menu yang benar (Jenjang Saya, Arsip Belajar), bukan "menu Jenjang, Checklist"', () => {
    assert.ok(!NAMA_MENU_LAMA.test(TEKS.stub_uji_coba), TEKS.stub_uji_coba);
    assert.ok(TEKS.stub_uji_coba.includes('tab Jenjang Saya') && TEKS.stub_uji_coba.includes('Arsip Belajar'));
  });
});
