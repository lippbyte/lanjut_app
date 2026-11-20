/**
 * Galeri komponen v2 (LANJUT_029): layar khusus pengembang untuk melihat komponen dasar.
 * Bawaan MATI. Terdaftar hanya bila keduanya benar:
 *   1. bundel pengembangan (__DEV__), dan
 *   2. build dibuat dengan EXPO_PUBLIC_GALERI_KOMPONEN=1 (extra.galeriKomponen di app.config.ts).
 * Lapis pertama: metro.config.js mengeluarkan berkas rutenya dari bundel bila saklar mati atau
 * NODE_ENV=production. Lapis kedua: berkas rute memanggil fungsi di bawah dan mengalihkan ke "/".
 */
export function galeriKomponenAktif(extra: unknown): boolean {
  if (!extra || typeof extra !== 'object') return false;
  return (extra as { galeriKomponen?: unknown }).galeriKomponen === true;
}

export function galeriKomponenTerdaftar(dev: unknown, extra: unknown): boolean {
  return dev === true && galeriKomponenAktif(extra);
}

export const RUTE_GALERI_KOMPONEN = '/galeri-komponen';
