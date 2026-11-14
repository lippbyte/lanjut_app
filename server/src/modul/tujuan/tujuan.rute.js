// Rute Tujuan Saya (LANJUT_023 seri v2). Hanya dipasang bila JALUR_TUJUAN_AKTIF menyala.
// Gerbang sama dengan Portofolio: 401 belum masuk, 403 kebijakan privasi belum diterima.
// Tujuan atau butir akun lain menjawab 404, supaya keberadaannya tidak bisa ditebak.
//
//   GET    /                    tujuan terkini, dan prodi impian dari Data Akun
//   POST   /                    buat tujuan
//   GET    /perjalanan          babak jalur dan versi tujuan, menurut waktu
//   GET    /:id/riwayat         semua versi satu tujuan, lama ke baru
//   POST   /:id/versi           perbarui tujuan: versi baru, versi lama tetap ada
//   PATCH  /:id/status          tandai tercapai atau ditinggalkan
//   PATCH  /bukti/:butirId      tautkan butir bukti ke jalur dan/atau tujuan
//
// Tidak ada rute hapus dan tidak ada rute yang menimpa isi tujuan.

const express = require('express');
const wajibLogin = require('../../middleware/wajibLogin');
const { validasiBody } = require('../../middleware/validasi');
const { GalatApi, sukses } = require('../../util/respons');
const { POLA_UUID } = require('../butir-bukti/butir-bukti.skema');
const { buatTujuanSkema, versiTujuanSkema, akhiriTujuanSkema, kaitanBuktiSkema } = require('./tujuan.skema');
const { pastikanBoleh } = require('../jalur-minat/jalur-minat.layanan');
const layanan = require('./tujuan.layanan');

const router = express.Router();

router.use(wajibLogin, async (req, res, next) => {
  try {
    await pastikanBoleh(req.pengguna.id);
    next();
  } catch (err) {
    next(err);
  }
});

function periksaId(pesan) {
  return (req, res, next, nilai) => (POLA_UUID.test(nilai) ? next() : next(new GalatApi('TIDAK_DITEMUKAN', pesan)));
}
router.param('id', periksaId('Tujuan tidak ditemukan.'));
router.param('butirId', periksaId('Butir tidak ditemukan.'));

const tangani = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

router.get('/', tangani(async (req, res) => sukses(res, await layanan.daftar(req.pengguna.id))));
router.post('/', validasiBody(buatTujuanSkema), tangani(async (req, res) => sukses(res, await layanan.buat(req.pengguna.id, req.body), undefined, 201)));
router.get('/perjalanan', tangani(async (req, res) => sukses(res, await layanan.perjalanan(req.pengguna.id))));
router.get('/:id/riwayat', tangani(async (req, res) => sukses(res, await layanan.riwayat(req.pengguna.id, req.params.id))));
router.post('/:id/versi', validasiBody(versiTujuanSkema), tangani(async (req, res) => sukses(res, await layanan.perbarui(req.pengguna.id, req.params.id, req.body), undefined, 201)));
router.patch('/:id/status', validasiBody(akhiriTujuanSkema), tangani(async (req, res) => sukses(res, await layanan.akhiri(req.pengguna.id, req.params.id, req.body))));
router.patch('/bukti/:butirId', validasiBody(kaitanBuktiSkema), tangani(async (req, res) => sukses(res, await layanan.tautkanBukti(req.pengguna.id, req.params.butirId, req.body))));

module.exports = router;
