/**
 * Token tema v2 selain warna (LANJUT_029, usulan di docs/desain-token-v2.md). Modul murni.
 * Belum dipakai layar mana pun.
 *
 * Skala font sistem dihormati: ukuran di sini adalah ukuran dasar, dan komponen v2 tidak
 * mematikan allowFontScaling serta tidak memberi tinggi tetap pada wadah teks.
 */
import type { TextStyle } from 'react-native';

/**
 * Poppins untuk judul dan tombol; Source Sans 3 untuk isi (design.md §3, keputusan 20 Nov 2026).
 * Source Sans 3 Regular dan SemiBold adalah berkas lokal berlisensi SIL OFL di assets/fonts/
 * (LANJUT_030), dimuat app/_layout.tsx hanya bila alur masuk v2 atau galeri komponen menyala.
 * Bila belum termuat, React Native memakai huruf sistem.
 */
export const keluargaHuruf = {
  judulTebal: 'Poppins_600SemiBold',
  judulSedang: 'Poppins_500Medium',
  badan: 'SourceSans3_400Regular',
  badanTebal: 'SourceSans3_600SemiBold',
} as const;

/** Nama keluarga untuk badan menurut design.md §3. */
export const HURUF_BADAN_TUJUAN = 'Source Sans 3';

export type VarianTeks = 'h1' | 'h2' | 'judulKecil' | 'badan' | 'badanKecil' | 'keterangan' | 'tombol';

/** Ukuran dasar dalam pt/dp. Rasio tinggi baris 1,3 untuk judul dan 1,45–1,55 untuk badan. */
export const tipografi: Readonly<Record<VarianTeks, TextStyle & { fontSize: number; lineHeight: number }>> = {
  h1: { fontFamily: keluargaHuruf.judulTebal, fontSize: 28, lineHeight: 36 },
  h2: { fontFamily: keluargaHuruf.judulSedang, fontSize: 20, lineHeight: 28 },
  judulKecil: { fontFamily: keluargaHuruf.judulTebal, fontSize: 17, lineHeight: 24 },
  badan: { fontFamily: keluargaHuruf.badan, fontSize: 17, lineHeight: 26 },
  badanKecil: { fontFamily: keluargaHuruf.badan, fontSize: 15, lineHeight: 22 },
  keterangan: { fontFamily: keluargaHuruf.badan, fontSize: 14, lineHeight: 20 },
  tombol: { fontFamily: keluargaHuruf.judulTebal, fontSize: 16, lineHeight: 22 },
};

/** Jarak: kelipatan 8. Tepi kiri-kanan layar 16 (360 px → kolom isi 328 px). */
export const ruang = {
  r1: 8,
  r2: 16,
  r3: 24,
  r4: 32,
  r5: 40,
  r6: 48,
  r8: 64,
  tepi: 16,
} as const;

export const radius = {
  kecil: 8,
  sedang: 16,
  besar: 24,
  pil: 999,
} as const;

export const garis = {
  tipis: 1,
  fokus: 2,
} as const;

/** Elevasi minimal: datar (garis tipis saja) atau satu bayangan halus tanpa blur besar. */
export const elevasi = {
  datar: {},
  angkat: { boxShadow: '0px 1px 3px rgba(26, 26, 26, 0.08)' },
} as const;

/**
 * Ukuran (pt/dp). sentuhMin 44 = batas sentuh minimal (Apple HIG 44 pt; Android 48 dp
 * disarankan). Ikon dan lingkaran ikon kelipatan 4 atau 8.
 */
export const ukuran = {
  sentuhMin: 44,
  ikon: 20,
  ikonBesar: 32,
  lingkaranIkon: 64,
  kerangkaBaris: 16,
  kerangkaPendek: '60%',
} as const;

/**
 * Gerak: singkat dan tenang. Gerak non-esensial mati bila "Kurangi gerakan" di perangkat
 * menyala (lib/kurangiGerak.ts, hooks/useKurangiGerak.ts). Kurva = titik kontrol bezier.
 */
export const gerak = {
  durasi: { cepat: 120, standar: 200, lambat: 300 },
  kurva: { standar: [0.2, 0, 0, 1], keluar: [0.4, 0, 1, 1] },
  /** Opasitas terendah denyut placeholder memuat. */
  denyutRedup: 0.55,
} as const;

export const tataLetak = {
  /** Kolom isi maksimal di layar lebar, sama dengan v1 (theme/tokens.ts layout.lebarMaks). */
  lebarMaks: 420,
} as const;
