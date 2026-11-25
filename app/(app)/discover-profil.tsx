import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { ProfilEksplorasiScreen } from '../../components/screens/DiscoverScreens';
import { ProfilEksplorasiV2 } from '../../components/screens/v2/ProfilEksplorasiV2';
import { discoverAktif, navigasiV2Aktif } from '../../lib/fiturApp';
import { useSesi } from '../../providers/AuthProvider';

export default function Rute() {
  const { pengguna } = useSesi();
  const extra = Constants.expoConfig?.extra;
  // LANJUT_024: saat saklar mati berkas ini tidak masuk bundel (metro.config.js). Ini lapis kedua.
  if (!discoverAktif(Constants.expoConfig?.extra)) return <Redirect href="/linimasa" />;
  if (navigasiV2Aktif(extra)) return <ProfilEksplorasiV2 key={pengguna?.id} />;
  return <ProfilEksplorasiScreen key={pengguna?.id} />;
}
