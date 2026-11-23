/**
 * Logika murni dan teks mode tampilan v2 (LANJUT_031b, saklar EXPO_PUBLIC_MODE_GELAP, mati bawaan).
 * Modul murni (tanpa React/Expo/theme) supaya dapat diuji langsung dari server/tests.
 *
 * TEKS DRAF — seluruh label di sini tercatat di docs/draf-teks-mode-tampilan-v2.md (belum disetujui).
 * Pilihan disimpan hanya di perangkat (penyimpanan lokal biasa, bukan penyimpanan aman) dan tidak
 * pernah dikirim ke server atau layanan luar.
 */

export type PilihanMode = 'sistem' | 'terang' | 'gelap';
export type ModeAktif = 'terang' | 'gelap';
export type SkemaSistem = 'light' | 'dark' | 'unspecified' | null | undefined;
export type IkonOpsiMode = 'sistem' | 'terang' | 'gelap';

/** Kunci AsyncStorage lokal biasa. Tidak pernah dikirim ke server. */
export const KUNCI_MODE_TAMPILAN = 'lanjut.modeTampilan.v2';

/** Bawaan saat saklar menyala dan pengguna belum memilih apa pun. */
export const PILIHAN_MODE_BAWAAN: PilihanMode = 'sistem';

export type PenyimpananModeLokal = {
  getItem(kunci: string): Promise<string | null>;
  setItem(kunci: string, nilai: string): Promise<void>;
};

export function uraiPilihanMode(nilai: unknown): PilihanMode {
  if (nilai === 'terang' || nilai === 'gelap' || nilai === 'sistem') return nilai;
  return PILIHAN_MODE_BAWAAN;
}

/**
 * Menentukan mode warna aktif (`terang` atau `gelap`):
 * - Saklar mati: selalu `terang`, mengabaikan pilihan dan pengaturan sistem.
 * - Saklar menyala + `terang`/`gelap`: menimpa pengaturan sistem.
 * - Saklar menyala + `sistem`: mengikuti `useColorScheme()`, jatuh ke `terang` bila null/tidak diketahui.
 */
export function tentukanModeAktif(p: {
  saklarAktif: boolean;
  pilihan: PilihanMode;
  skemaSistem: SkemaSistem;
}): ModeAktif {
  if (!p.saklarAktif) return 'terang';
  if (p.pilihan === 'terang') return 'terang';
  if (p.pilihan === 'gelap') return 'gelap';
  return p.skemaSistem === 'dark' ? 'gelap' : 'terang';
}

export async function bacaPilihanMode(penyimpanan: PenyimpananModeLokal): Promise<PilihanMode> {
  try {
    return uraiPilihanMode(await penyimpanan.getItem(KUNCI_MODE_TAMPILAN));
  } catch {
    return PILIHAN_MODE_BAWAAN;
  }
}

export async function simpanPilihanMode(penyimpanan: PenyimpananModeLokal, pilihan: PilihanMode): Promise<void> {
  try {
    await penyimpanan.setItem(KUNCI_MODE_TAMPILAN, uraiPilihanMode(pilihan));
  } catch {
    // Penyimpanan lokal saja; kegagalan menulis tidak menghentikan tampilan.
  }
}

export type OpsiModeTampilan = {
  nilai: PilihanMode;
  label: string;
  ikon: IkonOpsiMode;
};

/** TEKS DRAF — tercatat di docs/draf-teks-mode-tampilan-v2.md (belum disetujui). */
export const TEKS_MODE_TAMPILAN = {
  judul: 'Tampilan',
  ringkasan: 'Pilih tampilan terang, gelap, atau ikuti setelan perangkat.',
  opsi: [
    { nilai: 'sistem', label: 'Ikuti sistem', ikon: 'sistem' },
    { nilai: 'terang', label: 'Terang', ikon: 'terang' },
    { nilai: 'gelap', label: 'Gelap', ikon: 'gelap' },
  ] as readonly OpsiModeTampilan[],
} as const;
