import { hitungPosisi, type Kebingungan, type Tenggat } from '../lib/cekPosisi';
import { ringkasPersiapanUjian } from '../lib/kesiapanUjian';
import { tanggalMomen, turunkanLinimasa } from '../lib/linimasa';
import { BUTIR_MAPEL_TKA } from '../lib/pilihMapel';
import { useSesi } from '../providers/AuthProvider';
import { useKemajuan } from './useKemajuan';
import { useProgresDaftarPeriksa, useSaringDaftarPeriksa } from './useProgresDaftarPeriksa';
import { useTahapanLinimasa } from './useTahapanLinimasa';

/**
 * Jalur Saya (/cek-posisi, LANJUT_074) — menggabungkan sinyal yang app sudah punya: prodi impian
 * dari akun, centang `mapel-tka`, progres Daftar Periksa (hitungan yang
 * sama dengan Data Akun), dan tenggat Linimasa terdekat (tenggat yang sama
 * dengan Beranda). Galat pemuatan tidak menghentikan hasil: sinyal yang
 * gagal dianggap belum ada, jadi user baru tetap dapat tahap awal.
 * `ujian`: ringkasan kategori Persiapan Ujian dari butir yang sama (lib/kesiapanUjian.ts).
 */
export function usePosisi(kebingungan: Kebingungan | null) {
  const { pengguna } = useSesi();
  const saring = useSaringDaftarPeriksa();
  const hasil = useProgresDaftarPeriksa(saring);
  const kemajuanQuery = useKemajuan();
  const linimasaQuery = useTahapanLinimasa();

  const isPending = saring.isPending || hasil.isPending || kemajuanQuery.isPending || linimasaQuery.isPending;
  const mapelTkaSelesai = !!kemajuanQuery.data?.some((k) => k.butir_id === BUTIR_MAPEL_TKA && k.selesai_pada);
  const progres = hasil.data ? hasil.data.progres : null;

  const posisi = hitungPosisi(
    { adaProdi: !!pengguna?.prodi_impian, mapelTkaSelesai, progres, tenggat: tenggatDari(linimasaQuery.data) },
    kebingungan
  );
  const ujian = ringkasPersiapanUjian(hasil.data?.kategori ?? [], hasil.data?.selesai ?? new Set());
  return { isPending, posisi, ujian };
}

// turunkanLinimasa membuang tahapan yang belum terverifikasi (diperiksa_pada
// null), jadi tanggal yang belum dicek ke laman resmi tidak pernah muncul.
function tenggatDari(data: Parameters<typeof turunkanLinimasa>[0] | undefined): Tenggat | null {
  const { terdekat, sisaHari, momen } = turunkanLinimasa(data ?? []);
  if (!terdekat || !momen || sisaHari === null || sisaHari < 0) return null;
  return { judul: terdekat.judul, sisaHari, tanggal: tanggalMomen(terdekat, momen), momen };
}
