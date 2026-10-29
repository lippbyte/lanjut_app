// Nilai `pengguna.kelas` yang sah (migrasi 010, LANJUT_035): SMP 7–9 dan
// SMA/SMK 10–12. Satu daftar untuk semua skema zod (daftar, ubah profil,
// klaim sinkron) supaya tidak ada yang tertinggal saat daftar ini berubah.
// Harus sama dengan ENUM di 010_kelas_smp.sql dan `KELAS_OPSI` di
// LANJUT_App/lib/jenjang.ts.

const { GalatApi } = require('./respons');

const KELAS = ['7', '8', '9', '10', '11', '12'];

// `pengguna.jenis_sekolah` (migrasi 011, LANJUT_038). Sama dengan
// LANJUT_App/lib/jenjang.ts.
const JENIS_SEKOLAH = ['SMP', 'SMA', 'SMK', 'MA'];
const KELAS_SMP = new Set(['7', '8', '9']);

/**
 * Satu-satunya aturan jenis sekolah (daftar, PATCH profil, klaim sinkron):
 *   - kelas 7–9   → selalu 'SMP' (diisi server, siswa tidak ditanya);
 *   - kelas 10–12 → 'SMA' | 'SMK' | 'MA' | null (null = gerbang app bertanya);
 *                   'SMP' lama ikut dikosongkan saat kelas naik ke 10–12;
 *   - kelas kosong → disimpan apa adanya (belum bisa diperiksa).
 * Kombinasi yang bertentangan (kelas 8 + SMA, kelas 11 + SMP) → 400.
 *
 * @param {string|null} kelas  kelas yang berlaku SESUDAH perubahan
 * @param {string|null|undefined} diminta  undefined = tidak dikirim klien
 * @param {string|null} lama  nilai tersimpan sebelumnya (null untuk akun baru)
 */
function tentukanJenisSekolah(kelas, diminta, lama) {
  const tolak = (pesan) => {
    throw new GalatApi('VALIDASI_GAGAL', pesan, { jenis_sekolah: pesan });
  };
  if (kelas && KELAS_SMP.has(kelas)) {
    if (diminta && diminta !== 'SMP') tolak('Kelas 7–9 selalu SMP.');
    return 'SMP';
  }
  if (kelas) {
    if (diminta === 'SMP') tolak('SMP hanya untuk kelas 7–9.');
    if (diminta !== undefined) return diminta;
    return lama === 'SMP' ? null : lama ?? null;
  }
  return diminta !== undefined ? diminta : lama ?? null;
}

module.exports = { KELAS, JENIS_SEKOLAH, KELAS_SMP, tentukanJenisSekolah };
