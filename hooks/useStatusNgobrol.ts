import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { StatusNgobrol } from '../api/types';
import { useSesi } from '../providers/AuthProvider';

/**
 * LANJUT_078 — GET /ngobrol/status: { ai_aktif }. Dipakai HANYA untuk teks yang khusus
 * AI aktif (petunjuk & catatan konteks). Memuat atau gagal → dianggap tidak aktif, jadi
 * saat saklar mati layar Ngobrol tetap seperti sebelumnya. Boleh-tidaknya AI dipakai
 * tetap diputuskan server di POST /ngobrol.
 */
export function useStatusNgobrol(aktif: boolean) {
  const { token } = useSesi();
  return useQuery({
    queryKey: ['ngobrol_status'],
    queryFn: () => apiFetch<StatusNgobrol>('/ngobrol/status', { token: token! }),
    enabled: !!token && aktif,
    staleTime: 60 * 1000,
  });
}
