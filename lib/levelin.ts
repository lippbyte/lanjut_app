import type { KonfigurasiLevelIn, LevelAkurasi, RingkasanMapel, SaranHarian } from '../api/types';

/**
 * Layar Level-In (LANJUT_058) — logika tampilan murni. Semua angka (level,
 * pola, saran) dihitung SERVER (/kalibrasi/ringkasan, /saran-harian); ambang
 * untuk "berapa kartu lagi" dan arti level dibaca dari /konfigurasi/levelin,
 * tidak ditulis di sini. Tanpa ambang (konfigurasi gagal dimuat), kalimat
 * yang butuh angka tidak menyebut angka.
 */

// Salinan teks §4.18 (LANJUT_058) — DRAF belum disetujui Khalifa.
export const TEKS_LEVELIN = {
  judul: 'Level-In',
  pengantar: 'Seberapa kuat kamu di tiap mapel, dihitung dari latihanmu sendiri.',
  kosongJudul: 'Belum ada latihan.',
  // LANJUT_077b: tanpa angka ambang tetap (sebelumnya "… Mulai dari 5 kartu saja."); ambang ada di konfigurasi_levelin.
  kosongIsi: 'Level-In muncul setelah kamu menjawab kartu di Latihan. Mulai dari sedikit kartu dulu saja.',
  kosongAksi: 'Mulai latihan',
  galat: 'Level-In belum bisa dimuat. Periksa sambungan internetmu, lalu coba lagi.',
  cobaLagi: 'Coba lagi',
  seksiMapel: 'Per mapel',
  kartuDijawab: (n: number) => `${n} kartu dijawab`,
  belumCukup: 'Belum cukup data',
  kurangKartu: (n: number) => `Jawab ${n} kartu lagi di mapel ini supaya levelnya muncul.`,
  kurangKartuTanpaAngka: 'Jawab beberapa kartu lagi di mapel ini supaya levelnya muncul.',
  seksiKeyakinan: 'Keyakinanmu',
  ajakanKeyakinan:
    'Saat latihan, pilih "Seberapa yakin kamu?" sebelum membuka jawaban. Dari situ Level-In bisa melihat apakah keyakinanmu sudah pas dengan hasilmu.',
  keyakinanKurang: (n: number) => `Isi keyakinan di ${n} kartu lagi dalam satu mapel supaya polanya kelihatan.`,
  keyakinanKurangTanpaAngka: 'Isi keyakinan di beberapa kartu lagi dalam satu mapel supaya polanya kelihatan.',
  terlaluYakin: (mapel: string) => `Kamu cenderung terlalu yakin di ${mapel}: sering yakin, tapi jawabannya salah.`,
  pas: (mapel: string) => `Keyakinanmu sudah pas dengan hasilmu di ${mapel}.`,
  seksiSaran: 'Saran hari ini',
  lihatLevelIn: 'Lihat Level-In',
  // LANJUT_077 — kartu Beranda (salinan §4.18, DRAF).
  berandaJudul: 'Latihan berikutnya',
  berandaTombol: 'Mulai latihan',
};

/** Satu kalimat arti tiap level. Batas persen dari konfigurasi (level_batas_bawah/atas). */
export function artiLevel(level: Exclude<LevelAkurasi, 'belum_cukup_data'>, batas: { bawah: number | null; atas: number | null }) {
  const persen = (n: number | null) => (n === null ? null : `${Math.round(n * 100)}%`);
  const bawah = persen(batas.bawah);
  const atas = persen(batas.atas);
  switch (level) {
    case 'perlu_penguatan_dasar':
      return {
        label: 'Perlu penguatan dasar',
        arti: bawah ? `Jawaban benarmu masih di bawah ${bawah}. Ulangi dasar-dasarnya dulu, pelan-pelan saja.` : 'Jawaban benarmu masih sedikit. Ulangi dasar-dasarnya dulu, pelan-pelan saja.',
      };
    case 'cukup_lanjut_latihan':
      return {
        label: 'Cukup, lanjut latihan',
        arti: bawah && atas ? `Jawaban benarmu ${bawah}–${atas}. Terus latihan supaya makin mantap.` : 'Jawaban benarmu sudah lumayan. Terus latihan supaya makin mantap.',
      };
    case 'sudah_kuat':
      return {
        label: 'Sudah kuat',
        arti: atas ? `Jawaban benarmu di atas ${atas}. Pertahankan, sesekali ulangi.` : 'Hampir semua jawabanmu benar. Pertahankan, sesekali ulangi.',
      };
  }
}

/** Angka dari /konfigurasi/levelin; null bila kunci tidak ada atau bukan angka. */
export function angkaKonfig(konfig: KonfigurasiLevelIn | undefined, kunci: string): number | null {
  const nilai = konfig?.[kunci]?.nilai;
  if (nilai === undefined || nilai === null || String(nilai).trim() === '') return null;
  const n = Number(nilai);
  return Number.isFinite(n) ? n : null;
}

/** Mapel yang sudah dilatih (ada jawaban di jendela), urut terbanyak dulu. */
export function mapelDilatih(baris: RingkasanMapel[]): RingkasanMapel[] {
  return baris
    .filter((b) => b.level_akurasi.kartu_dijawab > 0)
    .sort((a, b) => b.level_akurasi.kartu_dijawab - a.level_akurasi.kartu_dijawab || a.mapel_id.localeCompare(b.mapel_id));
}

/** Berapa kartu lagi sampai level muncul; null bila ambang tidak diketahui. */
export function kurangKartu(b: RingkasanMapel, minimum: number | null): number | null {
  return minimum === null ? null : Math.max(1, minimum - b.level_akurasi.kartu_dijawab);
}

export type RingkasKeyakinan =
  | { jenis: 'tanpa_data' }
  | { jenis: 'kurang'; kurang: number | null }
  | { jenis: 'ada'; terlaluYakin: string[]; pas: string[] };

/**
 * Kalibrasi keyakinan dari hasil server. Server hanya mengenal pola
 * 'overconfident' dan 'selaras' (tidak ada pola "terlalu ragu"), jadi layar
 * hanya menyebut terlalu yakin atau pas.
 */
export function ringkasKeyakinan(baris: RingkasanMapel[], minimumKalibrasi: number | null): RingkasKeyakinan {
  const cukup = baris.filter((b) => b.status_data === 'cukup_data');
  if (cukup.length) {
    return {
      jenis: 'ada',
      terlaluYakin: cukup.filter((b) => b.pola === 'overconfident').map((b) => b.mapel_id),
      pas: cukup.filter((b) => b.pola === 'selaras').map((b) => b.mapel_id),
    };
  }
  const terbanyak = Math.max(0, ...baris.map((b) => b.kartu_dikerjakan));
  if (terbanyak === 0) return { jenis: 'tanpa_data' };
  return { jenis: 'kurang', kurang: minimumKalibrasi === null ? null : Math.max(1, minimumKalibrasi - terbanyak) };
}

export type KartuSaran = {
  teks: string;
  tombol: string;
  tujuan: { pathname: '/latihan'; params: { mapel: string; asal: 'saran' } } | { pathname: '/latihan' } | { pathname: '/arsip-tulis' };
};

/**
 * LANJUT_077 — kartu "Latihan berikutnya" di Beranda (semua jenjang). Tampil
 * HANYA bila saran harian (GET /saran-harian, dihitung server dari jawaban yang
 * diberi keyakinan, ambang dari konfigurasi_levelin) memilih SATU mapel dari data
 * yang sudah cukup (jenis 'saran'). Jenis lain — belum cukup data, pengguna baru,
 * arsip kosong, atau kalibrasi selaras tanpa mapel — dan data yang belum ada →
 * null: kartu tidak tampil. Tidak ada angka ambang di sini.
 */
export function latihanBerikutnya(
  saran: SaranHarian | null | undefined
): { mapelId: string; tujuan: { pathname: '/latihan'; params: { mapel: string; asal: 'saran' } } } | null {
  if (!saran || saran.jenis !== 'saran' || !saran.mapel_id) return null;
  return { mapelId: saran.mapel_id, tujuan: { pathname: '/latihan', params: { mapel: saran.mapel_id, asal: 'saran' } } };
}

/** Kartu saran harian dari /saran-harian. `nama` = nama mapel untuk tampilan. */
export function kartuSaran(saran: SaranHarian, nama: (mapelId: string) => string): KartuSaran {
  const keLatihan = (mapelId: string) => ({ pathname: '/latihan' as const, params: { mapel: mapelId, asal: 'saran' as const } });
  switch (saran.jenis) {
    case 'saran': {
      const m = nama(saran.mapel_id!);
      const a = saran.alasan;
      const alasan = a ? ` Dari ${a.kartu_dikerjakan} kartu terakhir yang kamu isi keyakinannya, ${Math.round(a.rate_overconfident * 100)}% kamu yakin tapi jawabannya salah.` : '';
      return { teks: `Latih ${m} hari ini.${alasan}`, tombol: `Latihan ${m}`, tujuan: keLatihan(saran.mapel_id!) };
    }
    case 'kalibrasi_selaras':
      return { teks: 'Keyakinanmu sudah pas dengan hasilmu. Lanjutkan latihan rutin di mapel mana saja.', tombol: 'Mulai latihan', tujuan: { pathname: '/latihan' } };
    case 'belum_cukup_data': {
      const m = nama(saran.mapel_id!);
      return { teks: `Lanjut latihan ${m} dan isi keyakinanmu, supaya saran berikutnya lebih tepat.`, tombol: `Latihan ${m}`, tujuan: keLatihan(saran.mapel_id!) };
    }
    case 'pengguna_baru':
      if (!saran.mapel_id) return { teks: 'Mulai latihan dari mapel mana saja.', tombol: 'Mulai latihan', tujuan: { pathname: '/latihan' } };
      return {
        teks: `Mulai dari ${nama(saran.mapel_id)}. Isi juga seberapa yakin kamu di tiap kartu.`,
        tombol: `Latihan ${nama(saran.mapel_id)}`,
        tujuan: keLatihan(saran.mapel_id),
      };
    case 'arsip_kosong':
    default:
      // 15 Okt 2026: modul yang diunggah juga bahan latihan (DRAF).
      return { teks: 'Belum ada bahan untuk dilatih. Tulis kartu atau unggah modul dulu di Arsip Belajar.', tombol: 'Tulis kartu', tujuan: { pathname: '/arsip-tulis' } };
  }
}
