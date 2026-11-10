// Aturan tes yang membaca path di luar folder LANJUT_App (LANJUT_003 seri v2, lihat
// docs/audit-tes-luar-repo.md). Tidak boleh ada tes yang lolos diam-diam:
//   - path luar tidak ada → tes GAGAL dengan pesan yang menyebut path dan cara memperbaikinya;
//   - path luar tidak ada dan LEWATI_TES_LUAR_REPO=1 → tes ditandai DILEWATI (bukan lolos),
//     dan pelapor-ringkasan.js menampilkan jumlah serta alasannya di akhir `npm test`.
// Path luar yang ada selalu diuji, walau saklarnya menyala.
// Path di dalam LANJUT_App (folder data konten, LANJUT_005 seri v2) juga gagal bersuara bila
// hilang, tetapi tidak pernah dilewati: saklar hanya berlaku untuk path di luar repo.

const fs = require('fs');
const path = require('path');

const AKAR_APP = path.join(__dirname, '..', '..');
const AKAR_INDUK = path.join(AKAR_APP, '..');
const SAKLAR = 'LEWATI_TES_LUAR_REPO';
const PENANDA_HILANG = '[PATH LUAR REPO HILANG]';
const PENANDA_DALAM_HILANG = '[PATH DALAM REPO HILANG]';

const jalurInduk = (...bagian) => path.join(AKAR_INDUK, ...bagian);
const SALINAN_TEKS = jalurInduk('docs', 'salinan-teks-lanjut.md');
const LEMBAR_TEKS = jalurInduk('docs', 'lembar-review-draf-teks.md');

// Sumber data konten (K16): ada di repo ini, jadi tes data konten tidak butuh repo induk.
const jalurDataKonten = (berkas) => path.join(__dirname, '..', 'data-konten', berkas);

const saklarMenyala = () => process.env[SAKLAR] === '1';
const yangHilang = (jalur) => jalur.filter((p) => !fs.existsSync(p));
const adaSemua = (...jalur) => yangHilang(jalur).length === 0;

function diDalamRepo(p) {
  const relatif = path.relative(AKAR_APP, p);
  return !relatif.startsWith('..') && !path.isAbsolute(relatif);
}

/** Path relatif terhadap repo induk bila ada di dalamnya, supaya alasan lewat bisa dikelompokkan. */
function tampil(p) {
  const relatif = path.relative(AKAR_INDUK, p);
  return relatif.startsWith('..') ? p : relatif.replace(/\\/g, '/');
}

/**
 * Node mencatat lokasi tes di berkas yang memanggil `test`, yaitu berkas ini. Nama berkas
 * tes sebenarnya diambil dari tumpukan panggilan, supaya pesan dan ringkasan tetap menyebutnya.
 */
function berkasPemanggil() {
  const baris = new Error().stack.split('\n').find((b) => /\.test\.js/.test(b));
  const cocok = baris && /([^\\/(\s]+\.test\.js)/.exec(baris);
  return cocok ? cocok[1] : 'berkas tes tidak diketahui';
}

function pesanHilang(hilang, berkas = berkasPemanggil()) {
  if (hilang.every(diDalamRepo)) {
    return [
      `${PENANDA_DALAM_HILANG} ${berkas}: tes ini membaca path di dalam folder LANJUT_App, dan path ini tidak ada:`,
      ...hilang.map((p) => `  - ${p}`),
      `Cara memperbaiki: pulihkan path itu dari git. ${SAKLAR} tidak berlaku untuk path di dalam repo.`,
    ].join('\n');
  }
  return [
    `${PENANDA_HILANG} ${berkas}: tes ini membaca path di luar folder LANJUT_App, dan path ini tidak ada:`,
    ...hilang.map((p) => `  - ${p}`),
    'Cara memperbaiki: jalankan tes dari salinan repo induk lippbyte/lanjut-app, tempat LANJUT_App berdampingan dengan MVP-PWA, docs, landing, diagrams, dan assets.',
    'Bila path itu berasal dari LOKASI_DATA_KONTEN, periksa nilainya.',
    `Bila sengaja ingin melewatinya, setel ${SAKLAR}=1. Tes akan ditandai dilewati, bukan lolos.`,
  ].join('\n');
}

function pastikanDi(berkas, jalur) {
  const hilang = yangHilang(jalur);
  if (hilang.length > 0) throw new Error(pesanHilang(hilang, berkas));
}

const pastikanAda = (...jalur) => pastikanDi(berkasPemanggil(), jalur);

/** Teks alasan untuk opsi `skip`, atau false bila tes harus tetap berjalan. */
function alasanLewati(...jalur) {
  if (!saklarMenyala()) return false;
  const hilang = yangHilang(jalur);
  if (hilang.length === 0 || hilang.some(diDalamRepo)) return false;
  return `${SAKLAR}=1: ${hilang.map(tampil).join(', ')} tidak ada`;
}

/**
 * Membungkus `test` dari node:test untuk tes yang bergantung pada `jalur`.
 * Tanda tangannya sama: (nama, fn) atau (nama, opsi, fn). Bungkusan boleh ditumpuk.
 */
function tesLuarRepo(fnTes, ...jalur) {
  return (nama, opsiAtauFn, fnBila3Argumen) => {
    const [opsi, fn] = typeof opsiAtauFn === 'function' ? [{}, opsiAtauFn] : [opsiAtauFn, fnBila3Argumen];
    const berkas = berkasPemanggil();
    const alasan = alasanLewati(...jalur);
    if (alasan) return fnTes(nama, { ...opsi, skip: `${alasan} [${berkas}]` }, fn);
    return fnTes(nama, opsi, (...arg) => {
      pastikanDi(berkas, jalur);
      return fn(...arg);
    });
  };
}

/** Menunda pembacaan berkas luar sampai tes berjalan, supaya berkas uji tetap bisa dimuat tanpa path itu. */
function malas(buat) {
  let sudah = false;
  let nilai;
  return () => {
    if (!sudah) {
      nilai = buat();
      sudah = true;
    }
    return nilai;
  };
}

module.exports = {
  SAKLAR,
  PENANDA_HILANG,
  PENANDA_DALAM_HILANG,
  SALINAN_TEKS,
  LEMBAR_TEKS,
  jalurInduk,
  jalurDataKonten,
  adaSemua,
  pastikanAda,
  alasanLewati,
  tesLuarRepo,
  malas,
};
