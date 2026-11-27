import React from 'react';
import Constants from 'expo-constants';

import { TerimaKebijakanScreen } from '../../components/screens/TerimaKebijakan';
import { TerimaKebijakanV2 } from '../../components/screens/v2/KebijakanV2';
import { modeGelapAktif, navigasiV2Aktif } from '../../lib/fiturApp';

const EXTRA = Constants.expoConfig?.extra;
const PAKAI_V2 = modeGelapAktif(EXTRA) || navigasiV2Aktif(EXTRA);

// LANJUT_048 — membaca & menerima kebijakan privasi (dari Data Akun dan Ngobrol; dua mode LANJUT_039).
export default function TerimaKebijakanRoute() {
  return PAKAI_V2 ? <TerimaKebijakanV2 /> : <TerimaKebijakanScreen />;
}
