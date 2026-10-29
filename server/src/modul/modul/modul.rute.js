// Rute `modul` — modul di Arsip Belajar (LANJUT_049). Semua wajib login dan
// hanya milik sendiri; id modul orang lain → 404.
//
//   POST   /             unggah: multipart (berkas + judul + mapel_id)
//                         atau JSON (judul + mapel_id + teks ditempel)
//   GET    /             daftar modul sendiri (tanpa isi)
//   GET    /cari?q=      potongan yang cocok dari modul sendiri (FULLTEXT)
//   GET    /latihan      bahan Latihan: jumlah potongan per mapel + contoh acak per mapel
//   GET    /:id          satu modul, isi lengkap
//   DELETE /:id          hapus permanen (teks + potongan)
//   DELETE /?semua=ya    hapus permanen SEMUA modul sendiri
//
// Berkas diterima multer memoryStorage: hanya di memori selama permintaan,
// tidak pernah ditulis ke disk, dieksekusi, atau dikirim balik.

const express = require('express');
const multer = require('multer');
const wajibLogin = require('../../middleware/wajibLogin');
const { validasiBody, validasiQuery } = require('../../middleware/validasi');
const { GalatApi, sukses } = require('../../util/respons');
const { unggahBerkasSkema, unggahTeksSkema, cariSkema } = require('./modul.skema');
const layanan = require('./modul.layanan');

const router = express.Router();

router.use(wajibLogin);

/** multer per permintaan, karena batas ukuran dibaca dari konfigurasi (bisa berubah tanpa restart). */
async function terimaBerkas(req, res, next) {
  try {
    const { ukuranByte } = await layanan.batas();
    const unggah = multer({
      storage: multer.memoryStorage(),
      limits: { fileSize: ukuranByte, files: 1, fields: 4, fieldSize: 4096, parts: 6 },
      defParamCharset: 'utf8',
    }).single('berkas');
    unggah(req, res, (galat) => {
      if (!galat) return next();
      if (galat.code === 'LIMIT_FILE_SIZE') return next(layanan.galatBerkasBesar(ukuranByte));
      return next(new GalatApi('VALIDASI_GAGAL', 'Unggahan tidak valid: kirim satu berkas di medan "berkas".'));
    });
  } catch (galat) {
    next(galat);
  }
}

router.post('/', async (req, res, next) => {
  if (!req.is('multipart/form-data')) {
    return validasiBody(unggahTeksSkema)(req, res, async () => {
      try {
        sukses(res, await layanan.unggah(req.pengguna.id, req.body), undefined, 201);
      } catch (galat) {
        next(galat);
      }
    });
  }
  return terimaBerkas(req, res, (galat) => {
    if (galat) return next(galat);
    if (!req.file) return next(new GalatApi('VALIDASI_GAGAL', 'Pilih berkas modulnya.', { berkas: 'belum dipilih' }));
    return validasiBody(unggahBerkasSkema)(req, res, async () => {
      try {
        const hasil = await layanan.unggah(req.pengguna.id, { ...req.body, berkas: req.file });
        sukses(res, hasil, undefined, 201);
      } catch (e) {
        next(e);
      } finally {
        req.file = undefined; // buffer berkas asli dilepas; yang disimpan hanya teksnya
      }
    });
  });
});

router.get('/', async (req, res, next) => {
  try {
    sukses(res, await layanan.daftar(req.pengguna.id));
  } catch (galat) {
    next(galat);
  }
});

router.get('/cari', validasiQuery(cariSkema), async (req, res, next) => {
  try {
    sukses(res, { q: req.query.q, hasil: await layanan.cari(req.pengguna.id, req.query.q) });
  } catch (galat) {
    next(galat);
  }
});

// Sebelum /:id, supaya "latihan" tidak dibaca sebagai id modul.
router.get('/latihan', async (req, res, next) => {
  try {
    sukses(res, await layanan.untukLatihan(req.pengguna.id));
  } catch (galat) {
    next(galat);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    sukses(res, await layanan.ambil(req.pengguna.id, req.params.id));
  } catch (galat) {
    next(galat);
  }
});

router.delete('/:id', async (req, res, next) => {
  try {
    await layanan.hapus(req.pengguna.id, req.params.id);
    sukses(res, { dihapus: true });
  } catch (galat) {
    next(galat);
  }
});

// Hapus semua wajib ?semua=ya, supaya DELETE /modul yang tak sengaja tidak menghapus apa pun.
router.delete('/', async (req, res, next) => {
  try {
    if (req.query.semua !== 'ya') {
      throw new GalatApi('VALIDASI_GAGAL', 'Untuk menghapus semua modul, kirim ?semua=ya.', { semua: 'wajib "ya"' });
    }
    sukses(res, { jumlah_dihapus: await layanan.hapusSemua(req.pengguna.id) });
  } catch (galat) {
    next(galat);
  }
});

module.exports = router;
