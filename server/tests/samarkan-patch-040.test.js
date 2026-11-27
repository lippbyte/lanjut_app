// LANJUT_040 Bagian A: `PATCH /api/v1/tujuan/bukti/:butirId` menyamarkan `jalur_minat_id` draf
// melalui `samarkanJalur` (K37/K61), sama seperti GET/POST/PATCH pada tujuan dan butir bukti.
// Tes (1) terbukti GAGAL sebelum perbaikan dan LULUS sesudah perbaikan.

process.env.JALUR_TUJUAN_AKTIF = '1';
process.env.PORTOFOLIO_AKTIF = '1';

const { describe, test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool, kunciKonfigurasiGlobal } = require('./bantuan');
const { kunciJalurAktif } = require('./kunci-jalur-aktif');
const { buatUuid } = require('../src/util/id');

const ID_DRAF = `uji-040-draf-${buatUuid().slice(0, 8)}`;
const ID_TETAP = `uji-040-tetap-${buatUuid().slice(0, 8)}`;

let server;
let baseUrl;
let versiKebijakan;
let lepasKunci;
let lepasKunciJalur;

async function panggil(metode, jalur, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${jalur}`, {
    method: metode,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const rawText = await res.text();
  let json = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    json = null;
  }
  return { status: res.status, rawText, json };
}

async function buatAkun() {
  const { json } = await daftarPenggunaBaru(baseUrl, { versi_kebijakan: versiKebijakan });
  return { id: json.data.pengguna.id, token: json.data.token };
}

before(async () => {
  lepasKunci = await kunciKonfigurasiGlobal();
  lepasKunciJalur = await kunciJalurAktif(pool);
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const [[baris]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'persetujuan_versi_kebijakan'");
  versiKebijakan = Number(baris.nilai);

  for (const [id, nama, urut] of [
    [ID_DRAF, 'Jalur Uji 040 Akan Draf', 941],
    [ID_TETAP, 'Jalur Uji 040 Tetap Setuju', 942],
  ]) {
    await pool.query(
      `INSERT INTO jalur_minat (id, nama, deskripsi_singkat, status_teks, urutan, aktif, pemilik, asal)
       VALUES (?, ?, 'Deskripsi uji 040.', 'disetujui', ?, 1, 'tim', 'uji')`,
      [id, nama, urut]
    );
  }
});

after(async () => {
  await new Promise((r) => server.close(r));
  try {
    await pool.query('DELETE FROM pengguna_jalur_minat WHERE jalur_minat_id IN (?, ?)', [ID_DRAF, ID_TETAP]);
    await pool.query('DELETE FROM butir_bukti WHERE jalur_minat_id IN (?, ?)', [ID_DRAF, ID_TETAP]);
    await pool.query('DELETE FROM tujuan WHERE jalur_minat_id IN (?, ?)', [ID_DRAF, ID_TETAP]);
    await pool.query('DELETE FROM jalur_minat WHERE id IN (?, ?)', [ID_DRAF, ID_TETAP]);
  } finally {
    if (lepasKunciJalur) await lepasKunciJalur();
    if (lepasKunci) await lepasKunci();
    await pool.end();
  }
});

describe('LANJUT_040 Bagian A: PATCH /tujuan/bukti/:butirId menyamarkan jalur draf (K37/K61)', () => {
  test('1-4. PATCH pada butir berjalur draf menyamarkan jalur_minat_id di JSON mentah, menjaga baris DB, tetap utuh untuk jalur disetujui/kosong, dan menolak pemilik lain', async () => {
    const a = await buatAkun();
    const b = await buatAkun();

    // Siapkan pilihan jalur, tujuan, dan tiga butir bukti saat ID_DRAF masih disetujui.
    const pilihDraf = await panggil('POST', '/jalur-minat/saya', a.token, { jalur_minat_id: ID_DRAF });
    assert.equal(pilihDraf.status, 201, pilihDraf.rawText);

    const t1 = (await panggil('POST', '/tujuan', a.token, { judul: 'Tujuan 040 A', jalur_minat_id: ID_DRAF })).json.data;
    const t2 = (await panggil('POST', '/tujuan', a.token, { judul: 'Tujuan 040 B', jalur_minat_id: ID_TETAP })).json.data;
    const tMilikB = (await panggil('POST', '/tujuan', b.token, { judul: 'Tujuan Rahasia B' })).json.data;

    const butirDraf = (
      await panggil('POST', '/butir-bukti', a.token, {
        judul: 'Karya jalur draf 040',
        jenis: 'karya',
        jalur_minat_id: ID_DRAF,
      })
    ).json.data;
    const butirTetap = (
      await panggil('POST', '/butir-bukti', a.token, {
        judul: 'Karya jalur tetap 040',
        jenis: 'karya',
        jalur_minat_id: ID_TETAP,
      })
    ).json.data;
    const butirKosong = (
      await panggil('POST', '/butir-bukti', a.token, {
        judul: 'Karya tanpa jalur 040',
        jenis: 'karya',
      })
    ).json.data;

    // Kembalikan ID_DRAF ke status draf (simulasi jalur belum disetujui / ditarik kembali ke draf).
    await pool.query("UPDATE jalur_minat SET status_teks = 'draf' WHERE id = ?", [ID_DRAF]);

    try {
      // (1) PATCH /tujuan/bukti/:butirId pada butir berjalur draf (hanya mengubah tujuan_id)
      // TIDAK BOLEH membocorkan ID_DRAF di mana pun pada respons JSON mentah!
      const taut = await panggil('PATCH', `/tujuan/bukti/${butirDraf.id}`, a.token, { tujuan_id: t1.id });
      assert.equal(taut.status, 200, taut.rawText);
      assert.ok(
        !taut.rawText.includes(ID_DRAF),
        `Kebocoran jalur_minat_id draf di respons mentah PATCH /tujuan/bukti: ${taut.rawText}`
      );
      assert.deepEqual(taut.json.data, {
        id: butirDraf.id,
        jalur_minat_id: null,
        jalur_belum_tersedia: true,
        tujuan_id: t1.id,
      });

      // Melepas tujuan_id (null) pada butir yang sama juga tetap menyamarkan jalur draf.
      const lepas = await panggil('PATCH', `/tujuan/bukti/${butirDraf.id}`, a.token, { tujuan_id: null });
      assert.equal(lepas.status, 200, lepas.rawText);
      assert.ok(!lepas.rawText.includes(ID_DRAF), `Kebocoran saat melepas tujuan_id: ${lepas.rawText}`);
      assert.deepEqual(lepas.json.data, {
        id: butirDraf.id,
        jalur_minat_id: null,
        jalur_belum_tersedia: true,
        tujuan_id: null,
      });

      // (2) PATCH pada butir berjalur disetujui dan butir tanpa jalur tetap normal.
      const resTetap = await panggil('PATCH', `/tujuan/bukti/${butirTetap.id}`, a.token, { tujuan_id: t2.id });
      assert.equal(resTetap.status, 200, resTetap.rawText);
      assert.deepEqual(resTetap.json.data, {
        id: butirTetap.id,
        jalur_minat_id: ID_TETAP,
        jalur_belum_tersedia: false,
        tujuan_id: t2.id,
      });

      const resKosong = await panggil('PATCH', `/tujuan/bukti/${butirKosong.id}`, a.token, { tujuan_id: t2.id });
      assert.equal(resKosong.status, 200, resKosong.rawText);
      assert.deepEqual(resKosong.json.data, {
        id: butirKosong.id,
        jalur_minat_id: null,
        jalur_belum_tersedia: false,
        tujuan_id: t2.id,
      });

      // Menautkan butir kosong ke jalur disetujui tetap berhasil; ke jalur draf tetap ditolak 400.
      const tautSetuju = await panggil('PATCH', `/tujuan/bukti/${butirKosong.id}`, a.token, { jalur_minat_id: ID_TETAP });
      assert.equal(tautSetuju.status, 200, tautSetuju.rawText);
      assert.deepEqual(tautSetuju.json.data, {
        id: butirKosong.id,
        jalur_minat_id: ID_TETAP,
        jalur_belum_tersedia: false,
        tujuan_id: t2.id,
      });
      const tautDrafDitolak = await panggil('PATCH', `/tujuan/bukti/${butirKosong.id}`, a.token, { jalur_minat_id: ID_DRAF });
      assert.equal(tautDrafDitolak.status, 400);
      assert.equal(tautDrafDitolak.json.galat.kode, 'JALUR_BELUM_TERSEDIA');

      // (3) Pemilik lain tetap ditolak (404) & menautkan ke tujuan milik orang lain tetap ditolak (400).
      const orangLain = await panggil('PATCH', `/tujuan/bukti/${butirDraf.id}`, b.token, { tujuan_id: null });
      assert.equal(orangLain.status, 404);
      assert.ok(!orangLain.rawText.includes(ID_DRAF));

      const keTujuanLain = await panggil('PATCH', `/tujuan/bukti/${butirDraf.id}`, a.token, { tujuan_id: tMilikB.id });
      assert.equal(keTujuanLain.status, 400);
      assert.ok(!keTujuanLain.rawText.includes(ID_DRAF));

      // (4) Baris basis data tidak kehilangan jalur_minat_id draf (hanya disamarkan di respons).
      const [[barisDb]] = await pool.query('SELECT jalur_minat_id, tujuan_id FROM butir_bukti WHERE id = ?', [butirDraf.id]);
      assert.equal(barisDb.jalur_minat_id, ID_DRAF, 'Kolom jalur_minat_id di DB tidak boleh hilang saat PATCH');
      assert.equal(barisDb.tujuan_id, null);

      // Ekspor data milik sendiri tetap menyimpan id mentah (K37/LANJUT_035).
      const ekspor = await panggil('GET', '/pengguna/saya/ekspor', a.token);
      assert.equal(ekspor.status, 200);
      const barisEkspor = ekspor.json.data.butir_bukti.find((x) => x.id === butirDraf.id);
      assert.equal(barisEkspor.jalur_minat_id, ID_DRAF);

      // Endpoint lain yang dilindungi samarkanJalur juga tetap menyamarkan ID_DRAF (uji regresi).
      for (const [metode, jalur, badan] of [
        ['GET', '/jalur-minat/saya', undefined],
        ['GET', '/tujuan', undefined],
        ['GET', `/tujuan/${t1.id}/riwayat`, undefined],
        ['GET', '/tujuan/perjalanan', undefined],
        ['GET', '/butir-bukti', undefined],
        ['GET', `/butir-bukti/${butirDraf.id}`, undefined],
        ['PATCH', `/butir-bukti/${butirDraf.id}`, { judul: 'Karya jalur draf 040 diubah' }],
      ]) {
        const r = await panggil(metode, jalur, a.token, badan);
        assert.equal(r.status, 200, `${metode} ${jalur}: ${r.rawText}`);
        assert.ok(!r.rawText.includes(ID_DRAF), `${metode} ${jalur} membocorkan jalur draf!`);
      }
    } finally {
      // Pulihkan ID_DRAF -> disetujui dan buktikan id kembali tampil normal lewat PATCH.
      await pool.query("UPDATE jalur_minat SET status_teks = 'disetujui' WHERE id = ?", [ID_DRAF]);
    }

    const pulih = await panggil('PATCH', `/tujuan/bukti/${butirDraf.id}`, a.token, { tujuan_id: t1.id });
    assert.equal(pulih.status, 200, pulih.rawText);
    assert.deepEqual(pulih.json.data, {
      id: butirDraf.id,
      jalur_minat_id: ID_DRAF,
      jalur_belum_tersedia: false,
      tujuan_id: t1.id,
    });
  });
});
