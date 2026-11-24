import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { JejakWaktuV2 } from '../../components/screens/v2/JejakWaktuV2';
import { navigasiV2Aktif } from '../../lib/fiturApp';
import { useSesi } from '../../providers/AuthProvider';

export default function JejakWaktuRoute() {
  const { pengguna } = useSesi();
  // LANJUT_032: saat saklar mati berkas ini dikeluarkan dari bundel (metro.config.js). Ini lapis kedua.
  if (!navigasiV2Aktif(Constants.expoConfig?.extra)) return <Redirect href="/linimasa" />;
  return <JejakWaktuV2 key={pengguna?.id} />;
}
