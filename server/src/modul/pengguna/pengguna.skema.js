const { z } = require('zod');
const { KELAS, JENIS_SEKOLAH } = require('../../util/kelas');
const { MAKS_MAPEL_PILIHAN } = require('./mapel-pilihan');

// LANJUT_075 — bidang minat (rumpun) untuk Eksplorasi Kampus. Batas jumlah di
// sini; isinya (harus ada di daftar rumpun prodi) dicek di pengguna.layanan.js.
const MAKS_MINAT_RUMPUN = 5;

// LANJUT_079b — satu butir mapel_pilihan. Diperiksa di tingkat larik (superRefine),
// bukan z.array(idMapel), supaya galat tipe per butir tetap di kunci medan
// `mapel_pilihan` (bukan `mapel_pilihan.0`), sama dengan galat jumlah dan id tak dikenal.
const idMapel = z.string().trim().min(1).max(64);
// LANJUT_080b — satu butir minat_rumpun, diperiksa dengan cara yang sama.
const namaRumpun = z.string().trim().min(1).max(60);

// Kesiapan ujian (pilihan percakapan 15 Okt 2026, belum disetujui PM). Sama persis
// dengan ENUM di migrasi 023 dan KESIAPAN_UJIAN di app lib/kesiapanUjian.ts.
const KESIAPAN_UJIAN = ['belum', 'sebagian', 'hampir', 'siap'];

const ubahProfilSkema = z.object({
  kelas: z.enum(KELAS).nullable().optional(),
  // LANJUT_038 — diselaraskan dengan kelas di util/kelas.js tentukanJenisSekolah.
  jenis_sekolah: z.enum(JENIS_SEKOLAH).nullable().optional(),
  prodi_impian: z.string().trim().max(64).nullable().optional(),
  nama_tampilan: z.string().trim().min(1).max(60).nullable().optional(),
  // LANJUT_032 — null mengosongkan pilihan.
  gaya_belajar: z.enum(['visual', 'auditori', 'kinestetik', 'baca_tulis']).nullable().optional(),
  // [] mengosongkan pilihan. LANJUT_080b: butir diperiksa di tingkat larik (seperti
  // mapel_pilihan, 079b) supaya galat tipe per butir tetap di kunci medan `minat_rumpun`
  // (bukan `minat_rumpun.0`).
  minat_rumpun: z
    .array(z.unknown())
    .max(MAKS_MINAT_RUMPUN, `Bidang minat paling banyak ${MAKS_MINAT_RUMPUN}.`)
    .superRefine((daftar, ctx) => {
      if (!daftar.every((x) => namaRumpun.safeParse(x).success)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Bidang minat harus berisi nama rumpun.' });
      }
    })
    .transform((daftar) => daftar.map((x) => namaRumpun.parse(x)))
    .refine((daftar) => new Set(daftar).size === daftar.length, 'Bidang minat tidak boleh ganda.')
    .optional(),
  // LANJUT_079 — id mapel; [] mengosongkan. Batas 5 untuk SEMUA kelas, hanya di
  // sini. Id harus ada dan (kelas 12) termasuk rumpun favorit: pengguna.layanan.js.
  mapel_pilihan: z
    .array(z.unknown())
    .max(MAKS_MAPEL_PILIHAN, `Mapel pilihan paling banyak ${MAKS_MAPEL_PILIHAN}.`)
    .superRefine((daftar, ctx) => {
      if (!daftar.every((x) => idMapel.safeParse(x).success)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'Mapel pilihan harus berisi id mapel.' });
      }
    })
    .transform((daftar) => daftar.map((x) => idMapel.parse(x)))
    .refine((daftar) => new Set(daftar).size === daftar.length, 'Mapel pilihan tidak boleh ganda.')
    .optional(),
  // null mengosongkan. Gerbang kebijakan privasi di pengguna.layanan.js.
  kesiapan_ujian: z.enum(KESIAPAN_UJIAN).nullable().optional(),
});

module.exports = { ubahProfilSkema, MAKS_MINAT_RUMPUN, KESIAPAN_UJIAN };
