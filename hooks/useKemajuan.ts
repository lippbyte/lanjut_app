import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { Kemajuan } from '../api/types';
import { useSesi } from '../providers/AuthProvider';

const KUNCI = ['kemajuan'] as const;

// F5 — centang Daftar Periksa milik akun (kemajuan.rute.js, dijaga wajibLogin).
export function useKemajuan() {
  const { token } = useSesi();
  return useQuery({
    queryKey: KUNCI,
    queryFn: () => apiFetch<Kemajuan[]>('/kemajuan', { token: token! }),
    enabled: !!token,
  });
}

/** PUT /kemajuan/:id (selesai) atau DELETE (batal), dengan pembaruan optimistis
 * supaya kotak centang langsung berubah tanpa menunggu server. */
export function useTandaiKemajuan() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ butirId, selesai }: { butirId: string; selesai: boolean }) =>
      apiFetch<Kemajuan>(`/kemajuan/${encodeURIComponent(butirId)}`, {
        method: selesai ? 'PUT' : 'DELETE',
        token: token!,
      }),
    onMutate: async ({ butirId, selesai }) => {
      await queryClient.cancelQueries({ queryKey: KUNCI });
      const sebelum = queryClient.getQueryData<Kemajuan[]>(KUNCI) ?? [];
      const tanpa = sebelum.filter((k) => k.butir_id !== butirId);
      queryClient.setQueryData<Kemajuan[]>(
        KUNCI,
        selesai ? [...tanpa, { butir_id: butirId, selesai_pada: new Date().toISOString() }] : tanpa
      );
      return { sebelum };
    },
    onError: (_err, _var, konteks) => {
      if (konteks) queryClient.setQueryData(KUNCI, konteks.sebelum);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KUNCI }),
  });
}
