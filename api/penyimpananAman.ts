import * as SecureStore from 'expo-secure-store';

import type { TempatSimpan } from '../lib/sesiAman';

/**
 * Penyimpanan aman perangkat untuk token sesi (LANJUT_030): Android Keystore / iOS Keychain lewat
 * expo-secure-store. Web memakai penyimpananAman.web.ts. Aturan pakainya di lib/sesiAman.ts.
 */
export const penyimpananAman: TempatSimpan | null = {
  ambil: (kunci) => SecureStore.getItemAsync(kunci),
  simpan: (kunci, nilai) => SecureStore.setItemAsync(kunci, nilai),
  hapus: (kunci) => SecureStore.deleteItemAsync(kunci),
};
