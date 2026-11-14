import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ApiError, apiFetch } from '../api/client';
import type { KartuDiscover, ProfilEksplorasi, ProfilEksplorasiSaya, RefleksiDiscover } from '../api/types';
import type { BadanRefleksi } from '../lib/discover';
import { useSesi } from '../providers/AuthProvider';

// Discover (LANJUT_024). Data milik akun: AuthProvider membuang ['discover'] setiap sesi berganti
// atau keluar akun. Hanya dipakai layar di balik saklar EXPO_PUBLIC_DISCOVER.
const KUNCI = ['discover'] as const;

function useAmbil<T>(kunci: string, jalur: string, aktif = true) {
  const { token } = useSesi();
  return useQuery<T, ApiError>({
    queryKey: [...KUNCI, kunci],
    queryFn: () => apiFetch<T>(jalur, { token: token! }),
    enabled: !!token && aktif,
    retry: false,
  });
}

export const useKartuDiscover = () => useAmbil<KartuDiscover[]>('kartu', '/discover/kartu');
export const useRefleksiSaya = () => useAmbil<RefleksiDiscover[]>('refleksi', '/discover/refleksi');
export const useProfilEksplorasi = () => useAmbil<ProfilEksplorasiSaya>('profil', '/discover/profil');
export const useRiwayatProfil = (aktif: boolean) => useAmbil<ProfilEksplorasi[]>('riwayat', '/discover/profil/riwayat', aktif);

function useUbah<V, H>(fn: (v: V, token: string) => Promise<H>) {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation<H, ApiError, V>({
    mutationFn: (v) => fn(v, token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KUNCI }),
  });
}

export const useSimpanRefleksi = () =>
  useUbah<{ kartuId: string; badan: BadanRefleksi }, RefleksiDiscover>(({ kartuId, badan }, token) =>
    apiFetch(`/discover/refleksi/${encodeURIComponent(kartuId)}`, { method: 'PUT', body: badan, token })
  );

/** Versi baru dari jawaban saat ini; versi lama tetap tersimpan. `catatan` tidak dikirim = tetap. */
export const usePerbaruiProfil = () =>
  useUbah<{ catatan?: string | null }, ProfilEksplorasi>((badan, token) => apiFetch('/discover/profil', { method: 'POST', body: badan, token }));
