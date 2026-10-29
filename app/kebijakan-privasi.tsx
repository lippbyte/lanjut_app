import React from 'react';

import { KebijakanPrivasiScreen } from '../components/screens/KebijakanPrivasiScreen';

// Di luar grup (auth)/(app): bisa dibuka sebelum maupun sesudah masuk (LANJUT_047).
export default function KebijakanPrivasiRoute() {
  return <KebijakanPrivasiScreen />;
}
