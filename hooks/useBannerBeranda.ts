import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { ResponsBanner } from '../api/types';

// LANJUT_073 — GET /konten/banner (publik, tanpa login). Gagal → seksi banner
// tidak tampil sama sekali, tanpa pesan galat (lihat LinimasaScreen).
export function useBannerBeranda() {
  return useQuery({
    queryKey: ['banner_beranda'],
    queryFn: () => apiFetch<ResponsBanner>('/konten/banner'),
  });
}
