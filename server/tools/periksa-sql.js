// Gerbang validasi §9.4 docs/SDD-Backend-Foundation.md. Memeriksa:
//   1. Tidak ada kata kunci SQL di luar berkas `*.repo.js` (kecuali
//      `src/db/` — pelari migrasi & benih adalah lapisan infrastruktur
//      skema/seed itu sendiri, bukan kode rute/layanan aplikasi yang
//      disasar aturan "SQL hanya di *.repo.js", §3.6/§9.2).
//   2. Tidak ada `${` di dalam string SQL (larangan penyambungan string, §2.2).
//   3. Setiap query atas tabel PRIBADI memuat `pengguna_id`/`pemilik_id` di
//      klausa WHERE (B-K4, §8.4) — kecuali ditandai jelas sebagai
//      pengecekan kepemilikan itu sendiri (`-- lookup-kepemilikan`).
//
// Dijalankan dengan: node tools/periksa-sql.js  (tanpa dependensi baru).
// Heuristik berbasis regex — cukup untuk gaya SQL proyek ini (ditulis
// langsung, satu pernyataan per pemanggilan), bukan pengurai SQL sungguhan.

const fs = require('fs');
const path = require('path');

const DIR_SRC = path.join(__dirname, '..', 'src');

// Kata kunci SQL, tapi TIDAK match bila didahului "." (metode JS seperti
// `.update(`, `.delete(` — dipakai express-rate-limit/crypto/router, bukan SQL).
const KATA_KUNCI_SQL = /(?<!\.)\b(SELECT|INSERT|UPDATE|DELETE)\b/;

// Direktori yang DIKECUALIKAN dari aturan "SQL hanya di *.repo.js" — ini
// ADALAH lapisan SQL infrastruktur (migrasi & benih), bukan kode rute/layanan.
const DIKECUALIKAN_DARI_ATURAN_1 = [path.join(DIR_SRC, 'db')];

const TABEL_PRIBADI = ['sesi_pengguna', 'kemajuan', 'kartu', 'sesi_latihan', 'riwayat_latihan', 'butir_pribadi', 'persetujuan', 'modul', 'potongan_modul', 'event_sekolah'];

let galatDitemukan = [];

function semuaBerkasJs(dir) {
  const hasil = [];
  for (const entri of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entri.name);
    if (entri.isDirectory()) hasil.push(...semuaBerkasJs(p));
    else if (entri.name.endsWith('.js')) hasil.push(p);
  }
  return hasil;
}

function didalamDirekori(berkas, daftarDir) {
  return daftarDir.some((d) => berkas.startsWith(d + path.sep));
}

function periksaKataKunciDiLuarRepo(berkas) {
  if (berkas.endsWith('.repo.js')) return;
  if (didalamDirekori(berkas, DIKECUALIKAN_DARI_ATURAN_1)) return;

  const isiPerBaris = fs.readFileSync(berkas, 'utf8').split('\n');
  isiPerBaris.forEach((baris, idx) => {
    const tanpaKomentar = baris.replace(/\/\/.*$/, '');
    if (KATA_KUNCI_SQL.test(tanpaKomentar)) {
      galatDitemukan.push(
        `${berkas}:${idx + 1} — kata kunci SQL di luar *.repo.js: "${baris.trim()}"`
      );
    }
  });
}

function periksaPenyambunganString(berkas) {
  if (!berkas.endsWith('.repo.js')) return;
  const isi = fs.readFileSync(berkas, 'utf8');

  const regexTemplate = /`([^`]*)`/gs;
  let cocok;
  while ((cocok = regexTemplate.exec(isi))) {
    const isiTemplate = cocok[1];
    if (KATA_KUNCI_SQL.test(isiTemplate) && /\$\{/.test(isiTemplate)) {
      galatDitemukan.push(
        `${berkas} — template literal SQL memuat \${...} (larangan §2.2 aturan 2): "${isiTemplate
          .slice(0, 80)
          .trim()}..."`
      );
    }
  }
}

function periksaFilterKepemilikan(berkas) {
  if (!berkas.endsWith('.repo.js')) return;
  const isi = fs.readFileSync(berkas, 'utf8');

  for (const tabel of TABEL_PRIBADI) {
    const regexPernyataan = new RegExp(
      `(SELECT|UPDATE|DELETE)[\\s\\S]{0,400}?\\b${tabel}\\b[\\s\\S]{0,400}`,
      'gi'
    );
    let cocok;
    while ((cocok = regexPernyataan.exec(isi))) {
      // Sertakan 300 karakter SEBELUM kata kunci juga, supaya komentar
      // penjelas (`// -- lookup-kepemilikan`, `-- lookup-kepemilikan`) yang
      // ditulis di baris sebelum fungsi/kueri ikut terdeteksi.
      const mulaiKonteks = Math.max(0, cocok.index - 500);
      const potongan = isi.slice(mulaiKonteks, cocok.index + cocok[0].length);

      const adaWhere = /WHERE/i.test(cocok[0]);
      const adaPengguna = /pengguna_id\s*=\s*\?/i.test(cocok[0]);
      const adaPemilik = /pemilik_id\s*=\s*\?/i.test(cocok[0]);
      const dikecualikan = /--\s*lookup-kepemilikan|\/\*\s*lookup-kepemilikan/i.test(potongan);

      if (dikecualikan) continue;
      if (!adaWhere && /^INSERT/i.test(cocok[0])) continue; // INSERT baris baru wajar tanpa WHERE

      if (!(adaPengguna || adaPemilik)) {
        galatDitemukan.push(
          `${berkas} — query atas tabel pribadi "${tabel}" tampaknya tidak memfilter ` +
            'pengguna_id/pemilik_id di WHERE (tandai dengan komentar ' +
            '"-- lookup-kepemilikan" bila memang disengaja).'
        );
      }
    }
  }
}

function jalankan() {
  const berkas = semuaBerkasJs(DIR_SRC);
  for (const b of berkas) {
    periksaKataKunciDiLuarRepo(b);
    periksaPenyambunganString(b);
    periksaFilterKepemilikan(b);
  }

  if (galatDitemukan.length > 0) {
    console.error('[periksa-sql] GAGAL — ditemukan pelanggaran:\n');
    for (const g of galatDitemukan) console.error(' - ' + g);
    console.error(`\nTotal: ${galatDitemukan.length} pelanggaran.`);
    process.exit(1);
  }

  console.log('[periksa-sql] LULUS — tidak ada pelanggaran ditemukan.');
}

jalankan();
