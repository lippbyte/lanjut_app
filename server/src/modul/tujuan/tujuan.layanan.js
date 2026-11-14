// Aturan Tujuan Saya (LANJUT_023 seri v2).
// - Memperbarui tujuan selalu membuat versi baru (`diubah_dari_id`), versi lama menjadi `diubah`
//   dan tetap tersimpan. Isi tujuan tidak pernah ditimpa.
// - `pengguna.prodi_tujuan` (medan API `prodi_impian`) tidak dipindah. Ia ditampilkan sebagai
//   salah satu tujuan, dengan sumber Data Akun, dan hanya bisa diubah dari Data Akun.
// - Perjalanan: babak jalur dan versi tujuan disusun menurut waktu.
// Semua akses data lewat repositori, yang memeriksa pemilik di dalam SQL.

const { GalatApi } = require('../../util/respons');
const { buatUuid } = require('../../util/id');
const { sekarangUntukDb, keIso } = require('../../util/waktu');
const tujuanRepo = require('./tujuan.repo');
const pilihanRepo = require('../jalur-minat/pengguna-jalur-minat.repo');
const butirRepo = require('../butir-bukti/butir-bukti.repo');
const penggunaRepo = require('../pengguna/pengguna.repo');
const kontenRepo = require('../konten/konten.repo');
const { pastikanJalurTersedia } = require('../jalur-minat/jalur-minat.layanan');

const tujuanTidakAda = () => new GalatApi('TIDAK_DITEMUKAN', 'Tujuan tidak ditemukan.');
const bukanTerkini = () =>
  new GalatApi('TUJUAN_BUKAN_TERKINI', 'Tujuan ini sudah diperbarui atau sudah berakhir. Buka versi terbarunya.');

const tanggal = (nilai) => (nilai instanceof Date ? nilai.toISOString().slice(0, 10) : nilai ?? null);

function bentukTujuan(t) {
  return {
    id: t.id,
    jalur_minat_id: t.jalur_minat_id,
    judul: t.judul,
    uraian: t.uraian,
    target_pada: tanggal(t.target_pada),
    status: t.status,
    diubah_dari_id: t.diubah_dari_id,
    dibuat_pada: keIso(t.dibuat_pada),
    diubah_pada: keIso(t.diubah_pada),
  };
}

/** Semua versi satu tujuan, lama ke baru. `semua` hanya berisi tujuan milik akun ini. */
function rantaiVersi(semua, id) {
  const perId = new Map(semua.map((t) => [t.id, t]));
  const turunan = new Map(semua.filter((t) => t.diubah_dari_id).map((t) => [t.diubah_dari_id, t]));
  const dilihat = new Set();
  let awal = perId.get(id);
  while (awal && awal.diubah_dari_id && perId.has(awal.diubah_dari_id) && !dilihat.has(awal.id)) {
    dilihat.add(awal.id);
    awal = perId.get(awal.diubah_dari_id);
  }
  const rantai = [];
  dilihat.clear();
  for (let t = awal; t && !dilihat.has(t.id); t = turunan.get(t.id)) {
    dilihat.add(t.id);
    rantai.push(t);
  }
  return rantai;
}

async function prodiImpian(penggunaId) {
  const profil = await penggunaRepo.cariProfil(penggunaId);
  if (!profil || !profil.prodi_tujuan) return null;
  const prodi = (await kontenRepo.ambilProdi()).find((p) => p.id === profil.prodi_tujuan);
  return { prodi_id: profil.prodi_tujuan, nama: prodi ? prodi.nama : null, sumber: 'data_akun' };
}

/** Tujuan terkini (semua kecuali versi lama), dan prodi impian dari Data Akun. */
async function daftar(penggunaId) {
  const semua = await tujuanRepo.daftarMilikSendiri(penggunaId);
  const tujuan = semua
    .filter((t) => t.status !== 'diubah')
    .map((t) => ({ ...bentukTujuan(t), jumlah_versi: rantaiVersi(semua, t.id).length }));
  return { tujuan, prodi_impian: await prodiImpian(penggunaId) };
}

async function buat(penggunaId, data) {
  await pastikanJalurTersedia(data.jalur_minat_id);
  const id = buatUuid();
  await tujuanRepo.buat({
    id,
    penggunaId,
    jalurMinatId: data.jalur_minat_id ?? null,
    judul: data.judul,
    uraian: data.uraian ?? null,
    targetPada: data.target_pada ?? null,
    waktu: sekarangUntukDb(),
  });
  return bentukTujuan(await tujuanRepo.ambilMilikSendiri(penggunaId, id));
}

/** Versi baru dari tujuan terkini. Medan yang tidak dikirim disalin dari versi sebelumnya. */
async function perbarui(penggunaId, id, data) {
  const lama = await tujuanRepo.ambilMilikSendiri(penggunaId, id);
  if (!lama) throw tujuanTidakAda();
  if (lama.status !== 'aktif') throw bukanTerkini();
  await pastikanJalurTersedia(data.jalur_minat_id);
  const pilih = (medan, kolom) => (data[medan] !== undefined ? data[medan] : kolom);
  const baru = {
    judul: pilih('judul', lama.judul),
    uraian: pilih('uraian', lama.uraian),
    targetPada: pilih('target_pada', tanggal(lama.target_pada)),
    jalurMinatId: pilih('jalur_minat_id', lama.jalur_minat_id),
  };
  if (
    baru.judul === lama.judul &&
    baru.uraian === lama.uraian &&
    baru.targetPada === tanggal(lama.target_pada) &&
    baru.jalurMinatId === lama.jalur_minat_id
  ) {
    throw new GalatApi('VALIDASI_GAGAL', 'Tidak ada perubahan.', { _: 'Tidak ada perubahan.' });
  }
  const idBaru = buatUuid();
  const hasil = await tujuanRepo.buatVersiMilikSendiri(penggunaId, id, { id: idBaru, ...baru, waktu: sekarangUntukDb() });
  if (hasil === 'tidak_ada') throw tujuanTidakAda();
  if (hasil === 'bukan_terkini') throw bukanTerkini();
  return bentukTujuan(await tujuanRepo.ambilMilikSendiri(penggunaId, idBaru));
}

async function akhiri(penggunaId, id, { status }) {
  if (!(await tujuanRepo.ambilMilikSendiri(penggunaId, id))) throw tujuanTidakAda();
  if (!(await tujuanRepo.akhiriMilikSendiri(penggunaId, id, status, sekarangUntukDb()))) throw bukanTerkini();
  return bentukTujuan(await tujuanRepo.ambilMilikSendiri(penggunaId, id));
}

async function riwayat(penggunaId, id) {
  const semua = await tujuanRepo.daftarMilikSendiri(penggunaId);
  if (!semua.some((t) => t.id === id)) throw tujuanTidakAda();
  return rantaiVersi(semua, id).map(bentukTujuan);
}

/** Menautkan butir bukti milik sendiri ke jalur dan/atau tujuan milik sendiri. */
async function tautkanBukti(penggunaId, butirId, data) {
  if (!(await butirRepo.ambilMilikSendiri(penggunaId, butirId))) throw new GalatApi('TIDAK_DITEMUKAN', 'Butir tidak ditemukan.');
  await pastikanJalurTersedia(data.jalur_minat_id);
  const galatTujuan = () => new GalatApi('VALIDASI_GAGAL', 'Tujuan tidak ditemukan.', { tujuan_id: 'tidak ditemukan' });
  if (data.tujuan_id && !(await tujuanRepo.ambilMilikSendiri(penggunaId, data.tujuan_id))) throw galatTujuan();
  const berhasil = await butirRepo.ubahKaitanMilikSendiri(penggunaId, butirId, {
    jalurMinatId: data.jalur_minat_id,
    tujuanId: data.tujuan_id,
    waktu: sekarangUntukDb(),
  });
  if (!berhasil) throw galatTujuan();
  const b = await butirRepo.ambilMilikSendiri(penggunaId, butirId);
  return { id: b.id, jalur_minat_id: b.jalur_minat_id, tujuan_id: b.tujuan_id };
}

/** Peristiwa jalur dan tujuan, lama ke baru. Hanya membaca data akun ini. */
async function perjalanan(penggunaId) {
  const [pilihan, semuaTujuan] = await Promise.all([
    pilihanRepo.daftarMilikSendiri(penggunaId),
    tujuanRepo.daftarMilikSendiri(penggunaId),
  ]);
  const peristiwa = [];
  for (const p of pilihan) {
    peristiwa.push({ jenis: 'jalur_dipilih', pada: keIso(p.mulai_pada), jalur_minat_id: p.jalur_minat_id, pilihan_id: p.id });
    if (p.status !== 'aktif') {
      peristiwa.push({ jenis: `jalur_${p.status}`, pada: keIso(p.berakhir_pada ?? p.diubah_pada), jalur_minat_id: p.jalur_minat_id, pilihan_id: p.id });
    }
  }
  // Per rantai versi, supaya versi baru selalu sesudah induknya walau dibuat pada detik yang sama.
  const perId = new Set(semuaTujuan.map((t) => t.id));
  const akar = semuaTujuan.filter((t) => !t.diubah_dari_id || !perId.has(t.diubah_dari_id));
  for (const t of akar.flatMap((a) => rantaiVersi(semuaTujuan, a.id))) {
    const dasar = { jalur_minat_id: t.jalur_minat_id, tujuan_id: t.id, judul: t.judul };
    peristiwa.push({ jenis: t.diubah_dari_id ? 'tujuan_diperbarui' : 'tujuan_dibuat', pada: keIso(t.dibuat_pada), ...dasar });
    if (t.status === 'tercapai' || t.status === 'ditinggalkan') {
      peristiwa.push({ jenis: `tujuan_${t.status}`, pada: keIso(t.diubah_pada), ...dasar });
    }
  }
  // Urutan stabil: peristiwa dengan waktu sama tetap dalam urutan dicatat.
  return peristiwa.map((p, i) => [p, i]).sort((a, b) => a[0].pada.localeCompare(b[0].pada) || a[1] - b[1]).map(([p]) => p);
}

module.exports = { daftar, buat, perbarui, akhiri, riwayat, tautkanBukti, perjalanan, rantaiVersi };
