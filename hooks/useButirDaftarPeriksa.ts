import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { DaftarPeriksaResponse } from '../api/types';

type Filter = {
  kelas?: string;
  jalur?: string;
  /** Rumpun prodi siswa (LANJUT_007). Tanpa rumpun → hanya butir umum. */
  rumpun?: string;
};

/**
 * F5 — GET /konten/checklist?kelas=&jalur= (konten.rute.js baris 91),
 * disaring di level query backend (konten.repo.js `FIND_IN_SET`) — bukan
 * difilter ulang di klien, sesuai kasus uji 6.2 di
 * docs/pengujian-backend-sistem-lanjut.md.
 *
 * `kelas`/`jalur` masuk queryKey supaya React Query menyimpan cache
 * terpisah per kombinasi filter, bukan menimpa hasil filter sebelumnya.
 */
export function useButirDaftarPeriksa(filter: Filter = {}, enabled = true) {
  return useQuery({
    queryKey: ['butir_daftar_periksa', filter.kelas, filter.jalur, filter.rumpun],
    queryFn: () =>
      apiFetch<DaftarPeriksaResponse>('/konten/checklist', {
        query: { kelas: filter.kelas, jalur: filter.jalur, rumpun: filter.rumpun },
      }),
    enabled,
  });
}
