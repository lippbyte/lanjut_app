// Skema zod butir pribadi. Daftar putih: klien hanya mengirim jenis, prodi,
// dan (untuk mapel_tka) mapel saran. Judul, pemilik, dan waktu ditentukan
// server — medan lain dibuang sebelum sampai ke layanan (§8.3).

const { z } = require('zod');

const prodiId = z.string().trim().min(1).max(64);

const simpanSkema = z.discriminatedUnion('jenis', [
  z.object({
    jenis: z.literal('mapel_tka'),
    prodi_id: prodiId,
    // Saran Pilih Mapel = dua mapel berbobot tertinggi; satu kalau prodi
    // hanya punya satu mapel pendukung.
    mapel_ids: z
      .array(z.string().trim().min(1).max(64))
      .min(1)
      .max(2)
      .refine((ids) => new Set(ids).size === ids.length, 'Mapel tidak boleh kembar.'),
  }),
  z.object({
    jenis: z.literal('riset_kampus'),
    prodi_id: prodiId,
  }),
]);

module.exports = { simpanSkema };
