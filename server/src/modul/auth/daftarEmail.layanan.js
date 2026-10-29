// Daftar dengan email dan verifikasi email akun (LANJUT_083c). Tidak ada SQL di sini.
//
// Daftar: POST /auth/daftar/kirim-kode menyimpan data daftar sementara (pendaftaran_tertunda:
// email hanya SHA-256, kata sandi hash bcrypt) dan mengirim kode ke email itu. Akun BARU dibuat
// di POST /auth/daftar/verifikasi setelah kodenya benar, dengan email_terverifikasi = 1.
// Aturan kode sama dengan masuk dengan kode email (otp.layanan.js), tujuan 'daftar'.
//
// Tidak membocorkan email terdaftar: jawaban, batas kirim, dan lama respons sama. Email yang
// sudah punya akun tidak menerima kode dan tidak pernah dibuatkan akun kedua.
//
// Verifikasi email akun lama: akun yang masuk meminta kode ke email akunnya sendiri (tujuan
// 'verifikasi'); kode benar → email_terverifikasi = 1. Akun lama tetap bisa masuk tanpa ini.

const { buatUuid } = require('../../util/id');
const { hashKataSandi } = require('../../util/kata-sandi');
const { GalatApi } = require('../../util/respons');
const penggunaRepo = require('../pengguna/pengguna.repo');
const persetujuanLayanan = require('../persetujuan/persetujuan.layanan');
const pendaftaranRepo = require('./pendaftaran.repo');
const auth = require('./auth.layanan');
const otp = require('./otp.layanan');

const PENDAFTARAN_BERLAKU_MENIT = 30;

function menitDariSekarang(menit) {
  return new Date(Date.now() + menit * 60 * 1000);
}

/** Hapus data daftar sementara yang lewat 30 menit. Dipanggil tiap permintaan daftar dan berkala (index.js). */
async function bersihkanPendaftaranKedaluwarsa() {
  return pendaftaranRepo.hapusKedaluwarsa(otp.keDb(new Date()));
}

async function kirimKodeDaftar(input) {
  otp.pastikanPengirimSiap();
  // 400/409 di sini tidak bergantung pada email (nama pengguna, kelas, kebijakan, prodi).
  const d = await auth.siapkanDaftar(input);
  // Hash sandi untuk SEMUA email: lama respons tidak membedakan email terdaftar.
  const kataSandiHash = await hashKataSandi(input.kata_sandi);
  // Batas 3 kode/15 menit berlaku sama untuk email terdaftar maupun tidak.
  const kode = await otp.terbitkanKode(input.email, 'daftar');

  const emailHash = otp.hashEmail(input.email);
  await bersihkanPendaftaranKedaluwarsa();
  await pendaftaranRepo.hapusUntukEmail(emailHash);
  await pendaftaranRepo.simpan({
    id: buatUuid(),
    emailHash,
    namaPengguna: d.namaPengguna,
    namaTampilan: d.namaTampilan,
    kataSandiHash,
    kelas: d.kelas,
    jenisSekolah: d.jenisSekolah,
    prodiTujuan: d.prodiTujuan,
    versiKebijakan: d.versiKebijakan,
    dibuatPada: otp.keDb(new Date()),
    kedaluwarsaPada: otp.keDb(menitDariSekarang(PENDAFTARAN_BERLAKU_MENIT)),
  });

  // Email yang sudah punya akun tidak menerima kode; jawabannya tetap sama.
  const terdaftar = await penggunaRepo.cariUntukMasukDenganEmail(input.email);
  if (!terdaftar) otp.kirimDiLatar(input.email, kode, 'daftar');

  return { diproses: true, berlaku_detik: otp.KODE_BERLAKU_MENIT * 60 };
}

async function verifikasiDaftar({ email, kode }) {
  await bersihkanPendaftaranKedaluwarsa();
  const idKode = await otp.periksaKode(email, kode, 'daftar');

  const emailHash = otp.hashEmail(email);
  const t = await pendaftaranRepo.ambilTerbaru(emailHash, otp.keDb(new Date()));
  if (!t) throw otp.galatKodeTidakBerlaku();
  // Email terdaftar tidak pernah menerima kode daftar; tetap dijaga di sini.
  if (await penggunaRepo.cariUntukMasukDenganEmail(email)) throw otp.galatKodeSalah();
  if (await penggunaRepo.cekNamaPenggunaDipakai(t.nama_pengguna)) throw auth.galatNamaDipakai();
  if (t.versi_kebijakan !== null) await persetujuanLayanan.pastikanVersiBerlaku(t.versi_kebijakan);

  await otp.pakaiKode(idKode);
  let hasil;
  try {
    hasil = await auth.buatAkun(
      {
        namaPengguna: t.nama_pengguna,
        namaTampilan: t.nama_tampilan,
        kelas: t.kelas,
        jenisSekolah: t.jenis_sekolah,
        prodiTujuan: t.prodi_tujuan,
        versiKebijakan: t.versi_kebijakan,
      },
      { kataSandiHash: t.kata_sandi_hash, email, emailTerverifikasi: true }
    );
  } catch (err) {
    // Dua pendaftaran bersamaan: nama pengguna atau email lebih dulu dipakai.
    if (err && err.code === 'ER_DUP_ENTRY') {
      throw /nama_pengguna/.test(err.message) ? auth.galatNamaDipakai() : otp.galatKodeSalah();
    }
    throw err;
  }
  await pendaftaranRepo.hapusUntukEmail(emailHash);
  return hasil;
}

async function profilDenganEmail(penggunaId) {
  const profil = await penggunaRepo.cariProfil(penggunaId);
  if (!profil) throw new GalatApi('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');
  if (!profil.email) {
    throw new GalatApi('VALIDASI_GAGAL', 'Akun ini belum punya email.', { email: 'belum ada' });
  }
  return profil;
}

async function kirimKodeVerifikasiEmail(penggunaId) {
  otp.pastikanPengirimSiap();
  const profil = await profilDenganEmail(penggunaId);
  if (profil.email_terverifikasi) return { sudah_terverifikasi: true };
  const kode = await otp.terbitkanKode(profil.email, 'verifikasi');
  otp.kirimDiLatar(profil.email, kode, 'verifikasi');
  return { diproses: true, berlaku_detik: otp.KODE_BERLAKU_MENIT * 60 };
}

/** Mengembalikan profil terbaru (bentuk sama dengan GET /auth/saya). */
async function verifikasiEmailAkun(penggunaId, { kode }) {
  const profil = await profilDenganEmail(penggunaId);
  if (!profil.email_terverifikasi) {
    const idKode = await otp.periksaKode(profil.email, kode, 'verifikasi');
    await otp.pakaiKode(idKode);
    await penggunaRepo.tandaiEmailTerverifikasi(penggunaId);
  }
  return auth.saya(penggunaId);
}

module.exports = {
  kirimKodeDaftar,
  verifikasiDaftar,
  kirimKodeVerifikasiEmail,
  verifikasiEmailAkun,
  bersihkanPendaftaranKedaluwarsa,
  PENDAFTARAN_BERLAKU_MENIT,
};
