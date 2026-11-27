/**
 * Logika murni dan teks draf layar Jalur Saya v2 (`/jalur-tujuan` & `/jalur-tujuan-tulis`, LANJUT_033).
 * Modul murni (tanpa React/Expo) supaya aturan penyamaran id mentah, penyaringan jalur disetujui,
 * batas panjang tujuan, riwayat versi bernomor & berjam, serta batas 40 kata dapat diuji langsung.
 *
 * TEKS DRAF — docs/draf-teks-jalur-saya-v2.md, belum disetujui Khalifa.
 * Aturan keras (K37, K44, K47):
 * - Hanya jalur dengan `status_teks === 'disetujui'` yang boleh menampilkan nama dan deskripsinya.
 * - Jalur yang kembali draf tampil sebagai kartu netral "Jalur belum tersedia" dengan tombol "Jeda".
 * - Id jalur mentah (mis. `melanjutkan`, `bekerja`, `wirausaha`) TIDAK PERNAH tampil di layar,
 *   label aksesibilitas, judul, atau pesan galat.
 */
import type { ButirBukti, JalurMinat, PeristiwaPerjalanan, PilihanJalur, StatusTujuan, Tujuan, VersiTujuan } from '../api/types';
import {
  BATAS_TUJUAN,
  GALAT_ISIAN_TUJUAN,
  GALAT_UMUM_JALUR_TUJUAN,
  LABEL_STATUS_TUJUAN,
  badanTujuan,
  galatMedanServerTujuan,
  keadaanData,
  periksaIsianTujuan,
  pesanGalatJalurTujuan,
  pilihanTersembunyiAktif,
  teksPeristiwa,
  teksVersiTujuan,
  type BadanTujuan,
  type GalatIsianTujuan,
  type IsianTujuan,
  type KeadaanData,
} from './jalurTujuan';

/** Batas maksimal kata teks tetap per keadaan layar Jalur Saya v2 (di luar data siswa & data jalur). */
export const BATAS_KATA_JALUR_SAYA = 40;

/** Satu-satunya label netral untuk jalur yang belum disetujui / kembali draf / nonaktif. */
export const LABEL_JALUR_NETRAL = 'Jalur belum tersedia';

// TEKS DRAF — LANJUT_034 perbaikan kecil 033: khusus v2 status tujuan aktif berlabel "Aktif" (v1 tetap "Sedang dikejar").
export const LABEL_STATUS_TUJUAN_V2: Readonly<Record<StatusTujuan, string>> = {
  ...LABEL_STATUS_TUJUAN,
  aktif: 'Aktif',
};

// TEKS DRAF — belum disetujui Khalifa (docs/draf-teks-jalur-saya-v2.md).
export const TEKS_JALUR_SAYA_V2 = {
  judul: 'Jalur Saya',
  ringkasan: 'Boleh lebih dari satu, dan boleh berubah.',

  penandaDipilih: 'Dipilih',
  petunjukKetukPilih: 'Ketuk untuk memilih jalur ini',
  petunjukKetukJeda: 'Ketuk untuk menjeda jalur ini',

  jalurBelumTersedia: LABEL_JALUR_NETRAL,
  jalurDrafKeterangan: 'Sedang disiapkan kembali.',
  jeda: 'Jeda',
  labelAksiJedaDraf: 'Jeda jalur yang belum tersedia',

  kosongJalurJudul: 'Pilihan jalur sedang disiapkan',
  kosongJalurTeks: 'Kamu tetap bisa menulis tujuanmu di bawah.',

  tujuanJudul: 'Tujuanmu',
  kosongTujuanTeks: 'Belum ada tujuan tertulis.',
  tulisTujuan: 'Tulis tujuan',
  tambahTujuan: 'Tambah tujuan',
  ubahTujuan: 'Ubah',
  tandaiTercapai: 'Tandai tercapai',
  lihatRiwayat: 'Lihat perubahan',
  tutupRiwayat: 'Tutup perubahan',
  targetAwalan: 'Target',

  prodiKeterangan: 'Prodi impian · Akun & Privasi',
  prodiBelumTersedia: 'Prodi pilihan',

  perjalananJudul: 'Perjalananmu',
  perjalananKosong: 'Riwayat pilihanmu akan tercatat di sini.',

  formJudulBaru: 'Tulis Tujuan',
  formJudulUbah: 'Ubah Tujuan',
  formCatatanVersi: 'Versi lama tetap tersimpan di riwayatmu.',
  labelJudul: 'Tujuan',
  labelJalur: 'Jalur (opsional)',
  tanpaJalur: 'Belum terkait jalur',
  labelUraian: 'Cerita singkat (opsional)',
  labelTarget: 'Target waktu (opsional)',
  petunjukTarget: 'Contoh: 2027-06-30',
  simpan: 'Simpan',
  batal: 'Batal',

  berhasilSimpanJalur: 'Pilihan jalur tersimpan.',
  berhasilJedaJalur: 'Jalur dijeda.',
  berhasilSimpanTujuan: 'Tujuanmu tersimpan.',
  berhasilTercapai: 'Tujuan ditandai tercapai.',

  memuatLabel: 'Memuat Jalur Saya',
  fiturMatiJudul: 'Fitur ini belum tersedia',
  fiturMatiTeks: 'Coba buka kembali nanti.',
  perluKebijakanJudul: 'Terima kebijakan privasi dulu',
  perluKebijakanTeks: 'Setelah itu kamu bisa memakai fitur ini.',
  bacaKebijakan: 'Baca kebijakan',
  galatJudul: 'Belum bisa memuat data',
  galatPesan: 'Periksa sambunganmu, lalu coba lagi.',
  cobaLagi: 'Coba lagi',
  tidakDitemukanJudul: 'Tujuan tidak ditemukan',
  tidakDitemukanTeks: 'Mungkin sudah diperbarui ke versi baru.',
  kembaliKeJalur: 'Kembali',
} as const;

export function hitungKataJalurSaya(teks: string): number {
  const bersih = teks.trim();
  return bersih ? bersih.split(/\s+/).length : 0;
}

/**
 * Menyaring daftar jalur hanya ke jalur yang benar-benar berstatus `disetujui` dan memiliki nama.
 * Penjaga lapis kedua di klien: seandainya objek `status_teks !== 'disetujui'` ada di memori,
 * nama, id mentah, dan `deskripsi_singkat` draf tidak pernah lolos ke layar.
 */
export function jalurDisetujuiSaja(daftar: readonly JalurMinat[] | null | undefined): JalurMinat[] {
  const hasil: JalurMinat[] = [];
  for (const j of daftar ?? []) {
    if (j && j.status_teks === 'disetujui' && typeof j.nama === 'string' && j.nama.trim().length > 0) {
      hasil.push(j);
    }
  }
  return hasil;
}

export type MasukanLabelJalur =
  | JalurMinat
  | Pick<PilihanJalur, 'jalur_minat_id' | 'jalur_belum_tersedia'>
  | Pick<Tujuan, 'jalur_minat_id' | 'jalur_belum_tersedia'>
  | Pick<ButirBukti, 'jalur_minat_id' | 'jalur_belum_tersedia'>
  | string
  | null
  | undefined;

/**
 * Satu-satunya pembantu penamaan jalur untuk tampilan dan label aksesibilitas (LANJUT_033 §3,
 * diperluas LANJUT_035 untuk `Tujuan` dan `ButirBukti` yang kini membawa `jalur_belum_tersedia`):
 * - Menerima objek `JalurMinat`, `PilihanJalur`, `Tujuan`, `ButirBukti`, atau string `jalur_minat_id`.
 * - Mengembalikan `nama` jalur HANYA bila jalur tersebut berstatus `status_teks === 'disetujui'`.
 * - Mengembalikan `null` hanya bila memang tidak dikaitkan ke jalur (`null`/`undefined`/`''`, atau
 *   objek dengan `jalur_minat_id: null` dan `jalur_belum_tersedia` tidak bernilai true).
 * - Untuk jalur draf, nonaktif, `jalur_belum_tersedia: true`, atau id yang tidak dikenal di daftar disetujui,
 *   SELALU mengembalikan `LABEL_JALUR_NETRAL` (`'Jalur belum tersedia'`) — TIDAK PERNAH id mentah.
 */
export function labelJalur(
  masukan: MasukanLabelJalur,
  daftarJalur?: readonly JalurMinat[] | null
): string | null {
  if (masukan === null || masukan === undefined || masukan === '') return null;

  const petaDisetujui = new Map<string, string>();
  for (const j of jalurDisetujuiSaja(daftarJalur)) {
    petaDisetujui.set(j.id, j.nama.trim());
  }

  if (typeof masukan === 'string') {
    return petaDisetujui.get(masukan) ?? LABEL_JALUR_NETRAL;
  }

  if ('status_teks' in masukan) {
    if (masukan.status_teks === 'disetujui' && typeof masukan.nama === 'string' && masukan.nama.trim().length > 0) {
      return masukan.nama.trim();
    }
    return LABEL_JALUR_NETRAL;
  }

  if (masukan.jalur_belum_tersedia) {
    return LABEL_JALUR_NETRAL;
  }
  if (!masukan.jalur_minat_id) {
    return null;
  }
  return petaDisetujui.get(masukan.jalur_minat_id) ?? LABEL_JALUR_NETRAL;
}

/** Penanda lokal formulir tujuan v2 agar jalur draf tersamar dari server tetap utuh saat hanya judul/uraian diubah. */
export const NILAI_JALUR_DRAF_TETAP = '__jalur_draf_tetap__';

export function tujuanPunyaJalurDraf(
  awal: Pick<Tujuan, 'jalur_minat_id' | 'jalur_belum_tersedia'> | undefined,
  daftarJalur: readonly JalurMinat[]
): boolean {
  if (!awal) return false;
  if (awal.jalur_belum_tersedia) return true;
  if (!awal.jalur_minat_id) return false;
  const idSah = new Set(jalurDisetujuiSaja(daftarJalur).map((j) => j.id));
  return !idSah.has(awal.jalur_minat_id);
}

export function nilaiJalurAwalFormV2(
  awal: Pick<Tujuan, 'jalur_minat_id' | 'jalur_belum_tersedia'> | undefined,
  daftarJalur: readonly JalurMinat[]
): string | null {
  if (!awal) return null;
  if (tujuanPunyaJalurDraf(awal, daftarJalur)) {
    return awal.jalur_minat_id ?? NILAI_JALUR_DRAF_TETAP;
  }
  return awal.jalur_minat_id;
}

/**
 * Menyusun payload `POST /tujuan` atau `POST /tujuan/:id/versi` dengan menghormati penyamaran
 * jalur draf dari server (`jalur_minat_id: null, jalur_belum_tersedia: true`):
 * - Bila pilihan jalur dibiarkan di `NILAI_JALUR_DRAF_TETAP`, `jalur_minat_id` tidak dikirim agar
 *   logika `perbarui` di server tetap menyalin `lama.jalur_minat_id` tanpa kehilangan data.
 * - Bila siswa memilih "Belum terkait jalur" (`null`) atau jalur disetujui baru, perubahan dikirim.
 */
export function badanTujuanV2(isi: IsianTujuan, awal?: Tujuan): BadanTujuan | null {
  if (!awal?.jalur_belum_tersedia) {
    return badanTujuan(isi, awal);
  }
  const tanpaJalur = badanTujuan({ ...isi, jalur: awal.jalur_minat_id }, awal);
  if (isi.jalur === NILAI_JALUR_DRAF_TETAP) {
    return tanpaJalur;
  }
  return { ...(tanpaJalur ?? {}), jalur_minat_id: isi.jalur };
}

export type KartuJalurDisetujuiV2 = {
  idJalur: string;
  judul: string;
  ringkasan: string;
  dipilih: boolean;
  pilihanAktifId: string | null;
  jumlahBabak: number;
};

export type KartuJalurDrafAktifV2 = {
  pilihanId: string;
  judul: string;
  keterangan: string;
};

/**
 * Menyusun kartu jalur disetujui dan kartu pilihan aktif yang kembali draf untuk layar Jalur Saya v2.
 * Menjamin:
 * - Tidak ada jalur `status_teks !== 'disetujui'` di `disetujui`.
 * - Babak aktif yang id-nya tidak ada di `disetujui` (meski seandainya `jalur_belum_tersedia` bernilai false)
 *   tetap masuk ke `drafAktif` dengan label netral dan tombol Jeda, tanpa id mentah.
 */
export function susunKartuJalurV2(
  daftarJalur: readonly JalurMinat[] | null | undefined,
  daftarPilihan: readonly PilihanJalur[] | null | undefined
): {
  disetujui: KartuJalurDisetujuiV2[];
  drafAktif: KartuJalurDrafAktifV2[];
} {
  const sah = jalurDisetujuiSaja(daftarJalur);
  const idSah = new Set(sah.map((j) => j.id));
  const pilihan = daftarPilihan ?? [];

  const disetujui: KartuJalurDisetujuiV2[] = sah.map((j) => {
    const milik = pilihan.filter((p) => !p.jalur_belum_tersedia && p.jalur_minat_id === j.id);
    const aktif = milik.find((p) => p.status === 'aktif') ?? null;
    return {
      idJalur: j.id,
      judul: labelJalur(j) ?? LABEL_JALUR_NETRAL,
      ringkasan: j.deskripsi_singkat,
      dipilih: Boolean(aktif),
      pilihanAktifId: aktif?.id ?? null,
      jumlahBabak: milik.length,
    };
  });

  const tersembunyiServer = pilihanTersembunyiAktif(pilihan);
  const bocorDraf = pilihan.filter(
    (p) => !p.jalur_belum_tersedia && p.status === 'aktif' && (!p.jalur_minat_id || !idSah.has(p.jalur_minat_id))
  );
  const gabungan = [...tersembunyiServer, ...bocorDraf];

  const drafAktif: KartuJalurDrafAktifV2[] = gabungan.map((p) => ({
    pilihanId: p.id,
    judul: labelJalur(p, sah) ?? LABEL_JALUR_NETRAL,
    keterangan: TEKS_JALUR_SAYA_V2.jalurDrafKeterangan,
  }));

  return { disetujui, drafAktif };
}

/** Label peristiwa perjalanan yang dijamin bebas id mentah jalur draf. */
export function teksPeristiwaAmanV2(
  peristiwa: PeristiwaPerjalanan,
  daftarJalur: readonly JalurMinat[] | null | undefined
): string {
  const sah = jalurDisetujuiSaja(daftarJalur);
  return teksPeristiwa(peristiwa, (id) => {
    if (!id) return '';
    const ketemu = sah.find((j) => j.id === id);
    return ketemu ? ketemu.nama.trim() : `(belum tersedia)`;
  });
}

/** Daftar teks tetap per keadaan layar untuk verifikasi batas maksimal 40 kata. */
export function teksTetapJalurSayaV2(
  keadaan: 'siap_isi' | 'kosong_jalur' | 'form_tujuan' | 'galat' | 'fitur_mati' | 'perlu_kebijakan'
): string[] {
  if (keadaan === 'galat') {
    return [
      TEKS_JALUR_SAYA_V2.judul,
      TEKS_JALUR_SAYA_V2.ringkasan,
      TEKS_JALUR_SAYA_V2.galatJudul,
      TEKS_JALUR_SAYA_V2.galatPesan,
      TEKS_JALUR_SAYA_V2.cobaLagi,
    ];
  }
  if (keadaan === 'fitur_mati') {
    return [
      TEKS_JALUR_SAYA_V2.judul,
      TEKS_JALUR_SAYA_V2.fiturMatiJudul,
      TEKS_JALUR_SAYA_V2.fiturMatiTeks,
    ];
  }
  if (keadaan === 'perlu_kebijakan') {
    return [
      TEKS_JALUR_SAYA_V2.judul,
      TEKS_JALUR_SAYA_V2.perluKebijakanJudul,
      TEKS_JALUR_SAYA_V2.perluKebijakanTeks,
      TEKS_JALUR_SAYA_V2.bacaKebijakan,
    ];
  }
  if (keadaan === 'form_tujuan') {
    return [
      TEKS_JALUR_SAYA_V2.formJudulUbah,
      TEKS_JALUR_SAYA_V2.batal,
      TEKS_JALUR_SAYA_V2.formCatatanVersi,
      TEKS_JALUR_SAYA_V2.labelJudul,
      TEKS_JALUR_SAYA_V2.labelJalur,
      TEKS_JALUR_SAYA_V2.tanpaJalur,
      TEKS_JALUR_SAYA_V2.jalurBelumTersedia,
      TEKS_JALUR_SAYA_V2.labelUraian,
      TEKS_JALUR_SAYA_V2.labelTarget,
      TEKS_JALUR_SAYA_V2.petunjukTarget,
      TEKS_JALUR_SAYA_V2.simpan,
    ];
  }
  if (keadaan === 'kosong_jalur') {
    return [
      TEKS_JALUR_SAYA_V2.judul,
      TEKS_JALUR_SAYA_V2.ringkasan,
      TEKS_JALUR_SAYA_V2.kosongJalurJudul,
      TEKS_JALUR_SAYA_V2.kosongJalurTeks,
      TEKS_JALUR_SAYA_V2.tujuanJudul,
      TEKS_JALUR_SAYA_V2.prodiKeterangan,
      TEKS_JALUR_SAYA_V2.kosongTujuanTeks,
      TEKS_JALUR_SAYA_V2.tulisTujuan,
      TEKS_JALUR_SAYA_V2.perjalananJudul,
    ];
  }
  return [
    TEKS_JALUR_SAYA_V2.judul,
    TEKS_JALUR_SAYA_V2.ringkasan,
    TEKS_JALUR_SAYA_V2.penandaDipilih,
    TEKS_JALUR_SAYA_V2.jalurBelumTersedia,
    TEKS_JALUR_SAYA_V2.jalurDrafKeterangan,
    TEKS_JALUR_SAYA_V2.jeda,
    TEKS_JALUR_SAYA_V2.tujuanJudul,
    TEKS_JALUR_SAYA_V2.prodiKeterangan,
    LABEL_STATUS_TUJUAN_V2.aktif,
    TEKS_JALUR_SAYA_V2.targetAwalan,
    TEKS_JALUR_SAYA_V2.ubahTujuan,
    TEKS_JALUR_SAYA_V2.tandaiTercapai,
    TEKS_JALUR_SAYA_V2.lihatRiwayat,
    TEKS_JALUR_SAYA_V2.tambahTujuan,
    TEKS_JALUR_SAYA_V2.perjalananJudul,
  ];
}

export {
  BATAS_TUJUAN,
  GALAT_ISIAN_TUJUAN,
  GALAT_UMUM_JALUR_TUJUAN,
  LABEL_STATUS_TUJUAN,
  badanTujuan,
  galatMedanServerTujuan,
  keadaanData,
  periksaIsianTujuan,
  pesanGalatJalurTujuan,
  teksVersiTujuan,
  type BadanTujuan,
  type GalatIsianTujuan,
  type IsianTujuan,
  type KeadaanData,
  type Tujuan,
  type VersiTujuan,
};
