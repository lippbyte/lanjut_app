/**
 * Jalur & Tujuan (LANJUT_023 seri v2): aturan dan teks layar. Modul murni supaya bisa dites
 * langsung dari server/tests.
 *
 * DRAF, belum disetujui. Semua teks di sini menunggu persetujuan Khalifa
 * (docs/draf-teks-jalur-tujuan.md). Nama dan deskripsi jalur datang dari server, dari
 * server/data-konten/jalur-minat.json. K37: server hanya mengirim jalur yang teksnya sudah
 * disetujui, jadi selama semuanya masih draf, daftar jalurnya kosong. Layarnya tidak ada
 * di aplikasi sampai build dibuat dengan EXPO_PUBLIC_JALUR_TUJUAN=1 (lib/fiturApp.ts).
 *
 * Nama fitur sengaja "Jalur & Tujuan", bukan "Jalur Saya": nama itu sudah dipakai layar posisi
 * kelas 12 (LANJUT_074).
 */

import type { JalurMinat, PeristiwaPerjalanan, PilihanJalur, StatusPilihanJalur, StatusTujuan, Tujuan } from '../api/types';

/** Sama dengan server/src/modul/tujuan/tujuan.skema.js. */
export const BATAS_TUJUAN = { judul: 200, uraian: 2000 } as const;

// DRAF, belum disetujui.
export const TEKS_JALUR_TUJUAN = {
  judul: 'Jalur & Tujuan',
  pengantar: 'Jalur yang sedang kamu jalani dan tujuan yang ingin kamu capai. Boleh lebih dari satu, dan boleh berubah.',
  labelDraf: 'Teks draf',

  bagianJalur: 'Jalurmu',
  petunjukJalur: 'Pilih satu atau lebih. Kamu bisa menjedanya dan memilihnya lagi kapan saja.',
  jalurBelumTersedia: 'Pilihan jalur belum tersedia. Sementara itu, kamu tetap bisa menulis tujuan.',
  pilih: 'Pilih jalur ini',
  pilihLagi: 'Pilih lagi',
  jeda: 'Jeda dulu',
  sedangDijalani: 'Sedang kamu jalani',

  bagianTujuan: 'Tujuanmu',
  tambahTujuan: 'Tambah tujuan',
  kosongTujuan: 'Belum ada tujuan. Tulis satu hal yang ingin kamu capai.',
  prodiImpian: 'Prodi impian',
  dariDataAkun: 'Dari Data Akun',
  ubahDiDataAkun: 'Untuk mengubahnya, buka Data Akun.',
  perbarui: 'Perbarui',
  tandaiTercapai: 'Tandai tercapai',
  lihatRiwayat: 'Lihat perubahan',
  tutupRiwayat: 'Tutup perubahan',
  sebelumnya: 'Sebelumnya',
  targetPrefix: 'Target',

  bagianPerjalanan: 'Perjalananmu',
  kosongPerjalanan: 'Pilihan jalur dan tujuanmu akan tercatat di sini.',

  judulTulis: 'Tulis Tujuan',
  labelJudul: 'Tujuan',
  labelUraian: 'Cerita singkat',
  labelTarget: 'Target waktu',
  labelJalur: 'Jalur',
  tanpaJalur: 'Belum terkait jalur',
  labelOpsional: '(boleh kosong)',
  petunjukTanggal: 'Tulis seperti ini: 2027-06-30',
  catatanVersi: 'Tujuan yang lama tetap tersimpan di riwayatmu.',
  simpan: 'Simpan',
  menyimpan: 'Menyimpan…',

  fiturMatiJudul: 'Fitur ini belum tersedia.',
  fiturMatiTeks: 'Jalur & Tujuan sedang disiapkan. Coba buka lagi nanti.',
  perluKebijakanJudul: 'Terima kebijakan privasi dulu.',
  perluKebijakanTeks: 'Setelah itu kamu bisa mulai memilih jalur dan menulis tujuan.',
  bacaKebijakan: 'Baca dan terima',
  jaringan: 'Tidak bisa terhubung ke server. Periksa sambunganmu, lalu coba lagi.',
  server: 'Sedang ada gangguan di server. Coba lagi sebentar lagi.',
  cobaLagi: 'Coba lagi',
  tidakDitemukanJudul: 'Tujuan ini tidak ditemukan.',
  tidakDitemukanTeks: 'Mungkin sudah diperbarui. Buka lagi dari Jalur & Tujuan.',
  kembali: 'Kembali ke Jalur & Tujuan',
} as const;

// DRAF, belum disetujui.
export const LABEL_STATUS_PILIHAN: Readonly<Record<StatusPilihanJalur, string>> = {
  aktif: 'Sedang dijalani',
  dijeda: 'Dijeda',
  selesai: 'Selesai',
  ditinggalkan: 'Ditinggalkan',
};

// DRAF, belum disetujui.
export const LABEL_STATUS_TUJUAN: Readonly<Record<StatusTujuan, string>> = {
  aktif: 'Sedang dikejar',
  tercapai: 'Tercapai',
  diubah: 'Sudah diperbarui',
  ditinggalkan: 'Ditinggalkan',
};

// DRAF, belum disetujui.
export const GALAT_ISIAN_TUJUAN = {
  judulKosong: 'Tujuannya belum diisi.',
  judulPanjang: 'Tujuan paling panjang 200 karakter.',
  uraianPanjang: 'Cerita singkat paling panjang 2000 karakter.',
  tanggalFormat: 'Tulis tanggal seperti ini: 2027-06-30.',
  tanggalKalender: 'Tanggal ini tidak ada di kalender.',
  tidakBerubah: 'Belum ada yang berubah dari tujuan sebelumnya.',
} as const;

export const GALAT_UMUM_JALUR_TUJUAN = 'Belum bisa disimpan. Coba lagi sebentar lagi.';

// DRAF, belum disetujui.
const PESAN_GALAT: Readonly<Record<string, string>> = {
  JALUR_SUDAH_DIPILIH: 'Jalur ini sudah kamu pilih.',
  JALUR_BELUM_TERSEDIA: 'Jalur ini belum tersedia.',
  PILIHAN_SUDAH_BERAKHIR: 'Jalur ini sudah tidak aktif. Pilih lagi untuk memulainya kembali.',
  TUJUAN_BUKAN_TERKINI: 'Tujuan ini sudah diperbarui. Muat ulang untuk melihat yang terbaru.',
  AI_BELUM_DIIZINKAN: 'Terima kebijakan privasi dulu supaya bisa menyimpan jalur dan tujuan.',
  TIDAK_DITEMUKAN: 'Data ini tidak ditemukan. Muat ulang, lalu coba lagi.',
  VALIDASI_GAGAL: 'Ada isian yang belum sesuai. Coba periksa lagi.',
  TERLALU_SERING: 'Terlalu banyak permintaan dalam waktu singkat. Coba lagi beberapa menit lagi.',
  JARINGAN: TEKS_JALUR_TUJUAN.jaringan,
};

export function pesanGalatJalurTujuan(kode: string | undefined): string {
  return (kode && PESAN_GALAT[kode]) || GALAT_UMUM_JALUR_TUJUAN;
}

/**
 * Kalimat perjalanan. DRAF, belum disetujui. Nama jalur hanya ada bila jalurnya terkirim (K37);
 * tanpa nama, kalimatnya tetap utuh ("Memilih jalur").
 */
export function teksPeristiwa(p: PeristiwaPerjalanan, namaJalur: (id: string | null) => string): string {
  const nama = namaJalur(p.jalur_minat_id);
  const jalur = nama ? ` ${nama}` : '';
  const judul = `"${p.judul ?? ''}"`;
  switch (p.jenis) {
    case 'jalur_dipilih':
      return `Memilih jalur${jalur}`;
    case 'jalur_dijeda':
      return `Menjeda jalur${jalur}`;
    case 'jalur_selesai':
      return `Menyelesaikan jalur${jalur}`;
    case 'jalur_ditinggalkan':
      return `Meninggalkan jalur${jalur}`;
    case 'tujuan_dibuat':
      return `Menulis tujuan ${judul}`;
    case 'tujuan_diperbarui':
      return `Memperbarui tujuan menjadi ${judul}`;
    case 'tujuan_tercapai':
      return `Mencapai tujuan ${judul}`;
    case 'tujuan_ditinggalkan':
      return `Meninggalkan tujuan ${judul}`;
    default:
      return '';
  }
}

export type KeadaanData = 'memuat' | 'fitur_mati' | 'perlu_kebijakan' | 'jaringan' | 'server' | 'siap';

/** 404 pada daftar jalur hanya berarti saklar server mati: rute itu selalu ada bila menyala. */
export function keadaanData(q: { isPending: boolean; galat?: { status?: number; kode?: string } | null }): KeadaanData {
  if (q.galat) {
    if (q.galat.status === 404) return 'fitur_mati';
    if (q.galat.kode === 'AI_BELUM_DIIZINKAN') return 'perlu_kebijakan';
    if (q.galat.kode === 'JARINGAN') return 'jaringan';
    return 'server';
  }
  return q.isPending ? 'memuat' : 'siap';
}

export type BarisJalur = { jalur: JalurMinat; aktif: PilihanJalur | null; jumlahBabak: number };

/** Setiap jalur bersama babak aktifnya (bila ada) dan jumlah babak yang pernah dijalani. */
export function susunJalur(jalur: readonly JalurMinat[], pilihan: readonly PilihanJalur[]): BarisJalur[] {
  return jalur.map((j) => {
    const milik = pilihan.filter((p) => p.jalur_minat_id === j.id);
    return { jalur: j, aktif: milik.find((p) => p.status === 'aktif') ?? null, jumlahBabak: milik.length };
  });
}

function tanggalSah(nilai: string): boolean {
  const d = new Date(`${nilai}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === nilai;
}

export type IsianTujuan = { judul: string; uraian: string; target: string; jalur: string | null };
export type GalatIsianTujuan = Partial<Record<'judul' | 'uraian' | 'target_pada' | '_', string>>;

export function periksaIsianTujuan(isi: IsianTujuan): GalatIsianTujuan {
  const galat: GalatIsianTujuan = {};
  const judul = isi.judul.trim();
  if (!judul) galat.judul = GALAT_ISIAN_TUJUAN.judulKosong;
  else if (judul.length > BATAS_TUJUAN.judul) galat.judul = GALAT_ISIAN_TUJUAN.judulPanjang;
  if (isi.uraian.trim().length > BATAS_TUJUAN.uraian) galat.uraian = GALAT_ISIAN_TUJUAN.uraianPanjang;
  const target = isi.target.trim();
  if (target && !/^\d{4}-\d{2}-\d{2}$/.test(target)) galat.target_pada = GALAT_ISIAN_TUJUAN.tanggalFormat;
  else if (target && !tanggalSah(target)) galat.target_pada = GALAT_ISIAN_TUJUAN.tanggalKalender;
  return galat;
}

export type BadanTujuan = { judul?: string; uraian?: string | null; target_pada?: string | null; jalur_minat_id?: string | null };

/**
 * Tujuan baru: semua medan. Versi baru (`awal` ada): hanya medan yang berubah, karena server
 * menyalin sisanya dari versi sebelumnya. Null berarti tidak ada perubahan sama sekali.
 */
export function badanTujuan(isi: IsianTujuan, awal?: Tujuan): BadanTujuan | null {
  const baru = {
    judul: isi.judul.trim(),
    uraian: isi.uraian.trim() || null,
    target_pada: isi.target.trim() || null,
    jalur_minat_id: isi.jalur,
  };
  if (!awal) return baru;
  const badan: BadanTujuan = {};
  if (baru.judul !== awal.judul) badan.judul = baru.judul;
  if (baru.uraian !== awal.uraian) badan.uraian = baru.uraian;
  if (baru.target_pada !== awal.target_pada) badan.target_pada = baru.target_pada;
  if (baru.jalur_minat_id !== awal.jalur_minat_id) badan.jalur_minat_id = baru.jalur_minat_id;
  return Object.keys(badan).length ? badan : null;
}

/** Pesan server per medan diganti kalimat sendiri, karena pesan bawaan validasinya teknis. */
export function galatMedanServerTujuan(medan: Record<string, string> | undefined): GalatIsianTujuan {
  const galat: GalatIsianTujuan = {};
  if (!medan) return galat;
  if (medan.judul) galat.judul = GALAT_ISIAN_TUJUAN.judulPanjang;
  if (medan.uraian) galat.uraian = GALAT_ISIAN_TUJUAN.uraianPanjang;
  if (medan.target_pada) galat.target_pada = GALAT_ISIAN_TUJUAN.tanggalKalender;
  if (medan._) galat._ = GALAT_ISIAN_TUJUAN.tidakBerubah;
  return galat;
}
