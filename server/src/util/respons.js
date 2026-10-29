// Bentuk respons seragam — docs/SDD-Backend-Foundation.md §4.2.

function sukses(res, data, meta, statusHttp) {
  const body = { ok: true, data: data === undefined ? {} : data };
  if (meta !== undefined) body.meta = meta;
  return res.status(statusHttp || 200).json(body);
}

// Peta kode galat → status HTTP (§4.2).
const STATUS_PER_KODE = {
  VALIDASI_GAGAL: 400,
  KREDENSIAL_SALAH: 401,
  TIDAK_MASUK: 401,
  SESI_KEDALUWARSA: 401,
  TIDAK_BERHAK: 403,
  TIDAK_DITEMUKAN: 404,
  NAMA_PENGGUNA_DIPAKAI: 409,
  KEBIJAKAN_USANG: 409, // LANJUT_047: versi kebijakan yang dikirim bukan yang berlaku
  // LANJUT_049 — unggah modul
  BATAS_MODUL: 409,
  BERKAS_TERLALU_BESAR: 413,
  TEKS_TERLALU_PANJANG: 413,
  TIPE_BERKAS_DITOLAK: 415,
  PDF_TERENKRIPSI: 422,
  PDF_TANPA_TEKS: 422,
  PDF_GAGAL_DIBACA: 422,
  EMAIL_DIPAKAI: 400,
  RUMPUN_TIDAK_SAH: 400, // LANJUT_075: minat_rumpun berisi nilai di luar daftar rumpun prodi
  KARTU_TIDAK_SAH: 400, // LANJUT_076: kartu_id event bukan kartu Arsip milik akun itu
  FITUR_BELUM_AKTIF: 403, // LANJUT_076: saklar fitur (mis. event_sekolah_aktif) mati
  KELAS_TIDAK_DIDUKUNG: 403, // LANJUT_076b: Persiapan Event hanya untuk kelas 7–9
  TERLALU_SERING: 429,
  // LANJUT_051 — Ngobrol dengan AI
  AI_BELUM_DIIZINKAN: 403, // gerbang bolehPakaiAi: persetujuan ortu/wali atau kebijakan belum ada
  AI_GAGAL: 502, // (sebelum LANJUT_078) penyedia AI gagal/menolak; kini AI_SEMENTARA_GAGAL
  AI_SEMENTARA_GAGAL: 503, // LANJUT_078: penyedia AI gagal, menolak, atau lewat 20 detik; rinciannya tidak dikirim ke app
  AI_TIDAK_TERSEDIA: 503, // kunci OpenRouter belum diisi di server
  // LANJUT_083 — masuk dengan kode email dan Google
  KODE_SALAH: 401,
  KODE_KEDALUWARSA: 401, // kode lewat 5 menit, sudah dipakai, digantikan, atau hangus setelah 5 percobaan
  OTP_TIDAK_TERSEDIA: 503, // SMTP belum diisi di server
  GOOGLE_TIDAK_SAH: 401,
  GOOGLE_TIDAK_TERSEDIA: 503, // GOOGLE_CLIENT_ID belum diisi, atau kunci publik Google tidak bisa diambil
  EMAIL_BELUM_TERVERIFIKASI: 401,
  SANDI_PERLU_DIBUAT: 403, // LANJUT_083d: sandi lama dicabut; masuk dengan kode email lalu buat sandi baru
  EMAIL_BELUM_DIVERIFIKASI: 403, // LANJUT_084: tenggat verifikasi akun lama lewat; masuk dengan kode email atau Google
  GALAT_SERVER: 500,
};

class GalatApi extends Error {
  constructor(kode, pesan, medan) {
    super(pesan || kode);
    this.kode = kode;
    this.medan = medan;
    this.statusHttp = STATUS_PER_KODE[kode] || 500;
  }
}

function galat(res, kode, pesan, medan) {
  const statusHttp = STATUS_PER_KODE[kode] || 500;
  const body = { ok: false, galat: { kode, pesan: pesan || kode } };
  if (medan) body.galat.medan = medan;
  return res.status(statusHttp).json(body);
}

module.exports = { sukses, galat, GalatApi, STATUS_PER_KODE };
