// Hapus akun dan ekspor data milik satu akun (LANJUT_009 seri v2). Kontraknya ada di
// docs/kontrak-data-v2.md, dan daftar tempat datanya di docs/audit-hapus-akun-ekspor.md.

const { GalatApi } = require('../../util/respons');
const { cocokKataSandi } = require('../../util/kata-sandi');
const { sekarangIso } = require('../../util/waktu');
const percobaanRepo = require('../auth/percobaanMasuk.repo');
const otp = require('../auth/otp.layanan');
const penggunaJalurMinatRepo = require('../jalur-minat/pengguna-jalur-minat.repo');
const tujuanRepo = require('../tujuan/tujuan.repo');
const butirBuktiRepo = require('../butir-bukti/butir-bukti.repo');
const lampiranRepo = require('../butir-bukti/lampiran-butir-bukti.repo');
const modulLayanan = require('../modul/modul.layanan');
const repo = require('./data-pengguna.repo');
const { hapusBerkasPengguna } = require('./berkas-pengguna');

const TUJUAN_KODE = 'hapus_akun';

// Batas ekspor. Data yang melewatinya ditolak utuh, tidak pernah dipotong diam-diam.
const BATAS_BAWAAN = { barisPerTabel: 20000, byte: 30 * 1024 * 1024 };

async function eksporDataV2(penggunaId) {
  const [pengguna_jalur_minat, tujuan, butir_bukti, lampiran_butir_bukti] = await Promise.all([
    penggunaJalurMinatRepo.daftarMilikSendiri(penggunaId),
    tujuanRepo.daftarMilikSendiri(penggunaId),
    butirBuktiRepo.daftarMilikSendiri(penggunaId),
    lampiranRepo.daftarSemuaMilikSendiri(penggunaId),
  ]);
  return { pengguna_jalur_minat, tujuan, butir_bukti, lampiran_butir_bukti };
}

const galatEksporBesar = () =>
  new GalatApi('EKSPOR_TERLALU_BESAR', 'Data akun ini terlalu besar untuk diunduh sekaligus.');

async function eksporSemua(penggunaId, batas = BATAS_BAWAAN) {
  const pengguna = await repo.profilUntukEkspor(penggunaId);
  if (!pengguna) throw new GalatApi('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');

  // Satu baris lebih banyak dari batas: cukup untuk tahu datanya melewati batas.
  const [lama, v2, percobaan_masuk] = await Promise.all([
    repo.barisUntukEkspor(penggunaId, batas.barisPerTabel + 1),
    eksporDataV2(penggunaId),
    repo.percobaanMasukUntukEkspor(pengguna.nama_pengguna),
  ]);
  if (Object.values(lama).some((baris) => baris.length > batas.barisPerTabel)) throw galatEksporBesar();

  const hasil = { versi_ekspor: 1, dibuat_pada: sekarangIso(), pengguna, percobaan_masuk, ...lama, ...v2 };
  if (Buffer.byteLength(JSON.stringify(hasil), 'utf8') > batas.byte) throw galatEksporBesar();
  return hasil;
}

async function akunUntukKonfirmasi(penggunaId) {
  const akun = await repo.ambilUntukKonfirmasi(penggunaId);
  if (!akun) throw new GalatApi('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');
  return akun;
}

function pastikanEmailTerverifikasi(akun) {
  if (!akun.email || !akun.email_terverifikasi) {
    throw new GalatApi('TIDAK_BERHAK', 'Akun ini belum punya email terverifikasi. Pakai kata sandi.');
  }
}

/** Pola tabel percobaan_masuk sama dengan layar masuk, jadi sandi tidak bisa ditebak lewat rute ini. */
async function pastikanKataSandi(akun, kataSandi) {
  const status = await percobaanRepo.ambil(akun.nama_pengguna);
  if (status && status.terkunci_sampai && new Date(status.terkunci_sampai) > new Date()) {
    throw new GalatApi('TERLALU_SERING', 'Akun ini sementara dikunci karena terlalu banyak percobaan gagal.');
  }
  if (!(await cocokKataSandi(kataSandi, akun.kata_sandi_hash))) {
    await percobaanRepo.catatGagal(akun.nama_pengguna);
    throw new GalatApi('KREDENSIAL_SALAH', 'Kata sandi tidak cocok.', { kata_sandi: 'tidak cocok' });
  }
}

async function pastikanKodeEmail(akun, kode) {
  pastikanEmailTerverifikasi(akun);
  const idKode = await otp.periksaKode(akun.email, kode, TUJUAN_KODE);
  await otp.pakaiKode(idKode);
}

async function kirimKodeHapus(penggunaId) {
  otp.pastikanPengirimSiap();
  const akun = await akunUntukKonfirmasi(penggunaId);
  pastikanEmailTerverifikasi(akun);
  const kode = await otp.terbitkanKode(akun.email, TUJUAN_KODE);
  otp.kirimDiLatar(akun.email, kode, TUJUAN_KODE);
  return { diproses: true, berlaku_detik: otp.KODE_BERLAKU_MENIT * 60 };
}

/**
 * Identitas ditegaskan dulu, lalu semua baris dihapus dalam satu transaksi, lalu berkasnya.
 * Tidak ada masa tenggang: kebijakan privasi tidak menjanjikannya.
 */
async function hapusAkun(penggunaId, { kata_sandi, kode_email }) {
  const akun = await akunUntukKonfirmasi(penggunaId);
  if (kata_sandi) await pastikanKataSandi(akun, kata_sandi);
  else await pastikanKodeEmail(akun, kode_email);

  const { dihapus, adaModul } = await repo.hapusAkunDalamTransaksi(penggunaId, {
    namaPengguna: akun.nama_pengguna,
    emailHash: akun.email ? otp.hashEmail(akun.email) : null,
  });
  if (!dihapus) throw new GalatApi('TIDAK_DITEMUKAN', 'Pengguna tidak ditemukan.');

  await hapusBerkasPengguna(penggunaId);
  // Kata dari modul masih tertinggal di indeks FULLTEXT sampai tabelnya dirapikan.
  if (adaModul) modulLayanan.jadwalkanRapikanIndeks();
  return { dihapus: true };
}

module.exports = { eksporDataV2, eksporSemua, kirimKodeHapus, hapusAkun, BATAS_BAWAAN };
