import React from 'react';
import {
  CalendarBlank,
  CaretDown,
  CaretLeft,
  CaretRight,
  Check,
  Compass,
  DeviceMobile,
  Info,
  MagnifyingGlass,
  Moon,
  Sun,
  User,
  Warning,
  type Icon,
  type IconWeight,
} from 'phosphor-react-native';

import { ukuran as ukuranToken } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';

const IKON_V2 = {
  panah: CaretRight,
  kembali: CaretLeft,
  bawah: CaretDown,
  centang: Check,
  waspada: Warning,
  info: Info,
  arah: Compass,
  jelajah: MagnifyingGlass,
  waktu: CalendarBlank,
  profil: User,
  sistem: DeviceMobile,
  terang: Sun,
  gelap: Moon,
} as const satisfies Record<string, Icon>;

export type NamaIkonV2 = keyof typeof IKON_V2;
export type BobotIkonV2 = Extract<IconWeight, 'regular' | 'bold' | 'fill'>;

/**
 * Pembungkus Phosphor Icons untuk seluruh komponen dan layar v2 (LANJUT_031b).
 * Ukuran baku dari `ukuran.ikon` / `ukuran.ikonBesar`; bobot konsisten (`regular` bawaan,
 * `bold` untuk centang, `fill` untuk tab aktif).
 */
export function Ikon({
  nama,
  ukuran: u = ukuranToken.ikon,
  warna: w,
  bobot,
}: {
  nama: NamaIkonV2;
  ukuran?: number;
  warna?: string;
  bobot?: BobotIkonV2;
}) {
  const { warna: warnaTema } = useTemaV2();
  const Komponen = IKON_V2[nama];
  const bobotAktif: IconWeight = bobot ?? (nama === 'centang' ? 'bold' : 'regular');
  return <Komponen size={u} color={w ?? warnaTema.aksen} weight={bobotAktif} />;
}
