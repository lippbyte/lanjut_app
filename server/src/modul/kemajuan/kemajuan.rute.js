// Rute `kemajuan` — F5, seluruhnya wajib login (§4.5).

const express = require('express');
const wajibLogin = require('../../middleware/wajibLogin');
const repo = require('./kemajuan.repo');
const penggunaRepo = require('../pengguna/pengguna.repo');
const { sukses, galat } = require('../../util/respons');
const { sekarangUntukDb, keIso } = require('../../util/waktu');

const router = express.Router();

// LANJUT_071 (keputusan PM): butir umum `mapel-tka` — dicentang opsi
// "rangkuman umum" di Pilih Mapel — hanya dipakai kelas 12. App tidak lagi
// menampilkan opsinya untuk kelas 10–11; permintaan dari klien lama ditolak di
// sini dengan kode yang sudah dipakai rute ini (404 TIDAK_DITEMUKAN), jadi
// kontrak API tidak berubah. Batal centang (DELETE) tetap boleh.
const BUTIR_MAPEL_TKA = 'mapel-tka';
const KELAS_TANPA_MAPEL_TKA = new Set(['10', '11']);

router.use(wajibLogin);

router.get('/', async (req, res, next) => {
  try {
    const baris = await repo.ambilMilikSendiri(req.pengguna.id);
    sukses(
      res,
      baris.map((b) => ({ butir_id: b.butir_id, selesai_pada: keIso(b.selesai_pada) }))
    );
  } catch (err) {
    next(err);
  }
});

router.put('/:butirId', async (req, res, next) => {
  try {
    const ada = await repo.butirAda(req.params.butirId);
    if (!ada) return galat(res, 'TIDAK_DITEMUKAN', 'Butir daftar periksa tidak ditemukan.');
    if (req.params.butirId === BUTIR_MAPEL_TKA) {
      const profil = await penggunaRepo.cariProfil(req.pengguna.id);
      if (profil && KELAS_TANPA_MAPEL_TKA.has(profil.kelas)) {
        return galat(res, 'TIDAK_DITEMUKAN', 'Butir daftar periksa ini tidak berlaku untuk kelas akunmu.');
      }
    }
    const selesaiPada = sekarangUntukDb();
    await repo.tandaiSelesai(req.pengguna.id, req.params.butirId, selesaiPada);
    sukses(res, { butir_id: req.params.butirId, selesai_pada: keIso(selesaiPada) });
  } catch (err) {
    next(err);
  }
});

router.delete('/:butirId', async (req, res, next) => {
  try {
    await repo.batalkanSelesai(req.pengguna.id, req.params.butirId);
    sukses(res, { butir_id: req.params.butirId, selesai_pada: null });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
