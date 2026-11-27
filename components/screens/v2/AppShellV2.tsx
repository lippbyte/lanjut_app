import React, { useEffect, useMemo, useRef } from 'react';
import { Header, Main } from '@expo/html-elements';
import { useFonts } from '@expo-google-fonts/poppins';
import Constants from 'expo-constants';
import { usePathname, useRouter } from 'expo-router';
import { Animated, BackHandler, Easing, Image, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useKurangiGerak } from '../../../hooks/useKurangiGerak';
import { TEKS_ARAH_SAYA } from '../../../lib/arahSaya';
import { discoverAktif, jalurTujuanAktif, kelolaDataAkunAktif, portofolioAktif } from '../../../lib/fiturApp';
import { gerakBoleh } from '../../../lib/kurangiGerak';
import {
  PINTU_TAB_V2,
  daftarTabV2,
  judulHalamanAnakV2,
  tabAktifV2,
  tujuanKembaliV2,
} from '../../../lib/navigasiV2';
import { useSesi } from '../../../providers/AuthProvider';
import { garis, gerak, radius, ruang, tataLetak, ukuran } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';
import { Ikon, Kartu, Sentuh, Teks } from '../../v2';
import { PilihModeTampilanV2 } from './PilihModeTampilanV2';
import { TabBarV2 } from './TabBarV2';

const EXTRA = Constants.expoConfig?.extra;
const SAKLAR = {
  discover: discoverAktif(EXTRA),
  jalurTujuan: jalurTujuanAktif(EXTRA),
  portofolio: portofolioAktif(EXTRA),
  kelolaDataAkun: kelolaDataAkunAktif(EXTRA),
};

const TANPA_GULIR_HALAMAN = new Set(['/ngobrol']);
const NATIVE = Platform.OS !== 'web';
const [x1, y1, x2, y2] = gerak.kurva.standar;

/**
 * Shell navigasi v2 (LANJUT_031, dua mode + Phosphor LANJUT_031b, saklar EXPO_PUBLIC_NAVIGASI_V2).
 * - Membaca daftar tab dari satu konfigurasi (`lib/navigasiV2.ts`).
 * - Memuat Source Sans 3 lokal untuk tipografi badan v2 bila belum dimuat oleh alur masuk v2.
 * - Transisi singkat antarlayar dan tab yang tunduk pada "Kurangi gerakan".
 * - Menangani tombol kembali Android tanpa perulangan antar-tab.
 * - Menyediakan pintu ke Langkah Saya di Jejak Waktu (/linimasa), pintu ke Akun & Privasi di
 *   Profil Saya (/discover-profil), dan pilihan mode tampilan di Akun & Privasi (/akun, hanya saat
 *   EXPO_PUBLIC_MODE_GELAP=1) tanpa menyentuh berkas layar v1.
 */
export function AppShellV2({ children }: { children: React.ReactNode }) {
  useFonts({
    SourceSans3_400Regular: require('../../../assets/fonts/SourceSans3_400Regular.ttf'),
    SourceSans3_600SemiBold: require('../../../assets/fonts/SourceSans3_600SemiBold.ttf'),
  });

  const { mode, warna, saklarAktif: modeGelap } = useTemaV2();
  const pathname = usePathname();
  const router = useRouter();
  const { pengguna } = useSesi();
  const { top } = useSafeAreaInsets();
  const kurangiGerak = useKurangiGerak();
  const tabs = useMemo(() => daftarTabV2(SAKLAR), []);
  const aktif = tabAktifV2(pathname, tabs);
  const judulAnak = judulHalamanAnakV2(pathname, pengguna?.kelas, tabs);
  const pintuTab = PINTU_TAB_V2.find((p) => p.diRute === pathname) ?? null;
  const tampilPilihMode = modeGelap && pathname === '/akun';

  const muncul = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!gerakBoleh(kurangiGerak)) {
      muncul.setValue(1);
      return;
    }
    muncul.setValue(0);
    const anim = Animated.timing(muncul, {
      toValue: 1,
      duration: gerak.durasi.cepat,
      easing: Easing.bezier(x1, y1, x2, y2),
      useNativeDriver: NATIVE,
    });
    anim.start();
    return () => anim.stop();
    // Hanya saat layar/tab berganti.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const langganan = BackHandler.addEventListener('hardwareBackPress', () => {
      const aksi = tujuanKembaliV2({ pathname, canGoBack: router.canGoBack(), tabs });
      if (aksi.aksi === 'keluar') return false;
      if (aksi.aksi === 'kembali') router.back();
      else router.replace(aksi.href as any);
      return true;
    });
    return () => langganan.remove();
  }, [pathname, router, tabs]);

  const pilihTab = (href: string) => {
    if (href === pathname) return;
    // replace mencegah perulangan bolak-balik antar-tab pada riwayat kembali.
    router.replace(href as any);
  };

  const kembaliAtas = () => {
    const aksi = tujuanKembaliV2({ pathname, canGoBack: router.canGoBack(), tabs, dariBilahAtas: true });
    if (aksi.aksi === 'kembali') router.back();
    else if (aksi.aksi === 'ganti') router.replace(aksi.href as any);
  };

  // Di mode gelap wordmark tampil langsung di atas `bg` (warna.halaman); di mode terang di dalam badge biru LANJUT.
  const latarAppbar = mode === 'gelap' ? warna.halaman : warna.permukaan;

  return (
    <View style={StyleSheet.flatten([s.akar, { backgroundColor: warna.halaman }])}>
      <Header
        style={StyleSheet.flatten([
          s.appbar,
          { backgroundColor: latarAppbar, borderBottomColor: warna.garisHalus, paddingTop: top + ruang.r1 },
        ])}
      >
        {judulAnak ? (
          <View style={s.barisAnak}>
            <Sentuh
              peran="button"
              label={TEKS_ARAH_SAYA.kembali}
              onPress={kembaliAtas}
              gaya={({ ditekan }) => [s.tombolKembali, ditekan && { backgroundColor: warna.permukaanLembut }]}
            >
              <Ikon nama="kembali" ukuran={ukuran.ikon} warna={warna.teks} />
            </Sentuh>
            <Teks varian="judulKecil" baris={1} gaya={s.judulAnak}>
              {judulAnak}
            </Teks>
          </View>
        ) : (
          <View style={s.barisMerek}>
            {/* [PERLU DIKONFIRMASI]: penampung sementara wordmark putih di mode terang (#78A4CB, token badgeLogo). */}
            <View
              style={StyleSheet.flatten([
                s.wordmarkBadge,
                mode === 'terang' ? { backgroundColor: warna.badgeLogo } : null,
              ])}
            >
              <Image
                source={require('../../../assets/lanjut-wordmark.png')}
                style={s.wordmark}
                resizeMode="contain"
                accessibilityLabel="LANJUT"
              />
            </View>
          </View>
        )}
      </Header>

      <Main style={s.main}>
        <Animated.View style={StyleSheet.flatten([s.isiAnimasi, { opacity: muncul }])}>
          {TANPA_GULIR_HALAMAN.has(pathname) ? (
            <View style={StyleSheet.flatten([s.kolomPenuh, { backgroundColor: warna.permukaan }])}>{children}</View>
          ) : (
            <ScrollView contentContainerStyle={StyleSheet.flatten([s.gulir, { backgroundColor: warna.halaman }])} keyboardShouldPersistTaps="handled">
              <View style={s.kolom}>
                {pintuTab ? (
                  <View style={s.pintuTabWadah}>
                    <Kartu
                      varian="lembut"
                      judul={pintuTab.label}
                      onPress={() => router.push(pintuTab.keHref as any)}
                    />
                  </View>
                ) : null}
                {tampilPilihMode && !SAKLAR.kelolaDataAkun ? (
                  <View style={s.pintuTabWadah}>
                    <PilihModeTampilanV2 />
                  </View>
                ) : null}
                {children}
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </Main>

      <TabBarV2 tabs={tabs} aktif={aktif} onPilih={pilihTab} />
    </View>
  );
}

const s = StyleSheet.create({
  akar: { flex: 1 },
  appbar: {
    borderBottomWidth: garis.tipis,
    paddingBottom: ruang.r1,
    paddingHorizontal: ruang.tepi,
  },
  barisMerek: {
    minHeight: ukuran.sentuhMin,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: tataLetak.lebarMaks,
    alignSelf: 'center',
  },
  wordmarkBadge: {
    paddingHorizontal: ruang.r2,
    paddingVertical: ruang.r1,
    borderRadius: radius.kecil,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wordmark: { height: ukuran.ikonBesar, width: ukuran.lingkaranIkon + ukuran.ikonBesar },
  barisAnak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: ruang.r1,
    width: '100%',
    maxWidth: tataLetak.lebarMaks,
    alignSelf: 'center',
  },
  tombolKembali: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pil,
  },
  judulAnak: { flex: 1 },
  main: { flex: 1 },
  isiAnimasi: { flex: 1 },
  gulir: { flexGrow: 1 },
  kolom: { width: '100%', maxWidth: tataLetak.lebarMaks, alignSelf: 'center', flexGrow: 1 },
  kolomPenuh: { flex: 1, width: '100%', maxWidth: tataLetak.lebarMaks, alignSelf: 'center' },
  pintuTabWadah: { paddingHorizontal: ruang.tepi, paddingTop: ruang.r2 },
});
