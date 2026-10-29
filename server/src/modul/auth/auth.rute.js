// Rute auth. Hanya membaca req, memanggil layanan, menyusun respons — tidak
// ada SQL dan tidak ada aturan bisnis di sini (§9.2 batas lapis).

const express = require('express');
const {
  daftarSkema,
  masukSkema,
  ubahSandiSkema,
  otpKirimSkema,
  otpVerifikasiSkema,
  daftarKirimKodeSkema,
  verifikasiEmailSkema,
  buatSandiSkema,
  googleSkema,
} = require('./auth.skema');
const { validasiBody } = require('../../middleware/validasi');
const wajibLogin = require('../../middleware/wajibLogin');
const { batasAuth, batasDaftar } = require('../../middleware/batasLaju');
const { sukses } = require('../../util/respons');
const layanan = require('./auth.layanan');
const otpLayanan = require('./otp.layanan');
const googleLayanan = require('./google.layanan');
const daftarEmailLayanan = require('./daftarEmail.layanan');

const router = express.Router();

router.post(
  '/daftar',
  batasDaftar,
  validasiBody(daftarSkema),
  async (req, res, next) => {
    try {
      const hasil = await layanan.daftar(req.body);
      sukses(res, hasil, undefined, 201);
    } catch (err) {
      next(err);
    }
  }
);

// LANJUT_083c — daftar dengan email: kode dulu, akun dibuat setelah kode benar.
router.post('/daftar/kirim-kode', batasDaftar, validasiBody(daftarKirimKodeSkema), async (req, res, next) => {
  try {
    sukses(res, await daftarEmailLayanan.kirimKodeDaftar(req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/daftar/verifikasi', batasAuth, validasiBody(otpVerifikasiSkema), async (req, res, next) => {
  try {
    sukses(res, await daftarEmailLayanan.verifikasiDaftar(req.body), undefined, 201);
  } catch (err) {
    next(err);
  }
});

// LANJUT_083c — verifikasi email akun yang sedang masuk (akun lama).
router.post('/email/kirim-kode', wajibLogin, batasAuth, async (req, res, next) => {
  try {
    sukses(res, await daftarEmailLayanan.kirimKodeVerifikasiEmail(req.pengguna.id));
  } catch (err) {
    next(err);
  }
});

router.post('/email/verifikasi', wajibLogin, batasAuth, validasiBody(verifikasiEmailSkema), async (req, res, next) => {
  try {
    sukses(res, await daftarEmailLayanan.verifikasiEmailAkun(req.pengguna.id, req.body));
  } catch (err) {
    next(err);
  }
});

// LANJUT_083d — kata sandi baru untuk sesi yang sedang aktif, hanya bila sandi lama dicabut.
router.post('/sandi/buat', wajibLogin, batasAuth, validasiBody(buatSandiSkema), async (req, res, next) => {
  try {
    sukses(res, await layanan.buatSandi(req.pengguna.id, req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/masuk', batasAuth, validasiBody(masukSkema), async (req, res, next) => {
  try {
    const hasil = await layanan.masuk(req.body);
    sukses(res, hasil);
  } catch (err) {
    next(err);
  }
});

// LANJUT_083 — masuk dengan kode email (tambahan, bukan pengganti /masuk).
router.post('/otp/kirim', batasAuth, validasiBody(otpKirimSkema), async (req, res, next) => {
  try {
    sukses(res, await otpLayanan.kirimOtp(req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/otp/verifikasi', batasAuth, validasiBody(otpVerifikasiSkema), async (req, res, next) => {
  try {
    sukses(res, await otpLayanan.verifikasiOtp(req.body));
  } catch (err) {
    next(err);
  }
});

// LANJUT_083 — masuk dengan Google. App meminta nonce dulu, lalu mengirim ID token.
router.get('/google/nonce', batasAuth, (req, res) => {
  sukses(res, { nonce: googleLayanan.buatNonce() });
});

router.post('/google', batasAuth, validasiBody(googleSkema), async (req, res, next) => {
  try {
    sukses(res, await googleLayanan.masukGoogle(req.body));
  } catch (err) {
    next(err);
  }
});

router.post('/keluar', wajibLogin, async (req, res, next) => {
  try {
    await layanan.keluar(req);
    sukses(res, { keluar: true });
  } catch (err) {
    next(err);
  }
});

router.post('/keluar-semua', wajibLogin, async (req, res, next) => {
  try {
    await layanan.keluarSemua(req.pengguna.id);
    sukses(res, { keluar: true });
  } catch (err) {
    next(err);
  }
});

router.get('/saya', wajibLogin, async (req, res, next) => {
  try {
    const profil = await layanan.saya(req.pengguna.id);
    sukses(res, profil);
  } catch (err) {
    next(err);
  }
});

router.post(
  '/ubah-sandi',
  wajibLogin,
  validasiBody(ubahSandiSkema),
  async (req, res, next) => {
    try {
      await layanan.ubahSandi(req.pengguna.id, req.body);
      sukses(res, { diubah: true });
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
