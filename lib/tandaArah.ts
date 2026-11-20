/**
 * Kecenderungan arah di alur masuk v2 (LANJUT_030). Modul murni (diuji dari server/tests).
 *
 * Tanpa migrasi dan tanpa data baru di server:
 *   - jalur yang dipilih disimpan lewat rute Jalur & Tujuan yang sudah ada (POST /jalur-minat/saya);
 *   - "Belum tahu" TIDAK dikirim: artinya tidak ada jalur aktif, ditambah tanda lokal di HP bahwa
 *     pertanyaan sudah dijawab, supaya tidak ditanya setiap kali app dibuka. Di HP lain atau
 *     sesudah app dihapus, pertanyaan bisa muncul sekali lagi (diterima, LANJUT_030 §3.5).
 *   - daftar jalur dari server hanya berisi jalur disetujui (K37). Bila kosong, layar tetap bisa
 *     dilewati; tanda 'kosong' membuat pertanyaan muncul lagi hanya bila nanti ada jalur disetujui.
 */
import type { JalurMinat, PilihanJalur } from '../api/types';
import { BELUM_TAHU } from './pilihan';

export const kunciTandaArah = (penggunaId: string) => `lanjut.arah.v2:${penggunaId}`;

export type TandaArah = 'dijawab' | 'kosong';

export function uraiTandaArah(mentah: string | null): TandaArah | null {
  return mentah === 'dijawab' || mentah === 'kosong' ? mentah : null;
}

export type OpsiArah = { nilai: string; label: string; keterangan?: string };

/** Hanya jalur berstatus disetujui (lapis kedua K37 di app; server sudah menyaring). */
export function opsiArah(daftar: readonly JalurMinat[] | null | undefined): OpsiArah[] {
  return (daftar ?? [])
    .filter((j) => j.status_teks === 'disetujui')
    .slice()
    .sort((a, b) => a.urutan - b.urutan)
    .map((j) => ({ nilai: j.id, label: j.nama, keterangan: j.deskripsi_singkat || undefined }));
}

export type KeadaanTanya = 'tanya' | 'tidak' | 'menunggu';

/**
 * Perlu menampilkan pertanyaan kecenderungan?
 * `tanda` undefined = tanda lokal belum terbaca. `daftar`/`pilihan` undefined = masih dimuat;
 * null = gagal dimuat (rute mati, kebijakan belum diterima, atau jaringan): dianggap tidak ada
 * jalur yang bisa dipilih, jadi tidak pernah memblokir.
 */
export function keadaanTanyaArah(p: {
  aktif: boolean;
  tanda: TandaArah | null | undefined;
  daftar: readonly JalurMinat[] | null | undefined;
  pilihan: readonly PilihanJalur[] | null | undefined;
}): KeadaanTanya {
  if (!p.aktif) return 'tidak';
  if (p.tanda === undefined) return 'menunggu';
  if (p.tanda === 'dijawab') return 'tidak';
  if (p.daftar === undefined || p.pilihan === undefined) return 'menunggu';
  if ((p.pilihan ?? []).some((x) => x.status === 'aktif')) return 'tidak';
  if (p.tanda === 'kosong' && opsiArah(p.daftar).length === 0) return 'tidak';
  return 'tanya';
}

/**
 * Jalur yang dikirim ke server. "Belum tahu" (atau tidak memilih) = tidak ada yang dikirim.
 * Hanya id dari daftar disetujui yang boleh dikirim: jalur draf tidak pernah terkirim.
 */
export function jalurUntukDikirim(terpilih: readonly string[], opsi: readonly OpsiArah[]): string[] {
  if (terpilih.includes(BELUM_TAHU)) return [];
  const sah = new Set(opsi.map((o) => o.nilai));
  return terpilih.filter((id) => sah.has(id));
}
