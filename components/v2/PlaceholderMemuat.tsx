import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Platform, StyleSheet, View } from 'react-native';

import { useKurangiGerak } from '../../hooks/useKurangiGerak';
import { gerakBoleh } from '../../lib/kurangiGerak';
import { gerak, radius, ruang, ukuran, warna } from '../../theme/v2';

const NATIVE = Platform.OS !== 'web';
const [x1, y1, x2, y2] = gerak.kurva.standar;

/**
 * Placeholder memuat (LANJUT_029): balok abu-abu seukuran baris teks. Pembaca layar mendengar
 * "Memuat", bukan balok kosong. Denyut pelan adalah gerak non-esensial: mati bila "Kurangi
 * gerakan" menyala.
 */
export function PlaceholderMemuat({ baris = 3, label = 'Memuat' }: { baris?: number; label?: string }) {
  const kurangiGerak = useKurangiGerak();
  const denyut = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!gerakBoleh(kurangiGerak)) {
      denyut.setValue(1);
      return;
    }
    const kurva = Easing.bezier(x1, y1, x2, y2);
    const animasi = Animated.loop(
      Animated.sequence([
        Animated.timing(denyut, { toValue: gerak.denyutRedup, duration: gerak.durasi.lambat * 2, easing: kurva, useNativeDriver: NATIVE }),
        Animated.timing(denyut, { toValue: 1, duration: gerak.durasi.lambat * 2, easing: kurva, useNativeDriver: NATIVE }),
      ])
    );
    animasi.start();
    return () => animasi.stop();
  }, [kurangiGerak, denyut]);

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }} style={s.wadah}>
      {Array.from({ length: baris }, (_, i) => (
        <Animated.View key={i} style={StyleSheet.flatten([s.balok, i === baris - 1 && baris > 1 && s.balokPendek, { opacity: denyut }])} />
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  wadah: { gap: ruang.r1 },
  balok: { height: ukuran.kerangkaBaris, borderRadius: radius.kecil, backgroundColor: warna.kerangka },
  balokPendek: { width: ukuran.kerangkaPendek },
});
