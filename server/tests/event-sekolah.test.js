// tests/event-sekolah.test.js
// Pengujian otomatis LANJUT_076 — Daftar Periksa dua mode:
// - migrasi 020_event_sekolah (tabel, indeks, FK, saklar bawaan '0', idempoten)
// - /pengguna/event: urutan cek saklar (403 FITUR_BELUM_AKTIF) → kebijakan
//   (403 AI_BELUM_DIIZINKAN) → isi; CRUD milik sendiri, lintas akun 404,
//   kartu_id lintas akun 400 KARTU_TIDAK_SAH, hapus permanen, log tanpa isi event
// - kelas 12 tidak berubah (data Daftar Periksa & bagian layar kelas 12)
// - pengingat Beranda (lib/eventSekolah.ts, lib/beranda.ts, dijalankan langsung)
// Saklar event_sekolah_aktif diubah SEMENTARA di basis data uji dan dikembalikan
// ke nilai semula di after(); kunciKonfigurasiGlobal menjaga tes lain tidak ikut
// melihat perubahan itu (dan menahan versi kebijakan selama tes ini).

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { nyalakanServer, urlDari, daftarPenggunaBaru, kunciKonfigurasiGlobal, pool } = require('./bantuan');
const { muatModulApp } = require('./muat-ts-app');
const { pernyataanMigrasi, DIR_MIGRASI } = require('../src/db/jalankan-migrasi');
const { ambilKonfigurasi } = require('../src/modul/persetujuan/persetujuan.layanan');
const { hariIniWib } = require('../src/util/linimasa');

const AKAR_APP = path.join(__dirname, '..', '..');
const AKAR_REPO = path.join(AKAR_APP, '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ev = muatModulApp('lib/eventSekolah');
const beranda = muatModulApp('lib/beranda');

const BERKAS_MIGRASI = '020_event_sekolah.sql';
const SEHARI = 86400000;
/** Tanggal WIB `selisih` hari dari hari ini, "YYYY-MM-DD". */
const tgl = (selisih, dasar = hariIniWib()) => new Date(dasar + selisih * SEHARI).toISOString().slice(0, 10);

let server;
let baseUrl;
let lepasKunci;
let versiKebijakan;
let saklarSemula;
let mapelA;
let mapelB;

async function bacaSaklar() {
  const [baris] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'event_sekolah_aktif'");
  return baris.length ? baris[0].nilai : null;
}
const aturSaklar = (nilai) => pool.query("UPDATE konfigurasi_levelin SET nilai = ? WHERE kunci = 'event_sekolah_aktif'", [nilai]);

before(async () => {
  lepasKunci = await kunciKonfigurasiGlobal();
  saklarSemula = await bacaSaklar();
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  versiKebijakan = (await ambilKonfigurasi()).versiKebijakan;
  const [mapel] = await pool.query('SELECT id FROM mapel ORDER BY id LIMIT 2');
  [mapelA, mapelB] = mapel.map((m) => m.id);
});

after(async () => {
  try {
    await new Promise((resolve) => server.close(resolve));
  } finally {
    // LANJUT_077b: nilai awal saklar SELALU dipulihkan, walau penutupan gagal.
    if (saklarSemula !== null && saklarSemula !== undefined) await aturSaklar(saklarSemula);
  }
  await lepasKunci();
  await pool.end();
});

async function panggil(metode, jalur, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${jalur}`, {
    method: metode,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

/** Akun baru; `setuju` = kebijakan privasi versi berlaku diterima saat daftar. */
async function akun(kelas, { setuju = true } = {}) {
  const r = await daftarPenggunaBaru(baseUrl, {
    kelas,
    ...(['10', '11', '12'].includes(kelas) ? { jenis_sekolah: 'SMA' } : {}),
    ...(setuju ? { versi_kebijakan: versiKebijakan } : {}),
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return { token: r.json.data.token, id: r.json.data.pengguna.id };
}

const buatEvent = (token, isi) => panggil('POST', '/pengguna/event', token, { jenis: 'UTS', tanggal: tgl(5), ...isi });
const daftarEvent = (token) => panggil('GET', '/pengguna/event', token);
const ubahEvent = (token, id, isi) => panggil('PATCH', `/pengguna/event/${id}`, token, isi);
const hapusEvent = (token, id) => panggil('DELETE', `/pengguna/event/${id}`, token);
const barisEvent = async (id) => (await pool.query('SELECT * FROM event_sekolah WHERE id = ?', [id]))[0];
const buatKartu = async (token, mapel_id = mapelA) => {
  const r = await panggil('POST', '/kartu', token, { mapel_id, judul: 'Kartu uji 076', isi: 'Isi kartu uji' });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.data.id;
};

/** Empat metode endpoint; isi sengaja tidak sah supaya ketahuan bila isi diperiksa lebih dulu. */
const SEMUA_METODE = [
  ['GET', '/pengguna/event', undefined],
  ['POST', '/pengguna/event', { jenis: 'Kuis', tanggal: 'besok' }],
  ['PATCH', '/pengguna/event/tidak-ada', { tanggal: '2026-02-30' }],
  ['DELETE', '/pengguna/event/tidak-ada', undefined],
];

describe('LANJUT_076 §C.7–8: migrasi 020_event_sekolah', () => {
  test('Tabel event_sekolah: kolom, indeks (pengguna_id, tanggal), FK pengguna hapus berjenjang; migrasi tercatat', async () => {
    const [kolom] = await pool.query(
      `SELECT COLUMN_NAME AS nama, IS_NULLABLE AS bolehNull, DATA_TYPE AS tipe
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_sekolah'
        ORDER BY ORDINAL_POSITION`
    );
    assert.deepEqual(
      kolom.map((k) => k.nama),
      ['id', 'pengguna_id', 'jenis', 'tanggal', 'mapel_id', 'materi_teks', 'kartu_id', 'dibuat_pada', 'diubah_pada']
    );
    const bolehNull = Object.fromEntries(kolom.map((k) => [k.nama, k.bolehNull === 'YES']));
    assert.deepEqual(
      Object.keys(bolehNull).filter((k) => bolehNull[k]),
      ['mapel_id', 'materi_teks', 'kartu_id']
    );
    assert.equal(kolom.find((k) => k.nama === 'tanggal').tipe, 'date');
    const [indeks] = await pool.query(
      `SELECT INDEX_NAME AS nama, GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) AS kolom
         FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_sekolah'
        GROUP BY INDEX_NAME`
    );
    assert.ok(indeks.some((i) => i.kolom === 'pengguna_id,tanggal'), JSON.stringify(indeks));
    const [fk] = await pool.query(
      `SELECT k.COLUMN_NAME AS kolom, k.REFERENCED_TABLE_NAME AS ke, r.DELETE_RULE AS hapus
         FROM information_schema.KEY_COLUMN_USAGE k
         JOIN information_schema.REFERENTIAL_CONSTRAINTS r
           ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
        WHERE k.TABLE_SCHEMA = DATABASE() AND k.TABLE_NAME = 'event_sekolah'`
    );
    const fkPengguna = fk.find((f) => f.kolom === 'pengguna_id');
    assert.equal(fkPengguna.ke, 'pengguna');
    assert.equal(fkPengguna.hapus, 'CASCADE');
    const [catat] = await pool.query('SELECT nama FROM _migrasi WHERE nama = ?', [BERKAS_MIGRASI]);
    assert.equal(catat.length, 1);
  });

  test("Saklar event_sekolah_aktif ada di konfigurasi_levelin, bawaan '0' di berkas migrasi dan di basis data uji", async () => {
    const isi = fs.readFileSync(path.join(DIR_MIGRASI, BERKAS_MIGRASI), 'utf8');
    assert.match(isi, /VALUES\s*\(\s*'event_sekolah_aktif',\s*'0',/);
    assert.match(isi, /ON DUPLICATE KEY UPDATE kunci = kunci;/, 'migrasi ulang tidak menimpa nilai saklar');
    assert.equal(saklarSemula, '0', 'saklar di basis data uji harus kembali 0 sesudah setiap pengujian');
  });

  test('Idempoten: isi berkas dijalankan dua kali lagi tanpa galat; tabel & saklar tetap satu, nilai saklar tidak ditimpa', async () => {
    const pernyataan = pernyataanMigrasi(fs.readFileSync(path.join(DIR_MIGRASI, BERKAS_MIGRASI), 'utf8'));
    assert.ok(pernyataan.length >= 2);
    await aturSaklar('1'); // seandainya PM sudah menyalakannya, migrasi ulang tidak boleh mematikannya
    try {
      const koneksi = await pool.getConnection();
      try {
        for (let ulang = 0; ulang < 2; ulang++) {
          for (const sql of pernyataan) await koneksi.query(sql);
        }
      } finally {
        koneksi.release();
      }
      const [[{ tabel }]] = await pool.query(
        "SELECT COUNT(*) AS tabel FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_sekolah'"
      );
      assert.equal(Number(tabel), 1);
      const [saklar] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'event_sekolah_aktif'");
      assert.equal(saklar.length, 1);
      assert.equal(saklar[0].nilai, '1');
    } finally {
      await aturSaklar(saklarSemula ?? '0'); // LANJUT_077b: nilai awal dipulihkan di finally
    }
  });
});

describe('LANJUT_076 §C.10: saklar mati (bawaan)', () => {
  before(() => aturSaklar('0'));

  test('Semua metode → 403 FITUR_BELUM_AKTIF, juga dengan isi tidak sah (saklar sebelum isi)', async () => {
    const a = await akun('7');
    for (const [metode, jalur, body] of SEMUA_METODE) {
      const r = await panggil(metode, jalur, a.token, body);
      assert.equal(r.status, 403, `${metode} ${jalur}`);
      assert.equal(r.json.galat.kode, 'FITUR_BELUM_AKTIF', `${metode} ${jalur}`);
      assert.ok(r.json.galat.pesan);
    }
  });

  test('Saklar mati + kebijakan belum diterima → tetap FITUR_BELUM_AKTIF (saklar sebelum kebijakan)', async () => {
    const a = await akun('9', { setuju: false });
    for (const [metode, jalur, body] of SEMUA_METODE) {
      const r = await panggil(metode, jalur, a.token, body);
      assert.equal(r.json.galat.kode, 'FITUR_BELUM_AKTIF', `${metode} ${jalur}`);
    }
  });

  test("Nilai saklar selain '1' dianggap mati (gagal-tertutup); tanpa login tetap 401", async () => {
    const a = await akun('8');
    try {
      for (const nilai of ['ya', 'true', '2', '']) {
        await aturSaklar(nilai);
        assert.equal((await daftarEvent(a.token)).json.galat.kode, 'FITUR_BELUM_AKTIF', `nilai "${nilai}"`);
      }
      await aturSaklar('0');
      assert.equal((await daftarEvent(null)).status, 401);
      await aturSaklar('1');
      assert.equal((await daftarEvent(null)).status, 401);
    } finally {
      await aturSaklar('0'); // LANJUT_077b: nilai awal di blok ini ('0') dipulihkan di finally
    }
  });

  test('Saklar dimatikan lagi: event yang sudah ada tidak terhapus, hanya tidak bisa dibuka', async () => {
    const a = await akun('8'); // LANJUT_076b: akun SMP (sebelumnya kelas 10)
    try {
      await aturSaklar('1');
      const dibuat = await buatEvent(a.token, {});
      assert.equal(dibuat.status, 201);
      await aturSaklar('0');
      assert.equal((await daftarEvent(a.token)).status, 403);
      assert.equal((await barisEvent(dibuat.json.data.id)).length, 1);
    } finally {
      await aturSaklar('0'); // LANJUT_077b: nilai awal di blok ini ('0') dipulihkan di finally
    }
  });
});

describe('LANJUT_076 §C.9–11: saklar aktif', () => {
  before(() => aturSaklar('1'));
  after(() => aturSaklar('0'));

  test('Kebijakan belum diterima → 403 AI_BELUM_DIIZINKAN di semua metode, juga dengan isi tidak sah (kebijakan sebelum isi)', async () => {
    const a = await akun('11', { setuju: false });
    for (const [metode, jalur, body] of SEMUA_METODE) {
      const r = await panggil(metode, jalur, a.token, body);
      assert.equal(r.status, 403, `${metode} ${jalur}`);
      assert.equal(r.json.galat.kode, 'AI_BELUM_DIIZINKAN', `${metode} ${jalur}`);
    }
  });

  test('POST lengkap → 201 dengan semua isian; GET diurutkan tanggal naik', async () => {
    const a = await akun('7');
    const kartu = await buatKartu(a.token);
    const r = await buatEvent(a.token, { jenis: 'UAS', tanggal: tgl(20), mapel_id: mapelA, materi_teks: '  Bab 3: Gaya  ', kartu_id: kartu });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    const e = r.json.data;
    assert.equal(e.jenis, 'UAS');
    assert.equal(e.tanggal, tgl(20));
    assert.equal(e.mapel_id, mapelA);
    assert.equal(e.materi_teks, 'Bab 3: Gaya');
    assert.equal(e.kartu_id, kartu);
    assert.ok(e.id && e.dibuat_pada && e.diubah_pada);
    assert.equal(e.pengguna_id, undefined, 'pengguna_id tidak dikirim');
    await buatEvent(a.token, { jenis: 'Ulangan', tanggal: tgl(2) });
    await buatEvent(a.token, { jenis: 'Lainnya', tanggal: tgl(-3) });
    await buatEvent(a.token, { jenis: 'UTS', tanggal: tgl(9) });
    const daftar = await daftarEvent(a.token);
    assert.equal(daftar.status, 200);
    assert.deepEqual(
      daftar.json.data.map((x) => x.tanggal),
      [tgl(-3), tgl(2), tgl(9), tgl(20)]
    );
  });

  test('jenis wajib dan hanya UTS, UAS, Ulangan, Lainnya → selain itu 400 VALIDASI_GAGAL medan jenis', async () => {
    const a = await akun('8');
    for (const jenis of [undefined, 'Kuis', 'uts', '', null, 1]) {
      const r = await panggil('POST', '/pengguna/event', a.token, { jenis, tanggal: tgl(3) });
      assert.equal(r.status, 400, String(jenis));
      assert.equal(r.json.galat.kode, 'VALIDASI_GAGAL');
      assert.ok(r.json.galat.medan.jenis, String(jenis));
    }
    for (const jenis of ev.JENIS_EVENT) assert.equal((await buatEvent(a.token, { jenis })).status, 201, jenis);
  });

  test('tanggal wajib YYYY-MM-DD yang ada di kalender → selain itu 400 medan tanggal', async () => {
    const a = await akun('9');
    for (const tanggal of [undefined, '', '2026-1-3', '03-11-2026', '2026/11/03', '2026-02-30', '2026-13-01', 'besok', '2026-11-03T00:00']) {
      const r = await panggil('POST', '/pengguna/event', a.token, { jenis: 'UTS', tanggal });
      assert.equal(r.status, 400, String(tanggal));
      assert.ok(r.json.galat.medan.tanggal, String(tanggal));
    }
    assert.equal((await daftarEvent(a.token)).json.data.length, 0);
  });

  test('Paling jauh 2 tahun ke depan (WIB): tepat 2 tahun diterima, sehari sesudahnya ditolak; tanggal lampau boleh', async () => {
    const a = await akun('9'); // LANJUT_076b: akun SMP (sebelumnya kelas 10)
    const batas = new Date(ev.batasTanggalMaks(hariIniWib())).toISOString().slice(0, 10);
    assert.equal((await buatEvent(a.token, { tanggal: batas })).status, 201);
    const lewatBatas = await buatEvent(a.token, { tanggal: tgl(1, Date.parse(batas)) });
    assert.equal(lewatBatas.status, 400);
    assert.equal(lewatBatas.json.galat.kode, 'VALIDASI_GAGAL');
    assert.ok(lewatBatas.json.galat.medan.tanggal);
    assert.equal((await buatEvent(a.token, { tanggal: tgl(-30) })).status, 201);
    // Hitungan batas di app dan di server sama.
    assert.equal(ev.batasTanggalMaks(hariIniWib()), require('../src/modul/event-sekolah/event-sekolah.layanan').batasTanggal());
  });

  test('materi_teks opsional, maks. 200 karakter (dihitung per huruf, termasuk emoji); kosong → null', async () => {
    const a = await akun('7'); // LANJUT_076b: akun SMP (sebelumnya kelas 11)
    const pas = '🙂'.repeat(150) + 'a'.repeat(50);
    const r = await buatEvent(a.token, { materi_teks: pas });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.equal(r.json.data.materi_teks, pas);
    const panjang = await buatEvent(a.token, { materi_teks: 'a'.repeat(201) });
    assert.equal(panjang.status, 400);
    assert.ok(panjang.json.galat.medan.materi_teks);
    for (const kosong of ['', '   ', null]) {
      const k = await buatEvent(a.token, { materi_teks: kosong });
      assert.equal(k.status, 201);
      assert.equal(k.json.data.materi_teks, null);
    }
    assert.equal((await buatEvent(a.token, { materi_teks: 123 })).status, 400);
  });

  test('mapel_id opsional dari daftar mapel yang ada → mapel tidak dikenal 400 medan mapel_id', async () => {
    const a = await akun('7');
    assert.equal((await buatEvent(a.token, { mapel_id: mapelB })).json.data.mapel_id, mapelB);
    const r = await buatEvent(a.token, { mapel_id: 'mapel-tidak-ada-076' });
    assert.equal(r.status, 400);
    assert.equal(r.json.galat.kode, 'VALIDASI_GAGAL');
    assert.ok(r.json.galat.medan.mapel_id);
  });

  test('kartu_id milik akun lain, sudah dihapus, atau tidak ada → 400 KARTU_TIDAK_SAH (POST & PATCH); tidak ada yang tersimpan', async () => {
    const a = await akun('8');
    const b = await akun('9');
    const kartuB = await buatKartu(b.token);
    const kartuDihapus = await buatKartu(a.token);
    assert.equal((await panggil('DELETE', `/kartu/${kartuDihapus}`, a.token)).status, 200);
    for (const kartu_id of [kartuB, kartuDihapus, 'kartu-tidak-ada-076']) {
      const r = await buatEvent(a.token, { kartu_id });
      assert.equal(r.status, 400, kartu_id);
      assert.equal(r.json.galat.kode, 'KARTU_TIDAK_SAH', kartu_id);
      assert.ok(r.json.galat.medan.kartu_id);
    }
    assert.equal((await daftarEvent(a.token)).json.data.length, 0);
    const milikA = (await buatEvent(a.token, {})).json.data;
    const ubah = await ubahEvent(a.token, milikA.id, { kartu_id: kartuB });
    assert.equal(ubah.status, 400);
    assert.equal(ubah.json.galat.kode, 'KARTU_TIDAK_SAH');
    assert.equal((await barisEvent(milikA.id))[0].kartu_id, null);
  });

  test('PATCH sebagian: hanya medan yang dikirim berubah; null mengosongkan; isi kosong {} → 400', async () => {
    const a = await akun('8'); // LANJUT_076b: akun SMP (sebelumnya kelas 10)
    const kartu = await buatKartu(a.token);
    const e = (await buatEvent(a.token, { jenis: 'UTS', mapel_id: mapelA, materi_teks: 'Awal', kartu_id: kartu })).json.data;
    const r = await ubahEvent(a.token, e.id, { materi_teks: 'Bab 4' });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.deepEqual(
      { jenis: r.json.data.jenis, tanggal: r.json.data.tanggal, mapel_id: r.json.data.mapel_id, kartu_id: r.json.data.kartu_id, materi_teks: r.json.data.materi_teks },
      { jenis: 'UTS', tanggal: e.tanggal, mapel_id: mapelA, kartu_id: kartu, materi_teks: 'Bab 4' }
    );
    const kosongkan = await ubahEvent(a.token, e.id, { mapel_id: null, kartu_id: null, materi_teks: '', jenis: 'UAS', tanggal: tgl(1) });
    assert.equal(kosongkan.status, 200);
    assert.equal(kosongkan.json.data.mapel_id, null);
    assert.equal(kosongkan.json.data.kartu_id, null);
    assert.equal(kosongkan.json.data.materi_teks, null);
    assert.equal(kosongkan.json.data.jenis, 'UAS');
    assert.equal(kosongkan.json.data.tanggal, tgl(1));
    assert.equal((await ubahEvent(a.token, e.id, {})).status, 400);
    assert.equal((await ubahEvent(a.token, e.id, { jenis: 'Kuis' })).status, 400);
    assert.equal((await ubahEvent(a.token, e.id, { jenis: null })).status, 400, 'jenis wajib tidak bisa dikosongkan');
  });

  test('PATCH & DELETE event akun lain → 404 TIDAK_DITEMUKAN (juga dengan isi tidak sah); event itu tidak berubah', async () => {
    const a = await akun('9'); // LANJUT_076b: akun SMP (sebelumnya kelas 11)
    const b = await akun('7');
    const e = (await buatEvent(a.token, { jenis: 'UTS', materi_teks: 'Milik A' })).json.data;
    for (const isi of [{ materi_teks: 'Diubah B' }, { kartu_id: 'kartu-tidak-ada-076' }, { mapel_id: 'mapel-tidak-ada-076' }]) {
      const r = await ubahEvent(b.token, e.id, isi);
      assert.equal(r.status, 404, JSON.stringify(isi));
      assert.equal(r.json.galat.kode, 'TIDAK_DITEMUKAN');
    }
    const hapus = await hapusEvent(b.token, e.id);
    assert.equal(hapus.status, 404);
    assert.equal(hapus.json.galat.kode, 'TIDAK_DITEMUKAN');
    const [baris] = await barisEvent(e.id);
    assert.equal(baris.materi_teks, 'Milik A');
    assert.equal(baris.pengguna_id, a.id);
    // Id yang sama sekali tidak ada: jawaban sama persis dengan milik akun lain.
    assert.deepEqual((await hapusEvent(b.token, 'event-tidak-ada')).json, hapus.json);
  });

  test('DELETE milik sendiri → baris benar-benar hilang dari basis data; hapus kedua 404', async () => {
    const a = await akun('8');
    const e = (await buatEvent(a.token, {})).json.data;
    assert.equal((await barisEvent(e.id)).length, 1);
    const r = await hapusEvent(a.token, e.id);
    assert.equal(r.status, 200);
    assert.deepEqual(r.json.data, { dihapus: true });
    const [[{ jumlah }]] = await pool.query('SELECT COUNT(*) AS jumlah FROM event_sekolah WHERE id = ?', [e.id]);
    assert.equal(Number(jumlah), 0, 'hapus permanen, bukan hapus lunak');
    assert.equal((await hapusEvent(a.token, e.id)).status, 404);
  });

  test('GET lintas akun: akun B tidak melihat event akun A', async () => {
    const a = await akun('9');
    const b = await akun('8'); // LANJUT_076b: akun SMP (sebelumnya kelas 10)
    const e = (await buatEvent(a.token, { materi_teks: 'Rahasia A' })).json.data;
    await buatEvent(b.token, { jenis: 'UAS' });
    const daftarB = (await daftarEvent(b.token)).json.data;
    assert.equal(daftarB.length, 1);
    assert.ok(daftarB.every((x) => x.id !== e.id && x.materi_teks !== 'Rahasia A'));
    assert.deepEqual((await daftarEvent(a.token)).json.data.map((x) => x.id), [e.id]);
  });

  test('Kartu Arsip yang terhubung dihapus permanen dari basis data → kartu_id event menjadi null (tidak menunjuk kartu hilang)', async () => {
    const a = await akun('7'); // LANJUT_076b: akun SMP (sebelumnya kelas 11)
    const kartu = await buatKartu(a.token);
    const e = (await buatEvent(a.token, { kartu_id: kartu })).json.data;
    await pool.query('DELETE FROM kartu WHERE id = ?', [kartu]);
    assert.equal((await barisEvent(e.id))[0].kartu_id, null);
  });

  test('Log server tidak memuat materi_teks, tanggal, atau mapel_id — juga saat ditolak', async (t) => {
    const a = await akun('7');
    const kartu = await buatKartu(a.token);
    const tercatat = [];
    for (const metode of ['log', 'info', 'warn', 'error']) {
      t.mock.method(console, metode, (...arg) => tercatat.push(arg.map(String).join(' ')));
    }
    const MATERI = 'PENANDA-MATERI-076';
    const TANGGAL = tgl(6);
    const e = (await buatEvent(a.token, { tanggal: TANGGAL, mapel_id: mapelB, materi_teks: MATERI, kartu_id: kartu })).json.data;
    await ubahEvent(a.token, e.id, { materi_teks: `${MATERI}-2`, tanggal: tgl(4), mapel_id: mapelA });
    await daftarEvent(a.token);
    await buatEvent(a.token, { tanggal: TANGGAL, materi_teks: `${MATERI}-3`.padEnd(250, 'x') }); // 400
    await buatEvent(a.token, { tanggal: TANGGAL, mapel_id: 'mapel-tidak-ada-076', materi_teks: MATERI }); // 400
    await panggil('POST', '/pengguna/event', a.token, `{"materi_teks":"${MATERI}",`); // JSON rusak
    await hapusEvent(a.token, e.id);
    await new Promise((r) => setTimeout(r, 50)); // log akses ditulis saat respons selesai
    const log = tercatat.join('\n');
    assert.ok(log.includes('/pengguna/event'), 'log akses tetap tercatat (metode, jalur, status)');
    for (const terlarang of [MATERI, TANGGAL, tgl(4), mapelA, mapelB, 'mapel-tidak-ada-076']) {
      assert.ok(!log.includes(terlarang), `log memuat ${terlarang}`);
    }
  });

  test('Event yang sudah lewat tetap ada (tidak dihapus otomatis) dan tetap bisa dihapus sendiri', async () => {
    const a = await akun('8');
    const lama = (await buatEvent(a.token, { tanggal: tgl(-400) })).json.data;
    const daftar = (await daftarEvent(a.token)).json.data;
    assert.deepEqual(daftar.map((x) => x.id), [lama.id]);
    assert.equal((await hapusEvent(a.token, lama.id)).status, 200);
  });
});

describe('LANJUT_076 §A: kelas 12 tidak berubah', () => {
  after(() => aturSaklar('0'));

  test('Data Daftar Periksa kelas 12 (checklist, kemajuan, butir milik akun) sama persis saat saklar mati dan aktif', async () => {
    const a = await akun('12');
    const ambil = async () => {
      const hasil = {};
      for (const jalur of ['/konten/checklist', '/kemajuan', '/butir-pribadi']) {
        const r = await panggil('GET', jalur, a.token);
        assert.equal(r.status, 200, jalur);
        hasil[jalur] = r.json;
      }
      return hasil;
    };
    try {
      await aturSaklar('0');
      const mati = await ambil();
      await aturSaklar('1');
      const aktif = await ambil();
      assert.deepEqual(aktif, mati);
    } finally {
      await aturSaklar(saklarSemula ?? '0'); // LANJUT_077b: nilai awal dipulihkan di finally
    }
  });

  test('Bagian layar kelas 12 di DaftarPeriksaScreen.tsx identik dengan sebelum LANJUT_076; Persiapan Event hanya di layar bukan kelas 12', () => {
    const layar = baca('components', 'screens', 'DaftarPeriksaScreen.tsx');
    const bagian12 =
      layar.slice(layar.indexOf('export function DaftarPeriksaScreen'), layar.indexOf('// LANJUT_069 (Tambahan-069 no. 2)')) +
      layar.slice(layar.indexOf('function DaftarPeriksaKelas12'));
    // Sidik dihitung dari commit 563002d (sebelum LANJUT_076): 10ef15e8e3ec…632814b, tetap
    // sampai 15 Okt 2026. Dihitung ulang 15 Okt 2026 untuk satu perubahan yang disengaja
    // (pilihan percakapan, belum disetujui PM): catatan di bawah kategori "Persiapan Ujian"
    // dan catatan SNPMB yang tidak menghitung kategori saran (lib/daftarPeriksa.ts). Persiapan
    // Event tetap tidak menyentuh bagian ini (dua asersi di bawah).
    assert.equal(
      crypto.createHash('sha256').update(bagian12).digest('hex'),
      'df6096cd4dd66f0cad392aa2067cc62732f7af27eb739445041b1743ef5b88db',
      'tampilan Daftar Periksa kelas 12 berubah'
    );
    assert.equal((layar.match(/<PersiapanEvent \/>/g) || []).length, 1);
    const bukan12 = layar.slice(layar.indexOf('function DaftarPeriksaBukanKelas12'), layar.indexOf('function DaftarPeriksaKelas12'));
    assert.ok(bukan12.includes('<PersiapanEvent />'));
    // LANJUT_076b (keputusan PM no. 1): hanya SMP; kelas 10–11 tidak lagi.
    for (const k of ['10', '11', '12', null, undefined, '']) assert.equal(ev.untukPersiapanEvent(k), false, `kelas ${k}`);
    for (const k of ['7', '8', '9']) assert.equal(ev.untukPersiapanEvent(k), true, `kelas ${k}`);
  });
});

describe('LANJUT_076 §D: pengingat "Persiapan Terdekat" (lib/eventSekolah.ts)', () => {
  const HARI = Date.UTC(2026, 9, 14); // 14 Okt 2026 (WIB)
  const e = (id, selisih, lain = {}) => ({ id, jenis: 'UTS', tanggal: tgl(selisih, HARI), mapel_id: null, materi_teks: null, kartu_id: null, ...lain });

  test('7 hari sebelum s.d. hari H tampil; 8 hari sebelum dan sesudah hari H tidak', () => {
    for (const s of [0, 1, 3, 7]) assert.equal(ev.eventTerdekat([e('x', s)], HARI)?.id, 'x', `${s} hari lagi`);
    for (const s of [8, 30, -1, -7]) assert.equal(ev.eventTerdekat([e('x', s)], HARI), null, `selisih ${s}`);
    assert.equal(ev.eventTerdekat([], HARI), null);
    assert.equal(ev.eventTerdekat(undefined, HARI), null);
    assert.equal(ev.eventTerdekat([e('rusak', 0, { tanggal: 'bukan-tanggal' })], HARI), null);
  });

  test('Lebih dari satu dalam rentang → tepat satu, yang tanggalnya paling dekat (tidak tergantung urutan data)', () => {
    const daftar = [e('jauh', 6), e('lewat', -1), e('dekat', 2), e('di-luar', 9), e('tengah', 4)];
    assert.equal(ev.eventTerdekat(daftar, HARI).id, 'dekat');
    assert.equal(ev.eventTerdekat([...daftar].reverse(), HARI).id, 'dekat');
    assert.equal(ev.eventTerdekat([e('besok', 1), e('hari-h', 0)], HARI).id, 'hari-h');
  });

  test('Hitung mundur: "Hari ini" di hari H, "3 hari lagi"; batas hari mengikuti WIB (hariIniWib), bukan UTC', () => {
    assert.equal(ev.teksHitungMundur(0), 'Hari ini');
    assert.equal(ev.teksHitungMundur(3), '3 hari lagi');
    assert.equal(ev.selisihHari('2026-10-17', HARI), 3);
    // 14 Okt 17.30 UTC = 15 Okt 00.30 WIB: event 15 Okt sudah "Hari ini".
    const tengahMalamWib = Date.UTC(2026, 9, 14, 17, 30);
    assert.equal(ev.selisihHari('2026-10-15', require('../src/util/linimasa').hariIniWib(tengahMalamWib)), 0);
    assert.equal(muatModulApp('lib/linimasa').hariIniWib(tengahMalamWib), Date.UTC(2026, 9, 15));
  });

  test('Daftar utama = hari ini dan sesudahnya (tanggal naik); yang lewat dipisah, tidak dibuang', () => {
    const { mendatang, lewat } = ev.pisahEvent([e('c', 9), e('lalu', -2), e('a', 0), e('b', 3), e('lama', -40)], HARI);
    assert.deepEqual(mendatang.map((x) => x.id), ['a', 'b', 'c']);
    assert.deepEqual(lewat.map((x) => x.id), ['lalu', 'lama']);
  });

  test('Pemeriksaan isian di app sama aturannya dengan server (jenis, format, kalender, 2 tahun, 200 karakter)', () => {
    const ok = { jenis: 'UTS', tanggal: '2026-11-03', materi: '' };
    assert.deepEqual(ev.periksaIsianEvent(ok, HARI), {});
    assert.ok(ev.periksaIsianEvent({ ...ok, jenis: null }, HARI).jenis);
    assert.equal(ev.periksaIsianEvent({ ...ok, tanggal: '3-11-2026' }, HARI).tanggal, ev.TEKS_EVENT.galatTanggalFormat);
    assert.equal(ev.periksaIsianEvent({ ...ok, tanggal: '2026-02-30' }, HARI).tanggal, ev.TEKS_EVENT.galatTanggalKalender);
    assert.deepEqual(ev.periksaIsianEvent({ ...ok, tanggal: '2028-10-14' }, HARI), {});
    assert.equal(ev.periksaIsianEvent({ ...ok, tanggal: '2028-10-15' }, HARI).tanggal, ev.TEKS_EVENT.galatTanggalJauh);
    assert.deepEqual(ev.periksaIsianEvent({ ...ok, materi: '🙂'.repeat(200) }, HARI), {});
    assert.equal(ev.periksaIsianEvent({ ...ok, materi: 'a'.repeat(201) }, HARI).materi_teks, ev.TEKS_EVENT.galatMateri);
  });
});

describe('LANJUT_076 §D–F: Beranda, layar, teks', () => {
  test('urutanBeranda: kartu persiapan tepat sesudah progres dan sebelum grid, hanya kelas 7–9 (LANJUT_076b), hanya bila ada event', () => {
    for (const kelas of ['7', '8', '9']) {
      for (const tampilBanner of [false, true]) {
        const u = beranda.urutanBeranda({ kelas, tampilMulaiDariSini: true, tampilBanner, tampilPersiapan: true });
        assert.equal(u.filter((b) => b === 'persiapan').length, 1);
        assert.equal(u.indexOf('persiapan'), u.indexOf('progres') + 1, `kelas ${kelas}`);
        assert.equal(u.indexOf('grid'), u.indexOf('persiapan') + 1, `kelas ${kelas}`);
        const tanpa = beranda.urutanBeranda({ kelas, tampilMulaiDariSini: true, tampilBanner, tampilPersiapan: false });
        assert.deepEqual(tanpa, u.filter((b) => b !== 'persiapan'), 'tanpa event: tidak ada ruang kosong');
      }
    }
    for (const kelas of ['10', '11', '12', null]) {
      const u = beranda.urutanBeranda({ kelas, tampilMulaiDariSini: true, tampilBanner: true, tampilPersiapan: true });
      assert.ok(!u.includes('persiapan'), `kelas ${kelas} tidak pernah melihat pengingat`);
      assert.deepEqual(u, beranda.urutanBeranda({ kelas, tampilMulaiDariSini: true, tampilBanner: true }));
    }
  });

  test('Beranda: kartu tidak tampil saat gagal dimuat / saklar mati / bukan kelas 7–9; tanpa logika tanggal di layar; tekan → Daftar Periksa', () => {
    const layar = baca('components', 'screens', 'LinimasaScreen.tsx');
    assert.ok(layar.includes('const persiapanAktif = untukPersiapanEvent(kelas);'));
    assert.ok(layar.includes('const eventQuery = useEventSekolah(persiapanAktif);'));
    assert.ok(layar.includes('const persiapan = persiapanAktif && !eventQuery.isError ? eventTerdekat(eventQuery.data) : null;'));
    assert.ok(layar.includes('tampilPersiapan: persiapan !== null'));
    assert.ok(layar.includes("<KartuPersiapan event={persiapan} onPress={() => router.push('/daftar-periksa')} />"));
    const kartu = layar.slice(layar.indexOf('function KartuPersiapan'));
    const isiKartu = kartu.slice(0, kartu.indexOf('\n}\n'));
    assert.ok(isiKartu.includes('teksHitungMundur(selisihHari(event.tanggal)'));
    for (const pola of [/new Date/, /Date\.now/, /Date\.UTC/, /86400000/, /getUTC/]) assert.ok(!pola.test(isiKartu), `logika tanggal di layar: ${pola}`);
    // Hook: GET hanya saat aktif (kelas 7–9); 403 saklar/kebijakan/kelas tidak diulang.
    const hook = baca('hooks', 'useEventSekolah.ts');
    assert.ok(hook.includes('enabled: !!token && aktif'));
    assert.ok(hook.includes('!(err instanceof ApiError && err.status === 403)'));
    assert.ok(baca('providers', 'AuthProvider.tsx').includes("['event_sekolah']"), 'cache event dibuang saat ganti akun');
  });

  test('Layar Persiapan Event: tidak merender apa pun selama data tidak ada (saklar mati); petunjuk materi selalu tampil; Buka materi hanya bila kartu_id', () => {
    const layar = baca('components', 'screens', 'PersiapanEvent.tsx');
    assert.ok(layar.includes('if (!aktif || eventQuery.isError || !eventQuery.data) return null;'));
    assert.ok(layar.includes('const aktif = untukPersiapanEvent(pengguna?.kelas);'));
    assert.ok(layar.includes('<Text style={s.petunjuk}>{TEKS_EVENT.petunjukMateri}</Text>'), 'petunjuk materi tidak boleh hanya lewat hint (hilang saat galat)');
    assert.equal(ev.TEKS_EVENT.petunjukMateri, 'Tulis materinya singkat saja. Jangan tulis nama atau data pribadi.');
    // LANJUT_076b: tombol materi diputuskan tampilanMateri (tanpa kartu → tidak ada tombol).
    assert.ok(layar.includes('const materi = tampilanMateri(event);'));
    assert.ok(layar.includes("{materi.buka === 'arsip' ? ("));
    assert.ok(layar.includes("router.push({ pathname: '/arsip-kartu', params: { id: event.kartu_id! } })"));
    assert.deepEqual(ev.tampilanMateri({ kartu_id: null, materi: null }), { keterangan: null, buka: null });
    assert.ok(layar.includes('(pilihanKartu ?? []).filter((k) => !mapelId || k.mapel_id === mapelId)'), 'kartu disaring mapel');
    // LANJUT_076b §D.10: pilihan kartu dari server (milik sendiri + kurasi terverifikasi), bukan /kartu.
    assert.ok(layar.includes('const { data: pilihanKartu } = usePilihanKartuEvent(true);'));
    assert.ok(!layar.includes('useKartuSaya'));
    assert.ok(baca('hooks', 'useEventSekolah.ts').includes("'/pengguna/event/pilihan-kartu'"));
    for (const pola of [/new Date/, /Date\.now/, /Date\.UTC/, /86400000/]) assert.ok(!pola.test(layar), `logika tanggal di layar: ${pola}`);
  });

  test('Teks baru tercatat DRAF di salinan-teks-lanjut.md §4.4', () => {
    const sumber = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'), 'utf8');
    const awal = sumber.indexOf('**LANJUT_App (LANJUT_076)');
    assert.ok(awal >= 0, 'blok LANJUT_076 harus ada');
    assert.ok(awal > sumber.indexOf('### 4.4 Daftar Periksa') && awal < sumber.indexOf('### 4.5 Arsip Belajar'));
    const blok = sumber.slice(awal, sumber.indexOf('### 4.5 Arsip Belajar'));
    assert.match(blok.slice(0, blok.indexOf('\n\n')), /\bDRAF\b/);
    const T = ev.TEKS_EVENT;
    const wajib = [
      T.judul, T.pengantar, T.tombolTambah, T.kosong, T.labelJenis, T.labelTanggal, T.labelMapel, T.labelMateri, T.labelKartu,
      T.petunjukTanggal, T.petunjukMateri, T.kartuKosong, T.tombolSimpan, T.tombolBatal, T.bukaMateri, T.ubah, T.hapus,
      T.konfirmasiHapus, T.yaHapus, T.lihatLewat, T.sembunyikanLewat, T.sudahLewat, T.hariIni, T.hariLagi,
      T.galatJenis, T.galatTanggalFormat, T.galatTanggalKalender, T.galatTanggalJauh, T.galatMateri, T.galatKartu, T.galatSimpan,
      T.kartuBerandaJudul, ...ev.JENIS_EVENT,
    ];
    for (const t of wajib) assert.ok(blok.includes(t), `belum tercatat: ${t}`);
  });
});
