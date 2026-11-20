import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { pantauKurangiGerak } from '../lib/kurangiGerak';

/**
 * true bila "Kurangi gerakan" menyala di perangkat (Android: hapus animasi; iOS: Reduce Motion;
 * web: prefers-reduced-motion). Mengikuti perubahan selama app terbuka. LANJUT_029.
 */
export function useKurangiGerak(): boolean {
  const [aktif, setAktif] = useState(false);
  useEffect(() => pantauKurangiGerak(AccessibilityInfo, setAktif), []);
  return aktif;
}
