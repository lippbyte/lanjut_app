import { useQuery } from '@tanstack/react-query';

import { apiFetch } from '../api/client';
import type { MapelUntukProdi } from '../api/types';

/**
 * F3 — GET /konten/prodi/:id/mapel (konten.rute.js baris 68), representasi
 * tabel penghubung `prodi_mapel` untuk SATU prodi. Tidak ada endpoint yang
 * mengembalikan seluruh `prodi_mapel` mentah (semua prodi sekaligus) —
 * desain REST yang ada memang per-prodi, karena F3 selalu mulai dari satu
 * prodi terpilih, bukan dari daftar mentah tabel penghubung.
 *
 * `enabled: !!prodiId` supaya query tidak jalan sebelum pengguna memilih
 * prodi (F3 juga punya jalur "belum tahu prodi" — lihat PRD Bagian 6 F3).
 */
export function useProdiMapel(prodiId: string | number | undefined) {
  return useQuery({
    queryKey: ['prodi_mapel', prodiId],
    queryFn: () => apiFetch<MapelUntukProdi[]>(`/konten/prodi/${prodiId}/mapel`),
    enabled: prodiId !== undefined && prodiId !== null && prodiId !== '',
  });
}
