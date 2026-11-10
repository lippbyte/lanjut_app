// LANJUT_008 seri v2: lapisan data jalur_minat, pengguna_jalur_minat, tujuan, butir_bukti, dan
// lampiran_butir_bukti. Isolasi antar-akun diuji di tingkat data, tanpa rute.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/db/koneksi');
const { buatUuid } = require('../src/util/id');
const { benihJalurMinat } = require('../src/db/benih/benih');
const jalurMinat = require('../src/modul/jalur-minat/jalur-minat.repo');
const pilihan = require('../src/modul/jalur-minat/pengguna-jalur-minat.repo');
const tujuan = require('../src/modul/tujuan/tujuan.repo');
const butir = require('../src/modul/butir-bukti/butir-bukti.repo');
const lampiran = require('../src/modul/butir-bukti/lampiran-butir-bukti.repo');
const { eksporDataV2 } = require('../src/modul/data-pengguna/data-pengguna.layanan');

const WAKTU = '2026-11-10 08:00:00';
const WAKTU_2 = '2026-11-11 09:00:00';
const akunDibuat = [];

async function buatAkun() {
  const id = buatUuid();
  await pool.execute(
    "INSERT INTO pengguna (id, nama_pengguna, kata_sandi_hash, dibuat_pada) VALUES (?, ?, 'x', ?)",
    [id, `uji_v2_${id.slice(0, 8)}`, WAKTU]
  );
  akunDibuat.push(id);
  return id;
}

async function buatTujuan(penggunaId, tambahan = {}) {
  const id = buatUuid();
  assert.equal(await tujuan.buat({ id, penggunaId, judul: 'Tujuan uji', waktu: WAKTU, ...tambahan }), true);
  return id;
}

async function buatButir(penggunaId, tambahan = {}) {
  const id = buatUuid();
  assert.equal(await butir.buat({ id, penggunaId, judul: 'Butir uji', jenis: 'karya', waktu: WAKTU, ...tambahan }), true);
  return id;
}

async function buatLampiran(penggunaId, butirBuktiId) {
  const id = buatUuid();
  const dibuat = await lampiran.buat({
    id,
    penggunaId,
    butirBuktiId,
    jenisBerkas: 'image/jpeg',
    ukuranByte: 1234,
    namaTersimpan: `${buatUuid()}.jpg`,
    namaAsli: 'foto saya.jpg',
    waktu: WAKTU,
  });
  assert.equal(dibuat, true);
  return id;
}

const jumlahBaris = async (sql, nilai) => (await pool.query(sql, nilai))[0][0].n;

before(async () => {
  await benihJalurMinat();
});

after(async () => {
  try {
    if (akunDibuat.length) await pool.query('DELETE FROM pengguna WHERE id IN (?)', [akunDibuat]);
  } finally {
    await pool.end();
  }
});

test('jalur_minat: tiga jalur aktif berurutan; id tak dikenal menghasilkan null', async () => {
  const daftar = await jalurMinat.daftarAktif();
  assert.deepEqual(daftar.map((j) => j.id), ['melanjutkan', 'bekerja', 'wirausaha']);
  assert.equal((await jalurMinat.ambil('bekerja')).nama, 'Bekerja');
  assert.equal(await jalurMinat.ambil('tidak-ada'), null);
});

test('jalur_minat: baris yang masih dipilih siswa tidak bisa dihapus', async () => {
  const a = await buatAkun();
  await pilihan.buat({ id: buatUuid(), penggunaId: a, jalurMinatId: 'wirausaha', waktu: WAKTU });
  await assert.rejects(pool.execute("DELETE FROM jalur_minat WHERE id = 'wirausaha'"), { code: 'ER_ROW_IS_REFERENCED_2' });
});

test('pengguna_jalur_minat: buat, baca, ubah status, hapus', async () => {
  const a = await buatAkun();
  const id = buatUuid();
  assert.equal(await pilihan.buat({ id, penggunaId: a, jalurMinatId: 'melanjutkan', waktu: WAKTU }), true);
  const baru = await pilihan.ambilMilikSendiri(a, id);
  assert.equal(baru.status, 'aktif');
  assert.equal(baru.berakhir_pada, null);
  assert.equal((await pilihan.daftarMilikSendiri(a)).length, 1);

  assert.equal(await pilihan.ubahStatusMilikSendiri(a, id, 'dijeda', WAKTU_2), true);
  assert.equal((await pilihan.ambilMilikSendiri(a, id)).berakhir_pada, null);
  assert.equal(await pilihan.ubahStatusMilikSendiri(a, id, 'selesai', WAKTU_2), true);
  const selesai = await pilihan.ambilMilikSendiri(a, id);
  assert.equal(selesai.status, 'selesai');
  assert.ok(selesai.berakhir_pada instanceof Date);

  assert.equal(await pilihan.hapusMilikSendiri(a, id), true);
  assert.equal(await pilihan.ambilMilikSendiri(a, id), null);
});

test('pengguna_jalur_minat: berganti arah tidak menghapus riwayat; satu baris aktif per jalur', async () => {
  const a = await buatAkun();
  const b = await buatAkun();
  const pertama = buatUuid();
  assert.equal(await pilihan.buat({ id: pertama, penggunaId: a, jalurMinatId: 'bekerja', waktu: WAKTU }), true);

  // Baris aktif kedua ditolak, baik lewat lapisan data maupun SQL mentah.
  assert.equal(await pilihan.buat({ id: buatUuid(), penggunaId: a, jalurMinatId: 'bekerja', waktu: WAKTU }), false);
  await assert.rejects(
    pool.execute(
      "INSERT INTO pengguna_jalur_minat (id, pengguna_id, jalur_minat_id, status, mulai_pada, diubah_pada) VALUES (?, ?, 'bekerja', 'aktif', ?, ?)",
      [buatUuid(), a, WAKTU, WAKTU]
    ),
    { code: 'ER_DUP_ENTRY' }
  );

  // Jalur lain dan akun lain tidak terhalang.
  assert.equal(await pilihan.buat({ id: buatUuid(), penggunaId: a, jalurMinatId: 'wirausaha', waktu: WAKTU }), true);
  assert.equal(await pilihan.buat({ id: buatUuid(), penggunaId: b, jalurMinatId: 'bekerja', waktu: WAKTU }), true);

  // Status non-aktif boleh lebih dari satu, dan barisnya tetap ada.
  assert.equal(await pilihan.ubahStatusMilikSendiri(a, pertama, 'ditinggalkan', WAKTU_2), true);
  const kedua = buatUuid();
  assert.equal(await pilihan.buat({ id: kedua, penggunaId: a, jalurMinatId: 'bekerja', waktu: WAKTU_2 }), true);
  assert.equal(await pilihan.ubahStatusMilikSendiri(a, kedua, 'ditinggalkan', WAKTU_2), true);
  const riwayat = (await pilihan.daftarMilikSendiri(a)).filter((p) => p.jalur_minat_id === 'bekerja');
  assert.deepEqual(riwayat.map((p) => p.status), ['ditinggalkan', 'ditinggalkan']);

  // Mengaktifkan baris lama ditolak bila sudah ada baris aktif lain.
  const ketiga = buatUuid();
  assert.equal(await pilihan.buat({ id: ketiga, penggunaId: a, jalurMinatId: 'bekerja', waktu: WAKTU_2 }), true);
  assert.equal(await pilihan.ubahStatusMilikSendiri(a, pertama, 'aktif', WAKTU_2), false);
  assert.equal((await pilihan.ambilMilikSendiri(a, pertama)).status, 'ditinggalkan');
});

test('pengguna_jalur_minat: status di luar daftar ditolak', async () => {
  const a = await buatAkun();
  const id = buatUuid();
  await pilihan.buat({ id, penggunaId: a, jalurMinatId: 'melanjutkan', waktu: WAKTU });
  await assert.rejects(pilihan.ubahStatusMilikSendiri(a, id, 'hilang', WAKTU_2));
});

test('tujuan: buat, baca, ubah sebagian, kosongkan, hapus', async () => {
  const a = await buatAkun();
  const id = await buatTujuan(a, { jalurMinatId: 'melanjutkan', uraian: 'Uraian', targetPada: '2027-06-01' });
  const awal = await tujuan.ambilMilikSendiri(a, id);
  assert.equal(awal.status, 'aktif');
  assert.equal(awal.jalur_minat_id, 'melanjutkan');
  assert.equal(awal.target_pada.toISOString().slice(0, 10), '2027-06-01');
  assert.equal((await tujuan.daftarMilikSendiri(a)).length, 1);

  assert.equal(await tujuan.ubahMilikSendiri(a, id, { judul: 'Judul baru', status: 'tercapai', waktu: WAKTU_2 }), true);
  const ubah = await tujuan.ambilMilikSendiri(a, id);
  assert.equal(ubah.judul, 'Judul baru');
  assert.equal(ubah.status, 'tercapai');
  assert.equal(ubah.uraian, 'Uraian', 'medan undefined tidak berubah');

  assert.equal(await tujuan.ubahMilikSendiri(a, id, { uraian: null, jalurMinatId: null, waktu: WAKTU_2 }), true);
  const kosong = await tujuan.ambilMilikSendiri(a, id);
  assert.equal(kosong.uraian, null);
  assert.equal(kosong.jalur_minat_id, null);

  assert.equal(await tujuan.hapusMilikSendiri(a, id), true);
  assert.equal(await tujuan.ambilMilikSendiri(a, id), null);
});

test('tujuan: riwayat lewat diubah_dari_id; menghapus tujuan lama tidak menghapus yang baru', async () => {
  const a = await buatAkun();
  const lama = await buatTujuan(a);
  const baru = await buatTujuan(a, { diubahDariId: lama });
  assert.equal(await tujuan.ubahMilikSendiri(a, lama, { status: 'diubah', waktu: WAKTU_2 }), true);
  assert.equal((await tujuan.ambilMilikSendiri(a, baru)).diubah_dari_id, lama);
  assert.equal((await tujuan.ambilMilikSendiri(a, lama)).status, 'diubah');

  assert.equal(await tujuan.hapusMilikSendiri(a, lama), true);
  assert.equal((await tujuan.ambilMilikSendiri(a, baru)).diubah_dari_id, null);
});

test('butir_bukti: buat, baca, ubah sebagian, kaitan, hapus sungguhan', async () => {
  const a = await buatAkun();
  const t = await buatTujuan(a);
  const id = await buatButir(a, {
    jalurMinatId: 'bekerja',
    tujuanId: t,
    uraian: 'Uraian',
    tautan: 'https://contoh.test/karya',
    tanggalKarya: '2026-10-01',
    rujukan: { jenis: 'kartu', id: 'k-apa-saja' },
  });
  const awal = await butir.ambilMilikSendiri(a, id);
  assert.equal(awal.visibilitas, 'privat');
  assert.equal(awal.tujuan_id, t);
  assert.equal(awal.rujukan_jenis, 'kartu');
  assert.equal(awal.tanggal_karya.toISOString().slice(0, 10), '2026-10-01');
  assert.equal((await butir.daftarMilikSendiri(a)).length, 1);

  assert.equal(await butir.ubahMilikSendiri(a, id, { judul: 'Baru', jenis: 'refleksi', tautan: null, waktu: WAKTU_2 }), true);
  const ubah = await butir.ambilMilikSendiri(a, id);
  assert.equal(ubah.judul, 'Baru');
  assert.equal(ubah.jenis, 'refleksi');
  assert.equal(ubah.tautan, null);
  assert.equal(ubah.uraian, 'Uraian', 'medan undefined tidak berubah');
  assert.equal(ubah.tujuan_id, t, 'mengubah isi tidak menyentuh kaitan');

  assert.equal(await butir.ubahKaitanMilikSendiri(a, id, { tujuanId: null, rujukan: null, jalurMinatId: 'wirausaha', waktu: WAKTU_2 }), true);
  const kaitan = await butir.ambilMilikSendiri(a, id);
  assert.equal(kaitan.tujuan_id, null);
  assert.equal(kaitan.rujukan_jenis, null);
  assert.equal(kaitan.rujukan_id, null);
  assert.equal(kaitan.jalur_minat_id, 'wirausaha');

  assert.equal(await butir.hapusMilikSendiri(a, id), true);
  assert.equal(await jumlahBaris('SELECT COUNT(*) AS n FROM butir_bukti WHERE id = ?', [id]), 0, 'baris harus benar-benar hilang');
});

test('butir_bukti: visibilitas menolak nilai selain privat', async () => {
  const a = await buatAkun();
  const id = await buatButir(a);
  await assert.rejects(pool.execute("UPDATE butir_bukti SET visibilitas = 'publik' WHERE id = ?", [id]));
  await assert.rejects(
    pool.execute(
      "INSERT INTO butir_bukti (id, pengguna_id, judul, jenis, visibilitas, dibuat_pada, diubah_pada) VALUES (?, ?, 'x', 'karya', 'sekolah', ?, ?)",
      [buatUuid(), a, WAKTU, WAKTU]
    )
  );
  assert.equal((await butir.ambilMilikSendiri(a, id)).visibilitas, 'privat');
});

test('butir_bukti: jenis di luar daftar dan rujukan setengah ditolak; rujukan eksternal bukan foreign key', async () => {
  const a = await buatAkun();
  await assert.rejects(butir.buat({ id: buatUuid(), penggunaId: a, judul: 'x', jenis: 'lainnya', waktu: WAKTU }));
  await assert.rejects(
    pool.execute(
      "INSERT INTO butir_bukti (id, pengguna_id, judul, jenis, rujukan_jenis, dibuat_pada, diubah_pada) VALUES (?, ?, 'x', 'karya', 'kartu', ?, ?)",
      [buatUuid(), a, WAKTU, WAKTU]
    )
  );
  // Id yang tidak ada di tabel mana pun tetap diterima: memang sengaja tidak terikat.
  const id = await buatButir(a, { rujukan: { jenis: 'modul', id: 'tidak-ada-di-mana-pun' } });
  assert.equal((await butir.ambilMilikSendiri(a, id)).rujukan_id, 'tidak-ada-di-mana-pun');
});

test('butir_bukti: menghapus tujuan tidak menghapus butirnya', async () => {
  const a = await buatAkun();
  const t = await buatTujuan(a);
  const id = await buatButir(a, { tujuanId: t });
  assert.equal(await tujuan.hapusMilikSendiri(a, t), true);
  assert.equal((await butir.ambilMilikSendiri(a, id)).tujuan_id, null);
});

test('lampiran: buat, baca, ubah nama tampilan, hapus; nama_tersimpan unik', async () => {
  const a = await buatAkun();
  const b = await buatButir(a);
  const id = await buatLampiran(a, b);
  const awal = await lampiran.ambilMilikSendiri(a, id);
  assert.equal(awal.butir_bukti_id, b);
  assert.equal(awal.ukuran_byte, 1234);
  assert.equal((await lampiran.daftarUntukButirMilikSendiri(a, b)).length, 1);

  assert.equal(await lampiran.ubahNamaAsliMilikSendiri(a, id, 'nama baru.jpg'), true);
  const ubah = await lampiran.ambilMilikSendiri(a, id);
  assert.equal(ubah.nama_asli, 'nama baru.jpg');
  assert.equal(ubah.nama_tersimpan, awal.nama_tersimpan);

  await assert.rejects(
    lampiran.buat({
      id: buatUuid(),
      penggunaId: a,
      butirBuktiId: b,
      jenisBerkas: 'image/jpeg',
      ukuranByte: 1,
      namaTersimpan: awal.nama_tersimpan,
      namaAsli: 'lain.jpg',
      waktu: WAKTU,
    }),
    { code: 'ER_DUP_ENTRY' }
  );

  assert.equal(await lampiran.hapusMilikSendiri(a, id), true);
  assert.equal(await lampiran.ambilMilikSendiri(a, id), null);
});

test('lampiran: menghapus butir bukti ikut menghapus lampirannya', async () => {
  const a = await buatAkun();
  const b = await buatButir(a);
  const l1 = await buatLampiran(a, b);
  const l2 = await buatLampiran(a, b);
  assert.equal(await butir.hapusMilikSendiri(a, b), true);
  assert.equal(await jumlahBaris('SELECT COUNT(*) AS n FROM lampiran_butir_bukti WHERE id IN (?)', [[l1, l2]]), 0);
});

test('ISOLASI: akun A tidak dapat membaca, mengubah, atau menghapus tujuan akun B', async () => {
  const a = await buatAkun();
  const b = await buatAkun();
  const milikB = await buatTujuan(b, { uraian: 'Rahasia B' });

  assert.equal(await tujuan.ambilMilikSendiri(a, milikB), null);
  assert.deepEqual(await tujuan.daftarMilikSendiri(a), []);
  assert.equal(await tujuan.ubahMilikSendiri(a, milikB, { judul: 'Dibajak', status: 'ditinggalkan', waktu: WAKTU_2 }), false);
  assert.equal(await tujuan.hapusMilikSendiri(a, milikB), false);

  const utuh = await tujuan.ambilMilikSendiri(b, milikB);
  assert.equal(utuh.judul, 'Tujuan uji');
  assert.equal(utuh.status, 'aktif');
  assert.equal(utuh.uraian, 'Rahasia B');
});

test('ISOLASI: akun A tidak dapat menurunkan tujuan baru dari tujuan akun B', async () => {
  const a = await buatAkun();
  const b = await buatAkun();
  const milikB = await buatTujuan(b);
  const id = buatUuid();
  assert.equal(await tujuan.buat({ id, penggunaId: a, judul: 'x', diubahDariId: milikB, waktu: WAKTU }), false);
  assert.equal(await jumlahBaris('SELECT COUNT(*) AS n FROM tujuan WHERE id = ?', [id]), 0);
});

test('ISOLASI: akun A tidak dapat membaca, mengubah, atau menghapus butir bukti akun B', async () => {
  const a = await buatAkun();
  const b = await buatAkun();
  const milikB = await buatButir(b, { uraian: 'Rahasia B', jalurMinatId: 'bekerja' });

  assert.equal(await butir.ambilMilikSendiri(a, milikB), null);
  assert.deepEqual(await butir.daftarMilikSendiri(a), []);
  assert.equal(await butir.ubahMilikSendiri(a, milikB, { judul: 'Dibajak', waktu: WAKTU_2 }), false);
  assert.equal(await butir.ubahKaitanMilikSendiri(a, milikB, { jalurMinatId: 'wirausaha', waktu: WAKTU_2 }), false);
  assert.equal(await butir.hapusMilikSendiri(a, milikB), false);

  const utuh = await butir.ambilMilikSendiri(b, milikB);
  assert.equal(utuh.judul, 'Butir uji');
  assert.equal(utuh.jalur_minat_id, 'bekerja');
  assert.equal(utuh.uraian, 'Rahasia B');
});

test('ISOLASI: butir akun A tidak bisa ditautkan ke tujuan akun B', async () => {
  const a = await buatAkun();
  const b = await buatAkun();
  const tujuanB = await buatTujuan(b);

  const id = buatUuid();
  assert.equal(await butir.buat({ id, penggunaId: a, judul: 'x', jenis: 'karya', tujuanId: tujuanB, waktu: WAKTU }), false);
  assert.equal(await jumlahBaris('SELECT COUNT(*) AS n FROM butir_bukti WHERE id = ?', [id]), 0);

  const milikA = await buatButir(a);
  assert.equal(await butir.ubahKaitanMilikSendiri(a, milikA, { tujuanId: tujuanB, waktu: WAKTU_2 }), false);
  assert.equal((await butir.ambilMilikSendiri(a, milikA)).tujuan_id, null);
});

test('ISOLASI: akun A tidak dapat menambah, membaca, mengubah, atau menghapus lampiran akun B', async () => {
  const a = await buatAkun();
  const b = await buatAkun();
  const butirB = await buatButir(b);
  const lampiranB = await buatLampiran(b, butirB);

  const dicoba = buatUuid();
  const dibuat = await lampiran.buat({
    id: dicoba,
    penggunaId: a,
    butirBuktiId: butirB,
    jenisBerkas: 'image/png',
    ukuranByte: 1,
    namaTersimpan: `${buatUuid()}.png`,
    namaAsli: 'x.png',
    waktu: WAKTU,
  });
  assert.equal(dibuat, false);
  assert.equal(await jumlahBaris('SELECT COUNT(*) AS n FROM lampiran_butir_bukti WHERE id = ?', [dicoba]), 0);

  assert.equal(await lampiran.ambilMilikSendiri(a, lampiranB), null);
  assert.deepEqual(await lampiran.daftarUntukButirMilikSendiri(a, butirB), []);
  assert.deepEqual(await lampiran.daftarSemuaMilikSendiri(a), []);
  assert.equal(await lampiran.ubahNamaAsliMilikSendiri(a, lampiranB, 'dibajak.png'), false);
  assert.equal(await lampiran.hapusMilikSendiri(a, lampiranB), false);
  assert.equal((await lampiran.ambilMilikSendiri(b, lampiranB)).nama_asli, 'foto saya.jpg');
});

test('ISOLASI: akun A tidak dapat membaca, mengubah, atau menghapus pilihan jalur akun B', async () => {
  const a = await buatAkun();
  const b = await buatAkun();
  const id = buatUuid();
  await pilihan.buat({ id, penggunaId: b, jalurMinatId: 'melanjutkan', waktu: WAKTU });

  assert.equal(await pilihan.ambilMilikSendiri(a, id), null);
  assert.deepEqual(await pilihan.daftarMilikSendiri(a), []);
  assert.equal(await pilihan.ubahStatusMilikSendiri(a, id, 'ditinggalkan', WAKTU_2), false);
  assert.equal(await pilihan.hapusMilikSendiri(a, id), false);
  assert.equal((await pilihan.ambilMilikSendiri(b, id)).status, 'aktif');
});

async function isiLengkap(penggunaId) {
  await pilihan.buat({ id: buatUuid(), penggunaId, jalurMinatId: 'melanjutkan', waktu: WAKTU });
  const lama = await buatTujuan(penggunaId);
  const t = await buatTujuan(penggunaId, { diubahDariId: lama });
  const b = await buatButir(penggunaId, { tujuanId: t });
  await buatLampiran(penggunaId, b);
  return { t, b };
}

async function hitungMilik(penggunaId) {
  return {
    pilihan: await jumlahBaris('SELECT COUNT(*) AS n FROM pengguna_jalur_minat WHERE pengguna_id = ?', [penggunaId]),
    tujuan: await jumlahBaris('SELECT COUNT(*) AS n FROM tujuan WHERE pengguna_id = ?', [penggunaId]),
    butir: await jumlahBaris('SELECT COUNT(*) AS n FROM butir_bukti WHERE pengguna_id = ?', [penggunaId]),
    lampiran: await jumlahBaris(
      'SELECT COUNT(*) AS n FROM lampiran_butir_bukti l JOIN butir_bukti b ON b.id = l.butir_bukti_id WHERE b.pengguna_id = ?',
      [penggunaId]
    ),
  };
}

test('Hapus akun: tidak ada baris tersisa di empat tabel; akun lain tidak tersentuh', async () => {
  const a = await buatAkun();
  const b = await buatAkun();
  const { b: butirA } = await isiLengkap(a);
  await isiLengkap(b);
  assert.deepEqual(await hitungMilik(a), { pilihan: 1, tujuan: 2, butir: 1, lampiran: 1 });

  await pool.execute('DELETE FROM pengguna WHERE id = ?', [a]);

  assert.deepEqual(await hitungMilik(a), { pilihan: 0, tujuan: 0, butir: 0, lampiran: 0 });
  assert.equal(await jumlahBaris('SELECT COUNT(*) AS n FROM lampiran_butir_bukti WHERE butir_bukti_id = ?', [butirA]), 0);
  assert.deepEqual(await hitungMilik(b), { pilihan: 1, tujuan: 2, butir: 1, lampiran: 1 });
});

test('Ekspor: memuat keempat tabel milik akun itu dan tidak memuat milik akun lain', async () => {
  const a = await buatAkun();
  const b = await buatAkun();
  const { t, b: butirA } = await isiLengkap(a);
  await isiLengkap(b);

  const hasil = await eksporDataV2(a);
  assert.deepEqual(Object.keys(hasil).sort(), ['butir_bukti', 'lampiran_butir_bukti', 'pengguna_jalur_minat', 'tujuan']);
  assert.equal(hasil.pengguna_jalur_minat.length, 1);
  assert.equal(hasil.tujuan.length, 2);
  assert.ok(hasil.tujuan.some((x) => x.id === t));
  assert.deepEqual(hasil.butir_bukti.map((x) => x.id), [butirA]);
  assert.deepEqual(hasil.lampiran_butir_bukti.map((x) => x.butir_bukti_id), [butirA]);
});
