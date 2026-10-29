import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ApiError } from '../../api/client';
import type { StatusPersetujuan } from '../../api/types';
import { usePersetujuan, useTerimaKebijakan } from '../../hooks/usePersetujuan';
import { useTundaKebijakan } from '../../hooks/useTundaKebijakan';
import { RINGKASAN_KEBIJAKAN, keadaanKebijakan, perluTerimaUlang } from '../../lib/kebijakanPrivasi';
import { color, font, layout, radius, spacing, teks } from '../../theme/tokens';
import { KeadaanGalat, Kartu, Memuat, Tombol, gaya } from '../ui';
import { IsiKebijakan } from './KebijakanPrivasiScreen';

// Salinan teks §4.14 (LANJUT_048) — DRAF belum disetujui Khalifa. Ringkasan &
// isi lengkap dari lib/kebijakan-privasi.json (LANJUT_047), tidak ditulis ulang.
const JUDUL = 'Kebijakan privasi';
const PENGANTAR_BARU =
  'Baca ringkasan kebijakan privasi LANJUT di bawah, lalu terima. Semua fitur tetap bisa kamu pakai; penerimaan ini dibutuhkan untuk fitur AI nanti.';
const pengantarUlang = (n: number) => `Kebijakan privasi LANJUT diperbarui ke versi ${n}. Baca ringkasannya, lalu terima versi terbaru.`;
const versiAppBerbeda = (n: number) =>
  `Versi terbaru kebijakan privasi (versi ${n}) belum ada di aplikasimu. Muat ulang atau perbarui aplikasi, lalu terima versi terbaru.`;
const sudahDiterima = (n: number) => `Kebijakan privasi versi ${n} sudah kamu terima.`;
const GALAT_SIMPAN = 'Belum tersimpan. Coba lagi sebentar lagi.';
const BELUM_TERSEDIA = 'Kebijakan privasi belum bisa dimuat. Coba lagi sebentar lagi.';

/**
 * Isi layar/jendela penerimaan kebijakan (LANJUT_048). Dipakai prompt otomatis
 * setelah login dan halaman /terima-kebijakan. "Terima" mencatat
 * kebijakan_privasi / mandiri lewat POST /persetujuan (LANJUT_047); `onNanti`
 * tidak mencatat apa pun.
 *
 * `dalamJendela`: isi bergulir, tombol di kaki jendela yang SELALU terlihat —
 * "Nanti saja" harus sama mudah dijangkau dengan "Terima" (persetujuan yang
 * bebas), tidak boleh tersembunyi di bawah lipatan layar 360 px.
 */
export function PanelTerimaKebijakan({
  status,
  onNanti,
  labelNanti = 'Nanti saja',
  dalamJendela = false,
}: {
  status: StatusPersetujuan;
  onNanti: () => void;
  labelNanti?: string;
  dalamJendela?: boolean;
}) {
  const terima = useTerimaKebijakan();
  const [lengkap, setLengkap] = useState(false);
  const keadaan = keadaanKebijakan(status);
  const berlaku = status.versi_kebijakan_berlaku ?? 0;
  const tombolNanti = <Tombol label={labelNanti} varian="garis" penuh onPress={onNanti} />;

  let isi: React.ReactNode;
  let aksi: React.ReactNode = tombolNanti;
  if (keadaan === 'diterima' || keadaan === 'tidak_tersedia') {
    isi = (
      <Text style={gaya.teksKecil}>
        {keadaan === 'diterima' ? sudahDiterima(status.kebijakan_privasi?.versi ?? berlaku) : BELUM_TERSEDIA}
      </Text>
    );
  } else if (keadaan === 'versi_app_berbeda') {
    isi = <Text style={gaya.teksKecil}>{versiAppBerbeda(berlaku)}</Text>;
  } else {
    const galat = terima.isError ? (terima.error instanceof ApiError ? terima.error.message : GALAT_SIMPAN) : null;
    isi = (
      <>
        <Text style={gaya.teksKecil}>{perluTerimaUlang(status) ? pengantarUlang(berlaku) : PENGANTAR_BARU}</Text>
        <View style={s.ringkasan}>
          {RINGKASAN_KEBIJAKAN.map((t) => (
            <View key={t} style={s.butir}>
              <Text style={s.butirTeks}>•</Text>
              <Text style={[s.butirTeks, s.flex]}>{t}</Text>
            </View>
          ))}
        </View>
        <Text style={s.tautan} onPress={() => setLengkap((v) => !v)} accessibilityRole="link" aria-expanded={lengkap}>
          {lengkap ? 'Sembunyikan kebijakan lengkap' : 'Baca kebijakan privasi lengkap'}
        </Text>
        {lengkap ? <IsiKebijakan /> : null}
        {galat ? (
          <Text style={s.galat} role="alert">
            {galat}
          </Text>
        ) : null}
      </>
    );
    aksi = (
      <>
        <Tombol label={terima.isPending ? 'Menyimpan…' : 'Terima'} penuh proses={terima.isPending} onPress={() => terima.mutate()} />
        {tombolNanti}
      </>
    );
  }

  const kepala = (
    <Text style={s.judul} role="heading" aria-level={2}>
      {JUDUL}
    </Text>
  );
  if (!dalamJendela) {
    return (
      <View style={s.panel}>
        {kepala}
        {isi}
        <View style={s.aksi}>{aksi}</View>
      </View>
    );
  }
  return (
    <>
      <ScrollView style={s.gulir} contentContainerStyle={[s.jendelaIsi, s.panel]}>
        {kepala}
        {isi}
      </ScrollView>
      <View style={s.kaki}>{aksi}</View>
    </>
  );
}

/**
 * Prompt otomatis setelah login (LANJUT_048), dipasang di app/(app)/_layout.tsx
 * SESUDAH gerbang isi kelas & jenis sekolah. Muncul bila kebijakan versi
 * berlaku belum diterima; "Nanti saja" menutupnya untuk sisa sesi login itu.
 * Tidak memblokir apa pun: semua layar tetap bisa dibuka setelah ditutup.
 */
export function PromptKebijakan() {
  const { data } = usePersetujuan();
  const { siap, ditunda, tunda } = useTundaKebijakan();
  if (!data || !siap) return null;
  const keadaan = keadaanKebijakan(data);
  const tampil = !ditunda && (keadaan === 'bisa_diterima' || keadaan === 'versi_app_berbeda');
  return (
    <Modal visible={tampil} transparent animationType="fade" onRequestClose={tunda}>
      <View style={s.latar}>
        <View style={s.jendela} role="dialog" aria-modal aria-label={JUDUL}>
          <PanelTerimaKebijakan status={data} onNanti={tunda} dalamJendela />
        </View>
      </View>
    </Modal>
  );
}

/** Halaman /terima-kebijakan — dari Data Akun dan Ngobrol (LANJUT_048). */
export function TerimaKebijakanScreen() {
  const router = useRouter();
  const { data, isPending, isError } = usePersetujuan();
  const kembali = () => (router.canGoBack() ? router.back() : router.replace('/akun'));
  if (isPending) return <View style={gaya.layarIsiRapat}><Memuat /></View>;
  if (isError || !data) return <View style={gaya.layarIsiRapat}><KeadaanGalat /></View>;
  return (
    <View style={gaya.layarIsiRapat}>
      <Kartu>
        <PanelTerimaKebijakan status={data} onNanti={kembali} labelNanti="Kembali" />
      </Kartu>
    </View>
  );
}

const s = StyleSheet.create({
  panel: { gap: spacing.s3 },
  judul: { ...teks.h3, color: color.textBody },
  ringkasan: { gap: spacing.s2 },
  butir: { flexDirection: 'row', gap: spacing.s2 },
  butirTeks: { ...teks.caption, color: color.ink700 },
  flex: { flex: 1 },
  tautan: { ...teks.bodySm, fontFamily: font.semibold, color: color.textLink, textDecorationLine: 'underline' },
  galat: { ...teks.caption, color: color.blue600 },
  aksi: { gap: spacing.s2, marginTop: spacing.s2 },
  latar: { flex: 1, backgroundColor: 'rgba(26, 26, 26, 0.45)', justifyContent: 'center', padding: spacing.gutter },
  jendela: {
    width: '100%',
    maxWidth: layout.lebarMaks,
    maxHeight: '90%',
    alignSelf: 'center',
    borderRadius: radius.lg,
    backgroundColor: color.surfacePage,
    overflow: 'hidden',
  },
  gulir: { flexShrink: 1 },
  jendelaIsi: { padding: spacing.s5 },
  kaki: {
    gap: spacing.s2,
    paddingHorizontal: spacing.s5,
    paddingTop: spacing.s3,
    paddingBottom: spacing.s5,
    borderTopWidth: 1,
    borderTopColor: color.borderSoft,
  },
});
