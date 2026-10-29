import React, { useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Linking, Platform, View } from 'react-native';

import * as authApi from '../../../api/auth';
import { type ExtraGoogle, KUNCI_NONCE_GOOGLE, bangunUrlGoogle, konfigurasiGoogle } from '../../../lib/googleMasuk';
import { Tombol } from '../../ui';
import { PesanGalat } from './AuthUI';

function asalWeb(): string | null {
  return Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : null;
}

/**
 * LANJUT_083 — "Masuk dengan Google". Tidak dirender sama sekali bila Client ID
 * (EXPO_PUBLIC_GOOGLE_CLIENT_ID) kosong, atau di Android/iOS bila alamat halaman
 * penerus belum diisi (lib/googleMasuk.ts → konfigurasiGoogle).
 */
export function TombolGoogle() {
  const konfig = useMemo(
    () => konfigurasiGoogle(Constants.expoConfig?.extra as ExtraGoogle, Platform.OS, asalWeb()),
    []
  );
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  if (!konfig) return null;

  const mulai = async () => {
    setProses(true);
    setGalat(null);
    try {
      const nonce = await authApi.ambilNonceGoogle();
      await AsyncStorage.setItem(KUNCI_NONCE_GOOGLE, nonce);
      const url = bangunUrlGoogle(konfig, nonce);
      if (Platform.OS === 'web') window.location.assign(url);
      else await Linking.openURL(url);
    } catch (err) {
      setGalat(authApi.pesanUntuk(err));
    } finally {
      setProses(false);
    }
  };

  return (
    <View>
      <Tombol label="Masuk dengan Google" varian="garis" penuh proses={proses} onPress={mulai} />
      <PesanGalat teks={galat} />
    </View>
  );
}
