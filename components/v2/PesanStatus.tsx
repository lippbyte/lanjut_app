import React from 'react';
import { StyleSheet, View } from 'react-native';

import { radius, ruang, ukuran, warna } from '../../theme/v2';
import { Ikon } from '../ui/Ikon';
import { Teks } from './Teks';

/**
 * Pesan galat atau sukses di bawah kontrol (LANJUT_029). Status tidak pernah hanya warna:
 * selalu ada ikon berbentuk beda (waspada / centang) dan kalimat. Pesan galat dibacakan segera
 * (accessibilityRole "alert" dan live region).
 */
export function PesanStatus({ jenis, children, berlatar = false }: { jenis: 'galat' | 'sukses'; children: string; berlatar?: boolean }) {
  const galat = jenis === 'galat';
  return (
    <View
      accessibilityRole={galat ? 'alert' : 'text'}
      accessibilityLiveRegion={galat ? 'assertive' : 'polite'}
      style={StyleSheet.flatten([s.baris, berlatar && (galat ? s.latarGalat : s.latarSukses)])}
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
  latarGalat: { backgroundColor: warna.galatLatar, borderRadius: radius.kecil, padding: ruang.r2 },
  latarSukses: { backgroundColor: warna.suksesLatar, borderRadius: radius.kecil, padding: ruang.r2 },
});
