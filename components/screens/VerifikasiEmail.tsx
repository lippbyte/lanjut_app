import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import * as authApi from '../../api/auth';
import { ApiError } from '../../api/client';
import { useSesi } from '../../providers/AuthProvider';
import { color, font, spacing, teks } from '../../theme/tokens';
import { Kartu, Tombol } from '../ui';
import { Field, Input, Keterangan, PesanGalat } from './auth/AuthUI';

// LANJUT_083c — ajakan verifikasi email untuk akun lama (dibuat sebelum 083c) yang emailnya
// belum terbukti. Akun tetap bisa dipakai seperti biasa; ini hanya ajakan, bukan blokir.
// Teks DRAF (salinan teks, blok LANJUT_083c), belum disetujui PM.
const TIDAK_TERSEDIA = 'Verifikasi email belum bisa dipakai sekarang. Coba lagi nanti.';

function pesan(err: unknown): string {
  return err instanceof ApiError && err.kode === 'OTP_TIDAK_TERSEDIA' ? TIDAK_TERSEDIA : authApi.pesanUntuk(err);
}

/** Tidak dirender bila akun tanpa email, sudah terverifikasi, atau sesinya dari app lama (medan belum ada). */
export function AjakanVerifikasiEmail() {
  const { pengguna, token, perbaruiPengguna } = useSesi();
  const [tahap, setTahap] = useState<'awal' | 'kode'>('awal');
  const [kode, setKode] = useState('');
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  if (!token || !pengguna?.email || pengguna.email_terverifikasi !== false) return null;

  const mintaKode = async (ulang: boolean) => {
    setProses(true);
    setGalat(null);
    setInfo(null);
    try {
      const hasil = await authApi.kirimKodeVerifikasiEmail(token);
      if (hasil.sudah_terverifikasi) {
        await perbaruiPengguna(await authApi.saya(token));
        return;
      }
      setKode('');
      setTahap('kode');
      if (ulang) setInfo('Kode baru sudah dikirim. Kode sebelumnya tidak berlaku lagi.');
    } catch (err) {
      setGalat(pesan(err));
    } finally {
      setProses(false);
    }
  };

  const verifikasi = async () => {
    if (!/^\d{6}$/.test(kode.trim())) {
      setGalat('Kode terdiri dari 6 angka.');
      return;
    }
    setProses(true);
    setGalat(null);
    setInfo(null);
    try {
      await perbaruiPengguna(await authApi.verifikasiEmail(token, kode.trim()));
    } catch (err) {
      setGalat(pesan(err));
    } finally {
      setProses(false);
    }
  };

  return (
    <Kartu style={s.kartu}>
      <Text style={s.judul}>Email belum terverifikasi</Text>
      <Keterangan>{`Kami kirim kode ke ${pengguna.email} untuk memastikan email itu milikmu. Akunmu tetap bisa dipakai seperti biasa.`}</Keterangan>
      {tahap === 'kode' ? (
        <>
          <Field label="Kode dari email">
            <Input
              value={kode}
              onChangeText={(t) => setKode(t.replace(/\D/g, '').slice(0, 6))}
              placeholder="6 angka"
              keyboardType="number-pad"
              autoComplete="one-time-code"
              textContentType="oneTimeCode"
              maxLength={6}
              returnKeyType="go"
              onSubmitEditing={verifikasi}
            />
          </Field>
          <PesanGalat teks={galat} />
          {info ? <Keterangan>{info}</Keterangan> : null}
          <View style={s.aksi}>
            <Tombol label="Kirim ulang kode" varian="hantu" kecil onPress={() => mintaKode(true)} />
            <Tombol label={proses ? 'Memeriksa…' : 'Verifikasi'} kecil proses={proses} onPress={verifikasi} />
          </View>
        </>
      ) : (
        <>
          <PesanGalat teks={galat} />
          <View style={s.aksi}>
            <Tombol label={proses ? 'Mengirim…' : 'Kirim kode'} varian="sekunder" kecil proses={proses} onPress={() => mintaKode(false)} />
          </View>
        </>
      )}
    </Kartu>
  );
}

const s = StyleSheet.create({
  kartu: { gap: spacing.s3 },
  judul: { ...teks.body, fontFamily: font.semibold, color: color.textBody },
  aksi: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.s2 },
});
