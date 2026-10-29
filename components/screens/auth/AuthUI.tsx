import React from 'react';
import { H1, Header, Main } from '@expo/html-elements';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useProdi } from '../../../hooks/useProdi';
import { color, font, radius, shadow, spacing, teks as teksToken } from '../../../theme/tokens';

// Kerangka layar Masuk/Daftar — padanan `.appbar` + `.layar__isi` + `.kepala`
// di MVP-PWA/masuk.html & daftar.html.
export function AuthLayout({
  judul,
  pengantar,
  children,
}: {
  judul: string;
  pengantar: string;
  children: React.ReactNode;
}) {
  // Sama dengan AppBar di AppShell: tanpa inset atas, status bar HP menimpa
  // maskot & wordmark.
  const { top } = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Header style={StyleSheet.flatten([styles.appbar, { paddingTop: spacing.s3 + top }])}>
        <Image source={require('../../../assets/mascot-blue.png')} style={styles.mark} resizeMode="contain" />
        <Image
          source={require('../../../assets/lanjut-wordmark.png')}
          style={styles.wordmark}
          resizeMode="contain"
          accessibilityLabel="LANJUT"
        />
        <View style={styles.mark} />
      </Header>
      <Main style={styles.flex}>
        <ScrollView contentContainerStyle={styles.isi} keyboardShouldPersistTaps="handled">
          <View>
            <H1 style={styles.judul}>{judul}</H1>
            <Text style={styles.pengantar}>{pengantar}</Text>
          </View>
          {children}
        </ScrollView>
      </Main>
    </KeyboardAvoidingView>
  );
}

export function Field({
  label,
  labelTambahan,
  hint,
  galat,
  children,
}: {
  label: string;
  labelTambahan?: string;
  hint?: string;
  galat?: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>
        {label}
        {labelTambahan ? <Text style={styles.muted}> {labelTambahan}</Text> : null}
      </Text>
      {children}
      {galat ? (
        <Text style={styles.galat} role="alert">
          {galat}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

export function Input(props: TextInputProps) {
  const [fokus, setFokus] = React.useState(false);
  return (
    <TextInput
      placeholderTextColor={color.ink300}
      autoCapitalize="none"
      autoCorrect={false}
      {...props}
      onFocus={(e) => {
        setFokus(true);
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        setFokus(false);
        props.onBlur?.(e);
      }}
      // `style` pemanggil (mis. tinggi kolom isi Arsip) di tengah: gaya dasar
      // tetap, tetapi bingkai fokus selalu menang.
      style={StyleSheet.flatten([styles.input, props.style, fokus && styles.inputFokus])}
    />
  );
}

/**
 * Keterangan kecil di form Masuk/Daftar — gaya yang sama dengan petunjuk di
 * bawah isian (caption + textMuted, kontras 9:1). Sengaja bukan `Penafian`
 * (textSubtle, kontras ±2:1): keterangan di sini harus benar-benar terbaca.
 */
export function Keterangan({ children }: { children: string }) {
  return <Text style={styles.hint}>{children}</Text>;
}

export function PesanGalat({ teks }: { teks: string | null }) {
  if (!teks) return null;
  return (
    <Text style={styles.galat} role="alert">
      {teks}
    </Text>
  );
}

export function TombolUtama({
  label,
  labelProses,
  proses,
  nonaktif = false,
  onPress,
}: {
  label: string;
  labelProses: string;
  proses: boolean;
  /** LANJUT_047: mis. Daftar sebelum kebijakan privasi dicentang. */
  nonaktif?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={proses || nonaktif}
      accessibilityRole="button"
      aria-disabled={proses || nonaktif}
      style={({ pressed }) =>
        StyleSheet.flatten([
          styles.tombol,
          pressed && styles.tombolTekan,
          proses && styles.tombolProses,
          nonaktif && styles.tombolNonaktif,
        ])
      }
    >
      {proses && <ActivityIndicator color={color.white} />}
      <Text style={styles.tombolTeks}>{proses ? labelProses : label}</Text>
    </Pressable>
  );
}

export function TautanBawah({
  teks,
  tautan,
  onPress,
}: {
  teks: string;
  tautan: string;
  onPress: () => void;
}) {
  return (
    <Text style={styles.tautanBaris}>
      {teks}{' '}
      <Text style={styles.tautan} onPress={onPress} accessibilityRole="link">
        {tautan}
      </Text>
    </Text>
  );
}

/** Kotak centang (LANJUT_047, mis. "Saya sudah membaca kebijakan privasi"). */
export function KotakCentang({ label, tercentang, onAlih }: { label: string; tercentang: boolean; onAlih: () => void }) {
  return (
    <Pressable onPress={onAlih} accessibilityRole="checkbox" aria-checked={tercentang} style={styles.centangBaris}>
      <View style={StyleSheet.flatten([styles.centangKotak, tercentang && styles.centangKotakAktif])}>
        {tercentang ? <Text style={styles.centangTanda}>✓</Text> : null}
      </View>
      <Text style={styles.centangLabel}>{label}</Text>
    </Pressable>
  );
}

/** Nilai pilihan "Belum, aku belum tahu" — tidak pernah dikirim ke server. */
export const BELUM = 'belum';

// Keping pilihan prodi (MVP-PWA/daftar.html) — dipakai Daftar & Data Akun.
export function PilihProdi({ nilai, onPilih }: { nilai: string | null; onPilih: (id: string) => void }) {
  const prodiQuery = useProdi();
  return (
    <DaftarOpsi>
      <OpsiPil label="Belum, aku belum tahu" aktif={nilai === BELUM} onPress={() => onPilih(BELUM)} />
      {prodiQuery.isPending ? (
        <ActivityIndicator color={color.blue500} />
      ) : prodiQuery.isError ? (
        <Text style={styles.catatan}>Daftar prodi belum bisa dimuat. Kamu tetap bisa memilih “belum”.</Text>
      ) : (
        prodiQuery.data.map((p) => (
          <OpsiPil key={p.id} label={p.nama} aktif={nilai === p.id} onPress={() => onPilih(p.id)} />
        ))
      )}
    </DaftarOpsi>
  );
}

/** Deretan keping pilihan tunggal (radiogroup). */
export function DaftarOpsi({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.opsiDaftar} role="radiogroup">
      {children}
    </View>
  );
}

export function OpsiPil({ label, aktif, onPress }: { label: string; aktif: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      aria-checked={aktif}
      style={StyleSheet.flatten([styles.opsi, aktif && styles.opsiAktif])}
    >
      <Text style={StyleSheet.flatten([styles.opsiTeks, aktif && styles.opsiTeksAktif])}>{label}</Text>
    </Pressable>
  );
}

export const authStyles = StyleSheet.create({
  form: { gap: spacing.s5 },
});

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: color.surfacePage },
  appbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.s3,
    paddingHorizontal: spacing.gutter,
    backgroundColor: color.appbarBg,
    borderBottomWidth: 1,
    borderBottomColor: color.appbarBorder,
    boxShadow: shadow.appbar,
    zIndex: 2,
  },
  mark: { width: 32, height: 32 },
  wordmark: { height: 32, width: 93 },
  isi: {
    padding: spacing.gutter,
    gap: spacing.s5,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  judul: { ...teksToken.h2, color: color.textBody, marginVertical: 0 },
  pengantar: { ...teksToken.bodySm, marginTop: spacing.s1, color: color.textMuted },
  field: { gap: spacing.s2 },
  label: { ...teksToken.bodySm, fontFamily: font.medium, color: color.ink700 },
  muted: { color: color.textMuted, fontFamily: font.regular },
  hint: { ...teksToken.caption, color: color.textMuted },
  // Sistem warna LANJUT tidak punya merah — galat pun biru tua (app.css .field__error).
  galat: { ...teksToken.caption, color: color.blue600 },
  input: {
    minHeight: 48,
    paddingVertical: 13,
    paddingHorizontal: spacing.s4,
    fontFamily: font.regular,
    fontSize: 16,
    color: color.ink900,
    backgroundColor: color.white,
    borderWidth: 1,
    borderColor: color.borderSoft,
    borderRadius: radius.md,
    outlineWidth: 0,
  },
  // Padanan `.input:focus` + --focus-ring di MVP-PWA/assets/app.css.
  inputFokus: {
    borderColor: color.blue400,
    outlineWidth: 3,
    outlineStyle: 'solid',
    outlineColor: color.focusRing,
  },
  tombol: {
    flexDirection: 'row',
    gap: spacing.s2,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    paddingVertical: spacing.s4,
    paddingHorizontal: 28,
    borderRadius: radius.pill,
    // Sama dengan Tombol utama (LANJUT_027): putih di blue600 5,69:1.
    backgroundColor: color.blue600,
    boxShadow: shadow.s2,
  },
  tombolTekan: { backgroundColor: color.textMuted, transform: [{ scale: 0.97 }] },
  tombolProses: { opacity: 0.7 },
  // Nonaktif: abu-abu, bukan sekadar pudar, supaya jelas belum bisa ditekan.
  tombolNonaktif: { backgroundColor: color.ink300, boxShadow: 'none' },
  centangBaris: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.s3 },
  centangKotak: {
    width: 24,
    height: 24,
    marginTop: 1,
    borderRadius: radius.xs,
    borderWidth: 2,
    borderColor: color.blue600,
    backgroundColor: color.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centangKotakAktif: { backgroundColor: color.blue600 },
  centangTanda: { fontFamily: font.semibold, fontSize: 15, lineHeight: 18, color: color.white },
  centangLabel: { ...teksToken.bodySm, flex: 1, color: color.textBody },
  tombolTeks: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24, color: color.white },
  tautanBaris: { ...teksToken.body, textAlign: 'center', color: color.textBody },
  tautan: { fontFamily: font.semibold, color: color.textLink, textDecorationLine: 'underline' },
  opsiDaftar: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.s2 },
  opsi: {
    // LANJUT_076b: label panjang (mis. judul kartu kurasi + sumber) membungkus, tidak keluar layar.
    maxWidth: '100%',
    paddingVertical: spacing.s2,
    paddingHorizontal: spacing.s3,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.borderSoft,
    backgroundColor: color.white,
  },
  opsiAktif: { backgroundColor: color.blue600, borderColor: color.blue600 },
  opsiTeks: { ...teksToken.bodySm, color: color.ink700 },
  opsiTeksAktif: { color: color.white, fontFamily: font.semibold },
  catatan: { ...teksToken.caption, color: color.textMuted },
});
