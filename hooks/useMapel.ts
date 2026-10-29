import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { Mapel } from '../api/types';

// F3 — GET /konten/mapel (konten.rute.js baris 52).
export function useMapel() {
  return useQuery({
    queryKey: ['mapel'],
    queryFn: () => apiFetch<Mapel[]>('/konten/mapel'),
  });
}
