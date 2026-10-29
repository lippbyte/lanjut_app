// Pembungkus zod → 400 VALIDASI_GAGAL + medan (docs/SDD-Backend-Foundation.md
// §8.3). Daftar putih: medan yang tidak dikenal di skema DIBUANG oleh zod
// .strip() bawaan (mode default) sebelum sampai ke layanan/repositori —
// menutup mass assignment (mis. `peran`, `pemilik_id` tidak akan pernah lolos
// kalau skemanya tidak menyebutkannya).

const { galat } = require('../util/respons');

function bagianKe(skema, sumber) {
  return function (req, res, next) {
    const hasil = skema.safeParse(sumber === 'body' ? req.body : req[sumber]);
    if (!hasil.success) {
      const medan = {};
      for (const isu of hasil.error.issues) {
        const kunci = isu.path.join('.') || '_';
        if (!medan[kunci]) medan[kunci] = isu.message;
      }
      return galat(res, 'VALIDASI_GAGAL', 'Data yang dikirim tidak valid.', medan);
    }
    if (sumber === 'body') req.body = hasil.data;
    else req[sumber] = hasil.data;
    next();
  };
}

/** Validasi req.body memakai skema zod. */
function validasiBody(skema) {
  return bagianKe(skema, 'body');
}

/** Validasi req.query memakai skema zod. */
function validasiQuery(skema) {
  return bagianKe(skema, 'query');
}

/** Validasi req.params memakai skema zod. */
function validasiParams(skema) {
  return bagianKe(skema, 'params');
}

module.exports = { validasiBody, validasiQuery, validasiParams };
