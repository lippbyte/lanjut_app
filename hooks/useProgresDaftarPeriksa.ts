import { gabungButirPribadi, hitungProgres } from '../lib/daftarPeriksa';
import { useSesi } from '../providers/AuthProvider';
import { useButirDaftarPeriksa } from './useButirDaftarPeriksa';
import { useButirPribadi } from './useButirPribadi';
import { useKemajuan } from './useKemajuan';
import { useProdi } from './useProdi';
import { useProfilLokal, useSetProfilLokal } from './useProfilLokal';

export type SaringanDaftarPeriksa = {
  kelas: string | null;
  jalur: string | null;
  rumpun: string | null;
  /** Saringan belum lengkap (profil lokal / daftar prodi masih dimuat). */
  isPending?: boolean;
};

/**
 * Kelas, jalur, dan rumpun yang menyaring Daftar Periksa. Kelas pilihan di
 * perangkat mengalahkan kelas akun; jalur hanya ada di perangkat; rumpun
 * diturunkan dari target prodi akun (`prodi.rumpun` di /konten/prodi, sama
 * seperti Pilih Mapel). Dipakai Daftar Periksa, Data Akun, dan Jalur Saya
 * (/cek-posisi) supaya ketiganya menyaring sama persis.
 */
export function useSaringDaftarPeriksa() {
  const { pengguna } = useSesi();
  const profilQuery = useProfilLokal();
  const { mutate: simpanProfil } = useSetProfilLokal();
  const prodiQuery = useProdi();

  const kelas = profilQuery.data?.kelas ?? pengguna?.kelas ?? null;
  const jalur = profilQuery.data?.jalur ?? null;
  const pilih = (ubah: { kelas?: string | null; jalur?: string | null }) => simpanProfil({ kelas, jalur, ...ubah });

  // Tanpa target prodi, atau prodi tak ditemukan / /konten/prodi gagal →
  // tanpa rumpun = hanya butir umum, sama seperti sebelum rumpun ada.
  const prodiImpian = pengguna?.prodi_impian ?? null;
  const rumpun = prodiImpian ? (prodiQuery.data?.find((p) => p.id === prodiImpian)?.rumpun ?? null) : null;
  // Tunggu daftar prodi kalau rumpun bergantung padanya, supaya butir tidak
  // diambil dua kali (tanpa lalu dengan rumpun) dan angka X/Y tidak berkedip.
  const rumpunMemuat = !!prodiImpian && prodiQuery.isPending;

  return { kelas, jalur, rumpun, pilih, isPending: profilQuery.isPending || rumpunMemuat };
}

/**
 * Butir tersaring + butir pribadi + centang akun + X/Y — satu-satunya tempat
 * semuanya digabung, jadi Daftar Periksa, Data Akun, dan Jalur Saya
 * (/cek-posisi) menghitung X/Y yang sama. Tanpa kelas/jalur, atau selama saringan masih
 * dimuat, query butir tidak dijalankan. Terima hasil useSaringDaftarPeriksa()
 * apa adanya.
 */
export function useProgresDaftarPeriksa({ kelas, jalur, rumpun, isPending: saringMemuat }: SaringanDaftarPeriksa) {
  const siap = !!kelas && !!jalur && !saringMemuat;
  const butirQuery = useButirDaftarPeriksa(
    { kelas: kelas ?? undefined, jalur: jalur ?? undefined, rumpun: rumpun ?? undefined },
    siap
  );
  const kemajuanQuery = useKemajuan();
  const pribadiQuery = useButirPribadi();

  const isPending = siap && (butirQuery.isPending || kemajuanQuery.isPending || pribadiQuery.isPending);
  const isError = siap && (butirQuery.isError || kemajuanQuery.isError || pribadiQuery.isError);
  if (!siap || !butirQuery.data || !kemajuanQuery.data || !pribadiQuery.data) {
    return { siap, isPending, isError, data: null };
  }

  const pribadi = pribadiQuery.data;
  const kategori = gabungButirPribadi(butirQuery.data.kategori, pribadi).filter((k) => k.butir.length);
  // DELETE /kemajuan (dan /butir-pribadi/:id/selesai) tidak menghapus baris,
  // hanya mengosongkan selesai_pada.
  const selesai = new Set([
    ...kemajuanQuery.data.filter((k) => k.selesai_pada).map((k) => k.butir_id),
    ...pribadi.filter((b) => b.selesai_pada).map((b) => b.id),
  ]);
  const pribadiIds = new Set(pribadi.map((b) => b.id));
  return {
    siap,
    isPending,
    isError,
    data: { kategori, selesai, pribadiIds, progres: hitungProgres(kategori, selesai) },
  };
}
