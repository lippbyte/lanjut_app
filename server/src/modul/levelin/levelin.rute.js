// Rute Level-In — docs/SDD-Backend-Foundation.md §4.6. Seluruhnya wajib login
// KECUALI /konfigurasi/levelin (boleh diakses tamu — bukan data pribadi).

const express = require('express');
const wajibLogin = require('../../middleware/wajibLogin');
const { validasiBody, validasiQuery } = require('../../middleware/validasi');
const {
  mulaiSesiSkema,
  tutupSesiSkema,
  riwayatBorongSkema,
  ringkasanQuerySkema,
} = require('./levelin.skema');
const { sukses } = require('../../util/respons');
const layanan = require('./levelin.layanan');

const router = express.Router();

router.post('/sesi-latihan', wajibLogin, validasiBody(mulaiSesiSkema), async (req, res, next) => {
  try {
    const hasil = await layanan.mulaiSesi(req.pengguna.id, req.body);
    sukses(res, hasil, undefined, 201);
  } catch (err) {
    next(err);
  }
});

// Riwayat Latihan (LANJUT_041) — sesi milik sendiri saja.
router.get('/sesi-latihan', wajibLogin, async (req, res, next) => {
  try {
    sukses(res, await layanan.daftarSesi(req.pengguna.id));
  } catch (err) {
    next(err);
  }
});

router.patch(
  '/sesi-latihan/:id',
  wajibLogin,
  validasiBody(tutupSesiSkema),
  async (req, res, next) => {
    try {
      const hasil = await layanan.tutupSesi(req.pengguna.id, req.params.id, req.body);
      sukses(res, hasil);
    } catch (err) {
      next(err);
    }
  }
);

router.post(
  '/riwayat-latihan',
  wajibLogin,
  validasiBody(riwayatBorongSkema),
  async (req, res, next) => {
    try {
      const hasil = await layanan.simpanRiwayatBorongan(req.pengguna.id, req.body);
      sukses(res, hasil, undefined, 201);
    } catch (err) {
      next(err);
    }
  }
);

router.get(
  '/kalibrasi/ringkasan',
  wajibLogin,
  validasiQuery(ringkasanQuerySkema),
  async (req, res, next) => {
    try {
      const hasil = await layanan.ringkasanKalibrasi(req.pengguna.id, req.query.jendela);
      sukses(res, hasil);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/saran-harian', wajibLogin, async (req, res, next) => {
  try {
    const hasil = await layanan.saranHarian(req.pengguna.id);
    sukses(res, hasil);
  } catch (err) {
    next(err);
  }
});

// Boleh diakses TANPA login — ambang, bukan data pribadi (§4.6).
router.get('/konfigurasi/levelin', async (req, res, next) => {
  try {
    const hasil = await layanan.konfigurasi();
    sukses(res, hasil);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
