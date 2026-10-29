// 403 bila peran pengguna berjalan bukan 'tim'. Dipasang SETELAH wajibLogin.js.
// docs/SDD-Backend-Foundation.md §5.5 (setel ulang sandi oleh tim) dan §9.2.

const { galat } = require('../util/respons');

function wajibTim(req, res, next) {
  if (!req.pengguna || req.pengguna.peran !== 'tim') {
    return galat(res, 'TIDAK_BERHAK', 'Aksi ini hanya untuk tim.');
  }
  next();
}

module.exports = wajibTim;
