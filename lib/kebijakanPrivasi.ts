// Kebijakan privasi LANJUT (LANJUT_047) — DRAF, wajib direview ahli hukum
// sebelum dipakai. Teksnya ada di kebijakan-privasi.json (satu sumber untuk
// ringkasan di layar Daftar dan halaman lengkap /kebijakan-privasi); berkas
// ini hanya memberi tipe.
//
// VERSI_KEBIJAKAN dikirim saat daftar sebagai `versi_kebijakan` = versi teks
// yang dibaca dan dicentang siswa. Server menolaknya (409 KEBIJAKAN_USANG)
// bila bukan versi yang berlaku di konfigurasi server.

import type { StatusPersetujuan } from '../api/types';
import data from './kebijakan-privasi.json';

export type BagianKebijakan = { judul: string; paragraf?: string[]; butir?: string[] };

export const VERSI_KEBIJAKAN: number = data.versi;
export const STATUS_KEBIJAKAN: string = data.status;
export const RINGKASAN_KEBIJAKAN: string[] = data.ringkasan;
export const ISI_KEBIJAKAN: BagianKebijakan[] = data.isi;

/**
 * Keadaan penerimaan kebijakan akun ini (LANJUT_048), dari GET /persetujuan/saya:
 *   - 'diterima'          : versi yang berlaku sudah diterima;
 *   - 'bisa_diterima'     : belum, dan teks di app ADALAH versi yang berlaku;
 *   - 'versi_app_berbeda' : belum, tetapi app membawa teks versi lain — siswa
 *                           tidak boleh "menerima" versi yang tidak ia baca,
 *                           jadi app harus dimuat ulang/diperbarui dulu;
 *   - 'tidak_tersedia'    : server belum punya versi berlaku (konfigurasi).
 * Tampilan saja: boleh-tidaknya AI SELALU diputuskan server (bolehPakaiAi).
 */
export type KeadaanKebijakan = 'diterima' | 'bisa_diterima' | 'versi_app_berbeda' | 'tidak_tersedia';

export function keadaanKebijakan(status: StatusPersetujuan, versiApp: number = VERSI_KEBIJAKAN): KeadaanKebijakan {
  if (status.kebijakan_terkini) return 'diterima';
  if (status.versi_kebijakan_berlaku === null) return 'tidak_tersedia';
  return status.versi_kebijakan_berlaku === versiApp ? 'bisa_diterima' : 'versi_app_berbeda';
}

/** Perlu menerima ULANG = pernah menerima versi lama yang masih berstatus setuju. */
export function perluTerimaUlang(status: StatusPersetujuan): boolean {
  return !status.kebijakan_terkini && status.kebijakan_privasi?.status === 'setuju';
}
