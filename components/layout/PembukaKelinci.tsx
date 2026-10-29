import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native';

import {
  DURASI_KELUAR_MS,
  DURASI_KELUAR_TANPA_GERAK_MS,
  DURASI_MASUK_MS,
  DURASI_MENGAMBANG_MS,
  DURASI_WORDMARK_MS,
  GESER_AWAL_PX,
  JEDA_WORDMARK_MS,
  KURVA_KELUAR,
  KURVA_MASUK,
  SKALA_AWAL,
  SKALA_KELUAR,
  TUNGGU_GAMBAR_MS,
  lintasanMengambang,
  sisaSebelumTutup,
} from '../../lib/pembuka';
import { useSesi } from '../../providers/AuthProvider';
import { color } from '../../theme/tokens';

// Animated di web tidak punya native driver; di Android/iOS animasi jalan di thread native.
const NATIVE = Platform.OS !== 'web';
const HALUS_MASUK = Easing.bezier(...KURVA_MASUK);
const HALUS_KELUAR = Easing.bezier(...KURVA_KELUAR);
const MENGAMBANG = lintasanMengambang();

// Sinyal "layar pembuka mulai memudar keluar", sekali per app dibuka. Layar di bawahnya
// (onboarding) memulai animasi masuknya saat itu juga, bukan diam-diam di balik layar pembuka.
let sudahMenutup = false;
const pendengarMenutup = new Set<() => void>();

function tandaiMenutup() {
  if (sudahMenutup) return;
  sudahMenutup = true;
  pendengarMenutup.forEach((dengar) => dengar());
}

function dengarMenutup(dengar: () => void) {
  pendengarMenutup.add(dengar);
  return () => {
    pendengarMenutup.delete(dengar);
  };
}

/** true begitu layar pembuka mulai memudar keluar (atau sudah selesai). */
export function usePembukaMenutup(): boolean {
  return useSyncExternalStore(dengarMenutup, () => sudahMenutup, () => sudahMenutup);
}

/**
 * Layar pembuka tipis dengan kelinci LANJUT (lib/pembuka.ts). Dipasang SEKALI di root layout,
 * di atas semua layar, lalu dilepas sesudah memudar keluar. Hiasan saja: disembunyikan dari
 * pembaca layar dan tidak menahan app lebih dari MAKS_TAMPIL_MS.
 * `siap`: huruf sudah termuat dan sesi selesai dipulihkan.
 */
export function PembukaKelinci({ siap }: { siap: boolean }) {
  const [selesai, setSelesai] = useState(false);
  const [tanpaGerak, setTanpaGerak] = useState(false);
  const [gambarSiap, setGambarSiap] = useState(false);
  // Saat animasi masuk dimulai; waktu tampil minimum dihitung dari sini, bukan dari pemasangan.
  const [mulaiMs, setMulaiMs] = useState<number | null>(null);
  const muncul = useRef(new Animated.Value(0)).current; // kelinci: 0 → 1
  const munculWordmark = useRef(new Animated.Value(0)).current;
  const ambang = useRef(new Animated.Value(0)).current; // satu putaran mengambang: 0 → 1, diulang
  const keluar = useRef(new Animated.Value(0)).current; // seluruh layar pembuka: 0 → 1
  const menutup = useRef(false);
  // Simpul turunan dibuat sekali: membuat ulang tiap render memasang ulang animasi native
  // di tengah jalan (sumber patah-patah).
  const [gerak] = useState(() => ({
    layar: keluar.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
    skalaKeluar: keluar.interpolate({ inputRange: [0, 1], outputRange: [1, SKALA_KELUAR] }),
    // Pudar selesai di 70% perjalanan; skala & geser terus melambat sampai akhir.
    kelinci: muncul.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0, 1, 1] }),
    skalaMasuk: muncul.interpolate({ inputRange: [0, 1], outputRange: [SKALA_AWAL, 1] }),
    naik: Animated.add(
      muncul.interpolate({ inputRange: [0, 1], outputRange: [GESER_AWAL_PX, 0] }),
      ambang.interpolate(MENGAMBANG)
    ),
    naikWordmark: munculWordmark.interpolate({ inputRange: [0, 1], outputRange: [8, 0] }),
  }));

  // "Kurangi gerakan" di perangkat → tanpa membesar/mengambang.
  useEffect(() => {
    let hidup = true;
    AccessibilityInfo.isReduceMotionEnabled?.()
      .then((v) => hidup && setTanpaGerak(!!v))
      .catch(() => {});
    return () => {
      hidup = false;
    };
  }, []);

  // Gambar kelinci yang belum termuat akan muncul tiba-tiba di tengah animasi. Tunggu onLoad,
  // tetapi tidak lebih dari TUNGGU_GAMBAR_MS.
  useEffect(() => {
    const t = setTimeout(() => setGambarSiap(true), TUNGGU_GAMBAR_MS);
    return () => clearTimeout(t);
  }, []);

  // Masuk sekaligus mengambang: semuanya dimulai bersamaan, jadi tidak ada jeda tunggu JS di
  // antara selesai masuk dan mulai mengambang. Berhenti begitu layar pembuka selesai.
  useEffect(() => {
    if (selesai || !gambarSiap) return;
    setMulaiMs((m) => m ?? Date.now());
    if (tanpaGerak) {
      muncul.setValue(1);
      munculWordmark.setValue(1);
      ambang.setValue(0);
      return;
    }
    const animasi = Animated.parallel([
      Animated.timing(muncul, { toValue: 1, duration: DURASI_MASUK_MS, easing: HALUS_MASUK, useNativeDriver: NATIVE }),
      Animated.timing(munculWordmark, {
        toValue: 1,
        delay: JEDA_WORDMARK_MS,
        duration: DURASI_WORDMARK_MS,
        easing: HALUS_MASUK,
        useNativeDriver: NATIVE,
      }),
      Animated.loop(
        Animated.timing(ambang, { toValue: 1, duration: DURASI_MENGAMBANG_MS, easing: Easing.linear, useNativeDriver: NATIVE })
      ),
    ]);
    animasi.start();
    return () => animasi.stop();
  }, [selesai, gambarSiap, tanpaGerak, muncul, munculWordmark, ambang]);

  // Keluar begitu boleh (siap + minimum tampil), atau paling lama MAKS_TAMPIL_MS.
  // Hanya sekali: perubahan `siap` di tengah pudar keluar tidak memulai ulang pudarnya.
  useEffect(() => {
    if (menutup.current || mulaiMs === null) return;
    const t = setTimeout(() => {
      menutup.current = true;
      tandaiMenutup();
      Animated.timing(keluar, {
        toValue: 1,
        duration: tanpaGerak ? DURASI_KELUAR_TANPA_GERAK_MS : DURASI_KELUAR_MS,
        easing: HALUS_KELUAR,
        useNativeDriver: NATIVE,
      }).start(() => setSelesai(true));
    }, sisaSebelumTutup(siap, Date.now() - mulaiMs));
    return () => clearTimeout(t);
  }, [siap, tanpaGerak, keluar, mulaiMs]);

  if (selesai) return null;
  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, s.layar, { opacity: gerak.layar }]}
      pointerEvents="none"
      aria-hidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.View style={[s.tengah, { transform: [{ scale: tanpaGerak ? 1 : gerak.skalaKeluar }] }]}>
        <Animated.View style={{ opacity: gerak.kelinci, transform: [{ translateY: gerak.naik }, { scale: gerak.skalaMasuk }] }}>
          <Image
            source={require('../../assets/maskot-ai-biru.png')}
            style={s.kelinci}
            resizeMode="contain"
            accessible={false}
            onLoad={() => setGambarSiap(true)}
          />
        </Animated.View>
        <Animated.View style={{ opacity: munculWordmark, transform: [{ translateY: gerak.naikWordmark }] }}>
          <Image source={require('../../assets/lanjut-wordmark.png')} style={s.wordmark} resizeMode="contain" accessible={false} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  layar: { backgroundColor: color.surfacePage, zIndex: 1000, elevation: 1000 },
  tengah: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  kelinci: { width: 112, height: 112 },
  wordmark: { width: 120, height: 41 }, // berkas 1920×660
});

/** Melapor ke root layout begitu sesi selesai dipulihkan (status bukan lagi 'memuat'). */
export function TandaSesiSiap({ onSiap }: { onSiap: (siap: boolean) => void }) {
  const { status } = useSesi();
  useEffect(() => {
    if (status !== 'memuat') onSiap(true);
  }, [status, onSiap]);
  return null;
}
