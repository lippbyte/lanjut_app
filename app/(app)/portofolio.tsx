import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { PortofolioDaftarScreen } from '../../components/screens/PortofolioScreens';
import { portofolioAktif } from '../../lib/fiturApp';
import { useSesi } from '../../providers/AuthProvider';

export default function PortofolioRoute() {
  const { pengguna } = useSesi();
  // LANJUT_011: saat saklar mati berkas ini tidak masuk bundel (metro.config.js). Ini lapis kedua.
  if (!portofolioAktif(Constants.expoConfig?.extra)) return <Redirect href="/linimasa" />;
  return <PortofolioDaftarScreen key={pengguna?.id} />;
}
