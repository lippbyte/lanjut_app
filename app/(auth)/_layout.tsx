import React, { useState } from 'react';
import { Redirect, Slot, usePathname, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { LayarMemuat } from '../../components/layout/LayarMemuat';
import { OnboardingScreen } from '../../components/screens/auth/OnboardingScreen';
import type { TujuanOnboarding } from '../../lib/onboarding';
import { useSesi } from '../../providers/AuthProvider';

// Masuk/Daftar hanya untuk yang belum masuk; begitu sesi terbentuk (login atau daftar
// sukses), layout ini yang memindahkan pengguna ke Linimasa.
//
// Onboarding cerita (lib/onboarding.ts) tampil di sini, hanya saat app dibuka tanpa sesi
// tersimpan. Selama tampil, Masuk/Daftar belum dipasang (kolom nama pengguna Masuk ber-autoFocus
// akan membuka keyboard di balik onboarding). Begitu pengguna memilih, layar tujuan dipasang di
// bawahnya dan onboarding memudar di atasnya.
export default function AuthGroupLayout() {
  const { status, perluOnboarding, selesaikanOnboarding } = useSesi();
  const router = useRouter();
  const pathname = usePathname();
  const [memudar, setMemudar] = useState(false);
  if (status === 'memuat') return <LayarMemuat />;
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

const s = StyleSheet.create({
  penuh: { flex: 1 },
});
