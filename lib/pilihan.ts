/**
 * Aturan komponen Pilihan v2 (LANJUT_029). Modul murni. Dipakai nanti untuk kecenderungan arah
 * (Bekerja/Melanjutkan/Wirausaha), tetapi belum terhubung ke data apa pun.
 *
 * "Belum tahu" adalah jawaban yang sah, bukan kosong. Di mode banyak, "belum tahu" berdiri
 * sendiri: memilihnya melepas yang lain, dan memilih yang lain melepasnya.
 */
export const BELUM_TAHU = 'belum-tahu';

export type ModePilihan = 'satu' | 'banyak';

export function ubahPilihan(terpilih: readonly string[], nilai: string, mode: ModePilihan): string[] {
  if (mode === 'satu') return [nilai];
  if (nilai === BELUM_TAHU) return terpilih.includes(BELUM_TAHU) ? [] : [BELUM_TAHU];
  const tanpaBelumTahu = terpilih.filter((v) => v !== BELUM_TAHU);
  return tanpaBelumTahu.includes(nilai) ? tanpaBelumTahu.filter((v) => v !== nilai) : [...tanpaBelumTahu, nilai];
}

/** Teks status yang dibacakan dan ditampilkan, supaya terpilih tidak dibedakan hanya lewat warna. */
export function teksStatusPilihan(jumlahTerpilih: number, mode: ModePilihan): string {
  if (jumlahTerpilih === 0) return 'Belum ada yang dipilih';
  return mode === 'satu' ? '1 dipilih' : `${jumlahTerpilih} dipilih`;
}
