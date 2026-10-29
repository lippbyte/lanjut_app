// Aturan bisnis butir Daftar Periksa pribadi (LANJUT_034).
// Tidak ada SQL di sini — hanya memanggil repositori.

const { buatUuid } = require('../../util/id');
const { sekarangUntukDb, keIso } = require('../../util/waktu');
const { GalatApi } = require('../../util/respons');
const repo = require('./butir-pribadi.repo');

// Letak butir di Daftar Periksa. mapel_tka masuk kategori umum
// "Pendaftaran" (id sama dengan kategori_checklist); riset_kampus kategori
// tersendiri yang tidak ada di butir umum (pola PWA: kategori runtime).
const KATEGORI = {
  mapel_tka: { kategori_id: 'pendaftaran', kategori_nama: 'Pendaftaran' },
  riset_kampus: { kategori_id: 'riset-kampus', kategori_nama: 'Riset Kampus' },
};

function bentukButir(baris) {
  return {
    id: baris.id,
    jenis: baris.jenis,
    prodi_id: baris.prodi_id,
    judul: baris.judul,
    ...KATEGORI[baris.jenis],
    selesai_pada: keIso(baris.selesai_pada),
    dibuat_pada: keIso(baris.dibuat_pada),
  };
}

async function daftar(penggunaId) {
  const baris = await repo.daftarMilikSendiri(penggunaId);
  return baris.map(bentukButir);
}

/** Judul disusun dari data server — kalimatnya sama dengan PWA. */
async function susunJudul({ jenis, prodi_id, mapel_ids }) {
  const prodi = await repo.namaProdi(prodi_id);
  if (!prodi) {
    throw new GalatApi('VALIDASI_GAGAL', 'Prodi tidak ditemukan.', { prodi_id: 'tidak ditemukan' });
  }
  if (jenis === 'riset_kampus') return `Cari tahu lebih lanjut soal ${prodi}`;

  const terkait = await repo.mapelUntukProdi(prodi_id, mapel_ids);
  const nama = mapel_ids.map((id) => terkait.find((m) => m.id === id)?.nama);
  if (nama.some((n) => !n)) {
    throw new GalatApi('VALIDASI_GAGAL', 'Mapel tidak cocok dengan prodi.', { mapel_ids: 'tidak cocok dengan prodi' });
  }
  return `Pilih ${nama.join(' & ')} sebagai mapel TKA — untuk ${prodi}`;
}

/**
 * Simpan dari F3/F10. Menyimpan ulang (pengguna, jenis, prodi) yang sama
 * memperbarui butir lama. F3 langsung dicentang (sama dengan PWA); F10 tidak,
 * karena "cari tahu lebih lanjut" belum dikerjakan.
 * @returns {{ butir: object, baru: boolean }}
 */
async function simpan(penggunaId, masukan) {
  const judul = await susunJudul(masukan);
  const sudahAda = await repo.ambilMenurutKunci(penggunaId, masukan.jenis, masukan.prodi_id);
  await repo.simpan({
    id: buatUuid(),
    penggunaId,
    jenis: masukan.jenis,
    prodiId: masukan.prodi_id,
    judul,
    tandaiSelesai: masukan.jenis === 'mapel_tka',
    waktu: sekarangUntukDb(),
  });
  const baris = await repo.ambilMenurutKunci(penggunaId, masukan.jenis, masukan.prodi_id);
  return { butir: bentukButir(baris), baru: !sudahAda };
}

/** 404 (bukan 403) untuk butir milik akun lain — §8.4. */
async function aturSelesai(penggunaId, butirId, selesai) {
  const waktu = sekarangUntukDb();
  const berhasil = await repo.aturSelesaiMilikSendiri(penggunaId, butirId, selesai ? waktu : null, waktu);
  if (!berhasil) throw new GalatApi('TIDAK_DITEMUKAN', 'Butir daftar periksa tidak ditemukan.');
  return bentukButir(await repo.ambilMilikSendiri(penggunaId, butirId));
}

async function hapus(penggunaId, butirId) {
  const berhasil = await repo.hapusLunakMilikSendiri(penggunaId, butirId, sekarangUntukDb());
  if (!berhasil) throw new GalatApi('TIDAK_DITEMUKAN', 'Butir daftar periksa tidak ditemukan.');
}

module.exports = { daftar, simpan, aturSelesai, hapus };
