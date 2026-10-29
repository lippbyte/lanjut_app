import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { CeritaAlumni } from '../api/types';

// F4 — GET /konten/cerita-alumni (konten.rute.js baris 79), sudah disaring
// server-side ke izin_tayang=1 AND tayang=1 (konten.repo.js `ambilCeritaAlumniTayang`).
export function useCeritaAlumni() {
  return useQuery({
    queryKey: ['cerita_alumni'],
    queryFn: () => apiFetch<CeritaAlumni[]>('/konten/cerita-alumni'),
  });
}
