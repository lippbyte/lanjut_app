import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { DiscoverScreen } from '../../components/screens/DiscoverScreens';
import { discoverAktif } from '../../lib/fiturApp';
import { useSesi } from '../../providers/AuthProvider';

export default function Rute() {
  const { pengguna } = useSesi();
  // LANJUT_024: saat saklar mati berkas ini tidak masuk bundel (metro.config.js). Ini lapis kedua.
  if (!discoverAktif(Constants.expoConfig?.extra)) return <Redirect href="/linimasa" />;
  return <DiscoverScreen key={pengguna?.id} />;
}
