// tests/perbaikan-080b.test.js
// LANJUT_080b — perbaikan kecil sebelum uji rilis:
// A. pesan galat muat yang menjanjikan isi "masih bisa dilihat" hilang dari app
//    (cache hanya di memori); diganti kalimat DRAF yang benar
// B. tombol mikrofon Ngobrol tersembunyi secara bawaan, lewat konfigurasi build
//    (EXPO_PUBLIC_MIKROFON_NGOBROL=1 → extra.mikrofonNgobrol → lib/fiturApp.ts); kotak tulis tetap
// C. galat tipe per butir minat_rumpun memakai medan { minat_rumpun: "…" } (seperti mapel_pilihan, 079b)
// Memakai kunciKonfigurasiGlobal: menyimpan minat_rumpun butuh kebijakan versi berlaku diterima,
// dan persetujuan.test.js sementara menaikkan versi itu.

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { nyalakanServer, urlDari, daftarPenggunaBaru, kunciKonfigurasiGlobal, pool } = require('./bantuan');
const { muatModulApp } = require('./muat-ts-app');
const { ambilKonfigurasi } = require('../src/modul/persetujuan/persetujuan.layanan');

const AKAR_APP = path.join(__dirname, '..', '..');
const AKAR_REPO = path.join(AKAR_APP, '..');
const baca = (...p) => fs.readFileSync(path.join(AKAR_APP, ...p), 'utf8').replace(/\r\n/g, '\n');
const fitur = muatModulApp('lib/fiturApp');

const KALIMAT_LAMA = /masih bisa dilihat|sudah pernah dibuka/i;
const KALIMAT_BARU = 'Belum bisa dimuat. Periksa sambungan internetmu, lalu coba lagi.';

/** Semua berkas sumber app (.ts/.tsx), tanpa node_modules, server, dan hasil build. */
function berkasApp() {
  const hasil = [];
  for (const dir of ['app', 'components', 'lib', 'hooks', 'providers', 'api']) {
    const jalan = (d) => {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) jalan(p);
        else if (/\.(ts|tsx)$/.test(e.name)) hasil.push(p);
      }
    };
    jalan(path.join(AKAR_APP, dir));
  }
  return hasil;
}

describe('LANJUT_080b §A: pesan galat muat yang tidak benar', () => {
  test('Tidak ada lagi teks app yang menjanjikan isi "masih bisa dilihat" / "sudah pernah dibuka"', () => {
    const berkas = berkasApp();
    assert.ok(berkas.length > 50, `berkas app terbaca: ${berkas.length}`);
    const temuan = berkas.filter((p) => KALIMAT_LAMA.test(fs.readFileSync(p, 'utf8'))).map((p) => path.relative(AKAR_APP, p));
    assert.deepEqual(temuan, []);
  });

  test('KeadaanGalat memakai kalimat baru yang tercatat DRAF di salinan §6 (blok LANJUT_080b) dan lembar review', () => {
    const ui = baca('components', 'ui', 'index.tsx');
    const fungsi = ui.slice(ui.indexOf('export function KeadaanGalat()'), ui.indexOf('export const gaya'));
    assert.ok(fungsi.includes(`<Peringatan>${KALIMAT_BARU}</Peringatan>`), fungsi);
    const salinan = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'salinan-teks-lanjut.md'), 'utf8');
    assert.ok(/\*\*LANJUT_App \(LANJUT_080b\) — pesan galat muat di semua layar\. DRAF, belum disetujui\s+Khalifa\.\*\*/.test(salinan));
    assert.ok(salinan.includes(`- **Belum bisa dimuat (semua layar):** ${KALIMAT_BARU}`));
    const lembar = fs.readFileSync(path.join(AKAR_REPO, 'docs', 'lembar-review-draf-teks.md'), 'utf8');
    assert.ok(lembar.includes(`> **Belum bisa dimuat (semua layar):** ${KALIMAT_BARU}`));
  });

  test('Cache app memang hanya di memori (alasan kalimat lama tidak benar): QueryProvider tanpa persistensi', () => {
    const qp = baca('providers', 'QueryProvider.tsx');
    assert.ok(!/persist/i.test(qp), 'bila cache dibuat persisten, tinjau ulang kalimat galat');
  });
});

describe('LANJUT_080b §B: mikrofon Ngobrol tersembunyi secara bawaan (konfigurasi)', () => {
  test('mikrofonNgobrolAktif: mati untuk semua nilai kecuali extra.mikrofonNgobrol === true', () => {
    for (const extra of [undefined, null, {}, 'ya', { mikrofonNgobrol: false }, { mikrofonNgobrol: '1' }, { mikrofonNgobrol: 1 }, { mikrofonNgobrol: 'true' }]) {
      assert.equal(fitur.mikrofonNgobrolAktif(extra), false, JSON.stringify(extra));
    }
    assert.equal(fitur.mikrofonNgobrolAktif({ mikrofonNgobrol: true }), true);
  });

  test('Konfigurasi build: bawaan mati (hanya EXPO_PUBLIC_MIKROFON_NGOBROL=1 yang menyalakan); eas.json tidak menyalakannya', () => {
    const konfig = baca('app.config.ts');
    assert.ok(konfig.includes("mikrofonNgobrol: process.env.EXPO_PUBLIC_MIKROFON_NGOBROL === '1',"));
    // Bawaan proses tanpa variabel itu → false → mikrofon mati.
    const bawaan = process.env.EXPO_PUBLIC_MIKROFON_NGOBROL === '1';
    assert.equal(fitur.mikrofonNgobrolAktif({ mikrofonNgobrol: bawaan }), process.env.EXPO_PUBLIC_MIKROFON_NGOBROL === '1');
    assert.ok(!baca('eas.json').includes('EXPO_PUBLIC_MIKROFON_NGOBROL'), 'build preview/produksi tidak boleh menyalakan mikrofon');
  });

  test('Layar Ngobrol: tombol & pengenal di balik konfigurasi; kotak tulis "Pesan" dan tombol Kirim tetap di luar syarat itu', () => {
    const ng = baca('components', 'screens', 'NgobrolScreen.tsx');
    assert.ok(ng.includes('const MIKROFON_NGOBROL = mikrofonNgobrolAktif(Constants.expoConfig?.extra);'));
    assert.ok(ng.includes('return { didukung: MIKROFON_NGOBROL && !!Pengenal, mendengar, tekan, batal };'), 'tombol tidak tampil bila konfigurasi mati');
    assert.ok(ng.includes('if (!MIKROFON_NGOBROL || !Pengenal || aktif.current) return;'), 'pengenal tidak pernah dimulai bila konfigurasi mati');
    const awal = ng.indexOf('{ucapan.didukung ? (');
    const akhir = ng.indexOf(') : null}', awal);
    assert.ok(awal > 0 && akhir > awal);
    const blokMik = ng.slice(awal, akhir);
    assert.ok(blokMik.includes('accessibilityLabel={TEKS_NGOBROL.ucapkanPesan}'), 'yang bersyarat hanya tombol mikrofon');
    for (const tetap of ['accessibilityLabel="Pesan"', 'accessibilityLabel="Kirim"']) {
      assert.ok(ng.includes(tetap), tetap);
      assert.ok(!blokMik.includes(tetap), `${tetap} tidak boleh ikut tersembunyi`);
    }
  });
});

describe('LANJUT_080b §C: galat minat_rumpun seragam', () => {
  let server;
  let baseUrl;
  let lepasKunci;
  let versiKebijakan;

  before(async () => {
    lepasKunci = await kunciKonfigurasiGlobal();
    server = await nyalakanServer();
    baseUrl = urlDari(server);
    versiKebijakan = (await ambilKonfigurasi()).versiKebijakan;
  });

  after(async () => {
    try {
      await new Promise((resolve) => server.close(resolve));
    } finally {
      await lepasKunci();
      await pool.end();
    }
  });

  async function akun(kelas) {
    const r = await daftarPenggunaBaru(baseUrl, {
      kelas,
      ...(['10', '11', '12'].includes(kelas) ? { jenis_sekolah: 'SMA' } : {}),
      versi_kebijakan: versiKebijakan,
    });
    assert.equal(r.status, 201, JSON.stringify(r.json));
    return r.json.data.token;
  }

  async function ubahMinat(token, minat_rumpun) {
    const res = await fetch(`${baseUrl}/api/v1/pengguna/saya`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ minat_rumpun }),
    });
    return { status: res.status, json: await res.json() };
  }

  /** 400 dengan galat { kode, pesan, medan } dan medan TEPAT { minat_rumpun: teks }. */
  function bentukSeragam(r, nama) {
    assert.equal(r.status, 400, `${nama}: ${JSON.stringify(r.json)}`);
    assert.deepEqual(Object.keys(r.json.galat).sort(), ['kode', 'medan', 'pesan'], nama);
    assert.deepEqual(Object.keys(r.json.galat.medan), ['minat_rumpun'], `${nama}: ${JSON.stringify(r.json.galat.medan)}`);
    assert.equal(typeof r.json.galat.medan.minat_rumpun, 'string', nama);
    return r.json.galat.kode;
  }

  test('Rumpun tidak valid, tipe salah, dan lebih dari 4 nilai → medan berbentuk sama; tidak ada yang tersimpan', async () => {
    const token = await akun('8');
    const kasus = {
      rumpun_tidak_valid: ['Pertanian'],
      tipe_angka: [1],
      tipe_kosong: [''],
      tipe_objek: [{ nama: 'Kesehatan' }],
      tipe_campur: ['Kesehatan', 2],
      lima_nilai: ['Ekonomi & Bisnis', 'Kesehatan', 'Sosial & Humaniora', 'Teknologi & Rekayasa', 'Pertanian'],
      enam_nilai: ['Ekonomi & Bisnis', 'Kesehatan', 'Sosial & Humaniora', 'Teknologi & Rekayasa', 'A', 'B'],
      ganda: ['Kesehatan', ' Kesehatan '],
    };
    const kode = {};
    for (const [nama, isi] of Object.entries(kasus)) kode[nama] = bentukSeragam(await ubahMinat(token, isi), nama);
    // Kode tetap seperti sebelumnya: nilai di luar daftar rumpun → RUMPUN_TIDAK_SAH; sisanya VALIDASI_GAGAL.
    assert.equal(kode.rumpun_tidak_valid, 'RUMPUN_TIDAK_SAH');
    assert.equal(kode.lima_nilai, 'RUMPUN_TIDAK_SAH');
    for (const n of ['tipe_angka', 'tipe_kosong', 'tipe_objek', 'tipe_campur', 'enam_nilai', 'ganda']) assert.equal(kode[n], 'VALIDASI_GAGAL', n);
    const res = await fetch(`${baseUrl}/api/v1/pengguna/saya`, { headers: { Authorization: `Bearer ${token}` } });
    assert.deepEqual((await res.json()).data.minat_rumpun, []);
  });

  test('Kelas 12 dengan 4 rumpun (lebih dari 3) → bentuk medan yang sama; nilai sah tetap diterima dan dirapikan', async () => {
    const token = await akun('12');
    bentukSeragam(await ubahMinat(token, ['Ekonomi & Bisnis', 'Kesehatan', 'Sosial & Humaniora', 'Teknologi & Rekayasa']), 'kelas 12, 4 rumpun');
    const r = await ubahMinat(token, [' Kesehatan ', 'Teknologi & Rekayasa']);
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.deepEqual(r.json.data.minat_rumpun, ['Kesehatan', 'Teknologi & Rekayasa']);
  });
});
