/**
 * Warna tema v2 (LANJUT_029, usulan di docs/desain-token-v2.md). Modul murni.
 *
 * Belum dipakai layar mana pun: hanya komponen di components/v2 dan galeri komponen dev.
 * Warna inti design.md v3.1 tidak diubah. Biru tua, sukses, dan galat MENUNGGU KEPUTUSAN
 * Khalifa: sampai diputuskan, opsi pertama yang dipakai.
 */
import type { JenisPasangan } from './kontras';

/** design.md §2.1 (terkunci) dan netral yang sudah dipakai v1 (theme/tokens.ts). */
export const palet = {
  biruMuda: '#B4E1EB',
  biruSedang: '#95BDD7',
  biruBaja: '#78A4CB',
  putih: '#FFFFFF',
  tinta: '#1A1A1A',
  biru100: '#E4F3F7',
  tinta700: '#3D4450',
  tinta500: '#6B7480',
  tinta100: '#E6E9ED',
  tinta050: '#F5F7F9',
} as const;

export type OpsiWarna = { kode: string; nama: string; hex: string; latar?: string };

/** Biru tua untuk tombol utama, teks tautan, dan cincin fokus. Usulan, menunggu Khalifa. */
export const OPSI_BIRU_TUA: readonly OpsiWarna[] = [
  { kode: 'A', nama: 'Biru baja tua (sudah dipakai v1 sebagai blue600)', hex: '#456A8C' },
  { kode: 'B', nama: 'Biru laut', hex: '#3B5F80' },
  { kode: 'C', nama: 'Biru malam', hex: '#2F5273' },
];

/** Sukses/selesai (design.md §2.2: hijau lembut, di luar palet biru). Usulan, menunggu Khalifa. */
export const OPSI_SUKSES: readonly OpsiWarna[] = [
  { kode: 'A', nama: 'Hijau toska (sudah dipakai v1 sebagai statusOkFg)', hex: '#2F6B5C', latar: '#E6F2EF' },
  { kode: 'B', nama: 'Hijau daun', hex: '#276749', latar: '#E7F3EC' },
  { kode: 'C', nama: 'Hijau zaitun', hex: '#4A6B2A', latar: '#EEF3E6' },
];

/**
 * Galat murni (gagal menyimpan, gagal memuat). Bukan untuk tenggat (design.md §2.3 dan §8).
 * Tidak ada merah atau oranye terang. Usulan, menunggu Khalifa.
 */
export const OPSI_GALAT: readonly OpsiWarna[] = [
  { kode: 'A', nama: 'Merah bata redup', hex: '#A33A3A', latar: '#FBEDED' },
  { kode: 'B', nama: 'Merah anggur', hex: '#8C2F45', latar: '#F8EBEF' },
  { kode: 'C', nama: 'Plum (bukan merah; wajib selalu dengan ikon dan teks)', hex: '#7B3F6E', latar: '#F5ECF3' },
];

const BIRU_TUA = OPSI_BIRU_TUA[0]; // MENUNGGU KEPUTUSAN: biru tua (A/B/C)
const SUKSES = OPSI_SUKSES[0]; // MENUNGGU KEPUTUSAN: warna sukses (A/B/C)
const GALAT = OPSI_GALAT[0]; // MENUNGGU KEPUTUSAN: warna galat (A/B/C)

/** Peran warna. Komponen v2 hanya boleh memakai nama di sini, tidak pernah HEX. */
export const warna = {
  halaman: palet.tinta050,
  permukaan: palet.putih,
  permukaanLembut: palet.biru100,
  brand: palet.biruMuda,
  teks: palet.tinta,
  teksSekunder: palet.tinta700,
  teksPadaAksen: palet.putih,
  aksen: BIRU_TUA.hex,
  aksenTekan: palet.tinta700,
  garisKontrol: palet.tinta500,
  garisHalus: palet.tinta100,
  fokus: BIRU_TUA.hex,
  nonaktifLatar: palet.tinta100,
  nonaktifTeks: palet.tinta700,
  kerangka: palet.tinta100,
  sukses: SUKSES.hex,
  suksesLatar: SUKSES.latar as string,
  galat: GALAT.hex,
  galatLatar: GALAT.latar as string,
  transparan: 'transparent',
} as const;

export type PeranWarna = keyof typeof warna;

export type Pasangan = { depan: PeranWarna; latar: PeranWarna; jenis: JenisPasangan; dipakai: string };

/**
 * Semua pasangan depan/latar yang dipakai komponen v2. Tes kontras memeriksa semuanya, dan
 * setiap peran warna yang dipakai komponen harus muncul di sini atau di WARNA_DEKORATIF.
 */
export const PASANGAN: readonly Pasangan[] = [
  { depan: 'teks', latar: 'permukaan', jenis: 'teks', dipakai: 'Teks, Kartu, BarisDaftar, Pilihan' },
  { depan: 'teks', latar: 'halaman', jenis: 'teks', dipakai: 'HeaderLayar, KeadaanKosong, KeadaanGalat' },
  { depan: 'teks', latar: 'permukaanLembut', jenis: 'teks', dipakai: 'Pilihan terpilih' },
  { depan: 'teks', latar: 'brand', jenis: 'teks', dipakai: 'Kartu varian brand' },
  { depan: 'teks', latar: 'suksesLatar', jenis: 'teks', dipakai: 'Pesan sukses' },
  { depan: 'teks', latar: 'galatLatar', jenis: 'teks', dipakai: 'Pesan galat' },
  { depan: 'teksSekunder', latar: 'permukaan', jenis: 'teks', dipakai: 'keterangan di Kartu, BarisDaftar, Pilihan' },
  { depan: 'teksSekunder', latar: 'halaman', jenis: 'teks', dipakai: 'ringkasan HeaderLayar, KeadaanKosong' },
  { depan: 'teksSekunder', latar: 'permukaanLembut', jenis: 'teks', dipakai: 'keterangan Pilihan terpilih' },
  { depan: 'teksSekunder', latar: 'brand', jenis: 'teks', dipakai: 'keterangan Kartu brand' },
  { depan: 'teksPadaAksen', latar: 'aksen', jenis: 'teks', dipakai: 'Tombol utama' },
  { depan: 'teksPadaAksen', latar: 'aksenTekan', jenis: 'teks', dipakai: 'Tombol utama ditekan' },
  { depan: 'aksen', latar: 'permukaan', jenis: 'teks', dipakai: 'Tombol sekunder dan teks, tautan Selengkapnya' },
  { depan: 'aksen', latar: 'halaman', jenis: 'teks', dipakai: 'Tombol teks di atas halaman' },
  { depan: 'aksen', latar: 'permukaanLembut', jenis: 'teks', dipakai: 'Tombol sekunder/teks ditekan' },
  { depan: 'nonaktifTeks', latar: 'nonaktifLatar', jenis: 'teks', dipakai: 'semua kontrol nonaktif' },
  { depan: 'sukses', latar: 'permukaan', jenis: 'teks', dipakai: 'label sukses' },
  { depan: 'sukses', latar: 'halaman', jenis: 'teks', dipakai: 'pesan sukses di atas halaman' },
  { depan: 'sukses', latar: 'suksesLatar', jenis: 'teks', dipakai: 'label dan ikon pesan sukses' },
  { depan: 'galat', latar: 'permukaan', jenis: 'teks', dipakai: 'pesan galat di bawah kontrol' },
  { depan: 'galat', latar: 'halaman', jenis: 'teks', dipakai: 'pesan galat di atas halaman' },
  { depan: 'galat', latar: 'galatLatar', jenis: 'teks', dipakai: 'judul dan ikon KeadaanGalat' },
  { depan: 'garisKontrol', latar: 'permukaan', jenis: 'kontrol', dipakai: 'batas Pilihan, kotak centang' },
  { depan: 'garisKontrol', latar: 'halaman', jenis: 'kontrol', dipakai: 'batas Pilihan di atas halaman' },
  { depan: 'aksen', latar: 'brand', jenis: 'kontrol', dipakai: 'ikon di lingkaran KeadaanKosong' },
  { depan: 'fokus', latar: 'permukaan', jenis: 'kontrol', dipakai: 'cincin fokus' },
  { depan: 'fokus', latar: 'halaman', jenis: 'kontrol', dipakai: 'cincin fokus' },
  { depan: 'fokus', latar: 'permukaanLembut', jenis: 'kontrol', dipakai: 'cincin fokus, batas Pilihan terpilih' },
  { depan: 'galat', latar: 'permukaan', jenis: 'kontrol', dipakai: 'batas kontrol bergalat' },
];

/**
 * Warna yang tidak membawa arti dan tidak membatasi kontrol, jadi tidak wajib 3:1 (WCAG 1.4.11
 * hanya untuk batas yang dibutuhkan untuk mengenali kontrol). Tidak boleh dipakai untuk teks.
 */
export const WARNA_DEKORATIF: Readonly<Partial<Record<PeranWarna, string>>> = {
  garisHalus: 'pemisah dan tepi Kartu; Kartu dikenali dari isinya, bukan garisnya',
  kerangka: 'balok Placeholder memuat; statusnya dibacakan lewat label "Memuat"',
  transparan: 'latar tombol teks',
};
