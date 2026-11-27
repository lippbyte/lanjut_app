import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { PortofolioTulisScreen } from '../../components/screens/PortofolioScreens';
import { RekamJejakTulisV2 } from '../../components/screens/v2/RekamJejakV2';
import { navigasiV2Aktif, portofolioAktif } from '../../lib/fiturApp';
import { useSesi } from '../../providers/AuthProvider';

// Tulis catatan baru, atau ubah catatan sendiri (?id=).
export default function PortofolioTulisRoute() {
  const { pengguna } = useSesi();
  const extra = Constants.expoConfig?.extra;
  // LANJUT_011: saat saklar mati berkas ini tidak masuk bundel (metro.config.js). Ini lapis kedua.
  if (!portofolioAktif(Constants.expoConfig?.extra)) return <Redirect href="/linimasa" />;
  if (navigasiV2Aktif(extra)) return <RekamJejakTulisV2 key={pengguna?.id} />;
  return <PortofolioTulisScreen key={pengguna?.id} />;
}
