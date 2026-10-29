// Rute `butir-pribadi` — butir Daftar Periksa milik akun (LANJUT_034),
// seluruhnya wajib login (§4.5).
//
//   GET    /                daftar butir milik sendiri
//   POST   /                simpan dari F3 (mapel_tka) / F10 (riset_kampus)
//   PUT    /:id/selesai     centang
//   DELETE /:id/selesai     batal centang (selesai_pada NULL, baris tetap)
//   DELETE /:id             hapus butir (hapus lunak)

const express = require('express');
const wajibLogin = require('../../middleware/wajibLogin');
const { validasiBody } = require('../../middleware/validasi');
const { simpanSkema } = require('./butir-pribadi.skema');
const { sukses } = require('../../util/respons');
const layanan = require('./butir-pribadi.layanan');

const router = express.Router();

router.use(wajibLogin);

router.get('/', async (req, res, next) => {
  try {
    sukses(res, await layanan.daftar(req.pengguna.id));
  } catch (err) {
    next(err);
  }
});

router.post('/', validasiBody(simpanSkema), async (req, res, next) => {
  try {
    const { butir, baru } = await layanan.simpan(req.pengguna.id, req.body);
    sukses(res, butir, undefined, baru ? 201 : 200);
  } catch (err) {
    next(err);
  }
});

router.put('/:id/selesai', async (req, res, next) => {
  try {
    sukses(res, await layanan.aturSelesai(req.pengguna.id, req.params.id, true));
  } catch (err) {
    next(err);
  }
});

router.delete('/:id/selesai', async (req, res, next) => {
  try {
    sukses(res, await layanan.aturSelesai(req.pengguna.id, req.params.id, false));
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
