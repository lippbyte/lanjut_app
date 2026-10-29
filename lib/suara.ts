/**
 * Ucapan → teks untuk kotak pesan Ngobrol (LANJUT_074 §F). Modul murni tanpa
 * React supaya tes server bisa menjalankannya langsung (server/tests/muat-ts-app.js).
 *
 * Pengenalan suara dikerjakan PERAMBAN lewat Web Speech API (`SpeechRecognition`,
 * di Chrome/Edge bernama `webkitSpeechRecognition`) — tanpa paket baru. App tidak
 * merekam, tidak menyimpan, dan tidak mengirim audio: yang diterima hanya teks hasil
 * pengenalan, dan teks itu masuk ke kotak pesan seperti ketikan biasa.
 *
 * Catatan untuk review privasi: di sebagian peramban (mis. Chrome) suara diproses di
 * layanan milik pembuat peramban, bukan di server LANJUT.
 *
 * Android/iOS (Expo Go) tidak punya pengenal bawaan tanpa paket native, jadi
 * cariPengenalSuara mengembalikan null dan tombol mikrofon tidak tampil.
 */

/** Bagian event `result` yang dipakai (SpeechRecognitionEvent). */
export type HasilPengenalan = {
  resultIndex?: number;
  results: ArrayLike<ArrayLike<{ transcript?: string }> & { isFinal?: boolean }>;
};

/** Bagian objek SpeechRecognition yang dipakai app. */
export type PengenalSuara = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((e: HasilPengenalan) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
};

export type KonstruktorPengenal = new () => PengenalSuara;

/** Bahasa pengenalan: bahasa Indonesia. */
export const BAHASA_PENGENALAN = 'id-ID';

/**
 * Konstruktor pengenal suara peramban, atau null bila tidak didukung.
 * Tidak pernah melempar — tidak didukung berarti tombol tidak tampil, tanpa pesan galat.
 */
export function cariPengenalSuara(lingkungan: unknown = globalThis): KonstruktorPengenal | null {
  try {
    const g = lingkungan as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown } | null | undefined;
    const K = g?.SpeechRecognition ?? g?.webkitSpeechRecognition;
    return typeof K === 'function' ? (K as KonstruktorPengenal) : null;
  } catch {
    return null;
  }
}

/** Teks dari hasil FINAL di satu event `result`, mulai dari resultIndex. Hasil sementara diabaikan. */
export function teksDariHasil(e: HasilPengenalan | null | undefined): string {
  const hasil = e?.results;
  if (!hasil) return '';
  const potongan: string[] = [];
  for (let i = e?.resultIndex ?? 0; i < hasil.length; i++) {
    const r = hasil[i];
    if (!r || r.isFinal === false) continue;
    const t = r[0]?.transcript?.trim();
    if (t) potongan.push(t);
  }
  return potongan.join(' ');
}

/**
 * Draf yang sudah diketik + ucapan baru, dipisah satu spasi, dipotong ke `maks`
 * karakter (batas panjang pesan). Draf tidak pernah ditimpa.
 */
export function gabungDraf(draf: string, ucapan: string, maks: number): string {
  const baru = ucapan.trim();
  if (!baru) return draf;
  const pemisah = draf && !/\s$/.test(draf) ? ' ' : '';
  return (draf + pemisah + baru).slice(0, maks);
}
