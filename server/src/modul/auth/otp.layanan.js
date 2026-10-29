// Kode email sekali pakai (LANJUT_083): masuk dengan kode email, tambahan di samping masuk
// dengan kata sandi. Sejak LANJUT_083c mesin kodenya (terbitkanKode, periksaKode, pakaiKode)
// juga dipakai daftar dengan email dan verifikasi email akun (daftarEmail.layanan.js), dengan
// `tujuan` berbeda supaya kode satu keperluan tidak bisa dipakai untuk keperluan lain.
// Tidak ada SQL di sini — hanya memanggil repositori.
//
// Prinsip:
// - Kode 6 angka dari crypto.randomInt, berlaku 5 menit, disimpan sebagai hash bcrypt.
// - Kode TIDAK PERNAH dicatat di log, juga saat pengiriman gagal.
// - Respons kirim & verifikasi sama persis untuk email terdaftar dan tidak, termasuk
//   batas kirim (baris dibuat untuk semua email, lihat migrasi 025) dan lama respons
//   (email dikirim tanpa ditunggu).
// - Maks. 5 percobaan per kode (dicatat sebelum dibandingkan), lalu kode hangus.
// - Maks. 3 kode per email per tujuan per 15 menit, dihitung dari tabel kode_otp_email. Per
//   tujuan, supaya kode daftar tidak menghabiskan jatah kode masuk; email terdaftar hanya pernah
//   menerima kode masuk/verifikasi dan email baru hanya kode daftar, jadi tetap maks. 3 email.

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { buatUuid } = require('../../util/id');
const { sekarangUntukDb } = require('../../util/waktu');
const { GalatApi } = require('../../util/respons');
const penggunaRepo = require('../pengguna/pengguna.repo');
const otpRepo = require('./otp.repo');
const pengirimOtp = require('./pengirimOtp');
const { masukLewatBuktiEmail } = require('./auth.layanan');

const KODE_BERLAKU_MENIT = 5;
const MAKS_PERCOBAAN = 5;
const MAKS_KIRIM = 3;
const JENDELA_KIRIM_MENIT = 15;
// Kode hanya hidup 5 menit; cost lebih rendah dari kata sandi (12) sudah cukup.
const COST_KODE = 10;

function keDb(tanggal) {
  return tanggal.toISOString().slice(0, 19).replace('T', ' ');
}

function menitDariSekarang(menit) {
  return new Date(Date.now() + menit * 60 * 1000);
}

/** SHA-256 email huruf kecil — email tidak disimpan sebagai teks di tabel kode. */
function hashEmail(email) {
  return crypto.createHash('sha256').update(String(email).trim().toLowerCase(), 'utf8').digest('hex');
}

function buatKode() {
  return String(crypto.randomInt(0, 1000000)).padStart(6, '0');
}

function galatKodeSalah() {
  return new GalatApi('KODE_SALAH', 'Kode salah. Periksa lagi kode di email.', { kode: 'salah' });
}

function galatKodeTidakBerlaku() {
  return new GalatApi('KODE_KEDALUWARSA', 'Kode sudah tidak berlaku. Minta kode baru.', { kode: 'tidak berlaku' });
}

function pastikanPengirimSiap() {
  if (!pengirimOtp.siap()) {
    throw new GalatApi('OTP_TIDAK_TERSEDIA', 'Pengiriman kode email belum tersedia.');
  }
}

/**
 * Cek batas kirim tujuan ini, lalu simpan kode baru untuk tujuan ini; kode aktif lama
 * dengan tujuan yang sama ditutup. Mengembalikan kode mentah — TIDAK dikirim di sini, supaya
 * pemanggil yang memutuskan (email tak terdaftar tidak pernah menerima kode).
 */
async function terbitkanKode(email, tujuan) {
  const emailHash = hashEmail(email);
  const sekarang = new Date();

  const jumlah = await otpRepo.hitungKirimSejak(emailHash, tujuan, keDb(menitDariSekarang(-JENDELA_KIRIM_MENIT)));
  if (jumlah >= MAKS_KIRIM) {
    throw new GalatApi('TERLALU_SERING', 'Terlalu banyak permintaan kode. Coba lagi nanti.', {
      email: 'terlalu sering',
    });
  }

  const kode = buatKode();
  const kodeHash = await bcrypt.hash(kode, COST_KODE);
  await otpRepo.hapusSebelum(keDb(menitDariSekarang(-24 * 60)));
  await otpRepo.tutupKodeAktif(emailHash, tujuan, keDb(sekarang));
  await otpRepo.simpanKode({
    id: buatUuid(),
    emailHash,
    tujuan,
    kodeHash,
    dibuatPada: keDb(sekarang),
    kedaluwarsaPada: keDb(new Date(sekarang.getTime() + KODE_BERLAKU_MENIT * 60 * 1000)),
  });
  return kode;
}

/** Kirim tanpa ditunggu: lama respons tidak boleh membedakan email terdaftar. */
function kirimDiLatar(email, kode, tujuan) {
  Promise.resolve()
    .then(() => pengirimOtp.kirim(email, kode, tujuan))
    .catch(() => console.error('[otp] email kode gagal terkirim'));
}

/**
 * Periksa kode untuk tujuan ini. Percobaan dicatat SEBELUM dibandingkan; setelah 5, tidak ada
 * giliran lagi dan kode hangus. Mengembalikan id baris kode; pemanggil menandainya dipakai
 * (pakaiKode) setelah semua syarat lain lolos.
 */
async function periksaKode(email, kode, tujuan) {
  const baris = await otpRepo.ambilKodeAktif(hashEmail(email), tujuan);
  if (!baris || new Date(baris.kedaluwarsa_pada).getTime() <= Date.now()) throw galatKodeTidakBerlaku();

  // Percobaan dicatat SEBELUM kode dibandingkan; setelah 5, tidak ada giliran lagi.
  const dapatGiliran = await otpRepo.pakaiPercobaan(baris.id, MAKS_PERCOBAAN);
  if (!dapatGiliran) throw galatKodeTidakBerlaku();

  const cocok = await bcrypt.compare(kode, baris.kode_hash);
  if (!cocok) {
    await otpRepo.hanguskanBilaHabis(baris.id, MAKS_PERCOBAAN, sekarangUntukDb());
    throw galatKodeSalah();
  }
  return baris.id;
}

/** Tandai kode terpakai; gagal bila permintaan lain memakainya lebih dulu. */
async function pakaiKode(idKode) {
  const dipakai = await otpRepo.tandaiDipakai(idKode, sekarangUntukDb());
  if (!dipakai) throw galatKodeTidakBerlaku();
}

async function kirimOtp({ email }) {
  pastikanPengirimSiap();
  const kode = await terbitkanKode(email, 'masuk');

  // Dicari untuk SEMUA email (lama respons sama); kode hanya dikirim ke akun aktif.
  const pengguna = await penggunaRepo.cariUntukMasukDenganEmail(email);
  if (pengguna && pengguna.status === 'aktif') kirimDiLatar(email, kode, 'masuk');

  return { diproses: true, berlaku_detik: KODE_BERLAKU_MENIT * 60 };
}

async function verifikasiOtp({ email, kode }) {
  const idKode = await periksaKode(email, kode, 'masuk');

  // Email tak terdaftar tidak pernah menerima kodenya; jawabannya tetap "kode salah".
  const pengguna = await penggunaRepo.cariUntukMasukDenganEmail(email);
  if (!pengguna || pengguna.status !== 'aktif') throw galatKodeSalah();

  await pakaiKode(idKode);
  // LANJUT_083d: kode ini membuktikan email; akun yang emailnya belum terverifikasi diambil alih.
  return masukLewatBuktiEmail(pengguna.id);
}

module.exports = {
  kirimOtp,
  verifikasiOtp,
  terbitkanKode,
  kirimDiLatar,
  periksaKode,
  pakaiKode,
  pastikanPengirimSiap,
  galatKodeSalah,
  galatKodeTidakBerlaku,
  hashEmail,
  keDb,
  KODE_BERLAKU_MENIT,
  MAKS_PERCOBAAN,
  MAKS_KIRIM,
  JENDELA_KIRIM_MENIT,
};
