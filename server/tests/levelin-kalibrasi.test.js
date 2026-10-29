// Uji HTTP Level-In (LANJUT_042): /kalibrasi/ringkasan, /saran-harian,
// /konfigurasi/levelin, dan POST /riwayat-latihan dengan keyakinan — semuanya
// dulu 500 karena keputusan.js masih stub.
//
// Data dibuat lewat jalur F7 (kartu sendiri → sesi → riwayat). Butuh benih
// (npm run benih) untuk tabel mapel & konfigurasi_levelin.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');

let server;
let baseUrl;
let jumlahMapel;

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const id = () => crypto.randomUUID();

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const [[m]] = await pool.query('SELECT COUNT(*) AS n FROM mapel');
  jumlahMapel = Number(m.n);
  const [[k]] = await pool.query("SELECT COUNT(*) AS n FROM konfigurasi_levelin WHERE kunci LIKE 'level\\_%'");
  assert.ok(Number(k.n) === 3, 'konfigurasi_levelin belum berisi kunci level_* (npm run benih)');
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

async function panggil(metode, path, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method: metode,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

async function akunBaru() {
  const { status, json } = await daftarPenggunaBaru(baseUrl);
  assert.equal(status, 201);
  return json.data.token;
}

/** Jawab `benar` + `salah` kartu di satu mapel lewat jalur F7. `keyakinan` opsional per jawaban. */
async function jawab(token, mapel, benar, salah, keyakinan) {
  const kartu = await panggil('POST', '/kartu', token, { mapel_id: mapel, judul: `Kartu ${mapel}`, isi: 'Soal?' });
  assert.equal(kartu.status, 201);
  const sesiId = id();
  const mulai = await panggil('POST', '/sesi-latihan', token, {
    id: sesiId, dimulai_pada: new Date().toISOString(), mapel_fokus_id: mapel, asal_mula: 'arsip', jumlah_kartu_direncanakan: benar + salah,
  });
  assert.equal(mulai.status, 201);
  const waktu = Date.now();
  const catatan = [
    ...Array.from({ length: benar }, () => true),
    ...Array.from({ length: salah }, () => false),
  ].map((b, i) => ({
    id: id(),
    sesi_id: sesiId,
    kartu_id: kartu.json.data.id,
    benar: b,
    waktu: new Date(waktu + i * 1000).toISOString(),
    ...(keyakinan ? { keyakinan: keyakinan(b, i) } : {}),
  }));
  const res = await panggil('POST', '/riwayat-latihan', token, catatan);
  assert.equal(res.status, 201, JSON.stringify(res.json));
  return catatan;
}

async function mapelKurasiTerverifikasi() {
  const [baris] = await pool.query(
    `SELECT DISTINCT mapel_id FROM kartu
      WHERE sumber = 'resmi' AND status_verifikasi = 'terverifikasi' AND diperiksa_pada IS NOT NULL AND dihapus_pada IS NULL`
  );
  return baris.map((b) => b.mapel_id);
}

/**
 * Saran untuk akun TANPA kartu sendiri: arsip_kosong, atau pengguna_baru ke
 * mapel yang punya kurasi terverifikasi. Tes lain (kartu-kurasi) menyisipkan
 * kurasi terverifikasi sementara secara paralel, jadi keduanya sah — yang
 * tidak sah hanyalah saran ke mapel tanpa kartu yang boleh dipakai akun ini.
 */
async function cekSaranTanpaKartuSendiri(token, mapelTerlarang = []) {
  const sebelum = await mapelKurasiTerverifikasi();
  const { status, json } = await panggil('GET', '/saran-harian', token);
  const sesudah = await mapelKurasiTerverifikasi();
  assert.equal(status, 200);
  const s = json.data;
  assert.equal(s.alasan, null);
  if (s.jenis === 'arsip_kosong') {
    assert.equal(s.mapel_id, null);
  } else {
    assert.equal(s.jenis, 'pengguna_baru', JSON.stringify(s));
    assert.ok([...sebelum, ...sesudah].includes(s.mapel_id), `saran ke ${s.mapel_id} tanpa kartu yang sah`);
  }
  assert.equal(mapelTerlarang.includes(s.mapel_id), false, `saran ke mapel milik akun lain: ${s.mapel_id}`);
}

async function ringkasan(token, query = '') {
  const { status, json } = await panggil('GET', `/kalibrasi/ringkasan${query}`, token);
  assert.equal(status, 200, JSON.stringify(json));
  return Object.fromEntries(json.data.map((r) => [r.mapel_id, r]));
}

test('tanpa token → 401 untuk ringkasan & saran; konfigurasi publik berisi 11 kunci', async () => {
  for (const path of ['/kalibrasi/ringkasan', '/saran-harian']) {
    const { status, json } = await panggil('GET', path);
    assert.equal(status, 401, path);
    assert.equal(json.galat.kode, 'TIDAK_MASUK');
  }
  const { status, json } = await panggil('GET', '/konfigurasi/levelin');
  assert.equal(status, 200);
  assert.deepEqual(Object.keys(json.data).sort(), [
    'akses_ringkasan_kalibrasi_sesi', 'akses_tampilan_agregat_mapel', 'ambang_overconfident', 'aturan_versi',
    'jendela_per_mapel', 'keyakinan_rendah_maksimal', 'keyakinan_tinggi_minimal', 'level_batas_atas',
    'level_batas_bawah', 'level_minimum_kartu', 'minimum_kartu',
  ]);
  assert.equal(json.data.level_minimum_kartu.nilai, '10');
  assert.equal(json.data.akses_tampilan_agregat_mapel.nilai, 'gratis');
  assert.ok(json.data.level_batas_bawah.dasar.includes('LANJUT_042'));
});

test('akun baru: ringkasan 200 dengan SEMUA mapel eksplisit belum_cukup_data; saran 200 tanpa kalibrasi', async () => {
  const token = await akunBaru();
  const { status, json } = await panggil('GET', '/kalibrasi/ringkasan', token);
  assert.equal(status, 200);
  assert.equal(json.data.length, jumlahMapel);
  for (const r of json.data) {
    assert.equal(r.kartu_dikerjakan, 0);
    assert.equal(r.status_data, 'belum_cukup_data');
    assert.equal(r.pola, 'belum_cukup_data');
    assert.equal(r.rate_overconfident, null);
    assert.deepEqual(r.level_akurasi, { kartu_dijawab: 0, n_benar: 0, rate_benar: null, level: 'belum_cukup_data' });
    assert.match(r.dihitung_pada, ISO);
    assert.equal(typeof r.konfig_versi, 'number');
  }
  await cekSaranTanpaKartuSendiri(token);
});

test('riwayat F7 tanpa keyakinan: level akurasi sesuai tabel; < 10 jawaban → belum_cukup_data', async () => {
  const token = await akunBaru();
  await jawab(token, 'fisika', 9, 0); // 9 jawaban
  await jawab(token, 'biologi', 8, 2); // 80%
  await jawab(token, 'kimia', 5, 5); // tepat 50%
  await jawab(token, 'ekonomi', 3, 7); // 30%
  await jawab(token, 'geografi', 15, 5); // tepat 75%
  const r = await ringkasan(token);

  assert.equal(r.fisika.level_akurasi.level, 'belum_cukup_data');
  assert.equal(r.fisika.level_akurasi.kartu_dijawab, 9);
  assert.equal(r.biologi.level_akurasi.level, 'sudah_kuat');
  assert.equal(r.kimia.level_akurasi.level, 'cukup_lanjut_latihan');
  assert.equal(r.ekonomi.level_akurasi.level, 'perlu_penguatan_dasar');
  assert.equal(r.geografi.level_akurasi.level, 'cukup_lanjut_latihan');
  assert.equal(r.biologi.level_akurasi.n_benar, 8);
  assert.equal(r.biologi.level_akurasi.rate_benar, 0.8);

  // Kalibrasi keyakinan (logika PWA) tidak menghitung jawaban tanpa keyakinan.
  for (const m of ['fisika', 'biologi', 'kimia']) {
    assert.equal(r[m].kartu_dikerjakan, 0);
    assert.equal(r[m].pola, 'belum_cukup_data');
  }

  // Saran mengikuti rantai PWA: tanpa keyakinan tidak ada "riwayat" kalibrasi,
  // jadi jenisnya pengguna_baru — mapel pertama (abjad) yang punya kartu.
  const saran = await panggil('GET', '/saran-harian', token);
  assert.equal(saran.status, 200);
  assert.deepEqual(saran.json.data, { jenis: 'pengguna_baru', mapel_id: 'biologi', alasan: null });
});

test('riwayat DENGAN keyakinan: 201 (dulu 500), gap dihitung server; pola overconfident → saran', async () => {
  const token = await akunBaru();
  // 5 kali yakin 5 tapi salah, 3 kali yakin 4 dan benar → 8 dikerjakan, rate OC 5/8.
  const catatan = await jawab(token, 'matematika', 3, 5, (benar) => (benar ? 4 : 5));

  const [baris] = await pool.execute(
    'SELECT gap_numerik, kelas_gap, aturan_versi FROM riwayat_latihan WHERE id = ?',
    [catatan[catatan.length - 1].id]
  );
  assert.equal(Number(baris[0].gap_numerik), 1);
  assert.equal(baris[0].kelas_gap, 'overconfident');
  assert.equal(baris[0].aturan_versi, 1);

  const r = await ringkasan(token);
  assert.equal(r.matematika.kartu_dikerjakan, 8);
  assert.equal(r.matematika.n_overconfident, 5);
  assert.equal(r.matematika.n_selaras, 3);
  assert.equal(r.matematika.rate_overconfident, 0.625);
  assert.equal(r.matematika.status_data, 'cukup_data');
  assert.equal(r.matematika.pola, 'overconfident');
  assert.equal(r.matematika.level_akurasi.level, 'belum_cukup_data', '8 < 10 jawaban');

  const saran = await panggil('GET', '/saran-harian', token);
  assert.deepEqual(saran.json.data, {
    jenis: 'saran',
    mapel_id: 'matematika',
    alasan: { rate_overconfident: 0.625, kartu_dikerjakan: 8 },
  });
});

test('?jendela= menimpa jendela_per_mapel; nilai tak sah → 400', async () => {
  const token = await akunBaru();
  await jawab(token, 'matematika', 3, 5, (benar) => (benar ? 4 : 5));
  const r = await ringkasan(token, '?jendela=3');
  assert.equal(r.matematika.kartu_dikerjakan, 3);
  for (const q of ['?jendela=0', '?jendela=500', '?jendela=abc']) {
    assert.equal((await panggil('GET', `/kalibrasi/ringkasan${q}`, token)).status, 400, q);
  }
});

test('LINTAS AKUN: ringkasan & saran B tidak terpengaruh riwayat A', async () => {
  const a = await akunBaru();
  const b = await akunBaru();
  await jawab(a, 'biologi', 10, 0);
  await jawab(a, 'ekonomi', 0, 6, () => 5);

  const rb = await ringkasan(b);
  for (const r of Object.values(rb)) {
    assert.equal(r.kartu_dikerjakan, 0, `${r.mapel_id} B ikut menghitung riwayat A`);
    assert.equal(r.level_akurasi.kartu_dijawab, 0, `${r.mapel_id} level B ikut riwayat A`);
  }
  // Kartu A juga tidak dihitung sebagai ketersediaan B, dan pola A tidak jadi saran B.
  await cekSaranTanpaKartuSendiri(b, ['biologi', 'ekonomi']);

  const ra = await ringkasan(a);
  assert.equal(ra.biologi.level_akurasi.level, 'sudah_kuat');
  assert.equal(ra.ekonomi.pola, 'overconfident');
});

test('ambang dibaca dari tabel konfigurasi_levelin (bukan angka di kode)', async () => {
  const token = await akunBaru();
  await jawab(token, 'fisika', 9, 0);
  assert.equal((await ringkasan(token)).fisika.level_akurasi.level, 'belum_cukup_data');

  const [[lama]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'level_minimum_kartu'");
  try {
    await pool.query("UPDATE konfigurasi_levelin SET nilai = '9' WHERE kunci = 'level_minimum_kartu'");
    assert.equal((await ringkasan(token)).fisika.level_akurasi.level, 'sudah_kuat');
  } finally {
    await pool.query("UPDATE konfigurasi_levelin SET nilai = ? WHERE kunci = 'level_minimum_kartu'", [lama.nilai]);
  }
});
