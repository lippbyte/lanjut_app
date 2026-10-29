// Penangkap terakhir. Tidak pernah membocorkan jejak tumpukan ke klien,
// selalu mencatatnya di log server. docs/SDD-Backend-Foundation.md §6.5, §8.5.

const { galat, GalatApi } = require('../util/respons');

// eslint-disable-next-line no-unused-vars
function penangananGalat(err, req, res, next) {
  if (err instanceof GalatApi) {
    return galat(res, err.kode, err.message, err.medan);
  }
  // Badan JSON melewati batas express.json (mis. teks modul tempelan yang sangat panjang).
  if (err && err.type === 'entity.too.large') {
    return galat(res, 'BERKAS_TERLALU_BESAR', 'Data yang dikirim terlalu besar.');
  }
  // JSON rusak (LANJUT_053): 400, dan pesan galatnya TIDAK dicetak — pesan
  // galat parser JSON bisa memuat cuplikan isi permintaan (audit LANJUT_052).
  if (err && err.type === 'entity.parse.failed') {
    console.warn('[galat] JSON tidak valid', req.method, req.originalUrl.split('?')[0]);
    return galat(res, 'VALIDASI_GAGAL', 'Data yang dikirim bukan JSON yang valid.');
  }

  // Log server: metode, jalur, status, durasi (ditangani logger akses di
  // app.js), pengguna_id — TIDAK PERNAH kata sandi/token/isi kartu (§8.5).
  console.error('[galat]', req.method, req.originalUrl, '-', err && err.stack);

  return galat(res, 'GALAT_SERVER', 'Terjadi kesalahan pada server.');
}

module.exports = penangananGalat;
