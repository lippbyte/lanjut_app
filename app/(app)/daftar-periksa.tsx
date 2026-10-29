import React from 'react';

import { DaftarPeriksaScreen } from '../../components/screens/DaftarPeriksaScreen';

// F5 — Daftar Periksa (docs/prd-sdd-lanjut.md Bagian 6): langkah persiapan
// yang bisa dicentang satu per satu, kemajuannya tersimpan lintas sesi.
// Markup & logika sungguhan ada di components/screens/DaftarPeriksaScreen.tsx.
export default function DaftarPeriksaRoute() {
  return <DaftarPeriksaScreen />;
}
