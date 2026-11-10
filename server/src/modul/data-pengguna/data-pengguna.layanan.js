// Bahan ekspor data milik satu akun (LANJUT_008 seri v2). Aplikasi belum punya fitur ekspor
// atau hapus akun, jadi berkas ini belum dipanggil rute mana pun. Bila fitur ekspor dibuat,
// empat tabel v2 diambil dari sini. Lihat docs/kontrak-data-v2.md.

const penggunaJalurMinatRepo = require('../jalur-minat/pengguna-jalur-minat.repo');
const tujuanRepo = require('../tujuan/tujuan.repo');
const butirBuktiRepo = require('../butir-bukti/butir-bukti.repo');
const lampiranRepo = require('../butir-bukti/lampiran-butir-bukti.repo');

async function eksporDataV2(penggunaId) {
  const [pengguna_jalur_minat, tujuan, butir_bukti, lampiran_butir_bukti] = await Promise.all([
    penggunaJalurMinatRepo.daftarMilikSendiri(penggunaId),
    tujuanRepo.daftarMilikSendiri(penggunaId),
    butirBuktiRepo.daftarMilikSendiri(penggunaId),
    lampiranRepo.daftarSemuaMilikSendiri(penggunaId),
  ]);
  return { pengguna_jalur_minat, tujuan, butir_bukti, lampiran_butir_bukti };
}

module.exports = { eksporDataV2 };
