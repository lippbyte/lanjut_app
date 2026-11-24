import React, { useState } from 'react';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  useFonts,
} from '@expo-google-fonts/poppins';
import Constants from 'expo-constants';
import { Slot } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LayarMemuat } from '../components/layout/LayarMemuat';
import { StatusBarV2, TemaV2Provider } from '../components/screens/v2/TemaV2Provider';
import { alurMasukV2Aktif } from '../lib/fiturApp';
import { aturMinTampil, minTampilMs } from '../lib/pembuka';
import { PembukaKelinci, TandaSesiSiap } from '../components/layout/PembukaKelinci';
import { AuthProvider } from '../providers/AuthProvider';
import { QueryProvider } from '../providers/QueryProvider';

/**
 * Root layout hanya memasang provider dan memuat Poppins (huruf PWA).
 * Penjagaan rute ada di layout grup: app/(auth)/_layout.tsx (Masuk/Daftar,
 * khusus yang belum masuk) dan app/(app)/_layout.tsx (khusus yang sudah masuk).
 * Di atas semuanya: layar pembuka kelinci (lib/pembuka.ts), sekali tiap app dibuka.
 */
// LANJUT_030: alur masuk v2 (saklar EXPO_PUBLIC_ALUR_MASUK_V2, mati bawaan).
const ALUR_MASUK_V2 = alurMasukV2Aktif(Constants.expoConfig?.extra);
// Layar pembuka minimal 800 ms di v2; v1 tetap 2 detik (lib/pembuka.ts).
aturMinTampil(minTampilMs(ALUR_MASUK_V2));
// Source Sans 3 (isi, design.md §3) hanya dimuat bila alur v2 menyala. Berkas lokal berlisensi SIL OFL
// (assets/fonts/). Galeri komponen dev memuatnya sendiri.
const HURUF_V2 = ALUR_MASUK_V2
  ? {
      SourceSans3_400Regular: require('../assets/fonts/SourceSans3_400Regular.ttf'),
      SourceSans3_600SemiBold: require('../assets/fonts/SourceSans3_600SemiBold.ttf'),
    }
  : {};

export default function RootLayout() {
  const [hurufSiap, galatHuruf] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    ...HURUF_V2,
  });
  const [sesiSiap, setSesiSiap] = useState(false);

  // Galat muat huruf tidak boleh mengunci aplikasi — jatuh ke huruf sistem.
  const hurufBeres = hurufSiap || !!galatHuruf;

  // Urutan anak tetap (status bar, isi, pembuka) supaya PembukaKelinci tidak
  // dipasang ulang saat huruf selesai dimuat. Ikon status bar gelap sejak render
  // pertama, supaya jam & baterai terbaca di atas app bar yang berwarna terang.
  return (
    <TemaV2Provider>
      <View style={s.akar}>
        <StatusBarV2 />
        {hurufBeres ? (
          <SafeAreaProvider>
            <QueryProvider>
              <AuthProvider>
                <Slot />
                <TandaSesiSiap onSiap={setSesiSiap} />
              </AuthProvider>
            </QueryProvider>
          </SafeAreaProvider>
        ) : (
          <LayarMemuat />
        )}
        <PembukaKelinci siap={hurufBeres && sesiSiap} />
      </View>
    </TemaV2Provider>
  );
}

const s = StyleSheet.create({
  akar: { flex: 1 },
});
