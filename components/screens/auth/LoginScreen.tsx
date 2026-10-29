import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { PESAN_SESI_BERAKHIR } from '../../../api/auth';
import { useAuth } from '../../../hooks/useAuth';
import { useSesi } from '../../../providers/AuthProvider';
import { color, spacing, teks as teksToken } from '../../../theme/tokens';
import { Peringatan, Tombol } from '../../ui';
import { AuthLayout, Field, Input, PesanGalat, TautanBawah, TombolUtama, authStyles } from './AuthUI';
import { MasukKodeEmail } from './MasukKodeEmail';
import { TombolGoogle } from './TombolGoogle';

// Salinan teks disamakan dengan MVP-PWA/masuk.html. Setelah sukses tidak ada
// navigasi manual — penjaga di app/(auth)/_layout.tsx yang memindahkan
// pengguna begitu status sesi berubah jadi "masuk".
//
// LANJUT_083: dua cara masuk tambahan — kode email (MasukKodeEmail) dan Google
// (TombolGoogle, hanya tampil bila Client ID diisi). Kata sandi tetap cara bawaan.
export function LoginScreen() {
  const router = useRouter();
  const { login, loading, error, medan } = useAuth();
  const { alasanKeluar } = useSesi();
  const [cara, setCara] = useState<'sandi' | 'kode'>('sandi');
  const [namaPengguna, setNamaPengguna] = useState('');
  const [kataSandi, setKataSandi] = useState('');
  const [galatLokal, setGalatLokal] = useState<string | null>(null);

  const kirim = () => {
    if (!namaPengguna.trim() || !kataSandi) {
      setGalatLokal('Isi nama pengguna dan kata sandi dulu.');
      return;
    }
    setGalatLokal(null);
    login(namaPengguna.trim(), kataSandi);
  };

  return (
    <AuthLayout
      judul="Masuk"
      pengantar={cara === 'sandi' ? 'Lanjutkan dengan akun yang sudah kamu buat.' : 'Kami kirim kode masuk ke email akunmu.'}
    >
      <View style={authStyles.form}>
        {/* Sesi ditolak server di tengah pemakaian atau saat app dibuka —
            jelaskan kenapa tiba-tiba di sini (LANJUT_018). */}
        {alasanKeluar === 'sesi_berakhir' ? <Peringatan>{PESAN_SESI_BERAKHIR}</Peringatan> : null}
        {cara === 'kode' ? (
          <MasukKodeEmail />
        ) : (
          <>
            <Field label="Nama pengguna" galat={medan.nama_pengguna}>
              <Input
                value={namaPengguna}
                onChangeText={setNamaPengguna}
                placeholder="Nama penggunamu"
                autoComplete="username"
                textContentType="username"
                autoFocus
                returnKeyType="next"
              />
            </Field>
            <Field label="Kata sandi" galat={medan.kata_sandi}>
              <Input
                value={kataSandi}
                onChangeText={setKataSandi}
                placeholder="Kata sandimu"
                secureTextEntry
                autoComplete="current-password"
                textContentType="password"
                returnKeyType="go"
                onSubmitEditing={kirim}
              />
            </Field>
            <PesanGalat teks={galatLokal ?? error} />
            <TombolUtama label="Masuk" labelProses="Memeriksa…" proses={loading} onPress={kirim} />
          </>
        )}
        <Text style={s.atau}>atau</Text>
        {cara === 'sandi' ? (
          <Tombol label="Masuk dengan kode email" varian="garis" penuh onPress={() => setCara('kode')} />
        ) : (
          <Tombol label="Masuk dengan kata sandi" varian="garis" penuh onPress={() => setCara('sandi')} />
        )}
        <TombolGoogle />
        <TautanBawah teks="Belum punya akun?" tautan="Daftar" onPress={() => router.replace('/daftar')} />
      </View>
    </AuthLayout>
  );
}

const s = StyleSheet.create({
  atau: { ...teksToken.caption, color: color.textMuted, textAlign: 'center', marginVertical: -spacing.s2 },
});
