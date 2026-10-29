// Skema zod persetujuan (LANJUT_047). Daftar putih: siswa hanya mengirim
// jenis dan versi. Status, sumber, catatan, dan waktu ditentukan server —
// medan lain dibuang sebelum sampai ke layanan (§8.3), jadi akun siswa tidak
// bisa menulis sumber 'surat_sekolah' atau status apa pun.

const { z } = require('zod');

const versiKebijakan = z.number().int().min(1).max(65535);

// `ortu_wali` sengaja DITERIMA skema supaya ditolak tegas oleh layanan
// (403 TIDAK_BERHAK), bukan lolos sebagai galat validasi yang samar.
const catatSkema = z.object({
  jenis: z.enum(['kebijakan_privasi', 'ortu_wali']),
  versi: versiKebijakan,
});

// Konfirmasi orang tua/wali di app: harus pernyataan eksplisit (`pernyataan: true`).
const ortuWaliSkema = z.object({
  versi: versiKebijakan,
  pernyataan: z.literal(true),
});

module.exports = { catatSkema, ortuWaliSkema, versiKebijakan };
