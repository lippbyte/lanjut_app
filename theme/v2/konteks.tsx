import React, { createContext, useContext } from 'react';

import type { PilihanMode } from '../../lib/modeTampilan';
import { warnaTerang, type ModeTemaAktif, type SetWarnaV2 } from './warna';

export type NilaiTemaV2 = {
  mode: ModeTemaAktif;
  warna: SetWarnaV2;
  pilihan: PilihanMode;
  ubahPilihan: (baru: PilihanMode) => void;
  saklarAktif: boolean;
};

const BAWAAN: NilaiTemaV2 = {
  mode: 'terang',
  warna: warnaTerang,
  pilihan: 'sistem',
  ubahPilihan: () => {},
  saklarAktif: false,
};

/**
 * Konteks tema dua mode v2 (LANJUT_031b). Di luar `TemaV2Provider` (atau saat saklar
 * EXPO_PUBLIC_MODE_GELAP mati), nilainya selalu mode terang.
 */
export const TemaV2Context = createContext<NilaiTemaV2>(BAWAAN);

export function useTemaV2(): NilaiTemaV2 {
  return useContext(TemaV2Context);
}
