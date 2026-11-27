import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ApiError, apiAmbilDataUri, apiFetch, apiUnggah } from '../api/client';
import type { ButirBukti, FotoButir, JalurMinat } from '../api/types';
import { jalurTujuanAktif, navigasiV2Aktif, portofolioAktif } from '../lib/fiturApp';
import type { BadanButir, FotoSiap } from '../lib/rekamJejakV2';
import { useSesi } from '../providers/AuthProvider';

// Kunci cache identik dengan v1 (`['butir_bukti']`) sehingga AuthProvider otomatis membersihkan
// daftar dan seluruh data URI foto di memori saat keluar akun, sesi berakhir, ganti akun, atau hapus akun.
// Sengaja tidak mengimpor `hooks/usePortofolio.ts` agar isolasi pengimpor LANJUT_011 di `portofolio-app.test.js` tetap utuh.
const KUNCI = ['butir_bukti'] as const;
const KUNCI_JALUR = ['jalur_tujuan', 'jalur'] as const;
const EXTRA = Constants.expoConfig?.extra;
const FITUR_AKTIF = portofolioAktif(EXTRA) && navigasiV2Aktif(EXTRA);
const JALUR_AKTIF = FITUR_AKTIF && jalurTujuanAktif(EXTRA);

/** `exact`: isi foto yang sudah dimuat di memori tidak diambil ulang saat daftar disegarkan. */
function segarkanDaftar(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: KUNCI, exact: true });
}

export function useDaftarButirV2() {
  const { token } = useSesi();
  return useQuery<ButirBukti[], ApiError>({
    queryKey: KUNCI,
    queryFn: () => apiFetch<ButirBukti[]>('/butir-bukti', { token: token! }),
    enabled: FITUR_AKTIF && !!token,
    retry: false,
  });
}

/**
 * Daftar jalur disetujui (hanya dimuat bila Jalur & Tujuan juga menyala) untuk menerjemahkan
 * `jalur_minat_id` disetujui lewat `labelJalur`. Bila mati atau 404, layar tetap aman memakai label netral.
 */
export function useJalurUntukRekamJejakV2() {
  const { token } = useSesi();
  return useQuery<JalurMinat[], ApiError>({
    queryKey: KUNCI_JALUR,
    queryFn: () => apiFetch<JalurMinat[]>('/jalur-minat', { token: token! }),
    enabled: JALUR_AKTIF && !!token,
    retry: false,
  });
}

/**
 * Isi foto sebagai data URI di memori saja (tanpa URL publik dan tanpa cache disk).
 * Mempertahankan persis perilaku v1 (`apiAmbilDataUri` dengan `cache: 'no-store'`).
 */
export function useFotoButirV2(butirId: string, fotoId: string) {
  const { token } = useSesi();
  return useQuery<string, ApiError>({
    queryKey: [...KUNCI, 'foto', fotoId],
    queryFn: () => apiAmbilDataUri(`/butir-bukti/${butirId}/foto/${fotoId}`, token!),
    enabled: FITUR_AKTIF && !!token,
    retry: false,
    staleTime: Infinity,
    gcTime: 60_000,
  });
}

export function useSimpanButirV2() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation<ButirBukti, ApiError, { id?: string; badan: BadanButir }>({
    mutationFn: ({ id, badan }) =>
      apiFetch<ButirBukti>(id ? `/butir-bukti/${id}` : '/butir-bukti', {
        method: id ? 'PATCH' : 'POST',
        body: badan,
        token: token!,
      }),
    onSuccess: () => segarkanDaftar(queryClient),
  });
}

export function useHapusButirV2() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, ButirBukti>({
    mutationFn: (butir) => apiFetch(`/butir-bukti/${butir.id}`, { method: 'DELETE', token: token! }),
    onSuccess: (_hasil, butir) => {
      for (const f of butir.foto) queryClient.removeQueries({ queryKey: [...KUNCI, 'foto', f.id] });
      return segarkanDaftar(queryClient);
    },
  });
}

export function useHapusFotoV2(butirId: string) {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation<unknown, ApiError, string>({
    mutationFn: (fotoId) => apiFetch(`/butir-bukti/${butirId}/foto/${fotoId}`, { method: 'DELETE', token: token! }),
    onSuccess: (_hasil, fotoId) => {
      queryClient.removeQueries({ queryKey: [...KUNCI, 'foto', fotoId] });
      return segarkanDaftar(queryClient);
    },
  });
}

/** Mengembalikan fungsi unggah dengan laporan kemajuan (%) tanpa mengubah kontrak server. */
export function useUnggahFotoV2(butirId: string) {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return async (foto: FotoSiap, onKemajuan: (persen: number) => void) => {
    const fd = new FormData();
    if (Platform.OS === 'web' && foto.blob) fd.append('foto', foto.blob, foto.nama);
    else fd.append('foto', { uri: foto.uri, name: foto.nama, type: foto.mime } as unknown as Blob);
    const hasil = await apiUnggah<FotoButir>(`/butir-bukti/${butirId}/foto`, {
      token: token!,
      body: fd,
      onKemajuan,
    });
    await segarkanDaftar(queryClient);
    return hasil;
  };
}
