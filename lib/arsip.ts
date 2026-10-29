import type { IsiKartu, Kartu, Mapel } from '../api/types';

/**
 * F6 Arsip Belajar (LANJUT_039). Logika murni dipisah dari komponen, pola
 * yang sama dengan lib/daftarPeriksa.ts.
 *
 * Kategori kartu = mapel (`kartu.mapel_id` → tabel `mapel`, daftar yang sama
 * dengan F3 Pilih Mapel). "Soal" / "Catatan" tidak disimpan sebagai kolom:
 * diturunkan dari ada-tidaknya jawaban, sama dengan PWA.
 */

// Penanda tetap kartu buatan pengguna — salinan §4.5, tidak bisa disembunyikan.
export const PENANDA_KARTU_PENGGUNA = 'Diunggah pengguna — belum diverifikasi tim.';

// Batas sama dengan kartu.skema.js (buatKartuSkema / perbaruiKartuSkema).
export const PANJANG_MAKS = { judul: 200, isi: 5000, jawaban: 5000 } as const;

export function jenisKartu(k: Pick<Kartu, 'jawaban'>): 'Soal' | 'Catatan' {
  return k.jawaban ? 'Soal' : 'Catatan';
}

export type MapelBerkartu = { id: string; nama: string; jumlah: number };

/** Mapel yang punya kartu, urut sesuai daftar mapel (bukan abjad), plus jumlahnya. */
export function mapelBerkartu(kartu: Kartu[], mapel: Mapel[]): MapelBerkartu[] {
  const jumlah = new Map<string, number>();
  for (const k of kartu) jumlah.set(k.mapel_id, (jumlah.get(k.mapel_id) ?? 0) + 1);
  const dikenal = mapel.filter((m) => jumlah.has(m.id)).map((m) => ({ id: m.id, nama: m.nama, jumlah: jumlah.get(m.id)! }));
  // Mapel yang sudah tidak ada di daftar tetap tampil (pakai id-nya) supaya kartunya tidak hilang dari layar.
  const lain = [...jumlah.keys()].filter((id) => !mapel.some((m) => m.id === id)).map((id) => ({ id, nama: id, jumlah: jumlah.get(id)! }));
  return [...dikenal, ...lain];
}

export function namaMapel(id: string, mapel: Mapel[] | undefined): string {
  return mapel?.find((m) => m.id === id)?.nama ?? id;
}

export type GalatFormKartu = Partial<Record<keyof IsiKartu, string>>;

/** Validasi yang paling jelas sebelum dikirim; server tetap sumber kebenaran. */
export function periksaKartu(isi: { mapel_id: string | null; judul: string; isi: string; jawaban: string }): GalatFormKartu {
  const galat: GalatFormKartu = {};
  if (!isi.mapel_id) galat.mapel_id = 'Pilih mapelnya.';
  if (!isi.judul.trim()) galat.judul = 'Judul belum diisi.';
  else if (isi.judul.trim().length > PANJANG_MAKS.judul) galat.judul = `Judul maksimal ${PANJANG_MAKS.judul} karakter.`;
  if (!isi.isi.trim()) galat.isi = 'Isi belum diisi.';
  else if (isi.isi.trim().length > PANJANG_MAKS.isi) galat.isi = `Isi maksimal ${PANJANG_MAKS.isi} karakter.`;
  if (isi.jawaban.trim().length > PANJANG_MAKS.jawaban) galat.jawaban = `Jawaban maksimal ${PANJANG_MAKS.jawaban} karakter.`;
  return galat;
}
