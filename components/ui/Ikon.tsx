import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { color as warna } from '../../theme/tokens';

// Ikon garis yang sama persis dengan SVG inline di halaman MVP-PWA
// (stroke 2, ujung membulat, viewBox 24).
const IKON = {
  info: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="M12 8h.01" />
      <Path d="M11 12h1v4h1" />
    </>
  ),
  panah: <Path d="m9 6 6 6-6 6" />,
  beranda: (
    <>
      <Path d="M3 10.5 12 3l9 7.5" />
      <Path d="M5.5 9.5V20h13V9.5" />
    </>
  ),
  smk: (
    <>
      <Path d="M2 9 12 4l10 5-10 5-10-5Z" />
      <Path d="M6 11.5V16c0 1.1 2.7 2 6 2s6-.9 6-2v-4.5" />
    </>
  ),
  mapel: (
    <>
      <Circle cx="12" cy="12" r="8" />
      <Circle cx="12" cy="12" r="4" />
    </>
  ),
  checklist: (
    <>
      <Rect x="4" y="4" width="16" height="16" rx="4" />
      <Path d="m8 12.5 2.5 2.5L16 9.5" />
    </>
  ),
  alumni: <Path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />,
  profil: (
    <>
      <Circle cx="12" cy="8" r="4" />
      <Path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" />
    </>
  ),
  // Pin peta untuk Jalur Saya, layar /cek-posisi (tidak ada di PWA, gaya garis yang sama).
  posisi: (
    <>
      <Path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
      <Circle cx="12" cy="9.5" r="2.5" />
    </>
  ),
  // Gelembung obrolan bertitik untuk Ngobrol Bareng LANJUT (LANJUT_032).
  obrolan: (
    <>
      <Path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-5 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Z" />
      <Path d="M8 10.5h.01" />
      <Path d="M12 10.5h.01" />
      <Path d="M16 10.5h.01" />
    </>
  ),
  centang: <Path d="m5 12.5 4.5 4.5L19 7.5" />,
  ok: (
    <>
      <Circle cx="12" cy="12" r="9" />
      <Path d="m8 12.5 2.5 2.5 5-6" />
    </>
  ),
  waspada: (
    <>
      <Path d="M10.3 3.9 2.5 18a1 1 0 0 0 .9 1.5h17.2a1 1 0 0 0 .9-1.5L13.7 3.9a1 1 0 0 0-1.7 0Z" />
      <Path d="M12 9v4" />
      <Path d="M12 16.5h.01" />
    </>
  ),
  // Mikrofon generik untuk masukan suara di Ngobrol (LANJUT_074), gaya garis yang sama.
  mikrofon: (
    <>
      <Rect x="9" y="3" width="6" height="11" rx="3" />
      <Path d="M5 11a7 7 0 0 0 14 0" />
      <Path d="M12 18v3" />
    </>
  ),
  kembali: <Path d="m15 6-6 6 6 6" />,
  keluar: (
    <>
      <Path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <Path d="M10 17l5-5-5-5" />
      <Path d="M15 12H4" />
    </>
  ),
} as const;

export type NamaIkon = keyof typeof IKON;

export function Ikon({
  nama,
  ukuran = 22,
  warna: w = warna.blue600,
  tebal = 2,
}: {
  nama: NamaIkon;
  ukuran?: number;
  warna?: string;
  tebal?: number;
}) {
  return (
    <Svg
      width={ukuran}
      height={ukuran}
      viewBox="0 0 24 24"
      fill="none"
      stroke={w}
      strokeWidth={tebal}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {IKON[nama]}
    </Svg>
  );
}
