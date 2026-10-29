// tests/event-sekolah-smp.test.js
// Pengujian otomatis LANJUT_076b — Persiapan Event khusus SMP:
// - server: kelas 10–12 → 403 KELAS_TIDAK_DIDUKUNG; urutan cek login → saklar →
//   kebijakan → kelas → isi; event akun yang naik kelas tidak dihapus dan tidak tampil
// - jenis SMP (UTS, UAS/PAS, Ulangan Harian, TKA, Lainnya), migrasi 021 idempoten
// - materi: kartu milik sendiri atau kartu kurasi terverifikasi bersumber https;
//   tautan yang sudah mati → "Materi ini sudah tidak tersedia", kartu_id tidak diubah
// - halaman Daftar Periksa SMP tanpa kalimat kelas 12; kartu Beranda hanya SMP
// - tidak ada kode yang mengambil apa pun dari internet di fitur ini
// Saklar event_sekolah_aktif diubah SEMENTARA dan dikembalikan di after(), di
// bawah kunciKonfigurasiGlobal (sama dengan event-sekolah.test.js). Kartu kurasi
// uji disisipkan langsung ke DB (mapel sosiologi, tidak dipakai tes lain) lalu dihapus.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { acak, nyalakanServer, urlDari, daftarPenggunaBaru, kunciKonfigurasiGlobal, pool } = require('./bantuan');
const { muatModulApp } = require('./muat-ts-app');
const { pernyataanMigrasi, DIR_MIGRASI } = require('../src/db/jalankan-migrasi');
const { ambilKonfigurasi } = require('../src/modul/persetujuan/persetujuan.layanan');
const { benihArsipKartu } = require('../src/db/benih/benih');
const { hariIniWib } = require('../src/util/linimasa');

const AKAR_APP = path.join(__dirname, '..', '..');
const AKAR_REPO = path.join(AKAR_APP, '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ev = muatModulApp('lib/eventSekolah');
const beranda = muatModulApp('lib/beranda');
const { teksDaftarPeriksaBukanKelas12 } = muatModulApp('lib/jenjangSaya');

const MAPEL = 'sosiologi';
const tgl = (selisih) => new Date(hariIniWib() + selisih * 86400000).toISOString().slice(0, 10);

let server;
let baseUrl;
let lepasKunci;
let versiKebijakan;
let saklarSemula;

// Kartu kurasi uji: satu sah, sisanya masing-masing gagal di SATU syarat saja.
const K = {
  sah: `uji-076b-sah-${acak()}`,
  cabut: `uji-076b-cabut-${acak()}`,
  belum: `uji-076b-belum-${acak()}`,
  tanpaTanggal: `uji-076b-tanpa-tanggal-${acak()}`,
  http: `uji-076b-http-${acak()}`,
  tanpaPenyedia: `uji-076b-tanpa-penyedia-${acak()}`,
  mitra: `uji-076b-mitra-${acak()}`,
  dihapus: `uji-076b-dihapus-${acak()}`,
};
const BENIH = { id: `uji-076b-benih-${acak()}`, dibuat_pada: '2020-01-01' };

async function sisipKurasi(id, ubah = {}) {
  const k = {
    sumber: 'resmi',
    penyedia: 'Sumber Uji 076b',
    status: 'terverifikasi',
    diperiksa: '2026-10-01',
    url: `https://contoh.invalid/${id}`,
    dihapus: null,
    ...ubah,
  };
  await pool.execute(
    `INSERT INTO kartu
       (id, pemilik_id, mapel_id, judul, isi, jawaban, sumber, penyedia, pemilik,
        status_verifikasi, asal, url_sumber, diperiksa_pada, dibuat_pada, diubah_pada, dihapus_pada)
     VALUES (?, NULL, ?, ?, 'Isi materi kurasi uji', NULL, ?, ?, 'tim', ?, 'uji', ?, ?, NOW(), NOW(), ?)`,
    [id, MAPEL, `Materi ${id}`, k.sumber, k.penyedia, k.status, k.url, k.diperiksa, k.dihapus]
  );
}

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
  await sisipKurasi(K.sah);
  await sisipKurasi(K.cabut);
  await sisipKurasi(K.belum, { status: 'belum_diverifikasi' }); // diperiksa_pada tetap terisi: hanya status yang gagal
  await sisipKurasi(K.tanpaTanggal, { diperiksa: null });
  await sisipKurasi(K.http, { url: 'http://contoh.invalid/materi' });
  await sisipKurasi(K.tanpaPenyedia, { penyedia: '  ' });
  await sisipKurasi(K.mitra, { sumber: 'mitra' });
  await sisipKurasi(K.dihapus, { dihapus: new Date() });
  await aturSaklar('1');
});

after(async () => {
  try {
    await pool.query('DELETE FROM kartu WHERE id IN (?)', [[...Object.values(K), BENIH.id]]);
    await new Promise((resolve) => server.close(resolve));
  } finally {
    // LANJUT_077b: nilai awal saklar SELALU dipulihkan, walau pembersihan gagal.
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
const barisEvent = async (id) => (await pool.query('SELECT * FROM event_sekolah WHERE id = ?', [id]))[0][0];
const kartuSendiri = async (token) => {
  const r = await panggil('POST', '/kartu', token, { mapel_id: MAPEL, judul: 'Kartu milik uji 076b', isi: 'Isi' });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.data.id;
};

/** Semua metode endpoint; isi sengaja tidak sah supaya ketahuan bila isi diperiksa lebih dulu. */
const SEMUA_METODE = [
  ['GET', '/pengguna/event', undefined],
  ['GET', '/pengguna/event/pilihan-kartu', undefined],
  ['POST', '/pengguna/event', { jenis: 'Kuis', tanggal: 'besok' }],
  ['PATCH', '/pengguna/event/tidak-ada', { tanggal: '2026-02-30' }],
  ['DELETE', '/pengguna/event/tidak-ada', undefined],
];

describe('LANJUT_076b §A: Persiapan Event hanya untuk kelas 7–9 (server)', () => {
  test('Kelas 10, 11, 12 → 403 KELAS_TIDAK_DIDUKUNG di semua metode, juga dengan isi tidak sah (kelas sebelum isi)', async () => {
    for (const kelas of ['10', '11', '12']) {
      const a = await akun(kelas);
      for (const [metode, jalur, body] of SEMUA_METODE) {
        const r = await panggil(metode, jalur, a.token, body);
        assert.equal(r.status, 403, `kelas ${kelas} ${metode} ${jalur}`);
        assert.equal(r.json.galat.kode, 'KELAS_TIDAK_DIDUKUNG', `kelas ${kelas} ${metode} ${jalur}`);
        assert.ok(r.json.galat.pesan);
      }
    }
  });

  test('Urutan cek: login → saklar → kebijakan → kelas → isi', async () => {
    const k10 = await akun('10');
    const k12TanpaKebijakan = await akun('12', { setuju: false });
    const k8 = await akun('8');
    assert.equal((await panggil('POST', '/pengguna/event', null, { jenis: 'Kuis' })).status, 401);
    try {
      await aturSaklar('0');
      assert.equal((await daftarEvent(k10.token)).json.galat.kode, 'FITUR_BELUM_AKTIF', 'saklar sebelum kelas');
    } finally {
      await aturSaklar('1'); // LANJUT_077b: nilai awal di berkas ini ('1', dari before) dipulihkan di finally
    }
    assert.equal((await daftarEvent(k12TanpaKebijakan.token)).json.galat.kode, 'AI_BELUM_DIIZINKAN', 'kebijakan sebelum kelas');
    assert.equal((await buatEvent(k10.token, { jenis: 'Kuis' })).json.galat.kode, 'KELAS_TIDAK_DIDUKUNG', 'kelas sebelum isi');
    assert.equal((await buatEvent(k8.token, { jenis: 'Kuis' })).json.galat.kode, 'VALIDASI_GAGAL', 'SMP sampai ke pemeriksaan isi');
  });

  test('Kelas 7, 8, 9 boleh memakai semua endpoint', async () => {
    for (const kelas of ['7', '8', '9']) {
      const a = await akun(kelas);
      assert.equal((await daftarEvent(a.token)).status, 200, `kelas ${kelas}`);
      assert.equal((await panggil('GET', '/pengguna/event/pilihan-kartu', a.token)).status, 200, `kelas ${kelas}`);
      const e = await buatEvent(a.token, {});
      assert.equal(e.status, 201, `kelas ${kelas}`);
      assert.equal((await panggil('DELETE', `/pengguna/event/${e.json.data.id}`, a.token)).status, 200);
    }
  });

  test('Akun yang naik ke kelas 10: event tetap ada di DB tanpa perubahan, tidak tampil, tidak bisa diubah/dihapus; kembali SMP → tampil utuh', async () => {
    const a = await akun('9');
    const e = (await buatEvent(a.token, { jenis: 'TKA', materi_teks: 'Persiapan TKA' })).json.data;
    const sebelum = await barisEvent(e.id);
    assert.equal((await panggil('PATCH', '/pengguna/saya', a.token, { kelas: '10' })).status, 200);
    for (const [metode, jalur, body] of [
      ['GET', '/pengguna/event', undefined],
      ['PATCH', `/pengguna/event/${e.id}`, { materi_teks: 'Diubah' }],
      ['DELETE', `/pengguna/event/${e.id}`, undefined],
    ]) {
      const r = await panggil(metode, jalur, a.token, body);
      assert.equal(r.json.galat?.kode, 'KELAS_TIDAK_DIDUKUNG', `${metode} ${jalur}`);
    }
    assert.deepEqual(await barisEvent(e.id), sebelum, 'baris event tidak berubah dan tidak terhapus');
    assert.equal((await panggil('PATCH', '/pengguna/saya', a.token, { kelas: '9' })).status, 200);
    const daftar = (await daftarEvent(a.token)).json.data;
    assert.deepEqual(daftar.map((x) => [x.id, x.jenis, x.materi_teks]), [[e.id, 'TKA', 'Persiapan TKA']]);
  });
});

describe('LANJUT_076b §C: jenis event SMP', () => {
  test('UTS, UAS, PAS, Ulangan, TKA, Lainnya diterima; label ("UAS/PAS", "Ulangan Harian") dan nilai lain → 400 VALIDASI_GAGAL', async () => {
    const a = await akun('8');
    for (const jenis of ['UTS', 'UAS', 'PAS', 'Ulangan', 'TKA', 'Lainnya']) {
      const r = await buatEvent(a.token, { jenis });
      assert.equal(r.status, 201, jenis);
      assert.equal(r.json.data.jenis, jenis);
    }
    for (const jenis of ['UAS/PAS', 'Ulangan Harian', 'pas', 'tka', 'PTS', 'Kuis', '']) {
      const r = await buatEvent(a.token, { jenis });
      assert.equal(r.status, 400, jenis);
      assert.equal(r.json.galat.kode, 'VALIDASI_GAGAL', jenis);
      assert.ok(r.json.galat.medan.jenis, jenis);
    }
    const lama = (await buatEvent(a.token, { jenis: 'UAS' })).json.data;
    const r = await panggil('PATCH', `/pengguna/event/${lama.id}`, a.token, { materi_teks: 'Bab 2' });
    assert.equal(r.json.data.jenis, 'UAS', 'nilai lama tetap, tidak dimigrasi ke PAS');
  });

  test('Migrasi 021: PAS & TKA di akhir ENUM (urutan nilai lama tetap); 020 + 021 dijalankan ulang dua kali tanpa galat; isi baris tidak berubah', async () => {
    const tipe = async () =>
      (await pool.query(
        "SELECT COLUMN_TYPE AS t FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_sekolah' AND COLUMN_NAME = 'jenis'"
      ))[0][0].t;
    assert.equal(await tipe(), "enum('UTS','UAS','Ulangan','Lainnya','PAS','TKA')");
    const sidik = async () =>
      (await pool.query(
        `SELECT COUNT(*) AS n, BIT_XOR(CRC32(CONCAT_WS('|', id, pengguna_id, jenis, tanggal, IFNULL(mapel_id,'-'),
                IFNULL(materi_teks,'-'), IFNULL(kartu_id,'-'), dibuat_pada, diubah_pada))) AS s
           FROM event_sekolah`
      ))[0][0];
    const sebelum = await sidik();
    const [catat] = await pool.query("SELECT nama FROM _migrasi WHERE nama IN ('020_event_sekolah.sql', '021_event_sekolah_jenis_smp.sql')");
    assert.equal(catat.length, 2, 'migrasi 020 & 021 tercatat');
    const koneksi = await pool.getConnection();
    try {
      for (let ulang = 0; ulang < 2; ulang++) {
        for (const berkas of ['020_event_sekolah.sql', '021_event_sekolah_jenis_smp.sql']) {
          for (const sql of pernyataanMigrasi(fs.readFileSync(path.join(DIR_MIGRASI, berkas), 'utf8'))) await koneksi.query(sql);
        }
      }
    } finally {
      koneksi.release();
    }
    assert.equal(await tipe(), "enum('UTS','UAS','Ulangan','Lainnya','PAS','TKA')", '020 diulang tidak mempersempit ENUM');
    const sesudah = await sidik();
    assert.deepEqual({ n: Number(sesudah.n), s: String(sesudah.s) }, { n: Number(sebelum.n), s: String(sebelum.s) });
    assert.equal(await bacaSaklar(), '1', 'nilai saklar yang sedang berlaku tidak ditimpa 020');
  });

  test('Label & pilihan di app: UTS, UAS/PAS, Ulangan Harian, TKA (kelas 9 saja), Lainnya', () => {
    const label = (kelas, sekarang) => ev.pilihanJenis(kelas, sekarang).map((p) => p.label);
    assert.deepEqual(label('9'), ['UTS', 'UAS/PAS', 'Ulangan Harian', 'TKA', 'Lainnya']);
    for (const k of ['7', '8']) assert.deepEqual(label(k), ['UTS', 'UAS/PAS', 'Ulangan Harian', 'Lainnya'], `kelas ${k}`);
    assert.deepEqual(label('8', 'TKA'), ['UTS', 'UAS/PAS', 'Ulangan Harian', 'TKA', 'Lainnya'], 'event TKA lama tetap bisa diubah');
    assert.equal(ev.labelJenis('UAS'), 'UAS/PAS');
    assert.equal(ev.labelJenis('PAS'), 'UAS/PAS');
    assert.equal(ev.labelJenis('Ulangan'), 'Ulangan Harian');
    for (const j of ['UTS', 'TKA', 'Lainnya']) assert.equal(ev.labelJenis(j), j);
    // Nilai pilihan = nilai sah di server (sama dengan skema).
    const { JENIS_EVENT } = require('../src/modul/event-sekolah/event-sekolah.skema');
    assert.deepEqual([...ev.JENIS_EVENT].sort(), [...JENIS_EVENT].sort());
    for (const p of ev.pilihanJenis('9')) assert.ok(JENIS_EVENT.includes(p.nilai), p.nilai);
  });
});

describe('LANJUT_076b §D–E: materi dari kartu milik sendiri atau kartu kurasi terverifikasi', () => {
  test('Kartu kurasi terverifikasi bersumber https diterima; daftar event menampilkan sumber, judul, dan isinya', async () => {
    const a = await akun('7');
    const r = await buatEvent(a.token, { mapel_id: MAPEL, kartu_id: K.sah });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    assert.deepEqual(r.json.data.materi, {
      tersedia: true,
      jenis: 'kurasi',
      judul: `Materi ${K.sah}`,
      isi: 'Isi materi kurasi uji',
      sumber_nama: 'Sumber Uji 076b',
    });
    const [e] = (await daftarEvent(a.token)).json.data;
    assert.deepEqual(e.materi, r.json.data.materi);
    const milik = await kartuSendiri(a.token);
    const m = (await buatEvent(a.token, { kartu_id: milik })).json.data.materi;
    assert.deepEqual(m, { tersedia: true, jenis: 'milik', judul: 'Kartu milik uji 076b' });
  });

  test('Kurasi belum terverifikasi / tanpa tanggal periksa / http / tanpa penyedia / mitra / dihapus, dan kartu akun lain → 400 KARTU_TIDAK_SAH (POST & PATCH)', async () => {
    const a = await akun('8');
    const b = await akun('9');
    const kartuB = await kartuSendiri(b.token);
    const e = (await buatEvent(a.token, {})).json.data;
    for (const kartu_id of [K.belum, K.tanpaTanggal, K.http, K.tanpaPenyedia, K.mitra, K.dihapus, kartuB]) {
      const r = await buatEvent(a.token, { kartu_id });
      assert.equal(r.status, 400, kartu_id);
      assert.equal(r.json.galat.kode, 'KARTU_TIDAK_SAH', kartu_id);
      const u = await panggil('PATCH', `/pengguna/event/${e.id}`, a.token, { kartu_id });
      assert.equal(u.json.galat?.kode, 'KARTU_TIDAK_SAH', `PATCH ${kartu_id}`);
    }
    assert.equal((await daftarEvent(a.token)).json.data.length, 1, 'tidak ada event baru yang tersimpan');
    assert.equal((await barisEvent(e.id)).kartu_id, null);
  });

  test('Tautan mati: kurasi dicabut verifikasinya / kartu milik sendiri dihapus → materi { tersedia: false }; kartu_id di DB tetap; isian lain tetap bisa diubah', async () => {
    const a = await akun('9');
    const milik = await kartuSendiri(a.token);
    const eKurasi = (await buatEvent(a.token, { kartu_id: K.cabut })).json.data;
    const eMilik = (await buatEvent(a.token, { kartu_id: milik, tanggal: tgl(6) })).json.data;
    assert.equal(eKurasi.materi.tersedia, true);
    await pool.query("UPDATE kartu SET status_verifikasi = 'belum_diverifikasi', diperiksa_pada = NULL WHERE id = ?", [K.cabut]);
    assert.equal((await panggil('DELETE', `/kartu/${milik}`, a.token)).status, 200);
    const daftar = (await daftarEvent(a.token)).json.data;
    for (const e of daftar) assert.deepEqual(e.materi, { tersedia: false }, e.kartu_id);
    assert.equal((await barisEvent(eKurasi.id)).kartu_id, K.cabut, 'kartu_id tidak diubah');
    assert.equal((await barisEvent(eMilik.id)).kartu_id, milik, 'kartu_id tidak diubah');
    // Mengubah isian lain (app tidak mengirim kartu_id yang tidak diganti) tetap bisa.
    const ubah = await panggil('PATCH', `/pengguna/event/${eKurasi.id}`, a.token, { materi_teks: 'Bab 5' });
    assert.equal(ubah.status, 200);
    assert.deepEqual(ubah.json.data.materi, { tersedia: false });
    // Menghubungkan ulang kartu yang sudah mati ditolak.
    assert.equal((await panggil('PATCH', `/pengguna/event/${eKurasi.id}`, a.token, { kartu_id: K.cabut })).json.galat.kode, 'KARTU_TIDAK_SAH');
  });

  test('pilihan-kartu: hanya kartu milik sendiri + kurasi sah — tanpa kartu akun lain, kurasi tidak sah, atau kartu dihapus', async () => {
    const a = await akun('7');
    const b = await akun('8');
    const milikA = await kartuSendiri(a.token);
    const dihapusA = await kartuSendiri(a.token);
    await panggil('DELETE', `/kartu/${dihapusA}`, a.token);
    const milikB = await kartuSendiri(b.token);
    const r = await panggil('GET', '/pengguna/event/pilihan-kartu', a.token);
    assert.equal(r.status, 200);
    const ids = r.json.data.map((k) => k.id);
    assert.ok(ids.includes(milikA));
    assert.ok(ids.includes(K.sah));
    for (const tidak of [dihapusA, milikB, K.belum, K.tanpaTanggal, K.http, K.tanpaPenyedia, K.mitra, K.dihapus]) {
      assert.ok(!ids.includes(tidak), `tidak boleh ada: ${tidak}`);
    }
    // Kartu kurasi belum terverifikasi dari benih juga tidak pernah muncul.
    const [belumBenih] = await pool.query("SELECT id FROM kartu WHERE sumber = 'resmi' AND status_verifikasi <> 'terverifikasi'");
    assert.ok(belumBenih.every((k) => !ids.includes(k.id)));
    assert.deepEqual(r.json.data.find((k) => k.id === K.sah), { id: K.sah, judul: `Materi ${K.sah}`, mapel_id: MAPEL, jenis: 'kurasi', sumber_nama: 'Sumber Uji 076b' });
    assert.deepEqual(r.json.data.find((k) => k.id === milikA), { id: milikA, judul: 'Kartu milik uji 076b', mapel_id: MAPEL, jenis: 'milik', sumber_nama: null });
  });

  test('Layar: kartu dihapus → "Materi ini sudah tidak tersedia." tanpa tombol; kurasi → "Sumber: …" + Buka materi; milik sendiri → Arsip', () => {
    const dasar = { kartu_id: 'k1' };
    assert.deepEqual(ev.tampilanMateri({ ...dasar, materi: { tersedia: false } }), { keterangan: 'Materi ini sudah tidak tersedia.', buka: null });
    assert.deepEqual(ev.tampilanMateri({ ...dasar, materi: null }), { keterangan: 'Materi ini sudah tidak tersedia.', buka: null });
    assert.deepEqual(
      ev.tampilanMateri({ ...dasar, materi: { tersedia: true, jenis: 'kurasi', judul: 'J', isi: 'I', sumber_nama: 'Kemendikdasmen' } }),
      { keterangan: 'Sumber: Kemendikdasmen', buka: 'panel' }
    );
    assert.deepEqual(ev.tampilanMateri({ ...dasar, materi: { tersedia: true, jenis: 'milik', judul: 'J' } }), { keterangan: null, buka: 'arsip' });
    assert.deepEqual(ev.tampilanMateri({ kartu_id: null, materi: null }), { keterangan: null, buka: null });
    // Layar hanya memakai keputusan itu: tombol Buka materi HANYA saat buka 'arsip'/'panel'.
    const layar = baca('components', 'screens', 'PersiapanEvent.tsx');
    assert.ok(layar.includes('{materi.keterangan ? <Text style={materi.buka ? s.sumber : s.tidakTersedia}>{materi.keterangan}</Text> : null}'));
    assert.equal((layar.match(/label=\{TEKS_EVENT\.bukaMateri\}/g) || []).length, 1);
    assert.ok(layar.includes("{materi.buka === 'arsip' ? ("));
    assert.ok(layar.includes("{materi.buka === 'panel' ? ("));
    assert.ok(layar.includes('if (!awal || kartuId !== awal.kartu_id) isi.kartu_id = kartuId;'), 'kartu_id yang tidak diganti tidak dikirim ulang');
  });

  test('Benih kartu kurasi membawa penyedia & url_sumber dari JSON; mengubahnya mereset tanda verifikasi', async () => {
    const berkas = (ubah = {}) => ({
      pemilik: 'tim',
      asal: 'uji',
      data: [{ id: BENIH.id, mapel_id: MAPEL, judul: 'Benih 076b', isi: 'Isi', sumber: 'resmi', penyedia: 'Kemendikdasmen', url_sumber: 'https://contoh.invalid/a', dibuat_pada: BENIH.dibuat_pada, ...ubah }],
    });
    const baris = async () => (await pool.query('SELECT penyedia, url_sumber, status_verifikasi, diperiksa_pada FROM kartu WHERE id = ?', [BENIH.id]))[0][0];
    await benihArsipKartu(berkas());
    assert.deepEqual(
      { ...(await baris()), diperiksa_pada: null },
      { penyedia: 'Kemendikdasmen', url_sumber: 'https://contoh.invalid/a', status_verifikasi: 'belum_diverifikasi', diperiksa_pada: null }
    );
    await pool.query("UPDATE kartu SET status_verifikasi = 'terverifikasi', diperiksa_pada = '2026-10-01' WHERE id = ?", [BENIH.id]);
    await benihArsipKartu(berkas());
    assert.equal((await baris()).status_verifikasi, 'terverifikasi', 'isi sama → tanda tetap');
    await benihArsipKartu(berkas({ url_sumber: 'https://contoh.invalid/b' }));
    assert.deepEqual(await baris(), { penyedia: 'Kemendikdasmen', url_sumber: 'https://contoh.invalid/b', status_verifikasi: 'belum_diverifikasi', diperiksa_pada: null });
  });
});

describe('LANJUT_076b §B, §F: halaman Daftar Periksa SMP dan kartu Beranda', () => {
  test('Daftar Periksa kelas 7–9 tidak memuat "kelas 12" atau "Versi untuk kelas 7"', () => {
    const terlarang = /kelas 12|Versi untuk kelas/i;
    for (const kelas of ['7', '8', '9']) {
      const t = teksDaftarPeriksaBukanKelas12(kelas);
      assert.ok(t, `kelas ${kelas} harus mendapat kalimat netral, bukan placeholder kelas 12`);
      assert.ok(!terlarang.test(t), t);
    }
    // Placeholder kelas 12 hanya dirender bila tidak ada kalimat netral (akun tanpa kelas).
    const layar = baca('components', 'screens', 'DaftarPeriksaScreen.tsx');
    const bukan12 = layar.slice(layar.indexOf('function DaftarPeriksaBukanKelas12'), layar.indexOf('function DaftarPeriksaKelas12'));
    assert.ok(bukan12.includes('{teksNetral ? <Text style={gaya.teksBody}>{teksNetral}</Text> : <BukanKelas12 />}'));
    // Semua kode yang dirender di halaman SMP (tanpa komentar): layar bukan-12, butir pribadi,
    // Persiapan Event, plus semua teks event dan label jenis.
    const pribadi = layar.slice(layar.indexOf('function useAksiButir'), layar.indexOf('// .keping'));
    const tanpaKomentar = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const [nama, kode] of [
      ['DaftarPeriksaBukanKelas12', bukan12],
      ['ButirPribadiSaja', pribadi],
      ['PersiapanEvent.tsx', baca('components', 'screens', 'PersiapanEvent.tsx')],
    ]) {
      assert.ok(!terlarang.test(tanpaKomentar(kode)), `${nama} memuat teks kelas 12`);
    }
    for (const t of [...Object.values(ev.TEKS_EVENT), ...ev.pilihanJenis('9').map((p) => p.label)]) {
      assert.ok(!terlarang.test(t), `teks halaman SMP: ${t}`);
    }
  });

  test('Kartu "Persiapan Terdekat" hanya SMP; kelas 10–12 tanpa kartu dan tanpa ruang kosong; label jenis SMP', () => {
    for (const k of ['7', '8', '9']) {
      assert.equal(ev.untukPersiapanEvent(k), true);
      const u = beranda.urutanBeranda({ kelas: k, tampilMulaiDariSini: false, tampilPersiapan: true });
      assert.equal(u.indexOf('persiapan'), u.indexOf('progres') + 1);
    }
    for (const k of ['10', '11', '12']) {
      assert.equal(ev.untukPersiapanEvent(k), false);
      const u = beranda.urutanBeranda({ kelas: k, tampilMulaiDariSini: false, tampilPersiapan: true });
      assert.deepEqual(u, beranda.urutanBeranda({ kelas: k, tampilMulaiDariSini: false }), `kelas ${k}`);
    }
    const linimasa = baca('components', 'screens', 'LinimasaScreen.tsx');
    assert.ok(linimasa.includes('const jenis = labelJenis(event.jenis);'));
    // Logika 7 hari sampai hari H tidak berubah.
    assert.equal(ev.HARI_PENGINGAT, 7);
  });

  test('Tidak ada kode yang mengambil apa pun dari internet di fitur ini (server, app, migrasi)', () => {
    const berkas = [
      'server/src/modul/event-sekolah/event-sekolah.layanan.js',
      'server/src/modul/event-sekolah/event-sekolah.repo.js',
      'server/src/modul/event-sekolah/event-sekolah.rute.js',
      'server/src/modul/event-sekolah/event-sekolah.skema.js',
      'server/src/db/migrasi/020_event_sekolah.sql',
      'server/src/db/migrasi/021_event_sekolah_jenis_smp.sql',
      'lib/eventSekolah.ts',
      'hooks/useEventSekolah.ts',
      'components/screens/PersiapanEvent.tsx',
    ];
    const pola = [/\bfetch\s*\(/, /https?:\/\/[a-z0-9]/i, /\bcurl\b/i, /\baxios\b/, /XMLHttpRequest/, /require\(['"]https?['"]\)/, /Linking\.openURL/, /WebView/];
    for (const b of berkas) {
      const isi = baca(...b.split('/'));
      for (const p of pola) assert.ok(!p.test(isi), `${b} memuat ${p}`);
    }
    // Satu-satunya panggilan jaringan app = API LANJUT sendiri lewat apiFetch dengan jalur relatif.
    const hook = baca('hooks', 'useEventSekolah.ts');
    for (const m of hook.matchAll(/apiFetch<[^>]+>\(\s*([`'])([^`']+)\1/g)) assert.ok(m[2].startsWith('/pengguna/event'), m[2]);
  });

  test('Teks 076b tercatat DRAF di salinan §4.4 dan panduan tim konten ada', () => {
    const sumber = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'), 'utf8');
    const awal = sumber.indexOf('**LANJUT_App (LANJUT_076b)');
    assert.ok(awal > sumber.indexOf('### 4.4 Daftar Periksa') && awal < sumber.indexOf('### 4.5 Arsip Belajar'), 'blok LANJUT_076b di §4.4');
    const blok = sumber.slice(awal, sumber.indexOf('### 4.5 Arsip Belajar'));
    assert.match(blok.slice(0, blok.indexOf('\n\n')), /\bDRAF\b/);
    const T = ev.TEKS_EVENT;
    // Teks baru → blok LANJUT_076b.
    for (const t of [T.materiTidakTersedia, T.awalanSumber, T.tutupMateri, T.bukaMateri, teksDaftarPeriksaBukanKelas12('7')]) {
      assert.ok(blok.includes(t), `belum tercatat di blok 076b: ${t}`);
    }
    // Teks yang diubah → diperbarui di tempat di blok LANJUT_076 (dengan catatan "sebelumnya").
    const blok076 = sumber.slice(sumber.indexOf('**LANJUT_App (LANJUT_076)'), awal);
    assert.match(blok076.slice(0, blok076.indexOf('\n\n')), /\bDRAF\b/);
    for (const t of [T.pengantar, T.labelKartu, T.kartuKosong, T.galatKartu, ...ev.pilihanJenis('9').map((p) => p.label)]) {
      assert.ok(blok076.includes(t), `belum tercatat di blok 076: ${t}`);
    }
    for (const lama of ['Catat ujian atau ulangan yang akan datang, lengkap dengan mapel dan materinya.', 'Belum ada kartu Arsip untuk pilihan ini.']) {
      assert.ok(blok076.includes(`sebelumnya "${lama}"`), `teks lama tidak dicatat sebagai "sebelumnya": ${lama}`);
    }
    const panduan = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'verifikasi', 'panduan-materi-sumber-resmi.md'), 'utf8');
    for (const wajib of [/situs resmi pemerintah/i, /URL/, /tanggal akses/i, /tidak dipublikasikan/i, /hak cipta/i, /syarat penggunaan/i, /--ya/, /tanyakan PM/i]) {
      assert.match(panduan, wajib);
    }
  });
});
