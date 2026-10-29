// Token sesi buram (opaque) — docs/SDD-Backend-Foundation.md §5.3.
// Token asli (base64url, 32 byte acak) hanya pernah ada di respons login dan
// di perangkat pengguna. Yang disimpan di basis data adalah SHA-256-nya saja.

const crypto = require('crypto');

function buatTokenMentah() {
  return crypto.randomBytes(32).toString('base64url');
}

function hashToken(tokenMentah) {
  return crypto.createHash('sha256').update(tokenMentah, 'utf8').digest('hex');
}

module.exports = { buatTokenMentah, hashToken };
