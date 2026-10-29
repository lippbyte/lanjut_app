// Repositori `kartu` (F6 Arsip Belajar). SATU-SATUNYA tempat SQL untuk tabel
// ini. Setiap query atas kartu milik pengguna WAJIB memfilter pemilik_id
// (B-K4, §8.4) — kelalaian menghasilkan "tidak ditemukan", bukan kebocoran.
//
// Seluruh query di sini STATIS (tidak ada `${...}` yang dirakit dari kondisi
// opsional, §2.2 aturan 2) — filter opsional ditulis sebagai
// `(? IS NULL OR kolom = ?)` dan kolom yang diubah sebagian ditulis sebagai
// `CASE WHEN ? THEN ? ELSE kolom END`, keduanya lewat placeholder `?` biasa.

const pool = require('../../db/koneksi');

/**
 * Kartu resmi TERVERIFIKASI + kartu milik sendiri. TIDAK PERNAH kartu
 * pengguna lain (§4.5), dan TIDAK PERNAH kartu kurasi yang belum dicek tim
 * konten (LANJUT_040) — aman tanpa parameter apa pun. Syarat terverifikasi
 * sama dengan konten lain (mis. F10 profil_prodi): status 'terverifikasi'
 * DAN diperiksa_pada terisi. `?sumber=` hanya menyaring lebih lanjut.
 */
async function daftarUntukPengguna(penggunaId, { mapelId, sumber }) {
  const [baris] = await pool.execute(
    `SELECT id, pemilik_id, mapel_id, judul, isi, jawaban, sumber, penyedia,
            dibuat_pada, diubah_pada
       FROM kartu
      WHERE dihapus_pada IS NULL
        AND ((sumber = 'resmi' AND status_verifikasi = 'terverifikasi' AND diperiksa_pada IS NOT NULL)
             OR pemilik_id = ?)
        AND (? IS NULL OR mapel_id = ?)
        AND (? IS NULL OR sumber = ?)
      ORDER BY dibuat_pada DESC`,
    [penggunaId, mapelId || null, mapelId || null, sumber || null, sumber || null]
  );
  return baris;
}

/**
 * Dipakai saat pengguna menjawab kartu (POST /riwayat-latihan, LANJUT_041) —
 * kartu milik sendiri ATAU kartu resmi yang terverifikasi penuh (syarat yang
 * sama dengan daftarUntukPengguna sejak LANJUT_040).
 */
async function ambilUntukDijawab(penggunaId, kartuId) {
  const [baris] = await pool.execute(
    `SELECT id, mapel_id, sumber, pemilik_id
       FROM kartu
      WHERE id = ? AND dihapus_pada IS NULL
        AND ((sumber = 'resmi' AND status_verifikasi = 'terverifikasi' AND diperiksa_pada IS NOT NULL)
             OR pemilik_id = ?)
      LIMIT 1`,
    [kartuId, penggunaId]
  );
  return baris[0] || null;
}

async function ambilMilikSendiri(penggunaId, kartuId) {
  const [baris] = await pool.execute(
    `SELECT id, pemilik_id, mapel_id, judul, isi, jawaban, sumber, penyedia,
            dibuat_pada, diubah_pada
       FROM kartu
      WHERE id = ? AND pemilik_id = ? AND dihapus_pada IS NULL
      LIMIT 1`,
    [kartuId, penggunaId]
  );
  return baris[0] || null;
}

async function mapelAda(mapelId) {
  const [baris] = await pool.execute('SELECT id FROM mapel WHERE id = ? LIMIT 1', [mapelId]);
  return baris.length > 0;
}

async function buatKartu({ id, pemilikId, mapelId, judul, isi, jawaban, waktu }) {
  await pool.execute(
    `INSERT INTO kartu
       (id, pemilik_id, mapel_id, judul, isi, jawaban, sumber, pemilik,
        status_verifikasi, asal, dibuat_pada, diubah_pada)
     VALUES (?, ?, ?, ?, ?, ?, 'pengguna', 'pengguna', 'belum_diverifikasi', 'pengguna', ?, ?)`,
    [id, pemilikId, mapelId, judul, isi, jawaban || null, waktu, waktu]
  );
}

/**
 * WHERE id = ? AND pemilik_id = ? (§4.5) — mengembalikan jumlah baris terdampak.
 * `mapel_id`/`judul`/`isi`/`jawaban` bernilai `undefined` berarti "jangan diubah" — dibedakan
 * dari `null` (yang untuk `jawaban` berarti "kosongkan") lewat flag CASE WHEN.
 */
async function perbaruiMilikSendiri(penggunaId, kartuId, { mapel_id, judul, isi, jawaban, waktu }) {
  const ubahMapel = mapel_id !== undefined;
  const ubahJudul = judul !== undefined;
  const ubahIsi = isi !== undefined;
  const ubahJawaban = jawaban !== undefined;

  const [hasil] = await pool.execute(
    `UPDATE kartu
        SET mapel_id = CASE WHEN ? THEN ? ELSE mapel_id END,
            judul = CASE WHEN ? THEN ? ELSE judul END,
            isi = CASE WHEN ? THEN ? ELSE isi END,
            jawaban = CASE WHEN ? THEN ? ELSE jawaban END,
            diubah_pada = ?
      WHERE id = ? AND pemilik_id = ? AND dihapus_pada IS NULL`,
    [
      ubahMapel, mapel_id || null,
      ubahJudul, judul || null,
      ubahIsi, isi || null,
      ubahJawaban, jawaban === undefined ? null : jawaban,
      waktu,
      kartuId,
      penggunaId,
    ]
  );
  return hasil.affectedRows > 0;
}

/** Hapus lunak. WHERE id = ? AND pemilik_id = ? (§4.5, §8.4). */
async function hapusLunakMilikSendiri(penggunaId, kartuId, waktu) {
  const [hasil] = await pool.execute(
    `UPDATE kartu SET dihapus_pada = ?, diubah_pada = ?
      WHERE id = ? AND pemilik_id = ? AND dihapus_pada IS NULL`,
    [waktu, waktu, kartuId, penggunaId]
  );
  return hasil.affectedRows > 0;
}

module.exports = {
  daftarUntukPengguna,
  ambilUntukDijawab,
  ambilMilikSendiri,
  mapelAda,
  buatKartu,
  perbaruiMilikSendiri,
  hapusLunakMilikSendiri,
};
