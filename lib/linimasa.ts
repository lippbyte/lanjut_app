import type { TahapanLinimasa } from '../api/types';
import { kelompokJenjang, type Kelas } from './jenjang';

export type StatusTahapan = 'done' | 'soon' | 'idle';

export type TahapanTurunan = TahapanLinimasa & { status: StatusTahapan };

/**
 * Tanggal yang dihitung mundur untuk tenggat terdekat: 'mulai' bila
 * tahapannya belum dimulai (mis. "Pelaksanaan TKA dimulai 26 Oktober"),
 * 'selesai' bila sudah berjalan (mis. "Pendaftaran … ditutup 27 September").
 */
export type Momen = 'mulai' | 'selesai';

export type LinimasaTerkini = {
  butir: TahapanTurunan[];
  terdekat: TahapanTurunan | null;
  /** Hari menuju `momen` tenggat terdekat. null kalau tidak ada tahapan
   * mendatang — bukan angka negatif. */
  sisaHari: number | null;
  momen: Momen | null;
};

/** "YYYY-MM-DD" → tengah malam UTC (ms), NaN bila tidak terbaca. Diekspor untuk banner Beranda (LANJUT_073). */
export function uraiTanggal(iso: string | null | undefined): number {
  if (typeof iso !== 'string') return NaN;
  const bagian = iso.slice(0, 10).split('-').map(Number);
  if (bagian.length !== 3 || bagian.some((n) => Number.isNaN(n))) return NaN;
  const [tahun, bulan, tanggal] = bagian;
  return Date.UTC(tahun, bulan - 1, tanggal);
}

// Asia/Jakarta (WIB) = UTC+7 tetap, tanpa waktu musim panas.
const SELISIH_WIB_MS = 7 * 60 * 60 * 1000;

/**
 * Tanggal hari ini di Asia/Jakarta, sebagai tengah malam UTC — skala yang sama
 * dengan `uraiTanggal` (LANJUT_072b). Tidak bergantung pada zona waktu perangkat:
 * hanya memakai getter UTC, tanpa Intl. Satu-satunya sumber "hari ini" untuk
 * kartu tenggat, Info Penting, dan Jalur Saya /cek-posisi (lewat turunkanLinimasa).
 */
export function hariIniWib(sekarangMs: number = Date.now()): number {
  const wib = new Date(sekarangMs + SELISIH_WIB_MS);
  return Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate());
}

function tanggalTeks(ms: number, opsi: Intl.DateTimeFormatOptions): string {
  try {
    return new Intl.DateTimeFormat('id-ID', { ...opsi, timeZone: 'UTC' }).format(new Date(ms));
  } catch {
    return '';
  }
}

/** "27 September 2026" — tanggal per butir & tanggal pengecekan (diperiksa_pada). */
export function formatTanggal(iso: string | null | undefined): string {
  const t = uraiTanggal(iso);
  return Number.isNaN(t) ? '' : tanggalTeks(t, { day: 'numeric', month: 'long', year: 'numeric' });
}

/** "27 September" (tanpa tahun) — dipakai di kartu tenggat terdekat, mengikuti
 * contoh persis salinan-teks-lanjut.md §4.1: "…tutup 27 September". */
export function formatTanggalRingkas(iso: string | null | undefined): string {
  const t = uraiTanggal(iso);
  return Number.isNaN(t) ? '' : tanggalTeks(t, { day: 'numeric', month: 'long' });
}

/** "1 – 31 Juli 2026" / "1 Oktober – 30 November 2026" — rentang mulai/selesai. */
export function formatRentang(mulai: string, selesai: string): string {
  const a = uraiTanggal(mulai);
  const b = uraiTanggal(selesai);
  if (Number.isNaN(a)) return Number.isNaN(b) ? '' : formatTanggal(selesai);
  if (Number.isNaN(b)) return formatTanggal(mulai);
  const da = new Date(a);
  const db = new Date(b);
  if (da.getUTCFullYear() === db.getUTCFullYear() && da.getUTCMonth() === db.getUTCMonth()) {
    return `${tanggalTeks(a, { day: 'numeric' })} – ${formatTanggal(selesai)}`;
  }
  return `${tanggalTeks(a, { day: 'numeric', month: 'long' })} – ${formatTanggal(selesai)}`;
}

/**
 * Cermin `linimasaTerkini` di app/assets/app.js (PWA v1) — logika penentuan
 * status & tenggat terdekat sengaja diduplikasi, bukan diimpor lintas
 * proyek, karena LANJUT_App adalah eksplorasi terpisah yang harus bisa
 * dihapus tanpa menyentuh satu baris pun PWA (lihat LANJUT_App/README.md).
 *
 * Penyaringan `status_verifikasi === 'terverifikasi'` dan `diperiksa_pada != null`
 * terjadi DI SINI, di lapisan data, bukan di lapisan tampilan — PRD F1 dan
 * LANJUT_066 melarang menampilkan tanggal yang belum diverifikasi dari laman resmi
 * sama sekali, jadi butir semacam itu tidak boleh pernah sampai ke komponen layar.
 */
export function turunkanLinimasa(
  data: TahapanLinimasa[],
  hariIniMs: number = hariIniWib()
): LinimasaTerkini {
  const terverifikasi = (data ?? []).filter(
    (t) => t.status_verifikasi === 'terverifikasi' && t.diperiksa_pada != null
  );

  const butir: TahapanTurunan[] = terverifikasi
    .slice()
    .sort((a, b) => uraiTanggal(a.tanggal_mulai) - uraiTanggal(b.tanggal_mulai))
    .map((t) => ({ ...t, status: 'idle' as StatusTahapan }));

  // Data tidak membedakan "pendaftaran" dan "pelaksanaan" — keduanya rentang
  // mulai–selesai. Yang membedakan adalah WAKTU: belum dimulai → yang
  // penting tanggal mulainya; sudah berjalan → tanggal tutupnya. Tenggat
  // terdekat = tahapan dengan momen berikutnya yang paling dekat.
  let terdekat: TahapanTurunan | null = null;
  let momenTerdekat: { momen: Momen; ms: number } | null = null;
  for (const b of butir) {
    const selesai = uraiTanggal(b.tanggal_selesai);
    if (Number.isNaN(selesai)) continue;
    if (selesai < hariIniMs) {
      b.status = 'done';
      continue;
    }
    const mulai = uraiTanggal(b.tanggal_mulai);
    // Mulai HARI INI sudah dianggap berjalan → hitung ke tutup. Dengan begitu
    // pendaftaran tetap "menuju … ditutup" sejak hari pertama, persis seperti
    // sebelum LANJUT_021.
    const kandidat: { momen: Momen; ms: number } =
      !Number.isNaN(mulai) && mulai > hariIniMs ? { momen: 'mulai', ms: mulai } : { momen: 'selesai', ms: selesai };
    if (!momenTerdekat || kandidat.ms < momenTerdekat.ms) {
      terdekat = b;
      momenTerdekat = kandidat;
    }
  }
  if (terdekat) terdekat.status = 'soon';

  return {
    butir,
    terdekat,
    sisaHari: momenTerdekat ? Math.round((momenTerdekat.ms - hariIniMs) / 86400000) : null,
    momen: momenTerdekat?.momen ?? null,
  };
}

/** Tanggal ISO momen tenggat (tanggal mulai atau tanggal selesai tahapan). */
export function tanggalMomen(tahapan: TahapanLinimasa, momen: Momen): string {
  return momen === 'mulai' ? tahapan.tanggal_mulai : tahapan.tanggal_selesai;
}

/**
 * Mengambil paling banyak tiga butir Info Penting dari data terverifikasi (LANJUT_066).
 * Relevansi jenjang mengikuti kelompokJenjang: hanya relevan untuk kelas 12.
 *
 * LANJUT_072b: tahapan yang tanggal selesainya sudah lewat (status 'done' dari
 * turunkanLinimasa — logika tanggal yang sama dengan kartu tenggat) tidak diambil.
 * Yang selesai HARI INI tetap tampil sampai akhir hari (WIB); tahapan tanpa
 * tanggal selesai tetap tampil walau tanggal mulainya sudah lewat. Data tidak
 * dihapus — hanya tidak ditampilkan di Info Penting.
 */
export function infoPentingLinimasa(
  data: TahapanLinimasa[],
  kelas?: Kelas | null | undefined,
  hariIniMs: number = hariIniWib()
): TahapanTurunan[] {
  const kelompok = kelompokJenjang(kelas);
  if (kelompok !== 'kelas12') {
    return [];
  }
  const hasil = turunkanLinimasa(data, hariIniMs);
  return hasil.butir.filter((b) => b.status !== 'done').slice(0, 3);
}

/** TEKS DRAF (LANJUT_072b) — salinan-teks-lanjut.md §4.1. */
export const KALIMAT_INFO_PENTING_KOSONG = 'Belum ada info penting untuk saat ini.';

export type TampilanInfoPenting =
  | { jenis: 'sembunyi' }
  | { jenis: 'kartu'; butir: TahapanTurunan[] }
  | { jenis: 'kosong'; kalimat: string };

/**
 * Apa yang tampil di seksi Info Penting Beranda (LANJUT_072b):
 *   - 'kartu'    → ada tahapan terverifikasi yang belum lewat;
 *   - 'kosong'   → ada tahapan terverifikasi, tetapi semuanya sudah lewat →
 *                  satu kalimat netral, bukan seksi kosong;
 *   - 'sembunyi' → bukan kelas 12, atau tidak ada data terverifikasi sama sekali
 *                  (aturan LANJUT_066: tanpa kartu kosong maupun kalimat).
 */
export function tampilanInfoPenting(
  data: TahapanLinimasa[],
  kelas?: Kelas | null | undefined,
  hariIniMs: number = hariIniWib()
): TampilanInfoPenting {
  if (kelompokJenjang(kelas) !== 'kelas12') return { jenis: 'sembunyi' };
  const butir = infoPentingLinimasa(data, kelas, hariIniMs);
  if (butir.length) return { jenis: 'kartu', butir };
  const adaTerverifikasi = turunkanLinimasa(data, hariIniMs).butir.length > 0;
  return adaTerverifikasi ? { jenis: 'kosong', kalimat: KALIMAT_INFO_PENTING_KOSONG } : { jenis: 'sembunyi' };
}

