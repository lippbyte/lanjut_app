// Rute Jalur Saya (LANJUT_023 seri v2). Hanya dipasang bila JALUR_TUJUAN_AKTIF menyala.
// Urutan gerbang sama dengan Portofolio: 401 belum masuk, 403 kebijakan privasi belum diterima.
// Pilihan akun lain menjawab 404, supaya keberadaannya tidak bisa ditebak.
//
//   GET    /             daftar jalur aktif yang teksnya sudah disetujui (K37); kosong selama masih draf
//   GET    /saya         semua babak jalur milik sendiri, termasuk yang sudah berakhir
//   POST   /saya         memilih atau menambah jalur (babak baru); hanya jalur yang disetujui (K37)
//   PATCH  /saya/:id     menjeda, menyelesaikan, atau meninggalkan babak yang aktif
//
// Tidak ada rute hapus: riwayat jalur tidak boleh hilang.

const express = require('express');
const wajibLogin = require('../../middleware/wajibLogin');
const { validasiBody } = require('../../middleware/validasi');
const { GalatApi, sukses } = require('../../util/respons');
const { POLA_UUID } = require('../butir-bukti/butir-bukti.skema');
const { pilihJalurSkema, akhiriPilihanSkema } = require('./jalur-minat.skema');
const layanan = require('./jalur-minat.layanan');

const router = express.Router();

router.use(wajibLogin, async (req, res, next) => {
  try {
    await layanan.pastikanBoleh(req.pengguna.id);
    next();
  } catch (err) {
    next(err);
  }
});

router.param('id', (req, res, next, nilai) =>
  POLA_UUID.test(nilai) ? next() : next(new GalatApi('TIDAK_DITEMUKAN', 'Pilihan jalur tidak ditemukan.'))
);

const tangani = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

router.get('/', tangani(async (req, res) => sukses(res, await layanan.daftarJalur())));
router.get('/saya', tangani(async (req, res) => sukses(res, await layanan.daftarPilihan(req.pengguna.id))));
router.post('/saya', validasiBody(pilihJalurSkema), tangani(async (req, res) => sukses(res, await layanan.pilih(req.pengguna.id, req.body), undefined, 201)));
router.patch('/saya/:id', validasiBody(akhiriPilihanSkema), tangani(async (req, res) => sukses(res, await layanan.akhiri(req.pengguna.id, req.params.id, req.body))));

module.exports = router;
