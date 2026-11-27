import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ApiError } from '../../../api/client';
import { usePersetujuan, useTerimaKebijakan } from '../../../hooks/usePersetujuan';
import {
  ISI_KEBIJAKAN,
  RINGKASAN_KEBIJAKAN,
  STATUS_KEBIJAKAN,
  VERSI_KEBIJAKAN,
  keadaanKebijakan,
  perluTerimaUlang,
} from '../../../lib/kebijakanPrivasi';
import { useSesi } from '../../../providers/AuthProvider';
import { radius, ruang, tataLetak } from '../../../theme/v2';
import { useTemaV2 } from '../../../theme/v2/konteks';
import { HeaderLayar, Kartu, KeadaanGalat, PesanStatus, PlaceholderMemuat, Teks, Tombol } from '../../v2';

const TEKS = {
  judulHalaman: 'Kebijakan Privasi',
  pengantarHalaman: 'Data apa yang disimpan LANJUT, untuk apa, dan apa hakmu.',
  kembali: 'Kembali',
  versiAwalan: 'Versi',
  butirSimbol: '•',
  judulTerima: 'Kebijakan privasi',
  pengantarBaru:
    'Baca ringkasan kebijakan privasi LANJUT di bawah, lalu terima. Semua fitur tetap bisa kamu pakai; penerimaan ini dibutuhkan untuk fitur AI nanti.',
  pengantarUlang: (n: number) =>
    `Kebijakan privasi LANJUT diperbarui ke versi ${n}. Baca ringkasannya, lalu terima versi terbaru.`,
  versiAppBerbeda: (n: number) =>
    `Versi terbaru kebijakan privasi (versi ${n}) belum ada di aplikasimu. Muat ulang atau perbarui aplikasi, lalu terima versi terbaru.`,
  sudahDiterima: (n: number) => `Kebijakan privasi versi ${n} sudah kamu terima.`,
  galatSimpan: 'Belum tersimpan. Coba lagi sebentar lagi.',
  belumTersedia: 'Kebijakan privasi belum bisa dimuat. Coba lagi sebentar lagi.',
  bacaLengkap: 'Baca kebijakan privasi lengkap',
  sembunyikanLengkap: 'Sembunyikan kebijakan lengkap',
  terima: 'Terima',
  menyimpan: 'Menyimpan…',
  memuat: 'Memuat kebijakan privasi',
  galatJudul: 'Belum bisa memuat kebijakan',
  galatPesan: 'Periksa sambunganmu, lalu coba lagi.',
} as const;

/**
 * Tampilan dua mode untuk isi lengkap kebijakan privasi (LANJUT_039).
 * Seluruh isi teks diambil langsung dari `lib/kebijakanPrivasi.ts` (lib/kebijakan-privasi.json)
 * tanpa mengubah satu karakter pun; hanya warna dan latar mengikuti token v2 dua mode.
 */
export function IsiKebijakanV2() {
  const { warna } = useTemaV2();
  return (
    <View style={s.isi}>
      <View style={StyleSheet.flatten([s.kotakStatus, { backgroundColor: warna.permukaan }])} role="note">
        <Teks varian="badanKecil">{STATUS_KEBIJAKAN}</Teks>
      </View>
      <Teks varian="keterangan" warna="teksSekunder">
        {`${TEKS.versiAwalan} ${VERSI_KEBIJAKAN}`}
      </Teks>
      {ISI_KEBIJAKAN.map((b) => (
        <View key={b.judul} style={s.bagian}>
          <Teks varian="judulKecil">{b.judul}</Teks>
          {(b.paragraf ?? []).map((p) => (
            <Teks key={p} varian="badanKecil">
              {p}
            </Teks>
          ))}
          {(b.butir ?? []).map((p) => (
            <View key={p} style={s.butir}>
              <Teks varian="badanKecil">{TEKS.butirSimbol}</Teks>
              <Teks varian="badanKecil" gaya={s.flex}>
                {p}
              </Teks>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Halaman /kebijakan-privasi versi dua mode (LANJUT_039), aktif hanya bila saklar
 * `EXPO_PUBLIC_MODE_GELAP` atau `EXPO_PUBLIC_NAVIGASI_V2` menyala.
 */
export function KebijakanPrivasiV2() {
  const router = useRouter();
  const { status } = useSesi();
  const { warna } = useTemaV2();
  const { top, bottom } = useSafeAreaInsets();
  const kembali = () => {
    if (router.canGoBack()) router.back();
    else router.replace(status === 'masuk' ? '/akun' : '/daftar');
  };
  return (
    <View style={StyleSheet.flatten([s.halaman, { backgroundColor: warna.halaman, paddingTop: top, paddingBottom: bottom }])}>
      <ScrollView contentContainerStyle={s.gulirHalaman} keyboardShouldPersistTaps="handled">
        <HeaderLayar
          tanpaTepi
          judul={TEKS.judulHalaman}
          ringkasan={TEKS.pengantarHalaman}
          onKembali={kembali}
        />
        <IsiKebijakanV2 />
        <Tombol label={TEKS.kembali} penuh onPress={kembali} />
      </ScrollView>
    </View>
  );
}

/**
 * Halaman /terima-kebijakan versi dua mode (LANJUT_039), aktif hanya bila saklar
 * `EXPO_PUBLIC_MODE_GELAP` atau `EXPO_PUBLIC_NAVIGASI_V2` menyala. Memakai hook dan
 * logika persetujuan yang sama persis dengan layar v1.
 */
export function TerimaKebijakanV2() {
  const router = useRouter();
  const persetujuan = usePersetujuan();
  const terima = useTerimaKebijakan();
  const [lengkap, setLengkap] = useState(false);
  const kembali = () => (router.canGoBack() ? router.back() : router.replace('/akun'));

  if (persetujuan.isPending) {
    return (
      <View style={s.wadahDalam}>
        <PlaceholderMemuat baris={3} label={TEKS.memuat} />
      </View>
    );
  }
  if (persetujuan.isError || !persetujuan.data) {
    return (
      <View style={s.wadahDalam}>
        <KeadaanGalat judul={TEKS.galatJudul} pesan={TEKS.galatPesan} onCobaLagi={() => void persetujuan.refetch()} />
      </View>
    );
  }

  const data = persetujuan.data;
  const keadaan = keadaanKebijakan(data);
  const berlaku = data.versi_kebijakan_berlaku ?? 0;
  const galat = terima.isError ? (terima.error instanceof ApiError ? terima.error.message : TEKS.galatSimpan) : null;

  return (
    <View style={s.wadahDalam}>
      <Kartu>
        <View style={s.isi}>
          <Teks varian="judulKecil">{TEKS.judulTerima}</Teks>
          {keadaan === 'diterima' || keadaan === 'tidak_tersedia' ? (
            <Teks varian="badanKecil">
              {keadaan === 'diterima' ? TEKS.sudahDiterima(data.kebijakan_privasi?.versi ?? berlaku) : TEKS.belumTersedia}
            </Teks>
          ) : keadaan === 'versi_app_berbeda' ? (
            <Teks varian="badanKecil">{TEKS.versiAppBerbeda(berlaku)}</Teks>
          ) : (
            <>
              <Teks varian="badanKecil">
                {perluTerimaUlang(data) ? TEKS.pengantarUlang(berlaku) : TEKS.pengantarBaru}
              </Teks>
              <View style={s.ringkasan}>
                {RINGKASAN_KEBIJAKAN.map((t) => (
                  <View key={t} style={s.butir}>
                    <Teks varian="badanKecil">{TEKS.butirSimbol}</Teks>
                    <Teks varian="badanKecil" gaya={s.flex}>
                      {t}
                    </Teks>
                  </View>
                ))}
              </View>
              <Tombol
                varian="teks"
                label={lengkap ? TEKS.sembunyikanLengkap : TEKS.bacaLengkap}
                onPress={() => setLengkap((v) => !v)}
              />
              {lengkap ? <IsiKebijakanV2 /> : null}
              {galat ? (
                <PesanStatus jenis="galat" berlatar>
                  {galat}
                </PesanStatus>
              ) : null}
              <Tombol
                label={terima.isPending ? TEKS.menyimpan : TEKS.terima}
                penuh
                memuat={terima.isPending}
                onPress={() => terima.mutate()}
              />
            </>
          )}
          <Tombol varian="sekunder" label={TEKS.kembali} penuh onPress={kembali} />
        </View>
      </Kartu>
    </View>
  );
}

const s = StyleSheet.create({
  halaman: { flex: 1 },
  gulirHalaman: {
    padding: ruang.tepi,
    gap: ruang.r2,
    width: '100%',
    maxWidth: tataLetak.lebarMaks,
    alignSelf: 'center',
  },
  wadahDalam: {
    padding: ruang.tepi,
    gap: ruang.r2,
  },
  isi: { gap: ruang.r2 },
  kotakStatus: { padding: ruang.r2, borderRadius: radius.sedang },
  bagian: { gap: ruang.r1 },
  ringkasan: { gap: ruang.r1 },
  butir: { flexDirection: 'row', gap: ruang.r1 },
  flex: { flex: 1 },
});
