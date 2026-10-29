// 401 bila req.pengguna kosong. docs/SDD-Backend-Foundation.md §6.5.
// Dipasang HANYA di rute data pribadi — bukan global — supaya endpoint
// konten publik (§4.4) tidak ikut tertutup.

const { galat } = require('../util/respons');

function wajibLogin(req, res, next) {
  if (!req.pengguna) {
    return galat(res, 'TIDAK_MASUK', 'Anda harus masuk untuk mengakses ini.');
  }
  next();
}

module.exports = wajibLogin;
