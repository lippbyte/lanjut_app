import type { GayaBelajar } from '../api/auth';

// Pilihan gaya belajar (LANJUT_032) — empat kelompok VARK. Ini preferensi
// yang dipilih siswa sendiri, bukan hasil tes, jadi kalimatnya "paling
// nyambung lewat…", bukan "kamu adalah tipe…".
export const GAYA_BELAJAR: { id: GayaBelajar; label: string; keterangan: string }[] = [
  { id: 'visual', label: 'Visual', keterangan: 'Paling nyambung lewat gambar, diagram, dan warna.' },
  { id: 'auditori', label: 'Auditori', keterangan: 'Paling nyambung lewat mendengar penjelasan dan diskusi.' },
  { id: 'kinestetik', label: 'Kinestetik', keterangan: 'Paling nyambung lewat praktik dan mencoba langsung.' },
  { id: 'baca_tulis', label: 'Baca-Tulis', keterangan: 'Paling nyambung lewat membaca dan mencatat.' },
];

export function labelGayaBelajar(id: GayaBelajar | null | undefined): string | null {
  return GAYA_BELAJAR.find((g) => g.id === id)?.label ?? null;
}
