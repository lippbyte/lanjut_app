// Repositori tabel `kode_otp_email` (LANJUT_083). SATU-SATUNYA tempat SQL untuk tabel ini.
// Tabel ini tidak memuat pengguna_id: barisnya dicari lewat email_hash, sebelum
// ada sesi (sama seperti percobaan_masuk yang dicari lewat nama_pengguna).

const pool = require('../../db/koneksi');

// LANJUT_083c: kolom `tujuan` ('masuk' | 'daftar' | 'verifikasi') memisahkan kode masuk, kode
// daftar, dan kode verifikasi email akun, termasuk batas kirimnya.

/** Jumlah kode untuk email & tujuan ini sejak `sejak` (batas kirim). */
async function hitungKirimSejak(emailHash, tujuan, sejak) {
  const [baris] = await pool.execute(
    'SELECT COUNT(*) AS jumlah FROM kode_otp_email WHERE email_hash = ? AND tujuan = ? AND dibuat_pada > ?',
    [emailHash, tujuan, sejak]
  );
  return Number(baris[0].jumlah);
}

/** Kode aktif dengan tujuan yang sama ditutup — hanya kode terbaru yang berlaku. */
async function tutupKodeAktif(emailHash, tujuan, waktu) {
  await pool.execute(
    'UPDATE kode_otp_email SET selesai_pada = ? WHERE email_hash = ? AND tujuan = ? AND selesai_pada IS NULL',
    [waktu, emailHash, tujuan]
  );
}

async function simpanKode({ id, emailHash, tujuan, kodeHash, dibuatPada, kedaluwarsaPada }) {
  await pool.execute(
    `INSERT INTO kode_otp_email (id, email_hash, tujuan, kode_hash, dibuat_pada, kedaluwarsa_pada)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, emailHash, tujuan, kodeHash, dibuatPada, kedaluwarsaPada]
  );
}

async function ambilKodeAktif(emailHash, tujuan) {
  const [baris] = await pool.execute(
    `SELECT id, kode_hash, kedaluwarsa_pada, jumlah_percobaan
       FROM kode_otp_email
      WHERE email_hash = ? AND tujuan = ? AND selesai_pada IS NULL
      ORDER BY dibuat_pada DESC
      LIMIT 1`,
    [emailHash, tujuan]
  );
  return baris[0] || null;
}

/**
 * Catat satu percobaan SEBELUM kode dibandingkan. Atomik: percobaan yang sudah
 * mencapai `maks` tidak dapat giliran lagi (mengembalikan false), juga saat
 * beberapa permintaan datang bersamaan.
 */
async function pakaiPercobaan(id, maks) {
  const [hasil] = await pool.execute(
    `UPDATE kode_otp_email
        SET jumlah_percobaan = jumlah_percobaan + 1
      WHERE id = ? AND selesai_pada IS NULL AND jumlah_percobaan < ?`,
    [id, maks]
  );
  return hasil.affectedRows > 0;
}

/** Kode yang percobaannya sudah habis dinyatakan hangus. */
async function hanguskanBilaHabis(id, maks, waktu) {
  await pool.execute(
    `UPDATE kode_otp_email
        SET selesai_pada = ?
      WHERE id = ? AND selesai_pada IS NULL AND jumlah_percobaan >= ?`,
    [waktu, id, maks]
  );
}

/** Tandai kode terpakai. False bila sudah dipakai/hangus lebih dulu (permintaan bersamaan). */
async function tandaiDipakai(id, waktu) {
  const [hasil] = await pool.execute(
    'UPDATE kode_otp_email SET selesai_pada = ? WHERE id = ? AND selesai_pada IS NULL',
    [waktu, id]
  );
  return hasil.affectedRows > 0;
}

/** Bersih-bersih baris lama (tidak dibutuhkan lagi untuk batas kirim). */
async function hapusSebelum(waktu) {
  await pool.execute('DELETE FROM kode_otp_email WHERE dibuat_pada < ?', [waktu]);
}

module.exports = {
  hitungKirimSejak,
  tutupKodeAktif,
  simpanKode,
  ambilKodeAktif,
  pakaiPercobaan,
  hanguskanBilaHabis,
  tandaiDipakai,
  hapusSebelum,
};
