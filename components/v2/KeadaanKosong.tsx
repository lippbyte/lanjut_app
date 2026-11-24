import React from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, ruang, ukuran } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';
import { Ikon, type NamaIkonV2 } from './IkonV2';
import { Teks } from './Teks';
import { Tombol } from './Tombol';

/**
 * Keadaan kosong v2 (LANJUT_029, dua mode + Phosphor LANJUT_031b): ikon dalam lingkaran brand,
 * judul, satu kalimat, dan paling banyak satu aksi. Ikon hiasan disembunyikan dari pembaca layar.
 */
export function KeadaanKosong({
  judul,
  teks,
  ikon = 'info',
  aksi,
}: {
  judul: string;
  teks?: string;
  ikon?: NamaIkonV2;
  aksi?: { label: string; onPress: () => void; memuat?: boolean; nonaktif?: boolean; galat?: string };
}) {
  const { warna } = useTemaV2();
  return (
    <View style={StyleSheet.flatten([s.wadah, { backgroundColor: warna.halaman }])}>
      <View
        style={StyleSheet.flatten([s.lingkaran, { backgroundColor: warna.brand }])}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
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
  wadah: { alignItems: 'center', gap: ruang.r2, paddingVertical: ruang.r5, paddingHorizontal: ruang.r3 },
  lingkaran: {
    width: ukuran.lingkaranIkon,
    height: ukuran.lingkaranIkon,
    borderRadius: radius.pil,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
