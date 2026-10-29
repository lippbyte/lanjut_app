// Skema zod kartu. Daftar putih: `sumber`/`pemilik_id` yang dikirim klien
// TIDAK disebut di sini, jadi dibuang otomatis sebelum sampai ke layanan
// (§4.5, §8.3) — server yang memaksa nilainya, bukan memvalidasinya.

const { z } = require('zod');

const daftarSkema = z.object({
  mapel: z.string().trim().max(64).optional(),
  sumber: z.enum(['resmi', 'pengguna', 'mitra']).optional(),
});

const buatKartuSkema = z.object({
  mapel_id: z.string().trim().min(1).max(64),
  judul: z.string().trim().min(1).max(200),
  isi: z.string().trim().min(1).max(5000),
  jawaban: z.string().trim().max(5000).optional(),
});

// LANJUT_039: mapel_id boleh diubah (kategori kartu = mapel, tabel `mapel`).
const perbaruiKartuSkema = z.object({
  mapel_id: z.string().trim().min(1).max(64).optional(),
  judul: z.string().trim().min(1).max(200).optional(),
  isi: z.string().trim().min(1).max(5000).optional(),
  jawaban: z.string().trim().max(5000).nullable().optional(),
});

module.exports = { daftarSkema, buatKartuSkema, perbaruiKartuSkema };
