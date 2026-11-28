import Constants from 'expo-constants';
import { useCallback, useMemo } from 'react';

import { ApiError } from '../api/client';
import type {
  ButirDaftarPeriksa,
  EventSekolah,
  IsiEvent,
  KategoriDaftarPeriksa,
  Mapel,
  PilihanKartuEvent,
  Prodi,
} from '../api/types';
import { gabungButirPribadi, hitungProgres, perluCatatanSnpmb, type Progres } from '../lib/daftarPeriksa';
import { untukPersiapanEvent } from '../lib/eventSekolah';
import { navigasiV2Aktif } from '../lib/fiturApp';
import { bentukKirimanRisetProdi, modeLangkahSaya, rencanakanAlihButir } from '../lib/langkahSayaV2';
import { useSesi } from '../providers/AuthProvider';
import { useButirPribadi, useHapusButirPribadi, useTandaiButirPribadi } from './useButirPribadi';
import { useSimpanButirPribadi } from './useButirPribadi';
import { useEventSekolah, useHapusEvent, usePilihanKartuEvent, useSimpanEvent } from './useEventSekolah';
import { useKemajuan, useTandaiKemajuan } from './useKemajuan';
import { useMapel } from './useMapel';
import { useProdi } from './useProdi';
import { useProgresDaftarPeriksa, useSaringDaftarPeriksa } from './useProgresDaftarPeriksa';

const NAVIGASI_V2 = navigasiV2Aktif(Constants.expoConfig?.extra);

const bukanGalatJaringan = (e: unknown) => e instanceof ApiError && (e.status === 403 || e.status === 404);

export type DataLangkahSayaV2 = {
  mode: 'kelas12' | 'smp' | 'sma1011';
  memuat: boolean;
  galatJaringan: boolean;
  muatUlang: () => void;
  saring: {
    kelas: string | null;
    jalurSeleksi: string | null;
    pilihKelas: (k: string) => void;
    pilihJalur: (j: string) => void;
  };
  perluPilihJalur: boolean;
  kategori: KategoriDaftarPeriksa[];
  selesaiIds: ReadonlySet<string>;
  pribadiIds: ReadonlySet<string>;
  progres: Progres;
  adaCatatanSnpmb: boolean;
  alihButir: (butir: ButirDaftarPeriksa) => void;
  hapusButirPribadi: (id: string) => void;
  sedangHapusButir: boolean;
  galatAksiButir: boolean;
  risetProdi: {
    daftarProdi: Prodi[];
    memuatProdi: boolean;
    galatProdi: boolean;
    muatUlangProdi: () => void;
    prodiSudahTersimpanIds: ReadonlySet<string>;
    simpan: (prodiId: string, onSukses: () => void) => void;
    sedangSimpan: boolean;
    galatSimpan: { status?: number; kode?: string } | null;
    resetGalatSimpan: () => void;
  };
  smp: {
    bisaEvent: boolean;
    daftarEvent: EventSekolah[];
    mapel: Mapel[];
    pilihanKartu: PilihanKartuEvent[];
    simpanEvent: (p: { id?: string; isi: IsiEvent }, onSukses: () => void) => void;
    sedangSimpanEvent: boolean;
    kodeGalatSimpanEvent?: string;
    galatSimpanEvent: boolean;
    hapusEvent: (id: string, onSukses?: () => void) => void;
    sedangHapusEvent: boolean;
    galatHapusEvent: boolean;
  };
};

/**
 * Menggabungkan seluruh perilaku data Daftar Periksa v1 untuk layar Langkah Saya v2 (`/langkah-saya`):
 * - Kelas 12: `useSaringDaftarPeriksa` + `useProgresDaftarPeriksa` + `useTandaiKemajuan` + `butir_pribadi`.
 * - Kelas 7–9 (SMP): `butir_pribadi` + pengelolaan `event_sekolah` (`useEventSekolah`, `useSimpanEvent`, `useHapusEvent`).
 * - Kelas 10–11: `butir_pribadi` (centang, batal-centang, hapus).
 */
export function useLangkahSayaV2(): DataLangkahSayaV2 {
  const { token, pengguna } = useSesi();
  const kelasAkun = pengguna?.kelas ?? null;
  const mode = modeLangkahSaya(kelasAkun);
  const aktif = NAVIGASI_V2 && !!token;
  const untukSmp = untukPersiapanEvent(kelasAkun);

  const saring = useSaringDaftarPeriksa();
  const hasilKelas12 = useProgresDaftarPeriksa(
    mode === 'kelas12' ? saring : { kelas: null, jalur_seleksi: null, rumpun: null, isPending: false }
  );
  const pribadiQuery = useButirPribadi();
  const kemajuanQuery = useKemajuan();
  const prodiQuery = useProdi();

  const tandaiKemajuan = useTandaiKemajuan();
  const tandaiPribadi = useTandaiButirPribadi();
  const hapusPribadi = useHapusButirPribadi();
  const simpanPribadi = useSimpanButirPribadi();

  const eventQuery = useEventSekolah(aktif && untukSmp);
  const mapelQuery = useMapel();
  const pilihanKartuQuery = usePilihanKartuEvent(aktif && untukSmp && Boolean(eventQuery.data));
  const simpanEventMut = useSimpanEvent();
  const hapusEventMut = useHapusEvent();

  const dataPribadiSaja = useMemo(() => {
    const daftar = pribadiQuery.data ?? [];
    const kategori = gabungButirPribadi([], daftar).filter((k) => k.butir.length > 0);
    const selesai = new Set(daftar.filter((b) => Boolean(b.selesai_pada)).map((b) => b.id));
    const pribadiIds = new Set(daftar.map((b) => b.id));
    return {
      kategori,
      selesai,
      pribadiIds,
      progres: hitungProgres(kategori, selesai),
    };
  }, [pribadiQuery.data]);

  const perluPilihJalur = mode === 'kelas12' && !saring.isPending && (!saring.kelas || !saring.jalur_seleksi);

  const sumberAktif =
    mode === 'kelas12' && !perluPilihJalur && hasilKelas12.data
      ? hasilKelas12.data
      : dataPribadiSaja;

  const alihButir = useCallback(
    (butir: ButirDaftarPeriksa) => {
      const rencana = rencanakanAlihButir({
        butirId: butir.id,
        pribadiIds: sumberAktif.pribadiIds,
        selesaiIds: sumberAktif.selesai,
      });
      if (rencana.sasaran === 'butir_pribadi') {
        tandaiPribadi.mutate({ id: rencana.id, selesai: rencana.selesai });
      } else {
        tandaiKemajuan.mutate({ butirId: rencana.butirId, selesai: rencana.selesai });
      }
    },
    [sumberAktif.pribadiIds, sumberAktif.selesai, tandaiPribadi, tandaiKemajuan]
  );

  const hapusButirPribadi = useCallback(
    (id: string) => {
      hapusPribadi.mutate(id);
    },
    [hapusPribadi]
  );

  const muatUlang = useCallback(() => {
    void pribadiQuery.refetch();
    void kemajuanQuery.refetch();
    if (mode === 'kelas12' || mode === 'sma1011') void prodiQuery.refetch();
    if (untukSmp) {
      void eventQuery.refetch();
      void mapelQuery.refetch();
    }
  }, [pribadiQuery, kemajuanQuery, prodiQuery, eventQuery, mapelQuery, mode, untukSmp]);

  const prodiSudahTersimpanIds = useMemo(
    () =>
      new Set(
        (pribadiQuery.data ?? [])
          .filter((b) => b.jenis === 'riset_kampus' && Boolean(b.prodi_id))
          .map((b) => b.prodi_id)
      ),
    [pribadiQuery.data]
  );

  const simpanRisetProdi = useCallback(
    (prodiId: string, onSukses: () => void) => {
      const kiriman = bentukKirimanRisetProdi(prodiId);
      if (!kiriman) return;
      simpanPribadi.mutate(kiriman, { onSuccess: onSukses });
    },
    [simpanPribadi]
  );

  const galatSimpanRisetProdi = simpanPribadi.isError
    ? simpanPribadi.error instanceof ApiError
      ? { status: simpanPribadi.error.status, kode: simpanPribadi.error.kode }
      : {}
    : null;

  const memuat =
    mode === 'kelas12'
      ? Boolean(saring.isPending) || (!perluPilihJalur && hasilKelas12.isPending) || (perluPilihJalur && pribadiQuery.isPending)
      : pribadiQuery.isPending || (untukSmp && eventQuery.isPending);

  const galatJaringan =
    mode === 'kelas12'
      ? (!perluPilihJalur && hasilKelas12.isError) ||
        (perluPilihJalur && pribadiQuery.isError && !bukanGalatJaringan(pribadiQuery.error))
      : (pribadiQuery.isError && !bukanGalatJaringan(pribadiQuery.error)) ||
        (untukSmp && eventQuery.isError && !bukanGalatJaringan(eventQuery.error));

  const adaCatatanSnpmb =
    mode === 'kelas12' && !perluPilihJalur ? perluCatatanSnpmb(sumberAktif.kategori, sumberAktif.pribadiIds) : false;

  const kodeGalatSimpanEvent = simpanEventMut.error instanceof ApiError ? simpanEventMut.error.kode : undefined;

  return {
    mode,
    memuat,
    galatJaringan,
    muatUlang,
    saring: {
      kelas: saring.kelas,
      jalurSeleksi: saring.jalur_seleksi,
      pilihKelas: (k: string) => saring.pilih({ kelas: k }),
      pilihJalur: (j: string) => saring.pilih({ jalur_seleksi: j }),
    },
    perluPilihJalur,
    kategori: sumberAktif.kategori,
    selesaiIds: sumberAktif.selesai,
    pribadiIds: sumberAktif.pribadiIds,
    progres: sumberAktif.progres,
    adaCatatanSnpmb,
    alihButir,
    hapusButirPribadi,
    sedangHapusButir: hapusPribadi.isPending,
    galatAksiButir: tandaiKemajuan.isError || tandaiPribadi.isError || hapusPribadi.isError,
    risetProdi: {
      daftarProdi: prodiQuery.data ?? [],
      memuatProdi: prodiQuery.isPending,
      galatProdi: prodiQuery.isError,
      muatUlangProdi: () => {
        void prodiQuery.refetch();
      },
      prodiSudahTersimpanIds,
      simpan: simpanRisetProdi,
      sedangSimpan: simpanPribadi.isPending,
      galatSimpan: galatSimpanRisetProdi,
      resetGalatSimpan: () => simpanPribadi.reset(),
    },
    smp: {
      bisaEvent: untukSmp && !eventQuery.isError && Boolean(eventQuery.data),
      daftarEvent: eventQuery.data ?? [],
      mapel: mapelQuery.data ?? [],
      pilihanKartu: pilihanKartuQuery.data ?? [],
      simpanEvent: ({ id, isi }, onSukses) => simpanEventMut.mutate({ id, isi }, { onSuccess: onSukses }),
      sedangSimpanEvent: simpanEventMut.isPending,
      kodeGalatSimpanEvent,
      galatSimpanEvent: simpanEventMut.isError,
      hapusEvent: (id, onSukses) => hapusEventMut.mutate(id, { onSuccess: onSukses }),
      sedangHapusEvent: hapusEventMut.isPending,
      galatHapusEvent: hapusEventMut.isError,
    },
  };
}
