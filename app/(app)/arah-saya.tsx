import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { ArahSayaV2 } from '../../components/screens/v2/ArahSayaV2';
import { navigasiV2Aktif } from '../../lib/fiturApp';
import { useSesi } from '../../providers/AuthProvider';

export default function ArahSayaRoute() {
  const { pengguna } = useSesi();
  // LANJUT_031: saat saklar mati berkas ini tidak masuk bundel (metro.config.js). Ini lapis kedua.
  if (!navigasiV2Aktif(Constants.expoConfig?.extra)) return <Redirect href="/linimasa" />;
  return <ArahSayaV2 key={pengguna?.id} />;
}
