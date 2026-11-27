/**
 * Logika murni dan teks Akun & Privasi v2 (LANJUT_037, di balik EXPO_PUBLIC_NAVIGASI_V2
 * bersama EXPO_PUBLIC_KELOLA_DATA_AKUN — keduanya mati bawaan).
 * Modul murni (tanpa React/Expo) agar dapat diuji langsung dari server/tests.
 *
 * TEKS DRAF — seluruh teks di sini tercatat di docs/draf-teks-akun-privasi-v2.md (belum disetujui).
 * Tidak menambah klaim privasi baru; mempertahankan kontrak API dan aturan konfirmasi v1.
 */
import {
  PENEGASAN_HAPUS_AKUN,
  badanHapusAkun,
  bisaPakaiKodeEmail,
  namaBerkasEkspor,
  siapHapus,
  type MetodeKonfirmasi,
} from './dataAkun';
import { TEKS_MODE_TAMPILAN } from './modeTampilan';

export {
  PENEGASAN_HAPUS_AKUN,
  TEKS_MODE_TAMPILAN,
  badanHapusAkun,
  bisaPakaiKodeEmail,
  namaBerkasEkspor,
  siapHapus,
  type MetodeKonfirmasi,
};

/** Batas maksimal kata teks tetap per keadaan layar (LANJUT_037 §3). */
export const BATAS_KATA_AKUN_PRIVASI = 40;

/** TEKS DRAF — tercatat di docs/draf-teks-akun-privasi-v2.md (belum disetujui). */
export const TEKS_AKUN_PRIVASI_V2 = {
  judul: 'Akun & Privasi',
  kartuAkunku: 'Akunku',
  labelEmail: 'Email',
  emailKosong: 'Belum ada',
  kebijakanPrivasi: 'Kebijakan privasi',
  terimaKebijakan: 'Baca dan terima',
  modeAktif: 'Aktif',
  kartuDatamu: 'Datamu',
  penjelasUnduh: 'Salinan data akunmu (JSON); isi foto tidak ikut.',
  unduh: 'Unduh data saya',
  unduhProses: 'Menyiapkan data…',
  unduhSelesai: 'Berkas disiapkan.',
  cobaLagi: 'Coba lagi',
  tandaPermanen: 'Tindakan permanen',
  kartuHapus: 'Hapus akun',
  bukaHapus: 'Hapus akun saya',
  keluar: 'Keluar',
  keluarProses: 'Mengeluarkan…',

  // Layar konfirmasi hapus akun (/hapus-akun)
  tidakBisaBatal: 'Tidak dapat dibatalkan',
  judulHilang: 'Yang ikut terhapus:',
  paham: 'Saya paham akun dihapus permanen.',
  labelSandi: 'Kata sandi',
  alihKeKode: 'Pakai kode email',
  alihKeSandi: 'Pakai kata sandi',
  labelKode: 'Kode email',
  kirimKode: 'Kirim kode',
  kirimKodeLagi: 'Kirim ulang',
  kirimKodeProses: 'Mengirim…',
  kodeTerkirim: 'Kode dikirim.',
  belumLengkap: 'Centang dan isi konfirmasi dulu.',
  tombolHapus: 'Hapus akun permanen',
  tombolHapusProses: 'Menghapus…',
  batal: 'Batal',
} as const;

/** Daftar ringkas apa yang ikut terhapus, sesuai perilaku server aktual tanpa klaim baru. */
export const YANG_IKUT_TERHAPUS_V2: readonly string[] = [
  'Profil, catatan, kemajuan, kartu, modul, dan foto.',
  'Persetujuan akunmu di server LANJUT.',
];

const GALAT_UNDUH_V2: Readonly<Record<string, string>> = {
  EKSPOR_TERLALU_BESAR: 'Datamu terlalu besar. Hubungi tim LANJUT.',
  TERLALU_SERING: 'Terlalu banyak percobaan. Coba nanti.',
  JARINGAN: 'Gagal terhubung ke server.',
  BAGIKAN_TIDAK_TERSEDIA: 'Buka di peramban untuk mengunduh.',
};
export const GALAT_UNDUH_UMUM_V2 = 'Data belum bisa diunduh.';

const GALAT_HAPUS_V2: Readonly<Record<string, string>> = {
  KREDENSIAL_SALAH: 'Kata sandi tidak cocok.',
  KODE_SALAH: 'Kode tidak cocok.',
  KODE_KEDALUWARSA: 'Kode kedaluwarsa. Minta kode baru.',
  TERLALU_SERING: 'Terlalu banyak percobaan. Coba nanti.',
  OTP_TIDAK_TERSEDIA: 'Kode email belum tersedia.',
  TIDAK_BERHAK: 'Email belum terverifikasi. Pakai sandi.',
  JARINGAN: 'Gagal terhubung. Akun belum dihapus.',
};
export const GALAT_HAPUS_UMUM_V2 = 'Akun belum bisa dihapus.';

export function pesanGalatUnduhV2(kode: string | undefined): string {
  return (kode && GALAT_UNDUH_V2[kode]) || GALAT_UNDUH_UMUM_V2;
}

export function pesanGalatHapusV2(kode: string | undefined): string {
  return (kode && GALAT_HAPUS_V2[kode]) || GALAT_HAPUS_UMUM_V2;
}

export function bisaCobaLagiUnduh(kode: string | undefined): boolean {
  return kode !== 'EKSPOR_TERLALU_BESAR' && kode !== 'BAGIKAN_TIDAK_TERSEDIA';
}

/** Menampilkan alamat email penuh tanpa pernah memotong atau memberi elipsis. */
export function emailTampilV2(email: string | null | undefined): string {
  const bersih = (email ?? '').trim();
  return bersih || TEKS_AKUN_PRIVASI_V2.emailKosong;
}

export function hitungKataAkunPrivasi(teks: string): number {
  return teks.trim().split(/\s+/).filter(Boolean).length;
}

const DASAR_AKUN_V2: readonly string[] = [
  TEKS_AKUN_PRIVASI_V2.judul,
  TEKS_AKUN_PRIVASI_V2.kartuAkunku,
  TEKS_AKUN_PRIVASI_V2.labelEmail,
  TEKS_AKUN_PRIVASI_V2.kebijakanPrivasi,
  TEKS_MODE_TAMPILAN.judul,
  ...TEKS_MODE_TAMPILAN.opsi.map((o) => o.label),
  TEKS_AKUN_PRIVASI_V2.modeAktif,
  TEKS_AKUN_PRIVASI_V2.kartuDatamu,
  TEKS_AKUN_PRIVASI_V2.penjelasUnduh,
  TEKS_AKUN_PRIVASI_V2.tandaPermanen,
  TEKS_AKUN_PRIVASI_V2.kartuHapus,
  TEKS_AKUN_PRIVASI_V2.bukaHapus,
  TEKS_AKUN_PRIVASI_V2.keluar,
];

const DASAR_HAPUS_V2: readonly string[] = [
  TEKS_AKUN_PRIVASI_V2.tidakBisaBatal,
  TEKS_AKUN_PRIVASI_V2.kartuHapus,
  TEKS_AKUN_PRIVASI_V2.judulHilang,
  ...YANG_IKUT_TERHAPUS_V2,
  TEKS_AKUN_PRIVASI_V2.paham,
  TEKS_AKUN_PRIVASI_V2.batal,
];

/** Daftar teks tetap per keadaan layar untuk verifikasi batas 40 kata (LANJUT_037 §3). */
export const teksTetapAkunPrivasiV2: Readonly<Record<string, readonly string[]>> = {
  akunBawaan: [...DASAR_AKUN_V2, TEKS_AKUN_PRIVASI_V2.unduh],
  akunUnduhMemuat: [...DASAR_AKUN_V2, TEKS_AKUN_PRIVASI_V2.unduhProses],
  akunUnduhBerhasil: [...DASAR_AKUN_V2, TEKS_AKUN_PRIVASI_V2.unduh, TEKS_AKUN_PRIVASI_V2.unduhSelesai],
  akunUnduhGalatJaringan: [
    ...DASAR_AKUN_V2,
    TEKS_AKUN_PRIVASI_V2.unduh,
    GALAT_UNDUH_V2.JARINGAN,
    TEKS_AKUN_PRIVASI_V2.cobaLagi,
  ],
  akunUnduhGalatUmum: [
    ...DASAR_AKUN_V2,
    TEKS_AKUN_PRIVASI_V2.unduh,
    GALAT_UNDUH_UMUM_V2,
    TEKS_AKUN_PRIVASI_V2.cobaLagi,
  ],
  akunUnduhTerlaluBesar: [
    ...DASAR_AKUN_V2,
    TEKS_AKUN_PRIVASI_V2.unduh,
    GALAT_UNDUH_V2.EKSPOR_TERLALU_BESAR,
  ],
  akunPerluKebijakan: [...DASAR_AKUN_V2, TEKS_AKUN_PRIVASI_V2.unduh, TEKS_AKUN_PRIVASI_V2.terimaKebijakan],
  hapusSandiBawaan: [
    ...DASAR_HAPUS_V2,
    TEKS_AKUN_PRIVASI_V2.labelSandi,
    TEKS_AKUN_PRIVASI_V2.alihKeKode,
    TEKS_AKUN_PRIVASI_V2.tombolHapus,
  ],
  hapusMemuat: [
    ...DASAR_HAPUS_V2,
    TEKS_AKUN_PRIVASI_V2.labelSandi,
    TEKS_AKUN_PRIVASI_V2.alihKeKode,
    TEKS_AKUN_PRIVASI_V2.tombolHapusProses,
  ],
  hapusSandiSalah: [
    ...DASAR_HAPUS_V2,
    TEKS_AKUN_PRIVASI_V2.labelSandi,
    TEKS_AKUN_PRIVASI_V2.alihKeKode,
    GALAT_HAPUS_V2.KREDENSIAL_SALAH,
    TEKS_AKUN_PRIVASI_V2.tombolHapus,
  ],
  hapusGalatJaringan: [
    ...DASAR_HAPUS_V2,
    TEKS_AKUN_PRIVASI_V2.labelSandi,
    TEKS_AKUN_PRIVASI_V2.alihKeKode,
    GALAT_HAPUS_V2.JARINGAN,
    TEKS_AKUN_PRIVASI_V2.tombolHapus,
  ],
  hapusBelumLengkap: [
    ...DASAR_HAPUS_V2,
    TEKS_AKUN_PRIVASI_V2.labelSandi,
    TEKS_AKUN_PRIVASI_V2.alihKeKode,
    TEKS_AKUN_PRIVASI_V2.belumLengkap,
    TEKS_AKUN_PRIVASI_V2.tombolHapus,
  ],
  hapusKodeEmail: [
    ...DASAR_HAPUS_V2,
    TEKS_AKUN_PRIVASI_V2.labelKode,
    TEKS_AKUN_PRIVASI_V2.kirimKode,
    TEKS_AKUN_PRIVASI_V2.kodeTerkirim,
    TEKS_AKUN_PRIVASI_V2.alihKeSandi,
    TEKS_AKUN_PRIVASI_V2.tombolHapus,
  ],
};
