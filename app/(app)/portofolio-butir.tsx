import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { PortofolioDetailScreen } from '../../components/screens/PortofolioScreens';
import { RekamJejakDetailV2 } from '../../components/screens/v2/RekamJejakV2';
import { navigasiV2Aktif, portofolioAktif } from '../../lib/fiturApp';
import { useSesi } from '../../providers/AuthProvider';

// Satu catatan (?id=) beserta fotonya.
export default function PortofolioButirRoute() {
  const { pengguna } = useSesi();
  const extra = Constants.expoConfig?.extra;
  // LANJUT_011: saat saklar mati berkas ini tidak masuk bundel (metro.config.js). Ini lapis kedua.
  if (!portofolioAktif(Constants.expoConfig?.extra)) return <Redirect href="/linimasa" />;
  if (navigasiV2Aktif(extra)) return <RekamJejakDetailV2 key={pengguna?.id} />;
  return <PortofolioDetailScreen key={pengguna?.id} />;
}
