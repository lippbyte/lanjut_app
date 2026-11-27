import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { HapusAkunScreen } from '../../components/screens/HapusAkunScreen';
import { HapusAkunV2 } from '../../components/screens/v2/HapusAkunV2';
import { kelolaDataAkunAktif, navigasiV2Aktif } from '../../lib/fiturApp';
import { useSesi } from '../../providers/AuthProvider';

export default function HapusAkunRoute() {
  const { pengguna } = useSesi();
  const extra = Constants.expoConfig?.extra;
  // LANJUT_009: teksnya masih draf, jadi layar ini tertutup sampai saklar build dinyalakan.
  if (!kelolaDataAkunAktif(Constants.expoConfig?.extra)) return <Redirect href="/akun" />;
  // key: isian yang belum dikirim tidak terbawa ke akun lain.
  if (navigasiV2Aktif(extra)) return <HapusAkunV2 key={pengguna?.id} />;
  return <HapusAkunScreen key={pengguna?.id} />;
}
