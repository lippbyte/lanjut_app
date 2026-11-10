import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { HapusAkunScreen } from '../../components/screens/HapusAkunScreen';
import { kelolaDataAkunAktif } from '../../lib/fiturApp';
import { useSesi } from '../../providers/AuthProvider';

export default function HapusAkunRoute() {
  const { pengguna } = useSesi();
  // LANJUT_009: teksnya masih draf, jadi layar ini tertutup sampai saklar build dinyalakan.
  if (!kelolaDataAkunAktif(Constants.expoConfig?.extra)) return <Redirect href="/akun" />;
  // key: isian yang belum dikirim tidak terbawa ke akun lain.
  return <HapusAkunScreen key={pengguna?.id} />;
}
