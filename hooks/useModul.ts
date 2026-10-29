import { Platform } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { BahanModulLatihan, HasilCariModul, Modul, ModulRingkas } from '../api/types';
import type { BerkasTerpilih } from '../lib/modul';
import { useSesi } from '../providers/AuthProvider';

// Data milik akun: AuthProvider membuang ['modul'] (termasuk ['modul', ...]
// untuk satu modul & hasil cari) saat keluar/ganti akun.
const KUNCI = ['modul'] as const;

/** LANJUT_049 — daftar modul sendiri (tanpa isi). */
export function useModulSaya() {
  const { token } = useSesi();
  return useQuery({
    queryKey: KUNCI,
    queryFn: () => apiFetch<ModulRingkas[]>('/modul', { token: token! }),
    enabled: !!token,
  });
}

/** Satu modul dengan isi lengkap; id orang lain → 404 dari server. */
export function useModul(id: string | undefined) {
  const { token } = useSesi();
  return useQuery({
    queryKey: [...KUNCI, 'satu', id],
    queryFn: () => apiFetch<Modul>(`/modul/${encodeURIComponent(id!)}`, { token: token! }),
    enabled: !!token && !!id,
    retry: false,
  });
}

/** GET /modul/cari — hanya di modul sendiri (FULLTEXT di server). */
export function useCariModul(q: string) {
  const { token } = useSesi();
  return useQuery({
    queryKey: [...KUNCI, 'cari', q],
    queryFn: () => apiFetch<HasilCariModul>('/modul/cari', { token: token!, query: { q } }),
    enabled: !!token && q.trim().length >= 3,
  });
}

/**
 * GET /modul/latihan — potongan modul sendiri sebagai bahan Latihan (contoh acak per mapel).
 * Di bawah kunci ['modul'], jadi ikut segar sesudah unggah/hapus dan dibuang saat ganti akun.
 */
export function useModulLatihan() {
  const { token } = useSesi();
  return useQuery({
    queryKey: [...KUNCI, 'latihan'],
    queryFn: () => apiFetch<BahanModulLatihan>('/modul/latihan', { token: token! }),
    enabled: !!token,
  });
}

export type UnggahModul = { judul: string; mapel_id: string } & ({ berkas: BerkasTerpilih } | { teks: string });

/** POST /modul — berkas (multipart) atau teks yang ditempel (JSON). */
export function useUnggahModul() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (masukan: UnggahModul) => {
      if ('teks' in masukan) {
        return apiFetch<ModulRingkas>('/modul', {
          method: 'POST',
          body: { judul: masukan.judul, mapel_id: masukan.mapel_id, teks: masukan.teks },
          token: token!,
        });
      }
      const fd = new FormData();
      fd.append('judul', masukan.judul);
      fd.append('mapel_id', masukan.mapel_id);
      const b = masukan.berkas;
      if (Platform.OS === 'web' && b.file) fd.append('berkas', b.file, b.nama);
      // React Native: berkas dikirim dari uri-nya (bentuk { uri, name, type }).
      else fd.append('berkas', { uri: b.uri, name: b.nama, type: b.mime ?? 'application/octet-stream' } as unknown as Blob);
      return apiFetch<ModulRingkas>('/modul', { method: 'POST', body: fd, token: token! });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: KUNCI }),
  });
}

/** DELETE /modul/:id — hapus PERMANEN (teks + potongan). */
export function useHapusModul() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ dihapus: true }>(`/modul/${encodeURIComponent(id)}`, { method: 'DELETE', token: token! }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KUNCI }),
  });
}

/** DELETE /modul?semua=ya — hapus permanen SEMUA modul sendiri. */
export function useHapusSemuaModul() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ jumlah_dihapus: number }>('/modul', { method: 'DELETE', token: token!, query: { semua: 'ya' } }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KUNCI }),
  });
}
