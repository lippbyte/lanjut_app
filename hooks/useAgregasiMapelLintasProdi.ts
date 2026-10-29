import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { MapelAgregasiLintasProdi } from '../api/types';
import type { MapelAgregat } from '../lib/pilihMapel';

// F3 — jalur "belum tahu prodi": berapa prodi yang membutuhkan tiap mapel,
// dihitung backend dalam satu query (konten.repo.js `ambilAgregasiMapelLintasProdi`).
export function useAgregasiMapelLintasProdi() {
  return useQuery({
    queryKey: ['agregasi_mapel_lintas_prodi'],
    queryFn: async () => {
      const baris = await apiFetch<MapelAgregasiLintasProdi[]>(
        '/konten/mapel/agregasi-lintas-prodi'
      );
      return baris.map(
        (b): MapelAgregat => ({
          id: b.id,
          nama: b.nama,
          tersedia_di_smk: b.tersedia_di_smk,
          jumlahProdi: b.jumlah_prodi,
        })
      );
    },
  });
}
