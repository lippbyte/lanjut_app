// tests/latihan-berikutnya.test.js
// Pengujian otomatis LANJUT_077:
// - kartu "Latihan berikutnya" di Beranda dari saran harian 042 (GET /saran-harian,
//   dihitung server dari jawaban berkeyakinan): tidak tampil di bawah ambang, tampil
//   tepat di ambang, ambang dibaca dari konfigurasi_levelin, data akun lain tidak
//   ikut, gagal dimuat → tidak tampil, tanpa panggilan AI / ke luar
// - posisi di Beranda (sesudah grid, sebelum Info Penting) dan tujuan "Mulai latihan"
// - teks Data Akun SMP tanpa "kelas 12" (§B)
// Ambang TIDAK diubah di basis data (levelin-kalibrasi.test.js berjalan paralel dan
// bergantung padanya): pembacaan baris konfigurasi_levelin dipalsukan lewat t.mock.
// Mapel ekonomi/informatika: tidak dipakai fixture kartu kurasi tes lain.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const { muatModulApp } = require('./muat-ts-app');
const levelinRepo = require('../src/modul/levelin/levelin.repo');
const penyediaAi = require('../src/modul/ngobrol/penyedia-ai');

const AKAR_APP = path.join(__dirname, '..', '..');
const AKAR_REPO = path.join(AKAR_APP, '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const levelin = muatModulApp('lib/levelin');
const beranda = muatModulApp('lib/beranda');
const jenjangSaya = muatModulApp('lib/jenjangSaya');

const MAPEL = 'ekonomi';
const MAPEL_LAIN = 'informatika';
const id = () => crypto.randomUUID();

let server;
let baseUrl;
let minimumKartu; // ambang kalibrasi yang berlaku di konfigurasi_levelin

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const [[b]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'minimum_kartu'");
  assert.ok(b, 'konfigurasi_levelin belum berisi minimum_kartu (npm run benih)');
  minimumKartu = Number(b.nilai);
  assert.ok(Number.isInteger(minimumKartu) && minimumKartu >= 2, `minimum_kartu tidak sah: ${b.nilai}`);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

async function panggil(metode, jalur, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${jalur}`, {
    method: metode,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

async function akun(kelas = '7') {
  const { status, json } = await daftarPenggunaBaru(baseUrl, { kelas, ...(['10', '11', '12'].includes(kelas) ? { jenis_sekolah: 'SMA' } : {}) });
  assert.equal(status, 201, JSON.stringify(json));
  return json.data.token;
}

/** Jawab `n` kartu di satu mapel dengan keyakinan 5 dan jawaban salah (pola "terlalu yakin"), lewat jalur Latihan. */
async function jawabYakinSalah(token, mapel, n) {
  const kartu = await panggil('POST', '/kartu', token, { mapel_id: mapel, judul: `Kartu ${mapel}`, isi: 'Soal?' });
  assert.equal(kartu.status, 201);
  const sesiId = id();
  const mulai = await panggil('POST', '/sesi-latihan', token, {
    id: sesiId, dimulai_pada: new Date().toISOString(), mapel_fokus_id: mapel, asal_mula: 'arsip', jumlah_kartu_direncanakan: n,
  });
  assert.equal(mulai.status, 201);
  const waktu = Date.now();
  const catatan = Array.from({ length: n }, (_, i) => ({
    id: id(), sesi_id: sesiId, kartu_id: kartu.json.data.id, benar: false, keyakinan: 5, waktu: new Date(waktu + i * 1000).toISOString(),
  }));
  const r = await panggil('POST', '/riwayat-latihan', token, catatan);
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return kartu.json.data.id;
}

/** Saran harian akun ini + kartu Beranda yang disusun app darinya. */
async function kartuBeranda(token) {
  const r = await panggil('GET', '/saran-harian', token);
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return { saran: r.json.data, kartu: levelin.latihanBerikutnya(r.json.data) };
}

describe('LANJUT_077 §A: kartu "Latihan berikutnya" dari saran harian (server)', () => {
  test('Di bawah ambang (minimum_kartu − 1 jawaban berkeyakinan) → kartu tidak tampil', async () => {
    const token = await akun('7');
    await jawabYakinSalah(token, MAPEL, minimumKartu - 1);
    const { saran, kartu } = await kartuBeranda(token);
    assert.equal(saran.jenis, 'belum_cukup_data', JSON.stringify(saran));
    assert.equal(kartu, null);
  });

  test('Tepat di ambang (minimum_kartu jawaban) → kartu tampil dengan mapel itu; "Mulai latihan" ke Latihan mapel yang sama', async () => {
    const token = await akun('9');
    await jawabYakinSalah(token, MAPEL, minimumKartu);
    const { saran, kartu } = await kartuBeranda(token);
    assert.equal(saran.jenis, 'saran', JSON.stringify(saran));
    assert.deepEqual(kartu, { mapelId: MAPEL, tujuan: { pathname: '/latihan', params: { mapel: MAPEL, asal: 'saran' } } });
  });

  test('Ambang dibaca dari baris konfigurasi_levelin: minimum_kartu dinaikkan/diturunkan → batas tampil ikut berubah', async (t) => {
    const asli = await levelinRepo.ambilSemuaKonfigurasi();
    assert.ok(asli.some((b) => b.kunci === 'minimum_kartu'));
    const denganMinimum = (n) => asli.map((b) => (b.kunci === 'minimum_kartu' ? { ...b, nilai: String(n) } : b));
    const panggilanKonfig = t.mock.method(levelinRepo, 'ambilSemuaKonfigurasi', async () => denganMinimum(minimumKartu + 3));
    const cukupLama = await akun('8');
    await jawabYakinSalah(cukupLama, MAPEL, minimumKartu);
    assert.equal((await kartuBeranda(cukupLama)).kartu, null, 'ambang dinaikkan: jawaban sebanyak ambang lama belum cukup');
    panggilanKonfig.mock.mockImplementation(async () => denganMinimum(minimumKartu - 1));
    const kurangLama = await akun('11');
    await jawabYakinSalah(kurangLama, MAPEL, minimumKartu - 1);
    assert.equal((await kartuBeranda(kurangLama)).kartu?.mapelId, MAPEL, 'ambang diturunkan: sudah cukup');
    assert.ok(panggilanKonfig.mock.callCount() >= 2, 'saran harian membaca konfigurasi_levelin setiap kali');
  });

  test('Data akun lain tidak ikut: akun A tanpa jawaban cukup tidak mendapat kartu walau akun B sudah cukup; B tidak berubah', async () => {
    const b = await akun('12');
    await jawabYakinSalah(b, MAPEL_LAIN, minimumKartu);
    const a = await akun('7');
    await jawabYakinSalah(a, MAPEL_LAIN, 1);
    const kartuA = await kartuBeranda(a);
    assert.equal(kartuA.kartu, null, JSON.stringify(kartuA.saran));
    assert.equal(kartuA.saran.alasan, null);
    const kartuB = await kartuBeranda(b);
    assert.equal(kartuB.kartu?.mapelId, MAPEL_LAIN);
    assert.equal(kartuB.saran.alasan.kartu_dikerjakan, minimumKartu, 'jawaban A tidak ikut dihitung untuk B');
    // Ringkasan A pun hanya memuat jawabannya sendiri.
    const ringkasA = (await panggil('GET', '/kalibrasi/ringkasan', a)).json.data.find((r) => r.mapel_id === MAPEL_LAIN);
    assert.equal(ringkasA.kartu_dikerjakan, 1);
  });

  test('Endpoint hanya GET milik akun yang masuk: tanpa login 401; metode lain tidak ada', async () => {
    assert.equal((await panggil('GET', '/saran-harian', null)).status, 401);
    const token = await akun('10');
    for (const metode of ['POST', 'PATCH', 'DELETE']) {
      assert.equal((await panggil(metode, '/saran-harian', token, metode === 'DELETE' ? undefined : {})).status, 404, metode);
    }
  });

  test('Tidak ada panggilan AI atau ke luar: penyedia AI tidak dipanggil, fetch hanya ke server uji sendiri', async (t) => {
    const ai = t.mock.method(penyediaAi, 'mintaBalasan', async () => {
      throw new Error('AI tidak boleh dipanggil');
    });
    const fetchAsli = globalThis.fetch;
    const tujuan = [];
    t.mock.method(globalThis, 'fetch', (url, opsi) => {
      tujuan.push(String(url));
      return fetchAsli(url, opsi);
    });
    const token = await akun('7');
    await jawabYakinSalah(token, MAPEL, minimumKartu);
    await kartuBeranda(token);
    assert.equal(ai.mock.callCount(), 0);
    assert.ok(tujuan.length > 0 && tujuan.every((u) => u.startsWith(baseUrl)), JSON.stringify(tujuan));
    // Kode saran (server) dan kartu (app) tidak menyentuh modul AI atau jaringan.
    for (const berkas of ['levelin.layanan.js', 'levelin.repo.js', 'levelin.rute.js', 'keputusan.js', 'konfigurasi.js']) {
      const isi = fs.readFileSync(path.join(__dirname, '..', 'src', 'modul', 'levelin', berkas), 'utf8');
      assert.ok(!/ngobrol|penyedia-ai|openrouter|\bfetch\s*\(/i.test(isi), berkas);
    }
    assert.ok(!/\bfetch\s*\(|openrouter|ngobrol/i.test(baca('lib', 'levelin.ts')));
  });
});

describe('LANJUT_077 §A: kartu di app (lib/levelin.ts, lib/beranda.ts, Beranda)', () => {
  test('Hanya saran satu mapel dari data cukup yang menampilkan kartu; data belum cukup / belum ada → tidak tampil', () => {
    assert.deepEqual(levelin.latihanBerikutnya({ jenis: 'saran', mapel_id: 'kimia', alasan: { rate_overconfident: 1, kartu_dikerjakan: 5 } }), {
      mapelId: 'kimia',
      tujuan: { pathname: '/latihan', params: { mapel: 'kimia', asal: 'saran' } },
    });
    for (const saran of [
      { jenis: 'belum_cukup_data', mapel_id: 'kimia', alasan: null },
      { jenis: 'pengguna_baru', mapel_id: 'kimia', alasan: null },
      { jenis: 'arsip_kosong', mapel_id: null, alasan: null },
      { jenis: 'kalibrasi_selaras', mapel_id: null, alasan: null },
      { jenis: 'saran', mapel_id: null, alasan: null },
      null,
      undefined,
    ]) {
      assert.equal(levelin.latihanBerikutnya(saran), null, JSON.stringify(saran));
    }
    // Tidak ada angka ambang di logika kartu app.
    const kode = baca('lib', 'levelin.ts');
    const fungsi = kode.slice(kode.indexOf('export function latihanBerikutnya'));
    assert.ok(!/\d/.test(fungsi.slice(0, fungsi.indexOf('\n}\n'))), 'angka tetap di latihanBerikutnya');
  });

  test('Posisi: tepat sesudah grid, sebelum Info Penting (kelas 12) atau banner; semua jenjang; tanpa data → tidak ada ruang', () => {
    for (const kelas of ['7', '9', '10', '11', '12']) {
      for (const tampilBanner of [false, true]) {
        const u = beranda.urutanBeranda({ kelas, tampilMulaiDariSini: true, tampilBanner, tampilLatihan: true });
        assert.equal(u.filter((b) => b === 'latihan').length, 1, `kelas ${kelas}`);
        assert.equal(u.indexOf('latihan'), u.indexOf('grid') + 1, `kelas ${kelas}: tepat sesudah grid`);
        if (kelas === '12') assert.equal(u.indexOf('info_penting'), u.indexOf('latihan') + 1, 'sebelum Info Penting');
        else if (tampilBanner) assert.equal(u.indexOf('banner'), u.indexOf('latihan') + 1, 'sebelum banner');
        assert.deepEqual(beranda.urutanBeranda({ kelas, tampilMulaiDariSini: true, tampilBanner }), u.filter((b) => b !== 'latihan'));
      }
    }
    // Bersama kartu Persiapan Terdekat (SMP): persiapan sebelum grid, latihan sesudahnya.
    const smp = beranda.urutanBeranda({ kelas: '8', tampilMulaiDariSini: false, tampilPersiapan: true, tampilLatihan: true });
    assert.deepEqual(smp.slice(smp.indexOf('progres'), smp.indexOf('latihan') + 1), ['progres', 'persiapan', 'grid', 'latihan']);
  });

  test('Beranda: gagal dimuat → tidak tampil; "Mulai latihan" membuka Latihan dengan mapel yang sama', () => {
    const layar = baca('components', 'screens', 'LinimasaScreen.tsx');
    assert.ok(layar.includes('const saranQuery = useSaranHarian();'));
    assert.ok(layar.includes('const latihan = saranQuery.isError ? null : latihanBerikutnya(saranQuery.data);'));
    assert.ok(layar.includes('tampilLatihan: latihan !== null'));
    assert.ok(layar.includes('<KartuLatihanBerikutnya mapelId={latihan.mapelId} onMulai={() => router.push(latihan.tujuan)} />'));
    const kartu = layar.slice(layar.indexOf('function KartuLatihanBerikutnya'));
    const isiKartu = kartu.slice(0, kartu.indexOf('\n}\n'));
    assert.ok(isiKartu.includes('TEKS_LEVELIN.berandaJudul') && isiKartu.includes('TEKS_LEVELIN.berandaTombol'));
    assert.ok(!/new Date|Date\.now|hariIni/.test(isiKartu), 'tanpa logika tanggal');
    // Layar Latihan memakai ?mapel= (dan ?asal=saran → asal_mula beranda_saran).
    const latihan = baca('components', 'screens', 'LatihanScreen.tsx');
    assert.ok(latihan.includes("const param = useLocalSearchParams<{ mapel?: string; asal?: string }>();"));
    assert.ok(latihan.includes("param.asal === 'saran' ? 'beranda_saran'"));
    // Cache saran ikut dibuang saat ganti akun (kunci 'levelin').
    assert.ok(baca('hooks', 'useLevelIn.ts').includes("queryKey: [...KUNCI_LEVELIN, 'saran']"));
    assert.ok(baca('providers', 'AuthProvider.tsx').includes("['levelin']"));
  });
});

describe('LANJUT_077 §B: Data Akun SMP tanpa "kelas 12"', () => {
  test('Kelas 7–9: kalimat netral tanpa "kelas 12"; kelas 10–11 dan tanpa kelas tidak berubah; layar memakai fungsi itu', () => {
    const LAMA = 'Kemajuan persiapan SNBP, SNBT, dan TKA tampil di sini saat kamu kelas 12.';
    for (const k of ['7', '8', '9']) {
      const t = jenjangSaya.teksKemajuanDataAkun(k);
      assert.ok(!/kelas 12/i.test(t), `kelas ${k}: ${t}`);
      assert.equal(t, 'Langkah yang kamu catat ada di Daftar Periksa.');
    }
    for (const k of ['10', '11', null, undefined]) assert.equal(jenjangSaya.teksKemajuanDataAkun(k), LAMA, `kelas ${k}`);
    const layar = baca('components', 'screens', 'AkunScreen.tsx');
    const tanpaKomentar = layar.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    assert.ok(!/kelas 12/.test(tanpaKomentar), 'masih ada kalimat "kelas 12" di layar Data Akun');
    assert.ok(layar.includes('{teksKemajuanDataAkun(pengguna?.kelas)}'));
    // Kelas 12 tetap melihat ringkasan X dari Y (jalur kode tidak berubah).
    assert.ok(layar.includes('if (kelas12) return <RingkasanKemajuanKelas12 />;'));
  });
});

describe('LANJUT_077: salinan teks', () => {
  test('Teks baru tercatat DRAF di salinan-teks-lanjut.md (§4.18 kartu Beranda, §4.11 Data Akun SMP)', () => {
    const sumber = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'), 'utf8').replace(/\r\n/g, '\n');
    // Setiap blok LANJUT_077: kepala (paragraf ber-DRAF) + butirnya, sampai judul berikutnya atau "---".
    const blok = [];
    for (let i = sumber.indexOf('**LANJUT_App (LANJUT_077)'); i >= 0; i = sumber.indexOf('**LANJUT_App (LANJUT_077)', i + 1)) {
      const sisa = sumber.slice(i);
      const isi = sisa.slice(0, sisa.search(/\n(?:#{2,3} |---)/));
      assert.match(isi.slice(0, isi.indexOf('\n\n')), /\bDRAF\b/);
      blok.push(isi);
    }
    assert.equal(blok.length, 2, 'blok LANJUT_077 di §4.18 (Beranda) dan §4.11 (Data Akun)');
    const semua = blok.join('\n');
    for (const t of [levelin.TEKS_LEVELIN.berandaJudul, levelin.TEKS_LEVELIN.berandaTombol, jenjangSaya.teksKemajuanDataAkun('7')]) {
      assert.ok(semua.includes(t), `belum tercatat: ${t}`);
    }
  });
});
