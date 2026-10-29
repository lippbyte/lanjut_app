// Bearer token → req.pengguna (boleh null). docs/SDD-Backend-Foundation.md §6.5.
// Middleware ini TIDAK menolak permintaan tanpa token — itu tugas wajibLogin.js.
// Dengan begitu endpoint publik (§4.4) tetap bisa dipanggil tanpa login.

const env = require('../config/env');
const { hashToken } = require('../util/token');
const sesiRepo = require('../modul/auth/sesi.repo');

async function autentikasi(req, res, next) {
  req.pengguna = null;
  req.sesiId = null;

  const header = req.headers.authorization || '';
  const cocok = /^Bearer\s+(.+)$/i.exec(header);
  if (!cocok) return next();

  const tokenMentah = cocok[1].trim();
  if (!tokenMentah) return next();

  try {
    const tokenHash = hashToken(tokenMentah);
    const sesi = await sesiRepo.cariSesiAktifByTokenHash(tokenHash);
    if (!sesi) return next();
    if (sesi.status !== 'aktif') return next();

    req.pengguna = { id: sesi.pengguna_id, peran: sesi.peran };
    req.sesiId = sesi.id;
    req.tokenHashSaatIni = tokenHash;

    // Perpanjangan bergulir — tidak menghalangi respons, tapi cukup ditunggu
    // supaya galat koneksi tidak jadi permintaan "menggantung" tak terduga.
    await sesiRepo.perpanjangSesi(sesi.id, env.SESI_UMUR_HARI);
  } catch (galat) {
    // Kegagalan otentikasi TIDAK boleh menjatuhkan permintaan publik —
    // perlakukan sebagai tamu, dan biarkan wajibLogin.js yang menolak bila
    // rute memang butuh login.
    req.pengguna = null;
  }

  next();
}

module.exports = autentikasi;
