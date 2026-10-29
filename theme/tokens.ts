/**
 * theme/tokens.ts — satu-satunya sumber warna, huruf, jarak, radius, dan
 * bayangan LANJUT_App. Nilai disalin dari MVP-PWA/assets/tokens.css (yang
 * sendiri salinan LandingPage/index.html), supaya aplikasi, PWA, dan landing
 * page tampil sebagai satu merek. Komponen tidak boleh menulis HEX mentah.
 *
 * Huruf: Poppins 400/500/600 — sama dengan `--font-core` di PWA. React Native
 * butuh satu nama keluarga per ketebalan, jadi ketebalan dipilih lewat
 * `font.*`, bukan `fontWeight`. Dimuat di app/_layout.tsx.
 */
import type { TextStyle } from 'react-native';

export const color = {
  blue100: '#E4F3F7',
  blue200: '#B4E1EB',
  blue300: '#95BDD7',
  blue400: '#78A4CB', // tombol utama
  blue500: '#5E88AF',
  blue600: '#456A8C',

  // Netral — tidak pernah hitam murni.
  white: '#FFFFFF',
  ink900: '#1A1A1A',
  ink700: '#3D4450',
  ink500: '#6B7480',
  ink300: '#A7AEB8',
  ink100: '#E6E9ED',
  ink050: '#F5F7F9',

  textBody: '#1A1A1A',
  textMuted: '#3D4450',
  textSubtle: '#A7AEB8',
  textOnBrand: '#FFFFFF',
  textLink: '#456A8C',
  surfaceCard: '#FFFFFF',
  surfaceSoft: '#E4F3F7',
  surfacePage: '#F5F7F9',
  borderHairline: '#E6E9ED',
  borderSoft: '#D6E5EE',
  borderBrand: '#95BDD7',

  // Status — tenang saja, tidak pernah merah atau oranye.
  statusOk: '#4E9C87',
  statusOkBg: '#E6F2EF',
  statusOkFg: '#2F6B5C',
  statusAttention: '#5E88AF',
  statusAttentionBg: '#E4EDF5',
  statusIdle: '#A7AEB8',
  statusIdleBg: '#F1F3F5',

  appbarBg: 'rgba(180,225,235,0.9)',
  appbarBorder: 'rgba(69,106,140,0.16)',
  tabbarBg: 'rgba(255,255,255,0.95)',
  onDarkSoft: 'rgba(255,255,255,0.22)',
  onDarkText: 'rgba(255,255,255,0.92)',
  focusRing: 'rgba(120,164,203,0.45)',
} as const;

// Untuk expo-linear-gradient: warna + arah (start/end) setara sudut CSS PWA.
export const gradient = {
  cover: { colors: [color.blue200, color.blue300, color.blue400], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  // --gradient-tile: linear-gradient(160deg, blue200, blue300) — kartu tenggat.
  tile: { colors: [color.blue200, color.blue300], start: { x: 0.33, y: 0 }, end: { x: 0.67, y: 1 } },
  // LANJUT_074 (pilihan di percakapan): kepala Beranda yang menyatu dengan app bar —
  // warna kartu tenggat (blue200 → blue300), tetapi tegak lurus supaya tepi atasnya
  // persis blue200, warna app bar (appbarBg), tanpa sambungan terlihat.
  kepala: { colors: [color.blue200, color.blue300], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  // Onboarding (15 Okt 2026, pilihan percakapan): seperti cover di atas, tetapi berakhir di blue600
  // supaya teks putih terbaca; letak warna terdalam dihitung dari tata letak (lib/onboarding.ts).
  onboarding: { colors: [color.blue200, color.blue400, color.blue600], start: { x: 0, y: 0 }, end: { x: 0, y: 1 } },
  // .progress__isi: linear-gradient(90deg, blue200, blue400).
  progress: { colors: [color.blue200, color.blue400], start: { x: 0, y: 0 }, end: { x: 1, y: 0 } },
} as const;

export const spacing = {
  s1: 4, s2: 8, s3: 12, s4: 16, s5: 20, s6: 24, s8: 32, s10: 40, s12: 48,
  gutter: 20,
} as const;

export const radius = {
  xs: 8, sm: 12, md: 16, lg: 24, xl: 32, pill: 999,
} as const;

export const shadow = {
  s1: '0px 1px 2px rgba(69,106,140,0.08)',
  s2: '0px 2px 8px rgba(69,106,140,0.10)',
  s3: '0px 6px 20px rgba(69,106,140,0.12)',
  appbar: '0px 2px 12px -2px rgba(45,75,105,0.06)',
} as const;

export const font = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_500Medium',
  semibold: 'Poppins_600SemiBold',
} as const;

// Padanan `--text-*` di tokens.css (ukuran/tinggi baris/ketebalan).
export const teks = {
  h1: { fontFamily: font.semibold, fontSize: 32, lineHeight: 36 },
  h2: { fontFamily: font.semibold, fontSize: 24, lineHeight: 30 },
  h3: { fontFamily: font.semibold, fontSize: 18, lineHeight: 24 },
  title: { fontFamily: font.medium, fontSize: 20, lineHeight: 27 },
  bodyLg: { fontFamily: font.regular, fontSize: 18, lineHeight: 29 },
  body: { fontFamily: font.regular, fontSize: 16, lineHeight: 26 },
  bodySm: { fontFamily: font.regular, fontSize: 14, lineHeight: 22 },
  caption: { fontFamily: font.regular, fontSize: 13, lineHeight: 19 },
  // .seksi__judul / .pasangan__label / .peringatan__judul: huruf kapital berjarak.
  label: { fontFamily: font.medium, fontSize: 13, lineHeight: 19, letterSpacing: 1, textTransform: 'uppercase' },
  angkaBesar: { fontFamily: font.semibold, fontSize: 48, lineHeight: 53 },
} satisfies Record<string, TextStyle>;

/** Dipertahankan untuk kode lama; kode baru pakai `teks` & `font`. */
export const typography = {
  size: {
    h1: 32, h2: 24, h3: 18, lead: 17, title: 20,
    body: 16, bodySm: 14, caption: 13, label: 12,
  },
  weight: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
} as const;

export const layout = {
  // .app di PWA: kolom maksimal 420px di tengah layar lebar.
  lebarMaks: 420,
  tinggiAppbar: 56,
} as const;

export const theme = { color, gradient, spacing, radius, shadow, font, teks, layout } as const;
export type Theme = typeof theme;
