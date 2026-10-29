// Repositori `event_sekolah` (LANJUT_076). SATU-SATUNYA tempat SQL untuk tabel
// ini. Setiap query atas event WAJIB memfilter pengguna_id (§8.4): event akun
// lain menghasilkan "tidak ditemukan", bukan kebocoran. Query statis, nilai
// lewat placeholder `?` (§2.2 aturan 2).

const pool = require('../../db/koneksi');

/** Saklar fitur; baris tidak ada / nilai selain '1' = mati (gagal-tertutup). */
async function saklarAktif() {
  const [baris] = await pool.execute(
    "SELECT nilai FROM konfigurasi_levelin WHERE kunci = 'event_sekolah_aktif' LIMIT 1"
  );
  return Boolean(baris[0]) && String(baris[0].nilai).trim() === '1';
}

async function daftarMilikSendiri(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT id, jenis, tanggal, mapel_id, materi_teks, kartu_id, dibuat_pada, diubah_pada
       FROM event_sekolah
      WHERE pengguna_id = ?
      ORDER BY tanggal ASC, dibuat_pada ASC, id ASC`,
    [penggunaId]
  );
  return baris;
}

async function ambilMilikSendiri(penggunaId, eventId) {
  const [baris] = await pool.execute(
    `SELECT id, jenis, tanggal, mapel_id, materi_teks, kartu_id, dibuat_pada, diubah_pada
       FROM event_sekolah
      WHERE id = ? AND pengguna_id = ?
      LIMIT 1`,
    [eventId, penggunaId]
  );
  return baris[0] || null;
}

async function mapelAda(mapelId) {
  const [baris] = await pool.execute('SELECT id FROM mapel WHERE id = ? LIMIT 1', [mapelId]);
  return baris.length > 0;
}

/** Kelas akun saat ini (LANJUT_076b: fitur hanya kelas 7–9); null bila belum diisi. */
async function kelasPengguna(penggunaId) {
  const [baris] = await pool.execute('SELECT kelas FROM pengguna WHERE id = ? LIMIT 1', [penggunaId]);
  return baris[0] ? baris[0].kelas : null;
}

// Materi event (LANJUT_076b): kolom yang dibutuhkan aturan jenisMateri di
// event-sekolah.layanan.js. Baris milik akun LAIN tidak pernah terbaca: hanya
// milik sendiri atau tanpa pemilik (kurasi tim). Keputusan sah/tidaknya di layanan.

/** Satu baris untuk diperiksa sebelum dihubungkan ke event. */
async function ambilKartuUntukEvent(penggunaId, kartuId) {
  const [baris] = await pool.execute(
    `SELECT id, pemilik_id, mapel_id, judul, isi, sumber, penyedia, status_verifikasi,
            diperiksa_pada, url_sumber, dihapus_pada
       FROM kartu
      WHERE id = ? AND (pemilik_id = ? OR pemilik_id IS NULL)
      LIMIT 1`,
    [kartuId, penggunaId]
  );
  return baris[0] || null;
}

/** Materi yang terhubung ke event-event akun ini (untuk keterangan di daftar). */
async function kartuUntukEvent(penggunaId, kartuIds) {
  if (!kartuIds.length) return [];
  const [baris] = await pool.query(
    `SELECT id, pemilik_id, mapel_id, judul, isi, sumber, penyedia, status_verifikasi,
            diperiksa_pada, url_sumber, dihapus_pada
       FROM kartu
      WHERE id IN (?) AND (pemilik_id = ? OR pemilik_id IS NULL)`,
    [kartuIds, penggunaId]
  );
  return baris;
}

/** Calon pilihan materi: milik sendiri + kurasi tim yang belum dihapus (disaring lagi di layanan). */
async function calonKartuMateri(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT id, pemilik_id, mapel_id, judul, isi, sumber, penyedia, status_verifikasi,
            diperiksa_pada, url_sumber, dihapus_pada
       FROM kartu
      WHERE dihapus_pada IS NULL
        AND (pemilik_id = ? OR (pemilik_id IS NULL AND sumber = 'resmi'))
      ORDER BY pemilik_id IS NULL, dibuat_pada DESC, id ASC`,
    [penggunaId]
  );
  return baris;
}

async function buat({ id, penggunaId, jenis, tanggal, mapelId, materiTeks, kartuId, waktu }) {
  await pool.execute(
    `INSERT INTO event_sekolah
       (id, pengguna_id, jenis, tanggal, mapel_id, materi_teks, kartu_id, dibuat_pada, diubah_pada)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, penggunaId, jenis, tanggal, mapelId, materiTeks, kartuId, waktu, waktu]
  );
}

/**
 * Ubah sebagian isian event milik sendiri. Medan `undefined` = tidak diubah
 * (flag CASE WHEN, pola pengguna.repo.js). Mengembalikan false bila event tidak
 * ada atau milik akun lain.
 */
async function ubahMilikSendiri(penggunaId, eventId, { jenis, tanggal, mapelId, materiTeks, kartuId }, waktu) {
  const [hasil] = await pool.execute(
    `UPDATE event_sekolah
        SET jenis = CASE WHEN ? THEN ? ELSE jenis END,
            tanggal = CASE WHEN ? THEN ? ELSE tanggal END,
            mapel_id = CASE WHEN ? THEN ? ELSE mapel_id END,
            materi_teks = CASE WHEN ? THEN ? ELSE materi_teks END,
            kartu_id = CASE WHEN ? THEN ? ELSE kartu_id END,
            diubah_pada = ?
      WHERE id = ? AND pengguna_id = ?`,
    [
      jenis !== undefined, jenis ?? null,
      tanggal !== undefined, tanggal ?? null,
      mapelId !== undefined, mapelId ?? null,
      materiTeks !== undefined, materiTeks ?? null,
      kartuId !== undefined, kartuId ?? null,
      waktu,
      eventId, penggunaId,
    ]
  );
  return hasil.affectedRows > 0;
}

/** Hapus PERMANEN (baris dihapus, bukan hapus lunak). */
async function hapusMilikSendiri(penggunaId, eventId) {
  const [hasil] = await pool.execute('DELETE FROM event_sekolah WHERE id = ? AND pengguna_id = ?', [eventId, penggunaId]);
  return hasil.affectedRows > 0;
}

module.exports = {
  saklarAktif,
  daftarMilikSendiri,
  ambilMilikSendiri,
  mapelAda,
  kelasPengguna,
  ambilKartuUntukEvent,
  kartuUntukEvent,
  calonKartuMateri,
  buat,
  ubahMilikSendiri,
  hapusMilikSendiri,
};
