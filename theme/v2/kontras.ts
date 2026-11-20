/**
 * Rasio kontras WCAG 2.x (LANJUT_029). Modul murni: dipakai tes kontras dan skrip
 * server/tools/kontras-token.js, tanpa React Native.
 *
 * Ambang: teks biasa 4,5:1; teks besar (≥ 24 px, atau ≥ 18,66 px tebal) 3:1; batas kontrol,
 * cincin fokus, dan ikon yang membawa arti 3:1 (WCAG 1.4.3 dan 1.4.11).
 */

export type JenisPasangan = 'teks' | 'teksBesar' | 'kontrol';

export const AMBANG: Readonly<Record<JenisPasangan, number>> = { teks: 4.5, teksBesar: 3, kontrol: 3 };

function kanal(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Hanya #RRGGBB. Warna lain (transparan, rgba) ditolak supaya tidak ada pasangan yang lolos diam-diam. */
export function luminansi(hex: string): number {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) throw new Error(`luminansi: warna harus #RRGGBB, bukan ${hex}`);
  const n = parseInt(m[1], 16);
  return 0.2126 * kanal((n >> 16) & 255) + 0.7152 * kanal((n >> 8) & 255) + 0.0722 * kanal(n & 255);
}

export function rasioKontras(a: string, b: string): number {
  const [terang, gelap] = [luminansi(a), luminansi(b)].sort((x, y) => y - x);
  return (terang + 0.05) / (gelap + 0.05);
}

/** Dibulatkan ke bawah dua desimal, supaya 4,499 tidak tertulis 4,50. */
export function rasioTertulis(a: string, b: string): number {
  return Math.floor(rasioKontras(a, b) * 100) / 100;
}

export function lolos(a: string, b: string, jenis: JenisPasangan): boolean {
  return rasioKontras(a, b) >= AMBANG[jenis];
}
