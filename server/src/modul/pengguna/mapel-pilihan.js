// LANJUT_079 — Pilih Mapel per rumpun favorit (kelas 12) dan Mapel Saya
// (kelas 7–11). Satu kolom pengguna.mapel_pilihan untuk semua kelas.
//
// Kelas 12: mapel yang boleh dipilih = mapel di kelompok rumpun favoritnya
// (minat_rumpun). Kelas lain dan akun tanpa kelas: semua mapel sekolah, tanpa
// rumpun — minat_rumpun mereka (Eksplorasi Kampus, LANJUT_075) tidak membatasi.
//
// Pengelompokan rumpun → mapel diturunkan dari prodi/prodi_mapel (data benih,
// BELUM terverifikasi). Hanya pengelompokan internal; app menampilkannya
// dengan catatan "belum dicek ke sumber resmi", bukan sebagai fakta.
// Tidak ada SQL di sini — hanya memanggil repositori.

const kontenRepo = require('../konten/konten.repo');

const MAKS_MAPEL_PILIHAN = 5; // semua kelas; dipakai pengguna.skema.js
const MAKS_RUMPUN_KELAS12 = 3;
// Bobot prodi_mapel 2 ("Mendukung") ke atas; bobot 1 ("Menyinggung") tidak
// ikut supaya kelompoknya pendek (lib/pilihMapel.ts LABEL_BOBOT).
const BOBOT_MIN_RUMPUN = 2;

/** 'rumpun' hanya untuk kelas 12; selain itu 'mapel_saya'. */
function modePilihan(kelas) {
  return kelas === '12' ? 'rumpun' : 'mapel_saya';
}

/** Kelompok mapel untuk rumpun yang dipilih SAJA, urut nama rumpun; rumpun lain tidak ikut. */
async function kelompokUntuk(minatRumpun) {
  const dipilih = new Set(minatRumpun);
  const peta = new Map();
  for (const b of await kontenRepo.ambilMapelPerRumpun(BOBOT_MIN_RUMPUN)) {
    if (!dipilih.has(b.rumpun)) continue;
    if (!peta.has(b.rumpun)) peta.set(b.rumpun, []);
    peta.get(b.rumpun).push({ id: b.id, nama: b.nama });
  }
  return [...peta.entries()].map(([rumpun, mapel]) => ({ rumpun, mapel }));
}

/** Id mapel yang boleh dipilih akun dengan kelas & rumpun ini. */
async function mapelBoleh(kelas, minatRumpun) {
  if (modePilihan(kelas) === 'rumpun') {
    return new Set((await kelompokUntuk(minatRumpun)).flatMap((k) => k.mapel.map((m) => m.id)));
  }
  return new Set((await kontenRepo.ambilMapel()).map((m) => m.id));
}

/**
 * Isi layar Pilih Mapel / Mapel Saya untuk satu akun (GET /pengguna/saya/pilihan-mapel).
 * Kelas 12 tidak pernah mendapat daftar semua mapel: hanya kelompok rumpun
 * favoritnya, atau kosong bila belum memilih rumpun (ajakan memilih rumpun dulu).
 */
async function isiLayar({ kelas, minatRumpun, mapelPilihan }) {
  const dasar = { maks_mapel: MAKS_MAPEL_PILIHAN, mapel_pilihan: mapelPilihan };
  if (modePilihan(kelas) === 'rumpun') {
    return {
      mode: 'rumpun',
      ...dasar,
      maks_rumpun: MAKS_RUMPUN_KELAS12,
      minat_rumpun: minatRumpun,
      kelompok: await kelompokUntuk(minatRumpun),
      pengelompokan_terverifikasi: false,
    };
  }
  const mapel = (await kontenRepo.ambilMapel()).map((m) => ({ id: m.id, nama: m.nama }));
  return { mode: 'mapel_saya', ...dasar, mapel };
}

module.exports = {
  MAKS_MAPEL_PILIHAN,
  MAKS_RUMPUN_KELAS12,
  BOBOT_MIN_RUMPUN,
  modePilihan,
  kelompokUntuk,
  mapelBoleh,
  isiLayar,
};
