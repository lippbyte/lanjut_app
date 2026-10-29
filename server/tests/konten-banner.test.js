// tests/konten-banner.test.js
// Pengujian otomatis LANJUT_073 — banner Beranda. LANJUT_074: endpoint mengirim
// paling banyak tiga (carousel), dan carousel ada di bawah Info Penting.
// Server: GET /konten/banner dari server/config/banner-beranda.json. Berkas
// tidak pernah diubah oleh tes: isinya diganti lewat t.mock.method pada
// banner.bacaBerkas (pola konten-linimasa.test.js). Semua data banner di sini
// adalah fixture uji, bukan konten nyata.
// App: lib/beranda.ts dijalankan langsung (muat-ts-app.js).

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { nyalakanServer, urlDari, daftarPenggunaBaru, pool } = require('./bantuan');
const bannerModul = require('../src/modul/konten/banner');
const { hariIniWib } = require('../src/util/linimasa');
const { muatModulApp } = require('./muat-ts-app');

const appBeranda = muatModulApp('lib/beranda');
const AKAR_REPO = path.join(__dirname, '..', '..', '..');
const SEHARI = 86400000;
const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
const HARI = hariIniWib(); // hari ini (WIB) saat tes berjalan
const MEDAN_PUBLIK = ['id', 'isi', 'judul', 'sumber', 'tanggal_selesai', 'url_sumber'];

function item(lain = {}) {
  return {
    id: 'banner-uji-001',
    judul: 'Judul banner uji',
    isi: 'Isi banner uji untuk pengujian otomatis.',
    tanggal_mulai: iso(HARI - 3 * SEHARI),
    tanggal_selesai: iso(HARI + 3 * SEHARI),
    sumber: 'Sumber Uji Resmi',
    url_sumber: 'https://contoh.invalid/pengumuman-uji',
    status_verifikasi: 'terverifikasi',
    diperiksa_pada: iso(HARI - 3 * SEHARI),
    ...lain,
  };
}
const berkas = (banner, lain = {}) => JSON.stringify({ versi: 1, banner, ...lain });

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

async function ambil(token) {
  const res = await fetch(`${baseUrl}/api/v1/konten/banner`, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
  return { status: res.status, json: await res.json() };
}

/** GET /konten/banner dengan isi berkas `teks`; peringatan log ditangkap, tidak dicetak. */
async function ambilDengan(t, teks) {
  t.mock.method(bannerModul, 'bacaBerkas', async () => teks);
  const warn = t.mock.method(console, 'warn', () => {});
  const { status, json } = await ambil();
  assert.equal(status, 200);
  assert.equal(json.ok, true);
  return { banner: json.data.banner, data: json.data, peringatan: warn.mock.calls.map((c) => c.arguments.join(' ')) };
}

describe('LANJUT_073 §A: berkas banner-beranda.json', () => {
  test('Berkas asli: versi 1, banner kosong, tanpa isi karangan', () => {
    const isi = JSON.parse(fs.readFileSync(bannerModul.BERKAS_BANNER, 'utf8'));
    assert.deepEqual(isi, { versi: 1, banner: [] });
  });

  test('Endpoint dengan berkas asli → { ok: true, data: { banner: [] } }', async () => {
    const { status, json } = await ambil();
    assert.equal(status, 200);
    assert.deepEqual(json, { ok: true, data: { banner: [] } });
  });
});

describe('LANJUT_073 §B: GET /konten/banner', () => {
  test('Publik: tanpa login dan dengan token jawabannya sama', async (t) => {
    t.mock.method(bannerModul, 'bacaBerkas', async () => berkas([item()]));
    const { json: daftar } = await daftarPenggunaBaru(baseUrl, { kelas: '12', jenis_sekolah: 'SMA' });
    const tanpa = await ambil();
    const dengan = await ambil(daftar.data.token);
    assert.equal(tanpa.status, 200);
    assert.deepEqual(dengan.json, tanpa.json);
    assert.equal(tanpa.json.data.banner.length, 1);
  });

  test('Satu banner terverifikasi yang berlaku → terkirim, hanya medan publik', async (t) => {
    const { banner, data } = await ambilDengan(t, berkas([item()]));
    assert.deepEqual(Object.keys(data), ['banner']);
    assert.equal(banner.length, 1);
    assert.deepEqual(Object.keys(banner[0]).sort(), MEDAN_PUBLIK);
    assert.equal(banner[0].diperiksa_pada, undefined);
    assert.equal(banner[0].status_verifikasi, undefined);
    assert.equal(banner[0].tanggal_mulai, undefined);
    assert.equal(banner[0].judul, 'Judul banner uji');
  });

  test('belum_diverifikasi tidak pernah dikirim', async (t) => {
    const { banner } = await ambilDengan(t, berkas([item({ status_verifikasi: 'belum_diverifikasi' })]));
    assert.deepEqual(banner, []);
  });

  test('terverifikasi tanpa diperiksa_pada (tidak ada, null, "", spasi) dianggap belum terverifikasi', async (t) => {
    const { diperiksa_pada, ...tanpaMedan } = item({ id: 'b-1' });
    const varian = [tanpaMedan, item({ id: 'b-2', diperiksa_pada: null }), item({ id: 'b-3', diperiksa_pada: '' }), item({ id: 'b-4', diperiksa_pada: '  ' })];
    for (const v of varian) {
      const { banner, peringatan } = await ambilDengan(t, berkas([v]));
      assert.deepEqual(banner, [], `${v.id} tidak boleh terkirim`);
      assert.deepEqual(peringatan, [], `${v.id} bukan berkas rusak`);
      t.mock.restoreAll();
    }
  });

  test('Di luar rentang tanggal WIB tidak dikirim (belum mulai / sudah selesai)', async (t) => {
    const belumMulai = item({ id: 'belum', tanggal_mulai: iso(HARI + SEHARI), tanggal_selesai: iso(HARI + 5 * SEHARI) });
    const sudahSelesai = item({ id: 'sudah', tanggal_mulai: iso(HARI - 5 * SEHARI), tanggal_selesai: iso(HARI - SEHARI) });
    const { banner } = await ambilDengan(t, berkas([belumMulai, sudahSelesai]));
    assert.deepEqual(banner, []);
  });

  test('Batas tanggal WIB: hari pertama & terakhir ikut; 00.00 WIB sesudah hari terakhir tidak', async (t) => {
    t.mock.method(bannerModul, 'bacaBerkas', async () =>
      berkas([item({ id: 'okt', tanggal_mulai: '2026-10-13', tanggal_selesai: '2026-10-20', diperiksa_pada: '2026-10-12' })])
    );
    const pada = (ms) => bannerModul.bannerAktif(ms);
    assert.equal((await pada(Date.UTC(2026, 9, 12, 16, 59, 59))).length, 0, '23.59 WIB 12 Okt: belum mulai');
    assert.equal((await pada(Date.UTC(2026, 9, 12, 17, 0, 0))).length, 1, '00.00 WIB 13 Okt: hari pertama');
    assert.equal((await pada(Date.UTC(2026, 9, 20, 16, 59, 59))).length, 1, '23.59 WIB 20 Okt: hari terakhir');
    assert.equal((await pada(Date.UTC(2026, 9, 20, 17, 0, 0))).length, 0, '00.00 WIB 21 Okt: sudah lewat');
  });

  // LANJUT_074: batas naik dari satu (LANJUT_073) menjadi tiga.
  test('Paling banyak tiga: tanggal_mulai paling baru dulu; bila sama, id terkecil', async (t) => {
    assert.equal(bannerModul.MAKS_BANNER, 3);
    const lama = item({ id: 'lama', tanggal_mulai: iso(HARI - 9 * SEHARI) });
    const tengah = item({ id: 'tengah', tanggal_mulai: iso(HARI - 5 * SEHARI) });
    const sedang = item({ id: 'sedang', tanggal_mulai: iso(HARI - 3 * SEHARI) });
    const baruB = item({ id: 'baru-b', tanggal_mulai: iso(HARI - SEHARI) });
    const baruA = item({ id: 'baru-a', tanggal_mulai: iso(HARI - SEHARI) });
    const { banner } = await ambilDengan(t, berkas([lama, tengah, baruB, sedang, baruA]));
    assert.deepEqual(banner.map((b) => b.id), ['baru-a', 'baru-b', 'sedang']);
  });

  test('Kurang dari tiga yang berlaku → semuanya, tanpa pengisi', async (t) => {
    const satu = item({ id: 'satu', tanggal_mulai: iso(HARI - 2 * SEHARI) });
    const dua = item({ id: 'dua', tanggal_mulai: iso(HARI - SEHARI) });
    const belum = item({ id: 'belum', status_verifikasi: 'belum_diverifikasi' });
    const { banner } = await ambilDengan(t, berkas([satu, dua, belum]));
    assert.deepEqual(banner.map((b) => b.id), ['dua', 'satu']);
    for (const b of banner) assert.deepEqual(Object.keys(b).sort(), MEDAN_PUBLIK);
  });

  test('JSON rusak → banner [], peringatan di log, server tetap melayani', async (t) => {
    const { banner, peringatan } = await ambilDengan(t, '{ "versi": 1, "banner": [ ');
    assert.deepEqual(banner, []);
    assert.equal(peringatan.length, 1);
    assert.match(peringatan[0], /\[banner-beranda\].*JSON rusak/);
    t.mock.restoreAll();
    const sesudah = await ambilDengan(t, berkas([item()]));
    assert.equal(sesudah.banner.length, 1, 'server masih hidup dan melayani berkas yang sudah benar');
  });

  test('Medan wajib kosong → banner [] + peringatan', async (t) => {
    const { id, ...tanpaId } = item();
    for (const rusak of [item({ judul: '   ' }), item({ isi: '' }), item({ sumber: '' }), tanpaId, item({ tanggal_mulai: '' })]) {
      const { banner, peringatan } = await ambilDengan(t, berkas([rusak]));
      assert.deepEqual(banner, []);
      assert.equal(peringatan.length, 1);
      t.mock.restoreAll();
    }
  });

  test('url_sumber bukan https ditolak (tidak dikirim)', async (t) => {
    for (const url of ['http://contoh.invalid/x', 'javascript:alert(1)', 'ftp://contoh.invalid/x', 'https://', 'contoh.invalid/x', 'HTTP://contoh.invalid']) {
      const { banner, peringatan } = await ambilDengan(t, berkas([item({ url_sumber: url })]));
      assert.deepEqual(banner, [], `${url} tidak boleh terkirim`);
      assert.equal(peringatan.length, 1, url);
      t.mock.restoreAll();
    }
  });

  test('Judul > 80 atau isi > 200 karakter ditolak; tepat 80 dan 200 diterima', async (t) => {
    for (const [lain, terkirim] of [
      [{ judul: 'J'.repeat(81) }, false],
      [{ isi: 'I'.repeat(201) }, false],
      [{ judul: 'J'.repeat(80), isi: 'I'.repeat(200) }, true],
      [{ judul: '🎓'.repeat(80) }, true], // dihitung per karakter, bukan unit UTF-16
    ]) {
      const { banner } = await ambilDengan(t, berkas([item(lain)]));
      assert.equal(banner.length, terkirim ? 1 : 0, JSON.stringify(Object.keys(lain)));
      t.mock.restoreAll();
    }
  });

  test('Struktur berkas salah → banner []', async (t) => {
    for (const teks of [
      JSON.stringify({ versi: 2, banner: [item()] }),
      JSON.stringify({ banner: [item()] }),
      JSON.stringify({ versi: 1, banner: item() }),
      JSON.stringify([item()]),
      JSON.stringify({ versi: 1, banner: [item({ status_verifikasi: 'disetujui' })] }),
    ]) {
      const { banner, peringatan } = await ambilDengan(t, teks);
      assert.deepEqual(banner, []);
      assert.equal(peringatan.length, 1);
      t.mock.restoreAll();
    }
  });

  test('Tanggal tidak sah (tidak ada di kalender, format salah, mulai sesudah selesai) → banner []', async (t) => {
    for (const lain of [
      { tanggal_selesai: '2026-02-30' },
      { tanggal_mulai: '2026-1-5' },
      { tanggal_selesai: '13/10/2026' },
      { tanggal_mulai: iso(HARI + 2 * SEHARI), tanggal_selesai: iso(HARI + SEHARI) },
      { diperiksa_pada: '2026-13-01' },
    ]) {
      const { banner } = await ambilDengan(t, berkas([item(lain)]));
      assert.deepEqual(banner, [], JSON.stringify(lain));
      t.mock.restoreAll();
    }
  });

  test('id ganda → banner []', async (t) => {
    const { banner } = await ambilDengan(t, berkas([item({ id: 'sama' }), item({ id: 'sama' })]));
    assert.deepEqual(banner, []);
  });

  test('Gagal-tertutup: satu item rusak mengosongkan semua, walau ada item sah lain', async (t) => {
    const { banner } = await ambilDengan(t, berkas([item({ id: 'sah' }), item({ id: 'rusak', url_sumber: 'http://contoh.invalid' })]));
    assert.deepEqual(banner, []);
  });

  test('Berkas tidak ada → banner [] + peringatan, server tetap hidup', async (t) => {
    t.mock.method(bannerModul, 'bacaBerkas', async () => {
      const err = new Error('ENOENT: no such file');
      err.code = 'ENOENT';
      throw err;
    });
    const warn = t.mock.method(console, 'warn', () => {});
    const { status, json } = await ambil();
    assert.equal(status, 200);
    assert.deepEqual(json, { ok: true, data: { banner: [] } });
    assert.match(warn.mock.calls[0].arguments.join(' '), /berkas tidak ditemukan/);
  });

  test('Peringatan di log tidak memuat isi banner', async (t) => {
    const rahasia = item({ judul: 'JUDUL-RAHASIA-UJI', isi: 'ISI-RAHASIA-UJI', sumber: 'SUMBER-RAHASIA-UJI', url_sumber: 'http://url-rahasia-uji.invalid' });
    const { peringatan } = await ambilDengan(t, berkas([rahasia]));
    assert.equal(peringatan.length, 1);
    for (const kata of ['JUDUL-RAHASIA-UJI', 'ISI-RAHASIA-UJI', 'SUMBER-RAHASIA-UJI', 'url-rahasia-uji']) {
      assert.ok(!peringatan[0].includes(kata), `log memuat ${kata}`);
    }
    assert.match(peringatan[0], /banner\.0\.url_sumber/);
  });

  test('Galat tak terduga → 500 dengan kunci galat (bentuk respons standar)', async (t) => {
    t.mock.method(bannerModul, 'bannerAktif', async () => {
      throw new Error('galat tak terduga');
    });
    t.mock.method(console, 'error', () => {});
    const { status, json } = await ambil();
    assert.equal(status, 500);
    assert.equal(json.ok, false);
    assert.equal(json.galat.kode, 'GALAT_SERVER');
    assert.equal(json.data, undefined);
  });
});

describe('LANJUT_073 §C / LANJUT_074: app (lib/beranda.ts)', () => {
  const B = { id: 'a', judul: 'J', isi: 'I', sumber: 'S', url_sumber: 'https://contoh.invalid', tanggal_selesai: '2026-10-20' };
  const H13 = Date.UTC(2026, 9, 13);

  test('bannerBeranda: kosong / tidak ada data → [] (carousel tidak tampil); satu item → [item]', () => {
    assert.deepEqual(appBeranda.bannerBeranda([], H13), []);
    assert.deepEqual(appBeranda.bannerBeranda(undefined, H13), []);
    assert.deepEqual(appBeranda.bannerBeranda(null, H13), []);
    assert.deepEqual(appBeranda.bannerBeranda([B], H13), [B]);
  });

  test('bannerBeranda: tanggal_selesai lewat menurut WIB → dibuang; hari terakhir tetap tampil', () => {
    assert.deepEqual(appBeranda.bannerBeranda([B], Date.UTC(2026, 9, 20)), [B]);
    assert.deepEqual(appBeranda.bannerBeranda([B], Date.UTC(2026, 9, 21)), []);
    assert.deepEqual(appBeranda.bannerBeranda([{ ...B, tanggal_selesai: 'bukan-tanggal' }], H13), []);
  });

  test('bannerBeranda: tautan bukan https dibuang; sisanya tetap, urutan server dipertahankan', () => {
    assert.deepEqual(appBeranda.bannerBeranda([{ ...B, url_sumber: 'http://contoh.invalid' }], H13), []);
    const hasil = appBeranda.bannerBeranda([B, { ...B, id: 'http', url_sumber: 'http://contoh.invalid' }, { ...B, id: 'c' }], H13);
    assert.deepEqual(hasil.map((b) => b.id), ['a', 'c']);
  });

  test('bannerBeranda: paling banyak tiga (MAKS_BANNER_BERANDA, sama dengan server)', () => {
    assert.equal(appBeranda.MAKS_BANNER_BERANDA, 3);
    assert.equal(appBeranda.MAKS_BANNER_BERANDA, bannerModul.MAKS_BANNER);
    const lima = ['a', 'b', 'c', 'd', 'e'].map((id) => ({ ...B, id }));
    assert.deepEqual(appBeranda.bannerBeranda(lima, H13).map((b) => b.id), ['a', 'b', 'c']);
    assert.equal(appBeranda.bannerBeranda(lima.slice(0, 3), H13).length, 3);
  });

  test('urutanBeranda: carousel sesudah Info Penting (kelas 12) atau sesudah grid (lainnya), sekali saja', () => {
    for (const kelas of ['7', '10', '12', null]) {
      const u = appBeranda.urutanBeranda({ kelas, tampilMulaiDariSini: true, tampilBanner: true });
      const sebelum = kelas === '12' ? 'info_penting' : 'grid';
      assert.equal(u.indexOf('banner'), u.indexOf(sebelum) + 1, `kelas ${kelas}: ${u}`);
      assert.equal(u.filter((b) => b === 'banner').length, 1);
    }
  });

  test('urutanBeranda: tanpa banner, tidak ada bagian banner', () => {
    assert.deepEqual(appBeranda.urutanBeranda({ kelas: '12', tampilMulaiDariSini: true }), [
      'sapaan', 'hero', 'progres', 'grid', 'info_penting', 'judul', 'mulai_dari_sini',
    ]);
    assert.deepEqual(appBeranda.urutanBeranda({ kelas: '12', tampilMulaiDariSini: true, tampilBanner: false }), [
      'sapaan', 'hero', 'progres', 'grid', 'info_penting', 'judul', 'mulai_dari_sini',
    ]);
  });

  test('Layar: banner lewat bannerBeranda, gagal → tidak tampil, tanpa logika tanggal sendiri', () => {
    const layar = fs.readFileSync(path.join(AKAR_REPO, 'LANJUT_App', 'components', 'screens', 'LinimasaScreen.tsx'), 'utf8');
    assert.ok(layar.includes('bannerQuery.isError ? [] : bannerBeranda('));
    assert.ok(layar.includes('tampilBanner: banner.length > 0'));
    assert.ok(!/belum ada pengumuman/i.test(layar), 'tidak boleh ada teks "belum ada pengumuman"');
    for (const pola of [/new Date\(/, /Date\.now\(/, /Date\.UTC\(/]) assert.ok(!pola.test(layar), `LinimasaScreen.tsx memuat ${pola}`);
  });
});

describe('LANJUT_073 §D: salinan teks', () => {
  test('Teks "Sumber:" banner tercatat DRAF di salinan-teks-lanjut.md', () => {
    const sumber = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'), 'utf8');
    const awal = sumber.indexOf('**LANJUT_App (LANJUT_073)');
    assert.ok(awal >= 0, 'blok LANJUT_073 harus ada');
    const blok = sumber.slice(awal, sumber.indexOf('\n### ', awal));
    assert.match(blok.slice(0, blok.indexOf('\n\n')), /\bDRAF\b/);
    assert.ok(blok.includes('Sumber: [sumber]'));
  });
});
