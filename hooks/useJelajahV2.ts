import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useCallback } from 'react';

import { type ApiError, apiFetch } from '../api/client';
import type { KartuDiscover, ProfilEksplorasi, ProfilEksplorasiSaya, RefleksiDiscover } from '../api/types';
import { discoverAktif, navigasiV2Aktif } from '../lib/fiturApp';
import { keadaanData, type BadanRefleksi, type KeadaanData } from '../lib/jelajahV2';
import { useSesi } from '../providers/AuthProvider';

// Kunci cache identik dengan v1 (`['discover']`) sehingga ikut dibersihkan AuthProvider saat sesi berganti.
// Sengaja tidak mengimpor `hooks/useDiscover.ts` agar isolasi pengimpor LANJUT_024 di `discover-app.test.js` tetap utuh.
const KUNCI = ['discover'] as const;
const EXTRA = Constants.expoConfig?.extra;
const FITUR_AKTIF = discoverAktif(EXTRA) && navigasiV2Aktif(EXTRA);

function useAmbilV2<T>(subkunci: string, ruteApi: string, aktif = true) {
  const { token } = useSesi();
  return useQuery<T, ApiError>({
    queryKey: [...KUNCI, subkunci],
    queryFn: () => apiFetch<T>(ruteApi, { token: token! }),
    enabled: FITUR_AKTIF && !!token && aktif,
    retry: false,
  });
}

function useUbahV2<V, H>(fn: (v: V, token: string) => Promise<H>) {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation<H, ApiError, V>({
    mutationFn: (v) => fn(v, token!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KUNCI }),
  });
}

export const useKartuJelajahV2 = () => useAmbilV2<KartuDiscover[]>('kartu', '/discover/kartu');
export const useRefleksiJelajahV2 = () => useAmbilV2<RefleksiDiscover[]>('refleksi', '/discover/refleksi');
export const useProfilEksplorasiV2 = () => useAmbilV2<ProfilEksplorasiSaya>('profil', '/discover/profil');
export const useRiwayatProfilV2 = (aktif: boolean) =>
  useAmbilV2<ProfilEksplorasi[]>('riwayat', '/discover/profil/riwayat', aktif);

export const useSimpanRefleksiV2 = () =>
  useUbahV2<{ kartuId: string; badan: BadanRefleksi }, RefleksiDiscover>(({ kartuId, badan }, token) =>
    apiFetch(`/discover/refleksi/${encodeURIComponent(kartuId)}`, {
      method: 'PUT',
      body: badan,
      token,
    })
  );

export const usePerbaruiProfilV2 = () =>
  useUbahV2<{ catatan?: string | null }, ProfilEksplorasi>((badan, token) =>
    apiFetch('/discover/profil', {
      method: 'POST',
      body: badan,
      token,
    })
  );

export function useDataJelajahV2(): {
  kartu: ReturnType<typeof useKartuJelajahV2>;
  refleksi: ReturnType<typeof useRefleksiJelajahV2>;
  keadaan: KeadaanData;
  muatUlang: () => void;
} {
  const kartu = useKartuJelajahV2();
  const refleksi = useRefleksiJelajahV2();
  const galat = kartu.error ?? refleksi.error ?? null;
  const keadaan = keadaanData({
    isPending: kartu.isPending || refleksi.isPending,
    galat,
  });
  const muatUlang = useCallback(() => {
    void kartu.refetch();
    void refleksi.refetch();
  }, [kartu, refleksi]);

  return { kartu, refleksi, keadaan, muatUlang };
}
