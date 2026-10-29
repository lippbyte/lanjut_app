// ============================================================================
// keputusan.js — Lapisan 2 Level-In (fungsi keputusan MURNI), LANJUT_042.
// ============================================================================
//
// docs/SDD-Backend-Foundation.md B-K6 & §9.2, SDD-LevelIn.md §4.3 no. 2 (RB5):
// server TIDAK BOLEH punya sumber kebenaran kedua untuk angka kalibrasi. Lima
// fungsi di bawah (gapNumerik, klasifikasiKartu, agregatPerMapel, ringkasSesi,
// saranHarian) adalah SALINAN PERSIS Lapisan 2 MVP-PWA/assets/levelin.js —
// hanya indentasi IIFE yang dibuang. tests/levelin-keputusan.test.js
// memastikannya: teks badan fungsi dibandingkan dengan berkas PWA, dan
// keluarannya dibandingkan pada ratusan masukan.
//
// Perbedaan tanda tangan dengan pemanggil server diselesaikan di
// levelin.layanan.js (adaptor), BUKAN dengan mengubah fungsi di sini.
//
// Satu tambahan khusus server: levelAkurasiPerMapel() — tabel fallback
// akurasi (benar %) keputusan Khalifa, karena logika PWA hanya menghitung
// jawaban yang punya keyakinan, sedangkan F7 (LANJUT_041) tidak mengirimnya.
//
// Nilai ambang yang berlaku dibaca dari tabel konfigurasi_levelin (benih dari
// data/levelin-konfig.json). KONFIG_BAWAAN di bawah hanya cadangan bila tabel
// itu kosong — sama dengan perilaku PWA bila berkas konfigurasi gagal dimuat.
// ============================================================================

'use strict';

/* Salinan KONFIG_BAWAAN Lapisan 1 PWA (baris 61–77) — cadangan saja. */
var KONFIG_BAWAAN = {
  versi: 1,
  aturan_versi: 1,
  ambang: {
    ambang_overconfident: 0.40,
    minimum_kartu: 5,
    jendela_per_mapel: 50
  },
  klasifikasi: {
    keyakinan_tinggi_minimal: 4,
    keyakinan_rendah_maksimal: 2
  },
  akses: {
    ringkasan_kalibrasi_sesi: 'gratis',
    tampilan_agregat_mapel: 'belum_diputuskan'
  }
};

/* Pengganti ambilKonfig() PWA (Lapisan 1) di server: tidak ada konfigurasi
   global — pemanggil server SELALU mengirim konfigObj dari tabel
   konfigurasi_levelin. Cadangan ini hanya dipakai ringkasSesi(), yang memang
   memanggil klasifikasiKartu() tanpa konfigObj di PWA. */
function ambilKonfig() {
  return KONFIG_BAWAAN;
}

/* -----------------------------------------------------------------------
   SALINAN PERSIS Lapisan 2 MVP-PWA/assets/levelin.js (baris 155–385).
   JANGAN diubah di sini saja — ubah di keduanya, lalu jalankan tes.
   ----------------------------------------------------------------------- */
/* Gap numerik per kartu (SDD §6.1a). */
function gapNumerik(keyakinan, benar) {
  if (keyakinan === null || keyakinan === undefined) return null;
  var pYakin = (keyakinan - 1) / 4;
  var hasil = benar ? 1 : 0;
  return pYakin - hasil;
}

/* Klasifikasi kartu (SDD §6.1b). */
function klasifikasiKartu(keyakinan, benar, konfigObj) {
  if (keyakinan === null || keyakinan === undefined) return null;
  var cfg = konfigObj || ambilKonfig();
  var tinggiMin = cfg.klasifikasi.keyakinan_tinggi_minimal;
  var rendahMaks = cfg.klasifikasi.keyakinan_rendah_maksimal;

  if (keyakinan === 3) return 'netral';
  if (keyakinan >= tinggiMin && !benar) return 'overconfident';
  if (keyakinan <= rendahMaks && benar) return 'underconfident';
  return 'selaras';
}

/* Agregasi per mapel (SDD §6.1c). Menerima peristiwa[] (riwayat mentah)
   dan, opsional, `semuaMapelId` (daftar id mapel yang DIKETAHUI ada,
   mis. dari data/mapel.json). Mengembalikan peta mapel_id -> agregat
   dengan rate, status_data, pola.

   Mapel yang ada di `semuaMapelId` tapi belum punya satu peristiwa pun
   TETAP muncul di keluaran dengan status_data='belum_cukup_data' dan
   rate_overconfident=null — SDD §6.1c & AC FL3 melarang mapel hilang
   begitu saja dari hasil agregasi (sebelumnya mapel tanpa data memang
   hilang total dari objek `hasil`, lihat laporan QA). */
function agregatPerMapel(peristiwa, konfigObj, semuaMapelId) {
  var cfg = konfigObj || ambilKonfig();
  var jendela = cfg.ambang.jendela_per_mapel;
  var minKartu = cfg.ambang.minimum_kartu;
  var ambangOC = cfg.ambang.ambang_overconfident;

  /* Kelompokkan per mapel, ambil N terakhir per mapel. */
  var perMapel = {};
  (peristiwa || []).forEach(function (ev) {
    var mid = ev.mapel_id;
    if (!perMapel[mid]) perMapel[mid] = [];
    perMapel[mid].push(ev);
  });

  function hitungSatu(daftar) {
    var kartuDikerjakan = 0;
    var nOC = 0, nUC = 0, nSelaras = 0, nNetral = 0, nBenar = 0;

    daftar.forEach(function (ev) {
      if (ev.keyakinan === null || ev.keyakinan === undefined) return;
      kartuDikerjakan++;
      nBenar += ev.benar ? 1 : 0;
      var kelas = klasifikasiKartu(ev.keyakinan, ev.benar, cfg);
      if (kelas === 'overconfident') nOC++;
      else if (kelas === 'underconfident') nUC++;
      else if (kelas === 'selaras') nSelaras++;
      else if (kelas === 'netral') nNetral++;
    });

    var rateOC = kartuDikerjakan > 0 ? nOC / kartuDikerjakan : null;
    var statusData = kartuDikerjakan >= minKartu ? 'cukup_data' : 'belum_cukup_data';
    var pola = statusData === 'belum_cukup_data'
      ? 'belum_cukup_data'
      : (rateOC >= ambangOC ? 'overconfident' : 'selaras');

    return {
      kartu_dikerjakan: kartuDikerjakan,
      n_overconfident: nOC,
      n_underconfident: nUC,
      n_selaras: nSelaras,
      n_netral: nNetral,
      n_benar: nBenar,
      rate_overconfident: rateOC,
      status_data: statusData,
      pola: pola
    };
  }

  var hasil = {};
  Object.keys(perMapel).forEach(function (mapelId) {
    hasil[mapelId] = hitungSatu(perMapel[mapelId].slice(-jendela));
  });

  (semuaMapelId || []).forEach(function (mapelId) {
    if (!mapelId || hasil[mapelId]) return;
    hasil[mapelId] = hitungSatu([]);
  });

  return hasil;
}

/* Ringkasan sesi (SDD §6.1d). */
function ringkasSesi(jawaban) {
  var total = jawaban.length;
  var benar = 0;
  var overconfident = 0, underconfident = 0, selaras = 0, netral = 0;

  jawaban.forEach(function (j) {
    if (j.benar) benar++;
    var kelas = klasifikasiKartu(j.keyakinan, j.benar);
    if (kelas === 'overconfident') overconfident++;
    else if (kelas === 'underconfident') underconfident++;
    else if (kelas === 'selaras') selaras++;
    else if (kelas === 'netral') netral++;
  });

  return {
    total: total,
    benar: benar,
    overconfident: overconfident,
    underconfident: underconfident,
    selaras: selaras,
    netral: netral
  };
}

/* Saran belajar harian (SDD §6.1e, §6.1f). */
function saranHarian(agregat, ketersediaanKartu, konfigObj) {
  var cfg = konfigObj || ambilKonfig();

  /* Helper: hitung jumlah kartu tersedia untuk mapel. */
  function hitungKartuTersedia(mapelId) {
    if (!ketersediaanKartu || !ketersediaanKartu[mapelId]) return 0;
    return ketersediaanKartu[mapelId];
  }

  /* Rantai fallback (SDD §6.1f). */

  /* 1. Arsip kosong? */
  var adaKartuApaAja = false;
  Object.keys(ketersediaanKartu || {}).forEach(function (mid) {
    if (ketersediaanKartu[mid] > 0) adaKartuApaAja = true;
  });
  if (!adaKartuApaAja) {
    return { jenis: 'arsip_kosong', mapel_id: null };
  }

  /* 2. Ada kandidat overconfident? */
  var kandidatOC = [];
  Object.keys(agregat || {}).forEach(function (mapelId) {
    var agg = agregat[mapelId];
    if (agg.pola === 'overconfident' && hitungKartuTersedia(mapelId) > 0) {
      kandidatOC.push(mapelId);
    }
  });

  if (kandidatOC.length > 0) {
    /* Urutkan: rate DESC, kartu_dikerjakan DESC, mapel_id ASC. */
    var terbaik = kandidatOC.sort(function (a, b) {
      var rateA = agregat[a].rate_overconfident || -1;
      var rateB = agregat[b].rate_overconfident || -1;
      if (rateB !== rateA) return rateB - rateA;
      var kartuA = agregat[a].kartu_dikerjakan;
      var kartuB = agregat[b].kartu_dikerjakan;
      if (kartuB !== kartuA) return kartuB - kartuA;
      return a < b ? -1 : (a > b ? 1 : 0);
    })[0];
    return { jenis: 'saran', mapel_id: terbaik };
  }

  /* 3. Ada mapel cukup_data, tapi tidak overconfident? */
  var kandidatSelaras = [];
  Object.keys(agregat || {}).forEach(function (mapelId) {
    var agg = agregat[mapelId];
    if (agg.status_data === 'cukup_data' && agg.pola !== 'overconfident' &&
        hitungKartuTersedia(mapelId) > 0) {
      kandidatSelaras.push(mapelId);
    }
  });

  if (kandidatSelaras.length > 0) {
    return { jenis: 'kalibrasi_selaras', mapel_id: null };
  }

  /* 4. Ada riwayat tapi semua belum_cukup_data? (SDD §6.1f baris 4 vs 5)

     KOREKSI (Fase 2): sebelumnya `adaRiwayat` hanya memeriksa
     `Object.keys(agregat).length > 0` — tapi agregatPerMapel() SELALU
     mengisi entri untuk SETIAP mapel di `semuaMapelId` (SDD §6.1c),
     termasuk yang belum pernah dikerjakan sama sekali (kartu_dikerjakan=0).
     Akibatnya `agregat` nyaris tidak pernah kosong begitu data/mapel.json
     tersedia, sehingga baris 5 ('pengguna_baru') jadi TIDAK PERNAH
     tercapai lewat pasangSaranBeranda() — pengguna baru selalu jatuh ke
     'belum_cukup_data', padahal SDD §6.1f baris 4 secara eksplisit
     mensyaratkan "ADA riwayat" (bukan sekadar "ada entri mapel yang
     diketahui"). Sekarang memeriksa langsung apakah ADA mapel dengan
     kartu_dikerjakan > 0 — itulah definisi "ada riwayat" yang benar. */
  var adaRiwayat = Object.keys(agregat || {}).some(function (mapelId) {
    var agg = agregat[mapelId];
    return !!agg && agg.kartu_dikerjakan > 0;
  });
  if (adaRiwayat) {
    var kandidatBCD = [];
    Object.keys(agregat || {}).forEach(function (mapelId) {
      if (hitungKartuTersedia(mapelId) > 0) {
        kandidatBCD.push(mapelId);
      }
    });
    if (kandidatBCD.length > 0) {
      /* Pilih: yang punya kartu_dikerjakan paling banyak, tie-break mapel_id ASC. */
      var terpilih = kandidatBCD.sort(function (a, b) {
        var ka = agregat[a] ? agregat[a].kartu_dikerjakan : 0;
        var kb = agregat[b] ? agregat[b].kartu_dikerjakan : 0;
        if (kb !== ka) return kb - ka;
        return a < b ? -1 : (a > b ? 1 : 0);
      })[0];
      return { jenis: 'belum_cukup_data', mapel_id: terpilih };
    }
  }

  /* 5. Pengguna baru (belum ada riwayat sama sekali). */
  var semuaMapel = [];
  Object.keys(ketersediaanKartu || {}).forEach(function (mapelId) {
    if (ketersediaanKartu[mapelId] > 0) {
      semuaMapel.push(mapelId);
    }
  });
  if (semuaMapel.length > 0) {
    var terpilihBaru = semuaMapel.sort(function (a, b) {
      var ka = agregat[a] ? agregat[a].kartu_dikerjakan : 0;
      var kb = agregat[b] ? agregat[b].kartu_dikerjakan : 0;
      if (kb !== ka) return kb - ka;
      return a < b ? -1 : (a > b ? 1 : 0);
    })[0];
    return { jenis: 'pengguna_baru', mapel_id: terpilihBaru };
  }

  /* Fallback last resort (tidak seharusnya tercapai). */
  return { jenis: 'pengguna_baru', mapel_id: null };
}

/* -----------------------------------------------------------------------
   KHUSUS SERVER — BUKAN salinan PWA (LANJUT_042).
   ----------------------------------------------------------------------- */

/* Cadangan bila konfigurasi_levelin belum berisi kunci level_*. */
var LEVEL_AKURASI_BAWAAN = {
  minimum_kartu: 10,
  batas_bawah: 0.5,
  batas_atas: 0.75
};

/* Level akurasi per mapel — tabel fallback keputusan Khalifa (2 Okt 2026).
   Dihitung dari benar/salah SAJA, tanpa keyakinan, jadi riwayat F7
   (LANJUT_041) ikut terhitung. Ini metrik terpisah dari kalibrasi keyakinan
   agregatPerMapel(), bukan pengganti angkanya (RB5 tetap terjaga).

   `peristiwa` urut lama -> baru, seperti agregatPerMapel(); jendela per mapel
   memakai ambang.jendela_per_mapel yang sama.
     kartu_dijawab < minimum_kartu            -> belum_cukup_data (tanpa level)
     rate_benar <  batas_bawah                 -> perlu_penguatan_dasar
     batas_bawah <= rate_benar <= batas_atas   -> cukup_lanjut_latihan
     rate_benar >  batas_atas                  -> sudah_kuat
   Mapel di `semuaMapelId` tanpa satu jawaban pun tetap muncul (AC FL3). */
function levelAkurasiPerMapel(peristiwa, konfigObj, semuaMapelId) {
  var cfg = konfigObj || ambilKonfig();
  var aturan = cfg.level_akurasi || LEVEL_AKURASI_BAWAAN;
  var jendela = cfg.ambang.jendela_per_mapel;

  var perMapel = {};
  (peristiwa || []).forEach(function (ev) {
    if (!perMapel[ev.mapel_id]) perMapel[ev.mapel_id] = [];
    perMapel[ev.mapel_id].push(ev);
  });

  function hitungSatu(daftar) {
    var dijawab = daftar.length;
    var nBenar = 0;
    daftar.forEach(function (ev) { if (ev.benar) nBenar++; });
    var rate = dijawab > 0 ? nBenar / dijawab : null;
    var level;
    if (dijawab < aturan.minimum_kartu) level = 'belum_cukup_data';
    else if (rate < aturan.batas_bawah) level = 'perlu_penguatan_dasar';
    else if (rate > aturan.batas_atas) level = 'sudah_kuat';
    else level = 'cukup_lanjut_latihan';
    return { kartu_dijawab: dijawab, n_benar: nBenar, rate_benar: rate, level: level };
  }

  var hasil = {};
  Object.keys(perMapel).forEach(function (mapelId) {
    hasil[mapelId] = hitungSatu(perMapel[mapelId].slice(-jendela));
  });
  (semuaMapelId || []).forEach(function (mapelId) {
    if (!mapelId || hasil[mapelId]) return;
    hasil[mapelId] = hitungSatu([]);
  });
  return hasil;
}

module.exports = {
  KONFIG_BAWAAN,
  LEVEL_AKURASI_BAWAAN,
  gapNumerik,
  klasifikasiKartu,
  agregatPerMapel,
  ringkasSesi,
  saranHarian,
  levelAkurasiPerMapel,
};
