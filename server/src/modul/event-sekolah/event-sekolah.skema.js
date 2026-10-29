// Skema Persiapan Event (LANJUT_076). Batas "paling jauh 2 tahun ke depan"
// bergantung pada tanggal hari ini (WIB), jadi dicek di event-sekolah.layanan.js.

const { z } = require('zod');

// LANJUT_076b (migrasi 021): + PAS dan TKA. Label di app: UAS & PAS = "UAS/PAS",
// Ulangan = "Ulangan Harian". Label itu sendiri BUKAN nilai yang sah.
const JENIS_EVENT = ['UTS', 'UAS', 'PAS', 'Ulangan', 'TKA', 'Lainnya'];
const MAKS_MATERI = 200;

/** YYYY-MM-DD yang benar-benar ada di kalender (2026-02-30 ditolak). */
function tanggalSah(s) {
  const [t, b, h] = s.split('-').map(Number);
  const d = new Date(Date.UTC(t, b - 1, h));
  return d.getUTCFullYear() === t && d.getUTCMonth() === b - 1 && d.getUTCDate() === h;
}

const tanggal = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal harus berformat YYYY-MM-DD.')
  .refine(tanggalSah, 'Tanggal tidak ada di kalender.');

// '' dan spasi saja = kosong (null), supaya mengosongkan isian tidak ditolak.
const kosongJadiNull = (v) => (typeof v === 'string' && v.trim() === '' ? null : v);
const idOpsional = z.preprocess(kosongJadiNull, z.string().trim().min(1).max(64).nullable().optional());
const materi = z.preprocess(
  kosongJadiNull,
  z
    .string()
    .trim()
    .refine((s) => Array.from(s).length <= MAKS_MATERI, `Materi paling panjang ${MAKS_MATERI} karakter.`)
    .nullable()
    .optional()
);

const isian = {
  jenis: z.enum(JENIS_EVENT, { errorMap: () => ({ message: 'Jenis event tidak dikenal.' }) }),
  tanggal,
  mapel_id: idOpsional,
  materi_teks: materi,
  kartu_id: idOpsional,
};

const buatSkema = z.object(isian);

const ubahSkema = z
  .object({ ...isian, jenis: isian.jenis.optional(), tanggal: tanggal.optional() })
  .refine((o) => Object.values(o).some((v) => v !== undefined), 'Tidak ada isian yang diubah.');

module.exports = { buatSkema, ubahSkema, JENIS_EVENT, MAKS_MATERI };
