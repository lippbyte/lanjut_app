import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { useHapusAkun, useKirimKodeHapus, useUnduhDataSaya } from '../../hooks/useDataAkun';
import {
  TEKS_DATA_AKUN as T,
  YANG_IKUT_TERHAPUS,
  YANG_TIDAK_TERHAPUS,
  bisaPakaiKodeEmail,
  pesanGalatHapus,
  pesanGalatUnduh,
  siapHapus,
  type MetodeKonfirmasi,
} from '../../lib/dataAkun';
import { useSesi } from '../../providers/AuthProvider';
import { color, font, spacing, teks } from '../../theme/tokens';
import { Kartu, Kepala, SeksiJudul, Tombol, gaya } from '../ui';
import { Field, Input, KotakCentang, PesanGalat } from './auth/AuthUI';

/** Di Data Akun (LANJUT_009): unduh salinan data dan pintu ke layar hapus akun. */
export function BagianDataSaya() {
  const router = useRouter();
  const unduh = useUnduhDataSaya();
  return (
    <>
      <SeksiJudul>{T.seksi}</SeksiJudul>
      <Kartu style={s.kartu}>
        <Text style={gaya.teksKecil}>{T.penjelasUnduh}</Text>
        <Tombol
          label={unduh.isPending ? T.unduhProses : T.unduh}
          varian="sekunder"
          penuh
          proses={unduh.isPending}
          onPress={() => unduh.mutate()}
        />
        {unduh.isSuccess ? <Text style={gaya.teksKecil}>{T.unduhSelesai}</Text> : null}
        {unduh.isError ? <PesanGalat teks={pesanGalatUnduh(unduh.error.kode)} /> : null}
        <Tombol label={T.hapus} varian="hantu" penuh onPress={() => router.push('/hapus-akun')} />
      </Kartu>
    </>
  );
}

function Daftar({ judul, butir }: { judul: string; butir: readonly string[] }) {
  return (
    <View style={s.daftar}>
      <Text style={s.judulDaftar}>{judul}</Text>
      {butir.map((b) => (
        <Text key={b} style={s.butir}>{`• ${b}`}</Text>
      ))}
    </View>
  );
}

/** Konfirmasi hapus akun: penjelasan, satu centang, dan satu langkah konfirmasi identitas. */
export function HapusAkunScreen() {
  const { pengguna } = useSesi();
  const router = useRouter();
  const hapus = useHapusAkun();
  const kirimKode = useKirimKodeHapus();
  const [paham, setPaham] = useState(false);
  const [metode, setMetode] = useState<MetodeKonfirmasi>('sandi');
  const [kataSandi, setKataSandi] = useState('');
  const [kodeEmail, setKodeEmail] = useState('');
  const [belumLengkap, setBelumLengkap] = useState(false);

  if (!pengguna) return null;

  const kembali = () => (router.canGoBack() ? router.back() : router.replace('/akun'));
  const alihMetode = (baru: MetodeKonfirmasi) => {
    setMetode(baru);
    setBelumLengkap(false);
    hapus.reset();
  };
  const kirim = () => {
    if (!siapHapus({ paham, metode, kataSandi, kodeEmail })) return setBelumLengkap(true);
    setBelumLengkap(false);
    hapus.mutate({ metode, kataSandi, kodeEmail });
  };

  return (
    <View style={gaya.layarIsiRapat}>
      <Kepala judul={T.hapus} pengantar={T.pengantar} />

      <Kartu style={s.kartu}>
        <Daftar judul={T.judulHilang} butir={YANG_IKUT_TERHAPUS} />
        <Daftar judul={T.judulTersisa} butir={YANG_TIDAK_TERHAPUS} />
        <Text style={gaya.teksKecil}>{T.saranUnduh}</Text>
      </Kartu>

      <Kartu style={s.kartu}>
        <KotakCentang label={T.paham} tercentang={paham} onAlih={() => setPaham(!paham)} />

        {metode === 'sandi' ? (
          <Field label={T.labelSandi} hint={T.petunjukKonfirmasi}>
            <Input
              value={kataSandi}
              onChangeText={setKataSandi}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
            />
          </Field>
        ) : (
          <View style={s.kode}>
            <Tombol
              label={kirimKode.isPending ? T.kirimKodeProses : kirimKode.isSuccess ? T.kirimKodeLagi : T.kirimKode}
              varian="sekunder"
              penuh
              proses={kirimKode.isPending}
              onPress={() => kirimKode.mutate()}
            />
            {kirimKode.isSuccess ? <Text style={gaya.teksKecil}>{T.kodeTerkirim}</Text> : null}
            {kirimKode.isError ? <PesanGalat teks={pesanGalatHapus(kirimKode.error.kode)} /> : null}
            <Field label={T.labelKode} hint={T.petunjukKonfirmasi}>
              <Input value={kodeEmail} onChangeText={setKodeEmail} keyboardType="number-pad" inputMode="numeric" maxLength={6} />
            </Field>
          </View>
        )}

        {bisaPakaiKodeEmail(pengguna) ? (
          <Text style={s.tautan} accessibilityRole="link" onPress={() => alihMetode(metode === 'sandi' ? 'kode' : 'sandi')}>
            {metode === 'sandi' ? T.alihKeKode : T.alihKeSandi}
          </Text>
        ) : null}

        {belumLengkap ? <PesanGalat teks={T.belumLengkap} /> : null}
        {hapus.isError ? <PesanGalat teks={pesanGalatHapus(hapus.error.kode)} /> : null}
      </Kartu>

      <Tombol
        label={hapus.isPending ? T.tombolHapusProses : T.tombolHapus}
        besar
        penuh
        proses={hapus.isPending}
        onPress={kirim}
      />
      <Tombol label={T.batal} varian="hantu" penuh onPress={kembali} />
    </View>
  );
}

const s = StyleSheet.create({
  kartu: { gap: spacing.s4 },
  daftar: { gap: spacing.s1 },
  judulDaftar: { ...teks.bodySm, fontFamily: font.semibold, color: color.ink900 },
  butir: { ...teks.bodySm, color: color.ink700 },
  kode: { gap: spacing.s3 },
  tautan: { ...teks.bodySm, fontFamily: font.semibold, color: color.textLink, textDecorationLine: 'underline' },
});
