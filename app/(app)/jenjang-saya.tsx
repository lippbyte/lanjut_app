import React from 'react';

import { JenjangSayaScreen } from '../../components/screens/JenjangSayaScreen';

// Jenjang Saya (LANJUT_037) — dulu Khusus SMK (F2). Hub per jenjang; butir
// Khusus SMK berpasangan masih tampil untuk kelas 10–12.
// Markup & logika sungguhan ada di components/screens/JenjangSayaScreen.tsx.
export default function JenjangSayaRoute() {
  return <JenjangSayaScreen />;
}
