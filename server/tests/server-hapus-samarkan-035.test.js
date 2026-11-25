// LANJUT_035: Server hapus sungguhan (refleksi Discover & catatan semua versi profil eksplorasi),
// penyamaran id jalur draf di respons tujuan dan butir bukti tanpa mengubah data di tabel maupun
// logika `perbarui` / ekspor, serta penyambungan tombol & label jujur di klien v2 (v1 utuh).

process.env.DISCOVER_AKTIF = '1';
process.env.JALUR_TUJUAN_AKTIF = '1';
process.env.PORTOFOLIO_AKTIF = '1';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync, execFileSync } = require('node:child_process');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool, kunciKonfigurasiGlobal } = require('./bantuan');
const { kunciJalurAktif, jalurUjiDisetujui } = require('./kunci-jalur-aktif');
const { kunciKartuDiscover, kartuUjiDisetujui } = require('./kartu-discover-uji');
const refleksiRepo = require('../src/modul/discover/refleksi-discover.repo');
const profilRepo = require('../src/modul/discover/profil-eksplorasi.repo');
const { muatModulApp } = require('./muat-ts-app');

const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const ts = require(require.resolve('typescript', { paths: [AKAR_APP] }));
const jalurSaya = muatModulApp('lib/jalurSayaV2');
const jelajah = muatModulApp('lib/jelajahV2');

const SANDI = 'sandiujiaman1';
const UJI_JALUR = jalurUjiDisetujui(pool, 's5');
const UJI_KARTU = kartuUjiDisetujui(pool, 's5');
const [KARTU_BIDANG, KARTU_PROFESI] = UJI_KARTU.kartu;
const NAMA_DRAF = 'Nama Jalur Draf Rahasia 035';
const TEKS_DRAF = 'Deskripsi jalur draf rahasia 035 yang dilarang keluar.';

let server;
let baseUrl;
let versiKebijakan;
let lepasKunci;
let lepasKunciJalur;
let lepasKunciKartu;
const akunDibuat = [];

async function panggil(metode, jalur, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${jalur}`, {
    method: metode,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function akun({ setuju = true } = {}) {
  const { json } = await daftarPenggunaBaru(baseUrl, setuju ? { versi_kebijakan: versiKebijakan } : {});
  const data = { id: json.data.pengguna.id, token: json.data.token };
  akunDibuat.push(data.id);
  return data;
}

function tanpaJejakDraf(json, idDraf, konteks) {
  const teks = JSON.stringify(json);
  for (const x of [idDraf, NAMA_DRAF, TEKS_DRAF]) {
    assert.ok(!teks.includes(x), `${konteks}: "${x}" bocor di respons`);
  }
}

before(async () => {
  lepasKunci = await kunciKonfigurasiGlobal();
  lepasKunciJalur = await kunciJalurAktif(pool);
  lepasKunciKartu = await kunciKartuDiscover(pool);
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const [[baris]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'persetujuan_versi_kebijakan'");
  versiKebijakan = Number(baris.nilai);
  await UJI_JALUR.siapkan();
  await UJI_KARTU.siapkan();
});

after(async () => {
  await new Promise((r) => server.close(r));
  try {
    if (akunDibuat.length) {
      await pool.query('DELETE FROM pengguna WHERE id IN (?)', [akunDibuat]);
    }
    await UJI_KARTU.hapus();
    await UJI_JALUR.hapus();
  } finally {
    if (lepasKunciKartu) await lepasKunciKartu();
    if (lepasKunciJalur) await lepasKunciJalur();
    if (lepasKunci) await lepasKunci();
    await pool.end();
  }
});

// ---------------------------------------------------------------------------------------------
describe('Bagian A: Hapus sungguhan refleksi dan catatan profil di server', () => {
  test('Gerbang otorisasi 401/403 untuk DELETE refleksi dan DELETE catatan profil', async () => {
    const tanpaSetuju = await akun({ setuju: false });
    for (const jalur of [`/discover/refleksi/${KARTU_BIDANG.id}`, '/discover/profil/catatan']) {
      assert.equal((await panggil('DELETE', jalur)).status, 401, `tanpa token: ${jalur}`);
      const res = await panggil('DELETE', jalur, tanpaSetuju.token);
      assert.equal(res.status, 403, `tanpa kebijakan: ${jalur}`);
      assert.equal(res.json.galat.kode, 'AI_BELUM_DIIZINKAN');
    }
  });

  test('Saklar DISCOVER_AKTIF=0: kedua endpoint DELETE tidak terdaftar (404 sama persis dengan rute tak dikenal)', () => {
    const skrip = `
      process.env.DISCOVER_AKTIF = '0';
      const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./tests/bantuan');
      (async () => {
        const s = await nyalakanServer();
        const url = urlDari(s);
        let id;
        try {
          const { json } = await daftarPenggunaBaru(url);
          id = json.data.pengguna.id;
          const t = json.data.token;
          const cek = async (m, j, tok) => {
            const r = await fetch(url + '/api/v1' + j, { method: m, headers: tok ? { Authorization: 'Bearer ' + tok } : {} });
            return r.status + ' ' + await r.text();
          };
          for (const tok of [undefined, t]) {
            const ref = await cek('GET', '/rute-tidak-ada-035', tok);
            if (!ref.startsWith('404 ')) throw new Error('bukan 404: ' + ref);
            for (const j of ['/discover/refleksi/bidang-kesehatan', '/discover/profil/catatan']) {
              const got = await cek('DELETE', j, tok);
              if (got !== ref) throw new Error(j + ' berbeda: ' + got + ' vs ' + ref);
            }
          }
          console.log('SAKLAR_MATI_OK');
        } finally {
          if (id) await pool.query('DELETE FROM pengguna WHERE id = ?', [id]);
          await new Promise((r) => s.close(r));
          await pool.end();
        }
      })().catch((e) => { console.error(e); process.exit(1); });
    `;
    const r = spawnSync(process.execPath, ['-e', skrip], {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env, DISCOVER_AKTIF: '0' },
      encoding: 'utf8',
      timeout: 60000,
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
    assert.match(r.stdout, /SAKLAR_MATI_OK/);
  });

  test('DELETE /discover/refleksi/:kartuId menghapus seluruh baris (termasuk ketertarikan), hilang dari GET & ekspor, idempoten, dan tidak menyentuh akun lain', async () => {
    const a = await akun();
    const b = await akun();

    // A punya 2 refleksi; B punya refleksi di kartu yang sama.
    assert.equal(
      (await panggil('PUT', `/discover/refleksi/${KARTU_BIDANG.id}`, a.token, {
        ketertarikan: 'tertarik',
        yang_menarik: 'Menarik bagi A',
        yang_kurang_menarik: 'Kurang bagi A',
      })).status,
      200
    );
    assert.equal(
      (await panggil('PUT', `/discover/refleksi/${KARTU_PROFESI.id}`, a.token, {
        ketertarikan: 'belum_yakin',
        yang_menarik: 'Tetap ada untuk A',
      })).status,
      200
    );
    assert.equal(
      (await panggil('PUT', `/discover/refleksi/${KARTU_BIDANG.id}`, b.token, {
        ketertarikan: 'tidak_tertarik',
        yang_kurang_menarik: 'Milik rahasia B',
      })).status,
      200
    );

    // A menghapus refleksi KARTU_BIDANG
    const hapus1 = await panggil('DELETE', `/discover/refleksi/${KARTU_BIDANG.id}`, a.token);
    assert.equal(hapus1.status, 200);
    assert.deepEqual(hapus1.json.data, { dihapus: true });

    // Sabotase #1: seluruh baris benar-benar terhapus di tabel (bukan sekadar mengosongkan teks)
    const [[{ jumlahBidangA }]] = await pool.query(
      'SELECT COUNT(*) AS jumlahBidangA FROM refleksi_discover WHERE pengguna_id = ? AND kartu_discover_id = ?',
      [a.id, KARTU_BIDANG.id]
    );
    assert.equal(jumlahBidangA, 0, 'baris refleksi harus benar-benar terhapus, bukan hanya teksnya');

    // GET /discover/refleksi dan GET /pengguna/saya/ekspor tidak lagi memuat KARTU_BIDANG, sedangkan KARTU_PROFESI utuh
    const daftarA = (await panggil('GET', '/discover/refleksi', a.token)).json.data;
    assert.deepEqual(daftarA.map((r) => r.kartu_discover_id), [KARTU_PROFESI.id]);
    const eksporA = (await panggil('GET', '/pengguna/saya/ekspor', a.token)).json.data;
    assert.deepEqual(eksporA.refleksi_discover.map((r) => r.kartu_discover_id), [KARTU_PROFESI.id]);
    assert.ok(!JSON.stringify(eksporA).includes('Menarik bagi A'));

    // Idempoten dan tidak membocorkan kartu tidak ada / draf / milik orang lain
    const hapusUlang = await panggil('DELETE', `/discover/refleksi/${KARTU_BIDANG.id}`, a.token);
    const hapusTakAda = await panggil('DELETE', '/discover/refleksi/kartu-tidak-pernah-ada', a.token);
    const hapusDraf = await panggil('DELETE', '/discover/refleksi/bidang-kesehatan', a.token);
    const hapusFormatSalah = await panggil('DELETE', '/discover/refleksi/TIDAK_SAH', a.token);
    assert.equal(hapusUlang.status, 200);
    assert.deepEqual(hapusUlang.json, hapus1.json);
    assert.deepEqual(hapusTakAda.json, hapus1.json);
    assert.deepEqual(hapusDraf.json, hapus1.json);
    assert.deepEqual(hapusFormatSalah.json, hapus1.json);

    // Sabotase #4: refleksi milik B tetap 100% utuh (lewat API maupun pemanggilan repo langsung)
    assert.equal(await refleksiRepo.hapusMilikSendiri(a.id, KARTU_BIDANG.id), false);
    const [barisB] = await pool.query(
      'SELECT ketertarikan, yang_kurang_menarik FROM refleksi_discover WHERE pengguna_id = ? AND kartu_discover_id = ?',
      [b.id, KARTU_BIDANG.id]
    );
    assert.equal(barisB.length, 1);
    assert.deepEqual({ ...barisB[0] }, { ketertarikan: 'tidak_tertarik', yang_kurang_menarik: 'Milik rahasia B' });
  });

  test('DELETE /discover/profil/catatan mengosongkan catatan di SEMUA versi termasuk riwayat & ekspor, isian lain utuh, jumlah versi tidak bertambah, dan terisolasi per akun', async () => {
    const a = await akun();
    const b = await akun();

    // A menyusun 3 versi profil dengan catatan berbeda-beda
    await panggil('PUT', `/discover/refleksi/${KARTU_BIDANG.id}`, a.token, {
      ketertarikan: 'tertarik',
      yang_menarik: 'Suka biologi',
    });
    const v1 = (await panggil('POST', '/discover/profil', a.token, { catatan: 'Catatan rahasia versi 1' })).json.data;
    await panggil('PUT', `/discover/refleksi/${KARTU_PROFESI.id}`, a.token, {
      ketertarikan: 'belum_yakin',
      yang_menarik: 'Ingin tahu lebih jauh',
    });
    const v2 = (await panggil('POST', '/discover/profil', a.token, { catatan: 'Catatan rahasia versi 2' })).json.data;
    const v3 = (await panggil('POST', '/discover/profil', a.token, { catatan: 'Catatan rahasia versi 3' })).json.data;

    // B juga punya 2 versi profil dengan catatan
    const b1 = (await panggil('POST', '/discover/profil', b.token, { catatan: 'Catatan B versi 1' })).json.data;
    const b2 = (await panggil('POST', '/discover/profil', b.token, { catatan: 'Catatan B versi 2' })).json.data;

    const [sebelumDb] = await pool.query(
      'SELECT id, isi, status, diubah_dari_id FROM profil_eksplorasi WHERE pengguna_id = ? ORDER BY id',
      [a.id]
    );
    assert.equal(sebelumDb.length, 3);

    // A menghapus catatan
    const res = await panggil('DELETE', '/discover/profil/catatan', a.token);
    assert.equal(res.status, 200);
    assert.deepEqual(res.json.data, { dihapus: true });

    // Sabotase #3: jumlah versi TIDAK bertambah, baris id/status/diubah_dari_id/isi tetap utuh
    const terkini = (await panggil('GET', '/discover/profil', a.token)).json.data;
    assert.equal(terkini.jumlah_versi, 3, 'hapus catatan tidak boleh membuat versi baru');
    assert.equal(terkini.profil.id, v3.id);
    assert.equal(terkini.profil.versi_ke, 3);
    assert.equal(terkini.profil.catatan, null);
    assert.equal(terkini.profil.tertarik.length, 1);
    assert.equal(terkini.profil.belum_yakin.length, 1);

    // Sabotase #2: SEMUA versi di riwayat dan ekspor memiliki catatan null; teks catatan lama lenyap total
    const riwayat = (await panggil('GET', '/discover/profil/riwayat', a.token)).json.data;
    assert.deepEqual(
      riwayat.map((v) => [v.versi_ke, v.id, v.status, v.catatan]),
      [
        [1, v1.id, 'diubah', null],
        [2, v2.id, 'diubah', null],
        [3, v3.id, 'aktif', null],
      ]
    );
    assert.doesNotMatch(JSON.stringify(riwayat), /Catatan rahasia versi [123]/);

    const ekspor = (await panggil('GET', '/pengguna/saya/ekspor', a.token)).json.data;
    assert.equal(ekspor.profil_eksplorasi.length, 3);
    assert.ok(ekspor.profil_eksplorasi.every((p) => p.catatan === null));
    assert.doesNotMatch(JSON.stringify(ekspor), /Catatan rahasia versi [123]/);

    const [sesudahDb] = await pool.query(
      'SELECT id, isi, catatan, status, diubah_dari_id FROM profil_eksplorasi WHERE pengguna_id = ? ORDER BY id',
      [a.id]
    );
    assert.equal(sesudahDb.length, 3);
    assert.ok(sesudahDb.every((r) => r.catatan === null));
    assert.deepEqual(
      sesudahDb.map(({ catatan: _c, ...lain }) => lain),
      sebelumDb,
      'isian lain di setiap versi profil harus tetap utuh'
    );

    // Idempoten (saat catatan sudah kosong atau akun belum punya profil)
    const ulang = await panggil('DELETE', '/discover/profil/catatan', a.token);
    assert.equal(ulang.status, 200);
    assert.deepEqual(ulang.json.data, { dihapus: true });
    const c = await akun();
    assert.deepEqual((await panggil('DELETE', '/discover/profil/catatan', c.token)).json.data, { dihapus: true });

    // Sabotase #4: catatan semua versi milik B tetap utuh (API maupun repo langsung)
    assert.equal(await profilRepo.kosongkanCatatanMilikSendiri(a.id), 0);
    const riwayatB = (await panggil('GET', '/discover/profil/riwayat', b.token)).json.data;
    assert.deepEqual(
      riwayatB.map((v) => [v.id, v.catatan]),
      [
        [b1.id, 'Catatan B versi 1'],
        [b2.id, 'Catatan B versi 2'],
      ]
    );

    // Hapus akun tetap konsisten menghapus seluruh baris refleksi & profil milik A
    const hapusAkun = await panggil('DELETE', '/pengguna/saya', a.token, {
      penegasan: 'HAPUS AKUN SAYA',
      kata_sandi: SANDI,
    });
    assert.equal(hapusAkun.status, 200, JSON.stringify(hapusAkun.json));
    for (const tabel of ['refleksi_discover', 'profil_eksplorasi']) {
      const [[{ n }]] = await pool.query(`SELECT COUNT(*) AS n FROM ${tabel} WHERE pengguna_id = ?`, [a.id]);
      assert.equal(n, 0, `${tabel} harus kosong setelah hapus akun`);
    }
  });
});

// ---------------------------------------------------------------------------------------------
describe('Bagian B: Penyamaran id jalur draf pada bentukTujuan dan bentukButir tanpa mengubah tabel / perbarui / ekspor', () => {
  test('GET /tujuan, GET /tujuan/:id/riwayat, GET /butir-bukti, GET /butir-bukti/:id menyamarkan jalur draf, menjaga jalur disetujui, menjaga perbarui, dan menjaga tabel & ekspor', async () => {
    const a = await akun();
    const idDraf = UJI_JALUR.id.melanjutkan;
    const idTetap = UJI_JALUR.id.bekerja;

    // 1. Selagi kedua jalur disetujui: buat tujuan terkait idDraf (2 versi), tujuan terkait idTetap, tujuan tanpa jalur,
    //    serta 3 butir bukti (idDraf, idTetap, tanpa jalur).
    const tDrafV1 = (await panggil('POST', '/tujuan', a.token, { judul: 'Tujuan Draf v1', jalur_minat_id: idDraf })).json.data;
    assert.equal(tDrafV1.jalur_minat_id, idDraf);
    assert.equal(tDrafV1.jalur_belum_tersedia, false);
    const tDrafV2 = (await panggil('POST', `/tujuan/${tDrafV1.id}/versi`, a.token, { judul: 'Tujuan Draf v2' })).json.data;
    assert.equal(tDrafV2.jalur_minat_id, idDraf);
    assert.equal(tDrafV2.jalur_belum_tersedia, false);

    const tTetap = (await panggil('POST', '/tujuan', a.token, { judul: 'Tujuan Tetap', jalur_minat_id: idTetap })).json.data;
    const tKosong = (await panggil('POST', '/tujuan', a.token, { judul: 'Tujuan Tanpa Jalur' })).json.data;
    assert.deepEqual([tKosong.jalur_minat_id, tKosong.jalur_belum_tersedia], [null, false]);

    const resBDraf = await panggil('POST', '/butir-bukti', a.token, {
      judul: 'Karya Draf',
      jenis: 'karya',
      jalur_minat_id: idDraf,
    });
    assert.equal(resBDraf.status, 201, JSON.stringify(resBDraf.json));
    const bDraf = resBDraf.json.data;
    assert.deepEqual([bDraf.jalur_minat_id, bDraf.jalur_belum_tersedia], [idDraf, false]);
    const resBTetap = await panggil('POST', '/butir-bukti', a.token, {
      judul: 'Karya Tetap',
      jenis: 'proses',
      jalur_minat_id: idTetap,
    });
    assert.equal(resBTetap.status, 201, JSON.stringify(resBTetap.json));
    const bTetap = resBTetap.json.data;
    const resBKosong = await panggil('POST', '/butir-bukti', a.token, {
      judul: 'Karya Tanpa Jalur',
      jenis: 'refleksi',
    });
    assert.equal(resBKosong.status, 201, JSON.stringify(resBKosong.json));
    const bKosong = resBKosong.json.data;
    assert.deepEqual([bKosong.jalur_minat_id, bKosong.jalur_belum_tersedia], [null, false]);

    // 2. Kembalikan idDraf ke status 'draf'
    const [[awalJalur]] = await pool.query('SELECT nama, deskripsi_singkat FROM jalur_minat WHERE id = ?', [idDraf]);
    try {
      await pool.query("UPDATE jalur_minat SET status_teks = 'draf', nama = ?, deskripsi_singkat = ? WHERE id = ?", [
        NAMA_DRAF,
        TEKS_DRAF,
        idDraf,
      ]);

      // Sabotase #6: GET /tujuan & GET /tujuan/:id/riwayat menyamarkan idDraf
      const daftarTujuan = await panggil('GET', '/tujuan', a.token);
      assert.equal(daftarTujuan.status, 200);
      tanpaJejakDraf(daftarTujuan.json, idDraf, 'GET /tujuan');
      const itemTDraf = daftarTujuan.json.data.tujuan.find((x) => x.id === tDrafV2.id);
      const itemTTetap = daftarTujuan.json.data.tujuan.find((x) => x.id === tTetap.id);
      const itemTKosong = daftarTujuan.json.data.tujuan.find((x) => x.id === tKosong.id);
      assert.deepEqual([itemTDraf.jalur_minat_id, itemTDraf.jalur_belum_tersedia], [null, true]);
      assert.deepEqual([itemTTetap.jalur_minat_id, itemTTetap.jalur_belum_tersedia], [idTetap, false]);
      assert.deepEqual([itemTKosong.jalur_minat_id, itemTKosong.jalur_belum_tersedia], [null, false]);

      const riwayatTujuan = await panggil('GET', `/tujuan/${tDrafV2.id}/riwayat`, a.token);
      assert.equal(riwayatTujuan.status, 200);
      tanpaJejakDraf(riwayatTujuan.json, idDraf, 'GET /tujuan/:id/riwayat');
      assert.deepEqual(
        riwayatTujuan.json.data.map((v) => [v.versi_ke, v.jalur_minat_id, v.jalur_belum_tersedia]),
        [
          [1, null, true],
          [2, null, true],
        ]
      );

      // Sabotase #8: perbarui hanya judul tetap menyalin lama.jalur_minat_id di DB, sambil menyamarkan di respons
      const tDrafV3 = await panggil('POST', `/tujuan/${tDrafV2.id}/versi`, a.token, { judul: 'Tujuan Draf v3' });
      assert.equal(tDrafV3.status, 201, JSON.stringify(tDrafV3.json));
      tanpaJejakDraf(tDrafV3.json, idDraf, 'POST /tujuan/:id/versi');
      assert.deepEqual([tDrafV3.json.data.jalur_minat_id, tDrafV3.json.data.jalur_belum_tersedia], [null, true]);

      // Sabotase #7: GET /butir-bukti & GET /butir-bukti/:id & PATCH /butir-bukti/:id menyamarkan idDraf
      const daftarButir = await panggil('GET', '/butir-bukti', a.token);
      assert.equal(daftarButir.status, 200);
      tanpaJejakDraf(daftarButir.json, idDraf, 'GET /butir-bukti');
      const itemBDraf = daftarButir.json.data.find((x) => x.id === bDraf.id);
      const itemBTetap = daftarButir.json.data.find((x) => x.id === bTetap.id);
      const itemBKosong = daftarButir.json.data.find((x) => x.id === bKosong.id);
      assert.deepEqual([itemBDraf.jalur_minat_id, itemBDraf.jalur_belum_tersedia], [null, true]);
      assert.deepEqual([itemBTetap.jalur_minat_id, itemBTetap.jalur_belum_tersedia], [idTetap, false]);
      assert.deepEqual([itemBKosong.jalur_minat_id, itemBKosong.jalur_belum_tersedia], [null, false]);

      const satuButir = await panggil('GET', `/butir-bukti/${bDraf.id}`, a.token);
      assert.equal(satuButir.status, 200);
      tanpaJejakDraf(satuButir.json, idDraf, 'GET /butir-bukti/:id');
      assert.deepEqual([satuButir.json.data.jalur_minat_id, satuButir.json.data.jalur_belum_tersedia], [null, true]);

      const ubahButir = await panggil('PATCH', `/butir-bukti/${bDraf.id}`, a.token, { judul: 'Karya Draf Diubah' });
      assert.equal(ubahButir.status, 200);
      tanpaJejakDraf(ubahButir.json, idDraf, 'PATCH /butir-bukti/:id');
      assert.deepEqual([ubahButir.json.data.jalur_minat_id, ubahButir.json.data.jalur_belum_tersedia], [null, true]);

      // Sabotase #8 (cek tabel & ekspor): data mentah di tabel TIDAK berubah, dan ekspor tetap memuat id mentah milik siswa
      const [barisTujuanDb] = await pool.query(
        'SELECT id, jalur_minat_id FROM tujuan WHERE id IN (?)',
        [[tDrafV1.id, tDrafV2.id, tDrafV3.json.data.id]]
      );
      assert.equal(barisTujuanDb.length, 3);
      assert.ok(barisTujuanDb.every((r) => r.jalur_minat_id === idDraf), 'samarkanJalur tidak boleh mengubah kolom jalur_minat_id di tabel tujuan');

      const [[barisButirDb]] = await pool.query('SELECT jalur_minat_id FROM butir_bukti WHERE id = ?', [bDraf.id]);
      assert.equal(barisButirDb.jalur_minat_id, idDraf, 'samarkanJalur tidak boleh mengubah kolom jalur_minat_id di tabel butir_bukti');

      const ekspor = (await panggil('GET', '/pengguna/saya/ekspor', a.token)).json.data;
      assert.equal(ekspor.tujuan.find((t) => t.id === tDrafV3.json.data.id)?.jalur_minat_id, idDraf);
      assert.equal(ekspor.butir_bukti.find((b) => b.id === bDraf.id)?.jalur_minat_id, idDraf);
    } finally {
      await pool.query("UPDATE jalur_minat SET status_teks = 'disetujui', nama = ?, deskripsi_singkat = ? WHERE id = ?", [
        awalJalur.nama,
        awalJalur.deskripsi_singkat,
        idDraf,
      ]);
    }

    // 3. Begitu jalur disetujui kembali, data tampil lagi tanpa kehilangan apa pun
    const daftarPulih = (await panggil('GET', '/tujuan', a.token)).json.data.tujuan;
    assert.ok(daftarPulih.some((t) => t.judul === 'Tujuan Draf v3' && t.jalur_minat_id === idDraf && t.jalur_belum_tersedia === false));
    const butirPulih = (await panggil('GET', `/butir-bukti/${bDraf.id}`, a.token)).json.data;
    assert.deepEqual([butirPulih.jalur_minat_id, butirPulih.jalur_belum_tersedia], [idDraf, false]);
  });
});

// ---------------------------------------------------------------------------------------------
describe('Bagian C: Klien v2 (label jujur DELETE, penyamaran tujuan/butir, v1 dan APK 1.0.0 utuh)', () => {
  const JALUR_DIS = [
    { id: 'melanjutkan', nama: '[DUMMY] Melanjutkan', deskripsi_singkat: 'S.', status_teks: 'disetujui', urutan: 1 },
  ];

  test('labelJalur menangani bentuk Tujuan dan ButirBukti dari server 035 (draf tersamar, disetujui, dan tanpa jalur)', () => {
    // Draf tersamar dari bentukTujuan / bentukButir -> label netral, bukan id mentah
    assert.equal(jalurSaya.labelJalur({ jalur_minat_id: null, jalur_belum_tersedia: true }, JALUR_DIS), 'Jalur belum tersedia');
    // Tidak dikaitkan ke jalur -> null
    assert.equal(jalurSaya.labelJalur({ jalur_minat_id: null, jalur_belum_tersedia: false }, JALUR_DIS), null);
    assert.equal(jalurSaya.labelJalur({ jalur_minat_id: null }, JALUR_DIS), null);
    // Disetujui -> nama jalur
    assert.equal(jalurSaya.labelJalur({ jalur_minat_id: 'melanjutkan', jalur_belum_tersedia: false }, JALUR_DIS), '[DUMMY] Melanjutkan');
    // Jalur asing / belum disetujui -> label netral
    assert.equal(jalurSaya.labelJalur({ jalur_minat_id: 'bekerja', jalur_belum_tersedia: false }, JALUR_DIS), 'Jalur belum tersedia');
  });

  test('FormTujuanV2 mempertahankan jalur draf di server saat hanya judul/uraian diubah, dan tetap bisa melepas/mengganti jalur', () => {
    const tujuanDraf = {
      id: 't1',
      jalur_minat_id: null,
      jalur_belum_tersedia: true,
      judul: 'Judul lama',
      uraian: null,
      target_pada: null,
      status: 'aktif',
      diubah_dari_id: null,
      dibuat_pada: '2026-11-25T00:00:00Z',
      diubah_pada: '2026-11-25T00:00:00Z',
    };
    assert.equal(jalurSaya.tujuanPunyaJalurDraf(tujuanDraf, JALUR_DIS), true);
    const awalVal = jalurSaya.nilaiJalurAwalFormV2(tujuanDraf, JALUR_DIS);
    assert.equal(awalVal, jalurSaya.NILAI_JALUR_DRAF_TETAP);

    // Tidak ada perubahan -> null
    assert.equal(jalurSaya.badanTujuanV2({ judul: 'Judul lama', uraian: '', target: '', jalur: awalVal }, tujuanDraf), null);
    // Ubah hanya judul -> jalur_minat_id TIDAK dikirim agar server menyalin lama.jalur_minat_id
    const hanyaJudul = jalurSaya.badanTujuanV2({ judul: 'Judul baru', uraian: '', target: '', jalur: awalVal }, tujuanDraf);
    assert.deepEqual(hanyaJudul, { judul: 'Judul baru' });
    assert.ok(!('jalur_minat_id' in hanyaJudul));
    // Ubah ke "Belum terkait jalur" -> kirim jalur_minat_id: null
    assert.deepEqual(
      jalurSaya.badanTujuanV2({ judul: 'Judul lama', uraian: '', target: '', jalur: null }, tujuanDraf),
      { jalur_minat_id: null }
    );
    // Ubah ke jalur disetujui -> kirim jalur_minat_id baru
    assert.deepEqual(
      jalurSaya.badanTujuanV2({ judul: 'Judul lama', uraian: '', target: '', jalur: 'melanjutkan' }, tujuanDraf),
      { jalur_minat_id: 'melanjutkan' }
    );
  });

  test('Sabotase #9: semua tombol berlabel "Hapus" di v2 wajib tersambung ke endpoint DELETE sungguhan, bukan PUT/POST kosongkan', () => {
    const hookV2 = baca('hooks/useJelajahV2.ts');
    assert.match(hookV2, /export const useHapusRefleksiV2 = \(\) =>[\s\S]*?method:\s*'DELETE'/);
    assert.match(hookV2, /export const useHapusCatatanProfilV2 = \(\) =>[\s\S]*?method:\s*'DELETE'/);

    const jelajahTsx = baca('components/screens/v2/JelajahV2.tsx');
    const fnRefleksi = /function FormRefleksiV2\([\s\S]*?\n\}\n/.exec(jelajahTsx)?.[0];
    assert.ok(fnRefleksi, 'FormRefleksiV2 harus ada');
    assert.match(fnRefleksi, /const hapus = useHapusRefleksiV2\(\);/);
    const fnHapusRefleksi = /const hapusRefleksi = \(\) => \{[\s\S]*?\n  \};/.exec(fnRefleksi)?.[0];
    assert.ok(fnHapusRefleksi, 'handler hapusRefleksi harus ada');
    assert.match(fnHapusRefleksi, /hapus\.mutate\(/, 'tombol Hapus refleksi wajib memanggil hook DELETE');
    assert.doesNotMatch(fnHapusRefleksi, /simpan\.mutate|badanKosongkan|PUT/, 'tombol Hapus refleksi dilarang hanya mengosongkan via PUT');

    const profilTsx = baca('components/screens/v2/ProfilEksplorasiV2.tsx');
    const fnProfil = /function FormProfilV2\([\s\S]*?\n\}\n/.exec(profilTsx)?.[0];
    assert.ok(fnProfil, 'FormProfilV2 harus ada');
    assert.match(fnProfil, /const hapusCatatanMut = useHapusCatatanProfilV2\(\);/);
    const fnHapusCatatan = /const hapusCatatan = \(\) => \{[\s\S]*?\n  \};/.exec(fnProfil)?.[0];
    assert.ok(fnHapusCatatan, 'handler hapusCatatan harus ada');
    assert.match(fnHapusCatatan, /hapusCatatanMut\.mutate\(/, 'tombol Hapus catatan wajib memanggil hook DELETE');
    assert.doesNotMatch(fnHapusCatatan, /perbarui\.mutate|catatan:\s*null|POST/, 'tombol Hapus catatan dilarang memakai POST catatan null');

    // Periksa AST semua <Tombol> berlabel "Hapus" di kedua layar v2 agar tidak ada label "Hapus" palsu
    const cekTombolHapus = (rel, handlerWajib) => {
      const sf = ts.createSourceFile(rel, baca(rel), ts.ScriptTarget.ES2022, true, ts.ScriptKind.TSX);
      let ditemukan = 0;
      const jalan = (n) => {
        if ((ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) && n.tagName.getText() === 'Tombol') {
          const atr = new Map(n.attributes.properties.filter(ts.isJsxAttribute).map((a) => [a.name.getText(), a.initializer?.getText() ?? '']));
          const lbl = atr.get('label') ?? '';
          if (/hapus/i.test(lbl)) {
            ditemukan += 1;
            assert.equal(atr.get('onPress'), `{${handlerWajib}}`, `${rel}: tombol ${lbl} harus memanggil ${handlerWajib}`);
          }
        }
        ts.forEachChild(n, jalan);
      };
      jalan(sf);
      assert.equal(ditemukan, 1, `${rel}: tepat satu tombol Hapus`);
    };
    cekTombolHapus('components/screens/v2/JelajahV2.tsx', 'hapusRefleksi');
    cekTombolHapus('components/screens/v2/ProfilEksplorasiV2.tsx', 'hapusCatatan');

    // Tidak ada klaim privasi baru di teks draf 035
    assert.equal(jelajah.TEKS_PRIVASI_JELAJAH, muatModulApp('lib/discover').TEKS_DISCOVER.privasi);
  });

  test('Layar v1 dan kompatibel-apk-lama.test.js tidak tersentuh, tidak ada migrasi baru', () => {
    const dicek = [
      'components/screens/DiscoverScreens.tsx',
      'hooks/useDiscover.ts',
      'lib/discover.ts',
      'components/screens/JalurTujuanScreens.tsx',
      'components/screens/PortofolioScreens.tsx',
      'server/tests/kompatibel-apk-lama.test.js',
      'docs/persetujuan-teks-rilis.json',
    ];
    for (const rel of dicek) {
      const st = execFileSync('git', ['status', '--porcelain', rel], { cwd: AKAR_APP, encoding: 'utf8' }).trim();
      assert.equal(st, '', `${rel} tidak boleh diubah`);
    }
    const stMigrasi = execFileSync('git', ['status', '--porcelain', 'server/src/db/migrasi'], {
      cwd: AKAR_APP,
      encoding: 'utf8',
    }).trim();
    assert.equal(stMigrasi, '', 'tidak boleh ada migrasi baru atau perubahan skema');
  });
});
