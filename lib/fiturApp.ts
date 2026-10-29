/**
 * Sakelar fitur app yang dibaca dari konfigurasi build (LANJUT_080b): nilai di
 * `extra` app.config.ts, sumbernya variabel lingkungan EXPO_PUBLIC_*. Modul murni
 * (tanpa React/Expo) supaya bisa dites langsung dari server/tests.
 *
 * Mikrofon Ngobrol (LANJUT_074): pengenal suara peramban (Web Speech API) di Chrome
 * mengirim audio ke layanan penyedia peramban, dan ini belum tercantum di kebijakan
 * privasi. Bawaan uji rilis: MATI. Menyala hanya bila build dibuat dengan
 * EXPO_PUBLIC_MIKROFON_NGOBROL=1 — keputusan menunggu tinjauan hukum.
 */
export function mikrofonNgobrolAktif(extra: unknown): boolean {
  if (!extra || typeof extra !== 'object') return false;
  return (extra as { mikrofonNgobrol?: unknown }).mikrofonNgobrol === true;
}
