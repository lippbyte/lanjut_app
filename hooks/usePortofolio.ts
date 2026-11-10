import { Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { type ApiError, apiAmbilDataUri, apiFetch, apiUnggah } from '../api/client';
import type { ButirBukti, FotoButir } from '../api/types';
import type { BadanButir } from '../lib/portofolio';
import type { FotoSiap } from '../lib/portofolioFoto';
import { useSesi } from '../providers/AuthProvider';

// Data milik akun: AuthProvider membuang ['butir_bukti'], termasuk isi foto di bawahnya, setiap
// sesi berganti atau keluar akun.
const KUNCI = ['butir_bukti'] as const;

/** Daftar memuat semua butir dan data fotonya. Detail dan jumlah foto akun dihitung dari sini. */
export function useDaftarButir() {
  const { token } = useSesi();
  return useQuery<ButirBukti[], ApiError>({
    queryKey: KUNCI,
    queryFn: () => apiFetch<ButirBukti[]>('/butir-bukti', { token: token! }),
    enabled: !!token,
    retry: false,
  });
}

/**
 * Isi foto sebagai data URI, disimpan di memori saja. Foto tidak punya alamat publik, dan
 * komponen gambar tidak dipakai untuk mengambilnya supaya tidak masuk cache disk perangkat.
 */
export function useFotoButir(butirId: string, fotoId: string) {
  const { token } = useSesi();
  return useQuery<string, ApiError>({
    queryKey: [...KUNCI, 'foto', fotoId],
    queryFn: () => apiAmbilDataUri(`/butir-bukti/${butirId}/foto/${fotoId}`, token!),
    enabled: !!token,
    retry: false,
    staleTime: Infinity,
    gcTime: 60_000,
  });
}

/** `exact`: isi foto yang sudah dimuat tidak ikut diambil ulang. */
function segarkanDaftar(queryClient: ReturnType<typeof useQueryClient>) {
  return queryClient.invalidateQueries({ queryKey: KUNCI, exact: true });
}

export function useSimpanButir() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation<ButirBukti, ApiError, { id?: string; badan: BadanButir }>({
    mutationFn: ({ id, badan }) =>
      apiFetch<ButirBukti>(id ? `/butir-bukti/${id}` : '/butir-bukti', { method: id ? 'PATCH' : 'POST', body: badan, token: token! }),
    onSuccess: () => segarkanDaftar(queryClient),
  });
}

export function useHapusButir() {
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

export function useHapusFoto(butirId: string) {
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

/** Mengembalikan fungsi unggah. Bukan useMutation, karena perlu melaporkan kemajuan ke layar. */
export function useUnggahFoto(butirId: string) {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return async (foto: FotoSiap, onKemajuan: (persen: number) => void) => {
    const fd = new FormData();
    if (Platform.OS === 'web' && foto.blob) fd.append('foto', foto.blob, foto.nama);
    // React Native: berkas dikirim dari uri-nya (bentuk { uri, name, type }).
    else fd.append('foto', { uri: foto.uri, name: foto.nama, type: foto.mime } as unknown as Blob);
    const hasil = await apiUnggah<FotoButir>(`/butir-bukti/${butirId}/foto`, { token: token!, body: fd, onKemajuan });
    await segarkanDaftar(queryClient);
    return hasil;
  };
}
