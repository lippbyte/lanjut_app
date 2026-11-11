/**
 * Berkas salinan data di HP (LANJUT_013 seri v2). JSON ditulis ke folder cache, dibagikan lewat
 * expo-sharing, lalu dibuang sesudah siswa kembali ke aplikasi dan saat keluar akun. Tidak ada
 * batas ukuran di sini; batasnya hanya di server.
 *
 * Modul native dimuat malas, supaya build lama yang belum memuatnya tidak crash, dan `alat` bisa
 * diganti supaya alurnya bisa dites dari server/tests.
 */

export const FOLDER_EKSPOR = 'EksporData';

export type AlatBagikan = {
  tersedia(): Promise<boolean>;
  /** Menulis berkas dan mengembalikan alamatnya. */
  tulis(nama: string, isi: string): string;
  bagikan(uri: string, nama: string): Promise<void>;
  hapusFolder(): void;
};

function muatAlat(): AlatBagikan | null {
  try {
    if (require('react-native').Platform.OS === 'web') return null;
    const { Directory, File, Paths } = require('expo-file-system') as typeof import('expo-file-system');
    const berbagi = require('expo-sharing') as typeof import('expo-sharing');
    const folder = () => new Directory(Paths.cache, FOLDER_EKSPOR);
    return {
      tersedia: () => berbagi.isAvailableAsync(),
      tulis: (nama, isi) => {
        const d = folder();
        d.create({ idempotent: true, intermediates: true });
        const berkas = new File(d, nama);
        berkas.create({ overwrite: true });
        berkas.write(isi);
        return berkas.uri;
      },
      // Janji ini selesai saat siswa kembali ke aplikasi, jadi aplikasi tujuan sudah membaca berkasnya.
      bagikan: (uri, nama) => berbagi.shareAsync(uri, { mimeType: 'application/json', UTI: 'public.json', dialogTitle: nama }),
      hapusFolder: () => {
        const d = folder();
        if (d.exists) d.delete();
      },
    };
  } catch {
    return null;
  }
}

/** Kegagalan menulis atau membagikan dilempar ke pemanggil; berkasnya tetap dibuang. */
export async function bagikanEkspor(
  nama: string,
  isi: string,
  alat: AlatBagikan | null = muatAlat()
): Promise<'ok' | 'tidak_tersedia'> {
  if (!alat || !(await alat.tersedia())) return 'tidak_tersedia';
  // Sisa unduhan sebelumnya, bila aplikasi sempat tertutup di tengah jalan.
  alat.hapusFolder();
  try {
    await alat.bagikan(alat.tulis(nama, isi), nama);
  } finally {
    hapusEksporSementara(alat);
  }
  return 'ok';
}

/** Tidak pernah melempar: kegagalan membersihkan tidak boleh menahan siswa keluar akun. */
export function hapusEksporSementara(alat: AlatBagikan | null = muatAlat()): void {
  if (!alat) return;
  try {
    alat.hapusFolder();
  } catch {
    // Folder cache tetap dibersihkan sistem saat ruang penyimpanan menipis.
  }
}
