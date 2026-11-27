import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Constants from 'expo-constants';
import { StatusBar } from 'expo-status-bar';
import { Platform, StyleSheet, View, useColorScheme } from 'react-native';

import { modeGelapAktif } from '../../../lib/fiturApp';
import {
  tentukanModeAktif,
  uraiPilihanMode,
  type PilihanMode,
  type SkemaSistem,
} from '../../../lib/modeTampilan';
import {
  bacaModeLokal,
  bacaModeLokalSinkron,
  simpanModeLokal,
} from '../../../lib/simpanModeTampilan';
import { TEMA_WARNA } from '../../../theme/v2';
import { TemaV2Context, useTemaV2 } from '../../../theme/v2/konteks';

export { useTemaV2 };

const SAKLAR_MODE_GELAP = modeGelapAktif(Constants.expoConfig?.extra);

function bacaSkemaWeb(): SkemaSistem {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return null;
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/**
 * Penyedia tema dua mode v2 (LANJUT_031b, saklar EXPO_PUBLIC_MODE_GELAP, mati bawaan).
 * - Saklar mati: selalu terang, mengabaikan pengaturan sistem, tanpa membaca penyimpanan perangkat.
 * - Saklar menyala: membaca pilihan lokal lewat `lib/simpanModeTampilan.ts`, mengikuti
 *   `useColorScheme()` saat pilihan `sistem`, mengganti tema seketika tanpa kedip atau muat ulang.
 */
export function TemaV2Provider({ children }: { children: React.ReactNode }) {
  const skemaRN = useColorScheme();
  const [skemaWeb, setSkemaWeb] = useState<SkemaSistem>(bacaSkemaWeb);
  const [pilihan, setPilihan] = useState<PilihanMode>(() => bacaModeLokalSinkron(SAKLAR_MODE_GELAP));

  useEffect(() => {
    if (!SAKLAR_MODE_GELAP || Platform.OS !== 'web' || typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const perbarui = () => setSkemaWeb(mq.matches ? 'dark' : 'light');
    perbarui();
    mq.addEventListener('change', perbarui);
    return () => mq.removeEventListener('change', perbarui);
  }, []);

  const skemaSistem: SkemaSistem = Platform.OS === 'web' ? skemaWeb : skemaRN;

  useEffect(() => {
    if (!SAKLAR_MODE_GELAP) return;
    let aktif = true;
    void bacaModeLokal().then((p) => {
      if (aktif) setPilihan(p);
    });
    return () => {
      aktif = false;
    };
  }, []);

  const ubahPilihan = useCallback((baru: PilihanMode) => {
    if (!SAKLAR_MODE_GELAP) return;
    const sah = uraiPilihanMode(baru);
    setPilihan(sah);
    void simpanModeLokal(sah);
  }, []);

  const mode = tentukanModeAktif({
    saklarAktif: SAKLAR_MODE_GELAP,
    pilihan,
    skemaSistem,
  });
  const warna = TEMA_WARNA[mode];

  useEffect(() => {
    if (!SAKLAR_MODE_GELAP || Platform.OS !== 'web' || typeof document === 'undefined') return;
    document.documentElement.style.backgroundColor = warna.halaman;
    document.documentElement.style.colorScheme = mode === 'gelap' ? 'dark' : 'light';
    if (document.body) {
      document.body.style.backgroundColor = warna.halaman;
    }
  }, [mode, warna.halaman]);

  const nilai = useMemo(
    () => ({
      mode,
      warna,
      pilihan,
      ubahPilihan,
      saklarAktif: SAKLAR_MODE_GELAP,
    }),
    [mode, warna, pilihan, ubahPilihan]
  );

  return (
    <TemaV2Context.Provider value={nilai}>
      <View style={StyleSheet.flatten([s.akar, SAKLAR_MODE_GELAP ? { backgroundColor: warna.halaman } : null])}>
        {children}
      </View>
    </TemaV2Context.Provider>
  );
}

/**
 * Bilah status HP yang mengikuti mode aktif v2. Saat saklar mati, tetap `style="dark"` seperti v1.
 */
export function StatusBarV2() {
  const { mode } = useTemaV2();
  return <StatusBar style={mode === 'gelap' ? 'light' : 'dark'} />;
}

const s = StyleSheet.create({
  akar: { flex: 1 },
});
