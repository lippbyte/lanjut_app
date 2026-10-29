const express = require('express');
const wajibLogin = require('../../middleware/wajibLogin');
const { validasiBody } = require('../../middleware/validasi');
const { klaimSkema } = require('./sinkron.skema');
const { sukses } = require('../../util/respons');
const layanan = require('./sinkron.layanan');

const router = express.Router();

router.post('/klaim', wajibLogin, validasiBody(klaimSkema), async (req, res, next) => {
  try {
    const hasil = await layanan.klaim(req.pengguna.id, req.body);
    sukses(res, hasil);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
