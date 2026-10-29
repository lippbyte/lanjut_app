// Skema `POST /sinkron/klaim` — docs/SDD-Backend-Foundation.md §6.3.

const { z } = require('zod');
const { catatanRiwayatSkema } = require('../levelin/levelin.skema');
const { KELAS } = require('../../util/kelas');

const profilKlaimSkema = z.object({
  kelas: z.enum(KELAS).nullable().optional(),
  prodi_impian: z.string().trim().max(64).nullable().optional(),
});

const kemajuanKlaimSkema = z.object({
  butir_id: z.string().trim().min(1).max(64),
  selesai_pada: z.string().trim().min(1).nullable(),
});

const kartuKlaimSkema = z.object({
  id: z.string().trim().min(1).max(64),
  mapel_id: z.string().trim().min(1).max(64),
  judul: z.string().trim().min(1).max(200),
  isi: z.string().trim().min(1).max(5000),
  jawaban: z.string().trim().max(5000).nullable().optional(),
  dibuat_pada: z.string().trim().min(1).optional(),
});

const klaimSkema = z.object({
  profil: profilKlaimSkema.optional(),
  kemajuan: z.array(kemajuanKlaimSkema).max(500).optional(),
  peristiwa: z.array(catatanRiwayatSkema).max(2000).optional(),
  kartu: z.array(kartuKlaimSkema).max(500).optional(),
});

module.exports = { klaimSkema };
