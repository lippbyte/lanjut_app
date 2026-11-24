import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, type AccessibilityRole, type StyleProp, type ViewStyle } from 'react-native';

import { garis, ukuran } from '../../theme/v2';
import { useTemaV2 } from '../../theme/v2/konteks';

/**
 * Dasar semua kontrol yang bisa ditekan di komponen v2 (LANJUT_029, dua mode LANJUT_031b).
 * Satu-satunya pemakai Pressable di folder ini, supaya aturan berikut tidak bisa terlewat:
 *   - target sentuh minimal ukuran.sentuhMin (44) ke dua arah;
 *   - peran (accessibilityRole) dan label wajib;
 *   - keadaan nonaktif, sibuk, terpilih, dan terbuka dibacakan lewat accessibilityState;
 *   - cincin fokus terlihat saat dijangkau papan ketik atau pembaca layar (bukan hanya warna:
 *     garis 2 pt di luar kontrol).
 */
export type PeranSentuh = Extract<AccessibilityRole, 'button' | 'link' | 'radio' | 'checkbox' | 'switch' | 'tab'>;

export type KeadaanSentuh = { ditekan: boolean; fokus: boolean };

export function Sentuh({
  peran,
  label,
  petunjuk,
  onPress,
  nonaktif = false,
  sibuk = false,
  terpilih,
  dicentang,
  terbuka,
  gaya,
  children,
}: {
  peran: PeranSentuh;
  label: string;
  petunjuk?: string;
  onPress: () => void;
  nonaktif?: boolean;
  sibuk?: boolean;
  terpilih?: boolean;
  dicentang?: boolean;
  terbuka?: boolean;
  gaya?: (k: KeadaanSentuh) => StyleProp<ViewStyle>;
  children: React.ReactNode | ((k: KeadaanSentuh) => React.ReactNode);
}) {
  const { warna } = useTemaV2();
  const [fokus, setFokus] = useState(false);
  const mati = nonaktif || sibuk;
  const s = useMemo(
    () =>
      StyleSheet.create({
        dasar: { minHeight: ukuran.sentuhMin, minWidth: ukuran.sentuhMin },
        // Outline mengikuti radius kontrolnya sendiri, jadi radius tidak ditimpa di sini.
        fokus: { outlineColor: warna.fokus, outlineWidth: garis.fokus, outlineStyle: 'solid', outlineOffset: garis.fokus },
      }),
    [warna]
  );

  return (
    <Pressable
      onPress={mati ? undefined : onPress}
      disabled={mati}
      onFocus={() => setFokus(true)}
      onBlur={() => setFokus(false)}
      accessibilityRole={peran}
      accessibilityLabel={label}
      accessibilityHint={petunjuk}
      accessibilityState={{ disabled: mati, busy: sibuk, selected: terpilih, checked: dicentang, expanded: terbuka }}
      // react-native-web 0.21 mengabaikan accessibilityState; aria-* dibaca di web dan di HP.
      aria-disabled={mati}
      aria-busy={sibuk}
      aria-selected={terpilih}
      aria-checked={dicentang}
      aria-expanded={terbuka}
      // s.dasar SESUDAH gaya komponen: ukuran minimal tidak bisa ditimpa.
      style={({ pressed }) => StyleSheet.flatten([gaya?.({ ditekan: pressed && !mati, fokus }), s.dasar, fokus && s.fokus])}
    >
      {({ pressed }) => (typeof children === 'function' ? children({ ditekan: pressed && !mati, fokus }) : children)}
    </Pressable>
  );
}
