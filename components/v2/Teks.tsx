import React from 'react';
import { StyleSheet, Text, type StyleProp, type TextStyle } from 'react-native';

import { tipografi, warna, type VarianTeks } from '../../theme/v2';

/** Peran warna yang boleh dipakai teks. Semua punya pasangan kontras di theme/v2/warna.ts. */
export type WarnaTeks = 'teks' | 'teksSekunder' | 'aksen' | 'teksPadaAksen' | 'nonaktifTeks' | 'sukses' | 'galat';

/**
 * Teks v2 (LANJUT_029). h1 dan h2 otomatis berperan "header" untuk pembaca layar. Skala font
 * sistem dihormati: allowFontScaling tidak dimatikan dan tidak ada tinggi tetap.
 */
export function Teks({
  varian = 'badan',
  warna: w = 'teks',
  rata,
  baris,
  gaya,
  children,
}: {
  varian?: VarianTeks;
  warna?: WarnaTeks;
  rata?: 'left' | 'center';
  /** Hanya untuk label pendek; teks isi tidak boleh dipotong. */
  baris?: number;
  gaya?: StyleProp<TextStyle>;
  children: React.ReactNode;
}) {
  const judul = varian === 'h1' || varian === 'h2';
  return (
    <Text
      accessibilityRole={judul ? 'header' : undefined}
      numberOfLines={baris}
      style={StyleSheet.flatten([tipografi[varian], { color: warna[w] }, rata ? { textAlign: rata } : null, gaya])}
    >
      {children}
    </Text>
  );
}
