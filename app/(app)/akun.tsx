import React from 'react';
import Constants from 'expo-constants';

import { AkunScreen } from '../../components/screens/AkunScreen';
import { AkunPrivasiV2 } from '../../components/screens/v2/AkunPrivasiV2';
import { kelolaDataAkunAktif, navigasiV2Aktif } from '../../lib/fiturApp';

export default function AkunRoute() {
  const extra = Constants.expoConfig?.extra;
  if (navigasiV2Aktif(extra) && kelolaDataAkunAktif(extra)) return <AkunPrivasiV2 />;
  return <AkunScreen />;
}
