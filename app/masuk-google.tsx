import React, { useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Platform, View } from 'react-native';

import { AuthLayout, Keterangan, PesanGalat, TombolUtama, authStyles } from '../components/screens/auth/AuthUI';
import { useAuth } from '../hooks/useAuth';
import { KUNCI_NONCE_GOOGLE, hasilDariFragmen, hasilDariParam, hasilSah } from '../lib/googleMasuk';
import { useSesi } from '../providers/AuthProvider';
import { color } from '../theme/tokens';

// DRAF (docs/salinan-teks-lanjut.md §4.21), belum disetujui PM.
const PESAN_GAGAL = 'Masuk dengan Google belum berhasil. Coba lagi dari layar Masuk.';

/**
 * LANJUT_083 — tujuan kembali dari Google (alur lengkap di lib/googleMasuk.ts).
 * Di luar grup (auth) supaya tetap terpasang walau onboarding sedang tampil saat
 * app dibuka lewat tautan `lanjut://masuk-google?...`.
 */
export default function MasukGoogle() {
  const param = useLocalSearchParams();
  const router = useRouter();
  const { status } = useSesi();
  const { loginGoogle, error } = useAuth();
  const [galat, setGalat] = useState<string | null>(null);
  const [selesai, setSelesai] = useState(false);
  const sudahJalan = useRef(false);

  useEffect(() => {
    if (sudahJalan.current) return;
    sudahJalan.current = true;
    (async () => {
      const web = Platform.OS === 'web' && typeof window !== 'undefined';
      const hasil = web && window.location.hash ? hasilDariFragmen(window.location.hash) : hasilDariParam(param);
      // Token tidak dibiarkan di bilah alamat maupun riwayat peramban.
      if (web) window.history.replaceState(null, '', window.location.pathname);
      const nonce = await AsyncStorage.getItem(KUNCI_NONCE_GOOGLE).catch(() => null);
      await AsyncStorage.removeItem(KUNCI_NONCE_GOOGLE).catch(() => {});
      if (!hasilSah(hasil, nonce)) {
        setGalat(PESAN_GAGAL);
        setSelesai(true);
        return;
      }
      await loginGoogle(hasil.idToken, nonce as string);
      setSelesai(true);
    })();
    // Sekali saja saat layar dibuka; param dibaca pada saat itu.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (status === 'masuk') return <Redirect href="/linimasa" />;

  const pesan = galat ?? error;
  return (
    <AuthLayout judul="Masuk dengan Google" pengantar="Sebentar, kami memeriksa akun Google-mu.">
      <View style={authStyles.form}>
        {!selesai ? <ActivityIndicator color={color.blue500} /> : null}
        {selesai && pesan ? <PesanGalat teks={pesan} /> : null}
        {selesai ? (
          <>
            <Keterangan>Kamu juga bisa masuk dengan kata sandi atau kode email.</Keterangan>
            <TombolUtama label="Kembali ke Masuk" labelProses="" proses={false} onPress={() => router.replace('/masuk')} />
          </>
        ) : null}
      </View>
    </AuthLayout>
  );
}
