// Repositori konten publik hanya-baca (F1–F5). SATU-SATUNYA tempat SQL untuk
// tabel-tabel ini. docs/SDD-Backend-Foundation.md §4.4.
// Tabel-tabel di sini adalah konten kurasi tim (bukan data pribadi), jadi
// TIDAK memfilter pengguna_id/pemilik_id — itu memang tidak relevan di sini.

const pool = require('../../db/koneksi');

async function ambilLinimasa() {
  const [baris] = await pool.query(
    `SELECT id, judul, tanggal_mulai, tanggal_selesai, jalur,
            sumber, pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada
       FROM tahapan_linimasa
      ORDER BY tanggal_mulai ASC`
  );
  return baris;
}

async function ambilKhususSmk() {
  const [baris] = await pool.query(
    `SELECT id, judul, apa_yang_beda, apa_yang_bisa_dilakukan, urutan,
            sumber, pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada
       FROM butir_khusus_smk
      ORDER BY urutan ASC, id ASC`
  );
  return baris;
}

async function ambilProdi() {
  const [baris] = await pool.query(
    `SELECT id, nama, rumpun,
            sumber, pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada
       FROM prodi
      ORDER BY nama ASC`
  );
  return baris;
}

async function ambilMapel() {
  const [baris] = await pool.query(
    `SELECT id, nama, tersedia_di_smk,
            sumber, pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada
       FROM mapel
      ORDER BY nama ASC`
  );
  return baris;
}

async function ambilMapelUntukProdi(prodiId) {
  const [baris] = await pool.execute(
    `SELECT m.id, m.nama, m.tersedia_di_smk, pm.bobot
       FROM prodi_mapel pm
       JOIN mapel m ON m.id = pm.mapel_id
      WHERE pm.prodi_id = ?
      ORDER BY pm.bobot DESC, m.nama ASC`,
    [prodiId]
  );
  return baris;
}

/**
 * F3 — jalur "belum tahu prodi": per mapel, berapa banyak prodi yang
 * membutuhkannya (COUNT DISTINCT prodi_id lewat JOIN + GROUP BY mapel_id).
 * SATU query, bukan diagregasi di klien lewat panggilan `/prodi/:id/mapel`
 * berulang — lihat LANJUT_App/hooks/useAgregasiMapelLintasProdi.ts.
 * INNER JOIN sengaja dipakai (bukan LEFT JOIN): mapel yang tidak menjadi
 * syarat mapel_id di baris manapun otomatis tidak ikut, sama seperti
 * perilaku agregasi lama yang hanya melihat mapel yang benar-benar muncul
 * di hasil `/prodi/:id/mapel`.
 */
async function ambilAgregasiMapelLintasProdi() {
  const [baris] = await pool.query(
    `SELECT m.id, m.nama, m.tersedia_di_smk, COUNT(DISTINCT pm.prodi_id) AS jumlah_prodi
       FROM mapel m
       JOIN prodi_mapel pm ON pm.mapel_id = m.id
      GROUP BY m.id, m.nama, m.tersedia_di_smk
      ORDER BY jumlah_prodi DESC, m.nama ASC`
  );
  return baris;
}

async function prodiAda(prodiId) {
  const [baris] = await pool.execute('SELECT id FROM prodi WHERE id = ? LIMIT 1', [prodiId]);
  return baris.length > 0;
}

/**
 * Daftar rumpun yang sah (LANJUT_075) = nilai berbeda di prodi.rumpun — sumber
 * yang sama dengan validasi berlaku_untuk_rumpun di benih checklist. Tidak ada
 * tabel atau daftar rumpun terpisah.
 */
async function ambilDaftarRumpun() {
  const [baris] = await pool.query('SELECT DISTINCT rumpun FROM prodi ORDER BY rumpun ASC');
  return baris.map((b) => b.rumpun);
}

/**
 * LANJUT_079 — pengelompokan INTERNAL mapel per rumpun untuk Pilih Mapel kelas
 * 12: mapel yang muncul di prodi_mapel dengan bobot >= `bobotMin` untuk
 * setidaknya satu prodi di rumpun itu. Sumbernya data benih prodi/prodi_mapel
 * yang BELUM terverifikasi, jadi tidak boleh ditampilkan sebagai fakta.
 * Urut rumpun lalu nama mapel (bukan "paling penting").
 */
async function ambilMapelPerRumpun(bobotMin) {
  const [baris] = await pool.execute(
    `SELECT p.rumpun, m.id, m.nama
       FROM prodi_mapel pm
       JOIN prodi p ON p.id = pm.prodi_id
       JOIN mapel m ON m.id = pm.mapel_id
      WHERE pm.bobot >= ?
      GROUP BY p.rumpun, m.id, m.nama
      ORDER BY p.rumpun ASC, m.nama ASC`,
    [bobotMin]
  );
  return baris;
}

/** F4 — WAJIB menyaring izin_tayang=1 AND tayang=1 (§4.4). Disaring di sini,
 * bukan di rute, supaya tidak bisa terlewat. */
async function ambilCeritaAlumniTayang() {
  const [baris] = await pool.query(
    `SELECT id, nama, asal_smk, jurusan_smk, ptn, prodi, jalur, hambatan, yang_dilakukan,
            sumber, pemilik, status_verifikasi, asal, url_sumber, diperiksa_pada
       FROM cerita_alumni
      WHERE izin_tayang = 1 AND tayang = 1
      ORDER BY id ASC`
  );
  return baris;
}

/**
 * F5 — checklist, dikelompokkan per kategori, dapat disaring ?kelas=&jalur=&rumpun=.
 * SQL statis: filter opsional ditulis `(? IS NULL OR FIND_IN_SET(...) > 0)`,
 * bukan merakit klausa WHERE secara dinamis (§2.2 aturan 2).
 *
 * Rumpun (LANJUT_007) beda dari kelas/jalur: butir umum (rumpun NULL) selalu
 * ikut, butir khusus rumpun HANYA ikut kalau rumpunnya dikirim dan cocok.
 * Tanpa `rumpun`, hasilnya persis seperti sebelum kolom ini ada — klien lama
 * tidak tiba-tiba mendapat butir rumpun lain yang ikut menambah hitungan X/Y.
 */
async function ambilChecklist({ kelas, jalur, rumpun }) {
  const [baris] = await pool.execute(
    `SELECT b.id, b.judul, b.urutan, b.berlaku_untuk_kelas, b.berlaku_untuk_jalur,
            b.berlaku_untuk_rumpun,
            b.sumber, b.pemilik, b.status_verifikasi, b.asal, b.url_sumber, b.diperiksa_pada,
            k.id AS kategori_id, k.nama AS kategori_nama, k.urutan AS kategori_urutan
       FROM butir_daftar_periksa b
       JOIN kategori_checklist k ON k.id = b.kategori_id
      WHERE (? IS NULL OR FIND_IN_SET(?, b.berlaku_untuk_kelas) > 0)
        AND (? IS NULL OR FIND_IN_SET(?, b.berlaku_untuk_jalur) > 0)
        AND (b.berlaku_untuk_rumpun IS NULL OR FIND_IN_SET(?, b.berlaku_untuk_rumpun) > 0)
      ORDER BY k.urutan ASC, b.urutan ASC`,
    [kelas || null, kelas || null, jalur || null, jalur || null, rumpun || null]
  );
  return baris;
}

/**
 * F10 — profil prodi yang SUDAH TERVERIFIKASI saja (LANJUT_031). Disaring di
 * sini, bukan di rute, supaya tidak bisa terlewat (pola sama dengan
 * ambilCeritaAlumniTayang). "Terverifikasi" = definisi skrip verifikasi-konten:
 * status 'terverifikasi' DAN diperiksa_pada terisi. Rumpun dibaca dari prodi.
 * `id` diisi → satu profil (larik 0/1 baris); kosong → semua, urut berkas.
 */
async function ambilProfilProdiTerverifikasi(id) {
  const [baris] = await pool.execute(
    `SELECT pp.id, pp.nama, p.rumpun, pp.jenjang, pp.badge_relevan_smk,
            pp.peminat_jumlah, pp.peminat_kampus, pp.peminat_tahun, pp.peminat_jalur, pp.peminat_sumber,
            pp.diterima, pp.mata_kuliah, pp.profesi, pp.kampus, pp.status_sumber, pp.catatan_studi,
            pp.sumber, pp.pemilik, pp.status_verifikasi, pp.asal, pp.url_sumber, pp.diperiksa_pada
       FROM profil_prodi pp
       JOIN prodi p ON p.id = pp.id
      WHERE pp.status_verifikasi = 'terverifikasi' AND pp.diperiksa_pada IS NOT NULL
        AND (? IS NULL OR pp.id = ?)
      ORDER BY pp.urutan ASC, pp.id ASC`,
    [id ?? null, id ?? null]
  );
  return baris;
}

module.exports = {
  ambilProfilProdiTerverifikasi,
  ambilLinimasa,
  ambilKhususSmk,
  ambilProdi,
  ambilMapel,
  ambilMapelUntukProdi,
  ambilAgregasiMapelLintasProdi,
  prodiAda,
  ambilDaftarRumpun,
  ambilMapelPerRumpun,
  ambilCeritaAlumniTayang,
  ambilChecklist,
};
