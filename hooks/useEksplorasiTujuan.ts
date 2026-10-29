import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { ProfilProdi } from '../api/types';

// F10 — GET /konten/eksplorasi-tujuan (LANJUT_031). Server hanya mengirim
// profil yang sudah terverifikasi (konten.repo.js `ambilProfilProdiTerverifikasi`),
// jadi daftar kosong adalah keadaan yang benar selama belum ada yang dicek.
// Isinya kecil (maks. satu profil per prodi), jadi satu daftar dipakai untuk
// layar profil maupun daftar "yang sudah tersedia".
export function useEksplorasiTujuan() {
  return useQuery({
    queryKey: ['eksplorasi_tujuan'],
    queryFn: () => apiFetch<ProfilProdi[]>('/konten/eksplorasi-tujuan'),
  });
}
