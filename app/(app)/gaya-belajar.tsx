import React from 'react';

import { GayaBelajarScreen } from '../../components/screens/GayaBelajarScreen';
import { useSesi } from '../../providers/AuthProvider';

export default function GayaBelajarRoute() {
  const { pengguna } = useSesi();
  // key: pilihan yang belum disimpan tidak terbawa ke akun lain.
  return <GayaBelajarScreen key={pengguna?.id} />;
}
