/**
 * Logika murni dan teks draf layar Jejak Waktu v2 (`/jejak-waktu`, LANJUT_032).
 * Modul murni (tanpa React/Expo) supaya seluruh aturan tanggal, zona waktu Asia/Jakarta,
 * pengelompokan Segera/Berikutnya/Sudah lewat, dan batas 40 kata dapat diuji langsung dari server/tests.
 *
 * TEKS DRAF — docs/draf-teks-jejak-waktu-v2.md, belum disetujui Khalifa.
 * Prinsip wajib:
 * - Tenggat ditampilkan sebagai angka biasa ("24 hari lagi", "Hari ini"), TIDAK berdetak.
 * - Tidak ada warna merah atau oranye terang untuk tenggat; "Segera" dibedakan lewat bobot huruf + penanda teks.
 * - Tanggal tidak pernah dikarang: bila kosong/tidak sah di data, tampil "Tanggal resmi belum diumumkan".
 * - Butir yang sudah lewat tidak pernah tampil di "Segera" atau "Berikutnya".
 */
import type { EventSekolah, TahapanLinimasa } from '../api/types';
import { hitungKata } from './arahSaya';
import { labelJenis, untukPersiapanEvent } from './eventSekolah';
import { kelompokJenjang, type Kelas } from './jenjang';
import {
  STATUS_JADWAL_BERIKUTNYA,
  formatRentang,
  formatTanggal,
  hariIniWib,
  uraiTanggal,
  type StatusJadwalBerikutnya,
} from './linimasa';
import { lembagaSumber } from './sumber';

const SEHARI_MS = 86_400_000;

/** Batas jendela kelompok "Segera" dalam hari kalender dari hari ini (Asia/Jakarta). */
export const JENDELA_SEGERA_HARI = 30;

/** Batas maksimal kata teks tetap di layar Jejak Waktu (di luar data). */
export const BATAS_KATA_JEJAK_WAKTU = 40;

export type JenisButirWaktu = 'tenggat' | 'event' | 'pengumuman';
export type KelompokWaktu = 'segera' | 'berikutnya' | 'sudah_lewat';

// TEKS DRAF — belum disetujui Khalifa (docs/draf-teks-jejak-waktu-v2.md).
export const TEKS_JEJAK_WAKTU = {
  judul: 'Jejak Waktu',
  ringkasan: 'Jadwal pentingmu, tenang tanpa buru-buru.',

  segeraJudul: 'Segera',
  berikutnyaJudul: 'Berikutnya',
  sudahLewatJudul: 'Sudah lewat',
  lencanaSegera: 'Segera',

  tanggalBelumAda: 'Tanggal resmi belum diumumkan',
  hariIni: 'Hari ini',
  hariLagiAkhiran: 'hari lagi',
  sedangBerlangsung: 'Sedang berlangsung',

  jenisTenggat: 'Tenggat',
  jenisEvent: 'Event',
  jenisPengumuman: 'Pengumuman',

  labelTerverifikasi: 'Terverifikasi',
  awalanSumber: 'Sumber:',
  awalanDicek: 'Dicek',
  awalanJalurSeleksi: 'Jalur seleksi:',
  bukaLangkah: 'Buka Langkah Saya',
  tutupRincian: 'Sembunyikan rincian',
  lihatRincian: 'Lihat rincian',

  kosongJudul: 'Belum ada jadwal saat ini',
  kosongTeks: 'Siapkan langkahmu pelan saja.',
  // LANJUT_042 (TEKS DRAF): keadaan kosong jujur per jenjang tanpa menunjuk layar kosong (Jalur Saya / Jelajah).
  kosongKelas12Judul: 'Jadwal seleksi 2027 belum diumumkan',
  kosongKelas12Teks: 'SNPMB belum merilis jadwal resmi 2027. Tanggal yang belum resmi tidak kami tampilkan.',
  kosongSma1011Judul: 'Jadwal kelas 10–11 belum tersedia',
  kosongSma1011Teks: 'Jadwal resmi untuk jenjangmu belum tersedia di LANJUT. Kamu bisa mulai dari Langkah Saya.',
  kosongSmpJudul: 'Jadwal SMP belum tersedia',
  kosongSmpTeks: 'Jadwal resmi untuk SMP belum tersedia di LANJUT. Kamu bisa mulai dari Langkah Saya.',
  kosongTombolLangkah: 'Langkah Saya',

  memuatLabel: 'Memuat Jejak Waktu',
  galatJudul: 'Belum bisa memuat jadwal',
  galatPesan: 'Periksa sambunganmu, lalu coba lagi.',
  cobaLagi: 'Coba lagi',
} as const;

export type ButirJejakWaktu = {
  id: string;
  judul: string;
  kelompok: KelompokWaktu;
  tanggalTampil: string;
  tanggalResmiAda: boolean;
  jarakTeks: string | null;
  selisihHari: number | null;
  jenis: JenisButirWaktu;
  jenisLabel: string;
  terverifikasi: boolean;
  sumberTeks: string | null;
  diperiksaTeks: string | null;
  jalurSeleksi: string | null;
  catatanRincian: string | null;
  urutMs: number;
};

export type HasilJejakWaktu = {
  segera: ButirJejakWaktu[];
  berikutnya: ButirJejakWaktu[];
  sudahLewat: ButirJejakWaktu[];
  total: number;
};

/**
 * Mengurai string tanggal resmi `YYYY-MM-DD` menjadi milidetik tengah malam UTC.
 * Mengembalikan `NaN` bila kosong, bukan `YYYY-MM-DD`, atau tanggalnya tidak ada di kalender
 * (mis. `2026-02-30`). Tidak pernah menebak atau mengarang tanggal.
 */
export function tanggalSahMs(iso: string | null | undefined): number {
  if (typeof iso !== 'string') return NaN;
  const bersih = iso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(bersih)) return NaN;
  const [tahun, bulan, hari] = bersih.split('-').map(Number);
  const ms = uraiTanggal(bersih);
  if (Number.isNaN(ms)) return NaN;
  const cek = new Date(ms);
  if (cek.getUTCFullYear() !== tahun || cek.getUTCMonth() !== bulan - 1 || cek.getUTCDate() !== hari) {
    return NaN;
  }
  return ms;
}

/** Label jenis butir untuk tampilan (`Tenggat` / `Event` / `Pengumuman`). */
export function labelJenisButir(jenis: JenisButirWaktu): string {
  if (jenis === 'pengumuman') return TEKS_JEJAK_WAKTU.jenisPengumuman;
  if (jenis === 'event') return TEKS_JEJAK_WAKTU.jenisEvent;
  return TEKS_JEJAK_WAKTU.jenisTenggat;
}

/** Menurunkan jenis butir dari judul tahapan linimasa resmi tanpa mengarang fakta baru. */
export function jenisButirLinimasa(judul: string): JenisButirWaktu {
  if (/pengumuman|hasil\b/i.test(judul)) return 'pengumuman';
  if (/pelaksanaan|ujian|tes\b|sosialisasi/i.test(judul)) return 'event';
  return 'tenggat';
}

/** Format jarak waktu statis dalam hari bulat (tanpa pewaktu berdetak). */
export function teksJarakHari(selisih: number): string {
  if (selisih <= 0) return TEKS_JEJAK_WAKTU.hariIni;
  return `${selisih} ${TEKS_JEJAK_WAKTU.hariLagiAkhiran}`;
}

function normalisasiTahapanLinimasa(t: TahapanLinimasa, hariIniMs: number): ButirJejakWaktu {
  const mulaiMs = tanggalSahMs(t.tanggal_mulai);
  const selesaiMs = tanggalSahMs(t.tanggal_selesai);
  const adaMulai = !Number.isNaN(mulaiMs);
  const adaSelesai = !Number.isNaN(selesaiMs);
  const jenis = jenisButirLinimasa(t.judul);
  const jenisLabel = labelJenisButir(jenis);
  const sumberTeks = t.url_sumber ? lembagaSumber(t.url_sumber) : null;
  const diperiksaFormat = formatTanggal(t.diperiksa_pada);
  const diperiksaTeks = diperiksaFormat ? `${TEKS_JEJAK_WAKTU.awalanDicek} ${diperiksaFormat}` : null;

  // Tanpa tanggal resmi yang sah → jangan menebak tanggal, taruh di Berikutnya.
  if (!adaMulai && !adaSelesai) {
    return {
      id: `linimasa:${t.id}`,
      judul: t.judul,
      kelompok: 'berikutnya',
      tanggalTampil: TEKS_JEJAK_WAKTU.tanggalBelumAda,
      tanggalResmiAda: false,
      jarakTeks: null,
      selisihHari: null,
      jenis,
      jenisLabel,
      terverifikasi: true,
      sumberTeks,
      diperiksaTeks,
      jalurSeleksi: t.jalur_seleksi ?? null,
      catatanRincian: null,
      urutMs: Number.MAX_SAFE_INTEGER,
    };
  }

  const awalMs = adaMulai ? mulaiMs : selesaiMs;
  const akhirMs = adaSelesai ? selesaiMs : mulaiMs;
  const tanggalTampil =
    adaMulai && adaSelesai && mulaiMs !== selesaiMs
      ? formatRentang(t.tanggal_mulai.trim(), t.tanggal_selesai!.trim())
      : adaMulai
        ? formatTanggal(t.tanggal_mulai.trim())
        : formatTanggal(t.tanggal_selesai!.trim());

  // Sudah lewat (akhir rentang < hari ini WIB) → selalu masuk Sudah lewat.
  if (akhirMs < hariIniMs) {
    const selisihLewat = Math.round((akhirMs - hariIniMs) / SEHARI_MS);
    return {
      id: `linimasa:${t.id}`,
      judul: t.judul,
      kelompok: 'sudah_lewat',
      tanggalTampil,
      tanggalResmiAda: true,
      jarakTeks: TEKS_JEJAK_WAKTU.sudahLewatJudul,
      selisihHari: selisihLewat,
      jenis,
      jenisLabel,
      terverifikasi: true,
      sumberTeks,
      diperiksaTeks,
      jalurSeleksi: t.jalur_seleksi ?? null,
      catatanRincian: null,
      urutMs: akhirMs,
    };
  }

  // Sedang berlangsung hari ini (mulai <= hari ini <= selesai) → selalu Segera, jarak dihitung ke tanggal tutup.
  if (awalMs <= hariIniMs) {
    const sisaKeTutup = Math.round((akhirMs - hariIniMs) / SEHARI_MS);
    return {
      id: `linimasa:${t.id}`,
      judul: t.judul,
      kelompok: 'segera',
      tanggalTampil,
      tanggalResmiAda: true,
      jarakTeks: sisaKeTutup === 0 ? TEKS_JEJAK_WAKTU.hariIni : teksJarakHari(sisaKeTutup),
      selisihHari: sisaKeTutup,
      jenis,
      jenisLabel,
      terverifikasi: true,
      sumberTeks,
      diperiksaTeks,
      jalurSeleksi: t.jalur_seleksi ?? null,
      catatanRincian: awalMs < hariIniMs ? TEKS_JEJAK_WAKTU.sedangBerlangsung : null,
      urutMs: akhirMs,
    };
  }

  // Belum dimulai (mulai > hari ini WIB).
  const sisaKeMulai = Math.round((awalMs - hariIniMs) / SEHARI_MS);
  const kelompok: KelompokWaktu = sisaKeMulai <= JENDELA_SEGERA_HARI ? 'segera' : 'berikutnya';
  return {
    id: `linimasa:${t.id}`,
    judul: t.judul,
    kelompok,
    tanggalTampil,
    tanggalResmiAda: true,
    jarakTeks: teksJarakHari(sisaKeMulai),
    selisihHari: sisaKeMulai,
    jenis,
    jenisLabel,
    terverifikasi: true,
    sumberTeks,
    diperiksaTeks,
    jalurSeleksi: t.jalur_seleksi ?? null,
    catatanRincian: null,
    urutMs: awalMs,
  };
}

function normalisasiEventSmp(
  e: EventSekolah,
  namaMapel: Readonly<Record<string, string>> | undefined,
  hariIniMs: number
): ButirJejakWaktu {
  const label = labelJenis(e.jenis);
  const mapel = e.mapel_id ? namaMapel?.[e.mapel_id] : undefined;
  const judul = mapel ? `${label} · ${mapel}` : label;
  const tglMs = tanggalSahMs(e.tanggal);
  const kurasi = e.materi?.tersedia && e.materi.jenis === 'kurasi' ? e.materi : null;
  const sumberTeks = kurasi ? kurasi.sumber_nama : null;
  const diperiksaTeks: string | null = null;
  const catatanRincian = e.materi_teks?.trim() ? e.materi_teks.trim() : null;

  if (Number.isNaN(tglMs)) {
    return {
      id: `event:${e.id}`,
      judul,
      kelompok: 'berikutnya',
      tanggalTampil: TEKS_JEJAK_WAKTU.tanggalBelumAda,
      tanggalResmiAda: false,
      jarakTeks: null,
      selisihHari: null,
      jenis: 'event',
      jenisLabel: TEKS_JEJAK_WAKTU.jenisEvent,
      terverifikasi: Boolean(kurasi),
      sumberTeks,
      diperiksaTeks,
      jalurSeleksi: null,
      catatanRincian,
      urutMs: Number.MAX_SAFE_INTEGER,
    };
  }

  const tanggalTampil = formatTanggal(e.tanggal.trim());
  const selisih = Math.round((tglMs - hariIniMs) / SEHARI_MS);

  if (selisih < 0) {
    return {
      id: `event:${e.id}`,
      judul,
      kelompok: 'sudah_lewat',
      tanggalTampil,
      tanggalResmiAda: true,
      jarakTeks: TEKS_JEJAK_WAKTU.sudahLewatJudul,
      selisihHari: selisih,
      jenis: 'event',
      jenisLabel: TEKS_JEJAK_WAKTU.jenisEvent,
      terverifikasi: Boolean(kurasi),
      sumberTeks,
      diperiksaTeks,
      jalurSeleksi: null,
      catatanRincian,
      urutMs: tglMs,
    };
  }

  return {
    id: `event:${e.id}`,
    judul,
    kelompok: selisih <= JENDELA_SEGERA_HARI ? 'segera' : 'berikutnya',
    tanggalTampil,
    tanggalResmiAda: true,
    jarakTeks: teksJarakHari(selisih),
    selisihHari: selisih,
    jenis: 'event',
    jenisLabel: TEKS_JEJAK_WAKTU.jenisEvent,
    terverifikasi: Boolean(kurasi),
    sumberTeks,
    diperiksaTeks,
    jalurSeleksi: null,
    catatanRincian,
    urutMs: tglMs,
  };
}

/**
 * Menyusun isi Jejak Waktu berdasarkan jenjang/kelas akun dan parameter waktu `"sekarang"` (ms UTC)
 * yang dikonversi ke tengah malam `Asia/Jakarta` (`hariIniWib`).
 * - Kelas 12: hanya `tahapan_linimasa` yang `status_verifikasi === 'terverifikasi'` dan `diperiksa_pada != null`.
 * - Kelas 7–9 (SMP): `event_sekolah` milik siswa.
 * - Kelas 10–11: kosong jujur (belum ada tabel jadwal di server; tidak memetakan jalur karangan).
 */
export function susunJejakWaktu(p: {
  kelas: Kelas | null | undefined;
  tahapanLinimasa?: readonly TahapanLinimasa[] | null;
  eventSekolah?: readonly EventSekolah[] | null;
  namaMapel?: Readonly<Record<string, string>>;
  /** Waktu "sekarang" (ms epoch) yang disuntikkan; bawaan `Date.now()`. */
  sekarangMs?: number;
}): HasilJejakWaktu {
  const hariIni = hariIniWib(p.sekarangMs ?? Date.now());
  const semua: ButirJejakWaktu[] = [];
  const jenjang = kelompokJenjang(p.kelas);

  if (jenjang === 'kelas12') {
    for (const t of p.tahapanLinimasa ?? []) {
      if (t.status_verifikasi !== 'terverifikasi' || !t.diperiksa_pada) continue;
      semua.push(normalisasiTahapanLinimasa(t, hariIni));
    }
  } else if (untukPersiapanEvent(p.kelas)) {
    for (const e of p.eventSekolah ?? []) {
      semua.push(normalisasiEventSmp(e, p.namaMapel, hariIni));
    }
  }

  const segera = semua
    .filter((b) => b.kelompok === 'segera')
    .sort((a, b) => a.urutMs - b.urutMs || a.judul.localeCompare(b.judul));
  const berikutnya = semua
    .filter((b) => b.kelompok === 'berikutnya')
    .sort((a, b) => a.urutMs - b.urutMs || a.judul.localeCompare(b.judul));
  const sudahLewat = semua
    .filter((b) => b.kelompok === 'sudah_lewat')
    .sort((a, b) => b.urutMs - a.urutMs || a.judul.localeCompare(b.judul));

  return {
    segera,
    berikutnya,
    sudahLewat,
    total: segera.length + berikutnya.length + sudahLewat.length,
  };
}

/** True bila masih ada jadwal aktif (`segera` atau `berikutnya`). Butir `sudahLewat` saja = tidak ada jadwal aktif. */
export function adaJadwalAktif(jadwal: Pick<HasilJejakWaktu, 'segera' | 'berikutnya'>): boolean {
  return jadwal.segera.length > 0 || jadwal.berikutnya.length > 0;
}

export type KeadaanKosongJejakWaktu = {
  judul: string;
  teks: string;
  metaPeriksa: string | null;
  tombolLabel: string;
  tombolHref: '/langkah-saya';
};

/**
 * Keadaan kosong jujur per jenjang saat tidak ada jadwal aktif (LANJUT_042).
 * - Kelas 12: membaca tanggal periksa & sumber dari `statusJadwal` (sumber data linimasa, bukan komponen).
 * - Kelas 10–11 & SMP: menyatakan jujur jadwal jenjang belum tersedia; tombol selalu menuju Langkah Saya,
 *   tidak pernah mengarahkan ke Jalur Saya atau Jelajah.
 */
export function keadaanKosongJejakWaktu(
  kelas: Kelas | null | undefined,
  statusJadwal: StatusJadwalBerikutnya = STATUS_JADWAL_BERIKUTNYA
): KeadaanKosongJejakWaktu {
  const jenjang = kelompokJenjang(kelas);
  if (jenjang === 'kelas12') {
    const tanggalPeriksa = formatTanggal(statusJadwal.diperiksa_pada);
    const metaPeriksa = tanggalPeriksa
      ? `${TEKS_JEJAK_WAKTU.awalanDicek} ${tanggalPeriksa} · ${statusJadwal.sumber}`
      : null;
    return {
      judul: TEKS_JEJAK_WAKTU.kosongKelas12Judul,
      teks: TEKS_JEJAK_WAKTU.kosongKelas12Teks,
      metaPeriksa,
      tombolLabel: TEKS_JEJAK_WAKTU.kosongTombolLangkah,
      tombolHref: '/langkah-saya',
    };
  }
  if (jenjang === 'kelas10_11') {
    return {
      judul: TEKS_JEJAK_WAKTU.kosongSma1011Judul,
      teks: TEKS_JEJAK_WAKTU.kosongSma1011Teks,
      metaPeriksa: null,
      tombolLabel: TEKS_JEJAK_WAKTU.kosongTombolLangkah,
      tombolHref: '/langkah-saya',
    };
  }
  if (jenjang === 'smp') {
    return {
      judul: TEKS_JEJAK_WAKTU.kosongSmpJudul,
      teks: TEKS_JEJAK_WAKTU.kosongSmpTeks,
      metaPeriksa: null,
      tombolLabel: TEKS_JEJAK_WAKTU.kosongTombolLangkah,
      tombolHref: '/langkah-saya',
    };
  }
  return {
    judul: TEKS_JEJAK_WAKTU.kosongJudul,
    teks: TEKS_JEJAK_WAKTU.kosongTeks,
    metaPeriksa: null,
    tombolLabel: TEKS_JEJAK_WAKTU.kosongTombolLangkah,
    tombolHref: '/langkah-saya',
  };
}

/** Tujuan satu tombol pada keadaan kosong Jejak Waktu: selalu Langkah Saya (tidak pernah layar kosong Jalur/Jelajah). */
export function aksiKosongJejakWaktu(_discoverAktif?: boolean): { label: string; href: '/langkah-saya' } {
  return { label: TEKS_JEJAK_WAKTU.kosongTombolLangkah, href: '/langkah-saya' };
}

/** Daftar teks tetap di layar Jejak Waktu untuk verifikasi batas maksimal 40 kata. */
export function teksTetapJejakWaktu(p: {
  keadaan: 'isi' | 'kosong' | 'galat';
  discoverAktif: boolean;
  kelas?: Kelas | null;
  adaSegera?: boolean;
  adaBerikutnya?: boolean;
  adaSudahLewat?: boolean;
}): string[] {
  const daftar: string[] = [TEKS_JEJAK_WAKTU.judul, TEKS_JEJAK_WAKTU.ringkasan];
  if (p.keadaan === 'galat') {
    daftar.push(TEKS_JEJAK_WAKTU.galatJudul, TEKS_JEJAK_WAKTU.galatPesan, TEKS_JEJAK_WAKTU.cobaLagi);
    return daftar;
  }
  if (p.keadaan === 'kosong') {
    const kosong = keadaanKosongJejakWaktu(p.kelas);
    daftar.push(kosong.judul, kosong.teks, kosong.tombolLabel);
    if (kosong.metaPeriksa) daftar.push(TEKS_JEJAK_WAKTU.awalanDicek);
    if (p.adaSudahLewat) daftar.push(TEKS_JEJAK_WAKTU.sudahLewatJudul);
    return daftar;
  }
  if (p.adaSegera !== false) daftar.push(TEKS_JEJAK_WAKTU.segeraJudul);
  if (p.adaBerikutnya !== false) daftar.push(TEKS_JEJAK_WAKTU.berikutnyaJudul);
  if (p.adaSudahLewat !== false) daftar.push(TEKS_JEJAK_WAKTU.sudahLewatJudul);
  return daftar;
}

export { hitungKata };
