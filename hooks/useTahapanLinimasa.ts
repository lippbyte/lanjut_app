import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { TahapanLinimasa } from '../api/types';

// F1 — GET /konten/linimasa (konten.rute.js baris 11).
export function useTahapanLinimasa() {
  return useQuery({
    queryKey: ['tahapan_linimasa'],
    queryFn: () => apiFetch<TahapanLinimasa[]>('/konten/linimasa'),
  });
}
