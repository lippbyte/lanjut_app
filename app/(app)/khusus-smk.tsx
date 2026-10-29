import React from 'react';
import { Redirect } from 'expo-router';

// Rute lama "Khusus SMK" (sebelum LANJUT_037). Tetap ada supaya tautan,
// bookmark, dan APK lama yang membuka /khusus-smk sampai ke Jenjang Saya.
export default function KhususSmkLamaRoute() {
  return <Redirect href="/jenjang-saya" />;
}
