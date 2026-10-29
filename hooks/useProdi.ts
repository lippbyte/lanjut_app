import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { Prodi } from '../api/types';

// F3 — GET /konten/prodi (konten.rute.js baris 40).
export function useProdi() {
  return useQuery({
    queryKey: ['prodi'],
    queryFn: () => apiFetch<Prodi[]>('/konten/prodi'),
  });
}
