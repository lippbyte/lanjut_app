import React from 'react';
import { StyleSheet, View } from 'react-native';

import { elevasi, garis, radius, ruang, ukuran, warna, type PeranWarna } from '../../theme/v2';
import { Ikon } from '../ui/Ikon';
import { PesanStatus } from './PesanStatus';
import { PlaceholderMemuat } from './PlaceholderMemuat';
import { Sentuh } from './Sentuh';
import { Teks } from './Teks';

export type VarianKartu = 'biasa' | 'lembut' | 'brand';

const LATAR: Record<VarianKartu, PeranWarna> = { biasa: 'permukaan', lembut: 'permukaanLembut', brand: 'brand' };

/**
 * Kartu v2 (LANJUT_029): judul, satu kalimat keterangan, dan isi opsional. Bila onPress ada,
 * seluruh kartu menjadi satu kontrol (peran "button", label = judul) dengan tanda panah.
 * Tepi kartu dekoratif (garisHalus); kartu yang bisa ditekan dikenali dari panahnya.
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
        <Teks varian="badanKecil" warna={nonaktif ? 'nonaktifTeks' : 'teksSekunder'}>
          {keterangan}
        </Teks>
      ) : null}
      {children}
      {galat ? <PesanStatus jenis="galat" berlatar>{galat}</PesanStatus> : null}
    </View>
  );
  const latar = warna[nonaktif ? 'nonaktifLatar' : LATAR[varian]];

  if (!onPress || memuat) {
    return <View style={StyleSheet.flatten([s.kartu, { backgroundColor: latar }])}>{isi}</View>;
  }
  return (
    <Sentuh
      peran="button"
      label={labelAksi ?? judul ?? 'Buka'}
      onPress={onPress}
      nonaktif={nonaktif}
      gaya={({ ditekan }) => [s.kartu, s.baris, { backgroundColor: ditekan && !nonaktif ? warna.permukaanLembut : latar }]}
    >
      {isi}
      <Ikon nama="panah" ukuran={ukuran.ikon} warna={nonaktif ? warna.nonaktifTeks : warna.teksSekunder} />
    </Sentuh>
  );
}

const s = StyleSheet.create({
  kartu: {
    borderRadius: radius.sedang,
    borderWidth: garis.tipis,
    borderColor: warna.garisHalus,
    padding: ruang.r2,
    ...elevasi.datar,
  },
  baris: { flexDirection: 'row', alignItems: 'center', gap: ruang.r2 },
  isi: { flex: 1, minWidth: 0, gap: ruang.r1 },
});
