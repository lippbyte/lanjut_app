// Aturan Jalur Saya (LANJUT_023 seri v2). Siswa boleh punya beberapa jalur sekaligus.
// Setiap baris pengguna_jalur_minat adalah satu babak: dimulai saat jalur dipilih, berakhir saat
// dijeda, selesai, atau ditinggalkan. Babak yang berakhir tidak pernah diubah atau dihapus.
// Semua akses data lewat repositori LANJUT_008, yang memeriksa pemilik di dalam SQL.

const { GalatApi } = require('../../util/respons');
const { buatUuid } = require('../../util/id');
const { sekarangUntukDb, keIso } = require('../../util/waktu');
const persetujuanLayanan = require('../persetujuan/persetujuan.layanan');
const jalurMinatRepo = require('./jalur-minat.repo');
const pilihanRepo = require('./pengguna-jalur-minat.repo');

/** Sama dengan gerbang Portofolio: data pengembangan diri hanya setelah kebijakan diterima. */
async function pastikanBoleh(penggunaId) {
  if (!(await persetujuanLayanan.kebijakanDiterima(penggunaId))) {
    throw new GalatApi('AI_BELUM_DIIZINKAN', 'Terima kebijakan privasi dulu supaya fitur ini bisa dipakai.');
  }
}

/**
 * `status_teks` ikut dikirim: semua deskripsi jalur masih DRAF (server/data-konten/jalur-minat.json),
 * dan aplikasi menandainya. Metadata konten lain tidak dibutuhkan layar.
 */
function bentukJalur(j) {
  return { id: j.id, nama: j.nama, deskripsi_singkat: j.deskripsi_singkat, status_teks: j.status_teks, urutan: j.urutan };
}

function bentukPilihan(p) {
  return {
    id: p.id,
    jalur_minat_id: p.jalur_minat_id,
    status: p.status,
    mulai_pada: keIso(p.mulai_pada),
    berakhir_pada: keIso(p.berakhir_pada),
    diubah_pada: keIso(p.diubah_pada),
  };
}

async function daftarJalur() {
  return (await jalurMinatRepo.daftarAktif()).map(bentukJalur);
}

/** jalur_minat adalah data bersama: boleh jalur mana pun yang ada dan aktif. */
async function pastikanJalurAktif(jalurMinatId, medan = 'jalur_minat_id') {
  if (jalurMinatId === undefined || jalurMinatId === null) return;
  const jalur = await jalurMinatRepo.ambil(jalurMinatId);
  if (!jalur || !jalur.aktif) throw new GalatApi('VALIDASI_GAGAL', 'Jalur tidak ditemukan.', { [medan]: 'tidak ditemukan' });
}

/** Semua babak milik akun, lama ke baru. Ini juga riwayat jalurnya. */
async function daftarPilihan(penggunaId) {
  return (await pilihanRepo.daftarMilikSendiri(penggunaId)).map(bentukPilihan);
}

async function pilih(penggunaId, { jalur_minat_id: jalurMinatId }) {
  await pastikanJalurAktif(jalurMinatId);
  const id = buatUuid();
  const dibuat = await pilihanRepo.buat({ id, penggunaId, jalurMinatId, waktu: sekarangUntukDb() });
  if (!dibuat) throw new GalatApi('JALUR_SUDAH_DIPILIH', 'Jalur ini sudah kamu pilih.', { jalur_minat_id: 'sudah dipilih' });
  return bentukPilihan(await pilihanRepo.ambilMilikSendiri(penggunaId, id));
}

async function akhiri(penggunaId, id, { status }) {
  const ada = await pilihanRepo.ambilMilikSendiri(penggunaId, id);
  if (!ada) throw new GalatApi('TIDAK_DITEMUKAN', 'Pilihan jalur tidak ditemukan.');
  const berhasil = await pilihanRepo.akhiriAktifMilikSendiri(penggunaId, id, status, sekarangUntukDb());
  if (!berhasil) {
    throw new GalatApi('PILIHAN_SUDAH_BERAKHIR', 'Pilihan ini sudah tidak aktif. Pilih jalurnya lagi untuk memulai babak baru.');
  }
  return bentukPilihan(await pilihanRepo.ambilMilikSendiri(penggunaId, id));
}

module.exports = { pastikanBoleh, pastikanJalurAktif, daftarJalur, daftarPilihan, pilih, akhiri, bentukJalur };
