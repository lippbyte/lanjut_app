/**
 * Logika murni dan teks draf layar Jelajah v2 (`/discover`, `/discover-refleksi`) dan
 * Profil Eksplorasi v2 (`/discover-profil`, LANJUT_034).
 * Modul murni (tanpa React/Expo) supaya aturan penyaringan kartu disetujui, penyamaran id jalur
 * (memakai `labelJalur` dari LANJUT_033), penghitung batas 280/500 karakter, tidak adanya bagian
 * "Cara belajar" tanpa data, kalimat privasi jujur tanpa klaim baru, serta batas 40 kata dapat
 * diuji langsung dari `server/tests`.
 *
 * TEKS DRAF — docs/draf-teks-jelajah-v2.md, belum disetujui Khalifa.
 * Aturan keras (K29, K37, K39, K40, K42, K44, K47, K51):
 * - Hanya kartu disetujui yang boleh tampil. Kartu draf tidak pernah dirender.
 * - Tidak mengarang isi kartu, sumber, tanggal periksa, atau "cara belajar".
 * - Batas 280 karakter per kolom refleksi dan 500 karakter untuk catatan profil.
 * - Kalimat privasi persis sama dengan `TEKS_DISCOVER.privasi` (tanpa klaim baru).
 * - Id jalur mentah tidak pernah tampil di layar atau label aksesibilitas.
 */
import type { JalurMinat, KartuDiscover, Ketertarikan, ProfilEksplorasi, RefleksiDiscover } from '../api/types';
import {
  BATAS_DISCOVER,
  GALAT_ISIAN_DISCOVER,
  GALAT_UMUM_DISCOVER,
  LABEL_JENIS_KARTU,
  PILIHAN_KETERTARIKAN,
  TEKS_DISCOVER,
  badanRefleksi,
  blokProfil,
  keadaanData,
  periksaIsianRefleksi,
  pesanGalatDiscover,
  teksDisembunyikan,
  teksVersi,
  type BadanRefleksi,
  type BlokProfil,
  type GalatIsianRefleksi,
  type IsianRefleksi,
  type KeadaanData,
  type KutipanProfil,
} from './discover';
import { LABEL_JALUR_NETRAL, labelJalur } from './jalurSayaV2';

/** Batas maksimal kata teks tetap per keadaan layar Jelajah & Profil Eksplorasi v2. */
export const BATAS_KATA_JELAJAH = 40;

/**
 * Kalimat privasi jujur persis sama dengan `docs/draf-teks-discover.md` (K29, K40).
 * Tidak menambah klaim privasi baru.
 */
export const TEKS_PRIVASI_JELAJAH: string = TEKS_DISCOVER.privasi;

// TEKS DRAF — belum disetujui Khalifa (docs/draf-teks-jelajah-v2.md).
export const TEKS_JELAJAH_V2 = {
  judul: 'Jelajah',
  ringkasan: 'Kenali bidang, profesi, dan usaha.',
  penandaSudahDitulis: 'Sudah ditulis',
  penandaSudahDibaca: 'Sudah dibaca',
  lihatDetail: 'Lihat detail',
  kosongJudul: 'Kartu sedang disiapkan',
  kosongTeks: 'Sementara itu, buka Profil Saya.',
  bukaProfil: 'Buka Profil Saya',

  rincianJudul: 'Rincian',
  tutup: 'Tutup',
  labelSumber: 'Sumber',
  labelDiperiksa: 'Diperiksa',
  tulisRefleksi: 'Tulis refleksi',
  ubahRefleksi: 'Ubah refleksi',
  labelCaraBelajar: 'Cara belajar',

  judulRefleksi: 'Tulis Refleksi',
  tanyaKetertarikan: 'Pilihanmu',
  labelMenarik: 'Yang menarik',
  labelKurangMenarik: 'Kurang menarik',
  simpan: 'Simpan',
  hapusRefleksi: 'Hapus refleksi',
  berhasilSimpanRefleksi: 'Refleksi tersimpan.',
  berhasilHapusRefleksi: 'Refleksi dihapus.',
  sisaAwalan: 'Sisa',
  melebihiAwalan: 'Melebihi',
  satuanKarakter: 'karakter',

  judulProfil: 'Profil Saya',
  ringkasanProfil: 'Isianmu apa adanya, tanpa tebakan.',
  belumAdaProfilJudul: 'Profil belum disusun',
  belumAdaProfilTeks: 'Tulis refleksi dulu, lalu susun di sini.',
  susunProfil: 'Susun profil',
  ubahProfil: 'Ubah',
  lihatRiwayat: 'Lihat perubahan',
  tutupRiwayat: 'Tutup perubahan',
  bagianDataAkun: 'Data Akun',
  labelMinatRumpun: 'Minat',
  labelMapelPilihan: 'Mapel',
  bagianJalurTujuan: 'Jalur & tujuan',
  labelJalur: 'Jalur',
  labelTujuan: 'Tujuan',
  labelCatatanRingkas: 'Catatan',

  formProfilJudulBaru: 'Susun Profil',
  formProfilJudulUbah: 'Ubah Profil',
  formProfilCatatanVersi: 'Versi lama tetap tersimpan.',
  labelCatatan: 'Catatan pribadi',
  hapusCatatan: 'Hapus catatan',
  batal: 'Batal',
  berhasilSimpanProfil: 'Profil tersimpan.',
  berhasilHapusCatatan: 'Catatan dihapus.',

  memuatJelajah: 'Memuat Jelajah',
  memuatProfil: 'Memuat Profil Saya',
  fiturMatiJudul: 'Fitur ini belum tersedia',
  fiturMatiTeks: 'Coba buka kembali nanti.',
  perluKebijakanJudul: 'Terima kebijakan privasi dulu',
  perluKebijakanTeks: 'Setelah itu kamu bisa memakai fitur ini.',
  bacaKebijakan: 'Baca kebijakan',
  galatJudul: 'Belum bisa memuat data',
  galatPesan: 'Periksa sambunganmu, lalu coba lagi.',
  cobaLagi: 'Coba lagi',
  tidakDitemukanJudul: 'Kartu tidak ditemukan',
  tidakDitemukanTeks: 'Mungkin sedang disiapkan kembali.',
  kembaliKeJelajah: 'Kembali',
} as const;

export function hitungKataJelajah(teks: string): number {
  const bersih = teks.trim();
  return bersih ? bersih.split(/\s+/).length : 0;
}

export type KartuDiscoverKandidat = KartuDiscover & {
  status_teks?: string;
  aktif?: boolean | number;
  cara_belajar?: unknown;
  jalur_minat_id?: string | null;
};

/**
 * Penjaga lapis kedua di klien untuk kartu Discover:
 * - Server (`kartu-discover.repo.js`) hanya mengirim kartu aktif berstatus `disetujui`.
 * - Bila sebuah objek membawa `status_teks` selain `'disetujui'`, `aktif` non-truthy,
 *   atau `url_sumber` bertanda `[ISI`, objek itu dibuang sebelum menyentuh layar.
 */
export function kartuDisetujuiSaja(
  daftar: readonly KartuDiscoverKandidat[] | null | undefined
): KartuDiscoverKandidat[] {
  const hasil: KartuDiscoverKandidat[] = [];
  for (const k of daftar ?? []) {
    if (!k) continue;
    if ('status_teks' in k && k.status_teks !== undefined && k.status_teks !== 'disetujui') continue;
    if ('aktif' in k && k.aktif !== undefined && !k.aktif) continue;
    if (typeof k.url_sumber === 'string' && k.url_sumber.trim().startsWith('[ISI')) continue;
    if (typeof k.id !== 'string' || !k.id.trim()) continue;
    if (typeof k.judul !== 'string' || !k.judul.trim()) continue;
    if (typeof k.ringkasan !== 'string' || !k.ringkasan.trim()) continue;
    hasil.push(k);
  }
  return hasil;
}

/**
 * Membaca daftar tips "Cara belajar" bila dan hanya bila data dari server sungguh memuatnya.
 * Saat ini `kartu_discover` belum memiliki bidang tersebut, sehingga selalu mengembalikan `null`
 * dan layar tidak menampilkan bagian "Cara belajar" maupun teks karangan.
 */
export function caraBelajarKartu(kartu: KartuDiscoverKandidat | null | undefined): string[] | null {
  if (!kartu || !Array.isArray(kartu.cara_belajar)) return null;
  const bersih = kartu.cara_belajar
    .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
    .map((x) => x.trim());
  return bersih.length > 0 ? bersih : null;
}

export type ChipPenyaringJalur = {
  id: string;
  label: string;
};

/**
 * Menyusun chip penyaring menurut jalur HANYA bila data kartu membawa penanda `jalur_minat_id`.
 * Label chip selalu lewat `labelJalur` (LANJUT_033). Bila kartu tidak punya penanda jalur (kondisi
 * skema saat ini), mengembalikan larik kosong — tidak menyaring dan tidak memetakan sendiri.
 */
export function jalurPenyaringKartu(
  daftarKartu: readonly KartuDiscoverKandidat[] | null | undefined,
  daftarJalur?: readonly JalurMinat[] | null
): ChipPenyaringJalur[] {
  const terlihat = new Set<string>();
  const hasil: ChipPenyaringJalur[] = [];
  for (const k of kartuDisetujuiSaja(daftarKartu)) {
    const id = typeof k.jalur_minat_id === 'string' ? k.jalur_minat_id.trim() : '';
    if (!id || terlihat.has(id)) continue;
    terlihat.add(id);
    const label = labelJalur(id, daftarJalur) ?? LABEL_JALUR_NETRAL;
    hasil.push({ id, label });
  }
  return hasil;
}

export type MasukanJalurProfil =
  | { id: string; nama?: string | null; status_teks?: string }
  | string
  | null
  | undefined;

/**
 * Penamaan jalur pada Profil Eksplorasi melalui `labelJalur` (LANJUT_033) agar id mentah jalur
 * (`melanjutkan`, `bekerja`, `wirausaha`, dsb.) atau teks draf tidak pernah tampil di layar maupun
 * label aksesibilitas.
 */
export function labelJalurProfilV2(
  masukan: MasukanJalurProfil,
  daftarJalur?: readonly JalurMinat[] | null
): string | null {
  if (masukan === null || masukan === undefined || masukan === '') return null;
  if (typeof masukan === 'string') {
    return labelJalur(masukan, daftarJalur);
  }
  if ('status_teks' in masukan && masukan.status_teks !== undefined) {
    return labelJalur(
      {
        id: masukan.id,
        nama: masukan.nama ?? '',
        deskripsi_singkat: '',
        status_teks: masukan.status_teks as JalurMinat['status_teks'],
        urutan: 0,
      },
      daftarJalur
    );
  }
  if (daftarJalur && daftarJalur.length > 0) {
    return labelJalur(masukan.id, daftarJalur);
  }
  const namaBersih = typeof masukan.nama === 'string' ? masukan.nama.trim() : '';
  const idBersih = typeof masukan.id === 'string' ? masukan.id.trim() : '';
  if (!namaBersih || namaBersih.toLowerCase() === idBersih.toLowerCase()) {
    return labelJalur({ jalur_minat_id: null, jalur_belum_tersedia: true });
  }
  return labelJalur({
    id: idBersih,
    nama: namaBersih,
    deskripsi_singkat: '',
    status_teks: 'disetujui',
    urutan: 0,
  });
}

export function daftarLabelJalurProfilV2(
  daftar: readonly MasukanJalurProfil[] | null | undefined,
  daftarJalur?: readonly JalurMinat[] | null
): string[] {
  const hasil: string[] = [];
  for (const item of daftar ?? []) {
    const label = labelJalurProfilV2(item, daftarJalur);
    if (label) hasil.push(label);
  }
  return hasil;
}

export type InfoBatasKarakter = {
  panjang: number;
  batas: number;
  sisa: number;
  melewati: boolean;
  teksRingkas: string;
  teksAkses: string;
};

/** Penghitung sisa karakter (280 untuk refleksi, 500 untuk catatan profil). */
export function hitungBatasKarakter(nilai: string, batas: number): InfoBatasKarakter {
  const panjang = nilai.trim().length;
  const sisa = batas - panjang;
  const melewati = sisa < 0;
  const angka = Math.abs(sisa);
  const awalan = melewati ? TEKS_JELAJAH_V2.melebihiAwalan : TEKS_JELAJAH_V2.sisaAwalan;
  return {
    panjang,
    batas,
    sisa,
    melewati,
    teksRingkas: `${awalan} ${angka}`,
    teksAkses: `${awalan} ${angka} ${TEKS_JELAJAH_V2.satuanKarakter}`,
  };
}

export function periksaCatatanProfilV2(catatan: string): string | null {
  return catatan.trim().length > BATAS_DISCOVER.catatan ? GALAT_ISIAN_DISCOVER.catatanPanjang : null;
}

export type StatusKartuJelajahV2 = 'sudah_ditulis' | 'sudah_dibaca' | 'belum';

export function statusKartuJelajahV2(p: {
  kartuId: string;
  idRefleksi: ReadonlySet<string>;
  idDibaca: ReadonlySet<string>;
}): StatusKartuJelajahV2 {
  if (p.idRefleksi.has(p.kartuId)) return 'sudah_ditulis';
  if (p.idDibaca.has(p.kartuId)) return 'sudah_dibaca';
  return 'belum';
}

export function labelKetertarikanV2(nilai: Ketertarikan): string {
  return PILIHAN_KETERTARIKAN.find((p) => p.id === nilai)?.label ?? '';
}

/** Daftar teks tetap per keadaan layar untuk verifikasi batas maksimal 40 kata. */
export function teksTetapJelajahV2(
  keadaan:
    | 'jelajah_daftar'
    | 'jelajah_kosong'
    | 'jelajah_rincian'
    | 'jelajah_refleksi'
    | 'profil_isi'
    | 'profil_kosong'
    | 'profil_form'
    | 'galat'
    | 'fitur_mati'
    | 'perlu_kebijakan'
): string[] {
  if (keadaan === 'jelajah_daftar') {
    return [
      TEKS_JELAJAH_V2.judul,
      TEKS_JELAJAH_V2.ringkasan,
      LABEL_JENIS_KARTU.bidang,
      TEKS_JELAJAH_V2.penandaSudahDitulis,
      TEKS_JELAJAH_V2.lihatDetail,
    ];
  }
  if (keadaan === 'jelajah_kosong') {
    return [
      TEKS_JELAJAH_V2.judul,
      TEKS_JELAJAH_V2.ringkasan,
      TEKS_JELAJAH_V2.kosongJudul,
      TEKS_JELAJAH_V2.kosongTeks,
      TEKS_JELAJAH_V2.bukaProfil,
    ];
  }
  if (keadaan === 'jelajah_rincian') {
    return [
      TEKS_JELAJAH_V2.rincianJudul,
      TEKS_JELAJAH_V2.tutup,
      LABEL_JENIS_KARTU.bidang,
      TEKS_JELAJAH_V2.labelSumber,
      TEKS_JELAJAH_V2.labelDiperiksa,
      TEKS_JELAJAH_V2.labelMenarik,
      TEKS_JELAJAH_V2.labelKurangMenarik,
      TEKS_JELAJAH_V2.ubahRefleksi,
    ];
  }
  if (keadaan === 'jelajah_refleksi') {
    return [
      TEKS_JELAJAH_V2.judulRefleksi,
      TEKS_JELAJAH_V2.tanyaKetertarikan,
      ...PILIHAN_KETERTARIKAN.map((p) => p.label),
      TEKS_JELAJAH_V2.labelMenarik,
      `${TEKS_JELAJAH_V2.sisaAwalan} ${BATAS_DISCOVER.refleksi}`,
      TEKS_JELAJAH_V2.labelKurangMenarik,
      `${TEKS_JELAJAH_V2.sisaAwalan} ${BATAS_DISCOVER.refleksi}`,
      TEKS_PRIVASI_JELAJAH,
      TEKS_JELAJAH_V2.simpan,
      TEKS_JELAJAH_V2.hapusRefleksi,
    ];
  }
  if (keadaan === 'profil_kosong') {
    return [
      TEKS_JELAJAH_V2.judulProfil,
      TEKS_JELAJAH_V2.ringkasanProfil,
      TEKS_JELAJAH_V2.belumAdaProfilJudul,
      TEKS_JELAJAH_V2.belumAdaProfilTeks,
      TEKS_JELAJAH_V2.susunProfil,
    ];
  }
  if (keadaan === 'profil_form') {
    return [
      TEKS_JELAJAH_V2.formProfilJudulUbah,
      TEKS_JELAJAH_V2.batal,
      TEKS_JELAJAH_V2.formProfilCatatanVersi,
      TEKS_JELAJAH_V2.labelCatatan,
      `${TEKS_JELAJAH_V2.sisaAwalan} ${BATAS_DISCOVER.catatan}`,
      TEKS_PRIVASI_JELAJAH,
      TEKS_JELAJAH_V2.simpan,
      TEKS_JELAJAH_V2.hapusCatatan,
    ];
  }
  if (keadaan === 'galat') {
    return [
      TEKS_JELAJAH_V2.judul,
      TEKS_JELAJAH_V2.galatJudul,
      TEKS_JELAJAH_V2.galatPesan,
      TEKS_JELAJAH_V2.cobaLagi,
    ];
  }
  if (keadaan === 'fitur_mati') {
    return [
      TEKS_JELAJAH_V2.judul,
      TEKS_JELAJAH_V2.fiturMatiJudul,
      TEKS_JELAJAH_V2.fiturMatiTeks,
    ];
  }
  if (keadaan === 'perlu_kebijakan') {
    return [
      TEKS_JELAJAH_V2.judul,
      TEKS_JELAJAH_V2.perluKebijakanJudul,
      TEKS_JELAJAH_V2.perluKebijakanTeks,
      TEKS_JELAJAH_V2.bacaKebijakan,
    ];
  }
  return [
    TEKS_JELAJAH_V2.judulProfil,
    TEKS_JELAJAH_V2.ringkasanProfil,
    TEKS_JELAJAH_V2.bagianDataAkun,
    TEKS_JELAJAH_V2.labelMinatRumpun,
    TEKS_JELAJAH_V2.labelMapelPilihan,
    TEKS_JELAJAH_V2.bagianJalurTujuan,
    TEKS_JELAJAH_V2.labelJalur,
    TEKS_JELAJAH_V2.labelTujuan,
    TEKS_JELAJAH_V2.labelCatatanRingkas,
    TEKS_JELAJAH_V2.ubahProfil,
    TEKS_JELAJAH_V2.lihatRiwayat,
  ];
}

export {
  BATAS_DISCOVER,
  GALAT_ISIAN_DISCOVER,
  GALAT_UMUM_DISCOVER,
  LABEL_JENIS_KARTU,
  PILIHAN_KETERTARIKAN,
  badanRefleksi,
  blokProfil,
  keadaanData,
  periksaIsianRefleksi,
  pesanGalatDiscover,
  teksDisembunyikan,
  teksVersi,
  type BadanRefleksi,
  type BlokProfil,
  type GalatIsianRefleksi,
  type IsianRefleksi,
  type KeadaanData,
  type KutipanProfil,
  type ProfilEksplorasi,
  type RefleksiDiscover,
};
