// Repositori tabel `pendaftaran_tertunda` (LANJUT_083c). SATU-SATUNYA tempat SQL untuk tabel ini.
// Dicari lewat email_hash, sebelum akun ada (sama seperti kode_otp_email).

const pool = require('../../db/koneksi');

async function simpan(d) {
  await pool.execute(
    `INSERT INTO pendaftaran_tertunda
       (id, email_hash, nama_pengguna, nama_tampilan, kata_sandi_hash, kelas, jenis_sekolah,
        prodi_tujuan, versi_kebijakan, dibuat_pada, kedaluwarsa_pada)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      d.id,
      d.emailHash,
      d.namaPengguna,
      d.namaTampilan || null,
      d.kataSandiHash,
      d.kelas || null,
      d.jenisSekolah || null,
      d.prodiTujuan || null,
      d.versiKebijakan ?? null,
      d.dibuatPada,
      d.kedaluwarsaPada,
    ]
  );
}

/** Pendaftaran terbaru untuk email ini yang belum lewat 30 menit. */
async function ambilTerbaru(emailHash, sekarang) {
  const [baris] = await pool.execute(
    `SELECT id, nama_pengguna, nama_tampilan, kata_sandi_hash, kelas, jenis_sekolah,
            prodi_tujuan, versi_kebijakan
       FROM pendaftaran_tertunda
      WHERE email_hash = ? AND kedaluwarsa_pada > ?
      ORDER BY dibuat_pada DESC
      LIMIT 1`,
    [emailHash, sekarang]
  );
  return baris[0] || null;
}

/** Semua pendaftaran untuk email ini: dipanggil saat akun dibuat dan saat pendaftaran diganti. */
async function hapusUntukEmail(emailHash) {
  await pool.execute('DELETE FROM pendaftaran_tertunda WHERE email_hash = ?', [emailHash]);
}

/** Pendaftaran yang sudah lewat 30 menit. Mengembalikan jumlah baris yang dihapus. */
async function hapusKedaluwarsa(sekarang) {
  const [hasil] = await pool.execute('DELETE FROM pendaftaran_tertunda WHERE kedaluwarsa_pada <= ?', [sekarang]);
  return hasil.affectedRows;
}

module.exports = { simpan, ambilTerbaru, hapusUntukEmail, hapusKedaluwarsa };
