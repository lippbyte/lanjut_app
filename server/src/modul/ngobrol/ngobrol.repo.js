// Repositori Ngobrol Bareng LANJUT (LANJUT_051, LANJUT_053). Hanya membaca
// konfigurasi (batas pemakaian, saklar & pengaturan penyedia AI) dan nama
// prodi. Isi obrolan TIDAK pernah disimpan, jadi tidak ada tabel obrolan.

const pool = require('../../db/koneksi');

const KUNCI_KONFIG = [
  'ngobrol_batas_5_menit',
  'ngobrol_batas_24_jam',
  'ai_aktif',
  'ai_model',
  'ai_data_collection',
  'ai_zdr',
  'ai_penyedia_only',
  // LANJUT_055 — materi: modul Arsip & web
  'ai_modul_aktif',
  'ai_modul_potongan_maks',
  'ai_modul_skor_min',
  'ai_modul_kata_min',
  'ai_web_aktif',
  'ai_web_batas_harian',
  'ai_web_hasil_maks',
  'ai_web_mesin', // LANJUT_057
];

async function ambilKonfigurasi() {
  const [baris] = await pool.query('SELECT kunci, nilai FROM konfigurasi_levelin WHERE kunci IN (?)', [KUNCI_KONFIG]);
  return baris;
}

/** Nama prodi (konten publik) untuk profil yang dikirim ke AI; null bila tidak ada. */
async function namaProdi(prodiId) {
  const [baris] = await pool.execute('SELECT nama FROM prodi WHERE id = ? LIMIT 1', [prodiId]);
  return baris[0] ? baris[0].nama : null;
}

/** Nama mapel (konten publik) untuk ringkasan & tautan konteks (LANJUT_078); null bila tidak ada. */
async function namaMapel(mapelId) {
  if (!mapelId) return null;
  const [baris] = await pool.execute('SELECT nama FROM mapel WHERE id = ? LIMIT 1', [mapelId]);
  return baris[0] ? baris[0].nama : null;
}

module.exports = { ambilKonfigurasi, namaProdi, namaMapel, KUNCI_KONFIG };
