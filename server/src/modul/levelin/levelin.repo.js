// Repositori Level-In (`sesi_latihan`, `riwayat_latihan`, `konfigurasi_levelin`).
// SATU-SATUNYA tempat SQL untuk tabel ini. Skema dari docs/SDD-LevelIn.md §3.2,
// dipakai apa adanya (docs/SDD-Backend-Foundation.md §3.5).
// Setiap query atas data milik pengguna WAJIB memfilter pengguna_id (§8.4).
// TIDAK ADA satu pun query di sini yang menyentuh tabel `kartu` untuk MENULIS
// (§4.6 aturan 3, §8.4 no. 4) — hanya baca, untuk validasi keberadaan.

const pool = require('../../db/koneksi');

/** Idempoten berdasarkan id buatan klien (§4.1, §4.6 aturan 1). */
async function buatSesiLatihan({
  id,
  penggunaId,
  dimulaiPada,
  jumlahKartuDirencanakan,
  mapelFokusId,
  asalMula,
}) {
  await pool.execute(
    `INSERT INTO sesi_latihan
       (id, pengguna_id, dimulai_pada, jumlah_kartu_direncanakan, mapel_fokus_id, asal_mula)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [id, penggunaId, dimulaiPada, jumlahKartuDirencanakan, mapelFokusId || null, asalMula]
  );
}

/** WHERE id = ? AND pengguna_id = ? (§8.4) — sesi yang tidak pernah ditutup SAH. */
async function tutupSesiLatihan(penggunaId, sesiId, selesaiPada) {
  const [hasil] = await pool.execute(
    `UPDATE sesi_latihan SET selesai_pada = ? WHERE id = ? AND pengguna_id = ?`,
    [selesaiPada, sesiId, penggunaId]
  );
  return hasil.affectedRows > 0;
}

/** Idempoten per id. Menerima keyakinan: null (§4.6 aturan). */
async function simpanSatuRiwayat(penggunaId, catatan) {
  await pool.execute(
    `INSERT INTO riwayat_latihan
       (id, pengguna_id, kartu_id, benar, dijawab_pada, sesi_id, keyakinan,
        mapel_id, gap_numerik, kelas_gap, aturan_versi)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE id = id`,
    [
      catatan.id,
      penggunaId,
      catatan.kartuId || null,
      catatan.benar ? 1 : 0,
      catatan.dijawabPada,
      catatan.sesiId || null,
      catatan.keyakinan === undefined ? null : catatan.keyakinan,
      catatan.mapelId || null,
      catatan.gapNumerik === undefined ? null : catatan.gapNumerik,
      catatan.kelasGap || null,
      catatan.aturanVersi === undefined ? null : catatan.aturanVersi,
    ]
  );
}

/**
 * Jendela N catatan terbaru per mapel, milik pengguna, dengan keyakinan terisi
 * (K4) — masukan agregatPerMapel() (kalibrasi keyakinan). Diurutkan LAMA ->
 * BARU karena fungsi PWA memotong jendela dari ujung larik (slice(-jendela)).
 */
async function ambilRiwayatUntukAgregasi(penggunaId, jendelaPerMapel) {
  const [baris] = await pool.execute(
    `SELECT mapel_id, keyakinan, benar, dijawab_pada
       FROM (
         SELECT r.*, ROW_NUMBER() OVER (
                  PARTITION BY r.mapel_id ORDER BY r.dijawab_pada DESC, r.id DESC
                ) AS urutan
           FROM riwayat_latihan r
          WHERE r.pengguna_id = ? AND r.mapel_id IS NOT NULL AND r.keyakinan IS NOT NULL
       ) t
      WHERE t.urutan <= ?
      ORDER BY t.dijawab_pada ASC, t.id ASC`,
    [penggunaId, jendelaPerMapel]
  );
  return baris.map((b) => ({ mapel_id: b.mapel_id, keyakinan: b.keyakinan, benar: !!b.benar }));
}

/**
 * Jendela N jawaban terbaru per mapel, DENGAN ATAU TANPA keyakinan — masukan
 * levelAkurasiPerMapel() (LANJUT_042), supaya riwayat F7 ikut terhitung.
 */
async function ambilJawabanUntukLevel(penggunaId, jendelaPerMapel) {
  const [baris] = await pool.execute(
    `SELECT mapel_id, benar, dijawab_pada
       FROM (
         SELECT r.*, ROW_NUMBER() OVER (
                  PARTITION BY r.mapel_id ORDER BY r.dijawab_pada DESC, r.id DESC
                ) AS urutan
           FROM riwayat_latihan r
          WHERE r.pengguna_id = ? AND r.mapel_id IS NOT NULL
       ) t
      WHERE t.urutan <= ?
      ORDER BY t.dijawab_pada ASC, t.id ASC`,
    [penggunaId, jendelaPerMapel]
  );
  return baris.map((b) => ({ mapel_id: b.mapel_id, benar: !!b.benar }));
}

/**
 * Ketersediaan kartu per mapel — milik sendiri + kurasi TERVERIFIKASI
 * (syarat LANJUT_040) — dipakai saranHarian() supaya CTA tidak mengarah ke
 * mapel kosong atau ke kartu kurasi yang belum dicek tim konten.
 */
async function ambilKetersediaanKartuPerMapel(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT mapel_id, COUNT(*) AS jumlah
       FROM kartu
      WHERE dihapus_pada IS NULL
        AND ((sumber = 'resmi' AND status_verifikasi = 'terverifikasi' AND diperiksa_pada IS NOT NULL)
             OR pemilik_id = ?)
      GROUP BY mapel_id`,
    [penggunaId]
  );
  return baris;
}

/** Semua mapel yang dikenal — padanan semuaMapelId (data/mapel.json) di PWA,
 * supaya setiap mapel muncul eksplisit di ringkasan walau 0 jawaban (AC FL3). */
async function semuaMapelId() {
  const [baris] = await pool.query('SELECT id FROM mapel ORDER BY id');
  return baris.map((b) => b.id);
}

/** Sesi ini milik pengguna? WHERE id = ? AND pengguna_id = ? (§8.4, LANJUT_041). */
async function sesiMilikSendiri(penggunaId, sesiId) {
  const [baris] = await pool.execute(
    'SELECT id FROM sesi_latihan WHERE id = ? AND pengguna_id = ? LIMIT 1',
    [sesiId, penggunaId]
  );
  return baris.length > 0;
}

async function mapelAda(mapelId) {
  const [baris] = await pool.execute('SELECT id FROM mapel WHERE id = ? LIMIT 1', [mapelId]);
  return baris.length > 0;
}

/**
 * Riwayat Latihan (LANJUT_041): sesi milik sendiri, terbaru dulu, dengan
 * jumlah kartu yang dijawab & benar. JOIN riwayat juga memfilter pengguna,
 * jadi catatan akun lain tidak pernah ikut terhitung. 50 sesi terakhir.
 */
async function daftarSesiMilikSendiri(penggunaId) {
  const [baris] = await pool.execute(
    `SELECT s.id, s.dimulai_pada, s.selesai_pada, s.jumlah_kartu_direncanakan,
            s.mapel_fokus_id, s.asal_mula,
            COUNT(r.id) AS jumlah_dijawab,
            COALESCE(SUM(r.benar), 0) AS jumlah_benar
       FROM sesi_latihan s
       LEFT JOIN riwayat_latihan r ON r.sesi_id = s.id AND r.pengguna_id = s.pengguna_id
      WHERE s.pengguna_id = ?
      GROUP BY s.id, s.dimulai_pada, s.selesai_pada, s.jumlah_kartu_direncanakan,
               s.mapel_fokus_id, s.asal_mula
      ORDER BY s.dimulai_pada DESC, s.id
      LIMIT 50`,
    [penggunaId]
  );
  return baris;
}

async function ambilSemuaKonfigurasi() {
  const [baris] = await pool.query(
    'SELECT kunci, nilai, versi, dasar, diubah_pada FROM konfigurasi_levelin'
  );
  return baris;
}

module.exports = {
  buatSesiLatihan,
  tutupSesiLatihan,
  simpanSatuRiwayat,
  ambilRiwayatUntukAgregasi,
  ambilJawabanUntukLevel,
  semuaMapelId,
  ambilKetersediaanKartuPerMapel,
  sesiMilikSendiri,
  mapelAda,
  daftarSesiMilikSendiri,
  ambilSemuaKonfigurasi,
};
