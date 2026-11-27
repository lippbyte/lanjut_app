import React from 'react';
import Constants from 'expo-constants';

import { KebijakanPrivasiScreen } from '../components/screens/KebijakanPrivasiScreen';
import { KebijakanPrivasiV2 } from '../components/screens/v2/KebijakanV2';
import { modeGelapAktif, navigasiV2Aktif } from '../lib/fiturApp';

const EXTRA = Constants.expoConfig?.extra;
const PAKAI_V2 = modeGelapAktif(EXTRA) || navigasiV2Aktif(EXTRA);

// Di luar grup (auth)/(app): bisa dibuka sebelum maupun sesudah masuk (LANJUT_047, dua mode LANJUT_039).
export default function KebijakanPrivasiRoute() {
  return PAKAI_V2 ? <KebijakanPrivasiV2 /> : <KebijakanPrivasiScreen />;
}
