// Banner pengumuman Beranda (LANJUT_073). Tanpa SQL, tanpa jaringan.
//
// Sumber: server/config/banner-beranda.json — dikurasi tim, BUKAN berita dari
// internet. Berbeda dengan kartu-bantuan.json (dibaca sekali dan menggagalkan
// server bila rusak), berkas ini dibaca SETIAP permintaan: isinya bisa diganti
// tanpa menyalakan ulang server, dan berkas rusak hanya membuat banner kosong
// (`banner: []`) plus satu peringatan di log — server tidak pernah mati karenanya.
//
// Gagal-tertutup: SATU masalah di berkas (JSON rusak, struktur salah, satu item
// tidak sah) membuat seluruh banner kosong. Yang terkirim paling banyak MAKS_BANNER
// item terverifikasi yang berlaku hari ini (WIB), hanya medan publik — tiga sejak
// LANJUT_074 (carousel Beranda), sebelumnya satu (LANJUT_073).
// Log hanya penanda & letak medan; isi banner tidak pernah dicatat.

const fs = require('fs');
const path = require('path');
const { z } = require('zod');
const { hariIniWib, uraiTanggal } = require('../../util/linimasa');

const BERKAS_BANNER = path.join(__dirname, '..', '..', '..', 'config', 'banner-beranda.json');
const MAKS_JUDUL = 80;
const MAKS_ISI = 200;
const MAKS_BANNER = 3;
const MEDAN_PUBLIK = ['id', 'judul', 'isi', 'sumber', 'url_sumber', 'tanggal_selesai'];

/** Jumlah karakter (code point), bukan unit UTF-16 — emoji dihitung satu. */
const panjang = (s) => Array.from(s).length;

/** YYYY-MM-DD yang benar-benar ada di kalender (2026-02-30 ditolak). */
function tanggalSah(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [t, b, h] = s.split('-').map(Number);
  const d = new Date(Date.UTC(t, b - 1, h));
  return d.getUTCFullYear() === t && d.getUTCMonth() === b - 1 && d.getUTCDate() === h;
}

/** Hanya https:// dengan host — http, javascript:, dsb. ditolak. */
function urlHttpsSah(url) {
  if (!url.startsWith('https://')) return false;
  try {
    return new URL(url).hostname.length > 0;
  } catch {
    return false;
  }
}

const tanggal = z.string().trim().refine(tanggalSah, 'tanggal harus YYYY-MM-DD yang ada di kalender');
const teksWajib = (maks) =>
  z.string().trim().min(1, 'wajib diisi').refine((s) => panjang(s) <= maks, `maksimal ${maks} karakter`);

const itemSkema = z
  .object({
    id: z.string().trim().min(1, 'wajib diisi'),
    judul: teksWajib(MAKS_JUDUL),
    isi: teksWajib(MAKS_ISI),
    tanggal_mulai: tanggal,
    tanggal_selesai: tanggal,
    sumber: z.string().trim().min(1, 'wajib diisi'),
    url_sumber: z.string().trim().refine(urlHttpsSah, 'wajib https://'),
    status_verifikasi: z.enum(['belum_diverifikasi', 'terverifikasi']),
    // Tanpa diperiksa_pada (tidak ada, null, atau "") = belum terverifikasi, bukan galat.
    diperiksa_pada: z.union([tanggal, z.string().trim().max(0), z.null()]).optional(),
  })
  .refine((b) => b.tanggal_mulai <= b.tanggal_selesai, { message: 'tanggal_mulai sesudah tanggal_selesai', path: ['tanggal_mulai'] });

const berkasSkema = z
  .object({ versi: z.literal(1), banner: z.array(itemSkema) })
  .superRefine((b, ctx) => {
    const terlihat = new Set();
    b.banner.forEach((item, i) => {
      if (terlihat.has(item.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'id ganda', path: ['banner', i, 'id'] });
      terlihat.add(item.id);
    });
  });

/** Teks mentah berkas. Diganti di tes lewat t.mock.method (pola konten-linimasa.test.js). */
async function bacaBerkas() {
  return fs.promises.readFile(BERKAS_BANNER, 'utf8');
}

function peringatan(alasan, rincian) {
  console.warn('[banner-beranda] banner dikosongkan:', alasan, ...(rincian ? [rincian] : []));
}

/**
 * Teks berkas → daftar item sah, atau null bila berkas tidak sah (sudah dicatat).
 * Isi item tidak pernah ikut ke log.
 */
function periksaBerkas(teks) {
  let json;
  try {
    json = JSON.parse(teks);
  } catch {
    peringatan('JSON rusak');
    return null;
  }
  const hasil = berkasSkema.safeParse(json);
  if (!hasil.success) {
    const medan = [...new Set(hasil.error.issues.map((m) => m.path.join('.') || '(akar)'))];
    peringatan(`${hasil.error.issues.length} masalah`, `di ${medan.join(', ')}`);
    return null;
  }
  return hasil.data.banner;
}

/** Item sah → paling banyak MAKS_BANNER banner publik yang berlaku pada `hariIniMs` (WIB). */
function pilihBanner(daftar, hariIniMs) {
  return daftar
    .filter((b) => b.status_verifikasi === 'terverifikasi' && Boolean(b.diperiksa_pada))
    .filter((b) => uraiTanggal(b.tanggal_mulai) <= hariIniMs && hariIniMs <= uraiTanggal(b.tanggal_selesai))
    // tanggal_mulai paling baru; bila sama, id terkecil (urutan tetap, tidak bergantung urutan berkas).
    .sort((a, b) => uraiTanggal(b.tanggal_mulai) - uraiTanggal(a.tanggal_mulai) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, MAKS_BANNER)
    .map((b) => Object.fromEntries(MEDAN_PUBLIK.map((k) => [k, b[k]])));
}

/** Banner untuk GET /konten/banner. Tidak pernah melempar karena berkas. */
async function bannerAktif(sekarangMs = Date.now()) {
  let teks;
  try {
    teks = await module.exports.bacaBerkas();
  } catch (err) {
    peringatan(err && err.code === 'ENOENT' ? 'berkas tidak ditemukan' : 'berkas tidak bisa dibaca');
    return [];
  }
  const daftar = periksaBerkas(teks);
  return daftar ? pilihBanner(daftar, hariIniWib(sekarangMs)) : [];
}

module.exports = {
  BERKAS_BANNER,
  MAKS_JUDUL,
  MAKS_ISI,
  MAKS_BANNER,
  MEDAN_PUBLIK,
  bacaBerkas,
  periksaBerkas,
  pilihBanner,
  bannerAktif,
  urlHttpsSah,
  tanggalSah,
};
