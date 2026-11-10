// Skema rute butir bukti (LANJUT_010 seri v2). Medan yang tidak disebut di sini dibuang zod,
// jadi klien tidak bisa mengisi visibilitas (selalu privat, K18) maupun rujukan_jenis/rujukan_id.

const { z } = require('zod');

const POLA_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

function tautanSah(nilai) {
  try {
    const url = new URL(nilai);
    return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
  } catch {
    return false;
  }
}

function tanggalSah(nilai) {
  const d = new Date(`${nilai}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === nilai;
}

/** Isian kosong disimpan sebagai NULL. */
const kosongJadiNull = (nilai) => (nilai === '' ? null : nilai);

const medanButir = {
  judul: z.string().trim().min(1, 'Judul wajib diisi.').max(200),
  uraian: z.string().trim().max(5000).transform(kosongJadiNull).nullable().optional(),
  tautan: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === '' || tautanSah(v), 'Tautan harus diawali http:// atau https://.')
    .transform(kosongJadiNull)
    .nullable()
    .optional(),
  jenis: z.enum(['karya', 'proses', 'refleksi']),
  tanggal_karya: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(tanggalSah, 'Tanggal tidak valid.').nullable().optional(),
  jalur_minat_id: z.string().trim().min(1).max(64).nullable().optional(),
  tujuan_id: z.string().regex(POLA_UUID, 'Tujuan tidak ditemukan.').nullable().optional(),
};

const buatButirSkema = z.object(medanButir);

const ubahButirSkema = z
  .object({ ...medanButir, judul: medanButir.judul.optional(), jenis: medanButir.jenis.optional() })
  .refine((d) => Object.values(d).some((v) => v !== undefined), { message: 'Tidak ada perubahan.', path: ['_'] });

module.exports = { buatButirSkema, ubahButirSkema, POLA_UUID };
