// Rute `persetujuan` (LANJUT_047), seluruhnya wajib login dan hanya untuk
// akun sendiri (tidak ada parameter id akun).
//
//   GET  /saya   status persetujuan akun sendiri
//   POST /       siswa menerima kebijakan privasi { jenis, versi };
//                jenis 'ortu_wali' selalu 403 (dicatat lewat sekolah)
//   POST /ortu-wali  orang tua/wali menyatakan persetujuan di app { versi, pernyataan: true };
//                sumber 'konfirmasi_di_app', butuh kebijakan versi berlaku sudah diterima

const express = require('express');
const wajibLogin = require('../../middleware/wajibLogin');
const { validasiBody } = require('../../middleware/validasi');
const { catatSkema, ortuWaliSkema } = require('./persetujuan.skema');
const { sukses } = require('../../util/respons');
const layanan = require('./persetujuan.layanan');

const router = express.Router();

router.use(wajibLogin);

router.get('/saya', async (req, res, next) => {
  try {
    sukses(res, await layanan.statusSaya(req.pengguna.id));
  } catch (err) {
    next(err);
  }
});

router.post('/', validasiBody(catatSkema), async (req, res, next) => {
  try {
    const { baru } = await layanan.catatOlehSiswa(req.pengguna.id, req.body);
    sukses(res, await layanan.statusSaya(req.pengguna.id), undefined, baru ? 201 : 200);
  } catch (err) {
    next(err);
  }
});

router.post('/ortu-wali', validasiBody(ortuWaliSkema), async (req, res, next) => {
  try {
    const { baru } = await layanan.konfirmasiOrtuWali(req.pengguna.id, req.body.versi);
    sukses(res, await layanan.statusSaya(req.pengguna.id), undefined, baru ? 201 : 200);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
