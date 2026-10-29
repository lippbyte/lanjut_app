// Uji `npm run benih` dan tanda verifikasi.
//
// LANJUT_011: tandai lewat skrip verifikasi-konten → benih ulang dengan isi
// yang SAMA → baris tetap terverifikasi; baris baru masuk "belum diverifikasi".
// LANJUT_020: isi berubah → benih → tanda di-reset (verifikasi lama basi).
// LANJUT_043: kartu kurasi (arsip.json) ikut aturan yang sama — dulu benih
// selalu menulis ulang statusnya jadi "belum", sehingga tanda tim hilang.
//
// Baris baru & perubahan isi memakai berkas FIXTURE (id berawalan `uji-benih-`),
// bukan baris konten asli: baris asli seperti `pelaksanaan-tka` bisa sudah
// ditandai tim konten di basis data yang sama, dan test tidak boleh menghapus
// tanda itu. Untuk tabel yang fungsi benihnya tidak menerima berkas pengganti,
// "isi berubah" disimulasikan dengan mengubah satu kolom konten di basis data
// sehingga berbeda dari JSON — bagi SQL-nya itu persis sama dengan JSON yang
// berubah.
//
// File test jalan paralel, jadi baris yang dipakai di sini sengaja berbeda
// dari verifikasi-konten.test.js (Linimasa sosialisasi/pdss). Checklist
// memakai butir contoh sendiri (rumpun Sosial & Humaniora, kategori sendiri)
// karena konten-checklist-rumpun.test.js membandingkan respons checklist
// persis, dan butir umum yang berubah status akan merusak pembandingan itu.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool } = require('./bantuan');
const { jalankanBenih, benihLinimasa, benihChecklist, benihArsipKartu } = require('../src/db/benih/benih');
const { JENIS, ubahStatus } = require('../src/db/verifikasi/verifikasi-konten');

// Satu baris asli per jenis yang bisa diverifikasi (selain checklist).
const BARIS = {
  linimasa: 'daftar-snbp',
  'khusus-smk': 'nilai-rapor',
  prodi: 'akuntansi',
  mapel: 'kimia',
  'cerita-alumni': 'contoh-1',
};
// Satu baris asli per jenis untuk simulasi "isi berubah" — sengaja berbeda
// dari BARIS di atas dan dari baris yang dipakai file test lain.
const BARIS_BASI = {
  'khusus-smk': 'jadwal-pkl',
  prodi: 'k3',
  mapel: 'geografi',
  'cerita-alumni': 'contoh-2',
};

// Tanggal lampau supaya tidak pernah jadi "tenggat terdekat" di aplikasi.
const LINIMASA_FIXTURE = {
  sumber: 'resmi',
  pemilik: 'tim',
  asal: 'contoh',
  status: 'belum_diverifikasi',
  data: [
    {
      id: 'uji-benih-linimasa',
      judul: 'UJI: tahapan fixture benih',
      tanggal_mulai: '2020-01-01',
      tanggal_selesai: '2020-01-05',
      jalur: 'TKA',
      url_sumber: 'https://www.kemendikdasmen.go.id/',
    },
  ],
};
const ID_LINIMASA = LINIMASA_FIXTURE.data[0].id;
const linimasaDengan = (ubah) => ({ ...LINIMASA_FIXTURE, data: [{ ...LINIMASA_FIXTURE.data[0], ...ubah }] });

const CHECKLIST_CONTOH = {
  sumber: 'resmi',
  pemilik: 'tim',
  asal: 'contoh',
  status: 'belum_diverifikasi',
  kategori: [
    {
      id: 'contoh-verifikasi',
      nama: 'Contoh Verifikasi (uji benih)',
      butir: [
        {
          id: 'contoh-verifikasi-soshum',
          judul: 'CONTOH: butir untuk uji benih & verifikasi',
          urutan: 950,
          berlaku_untuk_kelas: ['12'],
          berlaku_untuk_jalur: ['SNBP'],
          berlaku_untuk_rumpun: ['Sosial & Humaniora'],
        },
      ],
    },
  ],
};
const ID_CHECKLIST = CHECKLIST_CONTOH.kategori[0].butir[0].id;

// LANJUT_043: kartu kurasi (arsip.json). Kartu kurasi terverifikasi langsung
// terlihat semua akun, jadi fixture ini disisipkan SUDAH terverifikasi dan
// hanya pernah turun ke "belum" — alasannya di kepala verifikasi-konten.test.js.
const KARTU_FIXTURE = {
  pemilik: 'tim',
  asal: 'contoh',
  data: [
    {
      id: 'uji-benih-kartu',
      mapel_id: 'matematika',
      judul: 'UJI: kartu fixture benih',
      isi: 'UJI: isi kartu fixture',
      jawaban: 'UJI: jawaban fixture',
      sumber: 'resmi',
      dibuat_pada: '2020-01-01',
    },
  ],
};
const ID_KARTU = KARTU_FIXTURE.data[0].id;
const ID_KARTU_BARU = 'uji-benih-kartu-baru';
const kartuDengan = (ubah) => ({ ...KARTU_FIXTURE, data: [{ ...KARTU_FIXTURE.data[0], ...ubah }] });

const asli = {};

async function status(jenis, id) {
  const [[b]] = await pool.query('SELECT status_verifikasi, diperiksa_pada FROM ?? WHERE id = ?', [
    JENIS[jenis].tabel,
    id,
  ]);
  return b && { status: b.status_verifikasi, tanggal: b.diperiksa_pada && new Date(b.diperiksa_pada).toISOString().slice(0, 10) };
}

async function hapusChecklistContoh() {
  await pool.query('DELETE FROM butir_daftar_periksa WHERE id = ?', [ID_CHECKLIST]);
  await pool.query('DELETE FROM kategori_checklist WHERE id = ?', ['contoh-verifikasi']);
}

async function hapusLinimasaFixture() {
  await pool.query('DELETE FROM tahapan_linimasa WHERE id = ?', [ID_LINIMASA]);
}

async function hapusKartuFixture() {
  await pool.query('DELETE FROM kartu WHERE id IN (?, ?)', [ID_KARTU, ID_KARTU_BARU]);
}

/** Kartu fixture dengan isi persis seperti yang ditulis benihArsipKartu(KARTU_FIXTURE), sudah ditandai. */
async function sisipKartuTerverifikasi() {
  const k = KARTU_FIXTURE.data[0];
  const waktu = `${k.dibuat_pada} 00:00:00`;
  await pool.query(
    `INSERT INTO kartu
       (id, pemilik_id, mapel_id, judul, isi, jawaban, sumber, penyedia, pemilik,
        status_verifikasi, asal, url_sumber, diperiksa_pada, dibuat_pada, diubah_pada)
     VALUES (?, NULL, ?, ?, ?, ?, ?, NULL, ?, 'terverifikasi', ?, NULL, '2026-09-20', ?, ?)`,
    [k.id, k.mapel_id, k.judul, k.isi, k.jawaban, k.sumber, KARTU_FIXTURE.pemilik, KARTU_FIXTURE.asal, waktu, waktu]
  );
}

const tandai = (jenis, id) => ubahStatus({ jenis, ids: [id], tanggal: '2026-09-20', batal: false, konfirmasi: true });
const TERVERIFIKASI = { status: 'terverifikasi', tanggal: '2026-09-20' };
const BELUM = { status: 'belum_diverifikasi', tanggal: null };

before(async () => {
  await hapusChecklistContoh();
  await hapusLinimasaFixture();
  await hapusKartuFixture();
  for (const [jenis, id] of [...Object.entries(BARIS), ...Object.entries(BARIS_BASI)]) {
    const [[b]] = await pool.query('SELECT status_verifikasi, diperiksa_pada FROM ?? WHERE id = ?', [JENIS[jenis].tabel, id]);
    assert.ok(b, `baris ${jenis}/${id} belum dibenih`);
    asli[`${jenis}/${id}`] = b;
  }
});

after(async () => {
  // Isi yang diubah test dikembalikan dulu dari JSON, baru tanda aslinya.
  await jalankanBenih();
  for (const [jenis, id] of [...Object.entries(BARIS), ...Object.entries(BARIS_BASI)]) {
    const b = asli[`${jenis}/${id}`];
    await pool.query('UPDATE ?? SET status_verifikasi = ?, diperiksa_pada = ? WHERE id = ?', [
      JENIS[jenis].tabel,
      b.status_verifikasi,
      b.diperiksa_pada,
      id,
    ]);
  }
  await hapusChecklistContoh();
  await hapusLinimasaFixture();
  await hapusKartuFixture();
  await pool.end();
});

test('benih ulang: baris yang sudah ditandai terverifikasi TETAP terverifikasi (semua jenis)', async () => {
  for (const [jenis, id] of Object.entries(BARIS)) {
    await ubahStatus({ jenis, ids: [id], tanggal: '2026-09-20', batal: false, konfirmasi: true });
  }
  await jalankanBenih();
  for (const [jenis, id] of Object.entries(BARIS)) {
    assert.deepEqual(await status(jenis, id), { status: 'terverifikasi', tanggal: '2026-09-20' }, `${jenis}/${id} ter-reset oleh benih`);
  }
});

test('benih ulang: butir checklist yang sudah ditandai terverifikasi TETAP terverifikasi', async () => {
  await benihChecklist(CHECKLIST_CONTOH);
  assert.deepEqual(await status('checklist', ID_CHECKLIST), { status: 'belum_diverifikasi', tanggal: null });

  await ubahStatus({ jenis: 'checklist', ids: [ID_CHECKLIST], tanggal: '2026-09-20', batal: false, konfirmasi: true });
  await benihChecklist(CHECKLIST_CONTOH);
  assert.deepEqual(await status('checklist', ID_CHECKLIST), { status: 'terverifikasi', tanggal: '2026-09-20' });
});

test('benih ulang: kolom konten lain tetap diperbarui dari JSON', async () => {
  const [[sebelum]] = await pool.query('SELECT judul FROM tahapan_linimasa WHERE id = ?', [BARIS.linimasa]);
  await pool.query("UPDATE tahapan_linimasa SET judul = 'JUDUL BASI' WHERE id = ?", [BARIS.linimasa]);
  await jalankanBenih();
  const [[sesudah]] = await pool.query('SELECT judul FROM tahapan_linimasa WHERE id = ?', [BARIS.linimasa]);
  assert.equal(sesudah.judul, sebelum.judul, 'judul tidak dikembalikan ke isi JSON');
});

test('benih: baris BARU tetap masuk dengan status bawaan dari JSON (belum diverifikasi)', async () => {
  await hapusLinimasaFixture();
  await benihLinimasa(LINIMASA_FIXTURE);
  const [[baru]] = await pool.query(
    "SELECT judul, DATE_FORMAT(tanggal_mulai, '%Y-%m-%d') mulai, DATE_FORMAT(tanggal_selesai, '%Y-%m-%d') selesai, status_verifikasi, diperiksa_pada FROM tahapan_linimasa WHERE id = ?",
    [ID_LINIMASA]
  );
  assert.ok(baru, 'baris baru tidak dimasukkan benih');
  assert.deepEqual({ ...baru }, {
    judul: 'UJI: tahapan fixture benih',
    mulai: '2020-01-01',
    selesai: '2020-01-05',
    status_verifikasi: 'belum_diverifikasi',
    diperiksa_pada: null,
  });
});

test('benih (LANJUT_020): isi SAMA → tanda tetap; judul berubah → tanda di-reset', async () => {
  await benihLinimasa(LINIMASA_FIXTURE);
  await tandai('linimasa', ID_LINIMASA);
  await benihLinimasa(LINIMASA_FIXTURE);
  assert.deepEqual(await status('linimasa', ID_LINIMASA), TERVERIFIKASI, 'isi sama, tapi tanda hilang');

  await benihLinimasa(linimasaDengan({ judul: 'UJI: judul diubah' }));
  assert.deepEqual(await status('linimasa', ID_LINIMASA), BELUM, 'judul berubah, tapi tanda lama tetap');
  const [[b]] = await pool.query('SELECT judul FROM tahapan_linimasa WHERE id = ?', [ID_LINIMASA]);
  assert.equal(b.judul, 'UJI: judul diubah', 'isi baru tidak ditulis');
});

test('benih (LANJUT_020): hanya tanggal berubah → tanda di-reset', async () => {
  await benihLinimasa(LINIMASA_FIXTURE);
  await tandai('linimasa', ID_LINIMASA);
  await benihLinimasa(linimasaDengan({ tanggal_selesai: '2020-01-06' }));
  assert.deepEqual(await status('linimasa', ID_LINIMASA), BELUM, 'tanggal selesai berubah, tanda tetap');

  await tandai('linimasa', ID_LINIMASA);
  await benihLinimasa(linimasaDengan({ tanggal_mulai: '2019-12-31', tanggal_selesai: '2020-01-06' }));
  assert.deepEqual(await status('linimasa', ID_LINIMASA), BELUM, 'tanggal mulai berubah, tanda tetap');
});

test('benih (LANJUT_020): butir checklist berubah → tanda di-reset', async () => {
  await benihChecklist(CHECKLIST_CONTOH);
  await tandai('checklist', ID_CHECKLIST);
  const berubah = JSON.parse(JSON.stringify(CHECKLIST_CONTOH));
  berubah.kategori[0].butir[0].judul = 'CONTOH: judul diubah';
  await benihChecklist(berubah);
  assert.deepEqual(await status('checklist', ID_CHECKLIST), BELUM);
  await benihChecklist(CHECKLIST_CONTOH); // kembalikan isi untuk test lain di berkas ini
});

test('benih (LANJUT_043): kartu kurasi — isi SAMA → tanda tetap; isi berubah → tanda di-reset; kartu baru masuk belum', async () => {
  await sisipKartuTerverifikasi(); // = sudah ditandai lewat `verifikasi-konten --jenis=kartu ... --ya`
  await benihArsipKartu(KARTU_FIXTURE);
  assert.deepEqual(await status('kartu', ID_KARTU), TERVERIFIKASI, 'isi sama, tapi tanda hilang (benih lama selalu mereset)');

  await benihArsipKartu(kartuDengan({ jawaban: 'UJI: jawaban diubah' }));
  assert.deepEqual(await status('kartu', ID_KARTU), BELUM, 'jawaban berubah, tapi tanda lama tetap');
  const [[b]] = await pool.query('SELECT jawaban FROM kartu WHERE id = ?', [ID_KARTU]);
  assert.equal(b.jawaban, 'UJI: jawaban diubah', 'isi baru tidak ditulis');

  await benihArsipKartu(kartuDengan({ id: ID_KARTU_BARU }));
  assert.deepEqual(await status('kartu', ID_KARTU_BARU), BELUM);
});

test('benih (LANJUT_020): isi berbeda dari JSON → tanda di-reset (Khusus SMK, prodi, mapel, Cerita Alumni)', async () => {
  for (const [jenis, id] of Object.entries(BARIS_BASI)) {
    await tandai(jenis, id);
    await pool.query("UPDATE ?? SET url_sumber = 'https://basi.invalid/' WHERE id = ?", [JENIS[jenis].tabel, id]);
  }
  await jalankanBenih();
  for (const [jenis, id] of Object.entries(BARIS_BASI)) {
    assert.deepEqual(await status(jenis, id), BELUM, `${jenis}/${id}: isi berubah, tapi tanda lama tetap`);
    const [[b]] = await pool.query('SELECT url_sumber FROM ?? WHERE id = ?', [JENIS[jenis].tabel, id]);
    assert.notEqual(b.url_sumber, 'https://basi.invalid/', `${jenis}/${id}: isi tidak dikembalikan dari JSON`);
  }
});
