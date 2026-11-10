/**
 * Memilih dan menyiapkan foto di HP (LANJUT_011 seri v2). Semua foto dikodekan ulang menjadi JPEG,
 * jadi HEIC/HEIF ikut terkonversi dan yang terkirim tidak pernah berkas aslinya.
 *
 * Modul native dimuat malas, seperti pemilih berkas di lib/modul.ts: build lama yang belum
 * memuatnya menjawab 'tidak tersedia', bukan crash. `alat` bisa diganti supaya alurnya bisa dites.
 */
import { hapusBerkasSementara } from './fotoSementara';
import { BATAS_FOTO, adalahHeic, rencanaUkuran } from './portofolio';

export type SumberFoto = 'galeri' | 'kamera';

export type FotoSiap = { uri: string; nama: string; mime: string; ukuran: number; blob?: Blob };

export type HasilFoto =
  | { status: 'batal' }
  | { status: 'izin_ditolak'; bisaTanyaLagi: boolean }
  | { status: 'gagal'; kode: string }
  | { status: 'siap'; foto: FotoSiap };

type Aset = { uri: string; width: number; height: number; mimeType?: string | null; fileName?: string | null };
type HasilPemilih = { canceled: boolean; assets: Aset[] | null };
type OpsiPemilih = { mediaTypes: 'images'[]; quality: number; exif: boolean; allowsMultipleSelection: boolean };
type RefGambar = { width: number; height: number; saveAsync(o: { format: string; compress: number }): Promise<{ uri: string }> };
type KonteksGambar = { resize(u: { width?: number; height?: number }): unknown; renderAsync(): Promise<RefGambar> };

export type AlatFoto = {
  web: boolean;
  bukaGaleri(o: OpsiPemilih): Promise<HasilPemilih>;
  bukaKamera(o: OpsiPemilih): Promise<HasilPemilih>;
  mintaIzinKamera(): Promise<{ granted: boolean; canAskAgain: boolean }>;
  olah(uri: string): KonteksGambar;
  formatJpeg: string;
  ukuran(uri: string): Promise<{ ukuran: number; blob?: Blob }>;
};

function muatAlat(): AlatFoto | null {
  try {
    const web = require('react-native').Platform.OS === 'web';
    const pemilih = require('expo-image-picker') as typeof import('expo-image-picker');
    const pengolah = require('expo-image-manipulator') as typeof import('expo-image-manipulator');
    return {
      web,
      bukaGaleri: (o) => pemilih.launchImageLibraryAsync(o) as Promise<HasilPemilih>,
      bukaKamera: (o) => pemilih.launchCameraAsync(o) as Promise<HasilPemilih>,
      mintaIzinKamera: () => pemilih.requestCameraPermissionsAsync(),
      olah: (uri) => pengolah.ImageManipulator.manipulate(uri) as unknown as KonteksGambar,
      formatJpeg: pengolah.SaveFormat.JPEG,
      ukuran: async (uri) => {
        if (web) {
          const blob = await (await fetch(uri)).blob();
          return { ukuran: blob.size, blob };
        }
        const { File } = require('expo-file-system') as typeof import('expo-file-system');
        return { ukuran: new File(uri).size };
      },
    };
  } catch {
    return null;
  }
}

const OPSI_PEMILIH: OpsiPemilih = { mediaTypes: ['images'], quality: 1, exif: false, allowsMultipleSelection: false };

/** `saatDipilih` dipanggil setelah foto dipilih dan sebelum diolah, untuk tanda "menyiapkan". */
export async function siapkanFoto(
  sumber: SumberFoto,
  saatDipilih?: () => void,
  alat: AlatFoto | null = muatAlat()
): Promise<HasilFoto> {
  if (!alat) return { status: 'gagal', kode: 'PEMILIH_TIDAK_TERSEDIA' };

  let hasil: HasilPemilih;
  try {
    if (sumber === 'kamera') {
      const izin = await alat.mintaIzinKamera();
      if (!izin.granted) return { status: 'izin_ditolak', bisaTanyaLagi: izin.canAskAgain };
      hasil = await alat.bukaKamera(OPSI_PEMILIH);
    } else {
      hasil = await alat.bukaGaleri(OPSI_PEMILIH);
    }
  } catch {
    return { status: 'gagal', kode: 'FOTO_RUSAK' };
  }
  const aset = hasil.assets?.[0];
  if (hasil.canceled || !aset) return { status: 'batal' };
  saatDipilih?.();

  let uriHasil: string;
  try {
    const konteks = alat.olah(aset.uri);
    let { width: lebar, height: tinggi } = aset;
    // Sistem kadang tidak memberi ukuran. Gambarnya dibuka dulu supaya tetap bisa diperkecil.
    if (!lebar || !tinggi) {
      const awal = await konteks.renderAsync();
      lebar = awal.width;
      tinggi = awal.height;
    }
    const ukuranBaru = rencanaUkuran(lebar, tinggi);
    if (ukuranBaru) konteks.resize(ukuranBaru);
    const gambar = await konteks.renderAsync();
    uriHasil = (await gambar.saveAsync({ format: alat.formatJpeg, compress: BATAS_FOTO.kualitas })).uri;
  } catch {
    return { status: 'gagal', kode: alat.web && adalahHeic(aset) ? 'FOTO_HEIC_PERAMBAN' : 'FOTO_RUSAK' };
  } finally {
    hapusBerkasSementara(aset.uri);
  }

  try {
    const { ukuran, blob } = await alat.ukuran(uriHasil);
    if (ukuran > BATAS_FOTO.ukuranByte) {
      hapusBerkasSementara(uriHasil);
      return { status: 'gagal', kode: 'FOTO_TERLALU_BESAR' };
    }
    return { status: 'siap', foto: { uri: uriHasil, nama: 'foto.jpg', mime: 'image/jpeg', ukuran, blob } };
  } catch {
    hapusBerkasSementara(uriHasil);
    return { status: 'gagal', kode: 'FOTO_RUSAK' };
  }
}
