// Repositori hapus akun dan ekspor data (LANJUT_009 seri v2). SQL untuk dua aliran itu saja.
// Setiap query atas tabel pribadi memfilter pemilik. Query statis, nilai lewat placeholder `?`.

const pool = require('../../db/koneksi');

async function ambilUntukKonfirmasi(penggunaId) {
  const [baris] = await pool.execute(
    'SELECT id, nama_pengguna, email, email_terverifikasi, kata_sandi_hash FROM pengguna WHERE id = ? LIMIT 1',
    [penggunaId]
  );
  return baris[0] || null;
}

/**
 * Satu transaksi. Tabel yang tidak terikat foreign key dihapus eksplisit, lalu baris pengguna
 * dihapus, dan semua tabel miliknya ikut lewat ON DELETE CASCADE. `dihapus` false bila akunnya
 * sudah tidak ada. `adaModul` menandai perlunya perapian indeks FULLTEXT.
 */
async function hapusAkunDalamTransaksi(penggunaId, { namaPengguna, emailHash }) {
  const koneksi = await pool.getConnection();
  try {
    await koneksi.beginTransaction();
    const [kunci] = await koneksi.execute('SELECT id FROM pengguna WHERE id = ? FOR UPDATE', [penggunaId]);
    if (kunci.length === 0) {
      await koneksi.rollback();
      return { dihapus: false, adaModul: false };
    }
    const [[{ jumlah }]] = await koneksi.execute('SELECT COUNT(*) AS jumlah FROM modul WHERE pengguna_id = ?', [penggunaId]);

    await koneksi.execute('DELETE FROM percobaan_masuk WHERE nama_pengguna = ?', [namaPengguna]);
    if (emailHash) {
      await koneksi.execute('DELETE FROM kode_otp_email WHERE email_hash = ?', [emailHash]);
      await koneksi.execute('DELETE FROM pendaftaran_tertunda WHERE email_hash = ?', [emailHash]);
    }
    const [hasil] = await koneksi.execute('DELETE FROM pengguna WHERE id = ?', [penggunaId]);

    await koneksi.commit();
    return { dihapus: hasil.affectedRows === 1, adaModul: jumlah > 0 };
  } catch (galat) {
    await koneksi.rollback();
    throw galat;
  } finally {
    koneksi.release();
  }
}

/** Daftar kolom ditulis satu per satu supaya kolom rahasia baru tidak ikut terbawa. */
async function profilUntukEkspor(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT id, nama_pengguna, nama_tampilan, email, email_terverifikasi, batas_verifikasi,
            wajib_buat_sandi, peran, status, kelas, jenis_sekolah, prodi_tujuan, gaya_belajar,
            minat_rumpun, mapel_pilihan, kesiapan_ujian, dibuat_pada, terakhir_masuk_pada,
            disetel_ulang_pada
       FROM pengguna
      WHERE id = ?
      LIMIT 1`,
    [penggunaId]
  );
  return baris[0] || null;
}

async function percobaanMasukUntukEkspor(namaPengguna) {
  const [baris] = await pool.execute(
    'SELECT jumlah_gagal, terkunci_sampai, terakhir_gagal_pada FROM percobaan_masuk WHERE nama_pengguna = ? LIMIT 1',
    [namaPengguna]
  );
  return baris[0] || null;
}

/** `batas` membatasi baris per tabel, supaya data yang kelewat besar tidak dimuat seluruhnya. */
async function barisUntukEkspor(penggunaId, batas) {
  const ambil = (sql) => pool.query(sql, [penggunaId, batas]).then(([baris]) => baris);
  const [sesi_pengguna, kemajuan, butir_pribadi, kartu, sesi_latihan, riwayat_latihan, persetujuan, modul, event_sekolah] =
    await Promise.all([
      ambil(`SELECT dibuat_pada, kedaluwarsa_pada, terakhir_dipakai_pada, dicabut_pada, perangkat
               FROM sesi_pengguna WHERE pengguna_id = ? ORDER BY dibuat_pada LIMIT ?`),
      ambil('SELECT butir_id, selesai_pada FROM kemajuan WHERE pengguna_id = ? ORDER BY butir_id LIMIT ?'),
      ambil(`SELECT id, jenis, prodi_id, judul, selesai_pada, dibuat_pada, diubah_pada, dihapus_pada
               FROM butir_pribadi WHERE pengguna_id = ? ORDER BY dibuat_pada, id LIMIT ?`),
      ambil(`SELECT id, mapel_id, judul, isi, jawaban, sumber, dibuat_pada, diubah_pada, dihapus_pada
               FROM kartu WHERE pemilik_id = ? ORDER BY dibuat_pada, id LIMIT ?`),
      ambil(`SELECT id, dimulai_pada, selesai_pada, jumlah_kartu_direncanakan, mapel_fokus_id, asal_mula
               FROM sesi_latihan WHERE pengguna_id = ? ORDER BY dimulai_pada, id LIMIT ?`),
      ambil(`SELECT id, kartu_id, benar, dijawab_pada, sesi_id, keyakinan, mapel_id, gap_numerik, kelas_gap, aturan_versi
               FROM riwayat_latihan WHERE pengguna_id = ? ORDER BY dijawab_pada, id LIMIT ?`),
      ambil(`SELECT id, jenis, versi, status, sumber, catatan, dicatat_pada
               FROM persetujuan WHERE pengguna_id = ? ORDER BY dicatat_pada, id LIMIT ?`),
      ambil(`SELECT id, mapel_id, judul, isi, jumlah_karakter, jenis, nama_berkas, diunggah_pada
               FROM modul WHERE pengguna_id = ? ORDER BY diunggah_pada, id LIMIT ?`),
      ambil(`SELECT id, jenis, tanggal, mapel_id, materi_teks, kartu_id, dibuat_pada, diubah_pada
               FROM event_sekolah WHERE pengguna_id = ? ORDER BY tanggal, id LIMIT ?`),
    ]);
  return { sesi_pengguna, kemajuan, butir_pribadi, kartu, sesi_latihan, riwayat_latihan, persetujuan, modul, event_sekolah };
}

module.exports = {
  ambilUntukKonfirmasi,
  hapusAkunDalamTransaksi,
  profilUntukEkspor,
  percobaanMasukUntukEkspor,
  barisUntukEkspor,
};
