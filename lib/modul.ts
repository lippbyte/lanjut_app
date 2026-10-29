// Modul di Arsip Belajar (LANJUT_049) — teks, pesan galat, dan pemilih berkas.
// Semua teks di sini salinan §4.5 (LANJUT_049) — DRAF belum disetujui Khalifa.
import { Platform } from 'react-native';

import { pesanUntuk } from '../api/auth';
import { ApiError } from '../api/client';
import type { JenisModul } from '../api/types';

export const TEKS_MODUL = {
  seksi: 'Modul',
  // 15 Okt 2026: modul ikut jadi bahan Latihan (dan Level-In) — kalimat diperluas, DRAF.
  pengantar: 'Simpan materi pelajaranmu (.txt, .md, atau PDF berisi teks) supaya mudah dibaca, dicari lagi, dan dilatih di Latihan.',
  tombolUnggah: 'Unggah modul',
  kosong: 'Belum ada modul. Unggah materi pelajaran yang ingin kamu simpan.',
  cariPlaceholder: 'Cari di modulmu (minimal 3 huruf)',
  cariTombol: 'Cari',
  cariJudul: 'Hasil di modulmu',
  cariKosong: 'Tidak ada bagian yang cocok. Coba kata lain.',
  cariPendek: 'Ketik minimal 3 huruf.',
  hapusSemua: 'Hapus semua modul',
  hapusSemuaYakin: 'Hapus semua modulmu? Teks dan semua potongannya dihapus permanen dan tidak bisa dikembalikan.',
  hapusSemuaYa: 'Ya, hapus semua',
  hapus: 'Hapus modul',
  hapusYakin: 'Hapus modul ini? Teksnya dihapus permanen dari LANJUT dan tidak bisa dikembalikan.',
  hapusYa: 'Ya, hapus',
  batal: 'Batal',
  hapusGagal: 'Belum terhapus. Coba lagi sebentar lagi.',
  tidakDitemukan: 'Modul ini tidak ditemukan.',
  tidakDitemukanTeks: 'Mungkin sudah dihapus.',
  kembali: 'Kembali ke Arsip',
  formJudul: 'Unggah modul',
  peringatanJudul: 'Sebelum mengunggah',
  peringatan: [
    'Unggah hanya materi pelajaran.',
    'Jangan unggah dokumen berisi data pribadi: nama lengkap, nomor (NIK, NISN, HP), rapor, atau foto identitas.',
    'Unggah hanya materi yang boleh kamu pakai untuk belajar pribadi.',
    'Yang disimpan hanya teksnya, bukan berkas aslinya. Modul bisa kamu hapus permanen kapan saja.',
  ],
  sumberBerkas: 'Pilih berkas',
  sumberTempel: 'Tempel teks',
  berkasPetunjuk: '.txt, .md, atau PDF yang berisi teks.',
  pilihBerkas: 'Pilih berkas',
  gantiBerkas: 'Ganti berkas',
  pemilihTidakAda: 'Memilih berkas belum tersedia di versi aplikasi ini. Tempel teksnya saja.',
  teksLabel: 'Teks materi',
  teksPlaceholder: 'Tempel teks materi di sini...',
  judulPlaceholder: 'mis. Fotosintesis bab 2',
  galatMapel: 'Pilih mapelnya.',
  galatJudul: 'Judul belum diisi.',
  galatBerkas: 'Pilih berkasnya dulu.',
  galatTeks: 'Teks belum diisi.',
  mengunggah: 'Mengunggah…',
} as const;

export const LABEL_JENIS: Record<JenisModul, string> = { txt: 'TXT', md: 'MD', pdf: 'PDF', tempel: 'Teks tempel' };

/**
 * Pesan galat unggah untuk siswa, per kode server (pesan mentah server tidak
 * ditampilkan, SDD §4.2). Angka batas datang dari `medan` (konfigurasi server).
 */
export function pesanGalatModul(err: unknown): string {
  if (err instanceof ApiError) {
    const m = err.medan ?? {};
    switch (err.kode) {
      case 'TIPE_BERKAS_DITOLAK':
        return 'Berkas ini tidak bisa dipakai. Unggah berkas .txt, .md, atau PDF yang berisi teks.';
      case 'BERKAS_TERLALU_BESAR':
        return m.ukuran_maks_mb
          ? `Berkasnya terlalu besar. Ukuran maksimal ${m.ukuran_maks_mb} MB.`
          : 'Berkasnya terlalu besar. Pilih berkas yang lebih kecil.';
      case 'TEKS_TERLALU_PANJANG':
        return m.karakter_maks
          ? `Teksnya terlalu panjang untuk satu modul (maksimal ${m.karakter_maks} karakter). Bagi menjadi beberapa modul.`
          : 'Teksnya terlalu panjang untuk satu modul. Bagi menjadi beberapa modul.';
      case 'BATAS_MODUL':
        return m.jumlah_maks
          ? `Kamu sudah punya ${m.jumlah_maks} modul, batas maksimalnya. Hapus salah satu dulu untuk mengunggah yang baru.`
          : 'Jumlah modulmu sudah mencapai batas. Hapus salah satu dulu.';
      case 'PDF_TANPA_TEKS':
        return 'PDF ini tidak berisi teks yang bisa dibaca, mungkin hasil pindai atau foto. Unggah PDF yang teksnya bisa diblok, atau tempel teksnya langsung.';
      case 'PDF_TERENKRIPSI':
        return 'PDF ini dikunci dengan kata sandi atau perlindungan. Buka kuncinya dulu, atau tempel teksnya langsung.';
      case 'PDF_GAGAL_DIBACA':
        return 'PDF ini tidak bisa dibaca. Coba simpan ulang sebagai PDF, atau tempel teksnya langsung.';
    }
  }
  return pesanUntuk(err);
}

export type BerkasTerpilih = { nama: string; ukuran: number | null; uri: string; mime: string | null; file?: File };

/**
 * Buka pemilih berkas. expo-document-picker adalah modul native: build dev
 * client lama belum memuatnya, jadi dimuat malas di sini — kalau tidak ada,
 * hasilnya 'tidak_tersedia' (siswa tetap bisa menempel teks), bukan crash.
 */
export async function pilihBerkas(): Promise<BerkasTerpilih | null | 'tidak_tersedia'> {
  let pemilih: typeof import('expo-document-picker');
  try {
    pemilih = require('expo-document-picker');
  } catch {
    return 'tidak_tersedia';
  }
  const hasil = await pemilih.getDocumentAsync({
    // Web: saringan ekstensi di jendela pilih. HP: semua berkas (MIME .md tidak
    // seragam); tipe sebenarnya tetap diperiksa server dari isi berkas.
    type: Platform.OS === 'web' ? '.txt,.md,.pdf,text/plain,text/markdown,application/pdf' : '*/*',
    multiple: false,
  });
  if (hasil.canceled || !hasil.assets?.length) return null;
  const a = hasil.assets[0];
  return { nama: a.name, ukuran: a.size ?? null, uri: a.uri, mime: a.mimeType ?? null, file: a.file };
}

/** "1,2 MB" / "350 KB" untuk menampilkan berkas terpilih. */
export function ukuranTeks(byte: number | null): string {
  if (byte === null) return '';
  if (byte >= 1024 * 1024) return `${(byte / (1024 * 1024)).toFixed(1).replace('.', ',')} MB`;
  return `${Math.max(1, Math.round(byte / 1024))} KB`;
}
