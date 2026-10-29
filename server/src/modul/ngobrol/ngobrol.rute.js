// Rute `ngobrol` — Ngobrol Bareng LANJUT dengan AI (LANJUT_051, LANJUT_053).
//
//   POST /                { pesan: [{ peran: 'pengguna' | 'bot', teks }] }
//                         → { balasan, kartu_bantuan, uji_coba, data_pribadi_disamarkan,
//                             sumber, web_habis, konteks, tautan }   (konteks/tautan: LANJUT_078)
//   GET  /status          { ai_aktif } (LANJUT_078) — untuk teks app yang khusus AI aktif
//   GET  /kartu-bantuan   kartu layanan bantuan (hanya yang terverifikasi)
//
// Wajib login. Urutan: login → tanda bahaya AKUT (dijawab server di sini, SEBELUM
// batas laju, gerbang, dan saklar: siswa dalam bahaya selalu mendapat kartu
// bantuan, tanpa AI) → gerbang persetujuan (bolehPakaiAi) → saklar ai_aktif →
// isi. LANJUT_078 mempertahankan urutan ini (pilihan percakapan, belum disetujui
// PM). Batas pemakaian per akun dibaca dari konfigurasi tiap permintaan.

const express = require('express');
const rateLimit = require('express-rate-limit');
const wajibLogin = require('../../middleware/wajibLogin');
const { validasiBody } = require('../../middleware/validasi');
const { galat, sukses } = require('../../util/respons');
const { kirimSkema } = require('./ngobrol.skema');
const layanan = require('./ngobrol.layanan');
const keselamatan = require('./keselamatan');
const pemakaian = require('./pemakaian');

const router = express.Router();

router.use(wajibLogin);

function batasPerAkun(windowMs, kunci) {
  return rateLimit({
    windowMs,
    limit: async () => (await layanan.batas())[kunci],
    keyGenerator: (req) => `pengguna:${req.pengguna.id}`,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => galat(res, 'TERLALU_SERING', 'Pesanmu sudah banyak. Istirahat sebentar, lalu coba lagi.'),
  });
}

/** Tanda bahaya akut di pesan terbaru → balasan tetap + kartu bantuan, AI tidak dipanggil. */
function tanganiTandaBahaya(req, res, next) {
  const pesan = req.body.pesan;
  if (keselamatan.deteksi(pesan[pesan.length - 1].teks).tingkat !== 'akut') return next();
  keselamatan.catat('akut');
  pemakaian.catat({ tanda_akut: 1 }); // LANJUT_060: hitungan harian, tidak ditunggu
  return sukses(res, layanan.balasanAkut());
}

router.get('/kartu-bantuan', (req, res) => sukses(res, keselamatan.kartuBantuan()));

router.get('/status', async (req, res, next) => {
  try {
    sukses(res, await layanan.status());
  } catch (e) {
    next(e);
  }
});

router.post(
  '/',
  validasiBody(kirimSkema),
  tanganiTandaBahaya,
  batasPerAkun(5 * 60 * 1000, 'per5Menit'),
  batasPerAkun(24 * 60 * 60 * 1000, 'per24Jam'),
  async (req, res, next) => {
    try {
      sukses(res, await layanan.balas(req.pengguna.id, req.body.pesan));
    } catch (e) {
      next(e);
    }
  }
);

module.exports = router;
