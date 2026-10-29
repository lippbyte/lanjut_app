import React, { useState } from 'react';
import { View } from 'react-native';

import * as authApi from '../../api/auth';
import { ApiError } from '../../api/client';
import { galatSandiBaru } from '../../lib/sandiBaru';
import { useSesi } from '../../providers/AuthProvider';
import { AuthLayout, Field, Input, PesanGalat, TautanBawah, TombolUtama, authStyles } from './auth/AuthUI';

/**
 * LANJUT_083d — layar wajib "Buat kata sandi baru" (gerbang di app/(app)/_layout.tsx). Tampil
 * setelah pemilik email mengambil alih akun lama yang emailnya belum terverifikasi: kata sandi
 * lama sudah dicabut di server. Tidak ada tombol lewati; satu-satunya jalan lain adalah keluar.
 * Setelah tersimpan, profil di AuthProvider tidak lagi `perlu_sandi_baru` dan gerbang lepas.
 *
 * Teks DRAF (salinan teks, blok LANJUT_083d), belum disetujui PM.
 */
export function BuatSandiBaruScreen() {
  const { token, perbaruiPengguna, keluar } = useSesi();
  const [sandi, setSandi] = useState('');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [galatMedan, setGalatMedan] = useState<string | undefined>(undefined);

  const simpan = async () => {
    const lokal = galatSandiBaru(sandi);
    setGalatMedan(lokal ?? undefined);
    setGalat(null);
    if (lokal || !token) return;
    setProses(true);
    try {
      await perbaruiPengguna(await authApi.buatSandiBaru(token, sandi));
    } catch (err) {
      setGalat(authApi.pesanUntuk(err));
      if (err instanceof ApiError && err.medan?.kata_sandi_baru) setGalatMedan(err.medan.kata_sandi_baru);
    } finally {
      setProses(false);
    }
  };

  return (
    <AuthLayout
      judul="Buat kata sandi baru"
      pengantar="Emailmu sudah terverifikasi. Kata sandi lama akun ini sudah tidak berlaku, jadi buat kata sandi baru dulu sebelum lanjut."
    >
      <View style={authStyles.form}>
        <Field label="Kata sandi baru" hint="Minimal 8 karakter." galat={galatMedan}>
          <Input
            value={sandi}
            onChangeText={setSandi}
            placeholder="Minimal 8 karakter"
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
            autoFocus
            returnKeyType="go"
            onSubmitEditing={simpan}
          />
        </Field>
        <PesanGalat teks={galat} />
        <TombolUtama label="Simpan kata sandi" labelProses="Menyimpan…" proses={proses} onPress={simpan} />
        <TautanBawah teks="Mau berhenti dulu?" tautan="Keluar" onPress={() => void keluar()} />
      </View>
    </AuthLayout>
  );
}
