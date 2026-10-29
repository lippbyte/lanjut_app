import type { ButirDaftarPeriksa, ButirPribadi, KategoriDaftarPeriksa } from '../api/types';
import { KATEGORI_PERSIAPAN_UJIAN, TEKS_KESIAPAN } from './kesiapanUjian';

/**
 * F5 — Daftar Periksa (docs/prd-sdd-lanjut.md Bagian 6 & 13). Logika murni
 * dipisah dari komponen, mengikuti pola lib/linimasa.ts & lib/pilihMapel.ts.
 */

export type StatusProgres = 'kosong' | 'berjalan' | 'selesai';

export type Progres = {
  selesai: number;
  total: number;
  status: StatusProgres;
};

/**
 * X/Y dihitung dari `kategori` (data asli hasil fetch), bukan dari
 * `total_butir` yang dikirim API maupun angka tetap — supaya benar untuk
 * kombinasi kelas/jalur apa pun, termasuk saat berkasnya berubah.
 */
export function hitungProgres(kategori: KategoriDaftarPeriksa[], selesaiIds: ReadonlySet<string>): Progres {
  let total = 0;
  let selesai = 0;

  for (const k of kategori) {
    for (const b of k.butir) {
      total += 1;
      if (selesaiIds.has(b.id)) selesai += 1;
    }
  }

  const status: StatusProgres = total === 0 || selesai === 0 ? 'kosong' : selesai === total ? 'selesai' : 'berjalan';

  return { selesai, total, status };
}

/**
 * Kategori berisi saran tim LANJUT, bukan isi laman resmi (15 Okt 2026, belum
 * disetujui PM): punya catatan sendiri di bawah judulnya dan tidak memicu catatan
 * "Perlu dicek ke laman resmi SNPMB".
 */
export const CATATAN_KATEGORI: Readonly<Record<string, string>> = {
  [KATEGORI_PERSIAPAN_UJIAN]: TEKS_KESIAPAN.catatanKategori,
};

/** Catatan "Perlu dicek ke laman resmi SNPMB · belum diverifikasi" tampil? Butir pribadi dan kategori saran tidak dihitung. */
export function perluCatatanSnpmb(kategori: readonly KategoriDaftarPeriksa[], pribadiIds: ReadonlySet<string>): boolean {
  return kategori.some(
    (k) => !(k.id in CATATAN_KATEGORI) && k.butir.some((b) => !pribadiIds.has(b.id) && !b.diperiksa_pada)
  );
}

// Butir pribadi diletakkan sesudah butir umum di kategorinya, dan kategori
// yang tidak ada di butir umum (mis. "Riset Kampus") di akhir daftar.
const URUTAN_PRIBADI = 1000;

/**
 * Butir milik akun (LANJUT_034) digabung ke butir umum — padanan PWA
 * pasangChecklist() + ChecklistTambahan. Butir pribadi tidak disaring kelas,
 * jalur, atau rumpun: siswa sendiri yang menyimpannya. Masukan tidak diubah.
 */
export function gabungButirPribadi(kategori: KategoriDaftarPeriksa[], pribadi: ButirPribadi[]): KategoriDaftarPeriksa[] {
  const hasil = kategori.map((k) => ({ ...k, butir: [...k.butir] }));
  pribadi.forEach((p, i) => {
    const butir: ButirDaftarPeriksa = {
      id: p.id,
      judul: p.judul,
      urutan: URUTAN_PRIBADI + i,
      berlaku_untuk_kelas: [],
      berlaku_untuk_jalur: [],
      sumber: 'pengguna',
      pemilik: 'pengguna',
      status_verifikasi: 'belum_diverifikasi',
      asal: 'pengguna',
      url_sumber: null,
      diperiksa_pada: null,
    };
    let k = hasil.find((x) => x.id === p.kategori_id);
    if (!k) {
      k = { id: p.kategori_id, nama: p.kategori_nama, urutan: URUTAN_PRIBADI + i, butir: [] };
      hasil.push(k);
    }
    k.butir.push(butir);
  });
  return hasil;
}
