import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { ButirPribadi, SimpanButirPribadi } from '../api/types';
import { useSesi } from '../providers/AuthProvider';

// Data milik akun: AuthProvider membuang kunci ini saat keluar/ganti akun,
// sama seperti ['kemajuan'] — butir akun A tidak boleh terlihat di akun B.
export const KUNCI_BUTIR_PRIBADI = ['butir_pribadi'] as const;

// LANJUT_034 — butir Daftar Periksa milik akun (butir-pribadi.rute.js, wajibLogin).
export function useButirPribadi() {
  const { token } = useSesi();
  return useQuery({
    queryKey: KUNCI_BUTIR_PRIBADI,
    queryFn: () => apiFetch<ButirPribadi[]>('/butir-pribadi', { token: token! }),
    enabled: !!token,
  });
}

/** POST /butir-pribadi — "Simpan ke Daftar Periksa" di F3 dan F10. */
export function useSimpanButirPribadi() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (masukan: SimpanButirPribadi) =>
      apiFetch<ButirPribadi>('/butir-pribadi', { method: 'POST', body: masukan, token: token! }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KUNCI_BUTIR_PRIBADI }),
  });
}

/** PUT/DELETE /butir-pribadi/:id/selesai, optimistis seperti useTandaiKemajuan. */
export function useTandaiButirPribadi() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, selesai }: { id: string; selesai: boolean }) =>
      apiFetch<ButirPribadi>(`/butir-pribadi/${encodeURIComponent(id)}/selesai`, {
        method: selesai ? 'PUT' : 'DELETE',
        token: token!,
      }),
    onMutate: async ({ id, selesai }) => {
      await queryClient.cancelQueries({ queryKey: KUNCI_BUTIR_PRIBADI });
      const sebelum = queryClient.getQueryData<ButirPribadi[]>(KUNCI_BUTIR_PRIBADI) ?? [];
      queryClient.setQueryData<ButirPribadi[]>(
        KUNCI_BUTIR_PRIBADI,
        sebelum.map((b) => (b.id === id ? { ...b, selesai_pada: selesai ? new Date().toISOString() : null } : b))
      );
      return { sebelum };
    },
    onError: (_err, _var, konteks) => {
      if (konteks) queryClient.setQueryData(KUNCI_BUTIR_PRIBADI, konteks.sebelum);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KUNCI_BUTIR_PRIBADI }),
  });
}

/** DELETE /butir-pribadi/:id — hapus butir dari Daftar Periksa. */
export function useHapusButirPribadi() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ dihapus: true }>(`/butir-pribadi/${encodeURIComponent(id)}`, { method: 'DELETE', token: token! }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KUNCI_BUTIR_PRIBADI }),
  });
}
