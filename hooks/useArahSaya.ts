import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { type ApiError, apiFetch } from '../api/client';
import type { JalurMinat, PilihanJalur } from '../api/types';
import { keadaanArahku, pilihLangkahBerikutnya, type HasilArahku, type LangkahBerikutnya } from '../lib/arahSaya';
import { untukPersiapanEvent } from '../lib/eventSekolah';
import { navigasiV2Aktif } from '../lib/fiturApp';
import { untukKelas12 } from '../lib/jenjang';
import { kunciTandaArah, opsiArah, uraiTandaArah, type TandaArah } from '../lib/tandaArah';
import { useSesi } from '../providers/AuthProvider';
import type { ArahV2 } from './useArahV2';
import { useButirDaftarPeriksa } from './useButirDaftarPeriksa';
import { useButirPribadi } from './useButirPribadi';
import { useEventSekolah } from './useEventSekolah';
import { useKemajuan } from './useKemajuan';
import { useMapel } from './useMapel';
import { useTahapanLinimasa } from './useTahapanLinimasa';

const NAVIGASI_V2 = navigasiV2Aktif(Constants.expoConfig?.extra);

// 404 (saklar server mati) dan 403 (kebijakan belum diterima / jenjang lain) bukan galat jaringan.
const bukanGalatJaringan = (e: ApiError | null) => !!e && (e.status === 404 || e.status === 403);

export type DataArahSaya = {
  memuat: boolean;
  galatJaringan: boolean;
  muatUlang: () => void;
  arahku: HasilArahku;
  langkah: LangkahBerikutnya | null;
  /** Objek siap pakai untuk membuka ulang layar kecenderungan 030 (`GerbangArahV2`). */
  arahModal: ArahV2;
};

/**
 * Mengambil data layar Arah Saya (LANJUT_031) hanya dari rute API dan tabel yang sudah ada.
 * Tidak mengimpor `hooks/useJalurTujuan.ts` agar isolasi saklar LANJUT_023 tetap utuh.
 */
export function useArahSaya(onTutupModal: () => void): DataArahSaya {
  const { token, pengguna } = useSesi();
  const queryClient = useQueryClient();
  const kelas = pengguna?.kelas ?? null;
  const id = pengguna?.id ?? null;
  const aktif = NAVIGASI_V2 && !!token && !!id;

  const [tanda, setTanda] = useState<TandaArah | null | undefined>(undefined);

  useEffect(() => {
    setTanda(undefined);
    if (!aktif || !id) return;
    let hidup = true;
    AsyncStorage.getItem(kunciTandaArah(id))
      .then((v) => hidup && setTanda(uraiTandaArah(v)))
      .catch(() => hidup && setTanda(null));
    return () => {
      hidup = false;
    };
  }, [aktif, id]);

  const daftarJalur = useQuery<JalurMinat[], ApiError>({
    queryKey: ['jalur_tujuan', 'jalur'],
    queryFn: () => apiFetch<JalurMinat[]>('/jalur-minat', { token: token! }),
    enabled: aktif,
    retry: false,
  });

  const pilihanJalur = useQuery<PilihanJalur[], ApiError>({
    queryKey: ['jalur_tujuan', 'pilihan'],
    queryFn: () => apiFetch<PilihanJalur[]>('/jalur-minat/saya', { token: token! }),
    enabled: aktif,
    retry: false,
  });

  const kelas12 = untukKelas12(kelas);
  const untukSmp = untukPersiapanEvent(kelas);

  const butirPribadi = useButirPribadi();
  const butirUmum = useButirDaftarPeriksa({ kelas: '12' }, aktif && kelas12);
  const kemajuan = useKemajuan();
  const eventSekolah = useEventSekolah(aktif && untukSmp);
  const tahapanLinimasa = useTahapanLinimasa();
  const mapelQuery = useMapel();

  const simpanTanda = useCallback(
    async (t: TandaArah) => {
      if (id) await AsyncStorage.setItem(kunciTandaArah(id), t).catch(() => {});
      setTanda(t);
      onTutupModal();
    },
    [id, onTutupModal]
  );

  const pilihJalur = useCallback(
    async (jalurMinatId: string) => {
      if (!NAVIGASI_V2 || !token) return;
      await apiFetch<PilihanJalur>('/jalur-minat/saya', { method: 'POST', body: { jalur_minat_id: jalurMinatId }, token });
      await queryClient.invalidateQueries({ queryKey: ['jalur_tujuan'] });
    },
    [token, queryClient]
  );

  const muatUlang = useCallback(() => {
    void daftarJalur.refetch();
    void pilihanJalur.refetch();
    void butirPribadi.refetch();
    if (kelas12) {
      void butirUmum.refetch();
      void tahapanLinimasa.refetch();
    }
    void kemajuan.refetch();
    if (untukSmp) void eventSekolah.refetch();
  }, [daftarJalur, pilihanJalur, butirPribadi, butirUmum, kemajuan, eventSekolah, tahapanLinimasa, kelas12, untukSmp]);

  const memuat =
    tanda === undefined ||
    butirPribadi.isPending ||
    kemajuan.isPending ||
    (kelas12 && (butirUmum.isPending || tahapanLinimasa.isPending)) ||
    (untukSmp && eventSekolah.isPending) ||
    daftarJalur.isPending ||
    pilihanJalur.isPending;

  const galatJaringan =
    (butirPribadi.isError && !bukanGalatJaringan(butirPribadi.error as ApiError | null)) ||
    (kemajuan.isError && !bukanGalatJaringan(kemajuan.error as ApiError | null)) ||
    (kelas12 && butirUmum.isError && !bukanGalatJaringan(butirUmum.error as ApiError | null)) ||
    (daftarJalur.isError && !bukanGalatJaringan(daftarJalur.error));

  const namaMapel = useMemo(() => {
    const peta: Record<string, string> = {};
    for (const m of mapelQuery.data ?? []) peta[m.id] = m.nama;
    return peta;
  }, [mapelQuery.data]);

  const arahku = useMemo(
    () =>
      keadaanArahku({
        pilihan: pilihanJalur.isError ? null : pilihanJalur.data,
        daftarJalur: daftarJalur.isError ? null : daftarJalur.data,
        tanda,
      }),
    [pilihanJalur.isError, pilihanJalur.data, daftarJalur.isError, daftarJalur.data, tanda]
  );

  const langkah = useMemo(
    () =>
      pilihLangkahBerikutnya({
        kelas,
        butirPribadi: butirPribadi.isError ? null : butirPribadi.data,
        butirUmum: butirUmum.isError ? null : butirUmum.data?.kategori.flatMap((k) => k.butir),
        kemajuan: kemajuan.isError ? null : kemajuan.data,
        eventSekolah: eventSekolah.isError ? null : eventSekolah.data,
        namaMapel,
        tahapanLinimasa: tahapanLinimasa.isError ? null : tahapanLinimasa.data,
      }),
    [
      kelas,
      butirPribadi.isError,
      butirPribadi.data,
      butirUmum.isError,
      butirUmum.data,
      kemajuan.isError,
      kemajuan.data,
      eventSekolah.isError,
      eventSekolah.data,
      namaMapel,
      tahapanLinimasa.isError,
      tahapanLinimasa.data,
    ]
  );

  const arahModal: ArahV2 = useMemo(
    () => ({
      keadaan: 'tanya',
      opsi: opsiArah(daftarJalur.isError ? null : daftarJalur.data),
      galatJaringan: daftarJalur.isError && !bukanGalatJaringan(daftarJalur.error),
      muatUlang: () => {
        void daftarJalur.refetch();
        void pilihanJalur.refetch();
      },
      simpanTanda,
      pilihJalur,
      lewatiSesiIni: onTutupModal,
    }),
    [daftarJalur, pilihanJalur, simpanTanda, pilihJalur, onTutupModal]
  );

  return { memuat, galatJaringan, muatUlang, arahku, langkah, arahModal };
}
