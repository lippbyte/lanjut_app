import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { type QueryClient, useQueryClient } from '@tanstack/react-query';

import * as authApi from '../api/auth';
import type { Pengguna, Sesi } from '../api/auth';
import { ApiError, saatSesiBerakhir } from '../api/client';

// Cache data milik akun (useKemajuan, useButirPribadi, useKartuSaya, useRiwayatLatihan, usePersetujuan,
// useLevelIn). Dibuang setiap sesi berganti supaya data akun A tidak pernah tampil di akun B.
const KUNCI_DATA_AKUN = [['kemajuan'], ['butir_pribadi'], ['kartu'], ['sesi_latihan'], ['persetujuan'], ['modul'], ['levelin'], ['event_sekolah'], ['pilihan_mapel']] as const;

function hapusDataAkun(queryClient: QueryClient) {
  for (const queryKey of KUNCI_DATA_AKUN) queryClient.removeQueries({ queryKey });
}

type StatusSesi = 'memuat' | 'masuk' | 'keluar';

/** Kenapa status jadi 'keluar' — layar Masuk menjelaskannya ke pengguna. */
export type AlasanKeluar = 'sesi_berakhir' | null;

type NilaiAuth = {
  status: StatusSesi;
  token: string | null;
  pengguna: Pengguna | null;
  alasanKeluar: AlasanKeluar;
  /** Onboarding cerita (lib/onboarding.ts) belum dilewati: app dibuka tanpa sesi tersimpan. */
  perluOnboarding: boolean;
  selesaikanOnboarding: () => void;
  terapkanSesi: (sesi: Sesi) => void;
  perbaruiPengguna: (profil: Pengguna) => Promise<void>;
  keluar: () => Promise<void>;
};

const AuthContext = createContext<NilaiAuth | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<StatusSesi>('memuat');
  const [token, setToken] = useState<string | null>(null);
  const [pengguna, setPengguna] = useState<Pengguna | null>(null);
  const [alasanKeluar, setAlasanKeluar] = useState<AlasanKeluar>(null);
  // Hanya diisi true di satu tempat: pemeriksaan sesi saat app dibuka, bila tidak ada sesi
  // tersimpan. Keluar atau sesi berakhir di tengah pemakaian tidak memunculkan onboarding.
  const [perluOnboarding, setPerluOnboarding] = useState(false);
  const queryClient = useQueryClient();
  // Token yang sedang dipakai, dibaca sinkron oleh pendengar 401 (jawaban
  // bisa datang sebelum render berikutnya). Diisi langsung di setiap
  // pergantian sesi, tidak menunggu render.
  const tokenRef = useRef<string | null>(null);
  // 401 dari POST /auth/keluar saat pengguna sendiri menekan Keluar bukan
  // "sesi berakhir" — jangan tampilkan pesan itu.
  const sedangKeluarRef = useRef(false);
  // Dibaca oleh perbaruiPengguna, yang bisa dipanggil setelah request
  // selesai — saat itu akun yang masuk mungkin sudah berganti.
  const penggunaIdRef = useRef<string | null>(null);
  penggunaIdRef.current = pengguna?.id ?? null;

  /**
   * Sesi ditolak server (401 TIDAK_MASUK / SESI_KEDALUWARSA), kapan pun —
   * saat app dibuka maupun di tengah pemakaian. Hapus token & data akun;
   * status 'keluar' membuat penjaga (app)/_layout.tsx membuka /masuk.
   */
  const akhiriSesi = useCallback(async () => {
    if (!tokenRef.current) return; // sudah ditangani (banyak request gagal sekaligus)
    tokenRef.current = null;
    await authApi.hapusSesiLokal();
    hapusDataAkun(queryClient);
    setToken(null);
    setPengguna(null);
    setAlasanKeluar('sesi_berakhir');
    setStatus('keluar');
  }, [queryClient]);

  // Didaftarkan sebelum pemeriksaan sesi awal di bawah (efek berjalan urut).
  useEffect(
    () =>
      saatSesiBerakhir((tokenDitolak) => {
        // Jawaban untuk sesi lama (sudah keluar / ganti akun) diabaikan.
        if (sedangKeluarRef.current || tokenDitolak !== tokenRef.current) return;
        void akhiriSesi();
      }),
    [akhiriSesi]
  );

  useEffect(() => {
    let batal = false;
    (async () => {
      const tersimpan = await authApi.bacaSesiTersimpan().catch(() => null);
      if (batal) return;
      if (!tersimpan) {
        setPerluOnboarding(true);
        setStatus('keluar');
        return;
      }
      tokenRef.current = tersimpan.token;
      setToken(tersimpan.token);
      setPengguna(tersimpan.pengguna);
      setStatus('masuk');

      // Token yang ditolak server (dicabut/kedaluwarsa) dibuang; galat
      // jaringan tidak — pengguna tetap masuk selama offline.
      try {
        const profil = await authApi.saya(tersimpan.token);
        if (batal) return;
        setPengguna(profil);
        await authApi.simpanPengguna(profil);
      } catch (err) {
        if (batal) return;
        // Biasanya sudah ditangani pendengar 401; ini jaring pengaman untuk
        // 401 dengan kode lain. akhiriSesi aman dipanggil dua kali.
        if (err instanceof ApiError && err.status === 401) await akhiriSesi();
      }
    })();
    return () => {
      batal = true;
    };
  }, [akhiriSesi]);

  const terapkanSesi = useCallback((sesi: Sesi) => {
    // Data milik akun (mis. kemajuan) tidak boleh terbawa ke akun lain.
    hapusDataAkun(queryClient);
    tokenRef.current = sesi.token;
    setToken(sesi.token);
    setPengguna(sesi.pengguna);
    setAlasanKeluar(null);
    setStatus('masuk');
  }, [queryClient]);

  /** Profil terbaru dari server (mis. hasil PATCH /pengguna/saya). Diabaikan
   * kalau sudah keluar atau berganti akun sejak request dikirim. */
  const perbaruiPengguna = useCallback(async (profil: Pengguna) => {
    if (penggunaIdRef.current !== profil.id) return;
    setPengguna(profil);
    await authApi.simpanPengguna(profil);
  }, []);

  const keluar = useCallback(async () => {
    sedangKeluarRef.current = true;
    try {
      if (token) await authApi.keluar(token);
      else await authApi.hapusSesiLokal();
    } finally {
      sedangKeluarRef.current = false;
    }
    tokenRef.current = null;
    hapusDataAkun(queryClient);
    setToken(null);
    setPengguna(null);
    setAlasanKeluar(null);
    setStatus('keluar');
  }, [token, queryClient]);

  const selesaikanOnboarding = useCallback(() => setPerluOnboarding(false), []);

  const nilai = useMemo(
    () => ({ status, token, pengguna, alasanKeluar, perluOnboarding, selesaikanOnboarding, terapkanSesi, perbaruiPengguna, keluar }),
    [status, token, pengguna, alasanKeluar, perluOnboarding, selesaikanOnboarding, terapkanSesi, perbaruiPengguna, keluar]
  );

  return <AuthContext.Provider value={nilai}>{children}</AuthContext.Provider>;
}

export function useSesi(): NilaiAuth {
  const nilai = useContext(AuthContext);
  if (!nilai) throw new Error('useSesi harus dipakai di dalam <AuthProvider>');
  return nilai;
}
