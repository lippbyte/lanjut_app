import React, { useRef, useState } from 'react';
import Constants from 'expo-constants';
import { Image, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKurangiGerak } from '../../../hooks/useKurangiGerak';
import { TEKS_PENGANTAR } from '../../../lib/alurMasukV2';
import { kelolaDataAkunAktif } from '../../../lib/fiturApp';
import type { TujuanOnboarding } from '../../../lib/onboarding';
import { radius, ruang, tataLetak, ukuran, warna } from '../../../theme/v2';
import { IndikatorLangkah, Teks, Tombol } from '../../v2';

// Kalimat unduh/hapus data hanya ditulis bila fiturnya menyala di build yang sama (LANJUT_030 §4.B).
const KELOLA_DATA = kelolaDataAkunAktif(Constants.expoConfig?.extra);

/** Isi tiap kartu pengantar (dipakai juga tes batas kata). */
export function isiKartuPengantar(kelolaData: boolean) {
  return TEKS_PENGANTAR.kartu.map((k, i) =>
    i === TEKS_PENGANTAR.kartu.length - 1 && kelolaData ? { ...k, isi: `${k.isi} ${TEKS_PENGANTAR.kelolaData}` } : k
  );
}

/**
 * Pengantar alur masuk v2 (LANJUT_030): tiga kartu geser sebelum masuk. Maskot kelinci dipakai di
 * sini (design.md §5: onboarding). Tujuan sama dengan onboarding v1: 'daftar' (Mulai), 'masuk'
 * (Saya sudah punya akun), 'semula' (Lewati).
 */
export function PengantarV2({ onPilih }: { onPilih: (tujuan: TujuanOnboarding) => void }) {
  const { top, bottom } = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const lebar = Math.min(width, tataLetak.lebarMaks);
  const kurangiGerak = useKurangiGerak();
  const [indeks, setIndeks] = useState(0);
  const geser = useRef<ScrollView>(null);
  const kartu = isiKartuPengantar(KELOLA_DATA);

  const keKartu = (i: number) => {
    setIndeks(i);
    geser.current?.scrollTo({ x: i * lebar, animated: !kurangiGerak });
  };

  return (
    <View style={StyleSheet.flatten([s.akar, { paddingTop: top + ruang.r1, paddingBottom: bottom + ruang.r2 }])}>
      <View style={StyleSheet.flatten([s.atas, { width: lebar }])}>
        <Tombol varian="teks" label={TEKS_PENGANTAR.lewati} onPress={() => onPilih('semula')} />
      </View>
      <ScrollView
        ref={geser}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={StyleSheet.flatten([s.geser, { width: lebar }])}
        onMomentumScrollEnd={(e) => setIndeks(Math.max(0, Math.min(kartu.length - 1, Math.round(e.nativeEvent.contentOffset.x / lebar))))}
        scrollEventThrottle={16}
      >
        {kartu.map((k, i) => (
          <View key={k.judul} style={StyleSheet.flatten([s.kartu, { width: lebar }])} accessible accessibilityLabel={`${k.judul}. ${k.isi}`}>
            <View style={s.maskotWadah}>
              <Image source={require('../../../assets/mascot-blue.png')} style={s.maskot} resizeMode="contain" accessible={false} />
            </View>
            <Teks varian="h1">{k.judul}</Teks>
            <Teks varian="badan" warna="teksSekunder">
              {k.isi}
            </Teks>
          </View>
        ))}
      </ScrollView>
      <View style={StyleSheet.flatten([s.bawah, { width: lebar }])}>
        <IndikatorLangkah ke={indeks + 1} total={kartu.length} teks={TEKS_PENGANTAR.kartuKe(indeks + 1, kartu.length)} />
        {indeks < kartu.length - 1 ? (
          <Tombol varian="sekunder" label={TEKS_PENGANTAR.berikutnya} penuh onPress={() => keKartu(indeks + 1)} />
        ) : null}
        <Tombol label={TEKS_PENGANTAR.mulai} penuh onPress={() => onPilih('daftar')} />
        <Tombol varian="teks" label={TEKS_PENGANTAR.sudahPunyaAkun} penuh onPress={() => onPilih('masuk')} />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  akar: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: warna.halaman, alignItems: 'center' },
  atas: { alignItems: 'flex-end', paddingHorizontal: ruang.r1 },
  geser: { flexGrow: 1 },
  kartu: { paddingHorizontal: ruang.tepi, paddingTop: ruang.r3, gap: ruang.r2 },
  maskotWadah: {
    width: ukuran.lingkaranIkon * 2,
    height: ukuran.lingkaranIkon * 2,
    borderRadius: radius.pil,
    backgroundColor: warna.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskot: { width: ukuran.lingkaranIkon * 1.5, height: ukuran.lingkaranIkon * 1.5 },
  bawah: { gap: ruang.r1, paddingHorizontal: ruang.tepi },
});
