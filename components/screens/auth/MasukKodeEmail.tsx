import React, { useState } from 'react';
import { View } from 'react-native';

import * as authApi from '../../../api/auth';
import { ApiError } from '../../../api/client';
import { useAuth } from '../../../hooks/useAuth';
import { Field, Input, Keterangan, PesanGalat, TautanBawah, TombolUtama, authStyles } from './AuthUI';

// LANJUT_083 — masuk dengan kode 6 angka yang dikirim ke email akun. Teks DRAF
// (docs/salinan-teks-lanjut.md §4.21), belum disetujui PM. Server menjawab sama
// untuk email terdaftar atau tidak, jadi kalimatnya juga tidak memastikan apa pun.
export function MasukKodeEmail() {
  const { loginKode, loading, error, medan } = useAuth();
  const [tahap, setTahap] = useState<'email' | 'kode'>('email');
  const [email, setEmail] = useState('');
  const [kode, setKode] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [galatKirim, setGalatKirim] = useState<string | null>(null);
  const [galatEmail, setGalatEmail] = useState<string | undefined>(undefined);
  const [galatLokal, setGalatLokal] = useState<string | null>(null);

  const kirimKode = async () => {
    if (!email.trim()) {
      setGalatEmail('Isi email dulu.');
      return;
    }
    setMengirim(true);
    setGalatKirim(null);
    setGalatEmail(undefined);
    try {
      await authApi.kirimKodeEmail(email.trim());
      setKode('');
      setTahap('kode');
    } catch (err) {
      setGalatKirim(authApi.pesanUntuk(err));
      if (err instanceof ApiError && err.medan?.email && err.kode === 'VALIDASI_GAGAL') setGalatEmail('Email belum benar.');
    } finally {
      setMengirim(false);
    }
  };

  const masuk = () => {
    if (!/^\d{6}$/.test(kode.trim())) {
      setGalatLokal('Kode terdiri dari 6 angka.');
      return;
    }
    setGalatLokal(null);
    loginKode(email.trim(), kode.trim());
  };

  if (tahap === 'email') {
    return (
      <View style={authStyles.form}>
        <Field label="Email" galat={galatEmail} hint="Email yang tersimpan di akun LANJUT-mu.">
          <Input
            value={email}
            onChangeText={setEmail}
            placeholder="nama@contoh.com"
            keyboardType="email-address"
            autoComplete="email"
            textContentType="emailAddress"
            returnKeyType="send"
            onSubmitEditing={kirimKode}
          />
        </Field>
        <PesanGalat teks={galatKirim} />
        <TombolUtama label="Kirim kode" labelProses="Mengirim…" proses={mengirim} onPress={kirimKode} />
      </View>
    );
  }

  return (
    <View style={authStyles.form}>
      <Keterangan>{`Kalau ${email.trim()} terdaftar di LANJUT, kode masuk sudah kami kirim ke sana. Kode berlaku 5 menit.`}</Keterangan>
      <Field label="Kode masuk" galat={medan.kode ? 'Periksa lagi kodenya.' : undefined}>
        <Input
          value={kode}
          onChangeText={(t) => setKode(t.replace(/\D/g, '').slice(0, 6))}
          placeholder="6 angka"
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          maxLength={6}
          autoFocus
          returnKeyType="go"
          onSubmitEditing={masuk}
        />
      </Field>
      <PesanGalat teks={galatLokal ?? error ?? galatKirim} />
      <TombolUtama label="Masuk" labelProses="Memeriksa…" proses={loading} onPress={masuk} />
      <TautanBawah teks="Belum dapat kodenya?" tautan={mengirim ? 'Mengirim…' : 'Kirim ulang'} onPress={kirimKode} />
      <TautanBawah teks="Salah email?" tautan="Ganti email" onPress={() => setTahap('email')} />
    </View>
  );
}
