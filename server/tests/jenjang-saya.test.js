// tests/jenjang-saya.test.js
// Pengujian otomatis LANJUT_069 — isi layar Jenjang Saya per kelas akun.
// Menjalankan lib/jenjangSaya.ts milik app langsung (muat-ts-app.js), bukan
// cermin, jadi yang diuji adalah isi yang tampil di app:
// - kelas 7–9 melihat set SMP (A1–A5), kelas 10–11 set B1–B6
// - tidak ada kartu kosong
// - setiap teks sama persis dengan blok LANJUT_069 di salinan-teks-lanjut.md
// - kelas 12 dan akun tanpa kelas tidak berubah
// - Daftar Periksa kelas 10–11 memakai kalimat netral (Tambahan-069 no. 2)
// - lintas akun: akun kelas 7 tidak melihat kartu kelas 12

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const { muatModulApp } = require('./muat-ts-app');

const { isiJenjangSaya, teksDaftarPeriksaBukanKelas12 } = muatModulApp('lib/jenjangSaya');

const ID_SMP = ['eksplorasi-tujuan', 'gaya-belajar', 'ngobrol'];
const ID_10_11 = ['pilih-mapel', 'eksplorasi-tujuan', 'arsip', 'level-in', 'daftar-periksa'];
const ID_KELAS_12 = ['cek-posisi', 'daftar-periksa'];

// Blok LANJUT_069 di §4.2: dari paragraf kepala ber-DRAF sampai judul berikutnya.
function blokSalinan069() {
  const sumber = fs.readFileSync(path.join(__dirname, '..', '..', '..', 'docs', 'salinan-teks-lanjut.md'), 'utf8');
  const awal = sumber.indexOf('**LANJUT_App (LANJUT_069)');
  assert.ok(awal >= 0, 'blok LANJUT_069 harus ada di salinan-teks-lanjut.md');
  const kepala = sumber.slice(awal, sumber.indexOf('\n\n', awal));
  assert.match(kepala, /\bDRAF\b/, 'blok LANJUT_069 harus berstatus DRAF');
  const akhir = sumber.indexOf('\n### ', awal);
  return sumber.slice(awal, akhir === -1 ? undefined : akhir);
}

// Semua teks yang tampil dari satu isi Jenjang Saya, dalam bentuk yang dicatat di salinan.
function teksTampil(isi) {
  const t = [];
  if (isi.pembuka) {
    t.push(`"${isi.pembuka.judul}"`, `"${isi.pembuka.teks}"`, `tombol "${isi.pembuka.labelTombol}" (ke \`${isi.pembuka.href}\`)`);
  }
  for (const p of isi.pintu) t.push(`judul "${p.judul}" · teks "${p.keterangan}"`);
  if (isi.catatan) {
    t.push(`judul "${isi.catatan.judul}"`, `"${isi.catatan.isi}"`);
    for (const b of isi.catatan.butir) t.push(`"${b.nama} ${b.keterangan}"`);
    if (isi.catatan.catatanCek) t.push(`catatan "${isi.catatan.catatanCek}"`);
  }
  return t;
}

describe('LANJUT_069 §A: set kartu per kelas', () => {
  test('Kelas 7, 8, 9 melihat set SMP: pembuka A1, pintu A2/A3/A5, kartu catatan A4', () => {
    for (const kelas of ['7', '8', '9']) {
      const isi = isiJenjangSaya(kelas);
      assert.equal(isi.kelompok, 'smp');
      assert.equal(isi.pembuka.judul, 'Kamu lagi di tahap mana?');
      assert.equal(isi.pembuka.labelTombol, 'Mulai eksplorasi');
      assert.deepEqual(isi.pintu.map((p) => p.id), ID_SMP);
      assert.equal(isi.catatan.judul, 'SMA, SMK, atau MA?');
      assert.deepEqual(isi.catatan.butir.map((b) => b.nama), ['SMA', 'SMK', 'MA']);
      assert.equal(isi.catatan.catatanCek, 'Keterangan ini sedang kami cek ulang.');
      // Ngobrol tetap lewat layar /ngobrol, tempat gerbang persetujuan orang tua/wali.
      assert.equal(isi.pintu.find((p) => p.id === 'ngobrol').href, '/ngobrol');
    }
  });

  test('Kelas 10 dan 11 melihat set B1–B6, tanpa Gaya Belajar dan tanpa kartu catatan', () => {
    for (const kelas of ['10', '11']) {
      const isi = isiJenjangSaya(kelas);
      assert.equal(isi.kelompok, 'kelas10_11');
      assert.equal(isi.pembuka.judul, 'Yuk, siapkan langkahmu');
      assert.equal(isi.pembuka.labelTombol, 'Pilih mapel');
      assert.equal(isi.pembuka.href, '/pilih-mapel');
      assert.deepEqual(isi.pintu.map((p) => p.id), ID_10_11);
      assert.ok(!isi.pintu.some((p) => p.id === 'gaya-belajar'), 'Gaya Belajar dihapus untuk kelas 10–11');
      assert.equal(isi.catatan, null, 'kartu "Belum perlu mikirin jadwal daftar" dihapus');
    }
  });

  test('Tidak ada kartu kosong di kelas mana pun', () => {
    const terisi = (s) => typeof s === 'string' && s.trim().length > 0;
    for (const kelas of ['7', '8', '9', '10', '11', '12', null, undefined]) {
      const isi = isiJenjangSaya(kelas);
      assert.ok(terisi(isi.pengantar), `pengantar kelas ${kelas}`);
      assert.ok(isi.pintu.length > 0, `pintu kelas ${kelas}`);
      for (const p of isi.pintu) {
        for (const medan of ['id', 'judul', 'keterangan', 'href']) assert.ok(terisi(p[medan]), `pintu ${p.id}.${medan} kelas ${kelas}`);
      }
      if (isi.pembuka) {
        for (const medan of ['judul', 'teks', 'labelTombol', 'href']) assert.ok(terisi(isi.pembuka[medan]), `pembuka.${medan} kelas ${kelas}`);
      }
      if (isi.catatan) {
        assert.ok(terisi(isi.catatan.judul) && terisi(isi.catatan.isi), `catatan kelas ${kelas}`);
        for (const b of isi.catatan.butir) assert.ok(terisi(b.nama) && terisi(b.keterangan));
      }
    }
  });

  // LANJUT_074 hanya mengganti dua nama: pintu /cek-posisi → "Jalur Saya", dan
  // halaman akun di pengantar tanpa kelas → "Data Akun". Teks lain tetap LANJUT_037.
  test('Kelas 12 dan akun tanpa kelas tidak berubah (teks LANJUT_037, nama LANJUT_074)', () => {
    const k12 = isiJenjangSaya('12');
    assert.equal(k12.pengantar, 'Kelas 12: yang perlu kamu siapkan sebelum daftar kuliah.');
    assert.equal(k12.pembuka, null);
    assert.equal(k12.catatan, null);
    assert.deepEqual(
      k12.pintu.map((p) => [p.judul, p.keterangan, p.href]),
      [
        ['Jalur Saya', 'Lihat kamu lagi di tahap mana dan langkah berikutnya.', '/cek-posisi'],
        ['Daftar Periksa', 'Satu per satu, tidak perlu sekaligus.', '/daftar-periksa'],
      ]
    );

    const tanpa = isiJenjangSaya(null);
    assert.equal(tanpa.kelompok, null);
    assert.equal(tanpa.pengantar, 'Isi kelasmu di Data Akun supaya isi halaman ini pas buat kamu.');
    assert.equal(tanpa.pembuka, null);
    assert.equal(tanpa.catatan, null);
    assert.deepEqual(
      tanpa.pintu.map((p) => [p.judul, p.keterangan]),
      [
        ['Pilih Mapel', 'Lihat mapel yang mendukung jurusan incaranmu, dan mana yang ada di sekolahmu.'],
        ['Eksplorasi Tujuan', 'Intip prodi kuliah: belajar apa dan lulusannya kerja di mana.'],
        ['Ngobrol Bareng LANJUT', 'Cerita soal yang kamu suka, nanti dibantu cari arahnya.'],
      ]
    );
  });
});

describe('LANJUT_071 §A: tombol "Mulai eksplorasi" SMP ke Gaya Belajar', () => {
  test('Kelas 7–9 yang menekan "Mulai eksplorasi" dibawa ke Gaya Belajar, bukan Eksplorasi Tujuan', () => {
    for (const kelas of ['7', '8', '9']) {
      const { pembuka } = isiJenjangSaya(kelas);
      assert.equal(pembuka.labelTombol, 'Mulai eksplorasi', 'bunyi tombol tidak berubah');
      assert.equal(pembuka.href, '/gaya-belajar');
      assert.notEqual(pembuka.href, '/eksplorasi-tujuan');
    }
  });

  test('Eksplorasi Tujuan tetap bisa dibuka dari pintu A2 (SMP) dan pintu kelas 10–11', () => {
    for (const kelas of ['7', '10']) {
      const pintu = isiJenjangSaya(kelas).pintu.find((p) => p.id === 'eksplorasi-tujuan');
      assert.ok(pintu, `pintu Eksplorasi Tujuan harus ada untuk kelas ${kelas}`);
      assert.equal(pintu.href, '/eksplorasi-tujuan');
    }
  });

  test('Kartu pembuka kelas 10–11 tidak ikut berubah', () => {
    assert.equal(isiJenjangSaya('10').pembuka.href, '/pilih-mapel');
  });
});

describe('LANJUT_069 §B: teks sama persis dengan salinan-teks-lanjut.md (DRAF)', () => {
  test('Setiap teks SMP dan kelas 10–11 ada persis di blok LANJUT_069', () => {
    const blok = blokSalinan069();
    for (const kelas of ['7', '10']) {
      for (const t of teksTampil(isiJenjangSaya(kelas))) {
        assert.ok(blok.includes(t), `tidak ada persis di salinan (kelas ${kelas}): ${t}`);
      }
    }
  });

  test('Kalimat netral Daftar Periksa kelas 10–11 ada persis di blok LANJUT_069', () => {
    const blok = blokSalinan069();
    const t = teksDaftarPeriksaBukanKelas12('10');
    assert.ok(blok.includes(`"Bagian ini untuk kelas 12":** "${t}"`), t);
  });
});

describe('LANJUT_069 §B: Daftar Periksa kelas 10–11 tanpa pesan "khusus kelas 12"', () => {
  // LANJUT_076b (keputusan PM no. 2): SMP juga mendapat kalimat netral, bukan
  // placeholder "Bagian ini untuk kelas 12" (sebelumnya kelas 7–9 → null).
  test('Kelas 7–11 mendapat kalimat netral; kelas 12 dan akun tanpa kelas tidak', () => {
    for (const kelas of ['7', '8', '9', '10', '11']) {
      assert.equal(teksDaftarPeriksaBukanKelas12(kelas), 'Catat langkah-langkahmu supaya tidak ada yang terlewat.', `kelas ${kelas}`);
    }
    for (const kelas of ['12', null, undefined]) {
      assert.equal(teksDaftarPeriksaBukanKelas12(kelas), null, `kelas ${kelas}`);
    }
  });
});

describe('LANJUT_069 §C: lintas akun', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await nyalakanServer();
    baseUrl = urlDari(server);
  });

  after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  });

  async function kelasDariToken(token) {
    const res = await fetch(`${baseUrl}/api/v1/auth/saya`, { headers: { Authorization: `Bearer ${token}` } });
    assert.equal(res.status, 200);
    return (await res.json()).data.kelas;
  }

  async function akunBaru(kelas, jenis) {
    const { status, json } = await daftarPenggunaBaru(baseUrl, { kelas, ...(jenis ? { jenis_sekolah: jenis } : {}) });
    assert.equal(status, 201, JSON.stringify(json));
    return json.data.token;
  }

  test('Akun kelas 7 tidak melihat kartu kelas 12; isi tiap akun mengikuti kelas akunnya sendiri', async () => {
    const tokenA = await akunBaru('7');
    const isiA = isiJenjangSaya(await kelasDariToken(tokenA));
    assert.equal(isiA.kelompok, 'smp');

    const tokenB = await akunBaru('12', 'SMA');
    const tokenC = await akunBaru('10', 'SMA');
    const isiB = isiJenjangSaya(await kelasDariToken(tokenB));
    const isiC = isiJenjangSaya(await kelasDariToken(tokenC));
    assert.deepEqual(isiB.pintu.map((p) => p.id), ID_KELAS_12);
    assert.deepEqual(isiC.pintu.map((p) => p.id), ID_10_11);

    // Dibaca ulang sesudah akun lain dibuat: A tetap SMP, tanpa kartu kelas 12.
    const isiASetelah = isiJenjangSaya(await kelasDariToken(tokenA));
    assert.deepEqual(isiASetelah, isiA);
    const idA = isiASetelah.pintu.map((p) => p.id);
    for (const id of ['cek-posisi', 'daftar-periksa']) assert.ok(!idA.includes(id), `akun kelas 7 tidak boleh melihat pintu ${id}`);
    for (const t of teksTampil(isiB)) assert.ok(!teksTampil(isiASetelah).includes(t), `teks kelas 12 bocor ke kelas 7: ${t}`);
    // LANJUT_076b: SMP mendapat kalimat netral yang sama dengan 10–11 (bukan teks kelas 12).
    assert.equal(teksDaftarPeriksaBukanKelas12(await kelasDariToken(tokenA)), teksDaftarPeriksaBukanKelas12('10'));
  });
});
