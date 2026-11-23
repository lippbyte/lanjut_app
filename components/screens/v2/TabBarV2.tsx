import React from 'react';
import { Nav } from '@expo/html-elements';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IdTabV2, NamaIkonTabV2, TabV2Aktif } from '../../../lib/navigasiV2';
import { garis, keluargaHuruf, radius, ruang, ukuran } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';
import { Ikon, Sentuh, Teks } from '../../v2';

/**
 * Ikon tab v2 dengan Phosphor Icons (LANJUT_031b): bobot `regular` saat tidak aktif,
 * bobot `fill` saat terpilih (status terpilih tidak pernah hanya lewat warna).
 */
function IkonTab({ nama, terisi, warnaIkon }: { nama: NamaIkonTabV2; terisi: boolean; warnaIkon: string }) {
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Ikon nama={nama} ukuran={ukuran.ikon} warna={warnaIkon} bobot={terisi ? 'fill' : 'regular'} />
    </View>
  );
}

/**
 * Bilah tab bawah v2 (LANJUT_031, dua mode + Phosphor LANJUT_031b).
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
  const { warna } = useTemaV2();
  const { bottom } = useSafeAreaInsets();
  return (
    <Nav
      accessibilityRole="tablist"
      style={StyleSheet.flatten([
        s.wadah,
        { backgroundColor: warna.permukaan, borderTopColor: warna.garisHalus, paddingBottom: bottom + ruang.r1 },
      ])}
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
              gaya={({ ditekan }) => [s.tab, ditekan && { backgroundColor: warna.permukaanLembut }]}
            >
              <View style={StyleSheet.flatten([s.pilIkon, sedang && [s.pilAktif, { backgroundColor: warna.permukaanLembut }]])}>
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
    borderTopWidth: garis.tipis,
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
  pilIkon: {
    paddingHorizontal: ruang.r2,
    paddingVertical: ruang.r1,
    borderRadius: radius.pil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pilAktif: {},
  labelAktif: {
    fontFamily: keluargaHuruf.badanTebal,
  },
});
