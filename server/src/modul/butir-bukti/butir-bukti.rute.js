// Rute Portofolio & Bukti (LANJUT_010 seri v2). Hanya dipasang bila PORTOFOLIO_AKTIF menyala.
// Urutan gerbang: 401 belum masuk, 403 kebijakan privasi belum diterima, baru isi permintaan.
// Butir atau foto akun lain menjawab 404, supaya keberadaannya tidak bisa ditebak.
//
//   GET    /                     daftar butir sendiri
//   POST   /                     buat butir
//   GET    /:id                  satu butir
//   PATCH  /:id                  ubah butir
//   DELETE /:id                  hapus butir, fotonya, dan berkasnya
//   POST   /:id/foto             unggah satu foto (multipart, medan "foto")
//   GET    /:id/foto/:fotoId     isi foto, hanya untuk pemilik
//   DELETE /:id/foto/:fotoId     hapus satu foto
//
// Tidak ada rute berbagi dan tidak ada alamat publik untuk foto (K18, K19).

const express = require('express');
const multer = require('multer');
const wajibLogin = require('../../middleware/wajibLogin');
const { validasiBody } = require('../../middleware/validasi');
const { batasUnggahFoto } = require('../../middleware/batasLaju');
const { GalatApi, sukses } = require('../../util/respons');
const { buatButirSkema, ubahButirSkema, POLA_UUID } = require('./butir-bukti.skema');
const layanan = require('./butir-bukti.layanan');

const router = express.Router();

router.use(wajibLogin, async (req, res, next) => {
  try {
    await layanan.pastikanBoleh(req.pengguna.id);
    next();
  } catch (err) {
    next(err);
  }
});

// Id yang bukan UUID (termasuk percobaan menembus jalur) sama dengan id yang tidak ada.
function periksaId(pesan) {
  return (req, res, next, nilai) => (POLA_UUID.test(nilai) ? next() : next(new GalatApi('TIDAK_DITEMUKAN', pesan)));
}
router.param('id', periksaId('Butir tidak ditemukan.'));
router.param('fotoId', periksaId('Foto tidak ditemukan.'));

const tangani = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

router.get('/', tangani(async (req, res) => sukses(res, await layanan.daftar(req.pengguna.id))));

router.post('/', validasiBody(buatButirSkema), tangani(async (req, res) => sukses(res, await layanan.buat(req.pengguna.id, req.body), undefined, 201)));

router.get('/:id', tangani(async (req, res) => sukses(res, await layanan.ambil(req.pengguna.id, req.params.id))));

router.patch('/:id', validasiBody(ubahButirSkema), tangani(async (req, res) => sukses(res, await layanan.ubah(req.pengguna.id, req.params.id, req.body))));

router.delete('/:id', tangani(async (req, res) => sukses(res, await layanan.hapus(req.pengguna.id, req.params.id))));

const penerimaFoto = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: layanan.BATAS_FOTO.ukuranByte, files: 1, fields: 0, parts: 1 },
  defParamCharset: 'utf8',
}).single('foto');

function terimaFoto(req, res, next) {
  penerimaFoto(req, res, (galat) => {
    if (!galat) return next();
    if (galat.code === 'LIMIT_FILE_SIZE') return next(layanan.galatFotoBesar());
    return next(new GalatApi('VALIDASI_GAGAL', 'Unggahan tidak valid: kirim satu berkas di medan "foto".', { foto: 'tidak valid' }));
  });
}

router.post(
  '/:id/foto',
  batasUnggahFoto,
  tangani(async (req, res) => {
    // Pemilik diperiksa sebelum berkas dibaca, supaya butir akun lain tidak memicu pemrosesan.
    await layanan.pastikanButirMilik(req.pengguna.id, req.params.id);
    await new Promise((selesai, gagal) => terimaFoto(req, res, (galat) => (galat ? gagal(galat) : selesai())));
    if (!req.file) throw new GalatApi('VALIDASI_GAGAL', 'Pilih fotonya dulu.', { foto: 'belum dipilih' });
    sukses(res, await layanan.unggahFoto(req.pengguna.id, req.params.id, req.file), undefined, 201);
  })
);

router.get(
  '/:id/foto/:fotoId',
  tangani(async (req, res) => {
    const { isi, jenisBerkas } = await layanan.ambilFoto(req.pengguna.id, req.params.id, req.params.fotoId);
    res.set({
      'Content-Type': jenisBerkas,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    });
    res.send(isi);
  })
);

router.delete('/:id/foto/:fotoId', tangani(async (req, res) => sukses(res, await layanan.hapusFoto(req.pengguna.id, req.params.id, req.params.fotoId))));

module.exports = router;
