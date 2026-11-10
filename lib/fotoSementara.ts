/**
 * Berkas foto sementara di perangkat (LANJUT_011 seri v2). Pemilih foto dan pengolah gambar
 * menulis ke folder cache aplikasi, jadi folder itu dibersihkan sesudah unggah dan saat keluar
 * akun. Dipisah dari lib/portofolio.ts supaya AuthProvider tidak membawa teks draf ke bundel.
 */

/** Nama folder dari kode native expo-image-picker dan expo-image-manipulator. */
export const FOLDER_FOTO_SEMENTARA = ['ImagePicker', 'ImageManipulator'] as const;

type Berkas = { exists: boolean; delete(): void };

export type AlatBerkas = {
  Paths: { cache: unknown };
  File: new (uri: string) => Berkas;
  Directory: new (induk: unknown, nama: string) => Berkas;
};

/** Hanya untuk HP. Di peramban tidak ada folder cache yang bisa dijangkau aplikasi. */
function muatAlat(): AlatBerkas | null {
  try {
    if (require('react-native').Platform.OS === 'web') return null;
    return require('expo-file-system') as AlatBerkas;
  } catch {
    return null;
  }
}

/** Tidak pernah melempar: kegagalan membersihkan tidak boleh menahan siswa keluar akun. */
export function hapusFotoSementara(alat: AlatBerkas | null = muatAlat()): void {
  if (!alat) return;
  for (const nama of FOLDER_FOTO_SEMENTARA) {
    try {
      const folder = new alat.Directory(alat.Paths.cache, nama);
      if (folder.exists) folder.delete();
    } catch {
      // Folder cache tetap dibersihkan sistem saat ruang penyimpanan menipis.
    }
  }
}

export function hapusBerkasSementara(uri: string, alat: AlatBerkas | null = muatAlat()): void {
  if (uri.startsWith('blob:')) {
    URL.revokeObjectURL(uri);
    return;
  }
  if (!alat || !uri.startsWith('file:')) return;
  try {
    const berkas = new alat.File(uri);
    if (berkas.exists) berkas.delete();
  } catch {
    // Sama dengan di atas.
  }
}
