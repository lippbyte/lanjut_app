import type { ButirKhususSmk } from '../api/types';
import type { KelompokJenjang } from './jenjang';

/**
 * Butir Khusus SMK yang boleh tampil SEBELUM kelas 12 (LANJUT_037): yang
 * tidak menyebut SNBP, PDSS, UTBK, kuota, maupun periode pendaftaran.
 * Daftar IZIN, bukan daftar larangan: butir baru dari tim konten otomatis
 * hanya tampil untuk kelas 12 sampai sengaja ditambahkan di sini. Lebih
 * rapi kalau nanti tabel butir_khusus_smk punya kolom kelas sendiri.
 */
export const BUTIR_SMK_SEBELUM_KELAS_12: ReadonlySet<string> = new Set(['portofolio', 'mapel-tka-tidak-ada']);

/** SMP: tidak ada (bukan siswa SMK). Kelas 10–11: daftar izin. Kelas 12: semua. */
export function butirSmkUntuk(daftar: ButirKhususSmk[], kelompok: KelompokJenjang | null): ButirKhususSmk[] {
  const butir = butirBerpasangan(daftar);
  if (kelompok === 'kelas12') return butir;
  if (kelompok === 'kelas10_11') return butir.filter((b) => BUTIR_SMK_SEBELUM_KELAS_12.has(b.id));
  return [];
}

/**
 * F2 — Khusus SMK (docs/prd-sdd-lanjut.md Bagian 6). AC: tiap butir WAJIB
 * berpasangan "apa yang beda" + "apa yang bisa dilakukan" — butir yang
 * hanya punya salah satu tidak boleh tayang sama sekali, bukan ditampilkan
 * dengan bagian yang kosong.
 */
export function butirBerpasangan(daftar: ButirKhususSmk[]): ButirKhususSmk[] {
  return daftar
    .filter((b) => !!b.apa_yang_beda && !!b.apa_yang_bisa_dilakukan)
    .slice()
    .sort((a, b) => a.urutan - b.urutan);
}
