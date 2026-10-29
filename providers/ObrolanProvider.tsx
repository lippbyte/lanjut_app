import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { ApiError, apiFetch } from '../api/client';
import type { BalasanNgobrol, KartuBantuan, PesanNgobrol, SumberModul, SumberWeb, TautanNgobrol } from '../api/types';
import { KUNCI_PERSETUJUAN } from '../hooks/usePersetujuan';
import { RIWAYAT_MAKS, pesanGalatNgobrol } from '../lib/ngobrol';
import { useSesi } from './AuthProvider';

/**
 * `galat` = pemberitahuan gagal kirim; tampil di layar, TIDAK ikut dikirim ke AI.
 * LANJUT_053: `kartu` = kartu bantuan dari server; `ujiCoba` = balasan saat AI
 * dimatikan; `disamarkan` = data pribadi di pesan siswa ini disamarkan server.
 */
export type Pesan = {
  id: number;
  dari: 'pengguna' | 'bot' | 'galat';
  teks: string;
  kartu?: KartuBantuan;
  ujiCoba?: boolean;
  disamarkan?: boolean;
  /** LANJUT_055: sumber jawaban materi (disusun server) dan kuota web habis. */
  sumber?: { modul: SumberModul[]; web: SumberWeb[] };
  webHabis?: boolean;
  /** LANJUT_078: kartu tautan (≤3) dari server; hanya untuk balasan AI, bukan uji coba. */
  tautan?: TautanNgobrol[];
};

type NilaiObrolan = {
  pesan: Pesan[];
  mengetik: boolean;
  kirim: (isi: string) => void;
  /** Kirim ulang riwayat yang sama setelah gagal (pesan siswa tidak diduplikasi). */
  cobaLagi: () => void;
};

const Konteks = createContext<NilaiObrolan | null>(null);

/**
 * Riwayat Ngobrol Bareng LANJUT (LANJUT_032, AI sejak LANJUT_051) — HANYA di memori.
 *
 * Tidak ditulis ke AsyncStorage dan tidak disimpan server. Tiap pesan baru,
 * riwayat sesi ini (maks. RIWAYAT_MAKS pesan terakhir) dikirim ke POST
 * /ngobrol; server memeriksa gerbang persetujuan lalu meneruskannya ke AI.
 * Provider dipasang di layout (app) dengan key = id pengguna, jadi riwayat
 * hilang saat keluar akun, ganti akun, atau aplikasi ditutup.
 */
export function ObrolanProvider({ namaTampilan, children }: { namaTampilan?: string; children: React.ReactNode }) {
  const { token } = useSesi();
  const queryClient = useQueryClient();
  const penghitung = useRef(1);
  const terpasang = useRef(true);
  const [mengetik, setMengetik] = useState(false);
  const [pesan, setPesan] = useState<Pesan[]>(() => [
    {
      id: 0,
      dari: 'bot',
      teks: `Hai${namaTampilan ? `, ${namaTampilan}` : ''}! Aku teman ngobrolmu di LANJUT. Mau cerita soal minat, cara belajar, atau rencana kuliahmu?`,
    },
  ]);
  const pesanRef = useRef(pesan);
  pesanRef.current = pesan;

  useEffect(
    () => () => {
      terpasang.current = false;
    },
    []
  );

  const minta = useCallback(
    async (riwayat: Pesan[]) => {
      setMengetik(true);
      const dikirim: PesanNgobrol[] = riwayat
        .filter((m): m is Pesan & { dari: 'pengguna' | 'bot' } => m.dari !== 'galat')
        .slice(-RIWAYAT_MAKS)
        .map((m) => ({ peran: m.dari, teks: m.teks }));
      try {
        const hasil = await apiFetch<BalasanNgobrol>('/ngobrol', { method: 'POST', body: { pesan: dikirim }, token: token! });
        if (!terpasang.current) return;
        const idSiswa = riwayat[riwayat.length - 1].id;
        setPesan((p) => [
          ...p.map((m) => (m.id === idSiswa && hasil.data_pribadi_disamarkan ? { ...m, disamarkan: true } : m)),
          {
            id: penghitung.current++,
            dari: 'bot',
            teks: hasil.balasan,
            ...(hasil.kartu_bantuan ? { kartu: hasil.kartu_bantuan } : {}),
            ...(hasil.uji_coba ? { ujiCoba: true } : {}),
            ...(hasil.sumber && (hasil.sumber.modul.length || hasil.sumber.web.length) ? { sumber: hasil.sumber } : {}),
            ...(hasil.web_habis ? { webHabis: true } : {}),
            ...(!hasil.uji_coba && hasil.tautan && hasil.tautan.length ? { tautan: hasil.tautan } : {}),
          },
        ]);
      } catch (err) {
        if (!terpasang.current) return;
        setPesan((p) => [...p, { id: penghitung.current++, dari: 'galat', teks: pesanGalatNgobrol(err) }]);
        // Persetujuan dicabut di tengah sesi: muat ulang status supaya layar terkunci.
        if (err instanceof ApiError && err.kode === 'AI_BELUM_DIIZINKAN') {
          queryClient.invalidateQueries({ queryKey: KUNCI_PERSETUJUAN });
        }
      } finally {
        if (terpasang.current) setMengetik(false);
      }
    },
    [token, queryClient]
  );

  const kirim = useCallback(
    (isi: string) => {
      if (mengetik || !token) return;
      const baru: Pesan = { id: penghitung.current++, dari: 'pengguna', teks: isi };
      const riwayat = [...pesanRef.current, baru];
      setPesan(riwayat);
      minta(riwayat);
    },
    [mengetik, token, minta]
  );

  const cobaLagi = useCallback(() => {
    if (mengetik || !token) return;
    // Buang pemberitahuan galat terakhir, lalu kirim ulang riwayat yang sama.
    const riwayat = pesanRef.current.filter((m, i, semua) => !(m.dari === 'galat' && i === semua.length - 1));
    if (riwayat[riwayat.length - 1]?.dari !== 'pengguna') return;
    setPesan(riwayat);
    minta(riwayat);
  }, [mengetik, token, minta]);

  return <Konteks.Provider value={{ pesan, mengetik, kirim, cobaLagi }}>{children}</Konteks.Provider>;
}

export function useObrolan(): NilaiObrolan {
  const nilai = useContext(Konteks);
  if (!nilai) throw new Error('useObrolan() harus dipakai di dalam <ObrolanProvider>.');
  return nilai;
}
