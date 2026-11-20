import React, { useState } from 'react';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LayarMemuat } from '../../components/layout/LayarMemuat';
import { OnboardingScreen } from '../../components/screens/auth/OnboardingScreen';
import { PengantarV2 } from '../../components/screens/v2/PengantarV2';
import { alurMasukV2Aktif } from '../../lib/fiturApp';
import { ruteAwalApp } from '../../lib/navigasiV2';
import type { TujuanOnboarding } from '../../lib/onboarding';
import { useSesi } from '../../providers/AuthProvider';
import Constants from 'expo-constants';

// LANJUT_030: saklar dibaca sekali saat modul dimuat (nilai build, tidak berubah selama app jalan).
const ALUR_MASUK_V2 = alurMasukV2Aktif(Constants.expoConfig?.extra);
// LANJUT_031: alur v1 dan v2 sama-sama berujung ke navigasi yang sedang aktif menurut saklar.
const TUJUAN_MASUK = ruteAwalApp(Constants.expoConfig?.extra);

// Masuk/Daftar hanya untuk yang belum masuk; begitu sesi terbentuk (login atau daftar
// sukses), layout ini yang memindahkan pengguna ke Linimasa.
//
// Onboarding cerita (lib/onboarding.ts) tampil di sini, hanya saat app dibuka tanpa sesi
// tersimpan. Selama tampil, Masuk/Daftar belum dipasang (kolom nama pengguna Masuk ber-autoFocus
// akan membuka keyboard di balik onboarding). Begitu pengguna memilih, layar tujuan dipasang di
// bawahnya dan onboarding memudar di atasnya.
function AuthGroupLayout() {
  const { status, perluOnboarding, selesaikanOnboarding } = useSesi();
  const router = useRouter();
  const pathname = usePathname();
  const [memudar, setMemudar] = useState(false);
  if (status === 'memuat') return <LayarMemuat />;
  if (status === 'masuk' && TUJUAN_MASUK !== '/linimasa') return <Redirect href={TUJUAN_MASUK} />;
  if (status === 'masuk') return <Redirect href="/linimasa" />;

  const pilih = (tujuan: TujuanOnboarding) => {
    if (tujuan === 'daftar' && pathname !== '/daftar') router.replace('/daftar');
    if (tujuan === 'masuk' && pathname !== '/masuk') router.replace('/masuk');
    setMemudar(true);
    selesaikanOnboarding();
  };

  return (
    <View style={s.penuh}>
      {perluOnboarding ? null : <Slot />}
      {perluOnboarding || memudar ? (
        <OnboardingScreen keluar={!perluOnboarding} onPilih={pilih} onHilang={() => setMemudar(false)} />
      ) : null}
    </View>
  );
}

/**
 * Alur masuk v2 (LANJUT_030, saklar EXPO_PUBLIC_ALUR_MASUK_V2): pengantar tiga kartu menggantikan
 * onboarding cerita, dengan tujuan yang sama ('daftar', 'masuk', 'semula'). Kapan tampil juga sama
 * (perluOnboarding: app dibuka tanpa sesi tersimpan). Saat saklar mati, AuthGroupLayout v1 di atas
 * yang dipakai, tanpa perubahan.
 */
function AuthGroupLayoutV2() {
  const { status, perluOnboarding, selesaikanOnboarding } = useSesi();
  const router = useRouter();
  const pathname = usePathname();
  if (status === 'memuat') return <LayarMemuat />;
  if (status === 'masuk' && TUJUAN_MASUK !== '/linimasa') return <Redirect href={TUJUAN_MASUK} />;
  if (status === 'masuk') return <Redirect href="/linimasa" />;

  const pilih = (tujuan: TujuanOnboarding) => {
    if (tujuan === 'daftar' && pathname !== '/daftar') router.replace('/daftar');
    if (tujuan === 'masuk' && pathname !== '/masuk') router.replace('/masuk');
    selesaikanOnboarding();
  };

  return <View style={s.penuh}>{perluOnboarding ? <PengantarV2 onPilih={pilih} /> : <Slot />}</View>;
}

export default ALUR_MASUK_V2 ? AuthGroupLayoutV2 : AuthGroupLayout;

const s = StyleSheet.create({
  penuh: { flex: 1 },
});
