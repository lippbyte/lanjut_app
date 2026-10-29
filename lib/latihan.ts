import type { CatatanLatihan, Kartu, Mapel, PotonganLatihan } from '../api/types';

/**
 * F7 Latihan (LANJUT_041) — antrian sederhana TANPA Level-In: kartu milik
 * sendiri (Arsip Belajar) dan, sejak 15 Okt 2026, potongan modul yang diunggah
 * (ItemLatihan di bawah), diacak, dipotong ke batas sesi. Tidak ada spaced
 * repetition atau skor kesulitan. LANJUT_058: tiap kartu boleh diberi
 * keyakinan (bahan kalibrasi Level-In di server). Logika murni, pola lib/arsip.ts.
 */

/**
 * Keyakinan (LANJUT_058) — tiga pilihan, dipetakan ke skala 1–5 yang sudah
 * dipakai server dan PWA (levelin.skema.js, keputusan.js). Angka mengikuti
 * label PWA (MVP-PWA/latihan.html): 4 "Yakin", 2 "Ragu", 1 "Ragu banget".
 * Dengan ambang bawaan (tinggi ≥ 4, rendah ≤ 2): yakin lalu salah = terlalu
 * yakin; ragu/tebak lalu benar = terlalu ragu. Boleh dilewati (tidak dikirim).
 * Salinan teks §4.18 — DRAF.
 */
export const KEYAKINAN = [
  { kode: 'yakin', label: 'Yakin', nilai: 4 },
  { kode: 'ragu', label: 'Ragu', nilai: 2 },
  { kode: 'tebak', label: 'Tebak', nilai: 1 },
] as const;
export type KodeKeyakinan = (typeof KEYAKINAN)[number]['kode'];

export const TEKS_KEYAKINAN = {
  tanya: 'Seberapa yakin kamu?',
  petunjuk: 'Pilih sebelum membuka jawaban. Boleh dilewati.',
  terpilih: (label: string) => `Keyakinanmu: ${label}.`,
  dilewati: 'Keyakinan dilewati.',
};

/** Kode pilihan → nilai skala server; `null` (dilewati) → tidak dikirim. */
export function nilaiKeyakinan(kode: KodeKeyakinan | null): number | undefined {
  return KEYAKINAN.find((k) => k.kode === kode)?.nilai;
}

// Salinan §4.7 (disetujui): "12 kartu, kira-kira 8 menit" dan "Lagi padat?
// Ambil 5 kartu saja." — jadi satu sesi paling banyak 12 kartu, pilihan
// singkat 5. Kartu yang tersedia lebih sedikit → semuanya dipakai.
export const BATAS_SESI = 12;
export const BATAS_SINGKAT = 5;

/** Kira-kira 40 detik per kartu: 12 kartu ≈ 8 menit, sama dengan salinan §4.7. */
export function perkiraanMenit(jumlahKartu: number): number {
  return Math.max(1, Math.round((jumlahKartu * 40) / 60));
}

/** Fisher–Yates; `acak` bisa diganti di tes supaya hasilnya pasti. Masukan tidak diubah. */
export function kocok<T>(daftar: readonly T[], acak: () => number = Math.random): T[] {
  const hasil = [...daftar];
  for (let i = hasil.length - 1; i > 0; i--) {
    const j = Math.floor(acak() * (i + 1));
    [hasil[i], hasil[j]] = [hasil[j], hasil[i]];
  }
  return hasil;
}

/** Kartu yang bisa dilatih: milik sendiri saja (kurasi tidak pernah ikut), opsional satu mapel. */
export function kartuUntukLatihan(kartu: Kartu[], mapelId: string | null): Kartu[] {
  return kartu.filter((k) => k.sumber === 'pengguna' && (!mapelId || k.mapel_id === mapelId));
}

/**
 * Satu butir antrian Latihan: kartu buatan sendiri, ATAU potongan modul yang diunggah
 * (15 Okt 2026 — pilihan percakapan, belum disetujui PM: modul ikut menjadi Arsip Belajar
 * yang bisa dilatih, jadi ikut dihitung Level-In). Potongan modul dilatih seperti kartu
 * Catatan: tampil isyarat (kalimat awalnya), siswa mencoba mengingat lanjutannya, lalu
 * membuka isinya dan menilai sendiri.
 */
export type ItemLatihan = {
  kunci: string;
  mapelId: string;
  judul: string;
  soal: boolean;
  /** Tampil sebelum dibuka: isi soal, atau kalimat awal potongan modul. Catatan: null. */
  isyarat: string | null;
  /** Tampil sesudah dibuka: jawaban soal, isi catatan, atau potongan modul utuh. */
  isi: string;
  /** null = dari modul: jawabannya dicatat per mapel (mapel_id), tanpa kartu. */
  kartuId: string | null;
  modul: { judul: string; bagian: number; jumlahBagian: number } | null;
};

// Teks Latihan untuk potongan modul (15 Okt 2026) — DRAF, belum disetujui Khalifa.
export const TEKS_LATIHAN_MODUL = {
  jenis: 'Modul',
  bagian: (bagian: number, jumlah: number) => `Bagian ${bagian} dari ${jumlah}`,
  ajakan: 'Coba ingat lanjutan bagian ini dulu.',
  labelIsi: 'Isi bagian ini',
  kosongJudul: 'Belum ada bahan untuk dilatih.',
  kosongTeks: 'Latihan memakai kartu buatanmu dan modul yang kamu unggah di Arsip Belajar. Tambah kartu atau unggah modul dulu.',
  unggahModul: 'Unggah modul',
} as const;

export function itemDariKartu(k: Kartu): ItemLatihan {
  const soal = !!k.jawaban;
  return {
    kunci: `kartu:${k.id}`,
    mapelId: k.mapel_id,
    judul: k.judul,
    soal,
    isyarat: soal ? k.isi : null,
    isi: soal ? (k.jawaban as string) : k.isi,
    kartuId: k.id,
    modul: null,
  };
}

const PANJANG_ISYARAT_MAKS = 160;

/**
 * Kalimat awal potongan modul sebagai isyarat: kalimat pertama yang cukup panjang (≥ 20
 * huruf), atau, bila tidak ada / terlalu panjang, potongan awal yang dipotong di batas kata.
 */
export function isyaratPotongan(isi: string): string {
  const teks = isi.replace(/\s+/g, ' ').trim();
  const kalimat = teks.match(/^(.{20,}?[.!?])(?=\s|$)/)?.[1];
  if (kalimat && kalimat.length <= PANJANG_ISYARAT_MAKS) return kalimat;
  if (teks.length <= PANJANG_ISYARAT_MAKS) return teks;
  const potong = teks.slice(0, PANJANG_ISYARAT_MAKS);
  const spasi = potong.lastIndexOf(' ');
  return `${(spasi > PANJANG_ISYARAT_MAKS / 2 ? potong.slice(0, spasi) : potong).replace(/[\s,;:]+$/, '')}…`;
}

export function itemDariPotongan(p: PotonganLatihan): ItemLatihan {
  return {
    kunci: `modul:${p.modul_id}:${p.urutan}`,
    mapelId: p.mapel_id,
    judul: p.judul,
    soal: false,
    isyarat: isyaratPotongan(p.isi),
    isi: p.isi,
    kartuId: null,
    modul: { judul: p.judul, bagian: p.urutan + 1, jumlahBagian: p.jumlah_bagian },
  };
}

/** Kartu sendiri + potongan modul, opsional satu mapel, sebagai butir antrian. */
export function bahanLatihan(kartu: Kartu[], potongan: PotonganLatihan[], mapelId: string | null): ItemLatihan[] {
  return [
    ...kartuUntukLatihan(kartu, mapelId).map(itemDariKartu),
    ...potongan.filter((p) => !mapelId || p.mapel_id === mapelId).map(itemDariPotongan),
  ];
}

export function susunAntrian(
  kartu: Kartu[],
  potongan: PotonganLatihan[],
  mapelId: string | null,
  batas: number,
  acak?: () => number
): ItemLatihan[] {
  return kocok(bahanLatihan(kartu, potongan, mapelId), acak).slice(0, batas);
}

/**
 * Jumlah bahan per mapel untuk pilihan mapel: kartu sendiri + SEMUA potongan modul (jumlah dari
 * server, bukan dari contoh acak). Urut sesuai `mapel` (mapel pilihan lebih dulu bila pemanggil
 * mengurutkannya); mapel yang sudah tidak ada di daftar tetap tampil dengan id-nya.
 */
export function mapelLatihan(
  kartu: Kartu[],
  modulPerMapel: { mapel_id: string; jumlah: number }[],
  mapel: Mapel[]
): { id: string; nama: string; jumlah: number }[] {
  const jumlah = new Map<string, number>();
  for (const k of kartuUntukLatihan(kartu, null)) jumlah.set(k.mapel_id, (jumlah.get(k.mapel_id) ?? 0) + 1);
  for (const m of modulPerMapel) if (m.jumlah > 0) jumlah.set(m.mapel_id, (jumlah.get(m.mapel_id) ?? 0) + m.jumlah);
  const dikenal = mapel.filter((m) => jumlah.has(m.id)).map((m) => ({ id: m.id, nama: m.nama, jumlah: jumlah.get(m.id)! }));
  const lain = [...jumlah.keys()].filter((id) => !mapel.some((m) => m.id === id)).map((id) => ({ id, nama: id, jumlah: jumlah.get(id)! }));
  return [...dikenal, ...lain];
}

/** Jumlah bahan: satu mapel, atau semua mapel bila `mapelId` null. */
export function jumlahBahan(perMapel: { id: string; jumlah: number }[], mapelId: string | null): number {
  return perMapel.filter((m) => !mapelId || m.id === mapelId).reduce((total, m) => total + m.jumlah, 0);
}

/** Catatan jawaban: kartu → kartu_id; potongan modul → mapel_id (server menerima keduanya). */
export function catatanJawaban(
  item: ItemLatihan,
  dasar: { id: string; sesi_id: string; benar: boolean; waktu: string; keyakinan?: number }
): CatatanLatihan {
  return item.kartuId ? { ...dasar, kartu_id: item.kartuId } : { ...dasar, mapel_id: item.mapelId };
}

/**
 * Id buatan klien untuk sesi & catatan (idempotensi kirim ulang, B-K3).
 * Bukan rahasia — server tetap memeriksa kepemilikan. Pakai randomUUID bila
 * tersedia; selain itu UUID v4 dari Math.random.
 */
export function buatId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (h) => {
    const r = Math.floor(Math.random() * 16);
    return (h === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** "2 Oktober 2026, 19.30" — waktu lokal perangkat (sesi bisa larut malam WIB). */
export function formatWaktuSesi(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return d.toISOString().slice(0, 10);
  }
}
