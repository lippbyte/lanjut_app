import React from 'react';
import Constants from 'expo-constants';

import { LoginScreen } from '../../components/screens/auth/LoginScreen';
import { MasukV2 } from '../../components/screens/v2/MasukV2';
import { alurMasukV2Aktif } from '../../lib/fiturApp';

function MasukRoute() {
  return <LoginScreen />;
}

// LANJUT_030: alur masuk v2 hanya bila EXPO_PUBLIC_ALUR_MASUK_V2=1; bawaan tetap LoginScreen v1.
export default alurMasukV2Aktif(Constants.expoConfig?.extra) ? MasukV2 : MasukRoute;
