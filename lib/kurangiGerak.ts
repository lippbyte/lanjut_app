/**
 * "Kurangi gerakan" di perangkat (LANJUT_029). Modul murni: hooks/useKurangiGerak.ts menyambungkan
 * ini ke AccessibilityInfo React Native, dan tes memakai sumber tiruan.
 *
 * Berbeda dengan pembuka kelinci dan onboarding v1, yang hanya membaca setelan sekali saat dibuka,
 * di sini perubahan setelan selama app terbuka ikut diikuti.
 */

export type LanggananGerak = { remove: () => void } | undefined | void;

export type SumberKurangiGerak = {
  isReduceMotionEnabled?: () => Promise<boolean>;
  addEventListener?: (nama: 'reduceMotionChanged', fn: (aktif: boolean) => void) => LanggananGerak;
};

/**
 * Membaca setelan awal lalu mengikuti perubahannya. Mengembalikan fungsi berhenti; sesudah
 * berhenti, jawaban yang datang terlambat diabaikan. Galat membaca setelan = dianggap mati.
 */
export function pantauKurangiGerak(sumber: SumberKurangiGerak, saatBerubah: (aktif: boolean) => void): () => void {
  let hidup = true;
  const kabari = (v: unknown) => {
    if (hidup) saatBerubah(v === true);
  };
  const langganan = sumber.addEventListener?.('reduceMotionChanged', kabari);
  sumber
    .isReduceMotionEnabled?.()
    .then(kabari)
    .catch(() => kabari(false));
  return () => {
    hidup = false;
    langganan?.remove();
  };
}

/**
 * Durasi gerak sesudah setelan diterapkan. Gerak non-esensial (hiasan, transisi) menjadi 0 saat
 * "Kurangi gerakan" menyala; gerak esensial (yang membawa arti) tetap.
 */
export function durasiGerak(ms: number, kurangiGerak: boolean, esensial = false): number {
  return kurangiGerak && !esensial ? 0 : ms;
}

export function gerakBoleh(kurangiGerak: boolean, esensial = false): boolean {
  return !kurangiGerak || esensial;
}
