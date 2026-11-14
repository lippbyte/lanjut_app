// Uji aturan "tidak ada lolos diam-diam" (LANJUT_003 seri v2, tests/luar-repo.js). Tanpa basis data.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { SAKLAR, PENANDA_HILANG, PENANDA_DALAM_HILANG, jalurDataKonten, tesLuarRepo, alasanLewati, adaSemua, malas } = require('./luar-repo');

const ADA = __filename;
const HILANG = path.join(os.tmpdir(), `lanjut-luar-repo-tidak-ada-${process.pid}`, 'berkas.md');
const HILANG_DALAM_REPO = jalurDataKonten(`tidak-ada-${process.pid}.json`);
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

// LANJUT_023 langkah 0b: repo di satu drive (mis. D:) dan path hilang di drive lain (mis. folder
// sementara di C:). path.relative lintas drive mengembalikan path absolut, bukan '..\...'.
const DRIVE_LAIN = /^c:/i.test(path.parse(__dirname).root) ? 'Z:\\' : 'C:\\';
const HILANG_DRIVE_LAIN = path.join(DRIVE_LAIN, `lanjut-lintas-drive-tidak-ada-${process.pid}`, 'berkas.md');

test(
  'path hilang di drive lain dari repo: alasan menyebut path apa adanya (lintas drive)',
  { skip: process.platform !== 'win32' && 'huruf drive hanya ada di Windows' },
  () => {
    process.env[SAKLAR] = '1';
    const alasan = alasanLewati(HILANG_DRIVE_LAIN);
    assert.equal(typeof alasan, 'string', 'path di drive lain adalah path luar repo, jadi boleh dilewati');
    assert.ok(alasan.includes(HILANG_DRIVE_LAIN), `alasan harus menyebut ${HILANG_DRIVE_LAIN}, dapat: ${alasan}`);
  }
);

test('bungkusan menjaga opsi tes, bentuk (nama, opsi, fn), dan boleh ditumpuk', () => {
  process.env[SAKLAR] = '1';
  const rekam = rekamTes();
  const dalam = tesLuarRepo(rekam, ADA);
  tesLuarRepo(dalam, HILANG)('contoh', { timeout: 5 }, () => {});
  assert.equal(rekam.opsi.timeout, 5);
  assert.equal(typeof rekam.opsi.skip, 'string', 'lapisan luar yang path-nya hilang tetap melewati tes');
});

test('path di dalam repo hilang: tetap gagal walau saklar menyala, dan tidak dihitung sebagai path luar', () => {
  process.env[SAKLAR] = '1';
  const rekam = rekamTes();
  let jalan = false;
  tesLuarRepo(rekam, HILANG_DALAM_REPO)('contoh', () => {
    jalan = true;
  });
  assert.equal(rekam.opsi.skip, undefined);
  assert.throws(rekam.fn, (galat) => {
    assert.ok(galat.message.includes(PENANDA_DALAM_HILANG));
    assert.ok(!galat.message.includes(PENANDA_HILANG), 'bukan kegagalan karena path luar');
    assert.ok(galat.message.includes(HILANG_DALAM_REPO));
    return true;
  });
  assert.equal(jalan, false);
});

test('path dalam repo dan path luar sama-sama hilang: saklar tidak melewati tes', () => {
  process.env[SAKLAR] = '1';
  assert.equal(alasanLewati(HILANG, HILANG_DALAM_REPO), false);
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

test('data konten dibaca dari server/data-konten, tidak ada tes yang kembali ke MVP-PWA/data (K16)', () => {
  const PENUNJUK_ARSIP = /MVP-PWA['"\s,/\\]+data/;
  const pelanggar = fs
    .readdirSync(__dirname)
    .filter((n) => n.endsWith('.test.js') && n !== path.basename(__filename))
    .filter((n) => PENUNJUK_ARSIP.test(fs.readFileSync(path.join(__dirname, n), 'utf8')));
  assert.deepEqual(pelanggar, []);
  assert.equal(jalurDataKonten('prodi.json'), path.join(__dirname, '..', 'data-konten', 'prodi.json'));
  assert.ok(fs.existsSync(jalurDataKonten('prodi.json')));
});
