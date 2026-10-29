import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { color } from '../../theme/tokens';

export function LayarMemuat() {
  return (
    <View style={styles.layar}>
      <ActivityIndicator size="large" color={color.blue500} />
    </View>
  );
}

const styles = StyleSheet.create({
  layar: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: color.surfacePage },
});
