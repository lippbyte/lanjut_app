// Repositori pemakaian AI harian (LANJUT_060). Tabel `pemakaian_ai_harian`
// hanya berisi hitungan gabungan per tanggal: tanpa id akun, tanpa isi.

const pool = require('../../db/koneksi');

// Urutan kolom = urutan nilai yang dikirim pemakaian.js.
const KOLOM = [
  'panggilan_ai',
  'token_masuk',
  'token_keluar',
  'balasan_stub',
  'tanda_akut',
  'tanda_ringan',
  'tanda_model',
  'galat_penyedia',
  'web_dipakai',
  'web_kuota_habis',
  'modul_dipakai',
];

/** Tambah hitungan satu tanggal secara atomik (baris dibuat bila belum ada). `nilai` urut KOLOM. */
async function tambahPemakaian(tanggal, nilai) {
  await pool.execute(
    `INSERT INTO pemakaian_ai_harian
       (tanggal, panggilan_ai, token_masuk, token_keluar, balasan_stub, tanda_akut, tanda_ringan,
        tanda_model, galat_penyedia, web_dipakai, web_kuota_habis, modul_dipakai)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       panggilan_ai = panggilan_ai + VALUES(panggilan_ai),
       token_masuk = token_masuk + VALUES(token_masuk),
       token_keluar = token_keluar + VALUES(token_keluar),
       balasan_stub = balasan_stub + VALUES(balasan_stub),
       tanda_akut = tanda_akut + VALUES(tanda_akut),
       tanda_ringan = tanda_ringan + VALUES(tanda_ringan),
       tanda_model = tanda_model + VALUES(tanda_model),
       galat_penyedia = galat_penyedia + VALUES(galat_penyedia),
       web_dipakai = web_dipakai + VALUES(web_dipakai),
       web_kuota_habis = web_kuota_habis + VALUES(web_kuota_habis),
       modul_dipakai = modul_dipakai + VALUES(modul_dipakai)`,
    [tanggal, ...nilai]
  );
}

/** Baris sejak `dariTanggal` (inklusif, "YYYY-MM-DD"), urut tanggal. Tanggal dikembalikan sebagai teks. */
async function pemakaianSejak(dariTanggal) {
  const [baris] = await pool.execute(
    `SELECT DATE_FORMAT(tanggal, '%Y-%m-%d') AS tanggal, panggilan_ai, token_masuk, token_keluar, balasan_stub,
            tanda_akut, tanda_ringan, tanda_model, galat_penyedia, web_dipakai, web_kuota_habis, modul_dipakai
       FROM pemakaian_ai_harian
      WHERE tanggal >= ?
      ORDER BY tanggal`,
    [dariTanggal]
  );
  return baris;
}

/** Tarif untuk perkiraan biaya (US$ per sejuta token); nilai teks apa adanya. */
async function ambilTarif() {
  const [baris] = await pool.query(
    "SELECT kunci, nilai FROM konfigurasi_levelin WHERE kunci IN ('ai_tarif_masuk_per_juta', 'ai_tarif_keluar_per_juta')"
  );
  return Object.fromEntries(baris.map((b) => [b.kunci, b.nilai]));
}

module.exports = { tambahPemakaian, pemakaianSejak, ambilTarif, KOLOM };
