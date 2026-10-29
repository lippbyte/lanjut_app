/**
 * Animasi pembuka app dengan kelinci LANJUT (15 Okt 2026 — pilihan percakapan, belum disetujui PM).
 * Modul murni (tanpa React) supaya aturan waktunya bisa dites langsung dari server/tests.
 *
 * Revisi 15 Okt (pilihan percakapan): versi pertama terasa "kurang halus dan terlalu sekilas"
 * (masuk 450 ms, tampil minimal 0,9 detik, keluar 280 ms). Sekarang:
 *   - masuk: kelinci memudar masuk sambil membesar dan naik, perlambatannya panjang (ease-out);
 *     wordmark menyusul sedikit kemudian;
 *   - kelinci mengambang pelan sejak awal (satu lintasan halus berulang, bukan naik-turun terpisah);
 *   - keluar: begitu app siap DAN tampil minimal MIN_TAMPIL_MS, layar pembuka memudar keluar
 *     sambil kelinci sedikit membesar;
 *   - pengaman: paling lama MAKS_TAMPIL_MS, walau app belum siap (spinner memuat yang biasa ambil alih).
 * Pengguna dengan "kurangi gerakan" di perangkatnya: tanpa membesar/mengambang, hanya pudar singkat.
 */

export const DURASI_MASUK_MS = 800;
/** Wordmark mulai muncul sesudah kelinci, supaya gerakannya berurutan, tidak serentak. */
export const JEDA_WORDMARK_MS = 220;
export const DURASI_WORDMARK_MS = 700;
export const DURASI_KELUAR_MS = 550;
/** Waktu tampil minimum (dihitung sejak animasi masuk dimulai) supaya tidak lewat sekilas. */
export const MIN_TAMPIL_MS = 2000;
/** Batas atas: app tidak pernah tertahan layar pembuka lebih lama dari ini. */
export const MAKS_TAMPIL_MS = 4500;
/** Animasi masuk menunggu gambar kelinci termuat (tidak muncul tiba-tiba di tengah animasi), paling lama ini. */
export const TUNGGU_GAMBAR_MS = 400;
/** Satu putaran mengambang (naik lalu turun). */
export const DURASI_MENGAMBANG_MS = 2600;
/** Skala & geser awal saat masuk, skala saat keluar: tetap kecil ("tipis"). */
export const SKALA_AWAL = 0.86;
export const GESER_AWAL_PX = 14;
export const SKALA_KELUAR = 1.06;
export const AMBANG_MENGAMBANG_PX = 5;
/** Saat "kurangi gerakan": tanpa gerakan, pudar keluar lebih singkat. */
export const DURASI_KELUAR_TANPA_GERAK_MS = 150;

/** Kurva cubic-bezier (x1, y1, x2, y2) untuk Easing.bezier. */
export const KURVA_MASUK = [0.22, 1, 0.36, 1] as const; // ease-out panjang: cepat di awal, mendarat pelan
export const KURVA_KELUAR = [0.4, 0, 0.2, 1] as const; // ease-in-out standar: tanpa sentakan di awal maupun akhir

/** Layar pembuka boleh mulai memudar keluar? `lewatMs` dihitung sejak animasi masuk dimulai. */
export function bolehTutup(siap: boolean, lewatMs: number): boolean {
  return (siap && lewatMs >= MIN_TAMPIL_MS) || lewatMs >= MAKS_TAMPIL_MS;
}

/** Sisa waktu (ms) sebelum boleh menutup, untuk penjadwal; 0 bila sudah boleh. */
export function sisaSebelumTutup(siap: boolean, lewatMs: number): number {
  if (bolehTutup(siap, lewatMs)) return 0;
  return siap ? MIN_TAMPIL_MS - lewatMs : MAKS_TAMPIL_MS - lewatMs;
}

/**
 * Lintasan mengambang untuk interpolasi Animated: satu nilai 0 → 1 yang diulang (loop) dipetakan ke
 * geser tegak 0 → −amplitudo → 0 berbentuk gelombang kosinus. Awal dan akhirnya sama dan
 * kecepatannya nol di kedua ujung, jadi sambungan antarputaran tidak terlihat. Satu animasi
 * `timing` (bukan urutan naik lalu turun) bisa diulang seluruhnya di thread native, tanpa JS.
 */
export function lintasanMengambang(
  amplitudo: number = AMBANG_MENGAMBANG_PX,
  titik = 16
): { inputRange: number[]; outputRange: number[] } {
  const inputRange: number[] = [];
  const outputRange: number[] = [];
  for (let i = 0; i <= titik; i++) {
    const t = i / titik;
    inputRange.push(t);
    // 0 di t=0 dan t=1, −amplitudo di t=0,5. `+ 0` membuang −0.
    outputRange.push(-amplitudo * (1 - Math.cos(2 * Math.PI * t)) / 2 + 0);
  }
  return { inputRange, outputRange };
}
