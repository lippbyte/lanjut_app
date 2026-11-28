import Constants from 'expo-constants';
import { useCallback, useMemo } from 'react';

import type { ApiError } from '../api/client';
import { untukPersiapanEvent } from '../lib/eventSekolah';
import { navigasiV2Aktif } from '../lib/fiturApp';
import { susunJejakWaktu, type HasilJejakWaktu } from '../lib/jejakWaktuV2';
import { untukKelas12, type Kelas } from '../lib/jenjang';
import { useSesi } from '../providers/AuthProvider';
import { useEventSekolah } from './useEventSekolah';
import { useMapel } from './useMapel';
import { useTahapanLinimasa } from './useTahapanLinimasa';

const NAVIGASI_V2 = navigasiV2Aktif(Constants.expoConfig?.extra);

// 403/404 menandakan saklar fitur server mati atau jenjang tidak memakai rute itu, bukan galat jaringan.
const bukanGalatJaringan = (e: ApiError | null) => !!e && (e.status === 403 || e.status === 404);

export type DataJejakWaktuV2 = {
  kelas: Kelas | null;
  memuat: boolean;
  galatJaringan: boolean;
  muatUlang: () => void;
  jadwal: HasilJejakWaktu;
};

/**
 * Mengambil data layar Jejak Waktu v2 (`/jejak-waktu`, LANJUT_032) hanya dari rute API dan hook
 * yang sudah ada (`GET /konten/linimasa` untuk kelas 12, `GET /pengguna/event` untuk SMP kelas 7–9).
 */
export function useJejakWaktuV2(): DataJejakWaktuV2 {
  const { token, pengguna } = useSesi();
  const kelas = pengguna?.kelas ?? null;
  const aktif = NAVIGASI_V2 && !!token;
  const kelas12 = untukKelas12(kelas);
  const untukSmp = untukPersiapanEvent(kelas);

  const tahapanQuery = useTahapanLinimasa();
  const eventQuery = useEventSekolah(aktif && untukSmp);
  const mapelQuery = useMapel();

  const muatUlang = useCallback(() => {
    void tahapanQuery.refetch();
    if (untukSmp) {
      void eventQuery.refetch();
      void mapelQuery.refetch();
    }
  }, [tahapanQuery, eventQuery, mapelQuery, untukSmp]);

  const memuat = (kelas12 && tahapanQuery.isPending) || (untukSmp && eventQuery.isPending);

  const galatJaringan =
    (tahapanQuery.isError && !bukanGalatJaringan(tahapanQuery.error as ApiError | null)) ||
    (untukSmp && eventQuery.isError && !bukanGalatJaringan(eventQuery.error as ApiError | null));

  const namaMapel = useMemo(() => {
    const peta: Record<string, string> = {};
    for (const m of mapelQuery.data ?? []) peta[m.id] = m.nama;
    return peta;
  }, [mapelQuery.data]);

  const jadwal = useMemo(
    () =>
      susunJejakWaktu({
        kelas,
        tahapanLinimasa: tahapanQuery.isError ? null : tahapanQuery.data,
        eventSekolah: eventQuery.isError ? null : eventQuery.data,
        namaMapel,
      }),
    [kelas, tahapanQuery.isError, tahapanQuery.data, eventQuery.isError, eventQuery.data, namaMapel]
  );

  return { kelas, memuat, galatJaringan, muatUlang, jadwal };
}
