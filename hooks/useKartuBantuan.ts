import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { KartuBantuan } from '../api/types';
import { useSesi } from '../providers/AuthProvider';

/**
 * LANJUT_053 — kartu layanan bantuan untuk panel "Butuh bicara dengan orang?".
 * Isinya dibuat server dari server/config/kartu-bantuan.json (hanya layanan
 * terverifikasi), bukan ditulis AI. Bukan data akun, jadi boleh disimpan lama.
 */
export function useKartuBantuan(aktif: boolean) {
  const { token } = useSesi();
  return useQuery({
    queryKey: ['kartu-bantuan'],
    queryFn: () => apiFetch<KartuBantuan>('/ngobrol/kartu-bantuan', { token: token! }),
    enabled: !!token && aktif,
    staleTime: 60 * 60 * 1000,
  });
}
