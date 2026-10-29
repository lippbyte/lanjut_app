import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { ButirKhususSmk } from '../api/types';

// F2 — GET /konten/khusus-smk (konten.rute.js baris 28).
export function useButirKhususSmk() {
  return useQuery({
    queryKey: ['butir_khusus_smk'],
    queryFn: () => apiFetch<ButirKhususSmk[]>('/konten/khusus-smk'),
  });
}
