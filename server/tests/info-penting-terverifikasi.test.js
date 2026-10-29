// tests/info-penting-terverifikasi.test.js
// Pengujian otomatis LANJUT_066:
// - Kartu "Info Penting" dari data terverifikasi (maks 3 kartu)
// - Penyaringan ketat: status_verifikasi = 'terverifikasi' & diperiksa_pada != null
// - Urutan tanggal terdekat relevan jenjang akun (kelompokJenjang)
// - Tes mutasi: bila filter status dicabut sementara, tes harus gagal
// - Tes simulasi data database & pembersihan kembali
// - Tes isolasi lintas akun

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const {
  turunkanLinimasa,
  infoPentingLinimasa,
  formatRentang,
  formatTanggal,
  lembagaSumber,
} = require('../src/util/linimasa');
const { kelompokJenjang } = require('../src/util/beranda');

let server;
let baseUrl;

const ID_SIMULASI = ['uji-066-terverifikasi', 'uji-066-belum-dicek'];

// LANJUT_072b: Info Penting kini menyaring tahapan yang tanggal selesainya sudah
// lewat. Tes 066 di bawah menguji verifikasi, urutan, dan batas tiga kartu — bukan
// tanggal — jadi "hari ini" dipatok sebelum semua tanggal data uji (Agustus–
// November 2026) supaya hasilnya tidak bergantung pada tanggal tes dijalankan.
// Perilaku tanggal diuji di tests/info-penting-tanggal.test.js.
const HARI_UJI = Date.UTC(2026, 6, 1);

async function hapusSimulasi() {
  await pool.query('DELETE FROM tahapan_linimasa WHERE id IN (?)', [ID_SIMULASI]);
}

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  await hapusSimulasi();
});

after(async () => {
  await hapusSimulasi();
  await new Promise((resolve) => server.close(resolve));
  await pool.end();
});

describe('LANJUT_066 §A & §B: Logika Kartu Info Penting & Penyaringan', () => {
  const dataUji = [
    {
      id: 'tahap-1',
      judul: 'Tahapan Pertama Terverifikasi',
      tanggal_mulai: '2026-08-01',
      tanggal_selesai: '2026-08-15',
      jalur: 'TKA',
      status_verifikasi: 'terverifikasi',
      diperiksa_pada: '2026-07-20',
      url_sumber: 'https://www.kemendikdasmen.go.id/siaran-pers/15707',
    },
    {
      id: 'tahap-2',
      judul: 'Tahapan Kedua Belum Dicek',
      tanggal_mulai: '2026-08-10',
      tanggal_selesai: '2026-08-20',
      jalur: 'TKA',
      status_verifikasi: 'belum_diverifikasi',
      diperiksa_pada: null,
      url_sumber: 'https://snpmb.bppp.kemdikbud.go.id/',
    },
    {
      id: 'tahap-belum-berisi-tanggal',
      judul: 'Tahapan Belum Diverifikasi Tapi Ada Tanggal',
      tanggal_mulai: '2026-08-05',
      tanggal_selesai: '2026-08-18',
      jalur: 'TKA',
      status_verifikasi: 'belum_diverifikasi',
      diperiksa_pada: '2026-08-01',
      url_sumber: 'https://snpmb.bppp.kemdikbud.go.id/',
    },
    {
      id: 'tahap-3',
      judul: 'Tahapan Ketiga Terverifikasi',
      tanggal_mulai: '2026-09-01',
      tanggal_selesai: '2026-09-15',
      jalur: 'SNBP',
      status_verifikasi: 'terverifikasi',
      diperiksa_pada: '2026-08-25',
      url_sumber: 'https://snpmb.bppp.kemdikbud.go.id/',
    },
    {
      id: 'tahap-4',
      judul: 'Tahapan Keempat Terverifikasi',
      tanggal_mulai: '2026-10-01',
      tanggal_selesai: '2026-10-15',
      jalur: 'SNBT',
      status_verifikasi: 'terverifikasi',
      diperiksa_pada: '2026-09-15',
      url_sumber: 'https://snpmb.bppp.kemdikbud.go.id/',
    },
    {
      id: 'tahap-5',
      judul: 'Tahapan Kelima Terverifikasi',
      tanggal_mulai: '2026-11-01',
      tanggal_selesai: '2026-11-15',
      jalur: 'SNBT',
      status_verifikasi: 'terverifikasi',
      diperiksa_pada: '2026-10-15',
      url_sumber: 'https://snpmb.bppp.kemdikbud.go.id/',
    },
  ];

  test('Hanya data dengan status_verifikasi = "terverifikasi" dan diperiksa_pada != null yang muncul', () => {
    const hasil = infoPentingLinimasa(dataUji, '12', HARI_UJI);
    assert.ok(hasil.length > 0);
    for (const item of hasil) {
      assert.equal(item.status_verifikasi, 'terverifikasi');
      assert.ok(item.diperiksa_pada !== null);
      assert.notEqual(item.id, 'tahap-2', 'tahapan belum terverifikasi tidak boleh muncul');
    }
  });

  test('Paling banyak 3 kartu yang dikembalikan, terurut dari tanggal mulai terdekat ASC', () => {
    const hasil = infoPentingLinimasa(dataUji, '12', HARI_UJI);
    assert.equal(hasil.length, 3, 'harus membatasi maksimal 3 kartu');
    assert.equal(hasil[0].id, 'tahap-1');
    assert.equal(hasil[1].id, 'tahap-3');
    assert.equal(hasil[2].id, 'tahap-4');
    // tahap-5 adalah yang ke-4 terdekat, sehingga tidak masuk
  });

  test('Format rentang tanggal, label sumber, dan tanggal periksa sesuai spesifikasi', () => {
    const hasil = infoPentingLinimasa(dataUji, '12', HARI_UJI);
    const item1 = hasil[0];

    const rentang = formatRentang(item1.tanggal_mulai, item1.tanggal_selesai);
    assert.match(rentang, /1 – 15 Agustus 2026/);

    const sumber = lembagaSumber(item1.url_sumber);
    assert.equal(sumber, 'laman resmi Kemendikdasmen');

    const periksa = formatTanggal(item1.diperiksa_pada);
    assert.match(periksa, /20 Juli 2026/);
  });

  test('Bila tidak ada data terverifikasi sama sekali, menghasilkan array kosong', () => {
    const dataKosong = [
      {
        id: 'belum-1',
        judul: 'Belum terverifikasi',
        tanggal_mulai: '2026-08-01',
        tanggal_selesai: '2026-08-15',
        status_verifikasi: 'belum_diverifikasi',
        diperiksa_pada: null,
      },
    ];
    const hasil = infoPentingLinimasa(dataKosong, '12');
    assert.deepEqual(hasil, []);
  });

  test('Relevansi jenjang: kelas 12 dapat kartu, SMP dan kelas 10–11 dapat array kosong', () => {
    // Kelas 12
    const hasilKelas12 = infoPentingLinimasa(dataUji, '12', HARI_UJI);
    assert.equal(hasilKelas12.length, 3);

    // SMP (kelas 7, 8, 9)
    for (const k of ['7', '8', '9']) {
      const hasilSmp = infoPentingLinimasa(dataUji, k, HARI_UJI);
      assert.deepEqual(hasilSmp, [], `SMP kelas ${k} harus menghasilkan array kosong`);
    }

    // Kelas 10 & 11
    for (const k of ['10', '11']) {
      const hasil1011 = infoPentingLinimasa(dataUji, k, HARI_UJI);
      assert.deepEqual(hasil1011, [], `Kelas ${k} harus menghasilkan array kosong`);
    }

    // Tanpa kelas / umum
    assert.deepEqual(infoPentingLinimasa(dataUji, null, HARI_UJI), []);
    assert.deepEqual(infoPentingLinimasa(dataUji, undefined, HARI_UJI), []);
  });
});

describe('LANJUT_066 §B: Uji Mutasi Filter Verifikasi', () => {
  // Fungsi penjamin bahwa tidak ada data belum terverifikasi yang bocor
  function pastikanSemuaTerverifikasi(daftar) {
    for (const d of daftar) {
      if (d.status_verifikasi !== 'terverifikasi' || !d.diperiksa_pada) {
        throw new Error(`Kebocoran data belum terverifikasi: ${d.id}`);
      }
    }
    return true;
  }

  test('Implementasi normal lolos uji verifikasi ketat', () => {
    const dataCampuran = [
      { id: 'sah', status_verifikasi: 'terverifikasi', diperiksa_pada: '2026-09-01', tanggal_mulai: '2026-09-10' },
      { id: 'bocor', status_verifikasi: 'belum_diverifikasi', diperiksa_pada: null, tanggal_mulai: '2026-09-05' },
    ];
    const hasil = infoPentingLinimasa(dataCampuran, '12');
    assert.doesNotThrow(() => pastikanSemuaTerverifikasi(hasil));
    assert.equal(hasil.length, 1);
    assert.equal(hasil[0].id, 'sah');
  });

  test('Mutasi: bila filter status_verifikasi dicabut sementara, tes verifikasi HARUS GAGAL', () => {
    // Mutasi fungsi linimasa: penyaring status dicabut (hanya mengurutkan dan memotong)
    function infoPentingMutan(data, kelas) {
      if (kelompokJenjang(kelas) !== 'kelas12') return [];
      // MUTASI: filter status_verifikasi sengaja tidak dipasang
      return (data || []).slice(0, 3);
    }

    const dataCampuran = [
      { id: 'sah', status_verifikasi: 'terverifikasi', diperiksa_pada: '2026-09-01', tanggal_mulai: '2026-09-10' },
      { id: 'bocor', status_verifikasi: 'belum_diverifikasi', diperiksa_pada: null, tanggal_mulai: '2026-09-05' },
    ];

    const hasilMutan = infoPentingMutan(dataCampuran, '12');

    // Pada mutan, data yang belum terverifikasi ikut masuk
    assert.ok(hasilMutan.some((x) => x.id === 'bocor'));

    // Tes verifikasi wajib melempar error (tes GAGAL pada mutan)
    assert.throws(
      () => pastikanSemuaTerverifikasi(hasilMutan),
      /Kebocoran data belum terverifikasi: bocor/
    );
  });
});

describe('LANJUT_066 §B & §C: Integrasi Database dengan Data Simulasi & Pembersihan', () => {
  test('Data simulasi belum terverifikasi tidak muncul di Info Penting, dan bersih setelah dihapus', async () => {
    // 1. Sisipkan data simulasi
    await pool.query(
      `INSERT INTO tahapan_linimasa
         (id, judul, tanggal_mulai, tanggal_selesai, jalur, pemilik,
          status_verifikasi, asal, url_sumber, diperiksa_pada)
       VALUES
         (?, 'Simulasi Terverifikasi', '2099-01-01', '2099-01-10', 'TKA', 'tim', 'terverifikasi', 'uji', 'https://snpmb.bppp.kemdikbud.go.id/', '2099-01-01'),
         (?, 'Simulasi Belum Dicek', '2099-01-02', '2099-01-12', 'SNBP', 'tim', 'belum_diverifikasi', 'uji', 'https://snpmb.bppp.kemdikbud.go.id/', NULL)`,
      ID_SIMULASI
    );

    // 2. Panggil endpoint server GET /konten/linimasa
    const res = await fetch(`${baseUrl}/api/v1/konten/linimasa`);
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(json.ok);

    // 3. Olah dengan infoPentingLinimasa untuk kelas 12
    const infoPenting = infoPentingLinimasa(json.data, '12');

    // Data belum terverifikasi TIDAK BOLEH ada di hasil info penting
    const adaBelum = infoPenting.some((t) => t.id === 'uji-066-belum-dicek');
    assert.equal(adaBelum, false, 'uji-066-belum-dicek tidak boleh ada di Info Penting');

    // 4. Bersihkan data simulasi
    await hapusSimulasi();

    // 5. Verifikasi bahwa data simulasi sudah tidak ada lagi di basis data
    const [sisa] = await pool.query('SELECT id FROM tahapan_linimasa WHERE id IN (?)', [ID_SIMULASI]);
    assert.equal(sisa.length, 0, 'basis data harus bersih dari data simulasi');
  });
});

describe('LANJUT_066 §C: Tes Isolasi Lintas Akun', () => {
  test('Endpoint linimasa tidak membocorkan data akun lain, dan respon linimasa identik lintas akun', async () => {
    const akunA = await daftarPenggunaBaru(baseUrl, { kelas: '12', nama: 'Siswa Kelas 12' });
    const akunB = await daftarPenggunaBaru(baseUrl, { kelas: '10', nama: 'Siswa Kelas 10' });

    const tokenA = akunA.json.data.token;
    const tokenB = akunB.json.data.token;

    // Panggil endpoint /konten/linimasa dengan token Akun A
    const resA = await fetch(`${baseUrl}/api/v1/konten/linimasa`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const jsonA = await resA.json();

    // Panggil endpoint /konten/linimasa dengan token Akun B
    const resB = await fetch(`${baseUrl}/api/v1/konten/linimasa`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const jsonB = await resB.json();

    // Panggil tanpa token (publik)
    const resPublik = await fetch(`${baseUrl}/api/v1/konten/linimasa`);
    const jsonPublik = await resPublik.json();

    // Respons harus konsisten dan identik
    assert.deepEqual(jsonA.data, jsonB.data);
    assert.deepEqual(jsonA.data, jsonPublik.data);

    // Respons tidak mengandung informasi akun pengguna mana pun
    for (const item of jsonA.data) {
      assert.equal(item.pengguna_id, undefined);
      assert.equal(item.email, undefined);
      assert.equal(item.nama, undefined);
    }

    // Pastikan Akun A dan B tetap terisolasi
    const resProfilA = await fetch(`${baseUrl}/api/v1/auth/saya`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    });
    const jsonProfilA = await resProfilA.json();
    assert.equal(jsonProfilA.data.kelas, '12');

    const resProfilB = await fetch(`${baseUrl}/api/v1/auth/saya`, {
      headers: { Authorization: `Bearer ${tokenB}` },
    });
    const jsonProfilB = await resProfilB.json();
    assert.equal(jsonProfilB.data.kelas, '10');

    // Olah di sisi klien berdasarkan kelas akun masing-masing:
    // Akun A (kelas 12) memperoleh Info Penting terverifikasi
    const infoA = infoPentingLinimasa(jsonA.data, jsonProfilA.data.kelas, HARI_UJI);
    assert.ok(infoA.length > 0);

    // Akun B (kelas 10) tidak memperoleh Info Penting linimasa
    const infoB = infoPentingLinimasa(jsonB.data, jsonProfilB.data.kelas, HARI_UJI);
    assert.deepEqual(infoB, []);
  });
});
