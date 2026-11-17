// LANJUT_025 seri v2: skrip persetujuan dummy (tools/benih-persetujuan-dummy.js) hanya jalan di
// basis data dev, tidak pernah menulis berkas di data-konten, dan --cabut mengembalikan daftar
// kartu dan jalur yang disetujui seperti semula.
//
// Tes tidak boleh menyentuh lanjut_dev, padahal skrip hanya mau jalan di basis data lanjut_dev.
// Jadi tes memberi `env` palsu yang lolos pagar, sedangkan `db` adalah pool basis data tes, dan
// barisnya adalah kartu serta jalur uji sementara (berstatus draf, sama seperti data konten), yang
// dimuat dari salinan berkas konten di folder sementara. Baris asli tidak disentuh, sebab tes benih
// lain berjalan paralel. Selama baris uji ada, tes memegang kunci jalur aktif dan kunci kartu
// Discover, seperti berkas lain yang memasang baris uji.

const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('./bantuan');
const alat = require('../tools/benih-persetujuan-dummy');
const { DIR_DATA } = require('../src/db/benih/benih');
const kartuRepo = require('../src/modul/discover/kartu-discover.repo');
const jalurRepo = require('../src/modul/jalur-minat/jalur-minat.repo');
const { kunciJalurAktif } = require('./kunci-jalur-aktif');
const { kunciKartuDiscover } = require('./kartu-discover-uji');

const ALAT = path.join(__dirname, '..', 'tools', 'benih-persetujuan-dummy.js');
const DEV = { NODE_ENV: 'development', DB_HOST: '127.0.0.1', DB_NAME: 'lanjut_dev' };

after(async () => {
  await pool.end();
});

/** Nama, sidik isi, dan waktu ubah setiap berkas di folder (rekursif). */
function potretFolder(dir) {
  const hasil = {};
  const jelajah = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) jelajah(p);
      else {
        const st = fs.statSync(p);
        hasil[path.relative(dir, p)] = `${crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex')}:${st.mtimeMs}`;
      }
    }
  };
  jelajah(dir);
  return hasil;
}

/** Pengganti pool yang mencatat setiap pemakaian, untuk membuktikan basis data tidak disentuh. */
function poolPengintai() {
  const panggilan = [];
  const catat = (nama) => (...a) => {
    panggilan.push(nama);
    throw new Error(`basis data disentuh lewat ${nama}`);
  };
  return { panggilan, db: { query: catat('query'), execute: catat('execute'), getConnection: catat('getConnection') } };
}

test('Pagar: menolak produksi, host yang bukan lokal, dan basis data yang namanya tidak diawali lanjut_dev', () => {
  assert.equal(alat.alasanTolak(DEV), null);
  assert.equal(alat.alasanTolak({ ...DEV, DB_NAME: 'lanjut_dev_khalifa' }), null);
  assert.equal(alat.alasanTolak({ ...DEV, DB_HOST: 'localhost' }), null);

  assert.match(alat.alasanTolak({ ...DEV, NODE_ENV: 'production' }), /production/);
  for (const host of ['db', 'db.contoh.test', '10.0.0.5', '', undefined]) {
    assert.match(alat.alasanTolak({ ...DEV, DB_HOST: host }), /bukan lokal/, String(host));
  }
  for (const nama of ['lanjut_test', 'lanjut_test_j025', 'lanjut_db', 'lanjut_devel', 'dev_lanjut', 'lanjut', '', undefined]) {
    assert.match(alat.alasanTolak({ ...DEV, DB_NAME: nama }), /bukan basis data dev/, String(nama));
  }
});

test('Pagar diperiksa sebelum basis data disentuh, dan argumen yang tidak dikenal ditolak', async () => {
  for (const env of [{ ...DEV, NODE_ENV: 'production' }, { ...DEV, DB_HOST: 'db.contoh.test' }, { ...DEV, DB_NAME: 'lanjut_test' }]) {
    for (const argv of [[], ['--cabut']]) {
      const { panggilan, db } = poolPengintai();
      await assert.rejects(alat.jalankan({ env, argv, db, log: () => {} }), /production|bukan lokal|bukan basis data dev/);
      assert.deepEqual(panggilan, [], JSON.stringify(env));
    }
  }
  assert.equal(alat.pilihAksi([]), 'tandai');
  assert.equal(alat.pilihAksi(['--cabut']), 'cabut');
  for (const argv of [['--cabutt'], ['--ya'], ['--cabut', '--timpa-produksi']]) {
    assert.throws(() => alat.pilihAksi(argv), /tidak dikenal/, argv.join(' '));
    const { panggilan, db } = poolPengintai();
    await assert.rejects(alat.jalankan({ env: DEV, argv, db, log: () => {} }), /tidak dikenal/);
    assert.deepEqual(panggilan, []);
  }
});

test('Baris perintah berhenti sebelum menyambung ke basis data, untuk produksi dan untuk basis data yang bukan dev', () => {
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjut-persetujuan-dummy-'));
  // DB_PORT=1: bila pagar jebol, sambungan gagal, bukan menulis ke basis data dev sungguhan.
  const dasar = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, DB_HOST: '127.0.0.1', DB_PORT: '1', DB_USER: 'uji', DB_PASSWORD: 'x', CORS_ORIGINS: 'https://app.contoh.test' };
  try {
    for (const [tambahan, pola] of [
      [{ NODE_ENV: 'production', DB_NAME: 'lanjut_dev', TRUST_PROXY: '1' }, /DIHENTIKAN\. NODE_ENV=production/],
      [{ NODE_ENV: 'development', DB_NAME: 'lanjut_test_x' }, /DIHENTIKAN\. Basis data lanjut_test_x bukan basis data dev/],
    ]) {
      for (const argv of [[], ['--cabut']]) {
        const r = spawnSync(process.execPath, [ALAT, ...argv], { cwd: folder, env: { ...dasar, ...tambahan }, encoding: 'utf8', timeout: 60000 });
        assert.equal(r.status, 1, r.stdout + r.stderr);
        assert.match(r.stderr, pola);
        assert.doesNotMatch(r.stdout + r.stderr, /ECONNREFUSED|Ditandai|Dicabut/);
      }
    }
  } finally {
    fs.rmSync(folder, { recursive: true, force: true });
  }
});

test('Baris bawaan ada di data konten dan masih draf; teks dummy terbaca palsu dan sumbernya bukan alamat', () => {
  const discover = JSON.parse(fs.readFileSync(path.join(DIR_DATA, 'discover.json'), 'utf8'));
  const jalur = JSON.parse(fs.readFileSync(path.join(DIR_DATA, 'jalur-minat.json'), 'utf8'));
  const k = discover.data.find((x) => x.id === alat.TARGET.kartu);
  const j = jalur.data.find((x) => x.id === alat.TARGET.jalur);
  assert.equal(k?.status_teks, 'draf');
  assert.equal(j?.status_teks, 'draf');

  const d = alat.isiDummy(alat.isiDariBerkas(DIR_DATA, alat.TARGET));
  assert.match(alat.TANDA, /^\[DUMMY/);
  assert.match(d.kartu.judul, /^\[DUMMY\] /);
  assert.match(d.jalur.nama, /^\[DUMMY\] /);
  for (const teks of [d.kartu.ringkasan, d.jalur.deskripsi_singkat]) assert.ok(teks.startsWith(alat.TANDA), teks);
  for (const sumber of [d.kartu.url_sumber, d.jalur.url_sumber]) {
    assert.equal(sumber, alat.TANDA);
    assert.doesNotMatch(sumber, /https?:|www\.|\.go\.id|\.ac\.id/);
  }
  // Ringkasan asli dari data konten tidak dipakai di teks dummy.
  assert.ok(!d.kartu.ringkasan.includes(k.ringkasan));
  assert.ok(!d.jalur.deskripsi_singkat.includes(j.deskripsi_singkat));
  assert.ok(d.kartu.ringkasan.length <= 500 && d.jalur.deskripsi_singkat.length <= 255 && d.kartu.judul.length <= 120 && d.jalur.nama.length <= 120);
  // Catatan perubahan tidak ditulis ke folder data konten.
  assert.ok(path.relative(DIR_DATA, alat.BERKAS_LOG).startsWith('..'));
});

test('Tandai lalu --cabut: hanya baris itu yang disetujui, berkas konten tidak berubah, dan daftar kembali seperti semula', async () => {
  const lepasJalur = await kunciJalurAktif(pool);
  const lepasKartu = await kunciKartuDiscover(pool);
  const akhiran = crypto.randomUUID().slice(0, 8);
  const target = { kartu: `uji-pd-kartu-${akhiran}`, jalur: `uji-pd-jalur-${akhiran}` };
  const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'lanjut-persetujuan-dummy-'));
  const dirData = path.join(folder, 'data-konten');
  const berkasLog = path.join(folder, 'persetujuan.log');
  try {
    // Salinan berkas konten dengan satu kartu dan satu jalur uji tambahan, keduanya draf.
    fs.mkdirSync(dirData);
    const discover = JSON.parse(fs.readFileSync(path.join(DIR_DATA, 'discover.json'), 'utf8'));
    const jalur = JSON.parse(fs.readFileSync(path.join(DIR_DATA, 'jalur-minat.json'), 'utf8'));
    const kartuUji = { id: target.kartu, jenis: 'bidang', judul: `Kartu Uji ${akhiran}`, ringkasan: 'Ringkasan draf uji.', status_teks: 'draf', urutan: 95, aktif: true, url_sumber: '[ISI: sumber]', diperiksa_pada: null };
    const jalurUji = { id: target.jalur, nama: `Jalur Uji ${akhiran}`, deskripsi_singkat: 'Deskripsi draf uji.', status_teks: 'draf', urutan: 95, aktif: true };
    discover.data.push(kartuUji);
    jalur.data.push(jalurUji);
    fs.writeFileSync(path.join(dirData, 'discover.json'), JSON.stringify(discover, null, 2));
    fs.writeFileSync(path.join(dirData, 'jalur-minat.json'), JSON.stringify(jalur, null, 2));
    // Barisnya di basis data, seperti hasil benih dari berkas itu.
    await pool.query(
      "INSERT INTO kartu_discover (id, jenis, judul, ringkasan, status_teks, urutan, aktif, pemilik, asal, url_sumber) VALUES (?, 'bidang', ?, ?, 'draf', 95, 1, 'tim', 'uji', NULL)",
      [target.kartu, kartuUji.judul, kartuUji.ringkasan]
    );
    await pool.query(
      "INSERT INTO jalur_minat (id, nama, deskripsi_singkat, status_teks, urutan, aktif, pemilik, asal, url_sumber) VALUES (?, ?, ?, 'draf', 95, 1, 'tim', 'uji', NULL)",
      [target.jalur, jalurUji.nama, jalurUji.deskripsi_singkat]
    );

    const potretAsli = potretFolder(DIR_DATA);
    const potretSalinan = potretFolder(dirData);
    const kartuAwal = await kartuRepo.daftarDisetujui();
    const jalurAwal = await jalurRepo.daftarDisetujui();
    assert.ok(!kartuAwal.some((k) => k.id === target.kartu) && !jalurAwal.some((j) => j.id === target.jalur));

    const hasil = await alat.jalankan({ env: DEV, argv: [], db: pool, target, dirData, berkasLog, log: () => {} });
    assert.equal(hasil.aksi, 'tandai');
    const kartuTanda = await kartuRepo.daftarDisetujui();
    const jalurTanda = await jalurRepo.daftarDisetujui();
    assert.deepEqual(kartuTanda.map((k) => k.id).sort(), [...kartuAwal.map((k) => k.id), target.kartu].sort(), 'hanya kartu itu yang bertambah');
    assert.deepEqual(jalurTanda.map((j) => j.id).sort(), [...jalurAwal.map((j) => j.id), target.jalur].sort(), 'hanya jalur itu yang bertambah');
    const k = kartuTanda.find((x) => x.id === target.kartu);
    const j = jalurTanda.find((x) => x.id === target.jalur);
    assert.equal(k.judul, `[DUMMY] ${kartuUji.judul}`);
    assert.ok(k.ringkasan.startsWith(alat.TANDA));
    assert.equal(k.url_sumber, alat.TANDA);
    assert.equal(j.nama, `[DUMMY] ${jalurUji.nama}`);
    assert.ok(j.deskripsi_singkat.startsWith(alat.TANDA));
    const [[v]] = await pool.query('SELECT status_verifikasi, diperiksa_pada FROM kartu_discover WHERE id = ?', [target.kartu]);
    assert.deepEqual({ ...v }, { status_verifikasi: 'belum_diverifikasi', diperiksa_pada: null }, 'teks dummy tidak pernah tampil sebagai sudah dicek');

    const cabut = await alat.jalankan({ env: DEV, argv: ['--cabut'], db: pool, target, dirData, berkasLog, log: () => {} });
    assert.equal(cabut.aksi, 'cabut');
    assert.deepEqual(await kartuRepo.daftarDisetujui(), kartuAwal, 'sesudah --cabut, daftar kartu kembali seperti semula');
    assert.deepEqual(await jalurRepo.daftarDisetujui(), jalurAwal, 'sesudah --cabut, daftar jalur kembali seperti semula');
    const [[kk]] = await pool.query('SELECT judul, ringkasan, status_teks, url_sumber FROM kartu_discover WHERE id = ?', [target.kartu]);
    const [[jj]] = await pool.query('SELECT nama, deskripsi_singkat, status_teks, url_sumber FROM jalur_minat WHERE id = ?', [target.jalur]);
    assert.deepEqual({ ...kk }, { judul: kartuUji.judul, ringkasan: kartuUji.ringkasan, status_teks: 'draf', url_sumber: null });
    assert.deepEqual({ ...jj }, { nama: jalurUji.nama, deskripsi_singkat: jalurUji.deskripsi_singkat, status_teks: 'draf', url_sumber: null });

    // Berkas konten, asli maupun salinan yang dibaca --cabut, tidak berubah sama sekali.
    assert.deepEqual(potretFolder(DIR_DATA), potretAsli, 'server/data-konten berubah');
    assert.deepEqual(potretFolder(dirData), potretSalinan, 'berkas konten yang dibaca berubah');

    // Setiap perubahan tercatat, sebelum dan sesudah.
    const catatan = fs.readFileSync(berkasLog, 'utf8').trim().split('\n').map((b) => JSON.parse(b));
    assert.deepEqual(catatan.map((c) => [c.aksi, c.tabel, c.id]), [
      ['tandai', 'kartu_discover', target.kartu],
      ['tandai', 'jalur_minat', target.jalur],
      ['cabut', 'kartu_discover', target.kartu],
      ['cabut', 'jalur_minat', target.jalur],
    ]);
    assert.deepEqual([catatan[0].sebelum.status_teks, catatan[0].sesudah.status_teks, catatan[2].sesudah.status_teks], ['draf', 'disetujui', 'draf']);
    assert.match(catatan[0].tujuan, /lanjut_dev/);
  } finally {
    await pool.query('DELETE FROM kartu_discover WHERE id = ?', [target.kartu]);
    await pool.query('DELETE FROM jalur_minat WHERE id = ?', [target.jalur]);
    fs.rmSync(folder, { recursive: true, force: true });
    await lepasKartu();
    await lepasJalur();
  }
});
