/**
 * Logika murni dan teks draf layar Langkah Saya v2 (`/langkah-saya`, LANJUT_032).
 * Modul murni (tanpa React/Expo) agar progres, mutasi centang/batal-centang, penanganan
 * butir pribadi, dan batas maksimal 40 kata teks tetap dapat diuji dari server/tests.
 *
 * TEKS DRAF — docs/draf-teks-jejak-waktu-v2.md (bagian Langkah Saya), belum disetujui Khalifa.
 * Perilaku data identik dengan v1 (`DaftarPeriksaScreen` + `PersiapanEvent`):
 * - Centang/batal-centang butir umum tetap memakai `/kemajuan/:butirId` (PUT/DELETE).
 * - Butir pribadi tetap memakai `/butir-pribadi` (centang/batal-centang PUT/DELETE `/selesai`, hapus DELETE).
 * - Siswa SMP (kelas 7–9) tetap dapat menambah, mengubah, dan menghapus `event_sekolah` saat saklar server aktif.
 */
import { hitungKata } from './arahSaya';
import type { Progres, StatusProgres } from './daftarPeriksa';
import { untukPersiapanEvent } from './eventSekolah';
import { untukKelas12, type Kelas } from './jenjang';

/** Batas maksimal kata teks tetap di layar Langkah Saya (di luar data milik siswa/konten). */
export const BATAS_KATA_LANGKAH_SAYA = 40;

export const OPSI_KELAS_LANGKAH = ['10', '11', '12'] as const;
export const OPSI_JALUR_SELEKSI_LANGKAH = ['TKA', 'SNBP', 'SNBT'] as const;

// TEKS DRAF — belum disetujui Khalifa (docs/draf-teks-jejak-waktu-v2.md).
export const TEKS_LANGKAH_SAYA = {
  judul: 'Langkah Saya',
  ringkasan: 'Satu per satu, sesuai ritmemu.',

  saringKelasLabel: 'Kelas',
  saringJalurLabel: 'Jalur',
  awalanKelas: 'Kelas',
  pilihJalurJudul: 'Pilih jalur seleksimu dulu',
  pilihJalurTeks: 'Supaya daftar langkah sesuai kebutuhanmu.',

  progresLabelAkses: 'Progres langkah selesai',
  progresDari: 'dari',
  progresSelesai: 'selesai',
  kalimatKosong: 'Mulai dari satu langkah yang paling ringan.',
  kalimatBerjalan: 'Pelan-pelan, langkahmu terus bertambah.',
  kalimatSemuaSelesai: 'Semua langkah di daftar ini sudah siap. Istirahat sejenak juga boleh.',
  lencanaSelesai: 'Selesai',

  hapus: 'Hapus',
  awalanHapusButir: 'Hapus langkah:',
  konfirmasiHapusButir: 'Hapus langkah pribadi ini?',
  yaHapus: 'Ya, hapus',
  batal: 'Batal',
  galatSimpan: 'Perubahan belum tersimpan. Coba lagi.',

  catatanSnpmbRingkas: 'Perlu dicek ke laman resmi SNPMB · belum diverifikasi.',
  pintuTambahPribadi: 'Tambah dari Pilih Mapel',
  pintuEksplorasi: 'Eksplorasi Kampus',

  kosongJudul: 'Belum ada langkah tersimpan',
  kosongTeks: 'Simpan langkah saat kamu siap.',
  kosongTombolMapel: 'Pilih Mapel',
  kosongTombolTambahJadwal: 'Tambah jadwal',

  jadwalSmpJudul: 'Jadwal sekolah',
  tambahJadwal: 'Tambah jadwal',

  memuatLabel: 'Memuat Langkah Saya',
  galatJudul: 'Belum bisa memuat langkah',
  galatPesan: 'Periksa sambunganmu, lalu coba lagi.',
  cobaLagi: 'Coba lagi',
} as const;

/** Ringkasan angka progres tertulis: mis. `"3 dari 8 selesai"`. */
export function teksRingkasanProgres(progres: Pick<Progres, 'selesai' | 'total'>): string {
  return `${progres.selesai} ${TEKS_LANGKAH_SAYA.progresDari} ${progres.total} ${TEKS_LANGKAH_SAYA.progresSelesai}`;
}

/** Persentase batang progres (0..100), dibatasi aman agar tidak meluber. */
export function persenProgres(progres: Pick<Progres, 'selesai' | 'total'>): number {
  if (progres.total <= 0) return 0;
  const mentah = Math.round((progres.selesai / progres.total) * 100);
  return Math.max(0, Math.min(100, mentah));
}

/** Satu kalimat hangat sesuai keadaan progres (`kosong`, `berjalan`, `selesai`). */
export function kalimatProgresLangkah(status: StatusProgres): string {
  if (status === 'selesai') return TEKS_LANGKAH_SAYA.kalimatSemuaSelesai;
  if (status === 'berjalan') return TEKS_LANGKAH_SAYA.kalimatBerjalan;
  return TEKS_LANGKAH_SAYA.kalimatKosong;
}

export type RencanaMutasiButir =
  | { sasaran: 'butir_pribadi'; id: string; selesai: boolean }
  | { sasaran: 'kemajuan'; butirId: string; selesai: boolean };

/**
 * Menentukan target mutasi API saat kotak centang diketuk — identik dengan `useAksiButir` di v1:
 * - Butir pribadi → `PUT/DELETE /butir-pribadi/:id/selesai`
 * - Butir umum → `PUT/DELETE /kemajuan/:butirId`
 */
export function rencanakanAlihButir(p: {
  butirId: string;
  pribadiIds: ReadonlySet<string>;
  selesaiIds: ReadonlySet<string>;
}): RencanaMutasiButir {
  const selesaiBerikut = !p.selesaiIds.has(p.butirId);
  if (p.pribadiIds.has(p.butirId)) {
    return { sasaran: 'butir_pribadi', id: p.butirId, selesai: selesaiBerikut };
  }
  return { sasaran: 'kemajuan', butirId: p.butirId, selesai: selesaiBerikut };
}

/** Label pembaca layar untuk tombol hapus butir pribadi. */
export function labelHapusButirPribadi(judul: string): string {
  return `${TEKS_LANGKAH_SAYA.awalanHapusButir} ${judul}`;
}

export type AksiKosongLangkahSaya =
  | { jenis: 'tambah_jadwal'; label: string }
  | { jenis: 'rute'; label: string; href: '/pilih-mapel' };

/** Aksi tunggal pada keadaan kosong Langkah Saya sesuai jenjang & ketersediaan event SMP. */
export function aksiKosongLangkahSaya(p: {
  kelas: Kelas | null | undefined;
  bisaEventSmp: boolean;
}): AksiKosongLangkahSaya {
  if (untukPersiapanEvent(p.kelas) && p.bisaEventSmp) {
    return { jenis: 'tambah_jadwal', label: TEKS_LANGKAH_SAYA.kosongTombolTambahJadwal };
  }
  return { jenis: 'rute', label: TEKS_LANGKAH_SAYA.kosongTombolMapel, href: '/pilih-mapel' };
}

/** Menentukan mode tampilan utama Langkah Saya menurut kelas akun. */
export function modeLangkahSaya(kelas: Kelas | null | undefined): 'kelas12' | 'smp' | 'sma1011' {
  if (untukKelas12(kelas)) return 'kelas12';
  if (untukPersiapanEvent(kelas)) return 'smp';
  return 'sma1011';
}

/** Daftar teks tetap di layar Langkah Saya untuk verifikasi batas maksimal 40 kata. */
export function teksTetapLangkahSaya(p: {
  keadaan: 'kelas12_isi' | 'kelas12_pilih_jalur' | 'pribadi_isi' | 'kosong' | 'galat';
  statusProgres?: StatusProgres;
  adaCatatanSnpmb?: boolean;
  bisaEventSmp?: boolean;
  kelas?: Kelas | null;
}): string[] {
  const daftar: string[] = [TEKS_LANGKAH_SAYA.ringkasan];
  if (p.keadaan === 'galat') {
    daftar.push(TEKS_LANGKAH_SAYA.galatJudul, TEKS_LANGKAH_SAYA.galatPesan, TEKS_LANGKAH_SAYA.cobaLagi);
    return daftar;
  }
  if (p.keadaan === 'kosong') {
    const aksi = aksiKosongLangkahSaya({ kelas: p.kelas, bisaEventSmp: Boolean(p.bisaEventSmp) });
    daftar.push(TEKS_LANGKAH_SAYA.kosongJudul, TEKS_LANGKAH_SAYA.kosongTeks, aksi.label);
    return daftar;
  }
  if (p.keadaan === 'kelas12_pilih_jalur') {
    daftar.push(
      TEKS_LANGKAH_SAYA.saringKelasLabel,
      TEKS_LANGKAH_SAYA.saringJalurLabel,
      TEKS_LANGKAH_SAYA.pilihJalurJudul,
      TEKS_LANGKAH_SAYA.pilihJalurTeks
    );
    return daftar;
  }
  if (p.keadaan === 'kelas12_isi') {
    daftar.push(TEKS_LANGKAH_SAYA.saringKelasLabel, TEKS_LANGKAH_SAYA.saringJalurLabel);
  }
  daftar.push(
    TEKS_LANGKAH_SAYA.progresDari,
    TEKS_LANGKAH_SAYA.progresSelesai,
    kalimatProgresLangkah(p.statusProgres ?? 'berjalan'),
    TEKS_LANGKAH_SAYA.pintuTambahPribadi
  );
  if (p.adaCatatanSnpmb) {
    daftar.push(TEKS_LANGKAH_SAYA.catatanSnpmbRingkas);
  }
  return daftar;
}

export { hitungKata };
