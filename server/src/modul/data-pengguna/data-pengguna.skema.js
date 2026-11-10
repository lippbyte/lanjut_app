// Skema hapus akun (LANJUT_009 seri v2).

const { z } = require('zod');

const PENEGASAN_HAPUS_AKUN = 'HAPUS AKUN SAYA';

// Penegasan wajib persis sama, dan identitas ditegaskan dengan tepat satu cara.
const hapusAkunSkema = z
  .object({
    penegasan: z.literal(PENEGASAN_HAPUS_AKUN),
    kata_sandi: z.string().min(1).max(200).optional(),
    kode_email: z.string().regex(/^\d{6}$/).optional(),
  })
  .refine((d) => Boolean(d.kata_sandi) !== Boolean(d.kode_email), {
    message: 'Isi salah satu: kata_sandi atau kode_email.',
    path: ['konfirmasi'],
  });

module.exports = { hapusAkunSkema, PENEGASAN_HAPUS_AKUN };
