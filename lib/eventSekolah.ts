import type { EventSekolah, JenisEvent } from '../api/types';
import { kelompokJenjang, type Kelas } from './jenjang';
import { hariIniWib, uraiTanggal } from './linimasa';

/**
 * Persiapan Event untuk SMP, kelas 7–9 (LANJUT_076; LANJUT_076b membatasinya ke
 * SMP). Modul murni tanpa React supaya tes server bisa menjalankannya langsung
 * (server/tests/muat-ts-app.js).
 *
 * Fitur ini dimatikan secara bawaan di server (saklar event_sekolah_aktif = 0):
 * selama mati, GET /pengguna/event menjawab 403 dan app tidak menampilkan apa pun.
 * Semua hitungan tanggal memakai hariIniWib/uraiTanggal (lib/linimasa.ts) — tidak
 * ada logika tanggal di layar.
 *
 * TEKS DRAF, belum disetujui Khalifa — salinan-teks-lanjut.md §4.4 (LANJUT_076, LANJUT_076b).
 */

/** Nilai jenis yang sah di server (sama dengan event-sekolah.skema.js, migrasi 021). */
export const JENIS_EVENT: readonly JenisEvent[] = ['UTS', 'UAS', 'PAS', 'Ulangan', 'TKA', 'Lainnya'];
export const MAKS_MATERI = 200;
/** Kartu "Persiapan Terdekat" tampil dari 7 hari sebelum tanggal event sampai hari H. */
export const HARI_PENGINGAT = 7;

const SEHARI = 86400000;

/** LANJUT_076b: hanya SMP (kelas 7–9); kelas 10–12 dan akun tanpa kelas tidak memakai fitur ini. */
export function untukPersiapanEvent(kelas: Kelas | null | undefined): boolean {
  return kelompokJenjang(kelas) === 'smp';
}

/** Label tampil: UAS dan PAS (nilai lama dan baru) = "UAS/PAS"; Ulangan = "Ulangan Harian". */
export function labelJenis(jenis: JenisEvent): string {
  if (jenis === 'UAS' || jenis === 'PAS') return 'UAS/PAS';
  if (jenis === 'Ulangan') return 'Ulangan Harian';
  return jenis;
}

/**
 * Pilihan jenis di isian (LANJUT_076b): UTS, UAS/PAS, Ulangan Harian, TKA, Lainnya.
 * TKA hanya untuk kelas 9 (pilihan percakapan, belum disetujui PM), kecuali event
 * yang sedang diubah memang sudah berjenis TKA.
 */
export function pilihanJenis(kelas: Kelas | null | undefined, jenisSekarang?: JenisEvent | null): { nilai: JenisEvent; label: string }[] {
  const nilai: JenisEvent[] = ['UTS', 'UAS', 'Ulangan'];
  if (kelas === '9' || jenisSekarang === 'TKA') nilai.push('TKA');
  nilai.push('Lainnya');
  return nilai.map((n) => ({ nilai: n, label: labelJenis(n) }));
}

/**
 * Yang tampil untuk materi satu event (LANJUT_076b §D–E):
 *   - tanpa kartu → tidak ada apa pun;
 *   - kartu dihapus / kurasi tidak terverifikasi lagi → "Materi ini sudah tidak tersedia." tanpa tombol;
 *   - kartu kurasi → "Sumber: [nama]" + tombol yang membuka panel materi;
 *   - kartu milik sendiri → tombol ke Arsip (seperti 076).
 */
export function tampilanMateri(e: Pick<EventSekolah, 'kartu_id' | 'materi'>): {
  keterangan: string | null;
  buka: 'arsip' | 'panel' | null;
} {
  if (!e.kartu_id) return { keterangan: null, buka: null };
  const m = e.materi;
  if (!m || !m.tersedia) return { keterangan: TEKS_EVENT.materiTidakTersedia, buka: null };
  if (m.jenis === 'kurasi') return { keterangan: `${TEKS_EVENT.awalanSumber} ${m.sumber_nama}`, buka: 'panel' };
  return { keterangan: null, buka: 'arsip' };
}

/** Hari dari hari ini (WIB) ke tanggal event: 0 = hari ini, negatif = sudah lewat; null bila tak terbaca. */
export function selisihHari(tanggal: string, hariIniMs: number = hariIniWib()): number | null {
  const t = uraiTanggal(tanggal);
  return Number.isNaN(t) ? null : Math.round((t - hariIniMs) / SEHARI);
}

/** Daftar utama = hari ini dan sesudahnya (tanggal naik); sudah lewat dipisah (terbaru dulu), tidak dihapus. */
export function pisahEvent(
  daftar: readonly EventSekolah[],
  hariIniMs: number = hariIniWib()
): { mendatang: EventSekolah[]; lewat: EventSekolah[] } {
  const mendatang: EventSekolah[] = [];
  const lewat: EventSekolah[] = [];
  for (const e of daftar) {
    const s = selisihHari(e.tanggal, hariIniMs);
    if (s === null) continue;
    (s >= 0 ? mendatang : lewat).push(e);
  }
  mendatang.sort((a, b) => uraiTanggal(a.tanggal) - uraiTanggal(b.tanggal));
  lewat.sort((a, b) => uraiTanggal(b.tanggal) - uraiTanggal(a.tanggal));
  return { mendatang, lewat };
}

/** Satu event untuk kartu Beranda: dalam rentang 7 hari sebelum s.d. hari H, yang paling dekat. */
export function eventTerdekat(
  daftar: readonly EventSekolah[] | null | undefined,
  hariIniMs: number = hariIniWib()
): EventSekolah | null {
  let terpilih: EventSekolah | null = null;
  let jarak = Infinity;
  for (const e of daftar ?? []) {
    const s = selisihHari(e.tanggal, hariIniMs);
    if (s === null || s < 0 || s > HARI_PENGINGAT) continue;
    if (s < jarak) {
      terpilih = e;
      jarak = s;
    }
  }
  return terpilih;
}

export function teksHitungMundur(selisih: number): string {
  return selisih === 0 ? TEKS_EVENT.hariIni : `${selisih} ${TEKS_EVENT.hariLagi}`;
}

/** Tanggal event paling jauh: tanggal yang sama dua tahun sesudah hari ini (sama dengan server). */
export function batasTanggalMaks(hariIniMs: number = hariIniWib()): number {
  const d = new Date(hariIniMs);
  return Date.UTC(d.getUTCFullYear() + 2, d.getUTCMonth(), d.getUTCDate());
}

function tanggalAdaDiKalender(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [t, b, h] = s.split('-').map(Number);
  const d = new Date(Date.UTC(t, b - 1, h));
  return d.getUTCFullYear() === t && d.getUTCMonth() === b - 1 && d.getUTCDate() === h;
}

export type IsianFormEvent = { jenis: JenisEvent | null; tanggal: string; materi: string };

/** Pemeriksaan di layar sebelum dikirim (server tetap memeriksa ulang). Kosong = boleh dikirim. */
export function periksaIsianEvent(isi: IsianFormEvent, hariIniMs: number = hariIniWib()): Partial<Record<'jenis' | 'tanggal' | 'materi_teks', string>> {
  const galat: Partial<Record<'jenis' | 'tanggal' | 'materi_teks', string>> = {};
  if (!isi.jenis) galat.jenis = TEKS_EVENT.galatJenis;
  const t = isi.tanggal.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) galat.tanggal = TEKS_EVENT.galatTanggalFormat;
  else if (!tanggalAdaDiKalender(t)) galat.tanggal = TEKS_EVENT.galatTanggalKalender;
  else if (uraiTanggal(t) > batasTanggalMaks(hariIniMs)) galat.tanggal = TEKS_EVENT.galatTanggalJauh;
  if (Array.from(isi.materi.trim()).length > MAKS_MATERI) galat.materi_teks = TEKS_EVENT.galatMateri;
  return galat;
}

export const TEKS_EVENT = {
  judul: 'Persiapan Event',
  // LANJUT_076b: contoh kalimat PM (sebelumnya "Catat ujian atau ulangan yang akan datang, lengkap dengan mapel dan materinya.").
  pengantar: 'Catat ujian dan ulangan yang akan datang, supaya kamu bisa menyiapkan diri lebih awal.',
  tombolTambah: 'Tambah event',
  kosong: 'Belum ada event yang akan datang.',
  labelJenis: 'Jenis',
  labelTanggal: 'Tanggal',
  petunjukTanggal: 'Contoh: 2026-11-03 (tahun-bulan-tanggal).',
  labelMapel: 'Mapel',
  labelMateri: 'Materi',
  petunjukMateri: 'Tulis materinya singkat saja. Jangan tulis nama atau data pribadi.',
  // LANJUT_076b: pilihan kini juga kartu kurasi bersumber resmi (sebelumnya "Kartu Arsip").
  labelKartu: 'Kartu materi',
  kartuKosong: 'Belum ada kartu materi untuk pilihan ini.',
  opsional: 'opsional',
  tombolSimpan: 'Simpan event',
  tombolBatal: 'Batal',
  bukaMateri: 'Buka materi',
  tutupMateri: 'Tutup materi',
  awalanSumber: 'Sumber:',
  materiTidakTersedia: 'Materi ini sudah tidak tersedia.',
  ubah: 'Ubah',
  hapus: 'Hapus',
  konfirmasiHapus: 'Hapus event ini? Event yang dihapus tidak bisa dikembalikan.',
  yaHapus: 'Ya, hapus',
  lihatLewat: 'Lihat event yang sudah lewat',
  sembunyikanLewat: 'Sembunyikan event yang sudah lewat',
  sudahLewat: 'Sudah lewat',
  hariIni: 'Hari ini',
  hariLagi: 'hari lagi',
  galatJenis: 'Pilih jenis event.',
  galatTanggalFormat: 'Isi tanggal dengan format tahun-bulan-tanggal, misalnya 2026-11-03.',
  galatTanggalKalender: 'Tanggal ini tidak ada di kalender.',
  galatTanggalJauh: 'Tanggal paling jauh 2 tahun dari hari ini.',
  galatMateri: `Materi paling panjang ${MAKS_MATERI} karakter.`,
  // LANJUT_076b: kartu kurasi juga bisa dipilih (sebelumnya "… Pilih kartu lain dari Arsip-mu.").
  galatKartu: 'Kartu ini tidak bisa dipakai. Pilih kartu materi lain.',
  galatSimpan: 'Belum tersimpan. Coba lagi sebentar lagi.',
  kartuBerandaJudul: 'Persiapan Terdekat',
} as const;
