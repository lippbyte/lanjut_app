/**
 * Kelas & jenjang (LANJUT_035). SMP (7–9) dan SMA/SMK (10–12) memakai fitur
 * yang sama. Daftar ini harus sama dengan ENUM `pengguna.kelas`
 * (server/src/db/migrasi/010_kelas_smp.sql) dan server/src/util/kelas.js.
 */
export const KELAS_OPSI = ['7', '8', '9', '10', '11', '12'] as const;
export type Kelas = (typeof KELAS_OPSI)[number];

/**
 * Linimasa, Daftar Periksa, dan Jalur Saya (/cek-posisi) berisi SNBP/SNBT/TKA — murni untuk
 * kelas 12 (keputusan Khalifa, 1 Okt 2026). Penentunya kelas AKUN, bukan
 * pilihan kelas di perangkat. Kelas kosong (akun lama) dianggap BUKAN kelas
 * 12 sampai siswa mengisinya — jangan menebak 12.
 */
export function untukKelas12(kelas: Kelas | null | undefined): boolean {
  return kelas === '12';
}

/**
 * Jenis sekolah (LANJUT_038). Sama dengan ENUM `pengguna.jenis_sekolah`
 * (server/src/db/migrasi/011_jenis_sekolah.sql) dan server/src/util/kelas.js.
 * Kelas 7–9 selalu SMP dan diisi server — siswa SMP tidak pernah ditanya.
 * Kelas 10–12 memilih salah satu JENIS_SEKOLAH_MENENGAH.
 */
export const JENIS_SEKOLAH_MENENGAH = ['SMA', 'SMK', 'MA'] as const;
export type JenisSekolahMenengah = (typeof JENIS_SEKOLAH_MENENGAH)[number];
export type JenisSekolah = 'SMP' | JenisSekolahMenengah;

/** Label pilihan (TEKS DRAF, salinan §4.10/§4.12). */
export const LABEL_JENIS_SEKOLAH: Record<JenisSekolah, string> = {
  SMP: 'SMP',
  SMA: 'SMA',
  SMK: 'SMK',
  MA: 'MA (Madrasah Aliyah)',
};

export const adalahJenisMenengah = (j: string | null | undefined): j is JenisSekolahMenengah =>
  !!j && (JENIS_SEKOLAH_MENENGAH as readonly string[]).includes(j);

/** Kelas 10–12: jenis sekolah perlu ditanyakan. */
export function tanyaJenisSekolah(kelas: Kelas | null | undefined): boolean {
  return kelas === '10' || kelas === '11' || kelas === '12';
}

/** Kelas 10–12 yang belum memilih SMA/SMK/MA — ditahan gerbang (LANJUT_038). */
export function belumIsiJenisSekolah(kelas: Kelas | null | undefined, jenis: JenisSekolah | null | undefined): boolean {
  return tanyaJenisSekolah(kelas) && !jenis;
}

/**
 * Kelompok isi halaman Jenjang Saya (LANJUT_037), menurut kelas. Bagian
 * "Kalau kamu anak SMK" memakai jenis sekolah, bukan kelompok ini (LANJUT_038).
 */
export type KelompokJenjang = 'smp' | 'kelas10_11' | 'kelas12';

export function kelompokJenjang(kelas: Kelas | null | undefined): KelompokJenjang | null {
  if (kelas === '7' || kelas === '8' || kelas === '9') return 'smp';
  if (kelas === '10' || kelas === '11') return 'kelas10_11';
  if (kelas === '12') return 'kelas12';
  return null;
}
