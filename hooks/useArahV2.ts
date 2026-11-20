import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';

import type { Pengguna } from '../api/auth';
import { type ApiError, apiFetch } from '../api/client';
import type { JalurMinat, PilihanJalur } from '../api/types';
import { alurMasukV2Aktif } from '../lib/fiturApp';
import { belumIsiJenisSekolah } from '../lib/jenjang';
import { perluBuatSandiBaru } from '../lib/sandiBaru';
import { keadaanTanyaArah, kunciTandaArah, opsiArah, uraiTandaArah, type KeadaanTanya, type OpsiArah, type TandaArah } from '../lib/tandaArah';
import { useSesi } from '../providers/AuthProvider';

const ALUR_V2 = alurMasukV2Aktif(Constants.expoConfig?.extra);

export type ArahV2 = {
  keadaan: KeadaanTanya;
  opsi: OpsiArah[];
  /** Daftar gagal karena jaringan atau server (bukan rute mati/kebijakan): tampilkan coba lagi. */
  galatJaringan: boolean;
  muatUlang: () => void;
  simpanTanda: (t: TandaArah) => Promise<void>;
  /** "Lanjut dulu" saat galat: tidak ditanya lagi di sesi ini, tanpa tanda tersimpan. */
  lewatiSesiIni: () => void;
};

// Rute mati (404) atau kebijakan belum diterima (403): tidak ada jalur yang bisa dipilih sekarang.
const galatBukanJaringan = (e: ApiError | null) => !!e && (e.status === 404 || e.status === 403);

/**
 * Kapan pertanyaan kecenderungan arah tampil (LANJUT_030, alur masuk v2). Saat saklar mati, hook
 * ini tidak membaca penyimpanan dan tidak memanggil API sama sekali (alur v1 tidak berubah).
 * Tampil hanya sesudah gerbang v1 (sandi baru, kelas, jenis sekolah) beres. Kunci kueri sama
 * dengan hooks/useJalurTujuan.ts, jadi ikut segar setelah memilih jalur, dan ikut dibuang
 * AuthProvider saat sesi berganti.
 */
export function useTanyaArahV2(pengguna: Pengguna | null): ArahV2 {
  const { token } = useSesi();
  const aktif =
    ALUR_V2 && !!pengguna && !perluBuatSandiBaru(pengguna) && !!pengguna.kelas && !belumIsiJenisSekolah(pengguna.kelas, pengguna.jenis_sekolah);
  const id = pengguna?.id ?? null;
  const [tanda, setTanda] = useState<TandaArah | null | undefined>(undefined);
  const [lewati, setLewati] = useState(false);

  useEffect(() => {
    setTanda(undefined);
    setLewati(false);
    if (!aktif || !id) return;
    let hidup = true;
    AsyncStorage.getItem(kunciTandaArah(id))
      .then((v) => hidup && setTanda(uraiTandaArah(v)))
      .catch(() => hidup && setTanda(null));
    return () => {
      hidup = false;
    };
  }, [aktif, id]);

  const perluData = aktif && !!token && (tanda === null || tanda === 'kosong') && !lewati;
  const daftar = useQuery<JalurMinat[], ApiError>({
    queryKey: ['jalur_tujuan', 'jalur'],
    queryFn: () => apiFetch<JalurMinat[]>('/jalur-minat', { token: token! }),
    enabled: perluData,
    retry: false,
  });
  const pilihan = useQuery<PilihanJalur[], ApiError>({
    queryKey: ['jalur_tujuan', 'pilihan'],
    queryFn: () => apiFetch<PilihanJalur[]>('/jalur-minat/saya', { token: token! }),
    enabled: perluData,
    retry: false,
  });

  const simpanTanda = useCallback(
    async (t: TandaArah) => {
      if (id) await AsyncStorage.setItem(kunciTandaArah(id), t).catch(() => {});
      setTanda(t);
    },
    [id]
  );

  const nilaiDaftar = daftar.isError ? null : daftar.data;
  const nilaiPilihan = pilihan.isError ? null : pilihan.data;
  const keadaan: KeadaanTanya = lewati ? 'tidak' : keadaanTanyaArah({ aktif, tanda, daftar: nilaiDaftar, pilihan: nilaiPilihan });

  return {
    keadaan,
    opsi: opsiArah(nilaiDaftar),
    galatJaringan: daftar.isError && !galatBukanJaringan(daftar.error),
    muatUlang: () => {
      void daftar.refetch();
      void pilihan.refetch();
    },
    simpanTanda,
    lewatiSesiIni: () => setLewati(true),
  };
}
