import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { PilihanMapel } from '../api/types';
import { useSesi } from '../providers/AuthProvider';

// LANJUT_079 — GET /pengguna/saya/pilihan-mapel (pengguna.rute.js, wajibLogin).
// Kunci ikut id akun; dihapus saat ganti akun (AuthProvider KUNCI_DATA_AKUN) dan
// dimuat ulang sesudah PATCH /pengguna/saya (useUbahProfil).
export function usePilihanMapel(aktif = true) {
  const { token, pengguna } = useSesi();
  return useQuery({
    queryKey: ['pilihan_mapel', pengguna?.id],
    queryFn: () => apiFetch<PilihanMapel>('/pengguna/saya/pilihan-mapel', { token: token! }),
    enabled: !!token && aktif,
  });
}
