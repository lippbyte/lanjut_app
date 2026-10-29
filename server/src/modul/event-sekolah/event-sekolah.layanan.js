// Aturan Persiapan Event (LANJUT_076, LANJUT_076b). Tidak ada SQL di sini — hanya repositori.
//
// Urutan pemeriksaan setiap permintaan (dijaga rute):
//   1. login (wajibLogin, 401)
//   2. saklar event_sekolah_aktif (403 FITUR_BELUM_AKTIF)
//   3. kebijakan privasi versi berlaku sudah diterima (403 AI_BELUM_DIIZINKAN,
//      gerbang yang sama dengan minat_rumpun LANJUT_075)
//   4. kelas akun 7–9 (403 KELAS_TIDAK_DIDUKUNG, LANJUT_076b) — event milik akun
//      yang kini kelas 10–12 tidak dihapus, hanya tidak bisa dibuka
//   5. isi (skema zod, lalu batas tanggal / mapel / kartu di sini)
//
// Tidak ada log berisi materi_teks, tanggal, atau mapel_id: layanan ini tidak
// mencatat apa pun, dan log akses hanya memuat metode, jalur (id event), status.
// Tidak ada pengambilan apa pun dari internet: materi = kartu di basis data.

const { GalatApi } = require('../../util/respons');
const { buatUuid } = require('../../util/id');
const { KELAS_SMP } = require('../../util/kelas');
const { sekarangUntukDb, keIso, keTanggal } = require('../../util/waktu');
const { hariIniWib, uraiTanggal } = require('../../util/linimasa');
const persetujuanLayanan = require('../persetujuan/persetujuan.layanan');
const repo = require('./event-sekolah.repo');

/** Gerbang: saklar, kebijakan, lalu kelas. Dipanggil sebelum isi permintaan dibaca. */
async function pastikanBoleh(penggunaId) {
  if (!(await repo.saklarAktif())) {
    throw new GalatApi('FITUR_BELUM_AKTIF', 'Fitur ini belum aktif.');
  }
  if (!(await persetujuanLayanan.kebijakanDiterima(penggunaId))) {
    throw new GalatApi('AI_BELUM_DIIZINKAN', 'Terima kebijakan privasi dulu supaya fitur ini bisa dipakai.');
  }
  if (!KELAS_SMP.has(await repo.kelasPengguna(penggunaId))) {
    throw new GalatApi('KELAS_TIDAK_DIDUKUNG', 'Fitur ini hanya untuk kelas 7–9.');
  }
}

/**
 * Kartu yang boleh menjadi materi event (LANJUT_076b §D), satu aturan untuk
 * menyimpan, menampilkan, dan daftar pilihan:
 *   - 'milik'  : kartu Arsip milik akun itu sendiri, belum dihapus;
 *   - 'kurasi' : kartu kurasi tim (tanpa pemilik, sumber 'resmi'), belum dihapus,
 *                terverifikasi (status + tanggal periksa), dengan nama penyedia
 *                dan url_sumber https.
 * Selain itu null (tidak sah / sudah tidak tersedia).
 */
function jenisMateri(k, penggunaId) {
  if (!k || k.dihapus_pada) return null;
  if (k.pemilik_id === penggunaId) return 'milik';
  const kurasiSah =
    k.pemilik_id === null &&
    k.sumber === 'resmi' &&
    k.status_verifikasi === 'terverifikasi' &&
    Boolean(k.diperiksa_pada) &&
    typeof k.url_sumber === 'string' &&
    k.url_sumber.startsWith('https://') &&
    typeof k.penyedia === 'string' &&
    k.penyedia.trim() !== '';
  return kurasiSah ? 'kurasi' : null;
}

/** Keterangan materi di jawaban event. Kartu tidak sah lagi → { tersedia: false }; kartu_id tetap. */
function bentukMateri(kartuId, k, penggunaId) {
  if (!kartuId) return null;
  const jenis = jenisMateri(k, penggunaId);
  if (!jenis) return { tersedia: false };
  if (jenis === 'milik') return { tersedia: true, jenis, judul: k.judul };
  return { tersedia: true, jenis, judul: k.judul, isi: k.isi, sumber_nama: k.penyedia.trim() };
}

/** Tanggal event paling jauh: tanggal yang sama dua tahun sesudah hari ini (WIB). */
function batasTanggal(hariIniMs = hariIniWib()) {
  const d = new Date(hariIniMs);
  return Date.UTC(d.getUTCFullYear() + 2, d.getUTCMonth(), d.getUTCDate());
}

/** Isian yang bergantung pada data: tanggal ≤ batas, mapel ada, kartu sah. */
async function pastikanIsiSah(penggunaId, { tanggal, mapel_id, kartu_id }) {
  if (tanggal !== undefined && uraiTanggal(tanggal) > batasTanggal()) {
    throw new GalatApi('VALIDASI_GAGAL', 'Data yang dikirim tidak valid.', { tanggal: 'Tanggal paling jauh 2 tahun dari hari ini.' });
  }
  if (mapel_id && !(await repo.mapelAda(mapel_id))) {
    throw new GalatApi('VALIDASI_GAGAL', 'Data yang dikirim tidak valid.', { mapel_id: 'Mapel tidak dikenal.' });
  }
  if (kartu_id && !jenisMateri(await repo.ambilKartuUntukEvent(penggunaId, kartu_id), penggunaId)) {
    throw new GalatApi('KARTU_TIDAK_SAH', 'Kartu ini tidak bisa dihubungkan.', { kartu_id: 'bukan kartu milikmu atau kartu kurasi terverifikasi' });
  }
}

function bentukEvent(b, kartu, penggunaId) {
  return {
    id: b.id,
    jenis: b.jenis,
    tanggal: keTanggal(b.tanggal),
    mapel_id: b.mapel_id ?? null,
    materi_teks: b.materi_teks ?? null,
    kartu_id: b.kartu_id ?? null,
    materi: bentukMateri(b.kartu_id, kartu, penggunaId),
    dibuat_pada: keIso(b.dibuat_pada),
    diubah_pada: keIso(b.diubah_pada),
  };
}

const tidakDitemukan = () => new GalatApi('TIDAK_DITEMUKAN', 'Event tidak ditemukan.');

async function satuEvent(penggunaId, eventId) {
  const b = await repo.ambilMilikSendiri(penggunaId, eventId);
  const kartu = b.kartu_id ? await repo.ambilKartuUntukEvent(penggunaId, b.kartu_id) : null;
  return bentukEvent(b, kartu, penggunaId);
}

async function daftar(penggunaId) {
  const baris = await repo.daftarMilikSendiri(penggunaId);
  const ids = [...new Set(baris.map((b) => b.kartu_id).filter(Boolean))];
  const kartu = new Map((await repo.kartuUntukEvent(penggunaId, ids)).map((k) => [k.id, k]));
  return baris.map((b) => bentukEvent(b, kartu.get(b.kartu_id), penggunaId));
}

/** Pilihan kartu materi untuk isian event: hanya kartu yang lolos jenisMateri. */
async function pilihanKartu(penggunaId) {
  const calon = await repo.calonKartuMateri(penggunaId);
  return calon
    .map((k) => ({ k, jenis: jenisMateri(k, penggunaId) }))
    .filter(({ jenis }) => jenis)
    .map(({ k, jenis }) => ({
      id: k.id,
      judul: k.judul,
      mapel_id: k.mapel_id,
      jenis,
      sumber_nama: jenis === 'kurasi' ? k.penyedia.trim() : null,
    }));
}

async function buat(penggunaId, isi) {
  await pastikanIsiSah(penggunaId, isi);
  const id = buatUuid();
  await repo.buat({
    id,
    penggunaId,
    jenis: isi.jenis,
    tanggal: isi.tanggal,
    mapelId: isi.mapel_id ?? null,
    materiTeks: isi.materi_teks ?? null,
    kartuId: isi.kartu_id ?? null,
    waktu: sekarangUntukDb(),
  });
  return satuEvent(penggunaId, id);
}

async function ubah(penggunaId, eventId, isi) {
  // Milik akun lain = 404 yang sama dengan id yang tidak ada, sebelum isi diperiksa.
  if (!(await repo.ambilMilikSendiri(penggunaId, eventId))) throw tidakDitemukan();
  await pastikanIsiSah(penggunaId, isi);
  const berubah = await repo.ubahMilikSendiri(
    penggunaId,
    eventId,
    { jenis: isi.jenis, tanggal: isi.tanggal, mapelId: isi.mapel_id, materiTeks: isi.materi_teks, kartuId: isi.kartu_id },
    sekarangUntukDb()
  );
  if (!berubah) throw tidakDitemukan();
  return satuEvent(penggunaId, eventId);
}

async function hapus(penggunaId, eventId) {
  if (!(await repo.hapusMilikSendiri(penggunaId, eventId))) throw tidakDitemukan();
}

module.exports = { pastikanBoleh, jenisMateri, batasTanggal, daftar, pilihanKartu, buat, ubah, hapus };
