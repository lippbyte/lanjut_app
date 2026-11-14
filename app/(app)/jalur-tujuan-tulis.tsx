import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { TujuanTulisScreen } from '../../components/screens/JalurTujuanScreens';
import { jalurTujuanAktif } from '../../lib/fiturApp';
import { useSesi } from '../../providers/AuthProvider';

export default function TujuanTulisRoute() {
  const { pengguna } = useSesi();
  // LANJUT_023: saat saklar mati berkas ini tidak masuk bundel (metro.config.js). Ini lapis kedua.
  if (!jalurTujuanAktif(Constants.expoConfig?.extra)) return <Redirect href="/linimasa" />;
  return <TujuanTulisScreen key={pengguna?.id} />;
}
