import type { TautanNgobrol } from '../api/types';
import { labelJenis } from './eventSekolah';

/**
 * Kartu tautan di bawah jawaban Ngobrol (LANJUT_078). Isinya disusun SERVER dari
 * data akun sendiri (bukan ditulis AI); app hanya memetakan jenis → layar yang
 * sudah ada. Chatbot tidak membuka layar sendiri: siswa yang menekan tombolnya.
 * Paling banyak tiga, satu per jenis; jenis yang tidak dikenal dibuang.
 * Modul murni (tanpa React) supaya bisa dites langsung dari server/tests.
 *
 * TEKS DRAF, belum disetujui Khalifa — salinan-teks-lanjut.md §4.15 (LANJUT_078).
 */
export const TEKS_TAUTAN = {
  label: { modul: 'Modul di Arsip', saran: 'Latihan', event: 'Persiapan Event' },
  tombol: { modul: 'Buka modul', saran: 'Mulai latihan', event: 'Buka Daftar Periksa' },
};

export const TAUTAN_MAKS = 3;
const URUTAN = ['modul', 'saran', 'event'] as const;

export type TujuanTautan =
  | { pathname: '/arsip-modul'; params: { id: string } }
  | { pathname: '/latihan'; params: { mapel: string; asal: 'saran' } }
  | { pathname: '/daftar-periksa' };

export type KartuTautan = { jenis: (typeof URUTAN)[number]; label: string; judul: string; tombol: string; tujuan: TujuanTautan };

function kartu(t: TautanNgobrol): KartuTautan | null {
  switch (t.jenis) {
    case 'modul':
      return t.modul_id
        ? { jenis: 'modul', label: TEKS_TAUTAN.label.modul, judul: t.judul, tombol: TEKS_TAUTAN.tombol.modul, tujuan: { pathname: '/arsip-modul', params: { id: t.modul_id } } }
        : null;
    case 'saran':
      return t.mapel_id
        ? { jenis: 'saran', label: TEKS_TAUTAN.label.saran, judul: t.judul, tombol: TEKS_TAUTAN.tombol.saran, tujuan: { pathname: '/latihan', params: { mapel: t.mapel_id, asal: 'saran' } } }
        : null;
    case 'event': {
      const jenis = labelJenis(t.jenis_event);
      return { jenis: 'event', label: TEKS_TAUTAN.label.event, judul: t.judul ? `${jenis} · ${t.judul}` : jenis, tombol: TEKS_TAUTAN.tombol.event, tujuan: { pathname: '/daftar-periksa' } };
    }
    default:
      return null;
  }
}

/** Kartu siap tampil: urut modul, latihan, event; satu per jenis; paling banyak tiga. */
export function kartuTautan(tautan: readonly TautanNgobrol[] | null | undefined): KartuTautan[] {
  const hasil: KartuTautan[] = [];
  for (const jenis of URUTAN) {
    const t = (tautan ?? []).find((x) => x && x.jenis === jenis);
    const k = t ? kartu(t) : null;
    if (k) hasil.push(k);
  }
  return hasil.slice(0, TAUTAN_MAKS);
}
