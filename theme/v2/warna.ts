/**
 * Warna tema v2 dua mode: terang dan gelap (LANJUT_029, diperluas LANJUT_031b; sumber kebenaran di
 * docs/desain-token-v2.md). Modul murni (tanpa React/Expo).
 *
 * Dipakai komponen di components/v2, galeri komponen dev, alur masuk v2 (030), dan navigasi v2
 * (031). Warna inti design.md v3.1 tidak diubah. Biru tua, sukses, dan galat terang diputuskan
 * Khalifa 20 Nov 2026; kerangka dua mode (Midnight Navy gelap) diputuskan 23 Nov 2026 (bisa diubah
 * di satu berkas ini). Tidak pernah memakai ungu EDILAKSO.
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

/** Biru tua untuk tombol utama, teks tautan, dan cincin fokus (mode terang). */
export const OPSI_BIRU_TUA: readonly OpsiWarna[] = [
  { kode: 'A', nama: 'Biru baja tua (sudah dipakai v1 sebagai blue600)', hex: '#456A8C' },
  { kode: 'B', nama: 'Biru laut', hex: '#3B5F80' },
  { kode: 'C', nama: 'Biru malam', hex: '#2F5273' },
];

/** Sukses/selesai mode terang (design.md §2.2: hijau lembut, di luar palet biru). */
export const OPSI_SUKSES: readonly OpsiWarna[] = [
  { kode: 'A', nama: 'Hijau toska (sudah dipakai v1 sebagai statusOkFg)', hex: '#2F6B5C', latar: '#E6F2EF' },
  { kode: 'B', nama: 'Hijau daun', hex: '#276749', latar: '#E7F3EC' },
  { kode: 'C', nama: 'Hijau zaitun', hex: '#4A6B2A', latar: '#EEF3E6' },
];

/**
 * Galat murni mode terang (gagal menyimpan, gagal memuat). Bukan untuk tenggat (design.md §2.3 & §8).
 * Tidak ada merah atau oranye terang.
 */
export const OPSI_GALAT: readonly OpsiWarna[] = [
  { kode: 'A', nama: 'Merah bata redup', hex: '#A33A3A', latar: '#FBEDED' },
  { kode: 'B', nama: 'Merah anggur', hex: '#8C2F45', latar: '#F8EBEF' },
  { kode: 'C', nama: 'Plum (bukan merah; wajib selalu dengan ikon dan teks)', hex: '#7B3F6E', latar: '#F5ECF3' },
];

// Satu-satunya tempat pilihan warna terang ini ditentukan (LANJUT_030).
export const BIRU_TUA = OPSI_BIRU_TUA[1]; // KEPUTUSAN 20 NOV, dapat diubah: biru tua B #3B5F80
export const SUKSES = OPSI_SUKSES[1]; // KEPUTUSAN 20 NOV, dapat diubah: sukses B #276749
export const GALAT = OPSI_GALAT[0]; // KEPUTUSAN 20 NOV, dapat diubah: galat A #A33A3A (selalu dengan ikon dan kalimat)

export type ModeTemaAktif = 'terang' | 'gelap';

/**
 * Set warna mode terang (keputusan 20 Nov / 23 Nov 2026). Komponen v2 hanya boleh memakai nama
 * peran di sini lewat `useTemaV2()`, tidak pernah HEX langsung.
 */
export const warnaTerang = {
  halaman: palet.putih, // bg
  permukaan: '#F4F7FB', // surface
  permukaanLembut: palet.biru100,
  brand: palet.biruMuda, // bagianBiru (sekitar 20%)
  teks: '#0C1B33', // text
  teksSekunder: '#5B6B82', // muted (hanya teks pendukung, bukan di atas bagianBiru)
  teksPadaAksen: palet.putih, // onAccent
  aksen: BIRU_TUA.hex, // accent (#3B5F80)
  aksenTekan: OPSI_BIRU_TUA[2].hex, // #2F5273
  garisKontrol: '#5B6B82', // borderKontrol (>= 3:1 terhadap latar)
  garisHalus: '#D9E1EC', // border (dekoratif)
  fokus: BIRU_TUA.hex,
  nonaktifLatar: palet.tinta100,
  nonaktifTeks: palet.tinta700,
  kerangka: palet.tinta100,
  sukses: SUKSES.hex, // #276749
  suksesLatar: SUKSES.latar as string,
  galat: GALAT.hex, // #A33A3A
  galatLatar: GALAT.latar as string,
  // [PERLU DIKONFIRMASI]: penampung sementara wordmark putih di mode terang (#78A4CB).
  badgeLogo: palet.biruBaja,
  transparan: 'transparent',
} as const;

export type PeranWarna = keyof typeof warnaTerang;
export type SetWarnaV2 = Readonly<Record<PeranWarna, string>>;

/**
 * Set warna mode gelap (Midnight Navy, keputusan 23 Nov 2026 + nilai usulan terukur kontrasnya).
 * Semua nama peran identik dengan `warnaTerang`.
 */
export const warnaGelap: SetWarnaV2 = {
  halaman: '#0C1B33', // bg
  permukaan: '#16294A', // surface
  permukaanLembut: '#172B4D', // usulan: permukaan lembut untuk pilihan terpilih (teksSekunder 4,54:1)
  brand: '#16294A', // bagianBiru (sama dengan surface)
  teks: '#EEF1F6', // text
  teksSekunder: '#8793A8', // muted
  teksPadaAksen: '#0C1B33', // onAccent (gelap di atas aksen terang #95BDD7)
  aksen: palet.biruSedang, // accent (#95BDD7, tingkat biru kedua LANJUT)
  aksenTekan: palet.biruMuda, // #B4E1EB
  garisKontrol: '#8793A8', // borderKontrol (>= 3:1 terhadap latar)
  garisHalus: '#2B4268', // border (usulan)
  fokus: palet.biruSedang,
  nonaktifLatar: '#1F3150', // usulan
  nonaktifTeks: '#A6B3C6', // usulan
  kerangka: '#1F3150', // usulan (dekoratif)
  sukses: '#6FCF97', // usulan
  suksesLatar: '#133326', // usulan
  galat: '#F28B82', // usulan
  galatLatar: '#3B1D24', // usulan
  badgeLogo: 'transparent', // wordmark putih tampil langsung di atas bg/surface gelap
  transparan: 'transparent',
} as const;

/** Alias bawaan (mode terang) agar kode murni & tes fondasi 029 tetap konsisten. */
export const warna: SetWarnaV2 = warnaTerang;

/** Peta dua set warna berdasarkan mode aktif. */
export const TEMA_WARNA: Readonly<Record<ModeTemaAktif, SetWarnaV2>> = {
  terang: warnaTerang,
  gelap: warnaGelap,
};

/** Pemetaan nama token ringkas LANJUT_031b ke nama peran di `warnaTerang`/`warnaGelap`. */
export const PETA_TOKEN_SEMANTIK = {
  bg: 'halaman',
  surface: 'permukaan',
  border: 'garisHalus',
  borderKontrol: 'garisKontrol',
  text: 'teks',
  muted: 'teksSekunder',
  accent: 'aksen',
  onAccent: 'teksPadaAksen',
  bagianBiru: 'brand',
  sukses: 'sukses',
  galat: 'galat',
} as const satisfies Record<string, PeranWarna>;

export type Pasangan = { depan: PeranWarna; latar: PeranWarna; jenis: JenisPasangan; dipakai: string };

/**
 * Semua pasangan depan/latar yang dipakai komponen v2 di KEDUA mode (terang dan gelap).
 * Teks di atas `brand` (`bagianBiru`) wajib memakai `teks` (bukan `teksSekunder`).
 * Tes kontras memeriksa semuanya, dan setiap peran warna yang dipakai komponen harus muncul
 * di sini atau di WARNA_DEKORATIF.
 */
export const PASANGAN: readonly Pasangan[] = [
  { depan: 'teks', latar: 'permukaan', jenis: 'teks', dipakai: 'Teks, Kartu, BarisDaftar, Pilihan' },
  { depan: 'teks', latar: 'halaman', jenis: 'teks', dipakai: 'HeaderLayar, KeadaanKosong, KeadaanGalat' },
  { depan: 'teks', latar: 'permukaanLembut', jenis: 'teks', dipakai: 'Pilihan terpilih' },
  { depan: 'teks', latar: 'brand', jenis: 'teks', dipakai: 'Kartu varian brand (judul dan keterangan)' },
  { depan: 'teks', latar: 'suksesLatar', jenis: 'teks', dipakai: 'Pesan sukses' },
  { depan: 'teks', latar: 'galatLatar', jenis: 'teks', dipakai: 'Pesan galat' },
  { depan: 'teksSekunder', latar: 'permukaan', jenis: 'teks', dipakai: 'keterangan di Kartu, BarisDaftar, Pilihan' },
  { depan: 'teksSekunder', latar: 'halaman', jenis: 'teks', dipakai: 'ringkasan HeaderLayar, KeadaanKosong' },
  { depan: 'teksSekunder', latar: 'permukaanLembut', jenis: 'teks', dipakai: 'keterangan Pilihan terpilih' },
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
  { depan: 'garisKontrol', latar: 'permukaan', jenis: 'kontrol', dipakai: 'batas Pilihan, kotak centang, kolom isian' },
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
  badgeLogo: '[PERLU DIKONFIRMASI] penampung sementara wordmark putih di mode terang (logo dikecualikan dari ambang teks)',
  transparan: 'latar tombol sekunder, tombol teks, dan badgeLogo mode gelap',
};
