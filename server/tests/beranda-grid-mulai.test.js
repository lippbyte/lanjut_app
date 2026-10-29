// tests/beranda-grid-mulai.test.js
// Pengujian otomatis LANJUT_065:
// - Grid menu Beranda per jenjang (item & label pendek)
// - Kartu "Mulai dari Sini" (kriteria tampil/hilang, info per jenjang)
// - Progres sederhana (definisi langkah, hitungan dari server)
// - Tes isolasi lintas akun

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const {
  kelompokJenjang,
  daftarKartuBeranda,
  infoMulaiDariSini,
  apakahPunyaKemajuan,
  hitungProgresBeranda,
} = require('../src/util/beranda');

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

async function panggil(metode, path, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${path}`, {
    method: metode,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

describe('LANJUT_065 §A: Grid Menu Beranda per Jenjang', () => {
  test('Jumlah item grid dan label pendek per jenjang', () => {
    // LANJUT_075b: kartu Ngobrol dihapus dari grid semua jenjang (tab tengah navigasi).
    // SMP (kelas 7–9): 5 item
    for (const k of ['7', '8', '9']) {
      const kartu = daftarKartuBeranda(k);
      assert.equal(kartu.length, 5, `kelas ${k} harus memiliki 5 item grid`);
      const rute = kartu.map((x) => x.href);
      assert.deepEqual(rute, [
        '/eksplorasi-tujuan',
        '/gaya-belajar',
        '/arsip',
        '/level-in',
        '/cerita-alumni',
      ]);
      // Semua item memiliki label pendek maksimal 2 kata/baris
      for (const item of kartu) {
        assert.ok(item.labelPendek, `item ${item.id} harus memiliki labelPendek`);
        assert.ok(item.labelPendek.length <= 20, `label pendek tidak boleh terlalu panjang: ${item.labelPendek}`);
      }
    }

    // Kelas 10–11: 7 item
    for (const k of ['10', '11']) {
      const kartu = daftarKartuBeranda(k);
      assert.equal(kartu.length, 7, `kelas ${k} harus memiliki 7 item grid`);
      const rute = kartu.map((x) => x.href);
      assert.deepEqual(rute, [
        '/pilih-mapel',
        '/eksplorasi-tujuan',
        '/gaya-belajar',
        '/arsip',
        '/level-in',
        '/daftar-periksa',
        '/cerita-alumni',
      ]);
      for (const item of kartu) {
        assert.ok(item.labelPendek);
      }
    }

    // Kelas 12: 5 item (LANJUT_075 menambah Eksplorasi Kampus — menunggu keputusan PM)
    const kartu12 = daftarKartuBeranda('12');
    assert.equal(kartu12.length, 5, 'kelas 12 harus memiliki 5 item grid');
    assert.deepEqual(kartu12.map((x) => x.href), [
      '/cek-posisi',
      '/eksplorasi-tujuan',
      '/arsip',
      '/level-in',
      '/cerita-alumni',
    ]);
    for (const item of kartu12) {
      assert.ok(item.labelPendek);
    }

    // Fallback tanpa kelas: 3 item
    const fallback = daftarKartuBeranda(null);
    assert.equal(fallback.length, 3);
    assert.deepEqual(fallback.map((x) => x.href), [
      '/arsip',
      '/level-in',
      '/cerita-alumni',
    ]);
  });
});

describe('LANJUT_065 §B: Kartu "Mulai dari Sini"', () => {
  test('Tujuan langkah pertama dan teks per jenjang', () => {
    // SMP (kelas 7–9) -> Jenjang Saya
    for (const k of ['7', '8', '9']) {
      const info = infoMulaiDariSini(k);
      assert.equal(info.judul, 'Mulai dari Sini');
      assert.equal(info.href, '/jenjang-saya');
      assert.equal(info.labelTombol, 'Buka Jenjang Saya');
      assert.ok(info.penjelas.length > 0);
    }

    // Kelas 10–11 -> Pilih Mapel
    for (const k of ['10', '11']) {
      const info = infoMulaiDariSini(k);
      assert.equal(info.judul, 'Mulai dari Sini');
      assert.equal(info.href, '/pilih-mapel');
      assert.equal(info.labelTombol, 'Pilih Mapel');
      assert.ok(info.penjelas.length > 0);
    }

    // Kelas 12 -> Jalur Saya (/cek-posisi; label baru LANJUT_074)
    const info12 = infoMulaiDariSini('12');
    assert.equal(info12.judul, 'Mulai dari Sini');
    assert.equal(info12.href, '/cek-posisi');
    assert.equal(info12.labelTombol, 'Jalur Saya');
    assert.ok(info12.penjelas.length > 0);

    // Fallback tanpa kelas
    const infoFallback = infoMulaiDariSini(null);
    assert.equal(infoFallback.judul, 'Mulai dari Sini');
    assert.equal(infoFallback.href, '/jenjang-saya');
  });

  test('Kriteria kemajuan: tampil untuk akun baru, hilang jika ada kemajuan', () => {
    // Akun baru tanpa aktivitas: kartu TAMPIL (apakahPunyaKemajuan = false)
    assert.equal(apakahPunyaKemajuan({ jumlahCentang: 0, jumlahLatihan: 0, jumlahKartu: 0 }), false);
    assert.equal(apakahPunyaKemajuan({}), false);

    // Ada centang daftar periksa -> punya kemajuan (kartu hilang)
    assert.equal(apakahPunyaKemajuan({ jumlahCentang: 1, jumlahLatihan: 0, jumlahKartu: 0 }), true);

    // Ada sesi latihan -> punya kemajuan (kartu hilang)
    assert.equal(apakahPunyaKemajuan({ jumlahCentang: 0, jumlahLatihan: 1, jumlahKartu: 0 }), true);

    // Ada kartu di arsip belajar -> punya kemajuan (kartu hilang)
    assert.equal(apakahPunyaKemajuan({ jumlahCentang: 0, jumlahLatihan: 0, jumlahKartu: 1 }), true);
  });
});

describe('LANJUT_065 §C & LANJUT_067 §A: Progres Sederhana Beranda', () => {
  test('Definisi langkah dan hitungan progres dari data server (3 langkah)', () => {
    // 0 dari 3: belum isi prodi impian, belum ada centang/latihan
    const p0 = hitungProgresBeranda({
      prodiImpian: null,
      jumlahCentang: 0,
      jumlahLatihan: 0,
    });
    assert.equal(p0.selesai, 0);
    assert.equal(p0.total, 3);

    // 1 dari 3: isi prodi impian
    const p1 = hitungProgresBeranda({
      prodiImpian: 'teknik-informatika',
      jumlahCentang: 0,
      jumlahLatihan: 0,
    });
    assert.equal(p1.selesai, 1);
    assert.equal(p1.total, 3);
    assert.equal(p1.langkah[0].id, 'isi_prodi_impian');
    assert.equal(p1.langkah[0].selesai, true);

    // 2 dari 3: isi prodi impian + 1 centang
    const p2 = hitungProgresBeranda({
      prodiImpian: 'teknik-informatika',
      jumlahCentang: 2,
      jumlahLatihan: 0,
    });
    assert.equal(p2.selesai, 2);
    assert.equal(p2.total, 3);

    // 3 dari 3: semua langkah selesai (prodi + centang + latihan)
    const p3 = hitungProgresBeranda({
      prodiImpian: 'teknik-informatika',
      jumlahCentang: 3,
      jumlahLatihan: 1,
    });
    assert.equal(p3.selesai, 3);
    assert.equal(p3.total, 3);

    // Verifikasi catatan LANJUT_065 §C & LANJUT_067 §A:
    // Langkah "buka Arsip" tidak dihitung karena server tidak memiliki
    // pencatatan telemetri pembukaan layar.
    const ids = p3.langkah.map((l) => l.id);
    assert.ok(!ids.includes('buka_arsip'), 'buka_arsip tidak boleh ada karena datanya belum ada di server');
    // Langkah "isi_kelas" dihapus pada LANJUT_067
    assert.ok(!ids.includes('isi_kelas'), 'isi_kelas harus dihapus dari daftar langkah');
  });
});

describe('LANJUT_065 §D: Tes Lintas Akun (Cross-Account Isolation)', () => {
  test('Progres Akun A tidak terpengaruh oleh aktivitas Akun B', async () => {
    // 1. Daftarkan Akun A (kelas 7 SMP, akun baru)
    const { json: daftarA } = await daftarPenggunaBaru(baseUrl, { kelas: '7' });
    const tokenA = daftarA.data.token;
    const profilA = (await panggil('GET', '/auth/saya', tokenA)).json.data;

    // Ambil data aktivitas Akun A dari server
    const kemajuanA = (await panggil('GET', '/kemajuan', tokenA)).json.data;
    const sesiA = (await panggil('GET', '/sesi-latihan', tokenA)).json.data;
    const kartuA = (await panggil('GET', '/kartu?sumber=pengguna', tokenA)).json.data;

    const centangA = kemajuanA.filter((k) => k.selesai_pada).length;
    const latihanA = sesiA.length;
    const totalKartuA = kartuA.length;

    assert.equal(centangA, 0);
    assert.equal(latihanA, 0);
    assert.equal(totalKartuA, 0);

    // Akun A adalah akun baru: Mulai dari Sini tampil, progres = 0 dari 3 (LANJUT_067)
    assert.equal(apakahPunyaKemajuan({ jumlahCentang: centangA, jumlahLatihan: latihanA, jumlahKartu: totalKartuA }), false);
    const progresAwalA = hitungProgresBeranda({
      kelas: profilA.kelas,
      prodiImpian: profilA.prodi_impian,
      jumlahCentang: centangA,
      jumlahLatihan: latihanA,
    });
    assert.equal(progresAwalA.selesai, 0);
    assert.equal(progresAwalA.total, 3);

    // 2. Daftarkan Akun B (kelas 12 SMA)
    const { json: daftarB } = await daftarPenggunaBaru(baseUrl, { kelas: '12', jenis_sekolah: 'SMA' });
    const tokenB = daftarB.data.token;

    // Akun B melakukan berbagai aktivitas:
    // a. Isi prodi impian
    await panggil('PATCH', '/pengguna/saya', tokenB, { prodi_impian: 'farmasi' });

    // b. Centang butir daftar periksa
    const butirResp = await panggil('GET', '/konten/checklist?kelas=12&jalur=SNBP');
    const firstButirId = butirResp.json.data.kategori[0].butir[0].id;
    await panggil('PUT', `/kemajuan/${encodeURIComponent(firstButirId)}`, tokenB);

    // c. Mulai & selesaikan sesi latihan
    const sesiBaruId = 'sesi-065-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    await panggil('POST', '/sesi-latihan', tokenB, {
      id: sesiBaruId,
      mapel_fokus_id: 'matematika',
      jumlah_kartu_direncanakan: 5,
      dimulai_pada: new Date().toISOString(),
      asal_mula: 'arsip',
    });
    await panggil('PATCH', `/sesi-latihan/${encodeURIComponent(sesiBaruId)}`, tokenB, {
      selesai_pada: new Date().toISOString(),
    });

    // 3. Verifikasi Akun B memiliki kemajuan penuh
    const profilB = (await panggil('GET', '/auth/saya', tokenB)).json.data;
    const kemajuanB = (await panggil('GET', '/kemajuan', tokenB)).json.data;
    const sesiB = (await panggil('GET', '/sesi-latihan', tokenB)).json.data;

    const centangB = kemajuanB.filter((k) => k.selesai_pada).length;
    const latihanB = sesiB.length;

    assert.equal(centangB >= 1, true);
    assert.equal(latihanB >= 1, true);
    assert.equal(apakahPunyaKemajuan({ jumlahCentang: centangB, jumlahLatihan: latihanB }), true);

    const progresB = hitungProgresBeranda({
      kelas: profilB.kelas,
      prodiImpian: profilB.prodi_impian,
      jumlahCentang: centangB,
      jumlahLatihan: latihanB,
    });
    assert.equal(progresB.selesai, 3);
    assert.equal(progresB.total, 3);

    // 4. Verifikasi ISOLASI LINTAS AKUN:
    // Data Akun A diperiksa ulang dari server — harus sama sekali tidak berubah
    const profilASetelah = (await panggil('GET', '/auth/saya', tokenA)).json.data;
    const kemajuanASetelah = (await panggil('GET', '/kemajuan', tokenA)).json.data;
    const sesiASetelah = (await panggil('GET', '/sesi-latihan', tokenA)).json.data;

    const centangASetelah = kemajuanASetelah.filter((k) => k.selesai_pada).length;
    const latihanASetelah = sesiASetelah.length;

    assert.equal(centangASetelah, 0, 'Centang Akun B tidak boleh bocor ke Akun A');
    assert.equal(latihanASetelah, 0, 'Sesi latihan Akun B tidak boleh bocor ke Akun A');
    assert.equal(profilASetelah.prodi_impian, null, 'Prodi impian Akun B tidak boleh bocor ke Akun A');

    // Akun A TETAP dianggap belum punya kemajuan dan progres TETAP 0 dari 3
    assert.equal(
      apakahPunyaKemajuan({ jumlahCentang: centangASetelah, jumlahLatihan: latihanASetelah }),
      false,
      'Akun A tetap berstatus belum punya kemajuan (Kartu Mulai dari Sini tetap tampil)'
    );

    const progresASetelah = hitungProgresBeranda({
      kelas: profilASetelah.kelas,
      prodiImpian: profilASetelah.prodi_impian,
      jumlahCentang: centangASetelah,
      jumlahLatihan: latihanASetelah,
    });
    assert.equal(progresASetelah.selesai, 0, 'Progres Akun A harus tetap 0 dari 3');
    assert.equal(progresASetelah.total, 3);
  });
});
