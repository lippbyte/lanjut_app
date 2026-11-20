import React from 'react';
import { Nav } from '@expo/html-elements';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';

import type { IdTabV2, NamaIkonTabV2, TabV2Aktif } from '../../../lib/navigasiV2';
import { garis, keluargaHuruf, radius, ruang, ukuran, warna } from '../../../theme/v2';
import { Sentuh, Teks } from '../../v2';

/**
 * Ikon tab v2: garis saat tidak aktif, terisi saat terpilih (LANJUT_031 §4.B:
 * status terpilih tidak pernah hanya lewat warna).
 */
function IkonTab({ nama, terisi, warnaIkon }: { nama: NamaIkonTabV2; terisi: boolean; warnaIkon: string }) {
  const isi = terisi ? warnaIkon : 'none';
  return (
    <Svg
      width={ukuran.ikon}
      height={ukuran.ikon}
      viewBox="0 0 24 24"
      fill="none"
      stroke={warnaIkon}
      strokeWidth={garis.fokus}
      strokeLinecap="round"
      strokeLinejoin="round"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {nama === 'arah' ? (
        <>
          <Circle cx="12" cy="12" r="9" fill={terisi ? warna.permukaanLembut : 'none'} />
          <Polygon points="16.2 7.8 14.1 14.1 7.8 16.2 9.9 9.9 16.2 7.8" fill={isi} />
        </>
      ) : null}
      {nama === 'jelajah' ? (
        <>
          <Circle cx="11" cy="11" r="7" fill={isi} />
          <Path d="m20 20-4.2-4.2" />
        </>
      ) : null}
      {nama === 'waktu' ? (
        <>
          <Rect x="3" y="5" width="18" height="16" rx="3" fill={terisi ? warna.permukaanLembut : 'none'} />
          <Path d="M3 10h18" />
          <Path d="M8 3v4" />
          <Path d="M16 3v4" />
          {terisi ? <Rect x="7" y="13" width="4" height="4" rx="1" fill={warnaIkon} stroke="none" /> : null}
        </>
      ) : null}
      {nama === 'profil' ? (
        <>
          <Circle cx="12" cy="8" r="4" fill={isi} />
          <Path d="M4 20c1.5-4 5-6 8-6s6.5 2 8 6" fill={isi} />
        </>
      ) : null}
    </Svg>
  );
}

/**
 * Bilah tab bawah v2 (LANJUT_031).
 * Membaca daftar tab sepenuhnya dari `tabs` (hasil `daftarTabV2` dari `lib/navigasiV2.ts`).
 * Setiap tab selalu memuat ikon dan label, target sentuh minimal 44 pt (lewat `Sentuh`),
 * peran `tab` dengan `accessibilityState.selected`, dan indikator aktif berlapis (ikon terisi,
 * label tebal, dan pil latar lembut).
 */
export function TabBarV2({
  tabs,
  aktif,
  onPilih,
}: {
  tabs: readonly TabV2Aktif[];
  aktif: IdTabV2 | null;
  onPilih: (href: string) => void;
}) {
  const { bottom } = useSafeAreaInsets();
  return (
    <Nav
      accessibilityRole="tablist"
      style={StyleSheet.flatten([s.wadah, { paddingBottom: bottom + ruang.r1 }])}
    >
      <View style={s.baris}>
        {tabs.map((t) => {
          const sedang = t.id === aktif;
          const warnaIkon = sedang ? warna.aksen : warna.teksSekunder;
          return (
            <Sentuh
              key={t.id}
              peran="tab"
              label={t.label}
              terpilih={sedang}
              onPress={() => onPilih(t.href)}
              gaya={({ ditekan }) => [s.tab, ditekan && s.ditekan]}
            >
              <View style={StyleSheet.flatten([s.pilIkon, sedang && s.pilAktif])}>
                <IkonTab nama={t.ikon} terisi={sedang} warnaIkon={warnaIkon} />
              </View>
              <Teks
                varian="keterangan"
                warna={sedang ? 'aksen' : 'teksSekunder'}
                rata="center"
                baris={1}
                gaya={sedang ? s.labelAktif : undefined}
              >
                {t.label}
              </Teks>
            </Sentuh>
          );
        })}
      </View>
    </Nav>
  );
}

const s = StyleSheet.create({
  wadah: {
    backgroundColor: warna.permukaan,
    borderTopWidth: garis.tipis,
    borderTopColor: warna.garisHalus,
    paddingTop: ruang.r1,
    paddingHorizontal: ruang.r1,
  },
  baris: {
    flexDirection: 'row',
    alignItems: 'stretch',
    width: '100%',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: ruang.r1,
    paddingVertical: ruang.r1,
    borderRadius: radius.kecil,
  },
  ditekan: {
    backgroundColor: warna.permukaanLembut,
  },
  pilIkon: {
    paddingHorizontal: ruang.r2,
    paddingVertical: ruang.r1,
    borderRadius: radius.pil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pilAktif: {
    backgroundColor: warna.permukaanLembut,
  },
  labelAktif: {
    fontFamily: keluargaHuruf.badanTebal,
  },
});
