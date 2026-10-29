// Ringkasan pemakaian AI harian (LANJUT_060) untuk pemantauan pilot. HANYA
// MEMBACA tabel pemakaian_ai_harian (hitungan gabungan per tanggal WIB, tanpa
// id akun dan tanpa isi) dan tarif di konfigurasi.
//
// Pemakaian (dari folder LANJUT_App/server):
//   npm run pemakaian-ai              → 7 hari terakhir (termasuk hari ini)
//   npm run pemakaian-ai -- --hari=30
//
// Perkiraan biaya hanya dihitung bila ai_tarif_masuk_per_juta DAN
// ai_tarif_keluar_per_juta terisi angka (US$ per sejuta token). Ini perkiraan
// dari jumlah token; tagihan sebenarnya ada di dasbor OpenRouter.

const repo = require('../src/modul/ngobrol/pemakaian.repo');
const { tanggalWib } = require('../src/util/waktu');

const JUDUL = {
  tanggal: 'Tanggal',
  panggilan_ai: 'Panggilan',
  token_masuk: 'Token masuk',
  token_keluar: 'Token keluar',
  balasan_stub: 'Uji coba',
  tanda_akut: 'Akut',
  tanda_ringan: 'Ringan',
  tanda_model: 'Model',
  galat_penyedia: 'Galat',
  web_dipakai: 'Web',
  web_kuota_habis: 'Web habis',
  modul_dipakai: 'Modul',
};
const KOLOM_ANGKA = Object.keys(JUDUL).filter((k) => k !== 'tanggal');

/** Tarif teks → angka ≥ 0, atau null bila kosong/tidak sah. */
function tarifAngka(nilai) {
  const s = String(nilai ?? '').trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

/** Biaya US$ dari token, atau null bila salah satu tarif tidak ada. */
function biaya(baris, tarif) {
  if (tarif.masuk === null || tarif.keluar === null) return null;
  return (Number(baris.token_masuk) / 1e6) * tarif.masuk + (Number(baris.token_keluar) / 1e6) * tarif.keluar;
}

/**
 * Teks laporan dari baris tabel. Murni (tanpa basis data), supaya bisa diuji.
 * `tarif` = { ai_tarif_masuk_per_juta, ai_tarif_keluar_per_juta } apa adanya.
 */
function susunLaporan(baris, tarifMentah, { hari, dari, sampai }) {
  const tarif = { masuk: tarifAngka(tarifMentah.ai_tarif_masuk_per_juta), keluar: tarifAngka(tarifMentah.ai_tarif_keluar_per_juta) };
  const adaBiaya = tarif.masuk !== null && tarif.keluar !== null;
  const total = Object.fromEntries(KOLOM_ANGKA.map((k) => [k, baris.reduce((s, b) => s + Number(b[k] || 0), 0)]));
  const kolom = ['tanggal', ...KOLOM_ANGKA, ...(adaBiaya ? ['biaya'] : [])];
  const judul = { ...JUDUL, biaya: 'Biaya (US$)' };
  const sel = (b, k) => (k === 'biaya' ? biaya(b, tarif).toFixed(4) : String(k === 'tanggal' ? b.tanggal : Number(b[k] || 0)));
  const isi = [...baris, { tanggal: 'Jumlah', ...total }];
  const lebar = Object.fromEntries(kolom.map((k) => [k, Math.max(judul[k].length, ...isi.map((b) => sel(b, k).length))]));
  const garis = (b) => kolom.map((k) => (k === 'tanggal' ? sel(b, k).padEnd(lebar[k]) : sel(b, k).padStart(lebar[k]))).join('  ');
  const keluaran = [
    `Pemakaian AI ${hari} hari (${dari} s.d. ${sampai}, WIB). Hitungan gabungan semua akun, tanpa id akun dan tanpa isi.`,
    '',
    kolom.map((k) => (k === 'tanggal' ? judul[k].padEnd(lebar[k]) : judul[k].padStart(lebar[k]))).join('  '),
  ];
  if (baris.length) {
    for (const b of baris) keluaran.push(garis(b));
    keluaran.push('-'.repeat(keluaran[2].length), garis(isi[isi.length - 1]));
  } else {
    keluaran.push('(belum ada pemakaian di rentang ini)');
  }
  keluaran.push('');
  keluaran.push(
    adaBiaya
      ? `Perkiraan biaya: US$${biaya(total, tarif).toFixed(4)} (tarif masuk US$${tarif.masuk}/juta, keluar US$${tarif.keluar}/juta token). Tagihan sebenarnya: dasbor OpenRouter.`
      : 'Perkiraan biaya: tidak dihitung (isi ai_tarif_masuk_per_juta dan ai_tarif_keluar_per_juta di konfigurasi).'
  );
  keluaran.push('Kolom: Panggilan = permintaan ke penyedia yang berhasil (jawaban + web); Uji coba = balasan saat ai_aktif = 0; Akut/Ringan/Model = tanda bahaya; Galat = permintaan ke penyedia yang gagal; Web habis = kuota web akun habis; Modul = jawaban yang memakai potongan modul.');
  return keluaran.join('\n');
}

function bacaArgumen(argv) {
  let hari = 7;
  for (const a of argv) {
    const m = /^--hari=(\d+)$/.exec(a);
    if (m) hari = Number(m[1]);
    else throw new Error(`Argumen "${a}" tidak dikenal. Pilihan: --hari=<1–366>`);
  }
  if (!Number.isInteger(hari) || hari < 1 || hari > 366) throw new Error('--hari harus 1–366.');
  return { hari };
}

async function jalankan(argv) {
  const { hari } = bacaArgumen(argv);
  const sampai = tanggalWib();
  const dari = tanggalWib(Date.now() - (hari - 1) * 24 * 3600 * 1000);
  const [baris, tarif] = await Promise.all([repo.pemakaianSejak(dari), repo.ambilTarif()]);
  return susunLaporan(baris, tarif, { hari, dari, sampai });
}

if (require.main === module) {
  jalankan(process.argv.slice(2))
    .then((teks) => console.log(teks))
    .catch((galat) => {
      console.error(`[pemakaian-ai] ${galat.message}`);
      process.exitCode = 1;
    })
    .finally(() => require('../src/db/koneksi').end());
}

module.exports = { susunLaporan, bacaArgumen, jalankan, tarifAngka };
