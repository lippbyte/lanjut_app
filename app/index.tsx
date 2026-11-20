import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { ruteAwalApp } from '../lib/navigasiV2';

// Index diarahkan ke layar awal sesuai saklar navigasi: Linimasa (v1) atau Arah Saya (v2).
export default function IndexRoute() {
  return <Redirect href={ruteAwalApp(Constants.expoConfig?.extra)} />;
}
