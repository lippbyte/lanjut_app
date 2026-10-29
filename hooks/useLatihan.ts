import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { CatatanLatihan, SesiLatihan } from '../api/types';
import { useSesi } from '../providers/AuthProvider';
import { KUNCI_LEVELIN } from './useLevelIn';

// Data milik akun: AuthProvider membuang kunci ini saat keluar/ganti akun.
const KUNCI = ['sesi_latihan'] as const;

/** Riwayat Latihan — GET /sesi-latihan (sesi milik sendiri, 50 terakhir). */
export function useRiwayatLatihan() {
  const { token } = useSesi();
  return useQuery({
    queryKey: KUNCI,
    queryFn: () => apiFetch<SesiLatihan[]>('/sesi-latihan', { token: token! }),
    enabled: !!token,
  });
}

type MulaiSesi = {
  id: string;
  mapel_fokus_id: string | null;
  jumlah_kartu_direncanakan: number;
  /** LANJUT_058: 'beranda_saran' bila dimulai dari saran harian Level-In. */
  asal_mula?: SesiLatihan['asal_mula'];
};

/** POST /sesi-latihan — id buatan klien, jadi aman dikirim ulang. */
export function useMulaiSesi() {
  const { token } = useSesi();
  return useMutation({
    mutationFn: ({ asal_mula = 'arsip', ...sesi }: MulaiSesi) =>
      apiFetch<{ id: string }>('/sesi-latihan', {
        method: 'POST',
        body: { ...sesi, dimulai_pada: new Date().toISOString(), asal_mula },
        token: token!,
      }),
  });
}

/**
 * Akhir sesi: POST /riwayat-latihan (semua jawaban sekaligus — bukan per
 * kartu, SDD §6.4) lalu PATCH /sesi-latihan/:id (selesai_pada). Id catatan
 * buatan klien, jadi "Coba lagi" tidak menggandakan apa pun.
 */
export function useSimpanHasilSesi() {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sesiId, catatan }: { sesiId: string; catatan: CatatanLatihan[] }) => {
      if (catatan.length) {
        await apiFetch('/riwayat-latihan', { method: 'POST', body: catatan, token: token! });
      }
      await apiFetch(`/sesi-latihan/${encodeURIComponent(sesiId)}`, {
        method: 'PATCH',
        body: { selesai_pada: new Date().toISOString() },
        token: token!,
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: KUNCI });
      queryClient.invalidateQueries({ queryKey: KUNCI_LEVELIN }); // LANJUT_058: Level-In dihitung ulang server
    },
  });
}
