// Repositori tabel `pengguna`. SATU-SATUNYA tempat SQL untuk tabel ini.
// docs/SDD-Backend-Foundation.md §8.1: dua fungsi terpisah untuk mengambil
// data — cariUntukMasuk() (memuat hash, HANYA dipanggil layanan auth) dan
// cariProfil() (TIDAK PERNAH memuat hash) — supaya kebocoran hash tidak bisa
// terjadi karena lupa menghapus satu kolom di suatu tempat.

const pool = require('../../db/koneksi');

/** HANYA dipakai layanan auth untuk memverifikasi kata sandi saat login. */
async function cariUntukMasuk(namaPengguna) {
  const [baris] = await pool.execute(
    `SELECT id, nama_pengguna, kata_sandi_hash, wajib_buat_sandi, email_terverifikasi,
            batas_verifikasi, peran, status
       FROM pengguna
      WHERE nama_pengguna = ?
      LIMIT 1`,
    [namaPengguna]
  );
  return baris[0] || null;
}

/** Masuk tanpa kata sandi (kode email, Google — LANJUT_083): hanya id & status, tanpa hash. */
async function cariUntukMasukDenganEmail(email) {
  const [baris] = await pool.execute(
    'SELECT id, status FROM pengguna WHERE email = ? LIMIT 1',
    [email]
  );
  return baris[0] || null;
}

/** Profil publik pengguna berjalan — TIDAK PERNAH memuat kata_sandi_hash. */
async function cariProfil(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT id, nama_pengguna, nama_tampilan, email, email_terverifikasi, wajib_buat_sandi, peran, status,
            kelas, jenis_sekolah, prodi_tujuan, gaya_belajar, minat_rumpun, mapel_pilihan,
            kesiapan_ujian, dibuat_pada, terakhir_masuk_pada
       FROM pengguna
      WHERE id = ?
      LIMIT 1`,
    [penggunaId]
  );
  return baris[0] || null;
}

async function cekNamaPenggunaDipakai(namaPengguna) {
  const [baris] = await pool.execute(
    'SELECT id FROM pengguna WHERE nama_pengguna = ? LIMIT 1',
    [namaPengguna]
  );
  return baris.length > 0;
}

async function buatPengguna({
  id,
  namaPengguna,
  namaTampilan,
  email,
  emailTerverifikasi = false,
  kataSandiHash,
  kelas,
  jenisSekolah,
  prodiTujuan,
  dibuatPada,
}) {
  await pool.execute(
    `INSERT INTO pengguna
       (id, nama_pengguna, nama_tampilan, email, email_terverifikasi, kata_sandi_hash, peran, status,
        kelas, jenis_sekolah, prodi_tujuan, dibuat_pada)
     VALUES (?, ?, ?, ?, ?, ?, 'siswa', 'aktif', ?, ?, ?, ?)`,
    [
      id,
      namaPengguna,
      namaTampilan || null,
      email || null,
      email && emailTerverifikasi ? 1 : 0,
      kataSandiHash,
      kelas || null,
      jenisSekolah || null,
      prodiTujuan || null,
      dibuatPada,
    ]
  );
}

/** LANJUT_083c: email akun terbukti milik pemilik akun (kode verifikasi ke email itu). */
async function tandaiEmailTerverifikasi(penggunaId) {
  await pool.execute('UPDATE pengguna SET email_terverifikasi = 1 WHERE id = ? AND email IS NOT NULL', [penggunaId]);
}

/**
 * LANJUT_083d: pemilik email membuktikan email lewat kode email atau Google pada akun yang
 * emailnya belum terverifikasi → email terverifikasi, kata sandi lama dicabut (tanda
 * wajib_buat_sandi). Atomik: true hanya bila akun ini memang baru saja diambil alih.
 */
async function ambilAlihOlehPemilikEmail(penggunaId) {
  const [hasil] = await pool.execute(
    `UPDATE pengguna
        SET email_terverifikasi = 1, wajib_buat_sandi = 1
      WHERE id = ? AND email IS NOT NULL AND email_terverifikasi = 0`,
    [penggunaId]
  );
  return hasil.affectedRows > 0;
}

/** LANJUT_083d: kata sandi baru menggantikan yang dicabut. Hanya bila tandanya aktif (atomik). */
async function buatSandiBaru(penggunaId, kataSandiHash) {
  const [hasil] = await pool.execute(
    'UPDATE pengguna SET kata_sandi_hash = ?, wajib_buat_sandi = 0 WHERE id = ? AND wajib_buat_sandi = 1',
    [kataSandiHash, penggunaId]
  );
  return hasil.affectedRows > 0;
}

/**
 * LANJUT_086: id akun yang tenggat verifikasinya (batas_verifikasi, LANJUT_084) sudah lewat
 * pada `waktu` (teks DATETIME UTC) dan emailnya belum terverifikasi. Akun tanpa tenggat (NULL)
 * tidak pernah ikut. Dipakai tools/cabut-sesi-tenggat.js.
 */
async function cariAkunLewatTenggat(waktu) {
  const [baris] = await pool.execute(
    `SELECT id FROM pengguna
      WHERE email_terverifikasi = 0
        AND batas_verifikasi IS NOT NULL
        AND batas_verifikasi <= ?`,
    [waktu]
  );
  return baris.map((b) => b.id);
}

async function tandaiTerakhirMasuk(penggunaId, waktu) {
  await pool.execute('UPDATE pengguna SET terakhir_masuk_pada = ? WHERE id = ?', [
    waktu,
    penggunaId,
  ]);
}

async function updateKataSandiHash(penggunaId, kataSandiHashBaru) {
  await pool.execute('UPDATE pengguna SET kata_sandi_hash = ? WHERE id = ?', [
    kataSandiHashBaru,
    penggunaId,
  ]);
}

/**
 * PATCH /pengguna/saya — hanya kelas, jenis_sekolah, prodi_tujuan,
 * nama_tampilan, gaya_belajar, minat_rumpun, mapel_pilihan, dan kesiapan_ujian (§4.3,
 * LANJUT_032, LANJUT_038, LANJUT_075, LANJUT_079, percakapan 15 Okt 2026). SQL statis: medan yang
 * tidak dikirim (`undefined`) memakai flag CASE WHEN supaya tidak perlu
 * merakit klausa SET secara dinamis (§2.2 aturan 2). minat_rumpun dan
 * mapel_pilihan dikirim sebagai teks JSON; MySQL menyimpannya sebagai larik
 * di kolom JSON.
 */
async function updateProfil(
  penggunaId,
  { kelas, jenisSekolah, prodiTujuan, namaTampilan, gayaBelajar, minatRumpun, mapelPilihan, kesiapanUjian }
) {
  const ubahKelas = kelas !== undefined;
  const ubahJenis = jenisSekolah !== undefined;
  const ubahProdi = prodiTujuan !== undefined;
  const ubahNama = namaTampilan !== undefined;
  const ubahGaya = gayaBelajar !== undefined;
  const ubahMinat = minatRumpun !== undefined;
  const ubahMapel = mapelPilihan !== undefined;
  const ubahKesiapan = kesiapanUjian !== undefined;
  if (!ubahKelas && !ubahJenis && !ubahProdi && !ubahNama && !ubahGaya && !ubahMinat && !ubahMapel && !ubahKesiapan) return;

  await pool.execute(
    `UPDATE pengguna
        SET kelas = CASE WHEN ? THEN ? ELSE kelas END,
            jenis_sekolah = CASE WHEN ? THEN ? ELSE jenis_sekolah END,
            prodi_tujuan = CASE WHEN ? THEN ? ELSE prodi_tujuan END,
            nama_tampilan = CASE WHEN ? THEN ? ELSE nama_tampilan END,
            gaya_belajar = CASE WHEN ? THEN ? ELSE gaya_belajar END,
            minat_rumpun = CASE WHEN ? THEN ? ELSE minat_rumpun END,
            mapel_pilihan = CASE WHEN ? THEN ? ELSE mapel_pilihan END,
            kesiapan_ujian = CASE WHEN ? THEN ? ELSE kesiapan_ujian END
      WHERE id = ?`,
    [
      ubahKelas, kelas || null,
      ubahJenis, jenisSekolah || null,
      ubahProdi, prodiTujuan || null,
      ubahNama, namaTampilan || null,
      ubahGaya, gayaBelajar || null,
      ubahMinat, ubahMinat ? JSON.stringify(minatRumpun) : null,
      ubahMapel, ubahMapel ? JSON.stringify(mapelPilihan) : null,
      ubahKesiapan, kesiapanUjian || null,
      penggunaId,
    ]
  );
}

module.exports = {
  cariUntukMasuk,
  cariUntukMasukDenganEmail,
  cariProfil,
  cekNamaPenggunaDipakai,
  buatPengguna,
  tandaiEmailTerverifikasi,
  ambilAlihOlehPemilikEmail,
  buatSandiBaru,
  cariAkunLewatTenggat,
  tandaiTerakhirMasuk,
  updateKataSandiHash,
  updateProfil,
};
