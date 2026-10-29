// Angka F10 Eksplorasi Tujuan (SDD-F10 §E.4). Fungsi murni, tanpa Intl
// (tidak semua mesin JS di HP punya data locale lengkap).

import type { ProfilProdi } from '../api/types';

const KELOMPOK_SUMBER = ['peminat', 'mata_kuliah', 'profesi', 'kampus'] as const;

/**
 * Kalimat kaki profil F10 (LANJUT_045; salinan teks §4.9, DRAF). Tanda
 * terverifikasi berlaku untuk profil, tetapi bagian berlabel "Perkiraan"
 * tidak dicek ke sumber resmi — jadi "isi profil ini dicek" hanya dipakai
 * bila KEEMPAT kelompok "Terverifikasi". Kelompok yang hilang dari data
 * diperlakukan sebagai belum dicek (tidak pernah dianggap terverifikasi).
 * `tanggal` sudah diformat, mis. "3 Oktober 2026".
 */
export function kalimatKakiProfil(status: ProfilProdi['status_sumber'], tanggal: string): string {
  const nilai = KELOMPOK_SUMBER.map((k) => status[k]);
  if (nilai.every((v) => v === 'Terverifikasi')) return `Isi profil ini dicek ke sumber resmi pada ${tanggal}.`;
  const dicek = `Bagian bertanda Terverifikasi dicek ke sumber resmi pada ${tanggal}.`;
  return nilai.includes('Perkiraan') ? `${dicek} Bagian bertanda Perkiraan belum dicek ke sumber resmi.` : dicek;
}

/** 5582 → "5.582" (titik pemisah ribuan). */
export function angkaRibuan(n: number): string {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * Rasio keketatan = diterima / pendaftar × 100, satu desimal, koma:
 * 43 dari 5582 → "0,8%". Tidak bisa dihitung (diterima null, pendaftar
 * kosong/0) → null; layar menampilkan "—", bukan "0".
 */
export function rasioKeketatan(diterima: number | null | undefined, pendaftar: number | null | undefined): string | null {
  if (diterima === null || diterima === undefined || !pendaftar) return null;
  const persen = Math.round((diterima / pendaftar) * 1000) / 10;
  return `${persen.toFixed(1).replace('.', ',')}%`;
}
