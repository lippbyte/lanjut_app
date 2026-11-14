// Skema rute Tujuan Saya (LANJUT_023 seri v2). Medan yang tidak disebut di sini dibuang zod,
// jadi klien tidak bisa mengisi status, diubah_dari_id, maupun pengguna_id.

const { z } = require('zod');
const { POLA_UUID } = require('../butir-bukti/butir-bukti.skema');
const { idJalur } = require('../jalur-minat/jalur-minat.skema');

function tanggalSah(nilai) {
  const d = new Date(`${nilai}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === nilai;
}

/** Isian kosong disimpan sebagai NULL. */
const kosongJadiNull = (nilai) => (nilai === '' ? null : nilai);
const adaPerubahan = [(d) => Object.values(d).some((v) => v !== undefined), { message: 'Tidak ada perubahan.', path: ['_'] }];

const BATAS_TUJUAN = { judul: 200, uraian: 2000 };

const medanTujuan = {
  judul: z.string().trim().min(1, 'Judul wajib diisi.').max(BATAS_TUJUAN.judul),
  uraian: z.string().trim().max(BATAS_TUJUAN.uraian).transform(kosongJadiNull).nullable().optional(),
  target_pada: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tanggal tidak valid.').refine(tanggalSah, 'Tanggal tidak valid.').nullable().optional(),
  jalur_minat_id: idJalur.nullable().optional(),
};

const buatTujuanSkema = z.object(medanTujuan);

/** Versi baru: medan yang tidak dikirim disalin dari versi sebelumnya, `null` mengosongkan. */
const versiTujuanSkema = z.object({ ...medanTujuan, judul: medanTujuan.judul.optional() }).refine(...adaPerubahan);

const akhiriTujuanSkema = z.object({ status: z.enum(['tercapai', 'ditinggalkan']) });

const kaitanBuktiSkema = z
  .object({
    jalur_minat_id: idJalur.nullable().optional(),
    tujuan_id: z.string().regex(POLA_UUID, 'Tujuan tidak ditemukan.').nullable().optional(),
  })
  .refine(...adaPerubahan);

module.exports = { buatTujuanSkema, versiTujuanSkema, akhiriTujuanSkema, kaitanBuktiSkema, BATAS_TUJUAN };
