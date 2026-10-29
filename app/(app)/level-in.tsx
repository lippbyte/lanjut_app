import React from 'react';

import { LevelInScreen } from '../../components/screens/LevelInScreen';

// LANJUT_058 — Level-In: level per mapel, kalibrasi keyakinan, saran harian.
// Dibuka dari Beranda dan Latihan; semua kelas 7–12, tanpa gerbang kelas 12.
// Markup & logika sungguhan ada di components/screens/LevelInScreen.tsx.
export default function LevelInRoute() {
  return <LevelInScreen />;
}
