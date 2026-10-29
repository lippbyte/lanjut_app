const express = require('express');
const wajibLogin = require('../../middleware/wajibLogin');
const { validasiBody } = require('../../middleware/validasi');
const { ubahProfilSkema } = require('./pengguna.skema');
const { sukses } = require('../../util/respons');
const layanan = require('./pengguna.layanan');

const router = express.Router();

// LANJUT_079: profil akun sendiri (sama dengan /auth/saya), termasuk mapel_pilihan.
router.get('/saya', wajibLogin, async (req, res, next) => {
  try {
    sukses(res, await layanan.profilSaya(req.pengguna.id));
  } catch (err) {
    next(err);
  }
});

// LANJUT_079: isi layar Pilih Mapel (kelas 12, per rumpun favorit) / Mapel Saya (kelas 7–11).
router.get('/saya/pilihan-mapel', wajibLogin, async (req, res, next) => {
  try {
    sukses(res, await layanan.pilihanMapel(req.pengguna.id));
  } catch (err) {
    next(err);
  }
});

// Urutan: login (wajibLogin) → validasi (skema, lalu isi di layanan) → hanya baris akun sendiri.
router.patch('/saya', wajibLogin, validasiBody(ubahProfilSkema), async (req, res, next) => {
  try {
    const profil = await layanan.ubahProfil(req.pengguna.id, req.body);
    sukses(res, profil);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
