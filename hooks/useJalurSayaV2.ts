import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useCallback } from 'react';

import { type ApiError, apiFetch } from '../api/client';
import type { DaftarTujuan, JalurMinat, PeristiwaPerjalanan, PilihanJalur, Tujuan, VersiTujuan } from '../api/types';
import { jalurTujuanAktif, navigasiV2Aktif } from '../lib/fiturApp';
import { keadaanData, type BadanTujuan, type KeadaanData } from '../lib/jalurSayaV2';
import { useSesi } from '../providers/AuthProvider';

// Kunci cache identik dengan v1 (`['jalur_tujuan']`) sehingga ikut dibersihkan AuthProvider saat sesi berganti.
// Sengaja tidak mengimpor `hooks/useJalurTujuan.ts` agar isolasi pengimpor LANJUT_023 di `jalur-tujuan-app.test.js` tetap utuh.
const KUNCI = ['jalur_tujuan'] as const;
const EXTRA = Constants.expoConfig?.extra;
const FITUR_AKTIF = jalurTujuanAktif(EXTRA) && navigasiV2Aktif(EXTRA);

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

export const useDaftarJalurV2 = () => useAmbilV2<JalurMinat[]>('jalur', '/jalur-minat');
export const usePilihanJalurV2 = () => useAmbilV2<PilihanJalur[]>('pilihan', '/jalur-minat/saya');
export const useDaftarTujuanV2 = () => useAmbilV2<DaftarTujuan>('tujuan', '/tujuan');
export const usePerjalananV2 = (aktif = true) => useAmbilV2<PeristiwaPerjalanan[]>('perjalanan', '/tujuan/perjalanan', aktif);
export const useRiwayatTujuanV2 = (id: string, aktif: boolean) =>
  useAmbilV2<VersiTujuan[]>(`riwayat:${id}`, `/tujuan/${encodeURIComponent(id)}/riwayat`, aktif);

export const usePilihJalurV2 = () =>
  useUbahV2<string, PilihanJalur>((jalurMinatId, token) =>
    apiFetch('/jalur-minat/saya', { method: 'POST', body: { jalur_minat_id: jalurMinatId }, token })
  );

export const useJedaJalurV2 = () =>
  useUbahV2<string, PilihanJalur>((pilihanId, token) =>
    apiFetch(`/jalur-minat/saya/${encodeURIComponent(pilihanId)}`, {
      method: 'PATCH',
      body: { status: 'dijeda' },
      token,
    })
  );

export const useSimpanTujuanV2 = () =>
  useUbahV2<{ id?: string; badan: BadanTujuan }, Tujuan>(({ id, badan }, token) =>
    apiFetch(id ? `/tujuan/${encodeURIComponent(id)}/versi` : '/tujuan', {
      method: 'POST',
      body: badan,
      token,
    })
  );

export const useTandaiTercapaiV2 = () =>
  useUbahV2<string, Tujuan>((id, token) =>
    apiFetch(`/tujuan/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: { status: 'tercapai' },
      token,
    })
  );

export function useDataJalurSayaV2(): {
  jalur: ReturnType<typeof useDaftarJalurV2>;
  pilihan: ReturnType<typeof usePilihanJalurV2>;
  tujuan: ReturnType<typeof useDaftarTujuanV2>;
  keadaan: KeadaanData;
  muatUlang: () => void;
} {
  const jalur = useDaftarJalurV2();
  const pilihan = usePilihanJalurV2();
  const tujuan = useDaftarTujuanV2();
  const galat = jalur.error ?? pilihan.error ?? tujuan.error ?? null;
  const keadaan = keadaanData({
    isPending: jalur.isPending || pilihan.isPending || tujuan.isPending,
    galat,
  });
  const muatUlang = useCallback(() => {
    void jalur.refetch();
    void pilihan.refetch();
    void tujuan.refetch();
  }, [jalur, pilihan, tujuan]);

  return { jalur, pilihan, tujuan, keadaan, muatUlang };
}
