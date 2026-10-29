import React, { useState } from 'react';
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  useFonts,
} from '@expo-google-fonts/poppins';
import { Slot } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { LayarMemuat } from '../components/layout/LayarMemuat';
import { PembukaKelinci, TandaSesiSiap } from '../components/layout/PembukaKelinci';
import { AuthProvider } from '../providers/AuthProvider';
import { QueryProvider } from '../providers/QueryProvider';

/**
 * Root layout hanya memasang provider dan memuat Poppins (huruf PWA).
 * Penjagaan rute ada di layout grup: app/(auth)/_layout.tsx (Masuk/Daftar,
 * khusus yang belum masuk) dan app/(app)/_layout.tsx (khusus yang sudah masuk).
 * Di atas semuanya: layar pembuka kelinci (lib/pembuka.ts), sekali tiap app dibuka.
 */
export default function RootLayout() {
  const [hurufSiap, galatHuruf] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
  });
  const [sesiSiap, setSesiSiap] = useState(false);

  // Galat muat huruf tidak boleh mengunci aplikasi — jatuh ke huruf sistem.
  const hurufBeres = hurufSiap || !!galatHuruf;

  // Urutan anak tetap (status bar, isi, pembuka) supaya PembukaKelinci tidak
  // dipasang ulang saat huruf selesai dimuat. Ikon status bar gelap sejak render
  // pertama, supaya jam & baterai terbaca di atas app bar yang berwarna terang.
  return (
    <View style={s.akar}>
      <StatusBar style="dark" />
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
  );
}

const s = StyleSheet.create({
  akar: { flex: 1 },
});
