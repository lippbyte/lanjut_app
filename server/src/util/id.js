// Pembuat UUID untuk baris milik server sendiri (mis. sesi_pengguna.id).
// Baris milik KLIEN (pengguna.id kiriman daftar, kartu pengguna, riwayat
// latihan, sesi latihan) memakai id yang SUDAH dibuat klien — server tidak
// pernah membuatkan id baru untuk baris semacam itu (idempotensi, B-K3).

const crypto = require('crypto');

function buatUuid() {
  return crypto.randomUUID();
}

module.exports = { buatUuid };
