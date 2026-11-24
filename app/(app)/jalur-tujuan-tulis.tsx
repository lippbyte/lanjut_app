import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { TujuanTulisScreen } from '../../components/screens/JalurTujuanScreens';
import { TujuanTulisV2 } from '../../components/screens/v2/JalurSayaV2';
import { jalurTujuanAktif, navigasiV2Aktif } from '../../lib/fiturApp';
import { useSesi } from '../../providers/AuthProvider';

export default function TujuanTulisRoute() {
  const { pengguna } = useSesi();
  const extra = Constants.expoConfig?.extra;
  // LANJUT_023: saat saklar mati berkas ini tidak masuk bundel (metro.config.js). Ini lapis kedua.
  if (!jalurTujuanAktif(Constants.expoConfig?.extra)) return <Redirect href="/linimasa" />;
  if (navigasiV2Aktif(extra)) return <TujuanTulisV2 key={pengguna?.id} />;
  return <TujuanTulisScreen key={pengguna?.id} />;
}
