// Konfigurasi express-rate-limit. docs/SDD-Backend-Foundation.md §8.2.
// Dua lapis: per-IP di sini (express-rate-limit); per-akun ada di
// modul/auth/auth.layanan.js lewat tabel percobaan_masuk.
// LANJUT_085: "IP" = IP klien asli dari proxy tepercaya (util/ipKlien.js), bukan IP proxy.

const rateLimit = require('express-rate-limit');
const { galat } = require('../util/respons');
const { ipKlien } = require('../util/ipKlien');
const env = require('../config/env');

function penanganGalatTerlaluSering(req, res) {
  return galat(res, 'TERLALU_SERING', 'Terlalu banyak permintaan. Coba lagi nanti.');
}

// Di lingkungan `test`, batas dinaikkan jauh supaya rangkaian tests/*.test.js
// (yang memanggil endpoint auth berkali-kali dari satu "IP" yang sama, yaitu
// mesin uji) tidak saling mengganggu satu sama lain. Angka produksi (§8.2)
// TIDAK berubah untuk NODE_ENV lain.
const DI_LINGKUNGAN_TEST = env.NODE_ENV === 'test';

/** Seluruh /api/v1: 300 permintaan / 15 menit per IP. */
const batasGlobal = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: DI_LINGKUNGAN_TEST ? 100000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKlien,
  handler: penanganGalatTerlaluSering,
});

/** /auth/*: 10 permintaan / 15 menit per IP. */
const batasAuth = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: DI_LINGKUNGAN_TEST ? 100000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKlien,
  handler: penanganGalatTerlaluSering,
});

/** Pendaftaran: 5 pendaftaran / jam per IP. */
const batasDaftar = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: DI_LINGKUNGAN_TEST ? 100000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: ipKlien,
  handler: penanganGalatTerlaluSering,
});

module.exports = { batasGlobal, batasAuth, batasDaftar };
