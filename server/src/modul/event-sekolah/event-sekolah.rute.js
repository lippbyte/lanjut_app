// Rute Persiapan Event (LANJUT_076, LANJUT_076b), dipasang di /api/v1/pengguna/event.
// Hanya milik akun sendiri. Gerbang (login → saklar → kebijakan → kelas 7–9)
// dipasang di router.use SEBELUM validasi isi, jadi urutan galatnya: 401, 403
// FITUR_BELUM_AKTIF, 403 AI_BELUM_DIIZINKAN, 403 KELAS_TIDAK_DIDUKUNG, baru 400.
//
//   GET    /               daftar event milik sendiri, tanggal naik (+ keterangan materi)
//   GET    /pilihan-kartu  kartu yang boleh jadi materi (milik sendiri + kurasi terverifikasi);
//                          hanya membaca basis data, tidak mengambil apa pun dari internet
//   POST   /               buat event
//   PATCH  /:id            ubah event milik sendiri (lainnya 404)
//   DELETE /:id            hapus PERMANEN (lainnya 404)

const express = require('express');
const wajibLogin = require('../../middleware/wajibLogin');
const { validasiBody } = require('../../middleware/validasi');
const { buatSkema, ubahSkema } = require('./event-sekolah.skema');
const { sukses } = require('../../util/respons');
const layanan = require('./event-sekolah.layanan');

const router = express.Router();

router.use(wajibLogin, async (req, res, next) => {
  try {
    await layanan.pastikanBoleh(req.pengguna.id);
    next();
  } catch (err) {
    next(err);
  }
});

router.get('/', async (req, res, next) => {
  try {
    sukses(res, await layanan.daftar(req.pengguna.id));
  } catch (err) {
    next(err);
  }
});

router.get('/pilihan-kartu', async (req, res, next) => {
  try {
    sukses(res, await layanan.pilihanKartu(req.pengguna.id));
  } catch (err) {
    next(err);
  }
});

router.post('/', validasiBody(buatSkema), async (req, res, next) => {
  try {
    sukses(res, await layanan.buat(req.pengguna.id, req.body), undefined, 201);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id', validasiBody(ubahSkema), async (req, res, next) => {
  try {
    sukses(res, await layanan.ubah(req.pengguna.id, req.params.id, req.body));
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
