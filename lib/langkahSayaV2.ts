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
import type { Prodi, SimpanButirPribadi } from '../api/types';
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

  // LANJUT_042 (TEKS DRAF — Opsi A: tambah langkah riset prodi memakai kontrak v1 POST /butir-pribadi).
  tambahRisetProdi: 'Tambah langkah riset prodi',
  risetJudulPilih: 'Pilih prodi',
  risetRingkasPilih: 'Pilih prodi yang ingin kamu cari tahu.',
  risetCariLabel: 'Cari prodi',
  risetCariPetunjuk: 'Ketik nama prodi atau bidang.',
  risetSudahAda: 'Sudah ada',
  risetKosongJudul: 'Prodi belum tersedia',
  risetKosongTeks: 'Coba lagi nanti.',
  risetCariKosongJudul: 'Prodi tidak ditemukan',
  risetCariKosongTeks: 'Coba kata kunci lain.',
  risetMemuatLabel: 'Memuat daftar prodi',
  risetGalatMuatJudul: 'Daftar prodi belum bisa dimuat',
  risetGalatMuatPesan: 'Periksa sambunganmu, lalu coba lagi.',
  risetKonfirmasiJudul: 'Tambah ke Langkah Saya?',
  risetKonfirmasiTeks: 'Langkah riset ini akan masuk ke daftarmu.',
  risetSimpan: 'Simpan langkah',
  risetGantiProdi: 'Pilih prodi lain',
  risetGalatBatasLaju: 'Terlalu banyak percobaan. Tunggu sebentar, lalu coba lagi.',
  risetGalatSimpan: 'Langkah belum tersimpan. Periksa sambunganmu, lalu coba lagi.',

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
  | { jenis: 'rute'; label: string; href: '/pilih-mapel' }
  | null;

/** Aksi tunggal pada keadaan kosong Langkah Saya sesuai jenjang, event SMP, dan saklar Alat belajar. */
export function aksiKosongLangkahSaya(p: {
  kelas: Kelas | null | undefined;
  bisaEventSmp: boolean;
  alatBelajar?: boolean;
}): AksiKosongLangkahSaya {
  if (untukPersiapanEvent(p.kelas) && p.bisaEventSmp) {
    return { jenis: 'tambah_jadwal', label: TEKS_LANGKAH_SAYA.kosongTombolTambahJadwal };
  }
  if (!p.alatBelajar) return null;
  return { jenis: 'rute', label: TEKS_LANGKAH_SAYA.kosongTombolMapel, href: '/pilih-mapel' };
}

/** Menentukan mode tampilan utama Langkah Saya menurut kelas akun. */
export function modeLangkahSaya(kelas: Kelas | null | undefined): 'kelas12' | 'smp' | 'sma1011' {
  if (untukKelas12(kelas)) return 'kelas12';
  if (untukPersiapanEvent(kelas)) return 'smp';
  return 'sma1011';
}

/**
 * Tombol lokal "Tambah langkah riset prodi" (LANJUT_042, opsi A):
 * tampil untuk SMA/SMK/MA kelas 10, 11, dan 12; TIDAK tampil untuk SMP (kelas 7–9).
 */
export function bolehTambahRisetProdi(kelas: Kelas | null | undefined): boolean {
  return kelas === '10' || kelas === '11' || kelas === '12';
}

export type AksiTambahRisetProdi = { jenis: 'riset_prodi'; label: string } | null;

export function aksiTambahRisetProdi(kelas: Kelas | null | undefined): AksiTambahRisetProdi {
  if (!bolehTambahRisetProdi(kelas)) return null;
  return { jenis: 'riset_prodi', label: TEKS_LANGKAH_SAYA.tambahRisetProdi };
}

/**
 * Menyusun payload `POST /butir-pribadi` yang identik persis dengan v1 (`EksplorasiTujuanScreen.tsx:243`).
 * Tanpa jenis baru dan tanpa field tambahan (`prodi_id` 1..64 karakter sesuai `butir-pribadi.skema.js`).
 */
export function bentukKirimanRisetProdi(prodiId: string | null | undefined): SimpanButirPribadi | null {
  if (typeof prodiId !== 'string') return null;
  const bersih = prodiId.trim();
  if (!bersih || bersih.length > 64) return null;
  return { jenis: 'riset_kampus', prodi_id: bersih };
}

/** Menyaring daftar prodi menurut kata kunci pada nama prodi atau rumpun (case-insensitive). */
export function saringDaftarProdi<T extends Pick<Prodi, 'id' | 'nama' | 'rumpun'>>(
  daftar: readonly T[],
  kataKunci: string
): T[] {
  const q = kataKunci.trim().toLowerCase();
  if (!q) return [...daftar];
  return daftar.filter((p) => p.nama.toLowerCase().includes(q) || p.rumpun.toLowerCase().includes(q));
}

/** Mengelompokkan prodi per rumpun sambil menjaga urutan data dari server (sama seperti v1). */
export function kelompokkanProdiPerRumpun<T extends Pick<Prodi, 'id' | 'nama' | 'rumpun'>>(
  daftar: readonly T[]
): { rumpun: string; anggota: T[] }[] {
  const peta = new Map<string, T[]>();
  for (const p of daftar) {
    const grup = peta.get(p.rumpun);
    if (grup) grup.push(p);
    else peta.set(p.rumpun, [p]);
  }
  return [...peta.entries()].map(([rumpun, anggota]) => ({ rumpun, anggota }));
}

/** Memetakan galat simpan butir pribadi (jaringan atau batas laju 429) ke kalimat ramah. */
export function pesanGalatRisetProdi(galat?: { status?: number; kode?: string } | null): string {
  if (galat?.status === 429 || galat?.kode === 'TERLALU_BANYAK_PERMINTAAN') {
    return TEKS_LANGKAH_SAYA.risetGalatBatasLaju;
  }
  return TEKS_LANGKAH_SAYA.risetGalatSimpan;
}

/** Daftar teks tetap di layar Langkah Saya untuk verifikasi batas maksimal 40 kata. */
export function teksTetapLangkahSaya(p: {
  keadaan:
    | 'kelas12_isi'
    | 'kelas12_pilih_jalur'
    | 'pribadi_isi'
    | 'kosong'
    | 'galat'
    | 'riset_pilih'
    | 'riset_kosong'
    | 'riset_cari_kosong'
    | 'riset_galat'
    | 'riset_konfirmasi';
  statusProgres?: StatusProgres;
  adaCatatanSnpmb?: boolean;
  bisaEventSmp?: boolean;
  kelas?: Kelas | null;
  alatBelajar?: boolean;
  adaGalatBatasLaju?: boolean;
}): string[] {
  if (p.keadaan === 'riset_pilih') {
    return [
      TEKS_LANGKAH_SAYA.risetJudulPilih,
      TEKS_LANGKAH_SAYA.batal,
      TEKS_LANGKAH_SAYA.risetRingkasPilih,
      TEKS_LANGKAH_SAYA.risetCariLabel,
      TEKS_LANGKAH_SAYA.risetCariPetunjuk,
      TEKS_LANGKAH_SAYA.risetSudahAda,
    ];
  }
  if (p.keadaan === 'riset_kosong') {
    return [
      TEKS_LANGKAH_SAYA.risetJudulPilih,
      TEKS_LANGKAH_SAYA.batal,
      TEKS_LANGKAH_SAYA.risetKosongJudul,
      TEKS_LANGKAH_SAYA.risetKosongTeks,
    ];
  }
  if (p.keadaan === 'riset_cari_kosong') {
    return [
      TEKS_LANGKAH_SAYA.risetJudulPilih,
      TEKS_LANGKAH_SAYA.batal,
      TEKS_LANGKAH_SAYA.risetCariLabel,
      TEKS_LANGKAH_SAYA.risetCariPetunjuk,
      TEKS_LANGKAH_SAYA.risetCariKosongJudul,
      TEKS_LANGKAH_SAYA.risetCariKosongTeks,
    ];
  }
  if (p.keadaan === 'riset_galat') {
    return [
      TEKS_LANGKAH_SAYA.risetJudulPilih,
      TEKS_LANGKAH_SAYA.batal,
      TEKS_LANGKAH_SAYA.risetGalatMuatJudul,
      TEKS_LANGKAH_SAYA.risetGalatMuatPesan,
      TEKS_LANGKAH_SAYA.cobaLagi,
    ];
  }
  if (p.keadaan === 'riset_konfirmasi') {
    return [
      TEKS_LANGKAH_SAYA.risetKonfirmasiJudul,
      TEKS_LANGKAH_SAYA.batal,
      TEKS_LANGKAH_SAYA.risetKonfirmasiTeks,
      p.adaGalatBatasLaju ? TEKS_LANGKAH_SAYA.risetGalatBatasLaju : TEKS_LANGKAH_SAYA.risetGalatSimpan,
      TEKS_LANGKAH_SAYA.risetSimpan,
      TEKS_LANGKAH_SAYA.risetGantiProdi,
    ];
  }

  const daftar: string[] = [TEKS_LANGKAH_SAYA.ringkasan];
  if (p.keadaan === 'galat') {
    daftar.push(TEKS_LANGKAH_SAYA.galatJudul, TEKS_LANGKAH_SAYA.galatPesan, TEKS_LANGKAH_SAYA.cobaLagi);
    return daftar;
  }
  if (p.keadaan === 'kosong') {
    const aksi = aksiKosongLangkahSaya({
      kelas: p.kelas,
      bisaEventSmp: Boolean(p.bisaEventSmp),
      alatBelajar: p.alatBelajar,
    });
    const aksiRiset = aksiTambahRisetProdi(p.kelas);
    daftar.push(TEKS_LANGKAH_SAYA.kosongJudul, TEKS_LANGKAH_SAYA.kosongTeks);
    if (aksi) daftar.push(aksi.label);
    else if (aksiRiset) daftar.push(aksiRiset.label);
    return daftar;
  }
  if (p.keadaan === 'kelas12_pilih_jalur') {
    daftar.push(
      TEKS_LANGKAH_SAYA.saringKelasLabel,
      TEKS_LANGKAH_SAYA.saringJalurLabel,
      TEKS_LANGKAH_SAYA.pilihJalurJudul,
      TEKS_LANGKAH_SAYA.pilihJalurTeks
    );
    if (bolehTambahRisetProdi(p.kelas)) daftar.push(TEKS_LANGKAH_SAYA.tambahRisetProdi);
    return daftar;
  }
  if (p.keadaan === 'kelas12_isi') {
    daftar.push(TEKS_LANGKAH_SAYA.saringKelasLabel, TEKS_LANGKAH_SAYA.saringJalurLabel);
  }
  daftar.push(
    TEKS_LANGKAH_SAYA.progresDari,
    TEKS_LANGKAH_SAYA.progresSelesai,
    kalimatProgresLangkah(p.statusProgres ?? 'berjalan')
  );
  if (bolehTambahRisetProdi(p.kelas)) {
    daftar.push(TEKS_LANGKAH_SAYA.tambahRisetProdi);
  }
  if (p.alatBelajar) {
    daftar.push(TEKS_LANGKAH_SAYA.pintuTambahPribadi);
  }
  if (p.adaCatatanSnpmb) {
    daftar.push(TEKS_LANGKAH_SAYA.catatanSnpmbRingkas);
  }
  return daftar;
}

export { hitungKata };
