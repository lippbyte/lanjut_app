import React, { useEffect, useRef } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKurangiGerak } from '../../../hooks/useKurangiGerak';
import { gerakBoleh } from '../../../lib/kurangiGerak';
import { garis, gerak, ruang, tataLetak } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';

const NATIVE = Platform.OS !== 'web';
const [x1, y1, x2, y2] = gerak.kurva.standar;

/**
 * Kerangka layar alur masuk v2 (LANJUT_030, dua mode LANJUT_031b): area aman, kolom maksimal 420,
 * isi yang bisa digulir dan tidak tertutup keyboard, dan area aksi di bawah (tombol besar).
 * `kunciLangkah` berubah → isi memudar masuk singkat; gerak ini mati saat "Kurangi gerakan".
 */
export function KerangkaV2({
  children,
  aksi,
  kunciLangkah,
}: {
  children: React.ReactNode;
  aksi?: React.ReactNode;
  kunciLangkah?: string;
}) {
  const { warna } = useTemaV2();
  const { top, bottom } = useSafeAreaInsets();
  const kurangiGerak = useKurangiGerak();
  const muncul = useRef(new Animated.Value(1)).current;
  const gulir = useRef<ScrollView>(null);

  useEffect(() => {
    gulir.current?.scrollTo({ y: 0, animated: false });
    if (!gerakBoleh(kurangiGerak)) {
      muncul.setValue(1);
      return;
    }
    muncul.setValue(0);
    const a = Animated.timing(muncul, { toValue: 1, duration: gerak.durasi.standar, easing: Easing.bezier(x1, y1, x2, y2), useNativeDriver: NATIVE });
    a.start();
    return () => a.stop();
    // Hanya saat langkah berganti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kunciLangkah]);

  return (
    <KeyboardAvoidingView style={StyleSheet.flatten([s.akar, { backgroundColor: warna.halaman }])} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView
        ref={gulir}
        style={StyleSheet.flatten([s.akar, { backgroundColor: warna.halaman }])}
        contentContainerStyle={StyleSheet.flatten([s.gulir, { paddingTop: top + ruang.r2 }])}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View style={StyleSheet.flatten([s.kolom, { opacity: muncul }])}>{children}</Animated.View>
      </ScrollView>
      {aksi ? (
        <View
          style={StyleSheet.flatten([
            s.aksi,
            { borderTopColor: warna.garisHalus, backgroundColor: warna.halaman, paddingBottom: bottom + ruang.r2 },
          ])}
        >
          <View style={s.kolomAksi}>{aksi}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  akar: { flex: 1 },
  gulir: { flexGrow: 1, paddingBottom: ruang.r3 },
  kolom: { width: '100%', maxWidth: tataLetak.lebarMaks, alignSelf: 'center', gap: ruang.r3, paddingHorizontal: ruang.tepi },
  aksi: { borderTopWidth: garis.tipis, paddingTop: ruang.r2 },
  kolomAksi: { width: '100%', maxWidth: tataLetak.lebarMaks, alignSelf: 'center', gap: ruang.r1, paddingHorizontal: ruang.tepi },
});
