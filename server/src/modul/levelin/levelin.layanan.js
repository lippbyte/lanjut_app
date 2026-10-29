// Aturan bisnis Level-In. Tidak ada SQL di sini — hanya memanggil repositori
// dan fungsi keputusan murni (keputusan.js). docs/SDD-Backend-Foundation.md §4.6.
//
// LANJUT_042: keputusan.js kini salinan persis Lapisan 2 PWA. Fungsi di sini
// adalah ADAPTOR: menyiapkan masukan berbentuk PWA (peristiwa urut lama ->
// baru, objek konfigurasi, daftar mapel, peta ketersediaan) dari basis data,
// lalu membentuk keluaran sesuai SDD-LevelIn §3.2/§4.2. Ambang dibaca dari
// tabel konfigurasi_levelin (konfigurasi.js), bukan ditulis di kode.

const { GalatApi } = require('../../util/respons');
const { keIso, keDbDariKlien, sekarangIso } = require('../../util/waktu');
const repo = require('./levelin.repo');
const kartuRepo = require('../kartu/kartu.repo');
const modulRepo = require('../modul/modul.repo');
const keputusan = require('./keputusan');
const { bentukKonfig, KUNCI_KONFIG } = require('./konfigurasi');

/** Konfigurasi berlaku + versinya (versi tertinggi di antara baris tabel). */
async function muatKonfig() {
  const baris = await repo.ambilSemuaKonfigurasi();
  const versi = baris.reduce((maks, b) => Math.max(maks, Number(b.versi) || 0), 0);
  return { cfg: bentukKonfig(baris), versi: versi || keputusan.KONFIG_BAWAAN.versi };
}

async function mulaiSesi(penggunaId, body) {
  // LANJUT_041: mapel tak dikenal dulu jatuh ke pelanggaran FK (500).
  if (body.mapel_fokus_id && !(await repo.mapelAda(body.mapel_fokus_id))) {
    throw new GalatApi('VALIDASI_GAGAL', 'Mapel tidak ditemukan.', { mapel_fokus_id: 'tidak ditemukan' });
  }
  await repo.buatSesiLatihan({
    id: body.id,
    penggunaId,
    dimulaiPada: keDbDariKlien(body.dimulai_pada),
    jumlahKartuDirencanakan: body.jumlah_kartu_direncanakan,
    mapelFokusId: body.mapel_fokus_id,
    asalMula: body.asal_mula,
  });
  // Idempoten per id (ON DUPLICATE KEY) — tetapi id milik akun LAIN tidak
  // boleh dijawab "berhasil": barisnya tetap milik akun itu dan tidak berubah.
  if (!(await repo.sesiMilikSendiri(penggunaId, body.id))) {
    throw new GalatApi('VALIDASI_GAGAL', 'Id sesi sudah dipakai.', { id: 'sudah dipakai' });
  }
  return { id: body.id };
}

/** Riwayat Latihan (LANJUT_041) — sesi milik sendiri dengan hitungan jawaban. */
async function daftarSesi(penggunaId) {
  const baris = await repo.daftarSesiMilikSendiri(penggunaId);
  return baris.map((b) => ({
    id: b.id,
    dimulai_pada: keIso(b.dimulai_pada),
    selesai_pada: keIso(b.selesai_pada),
    mapel_fokus_id: b.mapel_fokus_id,
    asal_mula: b.asal_mula,
    jumlah_kartu_direncanakan: b.jumlah_kartu_direncanakan,
    jumlah_dijawab: Number(b.jumlah_dijawab),
    jumlah_benar: Number(b.jumlah_benar),
  }));
}

/**
 * Periksa semua rujukan SEBELUM menulis apa pun (LANJUT_041), supaya satu
 * catatan salah tidak meninggalkan simpanan setengah jadi:
 *   - sesi_id harus sesi milik sendiri (404, bukan 403 — §8.4);
 *   - kartu_id harus kartu sendiri atau kurasi terverifikasi (404), dan
 *     mapel_id diambil dari kartunya, bukan dari kiriman klien;
 *   - tanpa kartu_id, mapel_id (bila ada) harus mapel yang dikenal (400).
 * Sebelumnya rujukan tak dikenal jatuh ke pelanggaran FK (500), dan akun B
 * bisa menautkan catatannya ke sesi/kartu milik akun A.
 */
async function periksaRujukan(penggunaId, daftarCatatan) {
  const sesiSah = new Set();
  const mapelKartu = new Map();
  for (const c of daftarCatatan) {
    if (c.sesi_id && !sesiSah.has(c.sesi_id)) {
      if (!(await repo.sesiMilikSendiri(penggunaId, c.sesi_id))) {
        throw new GalatApi('TIDAK_DITEMUKAN', 'Sesi latihan tidak ditemukan.');
      }
      sesiSah.add(c.sesi_id);
    }
    if (c.kartu_id && !mapelKartu.has(c.kartu_id)) {
      const kartu = await kartuRepo.ambilUntukDijawab(penggunaId, c.kartu_id);
      if (!kartu) throw new GalatApi('TIDAK_DITEMUKAN', 'Kartu tidak ditemukan.');
      mapelKartu.set(c.kartu_id, kartu.mapel_id);
    }
    if (!c.kartu_id && c.mapel_id && !(await repo.mapelAda(c.mapel_id))) {
      throw new GalatApi('VALIDASI_GAGAL', 'Mapel tidak ditemukan.', { mapel_id: 'tidak ditemukan' });
    }
  }
  return mapelKartu;
}

async function tutupSesi(penggunaId, sesiId, body) {
  const selesaiPadaDb = keDbDariKlien(body.selesai_pada);
  const berhasil = await repo.tutupSesiLatihan(penggunaId, sesiId, selesaiPadaDb);
  if (!berhasil) {
    throw new GalatApi('TIDAK_DITEMUKAN', 'Sesi latihan tidak ditemukan.');
  }
  return { id: sesiId, selesai_pada: keIso(selesaiPadaDb) };
}

async function simpanRiwayatBorongan(penggunaId, daftarCatatan) {
  const mapelKartu = await periksaRujukan(penggunaId, daftarCatatan);
  const adaKeyakinan = daftarCatatan.some((c) => c.keyakinan !== null && c.keyakinan !== undefined);
  const { cfg } = adaKeyakinan ? await muatKonfig() : { cfg: null };
  for (const catatan of daftarCatatan) {
    let gapNumerik = null;
    let kelasGap = null;
    let aturanVersi = catatan.aturan_versi;
    if (catatan.keyakinan !== null && catatan.keyakinan !== undefined) {
      // Dihitung SERVER, tidak pernah diterima dari klien (§4.6 aturan 2),
      // dengan ambang yang berlaku — versi aturannya ikut dicatat.
      gapNumerik = keputusan.gapNumerik(catatan.keyakinan, catatan.benar);
      kelasGap = keputusan.klasifikasiKartu(catatan.keyakinan, catatan.benar, cfg);
      aturanVersi = cfg.aturan_versi;
    }
    await repo.simpanSatuRiwayat(penggunaId, {
      id: catatan.id,
      kartuId: catatan.kartu_id,
      benar: catatan.benar,
      dijawabPada: keDbDariKlien(catatan.waktu), // pemetaan waktu → dijawab_pada (§4.6 aturan 4)
      sesiId: catatan.sesi_id,
      keyakinan: catatan.keyakinan,
      mapelId: catatan.kartu_id ? mapelKartu.get(catatan.kartu_id) : catatan.mapel_id,
      gapNumerik,
      kelasGap,
      aturanVersi,
    });
  }
  return { disimpan: daftarCatatan.length };
}

/**
 * Adaptor: data akun -> masukan fungsi keputusan PWA. `jendela` (query
 * ?jendela=) menimpa ambang.jendela_per_mapel untuk panggilan ini saja.
 */
async function hitungKalibrasi(penggunaId, jendela) {
  const { cfg, versi } = await muatKonfig();
  if (jendela) cfg.ambang.jendela_per_mapel = jendela;
  const n = cfg.ambang.jendela_per_mapel;
  const [peristiwa, jawaban, mapelIds, ketersediaan, potonganModul] = await Promise.all([
    repo.ambilRiwayatUntukAgregasi(penggunaId, n),
    repo.ambilJawabanUntukLevel(penggunaId, n),
    repo.semuaMapelId(),
    repo.ambilKetersediaanKartuPerMapel(penggunaId),
    modulRepo.jumlahPotonganPerMapel(penggunaId),
  ]);
  // Bahan latihan = kartu + potongan modul sendiri (pilihan percakapan 15 Okt 2026, belum
  // disetujui PM): akun yang baru mengunggah modul tidak lagi dianggap "arsip kosong".
  const petaKetersediaan = {};
  for (const b of [...ketersediaan, ...potonganModul]) {
    petaKetersediaan[b.mapel_id] = (petaKetersediaan[b.mapel_id] || 0) + Number(b.jumlah);
  }
  return {
    cfg,
    versi,
    kalibrasi: keputusan.agregatPerMapel(peristiwa, cfg, mapelIds),
    level: keputusan.levelAkurasiPerMapel(jawaban, cfg, mapelIds),
    petaKetersediaan,
  };
}

/**
 * GET /kalibrasi/ringkasan — satu baris `kalibrasi_mapel` (SDD-LevelIn §3.2)
 * per mapel, SELALU semua mapel (belum_cukup_data eksplisit), ditambah
 * `level_akurasi` (LANJUT_042, tabel fallback, dihitung tanpa keyakinan).
 */
async function ringkasanKalibrasi(penggunaId, jendela) {
  const { versi, kalibrasi, level } = await hitungKalibrasi(penggunaId, jendela);
  const dihitungPada = sekarangIso();
  const mapelIds = [...new Set([...Object.keys(kalibrasi), ...Object.keys(level)])].sort();
  return mapelIds.map((mapelId) => ({
    mapel_id: mapelId,
    ...kalibrasi[mapelId],
    level_akurasi: level[mapelId],
    dihitung_pada: dihitungPada,
    konfig_versi: versi,
  }));
}

/**
 * GET /saran-harian — { jenis, mapel_id, alasan } (SDD-LevelIn §4.2). `jenis`
 * persis rantai fallback saranHarian() PWA (§6.1f), dari kalibrasi keyakinan.
 * `alasan` hanya untuk jenis 'saran': angka yang membuat mapel itu terpilih.
 */
async function saranHarian(penggunaId) {
  const { cfg, kalibrasi, petaKetersediaan } = await hitungKalibrasi(penggunaId);
  const saran = keputusan.saranHarian(kalibrasi, petaKetersediaan, cfg);
  const agg = saran.jenis === 'saran' ? kalibrasi[saran.mapel_id] : null;
  return {
    jenis: saran.jenis,
    mapel_id: saran.mapel_id,
    alasan: agg ? { rate_overconfident: agg.rate_overconfident, kartu_dikerjakan: agg.kartu_dikerjakan } : null,
  };
}

async function konfigurasi() {
  const baris = await repo.ambilSemuaKonfigurasi();
  const hasil = {};
  for (const b of baris) {
    // Tabel yang sama juga menyimpan kunci persetujuan_* (LANJUT_047); endpoint
    // publik ini hanya mengirim kunci Level-In.
    if (!Object.hasOwn(KUNCI_KONFIG, b.kunci)) continue;
    hasil[b.kunci] = {
      nilai: b.nilai,
      versi: b.versi,
      dasar: b.dasar,
      diubah_pada: keIso(b.diubah_pada),
    };
  }
  return hasil;
}

module.exports = {
  mulaiSesi,
  daftarSesi,
  tutupSesi,
  simpanRiwayatBorongan,
  ringkasanKalibrasi,
  saranHarian,
  konfigurasi,
};
