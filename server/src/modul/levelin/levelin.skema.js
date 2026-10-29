// Skema zod Level-In — bentuk field PERSIS docs/SDD-LevelIn.md §3.2/§3.3,
// hanya pemetaan `waktu` → `dijawab_pada` (§4.6 aturan 4). `kelas_gap` dan
// `gap_numerik` SENGAJA tidak disebut di sini — daftar putih zod membuang
// nilai itu bila klien mengirimnya (§4.6 aturan 2, §4.3 no.2 SDD-LevelIn).

const { z } = require('zod');

const mulaiSesiSkema = z.object({
  id: z.string().trim().min(1).max(36),
  dimulai_pada: z.string().trim().min(1),
  mapel_fokus_id: z.string().trim().max(64).nullable().optional(),
  asal_mula: z.enum(['beranda_saran', 'arsip', 'arsip_detail']),
  jumlah_kartu_direncanakan: z.number().int().positive(),
});

const tutupSesiSkema = z.object({
  selesai_pada: z.string().trim().min(1),
});

const catatanRiwayatSkema = z.object({
  id: z.string().trim().min(1).max(36),
  sesi_id: z.string().trim().max(36).nullable().optional(),
  kartu_id: z.string().trim().max(64).nullable().optional(),
  mapel_id: z.string().trim().max(64).nullable().optional(),
  keyakinan: z.number().int().min(1).max(5).nullable().optional(),
  benar: z.boolean(),
  waktu: z.string().trim().min(1),
  aturan_versi: z.number().int().nullable().optional(),
});

// Body ADALAH larik itu sendiri, persis docs/SDD-LevelIn.md §4.2 ("Body:
// larik catatan §3.3") — bukan dibungkus objek.
const riwayatBorongSkema = z.array(catatanRiwayatSkema).min(1).max(200);

const ringkasanQuerySkema = z.object({
  jendela: z.coerce.number().int().positive().max(200).optional(),
});

module.exports = {
  mulaiSesiSkema,
  tutupSesiSkema,
  riwayatBorongSkema,
  ringkasanQuerySkema,
  catatanRiwayatSkema,
};
