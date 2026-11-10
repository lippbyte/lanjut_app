// Aturan Portofolio & Bukti (LANJUT_010 seri v2). Kontraknya di docs/kontrak-data-v2.md.
// Semua akses data lewat repositori LANJUT_008, yang memeriksa pemilik di dalam SQL.

const { GalatApi } = require('../../util/respons');
const { buatUuid } = require('../../util/id');
const { sekarangUntukDb, keIso } = require('../../util/waktu');
const persetujuanLayanan = require('../persetujuan/persetujuan.layanan');
const jalurMinatRepo = require('../jalur-minat/jalur-minat.repo');
const butirRepo = require('./butir-bukti.repo');
const lampiranRepo = require('./lampiran-butir-bukti.repo');
const penyimpanan = require('./penyimpanan-foto');
const { olahFoto, GalatFoto } = require('./foto-murni');

// Batas K20. Diperiksa di server, dan batas jumlah diperiksa dalam transaksi.
const BATAS_FOTO = { ukuranByte: 5 * 1024 * 1024, perButir: 3, perAkun: 30 };

const butirTidakAda = () => new GalatApi('TIDAK_DITEMUKAN', 'Butir tidak ditemukan.');
const fotoTidakAda = () => new GalatApi('TIDAK_DITEMUKAN', 'Foto tidak ditemukan.');
const galatFotoBesar = () =>
  new GalatApi('FOTO_TERLALU_BESAR', 'Foto terlalu besar. Ukuran maksimal 5 MB.', { ukuran_maks_mb: '5' });

async function pastikanBoleh(penggunaId) {
  if (!(await persetujuanLayanan.kebijakanDiterima(penggunaId))) {
    throw new GalatApi('AI_BELUM_DIIZINKAN', 'Terima kebijakan privasi dulu supaya fitur ini bisa dipakai.');
  }
}

const tanggal = (nilai) => (nilai instanceof Date ? nilai.toISOString().slice(0, 10) : nilai ?? null);

/** nama_tersimpan dan rujukan eksternal tidak pernah keluar lewat API. */
function bentukFoto(f) {
  return { id: f.id, jenis_berkas: f.jenis_berkas, ukuran_byte: f.ukuran_byte, nama_asli: f.nama_asli, dibuat_pada: keIso(f.dibuat_pada) };
}

function bentukButir(b, foto) {
  return {
    id: b.id,
    jalur_minat_id: b.jalur_minat_id,
    tujuan_id: b.tujuan_id,
    judul: b.judul,
    uraian: b.uraian,
    tautan: b.tautan,
    jenis: b.jenis,
    tanggal_karya: tanggal(b.tanggal_karya),
    visibilitas: b.visibilitas,
    dibuat_pada: keIso(b.dibuat_pada),
    diubah_pada: keIso(b.diubah_pada),
    foto: foto.map(bentukFoto),
  };
}

/** jalur_minat adalah data bersama: boleh jalur mana pun yang ada dan aktif. */
async function pastikanJalurAktif(jalurMinatId) {
  if (jalurMinatId === undefined || jalurMinatId === null) return;
  const jalur = await jalurMinatRepo.ambil(jalurMinatId);
  if (!jalur || !jalur.aktif) throw new GalatApi('VALIDASI_GAGAL', 'Jalur tidak ditemukan.', { jalur_minat_id: 'tidak ditemukan' });
}

const galatTujuan = () => new GalatApi('VALIDASI_GAGAL', 'Tujuan tidak ditemukan.', { tujuan_id: 'tidak ditemukan' });

async function daftar(penggunaId) {
  const [butir, foto] = await Promise.all([butirRepo.daftarMilikSendiri(penggunaId), lampiranRepo.daftarSemuaMilikSendiri(penggunaId)]);
  return butir.map((b) => bentukButir(b, foto.filter((f) => f.butir_bukti_id === b.id)));
}

async function ambil(penggunaId, id) {
  const b = await butirRepo.ambilMilikSendiri(penggunaId, id);
  if (!b) throw butirTidakAda();
  return bentukButir(b, await lampiranRepo.daftarUntukButirMilikSendiri(penggunaId, id));
}

async function buat(penggunaId, data) {
  await pastikanJalurAktif(data.jalur_minat_id);
  const id = buatUuid();
  const dibuat = await butirRepo.buat({
    id,
    penggunaId,
    jalurMinatId: data.jalur_minat_id ?? null,
    tujuanId: data.tujuan_id ?? null,
    judul: data.judul,
    uraian: data.uraian ?? null,
    tautan: data.tautan ?? null,
    jenis: data.jenis,
    tanggalKarya: data.tanggal_karya ?? null,
    waktu: sekarangUntukDb(),
  });
  if (!dibuat) throw galatTujuan();
  return ambil(penggunaId, id);
}

async function ubah(penggunaId, id, data) {
  if (!(await butirRepo.ambilMilikSendiri(penggunaId, id))) throw butirTidakAda();
  await pastikanJalurAktif(data.jalur_minat_id);
  const waktu = sekarangUntukDb();
  const { judul, uraian, tautan, jenis, tanggal_karya: tanggalKarya, jalur_minat_id: jalurMinatId, tujuan_id: tujuanId } = data;

  if (jalurMinatId !== undefined || tujuanId !== undefined) {
    const berhasil = await butirRepo.ubahKaitanMilikSendiri(penggunaId, id, { jalurMinatId, tujuanId, waktu });
    if (!berhasil) throw galatTujuan();
  }
  if ([judul, uraian, tautan, jenis, tanggalKarya].some((v) => v !== undefined)) {
    await butirRepo.ubahMilikSendiri(penggunaId, id, { judul, uraian, tautan, jenis, tanggalKarya, waktu });
  }
  return ambil(penggunaId, id);
}

/** Barisnya dihapus dulu. Berkas yang gagal dihapus dicatat untuk diselesaikan kemudian. */
async function hapus(penggunaId, id) {
  const foto = await lampiranRepo.daftarUntukButirMilikSendiri(penggunaId, id);
  if (!(await butirRepo.hapusMilikSendiri(penggunaId, id))) throw butirTidakAda();
  for (const f of foto) await penyimpanan.hapus(penggunaId, f.nama_tersimpan, 'hapus_butir');
  return { dihapus: true };
}

async function pastikanButirMilik(penggunaId, id) {
  if (!(await butirRepo.ambilMilikSendiri(penggunaId, id))) throw butirTidakAda();
}

/** Nama dari pengguna hanya untuk tampilan, dan tidak pernah menjadi bagian jalur berkas. */
function namaAsliAman(nama) {
  const dasar = String(nama || '').replace(/\\/g, '/').split('/').pop();
  // eslint-disable-next-line no-control-regex
  return dasar.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 255) || 'foto';
}

const GALAT_BATAS = {
  butir_tidak_ada: butirTidakAda,
  batas_butir: () => new GalatApi('BATAS_FOTO_BUTIR', `Satu butir paling banyak punya ${BATAS_FOTO.perButir} foto.`, { foto: 'batas per butir' }),
  batas_akun: () => new GalatApi('BATAS_FOTO_AKUN', `Satu akun paling banyak punya ${BATAS_FOTO.perAkun} foto.`, { foto: 'batas per akun' }),
};

/**
 * Berkas ditulis dulu, lalu baris dibuat dalam transaksi yang memeriksa batas. Kalau ditolak,
 * berkasnya dibuang. Urutan ini menjamin tidak ada baris yang menunjuk berkas yang tidak ada.
 */
async function unggahFoto(penggunaId, butirBuktiId, berkas) {
  let hasil;
  try {
    hasil = olahFoto(berkas.buffer);
  } catch (galat) {
    if (galat instanceof GalatFoto) throw new GalatApi(galat.kode, galat.message, { foto: galat.kode });
    throw galat;
  }

  const namaTersimpan = await penyimpanan.tulis(penggunaId, hasil.isi, hasil.ekstensi);
  const id = buatUuid();
  let status;
  try {
    status = await lampiranRepo.buatDenganBatas({
      id,
      penggunaId,
      butirBuktiId,
      jenisBerkas: hasil.mime,
      ukuranByte: hasil.isi.length,
      namaTersimpan,
      namaAsli: namaAsliAman(berkas.originalname),
      batasPerButir: BATAS_FOTO.perButir,
      batasPerAkun: BATAS_FOTO.perAkun,
      waktu: sekarangUntukDb(),
    });
  } catch (galat) {
    await penyimpanan.hapus(penggunaId, namaTersimpan, 'unggah_gagal');
    throw galat;
  }
  if (status !== 'ok') {
    await penyimpanan.hapus(penggunaId, namaTersimpan, 'unggah_ditolak');
    throw GALAT_BATAS[status]();
  }
  return bentukFoto(await lampiranRepo.ambilMilikSendiri(penggunaId, id));
}

async function fotoMilik(penggunaId, butirBuktiId, fotoId) {
  const foto = await lampiranRepo.ambilMilikSendiri(penggunaId, fotoId);
  if (!foto || foto.butir_bukti_id !== butirBuktiId) throw fotoTidakAda();
  return foto;
}

async function ambilFoto(penggunaId, butirBuktiId, fotoId) {
  const foto = await fotoMilik(penggunaId, butirBuktiId, fotoId);
  const isi = await penyimpanan.baca(penggunaId, foto.nama_tersimpan);
  if (!isi) throw fotoTidakAda();
  return { isi, jenisBerkas: foto.jenis_berkas };
}

async function hapusFoto(penggunaId, butirBuktiId, fotoId) {
  const foto = await fotoMilik(penggunaId, butirBuktiId, fotoId);
  if (!(await lampiranRepo.hapusMilikSendiri(penggunaId, fotoId))) throw fotoTidakAda();
  await penyimpanan.hapus(penggunaId, foto.nama_tersimpan, 'hapus_foto');
  return { dihapus: true };
}

module.exports = { pastikanBoleh, daftar, ambil, buat, ubah, hapus, pastikanButirMilik, unggahFoto, ambilFoto, hapusFoto, galatFotoBesar, BATAS_FOTO };
