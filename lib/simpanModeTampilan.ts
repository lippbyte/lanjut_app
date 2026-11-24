import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import {
  KUNCI_MODE_TAMPILAN,
  PILIHAN_MODE_BAWAAN,
  bacaPilihanMode,
  simpanPilihanMode,
  uraiPilihanMode,
  type PilihanMode,
} from './modeTampilan';

/**
 * Penyimpanan lokal biasa untuk pilihan mode tampilan v2 (LANJUT_031b).
 * Hanya menyentuh penyimpanan lokal perangkat (AsyncStorage / localStorage web);
 * tidak pernah mengirim apa pun ke jaringan atau memakai penyimpanan aman.
 */
export function bacaModeLokalSinkron(saklarAktif: boolean): PilihanMode {
  if (!saklarAktif || Platform.OS !== 'web' || typeof window === 'undefined') {
    return PILIHAN_MODE_BAWAAN;
  }
  try {
    return uraiPilihanMode(window.localStorage.getItem(KUNCI_MODE_TAMPILAN));
  } catch {
    return PILIHAN_MODE_BAWAAN;
  }
}

export function bacaModeLokal(): Promise<PilihanMode> {
  return bacaPilihanMode(AsyncStorage);
}

export function simpanModeLokal(pilihan: PilihanMode): Promise<void> {
  return simpanPilihanMode(AsyncStorage, pilihan);
}
