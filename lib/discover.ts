/**
 * Discover dan Profil Eksplorasi (LANJUT_024 seri v2): aturan dan teks layar. Modul murni supaya
 * bisa dites langsung dari server/tests.
 *
 * DRAF, belum disetujui. Semua teks di sini menunggu persetujuan Khalifa (docs/draf-teks-discover.md).
 * Isi kartu datang dari server, dan hanya kartu yang teksnya sudah disetujui yang terkirim. Layarnya
 * tidak ada di aplikasi sampai build dibuat dengan EXPO_PUBLIC_DISCOVER=1 (lib/fiturApp.ts).
 *
 * Profil disusun dengan aturan, bukan AI: kalimatnya hanya mengulang apa yang siswa tulis dan pilih.
 * Tidak ada kalimat yang menebak kepribadian, kemampuan, atau sifat siswa.
 */

import type { JenisKartuDiscover, Ketertarikan, ProfilEksplorasi } from '../api/types';

/** Sama dengan server/src/modul/discover/discover.skema.js. */
export const BATAS_DISCOVER = { refleksi: 280, catatan: 500 } as const;

// DRAF, belum disetujui.
export const TEKS_DISCOVER = {
  judul: 'Discover',
  pengantar: 'Kenali bidang, profesi, dan usaha. Tulis apa yang menarik dan apa yang tidak, lalu lihat profil eksplorasimu.',
  labelDraf: 'Teks draf',
  kosongJudul: 'Kartu belum tersedia.',
  kosongTeks: 'Kartu Discover sedang disiapkan. Sementara itu, kamu tetap bisa membuka profil eksplorasimu.',
  lihatProfil: 'Lihat profil eksplorasimu',
  tulisRefleksi: 'Tulis refleksi',
  ubahRefleksi: 'Ubah refleksi',
  sudahDitulis: 'Sudah kamu tulis',
  labelSumber: 'Sumber',

  judulRefleksi: 'Tulis Refleksi',
  tanyaKetertarikan: 'Seberapa tertarik kamu?',
  labelMenarik: 'Apa yang menarik buatmu?',
  labelKurangMenarik: 'Apa yang kurang menarik buatmu?',
  labelOpsional: '(boleh kosong)',
  privasi: 'Refleksi dan profilmu tersimpan di akunmu. Keduanya ikut saat kamu mengunduh data akunmu, dan ikut terhapus saat akunmu dihapus.',
  simpan: 'Simpan',
  menyimpan: 'Menyimpan…',

  judulProfil: 'Profil Eksplorasi',
  pengantarProfil: 'Profil ini hanya berisi apa yang kamu tulis dan pilih. LANJUT tidak menebak sifat atau kemampuanmu.',
  belumAdaProfil: 'Profilmu belum disusun.',
  belumAdaProfilTeks: 'Tulis refleksi di beberapa kartu, lalu susun profilmu di sini.',
  susunProfil: 'Susun profilku',
  perbaruiProfil: 'Perbarui profilku',
  labelCatatan: 'Catatan untuk dirimu sendiri',
  catatanVersi: 'Profil lama tetap tersimpan di riwayatmu.',
  bagianDataAkun: 'Dari Data Akun',
  labelMinatRumpun: 'Bidang minat',
  labelMapelPilihan: 'Mapel pilihan',
  bagianJalurTujuan: 'Jalur dan tujuanmu',
  labelJalur: 'Jalur',
  labelTujuan: 'Tujuan',
  lihatRiwayat: 'Lihat versi sebelumnya',
  tutupRiwayat: 'Tutup versi sebelumnya',
  versiPrefix: 'Versi',

  fiturMatiJudul: 'Fitur ini belum tersedia.',
  fiturMatiTeks: 'Discover sedang disiapkan. Coba buka lagi nanti.',
  perluKebijakanJudul: 'Terima kebijakan privasi dulu.',
  perluKebijakanTeks: 'Setelah itu kamu bisa mulai menulis refleksi.',
  bacaKebijakan: 'Baca dan terima',
  jaringan: 'Tidak bisa terhubung ke server. Periksa sambunganmu, lalu coba lagi.',
  server: 'Sedang ada gangguan di server. Coba lagi sebentar lagi.',
  cobaLagi: 'Coba lagi',
  tidakDitemukanJudul: 'Kartu ini tidak ditemukan.',
  tidakDitemukanTeks: 'Mungkin sedang disiapkan. Buka lagi dari Discover.',
  kembali: 'Kembali ke Discover',
} as const;

// DRAF, belum disetujui.
export const LABEL_JENIS_KARTU: Readonly<Record<JenisKartuDiscover, string>> = { bidang: 'Bidang', profesi: 'Profesi', usaha: 'Usaha' };

// DRAF, belum disetujui.
export const PILIHAN_KETERTARIKAN: readonly { id: Ketertarikan; label: string }[] = [
  { id: 'tertarik', label: 'Tertarik' },
  { id: 'belum_yakin', label: 'Belum yakin' },
  { id: 'tidak_tertarik', label: 'Kurang tertarik' },
];

// DRAF, belum disetujui.
export const GALAT_ISIAN_DISCOVER = {
  ketertarikan: 'Pilih salah satu dulu.',
  refleksiPanjang: 'Paling panjang 280 karakter.',
  catatanPanjang: 'Catatan paling panjang 500 karakter.',
  tidakBerubah: 'Belum ada yang berubah sejak profilmu terakhir disusun.',
} as const;

export const GALAT_UMUM_DISCOVER = 'Belum bisa disimpan. Coba lagi sebentar lagi.';

// DRAF, belum disetujui.
const PESAN_GALAT: Readonly<Record<string, string>> = {
  KARTU_BELUM_TERSEDIA: 'Kartu ini belum tersedia.',
  PROFIL_BUKAN_TERKINI: 'Profilmu baru saja berubah. Muat ulang, lalu coba lagi.',
  AI_BELUM_DIIZINKAN: 'Terima kebijakan privasi dulu supaya bisa menyimpan refleksi.',
  TIDAK_DITEMUKAN: 'Data ini tidak ditemukan. Muat ulang, lalu coba lagi.',
  VALIDASI_GAGAL: 'Ada isian yang belum sesuai. Coba periksa lagi.',
  TERLALU_SERING: 'Terlalu banyak permintaan dalam waktu singkat. Coba lagi beberapa menit lagi.',
  JARINGAN: TEKS_DISCOVER.jaringan,
};

export function pesanGalatDiscover(kode: string | undefined): string {
  return (kode && PESAN_GALAT[kode]) || GALAT_UMUM_DISCOVER;
}

/** DRAF, belum disetujui. */
export function teksDisembunyikan(jumlah: number): string {
  return `${jumlah} refleksi pada kartu yang sedang disiapkan belum ditampilkan.`;
}

/**
 * Kalimat profil. DRAF, belum disetujui. Setiap kalimat hanya mengulang judul kartu dan kata-kata
 * siswa sendiri; tidak ada kalimat yang menyimpulkan sesuatu tentang siswa.
 */
export function kalimatProfil(profil: Pick<ProfilEksplorasi, 'tertarik' | 'belum_yakin' | 'kurang_tertarik'>): string[] {
  const alasan = (a: string | null | undefined) => (a ? ` karena kamu menulis: "${a}"` : '.');
  return [
    ...profil.tertarik.map((b) => `Kamu tertarik ke ${b.judul}${alasan(b.alasan)}`),
    ...profil.belum_yakin.map((b) => `Kamu masih memikirkan ${b.judul}.`),
    ...profil.kurang_tertarik.map((b) => `Kamu kurang tertarik ke ${b.judul}${alasan(b.alasan)}`),
  ];
}

export type KeadaanData = 'memuat' | 'fitur_mati' | 'perlu_kebijakan' | 'jaringan' | 'server' | 'siap';

/** 404 pada daftar kartu hanya berarti saklar server mati: rute itu selalu ada bila menyala. */
export function keadaanData(q: { isPending: boolean; galat?: { status?: number; kode?: string } | null }): KeadaanData {
  if (q.galat) {
    if (q.galat.status === 404) return 'fitur_mati';
    if (q.galat.kode === 'AI_BELUM_DIIZINKAN') return 'perlu_kebijakan';
    if (q.galat.kode === 'JARINGAN') return 'jaringan';
    return 'server';
  }
  return q.isPending ? 'memuat' : 'siap';
}

export type IsianRefleksi = { ketertarikan: Ketertarikan | null; menarik: string; kurang: string };
export type GalatIsianRefleksi = Partial<Record<'ketertarikan' | 'yang_menarik' | 'yang_kurang_menarik', string>>;

export function periksaIsianRefleksi(isi: IsianRefleksi): GalatIsianRefleksi {
  const galat: GalatIsianRefleksi = {};
  if (!isi.ketertarikan) galat.ketertarikan = GALAT_ISIAN_DISCOVER.ketertarikan;
  if (isi.menarik.trim().length > BATAS_DISCOVER.refleksi) galat.yang_menarik = GALAT_ISIAN_DISCOVER.refleksiPanjang;
  if (isi.kurang.trim().length > BATAS_DISCOVER.refleksi) galat.yang_kurang_menarik = GALAT_ISIAN_DISCOVER.refleksiPanjang;
  return galat;
}

export type BadanRefleksi = { ketertarikan: Ketertarikan; yang_menarik: string | null; yang_kurang_menarik: string | null };

export function badanRefleksi(isi: IsianRefleksi & { ketertarikan: Ketertarikan }): BadanRefleksi {
  return { ketertarikan: isi.ketertarikan, yang_menarik: isi.menarik.trim() || null, yang_kurang_menarik: isi.kurang.trim() || null };
}
