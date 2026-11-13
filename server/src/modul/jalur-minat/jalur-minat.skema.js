// Skema rute Jalur Saya (LANJUT_023 seri v2). Medan yang tidak disebut di sini dibuang zod.

const { z } = require('zod');

const idJalur = z.string().trim().min(1, 'Pilih jalurnya dulu.').max(64);

const pilihJalurSkema = z.object({ jalur_minat_id: idJalur });

// `aktif` sengaja tidak ada: melanjutkan jalur yang dijeda berarti memilihnya lagi (baris baru),
// supaya babak yang sudah berakhir tidak pernah ditimpa.
const akhiriPilihanSkema = z.object({ status: z.enum(['dijeda', 'selesai', 'ditinggalkan']) });

module.exports = { idJalur, pilihJalurSkema, akhiriPilihanSkema };
