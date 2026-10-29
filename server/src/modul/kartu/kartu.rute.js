// Rute `kartu` — F6, seluruhnya wajib login (§4.5).

const express = require('express');
const wajibLogin = require('../../middleware/wajibLogin');
const { validasiBody, validasiQuery } = require('../../middleware/validasi');
const { daftarSkema, buatKartuSkema, perbaruiKartuSkema } = require('./kartu.skema');
const { sukses } = require('../../util/respons');
const layanan = require('./kartu.layanan');

const router = express.Router();

router.use(wajibLogin);

router.get('/', validasiQuery(daftarSkema), async (req, res, next) => {
  try {
    const baris = await layanan.daftar(req.pengguna.id, req.query);
    sukses(res, baris);
  } catch (err) {
    next(err);
  }
});

router.post('/', validasiBody(buatKartuSkema), async (req, res, next) => {
  try {
    const kartu = await layanan.tambah(req.pengguna.id, req.body);
    sukses(res, kartu, undefined, 201);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validasiBody(perbaruiKartuSkema), async (req, res, next) => {
  try {
    const kartu = await layanan.perbarui(req.pengguna.id, req.params.id, req.body);
    sukses(res, kartu);
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await layanan.hapus(req.pengguna.id, req.params.id);
    sukses(res, { dihapus: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
