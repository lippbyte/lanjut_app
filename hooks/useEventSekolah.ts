import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { ApiError, apiFetch } from '../api/client';
import type { EventSekolah, IsiEvent, PilihanKartuEvent } from '../api/types';
import { useSesi } from '../providers/AuthProvider';

// Data milik akun: AuthProvider membuang kunci ini saat keluar/ganti akun.
export const KUNCI_EVENT = ['event_sekolah'] as const;

/**
 * LANJUT_076 — GET /pengguna/event (hanya milik akun sendiri). `aktif` = akun kelas
 * 7–9 (lib/eventSekolah.ts, LANJUT_076b). Saklar mati / kebijakan belum diterima /
 * kelas lain → 403; 403 tidak diulang, dan layar memperlakukan galat apa pun
 * sebagai "fitur tidak tampil".
 */
export function useEventSekolah(aktif: boolean) {
  const { token } = useSesi();
  return useQuery({
    queryKey: KUNCI_EVENT,
    queryFn: () => apiFetch<EventSekolah[]>('/pengguna/event', { token: token! }),
    enabled: !!token && aktif,
    retry: (kali, err) => !(err instanceof ApiError && err.status === 403) && kali < 1,
  });
}

/**
 * LANJUT_076b — kartu yang boleh jadi materi event: milik sendiri + kurasi
 * terverifikasi bersumber https. Aturannya hanya di server (jenisMateri); app
 * tidak menyaring ulang selain per mapel. Kuncinya di bawah ['event_sekolah'],
 * jadi ikut dibuang saat ganti akun dan ikut diperbarui setiap simpan/hapus event.
 */
export function usePilihanKartuEvent(aktif: boolean) {
  const { token } = useSesi();
  return useQuery({
    queryKey: [...KUNCI_EVENT, 'pilihan_kartu'],
    queryFn: () => apiFetch<PilihanKartuEvent[]>('/pengguna/event/pilihan-kartu', { token: token! }),
    enabled: !!token && aktif,
    retry: (kali, err) => !(err instanceof ApiError && err.status === 403) && kali < 1,
  });
}

/** Buat (tanpa `id`) atau ubah (dengan `id`) event milik sendiri. */
export function useSimpanEvent() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isi }: { id?: string; isi: IsiEvent }) =>
      id
        ? apiFetch<EventSekolah>(`/pengguna/event/${encodeURIComponent(id)}`, { method: 'PATCH', body: isi, token: token! })
        : apiFetch<EventSekolah>('/pengguna/event', { method: 'POST', body: isi, token: token! }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KUNCI_EVENT }),
  });
}

/** Hapus PERMANEN. */
export function useHapusEvent() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ dihapus: true }>(`/pengguna/event/${encodeURIComponent(id)}`, { method: 'DELETE', token: token! }),
    onSettled: () => queryClient.invalidateQueries({ queryKey: KUNCI_EVENT }),
  });
}
