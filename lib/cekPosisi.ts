/**
 * Jalur Saya (v1.1, LANJUT_005; nama baru sejak LANJUT_074, rute tetap /cek-posisi) — tahap siswa dihitung dari data yang
 * app sudah tahu, rule-based, tanpa kuis. Logika murni dipisah dari
 * komponen, mengikuti pola lib/daftarPeriksa.ts.
 *
 * Bahasanya "suggest, don't dictate": semua kalimat menawarkan, tidak
 * menyuruh.
 */

import { formatTanggalRingkas, type Momen } from './linimasa';

export type Tahap = 'eksplorasi' | 'pemantapan' | 'persiapan' | 'menjelang';

/** Rute tujuan tombol "Langkah Berikutnya". */
export type Tujuan = '/pilih-mapel' | '/cerita-alumni' | '/daftar-periksa' | '/linimasa' | '/akun';

export type SinyalPosisi = {
  /** `prodi_impian` akun terisi. */
  adaProdi: boolean;
  /** Butir `mapel-tka` sudah dicentang (disimpan oleh Pilih Mapel). */
  mapelTkaSelesai: boolean;
  /** Progres Daftar Periksa; null kalau kelas/jalur belum dipilih. */
  progres: { selesai: number; total: number } | null;
  /**
   * Tenggat terdekat dari Linimasa terverifikasi (hasil `turunkanLinimasa`,
   * sama dengan Beranda). null kalau belum ada yang terverifikasi — kondisi
   * normal, bukan galat: kalimat fokus lain tetap tampil seperti biasa.
   */
  tenggat: Tenggat | null;
};

/** `tanggal` = tanggal mulai bila `momen` 'mulai', tanggal tutup bila 'selesai'. */
export type Tenggat = { judul: string; sisaHari: number; tanggal: string; momen: Momen };

export type Kebingungan = 'kampus' | 'mapel' | 'takut' | 'mulai';

export const KEBINGUNGAN: { id: Kebingungan; label: string }[] = [
  { id: 'kampus', label: 'Belum tahu mau kuliah di mana' },
  { id: 'mapel', label: 'Bingung milih mapel TKA' },
  { id: 'takut', label: 'Takut nggak keterima' },
  { id: 'mulai', label: 'Nggak tahu harus mulai dari mana' },
];

export type Langkah = { label: string; tujuan: Tujuan };

export type Posisi = {
  tahap: Tahap;
  nama: string;
  ringkas: string;
  fokus: string[];
  langkah: Langkah;
  /** Persen progres Daftar Periksa, null kalau belum bisa dihitung. */
  persen: number | null;
};

export const NAMA_TAHAP: Record<Tahap, string> = {
  eksplorasi: 'Eksplorasi',
  pemantapan: 'Pemantapan Awal',
  persiapan: 'Persiapan Aktif',
  menjelang: 'Menjelang Pendaftaran',
};

/** Ambang tahap, dalam persen butir Daftar Periksa yang selesai. */
export const AMBANG = { persiapan: 30, menjelang: 70 } as const;

export function persenProgres(progres: SinyalPosisi['progres']): number | null {
  if (!progres || progres.total === 0) return null;
  return Math.round((progres.selesai / progres.total) * 100);
}

/**
 * Urutan aturan:
 * 1. progres ≥ 70% → Menjelang Pendaftaran (apa pun isi prodi).
 * 2. prodi kosong → Eksplorasi.
 * 3. prodi terisi, progres ≥ 30% → Persiapan Aktif.
 * 4. prodi terisi, progres < 30% atau belum bisa dihitung → Pemantapan Awal.
 */
export function tentukanTahap(sinyal: SinyalPosisi): Tahap {
  const persen = persenProgres(sinyal.progres);
  if (persen !== null && persen >= AMBANG.menjelang) return 'menjelang';
  if (!sinyal.adaProdi) return 'eksplorasi';
  if (persen !== null && persen >= AMBANG.persiapan) return 'persiapan';
  return 'pemantapan';
}

export function hitungPosisi(sinyal: SinyalPosisi, kebingungan: Kebingungan | null = null): Posisi {
  const tahap = tentukanTahap(sinyal);
  const persen = persenProgres(sinyal.progres);
  const dasar = ISI[tahap](sinyal);
  const pesan = kebingungan ? PESAN_KEBINGUNGAN[kebingungan] : null;
  const tenggat = sinyal.tenggat ? kalimatTenggat(sinyal.tenggat) : null;
  // Jawaban kebingungan lalu tenggat hanya menambah kalimat di depan (maks.
  // 3 butir fokus); tahap dan tombol tetap dari data.
  const tambahan = [pesan, tenggat].filter((k): k is string => k !== null);
  return {
    tahap,
    nama: NAMA_TAHAP[tahap],
    persen,
    ...dasar,
    fokus: tambahan.length ? [...tambahan, ...dasar.fokus].slice(0, 3) : dasar.fokus,
  };
}

/**
 * Salinan-teks §4.1: angka hari biasa + tanggal, bukan hitungan mundur.
 * Belum dimulai → menuju tanggal mulai; sudah berjalan → menuju tutup.
 */
export function kalimatTenggat({ judul, sisaHari, tanggal, momen }: Tenggat): string {
  const teksTanggal = formatTanggalRingkas(tanggal);
  const kapan = teksTanggal ? ` (${teksTanggal})` : '';
  const kata = momen === 'mulai' ? 'dimulai' : 'ditutup';
  return sisaHari === 0
    ? `${judul} ${kata} hari ini${kapan}.`
    : `${judul} tinggal ${sisaHari} hari lagi sebelum ${kata}${kapan}.`;
}

type IsiTahap = Pick<Posisi, 'ringkas' | 'fokus' | 'langkah'>;

const ISI: Record<Tahap, (s: SinyalPosisi) => IsiTahap> = {
  eksplorasi: (s) => ({
    ringkas: 'Sepertinya kamu masih di tahap mengenali pilihan. Wajar banget, belum perlu buru-buru mengunci keputusan.',
    fokus: [
      'Coba lihat bidang apa yang bikin kamu penasaran.',
      s.mapelTkaSelesai
        ? 'Mapel TKA sudah kamu pilih — cerita alumni bisa kasih gambaran jurusan yang nyambung.'
        : 'Melihat mapel TKA per prodi bisa jadi cara ringan untuk mulai.',
    ],
    langkah: s.mapelTkaSelesai
      ? { label: 'Baca Cerita Alumni', tujuan: '/cerita-alumni' }
      : { label: 'Lihat Pilih Mapel', tujuan: '/pilih-mapel' },
  }),
  pemantapan: (s) => ({
    ringkas: 'Kamu sudah punya target prodi. Ini bisa jadi saat yang pas untuk mulai mengenal jalurnya.',
    fokus: [
      'Mulai riset PTN dan jalur masuk untuk prodi incaranmu.',
      s.progres
        ? 'Mencentang beberapa langkah awal di Daftar Periksa bisa bikin semuanya terasa lebih jelas.'
        : 'Memilih kelas dan jalur di Daftar Periksa bisa bantu melihat langkah yang relevan buat kamu.',
      ...(s.mapelTkaSelesai ? [] : ['Kalau belum, mapel pilihan TKA juga bisa mulai dilirik.']),
    ],
    langkah: { label: 'Buka Daftar Periksa', tujuan: '/daftar-periksa' },
  }),
  persiapan: () => ({
    ringkas: 'Persiapanmu sudah jalan. Tinggal menjaga ritmenya.',
    fokus: [
      'Lanjutkan langkah yang tersisa di Daftar Periksa.',
      'Cek linimasa supaya tenggat penting nggak terlewat.',
    ],
    langkah: { label: 'Cek Linimasa', tujuan: '/linimasa' },
  }),
  menjelang: (s) => ({
    ringkas: 'Kamu sudah dekat dengan masa pendaftaran. Tinggal memastikan hal-hal terakhir.',
    fokus: [
      'Pastikan dokumen dan jalur yang kamu pilih sudah siap.',
      'Sisa langkah di Daftar Periksa bisa jadi pegangan terakhir.',
      ...(s.adaProdi ? [] : ['Target prodi belum tercatat di Data Akun — mungkin bisa diisi kalau sudah ada.']),
    ],
    langkah: { label: 'Lihat sisa Daftar Periksa', tujuan: '/daftar-periksa' },
  }),
};

const PESAN_KEBINGUNGAN: Record<Kebingungan, string> = {
  kampus: 'Belum tahu mau kuliah di mana itu hal yang umum — melihat beberapa pilihan dulu sudah langkah yang bagus.',
  mapel: 'Soal mapel TKA, melihat mapel yang dipakai prodi incaranmu bisa bantu mempersempit pilihan.',
  takut: 'Rasa takut nggak keterima itu wajar. Persiapan kecil yang rutin biasanya bikin lebih tenang.',
  mulai: 'Nggak apa-apa belum tahu mulai dari mana. Satu langkah kecil di bawah ini bisa jadi awal.',
};
