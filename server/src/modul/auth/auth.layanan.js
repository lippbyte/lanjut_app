// Aturan bisnis auth. Tidak ada SQL di sini — hanya memanggil repositori.
// docs/SDD-Backend-Foundation.md §5.4, §8.1, §8.2.

const { buatUuid } = require('../../util/id');
const { sekarangUntukDb, sekarangIso, keIso } = require('../../util/waktu');
const { hashKataSandi, cocokKataSandi } = require('../../util/kata-sandi');
const { buatTokenMentah, hashToken } = require('../../util/token');
const { GalatApi } = require('../../util/respons');
const { tentukanJenisSekolah } = require('../../util/kelas');
const env = require('../../config/env');

const penggunaRepo = require('../pengguna/pengguna.repo');
const kontenRepo = require('../konten/konten.repo');
const sesiRepo = require('./sesi.repo');
const percobaanRepo = require('./percobaanMasuk.repo');
const persetujuanLayanan = require('../persetujuan/persetujuan.layanan');

// Pemetaan prodi_impian → prodi_tujuan dilakukan DI SATU TEMPAT SAJA (§3.3).
function petakanProdiTujuan(prodiImpian) {
  if (!prodiImpian || prodiImpian === 'belum') return null;
  return prodiImpian;
}

// C-2/C-2b: validasi keberadaan prodi sebelum menyimpan, di SATU TEMPAT SAJA
// supaya semua jalur tulis (daftar, ubah profil, klaim sinkron) memakai
// aturan yang sama. Tanpa ini, prodi yang tidak dikenal jatuh ke pelanggaran
// FK saat disimpan dan bocor sebagai HTTP 500, bukan 400 VALIDASI_GAGAL.
// `prodiTujuan` di sini SUDAH melalui petakanProdiTujuan() — null berarti
// "belum ada pilihan" dan selalu valid.
async function pastikanProdiValid(prodiTujuan) {
  if (!prodiTujuan) return;
  const prodiAda = await kontenRepo.prodiAda(prodiTujuan);
  if (!prodiAda) {
    throw new GalatApi('VALIDASI_GAGAL', 'Prodi tidak dikenali.', {
      prodi_impian: 'tidak dikenali',
    });
  }
}

/** Kolom JSON larik (minat_rumpun, mapel_pilihan) → larik string; NULL atau isi tak terbaca → []. */
function larikMinat(nilai) {
  let isi = nilai;
  if (typeof isi === 'string') {
    try {
      isi = JSON.parse(isi);
    } catch {
      return [];
    }
  }
  return Array.isArray(isi) ? isi.filter((r) => typeof r === 'string') : [];
}

function bentukProfil(baris) {
  return {
    id: baris.id,
    nama_pengguna: baris.nama_pengguna,
    nama_tampilan: baris.nama_tampilan || baris.nama_pengguna,
    email: baris.email,
    // LANJUT_083c: email terbukti milik pemilik akun (kode email atau Google). Akun lama: false.
    email_terverifikasi: Boolean(baris.email_terverifikasi),
    // LANJUT_083d: kata sandi lama dicabut saat pemilik email mengambil alih akun; app wajib
    // menampilkan layar "Buat kata sandi baru" sampai sandi baru dibuat.
    perlu_sandi_baru: Boolean(baris.wajib_buat_sandi),
    peran: baris.peran,
    status: baris.status,
    kelas: baris.kelas,
    jenis_sekolah: baris.jenis_sekolah ?? null, // LANJUT_038
    // Kolom DB tetap `prodi_tujuan` (FK -> prodi.id, §13/§3.3), tapi kontrak
    // API menamainya `prodi_impian` (keputusan PM, C-1). Jangan ubah nama
    // kolom DB — hanya nama medan di respons ini.
    prodi_impian: baris.prodi_tujuan,
    gaya_belajar: baris.gaya_belajar ?? null, // LANJUT_032
    // LANJUT_075: larik nama rumpun; NULL (belum memilih) → []. JSON bisa datang
    // sebagai larik (MySQL) atau teks (MariaDB menyimpan JSON sebagai LONGTEXT).
    minat_rumpun: larikMinat(baris.minat_rumpun),
    // LANJUT_079: larik id mapel (Pilih Mapel kelas 12 / Mapel Saya kelas 7–11); NULL → [].
    mapel_pilihan: larikMinat(baris.mapel_pilihan),
    // Kesiapan ujian (percakapan 15 Okt 2026): 'belum' | 'sebagian' | 'hampir' | 'siap'; NULL → null.
    kesiapan_ujian: baris.kesiapan_ujian ?? null,
    dibuat_pada: keIso(baris.dibuat_pada),
    terakhir_masuk_pada: keIso(baris.terakhir_masuk_pada),
  };
}

function galatNamaDipakai() {
  return new GalatApi('NAMA_PENGGUNA_DIPAKAI', 'Nama pengguna sudah dipakai.', { nama_pengguna: 'sudah dipakai' });
}

/**
 * Validasi data daftar, dipakai daftar langsung (tanpa email) dan daftar dengan kode email
 * (LANJUT_083c). Tidak pernah memeriksa email: jawabannya sama untuk email apa pun.
 */
async function siapkanDaftar({ nama_pengguna, nama_tampilan, kelas, jenis_sekolah, prodi_impian, versi_kebijakan }) {
  // LANJUT_038: kelas 7–9 → SMP; kelas 10–12 + SMP (atau 7–9 + SMA) → 400.
  const jenisSekolah = tentukanJenisSekolah(kelas ?? null, jenis_sekolah, null);
  // LANJUT_047: versi kebijakan yang usang ditolak SEBELUM akun dibuat.
  if (versi_kebijakan !== undefined) await persetujuanLayanan.pastikanVersiBerlaku(versi_kebijakan);

  if (await penggunaRepo.cekNamaPenggunaDipakai(nama_pengguna)) throw galatNamaDipakai();

  const prodiTujuan = petakanProdiTujuan(prodi_impian);
  // C-2: validasi keberadaan prodi SEBELUM insert (helper bersama di atas).
  await pastikanProdiValid(prodiTujuan);

  return {
    namaPengguna: nama_pengguna,
    namaTampilan: nama_tampilan,
    kelas,
    jenisSekolah,
    prodiTujuan,
    versiKebijakan: versi_kebijakan ?? null,
  };
}

/** Buat akun dari data yang sudah divalidasi siapkanDaftar, lalu sesi seperti login biasa. */
async function buatAkun(d, { kataSandiHash, email = null, emailTerverifikasi = false }) {
  const id = buatUuid();
  await penggunaRepo.buatPengguna({
    id,
    namaPengguna: d.namaPengguna,
    namaTampilan: d.namaTampilan,
    email,
    emailTerverifikasi,
    kataSandiHash,
    kelas: d.kelas,
    jenisSekolah: d.jenisSekolah,
    prodiTujuan: d.prodiTujuan,
    dibuatPada: sekarangUntukDb(),
  });
  if (d.versiKebijakan !== null) await persetujuanLayanan.terimaKebijakan(id, d.versiKebijakan);
  return buatSesiDanBentukRespons(id);
}

async function daftar(input) {
  // LANJUT_083c: akun dengan email hanya dibuat setelah email terbukti lewat kode
  // (POST /auth/daftar/kirim-kode lalu /auth/daftar/verifikasi). Di sini hanya akun tanpa email.
  if (input.email) {
    throw new GalatApi('VALIDASI_GAGAL', 'Daftar dengan email memakai kode verifikasi.', {
      email: 'Daftar dengan email perlu kode verifikasi. Kosongkan email, atau perbarui aplikasi.',
    });
  }
  const d = await siapkanDaftar(input);
  return buatAkun(d, { kataSandiHash: await hashKataSandi(input.kata_sandi) });
}

async function masuk({ nama_pengguna, kata_sandi }) {
  const status = await percobaanRepo.ambil(nama_pengguna);
  if (status && status.terkunci_sampai && new Date(status.terkunci_sampai) > new Date()) {
    throw new GalatApi(
      'TERLALU_SERING',
      'Akun ini sementara dikunci karena terlalu banyak percobaan gagal.'
    );
  }

  const baris = await penggunaRepo.cariUntukMasuk(nama_pengguna);

  // SELALU jalankan bcrypt.compare, juga saat akun tidak ada, terhadap hash
  // boneka — supaya lama respons tidak membocorkan akun mana yang ada (§5.4).
  const hashUntukDibandingkan = baris ? baris.kata_sandi_hash : null;
  const cocok = await cocokKataSandi(kata_sandi, hashUntukDibandingkan);

  if (!baris || !cocok || baris.status !== 'aktif') {
    await percobaanRepo.catatGagal(nama_pengguna);
    throw new GalatApi('KREDENSIAL_SALAH', 'Nama pengguna atau kata sandi tidak cocok.');
  }
  // LANJUT_083d: kata sandi lama sudah dicabut (pemilik email mengambil alih akun). Hanya yang
  // tahu kata sandi lama yang melihat galat ini; tebakan salah tetap KREDENSIAL_SALAH di atas.
  if (baris.wajib_buat_sandi) {
    throw new GalatApi('SANDI_PERLU_DIBUAT', 'Masuk dengan kode email dulu, lalu buat kata sandi baru.');
  }
  // LANJUT_084: tenggat verifikasi akun lama (migrasi 028) sudah lewat dan email masih belum
  // terverifikasi → kata sandi tidak cukup lagi; pemilik email masuk lewat kode email atau Google
  // (ambil alih 083d). Akun tanpa tenggat (NULL) atau yang masih dalam tenggat tidak berubah.
  if (!baris.email_terverifikasi && baris.batas_verifikasi && new Date(baris.batas_verifikasi) <= new Date()) {
    throw new GalatApi('EMAIL_BELUM_DIVERIFIKASI', 'Akun ini perlu diverifikasi dulu. Masuk dengan kode email untuk melanjutkan.');
  }

  await percobaanRepo.resetSetelahBerhasil(nama_pengguna);
  await penggunaRepo.tandaiTerakhirMasuk(baris.id, sekarangUntukDb());

  return buatSesiDanBentukRespons(baris.id);
}

async function buatSesiDanBentukRespons(penggunaId, perangkat) {
  const tokenMentah = buatTokenMentah();
  const tokenHash = hashToken(tokenMentah);
  const { kedaluwarsaPada } = await sesiRepo.buatSesi(
    penggunaId,
    tokenHash,
    env.SESI_UMUR_HARI,
    perangkat
  );
  const profilBaris = await penggunaRepo.cariProfil(penggunaId);
  return {
    token: tokenMentah,
    kedaluwarsa_pada: keIso(kedaluwarsaPada),
    pengguna: bentukProfil(profilBaris),
  };
}

/**
 * LANJUT_083d (keputusan PM, pilihan a): masuk lewat bukti kepemilikan email (kode email atau
 * Google). Akun yang emailnya belum terverifikasi diambil alih oleh pemilik email: email
 * terverifikasi, kata sandi lama dicabut, dan semua sesi lain dicabut, lalu sesi baru dibuat.
 * Akun yang sudah terverifikasi tidak berubah.
 */
async function masukLewatBuktiEmail(penggunaId) {
  if (await penggunaRepo.ambilAlihOlehPemilikEmail(penggunaId)) {
    await sesiRepo.cabutSemuaSesiPengguna(penggunaId);
  }
  await penggunaRepo.tandaiTerakhirMasuk(penggunaId, sekarangUntukDb());
  const sesi = await buatSesiDanBentukRespons(penggunaId);
  return { ...sesi, perlu_sandi_baru: sesi.pengguna.perlu_sandi_baru };
}

/** LANJUT_083d: kata sandi baru untuk akun yang sandinya dicabut; hanya selama tandanya aktif. */
async function buatSandi(penggunaId, { kata_sandi_baru }) {
  const profil = await penggunaRepo.cariProfil(penggunaId);
  if (!profil) throw new GalatApi('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');
  const dibuat = await penggunaRepo.buatSandiBaru(penggunaId, await hashKataSandi(kata_sandi_baru));
  if (!dibuat) {
    throw new GalatApi('TIDAK_BERHAK', 'Kata sandi baru hanya dibuat setelah kata sandi lama dicabut. Pakai ubah kata sandi.');
  }
  // Kunci percobaan gagal dari tebakan kata sandi lama tidak ikut menahan kata sandi baru.
  await percobaanRepo.resetSetelahBerhasil(profil.nama_pengguna);
  return saya(penggunaId);
}

async function keluar(req) {
  if (req.tokenHashSaatIni && req.pengguna) {
    await sesiRepo.cabutSesiByTokenHash(req.tokenHashSaatIni, req.pengguna.id);
  }
}

async function keluarSemua(penggunaId) {
  await sesiRepo.cabutSemuaSesiPengguna(penggunaId);
}

async function saya(penggunaId) {
  const baris = await penggunaRepo.cariProfil(penggunaId);
  if (!baris) throw new GalatApi('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');
  return bentukProfil(baris);
}

async function ubahSandi(penggunaId, { kata_sandi_lama, kata_sandi_baru }) {
  // cariUntukMasuk butuh nama_pengguna; ambil dulu profil untuk tahu nama_pengguna-nya.
  const profil = await penggunaRepo.cariProfil(penggunaId);
  if (!profil) throw new GalatApi('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');

  const baris = await penggunaRepo.cariUntukMasuk(profil.nama_pengguna);
  const cocok = await cocokKataSandi(kata_sandi_lama, baris.kata_sandi_hash);
  if (!cocok) {
    throw new GalatApi('KREDENSIAL_SALAH', 'Kata sandi lama tidak cocok.', {
      kata_sandi_lama: 'tidak cocok',
    });
  }

  const hashBaru = await hashKataSandi(kata_sandi_baru);
  await penggunaRepo.updateKataSandiHash(penggunaId, hashBaru);
  // Sukses → seluruh sesi lain dicabut (§4.3).
  await sesiRepo.cabutSemuaSesiPengguna(penggunaId);
}

module.exports = {
  daftar,
  masuk,
  keluar,
  keluarSemua,
  saya,
  ubahSandi,
  buatSesiDanBentukRespons, // dipakai otp.layanan & google.layanan (LANJUT_083)
  masukLewatBuktiEmail, // dipakai otp.layanan & google.layanan (LANJUT_083d)
  buatSandi,
  siapkanDaftar, // dipakai daftarEmail.layanan (LANJUT_083c)
  buatAkun,
  galatNamaDipakai,
  petakanProdiTujuan,
  pastikanProdiValid,
  bentukProfil,
  larikMinat,
};
