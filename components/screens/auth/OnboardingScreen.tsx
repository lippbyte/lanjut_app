import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  BackHandler,
  Easing,
  Platform,
  Pressable,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  BATAS_TUNGGU_PEMBUKA_MS,
  DURASI_KELUAR_MS,
  DURASI_MASUK_MS,
  LAYAR_ONBOARDING,
  LEBAR_TITIK_AKTIF_PX,
  LEBAR_TITIK_PX,
  TEKS_ONBOARDING,
  type TujuanOnboarding,
  indeksDariGeser,
  layarTerakhir,
  letakWarnaDalam,
} from '../../../lib/onboarding';
import { DURASI_MENGAMBANG_MS, KURVA_KELUAR, KURVA_MASUK, lintasanMengambang } from '../../../lib/pembuka';
import { color, font, gradient, layout, radius, shadow, spacing, teks } from '../../../theme/tokens';
import { usePembukaMenutup } from '../../layout/PembukaKelinci';

// Animated di web tidak punya native driver; di Android/iOS animasi jalan di thread native.
const NATIVE = Platform.OS !== 'web';
const HALUS_MASUK = Easing.bezier(...KURVA_MASUK);
const HALUS_KELUAR = Easing.bezier(...KURVA_KELUAR);
const MENGAMBANG = lintasanMengambang();

/**
 * Onboarding cerita (lib/onboarding.ts): empat layar sebelum Masuk/Daftar, dipasang
 * app/(auth)/_layout.tsx hanya saat app dibuka tanpa sesi tersimpan. Geser ke samping atau tekan
 * "Lanjut"; tombol kembali Android mundur satu layar. Isinya muncul bersamaan dengan memudarnya
 * layar pembuka kelinci.
 * `keluar`: pilihan sudah dibuat dan layar tujuan sudah terpasang di bawah — memudar, lalu `onHilang`.
 */
export function OnboardingScreen({
  keluar,
  onPilih,
  onHilang,
}: {
  keluar: boolean;
  onPilih: (tujuan: TujuanOnboarding) => void;
  onHilang: () => void;
}) {
  const { top, bottom } = useSafeAreaInsets();
  const pembukaMenutup = usePembukaMenutup();
  const [tanpaGerak, setTanpaGerak] = useState(false);
  const [bolehMasuk, setBolehMasuk] = useState(false);
  const [lebar, setLebar] = useState(0);
  const [tinggi, setTinggi] = useState(0);
  const [atasTeks, setAtasTeks] = useState(0);
  const [indeks, setIndeks] = useState(0);
  // Tinggi isi halaman terpanjang: semua halaman dibuat setinggi ini supaya teksnya rata bawah
  // (isi ScrollView horizontal tidak meregang sendiri ke tinggi saudaranya, terutama di web).
  const [tinggiHalaman, setTinggiHalaman] = useState(0);
  const pager = useRef<ScrollView>(null);
  const onHilangTerbaru = useRef(onHilang);
  onHilangTerbaru.current = onHilang;

  // Nilai & simpul turunan dibuat sekali (membuat ulang tiap render memasang ulang animasi native).
  const [gerak] = useState(() => {
    const muncul = new Animated.Value(0); // isi onboarding: 0 → 1
    const ambang = new Animated.Value(0); // satu putaran mengambang kelinci, diulang
    return {
      muncul,
      ambang,
      tampak: new Animated.Value(1), // seluruh onboarding: 1 → 0 saat keluar
      geser: new Animated.Value(0), // posisi geser halaman (px), untuk titik langkah
      kelinci: muncul.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1, 1] }),
      skalaKelinci: muncul.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }),
      naikKelinci: Animated.add(
        muncul.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }),
        ambang.interpolate(MENGAMBANG)
      ),
      // Teks menyusul kelinci: mulai di 35% perjalanan.
      teks: muncul.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 0, 1] }),
      naikTeks: muncul.interpolate({ inputRange: [0, 0.35, 1], outputRange: [16, 16, 0] }),
    };
  });

  useEffect(() => {
    let hidup = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => hidup && setTanpaGerak(!!v))
      .catch(() => {});
    return () => {
      hidup = false;
    };
  }, []);

  // Muncul saat layar pembuka mulai memudar. Tanpa sinyal itu (mis. muat ulang saat
  // pengembangan), mulai sendiri supaya onboarding tidak pernah tertahan tak terlihat.
  useEffect(() => {
    if (pembukaMenutup) {
      setBolehMasuk(true);
      return;
    }
    const t = setTimeout(() => setBolehMasuk(true), BATAS_TUNGGU_PEMBUKA_MS);
    return () => clearTimeout(t);
  }, [pembukaMenutup]);

  useEffect(() => {
    if (!bolehMasuk) return;
    if (tanpaGerak) {
      gerak.muncul.setValue(1);
      gerak.ambang.setValue(0);
      return;
    }
    const animasi = Animated.parallel([
      Animated.timing(gerak.muncul, { toValue: 1, duration: DURASI_MASUK_MS, easing: HALUS_MASUK, useNativeDriver: NATIVE }),
      Animated.loop(
        Animated.timing(gerak.ambang, { toValue: 1, duration: DURASI_MENGAMBANG_MS, easing: Easing.linear, useNativeDriver: NATIVE })
      ),
    ]);
    animasi.start();
    return () => animasi.stop();
  }, [bolehMasuk, tanpaGerak, gerak]);

  useEffect(() => {
    if (!keluar) return;
    const animasi = Animated.timing(gerak.tampak, {
      toValue: 0,
      duration: DURASI_KELUAR_MS,
      easing: HALUS_KELUAR,
      useNativeDriver: NATIVE,
    });
    animasi.start(({ finished }) => finished && onHilangTerbaru.current());
    return () => animasi.stop();
  }, [keluar, gerak]);

  const keLayar = (i: number) => pager.current?.scrollTo({ x: i * lebar, animated: !tanpaGerak });
  const terakhir = layarTerakhir(indeks);
  const lanjut = () => (terakhir ? onPilih('daftar') : keLayar(indeks + 1));

  // Tombol kembali Android: mundur satu layar; di layar pertama, perilaku bawaan.
  useEffect(() => {
    if (keluar || indeks === 0) return;
    const langganan = BackHandler.addEventListener('hardwareBackPress', () => {
      pager.current?.scrollTo({ x: (indeks - 1) * lebar, animated: !tanpaGerak });
      return true;
    });
    return () => langganan.remove();
  }, [keluar, indeks, lebar, tanpaGerak]);

  // Lebar berubah (jendela peramban diubah ukurannya): tetap di layar yang sama.
  useEffect(() => {
    if (lebar) pager.current?.scrollTo({ x: indeks * lebar, animated: false });
    // Sengaja hanya saat lebar berubah, bukan saat indeks berubah karena digeser.
  }, [lebar]);

  const saatGeser = useMemo(
    () =>
      Animated.event([{ nativeEvent: { contentOffset: { x: gerak.geser } } }], {
        useNativeDriver: false,
        listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => setIndeks(indeksDariGeser(e.nativeEvent.contentOffset.x, lebar)),
      }),
    [gerak, lebar]
  );

  // Titik langkah melebar/menyempit mengikuti jari, bukan melompat setelah geser selesai.
  const titik = useMemo(
    () =>
      LAYAR_ONBOARDING.map((_, i) => {
        const inputRange = [(i - 1) * lebar, i * lebar, (i + 1) * lebar];
        return {
          width: gerak.geser.interpolate({ inputRange, outputRange: [LEBAR_TITIK_PX, LEBAR_TITIK_AKTIF_PX, LEBAR_TITIK_PX], extrapolate: 'clamp' }),
          opacity: gerak.geser.interpolate({ inputRange, outputRange: [0.45, 1, 0.45], extrapolate: 'clamp' }),
        };
      }),
    [gerak, lebar]
  );

  const dalam = letakWarnaDalam(atasTeks, tinggi);
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, s.layar, { opacity: gerak.tampak }]}
      pointerEvents={keluar ? 'none' : 'auto'}
      onLayout={(e) => setTinggi(e.nativeEvent.layout.height)}
    >
      <LinearGradient
        colors={gradient.onboarding.colors}
        locations={[0, dalam * 0.55, dalam]}
        start={gradient.onboarding.start}
        end={gradient.onboarding.end}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[s.kolom, { paddingTop: top + spacing.s6, paddingBottom: bottom + spacing.s3 }]}
        onLayout={(e) => setLebar(e.nativeEvent.layout.width)}
      >
        <View style={s.atas}>
          <Animated.Image
            source={require('../../../assets/mascot-white.png')}
            style={[s.kelinci, { opacity: gerak.kelinci, transform: [{ translateY: gerak.naikKelinci }, { scale: gerak.skalaKelinci }] }]}
            resizeMode="contain"
            accessible={false}
            aria-hidden
          />
        </View>

        <Animated.View
          style={{ opacity: gerak.teks, transform: [{ translateY: gerak.naikTeks }] }}
          onLayout={(e) => setAtasTeks(e.nativeEvent.layout.y)}
        >
          {lebar ? (
            <Animated.ScrollView
              ref={pager}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              onScroll={saatGeser}
              scrollEventThrottle={16}
            >
              {LAYAR_ONBOARDING.map((layar, i) => (
                <View
                  key={layar.judul}
                  style={[s.halaman, { width: lebar }, tinggiHalaman ? { height: tinggiHalaman } : null]}
                  aria-hidden={i !== indeks}
                  importantForAccessibility={i === indeks ? 'auto' : 'no-hide-descendants'}
                >
                  <View
                    style={s.halamanIsi}
                    onLayout={(e) => {
                      const h = e.nativeEvent.layout.height;
                      setTinggiHalaman((lama) => Math.max(lama, Math.ceil(h)));
                    }}
                  >
                    <Text style={s.judul} accessibilityRole="header">
                      {layar.judul}
                    </Text>
                    {layar.isi ? <Text style={s.isi}>{layar.isi}</Text> : null}
                    {layar.butir ? (
                      <View style={s.butirDaftar}>
                        {layar.butir.map((butir) => (
                          <View key={butir} style={s.butir}>
                            <View style={s.butirTitik} />
                            <Text style={[s.isi, s.butirTeks]}>{butir}</Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                  </View>
                </View>
              ))}
            </Animated.ScrollView>
          ) : null}

          {lebar ? (
            <View style={s.titikBaris} aria-hidden importantForAccessibility="no-hide-descendants">
              {titik.map((t, i) => (
                <Animated.View key={i} style={[s.titik, t]} />
              ))}
            </View>
          ) : null}

          <View style={s.kendali}>
            <Pressable
              onPress={lanjut}
              accessibilityRole="button"
              style={({ pressed }) => [s.tombol, pressed && s.tombolTekan]}
            >
              <Text style={s.tombolTeks}>{terakhir ? TEKS_ONBOARDING.mulai : TEKS_ONBOARDING.lanjut}</Text>
            </Pressable>
            {terakhir ? (
              <Text style={s.tautanBaris}>
                {TEKS_ONBOARDING.sudahPunyaAkun}{' '}
                <Text style={s.tautan} onPress={() => onPilih('masuk')} accessibilityRole="link">
                  {TEKS_ONBOARDING.masuk}
                </Text>
              </Text>
            ) : (
              <Pressable
                onPress={() => onPilih('semula')}
                accessibilityRole="button"
                style={({ pressed }) => [s.lewati, pressed && s.lewatiTekan]}
              >
                <Text style={s.lewatiTeks}>{TEKS_ONBOARDING.lewati}</Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  layar: { backgroundColor: color.blue600, zIndex: 10 },
  kolom: { flex: 1, width: '100%', maxWidth: layout.lebarMaks, alignSelf: 'center' },
  atas: { flex: 1, minHeight: 0, alignItems: 'center', justifyContent: 'center' },
  // Berkas 1048×1048 berbingkai lega; kelinci sendiri ±60% tingginya.
  kelinci: { width: 160, height: 160, maxHeight: '100%' },
  // Setiap halaman setinggi halaman terpanjang (layar 3, berdaftar); teks rata bawah,
  // jadi judul dan isinya selalu dekat titik langkah.
  halaman: { justifyContent: 'flex-end', paddingHorizontal: spacing.gutter },
  halamanIsi: { gap: spacing.s3 },
  judul: { ...teks.h2, color: color.white },
  isi: { ...teks.body, color: color.onDarkText },
  butirDaftar: { gap: spacing.s2, marginTop: spacing.s1 },
  butir: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s3 },
  butirTitik: { width: 6, height: 6, borderRadius: 3, marginTop: 10, backgroundColor: color.onDarkText },
  butirTeks: { flex: 1 },
  titikBaris: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.s2,
    marginTop: spacing.s6,
    marginBottom: spacing.s5,
  },
  titik: { height: 6, borderRadius: 3, backgroundColor: color.white },
  kendali: { paddingHorizontal: spacing.gutter, gap: spacing.s1 },
  // Tombol putih di atas biru, seperti .btn--secondary di cover PWA. blue600 di putih 5,69:1.
  tombol: {
    minHeight: 52,
    paddingVertical: spacing.s4,
    paddingHorizontal: 28,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: color.white,
    boxShadow: shadow.s3,
  },
  tombolTekan: { backgroundColor: color.blue100, transform: [{ scale: 0.97 }] },
  tombolTeks: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, color: color.blue600 },
  lewati: { minHeight: 44, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', paddingHorizontal: spacing.s4 },
  lewatiTekan: { opacity: 0.7 },
  lewatiTeks: { fontFamily: font.medium, fontSize: 15, lineHeight: 22, color: color.white },
  // Setinggi "Lewati" supaya tombol tidak bergeser saat berganti di layar terakhir.
  tautanBaris: { ...teks.bodySm, minHeight: 44, paddingVertical: 11, textAlign: 'center', color: color.onDarkText },
  tautan: { fontFamily: font.semibold, color: color.white, textDecorationLine: 'underline' },
});
