/**
 * Onboarding cerita: empat layar sebelum Masuk/Daftar (15 Okt 2026 — pilihan percakapan, belum
 * disetujui PM; butir A12 peta-kelengkapan-2026-10-09 dan LANJUT_029 §4.2 yang menunggu keputusan).
 * Modul murni (tanpa React) supaya isinya bisa dites langsung dari server/tests.
 *
 * Teks dari docs/salinan-teks-lanjut.md §3, sama dengan MVP-PWA/onboarding.html ("sarannya" ditulis
 * seperti di PWA; salinan teks masih "saranya"). Layar tanya kelas & prodi di PWA TIDAK ikut:
 * sejak LANJUT_035 keduanya ditanyakan di form Daftar.
 *
 * Kapan tampil (AuthProvider.perluOnboarding): hanya saat app dibuka TANPA sesi tersimpan, sekali
 * per app dibuka. Sesi tersimpan → langsung ke app. Keluar dari akun di tengah pemakaian, atau sesi
 * berakhir, langsung ke Masuk tanpa onboarding.
 */

export type LayarOnboarding = {
  judul: string;
  isi?: string;
  butir?: readonly string[];
};

export const LAYAR_ONBOARDING: readonly LayarOnboarding[] = [
  { judul: 'Anak SMK juga bisa kuliah.', isi: 'Ini caranya, dari awal.' },
  {
    judul: 'Penjelasan yang ada dibuat untuk anak SMA.',
    isi: 'Mapel pendukungnya beda, jadwalnya beda, sarannya beda. Kami susun ulang untuk kamu.',
  },
  {
    judul: 'Yang bisa kamu pakai di sini',
    butir: [
      'Linimasa: apa yang jatuh tempo, dan kapan',
      'Khusus SMK: hal yang berbeda buat kita',
      'Cerita alumni: mereka sudah lewat jalan ini',
      'Latihan harian: 15 menit, bukan semalam suntuk',
    ],
  },
  {
    judul: 'Mulai dari mana kamu sekarang.',
    isi: 'Belum tahu mau ke mana pun tidak apa-apa. Nanti kita cari sama-sama.',
  },
];

export const TEKS_ONBOARDING = {
  lanjut: 'Lanjut',
  mulai: 'Mulai',
  lewati: 'Lewati',
  // Sama dengan tautan bawah form Daftar (RegisterScreen).
  sudahPunyaAkun: 'Sudah punya akun?',
  masuk: 'Masuk',
} as const;

/**
 * Ke mana sesudah onboarding:
 *   - 'daftar' — "Mulai" di layar terakhir (onboarding adalah awal pendaftaran);
 *   - 'masuk'  — "Sudah punya akun? Masuk" di layar terakhir;
 *   - 'semula' — "Lewati": layar yang memang sedang dituju (bawaannya Masuk).
 */
export type TujuanOnboarding = 'daftar' | 'masuk' | 'semula';

/** Layar terakhir? Tombolnya "Mulai" (ke Daftar), bukan "Lanjut". */
export function layarTerakhir(indeks: number): boolean {
  return indeks >= LAYAR_ONBOARDING.length - 1;
}

/** Indeks layar dari posisi geser horizontal (px): dibulatkan ke layar terdekat, dijepit ke rentang. */
export function indeksDariGeser(x: number, lebar: number): number {
  if (!(lebar > 0) || !Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(LAYAR_ONBOARDING.length - 1, Math.round(x / lebar)));
}

/**
 * Letak (0–1, dari atas) warna terdalam gradasi onboarding: tepat di atas teks cerita. Putih di
 * blue400 hanya 2,63:1 (LANJUT_027), di blue600 5,69:1 — jadi seluruh teks berada di blue600,
 * sementara bagian atas (tempat kelinci) tetap biru muda seperti onboarding PWA.
 * Sebelum tata letak terukur: 0,6.
 */
export function letakWarnaDalam(atasTeks: number, tinggiLayar: number): number {
  if (!(tinggiLayar > 0) || !(atasTeks > 0)) return 0.6;
  return Math.max(0.3, Math.min(0.95, atasTeks / tinggiLayar));
}

/** Isi onboarding muncul saat layar pembuka mulai memudar (bersamaan, bukan sesudahnya). */
export const DURASI_MASUK_MS = 750;
/** Onboarding memudar keluar, memperlihatkan Masuk/Daftar yang sudah terpasang di bawahnya. */
export const DURASI_KELUAR_MS = 320;
/** Bila sinyal layar pembuka tidak pernah datang (mis. muat ulang saat pengembangan): mulai sendiri. */
export const BATAS_TUNGGU_PEMBUKA_MS = 5000;
/** Titik langkah: aktif lebih lebar (sama dengan PWA: flex 2 vs 1). */
export const LEBAR_TITIK_PX = 10;
export const LEBAR_TITIK_AKTIF_PX = 28;
