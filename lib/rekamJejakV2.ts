/**
 * Logika murni dan teks draf layar Rekam Jejak v2 (`/portofolio`, `/portofolio-tulis`,
 * `/portofolio-butir`, LANJUT_036).
 * Modul murni (tanpa React/Expo) agar validasi, urutan terbaru, penyamaran id jalur lewat
 * `labelJalur` (LANJUT_033), batas foto (3 per butir, 30 per akun, 5 MB), peringatan privasi K29,
 * larangan kata berbagi/penilaian/lomba, dan batas 40 kata per keadaan layar bisa diuji langsung.
 *
 * TEKS DRAF — docs/draf-teks-rekam-jejak-v2.md, belum disetujui Khalifa.
 * Aturan keras (K18–K22, K29, K47, K59):
 * - Hanya privat: tanpa tombol, teks, atau ikon berbagi, penilaian, peringkat, lomba, atau perbandingan.
 * - Batas foto 5 MB per foto, 3 per catatan, 30 per akun ditampilkan sebelum dicoba; HEIC dikonversi.
 * - Peringatan privasi foto jujur sesuai K29, tanpa klaim privasi baru.
 * - Penamaan jalur selalu melalui `labelJalur`; id mentah jalur tidak pernah tampil di layar/aksesibilitas.
 */
import type { ButirBukti, JalurMinat } from '../api/types';
import { LABEL_JALUR_NETRAL, labelJalur } from './jalurSayaV2';
import {
  BATAS_FOTO,
  BATAS_ISIAN,
  GALAT_ISIAN,
  GALAT_UMUM,
  JENIS_BUTIR,
  adalahHeic,
  badanButir,
  batasFoto,
  bisaCobaLagi,
  galatMedanServer,
  hitungFotoAkun,
  keadaanDaftar,
  labelJenisButir,
  periksaIsianButir,
  pesanGalatPortofolio,
  rencanaUkuran,
  tautanSah,
  type BadanButir,
  type GalatIsian,
  type IsianButir,
  type JenisButir,
  type KeadaanDaftar,
} from './portofolio';
import { siapkanFoto, type AlatFoto, type FotoSiap, type HasilFoto, type SumberFoto } from './portofolioFoto';

/** Batas maksimal kata teks tetap per keadaan layar Rekam Jejak v2. */
export const BATAS_KATA_REKAM_JEJAK = 40;

// TEKS DRAF — belum disetujui Khalifa (docs/draf-teks-rekam-jejak-v2.md).
export const TEKS_REKAM_JEJAK_V2 = {
  judul: 'Rekam Jejak',
  ringkasan: 'Catat karya dan prosesmu.',
  tambah: 'Tambah catatan',
  kosongJudul: 'Belum ada catatan',
  kosongTeks: 'Mulai dari satu karya atau prosesmu.',
  satuanFoto: 'foto',
  bukaCatatan: 'Buka catatan',

  labelJudul: 'Judul',
  labelJenis: 'Jenis',
  labelUraian: 'Cerita singkat (opsional)',
  labelTautan: 'Tautan (opsional)',
  petunjukTautan: 'Diawali http:// atau https://',
  labelTanggal: 'Tanggal karya (opsional)',
  petunjukTanggal: 'Contoh: 2026-11-30',
  simpan: 'Simpan',

  ubah: 'Ubah',
  hapus: 'Hapus',
  yakinHapus: 'Hapus catatan ini? Semua fotonya ikut terhapus dan tidak bisa dikembalikan.',
  batal: 'Batal',
  yaHapus: 'Ya, hapus',
  hapusGagal: 'Belum terhapus. Coba lagi sebentar lagi.',
  bukaTautan: 'Buka tautan',

  judulFoto: 'Foto',
  altFoto: 'Foto catatan',
  privasiFoto:
    'Foto dibuka lewat akunmu; pengelola secara teknis bisa mengaksesnya. Jangan unggah dokumen pribadi (KTP, rapor) atau wajah orang tanpa izin.',
  galeri: 'Pilih galeri',
  kamera: 'Ambil foto',
  penjelasIzin: 'Kamera dipakai saat memotret.',
  penuhButir: 'Sudah 3 foto di sini. Hapus satu untuk mengganti.',
  penuhAkun: 'Sudah 30 foto di akunmu. Hapus foto lain dulu.',
  mengolah: 'Menyiapkan foto…',
  mengunggah: 'Mengunggah foto…',
  cobaLagi: 'Coba lagi',
  izinDitolak: 'Izin kamera belum diberikan. Buka Pengaturan atau pilih dari galeri.',
  bukaPengaturan: 'Buka Pengaturan',
  fotoGagalMuat: 'Foto belum bisa dimuat.',
  muatLagi: 'Muat lagi',
  hapusFoto: 'Hapus foto',
  yakinHapusFoto: 'Hapus foto ini? Foto yang dihapus tidak bisa dikembalikan.',

  memuatDaftar: 'Memuat Rekam Jejak',
  memuatFoto: 'Memuat foto',
  fiturMatiJudul: 'Fitur belum tersedia',
  fiturMatiTeks: 'Coba buka kembali nanti.',
  perluKebijakanJudul: 'Terima kebijakan privasi dulu',
  perluKebijakanTeks: 'Setelah itu kamu bisa mencatat karyamu.',
  bacaKebijakan: 'Baca kebijakan',
  galatJudul: 'Belum bisa memuat data',
  galatJaringan: 'Periksa sambunganmu, lalu coba lagi.',
  galatServer: 'Sedang ada gangguan. Coba lagi sebentar lagi.',
  tidakDitemukanJudul: 'Catatan tidak ditemukan',
  tidakDitemukanTeks: 'Mungkin sudah dihapus.',
  kembali: 'Kembali',
} as const;

export function hitungKataRekamJejak(teks: string): number {
  const bersih = teks.trim();
  return bersih ? bersih.split(/\s+/).length : 0;
}

/** Mengurutkan catatan dari terbaru ke terlama menurut `dibuat_pada`, stabil menurut `id`. */
export function urutkanButirTerbaru<T extends Pick<ButirBukti, 'id' | 'dibuat_pada'>>(
  daftar: readonly T[] | null | undefined
): T[] {
  return [...(daftar ?? [])].sort(
    (a, b) => b.dibuat_pada.localeCompare(a.dibuat_pada) || a.id.localeCompare(b.id)
  );
}

/**
 * Penamaan jalur pada kartu & detail Rekam Jejak memakai `labelJalur` (LANJUT_033 / 035):
 * - Tanpa jalur (`jalur_minat_id: null, jalur_belum_tersedia: false`) → `null` (chip tidak tampil).
 * - Jalur disetujui → nama jalur resmi dari server.
 * - Jalur draf/nonaktif (`jalur_belum_tersedia: true`) atau id tak dikenal → `'Jalur belum tersedia'`.
 * Id jalur mentah tidak pernah dikembalikan.
 */
export function labelJalurButirV2(
  butir: Pick<ButirBukti, 'jalur_minat_id' | 'jalur_belum_tersedia'>,
  daftarJalur?: readonly JalurMinat[] | null
): string | null {
  return labelJalur(butir, daftarJalur);
}

/** Penanda batas 3 foto per catatan, 30 per akun, dan 5 MB sebelum siswa mencoba mengunggah. */
export function teksBatasFotoV2(jumlahButir: number, jumlahAkun: number): string {
  return `${jumlahButir}/${BATAS_FOTO.perButir} ${TEKS_REKAM_JEJAK_V2.satuanFoto}, ${jumlahAkun}/${BATAS_FOTO.perAkun} akun (maks 5 MB)`;
}

/** Penanda jumlah foto pada kartu daftar, null bila belum ada foto. */
export function teksJumlahFotoKartuV2(jumlah: number): string | null {
  return jumlah > 0 ? `${jumlah} ${TEKS_REKAM_JEJAK_V2.satuanFoto}` : null;
}

/** Daftar teks tetap per keadaan layar untuk verifikasi batas maksimal 40 kata. */
export function teksTetapRekamJejakV2(
  keadaan:
    | 'daftar_kosong'
    | 'daftar_isi'
    | 'formulir'
    | 'detail'
    | 'detail_batas_penuh'
    | 'detail_konfirmasi_hapus'
    | 'galat'
    | 'fitur_mati'
    | 'perlu_kebijakan'
    | 'tidak_ditemukan'
): string[] {
  if (keadaan === 'daftar_kosong') {
    return [
      TEKS_REKAM_JEJAK_V2.judul,
      TEKS_REKAM_JEJAK_V2.ringkasan,
      TEKS_REKAM_JEJAK_V2.kosongJudul,
      TEKS_REKAM_JEJAK_V2.kosongTeks,
      TEKS_REKAM_JEJAK_V2.tambah,
    ];
  }
  if (keadaan === 'daftar_isi') {
    return [
      TEKS_REKAM_JEJAK_V2.judul,
      TEKS_REKAM_JEJAK_V2.ringkasan,
      TEKS_REKAM_JEJAK_V2.tambah,
      JENIS_BUTIR[0].label,
      LABEL_JALUR_NETRAL,
      TEKS_REKAM_JEJAK_V2.satuanFoto,
    ];
  }
  if (keadaan === 'formulir') {
    return [
      TEKS_REKAM_JEJAK_V2.labelJudul,
      TEKS_REKAM_JEJAK_V2.labelJenis,
      ...JENIS_BUTIR.map((j) => j.label),
      TEKS_REKAM_JEJAK_V2.labelUraian,
      TEKS_REKAM_JEJAK_V2.labelTautan,
      TEKS_REKAM_JEJAK_V2.petunjukTautan,
      TEKS_REKAM_JEJAK_V2.labelTanggal,
      TEKS_REKAM_JEJAK_V2.petunjukTanggal,
      TEKS_REKAM_JEJAK_V2.simpan,
    ];
  }
  if (keadaan === 'detail') {
    return [
      TEKS_REKAM_JEJAK_V2.judulFoto,
      TEKS_REKAM_JEJAK_V2.privasiFoto,
      teksBatasFotoV2(1, 12),
      TEKS_REKAM_JEJAK_V2.galeri,
      TEKS_REKAM_JEJAK_V2.kamera,
      TEKS_REKAM_JEJAK_V2.penjelasIzin,
      TEKS_REKAM_JEJAK_V2.ubah,
      TEKS_REKAM_JEJAK_V2.hapus,
    ];
  }
  if (keadaan === 'detail_batas_penuh') {
    return [
      TEKS_REKAM_JEJAK_V2.judulFoto,
      TEKS_REKAM_JEJAK_V2.privasiFoto,
      teksBatasFotoV2(3, 12),
      TEKS_REKAM_JEJAK_V2.penuhButir,
      TEKS_REKAM_JEJAK_V2.ubah,
      TEKS_REKAM_JEJAK_V2.hapus,
    ];
  }
  if (keadaan === 'detail_konfirmasi_hapus') {
    return [
      TEKS_REKAM_JEJAK_V2.yakinHapus,
      TEKS_REKAM_JEJAK_V2.batal,
      TEKS_REKAM_JEJAK_V2.yaHapus,
    ];
  }
  if (keadaan === 'galat') {
    return [
      TEKS_REKAM_JEJAK_V2.judul,
      TEKS_REKAM_JEJAK_V2.galatJudul,
      TEKS_REKAM_JEJAK_V2.galatJaringan,
      TEKS_REKAM_JEJAK_V2.cobaLagi,
    ];
  }
  if (keadaan === 'fitur_mati') {
    return [
      TEKS_REKAM_JEJAK_V2.judul,
      TEKS_REKAM_JEJAK_V2.fiturMatiJudul,
      TEKS_REKAM_JEJAK_V2.fiturMatiTeks,
    ];
  }
  if (keadaan === 'perlu_kebijakan') {
    return [
      TEKS_REKAM_JEJAK_V2.judul,
      TEKS_REKAM_JEJAK_V2.perluKebijakanJudul,
      TEKS_REKAM_JEJAK_V2.perluKebijakanTeks,
      TEKS_REKAM_JEJAK_V2.bacaKebijakan,
    ];
  }
  return [
    TEKS_REKAM_JEJAK_V2.tidakDitemukanJudul,
    TEKS_REKAM_JEJAK_V2.tidakDitemukanTeks,
    TEKS_REKAM_JEJAK_V2.kembali,
  ];
}

export {
  BATAS_FOTO,
  BATAS_ISIAN,
  GALAT_ISIAN,
  GALAT_UMUM,
  JENIS_BUTIR,
  LABEL_JALUR_NETRAL,
  adalahHeic,
  badanButir,
  batasFoto,
  bisaCobaLagi,
  galatMedanServer,
  hitungFotoAkun,
  keadaanDaftar,
  labelJenisButir,
  periksaIsianButir,
  pesanGalatPortofolio,
  rencanaUkuran,
  siapkanFoto,
  tautanSah,
  type AlatFoto,
  type BadanButir,
  type FotoSiap,
  type GalatIsian,
  type HasilFoto,
  type IsianButir,
  type JenisButir,
  type KeadaanDaftar,
  type SumberFoto,
};
