// Aturan Discover dan Profil Eksplorasi (LANJUT_024 seri v2).
//
// - Kartu: hanya kartu aktif yang teksnya disetujui yang dikirim atau bisa diberi refleksi (K37).
//   Kartu draf, nonaktif, dan yang tidak ada dijawab sama.
// - Refleksi: jawaban singkat siswa per kartu, hanya milik siswa itu.
// - Profil Eksplorasi: ATURAN, BUKAN AI. Isinya hanya salinan yang siswa tulis dan pilih: refleksi,
//   minat rumpun, mapel pilihan, jalur aktif, dan judul tujuannya. Tidak ada kesimpulan tentang
//   kepribadian, kemampuan, atau sifat siswa, dan tidak ada label yang tidak ditulis siswa.
//   Memperbarui profil membuat versi baru; versi lama tetap ada.
// - Modul ini tidak membuka koneksi keluar dan tidak memanggil AI atau mesin pencari.
//
// Pemeriksaan ganda: layanan memeriksa lebih dulu, lalu repositori memeriksa lagi di SQL.

const { isDeepStrictEqual } = require('node:util');
const { GalatApi } = require('../../util/respons');
const { buatUuid } = require('../../util/id');
const { sekarangUntukDb, keIso } = require('../../util/waktu');
const kartuRepo = require('./kartu-discover.repo');
const refleksiRepo = require('./refleksi-discover.repo');
const profilRepo = require('./profil-eksplorasi.repo');
const penggunaRepo = require('../pengguna/pengguna.repo');
const kontenRepo = require('../konten/konten.repo');
const jalurMinatRepo = require('../jalur-minat/jalur-minat.repo');
const pilihanRepo = require('../jalur-minat/pengguna-jalur-minat.repo');
const tujuanRepo = require('../tujuan/tujuan.repo');
const { larikMinat } = require('../auth/auth.layanan');
const { POLA_ID_KARTU } = require('./discover.skema');

const kartuBelumTersedia = () => new GalatApi('KARTU_BELUM_TERSEDIA', 'Kartu belum tersedia.', { kartu_discover_id: 'belum tersedia' });

const tanggal = (nilai) => (nilai instanceof Date ? nilai.toISOString().slice(0, 10) : nilai ?? null);

function bentukKartu(k) {
  return { id: k.id, jenis: k.jenis, judul: k.judul, ringkasan: k.ringkasan, url_sumber: k.url_sumber, diperiksa_pada: tanggal(k.diperiksa_pada) };
}

function bentukRefleksi(r) {
  return {
    kartu_discover_id: r.kartu_discover_id,
    ketertarikan: r.ketertarikan,
    yang_menarik: r.yang_menarik,
    yang_kurang_menarik: r.yang_kurang_menarik,
    dibuat_pada: keIso(r.dibuat_pada),
    diubah_pada: keIso(r.diubah_pada),
  };
}

async function daftarKartu() {
  return (await kartuRepo.daftarDisetujui()).map(bentukKartu);
}

async function daftarRefleksi(penggunaId) {
  return (await refleksiRepo.daftarMilikSendiri(penggunaId)).map(bentukRefleksi);
}

async function simpanRefleksi(penggunaId, kartuId, data) {
  if (!POLA_ID_KARTU.test(kartuId) || !(await kartuRepo.ambilDisetujui(kartuId))) throw kartuBelumTersedia();
  const tersimpan = await refleksiRepo.simpanMilikSendiri({
    id: buatUuid(),
    penggunaId,
    kartuId,
    ketertarikan: data.ketertarikan,
    yangMenarik: data.yang_menarik ?? null,
    yangKurangMenarik: data.yang_kurang_menarik ?? null,
    waktu: sekarangUntukDb(),
  });
  const baris = await refleksiRepo.ambilMilikSendiri(penggunaId, kartuId);
  // Tidak tersimpan dan tidak ada baris: kartu berubah status di antara dua pemeriksaan.
  if (!tersimpan && !baris) throw kartuBelumTersedia();
  return bentukRefleksi(baris);
}

// --- Profil Eksplorasi ----------------------------------------------------------------------

/**
 * Isi satu versi profil: HANYA salinan data siswa sendiri. Fungsi murni, dipakai juga benih-dummy.
 * Tidak ada medan lain, tidak ada skor, kategori, atau label yang dihitung dari jawaban.
 */
function susunIsiProfil({ refleksi, minatRumpun, mapelPilihan, jalurAktif, tujuanAktif }) {
  return {
    refleksi: refleksi.map((r) => ({
      kartu_discover_id: r.kartu_discover_id,
      ketertarikan: r.ketertarikan,
      yang_menarik: r.yang_menarik ?? null,
      yang_kurang_menarik: r.yang_kurang_menarik ?? null,
    })),
    minat_rumpun: [...minatRumpun],
    mapel_pilihan: [...mapelPilihan],
    jalur_minat_id: [...jalurAktif],
    tujuan: tujuanAktif.map((t) => ({ id: t.id, judul: t.judul })),
  };
}

const isiObjek = (isi) => (typeof isi === 'string' ? JSON.parse(isi) : isi);

/**
 * Bentuk untuk siswa. Judul kartu hanya untuk kartu yang masih aktif dan disetujui; refleksi pada
 * kartu lain disembunyikan (dihitung saja), supaya teks draf tidak pernah terkirim. Nama jalur
 * hanya untuk jalur yang disetujui (K37).
 */
function bentukProfil(baris, rujukan) {
  const isi = isiObjek(baris.isi);
  const kartu = (id) => rujukan.kartu.get(id);
  const tampil = isi.refleksi.filter((r) => kartu(r.kartu_discover_id));
  const butir = (r, alasan) => {
    const k = kartu(r.kartu_discover_id);
    return { kartu_discover_id: k.id, judul: k.judul, jenis: k.jenis, ...(alasan === undefined ? {} : { alasan }) };
  };
  return {
    id: baris.id,
    status: baris.status,
    diubah_dari_id: baris.diubah_dari_id,
    catatan: baris.catatan,
    dibuat_pada: keIso(baris.dibuat_pada),
    tertarik: tampil.filter((r) => r.ketertarikan === 'tertarik').map((r) => butir(r, r.yang_menarik)),
    belum_yakin: tampil.filter((r) => r.ketertarikan === 'belum_yakin').map((r) => butir(r)),
    kurang_tertarik: tampil.filter((r) => r.ketertarikan === 'tidak_tertarik').map((r) => butir(r, r.yang_kurang_menarik)),
    refleksi_disembunyikan: isi.refleksi.length - tampil.length,
    minat_rumpun: isi.minat_rumpun,
    mapel_pilihan: isi.mapel_pilihan.map((id) => ({ id, nama: rujukan.mapel.get(id) ?? null })),
    jalur: isi.jalur_minat_id.filter((id) => rujukan.jalur.has(id)).map((id) => ({ id, nama: rujukan.jalur.get(id) })),
    tujuan: isi.tujuan,
  };
}

async function muatRujukan() {
  const [kartu, mapel, jalur] = await Promise.all([kartuRepo.daftarDisetujui(), kontenRepo.ambilMapel(), jalurMinatRepo.daftarDisetujui()]);
  return {
    kartu: new Map(kartu.map((k) => [k.id, k])),
    mapel: new Map(mapel.map((m) => [m.id, m.nama])),
    jalur: new Map(jalur.map((j) => [j.id, j.nama])),
  };
}

async function ambilProfil(penggunaId) {
  const [versi, rujukan] = await Promise.all([profilRepo.daftarMilikSendiri(penggunaId), muatRujukan()]);
  const terkini = versi.find((v) => v.status === 'aktif');
  return { profil: terkini ? bentukProfil(terkini, rujukan) : null, jumlah_versi: versi.length };
}

/** Versi lama ke baru menurut rantai diubah_dari_id, karena dua versi bisa dibuat pada detik yang sama. */
function urutkanRantai(versi) {
  const perId = new Set(versi.map((v) => v.id));
  const anak = new Map(versi.filter((v) => v.diubah_dari_id).map((v) => [v.diubah_dari_id, v]));
  const hasil = [];
  const dilihat = new Set();
  for (const akar of versi.filter((v) => !v.diubah_dari_id || !perId.has(v.diubah_dari_id))) {
    for (let v = akar; v && !dilihat.has(v.id); v = anak.get(v.id)) {
      dilihat.add(v.id);
      hasil.push(v);
    }
  }
  return hasil;
}

async function riwayatProfil(penggunaId) {
  const [versi, rujukan] = await Promise.all([profilRepo.daftarMilikSendiri(penggunaId), muatRujukan()]);
  return urutkanRantai(versi).map((v) => bentukProfil(v, rujukan));
}

/** Data siswa saat ini, untuk satu versi profil. Semua dibaca lewat repositori milik sendiri. */
async function dataSiswaSaatIni(penggunaId) {
  const [refleksi, pengguna, pilihan, tujuan] = await Promise.all([
    refleksiRepo.daftarMilikSendiri(penggunaId),
    penggunaRepo.cariProfil(penggunaId),
    pilihanRepo.daftarMilikSendiri(penggunaId),
    tujuanRepo.daftarMilikSendiri(penggunaId),
  ]);
  return {
    refleksi,
    minatRumpun: larikMinat(pengguna?.minat_rumpun),
    mapelPilihan: larikMinat(pengguna?.mapel_pilihan),
    jalurAktif: pilihan.filter((p) => p.status === 'aktif').map((p) => p.jalur_minat_id),
    tujuanAktif: tujuan.filter((t) => t.status === 'aktif'),
  };
}

/**
 * Versi baru dari jawaban siswa saat ini. `catatan` yang tidak dikirim disalin dari versi
 * sebelumnya, `null` mengosongkan. Tanpa perubahan apa pun: 400.
 */
async function perbaruiProfil(penggunaId, data) {
  const terkini = await profilRepo.ambilTerkiniMilikSendiri(penggunaId);
  const isi = susunIsiProfil(await dataSiswaSaatIni(penggunaId));
  const catatan = data.catatan !== undefined ? data.catatan : terkini?.catatan ?? null;
  // MySQL menyimpan JSON dengan urutan kunci sendiri, jadi dibandingkan isinya, bukan teksnya.
  if (terkini && isDeepStrictEqual(isiObjek(terkini.isi), isi) && (terkini.catatan ?? null) === catatan) {
    throw new GalatApi('VALIDASI_GAGAL', 'Tidak ada perubahan.', { _: 'Tidak ada perubahan.' });
  }
  const id = buatUuid();
  const hasil = await profilRepo.buatVersiMilikSendiri(penggunaId, { id, indukId: terkini?.id ?? null, isi, catatan, waktu: sekarangUntukDb() });
  if (hasil !== 'ok') throw new GalatApi('PROFIL_BUKAN_TERKINI', 'Profilmu baru saja diperbarui. Muat ulang, lalu coba lagi.');
  return (await ambilProfil(penggunaId)).profil;
}

module.exports = {
  daftarKartu,
  daftarRefleksi,
  simpanRefleksi,
  ambilProfil,
  riwayatProfil,
  perbaruiProfil,
  susunIsiProfil,
  bentukProfil,
  dataSiswaSaatIni,
};
