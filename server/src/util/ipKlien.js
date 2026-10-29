// IP klien untuk batas laju per IP (LANJUT_085). Bila HEADER_IP_KLIEN diisi (proxy tepercaya
// menulis header itu, misalnya X-Real-IP di Railway), nilai header itu yang dipakai; selain itu
// req.ip, yang sudah mengikuti TRUST_PROXY (X-Forwarded-For) lewat Express. Bukan IP proxy.

const env = require('../config/env');

function ipKlien(req) {
  if (env.HEADER_IP_KLIEN) {
    const nilai = req.get(env.HEADER_IP_KLIEN);
    if (nilai && nilai.trim()) return nilai.split(',')[0].trim();
  }
  return req.ip;
}

module.exports = { ipKlien };
