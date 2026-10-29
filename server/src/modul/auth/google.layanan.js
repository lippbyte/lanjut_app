// Masuk dengan Google (LANJUT_083). Tidak ada SQL di sini — hanya memanggil repositori.
// Email terverifikasi Google yang sudah dipakai akun → akun itu dipakai; yang belum
// ada → akun siswa baru dibuat (tanpa kelas; gerbang "isi kelas" di app yang menanyakannya).

const crypto = require('crypto');

const { buatUuid } = require('../../util/id');
const { sekarangUntukDb } = require('../../util/waktu');
const { hashKataSandi } = require('../../util/kata-sandi');
const { GalatApi } = require('../../util/respons');
const { NAMA_PENGGUNA_REGEX } = require('./auth.skema');
const penggunaRepo = require('../pengguna/pengguna.repo');
const tokenGoogle = require('./tokenGoogle');
const { buatSesiDanBentukRespons, masukLewatBuktiEmail } = require('./auth.layanan');

/** Nonce acak untuk satu permintaan masuk Google; app menyimpannya dan mengirimnya kembali. */
function buatNonce() {
  return crypto.randomBytes(24).toString('base64url');
}

function akhiranAcak() {
  const huruf = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.randomBytes(4), (b) => huruf[b % huruf.length]).join('');
}

/** nama_pengguna unik dari bagian depan email (mis. budi.s → budi.s_k3x9). */
async function namaPenggunaBaru(email) {
  let dasar = email.split('@')[0].toLowerCase().replace(/[^a-z0-9._]/g, '').slice(0, 20);
  if (dasar.length < 3) dasar = 'siswa';
  for (let i = 0; i < 5; i += 1) {
    const calon = `${dasar}_${akhiranAcak()}`;
    if (NAMA_PENGGUNA_REGEX.test(calon) && !(await penggunaRepo.cekNamaPenggunaDipakai(calon))) return calon;
  }
  throw new GalatApi('GALAT_SERVER', 'Nama pengguna untuk akun baru tidak bisa dibuat.');
}

async function masukKeAkun(pengguna) {
  if (pengguna.status !== 'aktif') throw new GalatApi('KREDENSIAL_SALAH', 'Akun ini tidak aktif.');
  // LANJUT_083d: email_verified Google membuktikan email; akun yang emailnya belum
  // terverifikasi diambil alih (sama dengan masuk lewat kode email).
  return { ...(await masukLewatBuktiEmail(pengguna.id)), akun_baru: false };
}

async function masukGoogle({ id_token, nonce }) {
  if (!tokenGoogle.googleAktif()) {
    throw new GalatApi('GOOGLE_TIDAK_TERSEDIA', 'Masuk dengan Google belum tersedia.');
  }
  const { email } = await tokenGoogle.verifikasiIdToken(id_token, nonce);

  const ada = await penggunaRepo.cariUntukMasukDenganEmail(email);
  if (ada) return masukKeAkun(ada);

  const id = buatUuid();
  // Akun Google tidak punya kata sandi yang bisa dipakai: hash dari nilai acak yang dibuang.
  const kataSandiHash = await hashKataSandi(crypto.randomBytes(32).toString('base64url'));
  try {
    await penggunaRepo.buatPengguna({
      id,
      namaPengguna: await namaPenggunaBaru(email),
      email,
      // Google sudah memverifikasi email ini (email_verified dicek di tokenGoogle.js).
      emailTerverifikasi: true,
      kataSandiHash,
      dibuatPada: sekarangUntukDb(),
    });
  } catch (err) {
    // Dua permintaan bersamaan untuk email yang sama: yang kalah memakai akun yang menang.
    if (err && err.code === 'ER_DUP_ENTRY') {
      const pemenang = await penggunaRepo.cariUntukMasukDenganEmail(email);
      if (pemenang) return masukKeAkun(pemenang);
    }
    throw err;
  }
  await penggunaRepo.tandaiTerakhirMasuk(id, sekarangUntukDb());
  return { ...(await buatSesiDanBentukRespons(id)), akun_baru: true, perlu_sandi_baru: false };
}

module.exports = { masukGoogle, buatNonce, namaPenggunaBaru };
