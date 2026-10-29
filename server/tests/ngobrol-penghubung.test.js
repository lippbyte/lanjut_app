// tests/ngobrol-penghubung.test.js
// Pengujian otomatis LANJUT_078 — Ngobrol sebagai penghubung fitur:
// - satu konteks utama dari daftar tetap (modul / saran / event) → ringkasan
//   terbatas ke AI; kartu tautan (≤3) disusun server dan TIDAK dikirim ke AI
// - ringkasan tanpa tanggal lahir, nomor, email, alamat, nama sekolah; akun lain
//   tidak ikut; materi bebas event dan riwayat latihan tidak dikirim
// - saklar mati: tiruan tidak dipanggil; kebijakan belum diterima: 403; tanda bahaya:
//   respons tetap tanpa tiruan; >500 karakter: 400; gagal/batas waktu: 503
//   AI_SEMENTARA_GAGAL tanpa galat mentah; log tanpa isi pesan, ringkasan, atau kunci
// OpenRouter SELALU tiruan; alamat penyedia menunjuk 127.0.0.1:9 (tidak ada panggilan
// keluar). Saklar ai_aktif / event_sekolah_aktif dinyalakan HANYA di dalam tes lewat
// denganSaklar (try/finally) dan nilai awal dipulihkan di finally (LANJUT_077b).

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { acak, nyalakanServer, urlDari, daftarPenggunaBaru, kunciKonfigurasiGlobal, pool } = require('./bantuan');
const { muatModulApp } = require('./muat-ts-app');
const env = require('../src/config/env');
const penyedia = require('../src/modul/ngobrol/penyedia-ai');
const konteksFitur = require('../src/modul/ngobrol/konteks');
const skrip = require('../src/db/persetujuan/persetujuan-ortu');
const { hariIniWib } = require('../src/util/linimasa');

const tautanApp = muatModulApp('lib/tautanNgobrol');
const AKAR_APP = path.join(__dirname, '..', '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');

const KUNCI = ['ai_aktif', 'event_sekolah_aktif', 'ai_modul_aktif', 'ai_web_aktif', 'ngobrol_batas_5_menit', 'ngobrol_batas_24_jam'];
const KUNCI_PALSU = `kunci-uji-RAHASIA-078-${acak()}`;
const ENV_ASLI = { kunci: env.OPENROUTER_API_KEY, url: env.OPENROUTER_BASE_URL };
const tgl = (n) => new Date(hariIniWib() + n * 86400000).toISOString().slice(0, 10);

let server;
let baseUrl;
let lepasKunci;
let konfigAsli;
let versiKebijakan;
let minimumKartu;

const aturKonfig = (kunci, nilai) => pool.query('UPDATE konfigurasi_levelin SET nilai = ? WHERE kunci = ?', [String(nilai), kunci]);
async function kembalikanKonfig(tujuan) {
  for (const [k, v] of Object.entries(tujuan)) await aturKonfig(k, v);
}
/** Nyalakan konfigurasi untuk satu blok tes; nilai awal SELALU dipulihkan di finally. */
async function denganSaklar(perubahan, fn) {
  try {
    for (const [k, v] of Object.entries(perubahan)) await aturKonfig(k, v);
    return await fn();
  } finally {
    await kembalikanKonfig(Object.fromEntries(Object.keys(perubahan).map((k) => [k, konfigAsli[k]])));
  }
}
const AI = { ai_aktif: '1', ai_modul_aktif: '1', ai_web_aktif: '0', ngobrol_batas_5_menit: '1000', ngobrol_batas_24_jam: '1000' };
const AI_EVENT = { ...AI, event_sekolah_aktif: '1' };

before(async () => {
  lepasKunci = await kunciKonfigurasiGlobal();
  server = await nyalakanServer();
  baseUrl = urlDari(server);
  const [baris] = await pool.query('SELECT kunci, nilai FROM konfigurasi_levelin WHERE kunci IN (?)', [KUNCI]);
  konfigAsli = Object.fromEntries(baris.map((b) => [b.kunci, b.nilai]));
  assert.equal(Object.keys(konfigAsli).length, KUNCI.length, 'jalankan npm run migrasi');
  const [[v]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'persetujuan_versi_kebijakan'");
  versiKebijakan = Number(v.nilai);
  const [[m]] = await pool.query("SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'minimum_kartu'");
  minimumKartu = Number(m.nilai);
  env.OPENROUTER_API_KEY = KUNCI_PALSU; // tidak pernah dipakai ke internet: penyedia selalu tiruan
  env.OPENROUTER_BASE_URL = 'http://127.0.0.1:9/api/v1';
});

after(async () => {
  try {
    env.OPENROUTER_API_KEY = ENV_ASLI.kunci;
    env.OPENROUTER_BASE_URL = ENV_ASLI.url;
    await new Promise((resolve) => server.close(resolve));
  } finally {
    if (konfigAsli) await kembalikanKonfig(konfigAsli); // nilai awal saklar dipulihkan (LANJUT_077b)
    await lepasKunci?.();
    await pool.end();
  }
});

async function panggil(metode, p, token, body) {
  const res = await fetch(`${baseUrl}/api/v1${p}`, {
    method: metode,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json() };
}

/** Akun uji. `ortu` = persetujuan orang tua/wali dicatat (skrip sekolah); `kebijakan` = diterima saat daftar. */
async function akun({ kelas = '8', ortu = true, kebijakan = true } = {}) {
  const nama = `uji078_${acak()}`;
  const r = await daftarPenggunaBaru(baseUrl, {
    nama_pengguna: nama,
    nama_tampilan: `Fiktif${acak()}`,
    email: `${nama}@contoh-uji.id`,
    kelas,
    ...(['10', '11', '12'].includes(kelas) ? { jenis_sekolah: 'SMA' } : {}),
    ...(kebijakan ? { versi_kebijakan: versiKebijakan } : {}),
  });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  const a = { id: r.json.data.pengguna.id, nama, token: r.json.data.token, email: r.json.data.pengguna.email, namaTampilan: r.json.data.pengguna.nama_tampilan };
  if (ortu) {
    const logAsli = console.log;
    console.log = () => {};
    try {
      await skrip.jalankan([`--pengguna=${nama}`, '--catatan=Surat uji LANJUT_078', '--ya']);
    } finally {
      console.log = logAsli;
    }
  }
  return a;
}

const tanya = (a, teks, lain = {}) => panggil('POST', '/ngobrol', a.token, { pesan: [{ peran: 'pengguna', teks }], ...lain });
function tiruan(t, jawaban = 'Balasan tiruan.') {
  return t.mock.method(penyedia, 'mintaBalasan', async () => ({ teks: jawaban, terpotong: false, anotasi: [], token: { masuk: 10, keluar: 5 } }));
}
const terkirim = (mock, i = 0) => JSON.stringify(mock.mock.calls[i].arguments[0]);
const blokKonteks = (mock, i = 0) => {
  const baris = mock.mock.calls[i].arguments[0][1].content.split('\n');
  const j = baris.findIndex((b) => b.startsWith('KONTEKS FITUR LANJUT'));
  return j < 0 ? null : JSON.parse(baris[j + 1]);
};
const potonganModul = (mock, i = 0) => {
  const baris = mock.mock.calls[i].arguments[0][1].content.split('\n');
  const j = baris.findIndex((b) => b.startsWith('POTONGAN MODUL DARI ARSIP SISWA'));
  return j < 0 ? null : JSON.parse(baris[j + 1]);
};

/** Data latihan: `n` jawaban yakin-salah di satu mapel (pola "terlalu yakin" → saran mapel itu). */
async function latihan(a, mapel, n) {
  const kartu = await panggil('POST', '/kartu', a.token, { mapel_id: mapel, judul: `KARTU-LATIHAN-${acak()}`, isi: 'Soal?' });
  const sesi = crypto.randomUUID();
  await panggil('POST', '/sesi-latihan', a.token, { id: sesi, dimulai_pada: new Date().toISOString(), mapel_fokus_id: mapel, asal_mula: 'arsip', jumlah_kartu_direncanakan: n });
  const t0 = Date.now();
  const r = await panggil('POST', '/riwayat-latihan', a.token, Array.from({ length: n }, (_, i) => ({
    id: crypto.randomUUID(), sesi_id: sesi, kartu_id: kartu.json.data.id, benar: false, keyakinan: 5, waktu: new Date(t0 + i * 1000).toISOString(),
  })));
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return kartu.json.data;
}

/** Event uji (perlu event_sekolah_aktif = 1 dan akun SMP). */
async function event(a, isi) {
  const r = await panggil('POST', '/pengguna/event', a.token, { jenis: 'UTS', tanggal: tgl(3), mapel_id: 'matematika', ...isi });
  assert.equal(r.status, 201, JSON.stringify(r.json));
  return r.json.data;
}

const MODUL_PRIBADI = {
  judul: 'Biologi: Fotosintesis',
  mapel_id: 'biologi',
  teks: [
    'Fotosintesis adalah proses tumbuhan hijau mengubah energi cahaya menjadi energi kimia. Klorofil di daun menyerap cahaya matahari, lalu tumbuhan menghasilkan glukosa dan oksigen.',
    'Disusun oleh guru.fiktif@contoh.invalid, HP 0812-3456-7890, Tanggal lahir: 12 Maret 1990, alamat: Jl. Mawar No. 5, SMP Negeri 5 Contoh.',
  ].join(' '),
};

describe('LANJUT_078 §A: gerbang (saklar, kebijakan, tanda bahaya, panjang pesan)', () => {
  test('Saklar mati: tiruan TIDAK dipanggil, walau pesan menyebut ujian, latihan, dan materi; tanpa konteks dan kartu', async (t) => {
    const mock = tiruan(t);
    const a = await akun();
    await denganSaklar({ ai_aktif: '0' }, async () => {
      const r = await tanya(a, 'aku mau latihan buat UTS, apa itu fotosintesis?');
      assert.equal(r.status, 200);
      assert.equal(r.json.data.uji_coba, true);
      assert.equal(r.json.data.konteks, null);
      assert.deepEqual(r.json.data.tautan, []);
    });
    assert.equal(mock.mock.callCount(), 0);
  });

  test('Kebijakan belum diterima → 403 AI_BELUM_DIIZINKAN; tiruan tidak dipanggil', async (t) => {
    const mock = tiruan(t);
    const a = await akun({ kebijakan: false });
    await denganSaklar(AI, async () => {
      const r = await tanya(a, 'aku harus latihan apa?');
      assert.equal(r.status, 403);
      assert.equal(r.json.galat.kode, 'AI_BELUM_DIIZINKAN');
    });
    assert.equal(mock.mock.callCount(), 0);
  });

  test('Tanda bahaya akut: respons tetap + kartu bantuan, tiruan tidak dipanggil — saat AI aktif, mati, dan akun belum diizinkan', async (t) => {
    const mock = tiruan(t);
    const a = await akun();
    const tanpaIzin = await akun({ kebijakan: false, ortu: false });
    for (const saklar of ['1', '0']) {
      await denganSaklar({ ...AI, ai_aktif: saklar }, async () => {
        for (const siapa of [a, tanpaIzin]) {
          const r = await tanya(siapa, 'aku mau mati aja, ujian besok pasti gagal');
          assert.equal(r.status, 200);
          assert.ok(r.json.data.kartu_bantuan, 'kartu bantuan selalu ada');
          assert.deepEqual(r.json.data.tautan, []);
        }
      });
    }
    assert.equal(mock.mock.callCount(), 0);
  });

  test('Pesan siswa lebih dari 500 karakter → 400 VALIDASI_GAGAL; tepat 500 diterima', async (t) => {
    tiruan(t);
    const a = await akun();
    await denganSaklar(AI, async () => {
      const panjang = await tanya(a, 'a'.repeat(501));
      assert.equal(panjang.status, 400);
      assert.equal(panjang.json.galat.kode, 'VALIDASI_GAGAL');
      assert.equal((await tanya(a, 'a'.repeat(500))).status, 200);
    });
  });

  test('GET /ngobrol/status hanya { ai_aktif } milik konfigurasi; tanpa login 401', async () => {
    const a = await akun();
    assert.equal((await panggil('GET', '/ngobrol/status')).status, 401);
    await denganSaklar({ ai_aktif: '0' }, async () => assert.deepEqual((await panggil('GET', '/ngobrol/status', a.token)).json.data, { ai_aktif: false }));
    await denganSaklar({ ai_aktif: '1' }, async () => assert.deepEqual((await panggil('GET', '/ngobrol/status', a.token)).json.data, { ai_aktif: true }));
  });
});

describe('LANJUT_078 §A: satu konteks dari daftar tetap, ringkasan terbatas', () => {
  test('Obrolan biasa → konteks kosong (tanpa blok konteks); field "konteks" dari app diabaikan; jenis tidak dikenal → null', async (t) => {
    const mock = tiruan(t);
    const a = await akun();
    await denganSaklar(AI, async () => {
      const r = await tanya(a, 'halo, apa kabar?', { konteks: 'semua_data', tautan: [{ jenis: 'modul', modul_id: 'x' }] });
      assert.equal(r.status, 200);
      assert.equal(r.json.data.konteks, null);
      assert.deepEqual(r.json.data.tautan, []);
    });
    assert.equal(blokKonteks(mock), null);
    assert.equal(potonganModul(mock), null);
    assert.deepEqual(konteksFitur.KONTEKS, ['modul', 'saran', 'event']);
    for (const jenis of ['nilai_rapor', 'profil', '', undefined]) assert.equal(konteksFitur.ringkasanKonteks(jenis, { judul: 'x', isi: 'y' }), null, String(jenis));
  });

  test('Konteks saran: nama mapel + jenis saran saja (tanpa riwayat jawaban); kartu "Latihan" mapel itu', async (t) => {
    const mock = tiruan(t);
    const a = await akun();
    const kartu = await latihan(a, 'ekonomi', minimumKartu);
    await denganSaklar(AI, async () => {
      const r = await tanya(a, 'aku harus latihan apa hari ini?');
      assert.equal(r.status, 200, JSON.stringify(r.json));
      assert.equal(r.json.data.konteks, 'saran');
      assert.deepEqual(r.json.data.tautan, [{ jenis: 'saran', mapel_id: 'ekonomi', judul: 'Ekonomi' }]);
    });
    assert.deepEqual(blokKonteks(mock), { mapel: 'Ekonomi', jenis_saran: konteksFitur.ARTI_SARAN.saran });
    const data = terkirim(mock);
    for (const tidak of [kartu.id, kartu.judul, 'rate_overconfident', 'keyakinan', '"benar"']) assert.ok(!data.includes(tidak), `terkirim: ${tidak}`);
  });

  test('Konteks event: jenis, tanggal, sisa hari, mapel SATU event terdekat — tanpa materi bebas, id, atau kartu', async (t) => {
    const mock = tiruan(t);
    const a = await akun({ kelas: '8' });
    const MATERI = `MATERI-BEBAS-${acak()}`;
    const kartuSendiri = (await panggil('POST', '/kartu', a.token, { mapel_id: 'matematika', judul: 'Kartu event', isi: 'x' })).json.data.id;
    await denganSaklar(AI_EVENT, async () => {
      const jauh = await event(a, { jenis: 'UAS', tanggal: tgl(30), materi_teks: `${MATERI}-jauh` });
      const dekat = await event(a, { jenis: 'UTS', tanggal: tgl(3), materi_teks: MATERI, kartu_id: kartuSendiri });
      const r = await tanya(a, 'kapan ujianku berikutnya?');
      assert.equal(r.status, 200, JSON.stringify(r.json));
      assert.equal(r.json.data.konteks, 'event');
      assert.deepEqual(r.json.data.tautan, [{ jenis: 'event', jenis_event: 'UTS', tanggal: tgl(3), judul: 'Matematika' }]);
      assert.deepEqual(blokKonteks(mock), { jenis: 'UTS', tanggal: tgl(3), hari_lagi: 3, mapel: 'Matematika' });
      const data = terkirim(mock);
      for (const tidak of [MATERI, dekat.id, jauh.id, kartuSendiri, tgl(30)]) assert.ok(!data.includes(tidak), `terkirim: ${tidak}`);
    });
  });

  test('Konteks event hanya bila Persiapan Event boleh dipakai akun (saklar event, kelas 7–9): selain itu tanpa ringkasan dan tanpa kartu', async (t) => {
    const mock = tiruan(t);
    const smp = await akun({ kelas: '9' });
    await denganSaklar(AI_EVENT, async () => event(smp, { materi_teks: 'x' }));
    await denganSaklar(AI, async () => {
      const r = await tanya(smp, 'kapan ujianku?'); // saklar event mati
      assert.equal(r.json.data.konteks, null);
      assert.deepEqual(r.json.data.tautan, []);
    });
    const sma = await akun({ kelas: '10' });
    await denganSaklar(AI_EVENT, async () => {
      const r = await tanya(sma, 'kapan ujianku?'); // kelas 10: KELAS_TIDAK_DIDUKUNG
      assert.equal(r.json.data.konteks, null);
    });
    assert.ok(mock.mock.calls.every((_, i) => blokKonteks(mock, i) === null));
  });

  test('Konteks modul: ringkasan terbatas; tanggal lahir, nomor, email, alamat, nama sekolah disamarkan; id modul tidak dikirim', async (t) => {
    const mock = tiruan(t);
    const a = await akun();
    const m = (await panggil('POST', '/modul', a.token, MODUL_PRIBADI)).json.data;
    await denganSaklar(AI, async () => {
      const r = await tanya(a, 'apa itu fotosintesis?');
      assert.equal(r.status, 200, JSON.stringify(r.json));
      assert.equal(r.json.data.konteks, 'modul');
      assert.deepEqual(r.json.data.tautan, [{ jenis: 'modul', modul_id: m.id, judul: 'Biologi: Fotosintesis' }]);
    });
    const p = potonganModul(mock);
    assert.equal(p.length, 1, 'satu potongan');
    assert.ok(p[0].isi.length <= konteksFitur.RINGKASAN_MODUL_MAKS, `ringkasan ${p[0].isi.length} huruf`);
    assert.ok(p[0].isi.includes('[disamarkan]'));
    const data = terkirim(mock);
    for (const tidak of ['guru.fiktif@contoh.invalid', '0812-3456-7890', '12 Maret 1990', 'Jl. Mawar', 'SMP Negeri 5 Contoh', m.id]) {
      assert.ok(!data.includes(tidak), `terkirim: ${tidak}`);
    }
  });

  test('Konteks modul: dua modul sama-sama cocok → hanya SATU modul yang dikirim, dan kartunya menunjuk modul itu', async (t) => {
    const mock = tiruan(t);
    const a = await akun();
    const penanda = [`PENANDA-MODUL-SATU-${acak()}`, `PENANDA-MODUL-DUA-${acak()}`];
    const modul = [];
    for (const [i, p] of penanda.entries()) {
      const teks = `Fotosintesis terjadi di kloroplas daun dan menghasilkan glukosa serta oksigen. Catatan ${p}.`;
      modul.push((await panggil('POST', '/modul', a.token, { judul: `Biologi: Fotosintesis ${i + 1}`, mapel_id: 'biologi', teks })).json.data);
    }
    let tautan;
    await denganSaklar(AI, async () => {
      const r = await tanya(a, 'apa itu fotosintesis?');
      assert.equal(r.status, 200, JSON.stringify(r.json));
      tautan = r.json.data.tautan;
    });
    assert.equal(potonganModul(mock).length, 1);
    const data = terkirim(mock);
    const terkirimPenanda = penanda.filter((p) => data.includes(p));
    assert.equal(terkirimPenanda.length, 1, 'tepat satu modul yang terkirim');
    const dipakai = modul[penanda.indexOf(terkirimPenanda[0])];
    assert.deepEqual(tautan, [{ jenis: 'modul', modul_id: dipakai.id, judul: dipakai.judul }]);
  });

  test('Tiga kartu tautan (modul, latihan, event) untuk satu pertanyaan; hanya ringkasan konteks utama (modul) yang dikirim ke AI', async (t) => {
    const mock = tiruan(t);
    const a = await akun({ kelas: '7' });
    const m = (await panggil('POST', '/modul', a.token, MODUL_PRIBADI)).json.data;
    await latihan(a, 'ekonomi', minimumKartu);
    const MATERI = `MATERI-EVENT-${acak()}`;
    await denganSaklar(AI_EVENT, async () => {
      await event(a, { materi_teks: MATERI });
      const r = await tanya(a, 'aku mau latihan buat UTS, apa itu fotosintesis?');
      assert.equal(r.status, 200, JSON.stringify(r.json));
      assert.equal(r.json.data.konteks, 'modul');
      assert.deepEqual(r.json.data.tautan.map((x) => x.jenis), ['modul', 'saran', 'event']);
      assert.equal(r.json.data.tautan[0].modul_id, m.id);
    });
    assert.equal(blokKonteks(mock), null, 'saran & event tidak dikirim ke AI');
    const data = terkirim(mock);
    for (const tidak of [MATERI, 'Ekonomi', 'jenis_saran', 'hari_lagi']) assert.ok(!data.includes(tidak), `terkirim: ${tidak}`);
    assert.equal(konteksFitur.susunTautan([{ jenis: 'event' }, { jenis: 'modul' }, { jenis: 'saran' }, { jenis: 'modul' }, { jenis: 'lain' }]).length, 3);
  });

  test('Akun lain tidak ikut: modul, latihan, dan event akun B tidak muncul di ringkasan maupun kartu akun A', async (t) => {
    const mock = tiruan(t);
    const PENANDA_B = `PENANDA-AKUN-B-${acak()}`;
    const b = await akun({ kelas: '8' });
    const mB = (await panggil('POST', '/modul', b.token, { ...MODUL_PRIBADI, judul: `Biologi ${PENANDA_B}` })).json.data;
    await latihan(b, 'kimia', minimumKartu);
    const a = await akun({ kelas: '8' });
    await denganSaklar(AI_EVENT, async () => {
      const eB = await event(b, { materi_teks: PENANDA_B, mapel_id: 'kimia' });
      for (const q of ['apa itu fotosintesis?', 'aku harus latihan apa?', 'kapan ujianku?']) {
        const r = await tanya(a, q);
        assert.equal(r.status, 200);
        const respons = JSON.stringify(r.json);
        for (const tidak of [PENANDA_B, mB.id, eB.id, 'kimia', 'Kimia']) assert.ok(!respons.includes(tidak), `${q}: respons memuat ${tidak}`);
      }
    });
    for (const call of mock.mock.calls) {
      const data = JSON.stringify(call.arguments[0]);
      for (const tidak of [PENANDA_B, mB.id, 'Kimia', b.email, b.nama]) assert.ok(!data.includes(tidak), `terkirim: ${tidak}`);
    }
  });

  test('Identitas akun tidak ikut ringkasan: nama, nama pengguna, email, id', async (t) => {
    const mock = tiruan(t);
    const a = await akun({ kelas: '7' });
    await latihan(a, 'ekonomi', minimumKartu);
    await denganSaklar(AI_EVENT, async () => {
      await event(a, {});
      for (const q of ['aku harus latihan apa?', 'kapan ujianku?']) assert.equal((await tanya(a, q)).status, 200);
    });
    for (const call of mock.mock.calls) {
      const data = JSON.stringify(call.arguments[0]);
      for (const tidak of [a.nama, a.namaTampilan, a.email, a.id]) assert.ok(!data.includes(tidak), `terkirim: ${tidak}`);
    }
  });
});

describe('LANJUT_078 §A: gagal, batas waktu, log, tanpa panggilan keluar', () => {
  test('Penyedia gagal → 503 AI_SEMENTARA_GAGAL dengan pesan netral, tanpa galat mentah', async (t) => {
    t.mock.method(penyedia, 'mintaBalasan', async () => {
      throw new penyedia.GalatPenyedia('menolak permintaan', 500);
    });
    const a = await akun();
    await denganSaklar(AI, async () => {
      const r = await tanya(a, 'aku harus latihan apa?');
      assert.equal(r.status, 503);
      assert.equal(r.json.galat.kode, 'AI_SEMENTARA_GAGAL');
      assert.doesNotMatch(JSON.stringify(r.json), /HTTP|500|openrouter|penyedia|menolak/i);
    });
  });

  test('Batas waktu 20 detik: penyedia diputus tepat di 20.000 ms → 503 AI_SEMENTARA_GAGAL', async (t) => {
    assert.equal(penyedia.BATAS_WAKTU_MS, 20000);
    // Klien penyedia sungguhan, fetch tiruan yang tidak pernah menjawab; jam tiruan.
    t.mock.timers.enable({ apis: ['setTimeout'] });
    let terputus = false;
    t.mock.method(globalThis, 'fetch', (url, opsi) => new Promise((_, tolak) => {
      opsi.signal.addEventListener('abort', () => {
        terputus = true;
        tolak(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      });
    }));
    const janji = penyedia.mintaBalasan([{ role: 'user', content: 'x' }], { model: 'm/m', provider: {} });
    t.mock.timers.tick(19999);
    await Promise.resolve();
    assert.equal(terputus, false, 'belum diputus sebelum 20 detik');
    t.mock.timers.tick(1);
    await assert.rejects(janji, (e) => e instanceof penyedia.GalatPenyedia && e.jenis === 'lewat batas waktu');
    assert.equal(terputus, true);
    t.mock.timers.reset();
    // Lewat batas waktu sampai ke siswa sebagai 503, bukan galat mentah.
    t.mock.restoreAll();
    t.mock.method(penyedia, 'mintaBalasan', async () => {
      throw new penyedia.GalatPenyedia('lewat batas waktu');
    });
    const a = await akun();
    await denganSaklar(AI, async () => {
      const r = await tanya(a, 'aku harus latihan apa?');
      assert.equal(r.status, 503);
      assert.equal(r.json.galat.kode, 'AI_SEMENTARA_GAGAL');
      assert.doesNotMatch(JSON.stringify(r.json), /batas waktu|abort/i);
    });
  });

  test('Log server: id akun, jenis konteks, status, lama — tanpa isi pesan, ringkasan, atau kunci', async (t) => {
    tiruan(t);
    const a = await akun({ kelas: '8' });
    const PESAN = `PENANDA-PESAN-${acak()}`;
    const MATERI = `PENANDA-MATERI-${acak()}`;
    await panggil('POST', '/modul', a.token, { ...MODUL_PRIBADI, teks: `${MODUL_PRIBADI.teks} ${MATERI}` });
    await latihan(a, 'ekonomi', minimumKartu);
    const tercatat = [];
    for (const k of ['log', 'info', 'warn', 'error']) t.mock.method(console, k, (...arg) => tercatat.push(arg.map(String).join(' ')));
    // Penanda di pesan terbaru (modul) dan di riwayat siswa (saran, event): kata penanda di
    // pesan terbaru akan terbaca sebagai kata isi pelajaran dan mengubah konteksnya.
    const riwayat = [{ peran: 'pengguna', teks: `catatan ${PESAN}` }, { peran: 'bot', teks: 'Oke.' }];
    const tanyaDenganRiwayat = (teks) => panggil('POST', '/ngobrol', a.token, { pesan: [...riwayat, { peran: 'pengguna', teks }] });
    await denganSaklar(AI_EVENT, async () => {
      await event(a, { materi_teks: MATERI });
      await tanya(a, `apa itu fotosintesis? ${PESAN}`);
      await tanyaDenganRiwayat('aku harus latihan apa?');
      await tanyaDenganRiwayat('kapan ujianku?');
    });
    await new Promise((r) => setTimeout(r, 50));
    const log = tercatat.join('\n');
    for (const jenis of ['modul', 'saran', 'event']) assert.match(log, new RegExp(`\\[ngobrol\\] pengguna=${a.id} konteks=${jenis} tautan=\\d status=200 lama=\\d+ms`));
    for (const tidak of [PESAN, MATERI, KUNCI_PALSU, 'Fotosintesis adalah', 'Ekonomi', 'guru.fiktif']) assert.ok(!log.includes(tidak), `log memuat ${tidak}`);
  });

  test('Tidak ada panggilan ke luar: semua fetch selama percakapan hanya ke server uji; kode konteks tanpa jaringan', async (t) => {
    tiruan(t);
    const a = await akun({ kelas: '7' });
    await latihan(a, 'ekonomi', minimumKartu);
    const fetchAsli = globalThis.fetch;
    const tujuan = [];
    t.mock.method(globalThis, 'fetch', (url, opsi) => {
      tujuan.push(String(url));
      return fetchAsli(url, opsi);
    });
    await denganSaklar(AI_EVENT, async () => {
      await tanya(a, 'aku mau latihan buat UTS, apa itu fotosintesis?');
    });
    assert.ok(tujuan.length > 0 && tujuan.every((u) => u.startsWith(baseUrl)), JSON.stringify(tujuan));
    const kode = fs.readFileSync(path.join(__dirname, '..', 'src', 'modul', 'ngobrol', 'konteks.js'), 'utf8');
    assert.ok(!/\bfetch\s*\(|https?:\/\/[a-z0-9]|axios|require\(['"]https?['"]\)/i.test(kode));
  });

  test('Obrolan dan jawaban AI tidak disimpan: tidak ada tabel obrolan/riwayat ngobrol', async () => {
    const [tabel] = await pool.query(
      "SELECT TABLE_NAME AS t FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND (TABLE_NAME LIKE '%obrolan%' OR TABLE_NAME LIKE '%ngobrol%' OR TABLE_NAME LIKE '%percakapan%')"
    );
    assert.deepEqual(tabel, []);
  });
});

describe('LANJUT_078 §B: app — kartu tautan dan saklar mati', () => {
  test('kartuTautan: maksimal tiga, satu per jenis, jenis tidak dikenal dibuang; tombol membuka layar yang sudah ada', () => {
    const kartu = tautanApp.kartuTautan([
      { jenis: 'event', jenis_event: 'UAS', tanggal: '2026-10-20', judul: 'Matematika' },
      { jenis: 'modul', modul_id: 'm1', judul: 'Biologi: Fotosintesis' },
      { jenis: 'lain', judul: 'x' },
      { jenis: 'saran', mapel_id: 'ekonomi', judul: 'Ekonomi' },
      { jenis: 'modul', modul_id: 'm2', judul: 'Ganda' },
    ]);
    assert.equal(kartu.length, 3);
    assert.deepEqual(kartu.map((k) => k.tujuan), [
      { pathname: '/arsip-modul', params: { id: 'm1' } },
      { pathname: '/latihan', params: { mapel: 'ekonomi', asal: 'saran' } },
      { pathname: '/daftar-periksa' },
    ]);
    assert.equal(kartu[2].judul, 'UAS/PAS · Matematika');
    assert.deepEqual(tautanApp.kartuTautan(undefined), []);
    assert.equal(tautanApp.TAUTAN_MAKS, konteksFitur.TAUTAN_MAKS);
    // Batas pesan app = batas server (lib/ngobrol.ts memuat api/client, jadi dibaca dari sumbernya).
    const { PANJANG_PESAN_SISWA } = require('../src/modul/ngobrol/ngobrol.skema');
    assert.equal(PANJANG_PESAN_SISWA, 500);
    assert.ok(baca('lib', 'ngobrol.ts').includes(`export const PANJANG_PESAN_MAKS = ${PANJANG_PESAN_SISWA};`), 'batas app = batas server');
  });

  test('Layar: kartu hanya dari balasan AI (bukan uji coba); petunjuk & catatan konteks hanya bila GET /ngobrol/status ai_aktif', () => {
    const layar = baca('components', 'screens', 'NgobrolScreen.tsx');
    const provider = baca('providers', 'ObrolanProvider.tsx');
    assert.ok(provider.includes('...(!hasil.uji_coba && hasil.tautan && hasil.tautan.length ? { tautan: hasil.tautan } : {})'));
    assert.ok(layar.includes('{m.tautan ? <KartuTautanDaftar tautan={m.tautan} /> : null}'));
    assert.ok(layar.includes('const status = useStatusNgobrol(true);'));
    assert.ok(layar.includes('{status.data?.ai_aktif ? ('));
    // Saklar mati: semua teks khusus AI (petunjuk, catatan konteks) ada di dalam satu cabang ai_aktif.
    const cabang = layar.slice(layar.indexOf('{status.data?.ai_aktif ? ('));
    const isiCabang = cabang.slice(0, cabang.indexOf(') : null}'));
    assert.ok(isiCabang.includes('TEKS_NGOBROL.petunjukAi') && isiCabang.includes('TEKS_NGOBROL.catatanKonteks'));
    assert.equal((layar.match(/TEKS_NGOBROL\.petunjukAi/g) || []).length, 1);
    assert.equal((layar.match(/TEKS_NGOBROL\.catatanKonteks/g) || []).length, 1);
  });
});
