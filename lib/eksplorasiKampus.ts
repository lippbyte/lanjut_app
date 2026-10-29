import { kelompokJenjang, type Kelas } from './jenjang';

/**
 * Eksplorasi Kampus untuk semua jenjang (LANJUT_075) di rute /eksplorasi-tujuan.
 * Modul murni tanpa React supaya tes server bisa menjalankannya langsung
 * (server/tests/muat-ts-app.js).
 *
 *   - SMP (kelas 7–9)  → "Kenali Minatmu": bidang minat saja.
 *   - Kelas 10–11      → "Jalur dan Bidangmu": jalur masuk umum + bidang minat.
 *   - Kelas 12 & akun tanpa kelas → layar F10 yang sudah ada, tidak diubah.
 *
 * Tidak ada daftar prodi, tanggal, biaya, daya tampung, atau peluang di dua
 * versi baru. Bidang = nama rumpun dari data prodi yang sudah ada (prodi.rumpun),
 * bukan daftar baru. Yang disimpan ke akun hanya nama rumpun (minat_rumpun).
 *
 * TEKS DRAF, belum disetujui Khalifa — salinan-teks-lanjut.md §4.9 (LANJUT_075).
 */

export type VersiEksplorasi = 'smp' | 'kelas10_11' | 'f10';

export function versiEksplorasi(kelas: Kelas | null | undefined): VersiEksplorasi {
  const kelompok = kelompokJenjang(kelas);
  if (kelompok === 'smp') return 'smp';
  if (kelompok === 'kelas10_11') return 'kelas10_11';
  return 'f10';
}

/** Judul bilah halaman /eksplorasi-tujuan per jenjang (pilihan di percakapan LANJUT_075). */
export const JUDUL_EKSPLORASI: Record<VersiEksplorasi, string> = {
  smp: 'Kenali Minatmu',
  kelas10_11: 'Jalur dan Bidangmu',
  f10: 'Eksplorasi Tujuan',
};

export function judulEksplorasi(kelas: Kelas | null | undefined): string {
  return JUDUL_EKSPLORASI[versiEksplorasi(kelas)];
}

export type BagianEksplorasi = 'pengantar' | 'jalur' | 'bidang' | 'simpan' | 'prodi_nanti' | 'penutup';

/**
 * Bagian yang dirender per versi, urut dari atas. SMP TIDAK punya 'jalur'
 * (jalur masuk) dan tidak ada bagian bertanggal di versi mana pun: tanggal
 * hanya dari data Linimasa terverifikasi, dan Linimasa khusus kelas 12.
 */
export const BAGIAN_EKSPLORASI: Record<Exclude<VersiEksplorasi, 'f10'>, readonly BagianEksplorasi[]> = {
  smp: ['pengantar', 'bidang', 'simpan', 'penutup'],
  kelas10_11: ['pengantar', 'jalur', 'bidang', 'simpan', 'prodi_nanti'],
};

/** Paling banyak bidang yang bisa dipilih di layar (server menerima sampai 5). */
export const MAKS_MINAT: Record<Exclude<VersiEksplorasi, 'f10'>, number> = { smp: 5, kelas10_11: 3 };

/** Nama rumpun berbeda dari data prodi (GET /konten/prodi), urut abjad. Nama prodi tidak dipakai. */
export function daftarRumpun(prodi: readonly { rumpun: string }[] | null | undefined): string[] {
  return [...new Set((prodi ?? []).map((p) => p.rumpun).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'));
}

/** Tambah/lepas satu bidang. Menambah saat sudah `maks` pilihan tidak mengubah apa pun. */
export function ubahPilihan(pilihan: readonly string[], rumpun: string, maks: number): string[] {
  if (pilihan.includes(rumpun)) return pilihan.filter((r) => r !== rumpun);
  return pilihan.length >= maks ? [...pilihan] : [...pilihan, rumpun];
}

/** Dua pilihan berisi bidang yang sama (urutan tidak penting). */
export function samaPilihan(a: readonly string[], b: readonly string[]): boolean {
  const x = [...a].sort();
  const y = [...b].sort();
  return x.length === y.length && x.every((r, i) => r === y[i]);
}

/** Boleh menekan Simpan: ada perubahan dan jumlahnya tidak melebihi batas jenjang. */
export function bolehSimpan(pilihan: readonly string[], tersimpan: readonly string[], maks: number): boolean {
  return pilihan.length <= maks && !samaPilihan(pilihan, tersimpan);
}

export type PenjelasanBidang = { belajar: string; pekerjaan: string };

/**
 * Penjelasan umum per rumpun yang sudah ada di data prodi. DRAF: deskripsi umum,
 * tanpa nama prodi, tanpa angka, tanpa gaji. Rumpun baru di data yang belum punya
 * penjelasan tetap tampil sebagai nama saja (lihat penjelasanBidang).
 */
export const PENJELASAN_BIDANG: Readonly<Record<string, PenjelasanBidang>> = {
  'Ekonomi & Bisnis': {
    belajar: 'Belajar tentang uang, usaha, dan cara sebuah organisasi berjalan.',
    pekerjaan: 'Contoh pekerjaan: mengurus keuangan, menjalankan usaha, atau membantu perusahaan merencanakan kegiatannya.',
  },
  Kesehatan: {
    belajar: 'Belajar tentang tubuh manusia, penyakit, dan cara menjaga kesehatan.',
    pekerjaan: 'Contoh pekerjaan: merawat orang sakit, membantu pemulihan, atau menjaga kesehatan masyarakat.',
  },
  'Sosial & Humaniora': {
    belajar: 'Belajar tentang manusia, masyarakat, bahasa, dan aturan dalam kehidupan bersama.',
    pekerjaan: 'Contoh pekerjaan: menyampaikan informasi, mendampingi masyarakat, atau membantu menyelesaikan urusan aturan.',
  },
  'Teknologi & Rekayasa': {
    belajar: 'Belajar tentang cara kerja alat, listrik, dan komputer, serta cara merancang sesuatu yang berguna.',
    pekerjaan: 'Contoh pekerjaan: merancang, membangun, atau merawat alat, bangunan, dan sistem komputer.',
  },
};

export function penjelasanBidang(rumpun: string): PenjelasanBidang | null {
  return Object.prototype.hasOwnProperty.call(PENJELASAN_BIDANG, rumpun) ? PENJELASAN_BIDANG[rumpun] : null;
}

/** Jalur masuk umum untuk kelas 10–11 — tanpa tanggal, tanpa angka. DRAF, belum dicek ke SNPMB. */
export const JALUR_MASUK: readonly { nama: string; penjelasan: string }[] = [
  {
    nama: 'SNBP',
    penjelasan: 'Seleksi Nasional Berdasarkan Prestasi. Dinilai dari nilai rapor dan prestasi, tanpa tes tertulis. Sekolah menentukan siapa yang bisa ikut.',
  },
  {
    nama: 'SNBT',
    penjelasan: 'Seleksi Nasional Berdasarkan Tes. Dinilai dari hasil tes tertulis berbasis komputer.',
  },
  {
    nama: 'Seleksi mandiri',
    penjelasan: 'Seleksi yang diadakan sendiri oleh tiap perguruan tinggi negeri. Caranya bisa berbeda di tiap kampus.',
  },
];

export const TEKS_EKSPLORASI = {
  smp: {
    pengantar: 'Pilih bidang yang menarik buatmu. Tidak ada pilihan yang salah, dan pilihanmu bisa diubah kapan saja.',
    tombol: 'Simpan minatku',
    penutup: 'Ini baru gambaran awal. Kamu masih punya waktu untuk menentukan.',
  },
  kelas10_11: {
    pengantar: 'Kenali cara masuk perguruan tinggi dan bidang yang ingin kamu dalami.',
    judulJalur: 'Jalur masuk perguruan tinggi',
    tombol: 'Simpan bidangku',
    prodiNanti: 'Daftar prodi dan syaratnya akan muncul setelah dicek ke sumber resmi.',
  },
  judulBidang: 'Bidang minat',
  petunjuk: (maks: number) => `Pilih sampai ${maks} bidang.`,
  tersimpan: 'Pilihanmu sudah tersimpan.',
  perluKebijakan: 'Terima kebijakan privasi dulu supaya pilihanmu bisa disimpan.',
  tautanKebijakan: 'Baca dan terima',
  gagal: 'Belum tersimpan. Coba lagi sebentar lagi.',
  kosong: 'Daftar bidang belum bisa dimuat. Coba lagi sebentar lagi.',
} as const;
