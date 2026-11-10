// Uji aturan "tidak ada lolos diam-diam" (LANJUT_003 seri v2, tests/luar-repo.js). Tanpa basis data.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { SAKLAR, PENANDA_HILANG, tesLuarRepo, alasanLewati, adaSemua, malas } = require('./luar-repo');

const ADA = __filename;
const HILANG = path.join(os.tmpdir(), `lanjut-luar-repo-tidak-ada-${process.pid}`, 'berkas.md');
const saklarAwal = process.env[SAKLAR];

afterEach(() => {
  if (saklarAwal === undefined) delete process.env[SAKLAR];
  else process.env[SAKLAR] = saklarAwal;
});

/** Pengganti `test` dari node:test: menyimpan argumen, tanpa menjalankan apa pun. */
function rekamTes() {
  const rekam = (nama, opsi, fn) => {
    rekam.nama = nama;
    rekam.opsi = opsi;
    rekam.fn = fn;
  };
  return rekam;
}

test('path hilang tanpa saklar: tes tidak dilewati dan gagal menyebut path serta cara memperbaikinya', () => {
  delete process.env[SAKLAR];
  const rekam = rekamTes();
  let jalan = false;
  tesLuarRepo(rekam, HILANG)('contoh', () => {
    jalan = true;
  });
  assert.equal(rekam.opsi.skip, undefined);
  assert.throws(rekam.fn, (galat) => {
    assert.ok(galat.message.includes(PENANDA_HILANG));
    assert.ok(galat.message.includes(HILANG), 'pesan harus menyebut path yang dicari');
    assert.ok(galat.message.includes('Cara memperbaiki'));
    assert.ok(galat.message.includes(SAKLAR));
    return true;
  });
  assert.equal(jalan, false, 'badan tes tidak boleh berjalan tanpa path-nya');
});

test('path hilang dengan saklar: tes ditandai dilewati dengan alasan yang menyebut path', () => {
  process.env[SAKLAR] = '1';
  const rekam = rekamTes();
  tesLuarRepo(rekam, HILANG)('contoh', () => {});
  assert.equal(typeof rekam.opsi.skip, 'string');
  assert.ok(rekam.opsi.skip.includes(SAKLAR));
  assert.ok(rekam.opsi.skip.includes(HILANG));
});

test('path ada dengan saklar: tes tetap berjalan, tidak dilewati', async () => {
  process.env[SAKLAR] = '1';
  const rekam = rekamTes();
  tesLuarRepo(rekam, ADA)('contoh', async () => 'hasil');
  assert.equal(rekam.opsi.skip, undefined);
  assert.equal(await rekam.fn(), 'hasil');
});

test('hanya nilai 1 yang menyalakan saklar', () => {
  for (const nilai of ['0', 'true', '']) {
    process.env[SAKLAR] = nilai;
    assert.equal(alasanLewati(HILANG), false, `nilai "${nilai}"`);
  }
});

test('satu path hilang dari beberapa sudah cukup, dan alasannya hanya menyebut yang hilang', () => {
  process.env[SAKLAR] = '1';
  const alasan = alasanLewati(ADA, HILANG);
  assert.ok(alasan.includes(HILANG));
  assert.ok(!alasan.includes(ADA));
  assert.equal(adaSemua(ADA, HILANG), false);
  assert.equal(adaSemua(ADA), true);
});

test('bungkusan menjaga opsi tes, bentuk (nama, opsi, fn), dan boleh ditumpuk', () => {
  process.env[SAKLAR] = '1';
  const rekam = rekamTes();
  const dalam = tesLuarRepo(rekam, ADA);
  tesLuarRepo(dalam, HILANG)('contoh', { timeout: 5 }, () => {});
  assert.equal(rekam.opsi.timeout, 5);
  assert.equal(typeof rekam.opsi.skip, 'string', 'lapisan luar yang path-nya hilang tetap melewati tes');
});

test('malas: membaca sekali dan hanya saat dipanggil', () => {
  let panggil = 0;
  const nilai = malas(() => {
    panggil += 1;
    return 'isi';
  });
  assert.equal(panggil, 0);
  assert.equal(nilai(), 'isi');
  assert.equal(nilai(), 'isi');
  assert.equal(panggil, 1);
});

test('setiap berkas tes yang menunjuk ke luar LANJUT_App memakai aturan luar-repo.js', () => {
  const PENUNJUK = [/'\.\.',\s*'\.\.',\s*'\.\.'/, /\.\.\/\.\.\/\.\.\//, /path\.join\(AKAR_APP, '\.\.'\)/, /'MVP-PWA'/];
  const pelanggar = fs
    .readdirSync(__dirname)
    .filter((n) => n.endsWith('.test.js') && n !== path.basename(__filename))
    .filter((n) => {
      const isi = fs.readFileSync(path.join(__dirname, n), 'utf8');
      return PENUNJUK.some((p) => p.test(isi)) && !isi.includes("require('./luar-repo')");
    });
  assert.deepEqual(pelanggar, []);
});
