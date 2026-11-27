/**
 * Konfigurasi navigasi v2 (LANJUT_031, saklar EXPO_PUBLIC_NAVIGASI_V2, mati bawaan).
 * Modul murni (tanpa React/Expo) supaya susunan tab, tombol kembali, dan keterjangkauan
 * seluruh rute v1 bisa diuji langsung dari server/tests.
 *
 * TEKS DRAF — label tampilan v2 tercatat di docs/draf-teks-navigasi-v2.md (belum disetujui).
 * K47: hanya label tampilan yang berubah. Nama rute, kunci API, tabel, dan saklar tetap.
 *
 * CARA MENGUBAH SUSUNAN TAB:
 * Cukup ubah urutan, tambah, atau hapus butir di `KONFIGURASI_TAB_V2` di bawah ini.
 * Bilah tab (`components/layout/TabBarV2.tsx`) dan pemetaan tab aktif membacanya langsung
 * tanpa perlu membongkar kode layar.
 */
import { judulEksplorasi } from './eksplorasiKampus';
import { navigasiV2Aktif } from './fiturApp';
import type { Kelas } from './jenjang';

export type IdTabV2 = 'arah_saya' | 'jelajah' | 'jejak_waktu' | 'profil_saya';
export type NamaIkonTabV2 = 'arah' | 'jelajah' | 'waktu' | 'profil';
export type KunciSaklarV2 = 'discover' | 'jalurTujuan' | 'portofolio' | 'kelolaDataAkun' | 'alatBelajar';

export type SaklarNavigasiV2 = {
  discover: boolean;
  jalurTujuan: boolean;
  portofolio: boolean;
  kelolaDataAkun?: boolean;
  alatBelajar?: boolean;
};

export type DefinisiTabV2 = {
  id: IdTabV2;
  /** Rute utama yang dibuka tab ini. */
  href: string;
  /** Rute cadangan bila `saklarHref` mati (contoh: Profil Saya memakai /akun saat Discover mati). */
  hrefCadangan?: string;
  /** TEKS DRAF — label yang tampil di bawah ikon tab. */
  label: string;
  ikon: NamaIkonTabV2;
  /** Bila diisi, tab hanya muncul saat saklar ini menyala. */
  saklar?: KunciSaklarV2;
  /** Bila diisi, `href` dipakai saat saklar ini menyala; bila mati, pakai `hrefCadangan`. */
  saklarHref?: KunciSaklarV2;
  /** Tab wajib tidak pernah disembunyikan pada kombinasi saklar apa pun. */
  wajib?: boolean;
};

export type TabV2Aktif = {
  id: IdTabV2;
  href: string;
  label: string;
  ikon: NamaIkonTabV2;
  wajib: boolean;
};

/**
 * Satu-satunya sumber susunan tab bawah v2 (nilai awal LANJUT_031).
 * Rekam Jejak sengaja bukan tab: berada di balik saklar mati (EXPO_PUBLIC_PORTOFOLIO)
 * sehingga dihadirkan sebagai kartu utama di Arah Saya.
 */
export const KONFIGURASI_TAB_V2: readonly DefinisiTabV2[] = [
  { id: 'arah_saya', href: '/arah-saya', label: 'Arah Saya', ikon: 'arah', wajib: true },
  { id: 'jelajah', href: '/discover', label: 'Jelajah', ikon: 'jelajah', saklar: 'discover' },
  { id: 'jejak_waktu', href: '/jejak-waktu', label: 'Jejak Waktu', ikon: 'waktu', wajib: true },
  {
    id: 'profil_saya',
    href: '/discover-profil',
    saklarHref: 'discover',
    hrefCadangan: '/akun',
    label: 'Profil Saya',
    ikon: 'profil',
    wajib: true,
  },
];

/** Jumlah tab wajib minimal yang selalu tampil pada kombinasi saklar apa pun. */
export const JUMLAH_TAB_WAJIB = KONFIGURASI_TAB_V2.filter((t) => t.wajib).length;

/** Daftar tab yang aktif berdasarkan kombinasi saklar; tidak pernah mengandung celah kosong. */
export function daftarTabV2(saklar: SaklarNavigasiV2): TabV2Aktif[] {
  const hasil: TabV2Aktif[] = [];
  for (const t of KONFIGURASI_TAB_V2) {
    if (t.saklar && !saklar[t.saklar]) continue;
    const href = t.saklarHref && !saklar[t.saklarHref] && t.hrefCadangan ? t.hrefCadangan : t.href;
    hasil.push({ id: t.id, href, label: t.label, ikon: t.ikon, wajib: Boolean(t.wajib) });
  }
  return hasil;
}

/** Rute awal sesudah pengguna masuk: `/arah-saya` saat v2 menyala, `/linimasa` saat v1. */
export function ruteAwalApp(extra: unknown): '/arah-saya' | '/linimasa' {
  return navigasiV2Aktif(extra) ? '/arah-saya' : '/linimasa';
}

export type AlatBelajarV2 = {
  id: string;
  /** Nama v1 yang sudah ada (tidak diubah, LANJUT_031 §2). */
  label: string;
  href: string;
};

/**
 * Fitur Level-In dan fitur v1 lain yang tetap bisa dijangkau dari bagian lipat "Alat belajar"
 * di Arah Saya. Isi dan logika Level-In tidak disentuh (K33).
 */
export const ALAT_BELAJAR_V2: readonly AlatBelajarV2[] = [
  { id: 'arsip', label: 'Arsip Belajar', href: '/arsip' },
  { id: 'latihan', label: 'Latihan', href: '/latihan' },
  { id: 'level-in', label: 'Level-In', href: '/level-in' },
  { id: 'ngobrol', label: 'Ngobrol Bareng LANJUT', href: '/ngobrol' },
  { id: 'jenjang-saya', label: 'Jenjang Saya', href: '/jenjang-saya' },
  { id: 'pilih-mapel', label: 'Pilih Mapel', href: '/pilih-mapel' },
  { id: 'eksplorasi-tujuan', label: 'Eksplorasi Kampus', href: '/eksplorasi-tujuan' },
  { id: 'cek-posisi', label: 'Cek Posisi', href: '/cek-posisi' },
  { id: 'gaya-belajar', label: 'Gaya Belajar', href: '/gaya-belajar' },
  { id: 'cerita-alumni', label: 'Cerita Alumni', href: '/cerita-alumni' },
];

export type PintuTabV2 = {
  /** Rute tab tempat pintu sekunder ini tampil di shell v2. */
  diRute: string;
  /** Rute tujuan saat diketuk. */
  keHref: string;
  /** TEKS DRAF — label pintu. */
  label: string;
};

/** Pintu tambahan yang disediakan shell v2 pada layar tab tanpa mengubah layar v1. */
export const PINTU_TAB_V2: readonly PintuTabV2[] = [
  { diRute: '/jejak-waktu', keHref: '/langkah-saya', label: 'Langkah Saya' },
  { diRute: '/discover-profil', keHref: '/akun', label: 'Akun & Privasi' },
];

/**
 * Judul bilah atas untuk layar anak di v2 (TEKS DRAF untuk label v2 K47; layar v1 lain memakai
 * nama yang sudah ada). Layar yang sedang menjadi tab aktif tidak mendapat bilah kembali.
 */
export const JUDUL_ANAK_V2: Readonly<Record<string, string>> = {
  '/langkah-saya': 'Langkah Saya',
  '/daftar-periksa': 'Langkah Saya',
  '/jalur-tujuan': 'Jalur Saya',
  '/jalur-tujuan-tulis': 'Tulis Tujuan',
  '/portofolio': 'Rekam Jejak',
  '/portofolio-tulis': 'Tulis Catatan',
  '/portofolio-butir': 'Catatan',
  '/discover': 'Jelajah',
  '/discover-refleksi': 'Tulis Refleksi',
  '/discover-profil': 'Profil Saya',
  '/akun': 'Akun & Privasi',
  '/hapus-akun': 'Hapus Akun',
  '/terima-kebijakan': 'Kebijakan Privasi',
  '/persetujuan-ortu': 'Persetujuan Orang Tua/Wali',
  '/arsip': 'Arsip Belajar',
  '/arsip-kartu': 'Kartu',
  '/arsip-tulis': 'Tulis Kartu',
  '/arsip-modul': 'Modul',
  '/arsip-modul-unggah': 'Unggah Modul',
  '/latihan': 'Latihan',
  '/latihan-riwayat': 'Riwayat Latihan',
  '/level-in': 'Level-In',
  '/ngobrol': 'Ngobrol Bareng LANJUT',
  '/jenjang-saya': 'Jenjang Saya',
  '/pilih-mapel': 'Pilih Mapel',
  '/eksplorasi-tujuan': 'Eksplorasi Kampus',
  '/cek-posisi': 'Cek Posisi',
  '/gaya-belajar': 'Gaya Belajar',
  '/cerita-alumni': 'Cerita Alumni',
};

/** Tab induk untuk setiap rute dalam sesi. */
const TAB_INDUK_V2: Readonly<Record<string, IdTabV2>> = {
  '/arah-saya': 'arah_saya',
  '/discover': 'jelajah',
  '/discover-refleksi': 'jelajah',
  '/jejak-waktu': 'jejak_waktu',
  '/langkah-saya': 'jejak_waktu',
  '/linimasa': 'jejak_waktu',
  '/discover-profil': 'profil_saya',
  '/akun': 'profil_saya',
  '/hapus-akun': 'profil_saya',
  '/terima-kebijakan': 'profil_saya',
};

export function adalahRuteTab(pathname: string, tabs: readonly TabV2Aktif[]): boolean {
  return tabs.some((t) => t.href === pathname);
}

/** Menentukan tab yang aktif untuk `pathname`. */
export function tabAktifV2(pathname: string, tabs: readonly TabV2Aktif[]): IdTabV2 | null {
  const langsung = tabs.find((t) => t.href === pathname);
  if (langsung) return langsung.id;
  const induk = TAB_INDUK_V2[pathname] ?? 'arah_saya';
  return tabs.some((t) => t.id === induk) ? induk : (tabs[0]?.id ?? null);
}

/** Judul bilah kembali bila `pathname` adalah halaman anak; null bila sedang di tab utama. */
export function judulHalamanAnakV2(
  pathname: string,
  kelas: Kelas | null | undefined,
  tabs: readonly TabV2Aktif[]
): string | null {
  if (adalahRuteTab(pathname, tabs)) return null;
  if (pathname === '/eksplorasi-tujuan') return judulEksplorasi(kelas);
  return JUDUL_ANAK_V2[pathname] ?? null;
}

export type AksiKembaliV2 =
  | { aksi: 'keluar' }
  | { aksi: 'kembali' }
  | { aksi: 'ganti'; href: string };

/**
 * Perilaku tombol kembali (Android & bilah atas) agar wajar dan bebas perulangan antar-tab:
 * - Di tab pertama (`tabs[0]`): keluar aplikasi seperti biasa (`keluar`).
 * - Di tab lain: pindah sekali ke tab pertama (`ganti` ke `tabs[0].href`), bukan bolak-balik tab.
 * - Di layar anak: kembali ke layar asal bila riwayat ada, atau ke tab induknya.
 */
export function tujuanKembaliV2(p: {
  pathname: string;
  canGoBack: boolean;
  tabs: readonly TabV2Aktif[];
  dariBilahAtas?: boolean;
}): AksiKembaliV2 {
  const pertama = p.tabs[0]?.href ?? '/arah-saya';
  if (!p.dariBilahAtas && adalahRuteTab(p.pathname, p.tabs)) {
    if (p.pathname === pertama) return { aksi: 'keluar' };
    return { aksi: 'ganti', href: pertama };
  }
  if (p.canGoBack) return { aksi: 'kembali' };
  const indukId = tabAktifV2(p.pathname, p.tabs);
  const indukHref = p.tabs.find((t) => t.id === indukId)?.href ?? pertama;
  return { aksi: 'ganti', href: indukHref };
}

/**
 * Peta tepi anak dari setiap layar (terverifikasi terhadap kode layar masing-masing).
 * Dipakai oleh tes keterjangkauan untuk membuktikan tidak ada rute v1 yang hilang di v2.
 */
export const RUTE_ANAK_DARI_LAYAR: Readonly<Record<string, readonly { href: string; saklar?: KunciSaklarV2 }[]>> = {
  '/discover': [
    { href: '/discover-refleksi', saklar: 'discover' },
    { href: '/discover-profil', saklar: 'discover' },
  ],
  '/jalur-tujuan': [{ href: '/jalur-tujuan-tulis', saklar: 'jalurTujuan' }],
  '/portofolio': [
    { href: '/portofolio-tulis', saklar: 'portofolio' },
    { href: '/portofolio-butir', saklar: 'portofolio' },
  ],
  '/akun': [
    { href: '/hapus-akun', saklar: 'kelolaDataAkun' },
    { href: '/terima-kebijakan' },
    { href: '/kebijakan-privasi' },
    { href: '/cek-posisi', saklar: 'alatBelajar' },
  ],
  '/arsip': [
    { href: '/arsip-tulis' },
    { href: '/arsip-kartu' },
    { href: '/arsip-modul' },
    { href: '/arsip-modul-unggah' },
    { href: '/latihan' },
    { href: '/latihan-riwayat' },
  ],
  '/latihan': [{ href: '/latihan-riwayat' }],
  '/level-in': [{ href: '/latihan' }],
  '/ngobrol': [{ href: '/persetujuan-ortu' }, { href: '/terima-kebijakan' }],
  '/jenjang-saya': [
    { href: '/pilih-mapel' },
    { href: '/eksplorasi-tujuan' },
    { href: '/gaya-belajar' },
    { href: '/khusus-smk' },
  ],
  '/pilih-mapel': [{ href: '/eksplorasi-tujuan' }],
  '/jejak-waktu': [{ href: '/langkah-saya' }],
  '/langkah-saya': [
    { href: '/pilih-mapel', saklar: 'alatBelajar' },
    { href: '/eksplorasi-tujuan', saklar: 'alatBelajar' },
    { href: '/arsip-kartu', saklar: 'alatBelajar' },
  ],
};

/**
 * Daftar 17 rute v1 "Alat belajar" (10 rute utama di `ALAT_BELAJAR_V2` + 7 rute anak/alias)
 * yang disembunyikan dari antarmuka v2 saat `EXPO_PUBLIC_ALAT_BELAJAR` mati (LANJUT_040).
 * Rute pengecualian (`/terima-kebijakan`, `/kebijakan-privasi`, `/linimasa`, `/daftar-periksa`,
 * serta seluruh rute v2) TIDAK masuk daftar ini sehingga tetap bisa dibuka langsung.
 */
export const RUTE_ALAT_BELAJAR_TERTUTUP: readonly string[] = [
  '/arsip',
  '/arsip-tulis',
  '/arsip-kartu',
  '/arsip-modul',
  '/arsip-modul-unggah',
  '/latihan',
  '/latihan-riwayat',
  '/level-in',
  '/ngobrol',
  '/persetujuan-ortu',
  '/jenjang-saya',
  '/khusus-smk',
  '/pilih-mapel',
  '/eksplorasi-tujuan',
  '/cek-posisi',
  '/gaya-belajar',
  '/cerita-alumni',
];

const SET_ALAT_BELAJAR_TERTUTUP = new Set<string>(RUTE_ALAT_BELAJAR_TERTUTUP);

/**
 * Menentukan apakah `pathname` di dalam `AppShellV2` (hanya saat `EXPO_PUBLIC_NAVIGASI_V2=1`)
 * termasuk rute Alat belajar v1 yang sedang disembunyikan karena `EXPO_PUBLIC_ALAT_BELAJAR` mati.
 * Bila `true`, `AppShellV2` mengalihkan siswa dengan ramah ke `/arah-saya`.
 */
export function ruteAlatBelajarTertutup(pathname: string, alatBelajar: boolean | undefined): boolean {
  if (alatBelajar) return false;
  const bersih = pathname.split('?')[0].replace(/\/+$/, '') || '/';
  return SET_ALAT_BELAJAR_TERTUTUP.has(bersih);
}

/**
 * Daftar 18 rute v1 aktif yang tetap dapat dijangkau di dalam `AppShellV2` (audit LANJUT_038).
 * Dari daftar ini, `/terima-kebijakan` memiliki tampilan dua mode v2 (`TerimaKebijakanV2`),
 * sedangkan 17 rute lainnya merender layar v1 di atas wadah permukaan terang saat mode gelap.
 */
export const RUTE_V1_DI_SHELL_V2: readonly string[] = [
  '/arsip',
  '/arsip-tulis',
  '/arsip-kartu',
  '/arsip-modul',
  '/arsip-modul-unggah',
  '/latihan',
  '/latihan-riwayat',
  '/level-in',
  '/ngobrol',
  '/persetujuan-ortu',
  '/jenjang-saya',
  '/khusus-smk',
  '/pilih-mapel',
  '/eksplorasi-tujuan',
  '/cek-posisi',
  '/gaya-belajar',
  '/cerita-alumni',
  '/terima-kebijakan',
];

/**
 * Menentukan apakah `pathname` di dalam `AppShellV2` sedang merender layar v1 yang membutuhkan
 * wadah permukaan terang saat mode gelap agar seluruh teks v1 tetap terbaca (kontras >= 4,5:1).
 * Rute v2 (dan `/terima-kebijakan` yang memakai `TerimaKebijakanV2`) mengembalikan `false`.
 */
export function butuhWadahTerangV1(pathname: string, saklar: SaklarNavigasiV2): boolean {
  if (
    pathname === '/arah-saya' ||
    pathname === '/jejak-waktu' ||
    pathname === '/langkah-saya' ||
    pathname === '/terima-kebijakan'
  ) {
    return false;
  }
  if (pathname === '/jalur-tujuan' || pathname === '/jalur-tujuan-tulis') return !saklar.jalurTujuan;
  if (pathname === '/discover' || pathname === '/discover-refleksi' || pathname === '/discover-profil') {
    return !saklar.discover;
  }
  if (pathname === '/portofolio' || pathname === '/portofolio-tulis' || pathname === '/portofolio-butir') {
    return !saklar.portofolio;
  }
  if (pathname === '/akun' || pathname === '/hapus-akun') return !saklar.kelolaDataAkun;
  return true;
}

/**
 * Daftar eksplisit rute v1 yang sengaja digantikan oleh layar v2 baru saat `EXPO_PUBLIC_NAVIGASI_V2=1`
 * (LANJUT_032 §4 & §5). Tidak pernah disembunyikan diam-diam: setiap rute punya pengganti v2 dan alasan,
 * serta tetap utuh saat saklar v2 mati.
 */
export const RUTE_V1_DIGANTIKAN_V2: Readonly<
  Record<string, { digantikanOleh: readonly string[]; alasan: string }>
> = {
  '/linimasa': {
    digantikanOleh: ['/arah-saya', '/jejak-waktu'],
    alasan:
      'Di v1 /linimasa adalah Beranda v1; di v2 peran beranda digantikan oleh /arah-saya dan tab Jejak Waktu membuka layar khusus /jejak-waktu. Rute /linimasa tetap utuh untuk v1 saat saklar mati.',
  },
  '/daftar-periksa': {
    digantikanOleh: ['/langkah-saya'],
    alasan:
      'Di v2 daftar periksa di-reskin menjadi layar Langkah Saya (/langkah-saya) dengan perilaku data identik (kemajuan_pengguna, butir_pribadi, event_sekolah SMP). Rute /daftar-periksa tetap utuh untuk v1 saat saklar mati.',
  },
};

/**
 * Menghitung himpunan seluruh rute dalam sesi yang dapat dijangkau di navigasi v2
 * untuk kombinasi saklar tertentu (tab + pintu Arah Saya + Alat belajar + pintu tab + rute anak).
 */
export function ruteTerjangkauV2(saklar: SaklarNavigasiV2, pintuArahSaya: readonly { href: string }[]): Set<string> {
  const terlihat = new Set<string>();
  const antre: string[] = [];
  const tambah = (href: string) => {
    if (!terlihat.has(href)) {
      terlihat.add(href);
      antre.push(href);
    }
  };

  for (const t of daftarTabV2(saklar)) tambah(t.href);
  if (terlihat.has('/arah-saya')) {
    for (const p of pintuArahSaya) tambah(p.href);
    if (saklar.alatBelajar) {
      for (const a of ALAT_BELAJAR_V2) tambah(a.href);
    }
  }

  while (antre.length > 0) {
    const kini = antre.shift()!;
    for (const p of PINTU_TAB_V2) {
      if (p.diRute === kini) tambah(p.keHref);
    }
    for (const anak of RUTE_ANAK_DARI_LAYAR[kini] ?? []) {
      if (anak.saklar && !saklar[anak.saklar]) continue;
      tambah(anak.href);
    }
  }
  return terlihat;
}
