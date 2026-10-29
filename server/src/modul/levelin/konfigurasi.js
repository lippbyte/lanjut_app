// Pemetaan konfigurasi Level-In (LANJUT_042): baris tabel konfigurasi_levelin
// (kunci datar, nilai teks) <-> objek konfigurasi berbentuk KONFIG_BAWAAN PWA
// (ambang/klasifikasi/akses) + level_akurasi khusus server.
//
// Dipakai dua arah: benih (data/levelin-konfig.json -> baris) dan layanan
// (baris -> objek yang dikirim ke fungsi keputusan). Satu daftar kunci di sini
// supaya keduanya tidak bisa menyimpang. Tidak ada SQL di berkas ini.

const keputusan = require('./keputusan');

// kunci baris -> [jalur di objek konfigurasi, pengubah tipe]
const KUNCI_KONFIG = {
  aturan_versi: ['aturan_versi', Number],
  ambang_overconfident: ['ambang.ambang_overconfident', Number],
  minimum_kartu: ['ambang.minimum_kartu', Number],
  jendela_per_mapel: ['ambang.jendela_per_mapel', Number],
  keyakinan_tinggi_minimal: ['klasifikasi.keyakinan_tinggi_minimal', Number],
  keyakinan_rendah_maksimal: ['klasifikasi.keyakinan_rendah_maksimal', Number],
  akses_ringkasan_kalibrasi_sesi: ['akses.ringkasan_kalibrasi_sesi', String],
  akses_tampilan_agregat_mapel: ['akses.tampilan_agregat_mapel', String],
  level_minimum_kartu: ['level_akurasi.minimum_kartu', Number],
  level_batas_bawah: ['level_akurasi.batas_bawah', Number],
  level_batas_atas: ['level_akurasi.batas_atas', Number],
};

function ambilJalur(obj, jalur) {
  return jalur.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
}

function aturJalur(obj, jalur, nilai) {
  const bagian = jalur.split('.');
  const terakhir = bagian.pop();
  const wadah = bagian.reduce((o, k) => (o[k] = o[k] || {}), obj);
  wadah[terakhir] = nilai;
}

/** Salinan baru konfigurasi bawaan (cadangan bila tabel kosong / kunci hilang). */
function konfigBawaan() {
  const cfg = JSON.parse(JSON.stringify(keputusan.KONFIG_BAWAAN));
  cfg.level_akurasi = { ...keputusan.LEVEL_AKURASI_BAWAAN };
  return cfg;
}

/**
 * Baris tabel -> objek konfigurasi. Ditimpa PER KUNCI di atas bawaan (pola
 * gabungKonfigPerKunci PWA): kunci yang hilang atau nilainya tidak sah tidak
 * menghapus nilai bawaan.
 */
function bentukKonfig(baris) {
  const cfg = konfigBawaan();
  for (const b of baris || []) {
    const peta = KUNCI_KONFIG[b.kunci];
    if (!peta) continue;
    const [jalur, ubah] = peta;
    const nilai = ubah(b.nilai);
    if (ubah === Number && !Number.isFinite(nilai)) continue;
    aturJalur(cfg, jalur, nilai);
  }
  return cfg;
}

/**
 * Berkas data/levelin-konfig.json -> baris { kunci, nilai, dasar }. Kunci
 * level_* memakai level_akurasi.dasar; lainnya memakai dasar berkas.
 */
function rataKonfig(berkas) {
  const hasil = [];
  for (const [kunci, [jalur]] of Object.entries(KUNCI_KONFIG)) {
    const nilai = ambilJalur(berkas, jalur);
    if (nilai === undefined || nilai === null) continue;
    const dasar = kunci.startsWith('level_')
      ? (berkas.level_akurasi && berkas.level_akurasi.dasar) || berkas.dasar
      : berkas.dasar;
    hasil.push({ kunci, nilai: String(nilai), dasar: dasar || 'Tidak disebutkan di berkas konfigurasi.' });
  }
  return hasil;
}

module.exports = { KUNCI_KONFIG, konfigBawaan, bentukKonfig, rataKonfig };
