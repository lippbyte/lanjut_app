import React from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, ruang, warna } from '../../theme/v2';
import { Teks } from './Teks';

/**
 * Indikator langkah v2 (LANJUT_030): tulisan "Langkah 2 dari 7" (dibacakan) dan bilah kecil
 * sebagai hiasan (disembunyikan dari pembaca layar). Langkah tidak dibedakan hanya lewat warna:
 * tulisan nomornya selalu ada.
 */
export function IndikatorLangkah({ ke, total, teks }: { ke: number; total: number; teks: string }) {
  return (
    <View style={s.wadah}>
      <Teks varian="keterangan" warna="teksSekunder">
        {teks}
      </Teks>
      <View style={s.bilah} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={StyleSheet.flatten([s.ruas, i < ke ? s.ruasSelesai : s.ruasSisa])} />
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wadah: { gap: ruang.r1 },
  bilah: { flexDirection: 'row', gap: ruang.r1 },
  ruas: { flex: 1, height: ruang.r1, borderRadius: radius.pil },
  ruasSelesai: { backgroundColor: warna.aksen },
  ruasSisa: { backgroundColor: warna.garisHalus },
});
