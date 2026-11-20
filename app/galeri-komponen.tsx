import React from 'react';
import Constants from 'expo-constants';
import { Redirect } from 'expo-router';

import { galeriKomponenTerdaftar } from '../lib/galeriKomponen';

// Galeri komponen v2, KHUSUS PENGEMBANG (LANJUT_029). Bawaan mati. Tiga lapis:
//   1. metro.config.js mengeluarkan berkas ini dari bundel bila EXPO_PUBLIC_GALERI_KOMPONEN bukan '1'
//      atau NODE_ENV=production, jadi rutenya tidak terdaftar;
//   2. `__DEV__ &&` di depan: di bundel rilis Metro mengganti __DEV__ dengan false, sehingga
//      require galeri di bawah ikut dibuang dari bundel;
//   3. bila tetap terbuka tanpa syarat terpenuhi, layar dialihkan ke "/".
// Di luar grup (app) dan (auth): tanpa sesi, tanpa data akun, tanpa permintaan jaringan.
const Galeri: React.ComponentType | null =
  __DEV__ && galeriKomponenTerdaftar(__DEV__, Constants.expoConfig?.extra)
    ? require('../components/galeri/GaleriKomponen').GaleriKomponen
    : null;

export default function GaleriKomponenRoute() {
  if (!Galeri) return <Redirect href="/" />;
  return <Galeri />;
}
