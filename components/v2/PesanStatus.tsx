import React from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, ruang, ukuran } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';
import { Ikon } from './IkonV2';
import { Teks } from './Teks';

/**
 * Pesan galat atau sukses di bawah kontrol (LANJUT_029, dua mode + Phosphor LANJUT_031b).
 * Status tidak pernah hanya warna: selalu ada ikon berbentuk beda (waspada / centang) dan kalimat.
 * Pesan galat dibacakan segera (accessibilityRole "alert" dan live region).
 */
export function PesanStatus({ jenis, children, berlatar = false }: { jenis: 'galat' | 'sukses'; children: string; berlatar?: boolean }) {
  const { warna } = useTemaV2();
  const galat = jenis === 'galat';
  return (
    <View
      accessibilityRole={galat ? 'alert' : 'text'}
      accessibilityLiveRegion={galat ? 'assertive' : 'polite'}
      style={StyleSheet.flatten([
        s.baris,
        berlatar ? s.berlatar : null,
        berlatar ? { backgroundColor: galat ? warna.galatLatar : warna.suksesLatar } : null,
      ])}
    >
      <Ikon nama={galat ? 'waspada' : 'centang'} ukuran={ukuran.ikon} warna={galat ? warna.galat : warna.sukses} />
      <View style={s.isi}>
        <Teks varian="badanKecil" warna={berlatar ? 'teks' : jenis}>
          {children}
        </Teks>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  baris: { flexDirection: 'row', alignItems: 'flex-start', gap: ruang.r1 },
  isi: { flex: 1, minWidth: 0 },
  berlatar: { borderRadius: radius.kecil, padding: ruang.r2 },
});
