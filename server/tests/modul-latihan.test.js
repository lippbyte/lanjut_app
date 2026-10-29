// tests/modul-latihan.test.js
// Modul yang diunggah ikut menjadi bahan Latihan, jadi ikut dihitung Level-In
// (15 Okt 2026 — pilihan percakapan, belum disetujui PM).
//   - logika murni app (lib/latihan.ts) lewat muat-ts-app.js;
//   - GET /modul/latihan, saran harian, dan ringkasan Level-In lewat HTTP ke basis data uji.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const { muatModulApp } = require('./muat-ts-app');
const { POTONGAN_LATIHAN_PER_MAPEL } = require('../src/modul/modul/modul.layanan');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8');
const latihan = muatModulApp('lib/latihan');

const kartu = (id, mapel_id, jawaban = null) => ({
  id, pemilik_id: 'u', mapel_id, judul: `Judul ${id}`, isi: `Isi ${id}`, jawaban,
  sumber: 'pengguna', penyedia: null, dibuat_pada: '', diubah_pada: '',
});
const potongan = (modul_id, urutan, mapel_id, isi = 'Fotosintesis terjadi di kloroplas daun. Cahaya diubah menjadi energi kimia.') => ({
  modul_id, judul: `Modul ${modul_id}`, mapel_id, urutan, jumlah_bagian: 5, isi,
});

describe('lib/latihan: potongan modul sebagai butir Latihan', () => {
  test('potongan → butir Catatan dari modul: tanpa kartu, isyarat kalimat awal, isi utuh, bagian ke-n', () => {
    const b = latihan.itemDariPotongan(potongan('m1', 2, 'biologi'));
    assert.equal(b.kartuId, null);
    assert.equal(b.soal, false);
    assert.equal(b.mapelId, 'biologi');
    assert.equal(b.isyarat, 'Fotosintesis terjadi di kloroplas daun.');
    assert.ok(b.isi.endsWith('energi kimia.'));
    assert.deepEqual(b.modul, { judul: 'Modul m1', bagian: 3, jumlahBagian: 5 });
    assert.equal(b.kunci, 'modul:m1:2');
  });

  test('kartu tetap seperti dulu: Soal = isi di depan, jawaban dibuka; Catatan = isi dibuka', () => {
    const soal = latihan.itemDariKartu(kartu('k1', 'fisika', 'Jawab'));
    assert.deepEqual([soal.soal, soal.isyarat, soal.isi, soal.kartuId, soal.modul], [true, 'Isi k1', 'Jawab', 'k1', null]);
    const cat = latihan.itemDariKartu(kartu('k2', 'fisika'));
    assert.deepEqual([cat.soal, cat.isyarat, cat.isi], [false, null, 'Isi k2']);
  });

  test('isyarat: kalimat pertama yang cukup panjang; teks tanpa titik dipotong di batas kata ≤ 160 huruf', () => {
    assert.equal(latihan.isyaratPotongan('Bab 2. Sel adalah unit terkecil kehidupan. Lanjut.'), 'Bab 2. Sel adalah unit terkecil kehidupan.');
    const panjang = 'kata '.repeat(80);
    const i = latihan.isyaratPotongan(panjang);
    assert.ok(i.length <= 161 && i.endsWith('…'), i);
    assert.ok(!/\s…$/.test(i));
    assert.equal(latihan.isyaratPotongan('  Pendek\n\nsaja  '), 'Pendek saja');
  });

  test('bahan & antrian: kartu sendiri + potongan, disaring mapel; kurasi tidak ikut', () => {
    const k = [kartu('k1', 'biologi'), kartu('k2', 'fisika'), { ...kartu('r1', 'biologi'), sumber: 'resmi' }];
    const p = [potongan('m1', 0, 'biologi'), potongan('m1', 1, 'biologi'), potongan('m2', 0, 'kimia')];
    assert.deepEqual(latihan.bahanLatihan(k, p, null).map((b) => b.kunci).sort(), ['kartu:k1', 'kartu:k2', 'modul:m1:0', 'modul:m1:1', 'modul:m2:0']);
    assert.deepEqual(latihan.bahanLatihan(k, p, 'biologi').map((b) => b.kunci).sort(), ['kartu:k1', 'modul:m1:0', 'modul:m1:1']);
    const antrian = latihan.susunAntrian(k, p, 'biologi', 2, () => 0);
    assert.equal(antrian.length, 2);
    assert.ok(antrian.every((b) => b.mapelId === 'biologi'));
    // Hanya modul (tanpa kartu sama sekali) tetap bisa dilatih.
    assert.equal(latihan.susunAntrian([], p, null, 12).length, 3);
  });

  test('mapelLatihan: jumlah = kartu sendiri + SEMUA potongan dari server, urut daftar mapel', () => {
    const mapel = [{ id: 'kimia', nama: 'Kimia' }, { id: 'biologi', nama: 'Biologi' }, { id: 'fisika', nama: 'Fisika' }];
    const hasil = latihan.mapelLatihan([kartu('k1', 'biologi'), { ...kartu('r1', 'fisika'), sumber: 'resmi' }], [
      { mapel_id: 'biologi', jumlah: 30 },
      { mapel_id: 'kimia', jumlah: 4 },
      { mapel_id: 'fisika', jumlah: 0 },
    ], mapel);
    assert.deepEqual(hasil, [
      { id: 'kimia', nama: 'Kimia', jumlah: 4 },
      { id: 'biologi', nama: 'Biologi', jumlah: 31 },
    ]);
  });

  test('jumlahBahan: satu mapel atau semua', () => {
    const per = [{ id: 'kimia', jumlah: 4 }, { id: 'biologi', jumlah: 31 }];
    assert.equal(latihan.jumlahBahan(per, null), 35);
    assert.equal(latihan.jumlahBahan(per, 'biologi'), 31);
    assert.equal(latihan.jumlahBahan(per, 'fisika'), 0);
  });

  test('catatan jawaban: kartu → kartu_id; potongan modul → mapel_id tanpa kartu_id', () => {
    const dasar = { id: 'c', sesi_id: 's', benar: true, waktu: 'w' };
    assert.deepEqual(latihan.catatanJawaban(latihan.itemDariKartu(kartu('k1', 'fisika')), dasar), { ...dasar, kartu_id: 'k1' });
    const c = latihan.catatanJawaban(latihan.itemDariPotongan(potongan('m1', 0, 'biologi')), { ...dasar, keyakinan: 4 });
    assert.deepEqual(c, { ...dasar, keyakinan: 4, mapel_id: 'biologi' });
    assert.ok(!('kartu_id' in c));
  });

  test('layar Latihan memakai bahan modul dan catatanJawaban; contoh server = satu sesi penuh', () => {
    const layar = baca('components', 'screens', 'LatihanScreen.tsx');
    assert.match(layar, /const modulQuery = useModulLatihan\(\);/);
    assert.match(layar, /susunAntrian\(kartu, potongan, mapelId, batas\)/);
    assert.match(layar, /catatanJawaban\(k, \{/);
    assert.doesNotMatch(layar, /kartu_id: k\.id/);
    assert.equal(POTONGAN_LATIHAN_PER_MAPEL, latihan.BATAS_SESI);
  });
});

describe('server: modul jadi bahan Latihan & Level-In', () => {
  let server;
  let baseUrl;

  before(async () => {
    server = await nyalakanServer();
    baseUrl = urlDari(server);
  });
  after(async () => {
    await new Promise((r) => server.close(r));
    await pool.end();
  });

  const akun = async () => {
    const { json } = await daftarPenggunaBaru(baseUrl);
    return { id: json.data.pengguna.id, token: json.data.token };
  };
  const panggil = async (metode, p, token, body) => {
    const res = await fetch(`${baseUrl}/api/v1${p}`, {
      method: metode,
      headers: { Authorization: `Bearer ${token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: res.status, json: await res.json() };
  };
  // Teks panjang berparagraf → banyak potongan (±800–1.200 karakter per potongan).
  const teksPanjang = (topik, paragraf) =>
    Array.from({ length: paragraf }, (_, i) =>
      Array.from({ length: 6 }, (_, j) => `Kalimat ${i}-${j} tentang ${topik} yang dipelajari di bab ${i + 1}.`).join(' ')
    ).join('\n\n');
  const unggah = (token, mapel_id, teks, judul = 'Modul uji latihan') => panggil('POST', '/modul', token, { judul, mapel_id, teks });
  const jumlahPotonganDb = async (penggunaId) =>
    Number((await pool.query('SELECT COUNT(*) AS n FROM potongan_modul WHERE pengguna_id = ?', [penggunaId]))[0][0].n);

  test('GET /modul/latihan: jumlah per mapel = semua potongan; contoh acak paling banyak satu sesi per mapel; milik sendiri saja', async () => {
    const a = await akun();
    const b = await akun();
    assert.equal((await unggah(a.token, 'biologi', teksPanjang('fotosintesis', 40))).status, 201);
    assert.equal((await unggah(a.token, 'kimia', teksPanjang('ikatan ion', 3), 'Kimia singkat')).status, 201);

    const { status, json } = await panggil('GET', '/modul/latihan', a.token);
    assert.equal(status, 200, JSON.stringify(json));
    const per = Object.fromEntries(json.data.per_mapel.map((m) => [m.mapel_id, m.jumlah]));
    assert.equal(per.biologi + per.kimia, await jumlahPotonganDb(a.id));
    assert.ok(per.biologi > POTONGAN_LATIHAN_PER_MAPEL, `biologi ${per.biologi} potongan`);
    const contohBio = json.data.potongan.filter((p) => p.mapel_id === 'biologi');
    const contohKimia = json.data.potongan.filter((p) => p.mapel_id === 'kimia');
    assert.equal(contohBio.length, POTONGAN_LATIHAN_PER_MAPEL);
    assert.equal(contohKimia.length, per.kimia);
    assert.equal(new Set(contohBio.map((p) => p.urutan)).size, contohBio.length, 'tanpa potongan ganda');
    for (const p of json.data.potongan) {
      assert.ok(p.isi.length > 0 && p.judul && p.modul_id);
      assert.ok(p.urutan >= 0 && p.urutan < p.jumlah_bagian);
    }

    // Akun lain: tidak melihat modul akun A.
    const lain = await panggil('GET', '/modul/latihan', b.token);
    assert.deepEqual(lain.json.data, { per_mapel: [], potongan: [] });
  });

  test('akun yang hanya punya modul tidak lagi "arsip kosong" di saran harian', async () => {
    const a = await akun();
    // Mapel tanpa kartu kurasi tidak bisa dipastikan di basis data uji bersama, jadi yang dicek: sesudah
    // unggah, mapel modul punya bahan → saran bukan arsip_kosong.
    assert.equal((await unggah(a.token, 'sosiologi', teksPanjang('interaksi sosial', 4))).status, 201);
    const { json } = await panggil('GET', '/saran-harian', a.token);
    assert.notEqual(json.data.jenis, 'arsip_kosong', JSON.stringify(json.data));
  });

  test('jawaban potongan modul (mapel_id, tanpa kartu_id) dihitung di Level-In mapel itu', async () => {
    const a = await akun();
    assert.equal((await unggah(a.token, 'geografi', teksPanjang('iklim tropis', 6))).status, 201);
    const [[konfig]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'level_minimum_kartu'");
    const minimum = konfig ? Number(konfig.nilai) : 10;

    const sesiId = crypto.randomUUID();
    const mulai = await panggil('POST', '/sesi-latihan', a.token, {
      id: sesiId, dimulai_pada: new Date().toISOString(), asal_mula: 'arsip', jumlah_kartu_direncanakan: minimum, mapel_fokus_id: 'geografi',
    });
    assert.equal(mulai.status, 201, JSON.stringify(mulai.json));
    const catatan = Array.from({ length: minimum }, (_, i) => ({
      id: crypto.randomUUID(), sesi_id: sesiId, mapel_id: 'geografi', benar: i > 0, waktu: new Date(Date.now() - (minimum - i) * 1000).toISOString(),
    }));
    const simpan = await panggil('POST', '/riwayat-latihan', a.token, catatan);
    assert.ok(simpan.status < 300, JSON.stringify(simpan.json));

    const { json } = await panggil('GET', '/kalibrasi/ringkasan', a.token);
    const geo = json.data.find((r) => r.mapel_id === 'geografi');
    assert.equal(geo.level_akurasi.kartu_dijawab, minimum);
    assert.equal(geo.level_akurasi.n_benar, minimum - 1);
    assert.notEqual(geo.level_akurasi.level, 'belum_cukup_data');
  });

  test('modul dihapus → tidak ada lagi bahan Latihan dari modul itu', async () => {
    const a = await akun();
    const up = await unggah(a.token, 'ekonomi', teksPanjang('inflasi', 3));
    assert.equal(up.status, 201);
    assert.equal((await panggil('DELETE', `/modul/${up.json.data.id}`, a.token)).status, 200);
    const { json } = await panggil('GET', '/modul/latihan', a.token);
    assert.deepEqual(json.data, { per_mapel: [], potongan: [] });
  });
});
