// Pencatat pemakaian AI harian (LANJUT_060) untuk pemantauan pilot.
//
// - Hanya hitungan gabungan per tanggal WIB: tanpa id akun, tanpa isi pesan,
//   tanpa kueri (lihat migrasi 018).
// - TIDAK pernah memperlambat atau menggagalkan jawaban: catat() dijalankan
//   sesudah pemanggil selesai (tidak ditunggu), dan galat penulisan hanya
//   dicatat di log tanpa isi.
// - selesai() menunggu semua penulisan yang masih berjalan (untuk tes dan skrip).

const repo = require('./pemakaian.repo');
const { tanggalWib } = require('../../util/waktu');

const tertunda = new Set();

/** Bilangan bulat ≥ 0; selain itu 0 (mis. usage tidak ada di respons penyedia). */
const bulatAman = (n) => {
  const x = Number(n);
  return Number.isFinite(x) && x > 0 ? Math.round(x) : 0;
};

/**
 * Tambah hitungan hari ini, mis. catat({ panggilan_ai: 1, token_masuk: 120 }).
 * Kunci yang tidak dikenal diabaikan. Mengembalikan janji yang TIDAK pernah ditolak.
 */
function catat(tambahan = {}) {
  const nilai = repo.KOLOM.map((k) => bulatAman(tambahan[k]));
  if (nilai.every((n) => n === 0)) return Promise.resolve();
  const tanggal = tanggalWib();
  const janji = Promise.resolve()
    .then(() => repo.tambahPemakaian(tanggal, nilai))
    .catch((e) => console.error(`[pemakaian] gagal dicatat (${(e && (e.code || e.name)) || 'galat'})`))
    .finally(() => tertunda.delete(janji));
  tertunda.add(janji);
  return janji;
}

/** Tunggu semua pencatatan yang masih berjalan. */
const selesai = () => Promise.all([...tertunda]);

module.exports = { catat, selesai, bulatAman };
