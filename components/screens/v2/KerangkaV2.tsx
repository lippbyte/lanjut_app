import React, { useEffect, useRef } from 'react';
import { Animated, Easing, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKurangiGerak } from '../../../hooks/useKurangiGerak';
import { gerakBoleh } from '../../../lib/kurangiGerak';
import { garis, gerak, ruang, tataLetak, warna } from '../../../theme/v2';

const NATIVE = Platform.OS !== 'web';
const [x1, y1, x2, y2] = gerak.kurva.standar;

/**
 * Kerangka layar alur masuk v2 (LANJUT_030): area aman, kolom maksimal 420, isi yang bisa digulir
 * dan tidak tertutup keyboard, dan area aksi di bawah (tombol besar). `kunciLangkah` berubah →
 * isi memudar masuk singkat; gerak ini non-esensial dan mati saat "Kurangi gerakan".
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
    <KeyboardAvoidingView style={s.akar} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView ref={gulir} style={s.akar} contentContainerStyle={StyleSheet.flatten([s.gulir, { paddingTop: top + ruang.r2 }])} keyboardShouldPersistTaps="handled">
        <Animated.View style={StyleSheet.flatten([s.kolom, { opacity: muncul }])}>{children}</Animated.View>
      </ScrollView>
      {aksi ? (
        <View style={StyleSheet.flatten([s.aksi, { paddingBottom: bottom + ruang.r2 }])}>
          <View style={s.kolomAksi}>{aksi}</View>
        </View>
      ) : null}
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  akar: { flex: 1, backgroundColor: warna.halaman },
  gulir: { flexGrow: 1, paddingBottom: ruang.r3 },
  kolom: { width: '100%', maxWidth: tataLetak.lebarMaks, alignSelf: 'center', gap: ruang.r3, paddingHorizontal: ruang.tepi },
  aksi: { borderTopWidth: garis.tipis, borderTopColor: warna.garisHalus, backgroundColor: warna.halaman, paddingTop: ruang.r2 },
  kolomAksi: { width: '100%', maxWidth: tataLetak.lebarMaks, alignSelf: 'center', gap: ruang.r1, paddingHorizontal: ruang.tepi },
});
