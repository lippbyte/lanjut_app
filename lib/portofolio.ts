/**
 * Portofolio (LANJUT_011 seri v2): aturan dan teks layar. Modul murni supaya bisa dites langsung
 * dari server/tests.
 *
 * Semua teks di sini DRAF, menunggu persetujuan Khalifa (docs/draf-teks-portofolio.md). Layarnya
 * tidak ada di aplikasi sampai build dibuat dengan EXPO_PUBLIC_PORTOFOLIO=1 (lib/fiturApp.ts).
 */

export type JenisButir = 'karya' | 'proses' | 'refleksi';

export const JENIS_BUTIR: readonly { id: JenisButir; label: string }[] = [
  { id: 'karya', label: 'Karya' },
  { id: 'proses', label: 'Proses' },
  { id: 'refleksi', label: 'Refleksi' },
];

/** Sama dengan server/src/modul/butir-bukti/butir-bukti.skema.js. */
export const BATAS_ISIAN = { judul: 200, uraian: 5000, tautan: 500 } as const;

/** `ukuranByte`, `perButir`, dan `perAkun` sama dengan BATAS_FOTO di butir-bukti.layanan.js. */
export const BATAS_FOTO = {
  ukuranByte: 5 * 1024 * 1024,
  perButir: 3,
  perAkun: 30,
  sisiTerpanjang: 1600,
  kualitas: 0.8,
} as const;

export const TEKS_PORTOFOLIO = {
  judul: 'Portofolio',
  pengantar: 'Catatan karyamu. Hanya bisa dibuka lewat akunmu.',
  tambah: 'Tambah catatan',
  kosongJudul: 'Belum ada catatan.',
  kosongTeks: 'Mulai dari satu hal yang baru kamu buat.',

  labelJudul: 'Judul',
  labelJenis: 'Jenis',
  labelUraian: 'Cerita singkat',
  labelTautan: 'Tautan',
  labelTanggal: 'Tanggal karya',
  labelOpsional: '(boleh kosong)',
  petunjukTautan: 'Diawali http:// atau https://',
  petunjukTanggal: 'Tulis seperti ini: 2026-11-30',
  simpan: 'Simpan',
  menyimpan: 'Menyimpan…',

  ubah: 'Ubah catatan',
  hapus: 'Hapus catatan',
  yakinHapus: 'Hapus catatan ini? Semua fotonya ikut terhapus dan tidak bisa dikembalikan.',
  batal: 'Batal',
  yaHapus: 'Ya, hapus',
  hapusGagal: 'Belum terhapus. Coba lagi sebentar lagi.',
  tidakDitemukanJudul: 'Catatan ini tidak ditemukan.',
  tidakDitemukanTeks: 'Mungkin sudah dihapus.',
  kembali: 'Kembali ke Portofolio',

  judulFoto: 'Foto',
  privasiFoto: 'Foto ini hanya bisa dibuka lewat akunmu di aplikasi, dan siswa lain tidak bisa melihatnya. Pengelola layanan secara teknis bisa mengakses tempat penyimpanannya, dan tidak membukanya tanpa keperluan. Jangan unggah dokumen pribadi seperti KTP, kartu pelajar, atau rapor, dan jangan unggah wajah orang lain tanpa izin mereka.',
  galeri: 'Pilih dari galeri',
  kamera: 'Ambil foto',
  penjelasIzin: 'Kamera hanya dipakai saat kamu mengambil foto di sini.',
  penuhButir: 'Catatan ini sudah punya 3 foto. Hapus satu dulu kalau mau menggantinya.',
  penuhAkun: 'Akunmu sudah menyimpan 30 foto. Hapus foto lain dulu kalau mau menambah.',
  mengolah: 'Menyiapkan foto…',
  mengunggah: 'Mengunggah foto…',
  cobaLagi: 'Coba lagi',
  izinDitolak: 'Izin kamera belum diberikan. Kamu bisa mengizinkannya di Pengaturan, atau pilih foto dari galeri.',
  bukaPengaturan: 'Buka Pengaturan',
  fotoGagalMuat: 'Foto belum bisa dimuat.',
  muatLagi: 'Muat lagi',
  hapusFoto: 'Hapus foto',
  yakinHapusFoto: 'Hapus foto ini? Foto yang dihapus tidak bisa dikembalikan.',

  fiturMatiJudul: 'Fitur ini belum tersedia.',
  fiturMatiTeks: 'Portofolio sedang disiapkan. Coba buka lagi nanti.',
  perluKebijakanJudul: 'Terima kebijakan privasi dulu.',
  perluKebijakanTeks: 'Setelah itu kamu bisa mulai mencatat karyamu.',
  bacaKebijakan: 'Baca dan terima',
  jaringan: 'Tidak bisa terhubung ke server. Periksa sambunganmu, lalu coba lagi.',
  server: 'Sedang ada gangguan di server. Coba lagi sebentar lagi.',
} as const;

export const GALAT_ISIAN = {
  judulKosong: 'Judulnya belum diisi.',
  judulPanjang: 'Judul paling panjang 200 karakter.',
  jenis: 'Pilih salah satu jenis.',
  uraianPanjang: 'Cerita singkat paling panjang 5000 karakter.',
  tautan: 'Tautan harus diawali http:// atau https://.',
  tautanPanjang: 'Tautan paling panjang 500 karakter.',
  tanggalFormat: 'Tulis tanggal seperti ini: 2026-11-30.',
  tanggalKalender: 'Tanggal ini tidak ada di kalender.',
} as const;

export const GALAT_UMUM = 'Belum bisa disimpan. Coba lagi sebentar lagi.';

/** Kode dari server dan kode yang dibuat di HP. Semua dalam bahasa siswa. */
const PESAN_GALAT: Readonly<Record<string, string>> = {
  FOTO_TERLALU_BESAR: 'Foto ini masih lebih dari 5 MB. Coba pilih foto lain.',
  FOTO_JENIS_DITOLAK: 'Jenis berkas ini belum bisa disimpan. Pakai foto JPEG, PNG, atau WebP.',
  FOTO_HEIC_DITOLAK: 'Foto HEIC belum bisa disimpan. Coba pilih foto lain.',
  FOTO_HEIC_PERAMBAN: 'Foto HEIC belum bisa dibuka di peramban. Buka lewat aplikasi di HP, atau pilih foto JPEG atau PNG.',
  FOTO_RUSAK: 'Foto ini tidak bisa dibuka. Coba pilih foto lain.',
  PEMILIH_TIDAK_TERSEDIA: 'Pemilih foto belum tersedia di versi aplikasi ini.',
  BATAS_FOTO_BUTIR: TEKS_PORTOFOLIO.penuhButir,
  BATAS_FOTO_AKUN: TEKS_PORTOFOLIO.penuhAkun,
  TERLALU_SERING: 'Terlalu banyak unggahan dalam waktu singkat. Coba lagi beberapa menit lagi.',
  JARINGAN: TEKS_PORTOFOLIO.jaringan,
  AI_BELUM_DIIZINKAN: 'Terima kebijakan privasi dulu supaya bisa menyimpan catatan.',
  TIDAK_DITEMUKAN: 'Catatan ini tidak ditemukan. Mungkin sudah dihapus.',
  VALIDASI_GAGAL: 'Ada isian yang belum sesuai. Coba periksa lagi.',
};

/** `status` dipakai untuk 413 dari proxy, yang jawabannya bukan JSON dan tidak punya kode. */
export function pesanGalatPortofolio(kode: string | undefined, status?: number): string {
  if (status === 413) return PESAN_GALAT.FOTO_TERLALU_BESAR;
  return (kode && PESAN_GALAT[kode]) || GALAT_UMUM;
}

/** Coba lagi hanya masuk akal bila penyebabnya bisa hilang sendiri. */
export function bisaCobaLagi(kode: string | undefined, status?: number): boolean {
  if (kode === 'JARINGAN' || kode === 'TERLALU_SERING') return true;
  return status !== undefined && status >= 500;
}

/**
 * Sedikit lebih ketat dari server: yang diterima di sini selalu diterima server. Tidak memakai
 * `new URL`, karena dukungan URL di React Native tidak lengkap.
 */
export function tautanSah(nilai: string): boolean {
  return /^https?:\/\/[^\s/?#]+([/?#].*)?$/i.test(nilai.trim());
}

function tanggalSah(nilai: string): boolean {
  const d = new Date(`${nilai}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === nilai;
}

export type IsianButir = { judul: string; jenis: JenisButir | null; uraian: string; tautan: string; tanggal: string };
export type GalatIsian = Partial<Record<'judul' | 'jenis' | 'uraian' | 'tautan' | 'tanggal_karya', string>>;

export function periksaIsianButir(isi: IsianButir): GalatIsian {
  const galat: GalatIsian = {};
  const judul = isi.judul.trim();
  if (!judul) galat.judul = GALAT_ISIAN.judulKosong;
  else if (judul.length > BATAS_ISIAN.judul) galat.judul = GALAT_ISIAN.judulPanjang;
  if (!isi.jenis) galat.jenis = GALAT_ISIAN.jenis;
  if (isi.uraian.trim().length > BATAS_ISIAN.uraian) galat.uraian = GALAT_ISIAN.uraianPanjang;
  const tautan = isi.tautan.trim();
  if (tautan.length > BATAS_ISIAN.tautan) galat.tautan = GALAT_ISIAN.tautanPanjang;
  else if (tautan && !tautanSah(tautan)) galat.tautan = GALAT_ISIAN.tautan;
  const tanggal = isi.tanggal.trim();
  if (tanggal && !/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) galat.tanggal_karya = GALAT_ISIAN.tanggalFormat;
  else if (tanggal && !tanggalSah(tanggal)) galat.tanggal_karya = GALAT_ISIAN.tanggalKalender;
  return galat;
}

/** Pesan server per medan diganti kalimat sendiri, karena pesan bawaan validasinya teknis. */
export function galatMedanServer(medan: Record<string, string> | undefined): GalatIsian {
  const galat: GalatIsian = {};
  if (!medan) return galat;
  if (medan.judul) galat.judul = GALAT_ISIAN.judulPanjang;
  if (medan.jenis) galat.jenis = GALAT_ISIAN.jenis;
  if (medan.uraian) galat.uraian = GALAT_ISIAN.uraianPanjang;
  if (medan.tautan) galat.tautan = GALAT_ISIAN.tautan;
  if (medan.tanggal_karya) galat.tanggal_karya = GALAT_ISIAN.tanggalKalender;
  return galat;
}

export type BadanButir = {
  judul: string;
  jenis: JenisButir;
  uraian: string | null;
  tautan: string | null;
  tanggal_karya: string | null;
};

/** Hanya lima medan ini yang dikirim. Pemilihan jalur dan tujuan menunggu Bagian 4. */
export function badanButir(isi: IsianButir & { jenis: JenisButir }): BadanButir {
  return {
    judul: isi.judul.trim(),
    jenis: isi.jenis,
    uraian: isi.uraian.trim() || null,
    tautan: isi.tautan.trim() || null,
    tanggal_karya: isi.tanggal.trim() || null,
  };
}

export function labelJenisButir(jenis: string): string {
  return JENIS_BUTIR.find((j) => j.id === jenis)?.label ?? jenis;
}

export type KeadaanDaftar = 'memuat' | 'fitur_mati' | 'perlu_kebijakan' | 'jaringan' | 'server' | 'kosong' | 'ada';

/** 404 pada daftar hanya berarti saklar server mati, karena rute daftar selalu ada bila menyala. */
export function keadaanDaftar(q: {
  isPending: boolean;
  galat?: { status?: number; kode?: string } | null;
  jumlah?: number;
}): KeadaanDaftar {
  if (q.galat) {
    if (q.galat.status === 404) return 'fitur_mati';
    if (q.galat.kode === 'AI_BELUM_DIIZINKAN') return 'perlu_kebijakan';
    if (q.galat.kode === 'JARINGAN') return 'jaringan';
    return 'server';
  }
  if (q.isPending) return 'memuat';
  return q.jumlah ? 'ada' : 'kosong';
}

export function hitungFotoAkun(daftar: readonly { foto: readonly unknown[] }[]): number {
  return daftar.reduce((jumlah, b) => jumlah + b.foto.length, 0);
}

export function batasFoto(jumlahButir: number, jumlahAkun: number): { bolehTambah: boolean; alasan: 'butir' | 'akun' | null } {
  if (jumlahButir >= BATAS_FOTO.perButir) return { bolehTambah: false, alasan: 'butir' };
  if (jumlahAkun >= BATAS_FOTO.perAkun) return { bolehTambah: false, alasan: 'akun' };
  return { bolehTambah: true, alasan: null };
}

export function teksJumlahFoto(jumlahButir: number, jumlahAkun: number): string {
  return `Foto di catatan ini: ${jumlahButir} dari ${BATAS_FOTO.perButir}. Foto di akunmu: ${jumlahAkun} dari ${BATAS_FOTO.perAkun}.`;
}

/** Null berarti tidak perlu diperkecil. Satu sisi saja, sisi lain mengikuti perbandingannya. */
export function rencanaUkuran(lebar: number, tinggi: number): { width: number } | { height: number } | null {
  if (Math.max(lebar, tinggi) <= BATAS_FOTO.sisiTerpanjang) return null;
  return lebar >= tinggi ? { width: BATAS_FOTO.sisiTerpanjang } : { height: BATAS_FOTO.sisiTerpanjang };
}

export function adalahHeic(asal: { mimeType?: string | null; fileName?: string | null }): boolean {
  return /hei[cf]/i.test(asal.mimeType ?? '') || /\.hei[cf]$/i.test(asal.fileName ?? '');
}
