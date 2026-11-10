// LANJUT_009 seri v2: hapus akun dan ekspor data, lewat rute sungguhan.
//
// Daftar tabel diambil dari skema, bukan ditulis tangan: tabel baru yang terikat ke `pengguna`
// tetapi belum diisi di isiSemuaTabel, atau belum masuk ekspor, membuat tes ini gagal.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { nyalakanServer, urlDari, daftarPenggunaBaru, kodeTerakhir, pool } = require('./bantuan');
const { buatUuid } = require('../src/util/id');
const { benihJalurMinat } = require('../src/db/benih/benih');
const pilihan = require('../src/modul/jalur-minat/pengguna-jalur-minat.repo');
const tujuan = require('../src/modul/tujuan/tujuan.repo');
const butir = require('../src/modul/butir-bukti/butir-bukti.repo');
const lampiran = require('../src/modul/butir-bukti/lampiran-butir-bukti.repo');
const modulLayanan = require('../src/modul/modul/modul.layanan');
const dataPengguna = require('../src/modul/data-pengguna/data-pengguna.layanan');
const { daftarkanPenyediaBerkas } = require('../src/modul/data-pengguna/berkas-pengguna');
const { PENEGASAN_HAPUS_AKUN } = require('../src/modul/data-pengguna/data-pengguna.skema');
const otp = require('../src/modul/auth/otp.layanan');

const WAKTU = '2026-11-10 08:00:00';
const SANDI = 'sandiujiaman1';
let server;
let baseUrl;
let referensi;

async function panggil(metode, jalur, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${jalur}`, {
    method: metode,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

async function akunBaru() {
  const { json } = await daftarPenggunaBaru(baseUrl);
  return { id: json.data.pengguna.id, nama: json.data.pengguna.nama_pengguna, token: json.data.token };
}

const hapusDenganSandi = (a) => panggil('DELETE', '/pengguna/saya', a.token, { penegasan: PENEGASAN_HAPUS_AKUN, kata_sandi: SANDI });

/** Semua kolom yang punya foreign key ke pengguna.id, kecuali relasi di dalam tabel pengguna. */
async function kolomMilikPengguna() {
  const [baris] = await pool.query(
    `SELECT TABLE_NAME AS t, COLUMN_NAME AS k FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME = 'pengguna' AND TABLE_NAME <> 'pengguna'
      ORDER BY TABLE_NAME`
  );
  return baris;
}

async function jumlahPerTabel(penggunaId) {
  const hasil = {};
  for (const { t, k } of await kolomMilikPengguna()) {
    const [[{ n }]] = await pool.query('SELECT COUNT(*) AS n FROM ?? WHERE ?? = ?', [t, k, penggunaId]);
    hasil[t] = n;
  }
  return hasil;
}

const jumlahLampiran = async (penggunaId) =>
  (await pool.query('SELECT COUNT(*) AS n FROM lampiran_butir_bukti l JOIN butir_bukti b ON b.id = l.butir_bukti_id WHERE b.pengguna_id = ?', [penggunaId]))[0][0].n;

/** Satu baris di setiap tabel yang terikat ke pengguna. `sesi_pengguna` sudah terisi saat daftar. */
async function isiSemuaTabel(penggunaId, penanda) {
  const q = (sql, nilai) => pool.query(sql, nilai);
  const idKartu = `uji-${buatUuid()}`;
  const idSesi = buatUuid();
  const idModul = buatUuid();
  await q('INSERT INTO kemajuan (pengguna_id, butir_id, selesai_pada) VALUES (?, ?, ?)', [penggunaId, referensi.butir, WAKTU]);
  await q("INSERT INTO butir_pribadi (id, pengguna_id, jenis, prodi_id, judul, dibuat_pada, diubah_pada) VALUES (?, ?, 'riset_kampus', ?, ?, ?, ?)", [buatUuid(), penggunaId, referensi.prodi, `Butir ${penanda}`, WAKTU, WAKTU]);
  await q(
    `INSERT INTO kartu (id, pemilik_id, mapel_id, judul, isi, sumber, pemilik, status_verifikasi, asal, dibuat_pada, diubah_pada)
     VALUES (?, ?, ?, ?, ?, 'pengguna', 'pengguna', 'belum_diverifikasi', 'pengguna', ?, ?)`,
    [idKartu, penggunaId, referensi.mapel, `Kartu ${penanda}`, 'Isi', WAKTU, WAKTU]
  );
  await q("INSERT INTO sesi_latihan (id, pengguna_id, dimulai_pada, jumlah_kartu_direncanakan, asal_mula) VALUES (?, ?, ?, 1, 'arsip')", [idSesi, penggunaId, WAKTU]);
  await q('INSERT INTO riwayat_latihan (id, pengguna_id, kartu_id, benar, dijawab_pada, sesi_id) VALUES (?, ?, ?, 1, ?, ?)', [buatUuid(), penggunaId, idKartu, WAKTU, idSesi]);
  await q("INSERT INTO persetujuan (pengguna_id, jenis, versi, status, sumber, dicatat_pada) VALUES (?, 'kebijakan_privasi', 1, 'setuju', 'mandiri', ?)", [penggunaId, WAKTU]);
  await q("INSERT INTO modul (id, pengguna_id, mapel_id, judul, isi, jumlah_karakter, jenis, diunggah_pada) VALUES (?, ?, ?, ?, 'Isi modul', 9, 'tempel', ?)", [idModul, penggunaId, referensi.mapel, `Modul ${penanda}`, WAKTU]);
  await q("INSERT INTO potongan_modul (modul_id, pengguna_id, urutan, isi) VALUES (?, ?, 0, 'Isi modul')", [idModul, penggunaId]);
  await q("INSERT INTO event_sekolah (id, pengguna_id, jenis, tanggal, dibuat_pada, diubah_pada) VALUES (?, ?, 'UTS', '2026-12-01', ?, ?)", [buatUuid(), penggunaId, WAKTU, WAKTU]);

  await pilihan.buat({ id: buatUuid(), penggunaId, jalurMinatId: 'melanjutkan', waktu: WAKTU });
  const idTujuan = buatUuid();
  await tujuan.buat({ id: idTujuan, penggunaId, judul: `Tujuan ${penanda}`, waktu: WAKTU });
  const idButir = buatUuid();
  await butir.buat({ id: idButir, penggunaId, tujuanId: idTujuan, judul: `Bukti ${penanda}`, jenis: 'karya', waktu: WAKTU });
  await lampiran.buat({ id: buatUuid(), penggunaId, butirBuktiId: idButir, jenisBerkas: 'image/png', ukuranByte: 10, namaTersimpan: `${buatUuid()}.png`, namaAsli: 'foto.png', waktu: WAKTU });
}

before(async () => {
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  await benihJalurMinat();
  referensi = {
    butir: (await pool.query('SELECT id FROM butir_daftar_periksa LIMIT 1'))[0][0].id,
    prodi: (await pool.query('SELECT id FROM prodi LIMIT 1'))[0][0].id,
    mapel: (await pool.query('SELECT id FROM mapel LIMIT 1'))[0][0].id,
  };
});

after(async () => {
  await new Promise((r) => server.close(r));
  await pool.end();
});

test('Hapus akun: semua tabel kosong untuk akun itu, akun lain tidak tersentuh, sesi tidak berlaku', async () => {
  const a = await akunBaru();
  const b = await akunBaru();
  await isiSemuaTabel(a.id, 'A');
  await isiSemuaTabel(b.id, 'B');

  const awalA = await jumlahPerTabel(a.id);
  const awalB = await jumlahPerTabel(b.id);
  for (const [tabel, n] of Object.entries(awalA)) {
    assert.ok(n > 0, `${tabel} belum diisi di isiSemuaTabel, jadi penghapusannya tidak teruji`);
  }
  assert.equal(await jumlahLampiran(a.id), 1);

  const res = await hapusDenganSandi(a);
  assert.equal(res.status, 200);
  assert.deepEqual(res.json.data, { dihapus: true });

  for (const [tabel, n] of Object.entries(await jumlahPerTabel(a.id))) assert.equal(n, 0, tabel);
  assert.equal((await pool.query('SELECT COUNT(*) AS n FROM pengguna WHERE id = ?', [a.id]))[0][0].n, 0);
  assert.equal(await jumlahLampiran(a.id), 0);

  assert.deepEqual(await jumlahPerTabel(b.id), awalB);
  assert.equal(await jumlahLampiran(b.id), 1);

  assert.equal((await panggil('GET', '/auth/saya', a.token)).status, 401, 'token lama harus sudah tidak berlaku');
  assert.equal((await panggil('GET', '/auth/saya', b.token)).status, 200);
});

test('Hapus akun: membersihkan tabel tanpa foreign key (percobaan masuk, kode email, pendaftaran tertunda)', async () => {
  const email = `hapus_${crypto.randomUUID().slice(0, 8)}@contoh.test`;
  const { json } = await daftarPenggunaBaru(baseUrl, { email });
  const a = { id: json.data.pengguna.id, nama: json.data.pengguna.nama_pengguna, token: json.data.token };
  const lain = await akunBaru();
  const emailHash = otp.hashEmail(email);

  await pool.query('INSERT INTO percobaan_masuk (nama_pengguna, jumlah_gagal) VALUES (?, 1) ON DUPLICATE KEY UPDATE jumlah_gagal = 1', [a.nama]);
  await pool.query('INSERT INTO percobaan_masuk (nama_pengguna, jumlah_gagal) VALUES (?, 1) ON DUPLICATE KEY UPDATE jumlah_gagal = 1', [lain.nama]);
  await otp.terbitkanKode(email, 'masuk');
  await pool.query(
    "INSERT INTO pendaftaran_tertunda (id, email_hash, nama_pengguna, kata_sandi_hash, dibuat_pada, kedaluwarsa_pada) VALUES (?, ?, 'tertunda', 'x', ?, ?)",
    [buatUuid(), emailHash, WAKTU, WAKTU]
  );

  assert.equal((await hapusDenganSandi(a)).status, 200);

  const n = async (sql, nilai) => (await pool.query(sql, nilai))[0][0].n;
  assert.equal(await n('SELECT COUNT(*) AS n FROM percobaan_masuk WHERE nama_pengguna = ?', [a.nama]), 0);
  assert.equal(await n('SELECT COUNT(*) AS n FROM kode_otp_email WHERE email_hash = ?', [emailHash]), 0);
  assert.equal(await n('SELECT COUNT(*) AS n FROM pendaftaran_tertunda WHERE email_hash = ?', [emailHash]), 0);
  assert.equal(await n('SELECT COUNT(*) AS n FROM percobaan_masuk WHERE nama_pengguna = ?', [lain.nama]), 1);
});

test('Hapus akun ditolak tanpa penegasan, tanpa konfirmasi identitas, dan dengan kata sandi salah', async () => {
  const a = await akunBaru();
  await isiSemuaTabel(a.id, 'tolak');

  const coba = [
    [undefined, 400],
    [{}, 400],
    [{ kata_sandi: SANDI }, 400],
    [{ penegasan: 'hapus', kata_sandi: SANDI }, 400],
    [{ penegasan: PENEGASAN_HAPUS_AKUN }, 400],
    [{ penegasan: PENEGASAN_HAPUS_AKUN, kata_sandi: SANDI, kode_email: '123456' }, 400],
    [{ penegasan: PENEGASAN_HAPUS_AKUN, kata_sandi: 'sandi-yang-salah' }, 401],
  ];
  for (const [badan, status] of coba) {
    assert.equal((await panggil('DELETE', '/pengguna/saya', a.token, badan)).status, status, JSON.stringify(badan));
  }
  assert.equal((await panggil('GET', '/auth/saya', a.token)).status, 200, 'akun harus tetap ada');
  assert.ok((await jumlahPerTabel(a.id)).kartu > 0);
});

test('Hapus akun butuh sesi, dan id akun lain di permintaan tidak berpengaruh', async () => {
  assert.equal((await panggil('DELETE', '/pengguna/saya', undefined, { penegasan: PENEGASAN_HAPUS_AKUN, kata_sandi: SANDI })).status, 401);
  const a = await akunBaru();
  const b = await akunBaru();
  const res = await panggil('DELETE', '/pengguna/saya', a.token, { penegasan: PENEGASAN_HAPUS_AKUN, kata_sandi: SANDI, id: b.id, pengguna_id: b.id });
  assert.equal(res.status, 200);
  assert.equal((await panggil('GET', '/auth/saya', b.token)).status, 200);
  assert.equal((await panggil('GET', '/auth/saya', a.token)).status, 401);
});

test('Kata sandi salah berulang mengunci percobaan, dan akun tetap ada', async () => {
  const a = await akunBaru();
  for (let i = 0; i < 5; i += 1) {
    assert.equal((await panggil('DELETE', '/pengguna/saya', a.token, { penegasan: PENEGASAN_HAPUS_AKUN, kata_sandi: 'salah' })).status, 401);
  }
  const res = await hapusDenganSandi(a);
  assert.equal(res.status, 429, 'sandi benar pun ditolak selama terkunci');
  assert.equal((await panggil('GET', '/auth/saya', a.token)).status, 200);
});

test('Akun dengan email terverifikasi bisa menegaskan identitas dengan kode email', async () => {
  const email = `kode_${crypto.randomUUID().slice(0, 8)}@contoh.test`;
  const { json } = await daftarPenggunaBaru(baseUrl, { email });
  const token = json.data.token;

  const kirim = await panggil('POST', '/pengguna/saya/hapus/kirim-kode', token);
  assert.equal(kirim.status, 200);
  const kode = await kodeTerakhir(email, 'hapus_akun');
  assert.ok(kode, 'kode harus terkirim dengan tujuan hapus_akun');

  const salah = kode === '000000' ? '000001' : '000000';
  assert.equal((await panggil('DELETE', '/pengguna/saya', token, { penegasan: PENEGASAN_HAPUS_AKUN, kode_email: salah })).status, 401);
  assert.equal((await panggil('GET', '/auth/saya', token)).status, 200);

  assert.equal((await panggil('DELETE', '/pengguna/saya', token, { penegasan: PENEGASAN_HAPUS_AKUN, kode_email: kode })).status, 200);
  assert.equal((await panggil('GET', '/auth/saya', token)).status, 401);
});

test('Kode masuk biasa tidak bisa dipakai untuk menghapus akun', async () => {
  const email = `masuk_${crypto.randomUUID().slice(0, 8)}@contoh.test`;
  const { json } = await daftarPenggunaBaru(baseUrl, { email });
  const kodeMasuk = await otp.terbitkanKode(email, 'masuk');
  const res = await panggil('DELETE', '/pengguna/saya', json.data.token, { penegasan: PENEGASAN_HAPUS_AKUN, kode_email: kodeMasuk });
  assert.equal(res.status, 401);
  assert.equal((await panggil('GET', '/auth/saya', json.data.token)).status, 200);
});

test('Kode email ditolak untuk akun tanpa email terverifikasi', async () => {
  const a = await akunBaru();
  assert.equal((await panggil('POST', '/pengguna/saya/hapus/kirim-kode', a.token)).status, 403);
  assert.equal((await panggil('DELETE', '/pengguna/saya', a.token, { penegasan: PENEGASAN_HAPUS_AKUN, kode_email: '123456' })).status, 403);
});

test('Hapus akun: indeks modul dirapikan hanya bila akunnya punya modul', async (t) => {
  const jadwal = t.mock.method(modulLayanan, 'jadwalkanRapikanIndeks', () => {});
  const tanpaModul = await akunBaru();
  assert.equal((await hapusDenganSandi(tanpaModul)).status, 200);
  assert.equal(jadwal.mock.callCount(), 0);

  const denganModul = await akunBaru();
  await isiSemuaTabel(denganModul.id, 'modul');
  assert.equal((await hapusDenganSandi(denganModul)).status, 200);
  assert.equal(jadwal.mock.callCount(), 1);
});

test('hapusBerkasPengguna: dipanggil lewat rute untuk akun yang benar, tanpa mengubah rute', async () => {
  const dipanggil = [];
  const lepas = daftarkanPenyediaBerkas({ nama: 'uji', hapus: async (id) => dipanggil.push(id) });
  try {
    const a = await akunBaru();
    const b = await akunBaru();
    assert.equal((await hapusDenganSandi(a)).status, 200);
    assert.deepEqual(dipanggil, [a.id]);
    assert.ok(!dipanggil.includes(b.id));
  } finally {
    lepas();
  }
});

test('hapusBerkasPengguna: gagal hapus berkas tidak membatalkan hapus akun dan meninggalkan jejak', async (t) => {
  const log = t.mock.method(console, 'error', () => {});
  const dipanggil = [];
  const lepas1 = daftarkanPenyediaBerkas({ nama: 'rusak', hapus: async () => { throw new Error('disk penuh'); } });
  const lepas2 = daftarkanPenyediaBerkas({ nama: 'sehat', hapus: async (id) => dipanggil.push(id) });
  try {
    const a = await akunBaru();
    assert.equal((await hapusDenganSandi(a)).status, 200);
    assert.equal((await panggil('GET', '/auth/saya', a.token)).status, 401, 'akun tetap terhapus');
    assert.deepEqual(dipanggil, [a.id], 'penyedia lain tetap berjalan');
    const jejak = log.mock.calls.map((c) => String(c.arguments[0])).filter((m) => m.startsWith('[hapus-berkas-gagal]'));
    assert.equal(jejak.length, 1);
    assert.ok(jejak[0].includes(`pengguna=${a.id}`) && jejak[0].includes('penyedia=rusak') && jejak[0].includes('disk penuh'));
  } finally {
    lepas1();
    lepas2();
  }
});

test('Hapus akun: berkas tidak disentuh bila transaksi gagal', async (t) => {
  const repo = require('../src/modul/data-pengguna/data-pengguna.repo');
  t.mock.method(repo, 'hapusAkunDalamTransaksi', async () => { throw new Error('transaksi gagal'); });
  const dipanggil = [];
  const lepas = daftarkanPenyediaBerkas({ nama: 'uji', hapus: async (id) => dipanggil.push(id) });
  t.mock.method(console, 'error', () => {});
  try {
    const a = await akunBaru();
    assert.equal((await hapusDenganSandi(a)).status, 500);
    assert.deepEqual(dipanggil, []);
    assert.equal((await panggil('GET', '/auth/saya', a.token)).status, 200);
  } finally {
    lepas();
  }
});

test('Ekspor: memuat seluruh tabel milik akun, tanpa rahasia dan tanpa data akun lain', async () => {
  const email = `ekspor_${crypto.randomUUID().slice(0, 8)}@contoh.test`;
  const { json } = await daftarPenggunaBaru(baseUrl, { email });
  const a = { id: json.data.pengguna.id, token: json.data.token };
  const b = await akunBaru();
  await isiSemuaTabel(a.id, 'MILIK-A');
  await isiSemuaTabel(b.id, 'MILIK-B');

  const res = await panggil('GET', '/pengguna/saya/ekspor', a.token);
  assert.equal(res.status, 200);
  const data = res.json.data;
  const teks = JSON.stringify(data);

  // Setiap tabel terikat pengguna wajib ada di ekspor, kecuali potongan_modul (isinya sama dengan modul).
  for (const { t } of await kolomMilikPengguna()) {
    if (t === 'potongan_modul') continue;
    assert.ok(Array.isArray(data[t]) && data[t].length > 0, `${t} tidak ada di ekspor`);
  }
  assert.equal(data.pengguna.id, a.id);
  assert.equal(data.pengguna.email, email);
  assert.equal(data.lampiran_butir_bukti.length, 1);
  assert.ok(teks.includes('Kartu MILIK-A') && teks.includes('Bukti MILIK-A'));

  assert.ok(!teks.includes('MILIK-B'), 'data akun lain ikut');
  assert.ok(!teks.includes(b.id), 'id akun lain ikut');

  const [[rahasia]] = await pool.query('SELECT kata_sandi_hash FROM pengguna WHERE id = ?', [a.id]);
  const [sesi] = await pool.query('SELECT token_hash FROM sesi_pengguna WHERE pengguna_id = ?', [a.id]);
  assert.ok(!teks.includes(rahasia.kata_sandi_hash));
  assert.ok(!teks.includes(a.token));
  for (const s of sesi) assert.ok(!teks.includes(s.token_hash));
  assert.ok(!/kata_sandi|token|kode_hash/i.test(teks), 'nama medan rahasia ikut');
});

test('Ekspor: butuh sesi', async () => {
  assert.equal((await panggil('GET', '/pengguna/saya/ekspor')).status, 401);
});

test('Ekspor: melewati batas ditolak utuh, tidak dipotong', async () => {
  const a = await akunBaru();
  await isiSemuaTabel(a.id, 'batas');
  await assert.rejects(dataPengguna.eksporSemua(a.id, { barisPerTabel: 0, byte: 1000000 }), { kode: 'EKSPOR_TERLALU_BESAR' });
  await assert.rejects(dataPengguna.eksporSemua(a.id, { barisPerTabel: 100, byte: 10 }), { kode: 'EKSPOR_TERLALU_BESAR' });
  const utuh = await dataPengguna.eksporSemua(a.id, { barisPerTabel: 100, byte: 1000000 });
  assert.equal(utuh.kartu.length, 1);
});

test('Email kode hapus akun menyebut untuk apa kode itu', () => {
  const pengirim = require('../src/modul/auth/pengirimOtp');
  assert.match(pengirim.TEKS_PER_TUJUAN.hapus_akun.subjek, /menghapus akun/);
  assert.match(pengirim.teksEmail('123456', 'hapus_akun'), /menghapus akun/);
});
