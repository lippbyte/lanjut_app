// Skema Ngobrol (LANJUT_051). App mengirim riwayat obrolan sesi ini (yang
// hanya ada di memori app), pesan terakhir = pesan baru dari siswa.

const { z } = require('zod');

const PESAN_MAKS = 30;
// LANJUT_078: 500 karakter (sebelumnya 1000). Teks hasil suara diperlakukan sama.
const PANJANG_PESAN_SISWA = 500;
const PANJANG_BALASAN = 6000;

const pesanSkema = z.object({
  // Hanya dua peran. Pesan galat tidak menggemakan nilai yang dikirim (LANJUT_053).
  peran: z.enum(['pengguna', 'bot'], { errorMap: () => ({ message: 'Peran pesan tidak dikenal.' }) }),
  teks: z.string().trim().min(1, 'Pesan kosong.').max(PANJANG_BALASAN, 'Pesan terlalu panjang.'),
});

const kirimSkema = z.object({
  pesan: z
    .array(pesanSkema)
    .min(1, 'Belum ada pesan.')
    .max(PESAN_MAKS, `Riwayat maksimal ${PESAN_MAKS} pesan.`)
    // zod tetap menjalankan refine walau .min() gagal, jadi array kosong dijaga di sini.
    .refine((p) => p.length > 0 && p[p.length - 1].peran === 'pengguna', 'Pesan terakhir harus dari kamu.')
    .refine(
      (p) => p.every((m) => m.peran !== 'pengguna' || m.teks.length <= PANJANG_PESAN_SISWA),
      `Pesan maksimal ${PANJANG_PESAN_SISWA} karakter.`
    ),
});

module.exports = { kirimSkema, PESAN_MAKS, PANJANG_PESAN_SISWA };
