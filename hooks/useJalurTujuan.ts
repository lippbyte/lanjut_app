import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ApiError, apiFetch } from '../api/client';
import type { DaftarTujuan, JalurMinat, PeristiwaPerjalanan, PilihanJalur, Tujuan } from '../api/types';
import type { BadanTujuan } from '../lib/jalurTujuan';
import { useSesi } from '../providers/AuthProvider';

// Jalur & Tujuan (LANJUT_023). Data milik akun: AuthProvider membuang ['jalur_tujuan'] setiap sesi
// berganti atau keluar akun. Hanya dipakai layar di balik saklar EXPO_PUBLIC_JALUR_TUJUAN.
const KUNCI = ['jalur_tujuan'] as const;

function useAmbil<T>(kunci: string, jalur: string, aktif = true) {
  const { token } = useSesi();
  return useQuery<T, ApiError>({
    queryKey: [...KUNCI, kunci],
    queryFn: () => apiFetch<T>(jalur, { token: token! }),
    enabled: !!token && aktif,
    retry: false,
  });
}

export const useDaftarJalur = () => useAmbil<JalurMinat[]>('jalur', '/jalur-minat');
export const usePilihanJalur = () => useAmbil<PilihanJalur[]>('pilihan', '/jalur-minat/saya');
export const useDaftarTujuan = () => useAmbil<DaftarTujuan>('tujuan', '/tujuan');
export const usePerjalanan = () => useAmbil<PeristiwaPerjalanan[]>('perjalanan', '/tujuan/perjalanan');
export const useRiwayatTujuan = (id: string, aktif: boolean) => useAmbil<Tujuan[]>(`riwayat:${id}`, `/tujuan/${id}/riwayat`, aktif);

/** Semua data fitur ini saling terkait (perjalanan memuat jalur dan tujuan), jadi disegarkan bersama. */
function useUbah<V, H>(fn: (v: V, token: string) => Promise<H>) {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation<H, ApiError, V>({
    mutationFn: (v) => fn(v, token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KUNCI }),
  });
}

export const usePilihJalur = () =>
  useUbah<string, PilihanJalur>((jalurMinatId, token) =>
    apiFetch('/jalur-minat/saya', { method: 'POST', body: { jalur_minat_id: jalurMinatId }, token })
  );

export const useJedaJalur = () =>
  useUbah<string, PilihanJalur>((pilihanId, token) =>
    apiFetch(`/jalur-minat/saya/${pilihanId}`, { method: 'PATCH', body: { status: 'dijeda' }, token })
  );

/** Tanpa `id`: tujuan baru. Dengan `id`: versi baru dari tujuan itu, versi lama tetap tersimpan. */
export const useSimpanTujuan = () =>
  useUbah<{ id?: string; badan: BadanTujuan }, Tujuan>(({ id, badan }, token) =>
    apiFetch(id ? `/tujuan/${id}/versi` : '/tujuan', { method: 'POST', body: badan, token })
  );

export const useTandaiTercapai = () =>
  useUbah<string, Tujuan>((id, token) => apiFetch(`/tujuan/${id}/status`, { method: 'PATCH', body: { status: 'tercapai' }, token }));
