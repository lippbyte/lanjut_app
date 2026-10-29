// Data kebijakan privasi untuk landing page (LANJUT_083, diubah LANJUT_083b).
//
// Teks kebijakan tetap hanya ada di SATU tempat: LANJUT_App/lib/kebijakan-privasi.json
// (sama dengan app dan docs/kebijakan-privasi-DRAF.md). Sejak LANJUT_083b landing dibangun
// dengan Vite + React, jadi alat ini tidak lagi menulis HTML: ia menyalin bagian yang
// ditampilkan (status, versi, ringkasan, isi) ke landing/src/data/kebijakan-privasi.json, dan
// halaman React landing/src/halaman/KebijakanPrivasi.tsx merendernya dengan susunan yang sama
// dengan halaman 083. Salinan (bukan impor langsung) supaya folder landing bisa dibangun
// sendiri. tests/landing.test.js menolak bila salinannya basi.
//
// Pemakaian (dari folder LANJUT_App/server):
//   npm run landing-kebijakan              → tulis ulang landing/src/data/kebijakan-privasi.json
//   npm run landing-kebijakan -- --periksa → hanya periksa, keluar 1 bila basi
// Sesudah menulis ulang, bangun ulang landing (cd landing && npm run build).

const fs = require('fs');
const path = require('path');

const AKAR = path.join(__dirname, '..', '..', '..');
const SUMBER = path.join(AKAR, 'LANJUT_App', 'lib', 'kebijakan-privasi.json');
const DATA = path.join(AKAR, 'landing', 'src', 'data', 'kebijakan-privasi.json');

const bacaSumber = () => JSON.parse(fs.readFileSync(SUMBER, 'utf8'));

/** Isi berkas data landing: hanya bagian yang tampil, urutan apa adanya. */
function hasilkan() {
  const { status, versi, ringkasan, isi } = bacaSumber();
  return `${JSON.stringify({ status, versi, ringkasan, isi }, null, 2)}\n`;
}

if (require.main === module) {
  const isi = hasilkan();
  if (process.argv.includes('--periksa')) {
    const ada = fs.existsSync(DATA) ? fs.readFileSync(DATA, 'utf8').replace(/\r\n/g, '\n') : null;
    if (ada !== isi) {
      console.error('[landing-kebijakan] landing/src/data/kebijakan-privasi.json basi. Jalankan: npm run landing-kebijakan');
      process.exit(1);
    }
    console.log('[landing-kebijakan] sesuai dengan lib/kebijakan-privasi.json.');
  } else {
    fs.mkdirSync(path.dirname(DATA), { recursive: true });
    fs.writeFileSync(DATA, isi, 'utf8');
    console.log('[landing-kebijakan] ditulis: landing/src/data/kebijakan-privasi.json');
  }
}

module.exports = { hasilkan, DATA, SUMBER };
