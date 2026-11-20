import React from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, ruang, ukuran, warna } from '../../theme/v2';
import { Ikon, type NamaIkon } from '../ui/Ikon';
import { Teks } from './Teks';
import { Tombol } from './Tombol';

/**
 * Keadaan kosong v2 (LANJUT_029): ikon dalam lingkaran biru muda, judul, satu kalimat, dan
 * paling banyak satu aksi. Ikon hiasan disembunyikan dari pembaca layar.
 */
export function KeadaanKosong({
  judul,
  teks,
  ikon = 'info',
  aksi,
}: {
  judul: string;
  teks?: string;
  ikon?: NamaIkon;
  aksi?: { label: string; onPress: () => void; memuat?: boolean; nonaktif?: boolean; galat?: string };
}) {
  return (
    <View style={s.wadah}>
      <View style={s.lingkaran} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Ikon nama={ikon} ukuran={ukuran.ikonBesar} warna={warna.aksen} />
      </View>
      <Teks varian="h2" rata="center">
        {judul}
      </Teks>
      {teks ? (
        <Teks varian="badan" warna="teksSekunder" rata="center">
          {teks}
        </Teks>
      ) : null}
      {aksi ? <Tombol varian="sekunder" {...aksi} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  wadah: { alignItems: 'center', gap: ruang.r2, paddingVertical: ruang.r5, paddingHorizontal: ruang.r3, backgroundColor: warna.halaman },
  lingkaran: {
    width: ukuran.lingkaranIkon,
    height: ukuran.lingkaranIkon,
    borderRadius: radius.pil,
    backgroundColor: warna.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
