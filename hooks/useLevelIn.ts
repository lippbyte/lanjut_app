import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { KonfigurasiLevelIn, RingkasanMapel, SaranHarian } from '../api/types';
import { useSesi } from '../providers/AuthProvider';

// Data milik akun: AuthProvider membuang kunci 'levelin' saat keluar/ganti akun.
export const KUNCI_LEVELIN = ['levelin'] as const;

/** Level-In (LANJUT_058) — GET /kalibrasi/ringkasan: satu baris per mapel, dihitung server. */
export function useRingkasanLevelIn() {
  const { token } = useSesi();
  return useQuery({
    queryKey: [...KUNCI_LEVELIN, 'ringkasan'],
    queryFn: () => apiFetch<RingkasanMapel[]>('/kalibrasi/ringkasan', { token: token! }),
    enabled: !!token,
  });
}

/** GET /saran-harian — { jenis, mapel_id, alasan }. */
export function useSaranHarian() {
  const { token } = useSesi();
  return useQuery({
    queryKey: [...KUNCI_LEVELIN, 'saran'],
    queryFn: () => apiFetch<SaranHarian>('/saran-harian', { token: token! }),
    enabled: !!token,
  });
}

/** GET /konfigurasi/levelin (publik) — ambang Level-In, supaya angka tidak ditulis di app. */
export function useKonfigLevelIn() {
  return useQuery({
    queryKey: ['konfigurasi_levelin'],
    queryFn: () => apiFetch<KonfigurasiLevelIn>('/konfigurasi/levelin'),
    staleTime: 60 * 60 * 1000,
  });
}
