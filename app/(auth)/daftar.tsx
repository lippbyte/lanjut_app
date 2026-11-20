import React from 'react';
import Constants from 'expo-constants';

import { RegisterScreen } from '../../components/screens/auth/RegisterScreen';
import { DaftarV2 } from '../../components/screens/v2/DaftarV2';
import { alurMasukV2Aktif } from '../../lib/fiturApp';

function DaftarRoute() {
  return <RegisterScreen />;
}

// LANJUT_030: alur daftar v2 hanya bila EXPO_PUBLIC_ALUR_MASUK_V2=1; bawaan tetap RegisterScreen v1.
export default alurMasukV2Aktif(Constants.expoConfig?.extra) ? DaftarV2 : DaftarRoute;
