import type { NamaIkon } from '../components/ui/Ikon';
import { versiEksplorasi } from './eksplorasiKampus';
import type { Kelas } from './jenjang';

/**
 * Tab bar bawah (LANJUT_074): lima tab — dua kiri, tab tengah Ngobrol Bareng,
 * dua kanan. Empat tab lama tetap nama, ikon, dan fungsinya (LANJUT_064).
 * Modul murni supaya urutan & posisi tab tengah bisa diuji tanpa render.
 */
export type HrefTab = '/linimasa' | '/jenjang-saya' | '/ngobrol' | '/pilih-mapel' | '/daftar-periksa';

export type TabBawah = {
  href: HrefTab;
  /** TEKS DRAF — salinan-teks-lanjut.md (label tab). */
  label: string;
  /** Tab biasa memakai ikon garis; tab tengah memakai ikon kelinci LANJUT di lingkaran. */
  ikon?: NamaIkon;
  /** Tab tengah: lingkaran lebih besar, sedikit menonjol ke atas garis tab bar. */
  tengah?: boolean;
};

export const TAB_BAWAH: readonly TabBawah[] = [
  { href: '/linimasa', label: 'Beranda', ikon: 'beranda' },
  { href: '/jenjang-saya', label: 'Jenjang Saya', ikon: 'smk' },
  // Tab tengah = AI LANJUT: lingkaran biru berisi ikon kelinci LANJUT (IKON_TAB_TENGAH).
  { href: '/ngobrol', label: 'Ngobrol', tengah: true },
  { href: '/pilih-mapel', label: 'Pilih Mapel', ikon: 'mapel' },
  { href: '/daftar-periksa', label: 'Daftar Periksa', ikon: 'checklist' },
];

/**
 * Ikon AI LANJUT (kelinci bertoga) di lingkaran tab tengah: maskot putih yang dipotong rapat
 * dari `LANJUT UI mockups/assets/mascot/mascot-white.png` (192 px, latar transparan).
 * Avatar jawaban AI di Ngobrol memakai versi biru (`assets/maskot-ai-biru.png`).
 * Hanya nama berkas di sini; `require()` gambar ada di komponen (modul ini harus murni).
 */
export const IKON_TAB_TENGAH = 'maskot-ai-putih.png';
export const IKON_AVATAR_AI = 'maskot-ai-biru.png';
/** Sisi ikon kelinci di dalam lingkaran tab tengah (px). */
export const UKURAN_IKON_TAB_TENGAH = 36;

/** Tinggi area ikon tab biasa (px); lebarnya 44. */
export const TINGGI_IKON_TAB = 28;

/**
 * Diameter lingkaran tab tengah (px): lebih besar dari area ikon tab biasa dan
 * di atas batas sentuh 44 px. Lingkaran digeser naik (UKURAN − TINGGI_IKON_TAB)
 * supaya labelnya sejajar label tab lain; akibatnya lingkaran menonjol ±14 px di
 * atas garis tab bar (padding atas tab bar 8 + padding tab 6).
 */
export const UKURAN_TAB_TENGAH = 56;

/**
 * Tab yang tetap menyala untuk halaman anak. Bawaannya Beranda. F10 adalah
 * lanjutan langsung Pilih Mapel, jadi tab itu yang menyala (SDD-F10 §E.1);
 * Ngobrol menyalakan tab tengahnya sendiri (LANJUT_074).
 */
export const TAB_INDUK: Readonly<Record<string, HrefTab>> = {
  '/eksplorasi-tujuan': '/pilih-mapel',
  '/ngobrol': '/ngobrol',
};

/**
 * Tab yang menyala untuk `pathname`; null = tidak ada tab yang menyala.
 * LANJUT_075b: di /eksplorasi-tujuan aturan F10 (Pilih Mapel) hanya untuk layar F10
 * (kelas 12 & akun tanpa kelas). SMP dan kelas 10–11 melihat layar minat yang dibuka
 * dari grid Beranda ATAU pintu Jenjang Saya — layar asalnya tidak diketahui, jadi
 * tidak ada tab yang menyala (bukan Pilih Mapel).
 */
export function tabAktif(pathname: string, kelas: Kelas | null | undefined, halamanAnak: boolean): HrefTab | null {
  if (pathname === '/eksplorasi-tujuan' && versiEksplorasi(kelas) !== 'f10') return null;
  if (halamanAnak) return TAB_INDUK[pathname] ?? '/linimasa';
  return TAB_BAWAH.find((t) => pathname.startsWith(t.href))?.href ?? '/linimasa';
}
