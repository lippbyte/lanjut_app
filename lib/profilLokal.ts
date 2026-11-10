export type ProfilLokal = { kelas: string | null; jalur_seleksi: string | null };

export const PROFIL_KOSONG: ProfilLokal = { kelas: null, jalur_seleksi: null };

/**
 * Mengurai isi penyimpanan perangkat. HP yang sudah memakai app versi lama menyimpan
 * pilihan di kunci `jalur`; kunci itu tetap dibaca supaya pilihan siswa tidak hilang
 * (LANJUT_001 seri v2). Penyimpanan berikutnya memakai kunci baru.
 */
export function uraiProfilLokal(mentah: string | null): ProfilLokal {
  if (!mentah) return PROFIL_KOSONG;
  const { jalur, ...sisa } = JSON.parse(mentah);
  return { ...PROFIL_KOSONG, ...(jalur === undefined ? {} : { jalur_seleksi: jalur }), ...sisa };
}

/** Kunci penyimpanan per akun di perangkat. Juga dipakai saat akun dihapus (LANJUT_009). */
export const kunciProfilLokal = (penggunaId: string) => `lanjut.profil.lokal.v1:${penggunaId}`;
