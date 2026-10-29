import type { KategoriDaftarPeriksa } from '../api/types';

/**
 * Seksi Kesiapan Ujian (layar Jalur Saya /cek-posisi, kelas 12) + kategori "Persiapan Ujian" di Daftar Periksa
 * (15 Okt 2026 — pilihan percakapan, belum disetujui PM; teks DRAF, salinan §4.20).
 * Logika murni, mengikuti pola lib/cekPosisi.ts.
 *
 * Dua sumber yang sengaja dipisah:
 *  - yang SUDAH DILAKUKAN (tryout, simulasi/gladi, cek Level-In) = centang butir
 *    kategori Persiapan Ujian di Daftar Periksa; ikut persen Daftar Periksa, jadi ikut
 *    menentukan tahap Jalur Saya;
 *  - yang DIRASAKAN (seberapa siap) = jawaban siswa sendiri (`pengguna.kesiapan_ujian`);
 *    hanya mengubah saran, tidak pernah mengubah tahap.
 * Bahasanya menawarkan, tidak menyuruh (sama dengan Jalur Saya).
 */

/** Sama persis dengan ENUM di server/src/db/migrasi/023_kesiapan_ujian.sql. */
export type KesiapanUjian = 'belum' | 'sebagian' | 'hampir' | 'siap';

/** id kategori & butir di MVP-PWA/data/checklist.json. */
export const KATEGORI_PERSIAPAN_UJIAN = 'persiapan-ujian';
export const BUTIR_TRYOUT: readonly string[] = ['tryout-tka', 'tryout-snbt'];
export const BUTIR_SIMULASI = 'simulasi-tka';

export const KESIAPAN_UJIAN: readonly { id: KesiapanUjian; label: string }[] = [
  { id: 'belum', label: 'Belum siap, belum mulai latihan soal' },
  { id: 'sebagian', label: 'Mulai siap, masih banyak materi yang belum kukuasai' },
  { id: 'hampir', label: 'Hampir siap, sebagian besar materi sudah kukuasai' },
  { id: 'siap', label: 'Sudah siap, tinggal menjaga ritme' },
];

export const TEKS_KESIAPAN = {
  judul: 'Kesiapan Ujian',
  pertanyaan: 'Seberapa siap kamu menghadapi ujianmu (TKA atau UTBK-SNBT)?',
  petunjuk: 'Jawab jujur saja. Jawabanmu cuma dipakai untuk menyesuaikan saran di sini dan bisa diubah kapan saja.',
  menyimpan: 'Menyimpan…',
  langkahUjian: (selesai: number, total: number) => `Persiapan Ujian di Daftar Periksa: ${selesai} dari ${total} beres.`,
  /** Di bawah kategori Persiapan Ujian di Daftar Periksa. */
  catatanKategori: 'Saran dari LANJUT untuk persiapan belajar, bukan syarat resmi pendaftaran.',
} as const;

/** Tujuan tombol saran. */
export type TujuanKesiapan = '/arsip' | '/level-in' | '/daftar-periksa';

export type SaranKesiapan = { teks: string; langkah: { label: string; tujuan: TujuanKesiapan } | null };

/**
 * Ringkasan kategori Persiapan Ujian dari butir yang tampil (sudah tersaring kelas & jalur).
 * `tryout`/`simulasi` null = jalur ini tidak punya butirnya (mis. SNBP), bukan "belum".
 */
export type RingkasanUjian = { selesai: number; total: number; tryout: boolean | null; simulasi: boolean | null };

export function ringkasPersiapanUjian(
  kategori: readonly KategoriDaftarPeriksa[],
  selesai: ReadonlySet<string>
): RingkasanUjian {
  const butir = kategori.find((k) => k.id === KATEGORI_PERSIAPAN_UJIAN)?.butir ?? [];
  const status = (ids: readonly string[]) => {
    const ada = butir.filter((b) => ids.includes(b.id));
    return ada.length ? ada.some((b) => selesai.has(b.id)) : null;
  };
  return {
    selesai: butir.filter((b) => selesai.has(b.id)).length,
    total: butir.length,
    tryout: status(BUTIR_TRYOUT),
    simulasi: status([BUTIR_SIMULASI]),
  };
}

const KE_PERSIAPAN = { label: 'Lihat Persiapan Ujian', tujuan: '/daftar-periksa' } as const;
const KE_LEVEL_IN = { label: 'Lihat Level-In', tujuan: '/level-in' } as const;

/**
 * Satu saran menurut jawaban + yang sudah dicentang. Yang merasa hampir/sudah siap tapi
 * belum pernah tryout ditawari tryout dulu: rasa siap baru teruji dengan soal yang mirip
 * ujian (gagasan yang sama dengan Level-In: rasa yakin dicocokkan dengan hasil).
 * null = belum menjawab.
 */
export function saranKesiapan(kesiapan: KesiapanUjian | null | undefined, r: RingkasanUjian): SaranKesiapan | null {
  if (!kesiapan) return null;
  if (kesiapan === 'belum') {
    return {
      teks: 'Membuat beberapa kartu soal di Arsip Belajar lalu mencobanya di Latihan bisa jadi awal yang ringan.',
      langkah: { label: 'Buka Arsip Belajar', tujuan: '/arsip' },
    };
  }
  if (kesiapan === 'sebagian') {
    return { teks: 'Level-In bisa menunjukkan mapel mana yang paling perlu dilatih dulu.', langkah: KE_LEVEL_IN };
  }
  if (r.tryout === false) {
    return { teks: 'Ikut satu tryout bisa jadi cara menguji rasa siapmu dengan soal yang mirip ujian.', langkah: KE_PERSIAPAN };
  }
  if (r.simulasi === false) {
    return {
      teks: 'Kalau sekolahmu mengadakan simulasi atau gladi TKA, ikut bisa bikin hari ujian terasa lebih akrab.',
      langkah: KE_PERSIAPAN,
    };
  }
  if (kesiapan === 'hampir') {
    return { teks: 'Tinggal merapikan mapel yang masih lemah. Level-In bisa bantu memilihnya.', langkah: KE_LEVEL_IN };
  }
  return {
    teks: 'Persiapanmu sudah jalan. Menjaga ritme latihan dan istirahat yang cukup bisa jadi pegangan menjelang ujian.',
    langkah: null,
  };
}
