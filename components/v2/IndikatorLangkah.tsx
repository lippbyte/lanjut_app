import React from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, ruang } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';
import { Teks } from './Teks';

/**
 * Indikator langkah v2 (LANJUT_030, dua mode LANJUT_031b): tulisan "Langkah 2 dari 7" (dibacakan)
 * dan bilah kecil sebagai hiasan (disembunyikan dari pembaca layar). Langkah tidak dibedakan hanya
 * lewat warna: tulisan nomornya selalu ada.
 */
export function IndikatorLangkah({ ke, total, teks }: { ke: number; total: number; teks: string }) {
  const { warna } = useTemaV2();
  return (
    <View style={s.wadah}>
      <Teks varian="keterangan" warna="teksSekunder">
        {teks}
      </Teks>
      <View style={s.bilah} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={StyleSheet.flatten([s.ruas, { backgroundColor: i < ke ? warna.aksen : warna.garisHalus }])} />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wadah: { gap: ruang.r1 },
  bilah: { flexDirection: 'row', gap: ruang.r1 },
  ruas: { flex: 1, height: ruang.r1, borderRadius: radius.pil },
});
