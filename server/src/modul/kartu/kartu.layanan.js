// Aturan bisnis kartu. docs/SDD-Backend-Foundation.md §4.5, §8.4.
// Tidak ada SQL di sini — hanya memanggil repositori.

const { buatUuid } = require('../../util/id');
const { sekarangUntukDb, keIso } = require('../../util/waktu');
const { GalatApi } = require('../../util/respons');
const repo = require('./kartu.repo');

function bentukKartu(baris) {
  return {
    id: baris.id,
    pemilik_id: baris.pemilik_id,
    mapel_id: baris.mapel_id,
    judul: baris.judul,
    isi: baris.isi,
    jawaban: baris.jawaban,
    sumber: baris.sumber,
    penyedia: baris.penyedia,
    dibuat_pada: keIso(baris.dibuat_pada),
    diubah_pada: keIso(baris.diubah_pada),
  };
}

async function daftar(penggunaId, { mapel, sumber }) {
  const baris = await repo.daftarUntukPengguna(penggunaId, { mapelId: mapel, sumber });
  return baris.map(bentukKartu);
}

async function tambah(penggunaId, { mapel_id, judul, isi, jawaban }) {
  const mapelAda = await repo.mapelAda(mapel_id);
  if (!mapelAda) {
    throw new GalatApi('VALIDASI_GAGAL', 'Mapel tidak ditemukan.', { mapel_id: 'tidak ditemukan' });
  }

  // Server MEMAKSA sumber='pengguna' dan pemilik_id=pengguna berjalan (§4.5).
  // Nilai `sumber`/`pemilik_id` dari body diabaikan — memang tidak pernah
  // sampai ke sini karena skema zod tidak menyebutkannya (daftar putih).
  const id = buatUuid();
  const waktu = sekarangUntukDb();
  await repo.buatKartu({ id, pemilikId: penggunaId, mapelId: mapel_id, judul, isi, jawaban, waktu });

  const baris = await repo.ambilMilikSendiri(penggunaId, id);
  return bentukKartu(baris);
}

/** 404 (bukan 403) untuk kartu milik orang lain — §8.4. */
async function perbarui(penggunaId, kartuId, perubahan) {
  if (perubahan.mapel_id !== undefined && !(await repo.mapelAda(perubahan.mapel_id))) {
    throw new GalatApi('VALIDASI_GAGAL', 'Mapel tidak ditemukan.', { mapel_id: 'tidak ditemukan' });
  }
  const waktu = sekarangUntukDb();
  const berhasil = await repo.perbaruiMilikSendiri(penggunaId, kartuId, { ...perubahan, waktu });
  if (!berhasil) {
    throw new GalatApi('TIDAK_DITEMUKAN', 'Kartu tidak ditemukan.');
  }
  const baris = await repo.ambilMilikSendiri(penggunaId, kartuId);
  return bentukKartu(baris);
}

async function hapus(penggunaId, kartuId) {
  const waktu = sekarangUntukDb();
  const berhasil = await repo.hapusLunakMilikSendiri(penggunaId, kartuId, waktu);
  if (!berhasil) {
    throw new GalatApi('TIDAK_DITEMUKAN', 'Kartu tidak ditemukan.');
  }
}

module.exports = { daftar, tambah, perbarui, hapus, bentukKartu };
