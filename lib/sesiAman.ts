/**
 * Penyimpanan token sesi (LANJUT_030). Modul murni: tempat simpannya disuntikkan, jadi aturan di
 * bawah bisa dites tanpa HP (server/tests/alur-masuk-v2.test.js). Dipakai api/auth.ts untuk v1
 * maupun v2.
 *
 *   - `aman`: penyimpanan aman perangkat (expo-secure-store; Keychain/Keystore). null di web.
 *   - `lama`: AsyncStorage, tempat token sebelum LANJUT_030 (dan APK 1.0.0).
 *
 * Aturan:
 *   1. Baca dari `aman` dulu. Bila kosong dan token ada di `lama` (sesi dari versi sebelumnya),
 *      salin ke `aman`, pastikan terbaca kembali sama, baru hapus dari `lama`. Sesi tetap berlaku:
 *      siswa tidak perlu masuk ulang.
 *   2. Bila `aman` gagal (dibaca atau ditulis), sesi TIDAK dibuang: token tetap di `lama` dan
 *      kejadiannya dicatat (tanpa token).
 *   3. "Tetap masuk di HP ini" mati: token tidak ditulis ke mana pun dan sisa token lama dihapus.
 *      Sesi hanya hidup di memori proses itu.
 *   4. Hanya token yang disimpan di sini. Kata sandi tidak pernah masuk ke modul ini.
 */

export const KUNCI_TOKEN = 'auth_token';

export type TempatSimpan = {
  ambil(kunci: string): Promise<string | null>;
  simpan(kunci: string, nilai: string): Promise<void>;
  hapus(kunci: string): Promise<void>;
};

/** Pesan catatan sudah tetap: token tidak pernah ikut. */
export const CATATAN = {
  amanTakTerbaca: 'Penyimpanan aman tidak bisa dibaca; memakai penyimpanan lama.',
  pindahGagal: 'Token belum bisa dipindah ke penyimpanan aman; sesi tetap memakai penyimpanan lama.',
  simpanGagal: 'Penyimpanan aman gagal menyimpan; sesi disimpan di penyimpanan lama.',
} as const;

export type Catat = (pesan: (typeof CATATAN)[keyof typeof CATATAN]) => void;

export type HasilBaca = { token: string | null; sumber: 'aman' | 'lama' | 'kosong'; dipindah: boolean };

export async function bacaToken(aman: TempatSimpan | null, lama: TempatSimpan, catat: Catat): Promise<HasilBaca> {
  let amanBisa = !!aman;
  if (aman) {
    try {
      const t = await aman.ambil(KUNCI_TOKEN);
      if (t) return { token: t, sumber: 'aman', dipindah: false };
    } catch {
      amanBisa = false;
      catat(CATATAN.amanTakTerbaca);
    }
  }
  const tLama = await lama.ambil(KUNCI_TOKEN);
  if (!tLama) return { token: null, sumber: 'kosong', dipindah: false };
  if (!aman || !amanBisa) return { token: tLama, sumber: 'lama', dipindah: false };
  try {
    await aman.simpan(KUNCI_TOKEN, tLama);
    if ((await aman.ambil(KUNCI_TOKEN)) !== tLama) throw new Error('tidak terbaca kembali');
  } catch {
    catat(CATATAN.pindahGagal);
    return { token: tLama, sumber: 'lama', dipindah: false };
  }
  await lama.hapus(KUNCI_TOKEN);
  return { token: tLama, sumber: 'aman', dipindah: true };
}

export type HasilSimpan = 'aman' | 'lama' | 'memori';

export async function simpanToken(
  aman: TempatSimpan | null,
  lama: TempatSimpan,
  token: string,
  tetapMasuk: boolean,
  catat: Catat
): Promise<HasilSimpan> {
  if (!tetapMasuk) {
    await hapusToken(aman, lama);
    return 'memori';
  }
  if (aman) {
    try {
      await aman.simpan(KUNCI_TOKEN, token);
      await lama.hapus(KUNCI_TOKEN);
      return 'aman';
    } catch {
      catat(CATATAN.simpanGagal);
    }
  }
  await lama.simpan(KUNCI_TOKEN, token);
  return 'lama';
}

export async function hapusToken(aman: TempatSimpan | null, lama: TempatSimpan): Promise<void> {
  if (aman) {
    try {
      await aman.hapus(KUNCI_TOKEN);
    } catch {
      // Tidak bisa dihapus berarti juga tidak bisa dibaca; yang lama tetap dihapus di bawah.
    }
  }
  await lama.hapus(KUNCI_TOKEN);
}
