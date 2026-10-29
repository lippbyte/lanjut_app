import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { IsiKartu, Kartu } from '../api/types';
import { useSesi } from '../providers/AuthProvider';

// Data milik akun: AuthProvider membuang kunci ini saat keluar/ganti akun.
const KUNCI = ['kartu'] as const;

/**
 * F6 Arsip Belajar (LANJUT_039) — kartu MILIK SENDIRI saja.
 *
 * `?sumber=pengguna` membuat server tidak mengirim kartu kurasi (sumber
 * 'resmi', 12 kartu yang belum diverifikasi tim konten). Saringan kedua di
 * klien hanya jaring pengaman bila parameter itu suatu saat diabaikan.
 */
export function useKartuSaya() {
  const { token } = useSesi();
  return useQuery({
    queryKey: KUNCI,
    queryFn: async () => {
      const data = await apiFetch<Kartu[]>('/kartu', { token: token!, query: { sumber: 'pengguna' } });
      return data.filter((k) => k.sumber === 'pengguna');
    },
    enabled: !!token,
  });
}

/** POST /kartu (baru) atau PATCH /kartu/:id (ubah). Mengembalikan kartu tersimpan. */
export function useSimpanKartu() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isi }: { id?: string; isi: IsiKartu }) =>
      id
        ? apiFetch<Kartu>(`/kartu/${encodeURIComponent(id)}`, { method: 'PATCH', body: isi, token: token! })
        : apiFetch<Kartu>('/kartu', {
            method: 'POST',
            // POST tidak menerima jawaban null — kirim hanya bila diisi.
            body: { mapel_id: isi.mapel_id, judul: isi.judul, isi: isi.isi, ...(isi.jawaban ? { jawaban: isi.jawaban } : {}) },
            token: token!,
          }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KUNCI }),
  });
}

/** DELETE /kartu/:id — hapus lunak di server (dihapus_pada). */
export function useHapusKartu() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ dihapus: true }>(`/kartu/${encodeURIComponent(id)}`, { method: 'DELETE', token: token! }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KUNCI }),
  });
}
