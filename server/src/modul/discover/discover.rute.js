// Rute Discover (LANJUT_024 seri v2). Hanya dipasang bila DISCOVER_AKTIF menyala.
// Gerbang sama dengan Portofolio dan Jalur & Tujuan: 401 belum masuk, 403 kebijakan privasi
// belum diterima. Semua data dibaca dari akun yang sedang masuk; tidak ada id akun di alamat.
//
//   GET    /kartu               kartu aktif yang teksnya disetujui; draf tidak pernah terkirim
//   GET    /refleksi            refleksi milik sendiri
//   PUT    /refleksi/:kartuId   simpan atau perbarui refleksi untuk satu kartu yang disetujui
//   DELETE /refleksi/:kartuId   hapus seluruh baris refleksi milik sendiri untuk kartu itu (LANJUT_035)
//   GET    /profil              versi profil eksplorasi terkini, dan jumlah versinya
//   POST   /profil              versi baru dari jawaban saat ini; versi lama tetap ada
//   DELETE /profil/catatan      kosongkan catatan di semua versi profil milik sendiri (LANJUT_035)
//   GET    /profil/riwayat      semua versi, lama ke baru
//
// Tidak ada pemanggilan AI, OpenRouter, atau mesin pencari di modul ini.

const express = require('express');
const wajibLogin = require('../../middleware/wajibLogin');
const { validasiBody } = require('../../middleware/validasi');
const { sukses } = require('../../util/respons');
const { pastikanBoleh } = require('../jalur-minat/jalur-minat.layanan');
const { refleksiSkema, profilSkema } = require('./discover.skema');
const layanan = require('./discover.layanan');

const router = express.Router();

router.use(wajibLogin, async (req, res, next) => {
  try {
    await pastikanBoleh(req.pengguna.id);
    next();
  } catch (err) {
    next(err);
  }
});

const tangani = (fn) => async (req, res, next) => {
  try {
    await fn(req, res);
  } catch (err) {
    next(err);
  }
};

router.get('/kartu', tangani(async (req, res) => sukses(res, await layanan.daftarKartu())));
router.get('/refleksi', tangani(async (req, res) => sukses(res, await layanan.daftarRefleksi(req.pengguna.id))));
router.put('/refleksi/:kartuId', validasiBody(refleksiSkema), tangani(async (req, res) => sukses(res, await layanan.simpanRefleksi(req.pengguna.id, req.params.kartuId, req.body))));
router.delete('/refleksi/:kartuId', tangani(async (req, res) => sukses(res, await layanan.hapusRefleksi(req.pengguna.id, req.params.kartuId))));
router.get('/profil', tangani(async (req, res) => sukses(res, await layanan.ambilProfil(req.pengguna.id))));
router.post('/profil', validasiBody(profilSkema), tangani(async (req, res) => sukses(res, await layanan.perbaruiProfil(req.pengguna.id, req.body), undefined, 201)));
router.delete('/profil/catatan', tangani(async (req, res) => sukses(res, await layanan.hapusCatatanProfil(req.pengguna.id))));
router.get('/profil/riwayat', tangani(async (req, res) => sukses(res, await layanan.riwayatProfil(req.pengguna.id))));

module.exports = router;
