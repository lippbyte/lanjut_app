/**
 * LANJUT_083d — gerbang "Buat kata sandi baru". Akun lama yang emailnya belum terverifikasi
 * diambil alih oleh pemilik email (masuk lewat kode email atau Google): kata sandi lama dicabut
 * di server. Selama `perlu_sandi_baru`, app/(app)/_layout.tsx menampilkan layar buat kata sandi
 * di SEMUA rute, sebelum gerbang lain; tidak ada tombol lewati.
 *
 * Modul murni (tanpa React Native) supaya bisa dites dari server (tests/muat-ts-app.js).
 */

/** Hanya true bila server menyatakannya; sesi lama tanpa medan ini tidak tertahan. */
export function perluBuatSandiBaru(pengguna: { perlu_sandi_baru?: boolean } | null | undefined): boolean {
  return pengguna?.perlu_sandi_baru === true;
}

/** Cek cepat sebelum dikirim; aturan lengkapnya (sandi umum, dst.) tetap di server, sama dengan Daftar. */
export function galatSandiBaru(sandi: string): string | null {
  if (sandi.length < 8) return 'Kata sandi minimal 8 karakter.';
  if (sandi.length > 200) return 'Kata sandi terlalu panjang.';
  return null;
}
