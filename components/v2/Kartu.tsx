import React from 'react';
import { StyleSheet, View } from 'react-native';

import { elevasi, garis, radius, ruang, ukuran, type PeranWarna } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';
import { Ikon } from './IkonV2';
import { PesanStatus } from './PesanStatus';
import { PlaceholderMemuat } from './PlaceholderMemuat';
import { Sentuh } from './Sentuh';
import { Teks } from './Teks';

export type VarianKartu = 'biasa' | 'lembut' | 'brand';

const LATAR: Record<VarianKartu, PeranWarna> = { biasa: 'permukaan', lembut: 'permukaanLembut', brand: 'brand' };

/**
 * Kartu v2 (LANJUT_029, dua mode LANJUT_031b): judul, satu kalimat keterangan, dan isi opsional.
 * Bila onPress ada, seluruh kartu menjadi satu kontrol (peran "button", label = judul) dengan
 * tanda panah Phosphor. Bayangan tipis hanya di mode terang; teks di atas `brand` (`bagianBiru`)
 * memakai `teks` agar kontras tetap lolos.
 */
export function Kartu({
  judul,
  keterangan,
  varian = 'biasa',
  onPress,
  labelAksi,
  memuat = false,
  nonaktif = false,
  galat,
  children,
}: {
  judul?: string;
  keterangan?: string;
  varian?: VarianKartu;
  onPress?: () => void;
  /** Label untuk pembaca layar bila berbeda dari judul. */
  labelAksi?: string;
  memuat?: boolean;
  nonaktif?: boolean;
  galat?: string;
  children?: React.ReactNode;
}) {
  const { mode, warna } = useTemaV2();
  const warnaKeterangan = nonaktif ? 'nonaktifTeks' : varian === 'brand' ? 'teks' : 'teksSekunder';
  const isi = memuat ? (
    <PlaceholderMemuat baris={2} label={judul ? `Memuat ${judul}` : 'Memuat'} />
  ) : (
    <View style={s.isi}>
      {judul ? (
        <Teks varian="judulKecil" warna={nonaktif ? 'nonaktifTeks' : 'teks'}>
          {judul}
        </Teks>
      ) : null}
      {keterangan ? (
        <Teks varian="badanKecil" warna={warnaKeterangan}>
          {keterangan}
        </Teks>
      ) : null}
      {children}
      {galat ? <PesanStatus jenis="galat" berlatar>{galat}</PesanStatus> : null}
    </View>
  );
  const latar = warna[nonaktif ? 'nonaktifLatar' : LATAR[varian]];
  const bayangan = mode === 'terang' && !nonaktif ? elevasi.angkat : elevasi.datar;

  if (!onPress || memuat) {
    return (
      <View style={StyleSheet.flatten([s.kartu, bayangan, { borderColor: warna.garisHalus, backgroundColor: latar }])}>
        {isi}
      </View>
    );
  }
  return (
    <Sentuh
      peran="button"
      label={labelAksi ?? judul ?? 'Buka'}
      onPress={onPress}
      nonaktif={nonaktif}
      gaya={({ ditekan }) => [
        s.kartu,
        s.baris,
        bayangan,
        {
          borderColor: warna.garisHalus,
          backgroundColor: ditekan && !nonaktif ? warna.permukaanLembut : latar,
        },
      ]}
    >
      {isi}
      <Ikon
        nama="panah"
        ukuran={ukuran.ikon}
        warna={nonaktif ? warna.nonaktifTeks : varian === 'brand' ? warna.teks : warna.teksSekunder}
      />
    </Sentuh>
  );
}

const s = StyleSheet.create({
  kartu: {
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    padding: ruang.r2,
  },
  baris: { flexDirection: 'row', alignItems: 'center', gap: ruang.r2 },
  isi: { flex: 1, minWidth: 0, gap: ruang.r1 },
});
