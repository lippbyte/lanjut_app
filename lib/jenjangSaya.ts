import type { Href } from 'expo-router';

import type { NamaIkon } from '../components/ui/Ikon';
import { kelompokJenjang, type Kelas, type KelompokJenjang } from './jenjang';

/**
 * Isi layar Jenjang Saya per kelas akun (LANJUT_037, LANJUT_069). Modul murni
 * tanpa React supaya tes server bisa menjalankannya langsung
 * (server/tests/muat-ts-app.js).
 *
 * TEKS DRAF, belum disetujui Khalifa — salinan-teks-lanjut.md §4.2:
 *   - kelas 7–9 dan 10–11: draf LANJUT_069 (docs/DRAF-Konten-Jenjang-Saya-SMP-dan-10-11.md, A1–A5 dan B1–B6)
 *   - kelas 12 dan tanpa kelas: tetap teks LANJUT_037, tidak diubah
 */

export type PintuJenjang = { id: string; ikon: NamaIkon; judul: string; keterangan: string; href: Href };
export type PembukaJenjang = { judul: string; teks: string; labelTombol: string; href: Href };
export type ButirCatatan = { nama: string; keterangan: string };
export type CatatanJenjang = { judul: string; isi: string; butir: ButirCatatan[]; catatanCek: string | null };

export type IsiJenjangSaya = {
  kelompok: KelompokJenjang | null;
  pengantar: string;
  pembuka: PembukaJenjang | null;
  pintu: PintuJenjang[];
  catatan: CatatanJenjang | null;
};

const PENGANTAR: Record<KelompokJenjang, (kelas: string) => string> = {
  smp: (k) => `Kelas ${k} SMP: waktunya kenalan sama minat dan bakatmu.`,
  kelas10_11: (k) => `Kelas ${k}: mulai kenalan sama jurusan yang kamu incar.`,
  kelas12: () => 'Kelas 12: yang perlu kamu siapkan sebelum daftar kuliah.',
};
// LANJUT_074: halaman akun bernama "Data Akun" (dulu disebut Jalur Saya).
const PENGANTAR_TANPA_KELAS = 'Isi kelasmu di Data Akun supaya isi halaman ini pas buat kamu.';

// --- Kelas 7–9 (draf LANJUT_069 A1–A5) ---------------------------------------

const PEMBUKA_SMP: PembukaJenjang = {
  judul: 'Kamu lagi di tahap mana?',
  teks: 'Sebelum memilih apa pun, kenali dulu dirimu. LANJUT bisa membantu kamu mulai dari hal yang paling dekat: minat dan cara belajarmu.',
  labelTombol: 'Mulai eksplorasi',
  // LANJUT_071 (keputusan PM): ke Gaya Belajar, bukan Eksplorasi Tujuan — Gaya
  // Belajar tidak bergantung pada profil prodi yang belum terverifikasi.
  // Eksplorasi Tujuan tetap terbuka dari pintu A2 di bawah.
  href: '/gaya-belajar',
};

const PINTU_SMP: PintuJenjang[] = [
  {
    id: 'eksplorasi-tujuan',
    ikon: 'posisi',
    judul: 'Eksplorasi Tujuan',
    keterangan: 'Coba cari tahu apa yang kamu suka, lalu lihat bidang apa saja yang bisa dipelajari dari situ.',
    href: '/eksplorasi-tujuan',
  },
  {
    id: 'gaya-belajar',
    ikon: 'info',
    judul: 'Gaya Belajar',
    keterangan: 'Setiap orang belajar dengan cara yang berbeda. Kenali caramu supaya belajar terasa lebih mudah.',
    href: '/gaya-belajar',
  },
  // Gerbang persetujuan orang tua/wali tetap di layar /ngobrol dan di server (403 AI_BELUM_DIIZINKAN).
  {
    id: 'ngobrol',
    ikon: 'obrolan',
    judul: 'Ngobrol Bareng LANJUT',
    keterangan: 'Tanya apa saja tentang minat, cara belajar, atau rencana sekolahmu. Fitur ini butuh persetujuan orang tua/wali dulu.',
    href: '/ngobrol',
  },
];

const CATATAN_SMP: CatatanJenjang = {
  judul: 'SMA, SMK, atau MA?',
  isi: 'Ketiganya adalah jenjang setelah SMP, dengan fokus yang berbeda.',
  butir: [
    { nama: 'SMA', keterangan: '(Sekolah Menengah Atas): pendidikan umum dengan banyak pilihan mata pelajaran.' },
    { nama: 'SMK', keterangan: '(Sekolah Menengah Kejuruan): pendidikan umum sekaligus keterampilan untuk bidang kerja tertentu.' },
    { nama: 'MA', keterangan: '(Madrasah Aliyah): pendidikan umum dengan muatan keagamaan yang lebih kuat.' },
  ],
  // Tambahan-069 (keputusan PM no. 4): deskripsi jenjang belum dicocokkan ke sumber resmi.
  catatanCek: 'Keterangan ini sedang kami cek ulang.',
};

// --- Kelas 10–11 (draf LANJUT_069 B1–B6) -------------------------------------

const PEMBUKA_10_11: PembukaJenjang = {
  judul: 'Yuk, siapkan langkahmu',
  teks: 'Kelas 10 dan 11 adalah waktu yang tepat untuk mulai memilih mata pelajaran dan memahami jalur masuk perguruan tinggi.',
  labelTombol: 'Pilih mapel',
  href: '/pilih-mapel',
};

// Tambahan-069 no. 1: Gaya Belajar dan kartu "Belum perlu mikirin jadwal daftar" tidak ada di draf B.
const PINTU_10_11: PintuJenjang[] = [
  {
    id: 'pilih-mapel',
    ikon: 'mapel',
    judul: 'Pilih Mapel',
    keterangan: 'Pilihan mata pelajaranmu bisa membuka beberapa bidang studi. Coba lihat mana yang paling dekat dengan minatmu.',
    href: '/pilih-mapel',
  },
  // Label "Perkiraan" tetap hanya di layar Eksplorasi Tujuan (Tambahan-069 no. 3).
  {
    id: 'eksplorasi-tujuan',
    ikon: 'posisi',
    judul: 'Eksplorasi Tujuan',
    keterangan: 'Lihat gambaran program studi dan profesi yang berkaitan dengan minatmu. Informasi ini masih dalam tahap pengecekan.',
    href: '/eksplorasi-tujuan',
  },
  {
    id: 'arsip',
    ikon: 'mapel',
    judul: 'Arsip Belajar',
    keterangan: 'Simpan catatan dan soal latihanmu per mata pelajaran.',
    href: '/arsip',
  },
  {
    id: 'level-in',
    ikon: 'ok',
    judul: 'Level-In',
    keterangan: 'Lihat seberapa kuat kamu di tiap mata pelajaran, dari latihanmu.',
    href: '/level-in',
  },
  {
    id: 'daftar-periksa',
    ikon: 'checklist',
    judul: 'Daftar Periksa',
    keterangan: 'Catat langkah-langkahmu supaya tidak ada yang terlewat.',
    href: '/daftar-periksa',
  },
];

// --- Kelas 12 dan tanpa kelas (teks LANJUT_037, tidak diubah) ----------------

const PINTU_037_NGOBROL: PintuJenjang = {
  id: 'ngobrol',
  ikon: 'obrolan',
  judul: 'Ngobrol Bareng LANJUT',
  keterangan: 'Cerita soal yang kamu suka, nanti dibantu cari arahnya.',
  href: '/ngobrol',
};
const PINTU_037_EKSPLORASI: PintuJenjang = {
  id: 'eksplorasi-tujuan',
  ikon: 'posisi',
  judul: 'Eksplorasi Tujuan',
  keterangan: 'Intip prodi kuliah: belajar apa dan lulusannya kerja di mana.',
  href: '/eksplorasi-tujuan',
};
const PINTU_037_MAPEL: PintuJenjang = {
  id: 'pilih-mapel',
  ikon: 'mapel',
  judul: 'Pilih Mapel',
  keterangan: 'Lihat mapel yang mendukung jurusan incaranmu, dan mana yang ada di sekolahmu.',
  href: '/pilih-mapel',
};
const PINTU_KELAS_12: PintuJenjang[] = [
  // LANJUT_074: judul pintu /cek-posisi menjadi "Jalur Saya"; keterangan tetap.
  { id: 'cek-posisi', ikon: 'posisi', judul: 'Jalur Saya', keterangan: 'Lihat kamu lagi di tahap mana dan langkah berikutnya.', href: '/cek-posisi' },
  { id: 'daftar-periksa', ikon: 'checklist', judul: 'Daftar Periksa', keterangan: 'Satu per satu, tidak perlu sekaligus.', href: '/daftar-periksa' },
];
const PINTU_TANPA_KELAS: PintuJenjang[] = [PINTU_037_MAPEL, PINTU_037_EKSPLORASI, PINTU_037_NGOBROL];

const ISI: Record<KelompokJenjang, { pembuka: PembukaJenjang | null; pintu: PintuJenjang[]; catatan: CatatanJenjang | null }> = {
  smp: { pembuka: PEMBUKA_SMP, pintu: PINTU_SMP, catatan: CATATAN_SMP },
  kelas10_11: { pembuka: PEMBUKA_10_11, pintu: PINTU_10_11, catatan: null },
  kelas12: { pembuka: null, pintu: PINTU_KELAS_12, catatan: null },
};

export function isiJenjangSaya(kelas: Kelas | null | undefined): IsiJenjangSaya {
  const kelompok = kelompokJenjang(kelas);
  if (!kelompok || !kelas) {
    return { kelompok: null, pengantar: PENGANTAR_TANPA_KELAS, pembuka: null, pintu: PINTU_TANPA_KELAS, catatan: null };
  }
  return { kelompok, pengantar: PENGANTAR[kelompok](kelas), ...ISI[kelompok] };
}

/**
 * Pengganti pesan "Bagian ini untuk kelas 12" di Daftar Periksa
 * (Tambahan-069, keputusan PM no. 2, DRAF): kelas 10–11 melihat kalimat netral
 * ini dan butir pribadinya. LANJUT_076b (keputusan PM no. 2): SMP juga — halaman
 * Daftar Periksa SMP tidak lagi memuat kalimat tentang kelas 12; kalimat yang
 * sama dipakai untuk SMP (pilihan percakapan, belum disetujui PM). Kelas 12 dan
 * akun tanpa kelas → null (kelas 12 punya Daftar Periksa sendiri; tanpa kelas
 * tetap memakai BukanKelas12 "Isi kelasmu dulu").
 */
export function teksDaftarPeriksaBukanKelas12(kelas: Kelas | null | undefined): string | null {
  const kelompok = kelompokJenjang(kelas);
  return kelompok === 'smp' || kelompok === 'kelas10_11' ? 'Catat langkah-langkahmu supaya tidak ada yang terlewat.' : null;
}

/**
 * Pintu "Jalur Saya" (/cek-posisi) di Data Akun. LANJUT_077b §B: TIDAK untuk SMP
 * (kelas 7–9) — layar itu berisi tahap SNBP/SNBT/TKA, dan untuk kelas selain 12
 * hanya placeholder "Bagian ini untuk kelas 12". Sama dengan grid Beranda SMP
 * yang sudah menyembunyikan Jalur Saya sejak LANJUT_064. Kelas 10–12 dan akun
 * tanpa kelas tidak berubah.
 */
export function tampilPintuJalurSaya(kelas: Kelas | null | undefined): boolean {
  return kelompokJenjang(kelas) !== 'smp';
}

/**
 * Kalimat di kartu kemajuan Data Akun untuk akun bukan kelas 12 (kelas 12
 * melihat angka X dari Y). LANJUT_077 §B: SMP tidak lagi membaca kalimat tentang
 * kelas 12 — TEKS DRAF (salinan §4.11). Kelas 10–11 dan akun tanpa kelas tetap
 * memakai kalimat lama (tidak berubah).
 */
export function teksKemajuanDataAkun(kelas: Kelas | null | undefined): string {
  return kelompokJenjang(kelas) === 'smp'
    ? 'Langkah yang kamu catat ada di Daftar Periksa.'
    : 'Kemajuan persiapan SNBP, SNBT, dan TKA tampil di sini saat kamu kelas 12.';
}
