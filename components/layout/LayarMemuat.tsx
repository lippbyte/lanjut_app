import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { color } from '../../theme/tokens';
import { useTemaV2 } from '../screens/v2/TemaV2Provider';

export function LayarMemuat() {
  const { mode, warna, saklarAktif } = useTemaV2();
  const gelap = saklarAktif && mode === 'gelap';
  return (
    <View style={[styles.layar, gelap && { backgroundColor: warna.halaman }]}>
      <ActivityIndicator size="large" color={gelap ? warna.aksen : color.blue500} />
    </View>
  );
}

const styles = StyleSheet.create({
  layar: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfacePage },
});
