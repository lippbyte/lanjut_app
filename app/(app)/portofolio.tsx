import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { PortofolioDaftarScreen } from '../../components/screens/PortofolioScreens';
import { RekamJejakDaftarV2 } from '../../components/screens/v2/RekamJejakV2';
import { navigasiV2Aktif, portofolioAktif } from '../../lib/fiturApp';
import { useSesi } from '../../providers/AuthProvider';

export default function PortofolioRoute() {
  const { pengguna } = useSesi();
  const extra = Constants.expoConfig?.extra;
  // LANJUT_011: saat saklar mati berkas ini tidak masuk bundel (metro.config.js). Ini lapis kedua.
  if (!portofolioAktif(Constants.expoConfig?.extra)) return <Redirect href="/linimasa" />;
  if (navigasiV2Aktif(extra)) return <RekamJejakDaftarV2 key={pengguna?.id} />;
  return <PortofolioDaftarScreen key={pengguna?.id} />;
}
