// Penentu data linimasa & kartu Info Penting terverifikasi (LANJUT_066).
// Cermin dari LANJUT_App/lib/linimasa.ts dan LANJUT_App/lib/sumber.ts untuk pengujian server.

const { kelompokJenjang } = require('./beranda');

function uraiTanggal(iso) {
  if (typeof iso !== 'string') return NaN;
  const bagian = iso.slice(0, 10).split('-').map(Number);
  if (bagian.length !== 3 || bagian.some((n) => Number.isNaN(n))) return NaN;
  const [tahun, bulan, tanggal] = bagian;
  return Date.UTC(tahun, bulan - 1, tanggal);
}

// Asia/Jakarta (WIB) = UTC+7 tetap, tanpa waktu musim panas (LANJUT_072b).
const SELISIH_WIB_MS = 7 * 60 * 60 * 1000;

/** Tanggal hari ini di Asia/Jakarta sebagai tengah malam UTC; tidak bergantung zona waktu mesin. */
function hariIniWib(sekarangMs = Date.now()) {
  const wib = new Date(sekarangMs + SELISIH_WIB_MS);
  return Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate());
}

function tanggalTeks(ms, opsi) {
  try {
    return new Intl.DateTimeFormat('id-ID', { ...opsi, timeZone: 'UTC' }).format(new Date(ms));
  } catch {
    return '';
  }
}

function formatTanggal(iso) {
  const t = uraiTanggal(iso);
  return Number.isNaN(t) ? '' : tanggalTeks(t, { day: 'numeric', month: 'long', year: 'numeric' });
}

function formatRentang(mulai, selesai) {
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

function lembagaSumber(url) {
  const u = url || '';
  if (u.includes('vokasi.kemdikbud.go.id')) return 'Direktorat SMK, Kemendikdasmen';
  if (u.includes('kemendikdasmen.go.id')) return 'laman resmi Kemendikdasmen';
  if (u.includes('snpmb')) return 'laman resmi SNPMB';
  return 'laman resmi';
}

function turunkanLinimasa(data, hariIniMs = hariIniWib()) {
  const terverifikasi = (data || []).filter(
    (t) => t.status_verifikasi === 'terverifikasi' && t.diperiksa_pada != null
  );

  const butir = terverifikasi
    .slice()
    .sort((a, b) => uraiTanggal(a.tanggal_mulai) - uraiTanggal(b.tanggal_mulai))
    .map((t) => ({ ...t, status: 'idle' }));

  let terdekat = null;
  let momenTerdekat = null;
  for (const b of butir) {
    const selesai = uraiTanggal(b.tanggal_selesai);
    if (Number.isNaN(selesai)) continue;
    if (selesai < hariIniMs) {
      b.status = 'done';
      continue;
    }
    const mulai = uraiTanggal(b.tanggal_mulai);
    const kandidat =
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
    momen: momenTerdekat ? momenTerdekat.momen : null,
  };
}

/**
 * Mengambil paling banyak tiga kartu Info Penting dari data terverifikasi (LANJUT_066).
 * Relevansi jenjang: hanya berlaku untuk kelas 12. LANJUT_072b: tanpa tahapan
 * berstatus 'done' (tanggal selesai sudah lewat, WIB).
 */
function infoPentingLinimasa(data, kelas, hariIniMs = hariIniWib()) {
  const kelompok = kelompokJenjang(kelas);
  if (kelompok !== 'kelas12') {
    return [];
  }
  const hasil = turunkanLinimasa(data, hariIniMs);
  return hasil.butir.filter((b) => b.status !== 'done').slice(0, 3);
}

const KALIMAT_INFO_PENTING_KOSONG = 'Belum ada info penting untuk saat ini.';

/** Seksi Info Penting: 'kartu' | 'kosong' (semua sudah lewat) | 'sembunyi' (LANJUT_072b). */
function tampilanInfoPenting(data, kelas, hariIniMs = hariIniWib()) {
  if (kelompokJenjang(kelas) !== 'kelas12') return { jenis: 'sembunyi' };
  const butir = infoPentingLinimasa(data, kelas, hariIniMs);
  if (butir.length) return { jenis: 'kartu', butir };
  const adaTerverifikasi = turunkanLinimasa(data, hariIniMs).butir.length > 0;
  return adaTerverifikasi ? { jenis: 'kosong', kalimat: KALIMAT_INFO_PENTING_KOSONG } : { jenis: 'sembunyi' };
}

module.exports = {
  uraiTanggal,
  formatTanggal,
  formatRentang,
  lembagaSumber,
  hariIniWib,
  turunkanLinimasa,
  infoPentingLinimasa,
  tampilanInfoPenting,
  KALIMAT_INFO_PENTING_KOSONG,
};
