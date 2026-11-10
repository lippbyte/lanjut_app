/**
 * Unduh data dan hapus akun (LANJUT_009 seri v2). Modul murni supaya aturan dan teksnya bisa
 * dites langsung dari server/tests.
 *
 * Semua teks di sini DRAF, menunggu persetujuan Khalifa (docs/draf-teks-hapus-akun.md). Layarnya
 * tersembunyi sampai build dibuat dengan EXPO_PUBLIC_KELOLA_DATA_AKUN=1 (lib/fiturApp.ts).
 */

/** Sama persis dengan PENEGASAN_HAPUS_AKUN di server/src/modul/data-pengguna/data-pengguna.skema.js. */
export const PENEGASAN_HAPUS_AKUN = 'HAPUS AKUN SAYA';

export type MetodeKonfirmasi = 'sandi' | 'kode';

export const TEKS_DATA_AKUN = {
  seksi: 'Data saya',
  penjelasUnduh: 'Salinan data akunmu dalam satu berkas. Kata sandi dan tanda masuk tidak ikut.',
  unduh: 'Unduh data saya',
  unduhProses: 'Menyiapkan data…',
  unduhSelesai: 'Berkas datamu sudah disiapkan.',
  hapus: 'Hapus akun saya',
  pengantar: 'Akun dan datamu di server LANJUT akan dihapus permanen. Setelah dihapus, tidak bisa dibatalkan atau dipulihkan.',
  judulHilang: 'Yang ikut terhapus',
  judulTersisa: 'Yang tidak bisa dihapus dari sini',
  saranUnduh: 'Kalau ingin menyimpan salinannya, unduh datamu dulu di Data Akun.',
  paham: 'Aku paham akun dan datanya akan dihapus permanen.',
  labelSandi: 'Kata sandi',
  petunjukKonfirmasi: 'Untuk memastikan ini benar-benar kamu.',
  labelKode: 'Kode dari email',
  alihKeKode: 'Masuk lewat Google atau lupa kata sandi? Pakai kode email',
  alihKeSandi: 'Pakai kata sandi',
  kirimKode: 'Kirim kode ke email',
  kirimKodeLagi: 'Kirim ulang kode',
  kirimKodeProses: 'Mengirim…',
  kodeTerkirim: 'Kode sudah dikirim ke emailmu dan berlaku 5 menit.',
  belumLengkap: 'Centang pernyataan dan isi konfirmasinya dulu.',
  tombolHapus: 'Hapus akun permanen',
  tombolHapusProses: 'Menghapus…',
  batal: 'Batal',
  akunDihapus: 'Akunmu sudah dihapus.',
} as const;

export const YANG_IKUT_TERHAPUS: readonly string[] = [
  'Akun dan profilmu.',
  'Daftar Periksa dan kemajuanmu.',
  'Kartu, modul, dan riwayat latihanmu.',
  'Catatan persetujuan kebijakan privasi dan orang tua atau wali.',
  'Semua catatan lain yang tersimpan di akunmu.',
];

export const YANG_TIDAK_TERHAPUS: readonly string[] = [
  'Pesan Ngobrol yang pernah dikirim ke penyedia AI, dan email yang sudah terkirim, mengikuti kebijakan penyedia layanan itu.',
  'Salinan cadangan server ikut hilang saat cadangan lama diganti.',
];

const GALAT_HAPUS: Readonly<Record<string, string>> = {
  KREDENSIAL_SALAH: 'Kata sandi tidak cocok. Coba lagi.',
  KODE_SALAH: 'Kode salah. Periksa lagi kode di email.',
  KODE_KEDALUWARSA: 'Kode sudah tidak berlaku. Minta kode baru.',
  TERLALU_SERING: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
  OTP_TIDAK_TERSEDIA: 'Pengiriman kode email belum tersedia. Pakai kata sandi.',
  TIDAK_BERHAK: 'Akun ini belum punya email terverifikasi. Pakai kata sandi.',
  JARINGAN: 'Tidak bisa terhubung ke server. Akunmu belum dihapus. Coba lagi.',
};
export const GALAT_HAPUS_UMUM = 'Akun belum bisa dihapus. Coba lagi nanti.';

const GALAT_UNDUH: Readonly<Record<string, string>> = {
  EKSPOR_TERLALU_BESAR: 'Datamu terlalu besar untuk diunduh sekaligus. Hubungi tim LANJUT untuk memintanya.',
  TERLALU_SERING: 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.',
  JARINGAN: 'Tidak bisa terhubung ke server. Coba lagi.',
  TERLALU_BESAR_HP: 'Datamu terlalu besar untuk dibagikan dari HP. Buka LANJUT di peramban untuk mengunduhnya.',
};
export const GALAT_UNDUH_UMUM = 'Data belum bisa diunduh. Coba lagi nanti.';

export function pesanGalatHapus(kode: string | undefined): string {
  return (kode && GALAT_HAPUS[kode]) || GALAT_HAPUS_UMUM;
}

export function pesanGalatUnduh(kode: string | undefined): string {
  return (kode && GALAT_UNDUH[kode]) || GALAT_UNDUH_UMUM;
}

/** Kode email hanya bisa dikirim ke email yang sudah terbukti milik akun ini. */
export function bisaPakaiKodeEmail(pengguna: { email?: string | null; email_terverifikasi?: boolean }): boolean {
  return Boolean(pengguna.email) && pengguna.email_terverifikasi === true;
}

type IsianHapus = { paham: boolean; metode: MetodeKonfirmasi; kataSandi: string; kodeEmail: string };

export function siapHapus({ paham, metode, kataSandi, kodeEmail }: IsianHapus): boolean {
  if (!paham) return false;
  return metode === 'sandi' ? kataSandi.length > 0 : /^\d{6}$/.test(kodeEmail);
}

export function badanHapusAkun({ metode, kataSandi, kodeEmail }: Omit<IsianHapus, 'paham'>) {
  return metode === 'sandi'
    ? { penegasan: PENEGASAN_HAPUS_AKUN, kata_sandi: kataSandi }
    : { penegasan: PENEGASAN_HAPUS_AKUN, kode_email: kodeEmail };
}

/** Lembar bagikan Android menolak isi yang terlalu panjang, jadi di HP ukurannya dibatasi. */
export const BATAS_BAGIKAN_HP = 400000;

/** Nama berkas tanpa karakter yang bermasalah di sistem berkas. */
export function namaBerkasEkspor(namaPengguna: string, tanggalIso: string): string {
  const bersih = namaPengguna.replace(/[^a-zA-Z0-9._-]/g, '_') || 'akun';
  return `data-lanjut-${bersih}-${tanggalIso.slice(0, 10)}.json`;
}
