// Pengirim email kode (LANJUT_083; tujuan daftar & verifikasi sejak LANJUT_083c). Satu objek
// dengan dua fungsi supaya tes bisa menggantinya dengan tiruan (`pengirimOtp.kirim = async
// (...) => ...`) tanpa menyentuh SMTP. Kode tidak pernah dicatat di log, juga saat gagal.

const env = require('../../config/env');
const { kirimSurel } = require('../../util/surel');

// Teks DRAF (docs/salinan-teks-lanjut.md §4.21 dan blok LANJUT_083c), belum disetujui PM.
const TEKS_PER_TUJUAN = {
  masuk: {
    subjek: 'Kode masuk LANJUT',
    pembuka: 'Ini kode masuk LANJUT kamu:',
    abaikan: 'Kalau kamu tidak sedang masuk ke LANJUT, abaikan email ini. Akunmu tetap aman.',
  },
  daftar: {
    subjek: 'Kode pendaftaran LANJUT',
    pembuka: 'Ini kode untuk membuat akun LANJUT kamu:',
    abaikan: 'Kalau kamu tidak sedang mendaftar di LANJUT, abaikan email ini. Tanpa kode ini, tidak ada akun yang dibuat.',
  },
  verifikasi: {
    subjek: 'Kode verifikasi email LANJUT',
    pembuka: 'Ini kode untuk memastikan email ini milik akun LANJUT kamu:',
    abaikan: 'Kalau kamu tidak memintanya, abaikan email ini.',
  },
};

const SUBJEK = TEKS_PER_TUJUAN.masuk.subjek;

function teksEmail(kode, tujuan = 'masuk') {
  const t = TEKS_PER_TUJUAN[tujuan] || TEKS_PER_TUJUAN.masuk;
  return [
    'Halo,',
    '',
    t.pembuka,
    '',
    `    ${kode}`,
    '',
    'Kode berlaku 5 menit dan hanya bisa dipakai sekali.',
    'Jangan berikan kode ini kepada siapa pun, termasuk yang mengaku dari LANJUT.',
    '',
    t.abaikan,
    '',
    'LANJUT (versi uji)',
  ].join('\n');
}

const pengirimOtp = {
  /** SMTP sudah diisi di .env? Kalau belum, fitur kode email mati (503). */
  siap() {
    return Boolean(env.SMTP_HOST && env.SMTP_FROM);
  },

  async kirim(email, kode, tujuan = 'masuk') {
    await kirimSurel(
      { ke: email, subjek: (TEKS_PER_TUJUAN[tujuan] || TEKS_PER_TUJUAN.masuk).subjek, teks: teksEmail(kode, tujuan) },
      {
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        user: env.SMTP_USER,
        password: env.SMTP_PASSWORD,
        from: env.SMTP_FROM,
      }
    );
  },
};

module.exports = pengirimOtp;
module.exports.teksEmail = teksEmail;
module.exports.SUBJEK = SUBJEK;
module.exports.TEKS_PER_TUJUAN = TEKS_PER_TUJUAN;
